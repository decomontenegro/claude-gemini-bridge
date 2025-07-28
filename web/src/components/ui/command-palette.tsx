'use client'

import * as React from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Zap, 
  Code, 
  Brain, 
  Shield, 
  Building, 
  Bug,
  GraduationCap,
  RefreshCw,
  Settings,
  History,
  MessageSquare,
  Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from './glass-card'
import { useWorkflowHistoryStore } from '@/store/workflow-history-store'

interface CommandPaletteProps {
  children?: React.ReactNode
}

export function CommandPalette({ children }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { executions } = useWorkflowHistoryStore()
  
  // Toggle command palette with Cmd+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])
  
  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])
  
  const actions = [
    {
      id: 'execute-code',
      name: 'Execute Code Task',
      icon: Code,
      shortcut: '⌘E',
      action: () => router.push('/?tab=execute&type=code')
    },
    {
      id: 'execute-search',
      name: 'Execute Search Task',
      icon: Search,
      shortcut: '⌘S',
      action: () => router.push('/?tab=execute&type=search')
    },
    {
      id: 'ultrathink',
      name: 'Ultra Think Mode',
      icon: Brain,
      shortcut: '⌘U',
      action: () => router.push('/?tab=execute&type=ultrathink')
    },
    {
      id: 'workflow-security',
      name: 'Security Review Workflow',
      icon: Shield,
      action: () => router.push('/?tab=workflows&workflow=securityReview')
    },
    {
      id: 'workflow-architecture',
      name: 'Architecture Planning',
      icon: Building,
      action: () => router.push('/?tab=workflows&workflow=architectureDecision')
    },
    {
      id: 'workflow-debug',
      name: 'Complex Debug Workflow',
      icon: Bug,
      action: () => router.push('/?tab=workflows&workflow=complexDebug')
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Settings,
      shortcut: '⌘,',
      action: () => router.push('/?tab=config')
    },
    {
      id: 'history',
      name: 'View History',
      icon: History,
      shortcut: '⌘H',
      action: () => router.push('/?tab=history')
    }
  ]
  
  const recentExecutions = executions.slice(0, 3)
  
  return (
    <>
      {children}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            
            {/* Command Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ 
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
              className="fixed inset-x-0 top-[20vh] mx-auto max-w-2xl z-50 px-4"
            >
              <GlassCard className="overflow-hidden">
                <Command className="bg-transparent">
                  <div className="flex items-center px-4 py-3 border-b border-white/10">
                    <Search className="w-5 h-5 text-white/50 mr-3" />
                    <Command.Input
                      placeholder="Type a command or search..."
                      className="flex-1 bg-transparent outline-none text-white placeholder:text-white/50"
                    />
                    <kbd className="px-2 py-1 text-xs rounded bg-white/10 text-white/70">
                      ESC
                    </kbd>
                  </div>
                  
                  <Command.List className="max-h-[400px] overflow-y-auto p-2">
                    <Command.Empty className="px-4 py-8 text-center text-white/50">
                      No results found.
                    </Command.Empty>
                    
                    {/* Quick Actions */}
                    <Command.Group heading="Quick Actions" className="px-2 py-2">
                      <div className="text-xs text-white/50 uppercase tracking-wider mb-2 px-2">
                        Quick Actions
                      </div>
                      {actions.map((action) => (
                        <Command.Item
                          key={action.id}
                          value={action.name}
                          onSelect={() => runCommand(action.action)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors mb-1"
                        >
                          <div className="flex items-center gap-3">
                            <action.icon className="w-4 h-4 text-white/70" />
                            <span className="text-white/90">{action.name}</span>
                          </div>
                          {action.shortcut && (
                            <kbd className="px-2 py-1 text-xs rounded bg-white/10 text-white/50">
                              {action.shortcut}
                            </kbd>
                          )}
                        </Command.Item>
                      ))}
                    </Command.Group>
                    
                    {/* Recent Executions */}
                    {recentExecutions.length > 0 && (
                      <Command.Group heading="Recent" className="px-2 py-2 mt-4">
                        <div className="text-xs text-white/50 uppercase tracking-wider mb-2 px-2">
                          Recent
                        </div>
                        {recentExecutions.map((execution) => (
                          <Command.Item
                            key={execution.id}
                            value={`${execution.workflowTitle} ${execution.taskDescription}`}
                            onSelect={() => runCommand(() => {
                              router.push('/?tab=history')
                            })}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors mb-1"
                          >
                            <MessageSquare className="w-4 h-4 text-white/70" />
                            <div className="flex-1 min-w-0">
                              <div className="text-white/90 text-sm truncate">
                                {execution.workflowTitle}
                              </div>
                              <div className="text-white/50 text-xs truncate">
                                {execution.taskDescription}
                              </div>
                            </div>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}
                  </Command.List>
                  
                  <div className="border-t border-white/10 px-4 py-2 flex items-center justify-between text-xs text-white/50">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10">↑↓</kbd>
                        Navigate
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10">↵</kbd>
                        Select
                      </span>
                    </div>
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI-Powered Search
                    </span>
                  </div>
                </Command>
              </GlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}