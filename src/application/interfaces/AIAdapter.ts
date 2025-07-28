import { Task } from '../../domain/entities/Task';
import { AdapterType } from '../../domain/value-objects/AdapterType';

export interface AdapterResult {
  output: string;
  tokensUsed?: number;
  model?: string;
  retryCount?: number;
  metadata?: Record<string, any>;
}

export interface AdapterCapability {
  name: string;
  description: string;
  supported: boolean;
}

export interface AdapterHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  lastCheck: Date;
  details?: Record<string, any>;
}

export interface AIAdapter {
  readonly type: AdapterType;
  readonly name: string;
  readonly version: string;

  // Core methods
  execute(task: Task): Promise<AdapterResult>;
  
  // Capability checking
  getCapabilities(): AdapterCapability[];
  supportsTaskType(taskType: string): boolean;
  
  // Health and status
  healthCheck(): Promise<AdapterHealth>;
  isAvailable(): Promise<boolean>;
  
  // Configuration
  configure(config: Record<string, any>): void;
  getConfiguration(): Record<string, any>;
}

export interface AdapterRegistry {
  register(adapter: AIAdapter): void;
  unregister(type: AdapterType): void;
  get(type: AdapterType): AIAdapter | null;
  getAll(): AIAdapter[];
  getAvailable(): Promise<AIAdapter[]>;
}