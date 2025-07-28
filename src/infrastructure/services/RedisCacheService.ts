import Redis, { RedisOptions } from 'ioredis';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';
import { CacheService, CacheEntry, CacheOptions } from './CacheService';
import { Logger } from '../../application/interfaces/Logger';
import { MetricsCollector } from '../../application/interfaces/MetricsCollector';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface RedisCacheConfig extends RedisOptions {
  keyPrefix?: string;
  enableCompression?: boolean;
  compressionThreshold?: number; // Compress values larger than this (bytes)
  connectionPoolSize?: number;
}

export class RedisCacheService extends CacheService {
  private redis: Redis;
  private subscriber: Redis;
  private readonly keyPrefix: string;
  private readonly enableCompression: boolean;
  private readonly compressionThreshold: number;

  constructor(
    config: RedisCacheConfig,
    logger: Logger,
    metrics: MetricsCollector
  ) {
    super(logger, metrics);
    
    this.keyPrefix = config.keyPrefix || 'cache:';
    this.enableCompression = config.enableCompression ?? true;
    this.compressionThreshold = config.compressionThreshold || 1024; // 1KB
    
    // Create Redis client
    this.redis = new Redis({
      ...config,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn('Redis connection retry', { attempt: times, delay });
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    });

    // Create subscriber client for pub/sub
    this.subscriber = this.redis.duplicate();
    
    // Set up event handlers
    this.setupEventHandlers();
  }

