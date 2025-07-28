# Claude-Gemini Bridge Architecture V2

## Overview

The Claude-Gemini Bridge is a sophisticated orchestration system that combines the capabilities of two leading AI assistants. This document outlines the updated architecture incorporating best practices, design patterns, and addressing identified issues from the initial implementation.

## Architecture Principles

### 1. **Separation of Concerns (SoC)**
- Each module has a single, well-defined responsibility
- Business logic separated from infrastructure code
- UI components are pure and receive data via props
- Domain logic isolated from external dependencies

### 2. **Dependency Inversion Principle (DIP)**
- High-level modules don't depend on low-level modules
- Both depend on abstractions (interfaces)
- Dependency injection container for loose coupling

### 3. **Domain-Driven Design (DDD)**
- Rich domain models encapsulating business logic
- Aggregates for consistency boundaries
- Repository pattern for persistence abstraction
- Value objects for immutable concepts

### 4. **Clean Architecture**
- Dependencies point inward
- Domain at the center, independent of frameworks
- Use cases orchestrate domain logic
- Infrastructure adapts to domain needs

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Next.js 14 │  │   Zustand    │  │   React Components    │ │
│  │  App Router │  │ State Mgmt   │  │  (Radix + Tailwind)   │ │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         └─────────────────┴──────────────────────┘               │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WebSocket/REST API
┌───────────────────────────┴─────────────────────────────────────┐
│                      Application Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Use Cases  │  │  API Gateway  │  │   Event Bus            │ │
│  │              │  │              │  │                        │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         └─────────────────┴──────────────────────┘               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                        Domain Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Entities   │  │ Value Objects│  │   Domain Services      │ │
│  │              │  │              │  │                        │ │
│  │  - Task      │  │  - TaskId    │  │  - TaskRouter          │ │
│  │  - Result    │  │  - Priority  │  │  - ResultValidator     │ │
│  │  - Template  │  │  - Status    │  │  - ResultMerger        │ │
│  │  - User      │  │              │  │                        │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                    Infrastructure Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Repositories │  │   Adapters   │  │   External Services    │ │
│  │              │  │              │  │                        │ │
│  │ - PostgreSQL │  │ - Claude     │  │  - Redis Cache         │ │
│  │ - Redis      │  │ - Gemini     │  │  - OpenTelemetry       │ │
│  │              │  │              │  │  - Webhook Service     │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Refactored Module Structure

### Domain Layer (`/src/domain/`)

```typescript
// Entities
export class Task {
  constructor(
    private readonly id: TaskId,
    private prompt: string,
    private type: TaskType,
    private status: TaskStatus,
    private metadata: TaskMetadata
  ) {}
  
  // Business logic methods
  validate(): ValidationResult { }
  canBeExecutedBy(adapter: AdapterType): boolean { }
  updateStatus(status: TaskStatus): void { }
}

// Value Objects
export class TaskId {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidTaskIdError(value);
    }
  }
  
  private isValid(value: string): boolean {
    return /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
  }
}

// Domain Services
export class TaskRouter {
  constructor(
    private readonly strategies: RoutingStrategy[],
    private readonly learningService: LearningService
  ) {}
  
  async route(task: Task): Promise<AdapterType> {
    const recommendations = await this.learningService.getRecommendations(task);
    return this.selectBestAdapter(task, recommendations);
  }
}
```

### Application Layer (`/src/application/`)

```typescript
// Use Cases
export class ExecuteTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly router: TaskRouter,
    private readonly adapters: AdapterRegistry,
    private readonly eventBus: EventBus
  ) {}
  
  async execute(command: ExecuteTaskCommand): Promise<TaskResult> {
    const task = await this.taskRepo.findById(command.taskId);
    const adapterType = await this.router.route(task);
    const adapter = this.adapters.get(adapterType);
    
    await this.eventBus.emit('task:started', { taskId: task.id });
    
    try {
      const result = await adapter.execute(task);
      await this.eventBus.emit('task:completed', { taskId: task.id, result });
      return result;
    } catch (error) {
      await this.eventBus.emit('task:failed', { taskId: task.id, error });
      throw error;
    }
  }
}

// DTOs
export interface ExecuteTaskCommand {
  taskId: string;
  options?: ExecutionOptions;
}

export interface TaskResult {
  taskId: string;
  output: string;
  metadata: ResultMetadata;
  performance: PerformanceMetrics;
}
```

### Infrastructure Layer (`/src/infrastructure/`)

