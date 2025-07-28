import { Result } from '../entities/Result';
import { Task } from '../entities/Task';
import { AdapterType } from '../value-objects/AdapterType';

export enum MergeStrategy {
  CONSENSUS = 'CONSENSUS',
  BEST_OF = 'BEST_OF',
  COMBINE = 'COMBINE',
  VALIDATE = 'VALIDATE'
}

export interface MergeOptions {
  strategy: MergeStrategy;
  preferredAdapter?: AdapterType;
  includeMetadata?: boolean;
  formatOutput?: boolean;
}

export interface MergedResult {
  output: string;
  strategy: MergeStrategy;
  sources: Array<{
    adapter: AdapterType;
    contribution: number; // Percentage of contribution
  }>;
  confidence: number;
  metadata: {
    totalExecutionTime: number;
    mergeTime: number;
    consensus?: boolean;
    validationScore?: number;
  };
}

export class ResultMerger {
  public async merge(
    results: Result[],
    task: Task,
    options: MergeOptions
  ): Promise<MergedResult> {
    if (results.length === 0) {
      throw new Error('No results to merge');
    }

    if (results.length === 1) {
      return this.singleResultToMerged(results[0], options);
    }

    const startTime = Date.now();
    let mergedResult: MergedResult;

    switch (options.strategy) {
      case MergeStrategy.CONSENSUS:
        mergedResult = await this.mergeByConsensus(results, task, options);
        break;
      case MergeStrategy.BEST_OF:
        mergedResult = await this.mergeByBestOf(results, task, options);
        break;
      case MergeStrategy.COMBINE:
        mergedResult = await this.mergeByCombining(results, task, options);
        break;
      case MergeStrategy.VALIDATE:
        mergedResult = await this.mergeByValidation(results, task, options);
        break;
      default:
        throw new Error(`Unknown merge strategy: ${options.strategy}`);
    }

    mergedResult.metadata.mergeTime = Date.now() - startTime;
    return mergedResult;
  }

  private async mergeByConsensus(
    results: Result[],
    task: Task,
    options: MergeOptions
  ): Promise<MergedResult> {
    // Find common elements across all results
    const commonElements = this.findCommonElements(results);
    const consensusReached = commonElements.length > 0;

    // Calculate confidence based on agreement
    const confidence = this.calculateConsensusConfidence(results);

    // Build output
    let output = '';
    if (consensusReached) {
      output = this.formatConsensusOutput(commonElements, results);
    } else {
      // No consensus, fall back to best result
      const best = this.selectBestResult(results);
      output = best.output;
    }

    return {
      output,
      strategy: MergeStrategy.CONSENSUS,
      sources: results.map(r => ({
        adapter: r.adapter,
        contribution: consensusReached ? 100 / results.length : 
          (r === this.selectBestResult(results) ? 100 : 0)
      })),
      confidence,
      metadata: {
        totalExecutionTime: this.sumExecutionTime(results),
        mergeTime: 0,
        consensus: consensusReached
      }
    };
  }

  private async mergeByBestOf(
    results: Result[],
    task: Task,
    options: MergeOptions
  ): Promise<MergedResult> {
    // Select the best result based on quality metrics
    const best = this.selectBestResult(results, options.preferredAdapter);
    
    return {
      output: best.output,
      strategy: MergeStrategy.BEST_OF,
      sources: results.map(r => ({
        adapter: r.adapter,
        contribution: r === best ? 100 : 0
      })),
      confidence: best.getQualityScore(),
      metadata: {
        totalExecutionTime: this.sumExecutionTime(results),
        mergeTime: 0
      }
    };
  }

  private async mergeByCombining(
    results: Result[],
    task: Task,
    options: MergeOptions
  ): Promise<MergedResult> {
    // Combine outputs intelligently
    const sections = this.extractSections(results);
    const combined = this.combineSections(sections, task);

    // Calculate contribution percentages
    const contributions = this.calculateContributions(results, combined);

    return {
      output: options.formatOutput ? this.formatCombinedOutput(combined) : combined,
      strategy: MergeStrategy.COMBINE,
      sources: results.map((r, i) => ({
        adapter: r.adapter,
        contribution: contributions[i]
      })),
      confidence: this.calculateCombinedConfidence(results),
      metadata: {
        totalExecutionTime: this.sumExecutionTime(results),
        mergeTime: 0
      }
    };
  }

  private async mergeByValidation(
    results: Result[],
    task: Task,
    options: MergeOptions
  ): Promise<MergedResult> {
    // Use one result to validate another
    if (results.length !== 2) {
      throw new Error('Validation merge requires exactly 2 results');
    }

    const [primary, validator] = results;
    const validationScore = this.validateResult(primary, validator);

    // Format output with validation information
    const output = this.formatValidatedOutput(primary, validator, validationScore);

    return {
      output,
      strategy: MergeStrategy.VALIDATE,
      sources: [
        { adapter: primary.adapter, contribution: 70 },
        { adapter: validator.adapter, contribution: 30 }
      ],
      confidence: validationScore,
      metadata: {
        totalExecutionTime: this.sumExecutionTime(results),
        mergeTime: 0,
        validationScore
      }
    };
  }

  private singleResultToMerged(result: Result, options: MergeOptions): MergedResult {
    return {
      output: result.output,
      strategy: options.strategy,
      sources: [{ adapter: result.adapter, contribution: 100 }],
      confidence: result.getQualityScore(),
      metadata: {
        totalExecutionTime: result.executionTime,
        mergeTime: 0
      }
    };
  }

  private findCommonElements(results: Result[]): string[] {
    // Extract sentences or key points from each result
    const allElements = results.map(r => this.extractKeyElements(r.output));
    
    // Find elements present in all results
    const commonElements: string[] = [];
    for (const element of allElements[0]) {
      if (allElements.every(elements => 
        elements.some(e => this.areSimilar(e, element))
      )) {
        commonElements.push(element);
      }
    }

    return commonElements;
  }

