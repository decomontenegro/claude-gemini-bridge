import { Task } from '../../domain/entities/Task';
import { Result } from '../../domain/entities/Result';
import { CompressedContext } from '../../domain/entities/CompressedContext';
import { TaskId } from '../../domain/value-objects/TaskId';
import { CompressionType, getOptimalCompressionType } from '../../domain/value-objects/CompressionType';
import { AdapterType } from '../../domain/value-objects/AdapterType';
import { CompressedContextRepository } from '../../domain/repositories/CompressedContextRepository';
import { TaskRepository } from '../../domain/repositories/TaskRepository';
import { ResultRepository } from '../../domain/repositories/ResultRepository';
import { CompressionService, CompressionInput, CompressionConfig } from '../../infrastructure/services/CompressionService';
import { EventBus } from '../interfaces/EventBus';
import { Logger } from '../interfaces/Logger';
import { MetricsCollector } from '../interfaces/MetricsCollector';

export interface CompressContextCommand {
  taskId: string;
  compressionType?: CompressionType;
  config?: {
    qualityThreshold?: number;
    maxSummaryLength?: number;
    preserveCodeBlocks?: boolean;
    includeMetrics?: boolean;
    enableSimilaritySearch?: boolean;
    tags?: string[];
  };
}

export interface CompressContextResult {
  contextId: string;
  taskId: string;
  compressionType: CompressionType;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  qualityScore: number;
  processingTime: number;
  similarContexts?: Array<{
    contextId: string;
    similarity: number;
    taskId: string;
  }>;
}

export class CompressContextUseCase {
  constructor(
    private taskRepository: TaskRepository,
    private resultRepository: ResultRepository,
    private compressedContextRepository: CompressedContextRepository,
    private compressionService: CompressionService,
    private eventBus: EventBus,
    private logger: Logger,
    private metrics: MetricsCollector
  ) {}

  async execute(command: CompressContextCommand): Promise<CompressContextResult> {
    const startTime = Date.now();
    const taskId = TaskId.fromString(command.taskId);
    
    this.logger.info('Starting context compression', {
      taskId: command.taskId,
      requestedType: command.compressionType
    });

    try {
      // Load task and its result
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new Error(`Task not found: ${command.taskId}`);
      }

      const results = await this.resultRepository.findByTaskId(taskId);
      if (results.length === 0) {
        throw new Error(`No results found for task: ${command.taskId}`);
      }

      // Use the latest successful result
      const result = results
        .filter(r => r.isSuccess)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

      if (!result) {
        throw new Error(`No successful results found for task: ${command.taskId}`);
      }

      // Check if context is already compressed
      const existingContexts = await this.compressedContextRepository.findByTaskId(taskId);
      if (existingContexts.length > 0 && !command.compressionType) {
        this.logger.info('Task already has compressed context', {
          taskId: command.taskId,
          existingContextsCount: existingContexts.length
        });
        
        // Return the most recent one
        const latest = existingContexts
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        
        return this.buildResult(latest, []);
      }

      // Determine optimal compression type
      const compressionType = command.compressionType || this.determineOptimalCompressionType(
        task,
        result,
        command.config
      );

      // Prepare compression input
      const compressionInput = await this.prepareCompressionInput(task, result);
      
      // Configure compression
      const compressionConfig: CompressionConfig = {
        type: compressionType,
        qualityThreshold: command.config?.qualityThreshold || 0.7,
        maxSummaryLength: command.config?.maxSummaryLength || 300,
        preserveCodeBlocks: command.config?.preserveCodeBlocks ?? true,
        includeMetrics: command.config?.includeMetrics ?? true
      };

      // Perform compression
      const compressedContext = await this.compressionService.compressContext(
        compressionInput,
        compressionConfig
      );

      // Add user-provided tags
      if (command.config?.tags) {
        for (const tag of command.config.tags) {
          compressedContext.addTag(tag);
        }
      }

      // Save compressed context
      await this.compressedContextRepository.save(compressedContext);

      // Find similar contexts if requested
      let similarContexts: CompressContextResult['similarContexts'] = [];
      if (command.config?.enableSimilaritySearch && 
          (compressionType === CompressionType.EMBEDDINGS || 
           compressionType === CompressionType.HYBRID)) {
        
        similarContexts = await this.findSimilarContexts(compressedContext);
      }

      // Emit events
      await this.eventBus.emit('context:compressed', {
        contextId: compressedContext.id,
        taskId: command.taskId,
        compressionType,
        compressionRatio: compressedContext.metadata.compressionRatio,
        timestamp: new Date()
      });

      // Record metrics
      this.metrics.recordContextCompression({
        compressionType,
        originalSize: compressedContext.metadata.originalSize,
        compressedSize: compressedContext.metadata.compressedSize,
        compressionRatio: compressedContext.metadata.compressionRatio,
        processingTime: Date.now() - startTime,
        qualityScore: compressedContext.metadata.qualityScore || 0
      });

      const result_data = this.buildResult(compressedContext, similarContexts);

      this.logger.info('Context compression completed successfully', {
        taskId: command.taskId,
        contextId: compressedContext.id,
        compressionRatio: result_data.compressionRatio,
        processingTime: result_data.processingTime
      });

      return result_data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Context compression failed', {
        taskId: command.taskId,
        error: errorMessage,
        processingTime: Date.now() - startTime
      });

      await this.eventBus.emit('context:compression_failed', {
        taskId: command.taskId,
        error: errorMessage,
        timestamp: new Date()
      });

      throw error;
    }
  }

  private determineOptimalCompressionType(
    task: Task,
    result: Result,
    config?: CompressContextCommand['config']
  ): CompressionType {
    const totalSize = task.prompt.length + result.output.length;
    const requiresSimilaritySearch = config?.enableSimilaritySearch ?? false;
    const preserveReadability = config?.preserveCodeBlocks ?? true;
    
    // Use the domain logic to determine optimal type
    let optimalType = getOptimalCompressionType(
      totalSize,
      requiresSimilaritySearch,
      preserveReadability
    );

    // Override based on task characteristics
    if (task.type === 'CODE_GENERATION' || task.type === 'REFACTORING') {
      // Code tasks benefit from hybrid compression
      optimalType = CompressionType.HYBRID;
    } else if (totalSize > 10000) {
      // Large contexts benefit from embeddings
      optimalType = CompressionType.EMBEDDINGS;
    }

    this.logger.debug('Determined optimal compression type', {
      taskId: task.id.value,
      taskType: task.type,
      totalSize,
      selectedType: optimalType
    });

    return optimalType;
  }

  private async prepareCompressionInput(
    task: Task,
    result: Result
  ): Promise<CompressionInput> {
    // In a real implementation, routing info would come from the execution context
    // For now, we'll infer it from the result
    const routingInfo = {
      selectedAdapter: result.adapter,
      score: 0.95, // Assume good routing
      reasoning: `Selected ${result.adapter} for ${task.type} task`,
      alternatives: [] as Array<{
        adapter: AdapterType;
        score: number;
        reason: string;
      }>
    };

    const executionMetrics = {
      duration: result.executionTime,
      tokensUsed: result.metadata.tokensUsed,
      retryCount: result.metadata.retryCount || 0,
      validationScore: result.metadata.validationScore
    };

    return {
      task,
      result,
      routingInfo,
      executionMetrics
    };
  }

  private async findSimilarContexts(
    compressedContext: CompressedContext
  ): Promise<CompressContextResult['similarContexts']> {
    try {
      const similarResults = await this.compressedContextRepository.findSimilar(
        compressedContext,
        5, // limit
        0.7 // min similarity
      );

      return similarResults.map(item => ({
        contextId: item.context.id,
        similarity: item.similarity,
        taskId: item.context.taskId.value
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to find similar contexts', {
        contextId: compressedContext.id,
        error: errorMessage
      });
      return [];
    }
  }

  private buildResult(
    compressedContext: CompressedContext,
    similarContexts: CompressContextResult['similarContexts']
  ): CompressContextResult {
    return {
      contextId: compressedContext.id,
      taskId: compressedContext.taskId.value,
      compressionType: compressedContext.compressionType,
      originalSize: compressedContext.metadata.originalSize,
      compressedSize: compressedContext.metadata.compressedSize,
      compressionRatio: compressedContext.metadata.compressionRatio,
      qualityScore: compressedContext.metadata.qualityScore || 0,
      processingTime: compressedContext.metadata.processingTime,
      similarContexts
    };
  }
}

