'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  MessageCircle, 
  ArrowRight, 
  RotateCcw,
  Plus,
  Sparkles,
  ChevronRight,
  History,
  Lightbulb,
  Code,
  FileQuestion,
  GitBranch,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConversationStep {
  id: string
  type: 'user' | 'claude' | 'gemini' | 'system'
  content: string
  timestamp: Date
  options?: ConversationOption[]
  metadata?: {
    taskType?: string
    confidence?: number
    suggestedNext?: string[]
  }
}

interface ConversationOption {
  id: string
  label: string
  icon?: any
  action: string
  description?: string
  aiPreference?: 'claude' | 'gemini' | 'both'
}

const COMMON_FOLLOWUPS = {
  explanation: [
    { id: 'explain-more', label: 'Explain in more detail', icon: Lightbulb, action: 'Can you explain this in more detail?' },
    { id: 'example', label: 'Show me an example', icon: Code, action: 'Can you show me a practical example?' },
    { id: 'why', label: 'Why this approach?', icon: FileQuestion, action: 'Why did you choose this approach over alternatives?' }
  ],
  implementation: [
    { id: 'test', label: 'Add tests', icon: GitBranch, action: 'Can you add tests for this code?' },
    { id: 'optimize', label: 'Optimize performance', icon: Zap, action: 'Can you optimize this for better performance?' },
    { id: 'refactor', label: 'Refactor for clarity', icon: Code, action: 'Can you refactor this to be more maintainable?' }
  ],
  debug: [
    { id: 'more-context', label: 'Need more context', icon: MessageCircle, action: 'I need more context about the error' },
    { id: 'try-different', label: 'Try different approach', icon: RotateCcw, action: 'Let\'s try a different approach to solve this' },
    { id: 'step-by-step', label: 'Step by step debug', icon: ChevronRight, action: 'Let\'s debug this step by step' }
  ]
}

export function ConversationFlow() {
  const [conversation, setConversation] = useState<ConversationStep[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  // Analyze conversation context to suggest next steps
  const analyzeContext = (steps: ConversationStep[]): ConversationOption[] => {
    if (steps.length === 0) return []
    
    const lastStep = steps[steps.length - 1]
    const context = steps.slice(-3) // Last 3 messages for context
    
    // Detect conversation type
    const hasCode = context.some(s => s.content.includes('```') || s.content.includes('function') || s.content.includes('class'))
    const hasError = context.some(s => s.content.toLowerCase().includes('error') || s.content.toLowerCase().includes('bug'))
    const isQuestion = lastStep.content.includes('?')
    
    let suggestions: ConversationOption[] = []
    
    if (hasError) {
      suggestions = [...COMMON_FOLLOWUPS.debug]
    } else if (hasCode) {
      suggestions = [...COMMON_FOLLOWUPS.implementation]
    } else if (isQuestion) {
      suggestions = [...COMMON_FOLLOWUPS.explanation]
    }
    
    // Add dynamic suggestions based on AI responses
    if (lastStep.type === 'claude' || lastStep.type === 'gemini') {
      suggestions.push({
        id: 'compare',
        label: 'Compare with other AI',
        icon: Sparkles,
        action: `Ask ${lastStep.type === 'claude' ? 'Gemini' : 'Claude'} for alternative approach`,
        aiPreference: lastStep.type === 'claude' ? 'gemini' : 'claude'
      })
    }
    
    return suggestions
  }

  const handleOptionClick = async (option: ConversationOption) => {
    setIsProcessing(true)
    
    // Add user's follow-up to conversation
    const newStep: ConversationStep = {
      id: `step-${Date.now()}`,
      type: 'user',
      content: option.action,
      timestamp: new Date()
    }
    
    setConversation(prev => [...prev, newStep])
    
    // Simulate AI response (in real app, this would call the API)
    setTimeout(() => {
      const aiResponse: ConversationStep = {
        id: `step-${Date.now() + 1}`,
        type: (option.aiPreference === 'both' ? 'claude' : option.aiPreference) || 'claude',
        content: `Processing: ${option.action}...`,
        timestamp: new Date(),
        options: analyzeContext([...conversation, newStep])
      }
      
      setConversation(prev => [...prev, aiResponse])
      setIsProcessing(false)
    }, 1000)
  }

  const startNewConversation = () => {
    setConversation([
      {
        id: 'welcome',
        type: 'system',
        content: 'Welcome! I\'m here to help you navigate through your development tasks. What would you like to work on?',
        timestamp: new Date(),
        options: [
          { id: 'debug', label: 'Debug an issue', icon: GitBranch, action: 'I need help debugging an issue' },
          { id: 'implement', label: 'Implement a feature', icon: Code, action: 'I want to implement a new feature' },
          { id: 'optimize', label: 'Optimize performance', icon: Zap, action: 'I need to optimize my code' },
          { id: 'learn', label: 'Learn something new', icon: Lightbulb, action: 'I want to learn about a concept' }
        ]
      }
    ])
  }

  useEffect(() => {
    if (conversation.length === 0) {
      startNewConversation()
    }
  }, [])

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Interactive Conversation Flow
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={startNewConversation}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Conversation
          </Button>
        </CardTitle>
        <CardDescription>
          Never get stuck - always have next steps to continue your workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            <AnimatePresence>
              {conversation.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-2">
                    <div className={`flex items-start gap-3 ${
                      step.type === 'user' ? 'justify-end' : ''
                    }`}>
                      <div className={`max-w-[80%] ${
                        step.type === 'user' ? 'order-2' : ''
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={step.type === 'claude' ? 'claude' : step.type === 'gemini' ? 'gemini' : 'secondary'}>
                            {step.type === 'system' ? 'System' : step.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {step.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className={`rounded-lg p-4 ${
                          step.type === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          {step.content}
                        </div>
                      </div>
                    </div>
                    
                    {step.options && step.options.length > 0 && index === conversation.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="ml-12 space-y-2"
                      >
                        <p className="text-sm text-muted-foreground mb-2">
                          Suggested next steps:
                        </p>
                        <div className="grid gap-2">
                          {step.options.map(option => {
                            const Icon = option.icon || ArrowRight
                            return (
                              <Button
                                key={option.id}
                                variant="outline"
                                className="justify-start text-left h-auto py-3"
                                onClick={() => handleOptionClick(option)}
                                disabled={isProcessing}
                              >
                                <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="font-medium">{option.label}</div>
                                  {option.description && (
                                    <div className="text-xs text-muted-foreground">
                                      {option.description}
                                    </div>
                                  )}
                                </div>
                                {option.aiPreference && (
                                  <Badge variant={option.aiPreference === 'claude' ? 'claude' : 'gemini'} className="ml-2">
                                    {option.aiPreference}
                                  </Badge>
                                )}
                              </Button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </div>
                  {index < conversation.length - 1 && <Separator className="my-4" />}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                Processing...
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}