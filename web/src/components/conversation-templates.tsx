'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search,
  Copy,
  Star,
  Clock,
  Code,
  FileText,
  GitBranch,
  Bug,
  Zap,
  Shield,
  Hash,
  Plus
} from 'lucide-react'

interface ConversationTemplate {
  id: string
  title: string
  description: string
  category: 'debug' | 'implement' | 'optimize' | 'security' | 'architecture' | 'learn'
  icon: any
  prompts: {
    initial: string
    followUps: string[]
  }
  tags: string[]
  usageCount: number
  lastUsed?: Date
  isFavorite: boolean
}

const CONVERSATION_TEMPLATES: ConversationTemplate[] = [
  {
    id: 'debug-systematic',
    title: 'Systematic Debug Process',
    description: 'Step-by-step debugging workflow for complex issues',
    category: 'debug',
    icon: Bug,
    prompts: {
      initial: 'I have a bug where {describe the issue}. The expected behavior is {expected}, but I\'m seeing {actual}.',
      followUps: [
        'Can you help me isolate where this is happening?',
        'What logging should I add to trace this?',
        'Are there common causes for this type of issue?',
        'Let\'s create a minimal reproduction'
      ]
    },
    tags: ['debugging', 'troubleshooting', 'systematic'],
    usageCount: 152,
    lastUsed: new Date(Date.now() - 86400000),
    isFavorite: true
  },
  {
    id: 'implement-feature',
    title: 'Feature Implementation',
    description: 'Complete workflow for implementing new features',
    category: 'implement',
    icon: Code,
    prompts: {
      initial: 'I need to implement {feature name}. The requirements are: {list requirements}.',
      followUps: [
        'What\'s the best architecture for this?',
        'Show me similar implementations in the codebase',
        'Help me write tests for this feature',
        'Review my implementation for best practices'
      ]
    },
    tags: ['implementation', 'feature', 'development'],
    usageCount: 89,
    lastUsed: new Date(Date.now() - 172800000),
    isFavorite: true
  },
  {
    id: 'security-review',
    title: 'Security Audit Template',
    description: 'Comprehensive security review process',
    category: 'security',
    icon: Shield,
    prompts: {
      initial: 'Please perform a security review of {file/feature/component}. Focus on {specific concerns if any}.',
      followUps: [
        'Check for common vulnerabilities',
        'Review authentication and authorization',
        'Analyze data validation and sanitization',
        'Suggest security improvements'
      ]
    },
    tags: ['security', 'audit', 'vulnerabilities'],
    usageCount: 67,
    isFavorite: false
  },
  {
    id: 'performance-optimize',
    title: 'Performance Optimization',
    description: 'Identify and fix performance bottlenecks',
    category: 'optimize',
    icon: Zap,
    prompts: {
      initial: 'I need to optimize {component/function/page}. It\'s currently {describe performance issue}.',
      followUps: [
        'Profile and identify bottlenecks',
        'Suggest optimization strategies',
        'Compare different approaches',
        'Measure improvement impact'
      ]
    },
    tags: ['performance', 'optimization', 'speed'],
    usageCount: 103,
    isFavorite: false
  },
  {
    id: 'architecture-decision',
    title: 'Architecture Decision',
    description: 'Make informed architecture choices',
    category: 'architecture',
    icon: GitBranch,
    prompts: {
      initial: 'I need to decide between {option A} and {option B} for {use case}. Key considerations are {list factors}.',
      followUps: [
        'Compare pros and cons',
        'Show real-world examples',
        'Consider scalability implications',
        'Evaluate maintenance burden'
      ]
    },
    tags: ['architecture', 'design', 'decisions'],
    usageCount: 78,
    isFavorite: true
  }
]

interface SnippetLibrary {
  id: string
  title: string
  code: string
  language: string
  description: string
  tags: string[]
  usageCount: number
}

const CODE_SNIPPETS: SnippetLibrary[] = [
  {
    id: 'error-boundary',
    title: 'React Error Boundary',
    code: `class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}`,
    language: 'typescript',
    description: 'Catch JavaScript errors in React component tree',
    tags: ['react', 'error-handling', 'component'],
    usageCount: 45
  },
  {
    id: 'async-retry',
    title: 'Async Function with Retry',
    code: `async function retryAsync(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryAsync(fn, retries - 1, delay * 2);
  }
}`,
    language: 'javascript',
    description: 'Retry failed async operations with exponential backoff',
    tags: ['async', 'error-handling', 'utility'],
    usageCount: 82
  }
]

export function ConversationTemplates() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>(
    CONVERSATION_TEMPLATES.filter(t => t.isFavorite).map(t => t.id)
  )

  const filteredTemplates = CONVERSATION_TEMPLATES.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = !selectedCategory || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const toggleFavorite = (templateId: string) => {
    setFavorites(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // In real app, show toast notification
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Conversation Templates & Snippets</CardTitle>
          <CardDescription>
            Quick-start templates and reusable code snippets to accelerate your workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Create Template
              </Button>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Badge 
                variant={selectedCategory === null ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Badge>
              {['debug', 'implement', 'optimize', 'security', 'architecture', 'learn'].map(category => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversation Starters</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 p-4">
                {filteredTemplates.map(template => {
                  const Icon = template.icon
                  const isFavorite = favorites.includes(template.id)
                  return (
                    <Card key={template.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <h4 className="font-medium">{template.title}</h4>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(template.id)}
                          >
                            <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {template.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {template.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {template.usageCount}
                              </span>
                              {template.lastUsed && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(template.lastUsed).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => copyToClipboard(template.prompts.initial)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Use Template
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Code Snippets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 p-4">
                {CODE_SNIPPETS.map(snippet => (
                  <Card key={snippet.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{snippet.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {snippet.description}
                          </p>
                        </div>
                        <Badge variant="outline">{snippet.language}</Badge>
                      </div>
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto mb-3">
                        <code>{snippet.code}</code>
                      </pre>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {snippet.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(snippet.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}