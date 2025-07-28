import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Conectar diretamente ao servidor backend
    const response = await fetch(`${BACKEND_URL}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: {
          type: body.type || 'code',
          payload: {
            description: body.description
          }
        },
        options: {
          preferredCLI: body.orchestrator === 'auto' ? undefined : body.orchestrator,
          orchestrate: body.mode === 'hybrid',
          priority: 'medium'
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `Backend error: ${error}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Execute API Error:', error)
    return NextResponse.json(
      { error: 'Failed to execute task. Is the backend server running on port 3001?' },
      { status: 500 }
    )
  }
}