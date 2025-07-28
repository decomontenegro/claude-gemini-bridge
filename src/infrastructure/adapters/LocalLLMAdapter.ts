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
import fetch from 'node-fetch'

export interface LocalLLMConfig {
  endpoint: string
  model?: string
  apiKey?: string
  maxTokens?: number
  temperature?: number
  provider?: 'ollama' | 'localai' | 'llama.cpp' | 'custom'
}

export class LocalLLMAdapter implements AIAdapter {
  readonly type = AdapterType.CLAUDE // We'll need to add LOCAL to AdapterType
  readonly name = 'Local LLM'
  readonly version = '1.0.0'

  private config: LocalLLMConfig
  private circuitBreaker: CircuitBreaker

  constructor(
    config: LocalLLMConfig,
    private readonly logger: Logger
  ) {
    this.config = {
      model: 'llama2',
      maxTokens: 2048,
      temperature: 0.7,
      provider: 'ollama',
      ...config
    }

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 30000
    })
  }

  async execute(task: Task): Promise<AdapterResult> {
    const startTime = Date.now()
    
    try {
      return await this.circuitBreaker.execute(async () => {
        let output: string

        switch (this.config.provider) {
          case 'ollama':
            output = await this.executeOllama(task)
            break
          case 'localai':
            output = await this.executeLocalAI(task)
            break
          case 'llama.cpp':
            output = await this.executeLlamaCpp(task)
            break
          default:
            output = await this.executeCustom(task)
        }

        this.logger.info('Local LLM task completed', {
          taskId: task.id.value,
          model: this.config.model,
          provider: this.config.provider
        })

        return {
          output,
          model: this.config.model,
          retryCount: 0,
          metadata: {
            provider: this.config.provider,
            executionTime: Date.now() - startTime
          }
        }
      })
    } catch (error) {
      this.logger.error('Local LLM execution failed', { 
        error, 
        taskId: task.id.value 
      })
      throw error
    }
  }

  private async executeOllama(task: Task): Promise<string> {
    const response = await fetch(`${this.config.endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: this.buildPrompt(task),
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`)
    }

    const data = await response.json() as { response: string }
    return data.response
  }

  private async executeLocalAI(task: Task): Promise<string> {
    const response = await fetch(`${this.config.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(task.type)
          },
          {
            role: 'user',
            content: task.prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })
    })

    if (!response.ok) {
      throw new Error(`LocalAI error: ${response.statusText}`)
    }

    const data = await response.json() as { 
      choices: Array<{ message: { content: string } }> 
    }
    return data.choices[0]?.message?.content || ''
  }

  private async executeLlamaCpp(task: Task): Promise<string> {
    const response = await fetch(`${this.config.endpoint}/completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: this.buildPrompt(task),
        n_predict: this.config.maxTokens,
        temperature: this.config.temperature,
        stop: ['</s>', '\n\n\n'],
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`llama.cpp error: ${response.statusText}`)
    }

    const data = await response.json() as { content: string }
    return data.content
  }

  private async executeCustom(task: Task): Promise<string> {
    // Generic implementation for custom endpoints
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: task.prompt,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })
    })

    if (!response.ok) {
      throw new Error(`Custom LLM error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.output || data.response || data.text || ''
  }

  getCapabilities(): AdapterCapability[] {
    return [
      {
        name: 'code_generation',
        description: 'Generate code locally',
        supported: true
      },
      {
        name: 'text_generation',
        description: 'Generate text locally',
        supported: true
      },
      {
        name: 'privacy',
        description: 'Data never leaves your infrastructure',
        supported: true
      },
      {
        name: 'customization',
        description: 'Fine-tuned models support',
        supported: true
      },
      {
        name: 'offline',
        description: 'Works without internet connection',
        supported: true
      }
    ]
  }

  supportsTaskType(taskType: string): boolean {
    // Local models can attempt any task type
    return true
  }

  async healthCheck(): Promise<AdapterHealth> {
    const startTime = Date.now()
    
    try {
      let isHealthy = false

      switch (this.config.provider) {
        case 'ollama':
          const ollamaResponse = await fetch(`${this.config.endpoint}/api/tags`)
          isHealthy = ollamaResponse.ok
          break
        case 'localai':
          const localAIResponse = await fetch(`${this.config.endpoint}/v1/models`)
          isHealthy = localAIResponse.ok
          break
        case 'llama.cpp':
          const llamaResponse = await fetch(`${this.config.endpoint}/health`)
          isHealthy = llamaResponse.ok
          break
        default:
          // For custom endpoints, try a simple GET
          const customResponse = await fetch(this.config.endpoint)
          isHealthy = customResponse.ok
      }
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        details: {
          model: this.config.model,
          provider: this.config.provider,
          endpoint: this.config.endpoint
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          endpoint: this.config.endpoint
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
  }

  getConfiguration(): Record<string, any> {
    return {
      endpoint: this.config.endpoint,
      model: this.config.model,
      provider: this.config.provider,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    }
  }

  private buildPrompt(task: Task): string {
    const systemPrompt = this.getSystemPrompt(task.type)
    return `${systemPrompt}\n\nUser: ${task.prompt}\n\nAssistant:`
  }

  private getSystemPrompt(taskType: TaskType): string {
    const prompts: Record<string, string> = {
      [TaskType.CODE_GENERATION]: 'You are a helpful coding assistant. Generate clean and efficient code.',
      [TaskType.CODE_REVIEW]: 'You are a code reviewer. Analyze the code for quality and suggest improvements.',
      [TaskType.DEBUGGING]: 'You are a debugging expert. Help identify and fix issues in the code.',
      [TaskType.DOCUMENTATION]: 'You are a technical writer. Create clear documentation.',
      [TaskType.REFACTORING]: 'You are a refactoring specialist. Improve code structure.',
      [TaskType.ARCHITECTURE]: 'You are a software architect. Design scalable systems.'
    }
    
    return prompts[taskType] || 'You are a helpful assistant.'
  }

  // Additional features for local models
  async listModels(): Promise<string[]> {
    switch (this.config.provider) {
      case 'ollama':
        const response = await fetch(`${this.config.endpoint}/api/tags`)
        const data = await response.json() as { models: Array<{ name: string }> }
        return data.models.map(m => m.name)
      
      case 'localai':
        const localAIResponse = await fetch(`${this.config.endpoint}/v1/models`)
        const localAIData = await localAIResponse.json() as { data: Array<{ id: string }> }
        return localAIData.data.map(m => m.id)
      
      default:
        return [this.config.model || 'unknown']
    }
  }

  async pullModel(modelName: string): Promise<void> {
    if (this.config.provider !== 'ollama') {
      throw new Error('Model pulling only supported for Ollama')
    }

    const response = await fetch(`${this.config.endpoint}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    })

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.statusText}`)
    }

    // Stream the response to track progress
    const reader = response.body?.getReader()
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const text = new TextDecoder().decode(value)
        this.logger.info('Model pull progress', { progress: text })
      }
    }
  }
}