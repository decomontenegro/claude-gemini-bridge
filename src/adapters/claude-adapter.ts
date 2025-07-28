import Anthropic from '@anthropic-ai/sdk';
import { CLIAdapter, Task } from '../types/index.js';
import winston from 'winston';
import dotenv from 'dotenv';
import { RetryManager } from '../utils/retry-manager.js';

dotenv.config();

/**
 * Claude AI Adapter - Integrates with Anthropic's Claude API
 * @class ClaudeAdapter
 * @implements {CLIAdapter}
 */
export class ClaudeAdapter implements CLIAdapter {
  name = 'claude';
  private logger: winston.Logger;
  private client: Anthropic;
  private retryManager: RetryManager;

  /**
   * Create a new Claude adapter instance
   * @param {winston.Logger} logger - Winston logger instance
   * @throws {Error} If CLAUDE_API_KEY is not set
   */
  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.retryManager = new RetryManager(logger);
    
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY environment variable is required');
    }
    
    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Execute a task using Claude API with retry logic
   * @param {Task} task - Task to execute
   * @returns {Promise<any>} Task execution result
   * @throws {Error} If execution fails after all retries
   */
  async execute(task: Task): Promise<any> {
    this.logger.info(`Executing Claude API with task: ${task.id}`);
    
    return this.retryManager.executeWithRetry(
      async () => {
        const prompt = this.buildPrompt(task);
        
        const message = await this.client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        });

        const result = {
          success: true,
          taskId: task.id,
          content: message.content[0].type === 'text' ? message.content[0].text : '',
          usage: message.usage,
          model: message.model,
        };

        this.logger.info(`Claude API execution completed for task: ${task.id}`);
        return result;
      },
      {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        circuitBreakerKey: 'claude-api',
        retryableErrors: ['rate_limit', 'server_error', /timeout/i],
      }
    );
  }

  /**
   * Validate the result of a task execution
   * @param {any} result - Result to validate
   * @returns {Promise<boolean>} True if result is valid
   */
  async validate(result: any): Promise<boolean> {
    if (!result) return false;
    
    if (typeof result === 'object' && result.success !== undefined) {
      return result.success;
    }
    
    return true;
  }

  /**
   * Get the capabilities of Claude AI
   * @returns {string[]} Array of capability identifiers
   */
  getCapabilities(): string[] {
    return [
      'code_generation',
      'code_editing',
      'code_analysis',
      'documentation',
      'debugging',
      'testing',
      'refactoring',
      'architecture_design',
      'complex_reasoning',
      'natural_language'
    ];
  }

  /**
   * Build a prompt for Claude based on task type
   * @private
   * @param {Task} task - Task to build prompt for
   * @returns {string} Formatted prompt
   */
  private buildPrompt(task: Task): string {
    const basePrompt = `Task ID: ${task.id}\nType: ${task.type}\n`;
    
    switch (task.type) {
      case 'code':
        return `${basePrompt}Generate or modify code based on the following requirements:\n${JSON.stringify(task.payload, null, 2)}`;
      
      case 'analysis':
        return `${basePrompt}Analyze the following code or system:\n${JSON.stringify(task.payload, null, 2)}\n\nProvide a detailed analysis including potential improvements, issues, and recommendations.`;
      
      case 'validation':
        return `${basePrompt}Validate the following result:\n${JSON.stringify(task.payload, null, 2)}\n\nDetermine if the result is correct, complete, and meets the requirements. Respond with your validation assessment.`;
      
      case 'search':
        return `${basePrompt}Search and provide information about:\n${JSON.stringify(task.payload, null, 2)}\n\nProvide comprehensive results with relevant details.`;
        
      case 'multimodal':
        // Claude can handle text descriptions of images but not actual image processing
        return `${basePrompt}Process the following multimodal request (text-based analysis only):\n${JSON.stringify(task.payload, null, 2)}`;
        
      case 'ultrathink':
        return `${basePrompt}DEEP THINKING MODE ACTIVATED. 

This is a comprehensive analysis request. You should:
1. Analyze the problem from multiple perspectives
2. Consider various approaches and solutions
3. Think step-by-step through complex reasoning
4. Provide a thorough, well-structured response
5. Include code examples, diagrams (as ASCII art), and detailed explanations where relevant
6. Consider edge cases and potential issues
7. Suggest best practices and optimizations

Request details:
${JSON.stringify(task.payload, null, 2)}

Take your time to think deeply about this request and provide the most comprehensive, insightful response possible.`;
        
      default:
        return `${basePrompt}Execute the following task:\n${JSON.stringify(task.payload, null, 2)}`;
    }
  }
}