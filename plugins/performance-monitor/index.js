const fs = require('fs').promises
const path = require('path')
const { EventEmitter } = require('events')

class PerformanceMonitorPlugin extends EventEmitter {
  constructor() {
    super()
    this.metrics = {
      tasks: new Map(),
      adapters: new Map(),
      system: {
        startTime: Date.now(),
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0
      }
    }
    this.alerts = []
    this.monitoringInterval = null
  }

  async onEnable(context) {
    this.context = context
    this.config = context.config.getAll()
    
    // Initialize data directory
    this.dataDir = path.join(context.config.get('dataPath') || './data')
    await fs.mkdir(this.dataDir, { recursive: true })
    
    // Load historical metrics
    await this.loadHistoricalMetrics()
    
    // Start real-time monitoring if enabled
    if (this.config.enableRealTimeMonitoring) {
      this.startMonitoring()
    }
    
    // Schedule reports
    this.scheduleReports()
    
    // Register dashboard component
    if (context.api.registerComponent) {
      context.api.registerComponent('PerformanceDashboard', {
        render: () => this.renderDashboard()
      })
      
      context.api.registerMenuItem({
        id: 'performance',
        label: 'Performance Monitor',
        icon: 'chart',
        path: '/plugins/performance',
        position: 'tools',
        order: 10
      })
    }
    
    context.logger.info('Performance Monitor enabled')
  }

  async onDisable(context) {
    // Stop monitoring
    this.stopMonitoring()
    
    // Save current metrics
    await this.saveMetrics()
    
    context.logger.info('Performance Monitor disabled')
  }

  async beforeTaskExecute(task, context) {
    const taskId = task.id.value
    
    this.metrics.tasks.set(taskId, {
      id: taskId,
      type: task.type,
      adapter: task.assignedAdapter,
      startTime: Date.now(),
      status: 'running'
    })
    
    this.metrics.system.totalTasks++
    
    return task
  }

  async afterTaskExecute(task, result, context) {
    const taskId = task.id.value
    const taskMetrics = this.metrics.tasks.get(taskId)
    
    if (taskMetrics) {
      const endTime = Date.now()
      const duration = endTime - taskMetrics.startTime
      
      taskMetrics.endTime = endTime
      taskMetrics.duration = duration
      taskMetrics.status = 'completed'
      taskMetrics.success = true
      taskMetrics.resultSize = JSON.stringify(result).length
      
      // Update adapter metrics
      this.updateAdapterMetrics(task.assignedAdapter, {
        totalTasks: 1,
        successfulTasks: 1,
        totalDuration: duration,
        lastTaskTime: endTime
      })
      
      this.metrics.system.successfulTasks++
      
      // Check for alerts
      this.checkAlerts(taskMetrics)
      
      // Emit metrics event
      context.api.emit('metrics:task:completed', taskMetrics)
    }
  }

  updateAdapterMetrics(adapter, updates) {
    const current = this.metrics.adapters.get(adapter) || {
      adapter,
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      totalDuration: 0,
      averageDuration: 0,
      errorRate: 0,
      lastTaskTime: null
    }
    
    current.totalTasks += updates.totalTasks || 0
    current.successfulTasks += updates.successfulTasks || 0
    current.failedTasks += updates.failedTasks || 0
    current.totalDuration += updates.totalDuration || 0
    
    if (current.totalTasks > 0) {
      current.averageDuration = current.totalDuration / current.totalTasks
      current.errorRate = current.failedTasks / current.totalTasks
    }
    
    if (updates.lastTaskTime) {
      current.lastTaskTime = updates.lastTaskTime
    }
    
    this.metrics.adapters.set(adapter, current)
  }

