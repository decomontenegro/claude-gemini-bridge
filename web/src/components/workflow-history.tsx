'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useWorkflowHistoryStore } from '@/store/workflow-history-store'
import { HIGH_VALUE_WORKFLOWS } from '@/lib/high-value-workflows'
import {
  Download,
  Filter,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart,
  FileText,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Activity,
  TrendingUp,
  FileJson,
  FileSpreadsheet
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WorkflowHistoryProps {
  onSelectExecution?: (executionId: string) => void
}

export function WorkflowHistory({ onSelectExecution }: WorkflowHistoryProps) {
  const { toast } = useToast()
  const [expandedExecutions, setExpandedExecutions] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [showStatistics, setShowStatistics] = useState(true)
  
  const {
    filters,
    setFilters,
    getFilteredExecutions,
    clearHistory,
    exportHistory,
    getStatistics
  } = useWorkflowHistoryStore()
  
  const executions = useMemo(() => getFilteredExecutions(), [getFilteredExecutions, filters])
  const statistics = useMemo(() => getStatistics(), [getStatistics, executions])
  
  const toggleExpanded = (executionId: string) => {
    setExpandedExecutions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(executionId)) {
        newSet.delete(executionId)
      } else {
        newSet.add(executionId)
      }
      return newSet
    })
  }
  
  const handleExport = (format: 'json' | 'csv') => {
    try {
      const data = exportHistory(format)
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workflow-history-${format}-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Exportação concluída",
        description: `Histórico exportado como ${format.toUpperCase()}`,
      })
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o histórico",
        variant: "destructive"
      })
    }
  }
  
  const handleClearHistory = () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.')) {
      clearHistory()
      toast({
        title: "Histórico limpo",
        description: "Todo o histórico foi removido",
      })
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'executing':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-700'
      case 'failed': return 'bg-red-500/10 text-red-700'
      case 'executing': return 'bg-blue-500/10 text-blue-700'
      default: return 'bg-yellow-500/10 text-yellow-700'
    }
  }
  
  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">📊 Histórico de Workflows</h2>
          <p className="text-muted-foreground">
            Acompanhe todas as execuções, refinamentos e exportações
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStatistics(!showStatistics)}
          >
            <BarChart className="h-4 w-4 mr-2" />
            Estatísticas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
          >
            <FileJson className="h-4 w-4 mr-2" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>
      
      {showStatistics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estatísticas de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total de Execuções</p>
                <p className="text-2xl font-bold">{statistics.totalExecutions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">{statistics.successRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duração Média</p>
                <p className="text-2xl font-bold">{formatDuration(statistics.averageDuration)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Refinamentos</p>
                <p className="text-2xl font-bold">{statistics.totalRefinements}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Exportações</p>
                <p className="text-2xl font-bold">{statistics.totalExports}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Workflow Mais Usado</p>
                <p className="text-lg font-bold truncate">
                  {statistics.mostUsedWorkflow ? 
                    HIGH_VALUE_WORKFLOWS[statistics.mostUsedWorkflow as keyof typeof HIGH_VALUE_WORKFLOWS]?.title || statistics.mostUsedWorkflow
                    : '-'
                  }
                </p>
              </div>
            </div>
            
            {Object.keys(statistics.executionsByType).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Execuções por Tipo</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statistics.executionsByType).map(([type, count]) => (
                    <Badge key={type} variant="secondary">
                      {HIGH_VALUE_WORKFLOWS[type as keyof typeof HIGH_VALUE_WORKFLOWS]?.title || type}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="filter-workflow">Tipo de Workflow</Label>
                <Select
                  value={filters.workflowType || ''}
                  onValueChange={(value) => setFilters({ ...filters, workflowType: value || undefined })}
                >
                  <SelectTrigger id="filter-workflow">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {Object.entries(HIGH_VALUE_WORKFLOWS).map(([key, workflow]) => (
                      <SelectItem key={key} value={key}>
                        {workflow.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="filter-status">Status</Label>
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) => setFilters({ ...filters, status: value as any || undefined })}
                >
                  <SelectTrigger id="filter-status">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                    <SelectItem value="executing">Executando</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="filter-search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="filter-search"
                    placeholder="Buscar por descrição..."
                    value={filters.searchQuery || ''}
                    onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({})}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <ScrollArea className="h-[600px] rounded-md border">
        <div className="p-4 space-y-4">
          {executions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma execução encontrada</p>
              <p className="text-sm mt-2">Execute um workflow para começar a rastrear o histórico</p>
            </div>
          ) : (
            executions.map((execution) => (
              <Card key={execution.id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpanded(execution.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {expandedExecutions.has(execution.id) ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                        <CardTitle className="text-base">
                          {execution.workflowTitle}
                        </CardTitle>
                        {getStatusIcon(execution.status)}
                        <Badge className={getStatusColor(execution.status)}>
                          {execution.status}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {execution.taskDescription}
                      </CardDescription>
                    </div>
                    
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(execution.startTime), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(execution.duration)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {expandedExecutions.has(execution.id) && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    
                    <div className="space-y-4">
                      {/* Steps */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Etapas ({execution.steps.length})
                        </h4>
                        <div className="space-y-2">
                          {execution.steps.map((step) => (
                            <div key={step.stepIndex} className="flex items-center gap-3 text-sm">
                              {getStatusIcon(step.status)}
                              <span className="font-medium">Etapa {step.stepIndex + 1}:</span>
                              <span className="text-muted-foreground">{step.task}</span>
                              <Badge variant="outline" className="ml-auto">
                                {step.ai}
                              </Badge>
                              <span className="text-muted-foreground">
                                {formatDuration(step.duration)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Refinements */}
                      {execution.refinements.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Refinamentos ({execution.refinements.length})
                          </h4>
                          <div className="space-y-1">
                            {execution.refinements.map((ref, index) => (
                              <div key={index} className="text-sm text-muted-foreground">
                                {ref.type === 'all' ? 'Todos os resultados' : `Etapa ${(ref.stepIndex || 0) + 1}`} - 
                                {' '}{formatDistanceToNow(new Date(ref.timestamp), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Exports */}
                      {execution.promptExports.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Exportações ({execution.promptExports.length})
                          </h4>
                          <div className="space-y-1">
                            {execution.promptExports.map((exp, index) => (
                              <div key={index} className="text-sm text-muted-foreground">
                                Formato {exp.format.toUpperCase()} - 
                                {' '}{formatDistanceToNow(new Date(exp.timestamp), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        {onSelectExecution && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSelectExecution(execution.id)}
                          >
                            Ver Detalhes
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const data = JSON.stringify(execution, null, 2)
                            const blob = new Blob([data], { type: 'application/json' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `workflow-${execution.id}.json`
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                            URL.revokeObjectURL(url)
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Exportar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}