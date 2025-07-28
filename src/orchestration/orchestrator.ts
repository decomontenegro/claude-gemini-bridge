import { EventEmitter } from 'events';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { CLIAdapter, CLISource, Message, OrchestrationRule, Task, TaskType } from '../types/index.js';
import { ClaudeAdapter } from '../adapters/claude-adapter.js';
import { GeminiAdapter } from '../adapters/gemini-adapter.js';

export class Orchestrator extends EventEmitter {
  private claudeAdapter: ClaudeAdapter;
  private geminiAdapter: GeminiAdapter;
  private logger: winston.Logger;
  private rules: OrchestrationRule[] = [];
  private taskHistory: Map<string, any> = new Map();

  constructor(logger: winston.Logger) {
    super();
    this.logger = logger;
    this.claudeAdapter = new ClaudeAdapter(logger);
    this.geminiAdapter = new GeminiAdapter(logger);
    this.initializeRules();
  }

  private initializeRules() {
    this.rules = [
      {
        condition: (task) => task.type === 'multimodal',
        targetCLI: 'gemini',
        transform: (task) => ({
          ...task,
          payload: { ...task.payload, checkpointing: true }
        })
      },
      {
        condition: (task) => task.type === 'code' && task.payload.complexity === 'high',
        targetCLI: 'claude',
      },
      {
        condition: (task) => task.type === 'search' && task.payload.includeWeb,
        targetCLI: 'gemini',
      },
      {
        condition: (task) => task.type === 'validation',
        targetCLI: 'claude',
      }
    ];
  }

  async processMessage(message: Message): Promise<any> {
    this.logger.info(`Processing message from ${message.source}`);
    
    if (message.orchestrator) {
      return this.orchestrateTask(message);
    } else {
      return this.executeDirectTask(message);
    }
  }

