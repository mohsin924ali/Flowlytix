/**
 * Domain Layer Index
 *
 * Barrel exports for the entire domain layer.
 * Provides clean access to entities, value objects, repository interfaces, and errors.
 * Enhanced with comprehensive error hierarchy following DDD principles.
 *
 * @domain Core Business Domain
 * @pattern Barrel Export + DDD
 * @version 1.3.0
 */

// Value Objects
export * from './value-objects';

// Entities
export * from './entities';

// Repository Interfaces
export * from './repositories';

// Services
export * from './services';

// Enhanced Error Hierarchy - Phase 1.3
// Note: Direct error exports available via './errors/index' import
// Domain Error Aliases for Convenience
export {
  ValidationError as DomainValidationError,
  BusinessRuleError as DomainBusinessRuleError,
  NotFoundError as DomainNotFoundError,
  AlreadyExistsError as DomainAlreadyExistsError,
  UnauthorizedError as DomainUnauthorizedError,
  ForbiddenError as DomainForbiddenError,
  ConflictError as DomainConflictError,
  SystemError as DomainSystemError,
  IntegrationError as DomainIntegrationError,
  ErrorFactory as DomainErrorFactory,
  ErrorHandler as DomainErrorHandler,
  ErrorSeverity as DomainErrorSeverity,
} from './errors/index';
