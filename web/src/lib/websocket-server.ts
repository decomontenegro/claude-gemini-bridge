import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { EventEmitter } from 'events'

export class WebSocketServer extends EventEmitter {
  private io: SocketIOServer | null = null

  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '*',
        methods: ['GET', 'POST'],
      },
    })

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      // Join user to their personal room
      socket.on('join', (userId: string) => {
        socket.join(`user:${userId}`)
        socket.emit('joined', { userId })
      })

      // Handle task execution updates
      socket.on('task:subscribe', (taskId: string) => {
        socket.join(`task:${taskId}`)
      })

      socket.on('task:unsubscribe', (taskId: string) => {
        socket.leave(`task:${taskId}`)
      })

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })

    // Set up bridge event listeners
    this.setupBridgeListeners()
  }

  private setupBridgeListeners() {
    // These would connect to the actual bridge orchestrator
    // For now, we'll emit mock events
  }

  // Emit task progress updates
  emitTaskProgress(taskId: string, progress: any) {
    if (this.io) {
      this.io.to(`task:${taskId}`).emit('task:progress', {
        taskId,
        progress,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // Emit task completion
  emitTaskComplete(taskId: string, result: any) {
    if (this.io) {
      this.io.to(`task:${taskId}`).emit('task:complete', {
        taskId,
        result,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // Emit metrics update
  emitMetricsUpdate(metrics: any) {
    if (this.io) {
      this.io.emit('metrics:update', metrics)
    }
  }

  // Emit learning insights
  emitInsight(insight: any) {
    if (this.io) {
      this.io.emit('insight:new', insight)
    }
  }
}

export const wsServer = new WebSocketServer()