import { TaskType } from '../../domain/value-objects/TaskType';
import { AdapterType } from '../../domain/value-objects/AdapterType';

export interface TaskExecutionMetrics {
  adapter?: AdapterType;
  taskType: TaskType | string;
  success: boolean;
  executionTime: number;
  tokensUsed?: number;
  retryCount?: number;
  validationScore?: number;
  error?: string;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeRequests: number;
  queueSize: number;
  timestamp: Date;
}

export interface AdapterMetrics {
  adapter: AdapterType;
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  errorRate: number;
  availability: number;
}

export interface MetricTag {
  key: string;
  value: string;
}

export interface MetricsCollector {
  // Counter metrics (cumulative)
  increment(name: string, value?: number, tags?: MetricTag[]): void;
  
  // Gauge metrics (point-in-time values)
  gauge(name: string, value: number, tags?: MetricTag[]): void;
  
  // Histogram metrics (distributions)
  histogram(name: string, value: number, tags?: MetricTag[]): void;
  
  // Timing metrics
  timing(name: string, duration: number, tags?: MetricTag[]): void;
  
  // High-level business metrics
  recordTaskExecution(metrics: TaskExecutionMetrics): void;
  recordSystemMetrics(metrics: SystemMetrics): void;
  recordAdapterMetrics(metrics: AdapterMetrics): void;
  
  // Metric queries
  getMetric(name: string, tags?: MetricTag[]): number | null;
  getMetrics(pattern?: string): Map<string, number>;
  
  // Management
  reset(name?: string): void;
  flush(): Promise<void>;
}