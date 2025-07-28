'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PremiumLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'claude' | 'gemini' | 'hybrid'
  text?: string
}

export function PremiumLoader({ size = 'md', variant = 'hybrid', text }: PremiumLoaderProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        {/* Outer ring */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full',
            sizeClasses[size],
            variant === 'claude' && 'bg-gradient-to-r from-claude-500 to-claude-600',
            variant === 'gemini' && 'bg-gradient-to-r from-gemini-500 to-gemini-600',
            variant === 'hybrid' && 'bg-gradient-to-r from-claude-500 via-purple-500 to-gemini-500'
          )}
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Inner circle */}
        <motion.div
          className={cn(
            'absolute inset-1 rounded-full bg-background',
            size === 'sm' && 'inset-0.5',
            size === 'lg' && 'inset-1.5'
          )}
        />

        {/* Center dot */}
        <motion.div
          className={cn(
            'absolute rounded-full',
            size === 'sm' && 'inset-2.5 bg-gradient-to-r',
            size === 'md' && 'inset-4 bg-gradient-to-r',
            size === 'lg' && 'inset-5 bg-gradient-to-r',
            variant === 'claude' && 'from-claude-400 to-claude-600',
            variant === 'gemini' && 'from-gemini-400 to-gemini-600',
            variant === 'hybrid' && 'from-claude-500 to-gemini-500'
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Particles */}
        {variant === 'hybrid' && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  'absolute h-1 w-1 rounded-full',
                  i === 0 && 'bg-claude-500',
                  i === 1 && 'bg-purple-500',
                  i === 2 && 'bg-gemini-500'
                )}
                style={{
                  top: '50%',
                  left: '50%',
                }}
                animate={{
                  x: [0, 20 * Math.cos((i * 120) * Math.PI / 180), 0],
                  y: [0, 20 * Math.sin((i * 120) * Math.PI / 180), 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </>
        )}
      </div>

      {text && (
        <motion.p
          className={cn(
            'font-medium',
            textSizeClasses[size],
            variant === 'claude' && 'text-claude-500',
            variant === 'gemini' && 'text-gemini-500',
            variant === 'hybrid' && 'bg-gradient-to-r from-claude-500 to-gemini-500 bg-clip-text text-transparent'
          )}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

// Skeleton loader with glassmorphism
export function GlassSkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-lg bg-white/5 backdrop-blur-xl',
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        className
      )}
      animate={{
        x: ['100%', '-100%'],
      }}
      transition={{
        x: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
    />
  )
}