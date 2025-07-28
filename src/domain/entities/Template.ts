import { TaskType } from '../value-objects/TaskType';
import { Priority } from '../value-objects/Priority';
import { AdapterType } from '../value-objects/AdapterType';
import { ValidationResult } from '../interfaces/ValidationResult';

export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

export interface TemplateProps {
  id: string;
  name: string;
  description: string;
  category: string;
  promptTemplate: string;
  variables: TemplateVariable[];
  type: TaskType;
  defaultPriority: Priority;
  preferredAdapter?: AdapterType;
  tags: string[];
  isPublic: boolean;
  userId: string;
  usageCount: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Template {
  constructor(private props: TemplateProps) {
    this.validate();
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get category(): string {
    return this.props.category;
  }

  get promptTemplate(): string {
    return this.props.promptTemplate;
  }

  get variables(): TemplateVariable[] {
    return [...this.props.variables];
  }

  get type(): TaskType {
    return this.props.type;
  }

  get defaultPriority(): Priority {
    return this.props.defaultPriority;
  }

  get preferredAdapter(): AdapterType | undefined {
    return this.props.preferredAdapter;
  }

  get tags(): string[] {
    return [...this.props.tags];
  }

  get isPublic(): boolean {
    return this.props.isPublic;
  }

  get userId(): string {
    return this.props.userId;
  }

  get usageCount(): number {
    return this.props.usageCount;
  }

  get rating(): number {
    return this.props.rating;
  }

  get popularity(): number {
    // Calculate popularity score based on usage and rating
    const usageScore = Math.log10(this.props.usageCount + 1);
    const ratingScore = this.props.rating;
    return (usageScore + ratingScore) / 2;
  }

  // Business Logic
  public validate(): ValidationResult {
    const errors: string[] = [];

    if (!this.props.name || this.props.name.trim().length === 0) {
      errors.push('Template name cannot be empty');
    }

    if (this.props.name.length > 100) {
      errors.push('Template name cannot exceed 100 characters');
    }

    if (!this.props.promptTemplate || this.props.promptTemplate.trim().length === 0) {
      errors.push('Prompt template cannot be empty');
    }

    // Validate variables
    const variableNames = new Set<string>();
    for (const variable of this.props.variables) {
      if (variableNames.has(variable.name)) {
        errors.push(`Duplicate variable name: ${variable.name}`);
      }
      variableNames.add(variable.name);

      // Check if variable is used in template
      const variablePattern = new RegExp(`\\{\\{\\s*${variable.name}\\s*\\}\\}`, 'g');
      if (!variablePattern.test(this.props.promptTemplate)) {
        errors.push(`Variable ${variable.name} is not used in the template`);
      }
    }

    // Check for undefined variables in template
    const templateVariables = this.props.promptTemplate.match(/\{\{\s*(\w+)\s*\}\}/g) || [];
    for (const match of templateVariables) {
      const varName = match.replace(/\{\{\s*|\s*\}\}/g, '');
      if (!variableNames.has(varName)) {
        errors.push(`Undefined variable in template: ${varName}`);
      }
    }

    if (this.props.rating < 0 || this.props.rating > 5) {
      errors.push('Rating must be between 0 and 5');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public renderPrompt(variables: Record<string, any>): string {
    // Validate all required variables are provided
    for (const variable of this.props.variables) {
      if (variable.required && !(variable.name in variables)) {
        throw new Error(`Required variable missing: ${variable.name}`);
      }
    }

    // Replace variables in template
    let prompt = this.props.promptTemplate;
    for (const [name, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g');
      prompt = prompt.replace(pattern, String(value));
    }

    // Replace any remaining variables with defaults
    for (const variable of this.props.variables) {
      if (variable.defaultValue !== undefined) {
        const pattern = new RegExp(`\\{\\{\\s*${variable.name}\\s*\\}\\}`, 'g');
        prompt = prompt.replace(pattern, String(variable.defaultValue));
      }
    }

    return prompt;
  }

  public validateVariables(variables: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    for (const variable of this.props.variables) {
      const value = variables[variable.name];

      // Check required
      if (variable.required && value === undefined) {
        errors.push(`Required variable missing: ${variable.name}`);
        continue;
      }

      if (value === undefined) {
        continue;
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== variable.type) {
        errors.push(`Variable ${variable.name} must be of type ${variable.type}`);
      }

      // Additional validation
      if (variable.validation) {
        if (variable.validation.pattern && typeof value === 'string') {
          const regex = new RegExp(variable.validation.pattern);
          if (!regex.test(value)) {
            errors.push(`Variable ${variable.name} does not match pattern ${variable.validation.pattern}`);
          }
        }

        if (variable.validation.min !== undefined && typeof value === 'number') {
          if (value < variable.validation.min) {
            errors.push(`Variable ${variable.name} must be at least ${variable.validation.min}`);
          }
        }

        if (variable.validation.max !== undefined && typeof value === 'number') {
          if (value > variable.validation.max) {
            errors.push(`Variable ${variable.name} must be at most ${variable.validation.max}`);
          }
        }

        if (variable.validation.enum && !variable.validation.enum.includes(value)) {
          errors.push(`Variable ${variable.name} must be one of: ${variable.validation.enum.join(', ')}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public incrementUsage(): void {
    this.props.usageCount++;
    this.props.updatedAt = new Date();
  }

  public updateRating(newRating: number): void {
    if (newRating < 0 || newRating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }
    
    // Simple average for now, could be weighted in the future
    this.props.rating = (this.props.rating * this.props.usageCount + newRating) / (this.props.usageCount + 1);
    this.props.updatedAt = new Date();
  }

  public addTag(tag: string): void {
    if (!this.props.tags.includes(tag)) {
      this.props.tags.push(tag);
      this.props.updatedAt = new Date();
    }
  }

  public removeTag(tag: string): void {
    const index = this.props.tags.indexOf(tag);
    if (index > -1) {
      this.props.tags.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  public makePublic(): void {
    this.props.isPublic = true;
    this.props.updatedAt = new Date();
  }

  public makePrivate(): void {
    this.props.isPublic = false;
    this.props.updatedAt = new Date();
  }

  // Factory method
  public static create(props: Omit<TemplateProps, 'id' | 'usageCount' | 'rating' | 'createdAt' | 'updatedAt'>): Template {
    const now = new Date();
    return new Template({
      ...props,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      usageCount: 0,
      rating: 0,
      createdAt: now,
      updatedAt: now
    });
  }

  // Conversion methods
  public toPrimitives(): Record<string, any> {
    return {
      id: this.props.id,
      name: this.props.name,
      description: this.props.description,
      category: this.props.category,
      promptTemplate: this.props.promptTemplate,
      variables: this.props.variables,
      type: this.props.type,
      defaultPriority: this.props.defaultPriority.value,
      preferredAdapter: this.props.preferredAdapter,
      tags: this.props.tags,
      isPublic: this.props.isPublic,
      userId: this.props.userId,
      usageCount: this.props.usageCount,
      rating: this.props.rating,
      popularity: this.popularity,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString()
    };
  }
}