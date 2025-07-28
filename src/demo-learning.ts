import winston from 'winston';
import { LearningModule } from './learning/learning-module.js';
import { Task, CLISource } from './types/index.js';
import { v4 as uuidv4 } from 'uuid';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

async function demonstrateLearning() {
  logger.info('Starting Learning Module Persistence Demo');
  
  // Create learning module with custom data path
  const learningModule = new LearningModule(logger, './data/demo-learning.json');
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate some feedback
  logger.info('Recording feedback from various tasks...');
  
  const feedbackData = [
    { taskId: 'code-gen-1', success: true, executionTime: 1200, cli: 'claude' as CLISource, userSatisfaction: 5 },
    { taskId: 'code-gen-2', success: true, executionTime: 1500, cli: 'claude' as CLISource, userSatisfaction: 4 },
    { taskId: 'multimodal-1', success: true, executionTime: 2000, cli: 'gemini' as CLISource, userSatisfaction: 5 },
    { taskId: 'code-gen-3', success: false, executionTime: 3000, cli: 'gemini' as CLISource, userSatisfaction: 2 },
    { taskId: 'analysis-1', success: true, executionTime: 1800, cli: 'claude' as CLISource, userSatisfaction: 5 },
    { taskId: 'multimodal-2', success: true, executionTime: 2200, cli: 'gemini' as CLISource, userSatisfaction: 4 },
    { taskId: 'validation-1', success: true, executionTime: 800, cli: 'claude' as CLISource, userSatisfaction: 5 },
  ];
  
  for (const feedback of feedbackData) {
    await learningModule.recordFeedback(feedback);
    logger.info(`Recorded feedback: ${feedback.taskId} - ${feedback.success ? 'Success' : 'Failure'}`);
  }
  
  // Test task routing suggestions
  logger.info('\nTesting task routing suggestions...');
  
  const testTasks: Task[] = [
    {
      id: uuidv4(),
      type: 'code',
      payload: { complexity: 'high' },
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      type: 'multimodal',
      payload: { hasImages: true },
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      type: 'analysis',
      payload: { dataSize: 'large' },
      createdAt: new Date().toISOString()
    }
  ];
  
  for (const task of testTasks) {
    const suggestedCLI = learningModule.getSuggestedCLI(task);
    logger.info(`Task type: ${task.type} -> Suggested CLI: ${suggestedCLI}`);
  }
  
  // Export learnings
  const learnings = learningModule.exportLearnings();
  logger.info('\nCurrent Learning Insights:');
  logger.info(`Total tasks processed: ${learnings.insights.totalTasks}`);
  logger.info(`Overall success rate: ${(learnings.insights.overallSuccessRate * 100).toFixed(1)}%`);
  logger.info(`Recommendations: ${learnings.insights.recommendations.join(', ') || 'None'}`);
  
  // Save to persistence
  logger.info('\nSaving learning data...');
  await learningModule.saveToPersistence();
  
  // Export to CSV
  logger.info('Exporting to CSV...');
  await learningModule.exportToCSV('./data/learning-export.csv');
  
  // Listen for performance insights
  learningModule.on('performanceInsights', (insights) => {
    logger.info('Performance Insights Event:', insights);
  });
  
  // Add more feedback to trigger performance analysis
  logger.info('\nAdding more feedback to trigger analysis...');
  for (let i = 0; i < 5; i++) {
    await learningModule.recordFeedback({
      taskId: `additional-${i}`,
      success: Math.random() > 0.3,
      executionTime: Math.floor(Math.random() * 3000) + 500,
      cli: Math.random() > 0.5 ? 'claude' : 'gemini',
      userSatisfaction: Math.floor(Math.random() * 5) + 1
    });
  }
  
  // Clean up
  logger.info('\nCleaning up...');
  learningModule.destroy();
  
  logger.info('Demo completed successfully!');
}

// Run the demo
demonstrateLearning().catch(console.error);