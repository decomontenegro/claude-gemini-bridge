import winston from 'winston';
import { EventEmitter } from 'events';

/**
 * Advanced retry manager with exponential backoff and circuit breaker pattern
 * @module RetryManager
 */
export class RetryManager extends EventEmitter {
  private logger: winston.Logger;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(logger: winston.Logger) {
    super();
    this.logger = logger;
  }

  /**
   * Execute a function with retry logic
   * @param fn - Function to execute
   * @param options - Retry options
   * @returns Promise with the result
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = {
      maxAttempts: options.maxAttempts ?? 3,
      initialDelay: options.initialDelay ?? 1000,
      maxDelay: options.maxDelay ?? 30000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
      jitter: options.jitter ?? true,
      retryableErrors: options.retryableErrors ?? [],
      circuitBreakerKey: options.circuitBreakerKey,
      timeout: options.timeout ?? 60000,
    };

    // Check circuit breaker if key provided
    if (config.circuitBreakerKey) {
      const breaker = this.getOrCreateCircuitBreaker(config.circuitBreakerKey);
      if (!breaker.canExecute()) {
        throw new Error(`Circuit breaker is open for: ${config.circuitBreakerKey}`);
      }
    }

    let lastError: Error | undefined;
    let delay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        this.logger.debug(`Executing attempt ${attempt}/${config.maxAttempts}`, {
          delay: attempt > 1 ? delay : 0,
          circuitBreakerKey: config.circuitBreakerKey,
        });

        // Add timeout wrapper
        const result = await this.withTimeout(fn(), config.timeout);

        // Success - reset circuit breaker if applicable
        if (config.circuitBreakerKey) {
          const breaker = this.circuitBreakers.get(config.circuitBreakerKey);
          breaker?.recordSuccess();
        }

        this.emit('retry:success', {
          attempt,
          totalAttempts: config.maxAttempts,
        });

        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Record failure in circuit breaker
        if (config.circuitBreakerKey) {
          const breaker = this.circuitBreakers.get(config.circuitBreakerKey);
          breaker?.recordFailure();
        }

        // Check if error is retryable
        if (!this.isRetryableError(error, config.retryableErrors)) {
          this.logger.error('Non-retryable error encountered', { error });
          throw error;
        }

        // Check if we've exhausted attempts
        if (attempt === config.maxAttempts) {
          this.logger.error('Max retry attempts exceeded', {
            attempts: config.maxAttempts,
            error,
          });
          
          this.emit('retry:exhausted', {
            attempts: config.maxAttempts,
            lastError: error,
          });
          
          throw new RetryExhaustedError(
            `Failed after ${config.maxAttempts} attempts: ${lastError.message}`,
            lastError
          );
        }

        // Calculate next delay with exponential backoff
        if (attempt > 1) {
          await this.sleep(delay);
        }
        
        delay = this.calculateNextDelay(delay, config);
        
        this.logger.warn(`Attempt ${attempt} failed, retrying...`, {
          error: lastError.message,
          nextDelay: delay,
          nextAttempt: attempt + 1,
        });

        this.emit('retry:attempt', {
          attempt,
          error: lastError,
          nextDelay: delay,
        });
      }
    }

    throw lastError!;
  }

  /**
   * Execute multiple operations with retry and collect results
   */
  async executeParallelWithRetry<T>(
    operations: Array<() => Promise<T>>,
    options: RetryOptions = {}
  ): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
    const results = await Promise.allSettled(
      operations.map(op => this.executeWithRetry(op, options))
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return { success: true, result: result.value };
      } else {
        return { success: false, error: result.reason };
      }
    });
  }

  /**
   * Create a retry wrapper for a function
   */
  createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: RetryOptions = {}
  ): T {
    return (async (...args: Parameters<T>) => {
      return this.executeWithRetry(() => fn(...args), options);
    }) as T;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any, retryableErrors: Array<string | RegExp>): boolean {
    // Network and timeout errors are always retryable
    const alwaysRetryable = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
      'ECONNABORTED',
      'EPIPE',
    ];

    const errorCode = error?.code;
    const errorMessage = error?.message || '';

    // Check always retryable errors
    if (errorCode && alwaysRetryable.includes(errorCode)) {
      return true;
    }

    // Check rate limit errors
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return true;
    }

    // Check custom retryable errors
    for (const pattern of retryableErrors) {
      if (typeof pattern === 'string') {
        if (errorCode === pattern || errorMessage.includes(pattern)) {
          return true;
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(errorMessage)) {
          return true;
        }
      }
    }

    // Check HTTP status codes
    if (error?.status) {
      const status = error.status;
      // Retry on 5xx errors and specific 4xx errors
      return status >= 500 || status === 408 || status === 429;
    }

    return false;
  }

  /**
   * Calculate next delay with exponential backoff and jitter
   */
  private calculateNextDelay(currentDelay: number, config: any): number {
    let nextDelay = currentDelay * config.backoffMultiplier;
    
    // Apply max delay cap
    nextDelay = Math.min(nextDelay, config.maxDelay);
    
    // Apply jitter to prevent thundering herd
    if (config.jitter) {
      const jitterAmount = nextDelay * 0.2; // 20% jitter
      const jitter = Math.random() * jitterAmount - jitterAmount / 2;
      nextDelay += jitter;
    }
    
    return Math.round(nextDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add timeout to a promise
   */
  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);
      }),
    ]);
  }

  /**
   * Get or create a circuit breaker for a key
   */
  private getOrCreateCircuitBreaker(key: string): CircuitBreaker {
    if (!this.circuitBreakers.has(key)) {
      const breaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 120000, // 2 minutes
      });
      
      breaker.on('open', () => {
        this.logger.warn(`Circuit breaker opened for: ${key}`);
        this.emit('circuitBreaker:open', { key });
      });
      
      breaker.on('halfOpen', () => {
        this.logger.info(`Circuit breaker half-open for: ${key}`);
        this.emit('circuitBreaker:halfOpen', { key });
      });
      
      breaker.on('close', () => {
        this.logger.info(`Circuit breaker closed for: ${key}`);
        this.emit('circuitBreaker:close', { key });
      });
      
      this.circuitBreakers.set(key, breaker);
    }
    
    return this.circuitBreakers.get(key)!;
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    
    this.circuitBreakers.forEach((breaker, key) => {
      stats.set(key, breaker.getStats());
    });
    
    return stats;
  }

  /**
   * Reset a specific circuit breaker
   */
  resetCircuitBreaker(key: string): void {
    const breaker = this.circuitBreakers.get(key);
    if (breaker) {
      breaker.reset();
      this.logger.info(`Circuit breaker reset for: ${key}`);
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.forEach((breaker, _key) => {
      breaker.reset();
    });
    this.logger.info('All circuit breakers reset');
  }
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker extends EventEmitter {
  private state: 'closed' | 'open' | 'halfOpen' = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;
  private readonly config: CircuitBreakerConfig;
  private monitoringWindow: number[] = [];

  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = config;
  }

  canExecute(): boolean {
    if (this.state === 'closed') {
      return true;
    }
    
    if (this.state === 'open' && this.shouldTransitionToHalfOpen()) {
      this.transitionTo('halfOpen');
      return true;
    }
    
    return this.state === 'halfOpen';
  }

  recordSuccess(): void {
    this.successes++;
    
    if (this.state === 'halfOpen') {
      this.transitionTo('closed');
    }
    
    this.updateMonitoringWindow(true);
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    
    this.updateMonitoringWindow(false);
    
    if (this.state === 'closed' || this.state === 'halfOpen') {
      if (this.shouldOpen()) {
        this.transitionTo('open');
      }
    }
  }

  private shouldOpen(): boolean {
    const recentFailures = this.getRecentFailures();
    return recentFailures >= this.config.failureThreshold;
  }

  private shouldTransitionToHalfOpen(): boolean {
    if (!this.nextAttemptTime) {
      return false;
    }
    return new Date() >= this.nextAttemptTime;
  }

  private transitionTo(newState: 'closed' | 'open' | 'halfOpen'): void {
    const oldState = this.state;
    this.state = newState;
    
    if (newState === 'open') {
      this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
    } else if (newState === 'closed') {
      this.failures = 0;
      this.nextAttemptTime = undefined;
    }
    
    this.emit(newState);
    this.emit('stateChange', { from: oldState, to: newState });
  }

  private updateMonitoringWindow(success: boolean): void {
    const now = Date.now();
    const windowStart = now - this.config.monitoringPeriod;
    
    // Remove old entries
    this.monitoringWindow = this.monitoringWindow.filter(
      timestamp => timestamp > windowStart
    );
    
    // Add new entry (0 for failure, 1 for success)
    this.monitoringWindow.push(success ? 1 : 0);
  }

  private getRecentFailures(): number {
    const now = Date.now();
    const windowStart = now - this.config.monitoringPeriod;
    
    return this.monitoringWindow.filter(
      (value, index) => {
        const timestamp = now - (this.monitoringWindow.length - index) * 1000;
        return timestamp > windowStart && value === 0;
      }
    ).length;
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    this.monitoringWindow = [];
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      recentFailures: this.getRecentFailures(),
    };
  }
}

/**
 * Custom error class for retry exhaustion
 */
export class RetryExhaustedError extends Error {
  constructor(message: string, public readonly lastError: Error) {
    super(message);
    this.name = 'RetryExhaustedError';
  }
}

// Type definitions
export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryableErrors?: Array<string | RegExp>;
  circuitBreakerKey?: string;
  timeout?: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

interface CircuitBreakerStats {
  state: 'closed' | 'open' | 'halfOpen';
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  recentFailures: number;
}