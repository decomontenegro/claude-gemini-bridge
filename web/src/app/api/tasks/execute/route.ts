import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { spawn } from 'child_process'
import path from 'path'

const TaskSchema = z.object({
  type: z.enum(['code', 'search', 'multimodal', 'analysis', 'validation']),
  description: z.string().min(1),
  orchestrator: z.enum(['auto', 'claude', 'gemini']),
  mode: z.enum(['single', 'hybrid']),
  context: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = TaskSchema.parse(body)

    // Log for debugging
    console.log('Current working directory:', process.cwd())
    
    // Get the bridge CLI path - use absolute path
    const bridgePath = '/Users/decostudio/claude-gemini-bridge/dist/index.js'
    console.log('Bridge path:', bridgePath)
    
    // Prepare command arguments
    const args = [
      validatedData.mode === 'hybrid' ? 'hybrid' : 'execute',
      '-t', validatedData.type,
    ]
    
    if (validatedData.mode === 'single' && validatedData.orchestrator !== 'auto') {
      args.push('-o', validatedData.orchestrator)
    }

    // Execute the bridge CLI
    console.log('Executing with args:', [bridgePath, ...args])
    
    const result = await executeCommand('node', [bridgePath, ...args], {
      input: JSON.stringify({
        description: validatedData.description,
        context: validatedData.context,
      }),
    })

    return NextResponse.json({
      success: true,
      taskId: generateTaskId(),
      result: result,
      executedBy: result.executedBy || validatedData.orchestrator,
      mode: validatedData.mode,
    })
  } catch (error) {
    console.error('Task execution error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Task execution failed' },
      { status: 500 }
    )
  }
}

function executeCommand(
  command: string,
  args: string[],
  options: { input?: string } = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout)
          resolve(result)
        } catch {
          resolve({ output: stdout })
        }
      } else {
        reject(new Error(stderr || `Process exited with code ${code}`))
      }
    })

    if (options.input) {
      child.stdin.write(options.input)
      child.stdin.end()
    }
  })
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}