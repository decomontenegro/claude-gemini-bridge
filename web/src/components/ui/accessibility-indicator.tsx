'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, Eye, Volume2, AlertCircle } from 'lucide-react'
import { useReducedMotion, useHighContrast } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

interface AccessibilityStatus {
  keyboardNav: boolean
  screenReader: boolean
  reducedMotion: boolean
  highContrast: boolean
}

export function AccessibilityIndicator() {
  const [status, setStatus] = useState<AccessibilityStatus>({
    keyboardNav: false,
    screenReader: false,
    reducedMotion: false,
    highContrast: false,
  })
  const [showIndicator, setShowIndicator] = useState(false)
  
  const reducedMotion = useReducedMotion()
  const highContrast = useHighContrast()

  useEffect(() => {
    // Detect keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setStatus(prev => ({ ...prev, keyboardNav: true }))
        setShowIndicator(true)
      }
    }

    // Detect mouse usage (to hide keyboard indicator)
    const handleMouseDown = () => {
      setStatus(prev => ({ ...prev, keyboardNav: false }))
    }

    // Check for screen reader
    const checkScreenReader = () => {
      // This is a heuristic - not 100% accurate
      const isScreenReader = 
        (window as any).navigator?.userAgent?.includes('NVDA') ||
        (window as any).navigator?.userAgent?.includes('JAWS') ||
        document.body.getAttribute('role') === 'application'
      
      setStatus(prev => ({ ...prev, screenReader: isScreenReader }))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)
    checkScreenReader()

    // Update status based on media queries
    setStatus(prev => ({
      ...prev,
      reducedMotion,
      highContrast,
    }))

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [reducedMotion, highContrast])

  const activeFeatures = Object.entries(status).filter(([_, active]) => active)

  if (!showIndicator || activeFeatures.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 left-4 z-40"
      >
        <div className="flex items-center gap-2 rounded-lg bg-background/90 backdrop-blur-sm border border-border p-3 shadow-lg">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Accessibility:</span>
          <div className="flex items-center gap-2">
            {status.keyboardNav && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1"
              >
                <Keyboard className="h-4 w-4 text-primary" />
                <span className="text-xs">Keyboard</span>
              </motion.div>
            )}
            {status.screenReader && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1"
              >
                <Volume2 className="h-4 w-4 text-primary" />
                <span className="text-xs">Screen Reader</span>
              </motion.div>
            )}
            {status.reducedMotion && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1"
              >
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-xs">Reduced Motion</span>
              </motion.div>
            )}
          </div>
          <button
            onClick={() => setShowIndicator(false)}
            className="ml-2 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Hide accessibility indicator"
          >
            Hide
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Skip to content link for keyboard navigation
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className={cn(
        'fixed left-4 top-4 z-50',
        'bg-primary text-primary-foreground',
        'px-4 py-2 rounded-md',
        'transform -translate-y-16 focus:translate-y-0',
        'transition-transform duration-200',
        'sr-only focus:not-sr-only'
      )}
    >
      Skip to main content
    </a>
  )
}