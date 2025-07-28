import { z } from 'zod';

export const TaskTypeSchema = z.enum(['code', 'search', 'multimodal', 'analysis', 'validation', 'ultrathink']);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const CLISourceSchema = z.enum(['claude', 'gemini']);
export type CLISource = z.infer<typeof CLISourceSchema>;

export const PrioritySchema = z.enum(['high', 'medium', 'low']);
export type Priority = z.infer<typeof PrioritySchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  type: TaskTypeSchema,
  payload: z.record(z.any()),
  context: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const MessageSchema = z.object({
  source: CLISourceSchema,
  orchestrator: z.boolean(),
  task: TaskSchema,
  metadata: z.object({
    timestamp: z.string().datetime(),
    priority: PrioritySchema,
    constraints: z.record(z.any()).optional(),
  }),
});
export type Message = z.infer<typeof MessageSchema>;

export interface CLIAdapter {
  name: string;
  execute(task: Task): Promise<any>;
  validate(result: any): Promise<boolean>;
  getCapabilities(): string[];
}

export interface OrchestrationRule {
  condition: (task: Task) => boolean;
  targetCLI: CLISource;
  transform?: (task: Task) => Task;
}

export interface UserPersona {
  type: 'newbie' | 'individual' | 'team' | 'enterprise' | 'researcher';
  preferences: {
    verbosity: 'minimal' | 'normal' | 'detailed';
    guidance: boolean;
    automation: 'manual' | 'semi' | 'full';
  };
}