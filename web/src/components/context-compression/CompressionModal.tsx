'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Archive, 
  Brain, 
  FileText, 
  Zap, 
  Settings,
  Eye,
  Copy,
  Download,
  Sparkles,
  BarChart3,
  Clock,
  HardDrive,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'

interface CompressionModalProps {
  taskId: string
  taskResult: any
  onCompressionStart: () => void
  onCompressionComplete: (result?: any) => void
  onCancel: () => void
}

type CompressionType = 'EMBEDDINGS' | 'SUMMARY' | 'HYBRID'

interface CompressionConfig {
  type: CompressionType
  qualityThreshold: number
  maxSummaryLength: number
  preserveCodeBlocks: boolean
  includeMetrics: boolean
  enableSimilaritySearch: boolean
  tags: string[]
}

interface CompressionPreview {
  type: CompressionType
  estimatedRatio: number
  estimatedSize: number
  quality: number
  features: string[]
}

export function CompressionModal({ 
  taskId, 
  taskResult, 
  onCompressionStart, 
  onCompressionComplete, 
  onCancel 
}: CompressionModalProps) {
  const [config, setConfig] = useState<CompressionConfig>({
    type: 'HYBRID',
    qualityThreshold: 0.8,
    maxSummaryLength: 300,
    preserveCodeBlocks: true,
    includeMetrics: true,
    enableSimilaritySearch: true,
    tags: []
  })
  
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState('')
  const [preview, setPreview] = useState<CompressionPreview | null>(null)
  const [compressionResult, setCompressionResult] = useState<any>(null)
  const [newTag, setNewTag] = useState('')
  
  const { toast } = useToast()

  // Generate preview when config changes
  useEffect(() => {
    generatePreview()
  }, [config])

  const compressionTypes = {
    EMBEDDINGS: {
      name: 'Vector Embeddings',
      description: 'Ultra-high compression using semantic vectors',
      icon: Brain,
      expectedRatio: 0.05,
      features: ['Semantic similarity search', 'Ultra-compact', 'Fast retrieval'],
      pros: ['Maximum compression', 'Semantic search'],
      cons: ['Not human readable', 'Requires embedding model']
    },
    SUMMARY: {
      name: 'Intelligent Summary',
      description: 'AI-generated concise summaries',
      icon: FileText,
      expectedRatio: 0.1,
      features: ['Human readable', 'Preserves key info', 'Easy to understand'],
      pros: ['Readable format', 'Good compression', 'Self-contained'],
      cons: ['May lose details', 'No similarity search']
    },
    HYBRID: {
      name: 'Hybrid Approach',
      description: 'Best of both: embeddings + summaries',
      icon: Zap,
      expectedRatio: 0.15,
      features: ['Readable + searchable', 'Balanced approach', 'Versatile'],
      pros: ['Best balance', 'Multiple access methods', 'Comprehensive'],
      cons: ['Slightly larger', 'More processing time']
    }
  }

  const generatePreview = () => {
    const originalSize = JSON.stringify(taskResult).length + taskId.length + 1000 // Estimated
    const typeInfo = compressionTypes[config.type]
    const estimatedSize = Math.round(originalSize * typeInfo.expectedRatio)
    const quality = config.qualityThreshold

    setPreview({
      type: config.type,
      estimatedRatio: typeInfo.expectedRatio,
      estimatedSize,
      quality,
      features: typeInfo.features
    })
  }

  const handleCompress = async () => {
    setIsCompressing(true)
    setCompressionProgress(0)
    onCompressionStart()

    try {
      // Simulate compression phases
      const phases = [
        { name: 'Analyzing task context...', duration: 1000 },
        { name: 'Extracting key information...', duration: 1500 },
        { name: 'Generating embeddings...', duration: 2000 },
        { name: 'Creating summaries...', duration: 1500 },
        { name: 'Optimizing compression...', duration: 1000 },
        { name: 'Finalizing compressed context...', duration: 500 }
      ]

      let totalProgress = 0
      for (const phase of phases) {
        setCurrentPhase(phase.name)
        await new Promise(resolve => setTimeout(resolve, phase.duration))
        totalProgress += 100 / phases.length
        setCompressionProgress(Math.min(totalProgress, 100))
      }

      // Simulate API call
      const response = await fetch('/api/compress-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          compressionType: config.type,
          config: {
            qualityThreshold: config.qualityThreshold,
            maxSummaryLength: config.maxSummaryLength,
            preserveCodeBlocks: config.preserveCodeBlocks,
            includeMetrics: config.includeMetrics,
            enableSimilaritySearch: config.enableSimilaritySearch,
            tags: config.tags
          }
        })
      })

      if (!response.ok) {
        throw new Error('Compression failed')
      }

      const result = await response.json()
      setCompressionResult(result)

      toast({
        title: "Context compressed successfully!",
        description: `Achieved ${(result.compressionRatio * 100).toFixed(1)}% compression ratio`,
        variant: "success" as any
      })

    } catch (error) {
      toast({
        title: "Compression failed",
        description: "An error occurred during compression",
        variant: "destructive"
      })
      onCompressionComplete()
    } finally {
      setIsCompressing(false)
      setCompressionProgress(100)
    }
  }

  const handleAddTag = () => {
    if (newTag && !config.tags.includes(newTag)) {
      setConfig(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setConfig(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const handleCopyResult = () => {
    if (compressionResult) {
      navigator.clipboard.writeText(JSON.stringify(compressionResult, null, 2))
      toast({
        title: "Copied to clipboard",
        description: "Compression result copied successfully"
      })
    }
  }

  const handleDownloadResult = () => {
    if (compressionResult) {
      const blob = new Blob([JSON.stringify(compressionResult, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compressed-context-${taskId}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (compressionResult) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
          <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
          <span className="text-green-700 dark:text-green-300 font-medium">
            Context compressed successfully!
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingDown className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {(compressionResult.compressionRatio * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Compression Ratio</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <HardDrive className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {Math.round(compressionResult.compressedSize / 1024)}KB
              </p>
              <p className="text-sm text-muted-foreground">Final Size</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">
                {(compressionResult.qualityScore * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-muted-foreground">Quality Score</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">
                {(compressionResult.processingTime / 1000).toFixed(1)}s
              </p>
              <p className="text-sm text-muted-foreground">Processing Time</p>
            </CardContent>
          </Card>
        </div>

        {compressionResult.similarContexts && compressionResult.similarContexts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Similar Contexts Found</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {compressionResult.similarContexts.map((similar: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">Task {similar.taskId}</span>
                    <Badge variant="secondary">
                      {(similar.similarity * 100).toFixed(0)}% similar
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleCopyResult}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Result
          </Button>
          <Button variant="outline" onClick={handleDownloadResult}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={() => onCompressionComplete(compressionResult)}>
            Done
          </Button>
        </div>
      </motion.div>
    )
  }

  if (isCompressing) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 text-center py-8"
      >
        <div className="flex justify-center">
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Archive className="h-12 w-12 text-blue-500" />
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-blue-200 border-t-blue-500"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Compressing Context</h3>
          <p className="text-muted-foreground">{currentPhase}</p>
        </div>

        <div className="space-y-2">
          <Progress value={compressionProgress} className="w-full" />
          <p className="text-sm text-muted-foreference">
            {compressionProgress.toFixed(0)}% complete
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Compression Type</CardTitle>
              <CardDescription>
                Choose how to compress your task context
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(compressionTypes).map(([key, type]) => {
                const Icon = type.icon
                return (
                  <div
                    key={key}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      config.type === key
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                    onClick={() => setConfig(prev => ({ ...prev, type: key as CompressionType }))}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${
                        config.type === key ? 'text-blue-500' : 'text-muted-foreground'
                      }`} />
                      <div className="flex-1">
                        <h4 className="font-medium">{type.name}</h4>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {type.features.map(feature => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ~{(type.expectedRatio * 100).toFixed(0)}% size
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {type.expectedRatio < 0.1 ? 'Ultra' : type.expectedRatio < 0.2 ? 'High' : 'Good'} compression
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quality Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Quality Threshold: {config.qualityThreshold.toFixed(1)}</Label>
                  <Slider
                    value={[config.qualityThreshold]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, qualityThreshold: value }))}
                    min={0.5}
                    max={1.0}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values preserve more information but reduce compression
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Summary Length: {config.maxSummaryLength} chars</Label>
                  <Slider
                    value={[config.maxSummaryLength]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, maxSummaryLength: value }))}
                    min={100}
                    max={1000}
                    step={50}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Preserve Code Blocks</Label>
                    <p className="text-xs text-muted-foreground">Keep code formatting intact</p>
                  </div>
                  <Switch
                    checked={config.preserveCodeBlocks}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, preserveCodeBlocks: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Include Metrics</Label>
                    <p className="text-xs text-muted-foreground">Preserve performance data</p>
                  </div>
                  <Switch
                    checked={config.includeMetrics}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeMetrics: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Similarity Search</Label>
                    <p className="text-xs text-muted-foreground">Find related contexts</p>
                  </div>
                  <Switch
                    checked={config.enableSimilaritySearch}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableSimilaritySearch: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Compression Preview</CardTitle>
                <CardDescription>
                  Estimated results for {compressionTypes[preview.type].name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-red-500">
                      ~{Math.round(5000 / 1024)}KB
                    </div>
                    <div className="text-sm text-muted-foreground">Original Size</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-500">
                      ~{Math.round(preview.estimatedSize / 1024)}KB
                    </div>
                    <div className="text-sm text-muted-foreground">Compressed Size</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Compression Ratio</span>
                    <span className="font-medium">{(preview.estimatedRatio * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={preview.estimatedRatio * 100} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Quality Score</span>
                    <span className="font-medium">{(preview.quality * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={preview.quality * 100} className="h-2" />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Features</Label>
                  <div className="flex flex-wrap gap-2">
                    {preview.features.map(feature => (
                      <Badge key={feature} variant="outline">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tags</CardTitle>
              <CardDescription>Add tags to categorize this compressed context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                <Button onClick={handleAddTag} size="sm">Add</Button>
              </div>
              
              {config.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                Compression Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Task ID:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs">{taskId}</code>
              </div>
              <div className="flex justify-between">
                <span>Executed by:</span>
                <span>{taskResult.executedBy}</span>
              </div>
              <div className="flex justify-between">
                <span>Mode:</span>
                <span>{taskResult.mode}</span>
              </div>
              <div className="flex justify-between">
                <span>Output length:</span>
                <span>{taskResult.output?.length || 0} characters</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleCompress}
          disabled={isCompressing}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          <Archive className="h-4 w-4 mr-2" />
          Compress Context
        </Button>
      </div>
    </div>
  )
}