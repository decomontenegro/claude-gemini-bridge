import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { Orchestrator } from '../orchestration/orchestrator.js';
import { LearningModule } from '../learning/learning-module.js';
import { Message, Task, TaskType, UserPersona } from '../types/index.js';

export class CLIInterface {
  private program: Command;
  private orchestrator: Orchestrator;
  private learningModule: LearningModule;
  private logger: winston.Logger;
  private currentPersona: UserPersona = {
    type: 'individual',
    preferences: {
      verbosity: 'normal',
      guidance: true,
      automation: 'semi'
    }
  };

  constructor() {
    this.logger = this.setupLogger();
    this.orchestrator = new Orchestrator(this.logger);
    this.learningModule = new LearningModule(this.logger);
    this.program = new Command();
    this.setupCommands();
    this.setupEventListeners();
  }

  private setupLogger(): winston.Logger {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'bridge.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  private setupEventListeners() {
    this.orchestrator.on('taskCompleted', async ({ task, result }) => {
      await this.learningModule.recordFeedback({
        taskId: task.id,
        success: true,
        executionTime: Date.now() - new Date(task.createdAt).getTime(),
        cli: result.executedBy || 'claude'
      });
    });

    this.learningModule.on('performanceInsights', (insights) => {
      if (this.currentPersona.preferences.verbosity !== 'minimal') {
        console.log(chalk.blue('\n📊 Performance Insights:'));
        console.log(insights);
      }
    });
  }

  private setupCommands() {
    this.program
      .name('claude-gemini-bridge')
      .description('Bidirectional integration between Claude and Gemini CLIs')
      .version('1.0.0');

    this.program
      .command('execute')
      .description('Execute a task using intelligent orchestration')
      .option('-t, --type <type>', 'Task type (code, search, multimodal, analysis, validation, ultrathink)')
      .option('-o, --orchestrator <cli>', 'Specify orchestrator (claude or gemini)')
      .action(async (options) => {
        await this.executeTask(options);
      });

    this.program
      .command('hybrid')
      .description('Execute task using both CLIs in parallel')
      .option('-t, --type <type>', 'Task type')
      .action(async (options) => {
        await this.hybridExecution(options);
      });

    this.program
      .command('configure')
      .description('Configure user preferences and persona')
      .action(async () => {
        await this.configure();
      });

    this.program
      .command('learn')
      .description('View learning insights and patterns')
      .action(() => {
        const learnings = this.learningModule.exportLearnings();
        console.log(chalk.green('\n🧠 Learning Insights:'));
        console.log(JSON.stringify(learnings, null, 2));
      });

    this.program
      .command('interactive')
      .description('Start interactive mode')
      .action(async () => {
        await this.interactiveMode();
      });
  }

  private async executeTask(options: any) {
    const spinner = ora('Processing task...').start();
    
    try {
      const taskDetails = await this.promptTaskDetails(options.type);
      const task: Task = {
        id: uuidv4(),
        type: options.type || taskDetails.type,
        payload: taskDetails.payload,
        createdAt: new Date().toISOString()
      };

      const suggestedCLI = this.learningModule.getSuggestedCLI(task);
      const orchestrator = options.orchestrator || suggestedCLI;

      const message: Message = {
        source: orchestrator as any,
        orchestrator: true,
        task,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'medium'
        }
      };

      spinner.text = `Executing with ${orchestrator} as orchestrator...`;
      const result = await this.orchestrator.processMessage(message);
      
      spinner.succeed('Task completed successfully!');
      
      if (this.currentPersona.preferences.verbosity !== 'minimal') {
        console.log(chalk.green('\n✅ Result:'));
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      spinner.fail(`Task failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async hybridExecution(options: any) {
    const spinner = ora('Executing hybrid task...').start();
    
    try {
      const taskDetails = await this.promptTaskDetails(options.type);
      const result = await this.orchestrator.hybridExecution(
        options.type || taskDetails.type,
        taskDetails.payload
      );
      
      spinner.succeed('Hybrid execution completed!');
      console.log(chalk.green('\n✅ Combined Results:'));
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      spinner.fail(`Hybrid execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async promptTaskDetails(type?: TaskType): Promise<{ type: TaskType; payload: any }> {
    const questions = [];
    
    if (!type) {
      questions.push({
        type: 'list',
        name: 'type',
        message: 'Select task type:',
        choices: ['code', 'search', 'multimodal', 'analysis', 'validation', 'ultrathink']
      });
    }

    questions.push({
      type: 'input',
      name: 'description',
      message: 'Describe your task:',
      validate: (input: string) => input.length > 0 || 'Task description is required'
    });

    const answers = await inquirer.prompt(questions);
    
    return {
      type: type || answers.type,
      payload: {
        description: answers.description,
        context: {
          persona: this.currentPersona.type,
          preferences: this.currentPersona.preferences
        }
      }
    };
  }

  private async configure() {
    const persona = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Select your user type:',
        choices: [
          { name: '🌱 Newbie - Learning to code', value: 'newbie' },
          { name: '💻 Individual Developer', value: 'individual' },
          { name: '👥 Team Member', value: 'team' },
          { name: '🏢 Enterprise Engineer', value: 'enterprise' },
          { name: '🔬 Researcher/Data Scientist', value: 'researcher' }
        ]
      },
      {
        type: 'list',
        name: 'verbosity',
        message: 'Output verbosity:',
        choices: ['minimal', 'normal', 'detailed']
      },
      {
        type: 'confirm',
        name: 'guidance',
        message: 'Enable guided assistance?',
        default: true
      },
      {
        type: 'list',
        name: 'automation',
        message: 'Automation level:',
        choices: [
          { name: 'Manual - I want full control', value: 'manual' },
          { name: 'Semi-automatic - Ask for important decisions', value: 'semi' },
          { name: 'Full automation - Handle everything', value: 'full' }
        ]
      }
    ]);

    this.currentPersona = {
      type: persona.type,
      preferences: {
        verbosity: persona.verbosity,
        guidance: persona.guidance,
        automation: persona.automation
      }
    };

    console.log(chalk.green('\n✅ Configuration saved!'));
  }

  private async interactiveMode() {
    console.log(chalk.blue('\n🤖 Claude-Gemini Bridge Interactive Mode'));
    console.log(chalk.gray('Type "exit" to quit\n'));

    while (true) {
      const { command } = await inquirer.prompt([
        {
          type: 'input',
          name: 'command',
          message: 'Enter command or task:',
          prefix: '>'
        }
      ]);

      if (command.toLowerCase() === 'exit') {
        console.log(chalk.yellow('Goodbye! 👋'));
        break;
      }

      await this.processInteractiveCommand(command);
    }
  }

  private async processInteractiveCommand(command: string) {
    const spinner = ora('Processing...').start();
    
    try {
      const task: Task = {
        id: uuidv4(),
        type: 'analysis',
        payload: { command, interactive: true },
        createdAt: new Date().toISOString()
      };

      const suggestedCLI = this.learningModule.getSuggestedCLI(task);
      const message: Message = {
        source: suggestedCLI,
        orchestrator: true,
        task,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'high'
        }
      };

      const result = await this.orchestrator.processMessage(message);
      spinner.succeed('Done!');
      
      console.log(chalk.green('\nResult:'));
      console.log(result);
    } catch (error) {
      spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  run() {
    this.program.parse(process.argv);
  }
}