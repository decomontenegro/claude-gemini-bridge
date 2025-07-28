import { Task } from '../../domain/entities/Task';
import { Result } from '../../domain/entities/Result';
import { TaskId } from '../../domain/value-objects/TaskId';
import { AdapterType } from '../../domain/value-objects/AdapterType';
import { TaskRepository } from '../../domain/repositories/TaskRepository';
import { ResultRepository } from '../../domain/repositories/ResultRepository';
import { ResultValidator } from '../../domain/services/ResultValidator';
import { ResultMerger, MergeStrategy } from '../../domain/services/ResultMerger';
import { TaskNotFoundError, ResultNotFoundError, ValidationError } from '../../domain/errors';
import { EventBus } from '../interfaces/EventBus';
import { Logger } from '../interfaces/Logger';

export interface CompareResultsCommand {
  taskId: string;
  resultIds?: string[];
  adapters?: AdapterType[];
  includeValidation?: boolean;
  mergeStrategy?: MergeStrategy;
}

export interface ComparisonResult {
  taskId: string;
  results: Array<{
    id: string;
    adapter: AdapterType;
    output: string;
    executionTime: number;
    qualityScore: number;
    createdAt: Date;
  }>;
  comparison: {
    consensus: boolean;
    similarity: number;
    differences: string[];
    bestResult?: string;
    worstResult?: string;
  };
  validation?: {
    [resultId: string]: {
      score: number;
      isValid: boolean;
      criteria: Array<{
        name: string;
        score: number;
        passed: boolean;
      }>;
    };
  };
  merged?: {
    output: string;
    strategy: MergeStrategy;
    confidence: number;
  };
}

export class CompareResultsUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly resultRepository: ResultRepository,
    private readonly resultValidator: ResultValidator,
    private readonly resultMerger: ResultMerger,
    private readonly eventBus: EventBus,
    private readonly logger: Logger
  ) {}

  async execute(command: CompareResultsCommand): Promise<ComparisonResult> {
    this.logger.info('Comparing results', { command });

    try {
      // Load task
      const taskId = TaskId.fromString(command.taskId);
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new TaskNotFoundError(command.taskId);
      }

      // Load results
      let results: Result[];
      if (command.resultIds && command.resultIds.length > 0) {
        // Load specific results
        results = await this.loadResultsByIds(command.resultIds);
      } else if (command.adapters && command.adapters.length > 0) {
        // Load results by adapters
        results = await this.loadResultsByAdapters(taskId, command.adapters);
      } else {
        // Load all results for task
        results = await this.resultRepository.findByTaskId(taskId);
      }

      if (results.length === 0) {
        throw new ValidationError(['No results found for comparison']);
      }

      // Perform comparison
      const comparison = await this.compareResults(results, task);

      // Validate results if requested
      let validation: ComparisonResult['validation'];
      if (command.includeValidation) {
        validation = await this.validateResults(results, task);
      }

      // Merge results if strategy provided
      let merged: ComparisonResult['merged'];
      if (command.mergeStrategy && results.length > 1) {
        const mergedResult = await this.resultMerger.merge(
          results,
          task,
          { strategy: command.mergeStrategy, formatOutput: true }
        );

        merged = {
          output: mergedResult.output,
          strategy: mergedResult.strategy,
          confidence: mergedResult.confidence
        };
      }

      // Emit event
      await this.eventBus.emit('results:compared', {
        taskId: command.taskId,
        resultCount: results.length,
        consensus: comparison.consensus,
        timestamp: new Date()
      });

      return {
        taskId: command.taskId,
        results: results.map(r => ({
          id: r.id,
          adapter: r.adapter,
          output: r.output,
          executionTime: r.executionTime,
          qualityScore: r.getQualityScore(),
          createdAt: r.createdAt
        })),
        comparison,
        validation,
        merged
      };

    } catch (error) {
      this.logger.error('Failed to compare results', { error, command });
      throw error;
    }
  }

  private async loadResultsByIds(resultIds: string[]): Promise<Result[]> {
    const results: Result[] = [];
    
    for (const id of resultIds) {
      const result = await this.resultRepository.findById(id);
      if (!result) {
        throw new ResultNotFoundError(id);
      }
      results.push(result);
    }

    return results;
  }

  private async loadResultsByAdapters(
    taskId: TaskId,
    adapters: AdapterType[]
  ): Promise<Result[]> {
    const allResults = await this.resultRepository.findByTaskId(taskId);
    return allResults.filter(r => adapters.includes(r.adapter));
  }

  private async compareResults(
    results: Result[],
    task: Task
  ): Promise<ComparisonResult['comparison']> {
    if (results.length < 2) {
      return {
        consensus: true,
        similarity: 1,
        differences: [],
        bestResult: results[0]?.id
      };
    }

    // Sort by quality score
    const sortedResults = [...results].sort(
      (a, b) => b.getQualityScore() - a.getQualityScore()
    );

    // Cross-validate pairs
    let totalSimilarity = 0;
    const allDifferences: string[] = [];
    let consensusCount = 0;

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const crossValidation = await this.resultValidator.crossValidate(
          results[i],
          results[j],
          task
        );

        totalSimilarity += crossValidation.similarity;
        allDifferences.push(...crossValidation.differences);
        if (crossValidation.consensus) {
          consensusCount++;
        }
      }
    }

    const pairCount = (results.length * (results.length - 1)) / 2;
    const avgSimilarity = totalSimilarity / pairCount;
    const consensus = consensusCount === pairCount;

    // Remove duplicate differences
    const uniqueDifferences = [...new Set(allDifferences)];

    return {
      consensus,
      similarity: avgSimilarity,
      differences: uniqueDifferences,
      bestResult: sortedResults[0].id,
      worstResult: sortedResults[sortedResults.length - 1].id
    };
  }

  private async validateResults(
    results: Result[],
    task: Task
  ): Promise<ComparisonResult['validation']> {
    const validation: ComparisonResult['validation'] = {};

    for (const result of results) {
      const report = await this.resultValidator.validate(result, task);
      
      validation[result.id] = {
        score: report.score,
        isValid: report.isValid,
        criteria: report.criteria.map(c => ({
          name: c.name,
          score: c.score,
          passed: c.passed
        }))
      };
    }

    return validation;
  }
}