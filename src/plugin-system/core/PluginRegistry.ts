import * as path from 'path'
import * as fs from 'fs/promises'
import { PluginManifest } from '../interfaces/Plugin'

export interface PluginRegistryEntry {
  id: string
  name: string
  version: string
  path: string
  enabled: boolean
  installedAt: Date
  updatedAt: Date
}

export class PluginRegistry {
  private registryPath: string
  private registry: Map<string, PluginRegistryEntry> = new Map()

  constructor(private pluginsDir: string) {
    this.registryPath = path.join(pluginsDir, 'registry.json')
    this.loadRegistry().catch(console.error)
  }

  async loadRegistry(): Promise<void> {
    try {
      const content = await fs.readFile(this.registryPath, 'utf-8')
      const data = JSON.parse(content)
      
      for (const entry of data) {
        entry.installedAt = new Date(entry.installedAt)
        entry.updatedAt = new Date(entry.updatedAt)
        this.registry.set(entry.id, entry)
      }
    } catch (error) {
      // Registry doesn't exist yet, that's ok
      await this.saveRegistry()
    }
  }

  async saveRegistry(): Promise<void> {
    const data = Array.from(this.registry.values())
    await fs.mkdir(path.dirname(this.registryPath), { recursive: true })
    await fs.writeFile(
      this.registryPath, 
      JSON.stringify(data, null, 2)
    )
  }

  async discoverPlugins(): Promise<string[]> {
    try {
      await fs.mkdir(this.pluginsDir, { recursive: true })
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true })
      const pluginDirs: string[] = []
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          const pluginPath = path.join(this.pluginsDir, entry.name)
          const manifestPath = path.join(pluginPath, 'plugin.json')
          
          try {
            await fs.access(manifestPath)
            pluginDirs.push(pluginPath)
          } catch {
            // No manifest, skip
          }
        }
      }
      
      return pluginDirs
    } catch (error) {
      console.error('Failed to discover plugins:', error)
      return []
    }
  }

  async registerPlugin(
    manifest: PluginManifest, 
    pluginPath: string
  ): Promise<void> {
    const entry: PluginRegistryEntry = {
      id: manifest.metadata.id,
      name: manifest.metadata.name,
      version: manifest.metadata.version,
      path: pluginPath,
      enabled: false,
      installedAt: new Date(),
      updatedAt: new Date()
    }
    
    this.registry.set(entry.id, entry)
    await this.saveRegistry()
  }

  async unregisterPlugin(pluginId: string): Promise<void> {
    this.registry.delete(pluginId)
    await this.saveRegistry()
  }

  async updatePlugin(
    pluginId: string, 
    updates: Partial<PluginRegistryEntry>
  ): Promise<void> {
    const entry = this.registry.get(pluginId)
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found in registry`)
    }
    
    Object.assign(entry, updates, { updatedAt: new Date() })
    await this.saveRegistry()
  }

  getPlugin(pluginId: string): PluginRegistryEntry | undefined {
    return this.registry.get(pluginId)
  }

  getAllPlugins(): PluginRegistryEntry[] {
    return Array.from(this.registry.values())
  }

  getEnabledPlugins(): PluginRegistryEntry[] {
    return Array.from(this.registry.values())
      .filter(entry => entry.enabled)
  }

  async setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
    await this.updatePlugin(pluginId, { enabled })
  }

  async removePlugin(pluginId: string): Promise<void> {
    const entry = this.registry.get(pluginId)
    if (!entry) {
      return
    }
    
    // Remove plugin directory
    try {
      await fs.rm(entry.path, { recursive: true, force: true })
    } catch (error) {
      console.error(`Failed to remove plugin directory: ${error}`)
    }
    
    // Remove from registry
    await this.unregisterPlugin(pluginId)
  }

  async installPlugin(
    pluginArchive: string, 
    targetId?: string
  ): Promise<string> {
    // This would handle installing from a zip/tar archive
    // For now, we'll assume plugins are manually placed in the plugins directory
    throw new Error('Plugin installation from archive not yet implemented')
  }

  async checkForUpdates(pluginId: string): Promise<{
    hasUpdate: boolean
    latestVersion?: string
  }> {
    // This would check a plugin repository or registry for updates
    // For now, return no updates
    return { hasUpdate: false }
  }

  async getPluginManifest(pluginId: string): Promise<PluginManifest | null> {
    const entry = this.registry.get(pluginId)
    if (!entry) {
      return null
    }
    
    try {
      const manifestPath = path.join(entry.path, 'plugin.json')
      const content = await fs.readFile(manifestPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }
}