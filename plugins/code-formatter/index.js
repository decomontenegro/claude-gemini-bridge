const prettier = require('prettier')

class CodeFormatterPlugin {
  constructor() {
    this.formatters = {
      javascript: { parser: 'babel' },
      typescript: { parser: 'typescript' },
      json: { parser: 'json' },
      css: { parser: 'css' },
      html: { parser: 'html' },
      markdown: { parser: 'markdown' },
      python: { parser: 'python', plugin: 'prettier-plugin-python' }
    }
  }

  async onEnable(context) {
    context.logger.info('Code Formatter Plugin enabled')
    
    // Load user configuration
    const config = context.config.getAll()
    this.autoFormat = config.autoFormat ?? true
    this.formatOnSave = config.formatOnSave ?? false
    this.prettierConfig = config.prettierConfig || {}
  }

  async afterTaskExecute(task, result, context) {
    if (!this.autoFormat) {
      return
    }

    // Check if task type is supported
    const supportedTypes = ['CODE_GENERATION', 'REFACTORING']
    if (!supportedTypes.includes(task.type)) {
      return
    }

    try {
      // Detect language from task or result
      const language = this.detectLanguage(task, result)
      if (!language || !this.formatters[language]) {
        context.logger.debug('Language not supported for formatting', { language })
        return
      }

      // Format the code
      const formatted = await this.formatCode(result.output, language)
      if (formatted !== result.output) {
        result.output = formatted
        result.metadata = {
          ...result.metadata,
          formatted: true,
          formatter: 'prettier',
          language
        }
        
        context.logger.info('Code formatted successfully', { 
          taskId: task.id.value,
          language 
        })
      }
    } catch (error) {
      context.logger.error('Failed to format code', { 
        error: error.message,
        taskId: task.id.value 
      })
    }
  }

  async beforeResultSave(result, context) {
    if (!this.formatOnSave || result.metadata?.formatted) {
      return result
    }

    // Try to format before saving
    try {
      const language = result.metadata?.language || this.detectLanguageFromContent(result.output)
      if (language && this.formatters[language]) {
        const formatted = await this.formatCode(result.output, language)
        if (formatted !== result.output) {
          result.output = formatted
          result.metadata = {
            ...result.metadata,
            formatted: true,
            formatter: 'prettier',
            language
          }
        }
      }
    } catch (error) {
      context.logger.warn('Failed to format on save', { error: error.message })
    }

    return result
  }

  detectLanguage(task, result) {
    // Check task metadata first
    if (task.metadata?.language) {
      return task.metadata.language
    }

    // Check result metadata
    if (result.metadata?.language) {
      return result.metadata.language
    }

    // Check task prompt for language hints
    const prompt = task.prompt.toLowerCase()
    const languagePatterns = {
      javascript: /\b(javascript|js|node|react)\b/,
      typescript: /\b(typescript|ts|angular)\b/,
      python: /\b(python|py|django|flask)\b/,
      json: /\b(json|config|package\.json)\b/,
      css: /\b(css|styles?|sass|scss)\b/,
      html: /\b(html|markup|template)\b/
    }

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(prompt)) {
        return lang
      }
    }

    // Try to detect from content
    return this.detectLanguageFromContent(result.output)
  }

  detectLanguageFromContent(content) {
    // Simple heuristics for language detection
    const trimmed = content.trim()

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed)
        return 'json'
      } catch {}
    }

    if (trimmed.includes('import ') || trimmed.includes('export ')) {
      return trimmed.includes(': ') ? 'typescript' : 'javascript'
    }

    if (trimmed.includes('def ') || trimmed.includes('import ')) {
      return 'python'
    }

    if (trimmed.includes('<!DOCTYPE') || trimmed.includes('<html')) {
      return 'html'
    }

    if (trimmed.includes('{') && trimmed.includes('}') && trimmed.includes(':')) {
      return 'css'
    }

    return null
  }

  async formatCode(code, language) {
    const formatter = this.formatters[language]
    if (!formatter) {
      throw new Error(`No formatter for language: ${language}`)
    }

    const options = {
      ...this.prettierConfig,
      parser: formatter.parser
    }

    // Add plugins if needed
    if (formatter.plugin) {
      try {
        options.plugins = [require(formatter.plugin)]
      } catch (error) {
        throw new Error(`Failed to load plugin ${formatter.plugin}: ${error.message}`)
      }
    }

    return prettier.format(code, options)
  }

  // Custom handler for format requests
  async handleTask(task, context) {
    if (!task.prompt.toLowerCase().includes('format')) {
      return null // Not a format task
    }

    try {
      // Extract code from task prompt
      const codeMatch = task.prompt.match(/```(\w+)?\n([\s\S]+?)```/)
      if (!codeMatch) {
        throw new Error('No code block found in prompt')
      }

      const language = codeMatch[1] || this.detectLanguageFromContent(codeMatch[2])
      const code = codeMatch[2]

      const formatted = await this.formatCode(code, language || 'javascript')

      return {
        output: formatted,
        model: 'code-formatter-plugin',
        metadata: {
          language,
          formatter: 'prettier',
          originalLength: code.length,
          formattedLength: formatted.length
        }
      }
    } catch (error) {
      context.logger.error('Format task failed', { error: error.message })
      return null
    }
  }
}

module.exports = CodeFormatterPlugin