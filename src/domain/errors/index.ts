import { DomainError } from './DomainError';

// Entity errors
export class InvalidTaskIdError extends DomainError {
  readonly code = 'INVALID_TASK_ID';
  readonly statusCode = 400;

  constructor(taskId: string) {
    super(`Invalid task ID: ${taskId}`);
  }
}

export class TaskNotFoundError extends DomainError {
  readonly code = 'TASK_NOT_FOUND';
  readonly statusCode = 404;

  constructor(taskId: string) {
    super(`Task not found: ${taskId}`, { taskId });
  }
}

export class InvalidTaskStateError extends DomainError {
  readonly code = 'INVALID_TASK_STATE';
  readonly statusCode = 400;

  constructor(currentState: string, attemptedTransition: string) {
    super(
      `Cannot transition from ${currentState} to ${attemptedTransition}`,
      { currentState, attemptedTransition }
    );
  }
}

// Result errors
export class ResultNotFoundError extends DomainError {
  readonly code = 'RESULT_NOT_FOUND';
  readonly statusCode = 404;

  constructor(resultId: string) {
    super(`Result not found: ${resultId}`, { resultId });
  }
}

export class InvalidResultError extends DomainError {
  readonly code = 'INVALID_RESULT';
  readonly statusCode = 400;

  constructor(reason: string) {
    super(`Invalid result: ${reason}`);
  }
}

// Template errors
export class TemplateNotFoundError extends DomainError {
  readonly code = 'TEMPLATE_NOT_FOUND';
  readonly statusCode = 404;

  constructor(templateId: string) {
    super(`Template not found: ${templateId}`, { templateId });
  }
}

export class InvalidTemplateError extends DomainError {
  readonly code = 'INVALID_TEMPLATE';
  readonly statusCode = 400;

  constructor(reason: string, details?: any) {
    super(`Invalid template: ${reason}`, details);
  }
}

export class TemplateVariableError extends DomainError {
  readonly code = 'TEMPLATE_VARIABLE_ERROR';
  readonly statusCode = 400;

  constructor(variableName: string, reason: string) {
    super(`Template variable '${variableName}' error: ${reason}`, { variableName });
  }
}

// Validation errors
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(errors: string[]) {
    super('Validation failed', { errors });
  }
}

// Business rule errors
export class BusinessRuleViolationError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  readonly statusCode = 400;

  constructor(rule: string, details?: any) {
    super(`Business rule violation: ${rule}`, details);
  }
}

// Adapter errors
export class AdapterNotAvailableError extends DomainError {
  readonly code = 'ADAPTER_NOT_AVAILABLE';
  readonly statusCode = 503;

  constructor(adapter: string) {
    super(`Adapter not available: ${adapter}`, { adapter });
  }
}

export class AdapterExecutionError extends DomainError {
  readonly code = 'ADAPTER_EXECUTION_ERROR';
  readonly statusCode = 500;

  constructor(adapter: string, originalError?: Error) {
    super(`Adapter execution failed: ${adapter}`, {
      adapter,
      originalError: originalError?.message
    });
  }
}

// Repository errors
export class RepositoryError extends DomainError {
  readonly code = 'REPOSITORY_ERROR';
  readonly statusCode = 500;

  constructor(operation: string, entity: string, originalError?: Error) {
    super(`Repository operation failed: ${operation} on ${entity}`, {
      operation,
      entity,
      originalError: originalError?.message
    });
  }
}

// Concurrency errors
export class OptimisticLockError extends DomainError {
  readonly code = 'OPTIMISTIC_LOCK_ERROR';
  readonly statusCode = 409;

  constructor(entity: string, id: string) {
    super(`Optimistic lock error on ${entity}: ${id}`, { entity, id });
  }
}

// Authorization errors
export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 401;

  constructor(message: string = 'Unauthorized') {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;

  constructor(resource: string, action: string) {
    super(`Forbidden: Cannot ${action} ${resource}`, { resource, action });
  }
}

// Rate limiting errors
export class RateLimitExceededError extends DomainError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;

  constructor(limit: number, window: string) {
    super(`Rate limit exceeded: ${limit} requests per ${window}`, { limit, window });
  }
}

// External service errors
export class ExternalServiceError extends DomainError {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly statusCode = 503;

  constructor(service: string, originalError?: Error) {
    super(`External service error: ${service}`, {
      service,
      originalError: originalError?.message
    });
  }
}

// Circuit breaker errors
export class CircuitBreakerOpenError extends DomainError {
  readonly code = 'CIRCUIT_BREAKER_OPEN';
  readonly statusCode = 503;

  constructor(service: string) {
    super(`Circuit breaker is open for service: ${service}`, { service });
  }
}

// Type guard functions
export function isDomainError(error: any): error is DomainError {
  return error instanceof DomainError;
}

export function isOperationalError(error: any): boolean {
  return isDomainError(error) && error.isOperational;
}

export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNotFoundError(error: any): boolean {
  return error instanceof TaskNotFoundError || 
         error instanceof ResultNotFoundError || 
         error instanceof TemplateNotFoundError;
}