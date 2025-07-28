'use client'

import { useState } from 'react'
import { ModernDashboard } from '@/components/modern-dashboard'
import { CommandPalette } from '@/components/ui/command-palette'
import { ThemeSelector } from '@/components/ui/theme-selector'
import { MobileNav } from '@/components/ui/mobile-nav'
import { PremiumToast, ToastContainer } from '@/components/ui/premium-toast'
import { PremiumDialog } from '@/components/ui/premium-dialog'
import { useToastManager } from '@/hooks/use-toast-manager'
import { useIsMobile } from '@/hooks/use-media-query'
import { Button3D } from '@/components/ui/button-3d'
import { ClaudeLogo, GeminiLogo } from '@/components/ui/brand-logos'

export default function DemoPage() {
  const [showDialog, setShowDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const { toasts, showSuccess, showError, showClaude, showGemini } = useToastManager()
  const isMobile = useIsMobile()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-20">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ClaudeLogo size="md" />
              <span className="text-claude-500 font-semibold">Claude</span>
              <span className="text-muted-foreground text-sm">×</span>
              <GeminiLogo size="md" />
              <span className="text-gemini-500 font-semibold">Gemini</span>
              <span className="font-semibold text-lg ml-2">Bridge</span>
            </div>
            <span className="hidden sm:inline-block text-sm text-muted-foreground border-l pl-3">
              Premium Demo
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeSelector />
            
            <div className="flex gap-2">
              <Button3D
                size="sm"
                variant="claude"
                onClick={() => {
                  showClaude('Claude Task Started', 'Processing your request...')
                  setTimeout(() => showSuccess('Task Completed!', 'Claude finished successfully'), 2000)
                }}
              >
                Test Claude
              </Button3D>
              
              <Button3D
                size="sm"
                variant="gemini"
                onClick={() => {
                  showGemini('Gemini Task Started', 'Analyzing data...')
                  setTimeout(() => showSuccess('Analysis Done!', 'Gemini completed the analysis'), 2000)
                }}
              >
                Test Gemini
              </Button3D>
              
              <Button3D
                size="sm"
                variant="danger"
                onClick={() => setShowDialog(true)}
              >
                Test Dialog
              </Button3D>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        {activeTab === 'dashboard' && <ModernDashboard />}
        
        {activeTab === 'other' && (
          <div className="container mx-auto py-8">
            <h1 className="text-4xl font-bold text-center mb-8">
              <span className="text-gradient-claude">Other</span>
              {' '}
              <span className="text-gradient-gemini">Content</span>
            </h1>
            <p className="text-center text-muted-foreground">
              Switch back to Dashboard to see the premium UI
            </p>
          </div>
        )}
      </main>

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNav 
          activeTab={activeTab} 
          onTabChange={(value) => {
            setActiveTab(value === 'workflows' ? 'dashboard' : value)
          }} 
        />
      )}

      {/* Command Palette */}
      <CommandPalette />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} />

      {/* Premium Dialog */}
      <PremiumDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title="Premium Action"
        description="This is a premium dialog with glassmorphism effects. Do you want to proceed?"
        variant="warning"
        confirmText="Proceed"
        cancelText="Cancel"
        onConfirm={async () => {
          showSuccess('Action Confirmed', 'The operation was successful')
        }}
      />
    </div>
  )
}