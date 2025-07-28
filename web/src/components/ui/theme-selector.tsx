'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAdvancedTheme, ThemeVariant } from '@/hooks/use-advanced-theme'
import { GlassCard } from '@/components/ui/glass-card'
import { Palette, Moon, Sun, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const themeIcons: Record<ThemeVariant, React.ElementType> = {
  dark: Moon,
  light: Sun,
  midnight: Moon,
  aurora: Sparkles,
  synthwave: Zap,
}

export function ThemeSelector() {
  const { currentTheme, themes, changeTheme, mounted } = useAdvancedTheme()

  if (!mounted) return null

  return (
    <div className="relative">
      <motion.div
        className="group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
          <Palette className="h-5 w-5" />
        </button>

        {/* Theme Options */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 hidden group-hover:block"
          >
            <GlassCard className="p-2 min-w-[200px]">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                Choose Theme
              </p>
              {(Object.entries(themes) as [ThemeVariant, typeof themes[ThemeVariant]][]).map(
                ([key, config]) => {
                  const Icon = themeIcons[key]
                  const isActive = currentTheme === key

                  return (
                    <motion.button
                      key={key}
                      onClick={() => changeTheme(key)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                        isActive
                          ? 'bg-primary/20 text-primary'
                          : 'hover:bg-white/10'
                      )}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{config.name}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTheme"
                          className="h-2 w-2 rounded-full bg-primary"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500 }}
                        />
                      )}
                    </motion.button>
                  )
                }
              )}

              {/* Theme Preview */}
              <div className="mt-2 border-t border-white/10 pt-2">
                <div className="px-2 py-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Preview
                  </p>
                  <div className="flex gap-1">
                    {Object.entries(themes[currentTheme].colors).map(([key, value]) => (
                      <motion.div
                        key={key}
                        className="h-6 w-6 rounded-full border border-white/20"
                        style={{ backgroundColor: value }}
                        whileHover={{ scale: 1.2 }}
                        title={key}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}