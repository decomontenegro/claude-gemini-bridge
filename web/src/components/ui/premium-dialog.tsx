'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'
import { Button3D } from '@/components/ui/button-3d'
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PremiumDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  variant?: 'default' | 'danger' | 'success' | 'warning'
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  icon?: React.ElementType
  loading?: boolean
}

const variantConfig = {
  default: {
    icon: Info,
    iconColor: 'text-blue-500',
    confirmVariant: 'default' as const,
  },
  danger: {
    icon: XCircle,
    iconColor: 'text-red-500',
    confirmVariant: 'destructive' as const,
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    confirmVariant: 'default' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    confirmVariant: 'default' as const,
  },
}

export function PremiumDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = 'default',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  icon,
  loading = false,
}: PremiumDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const config = variantConfig[variant]
  const Icon = icon || config.icon

  useEffect(() => {
    if (open) {
      // Lock body scroll when dialog is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleConfirm = async () => {
    if (onConfirm) {
      setIsConfirming(true)
      try {
        await onConfirm()
        onOpenChange(false)
      } finally {
        setIsConfirming(false)
      }
    } else {
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => !loading && !isConfirming && handleCancel()}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] p-4"
          >
            <GlassCard className="relative overflow-hidden p-0">
              {/* Header */}
              <div className="flex items-center gap-4 border-b border-white/10 p-6 pb-4">
                <div
                  className={cn(
                    'rounded-xl bg-white/10 p-3',
                    config.iconColor
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{title}</h3>
                  {description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-6 pt-4">
                <Button3D
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={loading || isConfirming}
                  className="flex-1"
                >
                  {cancelText}
                </Button3D>
                <Button3D
                  variant={variant === 'danger' ? 'destructive' : 'default'}
                  onClick={handleConfirm}
                  loading={loading || isConfirming}
                  className="flex-1"
                >
                  {confirmText}
                </Button3D>
              </div>

              {/* Loading overlay */}
              {(loading || isConfirming) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm"
                >
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}