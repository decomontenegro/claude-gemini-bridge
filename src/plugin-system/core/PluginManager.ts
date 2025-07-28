import * as path from 'path'
import * as fs from 'fs/promises'
import { EventEmitter } from 'events'
import { 
  Plugin, 
  PluginManifest, 
  PluginMetadata, 
  PluginLifecycleEvent,
  PluginContext 
} from '../interfaces/Plugin'
import { PluginLoader } from './PluginLoader'
import { PluginSandbox } from './PluginSandbox'
import { PluginRegistry } from './PluginRegistry'
import { PluginValidator } from './PluginValidator'
import { Logger } from '../../application/interfaces/Logger'

export interface PluginManagerConfig {
  pluginsDir: string
  enableSandbox?: boolean
  autoLoad?: boolean
  allowedPermissions?: string[]
}

export class PluginManager extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map()
  private enabledPlugins: Set<string> = new Set()
  private loader: PluginLoader
  private sandbox: PluginSandbox
  private registry: PluginRegistry
  private validator: PluginValidator
  private contexts: Map<string, PluginContext> = new Map()

  constructor(
    private config: PluginManagerConfig,
    private logger: Logger
  ) {
    super()
    
    this.loader = new PluginLoader(logger)
    this.sandbox = new PluginSandbox(config.allowedPermissions || [])
    this.registry = new PluginRegistry(config.pluginsDir)
    this.validator = new PluginValidator()
    
    if (config.autoLoad) {
      this.loadAllPlugins().catch(err => {
        logger.error('Failed to auto-load plugins', { error: err })
      })
    }
  }

  async loadAllPlugins(): Promise<void> {
    const pluginDirs = await this.registry.discoverPlugins()
    
    for (const pluginDir of pluginDirs) {
      try {
        await this.loadPlugin(pluginDir)
      } catch (error) {
        this.logger.error('Failed to load plugin', { 
          pluginDir, 
          error 
        })
      }
    }
  }

  async loadPlugin(pluginPath: string): Promise<PluginMetadata> {
    try {
      // Load and validate manifest
      const manifest = await this.loadManifest(pluginPath)
      const validation = this.validator.validateManifest(manifest)
      
      if (!validation.valid) {
        throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`)
      }

      // Check if already loaded
      if (this.plugins.has(manifest.metadata.id)) {
        throw new Error(`Plugin ${manifest.metadata.id} is already loaded`)
      }

      // Load plugin code
      const plugin = await this.loader.load(pluginPath, manifest)
      
      // Create plugin context
      const context = this.createPluginContext(manifest.metadata.id)
      this.contexts.set(manifest.metadata.id, context)

      // Store plugin
      this.plugins.set(manifest.metadata.id, plugin)
      
      // Call install hook if first time
      if (plugin.onInstall) {
        await plugin.onInstall(context)
      }

      this.emit('plugin:loaded', manifest.metadata)
      this.logger.info('Plugin loaded', { 
        id: manifest.metadata.id,
        name: manifest.metadata.name 
      })

      return manifest.metadata
    } catch (error) {
      this.logger.error('Failed to load plugin', { pluginPath, error })
      throw error
    }
  }

  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (this.enabledPlugins.has(pluginId)) {
      return // Already enabled
    }

    const context = this.contexts.get(pluginId)!
    
    // Call enable hook
    if (plugin.onEnable) {
      await plugin.onEnable(context)
    }

    this.enabledPlugins.add(pluginId)
    this.emit('plugin:enabled', pluginId)
    
    this.logger.info('Plugin enabled', { id: pluginId })
  }

  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (!this.enabledPlugins.has(pluginId)) {
      return // Already disabled
    }

    const context = this.contexts.get(pluginId)!
    
    // Call disable hook
    if (plugin.onDisable) {
      await plugin.onDisable(context)
    }

    this.enabledPlugins.delete(pluginId)
    this.emit('plugin:disabled', pluginId)
    
    this.logger.info('Plugin disabled', { id: pluginId })
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    // Disable first if enabled
    if (this.enabledPlugins.has(pluginId)) {
      await this.disablePlugin(pluginId)
    }

    const context = this.contexts.get(pluginId)!
    
    // Call uninstall hook
    if (plugin.onUninstall) {
      await plugin.onUninstall(context)
    }

    // Clean up
    this.plugins.delete(pluginId)
    this.contexts.delete(pluginId)
    
    // Remove plugin files
    await this.registry.removePlugin(pluginId)
    
    this.emit('plugin:uninstalled', pluginId)
    this.logger.info('Plugin uninstalled', { id: pluginId })
  }

  async updatePlugin(pluginId: string, newVersion: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    const wasEnabled = this.enabledPlugins.has(pluginId)
    const previousVersion = plugin.metadata.version
    
    // Disable if enabled
    if (wasEnabled) {
      await this.disablePlugin(pluginId)
    }

    const context = this.contexts.get(pluginId)!
    
    // Call update hook
    if (plugin.onUpdate) {
      await plugin.onUpdate(context, previousVersion)
    }

    // Update plugin code
    // This would involve downloading and installing the new version
    // For now, we'll just update the metadata
    plugin.metadata.version = newVersion
    
    // Re-enable if was enabled
    if (wasEnabled) {
      await this.enablePlugin(pluginId)
    }

    this.emit('plugin:updated', pluginId, newVersion)
    this.logger.info('Plugin updated', { 
      id: pluginId, 
      previousVersion,
      newVersion 
    })
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId)
  }

  getEnabledPlugins(): Plugin[] {
    return Array.from(this.enabledPlugins)
      .map(id => this.plugins.get(id)!)
      .filter(Boolean)
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  isPluginEnabled(pluginId: string): boolean {
    return this.enabledPlugins.has(pluginId)
  }

  async callHook<T>(
    hookName: string, 
    ...args: any[]
  ): Promise<T[]> {
    const results: T[] = []
    
    for (const pluginId of this.enabledPlugins) {
      const plugin = this.plugins.get(pluginId)!
      const context = this.contexts.get(pluginId)!
      
      if (hookName in plugin && typeof plugin[hookName] === 'function') {
        try {
          const result = await plugin[hookName](...args, context)
          if (result !== undefined) {
            results.push(result)
          }
        } catch (error) {
          this.logger.error('Plugin hook error', { 
            pluginId, 
            hookName, 
            error 
          })
        }
      }
    }
    
    return results
  }

  private async loadManifest(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, 'plugin.json')
    const content = await fs.readFile(manifestPath, 'utf-8')
    return JSON.parse(content)
  }

  private createPluginContext(pluginId: string): PluginContext {
    return {
      logger: this.createPluginLogger(pluginId),
      storage: this.createPluginStorage(pluginId),
      config: this.createPluginConfig(pluginId),
      api: this.createPluginAPI(pluginId)
    }
  }

  private createPluginLogger(pluginId: string): any {
    return {
      debug: (message: string, meta?: any) => 
        this.logger.debug(`[${pluginId}] ${message}`, meta),
      info: (message: string, meta?: any) => 
        this.logger.info(`[${pluginId}] ${message}`, meta),
      warn: (message: string, meta?: any) => 
        this.logger.warn(`[${pluginId}] ${message}`, meta),
      error: (message: string, meta?: any) => 
        this.logger.error(`[${pluginId}] ${message}`, meta)
    }
  }

  private createPluginStorage(pluginId: string): any {
    const storageDir = path.join(this.config.pluginsDir, pluginId, 'storage')
    
    return {
      get: async (key: string) => {
        try {
          const filePath = path.join(storageDir, `${key}.json`)
          const content = await fs.readFile(filePath, 'utf-8')
          return JSON.parse(content)
        } catch {
          return null
        }
      },
      set: async (key: string, value: any) => {
        await fs.mkdir(storageDir, { recursive: true })
        const filePath = path.join(storageDir, `${key}.json`)
        await fs.writeFile(filePath, JSON.stringify(value))
      },
      delete: async (key: string) => {
        const filePath = path.join(storageDir, `${key}.json`)
        await fs.unlink(filePath).catch(() => {})
      },
      clear: async () => {
        await fs.rm(storageDir, { recursive: true, force: true })
      },
      keys: async () => {
        try {
          const files = await fs.readdir(storageDir)
          return files
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace('.json', ''))
        } catch {
          return []
        }
      }
    }
  }

  private createPluginConfig(pluginId: string): any {
    const configPath = path.join(this.config.pluginsDir, pluginId, 'config.json')
    let config: Record<string, any> = {}
    
    // Load config
    try {
      const content = fs.readFileSync(configPath, 'utf-8')
      config = JSON.parse(content)
    } catch {}
    
    return {
      get: (key: string) => config[key],
      set: (key: string, value: any) => {
        config[key] = value
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
      },
      getAll: () => ({ ...config })
    }
  }

  private createPluginAPI(pluginId: string): any {
    return {
      version: '1.0.0',
      
      // These would be implemented with actual domain services
      createTask: async (params: any) => {
        // Implement with TaskService
        throw new Error('Not implemented')
      },
      getTask: async (id: string) => {
        // Implement with TaskService
        throw new Error('Not implemented')
      },
      updateTask: async (id: string, updates: any) => {
        // Implement with TaskService
        throw new Error('Not implemented')
      },
      getResults: async (taskId: string) => {
        // Implement with ResultService
        throw new Error('Not implemented')
      },
      
      on: (event: string, handler: any) => {
        this.on(`plugin:${pluginId}:${event}`, handler)
        return () => this.off(`plugin:${pluginId}:${event}`, handler)
      },
      emit: (event: string, ...args: any[]) => {
        this.emit(`plugin:${pluginId}:${event}`, ...args)
      },
      
      registerComponent: (name: string, component: any) => {
        this.emit('plugin:component:register', { pluginId, name, component })
      },
      registerRoute: (path: string, component: any) => {
        this.emit('plugin:route:register', { pluginId, path, component })
      },
      registerMenuItem: (item: any) => {
        this.emit('plugin:menu:register', { pluginId, item })
      }
    }
  }
}