```typescript
// Repository Implementation
export class PostgresTaskRepository implements TaskRepository {
  constructor(private readonly db: DatabaseConnection) {}
  
  async findById(id: TaskId): Promise<Task | null> {
    const row = await this.db.query('SELECT * FROM tasks WHERE id = $1', [id.value]);
    return row ? this.toDomain(row) : null;
  }
  
  async save(task: Task): Promise<void> {
    const data = this.toPersistence(task);
    await this.db.query(
      'INSERT INTO tasks (id, prompt, type, status, metadata) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET ...',
      [data.id, data.prompt, data.type, data.status, data.metadata]
    );
  }
  
  private toDomain(row: any): Task {
    return new Task(
      new TaskId(row.id),
      row.prompt,
      row.type,
      row.status,
      row.metadata
    );
  }
}

// Adapter Implementation
export class ClaudeAdapter implements AIAdapter {
  constructor(
    private readonly config: ClaudeConfig,
    private readonly circuitBreaker: CircuitBreaker,
    private readonly logger: Logger
  ) {}
  
  async execute(task: Task): Promise<AdapterResult> {
    return this.circuitBreaker.call(async () => {
      this.logger.info('Executing task with Claude', { taskId: task.id });
      
      const response = await this.callClaudeAPI(task);
      return this.parseResponse(response);
    });
  }
  
  getCapabilities(): Capability[] {
    return [
      Capability.CODE_GENERATION,
      Capability.CODE_REVIEW,
      Capability.REFACTORING,
      Capability.DEBUGGING,
      Capability.DOCUMENTATION
    ];
  }
}
```

## Design Pattern Implementations

### 1. **Repository Pattern with Unit of Work**

```typescript
interface UnitOfWork {
  tasks: TaskRepository;
  results: ResultRepository;
  templates: TemplateRepository;
  
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

class PostgresUnitOfWork implements UnitOfWork {
  constructor(private readonly transaction: DatabaseTransaction) {
    this.tasks = new PostgresTaskRepository(transaction);
    this.results = new PostgresResultRepository(transaction);
    this.templates = new PostgresTemplateRepository(transaction);
  }
  
  async commit(): Promise<void> {
    await this.transaction.commit();
  }
  
  async rollback(): Promise<void> {
    await this.transaction.rollback();
  }
}
```

### 2. **Strategy Pattern for Routing**

```typescript
interface RoutingStrategy {
  name: string;
  priority: number;
  canHandle(task: Task): boolean;
  selectAdapter(task: Task, adapters: AIAdapter[]): AIAdapter | null;
}

class RuleBasedRoutingStrategy implements RoutingStrategy {
  name = 'rule-based';
  priority = 100;
  
  constructor(private readonly rules: RoutingRule[]) {}
  
  canHandle(task: Task): boolean {
    return this.rules.some(rule => rule.matches(task));
  }
  
  selectAdapter(task: Task, adapters: AIAdapter[]): AIAdapter | null {
    const matchingRule = this.rules.find(rule => rule.matches(task));
    if (!matchingRule) return null;
    
    return adapters.find(adapter => adapter.type === matchingRule.targetAdapter) || null;
  }
}

class MLBasedRoutingStrategy implements RoutingStrategy {
  name = 'ml-based';
  priority = 50;
  
  constructor(private readonly model: RoutingModel) {}
  
  canHandle(task: Task): boolean {
    return true; // Can handle any task
  }
  
  async selectAdapter(task: Task, adapters: AIAdapter[]): Promise<AIAdapter | null> {
    const prediction = await this.model.predict(task);
    return adapters.find(adapter => adapter.type === prediction.recommendedAdapter) || null;
  }
}
```

### 3. **Circuit Breaker Pattern**

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000,
    private readonly resetTimeout: number = 30000
  ) {}
  
  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime!.getTime() > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new CircuitBreakerOpenError();
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

### 4. **Event Sourcing for Audit Trail**

