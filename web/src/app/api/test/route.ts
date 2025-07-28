import { NextResponse } from 'next/server'
import { spawn } from 'child_process'

export async function GET() {
  try {
    // Test Claude CLI
    const claudeVersion = await getCommandOutput('claude', ['--version'])
    
    // Test Gemini CLI  
    const geminiPath = '/Users/decostudio/.npm-global/bin/gemini'
    const geminiVersion = await getCommandOutput(geminiPath, ['--version'])
    
    return NextResponse.json({
      success: true,
      claude: {
        installed: !!claudeVersion,
        version: claudeVersion
      },
      gemini: {
        installed: !!geminiVersion,
        version: geminiVersion,
        path: geminiPath
      },
      cwd: process.cwd()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function getCommandOutput(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args)
    let output = ''
    let error = ''
    
    child.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    child.stderr.on('data', (data) => {
      error += data.toString()
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim())
      } else {
        reject(new Error(error || `Command failed with code ${code}`))
      }
    })
    
    child.on('error', (err) => {
      reject(err)
    })
  })
}