import { TaskId } from '../value-objects/TaskId';
import { TaskType } from '../value-objects/TaskType';
import { TaskStatus } from '../value-objects/TaskStatus';
import { Priority } from '../value-objects/Priority';
import { DomainEvent } from '../interfaces/DomainEvent';
import { ValidationResult } from '../interfaces/ValidationResult';
import { AdapterType } from '../value-objects/AdapterType';

export interface TaskMetadata {
  tags?: string[];
  context?: Record<string, any>;
  constraints?: {
    timeout?: number;
    maxRetries?: number;
    preferredAdapter?: AdapterType;
  };
}

export interface TaskProps {
  id: TaskId;
  prompt: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  metadata: TaskMetadata;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  templateId?: string;
}

export class Task {
  private _events: DomainEvent[] = [];
  
  constructor(private props: TaskProps) {
    this.validate();
  }

  // Getters
  get id(): TaskId {
    return this.props.id;
  }

  get prompt(): string {
    return this.props.prompt;
  }

  get type(): TaskType {
    return this.props.type;
  }

  get status(): TaskStatus {
    return this.props.status;
  }

  get priority(): Priority {
    return this.props.priority;
  }

  get metadata(): TaskMetadata {
    return { ...this.props.metadata };
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get userId(): string | undefined {
    return this.props.userId;
  }

  get templateId(): string | undefined {
    return this.props.templateId;
  }

  get events(): DomainEvent[] {
    return [...this._events];
  }

  // Business Logic
  public validate(): ValidationResult {
    const errors: string[] = [];

    if (!this.props.prompt || this.props.prompt.trim().length === 0) {
      errors.push('Task prompt cannot be empty');
    }

    if (this.props.prompt && this.props.prompt.length > 10000) {
      errors.push('Task prompt cannot exceed 10000 characters');
    }

    if (this.props.metadata.constraints?.timeout && this.props.metadata.constraints.timeout < 1000) {
      errors.push('Timeout must be at least 1000ms');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public canBeExecutedBy(adapterType: AdapterType): boolean {
    // Check if task type is compatible with adapter
    const compatibilityMap: Record<TaskType, AdapterType[]> = {
      [TaskType.CODE_GENERATION]: [AdapterType.CLAUDE, AdapterType.GEMINI],
      [TaskType.CODE_REVIEW]: [AdapterType.CLAUDE, AdapterType.GEMINI],
      [TaskType.DEBUGGING]: [AdapterType.CLAUDE, AdapterType.GEMINI],
      [TaskType.REFACTORING]: [AdapterType.CLAUDE],
      [TaskType.DOCUMENTATION]: [AdapterType.CLAUDE, AdapterType.GEMINI],
      [TaskType.TESTING]: [AdapterType.CLAUDE],
      [TaskType.ARCHITECTURE]: [AdapterType.CLAUDE, AdapterType.GEMINI],
      [TaskType.SEARCH]: [AdapterType.GEMINI],
      [TaskType.MULTIMODAL]: [AdapterType.GEMINI],
      [TaskType.VALIDATION]: [AdapterType.CLAUDE]
    };

    return compatibilityMap[this.props.type]?.includes(adapterType) ?? false;
  }

  public canTransitionTo(newStatus: TaskStatus): boolean {
    const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED],
      [TaskStatus.COMPLETED]: [TaskStatus.VALIDATED],
      [TaskStatus.FAILED]: [TaskStatus.PENDING], // Allow retry
      [TaskStatus.CANCELLED]: [],
      [TaskStatus.VALIDATED]: []
    };

    return allowedTransitions[this.props.status]?.includes(newStatus) ?? false;
  }

  public updateStatus(newStatus: TaskStatus): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(`Cannot transition from ${this.props.status} to ${newStatus}`);
    }

    const oldStatus = this.props.status;
    this.props.status = newStatus;
    this.props.updatedAt = new Date();

