'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion, HTMLMotionProps, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export interface Button3DProps extends HTMLMotionProps<"button"> {
  variant?: 'claude' | 'gemini' | 'default' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  glow?: boolean
  children: React.ReactNode
}

const Button3D = React.forwardRef<HTMLButtonElement, Button3DProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'md', 
    loading = false,
    glow = true,
    children,
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading
    
    const variants = {
      default: [
        'bg-gradient-to-r from-slate-600 to-slate-700',
        'hover:from-slate-700 hover:to-slate-800',
        'text-white',
        'shadow-slate-900/50'
      ],
      claude: [
        'bg-gradient-to-r from-claude-500 to-claude-600',
        'hover:from-claude-600 hover:to-claude-700',
        'text-white',
        'shadow-claude-700/50',
        glow && 'hover:shadow-claude-glow'
      ],
      gemini: [
        'bg-gradient-to-r from-gemini-500 to-gemini-600',
        'hover:from-gemini-600 hover:to-gemini-700',
        'text-white',
        'shadow-gemini-700/50',
        glow && 'hover:shadow-gemini-glow'
      ],
      ghost: [
        'bg-transparent',
        'hover:bg-white/10',
        'text-white',
        'border border-white/20',
        'hover:border-white/40'
      ],
      danger: [
        'bg-gradient-to-r from-red-500 to-red-600',
        'hover:from-red-600 hover:to-red-700',
        'text-white',
        'shadow-red-700/50'
      ]
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
      xl: 'px-8 py-4 text-xl'
    }
    
    return (
      <motion.button
        ref={ref}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center',
          'font-medium rounded-lg',
          'transition-all duration-200 ease-out',
          'transform-gpu perspective-1000',
          
          // 3D effect
          'before:absolute before:inset-0',
          'before:rounded-lg before:transition-all',
          'before:duration-200 before:-z-10',
          variant !== 'ghost' && [
            'before:bg-black/20',
            'before:translate-y-[2px]',
            'hover:before:translate-y-[4px]',
            'active:before:translate-y-[1px]'
          ],
          
          // Shadow for depth
          'shadow-lg',
          'hover:shadow-xl',
          'active:shadow-md',
          
          // Size
          sizes[size],
          
          // Variant
          variants[variant],
          
          // States
          isDisabled && [
            'opacity-50',
            'cursor-not-allowed',
            'hover:shadow-lg',
            'hover:before:translate-y-[2px]'
          ],
          
          className
        )}
        disabled={isDisabled}
        whileHover={!isDisabled ? { y: -2 } : undefined}
        whileTap={!isDisabled ? { y: 0, scale: 0.98 } : undefined}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        {...props}
      >
        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 rounded-lg overflow-hidden"
          initial={{ x: '-100%', opacity: 0 }}
          whileHover={{ x: '100%', opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
        </motion.div>
        
        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {children}
        </span>
      </motion.button>
    )
  }
)

Button3D.displayName = 'Button3D'

export { Button3D }