import { Task } from '../entities/Task';
import { AdapterType, getPreferredAdapterForTask, AdapterCapabilities } from '../value-objects/AdapterType';
import { TaskType } from '../value-objects/TaskType';

export interface RoutingStrategy {
  name: string;
  priority: number;
  canHandle(task: Task): boolean;
  selectAdapter(task: Task): AdapterType | null;
}

export interface RoutingRecommendation {
  adapter: AdapterType;
  confidence: number;
  reason: string;
}

export class TaskRouter {
  private strategies: RoutingStrategy[] = [];

  constructor() {
    this.initializeDefaultStrategies();
  }

  public addStrategy(strategy: RoutingStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  public removeStrategy(name: string): void {
    this.strategies = this.strategies.filter(s => s.name !== name);
  }

  public async route(task: Task): Promise<RoutingRecommendation> {
    // Check if task has a preferred adapter
    if (task.metadata.constraints?.preferredAdapter) {
      const preferred = task.metadata.constraints.preferredAdapter;
      if (task.canBeExecutedBy(preferred)) {
        return {
          adapter: preferred,
          confidence: 1.0,
          reason: 'User-specified preferred adapter'
        };
      }
    }

    // Try each strategy in priority order
    for (const strategy of this.strategies) {
      if (strategy.canHandle(task)) {
        const adapter = strategy.selectAdapter(task);
        if (adapter) {
          return {
            adapter,
            confidence: 0.8,
            reason: `Selected by ${strategy.name} strategy`
          };
        }
      }
    }

    // Fallback: select based on capabilities
    return this.selectByCapabilities(task);
  }

  public async routeMultiple(tasks: Task[]): Promise<Map<string, RoutingRecommendation>> {
    const recommendations = new Map<string, RoutingRecommendation>();
    
    // Group tasks by type for potential optimization
    const tasksByType = new Map<TaskType, Task[]>();
    for (const task of tasks) {
      const typeTasks = tasksByType.get(task.type) || [];
      typeTasks.push(task);
      tasksByType.set(task.type, typeTasks);
    }

    // Route each task
    for (const task of tasks) {
      const recommendation = await this.route(task);
      recommendations.set(task.id.value, recommendation);
    }

    return recommendations;
  }

  private initializeDefaultStrategies(): void {
    // Rule-based strategy
    this.addStrategy({
      name: 'rule-based',
      priority: 100,
      canHandle: (task: Task) => true,
      selectAdapter: (task: Task) => {
        // Specific rules for task types
        const rules: Record<string, AdapterType> = {
          [TaskType.REFACTORING]: AdapterType.CLAUDE,
          [TaskType.VALIDATION]: AdapterType.CLAUDE,
          [TaskType.TESTING]: AdapterType.CLAUDE,
          [TaskType.SEARCH]: AdapterType.GEMINI,
          [TaskType.MULTIMODAL]: AdapterType.GEMINI
        };

        return rules[task.type] || null;
      }
    });

    // Complexity-based strategy
    this.addStrategy({
      name: 'complexity-based',
      priority: 80,
      canHandle: (task: Task) => {
        const promptLength = task.prompt.length;
        return promptLength > 500; // Complex tasks
      },
      selectAdapter: (task: Task) => {
        // Claude is better for complex tasks
        if (task.type === TaskType.CODE_GENERATION || 
            task.type === TaskType.ARCHITECTURE ||
            task.type === TaskType.DEBUGGING) {
          return AdapterType.CLAUDE;
        }
        return null;
      }
    });

    // Performance-based strategy
    this.addStrategy({
      name: 'performance-based',
      priority: 60,
      canHandle: (task: Task) => {
        return task.priority.value >= 3; // High or urgent priority
      },
      selectAdapter: (task: Task) => {
        // For urgent tasks, use the faster adapter
        // This would be determined by historical data
        return AdapterType.GEMINI;
      }
    });
  }

  private selectByCapabilities(task: Task): RoutingRecommendation {
    const scores: Record<AdapterType, number> = {
      [AdapterType.CLAUDE]: 0,
      [AdapterType.GEMINI]: 0
    };

    // Score based on task type compatibility
    for (const [adapter, capabilities] of Object.entries(AdapterCapabilities)) {
      if (task.canBeExecutedBy(adapter as AdapterType)) {
        scores[adapter as AdapterType] += 0.5;
      }

      // Additional scoring based on specific capabilities
      const taskTypeStr = task.type.toLowerCase();
      if (capabilities.includes(taskTypeStr)) {
        scores[adapter as AdapterType] += 0.3;
      }
    }

    // Check for preferred adapter hint
    const preferred = getPreferredAdapterForTask(task.type);
    if (preferred) {
      scores[preferred] += 0.2;
    }

    // Select adapter with highest score
    const selectedAdapter = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)[0][0] as AdapterType;

    return {
      adapter: selectedAdapter,
      confidence: scores[selectedAdapter],
      reason: 'Selected based on capability matching'
    };
  }

  public explainRouting(task: Task): string[] {
    const explanations: string[] = [];

    // Check preferred adapter
    if (task.metadata.constraints?.preferredAdapter) {
      explanations.push(`Task has preferred adapter: ${task.metadata.constraints.preferredAdapter}`);
    }

    // Check each strategy
    for (const strategy of this.strategies) {
      if (strategy.canHandle(task)) {
        const adapter = strategy.selectAdapter(task);
        if (adapter) {
          explanations.push(`${strategy.name} strategy suggests: ${adapter}`);
        }
      }
    }

    // Capability analysis
    explanations.push('Capability analysis:');
    for (const adapter of [AdapterType.CLAUDE, AdapterType.GEMINI]) {
      if (task.canBeExecutedBy(adapter)) {
        explanations.push(`  - ${adapter} can handle ${task.type}`);
      }
    }

    return explanations;
  }
}