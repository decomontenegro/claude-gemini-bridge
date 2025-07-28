'use client'

import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useUserStore } from '@/store/user-store'
import { ThemeSelector } from '@/components/ui/theme-selector'
import { ClaudeLogo, GeminiLogo } from '@/components/ui/brand-logos'

export function Header() {
  const { theme, setTheme } = useTheme()
  const { persona } = useUserStore()

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            {persona === 'newbie' ? 'Learning Mode' : 
             persona === 'enterprise' ? 'Enterprise' : 
             persona === 'researcher' ? 'Research Mode' : 
             persona === 'team' ? 'Team Mode' : 'Developer Mode'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeSelector />
        </div>
      </div>
    </header>
  )
}