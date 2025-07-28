import { AdapterType } from '../../domain/value-objects/AdapterType';
import { AIAdapter, AdapterRegistry } from '../../application/interfaces/AIAdapter';
import { Logger } from '../../application/interfaces/Logger';

export interface EmbeddingConfig {
  model?: string;
  dimensions?: number;
  maxTokens?: number;
  batchSize?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  tokensUsed: number;
  processingTime: number;
}

export interface EmbeddingServiceConfig {
  preferredAdapter: AdapterType;
  fallbackAdapters: AdapterType[];
  defaultConfig: EmbeddingConfig;
  cache?: boolean;
  cacheTTL?: number; // seconds
}

export class EmbeddingService {
  private cache: Map<string, EmbeddingResult> = new Map();

  constructor(
    private config: EmbeddingServiceConfig,
    private adapterRegistry: AdapterRegistry,
    private logger: Logger
  ) {}

  async generateEmbedding(
    text: string,
    config?: EmbeddingConfig
  ): Promise<EmbeddingResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(text, config);
    
    // Check cache first
    if (this.config.cache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      this.logger.debug('Embedding cache hit', { textLength: text.length });
      return cached;
    }

    const effectiveConfig = { ...this.config.defaultConfig, ...config };
    
    // Try preferred adapter first, then fallbacks
    const adaptersToTry = [
      this.config.preferredAdapter,
      ...this.config.fallbackAdapters
    ];

    for (const adapterType of adaptersToTry) {
      try {
        const adapter = this.adapterRegistry.get(adapterType);
        if (!adapter || !await adapter.isAvailable()) {
          continue;
        }

        const result = await this.generateWithAdapter(
          adapter, 
          text, 
          effectiveConfig
        );

        result.processingTime = Date.now() - startTime;

        // Cache the result
        if (this.config.cache) {
          this.cache.set(cacheKey, result);
          
          // Set cache expiration
          if (this.config.cacheTTL) {
            setTimeout(() => {
              this.cache.delete(cacheKey);
            }, this.config.cacheTTL * 1000);
          }
        }

        this.logger.info('Embedding generated successfully', {
          adapter: adapterType,
          textLength: text.length,
          dimensions: result.dimensions,
          processingTime: result.processingTime
        });

        return result;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn('Embedding generation failed with adapter', {
          adapter: adapterType,
          error: errorMessage
        });
        continue;
      }
    }

