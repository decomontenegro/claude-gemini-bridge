export interface Event {
  name: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: {
    correlationId?: string;
    userId?: string;
    source?: string;
  };
}

export interface EventHandler {
  (event: Event): void | Promise<void>;
}

export interface EventSubscription {
  unsubscribe(): void;
}

export interface EventBus {
  // Publishing
  emit(eventName: string, data: Record<string, any>): Promise<void>;
  emitBatch(events: Array<{ name: string; data: Record<string, any> }>): Promise<void>;
  
  // Subscribing
  on(eventName: string, handler: EventHandler): EventSubscription;
  once(eventName: string, handler: EventHandler): EventSubscription;
  off(eventName: string, handler: EventHandler): void;
  
  // Wildcard subscriptions
  onAny(handler: EventHandler): EventSubscription;
  
  // Event filtering
  onPattern(pattern: RegExp, handler: EventHandler): EventSubscription;
  
  // Management
  removeAllListeners(eventName?: string): void;
  listenerCount(eventName: string): number;
  eventNames(): string[];
}