import { describe, it, expect } from '@jest/globals';
import { 
  TaskTypeSchema, 
  CLISourceSchema,
  PrioritySchema,
  TaskSchema,
  MessageSchema
} from '../types/index.js';

describe('Simple Tests', () => {
  describe('Type validation', () => {
    it('should validate task types', () => {
      expect(() => TaskTypeSchema.parse('code')).not.toThrow();
      expect(() => TaskTypeSchema.parse('invalid')).toThrow();
    });

    it('should validate CLI sources', () => {
      expect(() => CLISourceSchema.parse('claude')).not.toThrow();
      expect(() => CLISourceSchema.parse('gemini')).not.toThrow();
      expect(() => CLISourceSchema.parse('invalid')).toThrow();
    });

    it('should validate complete task', () => {
      const task = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'code',
        payload: { test: true },
        createdAt: new Date().toISOString(),
      };
      
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });

    it('should validate complete message', () => {
      const message = {
        source: 'claude',
        orchestrator: true,
        task: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          type: 'multimodal',
          payload: {},
          createdAt: new Date().toISOString(),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'high',
        },
      };
      
      expect(() => MessageSchema.parse(message)).not.toThrow();
    });
  });

  describe('Basic functionality', () => {
    it('should pass a simple test', () => {
      expect(1 + 1).toBe(2);
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3];
      expect(arr).toHaveLength(3);
      expect(arr).toContain(2);
    });
  });
});