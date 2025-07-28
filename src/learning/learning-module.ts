import { EventEmitter } from 'events';
import winston from 'winston';
import { Task, CLISource } from '../types/index.js';
import { LearningPersistence, LearningData } from './persistence.js';

interface Pattern {
  taskType: string;
  successRate: number;
  avgExecutionTime: number;
  preferredCLI: CLISource;
  conditions: Record<string, any>;
}

interface Feedback {
  taskId: string;
  success: boolean;
  executionTime: number;
  cli: CLISource;
  userSatisfaction?: number;
}

export class LearningModule extends EventEmitter {
  private patterns: Map<string, Pattern> = new Map();
  private feedbackHistory: Feedback[] = [];
  private logger: winston.Logger;
  private persistence: LearningPersistence;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor(logger: winston.Logger, dataPath?: string) {
    super();
    this.logger = logger;
    this.persistence = new LearningPersistence(logger, dataPath);
    this.initialize();
  }

  private async initialize() {
    await this.loadFromPersistence();
    this.setupAutoSave();
  }

  private loadPatterns() {
    const defaultPatterns: Pattern[] = [
      {
        taskType: 'multimodal',
        successRate: 0.95,
        avgExecutionTime: 2000,
        preferredCLI: 'gemini',
        conditions: { hasImages: true }
      },
      {
        taskType: 'code',
        successRate: 0.93,
        avgExecutionTime: 1500,
        preferredCLI: 'claude',
        conditions: { complexity: 'high' }
      }
    ];

    defaultPatterns.forEach(pattern => {
      this.patterns.set(pattern.taskType, pattern);
    });
  }

  async recordFeedback(feedback: Feedback) {
    this.feedbackHistory.push(feedback);
    await this.updatePatterns(feedback);
    
    if (this.feedbackHistory.length % 10 === 0) {
      await this.analyzePerformance();
    }
  }

  private async updatePatterns(feedback: Feedback) {
    const pattern = this.patterns.get(feedback.taskId) || {
      taskType: feedback.taskId,
      successRate: 0,
      avgExecutionTime: 0,
      preferredCLI: feedback.cli,
      conditions: {}
    };

    const relevantFeedback = this.feedbackHistory.filter(
      f => f.taskId === feedback.taskId && f.cli === feedback.cli
    );

    const successCount = relevantFeedback.filter(f => f.success).length;
    pattern.successRate = successCount / relevantFeedback.length;
    
    const totalTime = relevantFeedback.reduce((sum, f) => sum + f.executionTime, 0);
    pattern.avgExecutionTime = totalTime / relevantFeedback.length;

    this.patterns.set(feedback.taskId, pattern);
  }

  private async analyzePerformance() {
    const insights = {
      claudePerformance: this.analyzeCLIPerformance('claude'),
      geminiPerformance: this.analyzeCLIPerformance('gemini'),
      recommendations: this.generateRecommendations()
    };

    this.emit('performanceInsights', insights);
    this.logger.info('Performance analysis completed', insights);
  }

  private analyzeCLIPerformance(cli: CLISource) {
    const cliFeedback = this.feedbackHistory.filter(f => f.cli === cli);
    
    if (cliFeedback.length === 0) {
      return { successRate: 0, avgExecutionTime: 0, totalTasks: 0 };
    }

    const successCount = cliFeedback.filter(f => f.success).length;
    const totalTime = cliFeedback.reduce((sum, f) => sum + f.executionTime, 0);

    return {
      successRate: successCount / cliFeedback.length,
      avgExecutionTime: totalTime / cliFeedback.length,
      totalTasks: cliFeedback.length
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    this.patterns.forEach((pattern, taskType) => {
      if (pattern.successRate < 0.8) {
        recommendations.push(
          `Consider switching ${taskType} tasks to ${
            pattern.preferredCLI === 'claude' ? 'gemini' : 'claude'
          } for better success rate`
        );
      }
      
      if (pattern.avgExecutionTime > 5000) {
        recommendations.push(
          `${taskType} tasks are taking too long. Consider optimization or task splitting`
        );
      }
    });

    return recommendations;
  }

  getSuggestedCLI(task: Task): CLISource {
    const pattern = this.patterns.get(task.type);
    
    if (!pattern) {
      return 'claude';
    }

    const matchesConditions = Object.entries(pattern.conditions).every(
      ([key, value]) => task.payload[key] === value
    );

    if (matchesConditions) {
      return pattern.preferredCLI;
    }

    const claudePerf = this.analyzeCLIPerformance('claude');
    const geminiPerf = this.analyzeCLIPerformance('gemini');

    return claudePerf.successRate >= geminiPerf.successRate ? 'claude' : 'gemini';
  }

  exportLearnings() {
    return {
      patterns: Array.from(this.patterns.entries()),
      feedbackHistory: this.feedbackHistory,
      insights: {
        totalTasks: this.feedbackHistory.length,
        overallSuccessRate: this.feedbackHistory.length > 0 
          ? this.feedbackHistory.filter(f => f.success).length / this.feedbackHistory.length 
          : 0,
        recommendations: this.generateRecommendations()
      }
    };
  }

  private async loadFromPersistence() {
    try {
      const data = await this.persistence.load();
      if (data) {
        this.patterns = new Map(data.patterns);
        this.feedbackHistory = data.feedbackHistory;
        this.logger.info('Loaded learning data from persistence');
      } else {
        this.loadPatterns(); // Load default patterns
      }
    } catch (error) {
      this.logger.error('Failed to load learning data:', error);
      this.loadPatterns(); // Fall back to default patterns
    }
  }

  private setupAutoSave() {
    // Auto-save every 5 minutes
    this.autoSaveInterval = setInterval(() => {
      this.saveToPersistence().catch(error => {
        this.logger.error('Auto-save failed:', error);
      });
    }, 5 * 60 * 1000);
  }

  async saveToPersistence(): Promise<void> {
    try {
      const data: LearningData = {
        patterns: Array.from(this.patterns.entries()),
        feedbackHistory: this.feedbackHistory,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };
      
      await this.persistence.save(data);
      this.logger.debug('Learning data persisted successfully');
    } catch (error) {
      this.logger.error('Failed to persist learning data:', error);
      throw error;
    }
  }

  async exportToCSV(outputPath: string): Promise<void> {
    // Add timestamps to feedback if not present
    const enrichedHistory = this.feedbackHistory.map(f => ({
      ...f,
      timestamp: new Date().toISOString()
    }));
    
    // Temporarily update history for export
    const originalHistory = this.feedbackHistory;
    this.feedbackHistory = enrichedHistory;
    
    await this.saveToPersistence();
    await this.persistence.exportToCSV(outputPath);
    
    // Restore original history
    this.feedbackHistory = originalHistory;
  }

  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    // Save one last time before destroying
    this.saveToPersistence().catch(error => {
      this.logger.error('Failed to save on destroy:', error);
    });
  }
}