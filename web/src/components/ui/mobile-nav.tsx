'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Home, PlayCircle, BarChart3, Settings, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MobileNavItem {
  icon: React.ElementType
  label: string
  value: string
}

interface MobileNavProps {
  activeTab?: string
  onTabChange?: (value: string) => void
}

const navItems: MobileNavItem[] = [
  { icon: Home, label: 'Home', value: 'workflows' },
  { icon: PlayCircle, label: 'Execute', value: 'execute' },
  { icon: BarChart3, label: 'Dashboard', value: 'dashboard' },
  { icon: Settings, label: 'Config', value: 'config' },
  { icon: History, label: 'History', value: 'history' },
]

export function MobileNav({ activeTab = 'workflows', onTabChange }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary shadow-lg md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Menu className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Navigation Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 right-0 z-50 h-[60vh] w-full max-w-sm rounded-t-3xl bg-card p-6 shadow-2xl md:hidden"
            >
              <div className="mb-6">
                <div className="mx-auto h-1 w-12 rounded-full bg-muted" />
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.value

                  return (
                    <motion.button
                      key={item.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onTabChange?.(item.value)
                        setIsOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-xl transition-all',
                          isActive
                            ? 'bg-primary-foreground/20'
                            : 'bg-muted'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{item.label}</p>
                        <p className={cn(
                          'text-sm',
                          isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        )}>
                          {item.value === 'workflows' && 'Smart AI workflows'}
                          {item.value === 'execute' && 'Run tasks now'}
                          {item.value === 'dashboard' && 'View metrics'}
                          {item.value === 'config' && 'Settings & preferences'}
                          {item.value === 'history' && 'Past executions'}
                        </p>
                      </div>
                    </motion.button>
                  )
                })}
              </nav>

              {/* Quick Actions */}
              <div className="mt-6 rounded-2xl bg-muted/50 p-4">
                <p className="mb-3 text-sm font-medium">Quick Actions</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      onTabChange?.('execute')
                      setIsOpen(false)
                    }}
                  >
                    New Task
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      // Open command palette
                      const event = new KeyboardEvent('keydown', {
                        key: 'k',
                        metaKey: true,
                        ctrlKey: true,
                      })
                      window.dispatchEvent(event)
                      setIsOpen(false)
                    }}
                  >
                    Search (⌘K)
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}