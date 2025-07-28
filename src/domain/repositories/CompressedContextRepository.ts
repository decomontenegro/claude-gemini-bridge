import { CompressedContext } from '../entities/CompressedContext';
import { TaskId } from '../value-objects/TaskId';
import { CompressionType } from '../value-objects/CompressionType';

export interface CompressedContextSearchCriteria {
  taskId?: TaskId;
  compressionType?: CompressionType;
  tags?: string[];
  similarTo?: CompressedContext;
  minSimilarityScore?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  minCompressionRatio?: number;
  maxCompressionRatio?: number;
}

export interface CompressedContextRepository {
  save(context: CompressedContext): Promise<void>;
  findById(id: string): Promise<CompressedContext | null>;
  findByTaskId(taskId: TaskId): Promise<CompressedContext[]>;
  search(criteria: CompressedContextSearchCriteria): Promise<CompressedContext[]>;
  findSimilar(
    context: CompressedContext, 
    limit?: number, 
    minSimilarity?: number
  ): Promise<Array<{ context: CompressedContext; similarity: number }>>;
  delete(id: string): Promise<void>;
  count(criteria?: Partial<CompressedContextSearchCriteria>): Promise<number>;
  
  // Analytics methods
  getCompressionStats(): Promise<{
    totalContexts: number;
    averageCompressionRatio: number;
    byCompressionType: Record<CompressionType, number>;
    averageQualityScore: number;
    totalSpaceSaved: number; // in bytes
  }>;
  
  // Cleanup methods
  deleteOlderThan(date: Date): Promise<number>;
  deleteUnusedContexts(unusedDays: number): Promise<number>;
}