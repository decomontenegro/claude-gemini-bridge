import { CompressionType, CompressionStrategies } from '../../domain/value-objects/CompressionType';
import { AdapterType } from '../../domain/value-objects/AdapterType';
import { Task } from '../../domain/entities/Task';
import { Result } from '../../domain/entities/Result';
import { 
  CompressedContext, 
  CompressedContextPhases, 
  CompressedPhaseData,
  CompressionMetadata 
} from '../../domain/entities/CompressedContext';
import { EmbeddingService, EmbeddingResult } from './EmbeddingService';
import { AIAdapter, AdapterRegistry } from '../../application/interfaces/AIAdapter';
import { Logger } from '../../application/interfaces/Logger';

export interface CompressionInput {
  task: Task;
  result: Result;
  routingInfo: {
    selectedAdapter: AdapterType;
    score: number;
    reasoning: string;
    alternatives: Array<{
      adapter: AdapterType;
      score: number;
      reason: string;
    }>;
  };
  executionMetrics: {
    duration: number;
    tokensUsed?: number;
    retryCount: number;
    validationScore?: number;
  };
}

export interface CompressionConfig {
  type: CompressionType;
  qualityThreshold?: number; // 0-1, minimum acceptable quality
  maxSummaryLength?: number;
  preserveCodeBlocks?: boolean;
  includeMetrics?: boolean;
}

export class CompressionService {
  constructor(
    private embeddingService: EmbeddingService,
    private adapterRegistry: AdapterRegistry,
    private logger: Logger
  ) {}

