'use client'

import { useEffect, useState, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'
import { useToast } from '@/hooks/use-toast'

interface WebSocketOptions {
  autoConnect?: boolean
  userId?: string
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (options.autoConnect !== false) {
      const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
        transports: ['websocket'],
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
        toast({
          title: 'Connection Error',
          description: 'Failed to establish real-time connection',
          variant: 'destructive',
        })
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.close()
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
    subscribeToTask,
    unsubscribeFromTask,
    onTaskProgress,
    onTaskComplete,
    onMetricsUpdate,
    onNewInsight,
  }
}