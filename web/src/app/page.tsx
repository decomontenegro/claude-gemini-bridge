'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { TaskExecutor } from '@/components/task-executor'
import { ModernDashboard } from '@/components/modern-dashboard'
import { ConfigPanel } from '@/components/config-panel'
import { TutorialMode } from '@/components/tutorial-mode'
import { Header } from '@/components/header'
import { useUserStore } from '@/store/user-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Zap, 
  Settings, 
  BarChart3, 
  PlayCircle,
  GraduationCap,
  History,
  Code2,
  Brain,
  Sparkles,
  Workflow,
  Shield,
  MessageCircle
} from 'lucide-react'
import { SmartWorkflows } from '@/components/smart-workflows'
import { InsightsPanel } from '@/components/insights-panel'
import { ConversationFlow } from '@/components/conversation-flow'
import { ContextAwareAssistant } from '@/components/context-aware-assistant'
import { ConversationTemplates } from '@/components/conversation-templates'
import { WorkflowHistory } from '@/components/workflow-history'
import { ParticleBackground } from '@/components/ui/particle-background'
import { MobileNav } from '@/components/ui/mobile-nav'
import { useIsMobile } from '@/hooks/use-media-query'
import { ClaudeLogo, GeminiLogo } from '@/components/ui/brand-logos'

export default function Home() {
  const { persona, preferences } = useUserStore()
  const [showTutorial, setShowTutorial] = useState(persona === 'newbie')
  const [activeTab, setActiveTab] = useState('workflows')
  const isMobile = useIsMobile()

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <Header />
      
      <main id="main-content" className="container mx-auto py-6 px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {showTutorial && persona === 'newbie' && (
            <TutorialMode onComplete={() => setShowTutorial(false)} />
          )}

          <div className="mb-8 text-center">
            <h1 className="text-4xl font-display font-bold mb-4 flex items-center justify-center gap-3">
              <ClaudeLogo size="xl" />
              <span className="text-claude-500">Claude</span>
              <span className="text-muted-foreground">×</span>
              <GeminiLogo size="xl" />
              <span className="text-gemini-500">Gemini</span>
              <span className="text-foreground ml-2">Bridge</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Orchestrate the power of two AI assistants
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {!isMobile && (
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
              <TabsTrigger value="workflows" className="flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                Workflows
              </TabsTrigger>
              <TabsTrigger value="execute" className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                Execute
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Config
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="learn" className="flex items-center gap-2 hidden lg:flex">
                <Brain className="h-4 w-4" />
                Learning
              </TabsTrigger>
              <TabsTrigger value="tutorial" className="flex items-center gap-2 hidden lg:flex">
                <GraduationCap className="h-4 w-4" />
                Tutorial
              </TabsTrigger>
              <TabsTrigger value="flow" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Flow
              </TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="workflows" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SmartWorkflows />
                </div>
                <div>
                  <InsightsPanel />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="execute" className="space-y-6">
              <TaskExecutor />
            </TabsContent>

            <TabsContent value="dashboard" className="space-y-6">
              <ModernDashboard />
            </TabsContent>

            <TabsContent value="config" className="space-y-6">
              <ConfigPanel />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <WorkflowHistory />
            </TabsContent>

            <TabsContent value="learn" className="space-y-6">
              <div className="text-center py-20">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Learning insights coming soon...</p>
              </div>
            </TabsContent>

            <TabsContent value="tutorial" className="space-y-6">
              <TutorialMode onComplete={() => {}} />
            </TabsContent>

            <TabsContent value="flow" className="space-y-6">
              <ConversationTemplates />
              <div className="grid lg:grid-cols-2 gap-6">
                <ConversationFlow />
                <ContextAwareAssistant />
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      
      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  )
}