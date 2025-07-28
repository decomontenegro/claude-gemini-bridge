import { EventEmitter } from 'events';
import winston from 'winston';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types/index.js';
import { Orchestrator } from '../orchestration/orchestrator.js';
import { RetryManager } from '../utils/retry-manager.js';
import os from 'os';

/**
 * Distributed Orchestrator - Enables multi-node deployment with Redis-based coordination
 * @class DistributedOrchestrator
 * @extends EventEmitter
 * 
 * Features:
 * - Horizontal scaling across multiple nodes
 * - Task queue with priority support
 * - Node health monitoring
 * - Automatic failover and recovery
 * - Load balancing strategies
 */
export class DistributedOrchestrator extends EventEmitter {
  private nodeId: string;
  private redis: Redis;
  private redisSub: Redis;
  private orchestrator: Orchestrator;
  private logger: winston.Logger;
  private retryManager: RetryManager;
  private isActive: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private taskProcessInterval?: NodeJS.Timeout;
  
  // Node state
  private nodeInfo: NodeInfo = {
    id: '',
    hostname: '',
    capabilities: [],
    status: 'initializing',
    lastHeartbeat: new Date(),
    tasksProcessed: 0,
    currentLoad: 0,
    maxConcurrency: 5,
  };

  /**
   * Create a distributed orchestrator instance
   * @param {winston.Logger} logger - Logger instance
   * @param {DistributedConfig} config - Configuration options
   */
  constructor(logger: winston.Logger, config: DistributedConfig) {
    super();
    this.logger = logger;
    this.nodeId = config.nodeId || `node-${uuidv4().substring(0, 8)}`;
    this.orchestrator = new Orchestrator(logger);
    this.retryManager = new RetryManager(logger);
    
    // Initialize Redis connections
    this.redis = new Redis({
      host: config.redisHost || 'localhost',
      port: config.redisPort || 6379,
      password: config.redisPassword,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    
    this.redisSub = this.redis.duplicate();
    
    // Initialize node info
    this.nodeInfo = {
      ...this.nodeInfo,
      id: this.nodeId,
      hostname: os.hostname(),
      capabilities: this.getNodeCapabilities(),
      maxConcurrency: config.maxConcurrency || 5,
    };
    
    this.setupRedisHandlers();
  }

  /**
   * Start the distributed orchestrator
   */
  async start(): Promise<void> {
    this.logger.info(`Starting distributed orchestrator node: ${this.nodeId}`);
    
    try {
      // Register node
      await this.registerNode();
      
      // Subscribe to channels
      await this.subscribeToChannels();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Start task processing
      this.startTaskProcessing();
      
      this.isActive = true;
      this.nodeInfo.status = 'active';
      await this.updateNodeStatus();
      
      this.logger.info(`Distributed orchestrator started: ${this.nodeId}`);
      this.emit('started', { nodeId: this.nodeId });
      
    } catch (error) {
      this.logger.error('Failed to start distributed orchestrator', error);
      throw error;
    }
  }

  /**
   * Submit a task to the distributed system
   */
  async submitTask(message: Message): Promise<string> {
    const taskId = message.task.id;
    
    // Store task in Redis
    const taskData = {
      ...message,
      submittedAt: new Date().toISOString(),
      submittedBy: this.nodeId,
      status: 'queued',
      priority: message.metadata.priority || 'medium',
    };
    
    await this.redis.multi()
      .set(`task:${taskId}`, JSON.stringify(taskData), 'EX', 86400) // 24h expiry
      .zadd('task:queue', this.getPriorityScore(taskData.priority), taskId)
      .publish('task:submitted', JSON.stringify({ taskId, nodeId: this.nodeId }))
      .exec();
    
    this.logger.info(`Task submitted to distributed queue: ${taskId}`);
    
    return taskId;
  }

  /**
   * Process tasks from the distributed queue
   */
  private async processNextTask(): Promise<void> {
    if (this.nodeInfo.currentLoad >= this.nodeInfo.maxConcurrency) {
      return; // Node at capacity
    }
    
    try {
      // Attempt to claim a task atomically
      const claimScript = `
        local task_id = redis.call('zpopmax', KEYS[1])
        if #task_id > 0 then
          redis.call('setex', 'task:claim:' .. task_id[1], 300, ARGV[1])
          return task_id[1]
        end
        return nil
      `;
      
      const taskId = await this.redis.eval(
        claimScript,
        1,
        'task:queue',
        this.nodeId
      ) as string;
      
      if (!taskId) {
        return; // No tasks available
      }
      
      // Process the claimed task
      await this.executeTask(taskId);
      
    } catch (error) {
      this.logger.error('Error processing task from queue', error);
    }
  }

  /**
   * Execute a specific task
   */
  private async executeTask(taskId: string): Promise<void> {
    this.nodeInfo.currentLoad++;
    await this.updateNodeStatus();
    
    try {
      // Retrieve task data
      const taskDataStr = await this.redis.get(`task:${taskId}`);
      if (!taskDataStr) {
        throw new Error(`Task not found: ${taskId}`);
      }
      
      const taskData = JSON.parse(taskDataStr) as Message;
      
      // Update task status
      await this.updateTaskStatus(taskId, 'processing', {
        processingNode: this.nodeId,
        startedAt: new Date().toISOString(),
      });
      
      // Execute with retry logic
      const result = await this.retryManager.executeWithRetry(
        () => this.orchestrator.processMessage(taskData),
        {
          maxAttempts: 3,
          circuitBreakerKey: `task-${taskData.task.type}`,
        }
      );
      
      // Store result
      await this.updateTaskStatus(taskId, 'completed', {
        result,
        completedAt: new Date().toISOString(),
      });
      
      // Notify completion
      await this.redis.publish('task:completed', JSON.stringify({
        taskId,
        nodeId: this.nodeId,
        success: result.success,
      }));
      
      this.nodeInfo.tasksProcessed++;
      
    } catch (error) {
      this.logger.error(`Failed to execute task ${taskId}`, error);
      
      await this.updateTaskStatus(taskId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString(),
      });
      
      // Re-queue task if retryable
      if (this.isRetryableTask(error)) {
        await this.requeueTask(taskId);
      }
      
    } finally {
      this.nodeInfo.currentLoad--;
      await this.updateNodeStatus();
      
      // Clean up claim
      await this.redis.del(`task:claim:${taskId}`);
    }
  }

  /**
   * Get task result
   */
  async getTaskResult(taskId: string): Promise<any> {
    const taskDataStr = await this.redis.get(`task:${taskId}`);
    if (!taskDataStr) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    const taskData = JSON.parse(taskDataStr);
    
    if (taskData.status !== 'completed' && taskData.status !== 'failed') {
      return {
        status: taskData.status,
        message: 'Task is still being processed',
      };
    }
    
    return taskData;
  }

  /**
   * Setup Redis event handlers
   */
  private setupRedisHandlers(): void {
    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', error);
      this.emit('error', { type: 'redis', error });
    });
    
