import { Result } from '../../domain/entities/Result';
import { TaskId } from '../../domain/value-objects/TaskId';
import { ResultRepository, ResultFilter, ResultSort, ResultStatistics } from '../../domain/repositories/ResultRepository';
import { AdapterType } from '../../domain/value-objects/AdapterType';

export class MockResultRepository implements ResultRepository {
  private results: Map<string, Result[]> = new Map();

  async save(result: Result): Promise<void> {
    const taskIdValue = result.taskId.value;
    if (!this.results.has(taskIdValue)) {
      this.results.set(taskIdValue, []);
    }
    this.results.get(taskIdValue)!.push(result);
  }

  async findById(id: string): Promise<Result | null> {
    for (const results of this.results.values()) {
      const result = results.find(r => r.id === id);
      if (result) {
        return result;
      }
    }
    return null;
  }

  async findByTaskId(taskId: TaskId): Promise<Result[]> {
    const existingResults = this.results.get(taskId.value);
    if (existingResults && existingResults.length > 0) {
      return existingResults.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Create a mock result if not found (for testing purposes)
    const mockResult = Result.createSuccess(
      taskId,
      `Mock result output for task ${taskId.value} - this would normally contain the actual response from the AI adapter including code, analysis, or other generated content.`,
      AdapterType.CLAUDE,
      {
        executionTime: Math.floor(Math.random() * 3000) + 1000, // Random execution time 1-4 seconds
        tokensUsed: Math.floor(Math.random() * 500) + 100, // Random token usage 100-600
        retryCount: 0,
        validationScore: 0.85 + Math.random() * 0.15, // Random score 0.85-1.0
        model: 'claude-3-sonnet',
        temperature: 0.7
      }
    );

    // Store the mock result for future requests
    this.results.set(taskId.value, [mockResult]);
    return [mockResult];
  }

  async findByAdapter(adapter: AdapterType): Promise<Result[]> {
    const allResults: Result[] = [];
    for (const results of this.results.values()) {
      allResults.push(...results.filter(r => r.adapter === adapter));
    }
    return allResults.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findSuccessful(): Promise<Result[]> {
    const allResults: Result[] = [];
    for (const results of this.results.values()) {
      allResults.push(...results.filter(r => r.isSuccess));
    }
    return allResults.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findFailed(): Promise<Result[]> {
    const allResults: Result[] = [];
    for (const results of this.results.values()) {
      allResults.push(...results.filter(r => !r.isSuccess));
    }
    return allResults.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async count(): Promise<number> {
    let total = 0;
    for (const results of this.results.values()) {
      total += results.length;
    }
    return total;
  }

  async deleteById(id: string): Promise<boolean> {
    for (const [taskId, results] of this.results.entries()) {
      const index = results.findIndex(r => r.id === id);
      if (index !== -1) {
        results.splice(index, 1);
        if (results.length === 0) {
          this.results.delete(taskId);
        }
        return true;
      }
    }
    return false;
  }

  async deleteByTaskId(taskId: TaskId): Promise<void> {
    this.results.delete(taskId.value);
  }

  async clear(): Promise<void> {
    this.results.clear();
  }

  // Additional methods required by ResultRepository interface
  async findAll(filter?: ResultFilter, sort?: ResultSort, limit?: number): Promise<Result[]> {
    let allResults: Result[] = [];
    for (const results of this.results.values()) {
      allResults.push(...results);
    }

    // Apply filters if provided
    if (filter) {
      if (filter.taskId) {
        allResults = allResults.filter(r => r.taskId.value === filter.taskId!.value);
      }
      if (filter.adapter) {
        allResults = allResults.filter(r => filter.adapter!.includes(r.adapter));
      }
      if (filter.isSuccess !== undefined) {
        allResults = allResults.filter(r => r.isSuccess === filter.isSuccess);
      }
    }

    // Apply sorting
    if (sort) {
      allResults.sort((a, b) => {
        let aValue: number, bValue: number;
        switch (sort.field) {
          case 'createdAt':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          case 'executionTime':
            aValue = a.executionTime;
            bValue = b.executionTime;
            break;
          case 'qualityScore':
            aValue = a.getQualityScore();
            bValue = b.getQualityScore();
            break;
          default:
            aValue = bValue = 0;
        }
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
      });
    } else {
      // Default sort by creation date, newest first
      allResults.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Apply limit
    if (limit) {
      allResults = allResults.slice(0, limit);
    }

    return allResults;
  }

  async findSuccessfulResults(limit?: number): Promise<Result[]> {
    return this.findAll({ isSuccess: true }, undefined, limit);
  }

  async findFailedResults(limit?: number): Promise<Result[]> {
    return this.findAll({ isSuccess: false }, undefined, limit);
  }

  async findResultsNeedingValidation(): Promise<Result[]> {
    const allResults = await this.findAll();
    return allResults.filter(result => result.needsValidation());
  }

  async findBestResultForTask(taskId: TaskId): Promise<Result | null> {
    const results = await this.findByTaskId(taskId);
    if (results.length === 0) return null;

    return results.reduce((best, current) => 
      current.getQualityScore() > best.getQualityScore() ? current : best
    );
  }

  async findValidatedResults(): Promise<Result[]> {
    return this.findAll({ hasValidation: true });
  }

  async findResultsByQualityScore(minScore: number): Promise<Result[]> {
    const allResults = await this.findAll();
    return allResults.filter(result => result.getQualityScore() >= minScore);
  }

  async getStatistics(filter?: ResultFilter): Promise<ResultStatistics> {
    const results = await this.findAll(filter);
    
    if (results.length === 0) {
      return {
        totalResults: 0,
        successRate: 0,
        averageExecutionTime: 0,
        averageQualityScore: 0,
        byAdapter: {} as any
      };
    }

    const successfulResults = results.filter(r => r.isSuccess);
    const adapterStats: Record<string, any> = {};

    // Calculate per-adapter statistics
    for (const result of results) {
      const adapter = result.adapter;
      if (!adapterStats[adapter]) {
        adapterStats[adapter] = {
          count: 0,
          successful: 0,
          totalExecutionTime: 0,
          totalQualityScore: 0
        };
      }
      
      adapterStats[adapter].count++;
      if (result.isSuccess) adapterStats[adapter].successful++;
      adapterStats[adapter].totalExecutionTime += result.executionTime;
      adapterStats[adapter].totalQualityScore += result.getQualityScore();
    }

    const byAdapter = {} as Record<AdapterType, any>;
    for (const [adapter, stats] of Object.entries(adapterStats)) {
      byAdapter[adapter as AdapterType] = {
        count: stats.count,
        successRate: stats.successful / stats.count,
        avgExecutionTime: stats.totalExecutionTime / stats.count,
        avgQualityScore: stats.totalQualityScore / stats.count
      };
    }

    return {
      totalResults: results.length,
      successRate: successfulResults.length / results.length,
      averageExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0) / results.length,
      averageQualityScore: results.reduce((sum, r) => sum + r.getQualityScore(), 0) / results.length,
      byAdapter
    };
  }

  async getAdapterPerformance(adapter: AdapterType, timeRange?: { start: Date; end: Date }) {
    const filter: ResultFilter = { adapter: [adapter] };
    if (timeRange) {
      filter.createdAfter = timeRange.start;
      filter.createdBefore = timeRange.end;
    }

    const results = await this.findAll(filter);
    const successfulResults = results.filter(r => r.isSuccess);

    return {
      totalTasks: results.length,
      successRate: results.length > 0 ? successfulResults.length / results.length : 0,
      averageExecutionTime: results.length > 0 ? results.reduce((sum, r) => sum + r.executionTime, 0) / results.length : 0,
      averageQualityScore: results.length > 0 ? results.reduce((sum, r) => sum + r.getQualityScore(), 0) / results.length : 0,
      errorRate: results.length > 0 ? (results.length - successfulResults.length) / results.length : 0
    };
  }

  async saveMany(results: Result[]): Promise<void> {
    for (const result of results) {
      await this.save(result);
    }
  }

  async delete(id: string): Promise<void> {
    await this.deleteById(id);
  }
}