'use client'

import { useEffect, useState, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'
import { useToast } from '@/hooks/use-toast'

interface WebSocketOptions {
  autoConnect?: boolean
  userId?: string
}

// Only access process.env on client side
const getWebSocketUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001'
  }
  return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Skip on server-side rendering
    if (typeof window === 'undefined') {
      return
    }

    if (options.autoConnect !== false) {
      const wsUrl = getWebSocketUrl()
      console.log('Attempting WebSocket connection to:', wsUrl)
      
      try {
        const socketInstance = io(wsUrl, {
          transports: ['websocket', 'polling'], // Add polling as fallback
          timeout: 10000,
          reconnectionAttempts: 3,
          reconnectionDelay: 2000,
        })

      socketInstance.on('connect', () => {
        setConnected(true)
        console.log('WebSocket connected')
        
        if (options.userId) {
          socketInstance.emit('join', options.userId)
        }
      })

      socketInstance.on('disconnect', () => {
        setConnected(false)
        console.log('WebSocket disconnected')
      })

      socketInstance.on('error', (error) => {
        console.error('WebSocket error:', error)
        setError(error.toString())
        toast({
          title: 'Connection Error',
          description: 'Failed to establish real-time connection',
          variant: 'destructive',
        })
      })

      socketInstance.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        setError(error.message)
        // Don't show toast for connection errors in production
        if (process.env.NODE_ENV === 'development') {
          toast({
            title: 'WebSocket Connection Failed',
            description: 'Running in offline mode',
            variant: 'destructive',
          })
        }
      })

        setSocket(socketInstance)

        return () => {
          socketInstance.close()
        }
      } catch (err) {
        console.error('Failed to initialize WebSocket:', err)
        setError(err instanceof Error ? err.message : 'Connection failed')
      }
    }
  }, [options.autoConnect, options.userId, toast])

  const subscribeToTask = useCallback((taskId: string) => {
    if (socket && connected) {
      socket.emit('task:subscribe', taskId)
    }
  }, [socket, connected])

  const unsubscribeFromTask = useCallback((taskId: string) => {
    if (socket && connected) {
      socket.emit('task:unsubscribe', taskId)
    }
  }, [socket, connected])

  const onTaskProgress = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('task:progress', callback)
      return () => socket.off('task:progress', callback)
    }
  }, [socket])

  const onTaskComplete = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('task:complete', callback)
      return () => socket.off('task:complete', callback)
    }
  }, [socket])

  const onMetricsUpdate = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('metrics:update', callback)
      return () => socket.off('metrics:update', callback)
    }
  }, [socket])

  const onNewInsight = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('insight:new', callback)
      return () => socket.off('insight:new', callback)
    }
  }, [socket])

  return {
    socket,
    connected,
    error,
    subscribeToTask,
    unsubscribeFromTask,
    onTaskProgress,
    onTaskComplete,
    onMetricsUpdate,
    onNewInsight,
  }
}