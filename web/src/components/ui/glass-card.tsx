'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion, HTMLMotionProps } from 'framer-motion'

export interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: 'default' | 'claude' | 'gemini' | 'success' | 'error'
  glow?: boolean
  interactive?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', glow = false, interactive = true, children, ...props }, ref) => {
    const variants = {
      default: 'bg-white/5',
      claude: 'bg-claude-500/10 border-claude-500/20',
      gemini: 'bg-gemini-500/10 border-gemini-500/20',
      success: 'bg-green-500/10 border-green-500/20',
      error: 'bg-red-500/10 border-red-500/20'
    }
    
    const glowVariants = {
      default: '',
      claude: 'hover:shadow-claude-glow',
      gemini: 'hover:shadow-gemini-glow',
      success: 'hover:shadow-success-glow',
      error: 'hover:shadow-error-glow'
    }
    
    return (
      <motion.div
        ref={ref}
        className={cn(
          // Base glass styles
          'relative overflow-hidden rounded-xl',
          'backdrop-blur-xl backdrop-saturate-150',
          'border border-white/10',
          'shadow-xl shadow-black/10',
          
          // Variant styles
          variants[variant],
          
          // Glow effect
          glow && glowVariants[variant],
          
          // Interactive states
          interactive && [
            'transition-all duration-300 ease-out',
            'hover:border-white/20',
            'hover:shadow-2xl hover:shadow-black/20',
            'hover:-translate-y-1'
          ],
          
          className
        )}
        whileHover={interactive ? { scale: 1.02 } : undefined}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        {...props}
      >
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        
        {/* Noise texture for realism */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' /%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    )
  }
)

GlassCard.displayName = 'GlassCard'

export { GlassCard }