  checkAlerts(taskMetrics) {
    const thresholds = this.config.alertThresholds || {}
    const alerts = []
    
    // Response time alert
    if (thresholds.responseTime && taskMetrics.duration > thresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: 'warning',
        message: `Task ${taskMetrics.id} took ${taskMetrics.duration}ms (threshold: ${thresholds.responseTime}ms)`,
        timestamp: Date.now(),
        taskId: taskMetrics.id
      })
    }
    
    // Error rate alert (check adapter metrics)
    if (thresholds.errorRate) {
      for (const [adapter, metrics] of this.metrics.adapters) {
        if (metrics.errorRate > thresholds.errorRate) {
          alerts.push({
            type: 'error_rate',
            severity: 'critical',
            message: `Adapter ${adapter} error rate is ${(metrics.errorRate * 100).toFixed(2)}% (threshold: ${(thresholds.errorRate * 100)}%)`,
            timestamp: Date.now(),
            adapter
          })
        }
      }
    }
    
    // Process alerts
    for (const alert of alerts) {
      this.alerts.push(alert)
      this.context.logger.warn('Performance alert', alert)
      this.context.api.emit('metrics:alert', alert)
    }
  }

  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics()
    }, 10000) // Every 10 seconds
    
    this.context.logger.info('Real-time monitoring started')
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  async collectSystemMetrics() {
    const systemMetrics = {
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      activeTasksCount: Array.from(this.metrics.tasks.values())
        .filter(t => t.status === 'running').length
    }
    
    // Check memory alert
    const thresholds = this.config.alertThresholds || {}
    if (thresholds.memoryUsage) {
      const heapUsed = systemMetrics.memory.heapUsed
      const heapTotal = systemMetrics.memory.heapTotal
      const usage = heapUsed / heapTotal
      
      if (usage > thresholds.memoryUsage) {
        this.alerts.push({
          type: 'memory_usage',
          severity: 'warning',
          message: `Memory usage is ${(usage * 100).toFixed(2)}% (threshold: ${(thresholds.memoryUsage * 100)}%)`,
          timestamp: Date.now()
        })
      }
    }
    
    // Store system metrics
    await this.appendMetrics('system', systemMetrics)
  }

  async saveMetrics() {
    const metricsData = {
      timestamp: Date.now(),
      tasks: Array.from(this.metrics.tasks.values()),
      adapters: Array.from(this.metrics.adapters.values()),
      system: this.metrics.system,
      alerts: this.alerts
    }
    
    const fileName = `metrics-${new Date().toISOString().split('T')[0]}.json`
    const filePath = path.join(this.dataDir, fileName)
    
    await fs.writeFile(filePath, JSON.stringify(metricsData, null, 2))
    
    // Clean up old metrics
    await this.cleanupOldMetrics()
  }

  async loadHistoricalMetrics() {
    try {
      const files = await fs.readdir(this.dataDir)
      const metricsFiles = files.filter(f => f.startsWith('metrics-') && f.endsWith('.json'))
      
      // Load last 7 days of metrics
      const recentFiles = metricsFiles.slice(-7)
      
      for (const file of recentFiles) {
        const filePath = path.join(this.dataDir, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const data = JSON.parse(content)
        
        // Merge with current metrics
        // (Implementation depends on requirements)
      }
    } catch (error) {
      this.context.logger.error('Failed to load historical metrics', { error: error.message })
    }
  }

  async cleanupOldMetrics() {
    const retentionDays = this.config.metricsRetentionDays || 30
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000)
    
    try {
      const files = await fs.readdir(this.dataDir)
      
      for (const file of files) {
        if (file.startsWith('metrics-')) {
          const filePath = path.join(this.dataDir, file)
          const stats = await fs.stat(filePath)
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath)
            this.context.logger.info('Deleted old metrics file', { file })
          }
        }
      }
    } catch (error) {
      this.context.logger.error('Failed to cleanup old metrics', { error: error.message })
    }
  }

  async appendMetrics(type, data) {
    const fileName = `${type}-${new Date().toISOString().split('T')[0]}.jsonl`
    const filePath = path.join(this.dataDir, fileName)
    
    await fs.appendFile(filePath, JSON.stringify(data) + '\n')
  }

  scheduleReports() {
    const schedule = this.config.reportSchedule || 'weekly'
    
    if (schedule === 'none') {
      return
    }
    
    const intervals = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000
    }
    
    this.reportInterval = setInterval(() => {
      this.generateReport()
    }, intervals[schedule])
  }

  async generateReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      period: this.config.reportSchedule,
      summary: {
        totalTasks: this.metrics.system.totalTasks,
        successfulTasks: this.metrics.system.successfulTasks,
        failedTasks: this.metrics.system.failedTasks,
        successRate: this.metrics.system.totalTasks > 0 
          ? (this.metrics.system.successfulTasks / this.metrics.system.totalTasks * 100).toFixed(2) + '%'
          : 'N/A',
        uptime: process.uptime()
      },
      adapterPerformance: Array.from(this.metrics.adapters.values()),
      topAlerts: this.alerts.slice(-10),
      recommendations: this.generateRecommendations()
    }
    
    // Save report
    const reportPath = path.join(
      this.dataDir, 
      '..',
      'reports',
      `report-${new Date().toISOString().split('T')[0]}.json`
    )
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true })
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    
    this.context.logger.info('Performance report generated', { path: reportPath })
    this.context.api.emit('metrics:report:generated', report)
    
    return report
  }

  generateRecommendations() {
    const recommendations = []
    
    // Analyze adapter performance
    for (const [adapter, metrics] of this.metrics.adapters) {
      if (metrics.errorRate > 0.1) {
        recommendations.push({
          type: 'high_error_rate',
          adapter,
          message: `Consider investigating ${adapter} - error rate is ${(metrics.errorRate * 100).toFixed(2)}%`
        })
      }
      
      if (metrics.averageDuration > 10000) {
        recommendations.push({
          type: 'slow_response',
          adapter,
          message: `${adapter} average response time is ${(metrics.averageDuration / 1000).toFixed(2)}s - consider optimization`
        })
      }
    }
    
    // Task distribution recommendations
    const taskCounts = new Map()
    for (const task of this.metrics.tasks.values()) {
      const count = taskCounts.get(task.type) || 0
      taskCounts.set(task.type, count + 1)
    }
    
    // More recommendations based on patterns...
    
    return recommendations
  }

  // Dashboard rendering (pseudo-code for web integration)
  renderDashboard() {
    return {
      type: 'PerformanceDashboard',
      props: {
        summary: this.metrics.system,
        adapters: Array.from(this.metrics.adapters.values()),
        recentTasks: Array.from(this.metrics.tasks.values()).slice(-50),
        alerts: this.alerts.slice(-20),
        charts: {
          taskTimeline: this.generateTaskTimelineData(),
          adapterComparison: this.generateAdapterComparisonData(),
          errorRates: this.generateErrorRateData()
        }
      }
    }
  }

  generateTaskTimelineData() {
    // Generate chart data for task timeline
    return Array.from(this.metrics.tasks.values())
      .map(task => ({
        x: new Date(task.startTime),
        y: task.duration,
        adapter: task.adapter,
        type: task.type
      }))
  }

  generateAdapterComparisonData() {
    // Generate chart data for adapter comparison
    return Array.from(this.metrics.adapters.values())
      .map(adapter => ({
        name: adapter.adapter,
        tasks: adapter.totalTasks,
        avgDuration: adapter.averageDuration,
        errorRate: adapter.errorRate
      }))
  }

  generateErrorRateData() {
    // Generate chart data for error rates over time
    // This would require time-series data storage
    return []
  }
}

module.exports = PerformanceMonitorPlugin