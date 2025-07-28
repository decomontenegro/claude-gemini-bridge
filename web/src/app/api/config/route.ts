import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import fs from 'fs/promises'
import path from 'path'

const ConfigSchema = z.object({
  persona: z.enum(['newbie', 'individual', 'team', 'enterprise', 'researcher']),
  preferences: z.object({
    verbosity: z.enum(['minimal', 'normal', 'detailed']),
    guidance: z.boolean(),
    automation: z.enum(['manual', 'semi', 'full']),
    theme: z.enum(['light', 'dark', 'system']),
  }),
  apiKeys: z.object({
    claude: z.string().optional(),
    gemini: z.string().optional(),
    vertexProject: z.string().optional(),
  }).optional(),
})

const CONFIG_FILE = path.join(process.cwd(), '../../.bridge-config.json')

export async function GET() {
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf-8')
    const config = JSON.parse(configData)
    
    // Remove sensitive data before sending
    if (config.apiKeys) {
      config.apiKeys = {
        claude: config.apiKeys.claude ? '***' : undefined,
        gemini: config.apiKeys.gemini ? '***' : undefined,
        vertexProject: config.apiKeys.vertexProject,
      }
    }

    return NextResponse.json({
      success: true,
      config,
    })
  } catch (error) {
    // Return default config if file doesn't exist
    return NextResponse.json({
      success: true,
      config: {
        persona: 'individual',
        preferences: {
          verbosity: 'normal',
          guidance: true,
          automation: 'semi',
          theme: 'system',
        },
      },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedConfig = ConfigSchema.parse(body)

    // Read existing config to preserve API keys if not provided
    let existingConfig: any = {}
    try {
      const configData = await fs.readFile(CONFIG_FILE, 'utf-8')
      existingConfig = JSON.parse(configData)
    } catch {
      // File doesn't exist yet
    }

    // Merge configs, preserving existing API keys if new ones not provided
    const finalConfig = {
      ...existingConfig,
      ...validatedConfig,
      apiKeys: {
        ...existingConfig.apiKeys,
        ...validatedConfig.apiKeys,
      },
    }

    // Save config
    await fs.writeFile(CONFIG_FILE, JSON.stringify(finalConfig, null, 2))

    // Also update environment variables if API keys provided
    if (validatedConfig.apiKeys) {
      await updateEnvFile(validatedConfig.apiKeys)
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
    })
  } catch (error) {
    console.error('Config save error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid configuration data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    )
  }
}

async function updateEnvFile(apiKeys: any) {
  const envPath = path.join(process.cwd(), '../../.env')
  let envContent = ''

  try {
    envContent = await fs.readFile(envPath, 'utf-8')
  } catch {
    // .env doesn't exist, create it
  }

  // Update or add API keys
  const updates: Record<string, string> = {}
  if (apiKeys.claude) updates.CLAUDE_API_KEY = apiKeys.claude
  if (apiKeys.gemini) updates.GEMINI_API_KEY = apiKeys.gemini
  if (apiKeys.vertexProject) updates.VERTEX_AI_PROJECT = apiKeys.vertexProject

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`)
    } else {
      envContent += `\n${key}=${value}`
    }
  }

  await fs.writeFile(envPath, envContent.trim() + '\n')
}