// Decompression Use Case
export interface DecompressContextCommand {
  contextId: string;
  includeEmbeddings?: boolean;
}

export interface DecompressContextResult {
  contextId: string;
  taskId: string;
  reconstructedPrompt: string;
  routingInsights: string;
  executionSummary: string;
  confidence: number;
  compressionType: CompressionType;
  originalMetadata: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    createdAt: string;
  };
}

export class DecompressContextUseCase {
  constructor(
    private compressedContextRepository: CompressedContextRepository,
    private compressionService: CompressionService,
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  async execute(command: DecompressContextCommand): Promise<DecompressContextResult> {
    this.logger.info('Starting context decompression', {
      contextId: command.contextId
    });

    try {
      // Load compressed context
      const compressedContext = await this.compressedContextRepository.findById(command.contextId);
      if (!compressedContext) {
        throw new Error(`Compressed context not found: ${command.contextId}`);
      }

      // Mark as accessed
      compressedContext.markAccessed();
      await this.compressedContextRepository.save(compressedContext);

      // Decompress
      const decompressed = await this.compressionService.decompressContext(
        compressedContext,
        { includeEmbeddings: command.includeEmbeddings }
      );

      // Emit event
      await this.eventBus.emit('context:decompressed', {
        contextId: command.contextId,
        taskId: compressedContext.taskId.value,
        confidence: decompressed.confidence,
        timestamp: new Date()
      });

      const result: DecompressContextResult = {
        contextId: command.contextId,
        taskId: compressedContext.taskId.value,
        reconstructedPrompt: decompressed.reconstructedPrompt,
        routingInsights: decompressed.routingInsights,
        executionSummary: decompressed.executionSummary,
        confidence: decompressed.confidence,
        compressionType: compressedContext.compressionType,
        originalMetadata: {
          originalSize: compressedContext.metadata.originalSize,
          compressedSize: compressedContext.metadata.compressedSize,
          compressionRatio: compressedContext.metadata.compressionRatio,
          createdAt: compressedContext.createdAt.toISOString()
        }
      };

      this.logger.info('Context decompression completed', {
        contextId: command.contextId,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Context decompression failed', {
        contextId: command.contextId,
        error: errorMessage
      });

      await this.eventBus.emit('context:decompression_failed', {
        contextId: command.contextId,
        error: errorMessage,
        timestamp: new Date()
      });

      throw error;
    }
  }
}