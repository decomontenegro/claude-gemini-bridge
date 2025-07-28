import { HfInference } from '@huggingface/inference'
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

export interface HuggingFaceConfig {
  apiKey: string
  model?: string
  endpoint?: string
  maxTokens?: number
  temperature?: number
}

export class HuggingFaceAdapter implements AIAdapter {
  readonly type = AdapterType.CLAUDE // We'll need to add HUGGINGFACE to AdapterType
  readonly name = 'HuggingFace'
  readonly version = '1.0.0'

  private client: HfInference
  private config: HuggingFaceConfig
  private circuitBreaker: CircuitBreaker

  constructor(
    config: HuggingFaceConfig,
    private readonly logger: Logger
  ) {
    this.config = {
      model: 'bigscience/bloom',
      maxTokens: 2048,
      temperature: 0.7,
      ...config
    }

    this.client = new HfInference(this.config.apiKey, {
      // Custom endpoint for private models
      ...(this.config.endpoint && { endpoint: this.config.endpoint })
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
        let output: string

        // Choose appropriate model based on task type
        const model = this.selectModelForTask(task.type)

        if (this.isCodeModel(model)) {
          // Use code generation endpoint
          const response = await this.client.textGeneration({
            model,
            inputs: task.prompt,
            parameters: {
              max_new_tokens: this.config.maxTokens,
              temperature: this.config.temperature,
              top_p: 0.95,
              repetition_penalty: 1.1,
              do_sample: true
            }
          })
          output = response.generated_text
        } else {
          // Use general text generation
          const response = await this.client.textGeneration({
            model,
            inputs: task.prompt,
            parameters: {
              max_new_tokens: this.config.maxTokens,
              temperature: this.config.temperature,
              top_p: 0.9,
              do_sample: true
            }
          })
          output = response.generated_text
        }

        this.logger.info('HuggingFace task completed', {
          taskId: task.id.value,
          model
        })

        return {
          output,
          model,
          retryCount: 0,
          metadata: {
            provider: 'huggingface',
            endpoint: this.config.endpoint
          }
        }
      })
    } catch (error) {
      this.logger.error('HuggingFace execution failed', { 
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
        description: 'Generate code using specialized models',
        supported: true
      },
      {
        name: 'text_generation',
        description: 'Generate text with various models',
        supported: true
      },
      {
        name: 'translation',
        description: 'Translate between languages',
        supported: true
      },
      {
        name: 'summarization',
        description: 'Summarize text content',
        supported: true
      },
      {
        name: 'question_answering',
        description: 'Answer questions based on context',
        supported: true
      },
      {
        name: 'image_generation',
        description: 'Generate images from text (with appropriate models)',
        supported: true
      },
      {
        name: 'embeddings',
        description: 'Generate text embeddings',
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
      // Simple health check with a minimal request
      await this.client.textGeneration({
        model: 'gpt2',
        inputs: 'Hello',
        parameters: {
          max_new_tokens: 1
        }
      })
      
      return {
        status: 'healthy',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        details: {
          model: this.config.model,
          endpoint: this.config.endpoint
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
      this.client = new HfInference(config.apiKey, {
        ...(config.endpoint && { endpoint: config.endpoint })
      })
    }
  }

  getConfiguration(): Record<string, any> {
    return {
      model: this.config.model,
      endpoint: this.config.endpoint,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    }
  }

  private selectModelForTask(taskType: TaskType): string {
    const modelMap: Record<string, string> = {
      [TaskType.CODE_GENERATION]: 'Salesforce/codegen-2B-mono',
      [TaskType.CODE_REVIEW]: 'microsoft/codebert-base',
      [TaskType.DOCUMENTATION]: 'google/flan-t5-base',
      [TaskType.SEARCH]: 'sentence-transformers/all-MiniLM-L6-v2'
    }
    
    return modelMap[taskType] || this.config.model || 'bigscience/bloom'
  }

  private isCodeModel(model: string): boolean {
    const codeModels = [
      'codegen',
      'codebert',
      'codeparrot',
      'incoder',
      'polycoder'
    ]
    
    return codeModels.some(cm => model.toLowerCase().includes(cm))
  }

  // Additional HuggingFace-specific features
  async generateImage(prompt: string): Promise<Buffer> {
    const response = await this.client.textToImage({
      model: 'stabilityai/stable-diffusion-2-1',
      inputs: prompt,
      parameters: {
        negative_prompt: 'blurry, low quality',
        height: 512,
        width: 512
      }
    })

    return Buffer.from(await response.arrayBuffer())
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const model = 'sentence-transformers/all-MiniLM-L6-v2'
    const embeddings: number[][] = []

    for (const text of texts) {
      const response = await this.client.featureExtraction({
        model,
        inputs: text
      })
      embeddings.push(response as number[])
    }

    return embeddings
  }

  async translateText(text: string, targetLang: string): Promise<string> {
    const response = await this.client.translation({
      model: 'Helsinki-NLP/opus-mt-en-' + targetLang,
      inputs: text
    })

    return response.translation_text
  }
}