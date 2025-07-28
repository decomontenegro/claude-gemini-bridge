'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, 
  Play, 
  Zap, 
  Brain, 
  Sparkles,
  Code,
  Search,
  Image,
  FileSearch,
  CheckCircle
} from 'lucide-react'
import { CompressionButton } from './context-compression/CompressionButton'

type TaskType = 'code' | 'search' | 'multimodal' | 'analysis' | 'validation' | 'ultrathink'
type Orchestrator = 'auto' | 'claude' | 'gemini'
type ExecutionMode = 'single' | 'hybrid'

const taskIcons: Record<TaskType, React.ReactNode> = {
  code: <Code className="h-5 w-5" />,
  search: <Search className="h-5 w-5" />,
  multimodal: <Image className="h-5 w-5" />,
  analysis: <FileSearch className="h-5 w-5" />,
  validation: <CheckCircle className="h-5 w-5" />,
  ultrathink: <Brain className="h-5 w-5" />
}

export function TaskExecutor() {
  const [taskType, setTaskType] = useState<TaskType>('code')
  const [description, setDescription] = useState('')
  const [orchestrator, setOrchestrator] = useState<Orchestrator>('auto')
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('single')
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [taskId, setTaskId] = useState<string>('')
  const { toast } = useToast()

  const handleExecute = async () => {
    if (!description.trim()) {
      toast({
        title: "Missing description",
        description: "Please describe your task",
        variant: "destructive"
      })
      return
    }

    setIsExecuting(true)
    setResult(null)

    try {
      // Try the real backend first, fallback to mock for demo
      let response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: taskType,
          description,
          orchestrator,
          mode: executionMode,
          context: {}
        }),
      })

      // If backend is not available, use mock API
      if (!response.ok && response.status === 500) {
        console.log('Backend unavailable, using mock API')
        response = await fetch('/api/execute-mock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: taskType,
            description,
            orchestrator,
            mode: executionMode,
            context: {}
          }),
        })
      }

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Task execution failed')
      }

      setResult(data)
      setTaskId(data.taskId || `task_${Date.now()}`)

      toast({
        title: "Task completed",
        description: `Successfully executed ${taskType} task`,
        variant: "success" as any
      })
    } catch (error) {
      toast({
        title: "Execution failed",
        description: "An error occurred while executing the task",
        variant: "destructive"
      })
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Execute Task</CardTitle>
          <CardDescription>
            Create and execute tasks using intelligent orchestration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-type">Task Type</Label>
              <Select value={taskType} onValueChange={(value: TaskType) => setTaskType(value)}>
                <SelectTrigger id="task-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(taskIcons).map(([type, icon]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {icon}
                        <span className="capitalize">{type}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orchestrator">Orchestrator</Label>
              <Select value={orchestrator} onValueChange={(value: Orchestrator) => setOrchestrator(value)}>
                <SelectTrigger id="orchestrator">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span>Auto (Intelligent)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="claude">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-claude" />
                      <span>Claude</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="gemini">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-gemini" />
                      <span>Gemini</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Task Description</Label>
            <Textarea
              id="description"
              placeholder={
                taskType === 'code' ? "Create a React component that..." :
                taskType === 'search' ? "Find information about..." :
                taskType === 'multimodal' ? "Process this image/PDF to..." :
                taskType === 'analysis' ? "Analyze the codebase for..." :
                "Validate that..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="single"
                name="mode"
                value="single"
                checked={executionMode === 'single'}
                onChange={() => setExecutionMode('single')}
                className="cursor-pointer"
              />
              <Label htmlFor="single" className="cursor-pointer">Single CLI</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="hybrid"
                name="mode"
                value="hybrid"
                checked={executionMode === 'hybrid'}
                onChange={() => setExecutionMode('hybrid')}
                className="cursor-pointer"
              />
              <Label htmlFor="hybrid" className="cursor-pointer">Hybrid (Both CLIs)</Label>
            </div>
          </div>

          <Button
            onClick={handleExecute}
            disabled={isExecuting}
            className="w-full"
            variant={executionMode === 'hybrid' ? 'bridge' : 'default'}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Execute Task
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`border-2 ${
              result.executedBy === 'claude' ? 'border-claude/50' : 'border-gemini/50'
            }`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.executedBy === 'claude' ? (
                    <Brain className="h-5 w-5 text-claude" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-gemini" />
                  )}
                  Result
                </CardTitle>
                <CardDescription>
                  Executed by {result.executedBy} in {result.mode} mode
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.data?.output ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Output:</h4>
                      <pre className="bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap">
                        {result.data.output}
                      </pre>
                    </div>
                    {result.data.description && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Task:</span> {result.data.description}
                      </div>
                    )}
                    
                    {/* Context Compression Button */}
                    <div className="flex justify-end pt-4 border-t">
                      <CompressionButton
                        taskId={taskId}
                        taskResult={{
                          output: result.data.output,
                          executedBy: result.executedBy,
                          mode: result.mode,
                          data: result.data
                        }}
                        onCompressionComplete={(compressionResult) => {
                          toast({
                            title: "Context compressed successfully!",
                            description: `Achieved ${(compressionResult.compressionRatio * 100).toFixed(1)}% compression ratio`,
                            variant: "success" as any
                          })
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <pre className="bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(result.data || result, null, 2)}
                    </pre>
                    
                    {/* Context Compression Button for JSON results */}
                    <div className="flex justify-end pt-4 border-t">
                      <CompressionButton
                        taskId={taskId}
                        taskResult={{
                          output: JSON.stringify(result.data || result, null, 2),
                          executedBy: result.executedBy || 'unknown',
                          mode: result.mode || 'single',
                          data: result.data || result
                        }}
                        onCompressionComplete={(compressionResult) => {
                          toast({
                            title: "Context compressed successfully!",
                            description: `Achieved ${(compressionResult.compressionRatio * 100).toFixed(1)}% compression ratio`,
                            variant: "success" as any
                          })
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}