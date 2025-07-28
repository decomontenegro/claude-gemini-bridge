import * as path from 'path'
import * as vm from 'vm'
import * as fs from 'fs/promises'
import { Plugin, PluginManifest } from '../interfaces/Plugin'
import { Logger } from '../../application/interfaces/Logger'

export class PluginLoader {
  constructor(private logger: Logger) {}

  async load(pluginPath: string, manifest: PluginManifest): Promise<Plugin> {
    const mainFile = path.join(pluginPath, manifest.main)
    
    try {
      // Check if using ES modules or CommonJS
      const isESM = manifest.main.endsWith('.mjs') || 
                    (manifest.main.endsWith('.js') && await this.isESModule(mainFile))
      
      if (isESM) {
        return await this.loadESModule(mainFile, manifest)
      } else {
        return await this.loadCommonJS(mainFile, manifest)
      }
    } catch (error) {
      this.logger.error('Failed to load plugin module', { 
        pluginPath, 
        error 
      })
      throw error
    }
  }

  private async loadESModule(
    mainFile: string, 
    manifest: PluginManifest
  ): Promise<Plugin> {
    // Dynamic import for ES modules
    const module = await import(mainFile)
    const PluginClass = module.default || module.Plugin
    
    if (!PluginClass) {
      throw new Error('Plugin must export a default class or named export "Plugin"')
    }
    
    const plugin = new PluginClass()
    
    // Inject metadata and capabilities from manifest
    plugin.metadata = manifest.metadata
    plugin.capabilities = manifest.capabilities
    
    return plugin
  }

  private async loadCommonJS(
    mainFile: string, 
    manifest: PluginManifest
  ): Promise<Plugin> {
    // Use require for CommonJS modules
    const module = require(mainFile)
    const PluginClass = module.default || module.Plugin || module
    
    if (!PluginClass) {
      throw new Error('Plugin must export a class')
    }
    
    const plugin = typeof PluginClass === 'function' 
      ? new PluginClass() 
      : PluginClass
    
    // Inject metadata and capabilities from manifest
    plugin.metadata = manifest.metadata
    plugin.capabilities = manifest.capabilities
    
    return plugin
  }

  private async isESModule(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      // Simple heuristic: check for import/export statements
      return /^\s*(import|export)\s/m.test(content)
    } catch {
      return false
    }
  }

  async loadInSandbox(
    pluginPath: string, 
    manifest: PluginManifest,
    sandbox: any
  ): Promise<Plugin> {
    const mainFile = path.join(pluginPath, manifest.main)
    const code = await fs.readFile(mainFile, 'utf-8')
    
    // Create a sandboxed context
    const context = vm.createContext({
      console: sandbox.console,
      setTimeout: sandbox.setTimeout,
      setInterval: sandbox.setInterval,
      clearTimeout: sandbox.clearTimeout,
      clearInterval: sandbox.clearInterval,
      Buffer: sandbox.Buffer,
      process: {
        env: sandbox.env,
        version: process.version,
        platform: process.platform
      },
      require: sandbox.require,
      module: { exports: {} },
      exports: {}
    })
    
    // Run the plugin code in sandbox
    vm.runInContext(code, context, {
      filename: mainFile,
      timeout: 5000 // 5 second timeout
    })
    
    const PluginClass = context.module.exports.default || 
                       context.module.exports.Plugin || 
                       context.module.exports
    
    const plugin = new PluginClass()
    plugin.metadata = manifest.metadata
    plugin.capabilities = manifest.capabilities
    
    return plugin
  }

  async validatePlugin(plugin: Plugin): Promise<boolean> {
    // Check required properties
    if (!plugin.metadata || !plugin.capabilities) {
      return false
    }
    
    // Check metadata
    const requiredFields = ['id', 'name', 'version']
    for (const field of requiredFields) {
      if (!plugin.metadata[field]) {
        return false
      }
    }
    
    // Check that lifecycle methods are functions if present
    const lifecycleMethods = [
      'onInstall', 'onEnable', 'onDisable', 
      'onUninstall', 'onUpdate'
    ]
    
    for (const method of lifecycleMethods) {
      if (plugin[method] && typeof plugin[method] !== 'function') {
        return false
      }
    }
    
    return true
  }
}