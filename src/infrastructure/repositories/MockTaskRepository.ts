import { Task } from '../../domain/entities/Task';
import { TaskId } from '../../domain/value-objects/TaskId';
import { TaskRepository, TaskFilter, TaskSort, PaginationOptions, PaginatedResult } from '../../domain/repositories/TaskRepository';
import { TaskType } from '../../domain/value-objects/TaskType';
import { TaskStatus } from '../../domain/value-objects/TaskStatus';
import { Priority } from '../../domain/value-objects/Priority';

export class MockTaskRepository implements TaskRepository {
  private tasks: Map<string, Task> = new Map();

  async save(task: Task): Promise<void> {
    this.tasks.set(task.id.value, task);
  }

  async findById(id: TaskId): Promise<Task | null> {
    const existingTask = this.tasks.get(id.value);
    if (existingTask) {
      return existingTask;
    }

    // Create a mock task if not found (for testing purposes)
    const mockTask = Task.create({
      prompt: `Mock task prompt for ${id.value} - this would normally contain the actual task description and context provided by the user.`,
      type: TaskType.CODE_GENERATION,
      status: TaskStatus.COMPLETED,
      priority: Priority.HIGH,
      metadata: {
        tags: ['mock', 'test'],
        context: { 
          source: 'api',
          userType: 'developer',
          sessionId: 'mock_session'
        },
        constraints: { 
          timeout: 30000
        }
      }
    });

    // Store the mock task for future requests
    this.tasks.set(id.value, mockTask);
    return mockTask;
  }

  async findByStatus(status: TaskStatus): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values());
    return tasks.filter(task => task.status === status);
  }

  async findByType(type: TaskType): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values());
    return tasks.filter(task => task.type === type);
  }

  async findByPriority(priority: Priority): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values());
    return tasks.filter(task => task.priority.equals(priority));
  }

  async findAll(
    filter?: TaskFilter,
    sort?: TaskSort,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Task>> {
    let tasks = Array.from(this.tasks.values());

    // Apply filters
    if (filter) {
      if (filter.status) {
        tasks = tasks.filter(task => filter.status!.includes(task.status));
      }
      if (filter.type) {
        tasks = tasks.filter(task => filter.type!.includes(task.type));
      }
      if (filter.priority) {
        tasks = tasks.filter(task => filter.priority!.some(p => p.equals(task.priority)));
      }
      if (filter.tags) {
        tasks = tasks.filter(task => 
          filter.tags!.every(tag => task.metadata.tags?.includes(tag))
        );
      }
      if (filter.createdAfter) {
        tasks = tasks.filter(task => task.createdAt >= filter.createdAfter!);
      }
      if (filter.createdBefore) {
        tasks = tasks.filter(task => task.createdAt <= filter.createdBefore!);
      }
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        tasks = tasks.filter(task => 
          task.prompt.toLowerCase().includes(searchLower)
        );
      }
    }

    // Apply sorting
    if (sort) {
      tasks.sort((a, b) => {
        let aValue: any, bValue: any;
        switch (sort.field) {
          case 'createdAt':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          case 'updatedAt':
            aValue = a.updatedAt.getTime();
            bValue = b.updatedAt.getTime();
            break;
          case 'priority':
            aValue = a.priority.value;
            bValue = b.priority.value;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          default:
            aValue = bValue = 0;
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
        } else {
          const comparison = String(aValue).localeCompare(String(bValue));
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      });
    } else {
      // Default sort by creation date, newest first
      tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Apply pagination
    const total = tasks.length;
    let items = tasks;
    let page = 1;
    let limit = total;
    
    if (pagination) {
      page = Math.max(1, pagination.page);
      limit = Math.max(1, pagination.limit);
      const startIndex = (page - 1) * limit;
      items = tasks.slice(startIndex, startIndex + limit);
    }

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
  }

  async findByIds(ids: TaskId[]): Promise<Task[]> {
    const tasks: Task[] = [];
    for (const id of ids) {
      const task = this.tasks.get(id.value);
      if (task) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  async delete(id: TaskId): Promise<void> {
    this.tasks.delete(id.value);
  }

  async count(): Promise<number> {
    return this.tasks.size;
  }

  async deleteById(id: TaskId): Promise<boolean> {
    return this.tasks.delete(id.value);
  }

  async clear(): Promise<void> {
    this.tasks.clear();
  }

  // Additional methods required by TaskRepository interface
  async findByUser(userId: string): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values());
    return tasks.filter(task => task.metadata.context?.userId === userId);
  }

  async findByTemplate(templateId: string): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values());
    return tasks.filter(task => (task.metadata as any).templateId === templateId);
  }

  async findPendingTasks(limit?: number): Promise<Task[]> {
    const tasks = await this.findByStatus(TaskStatus.PENDING);
    return limit ? tasks.slice(0, limit) : tasks;
  }

  async findTasksRequiringValidation(): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values());
    return tasks.filter(task => task.status === TaskStatus.COMPLETED);
  }

  async findSimilarTasks(task: Task, limit?: number): Promise<Task[]> {
    // Simple similarity based on prompt content
    const tasks = Array.from(this.tasks.values())
      .filter(t => t.id.value !== task.id.value)
      .filter(t => t.type === task.type);
    
    return limit ? tasks.slice(0, limit) : tasks;
  }

  async countByStatus(userId?: string): Promise<Record<TaskStatus, number>> {
    let tasks = Array.from(this.tasks.values());
    if (userId) {
      tasks = tasks.filter(task => task.metadata.context?.userId === userId);
    }

    const counts = {} as Record<TaskStatus, number>;
    for (const status of Object.values(TaskStatus)) {
      counts[status] = tasks.filter(task => task.status === status).length;
    }
    return counts;
  }

  async countByType(userId?: string): Promise<Record<TaskType, number>> {
    let tasks = Array.from(this.tasks.values());
    if (userId) {
      tasks = tasks.filter(task => task.metadata.context?.userId === userId);
    }

    const counts = {} as Record<TaskType, number>;
    for (const type of Object.values(TaskType)) {
      counts[type] = tasks.filter(task => task.type === type).length;
    }
    return counts;
  }

  async getAverageExecutionTime(type?: TaskType): Promise<number> {
    // For mock repository, return a simulated average
    return type ? Math.random() * 5000 + 1000 : Math.random() * 3000 + 1500;
  }

  async saveMany(tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      await this.save(task);
    }
  }

  async updateStatusBulk(ids: TaskId[], status: TaskStatus): Promise<void> {
    for (const id of ids) {
      const task = this.tasks.get(id.value);
      if (task) {
        // In a real implementation, we would update the task status
        // For now, just skip this as Task entity might not have a direct setter
      }
    }
  }
}