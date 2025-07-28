import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WorkflowStep {
  stepIndex: number
  stepName: string
  ai: string
  task: string
  startTime: Date
  endTime?: Date
  duration?: number
  result?: any
  error?: string
  status: 'pending' | 'executing' | 'completed' | 'failed'
}

export interface WorkflowExecution {
  id: string
  workflowType: string
  workflowTitle: string
  taskDescription: string
  startTime: Date
  endTime?: Date
  duration?: number
  status: 'executing' | 'completed' | 'failed' | 'cancelled'
  steps: WorkflowStep[]
  refinements: {
    stepIndex?: number
    type: 'single' | 'all'
    timestamp: Date
    result?: any
  }[]
  promptExports: {
    timestamp: Date
    format: 'vscode' | 'markdown' | 'json'
    content: string
  }[]
  metadata: {
    userPersona?: string
    orchestrator?: string
    mode?: string
    totalTokensUsed?: number
    estimatedCost?: number
  }
}

export interface WorkflowHistoryFilters {
  workflowType?: string
  status?: WorkflowExecution['status']
  dateFrom?: Date
  dateTo?: Date
  searchQuery?: string
}

interface WorkflowHistoryState {
  executions: WorkflowExecution[]
  currentExecution: WorkflowExecution | null
  filters: WorkflowHistoryFilters
  
  // Actions
  startExecution: (workflowType: string, workflowTitle: string, taskDescription: string) => string
  updateExecutionStep: (executionId: string, stepIndex: number, update: Partial<WorkflowStep>) => void
  completeExecution: (executionId: string, status: WorkflowExecution['status']) => void
  addRefinement: (executionId: string, refinement: WorkflowExecution['refinements'][0]) => void
  addPromptExport: (executionId: string, exportData: WorkflowExecution['promptExports'][0]) => void
  updateMetadata: (executionId: string, metadata: Partial<WorkflowExecution['metadata']>) => void
  
  // Query actions
  setFilters: (filters: WorkflowHistoryFilters) => void
  getFilteredExecutions: () => WorkflowExecution[]
  getExecutionById: (id: string) => WorkflowExecution | undefined
  clearHistory: () => void
  exportHistory: (format: 'json' | 'csv') => string
  
  // Statistics
  getStatistics: () => {
    totalExecutions: number
    successRate: number
    averageDuration: number
    mostUsedWorkflow: string
    totalRefinements: number
    totalExports: number
    executionsByType: Record<string, number>
    executionsByStatus: Record<string, number>
  }
}

