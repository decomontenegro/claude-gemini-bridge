import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import winston from 'winston';
import { Orchestrator } from '../../orchestration/orchestrator.js';
import { Message, Task, CLISource } from '../../types/index.js';

// Mock the adapters
jest.mock('../../adapters/claude-adapter.js');
jest.mock('../../adapters/gemini-adapter.js');

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  let mockLogger: winston.Logger;
  let mockClaudeAdapter: any;
  let mockGeminiAdapter: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    orchestrator = new Orchestrator(mockLogger);

    // Access the mocked adapters
    const ClaudeAdapter = require('../../adapters/claude-adapter.js').ClaudeAdapter;
    const GeminiAdapter = require('../../adapters/gemini-adapter.js').GeminiAdapter;
    
    mockClaudeAdapter = ClaudeAdapter.mock.instances[0];
    mockGeminiAdapter = GeminiAdapter.mock.instances[0];

    // Setup default capabilities
    mockClaudeAdapter.getCapabilities = jest.fn().mockReturnValue(['code', 'analysis', 'validation']);
    mockGeminiAdapter.getCapabilities = jest.fn().mockReturnValue(['multimodal', 'search', 'web']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize orchestrator with adapters and rules', () => {
      expect(orchestrator).toBeInstanceOf(EventEmitter);
      expect(mockClaudeAdapter).toBeDefined();
      expect(mockGeminiAdapter).toBeDefined();
    });
  });

  describe('processMessage', () => {
    it('should orchestrate task when orchestrator flag is true', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'code',
        payload: { complexity: 'high' },
        createdAt: new Date().toISOString(),
      };

      const message: Message = {
        source: 'claude' as CLISource,
        task,
        orchestrator: true,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'high',
        },
      };

      mockClaudeAdapter.execute = jest.fn().mockResolvedValue({ result: 'code completed' });
      mockClaudeAdapter.validate = jest.fn().mockReturnValue(true);

      const result = await orchestrator.processMessage(message);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ result: 'code completed' });
      expect(mockClaudeAdapter.execute).toHaveBeenCalled();
    });

    it('should execute direct task when orchestrator flag is false', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        type: 'analysis',
        payload: {},
        createdAt: new Date().toISOString(),
      };

      const message: Message = {
        source: 'gemini' as CLISource,
        task,
        orchestrator: false,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'medium',
        },
      };

      mockGeminiAdapter.execute = jest.fn().mockResolvedValue({ analysis: 'complete' });

      const result = await orchestrator.processMessage(message);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ analysis: 'complete' });
      expect(mockGeminiAdapter.execute).toHaveBeenCalledWith(task);
    });

    it('should handle errors gracefully', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'code',
        payload: {},
        createdAt: new Date().toISOString(),
      };

      const message: Message = {
        source: 'claude' as CLISource,
        task,
        orchestrator: false,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'medium',
        },
      };

      mockClaudeAdapter.execute = jest.fn().mockRejectedValue(new Error('Execution failed'));

      const result = await orchestrator.processMessage(message);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('rule-based routing', () => {
    it('should route multimodal tasks to gemini', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        type: 'multimodal',
        payload: {},
        createdAt: new Date().toISOString(),
      };

      const message: Message = {
        source: 'claude' as CLISource,
        task,
        orchestrator: true,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'high',
        },
      };

      mockGeminiAdapter.execute = jest.fn().mockResolvedValue({ result: 'multimodal processed' });
      mockClaudeAdapter.execute = jest.fn().mockResolvedValue({ valid: true });
      mockClaudeAdapter.validate = jest.fn().mockReturnValue(true);

      await orchestrator.processMessage(message);

      expect(mockGeminiAdapter.execute).toHaveBeenCalled();
      expect(mockGeminiAdapter.execute.mock.calls[0][0]).toMatchObject({
        ...task,
        payload: { checkpointing: true }, // Transform applied
      });
    });

    it('should route high complexity code tasks to claude', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440005',
        type: 'code',
        payload: { complexity: 'high' },
        createdAt: new Date().toISOString(),
      };

      const message: Message = {
        source: 'gemini' as CLISource,
        task,
        orchestrator: true,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'high',
        },
      };

      mockClaudeAdapter.execute = jest.fn().mockResolvedValue({ code: 'refactored' });
      mockGeminiAdapter.execute = jest.fn().mockResolvedValue({ valid: true });
      mockGeminiAdapter.validate = jest.fn().mockReturnValue(true);

      await orchestrator.processMessage(message);

      expect(mockClaudeAdapter.execute).toHaveBeenCalledWith(task);
    });

    it('should route based on required capabilities when no rule matches', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440006',
        type: 'search',
        payload: { 
          requiredCapabilities: ['web', 'search'] 
        },
        createdAt: new Date().toISOString(),
      };

      const message: Message = {
        source: 'claude' as CLISource,
        task,
        orchestrator: true,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'high',
        },
      };

      mockGeminiAdapter.execute = jest.fn().mockResolvedValue({ result: 'web search complete' });
      mockClaudeAdapter.execute = jest.fn().mockResolvedValue({ valid: true });
      mockClaudeAdapter.validate = jest.fn().mockReturnValue(true);

      await orchestrator.processMessage(message);

      expect(mockGeminiAdapter.execute).toHaveBeenCalled(); // Gemini has 'web' and 'search' capabilities
    });
  });

  describe('cross-validation', () => {
    it('should validate results with the source CLI', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440007',
        type: 'analysis',
        payload: {},
        createdAt: new Date().toISOString(),
      };

      const message: Message = {
        source: 'claude' as CLISource,
        task,
        orchestrator: true,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'high',
        },
      };

      mockClaudeAdapter.execute = jest.fn()
        .mockResolvedValueOnce({ analysis: 'complete' }) // Main execution
        .mockResolvedValueOnce({ valid: true }); // Validation
      mockClaudeAdapter.validate = jest.fn().mockReturnValue(true);

      const result = await orchestrator.processMessage(message);

      expect(result.success).toBe(true);
      expect(result.validatedBy).toBe('claude');
      expect(mockClaudeAdapter.execute).toHaveBeenCalledTimes(2); // Once for task, once for validation
    });

    it('should fail when validation fails', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440008',
        type: 'code',
        payload: {},
        createdAt: new Date().toISOString(),
      };

      const message: Message = {
        source: 'gemini' as CLISource,
        task,
        orchestrator: true,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'high',
        },
      };

      mockClaudeAdapter.execute = jest.fn().mockResolvedValue({ code: 'generated' });
      mockGeminiAdapter.execute = jest.fn().mockResolvedValue({ valid: false });
      mockGeminiAdapter.validate = jest.fn().mockReturnValue(false);

      const result = await orchestrator.processMessage(message);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('hybridExecution', () => {
    it('should execute tasks on both CLIs in parallel', async () => {
      mockClaudeAdapter.execute = jest.fn().mockResolvedValue({ 
        results: ['claude result 1', 'claude result 2'] 
      });
      mockGeminiAdapter.execute = jest.fn().mockResolvedValue({ 
        results: ['gemini result 1', 'gemini result 2'] 
      });

      const result = await orchestrator.hybridExecution('search', { query: 'test' });

      expect(mockClaudeAdapter.execute).toHaveBeenCalled();
      expect(mockGeminiAdapter.execute).toHaveBeenCalled();
      expect(result.combined).toEqual([
        'claude result 1', 'claude result 2',
        'gemini result 1', 'gemini result 2'
      ]);
    });

    it('should merge analysis results with consensus', async () => {
      mockClaudeAdapter.execute = jest.fn().mockResolvedValue({ 
        sentiment: 'positive',
        confidence: 0.8
      });
      mockGeminiAdapter.execute = jest.fn().mockResolvedValue({ 
        sentiment: 'positive',
        confidence: 0.9
      });

      const result = await orchestrator.hybridExecution('analysis', { text: 'test' });

      expect(result).toHaveProperty('claude');
      expect(result).toHaveProperty('gemini');
      expect(result).toHaveProperty('consensus');
      expect(result.consensus).toEqual({
        agreements: [],
        disagreements: [],
        confidence: 0.5
      });
    });

    it('should handle errors from one CLI gracefully', async () => {
      mockClaudeAdapter.execute = jest.fn().mockResolvedValue({ result: 'success' });
      mockGeminiAdapter.execute = jest.fn().mockRejectedValue(new Error('Gemini failed'));

      await expect(orchestrator.hybridExecution('code', {})).rejects.toThrow('Gemini failed');
    });
  });

  describe('event emissions', () => {
    it('should emit taskCompleted event on successful orchestration', async () => {
      const taskCompletedListener = jest.fn();
      orchestrator.on('taskCompleted', taskCompletedListener);

      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440009',
        type: 'code',
        payload: {},
        createdAt: new Date().toISOString(),
      };

      const message: Message = {
        source: 'claude' as CLISource,
        task,
        orchestrator: true,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: 'high',
        },
      };

      mockClaudeAdapter.execute = jest.fn().mockResolvedValue({ result: 'done' });
      mockClaudeAdapter.validate = jest.fn().mockReturnValue(true);

      await orchestrator.processMessage(message);

      expect(taskCompletedListener).toHaveBeenCalledWith({
        task,
        result: { result: 'done' }
      });
    });
  });
});