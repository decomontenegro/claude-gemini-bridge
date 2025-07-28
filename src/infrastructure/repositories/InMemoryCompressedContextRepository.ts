import { CompressedContext } from '../../domain/entities/CompressedContext';
import { TaskId } from '../../domain/value-objects/TaskId';
import { CompressionType } from '../../domain/value-objects/CompressionType';
import { CompressedContextRepository, CompressedContextSearchCriteria } from '../../domain/repositories/CompressedContextRepository';

interface SimilaritySearchResult {
  context: CompressedContext;
  similarity: number;
}

export class InMemoryCompressedContextRepository implements CompressedContextRepository {
  private contexts: Map<string, CompressedContext> = new Map();
  private taskIdIndex: Map<string, Set<string>> = new Map();

  async save(context: CompressedContext): Promise<void> {
    this.contexts.set(context.id, context);
    
    // Update task ID index
    const taskIdValue = context.taskId.value;
    if (!this.taskIdIndex.has(taskIdValue)) {
      this.taskIdIndex.set(taskIdValue, new Set());
    }
    this.taskIdIndex.get(taskIdValue)!.add(context.id);
  }

  async findById(id: string): Promise<CompressedContext | null> {
    return this.contexts.get(id) || null;
  }

  async findByTaskId(taskId: TaskId): Promise<CompressedContext[]> {
    const contextIds = this.taskIdIndex.get(taskId.value) || new Set();
    const contexts: CompressedContext[] = [];
    
    for (const contextId of contextIds) {
      const context = this.contexts.get(contextId);
      if (context) {
        contexts.push(context);
      }
    }
    
    return contexts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async search(criteria: CompressedContextSearchCriteria): Promise<CompressedContext[]> {
    let results = Array.from(this.contexts.values());

    // Filter by task ID
    if (criteria.taskId) {
      results = results.filter(ctx => ctx.taskId.value === criteria.taskId!.value);
    }

    // Filter by compression type
    if (criteria.compressionType) {
      results = results.filter(ctx => ctx.compressionType === criteria.compressionType);
    }

    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(ctx => 
        criteria.tags!.every(tag => ctx.tags.includes(tag))
      );
    }

    // Filter by date range
    if (criteria.createdAfter) {
      results = results.filter(ctx => ctx.createdAt >= criteria.createdAfter!);
    }

    if (criteria.createdBefore) {
      results = results.filter(ctx => ctx.createdAt <= criteria.createdBefore!);
    }

    // Filter by compression ratio
    if (criteria.minCompressionRatio !== undefined) {
      results = results.filter(ctx => ctx.metadata.compressionRatio >= criteria.minCompressionRatio!);
    }

    if (criteria.maxCompressionRatio !== undefined) {
      results = results.filter(ctx => ctx.metadata.compressionRatio <= criteria.maxCompressionRatio!);
    }

    // Handle similarity search
    if (criteria.similarTo) {
      const similarResults = await this.findSimilar(
        criteria.similarTo,
        results.length,
        criteria.minSimilarityScore || 0.7
      );
      return similarResults.map(result => result.context);
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findSimilar(
    target: CompressedContext,
    limit: number = 5,
    minSimilarity: number = 0.7
  ): Promise<SimilaritySearchResult[]> {
    const results: SimilaritySearchResult[] = [];
    
    // Only search for contexts with embeddings
    if (!this.hasEmbeddings(target)) {
      return results;
    }
    
    const targetEmbedding = this.extractEmbedding(target);
    if (!targetEmbedding) {
      return results;
    }
    
    for (const context of this.contexts.values()) {
      // Skip the target context itself
      if (context.id === target.id) {
        continue;
      }
      
      if (!this.hasEmbeddings(context)) {
        continue;
      }
      
      const candidateEmbedding = this.extractEmbedding(context);
      if (!candidateEmbedding) {
        continue;
      }
      
      const similarity = this.calculateCosineSimilarity(targetEmbedding, candidateEmbedding);
      
      if (similarity >= minSimilarity) {
        results.push({
          context,
          similarity
        });
      }
    }
    
    // Sort by similarity (highest first) and limit results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async findAll(): Promise<CompressedContext[]> {
    const contexts = Array.from(this.contexts.values());
    return contexts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async count(criteria?: Partial<CompressedContextSearchCriteria>): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      return this.contexts.size;
    }

    const filtered = await this.search(criteria as CompressedContextSearchCriteria);
    return filtered.length;
  }

  async delete(id: string): Promise<void> {
    await this.deleteById(id);
  }

  async deleteById(id: string): Promise<boolean> {
    const context = this.contexts.get(id);
    if (!context) {
      return false;
    }
    
    // Remove from main storage
    this.contexts.delete(id);
    
    // Remove from task ID index
    const taskIdValue = context.taskId.value;
    const taskContextIds = this.taskIdIndex.get(taskIdValue);
    if (taskContextIds) {
      taskContextIds.delete(id);
      if (taskContextIds.size === 0) {
        this.taskIdIndex.delete(taskIdValue);
      }
    }
    
    return true;
  }

  async deleteByTaskId(taskId: TaskId): Promise<number> {
    const contexts = await this.findByTaskId(taskId);
    let deletedCount = 0;
    
    for (const context of contexts) {
      if (await this.deleteById(context.id)) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // Utility methods
  private hasEmbeddings(context: CompressedContext): boolean {
    return Object.values(context.phases).some(phase => phase.embedding && phase.embedding.length > 0);
  }

  private extractEmbedding(context: CompressedContext): number[] | null {
    // Try to get embedding from any phase, preferring analysis -> routing -> execution
    const phases = [context.phases.analysis, context.phases.routing, context.phases.execution];
    
    for (const phase of phases) {
      if (phase.embedding && phase.embedding.length > 0) {
        return phase.embedding;
      }
    }
    
    return null;
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Analytics methods
  async getCompressionStats(): Promise<{
    totalContexts: number;
    averageCompressionRatio: number;
    byCompressionType: Record<CompressionType, number>;
    averageQualityScore: number;
    totalSpaceSaved: number;
  }> {
    const contexts = Array.from(this.contexts.values());
    
    if (contexts.length === 0) {
      return {
        totalContexts: 0,
        averageCompressionRatio: 0,
        byCompressionType: {} as Record<CompressionType, number>,
        averageQualityScore: 0,
        totalSpaceSaved: 0
      };
    }

    const stats = {
      totalContexts: contexts.length,
      averageCompressionRatio: 0,
      byCompressionType: {} as Record<CompressionType, number>,
      averageQualityScore: 0,
      totalSpaceSaved: 0
    };

    let totalCompressionRatio = 0;
    let totalQualityScore = 0;
    let qualityScoreCount = 0;

    for (const context of contexts) {
      // Count by type
      const type = context.compressionType;
      stats.byCompressionType[type] = (stats.byCompressionType[type] || 0) + 1;
      
      // Sum ratios and quality scores
      totalCompressionRatio += context.metadata.compressionRatio;
      
      if (context.metadata.qualityScore !== undefined) {
        totalQualityScore += context.metadata.qualityScore;
        qualityScoreCount++;
      }

      // Calculate space saved
      stats.totalSpaceSaved += (context.metadata.originalSize - context.metadata.compressedSize);
    }

    stats.averageCompressionRatio = totalCompressionRatio / contexts.length;
    stats.averageQualityScore = qualityScoreCount > 0 ? totalQualityScore / qualityScoreCount : 0;

    return stats;
  }

  // Cleanup methods
  async deleteOlderThan(date: Date): Promise<number> {
    const contextsToDelete = Array.from(this.contexts.values())
      .filter(context => context.createdAt < date);
    
    let deletedCount = 0;
    for (const context of contextsToDelete) {
      if (await this.deleteById(context.id)) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async deleteUnusedContexts(unusedDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - unusedDays);
    
    const contextsToDelete = Array.from(this.contexts.values())
      .filter(context => {
        const lastAccessed = context.accessedAt || context.createdAt;
        return lastAccessed < cutoffDate;
      });
    
    let deletedCount = 0;
    for (const context of contextsToDelete) {
      if (await this.deleteById(context.id)) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Administrative methods
  async clear(): Promise<void> {
    this.contexts.clear();
    this.taskIdIndex.clear();
  }

  async getStats(): Promise<{
    totalContexts: number;
    contextsByType: Record<string, number>;
    averageCompressionRatio: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
  }> {
    const contexts = Array.from(this.contexts.values());
    const stats = {
      totalContexts: contexts.length,
      contextsByType: {} as Record<string, number>,
      averageCompressionRatio: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0
    };

    if (contexts.length === 0) {
      return stats;
    }

    for (const context of contexts) {
      // Count by type
      const type = context.compressionType;
      stats.contextsByType[type] = (stats.contextsByType[type] || 0) + 1;
      
      // Sum sizes
      stats.totalOriginalSize += context.metadata.originalSize;
      stats.totalCompressedSize += context.metadata.compressedSize;
    }

    stats.averageCompressionRatio = stats.totalCompressedSize / stats.totalOriginalSize;

    return stats;
  }
}