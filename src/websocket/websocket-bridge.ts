import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { EventEmitter } from 'events';
import winston from 'winston';
import { Orchestrator } from '../orchestration/orchestrator.js';
import { Message, Task, CLISource } from '../types/index.js';
import { LearningModule } from '../learning/learning-module.js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { RateLimiter } from 'limiter';

/**
 * WebSocket Bridge Server - Advanced real-time communication layer
 * Provides real-time updates for task execution, learning insights, and system metrics
 */
export class WebSocketBridge extends EventEmitter {
  private io: SocketIOServer | null = null;
  private orchestrator: Orchestrator;
  private learningModule: LearningModule;
  private logger: winston.Logger;
  private connectedClients: Map<string, ClientInfo> = new Map();
  private taskSubscriptions: Map<string, Set<string>> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  
  // Metrics tracking
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    avgResponseTime: 0,
  };

  constructor(logger: winston.Logger) {
    super();
    this.logger = logger;
    this.orchestrator = new Orchestrator(logger);
    this.learningModule = new LearningModule(logger);
    this.setupOrchestratorListeners();
    this.setupLearningListeners();
  }

  /**
   * Initialize WebSocket server with HTTP server
   * @param httpServer - HTTP server instance
   * @param options - Configuration options
   */
  initialize(httpServer: HTTPServer, options?: WebSocketOptions) {
    const config = {
      cors: {
        origin: options?.corsOrigin || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '*'),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: options?.pingTimeout || 60000,
      pingInterval: options?.pingInterval || 25000,
      maxHttpBufferSize: options?.maxBufferSize || 1e8, // 100 MB
      transports: ['websocket', 'polling'] as any,
    };

    this.io = new SocketIOServer(httpServer, config);
    
    // Authentication middleware
    if (options?.enableAuth) {
      this.io.use(this.authenticateSocket.bind(this));
    }

    this.io.on('connection', this.handleConnection.bind(this));
    
    this.logger.info('WebSocket Bridge initialized', { config });
  }

  /**
   * Handle new socket connection
   */
  private async handleConnection(socket: Socket) {
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;
    
    const clientInfo: ClientInfo = {
      id: socket.id,
      userId: (socket.data as any).userId || 'anonymous',
      connectedAt: new Date(),
      tasksExecuted: 0,
      persona: (socket.data as any).persona || 'individual',
    };
    
    this.connectedClients.set(socket.id, clientInfo);
    
    // Initialize rate limiter for this client
    const limiter = new RateLimiter({
      tokensPerInterval: 100,
      interval: 'minute',
      fireImmediately: true,
    });
    this.rateLimiters.set(socket.id, limiter);
    
    this.logger.info('Client connected', { 
      clientId: socket.id, 
      userId: clientInfo.userId,
      activeConnections: this.metrics.activeConnections 
    });

    // Send initial state
    socket.emit('connected', {
      serverId: process.env.SERVER_ID || 'bridge-1',
      version: '2.0.0',
      capabilities: this.getCapabilities(),
      metrics: this.getPublicMetrics(),
    });

    // Setup event handlers
    this.setupSocketHandlers(socket);
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, reason);
    });
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(socket: Socket) {
    // Task execution
    socket.on('task:execute', this.createRateLimitedHandler(socket, this.handleTaskExecute.bind(this)));
    
    // Task subscription management
    socket.on('task:subscribe', (taskId: string) => {
      this.subscribeToTask(socket, taskId);
    });
    
    socket.on('task:unsubscribe', (taskId: string) => {
      this.unsubscribeFromTask(socket, taskId);
    });
    
    // Learning module interactions
    socket.on('learning:feedback', this.createRateLimitedHandler(socket, this.handleLearningFeedback.bind(this)));
    socket.on('learning:export', this.handleLearningExport.bind(this, socket));
    
    // Metrics and monitoring
    socket.on('metrics:request', () => {
      socket.emit('metrics:update', this.getPublicMetrics());
    });
    
    // Health check
    socket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback({ timestamp: Date.now(), status: 'healthy' });
      }
    });
  }

  /**
   * Create rate-limited handler wrapper
   */
  private createRateLimitedHandler(socket: Socket, handler: Function) {
    return async (...args: any[]) => {
      const limiter = this.rateLimiters.get(socket.id);
      if (limiter) {
        const remainingTokens = await limiter.tryRemoveTokens(1);
        if (remainingTokens === false) {
          socket.emit('error', {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please slow down.',
            retryAfter: 60,
          });
          return;
        }
      }
      return handler(socket, ...args);
    };
  }

  /**
   * Handle task execution request
   */
  private async handleTaskExecute(socket: Socket, request: TaskExecutionRequest) {
    const startTime = Date.now();
    const clientInfo = this.connectedClients.get(socket.id);
    
    if (!clientInfo) {
      socket.emit('error', { code: 'CLIENT_NOT_FOUND', message: 'Client not registered' });
      return;
    }

    try {
      // Validate request
      if (!request.task || !request.task.type) {
        throw new Error('Invalid task request');
      }

      // Create task with proper structure
      const task: Task = {
        id: request.task.id || uuidv4(),
        type: request.task.type as any,
        payload: request.task.payload || {},
        context: {
          clientId: socket.id,
          userId: clientInfo.userId,
          persona: clientInfo.persona,
        },
        createdAt: new Date().toISOString(),
      };

      // Subscribe client to task updates
      this.subscribeToTask(socket, task.id);

      // Create message for orchestrator
      const message: Message = {
        source: request.preferredCLI || 'claude',
        task,
        orchestrator: request.orchestrate !== false,
        metadata: {
          timestamp: new Date().toISOString(),
          priority: request.priority || 'medium',
          constraints: request.constraints,
        },
      };

      // Track metrics
      this.metrics.totalTasks++;
      clientInfo.tasksExecuted++;

      // Send acknowledgment
      socket.emit('task:accepted', {
        taskId: task.id,
        estimatedTime: this.estimateExecutionTime(task),
      });

      // Execute task
      const result = await this.orchestrator.processMessage(message);
      
      // Update metrics
      const executionTime = Date.now() - startTime;
      this.updateAverageResponseTime(executionTime);
      
      if (result.success) {
        this.metrics.completedTasks++;
      } else {
        this.metrics.failedTasks++;
      }

      // Send result
      socket.emit('task:complete', {
        taskId: task.id,
        success: result.success,
        result: result.result,
        executionTime,
        validatedBy: result.validatedBy,
      });

      // Record feedback for learning
      await this.learningModule.recordFeedback({
        taskId: task.id,
        success: result.success,
        executionTime,
        cli: message.source,
      });

    } catch (error) {
      this.metrics.failedTasks++;
      this.logger.error('Task execution failed', { error, clientId: socket.id });
      
      socket.emit('task:error', {
        taskId: request.task?.id,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'EXECUTION_FAILED',
        },
      });
    }
  }

  /**
   * Handle learning feedback
   */
  private async handleLearningFeedback(socket: Socket, feedback: LearningFeedback) {
    try {
      await this.learningModule.recordFeedback({
        taskId: feedback.taskId,
        success: feedback.success,
        executionTime: feedback.executionTime,
        cli: feedback.cli as CLISource,
        userSatisfaction: feedback.userSatisfaction,
      });

      socket.emit('learning:feedback:accepted', { taskId: feedback.taskId });
    } catch (error) {
      this.logger.error('Failed to record learning feedback', { error });
      socket.emit('error', {
        code: 'FEEDBACK_FAILED',
        message: 'Failed to record feedback',
      });
    }
  }

  /**
   * Handle learning export request
   */
  private async handleLearningExport(socket: Socket, format: 'json' | 'csv' = 'json') {
    try {
      const learnings = this.learningModule.exportLearnings();
      
      if (format === 'csv') {
        const csvPath = `/tmp/learning-export-${Date.now()}.csv`;
        await this.learningModule.exportToCSV(csvPath);
        
        socket.emit('learning:export:ready', {
          format: 'csv',
          path: csvPath,
          preview: 'Download ready',
        });
      } else {
        socket.emit('learning:export:ready', {
          format: 'json',
          data: learnings,
        });
      }
    } catch (error) {
      this.logger.error('Failed to export learning data', { error });
      socket.emit('error', {
        code: 'EXPORT_FAILED',
        message: 'Failed to export learning data',
      });
    }
  }

  /**
   * Setup orchestrator event listeners
   */
  private setupOrchestratorListeners() {
    this.orchestrator.on('taskCompleted', ({ task, result }) => {
      this.broadcastToTaskSubscribers(task.id, 'task:completed', {
        taskId: task.id,
        result,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Setup learning module listeners
   */
  private setupLearningListeners() {
    this.learningModule.on('performanceInsights', (insights) => {
      this.broadcast('insights:performance', insights);
    });
  }

  /**
   * Subscribe socket to task updates
   */
  private subscribeToTask(socket: Socket, taskId: string) {
    if (!this.taskSubscriptions.has(taskId)) {
      this.taskSubscriptions.set(taskId, new Set());
    }
    
    this.taskSubscriptions.get(taskId)!.add(socket.id);
    socket.join(`task:${taskId}`);
    
    this.logger.debug('Client subscribed to task', { 
      clientId: socket.id, 
      taskId 
    });
  }

  /**
   * Unsubscribe socket from task updates
   */
  private unsubscribeFromTask(socket: Socket, taskId: string) {
    const subscribers = this.taskSubscriptions.get(taskId);
    if (subscribers) {
      subscribers.delete(socket.id);
      if (subscribers.size === 0) {
        this.taskSubscriptions.delete(taskId);
      }
    }
    
    socket.leave(`task:${taskId}`);
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: Socket, reason: string) {
    this.metrics.activeConnections--;
    
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      const sessionDuration = Date.now() - clientInfo.connectedAt.getTime();
      
      this.logger.info('Client disconnected', {
        clientId: socket.id,
        userId: clientInfo.userId,
        reason,
        sessionDuration,
        tasksExecuted: clientInfo.tasksExecuted,
      });
    }
    
    // Cleanup
    this.connectedClients.delete(socket.id);
    this.rateLimiters.delete(socket.id);
    
    // Remove from all task subscriptions
    this.taskSubscriptions.forEach((subscribers, taskId) => {
      if (subscribers.has(socket.id)) {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.taskSubscriptions.delete(taskId);
        }
      }
    });
  }

  /**
   * Broadcast to all connected clients
   */
  private broadcast(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Broadcast to task subscribers
   */
  private broadcastToTaskSubscribers(taskId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`task:${taskId}`).emit(event, data);
    }
  }

  /**
   * Socket authentication middleware
   */
  private async authenticateSocket(socket: Socket, next: Function) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
      
      // Attach user data to socket
      socket.data = {
        userId: decoded.userId,
        persona: decoded.persona,
      };
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Estimate task execution time based on type and history
   */
  private estimateExecutionTime(task: Task): number {
    // Use learning module data for estimation
    const suggestions = this.learningModule.exportLearnings();
    const patterns = suggestions.patterns;
    
    for (const [type, pattern] of patterns) {
      if (type === task.type) {
        return pattern.avgExecutionTime;
      }
    }
    
    // Default estimates
    const defaults: Record<string, number> = {
      code: 2000,
      multimodal: 3000,
      analysis: 2500,
      validation: 1500,
      search: 2000,
      ultrathink: 5000,
    };
    
    return defaults[task.type] || 2000;
  }

  /**
   * Update average response time metric
   */
  private updateAverageResponseTime(newTime: number) {
    const totalTasks = this.metrics.completedTasks + this.metrics.failedTasks;
    
    if (totalTasks === 0) {
      this.metrics.avgResponseTime = newTime;
    } else {
      this.metrics.avgResponseTime = 
        (this.metrics.avgResponseTime * (totalTasks - 1) + newTime) / totalTasks;
    }
  }

  /**
   * Get public metrics (safe to share with clients)
   */
  private getPublicMetrics() {
    return {
      activeConnections: this.metrics.activeConnections,
      totalTasks: this.metrics.totalTasks,
      completedTasks: this.metrics.completedTasks,
      successRate: this.metrics.totalTasks > 0 
        ? (this.metrics.completedTasks / this.metrics.totalTasks * 100).toFixed(1) 
        : 0,
      avgResponseTime: Math.round(this.metrics.avgResponseTime),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get server capabilities
   */
  private getCapabilities() {
    return {
      clis: ['claude', 'gemini'],
      taskTypes: ['code', 'multimodal', 'analysis', 'validation', 'search', 'ultrathink'],
      features: [
        'real-time-updates',
        'task-orchestration',
        'learning-insights',
        'rate-limiting',
        'authentication',
        'metrics-tracking',
      ],
      maxConcurrentTasks: parseInt(process.env.MAX_PARALLEL_TASKS || '5'),
      rateLimits: {
        requestsPerMinute: 100,
      },
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.logger.info('Shutting down WebSocket Bridge');
    
    // Notify all clients
    this.broadcast('server:shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString(),
    });
    
    // Close all connections
    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io!.close(() => {
          this.logger.info('WebSocket server closed');
          resolve();
        });
      });
    }
    
    // Cleanup
    this.learningModule.destroy();
    this.connectedClients.clear();
    this.taskSubscriptions.clear();
    this.rateLimiters.clear();
  }
}

// Type definitions
interface WebSocketOptions {
  corsOrigin?: string;
  pingTimeout?: number;
  pingInterval?: number;
  maxBufferSize?: number;
  enableAuth?: boolean;
}

interface ClientInfo {
  id: string;
  userId: string;
  connectedAt: Date;
  tasksExecuted: number;
  persona: string;
}

interface TaskExecutionRequest {
  task: {
    id?: string;
    type: string;
    payload: any;
  };
  preferredCLI?: CLISource;
  orchestrate?: boolean;
  priority?: 'high' | 'medium' | 'low';
  constraints?: Record<string, any>;
}

interface LearningFeedback {
  taskId: string;
  success: boolean;
  executionTime: number;
  cli: string;
  userSatisfaction?: number;
}