export interface DomainEvent {
  aggregateId: string;
  eventType: string;
  eventData: Record<string, any>;
  eventVersion: number;
  timestamp: Date;
  userId?: string;
  correlationId?: string;
  causationId?: string;
}