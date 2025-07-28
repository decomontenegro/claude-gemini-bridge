'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Lightbulb, Target, Brain, Sparkles } from 'lucide-react'

export function InsightsPanel() {
  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          AI Insights Based on Your Usage
        </CardTitle>
        <CardDescription>
          Personalized recommendations to maximize your productivity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Insight 1 */}
        <div className="flex items-start gap-3 p-3 bg-background/60 rounded-lg">
          <Brain className="h-5 w-5 text-claude mt-0.5" />
          <div>
            <p className="font-medium text-sm">Claude excels at your refactoring tasks</p>
            <p className="text-xs text-muted-foreground">
              90% success rate when you ask for code improvements
            </p>
          </div>
        </div>

        {/* Insight 2 */}
        <div className="flex items-start gap-3 p-3 bg-background/60 rounded-lg">
          <Sparkles className="h-5 w-5 text-gemini mt-0.5" />
          <div>
            <p className="font-medium text-sm">Use Gemini for architecture questions</p>
            <p className="text-xs text-muted-foreground">
              It provides more comprehensive system design insights
            </p>
          </div>
        </div>

        {/* Insight 3 */}
        <div className="flex items-start gap-3 p-3 bg-background/60 rounded-lg">
          <Target className="h-5 w-5 text-green-500 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Try Hybrid mode for debugging</p>
            <p className="text-xs text-muted-foreground">
              Users report 40% faster bug resolution with both AIs
            </p>
          </div>
        </div>

        {/* Personal Pattern */}
        <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-claude/10 to-gemini/10 rounded-lg">
          <TrendingUp className="h-5 w-5 text-purple-500 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Your productivity peak: 2-4 PM</p>
            <p className="text-xs text-muted-foreground">
              You complete complex tasks 2x faster during this time
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}