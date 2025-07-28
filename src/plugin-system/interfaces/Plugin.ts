import { Task } from '../../domain/entities/Task'
import { Result } from '../../domain/entities/Result'
import { AdapterType } from '../../domain/value-objects/AdapterType'
import { TaskType } from '../../domain/value-objects/TaskType'

export interface PluginMetadata {
  id: string
  name: string
  version: string
  description: string
  author: string
  license?: string
  homepage?: string
  repository?: string
  keywords?: string[]
  dependencies?: Record<string, string>
  engines?: {
    node?: string
    npm?: string
  }
}

export interface PluginCapabilities {
  supportedTaskTypes?: TaskType[]
  supportedAdapters?: AdapterType[]
  customTaskTypes?: string[]
  features?: string[]
}

export enum PluginLifecycleEvent {
  INSTALL = 'install',
  ENABLE = 'enable',
  DISABLE = 'disable',
  UNINSTALL = 'uninstall',
  UPDATE = 'update'
}

export interface PluginContext {
  logger: PluginLogger
  storage: PluginStorage
  config: PluginConfig
  api: PluginAPI
}

export interface PluginLogger {
  debug(message: string, meta?: Record<string, any>): void
  info(message: string, meta?: Record<string, any>): void
  warn(message: string, meta?: Record<string, any>): void
  error(message: string, meta?: Record<string, any>): void
}

export interface PluginStorage {
  get<T = any>(key: string): Promise<T | null>
  set<T = any>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
}

export interface PluginConfig {
  get<T = any>(key: string): T | undefined
  set<T = any>(key: string, value: T): void
  getAll(): Record<string, any>
}

export interface PluginAPI {
  readonly version: string
  
  // Task operations
  createTask(params: Partial<Task>): Promise<Task>
  getTask(id: string): Promise<Task | null>
  updateTask(id: string, updates: Partial<Task>): Promise<Task>
  
  // Result operations
  getResults(taskId: string): Promise<Result[]>
  
  // Event subscription
  on(event: string, handler: (...args: any[]) => void): () => void
  emit(event: string, ...args: any[]): void
  
  // UI extension points
  registerComponent(name: string, component: any): void
  registerRoute(path: string, component: any): void
  registerMenuItem(item: PluginMenuItem): void
}

export interface PluginMenuItem {
  id: string
  label: string
  icon?: string
  path?: string
  action?: () => void
  position?: 'main' | 'settings' | 'tools'
  order?: number
}

export interface Plugin {
  metadata: PluginMetadata
  capabilities: PluginCapabilities
  
  // Lifecycle methods
  onInstall?(context: PluginContext): Promise<void>
  onEnable?(context: PluginContext): Promise<void>
  onDisable?(context: PluginContext): Promise<void>
  onUninstall?(context: PluginContext): Promise<void>
  onUpdate?(context: PluginContext, previousVersion: string): Promise<void>
  
  // Task hooks
  beforeTaskCreate?(task: Task, context: PluginContext): Promise<Task | null>
  afterTaskCreate?(task: Task, context: PluginContext): Promise<void>
  beforeTaskExecute?(task: Task, context: PluginContext): Promise<Task | null>
  afterTaskExecute?(task: Task, result: Result, context: PluginContext): Promise<void>
  
  // Result hooks
  beforeResultSave?(result: Result, context: PluginContext): Promise<Result | null>
  afterResultSave?(result: Result, context: PluginContext): Promise<void>
  
  // Custom task handler
  handleTask?(task: Task, context: PluginContext): Promise<Result | null>
  
  // UI components (for web interface)
  components?: Record<string, any>
  routes?: Array<{
    path: string
    component: any
  }>
}

export interface PluginManifest {
  metadata: PluginMetadata
  capabilities: PluginCapabilities
  main: string // Entry point file
  permissions?: PluginPermissions
  configuration?: PluginConfigurationSchema
}

export interface PluginPermissions {
  filesystem?: {
    read?: string[]
    write?: string[]
  }
  network?: {
    hosts?: string[]
  }
  system?: {
    env?: string[]
    exec?: boolean
  }
}

export interface PluginConfigurationSchema {
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object'
    title?: string
    description?: string
    default?: any
    required?: boolean
    enum?: any[]
    minimum?: number
    maximum?: number
    pattern?: string
  }>
}