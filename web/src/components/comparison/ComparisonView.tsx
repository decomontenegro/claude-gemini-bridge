'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { Button3D } from '@/components/ui/button-3d'
import { PremiumLoader } from '@/components/ui/premium-loader'
import { ClaudeLogo, GeminiLogo } from '@/components/ui/brand-logos'
import { 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2,
  GitCompare,
  Sparkles,
  Brain,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ComparisonResult {
  taskId: string
  results: Array<{
    id: string
    adapter: 'CLAUDE' | 'GEMINI'
    output: string
    executionTime: number
    qualityScore: number
    createdAt: string
  }>
  comparison: {
    consensus: boolean
    similarity: number
    differences: string[]
    bestResult?: string
    worstResult?: string
  }
  validation?: {
    [resultId: string]: {
      score: number
      isValid: boolean
      criteria: Array<{
        name: string
        score: number
        passed: boolean
      }>
    }
  }
}

interface ComparisonViewProps {
  taskId?: string
  onCompare?: (taskId: string) => Promise<ComparisonResult>
  initialData?: ComparisonResult
}

export function ComparisonView({ taskId, onCompare, initialData }: ComparisonViewProps) {
  const [data, setData] = useState<ComparisonResult | null>(initialData || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified' | 'diff'>('side-by-side')
  const [showMetrics, setShowMetrics] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [fullscreenId, setFullscreenId] = useState<string | null>(null)

  useEffect(() => {
    if (taskId && !initialData) {
      loadComparison()
    }
  }, [taskId])

  const loadComparison = async () => {
    if (!taskId || !onCompare) return

    setLoading(true)
    setError(null)

    try {
      const result = await onCompare(taskId)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getAdapterIcon = (adapter: string) => {
    return adapter === 'CLAUDE' ? <ClaudeLogo size="sm" /> : <GeminiLogo size="sm" />
  }

  const getAdapterColor = (adapter: string) => {
    return adapter === 'CLAUDE' ? 'text-claude-500' : 'text-gemini-500'
  }

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const renderMetricsBar = (result: ComparisonResult['results'][0], validation?: any) => {
    const isBest = data?.comparison.bestResult === result.id
    const isWorst = data?.comparison.worstResult === result.id

    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{formatExecutionTime(result.executionTime)}</span>
        </div>

        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span>{(result.qualityScore * 100).toFixed(0)}%</span>
        </div>

        {validation && (
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span>{(validation.score * 100).toFixed(0)}% valid</span>
          </div>
        )}

        {isBest && (
          <Badge variant="default" className="bg-green-500/20 text-green-500">
            Best
          </Badge>
        )}

        {isWorst && (
          <Badge variant="default" className="bg-red-500/20 text-red-500">
            Needs Review
          </Badge>
        )}
      </div>
    )
  }

  const renderSideBySide = () => {
    if (!data) return null

    return (
      <div className="grid lg:grid-cols-2 gap-6">
        {data.results.map((result) => (
          <motion.div
            key={result.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <GlassCard 
              variant={result.adapter === 'CLAUDE' ? 'claude' : 'gemini'}
              className="h-full"
            >
              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getAdapterIcon(result.adapter)}
                    <h3 className={`font-semibold ${getAdapterColor(result.adapter)}`}>
                      {result.adapter}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => copyToClipboard(result.output, result.id)}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            {copiedId === result.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Copy output</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <button
                      onClick={() => setFullscreenId(fullscreenId === result.id ? null : result.id)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {fullscreenId === result.id ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Metrics */}
                {showMetrics && (
                  <div className="pb-4 border-b border-white/10">
                    {renderMetricsBar(result, data.validation?.[result.id])}
                  </div>
                )}

                {/* Output */}
                <div className={`prose prose-invert max-w-none ${
                  fullscreenId === result.id ? 'min-h-[500px]' : 'max-h-[400px]'
                } overflow-y-auto custom-scrollbar`}>
                  <pre className="whitespace-pre-wrap text-sm">
                    {result.output}
                  </pre>
                </div>

                {/* Validation Details */}
                {data.validation?.[result.id] && showMetrics && (
                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Validation Criteria</h4>
                    {data.validation[result.id].criteria.map((criterion) => (
                      <div key={criterion.name} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{criterion.name}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={criterion.score * 100} className="w-20 h-2" />
                          {criterion.passed ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    )
  }

  const renderUnified = () => {
    if (!data) return null

    return (
      <GlassCard className="p-6">
        <Tabs defaultValue={data.results[0]?.id} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
            {data.results.map((result) => (
              <TabsTrigger key={result.id} value={result.id} className="flex items-center gap-2">
                {getAdapterIcon(result.adapter)}
                <span>{result.adapter}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {data.results.map((result) => (
            <TabsContent key={result.id} value={result.id} className="mt-6">
              {showMetrics && (
                <div className="mb-6">
                  {renderMetricsBar(result, data.validation?.[result.id])}
                </div>
              )}

              <div className="prose prose-invert max-w-none max-h-[500px] overflow-y-auto custom-scrollbar">
                <pre className="whitespace-pre-wrap text-sm">
                  {result.output}
                </pre>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </GlassCard>
    )
  }

  const renderDiff = () => {
    if (!data || data.results.length < 2) return null

    // Simple diff visualization - highlights differences
    const [result1, result2] = data.results
    const lines1 = result1.output.split('\n')
    const lines2 = result2.output.split('\n')
    const maxLines = Math.max(lines1.length, lines2.length)

    return (
      <GlassCard className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Difference View</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500/20 rounded" />
                <span>Added</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500/20 rounded" />
                <span>Removed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500/20 rounded" />
                <span>Modified</span>
              </div>
            </div>
          </div>

          <div className="font-mono text-sm space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar">
            {Array.from({ length: maxLines }).map((_, i) => {
              const line1 = lines1[i] || ''
              const line2 = lines2[i] || ''
              const isDifferent = line1 !== line2

              if (!isDifferent) {
                return (
                  <div key={i} className="flex">
                    <span className="w-12 text-muted-foreground pr-4">{i + 1}</span>
                    <span>{line1}</span>
                  </div>
                )
              }

              return (
                <div key={i} className="space-y-1">
                  {line1 && (
                    <div className="flex bg-red-500/10 -mx-6 px-6">
                      <span className="w-12 text-muted-foreground pr-4">{i + 1}</span>
                      <span className="text-red-400">- {line1}</span>
                    </div>
                  )}
                  {line2 && (
                    <div className="flex bg-green-500/10 -mx-6 px-6">
                      <span className="w-12 text-muted-foreground pr-4">{i + 1}</span>
                      <span className="text-green-400">+ {line2}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </GlassCard>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <PremiumLoader size="lg" variant="hybrid" text="Comparing results..." />
      </div>
    )
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </GlassCard>
    )
  }

  if (!data) {
    return (
      <GlassCard className="p-12 text-center">
        <GitCompare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No comparison data available</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <GitCompare className="h-6 w-6" />
            Result Comparison
          </h2>
          <p className="text-muted-foreground mt-1">
            Compare outputs from different AI models side by side
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button3D
            variant="default"
            size="sm"
            onClick={() => setShowMetrics(!showMetrics)}
          >
            {showMetrics ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showMetrics ? 'Hide' : 'Show'} Metrics
          </Button3D>

          <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'side-by-side' ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'unified' ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'diff' ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              Diff
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              data.comparison.consensus ? 'bg-green-500/20' : 'bg-yellow-500/20'
            }`}>
              {data.comparison.consensus ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Consensus</p>
              <p className="font-semibold">{data.comparison.consensus ? 'Reached' : 'Not Reached'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Similarity</p>
              <p className="font-semibold">{(data.comparison.similarity * 100).toFixed(0)}%</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <GitCompare className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Differences</p>
              <p className="font-semibold">{data.comparison.differences.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Time</p>
              <p className="font-semibold">
                {formatExecutionTime(
                  data.results.reduce((sum, r) => sum + r.executionTime, 0) / data.results.length
                )}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'side-by-side' && renderSideBySide()}
        {viewMode === 'unified' && renderUnified()}
        {viewMode === 'diff' && renderDiff()}
      </AnimatePresence>

      {/* Differences List */}
      {data.comparison.differences.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Key Differences
          </h3>
          <ul className="space-y-2">
            {data.comparison.differences.map((diff, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground">•</span>
                <span>{diff}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  )
}