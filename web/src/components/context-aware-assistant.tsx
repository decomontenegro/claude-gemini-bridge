'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Brain,
  Sparkles,
  FileText,
  Code,
  GitBranch,
  MessageSquare,
  TrendingUp,
  Target,
  Layers,
  BookOpen
} from 'lucide-react'

interface ContextualSuggestion {
  id: string
  type: 'question' | 'action' | 'resource' | 'workflow'
  title: string
  description: string
  icon: any
  priority: 'high' | 'medium' | 'low'
  aiRecommendation?: 'claude' | 'gemini' | 'both'
  command?: string
}

interface ConversationContext {
  topic: string
  phase: 'exploration' | 'implementation' | 'debugging' | 'optimization' | 'review'
  complexity: 'simple' | 'moderate' | 'complex'
  userGoal?: string
  currentBlockers?: string[]
  progress: number
}

const CONTEXTUAL_PATTERNS = {
  exploration: {
    suggestions: [
      {
        id: 'understand-codebase',
        type: 'action',
        title: 'Map the codebase structure',
        description: 'Get an overview of the project architecture',
        icon: Layers,
        priority: 'high',
        aiRecommendation: 'both',
        command: 'Analyze the project structure and create a mental map of key components'
      },
      {
        id: 'find-examples',
        type: 'resource',
        title: 'Find similar implementations',
        description: 'Search for patterns in existing code',
        icon: FileText,
        priority: 'medium',
        aiRecommendation: 'gemini',
        command: 'Search for similar features or patterns in the codebase'
      }
    ],
    blockerSolutions: {
      'not sure where to start': [
        'Let me help you break down the task into smaller steps',
        'First, let\'s understand what already exists in the codebase'
      ],
      'too many options': [
        'Let\'s evaluate the pros and cons of each approach',
        'I can help you create a decision matrix'
      ]
    }
  },
  implementation: {
    suggestions: [
      {
        id: 'write-tests-first',
        type: 'workflow',
        title: 'Start with test cases',
        description: 'Define expected behavior before coding',
        icon: GitBranch,
        priority: 'high',
        aiRecommendation: 'claude',
        command: 'Help me write test cases for this feature'
      },
      {
        id: 'check-patterns',
        type: 'action',
        title: 'Follow existing patterns',
        description: 'Maintain consistency with codebase conventions',
        icon: Code,
        priority: 'high',
        aiRecommendation: 'both',
        command: 'Show me the coding patterns used in similar features'
      }
    ],
    blockerSolutions: {
      'unclear requirements': [
        'Let\'s clarify the requirements with specific questions',
        'I\'ll help you create a feature specification'
      ],
      'technical challenge': [
        'Let\'s explore multiple implementation approaches',
        'I can research best practices for this specific challenge'
      ]
    }
  },
  debugging: {
    suggestions: [
      {
        id: 'systematic-debug',
        type: 'workflow',
        title: 'Systematic debugging approach',
        description: 'Step-by-step isolation of the issue',
        icon: Target,
        priority: 'high',
        aiRecommendation: 'both',
        command: 'Let\'s debug this systematically - first reproduce, then isolate'
      },
      {
        id: 'check-similar-issues',
        type: 'resource',
        title: 'Search for similar issues',
        description: 'Look for related problems and solutions',
        icon: MessageSquare,
        priority: 'medium',
        aiRecommendation: 'gemini',
        command: 'Search for similar error messages or symptoms'
      }
    ],
    blockerSolutions: {
      'cannot reproduce': [
        'Let\'s gather more information about the environment',
        'I\'ll help you add detailed logging to trace the issue'
      ],
      'intermittent issue': [
        'We need to identify patterns in when it occurs',
        'Let\'s add monitoring to catch it in action'
      ]
    }
  }
}

