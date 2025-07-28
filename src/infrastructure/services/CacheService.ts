import { createHash } from 'crypto';
import { Logger } from '../../application/interfaces/Logger';
import { MetricsCollector } from '../../application/interfaces/MetricsCollector';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[]; // Cache tags for invalidation
  compress?: boolean; // Compress large values
}

export interface CacheEntry<T> {
  value: T;
  metadata: {
    key: string;
    createdAt: Date;
    expiresAt?: Date;
    hits: number;
    lastAccessed: Date;
    size: number;
    tags?: string[];
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  size: number;
  keys: number;
}

export abstract class CacheService {
  protected stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    size: 0,
    keys: 0
  };

  constructor(
    protected readonly logger: Logger,
    protected readonly metrics: MetricsCollector
  ) {}

  // Abstract methods to be implemented by concrete cache implementations
  protected abstract doGet<T>(key: string): Promise<CacheEntry<T> | null>;
  protected abstract doSet<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  protected abstract doDelete(key: string): Promise<boolean>;
  protected abstract doClear(): Promise<void>;
  protected abstract doGetKeys(pattern?: string): Promise<string[]>;
  protected abstract doGetSize(): Promise<number>;

  // Public API
  async get<T>(key: string): Promise<T | null> {
    const normalizedKey = this.normalizeKey(key);
    
    try {
      const entry = await this.doGet<T>(normalizedKey);
      
      if (!entry) {
        this.recordMiss(normalizedKey);
        return null;
      }

      // Check expiration
      if (entry.metadata.expiresAt && entry.metadata.expiresAt < new Date()) {
        await this.delete(normalizedKey);
        this.recordMiss(normalizedKey);
        return null;
      }

      // Update access metadata
      entry.metadata.hits++;
      entry.metadata.lastAccessed = new Date();
      
      this.recordHit(normalizedKey);
      return entry.value;

    } catch (error) {
      this.logger.error('Cache get error', { key: normalizedKey, error });
      this.recordMiss(normalizedKey);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    
    try {
      await this.doSet(normalizedKey, value, options);
      this.recordSet(normalizedKey);
      
      // Invalidate related tags
      if (options?.tags) {
        await this.tagKeys(normalizedKey, options.tags);
      }

    } catch (error) {
      this.logger.error('Cache set error', { key: normalizedKey, error });
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    const normalizedKey = this.normalizeKey(key);
    
    try {
      const result = await this.doDelete(normalizedKey);
      if (result) {
        this.recordDelete(normalizedKey);
      }
      return result;

    } catch (error) {
      this.logger.error('Cache delete error', { key: normalizedKey, error });
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.doClear();
      this.resetStats();
      this.logger.info('Cache cleared');

    } catch (error) {
      this.logger.error('Cache clear error', { error });
      throw error;
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidated = 0;
    
    for (const tag of tags) {
      const keys = await this.getKeysByTag(tag);
      for (const key of keys) {
        if (await this.delete(key)) {
          invalidated++;
        }
      }
    }
    
    this.logger.info('Invalidated cache by tags', { tags, count: invalidated });
    return invalidated;
  }

  async getStats(): Promise<CacheStats> {
    const size = await this.doGetSize();
    const keys = (await this.doGetKeys()).length;
    
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    return {
      ...this.stats,
      hitRate,
      size,
      keys
    };
  }

  // Cache key generation
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);
    
    const paramString = JSON.stringify(sortedParams);
    const hash = createHash('sha256').update(paramString).digest('hex').substring(0, 8);
    
    return `${prefix}:${hash}`;
  }

  // Protected helper methods
  protected normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9:_-]/g, '_');
  }

  protected recordHit(key: string): void {
    this.stats.hits++;
    this.metrics.increment('cache.hits', 1, [{ key: 'cache', value: 'primary' }]);
  }

  protected recordMiss(key: string): void {
    this.stats.misses++;
    this.metrics.increment('cache.misses', 1, [{ key: 'cache', value: 'primary' }]);
  }

  protected recordSet(key: string): void {
    this.stats.sets++;
    this.metrics.increment('cache.sets', 1, [{ key: 'cache', value: 'primary' }]);
  }

  protected recordDelete(key: string): void {
    this.stats.deletes++;
    this.metrics.increment('cache.deletes', 1, [{ key: 'cache', value: 'primary' }]);
  }

  protected resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      size: 0,
      keys: 0
    };
  }

  // Tag management (to be overridden by implementations that support tagging)
  protected async tagKeys(key: string, tags: string[]): Promise<void> {
    // Default implementation does nothing
    // Redis implementation would use sets to track tagged keys
  }

  protected async getKeysByTag(tag: string): Promise<string[]> {
    // Default implementation returns empty array
    // Redis implementation would return members of tag set
    return [];
  }
}

