import { Task } from '../../domain/entities/Task';
import { TaskRepository } from '../../domain/repositories/TaskRepository';
import { TemplateRepository } from '../../domain/repositories/TemplateRepository';
import { TaskType } from '../../domain/value-objects/TaskType';
import { TaskStatus } from '../../domain/value-objects/TaskStatus';
import { Priority } from '../../domain/value-objects/Priority';
import { ValidationError, TemplateNotFoundError } from '../../domain/errors';
import { EventBus } from '../interfaces/EventBus';
import { Logger } from '../interfaces/Logger';

export interface CreateTaskCommand {
  prompt: string;
  type: TaskType;
  priority?: number;
  userId?: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
  metadata?: {
    tags?: string[];
    context?: Record<string, any>;
    constraints?: {
      timeout?: number;
      maxRetries?: number;
      preferredAdapter?: string;
    };
  };
}

export interface CreateTaskResult {
  taskId: string;
  status: TaskStatus;
  createdAt: Date;
}

export class CreateTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly templateRepository: TemplateRepository,
    private readonly eventBus: EventBus,
    private readonly logger: Logger
  ) {}

  async execute(command: CreateTaskCommand): Promise<CreateTaskResult> {
    this.logger.info('Creating new task', { command });

    try {
      // Process template if provided
      let finalPrompt = command.prompt;
      if (command.templateId) {
        finalPrompt = await this.processTemplate(
          command.templateId,
          command.templateVariables || {}
        );
      }

      // Create task entity
      const task = Task.create({
        prompt: finalPrompt,
        type: command.type,
        status: TaskStatus.PENDING,
        priority: command.priority ? Priority.fromValue(command.priority) : Priority.MEDIUM,
        metadata: command.metadata || {},
        userId: command.userId,
        templateId: command.templateId
      });

      // Validate task
      const validationResult = task.validate();
      if (!validationResult.isValid) {
        throw new ValidationError(validationResult.errors);
      }

      // Save to repository
      await this.taskRepository.save(task);

      // Emit event
      await this.eventBus.emit('task:created', {
        taskId: task.id.value,
        type: task.type,
        userId: command.userId,
        timestamp: new Date()
      });

      this.logger.info('Task created successfully', { taskId: task.id.value });

      return {
        taskId: task.id.value,
        status: task.status,
        createdAt: task.createdAt
      };
    } catch (error) {
      this.logger.error('Failed to create task', { error, command });
      throw error;
    }
  }

  private async processTemplate(
    templateId: string,
    variables: Record<string, any>
  ): Promise<string> {
    const template = await this.templateRepository.findById(templateId);
    if (!template) {
      throw new TemplateNotFoundError(templateId);
    }

    // Validate variables
    const validationResult = template.validateVariables(variables);
    if (!validationResult.isValid) {
      throw new ValidationError(validationResult.errors);
    }

    // Render prompt
    const prompt = template.renderPrompt(variables);

    // Increment template usage
    await this.templateRepository.incrementUsage(templateId);

    return prompt;
  }
}