export function ContextAwareAssistant() {
  const [context, setContext] = useState<ConversationContext>({
    topic: '',
    phase: 'exploration',
    complexity: 'simple',
    progress: 0
  })
  const [userInput, setUserInput] = useState('')
  const [suggestions, setSuggestions] = useState<ContextualSuggestion[]>([])

  const analyzeUserIntent = useCallback((input: string) => {
    const lowerInput = input.toLowerCase()
    
    // Detect phase
    let phase: ConversationContext['phase'] = 'exploration'
    if (lowerInput.includes('implement') || lowerInput.includes('build') || lowerInput.includes('create')) {
      phase = 'implementation'
    } else if (lowerInput.includes('error') || lowerInput.includes('bug') || lowerInput.includes('fix')) {
      phase = 'debugging'
    } else if (lowerInput.includes('optimize') || lowerInput.includes('performance')) {
      phase = 'optimization'
    } else if (lowerInput.includes('review') || lowerInput.includes('check')) {
      phase = 'review'
    }
    
    // Detect complexity
    let complexity: ConversationContext['complexity'] = 'simple'
    if (lowerInput.includes('complex') || lowerInput.includes('architecture') || lowerInput.includes('system')) {
      complexity = 'complex'
    } else if (lowerInput.includes('integrate') || lowerInput.includes('multiple')) {
      complexity = 'moderate'
    }
    
    // Extract blockers
    const blockers: string[] = []
    if (lowerInput.includes('not sure') || lowerInput.includes("don't know")) {
      blockers.push('not sure where to start')
    }
    if (lowerInput.includes('stuck') || lowerInput.includes('blocked')) {
      blockers.push('technical challenge')
    }
    if (lowerInput.includes('error') || lowerInput.includes('failing')) {
      blockers.push('cannot reproduce')
    }
    
    setContext({
      topic: input.slice(0, 50) + '...',
      phase,
      complexity,
      userGoal: input,
      currentBlockers: blockers,
      progress: 10
    })
    
    // Generate contextual suggestions
    const phaseData = CONTEXTUAL_PATTERNS[phase as keyof typeof CONTEXTUAL_PATTERNS]
    if (phaseData) {
      setSuggestions(phaseData.suggestions as ContextualSuggestion[])
    }
  }, [])

  const handleSuggestionClick = (suggestion: ContextualSuggestion) => {
    // In real app, this would execute the command
    console.log('Executing:', suggestion.command)
    setContext(prev => ({ ...prev, progress: prev.progress + 20 }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Context-Aware Assistant
          </CardTitle>
          <CardDescription>
            I understand where you are in your journey and suggest next steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">What are you working on?</label>
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Describe what you're trying to accomplish..."
              className="mt-2"
              rows={3}
            />
            <Button 
              className="mt-2" 
              onClick={() => analyzeUserIntent(userInput)}
              disabled={!userInput.trim()}
            >
              Analyze Context
            </Button>
          </div>
          
          {context.userGoal && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{context.phase}</Badge>
                    <Badge variant={context.complexity === 'complex' ? 'destructive' : context.complexity === 'moderate' ? 'secondary' : 'default'}>
                      {context.complexity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Progress: {context.progress}%</p>
                </div>
                <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${context.progress}%` }}
                  />
                </div>
              </div>
              
              {context.currentBlockers && context.currentBlockers.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <strong>Detected blockers:</strong>
                    <ul className="mt-2 space-y-1">
                      {context.currentBlockers.map(blocker => (
                        <li key={blocker} className="text-sm">• {blocker}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Intelligent Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="suggested" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="suggested">Suggested</TabsTrigger>
                <TabsTrigger value="alternative">Alternative</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>
              
              <TabsContent value="suggested" className="space-y-3 mt-4">
                {suggestions.filter(s => s.priority === 'high').map(suggestion => {
                  const Icon = suggestion.icon
                  return (
                    <Card 
                      key={suggestion.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{suggestion.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {suggestion.description}
                            </p>
                            {suggestion.aiRecommendation && (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={suggestion.aiRecommendation === 'claude' ? 'claude' : suggestion.aiRecommendation === 'gemini' ? 'gemini' : 'default'}>
                                  {suggestion.aiRecommendation === 'both' ? 'Both AIs' : suggestion.aiRecommendation}
                                </Badge>
                                <span className="text-xs text-muted-foreground">recommended</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </TabsContent>
              
              <TabsContent value="alternative" className="space-y-3 mt-4">
                {suggestions.filter(s => s.priority !== 'high').map(suggestion => {
                  const Icon = suggestion.icon
                  return (
                    <Button
                      key={suggestion.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {suggestion.title}
                    </Button>
                  )
                })}
              </TabsContent>
              
              <TabsContent value="resources" className="space-y-3 mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3" />
                  <p>Contextual resources will appear here based on your current task</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}