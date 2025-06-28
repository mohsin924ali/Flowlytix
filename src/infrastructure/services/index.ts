/**
 * Infrastructure Services Index - Infrastructure Layer
 *
 * Centralized exports for infrastructure service adapters.
 * Follows Instructions file requirements for proper module organization and dependency injection.
 *
 * @domain Infrastructure
 * @pattern Barrel Export + Factory Pattern
 * @layer Infrastructure
 * @version 1.2.0
 */

// Core Authentication Service
export {
  AuthenticationService,
  AuthenticationServiceError,
  createAuthenticationService,
  type ISessionStorage,
  type IAuditLogger,
  type IRateLimiter,
  type AuthenticationServiceConfig,
  type SessionData,
  type SecurityEvent,
  type AuthenticationStats,
  type TimeRange,
  type RateLimitResult,
  SecurityEventType,
  SecurityEventSeverity,
} from './authentication.service';

// Session Storage Adapters
export { InMemorySessionStorage, SessionStorageError, createInMemorySessionStorage } from './session-storage.service';

// Audit Logger Adapters
export { InMemoryAuditLogger, AuditLoggerError, createInMemoryAuditLogger } from './audit-logger.service';

// Rate Limiter Adapters
export { InMemoryRateLimiter, RateLimiterError, createInMemoryRateLimiter } from './rate-limiter.service';

/**
 * Authentication Service Factory
 * Creates a complete authentication service with all dependencies
 * Follows dependency injection pattern from Instructions
 *
 * @param config - Optional authentication service configuration
 * @returns Configured AuthenticationService instance
 */
export function createCompleteAuthenticationService(
  config?: Partial<import('./authentication.service').AuthenticationServiceConfig>
): import('./authentication.service').AuthenticationService {
  // Import factory functions
  const { createInMemorySessionStorage } = require('./session-storage.service');
  const { createInMemoryAuditLogger } = require('./audit-logger.service');
  const { createInMemoryRateLimiter } = require('./rate-limiter.service');
  const { createAuthenticationService } = require('./authentication.service');

  // Create infrastructure adapters
  const sessionStorage = createInMemorySessionStorage();
  const auditLogger = createInMemoryAuditLogger();
  const rateLimiter = createInMemoryRateLimiter();

  // Create and return configured authentication service
  return createAuthenticationService(sessionStorage, auditLogger, rateLimiter, config);
}

// Payment Gateway Service Implementation - Step 2C: Payment Infrastructure Layer
export {
  PaymentGatewayServiceImpl,
  createPaymentGatewayService,
  PaymentGatewayServiceError,
  GatewayErrorCode,
} from './payment-gateway.service';

// Sales Analytics Service Implementation - Phase 3: Analytics Infrastructure Layer
export { SalesAnalyticsServiceImpl, createSalesAnalyticsService, AnalyticsErrorCode } from './sales-analytics.service';