    this.addEvent({
      aggregateId: this.id.value,
      eventType: 'TaskStatusUpdated',
      eventData: {
        taskId: this.id.value,
        oldStatus: oldStatus,
        newStatus: newStatus,
        updatedAt: this.props.updatedAt
      },
      eventVersion: this._events.length + 1,
      timestamp: new Date()
    });
  }

  public updatePrompt(newPrompt: string): void {
    if (this.props.status !== TaskStatus.PENDING) {
      throw new Error('Can only update prompt when task is pending');
    }

    this.props.prompt = newPrompt;
    this.props.updatedAt = new Date();

    this.addEvent({
      aggregateId: this.id.value,
      eventType: 'TaskPromptUpdated',
      eventData: {
        taskId: this.id.value,
        newPrompt: newPrompt,
        updatedAt: this.props.updatedAt
      },
      eventVersion: this._events.length + 1,
      timestamp: new Date()
    });
  }

  public updatePriority(newPriority: Priority): void {
    const oldPriority = this.props.priority;
    this.props.priority = newPriority;
    this.props.updatedAt = new Date();

    this.addEvent({
      aggregateId: this.id.value,
      eventType: 'TaskPriorityUpdated',
      eventData: {
        taskId: this.id.value,
        oldPriority: oldPriority.value,
        newPriority: newPriority.value,
        updatedAt: this.props.updatedAt
      },
      eventVersion: this._events.length + 1,
      timestamp: new Date()
    });
  }

  public addTag(tag: string): void {
    if (!this.props.metadata.tags) {
      this.props.metadata.tags = [];
    }

    if (!this.props.metadata.tags.includes(tag)) {
      this.props.metadata.tags.push(tag);
      this.props.updatedAt = new Date();

      this.addEvent({
        aggregateId: this.id.value,
        eventType: 'TaskTagAdded',
        eventData: {
          taskId: this.id.value,
          tag: tag,
          updatedAt: this.props.updatedAt
        },
        eventVersion: this._events.length + 1,
        timestamp: new Date()
      });
    }
  }

  public removeTag(tag: string): void {
    if (this.props.metadata.tags) {
      const index = this.props.metadata.tags.indexOf(tag);
      if (index > -1) {
        this.props.metadata.tags.splice(index, 1);
        this.props.updatedAt = new Date();

        this.addEvent({
          aggregateId: this.id.value,
          eventType: 'TaskTagRemoved',
          eventData: {
            taskId: this.id.value,
            tag: tag,
            updatedAt: this.props.updatedAt
          },
          eventVersion: this._events.length + 1,
          timestamp: new Date()
        });
      }
    }
  }

  public setPreferredAdapter(adapter: AdapterType): void {
    if (!this.canBeExecutedBy(adapter)) {
      throw new Error(`Task type ${this.props.type} cannot be executed by ${adapter}`);
    }

    if (!this.props.metadata.constraints) {
      this.props.metadata.constraints = {};
    }

    this.props.metadata.constraints.preferredAdapter = adapter;
    this.props.updatedAt = new Date();

    this.addEvent({
      aggregateId: this.id.value,
      eventType: 'TaskPreferredAdapterSet',
      eventData: {
        taskId: this.id.value,
        adapter: adapter,
        updatedAt: this.props.updatedAt
      },
      eventVersion: this._events.length + 1,
      timestamp: new Date()
    });
  }

  public clearEvents(): void {
    this._events = [];
  }

  private addEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  // Factory method
  public static create(props: Omit<TaskProps, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const now = new Date();
    return new Task({
      ...props,
      id: TaskId.generate(),
      createdAt: now,
      updatedAt: now
    });
  }

  // Reconstitution from events
  public static fromEvents(id: TaskId, events: DomainEvent[]): Task {
    // This would rebuild the task from its event history
    // Implementation depends on event sourcing requirements
    throw new Error('Not implemented yet');
  }

  // Conversion methods
  public toPrimitives(): Record<string, any> {
    return {
      id: this.props.id.value,
      prompt: this.props.prompt,
      type: this.props.type,
      status: this.props.status,
      priority: this.props.priority.value,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      userId: this.props.userId,
      templateId: this.props.templateId
    };
  }
}