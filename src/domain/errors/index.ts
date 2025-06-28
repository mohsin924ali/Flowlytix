/**
 * Domain Error Hierarchy - Domain Layer
 *
 * Comprehensive error system following DDD principles and Instructions file requirements.
 * Provides domain-specific errors with proper inheritance, strict TypeScript, and clear semantics.
 *
 * @domain Core Errors
 * @pattern Domain Error Hierarchy + Factory Pattern
 * @layer Domain
 * @version 1.3.0
 */

/**
 * Base Domain Error
 * Root of all domain-specific errors following DDD principles
 */
export abstract class DomainError extends Error {
  public readonly name: string;
  public readonly domain: string;
  public readonly errorCode: string;
  public readonly timestamp: number;
  public readonly context: Record<string, unknown>;

  constructor(message: string, domain: string, errorCode: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.domain = domain;
    this.errorCode = errorCode;
    this.timestamp = Date.now();
    this.context = { ...context };

    // Ensure proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Make error properties non-enumerable for cleaner JSON serialization
    Object.defineProperty(this, 'name', { enumerable: false });
    Object.defineProperty(this, 'stack', { enumerable: false });
  }

  /**
   * Get error details for logging and debugging
   */
  public getErrorDetails(): {
    name: string;
    message: string;
    domain: string;
    errorCode: string;
    timestamp: number;
    context: Record<string, unknown>;
  } {
    return {
      name: this.name,
      message: this.message,
      domain: this.domain,
      errorCode: this.errorCode,
      timestamp: this.timestamp,
      context: this.context,
    };
  }

  /**
   * Check if error is retryable based on domain logic
   */
  public abstract isRetryable(): boolean;

  /**
   * Get user-friendly error message (safe for UI display)
   */
  public abstract getUserMessage(): string;

  /**
   * Get error severity level for proper handling
   */
  public abstract getSeverity(): ErrorSeverity;
}

/**
 * Error Severity Levels
 * Defines the impact and urgency of errors
 */
export enum ErrorSeverity {
  LOW = 'LOW', // Minor issues, system continues normally
  MEDIUM = 'MEDIUM', // Important issues, degraded functionality
  HIGH = 'HIGH', // Serious issues, significant impact
  CRITICAL = 'CRITICAL', // System failure, immediate attention required
}

/**
 * Validation Error
 * Domain validation failures following business rules
 */
export class ValidationError extends DomainError {
  constructor(message: string, field: string, value: unknown, context: Record<string, unknown> = {}) {
    super(message, 'VALIDATION', 'VALIDATION_FAILED', { field, value, ...context });
  }

  public isRetryable(): boolean {
    return false; // User input errors are not retryable
  }

  public getUserMessage(): string {
    const field = this.context.field as string;
    return `Invalid ${field}: ${this.message}`;
  }

  public getSeverity(): ErrorSeverity {
    return ErrorSeverity.LOW;
  }
}

/**
 * Business Rule Error
 * Business logic violations following domain rules
 */
export class BusinessRuleError extends DomainError {
  constructor(message: string, rule: string, context: Record<string, unknown> = {}) {
    super(message, 'BUSINESS', 'BUSINESS_RULE_VIOLATION', { rule, ...context });
  }

  public isRetryable(): boolean {
    return false; // Business rule violations are not retryable
  }

  public getUserMessage(): string {
    return `Business rule violation: ${this.message}`;
  }

  public getSeverity(): ErrorSeverity {
    return ErrorSeverity.MEDIUM;
  }
}

/**
 * Not Found Error
 * Entity or resource not found errors
 */
export class NotFoundError extends DomainError {
  constructor(entityType: string, identifier: string, context: Record<string, unknown> = {}) {
    super(`${entityType} not found with identifier: ${identifier}`, 'RESOURCE', 'NOT_FOUND', {
      entityType,
      identifier,
      ...context,
    });
  }

  public isRetryable(): boolean {
    return false; // Not found errors are typically not retryable
  }

  public getUserMessage(): string {
    const entityType = this.context.entityType as string;
    return `The requested ${entityType.toLowerCase()} could not be found.`;
  }

  public getSeverity(): ErrorSeverity {
    return ErrorSeverity.LOW;
  }
}

/**
 * Already Exists Error
 * Duplicate entity or resource errors
 */
