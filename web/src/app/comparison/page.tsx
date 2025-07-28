'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ComparisonView } from '@/components/comparison/ComparisonView'
import { CollaborativeView } from '@/components/comparison/CollaborativeView'
import { GlassCard } from '@/components/ui/glass-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GitCompare, Users } from 'lucide-react'

// Mock data for development
const mockComparisonData = {
  taskId: 'task-123',
  results: [
    {
      id: 'result-1',
      adapter: 'CLAUDE' as const,
      output: `## Analysis Result

Here's my analysis of the code:

1. **Performance Optimization**
   - The current implementation has O(n²) complexity
   - Consider using a hash map for O(1) lookups
   - Implement caching for repeated calculations

2. **Code Structure**
   - Good separation of concerns
   - Could benefit from extracting utility functions
   - Consider adding more comprehensive error handling

3. **Security Considerations**
   - Input validation is properly implemented
   - API keys are correctly stored in environment variables
   - Rate limiting should be added for production use`,
      executionTime: 2345,
      qualityScore: 0.92,
      createdAt: new Date().toISOString()
    },
    {
      id: 'result-2',
      adapter: 'GEMINI' as const,
      output: `## Code Review Results

I've analyzed your code and here are my findings:

1. **Performance Analysis**
   - Current algorithm complexity: O(n²)
   - Suggested optimization: Use HashMap for constant-time lookups
   - Memory usage could be reduced by 40% with streaming

2. **Architecture Review**
   - Well-structured codebase with clear modules
   - Recommend implementing the Repository pattern
   - Add middleware for cross-cutting concerns

3. **Security Assessment**
   - Environment variables properly configured
   - Missing: Rate limiting and request throttling
   - Consider implementing JWT for authentication`,
      executionTime: 1890,
      qualityScore: 0.88,
      createdAt: new Date().toISOString()
    }
  ],
  comparison: {
    consensus: true,
    similarity: 0.85,
    differences: [
      'Claude mentioned caching, Gemini suggested streaming',
      'Different recommendations for design patterns',
      'Gemini specifically mentioned JWT authentication'
    ],
    bestResult: 'result-1',
    worstResult: 'result-2'
  },
  validation: {
    'result-1': {
      score: 0.92,
      isValid: true,
      criteria: [
        { name: 'completeness', score: 0.95, passed: true },
        { name: 'relevance', score: 0.90, passed: true },
        { name: 'format', score: 0.88, passed: true },
        { name: 'performance', score: 0.94, passed: true }
      ]
    },
    'result-2': {
      score: 0.88,
      isValid: true,
      criteria: [
        { name: 'completeness', score: 0.85, passed: true },
        { name: 'relevance', score: 0.92, passed: true },
        { name: 'format', score: 0.86, passed: true },
        { name: 'performance', score: 0.89, passed: true }
      ]
    }
  }
}

export default function ComparisonPage() {
  const [activeTab, setActiveTab] = useState('comparison')

  const handleCompare = async (taskId: string) => {
    // In production, this would call your API
    await new Promise(resolve => setTimeout(resolve, 2000))
    return mockComparisonData
  }

  const handleCollaborate = async (config: any) => {
    // In production, this would call your API
    await new Promise(resolve => setTimeout(resolve, 3000))
    return {
      taskId: 'task-456',
      mode: config.mode,
      steps: [
        {
          step: 1,
          adapter: 'CLAUDE',
          input: config.prompt,
          output: 'Initial analysis complete. Found 3 optimization opportunities...',
          executionTime: 1234,
          timestamp: new Date().toISOString()
        },
        {
          step: 2,
          adapter: 'GEMINI',
          input: 'Based on Claude\'s analysis...',
          output: 'Expanding on the optimization opportunities with implementation details...',
          executionTime: 1567,
          timestamp: new Date().toISOString()
        },
        {
          step: 3,
          adapter: 'CLAUDE',
          input: 'Reviewing Gemini\'s implementation...',
          output: 'Final recommendations with best practices incorporated...',
          executionTime: 1890,
          timestamp: new Date().toISOString()
        }
      ],
      finalOutput: 'Combined analysis with comprehensive recommendations...',
      totalExecutionTime: 4691,
      consensus: true,
      adaptersUsed: ['CLAUDE', 'GEMINI']
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-2">AI Comparison & Collaboration</h1>
          <p className="text-muted-foreground">
            Compare outputs and collaborate between different AI models
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Comparison
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Collaboration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="mt-6">
            <ComparisonView
              taskId="task-123"
              onCompare={handleCompare}
              initialData={mockComparisonData}
            />
          </TabsContent>

          <TabsContent value="collaboration" className="mt-6">
            <CollaborativeView
              onExecute={handleCollaborate}
              initialPrompt="Analyze this code for performance optimizations and security vulnerabilities"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}