import * as vm from 'vm'
import * as path from 'path'
import { EventEmitter } from 'events'

export interface SandboxOptions {
  timeout?: number
  memory?: number
  allowedModules?: string[]
  env?: Record<string, string>
}

export class PluginSandbox {
  private allowedModules: Set<string>
  private contexts: Map<string, vm.Context> = new Map()

  constructor(allowedPermissions: string[]) {
    this.allowedModules = new Set([
      // Safe built-in modules
      'path',
      'url',
      'querystring',
      'string_decoder',
      'punycode',
      'util',
      'buffer',
      'events',
      'stream',
      'crypto',
      'zlib',
      
      // Additional allowed modules based on permissions
      ...(allowedPermissions.includes('filesystem') ? ['fs'] : []),
      ...(allowedPermissions.includes('network') ? ['http', 'https'] : []),
      ...(allowedPermissions.includes('process') ? ['child_process'] : [])
    ])
  }

  createContext(pluginId: string, options: SandboxOptions = {}): vm.Context {
    const safeRequire = this.createSafeRequire(options.allowedModules)
    const safeConsole = this.createSafeConsole(pluginId)
    const safeTimers = this.createSafeTimers()
    
    const context = vm.createContext({
      // Safe globals
      console: safeConsole,
      Buffer: Buffer,
      Promise: Promise,
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Date: Date,
      RegExp: RegExp,
      Error: Error,
      JSON: JSON,
      Math: Math,
      
      // Safe timers
      setTimeout: safeTimers.setTimeout,
      clearTimeout: safeTimers.clearTimeout,
      setInterval: safeTimers.setInterval,
      clearInterval: safeTimers.clearInterval,
      setImmediate: safeTimers.setImmediate,
      clearImmediate: safeTimers.clearImmediate,
      
      // Safe process
      process: {
        env: options.env || {},
        version: process.version,
        versions: process.versions,
        platform: process.platform,
        arch: process.arch,
        nextTick: process.nextTick
      },
      
      // Module system
      require: safeRequire,
      module: { exports: {} },
      exports: {},
      __dirname: path.dirname(''),
      __filename: ''
    })
    
    this.contexts.set(pluginId, context)
    return context
  }

  destroyContext(pluginId: string): void {
    this.contexts.delete(pluginId)
  }

  execute(
    pluginId: string, 
    code: string, 
    options: SandboxOptions = {}
  ): any {
    const context = this.contexts.get(pluginId) || 
                   this.createContext(pluginId, options)
    
    try {
      return vm.runInContext(code, context, {
        timeout: options.timeout || 5000,
        breakOnSigint: true,
        displayErrors: true
      })
    } catch (error) {
      throw new Error(`Sandbox execution error: ${error.message}`)
    }
  }

  private createSafeRequire(additionalModules?: string[]) {
    const allowed = new Set([
      ...this.allowedModules,
      ...(additionalModules || [])
    ])
    
    return (moduleName: string) => {
      // Check if module is allowed
      if (!allowed.has(moduleName)) {
        throw new Error(`Module '${moduleName}' is not allowed in sandbox`)
      }
      
      // Prevent path traversal
      if (moduleName.includes('..') || path.isAbsolute(moduleName)) {
        throw new Error(`Invalid module path: ${moduleName}`)
      }
      
      try {
        return require(moduleName)
      } catch (error) {
        throw new Error(`Failed to load module '${moduleName}': ${error.message}`)
      }
    }
  }

  private createSafeConsole(pluginId: string) {
    return {
      log: (...args: any[]) => console.log(`[Plugin:${pluginId}]`, ...args),
      info: (...args: any[]) => console.info(`[Plugin:${pluginId}]`, ...args),
      warn: (...args: any[]) => console.warn(`[Plugin:${pluginId}]`, ...args),
      error: (...args: any[]) => console.error(`[Plugin:${pluginId}]`, ...args),
      debug: (...args: any[]) => console.debug(`[Plugin:${pluginId}]`, ...args),
      trace: (...args: any[]) => console.trace(`[Plugin:${pluginId}]`, ...args),
      dir: (obj: any, options?: any) => console.dir(obj, options),
      time: (label: string) => console.time(`[Plugin:${pluginId}] ${label}`),
      timeEnd: (label: string) => console.timeEnd(`[Plugin:${pluginId}] ${label}`)
    }
  }

  private createSafeTimers() {
    const timers = new Map<any, NodeJS.Timeout>()
    const maxTimers = 100
    
    const checkLimit = () => {
      if (timers.size >= maxTimers) {
        throw new Error(`Timer limit exceeded (max: ${maxTimers})`)
      }
    }
    
    return {
      setTimeout: (callback: Function, delay: number, ...args: any[]) => {
        checkLimit()
        const timer = setTimeout(() => {
          timers.delete(timer)
          callback(...args)
        }, Math.min(delay, 60000)) // Max 1 minute
        timers.set(timer, timer)
        return timer
      },
      
      clearTimeout: (timer: any) => {
        if (timers.has(timer)) {
          clearTimeout(timer)
          timers.delete(timer)
        }
      },
      
      setInterval: (callback: Function, interval: number, ...args: any[]) => {
        checkLimit()
        const timer = setInterval(
          callback, 
          Math.max(100, Math.min(interval, 60000)), // Min 100ms, max 1 minute
          ...args
        )
        timers.set(timer, timer)
        return timer
      },
      
      clearInterval: (timer: any) => {
        if (timers.has(timer)) {
          clearInterval(timer)
          timers.delete(timer)
        }
      },
      
      setImmediate: (callback: Function, ...args: any[]) => {
        checkLimit()
        const timer = setImmediate(() => {
          timers.delete(timer)
          callback(...args)
        }, ...args)
        timers.set(timer, timer)
        return timer
      },
      
      clearImmediate: (timer: any) => {
        if (timers.has(timer)) {
          clearImmediate(timer)
          timers.delete(timer)
        }
      }
    }
  }

  // Resource monitoring
  getResourceUsage(pluginId: string): any {
    const context = this.contexts.get(pluginId)
    if (!context) {
      return null
    }
    
    // This would require more advanced monitoring
    // For now, return basic info
    return {
      contextsCount: this.contexts.size,
      // Additional metrics would go here
    }
  }
}