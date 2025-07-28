import winston from 'winston';
import { Orchestrator } from './orchestration/orchestrator.js';
import { Message, Task } from './types/index.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...args }) => {
      return `${timestamp} [${level}]: ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'demo.log' })
  ]
});

async function runDemo() {
  try {
    logger.info('Starting Claude-Gemini Bridge Demo');
    
    // Check for API keys
    if (!process.env.CLAUDE_API_KEY || !process.env.GEMINI_API_KEY) {
      logger.error('Please set CLAUDE_API_KEY and GEMINI_API_KEY in your .env file');
      process.exit(1);
    }
    
    const orchestrator = new Orchestrator(logger);
    
    // Demo 1: Code Generation Task (Claude)
    logger.info('Demo 1: Code Generation with Claude');
    const codeTask: Task = {
      id: uuidv4(),
      type: 'code',
      payload: {
        language: 'typescript',
        description: 'Create a simple function that calculates fibonacci numbers recursively with memoization',
        complexity: 'high'
      },
      createdAt: new Date().toISOString()
    };
    
    const codeMessage: Message = {
      source: 'claude',
      task: codeTask,
      orchestrator: true,
      metadata: {
        timestamp: new Date().toISOString(),
        priority: 'high'
      }
    };
    
    const codeResult = await orchestrator.processMessage(codeMessage);
    logger.info('Code Generation Result:', codeResult);
    
    // Demo 2: Multimodal Task (Gemini)
    logger.info('\nDemo 2: Multimodal Analysis with Gemini');
    const multimodalTask: Task = {
      id: uuidv4(),
      type: 'multimodal',
      payload: {
        description: 'Analyze the architecture of a modern web application including frontend, backend, and database layers',
        includeVisualDiagram: true
      },
      createdAt: new Date().toISOString()
    };
    
    const multimodalMessage: Message = {
      source: 'gemini',
      task: multimodalTask,
      orchestrator: true,
      metadata: {
        timestamp: new Date().toISOString(),
        priority: 'medium'
      }
    };
    
    const multimodalResult = await orchestrator.processMessage(multimodalMessage);
    logger.info('Multimodal Analysis Result:', multimodalResult);
    
    // Demo 3: Hybrid Execution (Both AIs working together)
    logger.info('\nDemo 3: Hybrid Execution - Code Review');
    const hybridResult = await orchestrator.hybridExecution('analysis', {
      code: codeResult.result?.content || 'function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }',
      request: 'Review this code for performance, readability, and best practices'
    });
    
    logger.info('Hybrid Execution Result:', {
      claudeAnalysis: hybridResult.claude?.content?.substring(0, 200) + '...',
      geminiAnalysis: hybridResult.gemini?.content?.substring(0, 200) + '...',
      consensus: hybridResult.consensus
    });
    
    // Demo 4: Cross-validation example
    logger.info('\nDemo 4: Cross-Validation');
    const validationTask: Task = {
      id: uuidv4(),
      type: 'code',
      payload: {
        description: 'Create a function to validate email addresses using regex',
        complexity: 'medium'
      },
      createdAt: new Date().toISOString()
    };
    
    // First, let Claude generate the code
    const validationMessage: Message = {
      source: 'claude',
      task: validationTask,
      orchestrator: true, // This will trigger cross-validation with Gemini
      metadata: {
        timestamp: new Date().toISOString(),
        priority: 'high'
      }
    };
    
    const validationResult = await orchestrator.processMessage(validationMessage);
    logger.info('Cross-Validation Result:', {
      success: validationResult.success,
      validated: validationResult.validatedBy,
      result: validationResult.result?.content?.substring(0, 200) + '...'
    });
    
    logger.info('\nDemo completed successfully!');
    
  } catch (error) {
    logger.error('Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
runDemo().catch(console.error);