const generateId = () => `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const useWorkflowHistoryStore = create<WorkflowHistoryState>()(
  persist(
    (set, get) => ({
      executions: [],
      currentExecution: null,
      filters: {},
      
      startExecution: (workflowType, workflowTitle, taskDescription) => {
        const id = generateId()
        const newExecution: WorkflowExecution = {
          id,
          workflowType,
          workflowTitle,
          taskDescription,
          startTime: new Date(),
          status: 'executing',
          steps: [],
          refinements: [],
          promptExports: [],
          metadata: {}
        }
        
        set((state) => ({
          executions: [...state.executions, newExecution],
          currentExecution: newExecution
        }))
        
        return id
      },
      
      updateExecutionStep: (executionId, stepIndex, update) => {
        set((state) => ({
          executions: state.executions.map(exec => {
            if (exec.id !== executionId) return exec
            
            const steps = [...exec.steps]
            const existingStep = steps.find(s => s.stepIndex === stepIndex)
            
            if (existingStep) {
              Object.assign(existingStep, update)
              if (update.endTime && existingStep.startTime) {
                existingStep.duration = new Date(update.endTime).getTime() - new Date(existingStep.startTime).getTime()
              }
            } else {
              steps.push({
                stepIndex,
                stepName: '',
                ai: '',
                task: '',
                startTime: new Date(),
                status: 'executing',
                ...update
              })
            }
            
            return { ...exec, steps }
          }),
          currentExecution: state.currentExecution?.id === executionId
            ? {
                ...state.currentExecution,
                steps: state.executions.find(e => e.id === executionId)?.steps || []
              }
            : state.currentExecution
        }))
      },
      
      completeExecution: (executionId, status) => {
        set((state) => ({
          executions: state.executions.map(exec => {
            if (exec.id !== executionId) return exec
            
            const endTime = new Date()
            const duration = endTime.getTime() - new Date(exec.startTime).getTime()
            
            return { ...exec, status, endTime, duration }
          }),
          currentExecution: state.currentExecution?.id === executionId ? null : state.currentExecution
        }))
      },
      
      addRefinement: (executionId, refinement) => {
        set((state) => ({
          executions: state.executions.map(exec => {
            if (exec.id !== executionId) return exec
            return { ...exec, refinements: [...exec.refinements, refinement] }
          })
        }))
      },
      
      addPromptExport: (executionId, exportData) => {
        set((state) => ({
          executions: state.executions.map(exec => {
            if (exec.id !== executionId) return exec
            return { ...exec, promptExports: [...exec.promptExports, exportData] }
          })
        }))
      },
      
      updateMetadata: (executionId, metadata) => {
        set((state) => ({
          executions: state.executions.map(exec => {
            if (exec.id !== executionId) return exec
            return { ...exec, metadata: { ...exec.metadata, ...metadata } }
          })
        }))
      },
      
      setFilters: (filters) => set({ filters }),
      
      getFilteredExecutions: () => {
        const { executions, filters } = get()
        
        return executions.filter(exec => {
          if (filters.workflowType && exec.workflowType !== filters.workflowType) return false
          if (filters.status && exec.status !== filters.status) return false
          if (filters.dateFrom && new Date(exec.startTime) < filters.dateFrom) return false
          if (filters.dateTo && new Date(exec.startTime) > filters.dateTo) return false
          if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase()
            return (
              exec.taskDescription.toLowerCase().includes(query) ||
              exec.workflowTitle.toLowerCase().includes(query) ||
              exec.id.toLowerCase().includes(query)
            )
          }
          return true
        }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      },
      
      getExecutionById: (id) => get().executions.find(exec => exec.id === id),
      
      clearHistory: () => set({ executions: [], currentExecution: null }),
      
      exportHistory: (format) => {
        const executions = get().getFilteredExecutions()
        
        if (format === 'json') {
          return JSON.stringify(executions, null, 2)
        } else {
          // CSV format
          const headers = [
            'ID', 'Workflow Type', 'Task Description', 'Start Time', 'End Time',
            'Duration (ms)', 'Status', 'Steps Count', 'Refinements Count', 'Exports Count'
          ]
          
          const rows = executions.map(exec => [
            exec.id,
            exec.workflowType,
            `"${exec.taskDescription.replace(/"/g, '""')}"`,
            exec.startTime.toISOString(),
            exec.endTime?.toISOString() || '',
            exec.duration?.toString() || '',
            exec.status,
            exec.steps.length.toString(),
            exec.refinements.length.toString(),
            exec.promptExports.length.toString()
          ])
          
          return [headers, ...rows].map(row => row.join(',')).join('\n')
        }
      },
      
      getStatistics: () => {
        const executions = get().executions
        const completed = executions.filter(e => e.status === 'completed')
        
        const stats = {
          totalExecutions: executions.length,
          successRate: executions.length > 0 ? (completed.length / executions.length) * 100 : 0,
          averageDuration: completed.length > 0
            ? completed.reduce((sum, e) => sum + (e.duration || 0), 0) / completed.length
            : 0,
          mostUsedWorkflow: '',
          totalRefinements: executions.reduce((sum, e) => sum + e.refinements.length, 0),
          totalExports: executions.reduce((sum, e) => sum + e.promptExports.length, 0),
          executionsByType: {} as Record<string, number>,
          executionsByStatus: {} as Record<string, number>
        }
        
        // Calculate executions by type
        executions.forEach(exec => {
          stats.executionsByType[exec.workflowType] = (stats.executionsByType[exec.workflowType] || 0) + 1
          stats.executionsByStatus[exec.status] = (stats.executionsByStatus[exec.status] || 0) + 1
        })
        
        // Find most used workflow
        if (Object.keys(stats.executionsByType).length > 0) {
          stats.mostUsedWorkflow = Object.entries(stats.executionsByType)
            .sort(([, a], [, b]) => b - a)[0][0]
        }
        
        return stats
      }
    }),
    {
      name: 'workflow-history',
      version: 1,
      partialize: (state) => ({
        executions: state.executions.slice(-100) // Keep only last 100 executions
      })
    }
  )
)