  private extractKeyElements(output: string): string[] {
    // Simple extraction: split by sentences
    const sentences = output.match(/[^.!?]+[.!?]+/g) || [];
    
    // Also extract code blocks
    const codeBlocks = output.match(/```[\s\S]*?```/g) || [];
    
    return [...sentences, ...codeBlocks];
  }

  private areSimilar(str1: string, str2: string): boolean {
    // Simple similarity check
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const similarity = intersection.size / Math.min(words1.size, words2.size);
    
    return similarity > 0.7;
  }

  private calculateConsensusConfidence(results: Result[]): number {
    // Base confidence on agreement level
    const outputs = results.map(r => r.output);
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < outputs.length; i++) {
      for (let j = i + 1; j < outputs.length; j++) {
        totalSimilarity += this.calculateSimilarity(outputs[i], outputs[j]);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private selectBestResult(results: Result[], preferredAdapter?: AdapterType): Result {
    let best = results[0];
    let bestScore = best.getQualityScore();

    for (const result of results) {
      let score = result.getQualityScore();
      
      // Bonus for preferred adapter
      if (preferredAdapter && result.adapter === preferredAdapter) {
        score += 0.1;
      }
      
      if (score > bestScore) {
        best = result;
        bestScore = score;
      }
    }

    return best;
  }

  private extractSections(results: Result[]): Map<string, string[]> {
    const sections = new Map<string, string[]>();
    
    for (const result of results) {
      // Extract different types of content
      const codeBlocks = result.output.match(/```[\s\S]*?```/g) || [];
      const paragraphs = result.output.split('\n\n').filter(p => p.trim());
      const lists = result.output.match(/^[\*\-\+]\s+.+$/gm) || [];
      
      sections.set('code', [...(sections.get('code') || []), ...codeBlocks]);
      sections.set('text', [...(sections.get('text') || []), ...paragraphs]);
      sections.set('lists', [...(sections.get('lists') || []), ...lists]);
    }
    
    return sections;
  }

  private combineSections(sections: Map<string, string[]>, task: Task): string {
    const combined: string[] = [];
    
    // Combine based on task type
    if (task.type.includes('CODE')) {
      // Prioritize code sections
      const uniqueCode = [...new Set(sections.get('code') || [])];
      combined.push(...uniqueCode);
    }
    
    // Add unique text sections
    const uniqueText = [...new Set(sections.get('text') || [])];
    combined.push(...uniqueText);
    
    // Add unique list items
    const uniqueLists = [...new Set(sections.get('lists') || [])];
    if (uniqueLists.length > 0) {
      combined.push(uniqueLists.join('\n'));
    }
    
    return combined.join('\n\n');
  }

  private calculateContributions(results: Result[], combined: string): number[] {
    const contributions = results.map(result => {
      let contribution = 0;
      const elements = this.extractKeyElements(result.output);
      
      for (const element of elements) {
        if (combined.includes(element)) {
          contribution++;
        }
      }
      
      return contribution;
    });
    
    const total = contributions.reduce((a, b) => a + b, 0);
    return contributions.map(c => total > 0 ? (c / total) * 100 : 0);
  }

  private calculateCombinedConfidence(results: Result[]): number {
    // Average quality scores
    const avgQuality = results.reduce((sum, r) => sum + r.getQualityScore(), 0) / results.length;
    
    // Bonus for agreement
    const agreementBonus = this.calculateConsensusConfidence(results) * 0.2;
    
    return Math.min(1, avgQuality + agreementBonus);
  }

  private validateResult(primary: Result, validator: Result): number {
    // Simple validation: check if validator confirms key points
    const primaryElements = this.extractKeyElements(primary.output);
    const validatorElements = this.extractKeyElements(validator.output);
    
    let confirmed = 0;
    for (const element of primaryElements) {
      if (validatorElements.some(v => this.areSimilar(element, v))) {
        confirmed++;
      }
    }
    
    return primaryElements.length > 0 ? confirmed / primaryElements.length : 0;
  }

  private formatConsensusOutput(commonElements: string[], results: Result[]): string {
    const output: string[] = [
      '## Consensus Result',
      '',
      'The following elements were agreed upon by all AI assistants:',
      ''
    ];
    
    output.push(...commonElements);
    
    output.push('', '---', '', '### Individual Responses:', '');
    
    for (const result of results) {
      output.push(`**${result.adapter}:**`);
      output.push(result.output.substring(0, 200) + '...');
      output.push('');
    }
    
    return output.join('\n');
  }

  private formatCombinedOutput(combined: string): string {
    // Add headers and formatting
    const lines = combined.split('\n');
    const formatted: string[] = ['## Combined Analysis', ''];
    
    let inCodeBlock = false;
    for (const line of lines) {
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
      }
      
      if (!inCodeBlock && line.trim() && !line.startsWith('#')) {
        // Add bullet points to paragraphs
        formatted.push('• ' + line);
      } else {
        formatted.push(line);
      }
    }
    
    return formatted.join('\n');
  }

  private formatValidatedOutput(
    primary: Result,
    validator: Result,
    validationScore: number
  ): string {
    const output: string[] = [
      '## Validated Result',
      '',
      `Validation Score: ${(validationScore * 100).toFixed(1)}%`,
      '',
      '### Primary Response:',
      primary.output,
      '',
      '### Validation Notes:',
      validator.output.substring(0, 500) + '...'
    ];
    
    return output.join('\n');
  }

  private sumExecutionTime(results: Result[]): number {
    return results.reduce((sum, r) => sum + r.executionTime, 0);
  }
}