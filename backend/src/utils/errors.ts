export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('UNAUTHENTICATED', message, 401);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists', details?: Record<string, unknown>) {
    super('CONFLICT', message, 409, true, details);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(message: string = 'Too many requests', retryAfter: number = 60) {
    super('RATE_LIMITED', message, 429);
    this.retryAfter = retryAfter;
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super('INTERNAL_ERROR', message, 500, false);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: Record<string, unknown>) {
    super('BAD_REQUEST', message, 400, true, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super('SERVICE_UNAVAILABLE', message, 503);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}