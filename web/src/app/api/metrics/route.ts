import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const METRICS_FILE = path.join(process.cwd(), '../../.bridge-metrics.json')

interface Metrics {
  totalTasks: number
  successRate: number
  avgExecutionTime: number
  tasksByType: Record<string, number>
  performanceByDay: Array<{
    date: string
    claude: number
    gemini: number
    hybrid: number
  }>
  executionTimes: Array<{
    task: string
    claude: number
    gemini: number
  }>
  insights: string[]
}

export async function GET() {
  try {
    // Try to read real metrics
    const metricsData = await fs.readFile(METRICS_FILE, 'utf-8')
    const metrics = JSON.parse(metricsData)
    
    return NextResponse.json({
      success: true,
      metrics,
    })
  } catch (error) {
    // Return mock metrics for demo
    const mockMetrics: Metrics = {
      totalTasks: 1234,
      successRate: 94.5,
      avgExecutionTime: 3.2,
      tasksByType: {
        code: 45,
        search: 20,
        multimodal: 15,
        analysis: 15,
        validation: 5,
      },
      performanceByDay: generatePerformanceData(),
      executionTimes: [
        { task: 'Code Generation', claude: 2.5, gemini: 3.2 },
        { task: 'Web Search', claude: 4.1, gemini: 2.8 },
        { task: 'Image Analysis', claude: 5.2, gemini: 3.5 },
        { task: 'Code Review', claude: 3.8, gemini: 4.5 },
      ],
      insights: [
        'Claude shows 15% better performance for complex code generation tasks',
        'Gemini completes image and PDF processing tasks 40% faster',
        'Hybrid mode increases success rate by 8% for complex analysis tasks',
      ],
    }

    return NextResponse.json({
      success: true,
      metrics: mockMetrics,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, result, executionTime, type } = body

    // Read existing metrics
    let metrics: any = {
      tasks: [],
      summary: {
        totalTasks: 0,
        successCount: 0,
        totalTime: 0,
        tasksByType: {},
      },
    }

    try {
      const data = await fs.readFile(METRICS_FILE, 'utf-8')
      metrics = JSON.parse(data)
    } catch {
      // File doesn't exist yet
    }

    // Add new task
    metrics.tasks.push({
      taskId,
      type,
      success: result.success,
      executionTime,
      executedBy: result.executedBy,
      timestamp: new Date().toISOString(),
    })

    // Update summary
    metrics.summary.totalTasks++
    if (result.success) metrics.summary.successCount++
    metrics.summary.totalTime += executionTime
    metrics.summary.tasksByType[type] = (metrics.summary.tasksByType[type] || 0) + 1

    // Keep only last 1000 tasks
    if (metrics.tasks.length > 1000) {
      metrics.tasks = metrics.tasks.slice(-1000)
    }

    // Save metrics
    await fs.writeFile(METRICS_FILE, JSON.stringify(metrics, null, 2))

    return NextResponse.json({
      success: true,
      message: 'Metrics updated',
    })
  } catch (error) {
    console.error('Metrics update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update metrics' },
      { status: 500 }
    )
  }
}

function generatePerformanceData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map(day => ({
    date: day,
    claude: 80 + Math.random() * 15,
    gemini: 75 + Math.random() * 20,
    hybrid: 88 + Math.random() * 10,
  }))
}