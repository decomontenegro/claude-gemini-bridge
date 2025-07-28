'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { Button3D } from '@/components/ui/button-3d'
import { PremiumLoader } from '@/components/ui/premium-loader'
import { ClaudeLogo, GeminiLogo } from '@/components/ui/brand-logos'
import { 
  Users,
  GitMerge,
  GitBranch,
  Eye,
  Repeat,
  ArrowRight,
  ArrowDown,
  Clock,
  CheckCircle,
  Circle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

export enum CollaborationMode {
  SEQUENTIAL = 'SEQUENTIAL',
  PARALLEL = 'PARALLEL',
  REVIEW = 'REVIEW',
  ITERATIVE = 'ITERATIVE'
}

interface CollaborationStep {
  step: number
  adapter: 'CLAUDE' | 'GEMINI'
  input: string
  output: string
  executionTime: number
  timestamp: string
}

interface CollaborativeResult {
  taskId: string
  mode: CollaborationMode
  steps: CollaborationStep[]
  finalOutput: string
  totalExecutionTime: number
  consensus?: boolean
  adaptersUsed: string[]
}

interface CollaborativeViewProps {
  onExecute?: (config: CollaborationConfig) => Promise<CollaborativeResult>
  initialPrompt?: string
}

interface CollaborationConfig {
  prompt: string
  type: string
  mode: CollaborationMode
  adapters?: string[]
  maxIterations?: number
  options?: {
    mergeStrategy?: string
    includeIntermediateResults?: boolean
    stopOnConsensus?: boolean
  }
}

const modeDescriptions = {
  [CollaborationMode.SEQUENTIAL]: 'One AI builds on the work of another, creating a refined output',
  [CollaborationMode.PARALLEL]: 'Both AIs work independently, then results are merged',
  [CollaborationMode.REVIEW]: 'One AI creates, the other reviews and validates',
  [CollaborationMode.ITERATIVE]: 'Back-and-forth refinement between AIs'
}

const modeIcons = {
  [CollaborationMode.SEQUENTIAL]: ArrowRight,
  [CollaborationMode.PARALLEL]: GitBranch,
  [CollaborationMode.REVIEW]: Eye,
  [CollaborationMode.ITERATIVE]: Repeat
}

export function CollaborativeView({ onExecute, initialPrompt = '' }: CollaborativeViewProps) {
  const [config, setConfig] = useState<CollaborationConfig>({
    prompt: initialPrompt,
    type: 'CODE_GENERATION',
    mode: CollaborationMode.SEQUENTIAL,
    maxIterations: 3,
    options: {
      includeIntermediateResults: true,
      stopOnConsensus: true
    }
  })

  const [result, setResult] = useState<CollaborativeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const executeCollaboration = async () => {
    if (!onExecute || !config.prompt) return

    setLoading(true)
    setError(null)
    setResult(null)
    setCurrentStep(0)

    try {
      const result = await onExecute(config)
      setResult(result)
      
      // Auto-play animation
      setIsPlaying(true)
      animateSteps(result.steps.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Collaboration failed')
    } finally {
      setLoading(false)
    }
  }

  const animateSteps = (totalSteps: number) => {
    let step = 0
    const interval = setInterval(() => {
      if (step >= totalSteps - 1) {
        clearInterval(interval)
        setIsPlaying(false)
        setCurrentStep(totalSteps - 1)
      } else {
        step++
        setCurrentStep(step)
      }
    }, 1500)
  }

  const getAdapterIcon = (adapter: string) => {
    return adapter === 'CLAUDE' ? <ClaudeLogo size="sm" /> : <GeminiLogo size="sm" />
  }

  const renderModeSelector = () => {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(CollaborationMode).map(([key, value]) => {
          const Icon = modeIcons[value]
          const isSelected = config.mode === value

          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setConfig({ ...config, mode: value })}
              className={`p-4 rounded-xl border transition-all ${
                isSelected 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <Icon className={`h-6 w-6 mb-2 mx-auto ${
                isSelected ? 'text-purple-500' : 'text-muted-foreground'
              }`} />
              <h4 className="font-medium mb-1">{key}</h4>
              <p className="text-xs text-muted-foreground">
                {modeDescriptions[value]}
              </p>
            </motion.button>
          )
        })}
      </div>
    )
  }

  const renderSequentialFlow = () => {
    if (!result) return null

    return (
      <div className="space-y-4">
        {result.steps.map((step, index) => (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, x: -20 }}
            animate={{ 
              opacity: currentStep >= index ? 1 : 0.3,
              x: 0
            }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= index 
                    ? step.adapter === 'CLAUDE' ? 'bg-claude-500/20' : 'bg-gemini-500/20'
                    : 'bg-white/5'
                }`}>
                  {currentStep > index ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : currentStep === index ? (
                    <Circle className="h-5 w-5 animate-pulse" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                {index < result.steps.length - 1 && (
                  <div className="w-0.5 h-20 bg-white/10 mx-5 mt-2" />
                )}
              </div>

              <GlassCard 
                variant={step.adapter === 'CLAUDE' ? 'claude' : 'gemini'}
                className="flex-1 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getAdapterIcon(step.adapter)}
                    <span className="font-medium">{step.adapter}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Step {step.step}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{step.executionTime}ms</span>
                    </div>
                  </div>
                </div>

                {currentStep >= index && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="text-sm text-muted-foreground mb-2">
                      <strong>Input:</strong> {step.input.substring(0, 100)}...
                    </div>
                    <div className="text-sm">
                      <strong>Output:</strong> {step.output.substring(0, 200)}...
                    </div>
                  </motion.div>
                )}
              </GlassCard>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  const renderParallelFlow = () => {
    if (!result) return null

    const claudeSteps = result.steps.filter(s => s.adapter === 'CLAUDE')
    const geminiSteps = result.steps.filter(s => s.adapter === 'GEMINI')

    return (
      <div className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <ClaudeLogo size="md" />
              <h4 className="font-semibold text-claude-500">Claude Branch</h4>
            </div>
            {claudeSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard variant="claude" className="p-4">
                  <div className="text-sm">
                    {step.output.substring(0, 150)}...
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <GeminiLogo size="md" />
              <h4 className="font-semibold text-gemini-500">Gemini Branch</h4>
            </div>
            {geminiSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard variant="gemini" className="p-4">
                  <div className="text-sm">
                    {step.output.substring(0, 150)}...
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard className="p-6 text-center">
            <GitMerge className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <h4 className="font-semibold mb-2">Merged Result</h4>
            <p className="text-sm text-muted-foreground">
              {result.finalOutput.substring(0, 200)}...
            </p>
          </GlassCard>
        </motion.div>
      </div>
    )
  }

  const renderConfiguration = () => {
    return (
      <GlassCard className="p-6 space-y-6">
        <div>
          <h3 className="font-semibold mb-4">Collaboration Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Prompt</label>
              <textarea
                value={config.prompt}
                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 transition-colors resize-none"
                rows={4}
                placeholder="Enter your prompt here..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Task Type</label>
              <Select
                value={config.type}
                onValueChange={(value) => setConfig({ ...config, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CODE_GENERATION">Code Generation</SelectItem>
                  <SelectItem value="CODE_REVIEW">Code Review</SelectItem>
                  <SelectItem value="DEBUGGING">Debugging</SelectItem>
                  <SelectItem value="ARCHITECTURE">Architecture</SelectItem>
                  <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.mode === CollaborationMode.ITERATIVE && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Max Iterations: {config.maxIterations}
                </label>
                <Slider
                  value={[config.maxIterations || 3]}
                  onValueChange={([value]) => setConfig({ ...config, maxIterations: value })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.options?.includeIntermediateResults}
                  onChange={(e) => setConfig({
                    ...config,
                    options: {
                      ...config.options,
                      includeIntermediateResults: e.target.checked
                    }
                  })}
                  className="rounded border-white/20"
                />
                <span className="text-sm">Save intermediate results</span>
              </label>

              {config.mode === CollaborationMode.ITERATIVE && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.options?.stopOnConsensus}
                    onChange={(e) => setConfig({
                      ...config,
                      options: {
                        ...config.options,
                        stopOnConsensus: e.target.checked
                      }
                    })}
                    className="rounded border-white/20"
                  />
                  <span className="text-sm">Stop on consensus</span>
                </label>
              )}
            </div>
          </div>
        </div>

        <Button3D
          variant="claude"
          size="lg"
          onClick={executeCollaboration}
          disabled={loading || !config.prompt}
          className="w-full"
        >
          {loading ? (
            <PremiumLoader size="sm" variant="hybrid" />
          ) : (
            <>
              <Users className="h-5 w-5 mr-2" />
              Start Collaboration
            </>
          )}
        </Button3D>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Users className="h-6 w-6" />
          Collaborative AI Execution
        </h2>
        <p className="text-muted-foreground mt-1">
          Combine the strengths of multiple AI models for enhanced results
        </p>
      </div>

      {/* Mode Selection */}
      <div>
        <h3 className="font-semibold mb-4">Select Collaboration Mode</h3>
        {renderModeSelector()}
      </div>

      {/* Configuration */}
      {renderConfiguration()}

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Collaboration Results</h3>
              <div className="flex items-center gap-2">
                {isPlaying ? (
                  <Button3D
                    size="sm"
                    variant="default"
                    onClick={() => setIsPlaying(false)}
                  >
                    <Pause className="h-4 w-4" />
                  </Button3D>
                ) : (
                  <Button3D
                    size="sm"
                    variant="default"
                    onClick={() => {
                      setCurrentStep(0)
                      setIsPlaying(true)
                      animateSteps(result.steps.length)
                    }}
                  >
                    <Play className="h-4 w-4" />
                  </Button3D>
                )}
                <Button3D
                  size="sm"
                  variant="default"
                  onClick={() => setCurrentStep(0)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button3D>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Mode</p>
                <p className="font-semibold">{result.mode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Steps</p>
                <p className="font-semibold">{result.steps.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Time</p>
                <p className="font-semibold">{result.totalExecutionTime}ms</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Consensus</p>
                <p className="font-semibold">
                  {result.consensus ? (
                    <Badge variant="default" className="bg-green-500/20 text-green-500">
                      Reached
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-yellow-500/20 text-yellow-500">
                      Pending
                    </Badge>
                  )}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm">
                  {currentStep + 1} / {result.steps.length}
                </span>
              </div>
              <Progress value={((currentStep + 1) / result.steps.length) * 100} />
            </div>
          </GlassCard>

          {/* Flow Visualization */}
          {result.mode === CollaborationMode.SEQUENTIAL && renderSequentialFlow()}
          {result.mode === CollaborationMode.PARALLEL && renderParallelFlow()}

          {/* Final Output */}
          <GlassCard className="p-6">
            <h3 className="font-semibold mb-4">Final Output</h3>
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm bg-white/5 p-4 rounded-lg">
                {result.finalOutput}
              </pre>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <GlassCard className="p-6 border-red-500/20">
          <p className="text-red-500">{error}</p>
        </GlassCard>
      )}
    </div>
  )
}