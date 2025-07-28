'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Brain, Sparkles, GitCompare } from 'lucide-react'

export function ComparisonView({ claudeResult, geminiResult }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <GitCompare className="h-5 w-5" />
        Side-by-Side Comparison
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Claude Result */}
        <Card className="border-claude/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-claude" />
              Claude&apos;s Approach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
              {claudeResult}
            </pre>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Strengths:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                <li>Clean, readable code</li>
                <li>Follows best practices</li>
                <li>Well-commented</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Gemini Result */}
        <Card className="border-gemini/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gemini" />
              Gemini&apos;s Approach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
              {geminiResult}
            </pre>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Strengths:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                <li>Performance optimized</li>
                <li>Modern patterns</li>
                <li>Concise implementation</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unified Solution */}
      <Card className="border-purple-500/30 bg-gradient-to-r from-claude/5 to-gemini/5">
        <CardHeader>
          <CardTitle>🎯 Recommended Approach</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Combining the best of both approaches:
          </p>
          <pre className="bg-background p-4 rounded-lg text-sm">
{`// Best of both worlds
function optimizedSolution() {
  // Claude's clarity + Gemini's performance
  // Implementation here...
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}