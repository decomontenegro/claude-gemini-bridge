'use client'

import { GlassCard } from '@/components/ui/glass-card'
import { Button3D } from '@/components/ui/button-3d'
import { PremiumLoader } from '@/components/ui/premium-loader'
import { ParticleBackground } from '@/components/ui/particle-background'
import { ClaudeLogo, GeminiLogo } from '@/components/ui/brand-logos'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <ParticleBackground />
      
      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold mb-8 flex items-center justify-center gap-3">
          <ClaudeLogo size="xl" />
          <span className="text-claude-500">Claude</span>
          <span className="text-muted-foreground">×</span>
          <GeminiLogo size="xl" />
          <span className="text-gemini-500">Gemini</span>
          <span className="ml-2">Test Page</span>
        </h1>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Glass Cards</h2>
          <div className="grid grid-cols-3 gap-4">
            <GlassCard className="p-6">
              <h3 className="font-semibold mb-2">Default Glass</h3>
              <p className="text-sm text-muted-foreground">This is a glass card</p>
            </GlassCard>
            
            <GlassCard variant="claude" className="p-6">
              <h3 className="font-semibold mb-2">Claude Glass</h3>
              <p className="text-sm text-muted-foreground">Claude variant</p>
            </GlassCard>
            
            <GlassCard variant="gemini" className="p-6">
              <h3 className="font-semibold mb-2">Gemini Glass</h3>
              <p className="text-sm text-muted-foreground">Gemini variant</p>
            </GlassCard>
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">3D Buttons</h2>
          <div className="flex gap-4">
            <Button3D>Default</Button3D>
            <Button3D variant="claude">Claude</Button3D>
            <Button3D variant="gemini">Gemini</Button3D>
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Loaders</h2>
          <div className="flex gap-8">
            <PremiumLoader size="sm" variant="claude" />
            <PremiumLoader size="md" variant="hybrid" text="Loading..." />
            <PremiumLoader size="lg" variant="gemini" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">CSS Classes Test</h2>
          <div className="space-y-2">
            <div className="bg-claude-500 text-white p-2 rounded">bg-claude-500</div>
            <div className="bg-gemini-500 text-white p-2 rounded">bg-gemini-500</div>
            <div className="bg-gradient-to-r from-claude-500 to-gemini-500 text-white p-2 rounded">
              Gradient from claude to gemini
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}