  async compressContext(
    input: CompressionInput,
    config: CompressionConfig
  ): Promise<CompressedContext> {
    const startTime = Date.now();
    
    this.logger.info('Starting context compression', {
      taskId: input.task.id.value,
      compressionType: config.type,
      originalTaskLength: input.task.prompt.length,
      originalResultLength: input.result.output.length
    });

    try {
      // Extract and prepare phase data
      const phaseData = this.extractPhaseData(input);
      
      // Compress each phase according to the strategy
      const compressedPhases = await this.compressPhases(phaseData, config);
      
      // Calculate compression metadata
      const metadata = this.calculateCompressionMetadata(
        phaseData,
        compressedPhases,
        input.routingInfo.selectedAdapter,
        Date.now() - startTime
      );

      // Create compressed context
      const compressedContext = CompressedContext.create({
        id: this.generateContextId(input.task.id.value),
        taskId: input.task.id,
        compressionType: config.type,
        phases: compressedPhases,
        metadata
      });

      this.logger.info('Context compression completed', {
        taskId: input.task.id.value,
        compressionRatio: metadata.compressionRatio,
        processingTime: metadata.processingTime,
        qualityScore: metadata.qualityScore
      });

      return compressedContext;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Context compression failed', {
        taskId: input.task.id.value,
        error: errorMessage,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  async decompressContext(
    compressedContext: CompressedContext,
    config?: { includeEmbeddings?: boolean }
  ): Promise<{
    reconstructedPrompt: string;
    routingInsights: string;
    executionSummary: string;
    confidence: number;
  }> {
    if (!compressedContext.canBeDecompressed()) {
      throw new Error('This compressed context cannot be meaningfully decompressed');
    }

    const phases = compressedContext.phases;
    
    const reconstructedPrompt = phases.analysis.summary || 
      'Task analysis not available in summary form';
      
    const routingInsights = phases.routing.summary || 
      `Routed to ${phases.routing.metadata?.selectedAdapter || 'unknown adapter'}`;
      
    const executionSummary = phases.execution.summary || 
      'Execution completed successfully';

    // Calculate confidence based on compression type and quality
    let confidence = 0.7; // Base confidence for summary-based decompression
    
    if (compressedContext.compressionType === CompressionType.HYBRID) {
      confidence = 0.85; // Higher confidence for hybrid
    }
    
    if (compressedContext.metadata.qualityScore) {
      confidence = confidence * compressedContext.metadata.qualityScore;
    }

    return {
      reconstructedPrompt,
      routingInsights,
      executionSummary,
      confidence
    };
  }

  private extractPhaseData(input: CompressionInput): {
    analysis: string;
    routing: string;
    execution: string;
  } {
    return {
      analysis: this.extractAnalysisData(input.task),
      routing: this.extractRoutingData(input.routingInfo),
      execution: this.extractExecutionData(input.result, input.executionMetrics)
    };
  }

  private extractAnalysisData(task: Task): string {
    const metadata = task.metadata;
    const analysis = [
      `Task Type: ${task.type}`,
      `Priority: ${task.priority.value}`,
      `Prompt Length: ${task.prompt.length} characters`,
      `Created: ${task.createdAt.toISOString()}`
    ];

    if (metadata.tags && metadata.tags.length > 0) {
      analysis.push(`Tags: ${metadata.tags.join(', ')}`);
    }

    if (metadata.context) {
      analysis.push(`Context: ${JSON.stringify(metadata.context)}`);
    }

    if (metadata.constraints) {
      analysis.push(`Constraints: ${JSON.stringify(metadata.constraints)}`);
    }

    analysis.push(`\nOriginal Prompt:\n${task.prompt}`);
    
    return analysis.join('\n');
  }

  private extractRoutingData(routingInfo: CompressionInput['routingInfo']): string {
    const routing = [
      `Selected Adapter: ${routingInfo.selectedAdapter}`,
      `Routing Score: ${routingInfo.score.toFixed(3)}`,
      `Reasoning: ${routingInfo.reasoning}`
    ];

    if (routingInfo.alternatives.length > 0) {
      routing.push('\nAlternative Options:');
      routingInfo.alternatives.forEach(alt => {
        routing.push(`- ${alt.adapter}: ${alt.score.toFixed(3)} (${alt.reason})`);
      });
    }

    return routing.join('\n');
  }

  private extractExecutionData(result: Result, metrics: CompressionInput['executionMetrics']): string {
    const execution = [
      `Status: ${result.isSuccess ? 'Success' : 'Failed'}`,
      `Duration: ${metrics.duration}ms`,
      `Retry Count: ${metrics.retryCount}`,
      `Result Length: ${result.output.length} characters`
    ];

    if (metrics.tokensUsed) {
      execution.push(`Tokens Used: ${metrics.tokensUsed}`);
    }

    if (metrics.validationScore) {
      execution.push(`Validation Score: ${metrics.validationScore.toFixed(3)}`);
    }

    if (result.error) {
      execution.push(`Error: ${result.error}`);
    } else {
      execution.push(`\nResult Output:\n${result.output}`);
    }

    return execution.join('\n');
  }

  private async compressPhases(
    phaseData: ReturnType<typeof this.extractPhaseData>,
    config: CompressionConfig
  ): Promise<CompressedContextPhases> {
    const compressedPhases: CompressedContextPhases = {
      analysis: await this.compressPhase(phaseData.analysis, config, 'analysis'),
      routing: await this.compressPhase(phaseData.routing, config, 'routing'),
      execution: await this.compressPhase(phaseData.execution, config, 'execution')
    };

    return compressedPhases;
  }

  private async compressPhase(
    data: string,
    config: CompressionConfig,
    phaseName: string
  ): Promise<CompressedPhaseData> {
    const originalSize = Buffer.byteLength(data, 'utf8');
    let compressedData: CompressedPhaseData = {
      originalSize,
      compressedSize: 0,
      metadata: {
        phase: phaseName,
        timestamp: new Date().toISOString()
      }
    };

    try {
      // Generate embeddings if required
      if (config.type === CompressionType.EMBEDDINGS || 
          config.type === CompressionType.HYBRID) {
        const embeddingResult = await this.embeddingService.generateEmbedding(data);
        compressedData.embedding = embeddingResult.embedding;
        compressedData.compressedSize += embeddingResult.dimensions * 4; // 4 bytes per float
        compressedData.metadata!.embeddingModel = embeddingResult.model;
        compressedData.metadata!.embeddingDimensions = embeddingResult.dimensions;
      }

      // Generate summary if required
      if (config.type === CompressionType.SUMMARY || 
          config.type === CompressionType.HYBRID) {
        const summary = await this.generateSummary(data, config);
        compressedData.summary = summary;
        compressedData.compressedSize += Buffer.byteLength(summary, 'utf8');
      }

      // For embeddings-only, store minimal metadata
      if (config.type === CompressionType.EMBEDDINGS) {
        const minimalMetadata = this.extractMinimalMetadata(data, phaseName);
        compressedData.metadata = { ...compressedData.metadata, ...minimalMetadata };
        compressedData.compressedSize += Buffer.byteLength(
          JSON.stringify(minimalMetadata), 
          'utf8'
        );
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compress ${phaseName} phase`, {
        error: errorMessage,
        dataLength: data.length
      });
      
      // Fallback to simple truncation
      const truncated = data.substring(0, config.maxSummaryLength || 500);
      compressedData.summary = truncated + (data.length > truncated.length ? '...' : '');
      compressedData.compressedSize = Buffer.byteLength(compressedData.summary, 'utf8');
    }

    return compressedData;
  }

  private async generateSummary(
    data: string, 
    config: CompressionConfig
  ): Promise<string> {
    const maxLength = config.maxSummaryLength || 200;
    
    // Try to get a smart summarization from an available adapter
    const summaryAdapter = this.getBestSummaryAdapter();
    
    if (summaryAdapter) {
      try {
        const summaryPrompt = this.buildSummaryPrompt(data, maxLength, config);
        
        // Create a temporary task for summarization
        const summaryTask = Task.create({
          prompt: summaryPrompt,
          type: 'DOCUMENTATION' as any,
          status: 'PENDING' as any,
          priority: { value: 'medium' } as any,
          metadata: {}
        });

        const summaryResult = await summaryAdapter.execute(summaryTask);
        
        if (summaryResult.output && summaryResult.output.length <= maxLength * 1.2) {
          return summaryResult.output.trim();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn('AI summarization failed, falling back to extraction', {
          error: errorMessage
        });
      }
    }

    // Fallback to extractive summarization
    return this.extractiveSummary(data, maxLength, config);
  }

  private getBestSummaryAdapter(): AIAdapter | null {
    // Prefer Claude for summarization, then GPT, then others
    const preferredOrder = [
      AdapterType.CLAUDE,
      AdapterType.OPENAI,
      AdapterType.COHERE,
      AdapterType.GEMINI
    ];

    for (const adapterType of preferredOrder) {
      const adapter = this.adapterRegistry.get(adapterType);
      if (adapter) {
        return adapter;
      }
    }

    return null;
  }

  private buildSummaryPrompt(
    data: string, 
    maxLength: number, 
    config: CompressionConfig
  ): string {
    let prompt = `Please create a concise summary of the following content in ${maxLength} characters or less. `;
    
    if (config.preserveCodeBlocks) {
      prompt += 'Preserve any important code snippets or technical details. ';
    }
    
    if (config.includeMetrics) {
      prompt += 'Include key metrics and performance data. ';
    }
    
    prompt += 'Focus on the most important information:\n\n';
    prompt += data;
    
    return prompt;
  }

  private extractiveSummary(
    data: string, 
    maxLength: number, 
    config: CompressionConfig
  ): string {
    // Simple extractive summarization
    const sentences = data.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) {
      return data.substring(0, maxLength);
    }

    // Score sentences by importance
    const scoredSentences = sentences.map(sentence => ({
      sentence: sentence.trim(),
      score: this.scoreSentence(sentence, config)
    }));

    // Sort by score and select best sentences that fit in maxLength
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let summary = '';
    for (const item of scoredSentences) {
      if (summary.length + item.sentence.length + 2 <= maxLength) {
        summary += (summary ? '. ' : '') + item.sentence;
      }
    }

    return summary || data.substring(0, maxLength);
  }

  private scoreSentence(sentence: string, config: CompressionConfig): number {
    let score = 0;
    
    // Length scoring (prefer medium-length sentences)
    const idealLength = 50;
    const lengthScore = 1 - Math.abs(sentence.length - idealLength) / idealLength;
    score += lengthScore * 0.3;
    
    // Keyword scoring
    const importantKeywords = [
      'error', 'success', 'completed', 'failed', 'duration', 'tokens',
      'function', 'method', 'class', 'component', 'service', 'api',
      'performance', 'optimization', 'issue', 'solution', 'result'
    ];
    
    const keywordCount = importantKeywords
      .filter(keyword => sentence.toLowerCase().includes(keyword))
      .length;
    score += keywordCount * 0.4;
    
    // Code block scoring
    if (config.preserveCodeBlocks && (
      sentence.includes('```') || 
      sentence.includes('function') ||
      sentence.includes('const ') ||
      sentence.includes('class ')
    )) {
      score += 0.5;
    }
    
    // Metrics scoring
    if (config.includeMetrics && /\d+(\.\d+)?\s*(ms|seconds?|minutes?|%|tokens?)/.test(sentence)) {
      score += 0.3;
    }
    
    return score;
  }

  private extractMinimalMetadata(data: string, phaseName: string): Record<string, any> {
    const metadata: Record<string, any> = {
      phase: phaseName,
      originalLength: data.length,
      wordCount: data.split(/\s+/).length
    };

    // Extract key-value pairs
    const kvRegex = /(\w+):\s*([^\n]+)/g;
    let match;
    const keyValues: Record<string, string> = {};
    
    while ((match = kvRegex.exec(data)) !== null) {
      keyValues[match[1]] = match[2].trim();
    }
    
    if (Object.keys(keyValues).length > 0) {
      metadata.keyValues = keyValues;
    }

    // Extract numbers (likely metrics)
    const numbers = data.match(/\d+(\.\d+)?/g);
    if (numbers && numbers.length > 0) {
      metadata.numericValues = numbers.slice(0, 5); // Keep first 5 numbers
    }

    return metadata;
  }

  private calculateCompressionMetadata(
    originalPhases: ReturnType<typeof this.extractPhaseData>,
    compressedPhases: CompressedContextPhases,
    encodingAdapter: AdapterType,
    processingTime: number
  ): CompressionMetadata {
    const originalSize = Object.values(originalPhases)
      .reduce((sum, data) => sum + Buffer.byteLength(data, 'utf8'), 0);
    
    const compressedSize = Object.values(compressedPhases)
      .reduce((sum, phase) => sum + phase.compressedSize, 0);

    const compressionRatio = compressedSize / originalSize;
    
    // Estimate quality score based on compression type and ratio
    let qualityScore = 0.8; // Base quality
    
    if (compressionRatio < 0.1) {
      qualityScore = 0.9; // High compression usually means good semantic preservation
    } else if (compressionRatio > 0.5) {
      qualityScore = 0.6; // Low compression might indicate poor summarization
    }

    return {
      originalSize,
      compressedSize,
      compressionRatio,
      encodingModel: 'multi-phase-compression',
      encodingAdapter,
      timestamp: new Date(),
      qualityScore,
      processingTime
    };
  }

  private generateContextId(taskId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ctx_${taskId}_${timestamp}_${random}`;
  }
}