import { Task } from '../../domain/entities/Task';
import { Result } from '../../domain/entities/Result';
import { TaskId } from '../../domain/value-objects/TaskId';
import { TaskStatus } from '../../domain/value-objects/TaskStatus';
import { TaskType } from '../../domain/value-objects/TaskType';
import { AdapterType } from '../../domain/value-objects/AdapterType';
import { Priority } from '../../domain/value-objects/Priority';
import { TaskRepository } from '../../domain/repositories/TaskRepository';
import { ResultRepository } from '../../domain/repositories/ResultRepository';
import { TaskRouter } from '../../domain/services/TaskRouter';
import { ResultMerger, MergeStrategy } from '../../domain/services/ResultMerger';
import { TaskNotFoundError, ValidationError } from '../../domain/errors';
import { AIAdapter, AdapterRegistry } from '../interfaces/AIAdapter';
import { EventBus } from '../interfaces/EventBus';
import { Logger } from '../interfaces/Logger';

export enum CollaborationMode {
  SEQUENTIAL = 'SEQUENTIAL',     // One AI builds on another's work
  PARALLEL = 'PARALLEL',         // Both work independently, then merge
  REVIEW = 'REVIEW',            // One AI reviews another's work
  ITERATIVE = 'ITERATIVE'       // Back-and-forth refinement
}

export interface CollaborativeExecutionCommand {
  taskId?: string;
  prompt?: string;
  type?: TaskType;
  mode: CollaborationMode;
  adapters?: AdapterType[];
  maxIterations?: number;
  userId?: string;
  options?: {
    mergeStrategy?: MergeStrategy;
    includeIntermediateResults?: boolean;
    stopOnConsensus?: boolean;
  };
}

export interface CollaborationStep {
  step: number;
  adapter: AdapterType;
  input: string;
  output: string;
  executionTime: number;
  timestamp: Date;
}

export interface CollaborativeExecutionResult {
  taskId: string;
  mode: CollaborationMode;
  steps: CollaborationStep[];
  finalOutput: string;
  totalExecutionTime: number;
  consensus?: boolean;
  adaptersUsed: AdapterType[];
  intermediateResults?: Result[];
}

