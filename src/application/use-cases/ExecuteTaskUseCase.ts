import { Task } from '../../domain/entities/Task';
import { Result } from '../../domain/entities/Result';
import { TaskId } from '../../domain/value-objects/TaskId';
import { TaskStatus } from '../../domain/value-objects/TaskStatus';
import { AdapterType } from '../../domain/value-objects/AdapterType';
import { TaskRepository } from '../../domain/repositories/TaskRepository';
import { ResultRepository } from '../../domain/repositories/ResultRepository';
import { TaskRouter } from '../../domain/services/TaskRouter';
import { ResultValidator } from '../../domain/services/ResultValidator';
import { TaskNotFoundError, InvalidTaskStateError, AdapterNotAvailableError, AdapterExecutionError } from '../../domain/errors';
import { AIAdapter, AdapterRegistry } from '../interfaces/AIAdapter';
import { EventBus } from '../interfaces/EventBus';
import { Logger } from '../interfaces/Logger';
import { MetricsCollector } from '../interfaces/MetricsCollector';

export interface ExecuteTaskCommand {
  taskId: string;
  options?: {
    forceAdapter?: AdapterType;
    timeout?: number;
    retryOnFailure?: boolean;
    validateResult?: boolean;
  };
}

export interface ExecuteTaskResult {
  taskId: string;
  resultId: string;
  output: string;
  adapter: AdapterType;
  executionTime: number;
  status: 'success' | 'failure';
  error?: string;
  validationScore?: number;
}

export class ExecuteTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly resultRepository: ResultRepository,
    private readonly taskRouter: TaskRouter,
    private readonly resultValidator: ResultValidator,
    private readonly adapterRegistry: AdapterRegistry,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly metrics: MetricsCollector
  ) {}

  async execute(command: ExecuteTaskCommand): Promise<ExecuteTaskResult> {
    const startTime = Date.now();
    const taskId = TaskId.fromString(command.taskId);
    
    this.logger.info('Executing task', { taskId: command.taskId, options: command.options });

    try {
      // Load task
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        throw new TaskNotFoundError(command.taskId);
      }

      // Validate task state
      if (!task.canTransitionTo(TaskStatus.IN_PROGRESS)) {
        throw new InvalidTaskStateError(task.status, TaskStatus.IN_PROGRESS);
      }

      // Update task status
      task.updateStatus(TaskStatus.IN_PROGRESS);
      await this.taskRepository.save(task);

      // Emit start event
      await this.eventBus.emit('task:started', {
        taskId: command.taskId,
        timestamp: new Date()
      });

      // Route to appropriate adapter
      const selectedAdapter = command.options?.forceAdapter || 
        (await this.taskRouter.route(task)).adapter;

      // Get adapter
      const adapter = this.adapterRegistry.get(selectedAdapter);
      if (!adapter) {
        throw new AdapterNotAvailableError(selectedAdapter);
      }

      // Execute task
      const result = await this.executeWithAdapter(task, adapter, command.options);

      // Save result
      await this.resultRepository.save(result);

      // Update task status
      task.updateStatus(result.isSuccess ? TaskStatus.COMPLETED : TaskStatus.FAILED);
      await this.taskRepository.save(task);

      // Validate result if requested
      let validationScore: number | undefined;
      if (command.options?.validateResult && result.isSuccess) {
        const validationReport = await this.resultValidator.validate(result, task);
        validationScore = validationReport.score;
        
        if (!validationReport.isValid) {
          this.logger.warn('Result validation failed', {
            taskId: command.taskId,
            score: validationScore,
            recommendations: validationReport.recommendations
          });
        }
      }

      // Emit completion event
      await this.eventBus.emit('task:completed', {
        taskId: command.taskId,
        resultId: result.id,
        adapter: result.adapter,
        success: result.isSuccess,
        timestamp: new Date()
      });

      // Collect metrics
      const executionTime = Date.now() - startTime;
      this.metrics.recordTaskExecution({
        adapter: selectedAdapter,
        taskType: task.type,
        success: result.isSuccess,
        executionTime,
        validationScore
      });

      this.logger.info('Task executed successfully', {
        taskId: command.taskId,
        resultId: result.id,
        executionTime
      });

      return {
        taskId: command.taskId,
        resultId: result.id,
        output: result.output,
        adapter: result.adapter,
        executionTime: result.executionTime,
        status: result.isSuccess ? 'success' : 'failure',
        error: result.error,
        validationScore
      };

    } catch (error) {
      // Update task status on error
      try {
        const task = await this.taskRepository.findById(taskId);
        if (task && task.status === TaskStatus.IN_PROGRESS) {
          task.updateStatus(TaskStatus.FAILED);
          await this.taskRepository.save(task);
        }
      } catch (updateError) {
        this.logger.error('Failed to update task status after error', { 
          taskId: command.taskId, 
          error: updateError 
        });
      }

      // Emit failure event
      await this.eventBus.emit('task:failed', {
        taskId: command.taskId,
        error: error.message,
        timestamp: new Date()
      });

      // Record failure metric
      this.metrics.recordTaskExecution({
        taskType: 'unknown',
        success: false,
        executionTime: Date.now() - startTime
      });

      this.logger.error('Failed to execute task', { taskId: command.taskId, error });
      throw error;
    }
  }

  private async executeWithAdapter(
    task: Task,
    adapter: AIAdapter,
    options?: ExecuteTaskCommand['options']
  ): Promise<Result> {
    const adapterStartTime = Date.now();

    try {
      // Set timeout if provided
      const timeout = options?.timeout || task.metadata.constraints?.timeout || 30000;
      
      // Execute with timeout
      const adapterResult = await this.executeWithTimeout(
        adapter.execute(task),
        timeout
      );

      // Create success result
      return Result.createSuccess(
        task.id,
        adapterResult.output,
        adapter.type,
        {
          executionTime: Date.now() - adapterStartTime,
          tokensUsed: adapterResult.tokensUsed,
          model: adapterResult.model,
          retryCount: adapterResult.retryCount
        }
      );

    } catch (error) {
      // Handle retries if enabled
      if (options?.retryOnFailure && !this.isRetryableError(error)) {
        this.logger.info('Retrying task execution', { taskId: task.id.value });
        
        try {
          const retryResult = await adapter.execute(task);
          return Result.createSuccess(
            task.id,
            retryResult.output,
            adapter.type,
            {
              executionTime: Date.now() - adapterStartTime,
              tokensUsed: retryResult.tokensUsed,
              model: retryResult.model,
              retryCount: 1
            }
          );
        } catch (retryError) {
          // Retry failed, create error result
          return Result.createError(
            task.id,
            retryError.message,
            adapter.type,
            Date.now() - adapterStartTime
          );
        }
      }

      // Create error result
      return Result.createError(
        task.id,
        error.message,
        adapter.type,
        Date.now() - adapterStartTime
      );
    }
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Task execution timeout')), timeout)
      )
    ]);
  }

  private isRetryableError(error: any): boolean {
    // Don't retry on certain errors
    const nonRetryableErrors = [
      'Invalid API key',
      'Rate limit exceeded',
      'Invalid request',
      'Task execution timeout'
    ];

    return !nonRetryableErrors.some(msg => 
      error.message?.toLowerCase().includes(msg.toLowerCase())
    );
  }
}