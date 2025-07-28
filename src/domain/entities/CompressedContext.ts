import { TaskId } from '../value-objects/TaskId';
import { CompressionType } from '../value-objects/CompressionType';
import { AdapterType } from '../value-objects/AdapterType';
import { DomainEvent } from '../interfaces/DomainEvent';

export interface CompressedPhaseData {
  embedding?: number[];
  summary?: string;
  metadata?: Record<string, any>;
  originalSize: number;
  compressedSize: number;
}

export interface CompressedContextPhases {
  analysis: CompressedPhaseData;
  routing: CompressedPhaseData;
  execution: CompressedPhaseData;
}

export interface CompressionMetadata {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  encodingModel: string;
  encodingAdapter: AdapterType;
  timestamp: Date;
  qualityScore?: number; // 0-1, how well the compression preserves information
  processingTime: number; // milliseconds
}

export interface CompressedContextProps {
  id: string;
  taskId: TaskId;
  compressionType: CompressionType;
  phases: CompressedContextPhases;
  metadata: CompressionMetadata;
  createdAt: Date;
  accessedAt?: Date;
  useCount: number;
  tags?: string[];
}

export class CompressedContext {
  private _events: DomainEvent[] = [];
  
  constructor(private props: CompressedContextProps) {
    this.validate();
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get taskId(): TaskId {
    return this.props.taskId;
  }

  get compressionType(): CompressionType {
    return this.props.compressionType;
  }

  get phases(): CompressedContextPhases {
    return { ...this.props.phases };
  }

  get metadata(): CompressionMetadata {
    return { ...this.props.metadata };
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get accessedAt(): Date | undefined {
    return this.props.accessedAt;
  }

  get useCount(): number {
    return this.props.useCount;
  }

  get tags(): string[] {
    return [...(this.props.tags || [])];
  }

  get events(): DomainEvent[] {
    return [...this._events];
  }

  // Business Logic
  private validate(): void {
    if (!this.props.id || this.props.id.trim().length === 0) {
      throw new Error('CompressedContext ID cannot be empty');
    }

    if (!this.props.taskId) {
      throw new Error('TaskId is required');
    }

    if (!this.props.phases) {
      throw new Error('Phases are required');
    }

    if (!this.props.metadata) {
      throw new Error('Metadata is required');
    }

    this.validatePhases();
    this.validateMetadata();
  }

  private validatePhases(): void {
    const requiredPhases = ['analysis', 'routing', 'execution'];
    
    for (const phase of requiredPhases) {
      if (!this.props.phases[phase as keyof CompressedContextPhases]) {
        throw new Error(`Phase '${phase}' is required`);
      }
    }

    // Validate compression type consistency
    for (const [phaseName, phaseData] of Object.entries(this.props.phases)) {
      if (this.props.compressionType === CompressionType.EMBEDDINGS && !phaseData.embedding) {
        throw new Error(`Phase '${phaseName}' must have embeddings for EMBEDDINGS compression`);
      }
      
      if (this.props.compressionType === CompressionType.SUMMARY && !phaseData.summary) {
        throw new Error(`Phase '${phaseName}' must have summary for SUMMARY compression`);
      }
      
      if (this.props.compressionType === CompressionType.HYBRID && 
          (!phaseData.embedding || !phaseData.summary)) {
        throw new Error(`Phase '${phaseName}' must have both embeddings and summary for HYBRID compression`);
      }
    }
  }

  private validateMetadata(): void {
    if (this.props.metadata.compressionRatio < 0 || this.props.metadata.compressionRatio > 1) {
      throw new Error('Compression ratio must be between 0 and 1');
    }

    if (this.props.metadata.originalSize <= 0) {
      throw new Error('Original size must be positive');
    }

    if (this.props.metadata.compressedSize <= 0) {
      throw new Error('Compressed size must be positive');
    }

    if (this.props.metadata.processingTime < 0) {
      throw new Error('Processing time cannot be negative');
    }
  }

  public markAccessed(): void {
    this.props.accessedAt = new Date();
    this.props.useCount += 1;

    this.addEvent({
      aggregateId: this.id,
      eventType: 'CompressedContextAccessed',
      eventData: {
        contextId: this.id,
        taskId: this.props.taskId.value,
        accessedAt: this.props.accessedAt,
        useCount: this.props.useCount
      },
      eventVersion: this._events.length + 1,
      timestamp: new Date()
    });
  }

  public addTag(tag: string): void {
    if (!this.props.tags) {
      this.props.tags = [];
    }

    if (!this.props.tags.includes(tag)) {
      this.props.tags.push(tag);

      this.addEvent({
        aggregateId: this.id,
        eventType: 'CompressedContextTagAdded',
        eventData: {
          contextId: this.id,
          tag,
          timestamp: new Date()
        },
        eventVersion: this._events.length + 1,
        timestamp: new Date()
      });
    }
  }

  public removeTag(tag: string): void {
    if (this.props.tags) {
      const index = this.props.tags.indexOf(tag);
      if (index > -1) {
        this.props.tags.splice(index, 1);

        this.addEvent({
          aggregateId: this.id,
          eventType: 'CompressedContextTagRemoved',
          eventData: {
            contextId: this.id,
            tag,
            timestamp: new Date()
          },
          eventVersion: this._events.length + 1,
          timestamp: new Date()
        });
      }
    }
  }

  public getSimilarityScore(other: CompressedContext): number {
    if (this.compressionType !== CompressionType.EMBEDDINGS && 
        this.compressionType !== CompressionType.HYBRID) {
      throw new Error('Similarity calculation requires embeddings');
    }

    if (other.compressionType !== CompressionType.EMBEDDINGS && 
        other.compressionType !== CompressionType.HYBRID) {
      throw new Error('Comparison context must have embeddings');
    }

    // Calculate cosine similarity between embeddings
    let totalSimilarity = 0;
    const phases = ['analysis', 'routing', 'execution'] as const;
    
    for (const phase of phases) {
      const thisEmbedding = this.phases[phase].embedding;
      const otherEmbedding = other.phases[phase].embedding;
      
      if (thisEmbedding && otherEmbedding) {
        const similarity = this.cosineSimilarity(thisEmbedding, otherEmbedding);
        totalSimilarity += similarity;
      }
    }

    return totalSimilarity / phases.length;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  public getCompressionEfficiency(): number {
    // Higher is better (more compression with maintained quality)
    const compressionBenefit = 1 - this.metadata.compressionRatio;
    const qualityPenalty = this.metadata.qualityScore ? (1 - this.metadata.qualityScore) : 0.2;
    
    return compressionBenefit - (qualityPenalty * 0.5);
  }

  public canBeDecompressed(): boolean {
    // Check if we have enough information to reconstruct meaningful context
    return this.compressionType === CompressionType.SUMMARY || 
           this.compressionType === CompressionType.HYBRID;
  }

  public clearEvents(): void {
    this._events = [];
  }

  private addEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  // Factory method
  public static create(props: Omit<CompressedContextProps, 'createdAt' | 'useCount'>): CompressedContext {
    return new CompressedContext({
      ...props,
      createdAt: new Date(),
      useCount: 0
    });
  }

  // Conversion methods
  public toPrimitives(): Record<string, any> {
    return {
      id: this.id,
      taskId: this.props.taskId.value,
      compressionType: this.compressionType,
      phases: this.phases,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      accessedAt: this.accessedAt?.toISOString(),
      useCount: this.useCount,
      tags: this.tags
    };
  }
}