import { CohereClient } from 'cohere-ai'
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

export interface CohereConfig {
  apiKey: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export class CohereAdapter implements AIAdapter {
  readonly type = AdapterType.CLAUDE // We'll need to add COHERE to AdapterType
  readonly name = 'Cohere Command'
  readonly version = '1.0.0'

  private client: CohereClient
  private config: CohereConfig
  private circuitBreaker: CircuitBreaker

  constructor(
    config: CohereConfig,
    private readonly logger: Logger
  ) {
    this.config = {
      model: 'command',
      maxTokens: 4096,
      temperature: 0.3,
      ...config
    }

    this.client = new CohereClient({
      token: this.config.apiKey
    })

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000
    })
  }

  async execute(task: Task): Promise<AdapterResult> {
    const startTime = Date.now()
    
    try {
      return await this.circuitBreaker.execute(async () => {
        const response = await this.client.generate({
          model: this.config.model!,
          prompt: this.buildPrompt(task),
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
          k: 0,
          p: 0.75,
          frequencyPenalty: 0.1,
          presencePenalty: 0.1,
          returnLikelihoods: 'NONE'
        })

        const output = response.generations[0]?.text || ''

        this.logger.info('Cohere task completed', {
          taskId: task.id.value,
          model: this.config.model
        })

        return {
          output,
          model: this.config.model,
          retryCount: 0,
          metadata: {
            id: response.id,
            finishReason: response.generations[0]?.finish_reason
          }
        }
      })
    } catch (error) {
      this.logger.error('Cohere execution failed', { 
        error, 
        taskId: task.id.value 
      })
      throw error
    }
  }

  getCapabilities(): AdapterCapability[] {
    return [
      {
        name: 'code_generation',
        description: 'Generate code with Command model',
        supported: true
      },
      {
        name: 'text_generation',
        description: 'Generate text content',
        supported: true
      },
      {
        name: 'summarization',
        description: 'Summarize long texts',
        supported: true
      },
      {
        name: 'classification',
        description: 'Classify text into categories',
        supported: true
      },
      {
        name: 'embeddings',
        description: 'Generate text embeddings',
        supported: true
      },
      {
        name: 'reranking',
        description: 'Rerank search results',
        supported: true
      }
    ]
  }

  supportsTaskType(taskType: string): boolean {
    const supportedTypes = [
      TaskType.CODE_GENERATION,
      TaskType.DOCUMENTATION,
      TaskType.SEARCH
    ]
    
    return supportedTypes.includes(taskType as TaskType)
  }

  async healthCheck(): Promise<AdapterHealth> {
    const startTime = Date.now()
    
    try {
      // Check API key validity with a minimal request
      await this.client.tokenize({
        text: 'health check',
        model: 'command'
      })
      
      return {
        status: 'healthy',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        details: {
          model: this.config.model
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
    
    if (config.apiKey) {
      this.client = new CohereClient({
        token: config.apiKey
      })
    }
  }

  getConfiguration(): Record<string, any> {
    return {
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    }
  }

  private buildPrompt(task: Task): string {
    const taskInstructions = this.getTaskInstructions(task.type)
    return `${taskInstructions}\n\n${task.prompt}`
  }

  private getTaskInstructions(taskType: TaskType): string {
    const instructions: Record<string, string> = {
      [TaskType.CODE_GENERATION]: 'Generate clean, efficient code based on the following requirements:',
      [TaskType.DOCUMENTATION]: 'Create clear, comprehensive documentation for the following:',
      [TaskType.SEARCH]: 'Search and provide relevant information for:'
    }
    
    return instructions[taskType] || 'Please help with the following task:'
  }

  // Additional Cohere-specific features
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.client.embed({
      texts,
      model: 'embed-english-v3.0',
      inputType: 'search_document'
    })

    return response.embeddings
  }

  async rerank(query: string, documents: string[]): Promise<Array<{
    index: number
    relevanceScore: number
  }>> {
    const response = await this.client.rerank({
      query,
      documents,
      model: 'rerank-english-v2.0',
      topN: documents.length
    })

    return response.results.map(result => ({
      index: result.index,
      relevanceScore: result.relevance_score
    }))
  }
}