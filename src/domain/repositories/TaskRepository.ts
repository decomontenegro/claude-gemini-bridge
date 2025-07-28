import { Task } from '../entities/Task';
import { TaskId } from '../value-objects/TaskId';
import { TaskStatus } from '../value-objects/TaskStatus';
import { TaskType } from '../value-objects/TaskType';
import { Priority } from '../value-objects/Priority';

export interface TaskFilter {
  status?: TaskStatus[];
  type?: TaskType[];
  priority?: Priority[];
  userId?: string;
  templateId?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
}

export interface TaskSort {
  field: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface TaskRepository {
  // Basic CRUD
  findById(id: TaskId): Promise<Task | null>;
  findByIds(ids: TaskId[]): Promise<Task[]>;
  save(task: Task): Promise<void>;
  delete(id: TaskId): Promise<void>;
  
  // Queries
  findAll(
    filter?: TaskFilter,
    sort?: TaskSort,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Task>>;
  
  findByStatus(status: TaskStatus): Promise<Task[]>;
  findByUser(userId: string): Promise<Task[]>;
  findByTemplate(templateId: string): Promise<Task[]>;
  
  // Advanced queries
  findPendingTasks(limit?: number): Promise<Task[]>;
  findTasksRequiringValidation(): Promise<Task[]>;
  findSimilarTasks(task: Task, limit?: number): Promise<Task[]>;
  
  // Statistics
  countByStatus(userId?: string): Promise<Record<TaskStatus, number>>;
  countByType(userId?: string): Promise<Record<TaskType, number>>;
  getAverageExecutionTime(type?: TaskType): Promise<number>;
  
  // Bulk operations
  saveMany(tasks: Task[]): Promise<void>;
  updateStatusBulk(ids: TaskId[], status: TaskStatus): Promise<void>;
}