```typescript
interface DomainEvent {
  aggregateId: string;
  eventType: string;
  eventData: any;
  eventVersion: number;
  timestamp: Date;
  userId?: string;
}

class EventStore {
  async append(event: DomainEvent): Promise<void> {
    await this.db.query(
      'INSERT INTO events (aggregate_id, event_type, event_data, event_version, timestamp, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [event.aggregateId, event.eventType, event.eventData, event.eventVersion, event.timestamp, event.userId]
    );
  }
  
  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    const rows = await this.db.query(
      'SELECT * FROM events WHERE aggregate_id = $1 ORDER BY event_version',
      [aggregateId]
    );
    return rows.map(this.toDomainEvent);
  }
}

class TaskAggregate {
  private version = 0;
  private uncommittedEvents: DomainEvent[] = [];
  
  constructor(
    private id: string,
    private events: DomainEvent[] = []
  ) {
    this.replayEvents(events);
  }
  
  execute(command: ExecuteCommand): void {
    // Business logic validation
    if (!this.canExecute()) {
      throw new InvalidOperationError();
    }
    
    // Emit event
    this.emit({
      eventType: 'TaskExecuted',
      eventData: { 
        taskId: this.id,
        executedAt: new Date(),
        executedBy: command.userId
      }
    });
  }
  
  private emit(event: Partial<DomainEvent>): void {
    const domainEvent: DomainEvent = {
      aggregateId: this.id,
      eventVersion: ++this.version,
      timestamp: new Date(),
      ...event
    } as DomainEvent;
    
    this.uncommittedEvents.push(domainEvent);
    this.apply(domainEvent);
  }
}
```

## Caching Strategy

### Multi-Level Cache

```typescript
interface CacheLevel {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

class MemoryCache implements CacheLevel {
  private cache = new Map<string, { value: any; expiry?: number }>();
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiry = ttl ? Date.now() + ttl : undefined;
    this.cache.set(key, { value, expiry });
  }
}

class RedisCache implements CacheLevel {
  constructor(private readonly redis: RedisClient) {}
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl / 1000, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }
}

class MultiLevelCache {
  constructor(private readonly levels: CacheLevel[]) {}
  
  async get<T>(key: string): Promise<T | null> {
    for (const level of this.levels) {
      const value = await level.get<T>(key);
      if (value !== null) {
        // Backfill higher levels
        await this.backfill(key, value, this.levels.indexOf(level));
        return value;
      }
    }
    return null;
  }
  
  private async backfill<T>(key: string, value: T, startIndex: number): Promise<void> {
    for (let i = 0; i < startIndex; i++) {
      await this.levels[i].set(key, value);
    }
  }
}
```

## API Design

### RESTful API with HATEOAS

```typescript
// Response format with hypermedia
interface ApiResponse<T> {
  data: T;
  links: {
    self: string;
    [rel: string]: string;
  };
  meta?: {
    timestamp: string;
    version: string;
    [key: string]: any;
  };
}

// Example: Task response
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "prompt": "Analyze this code",
    "type": "code_review",
    "status": "completed",
    "result": {
      "output": "Code analysis complete...",
      "adapter": "claude"
    }
  },
  "links": {
    "self": "/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000",
    "result": "/api/v1/results/550e8400-e29b-41d4-a716-446655440000",
    "retry": "/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000/retry",
    "similar": "/api/v1/tasks?similar_to=550e8400-e29b-41d4-a716-446655440000"
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0",
    "executionTime": 2.345
  }
}
```

### GraphQL Schema

```graphql
type Query {
  task(id: ID!): Task
  tasks(filter: TaskFilter, pagination: PaginationInput): TaskConnection!
  templates: [Template!]!
  analytics: Analytics!
}

type Mutation {
  createTask(input: CreateTaskInput!): Task!
  executeTask(id: ID!, options: ExecutionOptions): TaskResult!
  createTemplate(input: CreateTemplateInput!): Template!
}

type Subscription {
  taskUpdates(taskId: ID!): TaskUpdate!
  metricsUpdate: Metrics!
}

type Task {
  id: ID!
  prompt: String!
  type: TaskType!
  status: TaskStatus!
  result: TaskResult
  createdAt: DateTime!
  updatedAt: DateTime!
}

type TaskResult {
  output: String!
  adapter: AdapterType!
  executionTime: Float!
  metadata: JSON
}

enum TaskType {
  CODE_GENERATION
  CODE_REVIEW
  DEBUGGING
  REFACTORING
  DOCUMENTATION
}
```

## Error Handling Strategy

### Error Types Hierarchy

