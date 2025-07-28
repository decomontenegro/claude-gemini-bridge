import { Result } from '../entities/Result';
import { TaskId } from '../value-objects/TaskId';
import { AdapterType } from '../value-objects/AdapterType';

export interface ResultFilter {
  taskId?: TaskId;
  adapter?: AdapterType[];
  isSuccess?: boolean;
  hasValidation?: boolean;
  executionTimeMin?: number;
  executionTimeMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ResultSort {
  field: 'createdAt' | 'executionTime' | 'qualityScore';
  direction: 'asc' | 'desc';
}

export interface ResultStatistics {
  totalResults: number;
  successRate: number;
  averageExecutionTime: number;
  averageQualityScore: number;
  byAdapter: Record<AdapterType, {
    count: number;
    successRate: number;
    avgExecutionTime: number;
    avgQualityScore: number;
  }>;
}

export interface ResultRepository {
  // Basic CRUD
  findById(id: string): Promise<Result | null>;
  findByTaskId(taskId: TaskId): Promise<Result[]>;
  save(result: Result): Promise<void>;
  delete(id: string): Promise<void>;
  
  // Queries
  findAll(
    filter?: ResultFilter,
    sort?: ResultSort,
    limit?: number
  ): Promise<Result[]>;
  
  findByAdapter(adapter: AdapterType): Promise<Result[]>;
  findSuccessfulResults(limit?: number): Promise<Result[]>;
  findFailedResults(limit?: number): Promise<Result[]>;
  findResultsNeedingValidation(): Promise<Result[]>;
  
  // Advanced queries
  findBestResultForTask(taskId: TaskId): Promise<Result | null>;
  findValidatedResults(): Promise<Result[]>;
  findResultsByQualityScore(minScore: number): Promise<Result[]>;
  
  // Statistics
  getStatistics(filter?: ResultFilter): Promise<ResultStatistics>;
  getAdapterPerformance(
    adapter: AdapterType,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalTasks: number;
    successRate: number;
    averageExecutionTime: number;
    averageQualityScore: number;
    errorRate: number;
  }>;
  
  // Bulk operations
  saveMany(results: Result[]): Promise<void>;
  deleteByTaskId(taskId: TaskId): Promise<void>;
}