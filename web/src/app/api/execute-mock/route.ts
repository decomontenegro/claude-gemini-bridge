import { NextRequest, NextResponse } from 'next/server'

// Mock execution for Vercel deployment without backend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Simulate task execution delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
    
    // Generate mock response based on request
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const executedBy = body.orchestrator === 'claude' ? 'claude' : 
                      body.orchestrator === 'gemini' ? 'gemini' : 
                      Math.random() > 0.5 ? 'claude' : 'gemini'
    
    const mockResponse = {
      taskId,
      status: 'completed',
      executedBy,
      mode: body.mode || 'single',
      data: {
        output: generateMockOutput(body.description, executedBy),
        logs: [
          `Task ${taskId} initialized`,
          `Processing with ${executedBy} in ${body.mode} mode`,
          'Analysis complete',
          'Results generated'
        ],
        metrics: {
          executionTime: 2500 + Math.random() * 2000,
          tokensUsed: Math.floor(1000 + Math.random() * 5000),
          model: executedBy === 'claude' ? 'claude-3-opus' : 'gemini-pro'
        }
      },
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    }
    
    return NextResponse.json(mockResponse)
    
  } catch (error: any) {
    console.error('Mock Execute API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to execute task' },
      { status: 500 }
    )
  }
}

function generateMockOutput(description: string, executedBy: string): string {
  const templates = {
    claude: [
      "I've analyzed your request: '{desc}'. Here's a comprehensive solution with clean architecture principles...",
      "Based on the task '{desc}', I recommend implementing a modular approach with proper separation of concerns...",
      "For '{desc}', I suggest using Domain-Driven Design patterns to ensure maintainability..."
    ],
    gemini: [
      "Task analysis for '{desc}': I've identified several optimization opportunities using advanced algorithms...",
      "Processing '{desc}' - I recommend a data-driven approach with performance optimizations...",
      "For the request '{desc}', here's an efficient solution using modern best practices..."
    ]
  }
  
  const executorTemplates = templates[executedBy as keyof typeof templates] || templates.claude
  const template = executorTemplates[Math.floor(Math.random() * executorTemplates.length)]
  
  return template.replace('{desc}', description)
}