export class AlreadyExistsError extends DomainError {
  constructor(entityType: string, identifier: string, context: Record<string, unknown> = {}) {
    super(`${entityType} already exists with identifier: ${identifier}`, 'RESOURCE', 'ALREADY_EXISTS', {
      entityType,
      identifier,
      ...context,
    });
  }

  public isRetryable(): boolean {
    return false; // Duplicate errors are not retryable
  }

  public getUserMessage(): string {
    const entityType = this.context.entityType as string;
    return `A ${entityType.toLowerCase()} with this identifier already exists.`;
  }

  public getSeverity(): ErrorSeverity {
    return ErrorSeverity.LOW;
  }
}

/**
 * Unauthorized Error
 * Authentication and authorization failures
 */
export class UnauthorizedError extends DomainError {
  constructor(action: string, resource?: string, context: Record<string, unknown> = {}) {
    const message = resource ? `Unauthorized to ${action} ${resource}` : `Unauthorized to ${action}`;

    super(message, 'SECURITY', 'UNAUTHORIZED', { action, resource, ...context });
  }

  public isRetryable(): boolean {
    return false; // Authorization errors are not retryable without credential changes
  }

  public getUserMessage(): string {
    return 'You are not authorized to perform this action.';
  }

  public getSeverity(): ErrorSeverity {
    return ErrorSeverity.HIGH;
  }
}

/**
 * Forbidden Error
 * Permission denied errors
 */
export class ForbiddenError extends DomainError {
  constructor(action: string, resource?: string, context: Record<string, unknown> = {}) {
    const message = resource ? `Forbidden to ${action} ${resource}` : `Forbidden to ${action}`;

    super(message, 'SECURITY', 'FORBIDDEN', { action, resource, ...context });
  }

  public isRetryable(): boolean {
    return false; // Permission errors are not retryable without permission changes
  }

  public getUserMessage(): string {
    return 'You do not have permission to perform this action.';
  }

  public getSeverity(): ErrorSeverity {
    return ErrorSeverity.HIGH;
  }
}

/**
 * Conflict Error
 * Resource state conflicts and concurrency issues
 */
export class ConflictError extends DomainError {
  constructor(message: string, entityType: string, identifier: string, context: Record<string, unknown> = {}) {
    super(message, 'CONCURRENCY', 'CONFLICT', { entityType, identifier, ...context });
  }

  public isRetryable(): boolean {
    return true; // Conflicts might be retryable after refresh
  }

  public getUserMessage(): string {
    return 'This resource has been modified by another user. Please refresh and try again.';
  }

  public getSeverity(): ErrorSeverity {
    return ErrorSeverity.MEDIUM;
  }
}

/**
 * System Error
 * Infrastructure and system-level failures
 */
export class SystemError extends DomainError {
  constructor(message: string, operation: string, cause?: Error, context: Record<string, unknown> = {}) {
    super(message, 'SYSTEM', 'SYSTEM_ERROR', { operation, cause: cause?.message, ...context });
  }

  public isRetryable(): boolean {
    return true; // System errors might be retryable
  }

  public getUserMessage(): string {
    return 'A system error occurred. Please try again later.';
  }

  public getSeverity(): ErrorSeverity {
    return ErrorSeverity.HIGH;
  }
}

/**
 * Integration Error
 * External service and integration failures
 */
export class IntegrationError extends DomainError {
  constructor(service: string, operation: string, message: string, context: Record<string, unknown> = {}) {
    super(`${service} integration error: ${message}`, 'INTEGRATION', 'EXTERNAL_SERVICE_ERROR', {
      service,
      operation,
      ...context,
    });
  }

  public isRetryable(): boolean {
    return true; // Integration errors might be retryable
  }

  public getUserMessage(): string {
    const service = this.context.service as string;
    return `Unable to connect to ${service}. Please try again later.`;
  }

  public getSeverity(): ErrorSeverity {
    return ErrorSeverity.MEDIUM;
  }
}

/**
 * Rate Limit Error
 * Rate limiting and throttling failures
 */
export class RateLimitError extends DomainError {
  constructor(limit: number, window: number, retryAfter: number, context: Record<string, unknown> = {}) {
    super(`Rate limit exceeded: ${limit} requests per ${window}ms`, 'THROTTLING', 'RATE_LIMIT_EXCEEDED', {
      limit,
      window,
      retryAfter,
      ...context,
    });
  }

  public isRetryable(): boolean {
    return true; // Rate limit errors are retryable after waiting
  }

