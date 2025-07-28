import { Template } from '../entities/Template';
import { TaskType } from '../value-objects/TaskType';
import { PaginatedResult, PaginationOptions } from './TaskRepository';

export interface TemplateFilter {
  category?: string[];
  type?: TaskType[];
  isPublic?: boolean;
  userId?: string;
  tags?: string[];
  search?: string;
  minRating?: number;
  minUsageCount?: number;
}

export interface TemplateSort {
  field: 'name' | 'createdAt' | 'updatedAt' | 'usageCount' | 'rating' | 'popularity';
  direction: 'asc' | 'desc';
}

export interface TemplateStatistics {
  totalTemplates: number;
  publicTemplates: number;
  privateTemplates: number;
  averageRating: number;
  totalUsage: number;
  byCategory: Record<string, number>;
  byType: Record<TaskType, number>;
  topTemplates: Array<{
    id: string;
    name: string;
    usageCount: number;
    rating: number;
  }>;
}

export interface TemplateRepository {
  // Basic CRUD
  findById(id: string): Promise<Template | null>;
  findByIds(ids: string[]): Promise<Template[]>;
  save(template: Template): Promise<void>;
  delete(id: string): Promise<void>;
  
  // Queries
  findAll(
    filter?: TemplateFilter,
    sort?: TemplateSort,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Template>>;
  
  findByCategory(category: string): Promise<Template[]>;
  findByType(type: TaskType): Promise<Template[]>;
  findByUser(userId: string): Promise<Template[]>;
  findPublicTemplates(limit?: number): Promise<Template[]>;
  
  // Advanced queries
  findPopularTemplates(limit?: number): Promise<Template[]>;
  findRecommendedTemplates(
    userId: string,
    limit?: number
  ): Promise<Template[]>;
  findSimilarTemplates(
    template: Template,
    limit?: number
  ): Promise<Template[]>;
  searchTemplates(query: string): Promise<Template[]>;
  
  // Statistics
  getStatistics(userId?: string): Promise<TemplateStatistics>;
  getCategories(): Promise<string[]>;
  getTags(): Promise<Array<{ tag: string; count: number }>>;
  
  // Usage tracking
  incrementUsage(id: string): Promise<void>;
  updateRating(id: string, rating: number): Promise<void>;
  
  // Bulk operations
  saveMany(templates: Template[]): Promise<void>;
  makePublicBulk(ids: string[]): Promise<void>;
  makePrivateBulk(ids: string[]): Promise<void>;
}