  protected async doGet<T>(key: string): Promise<CacheEntry<T> | null> {
    const fullKey = this.getFullKey(key);
    const data = await this.redis.get(fullKey);
    
    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      
      // Decompress if needed
      if (parsed.compressed) {
        const decompressed = await gunzipAsync(Buffer.from(parsed.value, 'base64'));
        parsed.value = JSON.parse(decompressed.toString());
      }
      
      return parsed as CacheEntry<T>;
    } catch (error) {
      this.logger.error('Failed to parse cache entry', { key, error });
      await this.doDelete(key);
      return null;
    }
  }

  protected async doSet<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.getFullKey(key);
    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized);
    
    let finalValue: any = value;
    let compressed = false;
    
    // Compress if enabled and value is large enough
    if (options?.compress !== false && 
        this.enableCompression && 
        size > this.compressionThreshold) {
      const compressed_data = await gzipAsync(serialized);
      finalValue = compressed_data.toString('base64');
      compressed = true;
    }

    const entry: CacheEntry<T> = {
      value: finalValue as T,
      metadata: {
        key,
        createdAt: new Date(),
        expiresAt: options?.ttl ? new Date(Date.now() + options.ttl) : undefined,
        hits: 0,
        lastAccessed: new Date(),
        size,
        tags: options?.tags
      }
    };

    // Add compressed flag if applicable
    const toStore = compressed ? { ...entry, compressed: true } : entry;
    const entryString = JSON.stringify(toStore);
    
    if (options?.ttl) {
      await this.redis.setex(fullKey, Math.ceil(options.ttl / 1000), entryString);
    } else {
      await this.redis.set(fullKey, entryString);
    }
    
    // Handle tags
    if (options?.tags) {
      await this.tagKeys(key, options.tags);
    }
  }

  protected async doDelete(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    
    // Get entry to clean up tags
    const entry = await this.doGet<any>(key);
    if (entry?.metadata.tags) {
      await this.removeFromTags(key, entry.metadata.tags);
    }
    
    const result = await this.redis.del(fullKey);
    return result > 0;
  }

  protected async doClear(): Promise<void> {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.scanKeys(pattern);
    
    if (keys.length > 0) {
      // Use pipeline for efficiency
      const pipeline = this.redis.pipeline();
      for (const key of keys) {
        pipeline.del(key);
      }
      await pipeline.exec();
    }
  }

  protected async doGetKeys(pattern?: string): Promise<string[]> {
    const searchPattern = pattern 
      ? `${this.keyPrefix}${pattern}`
      : `${this.keyPrefix}*`;
    
    const fullKeys = await this.scanKeys(searchPattern);
    
    // Remove prefix from keys
    return fullKeys.map(key => key.substring(this.keyPrefix.length));
  }

  protected async doGetSize(): Promise<number> {
    const keys = await this.doGetKeys();
    let totalSize = 0;
    
    // Use pipeline to get all values efficiently
    const pipeline = this.redis.pipeline();
    for (const key of keys) {
      pipeline.get(this.getFullKey(key));
    }
    
    const results = await pipeline.exec();
    if (!results) return 0;
    
    for (const [err, data] of results) {
      if (!err && data) {
        try {
          const entry = JSON.parse(data as string);
          totalSize += entry.metadata?.size || 0;
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    return totalSize;
  }

  protected async tagKeys(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const tag of tags) {
      const tagKey = this.getTagKey(tag);
      pipeline.sadd(tagKey, key);
      // Set expiration for tag set (7 days)
      pipeline.expire(tagKey, 604800);
    }
    
    await pipeline.exec();
  }

  protected async getKeysByTag(tag: string): Promise<string[]> {
    const tagKey = this.getTagKey(tag);
    return await this.redis.smembers(tagKey);
  }

  private async removeFromTags(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const tag of tags) {
      const tagKey = this.getTagKey(tag);
      pipeline.srem(tagKey, key);
    }
    
    await pipeline.exec();
  }

  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private getTagKey(tag: string): string {
    return `${this.keyPrefix}tags:${tag}`;
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const [newCursor, batchKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      
      cursor = newCursor;
      keys.push(...batchKeys);
    } while (cursor !== '0');
    
    return keys;
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.logger.info('Redis connected');
      this.metrics.gauge('cache.redis.connected', 1);
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis error', { error });
      this.metrics.gauge('cache.redis.connected', 0);
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
      this.metrics.gauge('cache.redis.connected', 0);
    });

    this.redis.on('reconnecting', (delay: number) => {
      this.logger.info('Redis reconnecting', { delay });
    });
  }

  // Public methods specific to Redis
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async info(): Promise<Record<string, any>> {
    const info = await this.redis.info();
    const sections: Record<string, any> = {};
    
    // Parse Redis INFO output
    const lines = info.split('\r\n');
    let currentSection = 'general';
    
    for (const line of lines) {
      if (line.startsWith('#')) {
        currentSection = line.substring(2).toLowerCase();
        sections[currentSection] = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (!sections[currentSection]) {
          sections[currentSection] = {};
        }
        sections[currentSection][key] = value;
      }
    }
    
    return sections;
  }

  async flushdb(): Promise<void> {
    await this.redis.flushdb();
    this.resetStats();
  }

  async disconnect(): Promise<void> {
    await this.subscriber.quit();
    await this.redis.quit();
  }

  // Pub/Sub functionality for cache invalidation across instances
  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    
    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        handler(message);
      }
    });
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.redis.publish(channel, message);
  }

  // Advanced features
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    
    const fullKeys = keys.map(key => this.getFullKey(key));
    const values = await this.redis.mget(...fullKeys);
    
    return Promise.all(values.map(async (value, index) => {
      if (!value) {
        this.recordMiss(keys[index]);
        return null;
      }
      
      try {
        const entry = JSON.parse(value) as CacheEntry<T>;
        
        // Check expiration
        if (entry.metadata.expiresAt && new Date(entry.metadata.expiresAt) < new Date()) {
          await this.doDelete(keys[index]);
          this.recordMiss(keys[index]);
          return null;
        }
        
        this.recordHit(keys[index]);
        return entry.value;
      } catch {
        this.recordMiss(keys[index]);
        return null;
      }
    }));
  }

  async mset<T>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const { key, value, options } of entries) {
      const fullKey = this.getFullKey(key);
      const entry: CacheEntry<T> = {
        value,
        metadata: {
          key,
          createdAt: new Date(),
          expiresAt: options?.ttl ? new Date(Date.now() + options.ttl) : undefined,
          hits: 0,
          lastAccessed: new Date(),
          size: JSON.stringify(value).length,
          tags: options?.tags
        }
      };
      
      const entryString = JSON.stringify(entry);
      
      if (options?.ttl) {
        pipeline.setex(fullKey, Math.ceil(options.ttl / 1000), entryString);
      } else {
        pipeline.set(fullKey, entryString);
      }
      
      this.recordSet(key);
    }
    
    await pipeline.exec();
  }
}