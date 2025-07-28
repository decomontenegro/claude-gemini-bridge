const fs = require('fs').promises
const path = require('path')

class TaskTemplatesPlugin {
  constructor() {
    this.templates = new Map()
    this.builtInTemplates = {
      'react-component': {
        name: 'React Component',
        description: 'Create a new React component',
        taskType: 'CODE_GENERATION',
        prompt: `Create a React {{componentType}} component named {{componentName}} with the following features:
{{features}}

Include:
- TypeScript types
- Proper props interface
- {{styling}} styling
- Basic tests
- Storybook story if applicable`,
        variables: {
          componentName: { type: 'string', required: true },
          componentType: { type: 'select', options: ['functional', 'class'], default: 'functional' },
          features: { type: 'text', required: true },
          styling: { type: 'select', options: ['CSS Modules', 'Styled Components', 'Tailwind'], default: 'CSS Modules' }
        }
      },
      'api-endpoint': {
        name: 'API Endpoint',
        description: 'Create a REST API endpoint',
        taskType: 'CODE_GENERATION',
        prompt: `Create a {{method}} API endpoint at {{path}} that {{description}}.

Requirements:
- Input validation for: {{validation}}
- Authentication: {{auth}}
- Error handling
- OpenAPI documentation
- Unit tests`,
        variables: {
          method: { type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], required: true },
          path: { type: 'string', required: true },
          description: { type: 'string', required: true },
          validation: { type: 'text', default: 'all inputs' },
          auth: { type: 'select', options: ['JWT', 'API Key', 'OAuth', 'None'], default: 'JWT' }
        }
      },
      'refactor-function': {
        name: 'Refactor Function',
        description: 'Refactor a function for better quality',
        taskType: 'REFACTORING',
        prompt: `Refactor the following function to improve {{improvements}}:

\`\`\`{{language}}
{{code}}
\`\`\`

Focus on:
{{focus}}

Maintain: {{maintain}}`,
        variables: {
          code: { type: 'code', required: true },
          language: { type: 'string', default: 'javascript' },
          improvements: { type: 'multiselect', options: ['readability', 'performance', 'maintainability', 'testability'], default: ['readability', 'maintainability'] },
          focus: { type: 'text', default: 'clean code principles' },
          maintain: { type: 'text', default: 'backward compatibility' }
        }
      },
      'debug-issue': {
        name: 'Debug Issue',
        description: 'Debug a specific issue in code',
        taskType: 'DEBUGGING',
        prompt: `Debug the following issue: {{issue}}

Error message:
\`\`\`
{{error}}
\`\`\`

Code context:
\`\`\`{{language}}
{{code}}
\`\`\`

Environment: {{environment}}
Additional context: {{context}}`,
        variables: {
          issue: { type: 'string', required: true },
          error: { type: 'text', required: true },
          code: { type: 'code', required: true },
          language: { type: 'string', default: 'javascript' },
          environment: { type: 'string', default: 'development' },
          context: { type: 'text' }
        }
      }
    }
  }

  async onInstall(context) {
    // Create templates directory
    const templatesPath = context.config.get('templatesPath') || './templates'
    await fs.mkdir(templatesPath, { recursive: true })
    
    // Save built-in templates
    for (const [id, template] of Object.entries(this.builtInTemplates)) {
      const templatePath = path.join(templatesPath, `${id}.json`)
      await fs.writeFile(templatePath, JSON.stringify(template, null, 2))
    }
    
    context.logger.info('Task Templates Plugin installed with built-in templates')
  }

  async onEnable(context) {
    // Load all templates
    const templatesPath = context.config.get('templatesPath') || './templates'
    
    try {
      const files = await fs.readdir(templatesPath)
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const templatePath = path.join(templatesPath, file)
          const content = await fs.readFile(templatePath, 'utf-8')
          const template = JSON.parse(content)
          const id = path.basename(file, '.json')
          
          this.templates.set(id, { id, ...template })
        }
      }
      
      context.logger.info(`Loaded ${this.templates.size} templates`)
    } catch (error) {
      context.logger.error('Failed to load templates', { error: error.message })
    }

    // Register UI components
    if (context.api.registerComponent) {
      context.api.registerComponent('TemplateSelector', {
        render: () => this.renderTemplateSelector()
      })
      
      context.api.registerMenuItem({
        id: 'templates',
        label: 'Task Templates',
        icon: 'template',
        path: '/plugins/templates',
        position: 'tools'
      })
    }
  }

  async beforeTaskCreate(task, context) {
    // Check if this is a template task
    if (!task.metadata?.templateId) {
      return task
    }

    const template = this.templates.get(task.metadata.templateId)
    if (!template) {
      context.logger.warn('Template not found', { templateId: task.metadata.templateId })
      return task
    }

    try {
      // Process template variables
      const variables = task.metadata.templateVariables || {}
      const processed = this.processTemplate(template, variables, context)
      
      // Update task with processed template
      task.prompt = processed.prompt
      task.type = template.taskType
      task.metadata = {
        ...task.metadata,
        processedFromTemplate: true,
        templateName: template.name
      }
      
      context.logger.info('Task created from template', { 
        templateId: task.metadata.templateId,
        templateName: template.name 
      })
      
      return task
    } catch (error) {
      context.logger.error('Failed to process template', { 
        error: error.message,
        templateId: task.metadata.templateId 
      })
      return task
    }
  }

  processTemplate(template, variables, context) {
    let prompt = template.prompt
    const defaultVars = context.config.get('defaultVariables') || {}
    
    // Merge variables with defaults
    const allVariables = {
      ...this.getSystemVariables(),
      ...defaultVars,
      ...variables
    }
    
    // Validate required variables
    for (const [varName, varDef] of Object.entries(template.variables || {})) {
      if (varDef.required && !allVariables[varName]) {
        throw new Error(`Required variable missing: ${varName}`)
      }
      
      // Use default if not provided
      if (!allVariables[varName] && varDef.default !== undefined) {
        allVariables[varName] = varDef.default
      }
    }
    
    // Replace variables in prompt
    for (const [key, value] of Object.entries(allVariables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      prompt = prompt.replace(regex, value)
    }
    
    // Handle array variables (for multiselect)
    for (const [key, value] of Object.entries(allVariables)) {
      if (Array.isArray(value)) {
        const regex = new RegExp(`{{${key}}}`, 'g')
        prompt = prompt.replace(regex, value.join(', '))
      }
    }
    
    return { prompt }
  }

  getSystemVariables() {
    const now = new Date()
    return {
      currentDate: now.toISOString().split('T')[0],
      currentTime: now.toTimeString().split(' ')[0],
      timestamp: now.getTime(),
      year: now.getFullYear(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      day: String(now.getDate()).padStart(2, '0')
    }
  }

  // API for managing templates
  async createTemplate(template, context) {
    const templatesPath = context.config.get('templatesPath') || './templates'
    const id = this.generateTemplateId(template.name)
    
    const fullTemplate = {
      id,
      ...template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const templatePath = path.join(templatesPath, `${id}.json`)
    await fs.writeFile(templatePath, JSON.stringify(fullTemplate, null, 2))
    
    this.templates.set(id, fullTemplate)
    
    context.logger.info('Template created', { id, name: template.name })
    return fullTemplate
  }

  async updateTemplate(id, updates, context) {
    const template = this.templates.get(id)
    if (!template) {
      throw new Error(`Template not found: ${id}`)
    }
    
    const updatedTemplate = {
      ...template,
      ...updates,
      id, // Prevent ID change
      updatedAt: new Date().toISOString()
    }
    
    const templatesPath = context.config.get('templatesPath') || './templates'
    const templatePath = path.join(templatesPath, `${id}.json`)
    await fs.writeFile(templatePath, JSON.stringify(updatedTemplate, null, 2))
    
    this.templates.set(id, updatedTemplate)
    
    context.logger.info('Template updated', { id })
    return updatedTemplate
  }

  async deleteTemplate(id, context) {
    if (!this.templates.has(id)) {
      throw new Error(`Template not found: ${id}`)
    }
    
    const templatesPath = context.config.get('templatesPath') || './templates'
    const templatePath = path.join(templatesPath, `${id}.json`)
    
    await fs.unlink(templatePath)
    this.templates.delete(id)
    
    context.logger.info('Template deleted', { id })
  }

  generateTemplateId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // UI Component rendering (pseudo-code for web integration)
  renderTemplateSelector() {
    return {
      type: 'TemplateSelector',
      props: {
        templates: Array.from(this.templates.values()),
        onSelect: (templateId) => {
          // This would be handled by the web UI
          console.log('Template selected:', templateId)
        }
      }
    }
  }
}

module.exports = TaskTemplatesPlugin