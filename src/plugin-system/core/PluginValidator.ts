import { PluginManifest, PluginPermissions } from '../interfaces/Plugin'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export class PluginValidator {
  validateManifest(manifest: PluginManifest): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check required fields
    if (!manifest.metadata) {
      errors.push('Missing metadata')
    } else {
      this.validateMetadata(manifest.metadata, errors, warnings)
    }

    if (!manifest.capabilities) {
      errors.push('Missing capabilities')
    }

    if (!manifest.main) {
      errors.push('Missing main entry point')
    } else if (!this.isValidEntryPoint(manifest.main)) {
      errors.push('Invalid main entry point format')
    }

    // Validate permissions if present
    if (manifest.permissions) {
      this.validatePermissions(manifest.permissions, errors, warnings)
    }

    // Validate configuration schema if present
    if (manifest.configuration) {
      this.validateConfigurationSchema(manifest.configuration, errors, warnings)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  private validateMetadata(
    metadata: any, 
    errors: string[], 
    warnings: string[]
  ): void {
    const requiredFields = ['id', 'name', 'version', 'author']
    
    for (const field of requiredFields) {
      if (!metadata[field]) {
        errors.push(`Missing metadata.${field}`)
      }
    }

    // Validate ID format
    if (metadata.id && !this.isValidPluginId(metadata.id)) {
      errors.push('Invalid plugin ID format. Must be lowercase alphanumeric with hyphens')
    }

    // Validate version format
    if (metadata.version && !this.isValidVersion(metadata.version)) {
      errors.push('Invalid version format. Must follow semantic versioning')
    }

    // Check for recommended fields
    if (!metadata.description) {
      warnings.push('Missing metadata.description')
    }

    if (!metadata.license) {
      warnings.push('Missing metadata.license')
    }
  }

  private validatePermissions(
    permissions: PluginPermissions, 
    errors: string[], 
    warnings: string[]
  ): void {
    // Validate filesystem permissions
    if (permissions.filesystem) {
      if (permissions.filesystem.read) {
        for (const path of permissions.filesystem.read) {
          if (this.isDangerousPath(path)) {
            errors.push(`Dangerous filesystem read path: ${path}`)
          }
        }
      }

      if (permissions.filesystem.write) {
        for (const path of permissions.filesystem.write) {
          if (this.isDangerousPath(path)) {
            errors.push(`Dangerous filesystem write path: ${path}`)
          }
        }
      }
    }

    // Validate network permissions
    if (permissions.network?.hosts) {
      for (const host of permissions.network.hosts) {
        if (!this.isValidHost(host)) {
          errors.push(`Invalid network host: ${host}`)
        }
      }
    }

    // Warn about dangerous permissions
    if (permissions.system?.exec) {
      warnings.push('Plugin requests system execution permissions')
    }
  }

  private validateConfigurationSchema(
    schema: any, 
    errors: string[], 
    warnings: string[]
  ): void {
    if (!schema.properties || typeof schema.properties !== 'object') {
      errors.push('Invalid configuration schema: missing properties')
      return
    }

    for (const [key, prop] of Object.entries(schema.properties)) {
      if (!prop || typeof prop !== 'object') {
        errors.push(`Invalid configuration property: ${key}`)
        continue
      }

      const validTypes = ['string', 'number', 'boolean', 'array', 'object']
      if (!prop.type || !validTypes.includes(prop.type)) {
        errors.push(`Invalid type for configuration property: ${key}`)
      }

      // Check for description
      if (!prop.description) {
        warnings.push(`Missing description for configuration property: ${key}`)
      }
    }
  }

  private isValidPluginId(id: string): boolean {
    return /^[a-z0-9-]+$/.test(id)
  }

  private isValidVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(version)
  }

  private isValidEntryPoint(main: string): boolean {
    return /\.(js|mjs|ts)$/.test(main) && !main.includes('..')
  }

  private isDangerousPath(path: string): boolean {
    const dangerous = [
      '/',
      '/etc',
      '/usr',
      '/bin',
      '/sbin',
      '/boot',
      '/dev',
      '/proc',
      '/sys',
      'C:\\Windows',
      'C:\\Program Files'
    ]

    return dangerous.some(d => 
      path === d || path.startsWith(d + '/') || path.startsWith(d + '\\')
    )
  }

  private isValidHost(host: string): boolean {
    // Allow wildcards, domains, and IPs
    const patterns = [
      /^\*$/,                              // Wildcard
      /^\*\.[a-z0-9.-]+$/i,               // Wildcard subdomain
      /^[a-z0-9.-]+$/i,                   // Domain
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // IPv4
      /^localhost$/i,                      // Localhost
      /^127\.0\.0\.1$/                    // Loopback
    ]

    return patterns.some(pattern => pattern.test(host))
  }

  validatePluginCode(code: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, message: 'Use of eval() is not allowed' },
      { pattern: /Function\s*\(/, message: 'Use of Function constructor is not allowed' },
      { pattern: /require\s*\(\s*['"`]child_process['"`]\s*\)/, message: 'Direct use of child_process is restricted' },
      { pattern: /\.exec\s*\(/, message: 'Use of exec() requires special permissions' },
      { pattern: /process\.exit/, message: 'Use of process.exit() is not allowed' }
    ]

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(message)
      }
    }

    // Warnings for potentially problematic patterns
    const warningPatterns = [
      { pattern: /setTimeout.*,\s*0\s*\)/, message: 'Use of setTimeout with 0 delay' },
      { pattern: /while\s*\(\s*true\s*\)/, message: 'Infinite loop detected' },
      { pattern: /fs\.\w+Sync/, message: 'Synchronous filesystem operations may block' }
    ]

    for (const { pattern, message } of warningPatterns) {
      if (pattern.test(code)) {
        warnings.push(message)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}