```typescript
// Base error class
export abstract class DomainError extends Error {
  abstract code: string;
  abstract statusCode: number;
  
  constructor(
    message: string,
    public readonly details?: any,
    public readonly isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString()
    };
  }
}

// Specific error types
export class ValidationError extends DomainError {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
}

export class NotFoundError extends DomainError {
  code = 'NOT_FOUND';
  statusCode = 404;
}

export class ConflictError extends DomainError {
  code = 'CONFLICT';
  statusCode = 409;
}

export class ExternalServiceError extends DomainError {
  code = 'EXTERNAL_SERVICE_ERROR';
  statusCode = 503;
  
  constructor(
    service: string,
    originalError?: Error,
    details?: any
  ) {
    super(`External service ${service} failed`, details, true);
    this.originalError = originalError;
  }
}

// Global error handler
export class ErrorHandler {
  handle(error: Error, context: ErrorContext): ErrorResponse {
    if (error instanceof DomainError) {
      this.logger.warn('Domain error occurred', { error, context });
      return {
        error: error.toJSON(),
        requestId: context.requestId
      };
    }
    
    // Unexpected errors
    this.logger.error('Unexpected error occurred', { error, context });
    
    if (this.isDevelopment) {
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          stack: error.stack
        },
        requestId: context.requestId
      };
    }
    
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      },
      requestId: context.requestId
    };
  }
}
```

## Security Implementation

### Authentication & Authorization

```typescript
// JWT-based authentication
interface JWTPayload {
  userId: string;
  roles: string[];
  permissions: string[];
}

class AuthService {
  constructor(
    private readonly jwtSecret: string,
    private readonly userRepo: UserRepository
  ) {}
  
  async authenticate(credentials: Credentials): Promise<AuthToken> {
    const user = await this.userRepo.findByEmail(credentials.email);
    if (!user || !await user.verifyPassword(credentials.password)) {
      throw new AuthenticationError('Invalid credentials');
    }
    
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    return { token, refreshToken };
  }
  
  async authorize(token: string, requiredPermission: string): Promise<User> {
    const payload = this.verifyToken(token);
    const user = await this.userRepo.findById(payload.userId);
    
    if (!user.hasPermission(requiredPermission)) {
      throw new AuthorizationError(`Missing permission: ${requiredPermission}`);
    }
    
    return user;
  }
}

// Permission-based authorization middleware
export function requirePermission(permission: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await authService.authorize(req.token, permission);
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Rate limiting with Redis
class RateLimiter {
  constructor(
    private readonly redis: RedisClient,
    private readonly config: RateLimitConfig
  ) {}
  
  async checkLimit(key: string): Promise<boolean> {
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, this.config.windowSeconds);
    }
    
    return current <= this.config.maxRequests;
  }
}
```

## Testing Strategy

### Unit Testing with Dependency Injection

```typescript
// Test setup with mocks
describe('ExecuteTaskUseCase', () => {
  let useCase: ExecuteTaskUseCase;
  let mockTaskRepo: jest.Mocked<TaskRepository>;
  let mockRouter: jest.Mocked<TaskRouter>;
  let mockAdapterRegistry: jest.Mocked<AdapterRegistry>;
  let mockEventBus: jest.Mocked<EventBus>;
  
  beforeEach(() => {
    mockTaskRepo = createMock<TaskRepository>();
    mockRouter = createMock<TaskRouter>();
    mockAdapterRegistry = createMock<AdapterRegistry>();
    mockEventBus = createMock<EventBus>();
    
    useCase = new ExecuteTaskUseCase(
      mockTaskRepo,
      mockRouter,
      mockAdapterRegistry,
      mockEventBus
    );
  });
  
  describe('execute', () => {
    it('should execute task with selected adapter', async () => {
      // Arrange
      const task = new Task(/* ... */);
      const adapter = createMock<AIAdapter>();
      const expectedResult = { output: 'result' };
      
      mockTaskRepo.findById.mockResolvedValue(task);
      mockRouter.route.mockResolvedValue('claude');
      mockAdapterRegistry.get.mockReturnValue(adapter);
      adapter.execute.mockResolvedValue(expectedResult);
      
      // Act
      const result = await useCase.execute({ taskId: task.id });
      
      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:started', expect.any(Object));
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:completed', expect.any(Object));
    });
  });
});

// Integration testing
describe('Task Execution Flow', () => {
  let app: Application;
  let db: TestDatabase;
  
  beforeAll(async () => {
    db = await TestDatabase.create();
    app = await createTestApp(db);
  });
  
  afterAll(async () => {
    await db.cleanup();
  });
  
  it('should execute task end-to-end', async () => {
    // Create task
    const createResponse = await request(app)
      .post('/api/v1/tasks')
      .send({ prompt: 'Test prompt', type: 'code_review' })
      .expect(201);
    
    const taskId = createResponse.body.data.id;
    
    // Execute task
    const executeResponse = await request(app)
      .post(`/api/v1/tasks/${taskId}/execute`)
      .expect(200);
    
    expect(executeResponse.body.data).toHaveProperty('output');
    expect(executeResponse.body.data.status).toBe('completed');
  });
});
```

## Performance Optimization

### Query Optimization

