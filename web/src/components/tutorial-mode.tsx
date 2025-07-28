'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, 
  ChevronLeft,
  Brain,
  Sparkles,
  Zap,
  Code,
  Settings,
  BarChart3,
  CheckCircle,
  PlayCircle,
  BookOpen
} from 'lucide-react'

interface TutorialStep {
  title: string
  description: string
  content: React.ReactNode
  icon: React.ReactNode
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Claude-Gemini Bridge!",
    description: "Let's take a quick tour to get you started",
    icon: <Zap className="h-6 w-6" />,
    content: (
      <div className="space-y-4">
        <p>This platform combines the power of two AI assistants:</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3 p-4 bg-claude/10 rounded-lg">
            <Brain className="h-8 w-8 text-claude" />
            <div>
              <h4 className="font-semibold">Claude</h4>
              <p className="text-sm text-muted-foreground">Expert at code and analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gemini/10 rounded-lg">
            <Sparkles className="h-8 w-8 text-gemini" />
            <div>
              <h4 className="font-semibold">Gemini</h4>
              <p className="text-sm text-muted-foreground">Great with search and multimodal</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Creating Your First Task",
    description: "Learn how to execute tasks with intelligent orchestration",
    icon: <PlayCircle className="h-6 w-6" />,
    content: (
      <div className="space-y-4">
        <p>To create a task:</p>
        <ol className="space-y-3">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">1</span>
            <div>
              <p className="font-medium">Choose a task type</p>
              <p className="text-sm text-muted-foreground">Code, search, multimodal, analysis, or validation</p>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">2</span>
            <div>
              <p className="font-medium">Select orchestrator</p>
              <p className="text-sm text-muted-foreground">Auto mode intelligently picks the best CLI</p>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">3</span>
            <div>
              <p className="font-medium">Describe your task</p>
              <p className="text-sm text-muted-foreground">Be specific about what you want to achieve</p>
            </div>
          </li>
        </ol>
      </div>
    )
  },
  {
    title: "Understanding Task Types",
    description: "Each type is optimized for specific use cases",
    icon: <Code className="h-6 w-6" />,
    content: (
      <div className="space-y-3">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Code className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <p className="font-medium">Code</p>
              <p className="text-sm text-muted-foreground">Generate, edit, or review code</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium">Search</p>
              <p className="text-sm text-muted-foreground">Find information from web or codebase</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-medium">Multimodal</p>
              <p className="text-sm text-muted-foreground">Process images, PDFs, or other media</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Analysis</p>
              <p className="text-sm text-muted-foreground">Analyze code, data, or systems</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Monitoring Performance",
    description: "Track your usage and optimize with insights",
    icon: <BarChart3 className="h-6 w-6" />,
    content: (
      <div className="space-y-4">
        <p>The Dashboard shows:</p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Success rates for each CLI</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Task execution times</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>AI-powered recommendations</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Usage patterns and trends</span>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          The system learns from your usage to improve suggestions over time!
        </p>
      </div>
    )
  },
  {
    title: "Configuring Your Experience",
    description: "Personalize the bridge to match your workflow",
    icon: <Settings className="h-6 w-6" />,
    content: (
      <div className="space-y-4">
        <p>In the Config section, you can:</p>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-sm">Choose Your Persona</p>
            <p className="text-sm text-muted-foreground">From newbie to enterprise engineer</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-sm">Set Preferences</p>
            <p className="text-sm text-muted-foreground">Verbosity, automation level, and more</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-sm">Configure API Keys</p>
            <p className="text-sm text-muted-foreground">Connect your Claude and Gemini accounts</p>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "You're Ready to Go!",
    description: "Start creating with AI-powered assistance",
    icon: <CheckCircle className="h-6 w-6" />,
    content: (
      <div className="space-y-4 text-center">
        <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <p className="text-lg font-semibold">Congratulations!</p>
        <p>You now know the basics of Claude-Gemini Bridge.</p>
        <div className="pt-4">
          <p className="text-sm text-muted-foreground">
            Remember: You can always return to this tutorial from the Tutorial tab.
          </p>
        </div>
      </div>
    )
  }
]

interface TutorialModeProps {
  onComplete: () => void
}

export function TutorialMode({ onComplete }: TutorialModeProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  const step = tutorialSteps[currentStep]

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {step.icon}
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {tutorialSteps.length}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip Tutorial
          </Button>
        </div>
        <Progress value={progress} className="mb-4" />
        <CardTitle>{step.title}</CardTitle>
        <CardDescription>{step.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step.content}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button onClick={handleNext}>
            {currentStep === tutorialSteps.length - 1 ? (
              <>
                Complete
                <CheckCircle className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}