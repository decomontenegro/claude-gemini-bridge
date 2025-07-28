import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { WebSocketBridge } from '../websocket/websocket-bridge.js';
import { DistributedOrchestrator } from '../distributed/distributed-orchestrator.js';
import { Orchestrator } from '../orchestration/orchestrator.js';
import { LearningModule } from '../learning/learning-module.js';
import { Message } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Claude-Gemini Bridge Server
 * Complete HTTP/WebSocket server with distributed capabilities
 * 
 * Features:
 * - RESTful API endpoints
 * - WebSocket real-time communication
 * - Distributed mode support
 * - Health monitoring
 * - Metrics collection
 * - Rate limiting and security
 */
export class BridgeServer {
  private app: express.Application;
  private server: any;
  private logger: winston.Logger;
  private wsbridge: WebSocketBridge;
  private orchestrator: Orchestrator | DistributedOrchestrator;
  private learningModule: LearningModule;
  private port: number;
  private isDistributed: boolean;

  /**
   * Create a new Bridge Server instance
   * @param {ServerConfig} config - Server configuration
   */
  constructor(config: ServerConfig) {
    this.port = config.port || 3001;
    this.isDistributed = config.distributed || false;
    
    // Setup logger
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        new winston.transports.File({ 
          filename: 'bridge-server.log',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
        }),
      ],
    });

    // Initialize components
    this.app = express();
    this.server = createServer(this.app);
    this.wsbridge = new WebSocketBridge(this.logger);
    this.learningModule = new LearningModule(this.logger);
    
    // Initialize orchestrator
    if (this.isDistributed) {
      this.orchestrator = new DistributedOrchestrator(this.logger, {
        nodeId: config.nodeId,
        redisHost: config.redisHost,
        redisPort: config.redisPort,
        redisPassword: config.redisPassword,
        maxConcurrency: config.maxConcurrency,
      });
    } else {
      this.orchestrator = new Orchestrator(this.logger);
    }

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    this.app.use('/api/', limiter);

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });
      });
      
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    const router = express.Router();

    // Health check
    router.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        version: '2.0.0',
        mode: this.isDistributed ? 'distributed' : 'standalone',
        timestamp: new Date().toISOString(),
      });
    });

    // Metrics endpoint
    router.get('/metrics', async (_req, res) => {
      try {
        const metrics = await this.collectMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to collect metrics' });
      }
    });

    // Task execution endpoint
    router.post('/tasks', async (req, res) => {
      try {
        const { task, options } = req.body;
        
        // Log incoming request
        this.logger.info('Received task request', {
          taskType: task?.type,
          taskPayload: task?.payload,
          options: options,
          requestBody: JSON.stringify(req.body)
        });
        
        if (!task || !task.type) {
          this.logger.warn('Invalid task received', { body: req.body });
          return res.status(400).json({ 
            error: 'Invalid task. Must include type.' 
          });
        }

        const message: Message = {
          source: options?.preferredCLI || 'claude',
          task: {
            id: task.id || uuidv4(),
            type: task.type,
            payload: task.payload || {},
            context: task.context,
            createdAt: new Date().toISOString(),
          },
          orchestrator: options?.orchestrate !== false,
          metadata: {
            timestamp: new Date().toISOString(),
            priority: options?.priority || 'medium',
            constraints: options?.constraints,
          },
        };
        
        this.logger.info('Processing message', {
          messageId: message.task.id,
          taskType: message.task.type,
          source: message.source,
          orchestrator: message.orchestrator
        });

        let result;
        if (this.isDistributed) {
          const taskId = await (this.orchestrator as DistributedOrchestrator).submitTask(message);
          result = { 
            taskId, 
            status: 'queued',
            message: 'Task queued for processing',
          };
        } else {
          result = await (this.orchestrator as Orchestrator).processMessage(message);
        }
        
        this.logger.info('Task completed successfully', {
          messageId: message.task.id,
          resultSummary: result ? 'Result obtained' : 'No result'
        });

        return res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        this.logger.error('Task execution failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          body: req.body
        });
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Task execution failed',
        });
      }
    });

    // Task status endpoint (distributed mode)
    router.get('/tasks/:taskId', async (req, res) => {
      if (!this.isDistributed) {
        return res.status(404).json({ 
          error: 'Task tracking only available in distributed mode' 
        });
      }

      try {
        const result = await (this.orchestrator as DistributedOrchestrator)
          .getTaskResult(req.params.taskId);
        return res.json(result);
      } catch (error) {
        return res.status(404).json({ 
          error: 'Task not found' 
        });
      }
    });

    // Learning module endpoints
    router.get('/learning/export', async (req, res) => {
      try {
        const format = req.query.format as string || 'json';
        
        if (format === 'csv') {
          const csvPath = `/tmp/learning-export-${Date.now()}.csv`;
          await this.learningModule.exportToCSV(csvPath);
          res.download(csvPath);
        } else {
          const learnings = this.learningModule.exportLearnings();
          res.json(learnings);
        }
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to export learning data' 
        });
      }
    });

    router.post('/learning/feedback', async (req, res) => {
      try {
        await this.learningModule.recordFeedback(req.body);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to record feedback' 
        });
      }
    });

    // Cluster management (distributed mode)
    router.get('/cluster/stats', async (_req, res) => {
      if (!this.isDistributed) {
        return res.status(404).json({ 
          error: 'Cluster stats only available in distributed mode' 
        });
      }

      try {
        const stats = await (this.orchestrator as DistributedOrchestrator).getClusterStats();
        return res.json(stats);
      } catch (error) {
        return res.status(500).json({ 
          error: 'Failed to get cluster stats' 
        });
      }
    });

    // OpenAPI documentation
    router.get('/openapi.json', (_req, res) => {
      res.json(this.getOpenAPISpec());
    });

    // Mount router
    this.app.use('/api/v1', router);

    // Serve static files (if any)
    this.app.use(express.static('public'));

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.url}`,
      });
    });
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    // Global error handler
    this.app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      this.logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: _req.url,
        method: _req.method,
      });

      res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', error);
      this.shutdown();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection', { reason, promise });
    });

    // Graceful shutdown on signals
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Initialize WebSocket
      this.wsbridge.initialize(this.server, {
        enableAuth: process.env.ENABLE_WS_AUTH === 'true',
        corsOrigin: process.env.CORS_ORIGIN,
      });

      // Start distributed orchestrator if enabled
      if (this.isDistributed) {
        await (this.orchestrator as DistributedOrchestrator).start();
      }

      // Start HTTP server
      await new Promise<void>((resolve) => {
        this.server.listen(this.port, () => {
          this.logger.info(`Bridge Server started on port ${this.port}`);
          this.logger.info(`Mode: ${this.isDistributed ? 'Distributed' : 'Standalone'}`);
          this.logger.info(`API: http://localhost:${this.port}/api/v1`);
          this.logger.info(`WebSocket: ws://localhost:${this.port}`);
          resolve();
        });
      });

      // Log startup metrics
      const startupMetrics = await this.collectMetrics();
      this.logger.info('Startup metrics', startupMetrics);

    } catch (error) {
      this.logger.error('Failed to start server', error);
      throw error;
    }
  }

  /**
   * Collect system metrics
   */
  private async collectMetrics(): Promise<any> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics: any = {
      server: {
        uptime: process.uptime(),
        mode: this.isDistributed ? 'distributed' : 'standalone',
        version: '2.0.0',
        nodeVersion: process.version,
      },
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(memUsage.external / 1024 / 1024) + ' MB',
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      learning: this.learningModule.exportLearnings().insights,
    };

    if (this.isDistributed) {
      try {
        const clusterStats = await (this.orchestrator as DistributedOrchestrator).getClusterStats();
        metrics['cluster'] = clusterStats;
      } catch (error) {
        this.logger.error('Failed to get cluster stats', error);
      }
    }

    return metrics;
  }

  /**
   * Get OpenAPI specification
   */
  private getOpenAPISpec(): any {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Claude-Gemini Bridge API',
        version: '2.0.0',
        description: 'Orchestration API for Claude and Gemini AI systems',
      },
      servers: [
        {
          url: `http://localhost:${this.port}/api/v1`,
          description: 'Local server',
        },
      ],
      paths: {
        '/health': {
          get: {
            summary: 'Health check',
            responses: {
              '200': {
                description: 'Server is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        version: { type: 'string' },
                        mode: { type: 'string' },
                        timestamp: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/tasks': {
          post: {
            summary: 'Execute a task',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      task: {
                        type: 'object',
                        required: ['type'],
                        properties: {
                          id: { type: 'string' },
                          type: { 
                            type: 'string',
                            enum: ['code', 'multimodal', 'analysis', 'validation', 'search', 'ultrathink'],
                          },
                          payload: { type: 'object' },
                        },
                      },
                      options: {
                        type: 'object',
                        properties: {
                          preferredCLI: { 
                            type: 'string',
                            enum: ['claude', 'gemini'],
                          },
                          orchestrate: { type: 'boolean' },
                          priority: { 
                            type: 'string',
                            enum: ['high', 'medium', 'low'],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Task executed successfully',
              },
              '400': {
                description: 'Invalid request',
              },
              '500': {
                description: 'Server error',
              },
            },
          },
        },
      },
    };
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    this.logger.info('Initiating graceful shutdown...');

    try {
      // Close WebSocket connections
      await this.wsbridge.shutdown();

      // Shutdown orchestrator
      if (this.isDistributed) {
        await (this.orchestrator as DistributedOrchestrator).shutdown();
      }

      // Save learning data
      await this.learningModule.saveToPersistence();
      this.learningModule.destroy();

      // Close HTTP server
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          this.logger.info('HTTP server closed');
          resolve();
        });
      });

      this.logger.info('Graceful shutdown complete');
      process.exit(0);

    } catch (error) {
      this.logger.error('Error during shutdown', error);
      process.exit(1);
    }
  }
}

// Type definitions
interface ServerConfig {
  port?: number;
  distributed?: boolean;
  nodeId?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  maxConcurrency?: number;
  logLevel?: string;
}

// Create and export a function to start the server
export async function startBridgeServer(config: ServerConfig = {}): Promise<BridgeServer> {
  const server = new BridgeServer(config);
  await server.start();
  return server;
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startBridgeServer({
    port: parseInt(process.env.PORT || '3001'),
    distributed: process.env.DISTRIBUTED_MODE === 'true',
    nodeId: process.env.NODE_ID,
    redisHost: process.env.REDIS_HOST,
    redisPort: parseInt(process.env.REDIS_PORT || '6379'),
    redisPassword: process.env.REDIS_PASSWORD,
    maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '5'),
    logLevel: process.env.LOG_LEVEL || 'info',
  }).catch(console.error);
}