    this.redis.on('connect', () => {
      this.logger.info('Redis connected');
    });
    
    this.redisSub.on('message', this.handleRedisMessage.bind(this));
  }

  /**
   * Handle Redis pub/sub messages
   */
  private async handleRedisMessage(channel: string, message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'node:failover':
          await this.handleNodeFailover(data);
          break;
          
        case 'task:priority_update':
          await this.handlePriorityUpdate(data);
          break;
          
        case 'cluster:rebalance':
          await this.handleClusterRebalance(data);
          break;
      }
      
    } catch (error) {
      this.logger.error(`Error handling Redis message on ${channel}`, error);
    }
  }

  /**
   * Handle node failover
   */
  private async handleNodeFailover(data: { failedNodeId: string }): Promise<void> {
    if (data.failedNodeId === this.nodeId) {
      return; // We're the failed node
    }
    
    this.logger.info(`Handling failover for node: ${data.failedNodeId}`);
    
    // Attempt to claim orphaned tasks
    const orphanedTasks = await this.redis.keys(`task:claim:*`);
    
    for (const claimKey of orphanedTasks) {
      const claimedBy = await this.redis.get(claimKey);
      if (claimedBy === data.failedNodeId) {
        const taskId = claimKey.split(':')[2];
        await this.requeueTask(taskId);
      }
    }
  }

  /**
   * Subscribe to Redis channels
   */
  private async subscribeToChannels(): Promise<void> {
    const channels = [
      'node:failover',
      'task:priority_update',
      'cluster:rebalance',
    ];
    
    await this.redisSub.subscribe(...channels);
    this.logger.info(`Subscribed to channels: ${channels.join(', ')}`);
  }

  /**
   * Register node in the cluster
   */
  private async registerNode(): Promise<void> {
    const nodeData = {
      ...this.nodeInfo,
      registeredAt: new Date().toISOString(),
    };
    
    await this.redis.multi()
      .set(`node:${this.nodeId}`, JSON.stringify(nodeData), 'EX', 60) // 1min expiry
      .sadd('nodes:active', this.nodeId)
      .exec();
    
    this.logger.info(`Node registered: ${this.nodeId}`);
  }

  /**
   * Update node status
   */
  private async updateNodeStatus(): Promise<void> {
    const nodeData = {
      ...this.nodeInfo,
      lastHeartbeat: new Date(),
      loadPercentage: (this.nodeInfo.currentLoad / this.nodeInfo.maxConcurrency) * 100,
    };
    
    await this.redis.setex(
      `node:${this.nodeId}`,
      60,
      JSON.stringify(nodeData)
    );
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Heartbeat
    this.healthCheckInterval = setInterval(async () => {
      await this.updateNodeStatus();
      
      // Check for failed nodes
      const activeNodes = await this.redis.smembers('nodes:active');
      
      for (const nodeId of activeNodes) {
        if (nodeId === this.nodeId) continue;
        
        const nodeData = await this.redis.get(`node:${nodeId}`);
        if (!nodeData) {
          // Node failed
          await this.handleNodeFailure(nodeId);
        }
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Handle node failure detection
   */
  private async handleNodeFailure(failedNodeId: string): Promise<void> {
    this.logger.warn(`Detected failed node: ${failedNodeId}`);
    
    await this.redis.multi()
      .srem('nodes:active', failedNodeId)
      .publish('node:failover', JSON.stringify({ failedNodeId }))
      .exec();
  }

  /**
   * Start task processing loop
   */
  private startTaskProcessing(): void {
    this.taskProcessInterval = setInterval(async () => {
      if (this.isActive) {
        await this.processNextTask();
      }
    }, 1000); // Check every second
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(
    taskId: string,
    status: string,
    additionalData: Record<string, any> = {}
  ): Promise<void> {
    const taskDataStr = await this.redis.get(`task:${taskId}`);
    if (!taskDataStr) return;
    
    const taskData = JSON.parse(taskDataStr);
    const updatedData = {
      ...taskData,
      status,
      ...additionalData,
      lastUpdated: new Date().toISOString(),
    };
    
    await this.redis.set(
      `task:${taskId}`,
      JSON.stringify(updatedData),
      'EX',
      86400
    );
  }

  /**
   * Get node capabilities based on available adapters
   */
  private getNodeCapabilities(): string[] {
    return [
      'distributed_processing',
      'failover_recovery',
      'load_balancing',
      'priority_queuing',
      'claude_integration',
      'gemini_integration',
    ];
  }

  /**
   * Calculate priority score for task queuing
   */
  private getPriorityScore(priority: string): number {
    const now = Date.now();
    const priorityWeights = {
      high: 1000000000,
      medium: 500000000,
      low: 0,
    };
    
    return now - (priorityWeights[priority as keyof typeof priorityWeights] || 0);
  }

  /**
   * Check if task should be retried
   */
  private isRetryableTask(error: any): boolean {
    const nonRetryableErrors = [
      'INVALID_TASK',
      'AUTHENTICATION_FAILED',
      'INVALID_PAYLOAD',
    ];
    
    const errorCode = error?.code || '';
    return !nonRetryableErrors.includes(errorCode);
  }

  /**
   * Re-queue a task
   */
  private async requeueTask(taskId: string): Promise<void> {
    const taskDataStr = await this.redis.get(`task:${taskId}`);
    if (!taskDataStr) return;
    
    const taskData = JSON.parse(taskDataStr);
    const retryCount = (taskData.retryCount || 0) + 1;
    
    if (retryCount > 3) {
      await this.updateTaskStatus(taskId, 'failed', {
        error: 'Max retries exceeded',
      });
      return;
    }
    
    await this.redis.multi()
      .set(`task:${taskId}`, JSON.stringify({
        ...taskData,
        status: 'queued',
        retryCount,
      }), 'EX', 86400)
      .zadd('task:queue', this.getPriorityScore(taskData.priority), taskId)
      .exec();
    
    this.logger.info(`Task re-queued: ${taskId} (retry ${retryCount})`);
  }

  /**
   * Handle cluster rebalancing
   */
  private async handleClusterRebalance(data: any): Promise<void> {
    // Implement load balancing logic
    this.logger.info('Cluster rebalance requested', data);
    
    // Adjust node capacity based on cluster state
    const activeNodes = await this.redis.smembers('nodes:active');
    const nodeCount = activeNodes.length;
    
    if (nodeCount > 0) {
      const targetConcurrency = Math.max(
        1,
        Math.floor(this.nodeInfo.maxConcurrency * (1 / nodeCount))
      );
      
      this.nodeInfo.maxConcurrency = targetConcurrency;
      await this.updateNodeStatus();
    }
  }

  /**
   * Handle priority update for tasks
   */
  private async handlePriorityUpdate(data: { taskId: string; priority: string }): Promise<void> {
    const { taskId, priority } = data;
    
    // Update task priority in queue
    await this.redis.zadd(
      'task:queue',
      this.getPriorityScore(priority),
      taskId
    );
    
    this.logger.info(`Task priority updated: ${taskId} -> ${priority}`);
  }

  /**
   * Get cluster statistics
   */
  async getClusterStats(): Promise<ClusterStats> {
    const activeNodes = await this.redis.smembers('nodes:active');
    const queueLength = await this.redis.zcard('task:queue');
    
    const nodeStats = await Promise.all(
      activeNodes.map(async (nodeId) => {
        const nodeDataStr = await this.redis.get(`node:${nodeId}`);
        return nodeDataStr ? JSON.parse(nodeDataStr) : null;
      })
    );
    
    const totalCapacity = nodeStats.reduce(
      (sum, node) => sum + (node?.maxConcurrency || 0),
      0
    );
    
    const totalLoad = nodeStats.reduce(
      (sum, node) => sum + (node?.currentLoad || 0),
      0
    );
    
    return {
      nodeCount: activeNodes.length,
      totalCapacity,
      totalLoad,
      queueLength,
      utilizationPercentage: totalCapacity > 0 ? (totalLoad / totalCapacity) * 100 : 0,
      nodes: nodeStats.filter(Boolean),
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info(`Shutting down distributed orchestrator: ${this.nodeId}`);
    
    this.isActive = false;
    
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.taskProcessInterval) {
      clearInterval(this.taskProcessInterval);
    }
    
    // Unregister node
    await this.redis.multi()
      .del(`node:${this.nodeId}`)
      .srem('nodes:active', this.nodeId)
      .exec();
    
    // Close Redis connections
    await this.redis.quit();
    await this.redisSub.quit();
    
    this.logger.info('Distributed orchestrator shutdown complete');
    this.emit('shutdown', { nodeId: this.nodeId });
  }
}

// Type definitions
interface DistributedConfig {
  nodeId?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  maxConcurrency?: number;
}

interface NodeInfo {
  id: string;
  hostname: string;
  capabilities: string[];
  status: 'initializing' | 'active' | 'draining' | 'failed';
  lastHeartbeat: Date;
  tasksProcessed: number;
  currentLoad: number;
  maxConcurrency: number;
}

interface ClusterStats {
  nodeCount: number;
  totalCapacity: number;
  totalLoad: number;
  queueLength: number;
  utilizationPercentage: number;
  nodes: NodeInfo[];
}