  public getUserMessage(): string {
    const retryAfter = this.context.retryAfter as number;
    const seconds = Math.ceil(retryAfter / 1000);
    return `Too many requests. Please wait ${seconds} seconds before trying again.`;
  }

  public getSeverity(): ErrorSeverity {
    return ErrorSeverity.LOW;
  }

  public getRetryAfter(): number {
    return this.context.retryAfter as number;
  }
}

/**
 * Error Factory
 * Creates domain-specific errors following factory pattern
 */
export class ErrorFactory {
  /**
   * Create validation error
   */
  public static validation(
    message: string,
    field: string,
    value: unknown,
    context?: Record<string, unknown>
  ): ValidationError {
    return new ValidationError(message, field, value, context);
  }

  /**
   * Create business rule error
   */
  public static businessRule(message: string, rule: string, context?: Record<string, unknown>): BusinessRuleError {
    return new BusinessRuleError(message, rule, context);
  }

  /**
   * Create not found error
   */
  public static notFound(entityType: string, identifier: string, context?: Record<string, unknown>): NotFoundError {
    return new NotFoundError(entityType, identifier, context);
  }

  /**
   * Create already exists error
   */
  public static alreadyExists(
    entityType: string,
    identifier: string,
    context?: Record<string, unknown>
  ): AlreadyExistsError {
    return new AlreadyExistsError(entityType, identifier, context);
  }

  /**
   * Create unauthorized error
   */
  public static unauthorized(action: string, resource?: string, context?: Record<string, unknown>): UnauthorizedError {
    return new UnauthorizedError(action, resource, context);
  }

  /**
   * Create forbidden error
   */
  public static forbidden(action: string, resource?: string, context?: Record<string, unknown>): ForbiddenError {
    return new ForbiddenError(action, resource, context);
  }

  /**
   * Create conflict error
   */
  public static conflict(
    message: string,
    entityType: string,
    identifier: string,
    context?: Record<string, unknown>
  ): ConflictError {
    return new ConflictError(message, entityType, identifier, context);
  }

  /**
   * Create system error
   */
  public static system(
    message: string,
    operation: string,
    cause?: Error,
    context?: Record<string, unknown>
  ): SystemError {
    return new SystemError(message, operation, cause, context);
  }

  /**
   * Create integration error
   */
  public static integration(
    service: string,
    operation: string,
    message: string,
    context?: Record<string, unknown>
  ): IntegrationError {
    return new IntegrationError(service, operation, message, context);
  }

  /**
   * Create rate limit error
   */
  public static rateLimit(
    limit: number,
    window: number,
    retryAfter: number,
    context?: Record<string, unknown>
  ): RateLimitError {
    return new RateLimitError(limit, window, retryAfter, context);
  }
}

/**
 * Error Handler Utility
 * Utilities for error handling and transformation
 */
export class ErrorHandler {
  /**
   * Check if error is a domain error
   */
  public static isDomainError(error: unknown): error is DomainError {
    return error instanceof DomainError;
  }

  /**
   * Convert unknown error to domain error
   */
  public static toDomainError(error: unknown, operation: string): DomainError {
    if (ErrorHandler.isDomainError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return ErrorFactory.system(error.message, operation, error);
    }

    return ErrorFactory.system('Unknown error occurred', operation);
  }

  /**
   * Get error summary for logging
   */
  public static getErrorSummary(error: unknown): {
    name: string;
    message: string;
    domain?: string;
    errorCode?: string;
    severity?: ErrorSeverity;
    retryable?: boolean;
  } {
    if (ErrorHandler.isDomainError(error)) {
      return {
        name: error.name,
        message: error.message,
        domain: error.domain,
        errorCode: error.errorCode,
        severity: error.getSeverity(),
        retryable: error.isRetryable(),
      };
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }

    return {
      name: 'UnknownError',
      message: String(error),
    };
  }

  /**
   * Filter sensitive information from error context
   */
  public static sanitizeErrorForClient(error: DomainError): {
    name: string;
    message: string;
    errorCode: string;
    userMessage: string;
    retryable: boolean;
    severity: ErrorSeverity;
  } {
    return {
      name: error.name,
      message: error.getUserMessage(), // Safe user message
      errorCode: error.errorCode,
      userMessage: error.getUserMessage(),
      retryable: error.isRetryable(),
      severity: error.getSeverity(),
    };
  }
}
