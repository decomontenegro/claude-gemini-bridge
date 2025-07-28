'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ToastProps {
  id: string
  title: string
  description?: string
  variant?: 'success' | 'error' | 'warning' | 'info' | 'claude' | 'gemini'
  duration?: number
  onClose?: () => void
}

const variantConfig = {
  success: {
    icon: CheckCircle,
    className: 'from-green-500/20 to-green-600/20 border-green-500/30',
    iconColor: 'text-green-500',
  },
  error: {
    icon: XCircle,
    className: 'from-red-500/20 to-red-600/20 border-red-500/30',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertCircle,
    className: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
    iconColor: 'text-yellow-500',
  },
  info: {
    icon: Info,
    className: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    iconColor: 'text-blue-500',
  },
  claude: {
    icon: Info,
    className: 'from-claude-500/20 to-claude-600/20 border-claude-500/30',
    iconColor: 'text-claude-500',
  },
  gemini: {
    icon: Info,
    className: 'from-gemini-500/20 to-gemini-600/20 border-gemini-500/30',
    iconColor: 'text-gemini-500',
  },
}

export function PremiumToast({
  title,
  description,
  variant = 'info',
  onClose,
}: ToastProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-gradient-to-r p-4 shadow-2xl backdrop-blur-xl',
        'min-w-[350px] max-w-md',
        config.className
      )}
    >
      {/* Background animation */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 rounded-lg bg-background/50 p-2', config.iconColor)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-current to-current opacity-30"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 5, ease: 'linear' }}
      />
    </motion.div>
  )
}

// Toast container for managing multiple toasts
export function ToastContainer({ toasts }: { toasts: ToastProps[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <PremiumToast key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}