    throw new Error('Failed to generate embedding with all available adapters');
  }

  async generateBatchEmbeddings(
    texts: string[],
    config?: EmbeddingConfig
  ): Promise<EmbeddingResult[]> {
    const batchSize = config?.batchSize || this.config.defaultConfig.batchSize || 10;
    const results: EmbeddingResult[] = [];

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text, config));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error('Batch embedding generation failed', {
          batchStart: i,
          batchSize: batch.length,
          error: errorMessage
        });
        throw error;
      }
    }

    return results;
  }

  async calculateSimilarity(
    embedding1: number[],
    embedding2: number[]
  ): Promise<number> {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    return this.cosineSimilarity(embedding1, embedding2);
  }

  async findSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: Array<{ id: string; embedding: number[] }>,
    topK = 5,
    minSimilarity = 0.7
  ): Promise<Array<{ id: string; similarity: number }>> {
    const similarities = candidateEmbeddings
      .map(candidate => ({
        id: candidate.id,
        similarity: this.cosineSimilarity(queryEmbedding, candidate.embedding)
      }))
      .filter(result => result.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return similarities;
  }

  private async generateWithAdapter(
    adapter: AIAdapter,
    text: string,
    config: EmbeddingConfig
  ): Promise<EmbeddingResult> {
    // Different adapters have different embedding approaches
    switch (adapter.type) {
      case AdapterType.OPENAI:
        return this.generateOpenAIEmbedding(adapter, text, config);
      
      case AdapterType.COHERE:
        return this.generateCohereEmbedding(adapter, text, config);
      
      case AdapterType.HUGGINGFACE:
        return this.generateHuggingFaceEmbedding(adapter, text, config);
      
      case AdapterType.CLAUDE:
      case AdapterType.GEMINI:
        // These don't have dedicated embedding APIs, so we use text compression
        return this.generateTextBasedEmbedding(adapter, text, config);
      
      default:
        throw new Error(`Embedding not supported for adapter: ${adapter.type}`);
    }
  }

  private async generateOpenAIEmbedding(
    adapter: AIAdapter,
    text: string,
    config: EmbeddingConfig
  ): Promise<EmbeddingResult> {
    // Simulate OpenAI embedding API call
    // In real implementation, this would use the actual OpenAI embedding endpoint
    const model = config.model || 'text-embedding-ada-002';
    
    // For now, return a mock embedding
    // TODO: Implement actual OpenAI embedding call
    return {
      embedding: this.generateMockEmbedding(1536), // Ada-002 dimensions
      model,
      dimensions: 1536,
      tokensUsed: Math.ceil(text.length / 4), // Rough token estimate
      processingTime: 0 // Will be set by caller
    };
  }

  private async generateCohereEmbedding(
    adapter: AIAdapter,
    text: string,
    config: EmbeddingConfig
  ): Promise<EmbeddingResult> {
    const model = config.model || 'embed-english-v3.0';
    
    // TODO: Implement actual Cohere embedding call
    return {
      embedding: this.generateMockEmbedding(1024), // Cohere dimensions
      model,
      dimensions: 1024,
      tokensUsed: Math.ceil(text.length / 4),
      processingTime: 0
    };
  }

  private async generateHuggingFaceEmbedding(
    adapter: AIAdapter,
    text: string,
    config: EmbeddingConfig
  ): Promise<EmbeddingResult> {
    const model = config.model || 'sentence-transformers/all-MiniLM-L6-v2';
    
    // TODO: Implement actual HuggingFace embedding call
    return {
      embedding: this.generateMockEmbedding(384), // MiniLM dimensions
      model,
      dimensions: 384,
      tokensUsed: Math.ceil(text.length / 4),
      processingTime: 0
    };
  }

  private async generateTextBasedEmbedding(
    adapter: AIAdapter,
    text: string,
    config: EmbeddingConfig
  ): Promise<EmbeddingResult> {
    // For adapters without dedicated embedding APIs,
    // we create a pseudo-embedding from text features
    const features = this.extractTextFeatures(text);
    
    return {
      embedding: features,
      model: `${adapter.type}-text-features`,
      dimensions: features.length,
      tokensUsed: Math.ceil(text.length / 4),
      processingTime: 0
    };
  }

  private extractTextFeatures(text: string): number[] {
    // Extract various text features to create a pseudo-embedding
    const features: number[] = [];
    
    // Length features
    features.push(text.length / 1000); // Normalized length
    features.push(text.split(' ').length / 100); // Normalized word count
    features.push(text.split('\n').length / 10); // Normalized line count
    
    // Character frequency features (simplified)
    const charFreq = new Map<string, number>();
    for (const char of text.toLowerCase()) {
      charFreq.set(char, (charFreq.get(char) || 0) + 1);
    }
    
    // Common characters
    const commonChars = ['a', 'e', 'i', 'o', 'u', 't', 'n', 's', 'r', 'l'];
    for (const char of commonChars) {
      features.push((charFreq.get(char) || 0) / text.length);
    }
    
    // Word frequency features
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
    
    // Programming-related keywords
    const progKeywords = ['function', 'class', 'const', 'let', 'var', 'import', 'export'];
    for (const keyword of progKeywords) {
      features.push((wordFreq.get(keyword) || 0) / words.length);
    }
    
    // Pad to 128 dimensions with noise for uniqueness
    while (features.length < 128) {
      features.push(Math.random() * 0.1 - 0.05); // Small random noise
    }
    
    return features;
  }

  private generateMockEmbedding(dimensions: number): number[] {
    // Generate a normalized random vector
    const embedding = Array.from(
      { length: dimensions }, 
      () => Math.random() * 2 - 1
    );
    
    // Normalize to unit vector
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimensions');
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

  private getCacheKey(text: string, config?: EmbeddingConfig): string {
    const configStr = config ? JSON.stringify(config) : '';
    return `${text.length}:${text.substring(0, 100)}:${configStr}`;
  }

  // Cleanup methods
  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size
      // TODO: Implement hit rate tracking
    };
  }
}