// In-memory cache implementation
export class MemoryCacheService extends CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private tagIndex = new Map<string, Set<string>>();

  protected async doGet<T>(key: string): Promise<CacheEntry<T> | null> {
    return this.cache.get(key) || null;
  }

  protected async doSet<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const size = JSON.stringify(value).length;
    const expiresAt = options?.ttl 
      ? new Date(Date.now() + options.ttl)
      : undefined;

    const entry: CacheEntry<T> = {
      value,
      metadata: {
        key,
        createdAt: new Date(),
        expiresAt,
        hits: 0,
        lastAccessed: new Date(),
        size,
        tags: options?.tags
      }
    };

    this.cache.set(key, entry);

    // Set up expiration timer
    if (options?.ttl) {
      setTimeout(() => {
        this.doDelete(key);
      }, options.ttl);
    }
  }

  protected async doDelete(key: string): Promise<boolean> {
    // Remove from tag index
    const entry = this.cache.get(key);
    if (entry?.metadata.tags) {
      for (const tag of entry.metadata.tags) {
        const tagSet = this.tagIndex.get(tag);
        tagSet?.delete(key);
        if (tagSet?.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    return this.cache.delete(key);
  }

  protected async doClear(): Promise<void> {
    this.cache.clear();
    this.tagIndex.clear();
  }

  protected async doGetKeys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return keys;
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  protected async doGetSize(): Promise<number> {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.metadata.size;
    }
    return totalSize;
  }

  protected async tagKeys(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  protected async getKeysByTag(tag: string): Promise<string[]> {
    return Array.from(this.tagIndex.get(tag) || []);
  }
}

// Task result caching with intelligent key generation
export class TaskCacheService {
  constructor(
    private readonly cache: CacheService,
    private readonly logger: Logger
  ) {}

  async getCachedResult(
    taskType: string,
    prompt: string,
    adapter?: string
  ): Promise<string | null> {
    const key = this.generateTaskKey(taskType, prompt, adapter);
    const cached = await this.cache.get<string>(key);
    
    if (cached) {
      this.logger.debug('Cache hit for task', { taskType, adapter });
    }
    
    return cached;
  }

  async cacheResult(
    taskType: string,
    prompt: string,
    result: string,
    adapter: string,
    ttl?: number
  ): Promise<void> {
    const key = this.generateTaskKey(taskType, prompt, adapter);
    
    // Determine TTL based on task type
    const cacheTtl = ttl || this.getTtlForTaskType(taskType);
    
    await this.cache.set(key, result, {
      ttl: cacheTtl,
      tags: [taskType, adapter]
    });
    
    this.logger.debug('Cached task result', { taskType, adapter, ttl: cacheTtl });
  }

  async invalidateTaskType(taskType: string): Promise<void> {
    await this.cache.invalidateByTags([taskType]);
  }

  async invalidateAdapter(adapter: string): Promise<void> {
    await this.cache.invalidateByTags([adapter]);
  }

  private generateTaskKey(
    taskType: string,
    prompt: string,
    adapter?: string
  ): string {
    const params = {
      type: taskType,
      prompt: prompt.substring(0, 100), // Use first 100 chars
      adapter: adapter || 'any'
    };
    
    return this.cache.generateKey('task', params);
  }

  private getTtlForTaskType(taskType: string): number {
    // Different TTLs for different task types
    const ttlMap: Record<string, number> = {
      'CODE_GENERATION': 1000 * 60 * 60 * 24,      // 24 hours
      'CODE_REVIEW': 1000 * 60 * 60 * 12,          // 12 hours
      'DEBUGGING': 1000 * 60 * 60 * 6,             // 6 hours
      'SEARCH': 1000 * 60 * 30,                    // 30 minutes
      'VALIDATION': 1000 * 60 * 60 * 48,           // 48 hours
      'DEFAULT': 1000 * 60 * 60 * 12               // 12 hours default
    };
    
    return ttlMap[taskType] || ttlMap.DEFAULT;
  }
}