import { useState, useCallback } from 'react'
import { ToastProps } from '@/components/ui/premium-toast'

export function useToastManager() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const addToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Date.now().toString()
    const newToast: ToastProps = {
      ...toast,
      id,
      onClose: () => removeToast(id),
    }

    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration (default 5 seconds)
    setTimeout(() => {
      removeToast(id)
    }, toast.duration || 5000)

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showSuccess = useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'success' })
  }, [addToast])

  const showError = useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'error' })
  }, [addToast])

  const showWarning = useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'warning' })
  }, [addToast])

  const showInfo = useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'info' })
  }, [addToast])

  const showClaude = useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'claude' })
  }, [addToast])

  const showGemini = useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'gemini' })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showClaude,
    showGemini,
  }
}