export class CollaborativeExecutionUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly resultRepository: ResultRepository,
    private readonly taskRouter: TaskRouter,
    private readonly resultMerger: ResultMerger,
    private readonly adapterRegistry: AdapterRegistry,
    private readonly eventBus: EventBus,
    private readonly logger: Logger
  ) {}

  async execute(command: CollaborativeExecutionCommand): Promise<CollaborativeExecutionResult> {
    const startTime = Date.now();
    this.logger.info('Starting collaborative execution', { command });

    try {
      // Load or create task
      const task = await this.getOrCreateTask(command);

      // Select adapters
      const adapters = await this.selectAdapters(task, command.adapters);
      if (adapters.length < 2) {
        throw new ValidationError(['Collaborative execution requires at least 2 adapters']);
      }

      // Update task status
      task.updateStatus(TaskStatus.IN_PROGRESS);
      await this.taskRepository.save(task);

      // Emit start event
      await this.eventBus.emit('collaboration:started', {
        taskId: task.id.value,
        mode: command.mode,
        adapters: adapters.map(a => a.type),
        timestamp: new Date()
      });

      // Execute based on mode
      let result: CollaborativeExecutionResult;
      switch (command.mode) {
        case CollaborationMode.SEQUENTIAL:
          result = await this.executeSequential(task, adapters, command);
          break;
        case CollaborationMode.PARALLEL:
          result = await this.executeParallel(task, adapters, command);
          break;
        case CollaborationMode.REVIEW:
          result = await this.executeReview(task, adapters, command);
          break;
        case CollaborationMode.ITERATIVE:
          result = await this.executeIterative(task, adapters, command);
          break;
        default:
          throw new ValidationError([`Unknown collaboration mode: ${command.mode}`]);
      }

      // Save final result
      const finalResult = Result.createSuccess(
        task.id,
        result.finalOutput,
        AdapterType.CLAUDE, // Default to Claude for collaborative results
        {
          executionTime: result.totalExecutionTime,
          metadata: {
            collaborationMode: command.mode,
            adaptersUsed: result.adaptersUsed,
            consensus: result.consensus
          }
        }
      );
      await this.resultRepository.save(finalResult);

      // Update task status
      task.updateStatus(TaskStatus.COMPLETED);
      await this.taskRepository.save(task);

      // Emit completion event
      await this.eventBus.emit('collaboration:completed', {
        taskId: task.id.value,
        mode: command.mode,
        steps: result.steps.length,
        consensus: result.consensus,
        timestamp: new Date()
      });

      return result;

    } catch (error) {
      this.logger.error('Collaborative execution failed', { error, command });
      
      // Update task status if needed
      if (command.taskId) {
        try {
          const task = await this.taskRepository.findById(TaskId.fromString(command.taskId));
          if (task && task.status === TaskStatus.IN_PROGRESS) {
            task.updateStatus(TaskStatus.FAILED);
            await this.taskRepository.save(task);
          }
        } catch (updateError) {
          this.logger.error('Failed to update task status', { updateError });
        }
      }

      throw error;
    }
  }

  private async getOrCreateTask(command: CollaborativeExecutionCommand): Promise<Task> {
    if (command.taskId) {
      const task = await this.taskRepository.findById(TaskId.fromString(command.taskId));
      if (!task) {
        throw new TaskNotFoundError(command.taskId);
      }
      return task;
    }

    // Create new task
    if (!command.prompt || !command.type) {
      throw new ValidationError(['Prompt and type are required when creating a new task']);
    }

    const task = Task.create({
      prompt: command.prompt,
      type: command.type,
      status: TaskStatus.PENDING,
      priority: Priority.HIGH, // Collaborative tasks are high priority
      metadata: {
        tags: ['collaborative', command.mode.toLowerCase()],
        context: { collaborationMode: command.mode }
      },
      userId: command.userId
    });

    await this.taskRepository.save(task);
    return task;
  }

  private async selectAdapters(
    task: Task,
    requestedAdapters?: AdapterType[]
  ): Promise<AIAdapter[]> {
    if (requestedAdapters && requestedAdapters.length >= 2) {
      return requestedAdapters.map(type => {
        const adapter = this.adapterRegistry.get(type);
        if (!adapter) {
          throw new ValidationError([`Adapter not available: ${type}`]);
        }
        return adapter;
      });
    }

    // Auto-select adapters based on task
    const recommendation = await this.taskRouter.route(task);
    const primaryAdapter = this.adapterRegistry.get(recommendation.adapter);
    
    // Select complementary adapter
    const secondaryType = recommendation.adapter === AdapterType.CLAUDE 
      ? AdapterType.GEMINI 
      : AdapterType.CLAUDE;
    const secondaryAdapter = this.adapterRegistry.get(secondaryType);

    if (!primaryAdapter || !secondaryAdapter) {
      throw new ValidationError(['Required adapters not available']);
    }

    return [primaryAdapter, secondaryAdapter];
  }

  private async executeSequential(
    task: Task,
    adapters: AIAdapter[],
    command: CollaborativeExecutionCommand
  ): Promise<CollaborativeExecutionResult> {
    const steps: CollaborationStep[] = [];
    const intermediateResults: Result[] = [];
    let currentInput = task.prompt;

    for (let i = 0; i < adapters.length; i++) {
      const adapter = adapters[i];
      const stepStartTime = Date.now();

      // Create step task
      const stepTask = Task.create({
        prompt: currentInput,
        type: task.type,
        status: TaskStatus.PENDING,
        priority: task.priority,
        metadata: {
          ...task.metadata,
          context: {
            ...task.metadata.context,
            collaborationStep: i + 1,
            previousOutput: i > 0 ? steps[i - 1].output : undefined
          }
        },
        userId: task.userId
      });

      // Execute
      const result = await adapter.execute(stepTask);
      const executionTime = Date.now() - stepStartTime;

      // Record step
      steps.push({
        step: i + 1,
        adapter: adapter.type,
        input: currentInput,
        output: result.output,
        executionTime,
        timestamp: new Date()
      });

      // Save intermediate result if requested
      if (command.options?.includeIntermediateResults) {
        const intermediateResult = Result.createSuccess(
          task.id,
          result.output,
          adapter.type,
          { executionTime }
        );
        await this.resultRepository.save(intermediateResult);
        intermediateResults.push(intermediateResult);
      }

      // Use output as input for next step
      currentInput = this.prepareNextInput(result.output, task.prompt, i + 1);
    }

    return {
      taskId: task.id.value,
      mode: CollaborationMode.SEQUENTIAL,
      steps,
      finalOutput: steps[steps.length - 1].output,
      totalExecutionTime: steps.reduce((sum, step) => sum + step.executionTime, 0),
      adaptersUsed: adapters.map(a => a.type),
      intermediateResults: command.options?.includeIntermediateResults ? intermediateResults : undefined
    };
  }

  private async executeParallel(
    task: Task,
    adapters: AIAdapter[],
    command: CollaborativeExecutionCommand
  ): Promise<CollaborativeExecutionResult> {
    const startTime = Date.now();

    // Execute all adapters in parallel
    const executionPromises = adapters.map(async (adapter) => {
      const stepStartTime = Date.now();
      const result = await adapter.execute(task);
      return {
        adapter: adapter.type,
        result,
        executionTime: Date.now() - stepStartTime
      };
    });

    const executions = await Promise.all(executionPromises);

    // Create steps
    const steps: CollaborationStep[] = executions.map((exec, index) => ({
      step: index + 1,
      adapter: exec.adapter,
      input: task.prompt,
      output: exec.result.output,
      executionTime: exec.executionTime,
      timestamp: new Date()
    }));

    // Create Result objects for merging
    const results = executions.map(exec => 
      Result.createSuccess(
        task.id,
        exec.result.output,
        exec.adapter,
        { executionTime: exec.executionTime }
      )
    );

    // Merge results
    const mergeStrategy = command.options?.mergeStrategy || MergeStrategy.COMBINE;
    const mergedResult = await this.resultMerger.merge(results, task, {
      strategy: mergeStrategy,
      formatOutput: true
    });

    // Check consensus
    const consensus = mergedResult.metadata.consensus || false;
    
    return {
      taskId: task.id.value,
      mode: CollaborationMode.PARALLEL,
      steps,
      finalOutput: mergedResult.output,
      totalExecutionTime: Date.now() - startTime,
      consensus,
      adaptersUsed: adapters.map(a => a.type),
      intermediateResults: command.options?.includeIntermediateResults ? results : undefined
    };
  }

  private async executeReview(
    task: Task,
    adapters: AIAdapter[],
    command: CollaborativeExecutionCommand
  ): Promise<CollaborativeExecutionResult> {
    if (adapters.length !== 2) {
      throw new ValidationError(['Review mode requires exactly 2 adapters']);
    }

    const [primaryAdapter, reviewerAdapter] = adapters;
    const steps: CollaborationStep[] = [];

    // Step 1: Primary execution
    const primaryStartTime = Date.now();
    const primaryResult = await primaryAdapter.execute(task);
    
    steps.push({
      step: 1,
      adapter: primaryAdapter.type,
      input: task.prompt,
      output: primaryResult.output,
      executionTime: Date.now() - primaryStartTime,
      timestamp: new Date()
    });

    // Step 2: Review
    const reviewPrompt = this.createReviewPrompt(task.prompt, primaryResult.output);
    const reviewTask = Task.create({
      prompt: reviewPrompt,
      type: TaskType.VALIDATION,
      status: TaskStatus.PENDING,
      priority: task.priority,
      metadata: {
        ...task.metadata,
        context: {
          originalTask: task.id.value,
          reviewOf: primaryAdapter.type
        }
      },
      userId: task.userId
    });

    const reviewStartTime = Date.now();
    const reviewResult = await reviewerAdapter.execute(reviewTask);

    steps.push({
      step: 2,
      adapter: reviewerAdapter.type,
      input: reviewPrompt,
      output: reviewResult.output,
      executionTime: Date.now() - reviewStartTime,
      timestamp: new Date()
    });

    // Combine primary output with review
    const finalOutput = this.combineWithReview(primaryResult.output, reviewResult.output);

    return {
      taskId: task.id.value,
      mode: CollaborationMode.REVIEW,
      steps,
      finalOutput,
      totalExecutionTime: steps.reduce((sum, step) => sum + step.executionTime, 0),
      adaptersUsed: [primaryAdapter.type, reviewerAdapter.type]
    };
  }

  private async executeIterative(
    task: Task,
    adapters: AIAdapter[],
    command: CollaborativeExecutionCommand
  ): Promise<CollaborativeExecutionResult> {
    const maxIterations = command.maxIterations || 3;
    const steps: CollaborationStep[] = [];
    let currentInput = task.prompt;
    let previousOutput: string | null = null;
    let consensus = false;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      for (let i = 0; i < adapters.length; i++) {
        const adapter = adapters[i];
        const stepStartTime = Date.now();

        // Prepare input with context from previous iterations
        const iterativeInput = this.prepareIterativeInput(
          currentInput,
          previousOutput,
          iteration,
          i
        );

        const iterativeTask = Task.create({
          prompt: iterativeInput,
          type: task.type,
          status: TaskStatus.PENDING,
          priority: task.priority,
          metadata: {
            ...task.metadata,
            context: {
              iteration,
              adapterIndex: i,
              previousOutput
            }
          },
          userId: task.userId
        });

        const result = await adapter.execute(iterativeTask);

        steps.push({
          step: steps.length + 1,
          adapter: adapter.type,
          input: iterativeInput,
          output: result.output,
          executionTime: Date.now() - stepStartTime,
          timestamp: new Date()
        });

        previousOutput = result.output;
      }

      // Check for consensus if enabled
      if (command.options?.stopOnConsensus && iteration > 0) {
        const lastTwoOutputs = steps.slice(-2).map(s => s.output);
        if (this.checkConsensus(lastTwoOutputs)) {
          consensus = true;
          break;
        }
      }
    }

    return {
      taskId: task.id.value,
      mode: CollaborationMode.ITERATIVE,
      steps,
      finalOutput: steps[steps.length - 1].output,
      totalExecutionTime: steps.reduce((sum, step) => sum + step.executionTime, 0),
      consensus,
      adaptersUsed: adapters.map(a => a.type)
    };
  }

  private prepareNextInput(previousOutput: string, originalPrompt: string, step: number): string {
    return `Based on the previous analysis:\n\n${previousOutput}\n\n` +
           `Please continue with step ${step} of the task:\n${originalPrompt}`;
  }

  private createReviewPrompt(originalPrompt: string, primaryOutput: string): string {
    return `Please review the following response to this task:\n\n` +
           `Original Task: ${originalPrompt}\n\n` +
           `Response to Review:\n${primaryOutput}\n\n` +
           `Please provide a thorough review including:\n` +
           `1. Accuracy and completeness\n` +
           `2. Areas for improvement\n` +
           `3. Any errors or issues\n` +
           `4. Overall assessment`;
  }

  private combineWithReview(primaryOutput: string, review: string): string {
    return `## Primary Response\n\n${primaryOutput}\n\n` +
           `## Review & Validation\n\n${review}`;
  }

  private prepareIterativeInput(
    originalInput: string,
    previousOutput: string | null,
    iteration: number,
    adapterIndex: number
  ): string {
    if (!previousOutput) {
      return originalInput;
    }

    return `Iteration ${iteration + 1}, Step ${adapterIndex + 1}:\n\n` +
           `Original Task: ${originalInput}\n\n` +
           `Previous Output:\n${previousOutput}\n\n` +
           `Please refine or build upon the previous output.`;
  }

  private checkConsensus(outputs: string[]): boolean {
    if (outputs.length < 2) return false;

    // Simple similarity check
    const words1 = new Set(outputs[0].toLowerCase().split(/\s+/));
    const words2 = new Set(outputs[1].toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const similarity = intersection.size / Math.min(words1.size, words2.size);

    return similarity > 0.9; // 90% similarity threshold
  }
}