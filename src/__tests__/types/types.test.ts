import { 
  TaskSchema, 
  MessageSchema, 
  CLISourceSchema,
  TaskTypeSchema,
  PrioritySchema,
  Task,
  Message,
  CLISource,
  TaskType,
  Priority
} from '../../types/index.js';

describe('Type Schemas', () => {
  describe('TaskTypeSchema', () => {
    it('should validate valid task types', () => {
      const validTypes: TaskType[] = ['code', 'search', 'multimodal', 'analysis', 'validation'];
      
      validTypes.forEach(type => {
        expect(() => TaskTypeSchema.parse(type)).not.toThrow();
      });
    });

    it('should reject invalid task types', () => {
      expect(() => TaskTypeSchema.parse('invalid')).toThrow();
      expect(() => TaskTypeSchema.parse('')).toThrow();
      expect(() => TaskTypeSchema.parse(123)).toThrow();
    });
  });

  describe('CLISourceSchema', () => {
    it('should validate valid CLI sources', () => {
      expect(() => CLISourceSchema.parse('claude')).not.toThrow();
      expect(() => CLISourceSchema.parse('gemini')).not.toThrow();
    });

    it('should reject invalid CLI sources', () => {
      expect(() => CLISourceSchema.parse('openai')).toThrow();
      expect(() => CLISourceSchema.parse('')).toThrow();
      expect(() => CLISourceSchema.parse(null)).toThrow();
    });
  });

  describe('PrioritySchema', () => {
    it('should validate valid priorities', () => {
      const validPriorities: Priority[] = ['high', 'medium', 'low'];
      
      validPriorities.forEach(priority => {
        expect(() => PrioritySchema.parse(priority)).not.toThrow();
      });
    });

    it('should reject invalid priorities', () => {
      expect(() => PrioritySchema.parse('urgent')).toThrow();
      expect(() => PrioritySchema.parse(1)).toThrow();
    });
  });

  describe('TaskSchema', () => {
    it('should validate a valid task', () => {
      const validTask: Task = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'code',
        payload: { action: 'generate', language: 'typescript' },
        createdAt: '2023-12-01T00:00:00Z',
      };

      expect(() => TaskSchema.parse(validTask)).not.toThrow();
    });

    it('should validate task with optional fields', () => {
      const taskWithOptionals: Task = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'analysis',
        payload: {},
        context: { user: 'test', session: '123' },
        createdAt: '2023-12-01T00:00:00Z',
        completedAt: '2023-12-01T01:00:00Z',
      };

      expect(() => TaskSchema.parse(taskWithOptionals)).not.toThrow();
    });

    it('should reject invalid task structures', () => {
      // Missing required fields
      expect(() => TaskSchema.parse({
        type: 'code',
        payload: {},
        createdAt: '2023-12-01T00:00:00Z',
      })).toThrow();

      // Invalid UUID
      expect(() => TaskSchema.parse({
        id: 'not-a-uuid',
        type: 'code',
        payload: {},
        createdAt: '2023-12-01T00:00:00Z',
      })).toThrow();

      // Invalid date format
      expect(() => TaskSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'code',
        payload: {},
        createdAt: 'not-a-date',
      })).toThrow();
    });
  });

  describe('MessageSchema', () => {
    it('should validate a valid message', () => {
      const validMessage: Message = {
        source: 'claude',
        orchestrator: true,
        task: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          type: 'multimodal',
          payload: { image: 'base64data' },
          createdAt: '2023-12-01T00:00:00Z',
        },
        metadata: {
          timestamp: '2023-12-01T00:00:00Z',
          priority: 'high',
        },
      };

      expect(() => MessageSchema.parse(validMessage)).not.toThrow();
    });

    it('should validate message with optional constraints', () => {
      const messageWithConstraints: Message = {
        source: 'gemini',
        orchestrator: false,
        task: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          type: 'search',
          payload: { query: 'test' },
          createdAt: '2023-12-01T00:00:00Z',
        },
        metadata: {
          timestamp: '2023-12-01T00:00:00Z',
          priority: 'low',
          constraints: {
            maxResults: 10,
            timeout: 5000,
          },
        },
      };

      expect(() => MessageSchema.parse(messageWithConstraints)).not.toThrow();
    });

    it('should reject invalid message structures', () => {
      // Missing metadata
      expect(() => MessageSchema.parse({
        source: 'claude',
        orchestrator: true,
        task: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          type: 'code',
          payload: {},
          createdAt: '2023-12-01T00:00:00Z',
        },
      })).toThrow();

      // Invalid source
      expect(() => MessageSchema.parse({
        source: 'invalid-source',
        orchestrator: true,
        task: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          type: 'code',
          payload: {},
          createdAt: '2023-12-01T00:00:00Z',
        },
        metadata: {
          timestamp: '2023-12-01T00:00:00Z',
          priority: 'high',
        },
      })).toThrow();
    });
  });

  describe('Type inference', () => {
    it('should correctly infer TypeScript types', () => {
      // This test just verifies that TypeScript compilation works correctly
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'code',
        payload: { test: true },
        createdAt: new Date().toISOString(),
      };

      const message: Message = {
        source: 'claude',
        orchestrator: true,
        task,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'medium',
        },
      };

      // Type checks - these would fail at compile time if types were wrong
      const taskType: TaskType = task.type;
      const cliSource: CLISource = message.source;
      const priority: Priority = message.metadata.priority;

      expect(taskType).toBe('code');
      expect(cliSource).toBe('claude');
      expect(priority).toBe('medium');
    });
  });
});