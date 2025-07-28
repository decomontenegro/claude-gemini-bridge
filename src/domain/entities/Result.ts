import { TaskId } from '../value-objects/TaskId';
import { AdapterType } from '../value-objects/AdapterType';
import { ValidationResult } from '../interfaces/ValidationResult';

export interface ResultMetadata {
  executionTime: number; // in milliseconds
  tokensUsed?: number;
  model?: string;
  temperature?: number;
  retryCount?: number;
  validatedBy?: AdapterType;
  validationScore?: number;
}

export interface ResultProps {
  id: string;
  taskId: TaskId;
  output: string;
  adapter: AdapterType;
  metadata: ResultMetadata;
  createdAt: Date;
  error?: string;
}

export class Result {
  constructor(private props: ResultProps) {
    this.validate();
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get taskId(): TaskId {
    return this.props.taskId;
  }

  get output(): string {
    return this.props.output;
  }

  get adapter(): AdapterType {
    return this.props.adapter;
  }

  get metadata(): ResultMetadata {
    return { ...this.props.metadata };
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get error(): string | undefined {
    return this.props.error;
  }

  get isSuccess(): boolean {
    return !this.props.error;
  }

  get executionTime(): number {
    return this.props.metadata.executionTime;
  }

  // Business Logic
  public validate(): ValidationResult {
    const errors: string[] = [];

    if (!this.props.id) {
      errors.push('Result must have an ID');
    }

    if (!this.props.taskId) {
      errors.push('Result must be associated with a task');
    }

    if (!this.props.output && !this.props.error) {
      errors.push('Result must have either output or error');
    }

    if (this.props.metadata.executionTime < 0) {
      errors.push('Execution time cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public isValidatedBy(adapter: AdapterType): boolean {
    return this.props.metadata.validatedBy === adapter;
  }

  public setValidation(validatedBy: AdapterType, score: number): void {
    if (score < 0 || score > 1) {
      throw new Error('Validation score must be between 0 and 1');
    }

    this.props.metadata.validatedBy = validatedBy;
    this.props.metadata.validationScore = score;
  }

  public getQualityScore(): number {
    // Calculate quality score based on various factors
    let score = 1.0;

    // Penalize for retries
    if (this.props.metadata.retryCount) {
      score -= 0.1 * this.props.metadata.retryCount;
    }

    // Bonus for validation
    if (this.props.metadata.validationScore) {
      score = (score + this.props.metadata.validationScore) / 2;
    }

    // Penalize for slow execution (over 10 seconds)
    if (this.props.metadata.executionTime > 10000) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  public needsValidation(): boolean {
    // Results from certain operations should be validated
    return !this.props.metadata.validatedBy && this.props.metadata.executionTime > 5000;
  }

  public canBeValidatedBy(adapter: AdapterType): boolean {
    // Can't be validated by the same adapter that produced it
    return this.props.adapter !== adapter;
  }

  // Factory method
  public static createSuccess(
    taskId: TaskId,
    output: string,
    adapter: AdapterType,
    metadata: Omit<ResultMetadata, 'executionTime'> & { executionTime: number }
  ): Result {
    return new Result({
      id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      output,
      adapter,
      metadata,
      createdAt: new Date()
    });
  }

  public static createError(
    taskId: TaskId,
    error: string,
    adapter: AdapterType,
    executionTime: number
  ): Result {
    return new Result({
      id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      output: '',
      adapter,
      metadata: { executionTime },
      createdAt: new Date(),
      error
    });
  }

  // Conversion methods
  public toPrimitives(): Record<string, any> {
    return {
      id: this.props.id,
      taskId: this.props.taskId.value,
      output: this.props.output,
      adapter: this.props.adapter,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt.toISOString(),
      error: this.props.error,
      isSuccess: this.isSuccess,
      qualityScore: this.getQualityScore()
    };
  }
}