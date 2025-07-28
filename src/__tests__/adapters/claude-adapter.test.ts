import { jest } from '@jest/globals';
import { spawn } from 'child_process';
import winston from 'winston';
import { ClaudeAdapter } from '../../adapters/claude-adapter.js';
import { Task } from '../../types/index.js';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process');

describe('ClaudeAdapter', () => {
  let adapter: ClaudeAdapter;
  let mockLogger: winston.Logger;
  let mockChildProcess: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    adapter = new ClaudeAdapter(mockLogger);

    // Setup mock child process
    mockChildProcess = new EventEmitter() as any;
    mockChildProcess.stdin = {
      write: jest.fn(),
      end: jest.fn(),
    };
    mockChildProcess.stdout = new EventEmitter();
    mockChildProcess.stderr = new EventEmitter();

    (spawn as jest.Mock).mockReturnValue(mockChildProcess);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      expect(adapter.name).toBe('claude');
    });
  });

  describe('execute', () => {
    it('should successfully execute a code task', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'code',
        payload: { language: 'javascript', code: 'console.log("test")' },
        createdAt: new Date().toISOString(),
      };

      const executePromise = adapter.execute(task);

      // Simulate successful execution
      mockChildProcess.stdout.emit('data', JSON.stringify({ success: true, result: 'code generated' }));
      mockChildProcess.emit('close', 0);

      const result = await executePromise;

      expect(spawn).toHaveBeenCalledWith('claude', ['--no-interaction', '--json'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('Task ID: 550e8400-e29b-41d4-a716-446655440001')
      );
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('Type: code')
      );
      expect(result).toEqual({ success: true, result: 'code generated' });
    });

    it('should handle non-JSON output gracefully', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        type: 'analysis',
        payload: { text: 'analyze this' },
        createdAt: new Date().toISOString(),
      };

      const executePromise = adapter.execute(task);

      // Simulate plain text output
      mockChildProcess.stdout.emit('data', 'Plain text result');
      mockChildProcess.emit('close', 0);

      const result = await executePromise;

      expect(result).toBe('Plain text result');
    });

    it('should reject on CLI failure', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'code',
        payload: {},
        createdAt: new Date().toISOString(),
      };

      const executePromise = adapter.execute(task);

      // Simulate error
      mockChildProcess.stderr.emit('data', 'Command not found');
      mockChildProcess.emit('close', 1);

      await expect(executePromise).rejects.toThrow('Claude CLI failed: Command not found');
    });

    it('should handle validation tasks', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        type: 'validation',
        payload: { result: 'some result to validate' },
        createdAt: new Date().toISOString(),
      };

      const executePromise = adapter.execute(task);

      mockChildProcess.stdout.emit('data', JSON.stringify({ valid: true }));
      mockChildProcess.emit('close', 0);

      const result = await executePromise;

      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('Validate the following:')
      );
      expect(result).toEqual({ valid: true });
    });

    it('should handle unknown task types', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440005',
        type: 'search', // Using valid type
        payload: { data: 'test' },
        createdAt: new Date().toISOString(),
      };

      const executePromise = adapter.execute(task);

      mockChildProcess.stdout.emit('data', JSON.stringify({ handled: true }));
      mockChildProcess.emit('close', 0);

      const result = await executePromise;

      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('Execute task:')
      );
      expect(result).toEqual({ handled: true });
    });
  });

  describe('validate', () => {
    it('should return true for successful results', async () => {
      expect(await adapter.validate({ success: true })).toBe(true);
    });

    it('should return false for unsuccessful results', async () => {
      expect(await adapter.validate({ success: false })).toBe(false);
    });

    it('should return true for non-object results', async () => {
      expect(await adapter.validate('string result')).toBe(true);
      expect(await adapter.validate(123)).toBe(true);
    });

    it('should return false for null/undefined results', async () => {
      expect(await adapter.validate(null)).toBe(false);
      expect(await adapter.validate(undefined)).toBe(false);
    });

    it('should return true for objects without success property', async () => {
      expect(await adapter.validate({ data: 'test' })).toBe(true);
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = adapter.getCapabilities();

      expect(capabilities).toEqual([
        'code_generation',
        'code_editing',
        'file_operations',
        'git_operations',
        'terminal_commands',
        'task_management',
        'mcp_integration',
        'ide_integration'
      ]);
    });
  });

  describe('buildPrompt', () => {
    it('should build correct prompt for code tasks', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440006',
        type: 'code',
        payload: { action: 'generate' },
        createdAt: new Date().toISOString(),
      };

      adapter.execute(task);

      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('Generate or modify code:')
      );
    });

    it('should build correct prompt for analysis tasks', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440007',
        type: 'analysis',
        payload: { data: 'analyze' },
        createdAt: new Date().toISOString(),
      };

      adapter.execute(task);

      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('Analyze the following:')
      );
    });
  });

  describe('error handling', () => {
    it('should log execution start', async () => {
      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440008',
        type: 'code',
        payload: {},
        createdAt: new Date().toISOString(),
      };

      adapter.execute(task);

      expect(mockLogger.info).toHaveBeenCalledWith('Executing Claude CLI with task: 550e8400-e29b-41d4-a716-446655440008');
    });

    it('should handle spawn errors', async () => {
      (spawn as jest.Mock).mockImplementation(() => {
        throw new Error('Spawn failed');
      });

      const task: Task = {
        id: '550e8400-e29b-41d4-a716-446655440009',
        type: 'code',
        payload: {},
        createdAt: new Date().toISOString(),
      };

      await expect(adapter.execute(task)).rejects.toThrow('Spawn failed');
    });
  });
});