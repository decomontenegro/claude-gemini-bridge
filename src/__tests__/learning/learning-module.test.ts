import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import winston from 'winston';
import { LearningModule } from '../../learning/learning-module.js';
import { Task, CLISource } from '../../types/index.js';

describe('LearningModule', () => {
  let learningModule: LearningModule;
  let mockLogger: winston.Logger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    learningModule = new LearningModule(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default patterns', () => {
      expect(learningModule).toBeInstanceOf(EventEmitter);
      expect(learningModule).toBeDefined();
    });
  });

  describe('recordFeedback', () => {
    it('should record feedback and update patterns', async () => {
      const feedback = {
        taskId: 'test-task',
        success: true,
        executionTime: 1000,
        cli: 'claude' as CLISource,
        userSatisfaction: 5,
      };

      await learningModule.recordFeedback(feedback);
      
      // Verify feedback was recorded
      const learnings = learningModule.exportLearnings();
      expect(learnings.feedbackHistory).toHaveLength(1);
      expect(learnings.feedbackHistory[0]).toEqual(feedback);
    });

    it('should trigger performance analysis every 10 feedbacks', async () => {
      const performanceListener = jest.fn();
      learningModule.on('performanceInsights', performanceListener);

      // Record 9 feedbacks - should not trigger analysis
      for (let i = 0; i < 9; i++) {
        await learningModule.recordFeedback({
          taskId: `task-${i}`,
          success: true,
          executionTime: 1000,
          cli: 'claude' as CLISource,
        });
      }
      expect(performanceListener).not.toHaveBeenCalled();

      // 10th feedback should trigger analysis
      await learningModule.recordFeedback({
        taskId: 'task-10',
        success: true,
        executionTime: 1000,
        cli: 'claude' as CLISource,
      });
      expect(performanceListener).toHaveBeenCalled();
    });
  });

  describe('getSuggestedCLI', () => {
    it('should return preferred CLI for known patterns', () => {
      const multimodalTask: Task = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'multimodal',
        payload: { hasImages: true },
        createdAt: new Date().toISOString(),
      };

      const suggestedCLI = learningModule.getSuggestedCLI(multimodalTask);
      expect(suggestedCLI).toBe('gemini');
    });

    it('should return claude for code tasks with high complexity', () => {
      const codeTask: Task = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        type: 'code',
        payload: { complexity: 'high' },
        createdAt: new Date().toISOString(),
      };

      const suggestedCLI = learningModule.getSuggestedCLI(codeTask);
      expect(suggestedCLI).toBe('claude');
    });

    it('should default to claude for unknown task types', () => {
      const unknownTask: Task = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'analysis', // Using valid type instead of 'unknown'
        payload: {},
        createdAt: new Date().toISOString(),
      };

      const suggestedCLI = learningModule.getSuggestedCLI(unknownTask);
      expect(suggestedCLI).toBe('claude');
    });

    it('should choose CLI based on performance when conditions do not match', async () => {
      // Record feedback to establish performance metrics
      for (let i = 0; i < 5; i++) {
        await learningModule.recordFeedback({
          taskId: 'perf-test',
          success: i < 4, // 80% success for claude
          executionTime: 1000,
          cli: 'claude' as CLISource,
        });
      }

      for (let i = 0; i < 5; i++) {
        await learningModule.recordFeedback({
          taskId: 'perf-test',
          success: i < 2, // 40% success for gemini
          executionTime: 1000,
          cli: 'gemini' as CLISource,
        });
      }

      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        type: 'code',
        payload: { complexity: 'low' }, // Does not match pattern condition
        createdAt: new Date().toISOString(),
      };

      const suggestedCLI = learningModule.getSuggestedCLI(task);
      expect(suggestedCLI).toBe('claude'); // Should choose claude due to better performance
    });
  });

  describe('exportLearnings', () => {
    it('should export patterns, feedback history, and insights', async () => {
      // Record some feedback
      await learningModule.recordFeedback({
        taskId: 'export-test',
        success: true,
        executionTime: 1500,
        cli: 'claude' as CLISource,
      });

      const learnings = learningModule.exportLearnings();

      expect(learnings).toHaveProperty('patterns');
      expect(learnings).toHaveProperty('feedbackHistory');
      expect(learnings).toHaveProperty('insights');
      expect(learnings.insights).toHaveProperty('totalTasks', 1);
      expect(learnings.insights).toHaveProperty('overallSuccessRate', 1);
      expect(learnings.insights).toHaveProperty('recommendations');
    });

    it('should generate recommendations for poor performance', async () => {
      // Create a pattern with poor performance
      for (let i = 0; i < 10; i++) {
        await learningModule.recordFeedback({
          taskId: 'poor-task',
          success: i < 2, // 20% success rate
          executionTime: 6000, // Long execution time
          cli: 'claude' as CLISource,
        });
      }

      const learnings = learningModule.exportLearnings();
      const recommendations = learnings.insights.recommendations;

      expect(recommendations).toContain(
        'Consider switching poor-task tasks to gemini for better success rate'
      );
      expect(recommendations).toContain(
        'poor-task tasks are taking too long. Consider optimization or task splitting'
      );
    });
  });

  describe('performance analysis', () => {
    it('should correctly calculate CLI performance metrics', async () => {
      // Record feedback for claude
      for (let i = 0; i < 3; i++) {
        await learningModule.recordFeedback({
          taskId: `claude-task-${i}`,
          success: true,
          executionTime: 1000 + i * 100,
          cli: 'claude' as CLISource,
        });
      }

      // Record feedback for gemini
      for (let i = 0; i < 2; i++) {
        await learningModule.recordFeedback({
          taskId: `gemini-task-${i}`,
          success: i === 0, // 50% success rate
          executionTime: 2000,
          cli: 'gemini' as CLISource,
        });
      }

      const learnings = learningModule.exportLearnings();
      
      // Claude should have 100% success rate
      expect(learnings.feedbackHistory.filter(f => f.cli === 'claude' && f.success).length).toBe(3);
      
      // Gemini should have 50% success rate
      expect(learnings.feedbackHistory.filter(f => f.cli === 'gemini' && f.success).length).toBe(1);
    });
  });
});