```typescript
// N+1 query prevention with DataLoader
class TaskLoader extends DataLoader<string, Task> {
  constructor(private readonly repo: TaskRepository) {
    super(async (ids) => {
      const tasks = await repo.findByIds(ids);
      const taskMap = new Map(tasks.map(t => [t.id, t]));
      return ids.map(id => taskMap.get(id) || null);
    });
  }
}

// Database query optimization
class OptimizedTaskRepository implements TaskRepository {
  async findWithResults(filter: TaskFilter): Promise<TaskWithResults[]> {
    // Single query with JOIN instead of N+1
    const query = `
      SELECT 
        t.*,
        r.id as result_id,
        r.output as result_output,
        r.adapter as result_adapter
      FROM tasks t
      LEFT JOIN results r ON r.task_id = t.id
      WHERE t.status = $1
      ORDER BY t.created_at DESC
      LIMIT $2
    `;
    
    const rows = await this.db.query(query, [filter.status, filter.limit]);
    return this.mapToTasksWithResults(rows);
  }
}
```

### Async Processing

```typescript
// Background job processing with BullMQ
class TaskQueue {
  private queue: Queue;
  
  constructor(redis: RedisClient) {
    this.queue = new Queue('tasks', { connection: redis });
    
    // Worker to process jobs
    new Worker('tasks', async (job) => {
      const { taskId, operation } = job.data;
      await this.processTask(taskId, operation);
    }, { connection: redis });
  }
  
  async enqueue(taskId: string, operation: string, options?: JobOptions): Promise<void> {
    await this.queue.add('process', { taskId, operation }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      ...options
    });
  }
}

// Stream processing for large results
class StreamingResultProcessor {
  async processLargeResult(taskId: string): Promise<void> {
    const stream = await this.adapter.executeStream(taskId);
    
    await pipeline(
      stream,
      new Transform({
        transform(chunk, encoding, callback) {
          // Process chunk
          const processed = this.processChunk(chunk);
          callback(null, processed);
        }
      }),
      this.createWriteStream(taskId)
    );
  }
}
```

## Monitoring & Observability

### OpenTelemetry Integration

```typescript
// Tracing setup
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'claude-gemini-bridge',
    [SemanticResourceAttributes.SERVICE_VERSION]: '2.0.0',
  }),
});

// Instrument operations
export function trace<T>(
  name: string,
  operation: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('claude-gemini-bridge');
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR,
        message: error.message 
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Metrics collection
class MetricsCollector {
  private readonly meter = metrics.getMeter('claude-gemini-bridge');
  
  private readonly taskCounter = this.meter.createCounter('tasks_total', {
    description: 'Total number of tasks processed'
  });
  
  private readonly taskDuration = this.meter.createHistogram('task_duration_seconds', {
    description: 'Task execution duration',
    boundaries: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
  });
  
  recordTask(adapter: string, status: 'success' | 'failure', duration: number): void {
    this.taskCounter.add(1, { adapter, status });
    this.taskDuration.record(duration, { adapter, status });
  }
}
```

## Deployment Configuration

### Docker Setup

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS dev-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM dev-deps AS build
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache dumb-init

COPY --from=builder /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

USER node
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Kubernetes Manifests

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claude-gemini-bridge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: claude-gemini-bridge
  template:
    metadata:
      labels:
        app: claude-gemini-bridge
    spec:
      containers:
      - name: app
        image: claude-gemini-bridge:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: claude-gemini-bridge
spec:
  selector:
    app: claude-gemini-bridge
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Migration Plan

### Phase 1: Core Refactoring (Week 1-2)
1. Extract domain models from existing code
2. Implement repository pattern
3. Create service layer
4. Add dependency injection

### Phase 2: Infrastructure (Week 3-4)
1. Set up Redis cache
2. Implement circuit breakers
3. Add OpenTelemetry
4. Create comprehensive error handling

### Phase 3: Features (Week 5-8)
1. Template system
2. Advanced analytics
3. Comparison view
4. Collaborative mode

### Phase 4: Performance (Week 9-10)
1. Query optimization
2. Caching implementation
3. Background job processing
4. Frontend optimization

### Phase 5: Deployment (Week 11-12)
1. Docker containerization
2. Kubernetes deployment
3. CI/CD pipeline
4. Monitoring setup

## Conclusion

This architecture provides a robust, scalable foundation for the Claude-Gemini Bridge V2. The modular design, comprehensive testing strategy, and production-ready infrastructure ensure the system can grow and adapt to future requirements while maintaining high performance and reliability.