import OpenAI from 'openai'
import { Task } from '../../domain/entities/Task'
import { AdapterType } from '../../domain/value-objects/AdapterType'
import { TaskType } from '../../domain/value-objects/TaskType'
import { 
  AIAdapter, 
  AdapterResult, 
  AdapterCapability, 
  AdapterHealth 
} from '../../application/interfaces/AIAdapter'
import { Logger } from '../../application/interfaces/Logger'
import { CircuitBreaker } from '../services/CircuitBreaker'

export interface OpenAIConfig {
  apiKey: string
  model?: string
  maxTokens?: number
  temperature?: number
  organizationId?: string
  baseURL?: string
}

export class OpenAIAdapter implements AIAdapter {
  readonly type = AdapterType.CLAUDE // We'll need to add OPENAI to AdapterType
  readonly name = 'OpenAI GPT'
  readonly version = '1.0.0'

  private client: OpenAI
  private config: OpenAIConfig
  private circuitBreaker: CircuitBreaker
  private retryCount = 0

  constructor(
    config: OpenAIConfig,
    private readonly logger: Logger
  ) {
    this.config = {
      model: 'gpt-4-turbo-preview',
      maxTokens: 4096,
      temperature: 0.7,
      ...config
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      organization: this.config.organizationId,
      baseURL: this.config.baseURL
    })

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 60000
    })
  }

  async execute(task: Task): Promise<AdapterResult> {
    const startTime = Date.now()
    
    try {
      return await this.circuitBreaker.execute(async () => {
        const messages = this.buildMessages(task)
        
        const completion = await this.client.chat.completions.create({
          model: this.config.model!,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })

        const output = completion.choices[0]?.message?.content || ''
        const tokensUsed = completion.usage?.total_tokens || 0

        this.logger.info('OpenAI task completed', {
          taskId: task.id.value,
          model: this.config.model,
          tokensUsed
        })

        return {
          output,
          tokensUsed,
          model: this.config.model,
          retryCount: this.retryCount,
          metadata: {
            finishReason: completion.choices[0]?.finish_reason,
            promptTokens: completion.usage?.prompt_tokens,
            completionTokens: completion.usage?.completion_tokens
          }
        }
      })
    } catch (error) {
      this.logger.error('OpenAI execution failed', { 
        error, 
        taskId: task.id.value 
      })

      // Handle rate limits with retry
      if (this.isRateLimitError(error) && this.retryCount < 3) {
        this.retryCount++
        await this.delay(Math.pow(2, this.retryCount) * 1000)
        return this.execute(task)
      }

      throw error
    } finally {
      this.retryCount = 0
    }
  }

  getCapabilities(): AdapterCapability[] {
    return [
      {
        name: 'code_generation',
        description: 'Generate code in multiple languages',
        supported: true
      },
      {
        name: 'code_review',
        description: 'Review code for quality and best practices',
        supported: true
      },
      {
        name: 'debugging',
        description: 'Debug and fix code issues',
        supported: true
      },
      {
        name: 'documentation',
        description: 'Generate and improve documentation',
        supported: true
      },
      {
        name: 'chat',
        description: 'General conversational AI',
        supported: true
      },
      {
        name: 'function_calling',
        description: 'Execute functions and tools',
        supported: true
      },
      {
        name: 'vision',
        description: 'Analyze images (GPT-4V only)',
        supported: this.config.model?.includes('vision') || false
      }
    ]
  }

  supportsTaskType(taskType: string): boolean {
    const supportedTypes = [
      TaskType.CODE_GENERATION,
      TaskType.CODE_REVIEW,
      TaskType.DEBUGGING,
      TaskType.DOCUMENTATION,
      TaskType.REFACTORING,
      TaskType.ARCHITECTURE
    ]
    
    return supportedTypes.includes(taskType as TaskType)
  }

  async healthCheck(): Promise<AdapterHealth> {
    const startTime = Date.now()
    
    try {
      // Simple health check using models endpoint
      await this.client.models.list()
      
      return {
        status: 'healthy',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        details: {
          model: this.config.model,
          circuitBreakerState: this.circuitBreaker.getState()
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    const health = await this.healthCheck()
    return health.status === 'healthy'
  }

  configure(config: Record<string, any>): void {
    this.config = { ...this.config, ...config }
    
    // Recreate client if API key changed
    if (config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        organization: config.organizationId || this.config.organizationId,
        baseURL: config.baseURL || this.config.baseURL
      })
    }
  }

  getConfiguration(): Record<string, any> {
    return {
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      organizationId: this.config.organizationId,
      baseURL: this.config.baseURL
    }
  }

  private buildMessages(task: Task): OpenAI.Chat.ChatCompletionMessageParam[] {
    const systemPrompt = this.getSystemPrompt(task.type)
    
    return [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: task.prompt
      }
    ]
  }

  private getSystemPrompt(taskType: TaskType): string {
    const prompts: Record<string, string> = {
      [TaskType.CODE_GENERATION]: 'You are an expert programmer. Generate clean, efficient, and well-documented code.',
      [TaskType.CODE_REVIEW]: 'You are a senior code reviewer. Analyze code for quality, security, and best practices.',
      [TaskType.DEBUGGING]: 'You are a debugging expert. Identify and fix issues in code with clear explanations.',
      [TaskType.DOCUMENTATION]: 'You are a technical writer. Create clear, comprehensive documentation.',
      [TaskType.REFACTORING]: 'You are a refactoring specialist. Improve code structure while maintaining functionality.',
      [TaskType.ARCHITECTURE]: 'You are a software architect. Design scalable and maintainable system architectures.'
    }
    
    return prompts[taskType] || 'You are a helpful AI assistant.'
  }

  private isRateLimitError(error: any): boolean {
    return error?.status === 429 || 
           error?.message?.toLowerCase().includes('rate limit')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}