  private async orchestrateTask(message: Message): Promise<any> {
    const { task } = message;
    const targetCLI = this.determineTargetCLI(task);
    const adapter = this.getAdapter(targetCLI);
    
    this.logger.info(`Orchestrating task ${task.id} to ${targetCLI}`);
    
    try {
      const transformedTask = this.transformTask(task, targetCLI);
      const result = await adapter.execute(transformedTask);
      
      const isValid = await this.crossValidate(result, message.source);
      
      if (isValid) {
        this.taskHistory.set(task.id, { task, result, validated: true });
        this.emit('taskCompleted', { task, result });
        return { success: true, result, validatedBy: message.source };
      } else {
        this.logger.warn(`Task ${task.id} failed validation`);
        return { success: false, error: 'Validation failed' };
      }
    } catch (error) {
      this.logger.error(`Error orchestrating task ${task.id}:`, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async executeDirectTask(message: Message): Promise<any> {
    const { task, source } = message;
    const adapter = this.getAdapter(source);
    
    try {
      const result = await adapter.execute(task);
      this.taskHistory.set(task.id, { task, result });
      return { success: true, result };
    } catch (error) {
      this.logger.error(`Error executing task ${task.id}:`, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private determineTargetCLI(task: Task): CLISource {
    for (const rule of this.rules) {
      if (rule.condition(task)) {
        return rule.targetCLI;
      }
    }
    
    const claudeCaps = this.claudeAdapter.getCapabilities();
    const geminiCaps = this.geminiAdapter.getCapabilities();
    
    if (task.payload.requiredCapabilities) {
      const required = task.payload.requiredCapabilities as string[];
      const claudeScore = required.filter(cap => claudeCaps.includes(cap)).length;
      const geminiScore = required.filter(cap => geminiCaps.includes(cap)).length;
      
      return claudeScore >= geminiScore ? 'claude' : 'gemini';
    }
    
    return 'claude';
  }

  private transformTask(task: Task, targetCLI: CLISource): Task {
    const rule = this.rules.find(r => r.condition(task) && r.targetCLI === targetCLI);
    
    if (rule?.transform) {
      return rule.transform(task);
    }
    
    return task;
  }

  private async crossValidate(result: any, validator: CLISource): Promise<boolean> {
    const adapter = this.getAdapter(validator);
    const validationTask: Task = {
      id: uuidv4(),
      type: 'validation',
      payload: { 
        result: result.content || result,
        originalValidator: validator,
        validationCriteria: [
          'accuracy',
          'completeness',
          'relevance',
          'consistency'
        ]
      },
      createdAt: new Date().toISOString()
    };
    
    try {
      const validationResult = await adapter.execute(validationTask);
      
      // Parse validation response
      const content = validationResult.content || '';
      const isValid = this.parseValidationResponse(content);
      
      this.logger.info(`Cross-validation result from ${validator}:`, {
        isValid,
        confidence: this.extractConfidence(content)
      });
      
      return isValid;
    } catch (error) {
      this.logger.error('Cross-validation failed:', error);
      // In case of error, default to accepting the result
      return true;
    }
  }
  
  private parseValidationResponse(content: string): boolean {
    // Look for explicit validation indicators in the response
    const lowerContent = content.toLowerCase();
    
    const positiveIndicators = [
      'valid', 'correct', 'accurate', 'complete',
      'verified', 'confirmed', 'acceptable', 'good'
    ];
    
    const negativeIndicators = [
      'invalid', 'incorrect', 'inaccurate', 'incomplete',
      'failed', 'rejected', 'unacceptable', 'error'
    ];
    
    const positiveCount = positiveIndicators.filter(ind => lowerContent.includes(ind)).length;
    const negativeCount = negativeIndicators.filter(ind => lowerContent.includes(ind)).length;
    
    return positiveCount > negativeCount;
  }
  
  private extractConfidence(content: string): number {
    // Extract confidence level from validation response
    const confidenceMatch = content.match(/confidence[:\s]+(\d+(\.\d+)?)/i);
    if (confidenceMatch) {
      const confidence = parseFloat(confidenceMatch[1]);
      return confidence > 1 ? confidence / 100 : confidence;
    }
    
    // Default confidence based on content analysis
    const hasHighConfidenceWords = /very|highly|extremely|definitely/i.test(content);
    const hasLowConfidenceWords = /maybe|possibly|might|could/i.test(content);
    
    if (hasHighConfidenceWords) return 0.9;
    if (hasLowConfidenceWords) return 0.6;
    return 0.75;
  }

  private getAdapter(source: CLISource): CLIAdapter {
    return source === 'claude' ? this.claudeAdapter : this.geminiAdapter;
  }

  async hybridExecution(taskType: TaskType, payload: any): Promise<any> {
    const claudeTask: Task = {
      id: uuidv4(),
      type: taskType,
      payload: { ...payload, phase: 'claude' },
      createdAt: new Date().toISOString()
    };

    const geminiTask: Task = {
      id: uuidv4(), 
      type: taskType,
      payload: { ...payload, phase: 'gemini' },
      createdAt: new Date().toISOString()
    };

    const [claudeResult, geminiResult] = await Promise.all([
      this.claudeAdapter.execute(claudeTask),
      this.geminiAdapter.execute(geminiTask)
    ]);

    return this.mergeResults(claudeResult, geminiResult, taskType);
  }

  private mergeResults(claudeResult: any, geminiResult: any, taskType: TaskType): any {
    switch (taskType) {
      case 'search':
        return {
          claude: claudeResult,
          gemini: geminiResult,
          combined: [...(claudeResult.results || []), ...(geminiResult.results || [])]
        };
      case 'analysis':
        return {
          claude: claudeResult,
          gemini: geminiResult,
          consensus: this.findConsensus(claudeResult, geminiResult)
        };
      default:
        return { claude: claudeResult, gemini: geminiResult };
    }
  }

  private findConsensus(claudeResult: any, geminiResult: any): any {
    const agreements: string[] = [];
    const disagreements: string[] = [];
    
    // Extract content from results
    const claudeContent = claudeResult.content || '';
    const geminiContent = geminiResult.content || '';
    
    // Analyze key aspects
    const aspects = this.extractKeyAspects(claudeContent, geminiContent);
    
    // Compare aspects
    for (const aspect of aspects) {
      const claudeHas = this.containsAspect(claudeContent, aspect);
      const geminiHas = this.containsAspect(geminiContent, aspect);
      
      if (claudeHas && geminiHas) {
        agreements.push(aspect);
      } else if (claudeHas || geminiHas) {
        disagreements.push(`${aspect} (only in ${claudeHas ? 'Claude' : 'Gemini'})`);
      }
    }
    
    // Calculate consensus confidence
    const totalAspects = agreements.length + disagreements.length;
    const agreementRatio = totalAspects > 0 ? agreements.length / totalAspects : 0;
    
    // Extract confidence from individual results
    const claudeConfidence = this.extractConfidence(claudeContent);
    const geminiConfidence = this.extractConfidence(geminiContent);
    const averageConfidence = (claudeConfidence + geminiConfidence) / 2;
    
    // Combined confidence considering agreement ratio
    const confidence = agreementRatio * 0.7 + averageConfidence * 0.3;
    
    return {
      agreements,
      disagreements,
      confidence,
      consensusSummary: this.generateConsensusSummary(agreements, disagreements, confidence),
      details: {
        agreementRatio,
        claudeConfidence,
        geminiConfidence
      }
    };
  }
  
  private extractKeyAspects(content1: string, content2: string): string[] {
    const aspects = new Set<string>();
    
    // Common programming concepts
    const conceptPatterns = [
      /function|method|class|variable|constant/gi,
      /performance|optimization|efficiency/gi,
      /error|exception|validation|check/gi,
      /security|authentication|authorization/gi,
      /test|testing|coverage/gi,
      /documentation|comment|readme/gi,
      /architecture|design|pattern/gi,
      /database|storage|cache/gi,
      /api|endpoint|interface/gi,
      /async|sync|concurrency|parallel/gi
    ];
    
    // Extract from both contents
    const combinedContent = content1 + ' ' + content2;
    
    for (const pattern of conceptPatterns) {
      const matches = combinedContent.match(pattern);
      if (matches) {
        matches.forEach(match => aspects.add(match.toLowerCase()));
      }
    }
    
    // Extract specific recommendations or suggestions
    const recommendationPattern = /recommend|suggest|should|must|need to|better to/gi;
    const recommendations = combinedContent.match(recommendationPattern);
    if (recommendations) {
      aspects.add('recommendations');
    }
    
    return Array.from(aspects);
  }
  
  private containsAspect(content: string, aspect: string): boolean {
    const lowerContent = content.toLowerCase();
    const lowerAspect = aspect.toLowerCase();
    
    // Check for exact match or related terms
    if (lowerContent.includes(lowerAspect)) {
      return true;
    }
    
    // Check for related terms
    const relatedTerms: Record<string, string[]> = {
      'function': ['method', 'procedure', 'routine'],
      'error': ['exception', 'mistake', 'issue', 'problem'],
      'performance': ['speed', 'efficiency', 'optimization'],
      'security': ['safety', 'protection', 'secure'],
      'test': ['testing', 'spec', 'unit test', 'integration test']
    };
    
    const related = relatedTerms[lowerAspect];
    if (related) {
      return related.some(term => lowerContent.includes(term));
    }
    
    return false;
  }
  
  private generateConsensusSummary(agreements: string[], disagreements: string[], confidence: number): string {
    const agreementCount = agreements.length;
    const disagreementCount = disagreements.length;
    
    let summary = `Consensus confidence: ${(confidence * 100).toFixed(1)}%. `;
    
    if (agreementCount > 0 && disagreementCount === 0) {
      summary += 'Both AIs are in complete agreement.';
    } else if (agreementCount > disagreementCount) {
      summary += `Strong consensus with ${agreementCount} agreements and ${disagreementCount} minor differences.`;
    } else if (agreementCount === disagreementCount) {
      summary += `Mixed consensus with equal agreements and disagreements.`;
    } else {
      summary += `Weak consensus with ${disagreementCount} disagreements and only ${agreementCount} agreements.`;
    }
    
    if (confidence > 0.8) {
      summary += ' High confidence in the combined result.';
    } else if (confidence > 0.6) {
      summary += ' Moderate confidence in the combined result.';
    } else {
      summary += ' Low confidence - manual review recommended.';
    }
    
    return summary;
  }
}