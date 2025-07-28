export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold?: number
  resetTimeout?: number
  monitoringPeriod?: number
  halfOpenMaxAttempts?: number
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState
  failures: number
  successes: number
  lastFailureTime?: Date
  lastSuccessTime?: Date
  totalRequests: number
  failureRate: number
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly state: CircuitBreakerState) {
    super(message)
    this.name = 'CircuitBreakerError'
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failures = 0
  private successes = 0
  private lastFailureTime?: Date
  private lastSuccessTime?: Date
  private nextAttemptTime?: Date
  private halfOpenAttempts = 0
  private readonly config: Required<CircuitBreakerConfig>

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 60000, // 60 seconds
      monitoringPeriod: config.monitoringPeriod ?? 60000, // 60 seconds
      halfOpenMaxAttempts: config.halfOpenMaxAttempts ?? 3
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen()
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN. Next attempt at ${this.nextAttemptTime?.toISOString()}`,
          this.state
        )
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  getState(): CircuitBreakerState {
    return this.state
  }

  getStats(): CircuitBreakerStats {
    const totalRequests = this.failures + this.successes
    const failureRate = totalRequests > 0 ? this.failures / totalRequests : 0

    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests,
      failureRate
    }
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failures = 0
    this.successes = 0
    this.halfOpenAttempts = 0
    this.lastFailureTime = undefined
    this.lastSuccessTime = undefined
    this.nextAttemptTime = undefined
  }

  private onSuccess(): void {
    this.lastSuccessTime = new Date()
    this.successes++

    switch (this.state) {
      case CircuitBreakerState.HALF_OPEN:
        this.halfOpenAttempts++
        if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
          this.transitionToClosed()
        }
        break
      
      case CircuitBreakerState.CLOSED:
        // Reset failure count on success in closed state
        this.failures = 0
        break
    }
  }

  private onFailure(): void {
    this.lastFailureTime = new Date()
    this.failures++

    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        if (this.failures >= this.config.failureThreshold) {
          this.transitionToOpen()
        }
        break
      
      case CircuitBreakerState.HALF_OPEN:
        this.transitionToOpen()
        break
    }
  }

  private shouldAttemptReset(): boolean {
    return !!this.nextAttemptTime && new Date() >= this.nextAttemptTime
  }

  private transitionToOpen(): void {
    this.state = CircuitBreakerState.OPEN
    this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout)
    this.halfOpenAttempts = 0
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN
    this.halfOpenAttempts = 0
  }

  private transitionToClosed(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failures = 0
    this.halfOpenAttempts = 0
    this.nextAttemptTime = undefined
  }
}

// Advanced Circuit Breaker with monitoring
export class MonitoredCircuitBreaker extends CircuitBreaker {
  private readonly stateHistory: Array<{
    state: CircuitBreakerState
    timestamp: Date
    reason: string
  }> = []

  private readonly listeners: Map<string, (event: CircuitBreakerEvent) => void> = new Map()

  onStateChange(listener: (event: CircuitBreakerEvent) => void): () => void {
    const id = Math.random().toString(36).substr(2, 9)
    this.listeners.set(id, listener)
    
    return () => {
      this.listeners.delete(id)
    }
  }

  protected transitionToState(
    newState: CircuitBreakerState, 
    reason: string
  ): void {
    const oldState = this.getState()
    
    // Call parent transition methods
    switch (newState) {
      case CircuitBreakerState.OPEN:
        super['transitionToOpen']()
        break
      case CircuitBreakerState.HALF_OPEN:
        super['transitionToHalfOpen']()
        break
      case CircuitBreakerState.CLOSED:
        super['transitionToClosed']()
        break
    }

    // Record history
    this.stateHistory.push({
      state: newState,
      timestamp: new Date(),
      reason
    })

    // Keep only last 100 entries
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift()
    }

    // Emit event
    const event: CircuitBreakerEvent = {
      oldState,
      newState,
      timestamp: new Date(),
      reason,
      stats: this.getStats()
    }

    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Circuit breaker listener error:', error)
      }
    })
  }

  getHistory(): typeof this.stateHistory {
    return [...this.stateHistory]
  }
}

export interface CircuitBreakerEvent {
  oldState: CircuitBreakerState
  newState: CircuitBreakerState
  timestamp: Date
  reason: string
  stats: CircuitBreakerStats
}