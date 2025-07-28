import { GoogleGenerativeAI } from '@google/generative-ai';
import { CLIAdapter, Task } from '../types/index.js';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

export class GeminiAdapter implements CLIAdapter {
  name = 'gemini';
  private logger: winston.Logger;
  private client: GoogleGenerativeAI;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async execute(task: Task): Promise<any> {
    try {
      this.logger.info(`Executing Gemini API with task: ${task.id}`);
      
      const prompt = this.buildPrompt(task);
      
      // Use Gemini 1.5 Pro for better performance
      const model = this.client.getGenerativeModel({ 
        model: 'gemini-1.5-pro',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const output = {
        success: true,
        taskId: task.id,
        content: text,
        model: 'gemini-1.5-pro',
        usageMetadata: response.usageMetadata,
      };

      this.logger.info(`Gemini API execution completed for task: ${task.id}`);
      return output;
    } catch (error) {
      this.logger.error(`Gemini API execution failed for task ${task.id}:`, error);
      throw error;
    }
  }

  async validate(result: any): Promise<boolean> {
    if (!result) return false;
    
    if (typeof result === 'object' && result.success !== undefined) {
      return result.success;
    }
    
    return true;
  }

  getCapabilities(): string[] {
    return [
      'multimodal_processing',
      'large_context_window',
      'code_generation',
      'code_analysis',
      'image_understanding',
      'document_processing',
      'data_analysis',
      'web_search',
      'long_form_generation',
      'structured_output'
    ];
  }

  private buildPrompt(task: Task): string {
    const basePrompt = `Task ID: ${task.id}\nType: ${task.type}\n`;
    
    switch (task.type) {
      case 'multimodal':
        return `${basePrompt}Process the following multimodal input and provide comprehensive analysis:\n${JSON.stringify(task.payload, null, 2)}\n\nAnalyze all aspects including visual elements, text, and their relationships.`;
      
      case 'search':
        return `${basePrompt}Search and analyze the following query:\n${JSON.stringify(task.payload, null, 2)}\n\nProvide comprehensive search results with analysis and insights.`;
      
      case 'code':
        return `${basePrompt}Generate or analyze code based on:\n${JSON.stringify(task.payload, null, 2)}\n\nProvide complete, working code with explanations.`;
      
      case 'analysis':
        return `${basePrompt}Perform detailed analysis on:\n${JSON.stringify(task.payload, null, 2)}\n\nInclude insights, patterns, and recommendations.`;
      
      case 'validation':
        return `${basePrompt}Validate the following:\n${JSON.stringify(task.payload, null, 2)}\n\nProvide thorough validation with specific feedback on correctness and completeness.`;
        
      case 'ultrathink':
        return `${basePrompt}ULTRA DEEP ANALYSIS MODE - Think comprehensively and provide expert-level insights.

This requires your most advanced reasoning capabilities. Please:
1. Break down the problem into its fundamental components
2. Explore multiple solution paths and compare their trade-offs
3. Provide detailed implementation strategies
4. Include visual representations where helpful (diagrams, flowcharts as text)
5. Consider real-world implications and best practices
6. Anticipate potential challenges and provide mitigation strategies
7. Offer both immediate solutions and long-term recommendations

Request:
${JSON.stringify(task.payload, null, 2)}

Engage all your capabilities to deliver an exceptionally thorough and insightful analysis.`;
        
      default:
        return `${basePrompt}Execute the following task:\n${JSON.stringify(task.payload, null, 2)}\n\nProvide a comprehensive response.`;
    }
  }
}