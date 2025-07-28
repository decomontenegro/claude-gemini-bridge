'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { HIGH_VALUE_WORKFLOWS } from '@/lib/high-value-workflows'
import { useWorkflowHistoryStore } from '@/store/workflow-history-store'
import { 
  Shield, 
  Building, 
  Bug, 
  GraduationCap, 
  RefreshCw, 
  Zap,
  ArrowRight,
  CheckCircle,
  Loader2,
  Copy,
  FileCode,
  Sparkles,
  MessageSquare
} from 'lucide-react'

const icons = {
  securityReview: Shield,
  architectureDecision: Building,
  complexDebug: Bug,
  learningAccelerator: GraduationCap,
  codeMigration: RefreshCw,
  performanceOptimization: Zap
}

export function SmartWorkflows() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isExecuting, setIsExecuting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [taskDescription, setTaskDescription] = useState('')
  const [showPromptGenerator, setShowPromptGenerator] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [refinementStep, setRefinementStep] = useState<number | null>(null)
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null)
  const { toast } = useToast()
  
  const {
    startExecution,
    updateExecutionStep,
    completeExecution,
    addRefinement,
    addPromptExport,
    updateMetadata
  } = useWorkflowHistoryStore()

  const generatePromptForVSCode = () => {
    if (!results.length || !selectedWorkflow) return ''
    
    const workflow = HIGH_VALUE_WORKFLOWS[selectedWorkflow as keyof typeof HIGH_VALUE_WORKFLOWS]
    let prompt = `# ${workflow.title}\n\n## Contexto\n${taskDescription}\n\n## Análise Completa\n\n`
    
    results.forEach((result, index) => {
      const step = workflow.flow[index]
      const content = result.data?.result?.content || result.data?.data?.result?.content || ''
      prompt += `### Etapa ${index + 1}: ${step.task}\n**Responsável**: ${step.ai === 'both' ? 'Ambas AIs' : step.ai}\n\n${content}\n\n---\n\n`
    })
    
    prompt += `## Próximos Passos\nCom base nesta análise completa, implemente as soluções propostas seguindo as melhores práticas identificadas.\n\n`
    prompt += `## Instruções para Implementação\n1. Revise cada etapa cuidadosamente\n2. Implemente as soluções propostas de forma incremental\n3. Teste cada mudança antes de prosseguir\n4. Documente as decisões tomadas\n`
    
    return prompt
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      
      // Log prompt export to history
      if (currentExecutionId) {
        addPromptExport(currentExecutionId, {
          timestamp: new Date(),
          format: 'vscode',
          content: text
        })
      }
      
      toast({
        title: "Copiado!",
        description: "Prompt copiado para a área de transferência",
      })
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o texto",
        variant: "destructive"
      })
    }
  }

  const refineStep = async (stepIndex: number) => {
    setIsRefining(true)
    setRefinementStep(stepIndex)
    
    const workflow = HIGH_VALUE_WORKFLOWS[selectedWorkflow as keyof typeof HIGH_VALUE_WORKFLOWS]
    const step = workflow.flow[stepIndex]
    const previousResult = results[stepIndex]
    
    try {
      const requestBody = {
        type: 'ultrathink',
        description: `REFINAMENTO - ${step.task}\n\nContexto original: ${taskDescription}\n\nResultado anterior:\n${previousResult.data?.result?.content || ''}\n\nPor favor, refine e melhore esta análise, adicionando mais detalhes e considerações.`,
        orchestrator: step.ai === 'both' ? 'auto' : step.ai,
        mode: step.ai === 'both' ? 'hybrid' : 'single',
      }
      
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) throw new Error('Falha ao refinar')
      
      const result = await response.json()
      const newResults = [...results]
      newResults[stepIndex] = result
      setResults(newResults)
      
      // Log refinement to history
      if (currentExecutionId) {
        addRefinement(currentExecutionId, {
          stepIndex,
          type: 'single',
          timestamp: new Date(),
          result: result.data
        })
      }
      
      toast({
        title: "Refinamento concluído!",
        description: `Etapa ${stepIndex + 1} foi refinada com sucesso`,
      })
    } catch (error) {
      toast({
        title: "Erro no refinamento",
        description: "Não foi possível refinar esta etapa",
        variant: "destructive"
      })
    } finally {
      setIsRefining(false)
      setRefinementStep(null)
    }
  }

  const refineAllResults = async () => {
    setIsRefining(true)
    
    try {
      const allContent = results.map((r, i) => {
        const step = HIGH_VALUE_WORKFLOWS[selectedWorkflow as keyof typeof HIGH_VALUE_WORKFLOWS].flow[i]
        return `Etapa ${i + 1} (${step.task}):\n${r.data?.result?.content || ''}`
      }).join('\n\n---\n\n')
      
      const requestBody = {
        type: 'ultrathink',
        description: `SÍNTESE E REFINAMENTO FINAL\n\nContexto: ${taskDescription}\n\nResultados das etapas:\n${allContent}\n\nPor favor, crie uma síntese refinada e coerente de todos os resultados, destacando os pontos principais e criando um plano de ação unificado.`,
        orchestrator: 'claude',
        mode: 'single',
      }
      
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) throw new Error('Falha ao refinar')
      
      const result = await response.json()
      setResults([...results, result]) // Adiciona como resultado final
      
      // Log all refinement to history
      if (currentExecutionId) {
        addRefinement(currentExecutionId, {
          type: 'all',
          timestamp: new Date(),
          result: result.data
        })
      }
      
      toast({
        title: "Refinamento completo!",
        description: "Uma síntese refinada foi criada",
      })
    } catch (error) {
      toast({
        title: "Erro no refinamento",
        description: "Não foi possível refinar os resultados",
        variant: "destructive"
      })
    } finally {
      setIsRefining(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">🎯 Smart Workflows</h2>
        <p className="text-muted-foreground">
          Pre-configured workflows that leverage both AIs for maximum value
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(HIGH_VALUE_WORKFLOWS).map(([key, workflow]) => {
          const Icon = icons[key as keyof typeof icons]
          return (
            <Card 
              key={key}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setSelectedWorkflow(key)
                setTaskDescription('')
                setResults([])
                setCurrentStep(0)
                setCurrentExecutionId(null)
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {workflow.title}
                </CardTitle>
                <CardDescription>{workflow.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {workflow.value}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedWorkflow && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>
              {HIGH_VALUE_WORKFLOWS[selectedWorkflow as keyof typeof HIGH_VALUE_WORKFLOWS].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workflow-task">Descreva sua tarefa</Label>
                <Textarea
                  id="workflow-task"
                  placeholder={`Ex: ${
                    selectedWorkflow === 'securityReview' ? 'Analise a segurança do meu código de autenticação' :
                    selectedWorkflow === 'architectureDecision' ? 'Preciso decidir entre microserviços ou monolito' :
                    selectedWorkflow === 'complexDebug' ? 'Minha aplicação está com memory leak em produção' :
                    selectedWorkflow === 'learningAccelerator' ? 'Quero aprender sobre WebSockets em profundidade' :
                    selectedWorkflow === 'codeMigration' ? 'Migrar código de JavaScript para TypeScript' :
                    'Otimizar performance da minha API REST'
                  }`}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="min-h-[100px]"
                  disabled={isExecuting}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Etapas do Workflow:</h4>
                {HIGH_VALUE_WORKFLOWS[selectedWorkflow as keyof typeof HIGH_VALUE_WORKFLOWS].flow.map((step, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    index <= currentStep ? 'bg-primary/10' : 'bg-muted'
                  }`}
                >
                  <div className={`rounded-full p-2 ${
                    index < currentStep ? 'bg-green-500' : 
                    index === currentStep ? 'bg-primary' : 'bg-gray-400'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : (
                      <span className="text-white text-sm font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {step.ai === 'both' ? 'Both AIs' : step.ai === 'claude' ? 'Claude' : 'Gemini'}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.task}</p>
                  </div>
                </div>
                ))}
              </div>
              
              <Button 
                className="w-full" 
                variant="bridge"
                disabled={isExecuting}
                onClick={async () => {
                  if (!taskDescription.trim()) {
                    toast({
                      title: "Campo obrigatório",
                      description: "Por favor, descreva sua tarefa antes de iniciar o workflow",
                      variant: "destructive"
                    })
                    return
                  }
                  
                  // Start workflow execution
                  setIsExecuting(true)
                  setCurrentStep(0)
                  setResults([])
                  
                  // Start tracking in history
                  const workflow = HIGH_VALUE_WORKFLOWS[selectedWorkflow as keyof typeof HIGH_VALUE_WORKFLOWS]
                  const executionId = startExecution(selectedWorkflow, workflow.title, taskDescription)
                  setCurrentExecutionId(executionId)
                  
                  console.log('Starting workflow:', selectedWorkflow)
                  console.log('Task description:', taskDescription)
                  console.log('Execution ID:', executionId)
                  
                  // Execute each step of the workflow
                  
                  for (let i = 0; i < workflow.flow.length; i++) {
                    setCurrentStep(i)
                    const step = workflow.flow[i]
                    
                    console.log(`Executing step ${i + 1}:`, step)
                    
                    // Update step status in history
                    updateExecutionStep(executionId, i, {
                      stepIndex: i,
                      stepName: `Step ${i + 1}`,
                      ai: step.ai,
                      task: step.task,
                      startTime: new Date(),
                      status: 'executing'
                    })
                    
                    try {
                      // Execute step via API
                      const requestBody = {
                        type: 'ultrathink', // Use ultrathink for comprehensive workflow execution
                        description: `${workflow.title} - Step ${i + 1}: ${step.task}\n\nContexto da tarefa: ${taskDescription}`,
                        orchestrator: step.ai === 'both' ? 'auto' : step.ai,
                        mode: step.ai === 'both' ? 'hybrid' : 'single',
                        context: { workflow: selectedWorkflow, step: i, userTask: taskDescription }
                      }
                      
                      console.log('Request body:', requestBody)
                      
                      const response = await fetch('/api/execute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                      })
                      
                      console.log('Response status:', response.status)
                      
                      if (!response.ok) {
                        const errorText = await response.text()
                        console.error('API Error:', errorText)
                        throw new Error(`API Error: ${response.status} - ${errorText}`)
                      }
                      
                      const result = await response.json()
                      console.log(`Step ${i + 1} completed:`, result)
                      setResults(prev => [...prev, result])
                      
                      // Update step completion in history
                      updateExecutionStep(executionId, i, {
                        endTime: new Date(),
                        status: 'completed',
                        result: result.data
                      })
                      
                      // Add delay between steps for visual feedback
                      await new Promise(resolve => setTimeout(resolve, 1000))
                      
                    } catch (error) {
                      console.error(`Error in step ${i + 1}:`, error)
                      
                      // Update step failure in history
                      updateExecutionStep(executionId, i, {
                        endTime: new Date(),
                        status: 'failed',
                        error: error instanceof Error ? error.message : 'Erro desconhecido'
                      })
                      
                      // Mark execution as failed
                      completeExecution(executionId, 'failed')
                      setCurrentExecutionId(null)
                      
                      toast({
                        title: `Erro na etapa ${i + 1}`,
                        description: error instanceof Error ? error.message : 'Erro desconhecido',
                        variant: "destructive"
                      })
                      break
                    }
                  }
                  
                  // Mark workflow as complete
                  setCurrentStep(workflow.flow.length)
                  setIsExecuting(false)
                  
                  // Complete execution in history
                  if (currentExecutionId) {
                    completeExecution(currentExecutionId, 'completed')
                  }
                  
                  toast({
                    title: "Workflow concluído!",
                    description: `${workflow.title} foi executado com sucesso`,
                    variant: "success" as any
                  })
                }}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing Step {currentStep + 1}...
                  </>
                ) : (
                  <>
                    Start This Workflow
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              
              {results.length > 0 && (
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Resultados:</h4>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPromptGenerator(true)}
                        disabled={isRefining}
                      >
                        <FileCode className="mr-2 h-4 w-4" />
                        Gerar Prompt VS Code
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={refineAllResults}
                        disabled={isRefining || results.length < HIGH_VALUE_WORKFLOWS[selectedWorkflow as keyof typeof HIGH_VALUE_WORKFLOWS].flow.length}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Refinar Todos
                      </Button>
                    </div>
                  </div>
                  
                  {results.map((result, index) => {
                    const isRefinedSummary = index >= HIGH_VALUE_WORKFLOWS[selectedWorkflow as keyof typeof HIGH_VALUE_WORKFLOWS].flow.length
                    return (
                      <Card key={index} className={`p-4 ${isRefinedSummary ? 'border-2 border-primary' : ''}`}>
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium">
                            {isRefinedSummary ? (
                              <>
                                <Sparkles className="inline h-4 w-4 mr-1" />
                                Síntese Refinada Final
                              </>
                            ) : (
                              <>Etapa {index + 1} - {HIGH_VALUE_WORKFLOWS[selectedWorkflow as keyof typeof HIGH_VALUE_WORKFLOWS].flow[index].task}</>
                            )}
                          </p>
                          {!isRefinedSummary && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => refineStep(index)}
                              disabled={isRefining}
                            >
                              {refinementStep === index && isRefining ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MessageSquare className="h-4 w-4" />
                              )}
                              <span className="ml-2">Refinar</span>
                            </Button>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.success && result.data ? (
                            <pre className="whitespace-pre-wrap max-h-96 overflow-y-auto">{
                              result.data.result?.content || 
                              result.data.data?.result?.content ||
                              JSON.stringify(result.data, null, 2)
                            }</pre>
                          ) : (
                            <p className="text-red-500">Erro: {result.error || 'Erro desconhecido'}</p>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
              
              {showPromptGenerator && results.length > 0 && (
                <Card className="mt-6 p-6 bg-muted/50">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>
                        <FileCode className="inline h-5 w-5 mr-2" />
                        Prompt Completo para VS Code
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPromptGenerator(false)}
                      >
                        ✕
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Copie este prompt otimizado para usar no VS Code ou outras ferramentas de desenvolvimento
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="relative">
                      <Textarea
                        value={generatePromptForVSCode()}
                        readOnly
                        className="font-mono text-sm min-h-[400px] bg-background"
                      />
                      <Button
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(generatePromptForVSCode())}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}