import { Result } from '../entities/Result';
import { Task } from '../entities/Task';
import { AdapterType } from '../value-objects/AdapterType';
import { TaskType } from '../value-objects/TaskType';
import { ValidationResult } from '../interfaces/ValidationResult';

export interface ValidationCriteria {
  name: string;
  weight: number;
  validate(result: Result, task: Task): number; // Returns score 0-1
}

export interface ValidationReport {
  isValid: boolean;
  score: number;
  criteria: Array<{
    name: string;
    score: number;
    weight: number;
    passed: boolean;
  }>;
  recommendations: string[];
}

export class ResultValidator {
  private criteria: ValidationCriteria[] = [];

  constructor() {
    this.initializeDefaultCriteria();
  }

  public addCriteria(criteria: ValidationCriteria): void {
    this.criteria.push(criteria);
  }

  public removeCriteria(name: string): void {
    this.criteria = this.criteria.filter(c => c.name !== name);
  }

  public async validate(result: Result, task: Task): Promise<ValidationReport> {
    const criteriaResults: Array<{
      name: string;
      score: number;
      weight: number;
      passed: boolean;
    }> = [];

    let totalScore = 0;
    let totalWeight = 0;

    // Evaluate each criteria
    for (const criterion of this.criteria) {
      const score = criterion.validate(result, task);
      const passed = score >= 0.6; // 60% threshold for passing

      criteriaResults.push({
        name: criterion.name,
        score,
        weight: criterion.weight,
        passed
      });

      totalScore += score * criterion.weight;
      totalWeight += criterion.weight;
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const isValid = finalScore >= 0.7; // 70% overall threshold

    const recommendations = this.generateRecommendations(criteriaResults, result, task);

    return {
      isValid,
      score: finalScore,
      criteria: criteriaResults,
      recommendations
    };
  }

  public async crossValidate(
    result1: Result,
    result2: Result,
    task: Task
  ): Promise<{
    consensus: boolean;
    similarity: number;
    differences: string[];
  }> {
    // Check if results are from different adapters
    if (result1.adapter === result2.adapter) {
      throw new Error('Cross-validation requires results from different adapters');
    }

    const similarity = this.calculateSimilarity(result1.output, result2.output);
    const differences = this.identifyDifferences(result1, result2);
    const consensus = similarity > 0.8 && differences.length < 3;

    return {
      consensus,
      similarity,
      differences
    };
  }

  private initializeDefaultCriteria(): void {
    // Completeness check
    this.addCriteria({
      name: 'completeness',
      weight: 0.25,
      validate: (result: Result, task: Task) => {
        if (result.error) return 0;

        const outputLength = result.output.length;
        const promptLength = task.prompt.length;

        // Basic heuristic: output should be proportional to prompt complexity
        if (outputLength < promptLength * 0.5) return 0.5;
        if (outputLength > promptLength * 3) return 0.9;
        return 1.0;
      }
    });

    // Relevance check
    this.addCriteria({
      name: 'relevance',
      weight: 0.3,
      validate: (result: Result, task: Task) => {
        if (result.error) return 0;

        // Check if output contains key terms from the prompt
        const promptWords = task.prompt.toLowerCase().split(/\s+/);
        const outputWords = result.output.toLowerCase().split(/\s+/);
        
        let matches = 0;
        for (const word of promptWords) {
          if (word.length > 3 && outputWords.includes(word)) {
            matches++;
          }
        }

        return Math.min(1, matches / (promptWords.length * 0.3));
      }
    });

    // Format check (for code tasks)
    this.addCriteria({
      name: 'format',
      weight: 0.2,
      validate: (result: Result, task: Task) => {
        if (result.error) return 0;

        // Only apply to code-related tasks
        const codeTaskTypes = [
          TaskType.CODE_GENERATION,
          TaskType.CODE_REVIEW,
          TaskType.DEBUGGING,
          TaskType.REFACTORING
        ];

        if (!codeTaskTypes.includes(task.type)) {
          return 1.0; // Not applicable, so pass
        }

        // Check for code blocks
        const hasCodeBlocks = /```[\s\S]*?```/.test(result.output);
        const hasIndentation = /^\s{2,}/m.test(result.output);

        if (hasCodeBlocks) return 1.0;
        if (hasIndentation) return 0.8;
        return 0.5;
      }
    });

    // Performance check
    this.addCriteria({
      name: 'performance',
      weight: 0.15,
      validate: (result: Result) => {
        const executionTime = result.executionTime;

        if (executionTime < 2000) return 1.0;    // Under 2s
        if (executionTime < 5000) return 0.8;    // Under 5s
        if (executionTime < 10000) return 0.6;   // Under 10s
        if (executionTime < 30000) return 0.4;   // Under 30s
        return 0.2; // Over 30s
      }
    });

    // Error check
    this.addCriteria({
      name: 'error-free',
      weight: 0.1,
      validate: (result: Result) => {
        return result.error ? 0 : 1;
      }
    });
  }

  private calculateSimilarity(output1: string, output2: string): number {
    // Simple word-based similarity
    const words1 = new Set(output1.toLowerCase().split(/\s+/));
    const words2 = new Set(output2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private identifyDifferences(result1: Result, result2: Result): string[] {
    const differences: string[] = [];

    // Length difference
    const lengthDiff = Math.abs(result1.output.length - result2.output.length);
    if (lengthDiff > 100) {
      differences.push(`Output length differs by ${lengthDiff} characters`);
    }

    // Execution time difference
    const timeDiff = Math.abs(result1.executionTime - result2.executionTime);
    if (timeDiff > 5000) {
      differences.push(`Execution time differs by ${timeDiff}ms`);
    }

    // Check for unique content
    const lines1 = new Set(result1.output.split('\n'));
    const lines2 = new Set(result2.output.split('\n'));
    
    const unique1 = [...lines1].filter(x => !lines2.has(x)).length;
    const unique2 = [...lines2].filter(x => !lines1.has(x)).length;

    if (unique1 > 5) {
      differences.push(`${result1.adapter} has ${unique1} unique lines`);
    }
    if (unique2 > 5) {
      differences.push(`${result2.adapter} has ${unique2} unique lines`);
    }

    return differences;
  }

  private generateRecommendations(
    criteriaResults: Array<{ name: string; score: number; passed: boolean }>,
    result: Result,
    task: Task
  ): string[] {
    const recommendations: string[] = [];

    // Check failed criteria
    for (const criterion of criteriaResults) {
      if (!criterion.passed) {
        switch (criterion.name) {
          case 'completeness':
            recommendations.push('Consider requesting more detailed output');
            break;
          case 'relevance':
            recommendations.push('Output may not fully address the prompt');
            break;
          case 'format':
            recommendations.push('Output formatting could be improved');
            break;
          case 'performance':
            recommendations.push('Response time was slower than expected');
            break;
        }
      }
    }

    // Adapter-specific recommendations
    if (result.adapter === AdapterType.CLAUDE && task.type === TaskType.MULTIMODAL) {
      recommendations.push('Consider using Gemini for multimodal tasks');
    }

    if (result.adapter === AdapterType.GEMINI && task.type === TaskType.REFACTORING) {
      recommendations.push('Consider using Claude for complex refactoring');
    }

    // Cross-validation recommendation
    if (!result.metadata.validatedBy && result.executionTime > 5000) {
      recommendations.push('Consider cross-validating with another AI');
    }

    return recommendations;
  }
}