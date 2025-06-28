/**
 * Authentication Service Implementation - Infrastructure Layer
 *
 * Implements IAuthenticationService port as an adapter in Hexagonal Architecture.
 * Follows Instructions file requirements for security, dependency injection, and strict TypeScript.
 * Provides session management, security monitoring, and audit logging capabilities.
 *
 * @domain Authentication
 * @pattern Adapter Pattern + Hexagonal Architecture
 * @layer Infrastructure
 * @version 1.2.0
 */

import { randomBytes, createHash } from 'crypto';
import {
  IAuthenticationService,
  SessionInfo,
  AuthenticationAttemptLog,
  SecurityCheckResult,
} from '../../application/handlers/auth/authenticate-user.handler';
import { AuthenticationMetadata } from '../../application/commands/auth/authenticate-user.command';
import { User } from '../../domain/entities/user';

/**
 * Session Storage Interface (Port)
 * Defines contract for session persistence following Hexagonal Architecture
 */
export interface ISessionStorage {
  /**
   * Store session data
   * @param sessionId - Unique session identifier
   * @param sessionData - Session information to store
   * @param expiresAt - Session expiration timestamp
   * @returns Promise<void>
   */
  storeSession(sessionId: string, sessionData: SessionData, expiresAt: number): Promise<void>;

  /**
   * Retrieve session data
   * @param sessionId - Session identifier
   * @returns Promise<SessionData | null> - Session data or null if not found/expired
   */
  getSession(sessionId: string): Promise<SessionData | null>;

  /**
   * Remove session
   * @param sessionId - Session identifier
   * @returns Promise<boolean> - True if session was removed
   */
  removeSession(sessionId: string): Promise<boolean>;

  /**
   * Clean up expired sessions
   * @returns Promise<number> - Number of sessions cleaned up
   */
  cleanupExpiredSessions(): Promise<number>;
}

/**
 * Audit Logger Interface (Port)
 * Defines contract for security audit logging
 */
export interface IAuditLogger {
  /**
   * Log authentication attempt
   * @param attempt - Authentication attempt details
   * @returns Promise<void>
   */
  logAuthenticationAttempt(attempt: AuthenticationAttemptLog): Promise<void>;

  /**
   * Log security event
   * @param event - Security event details
   * @returns Promise<void>
   */
  logSecurityEvent(event: SecurityEvent): Promise<void>;

  /**
   * Get authentication statistics
   * @param timeRange - Time range for statistics
   * @returns Promise<AuthenticationStats> - Authentication statistics
   */
  getAuthenticationStats(timeRange: TimeRange): Promise<AuthenticationStats>;
}

/**
 * Rate Limiter Interface (Port)
 * Defines contract for rate limiting functionality
 */
export interface IRateLimiter {
  /**
   * Check if request is allowed
   * @param key - Rate limiting key (IP, email, etc.)
   * @param windowMs - Time window in milliseconds
   * @param maxAttempts - Maximum attempts allowed in window
   * @returns Promise<RateLimitResult> - Rate limit check result
   */
  checkRateLimit(key: string, windowMs: number, maxAttempts: number): Promise<RateLimitResult>;

  /**
   * Reset rate limit for key
   * @param key - Rate limiting key
   * @returns Promise<void>
   */
  resetRateLimit(key: string): Promise<void>;
}

/**
 * Session Data Structure
 * Information stored for active sessions
 */
export interface SessionData {
  readonly userId: string;
  readonly email: string;
  readonly role: string;
  readonly agencyId: string | undefined;
  readonly createdAt: number;
  readonly lastAccessedAt: number;
  readonly userAgent: string | undefined;
  readonly ipAddress: string | undefined;
  readonly isRememberMe: boolean;
  readonly permissions: readonly string[];
}

/**
 * Security Event Structure
 * Information for security monitoring
 */
export interface SecurityEvent {
  readonly type: SecurityEventType;
  readonly severity: SecurityEventSeverity;
  readonly userId: string | undefined;
  readonly email: string | undefined;
  readonly timestamp: number;
  readonly details: Record<string, unknown>;
  readonly requestId: string;
  readonly userAgent: string | undefined;
  readonly ipAddress: string | undefined;
}

/**
 * Security Event Types
 */
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
}

/**
 * Security Event Severity Levels
 */
export enum SecurityEventSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Authentication Statistics
 */
export interface AuthenticationStats {
  readonly totalAttempts: number;
  readonly successfulAttempts: number;
  readonly failedAttempts: number;
  readonly uniqueUsers: number;
  readonly lockedAccounts: number;
  readonly suspiciousActivity: number;
  readonly timeRange: TimeRange;
}

/**
 * Time Range for Statistics
 */
export interface TimeRange {
  readonly startTime: number;
  readonly endTime: number;
}

/**
 * Rate Limit Check Result
 */
export interface RateLimitResult {
  readonly isAllowed: boolean;
  readonly remainingAttempts: number;
  readonly resetTime: number;
  readonly windowMs: number;
}

/**
 * Authentication Service Configuration
 */
export interface AuthenticationServiceConfig {
  readonly sessionTokenLength: number;
  readonly refreshTokenLength: number;
  readonly sessionExpiryMinutes: number;
  readonly refreshExpiryDays: number;
  readonly rememberMeExpiryDays: number;
  readonly maxLoginAttemptsPerHour: number;
  readonly maxLoginAttemptsPerDay: number;
  readonly suspiciousActivityThreshold: number;
  readonly enableGeoLocationChecks: boolean;
  readonly enableDeviceFingerprintChecks: boolean;
}

/**
 * Default Authentication Service Configuration
 */
const DEFAULT_CONFIG: AuthenticationServiceConfig = {
  sessionTokenLength: 32,
  refreshTokenLength: 32,
  sessionExpiryMinutes: 30,
  refreshExpiryDays: 30,
  rememberMeExpiryDays: 90,
  maxLoginAttemptsPerHour: 10,
  maxLoginAttemptsPerDay: 50,
  suspiciousActivityThreshold: 5,
  enableGeoLocationChecks: false, // Disabled for offline system
  enableDeviceFingerprintChecks: true,
};

/**
 * Authentication Service Implementation
 * Implements secure session management and security monitoring
 */
export class AuthenticationService implements IAuthenticationService {
  private readonly config: AuthenticationServiceConfig;

  constructor(
    private readonly sessionStorage: ISessionStorage,
    private readonly auditLogger: IAuditLogger,
    private readonly rateLimiter: IRateLimiter,
    config?: Partial<AuthenticationServiceConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validateDependencies();
  }

  /**
   * Generate session tokens for authenticated user
   * Implements secure token generation following security best practices
   *
   * @param user - Authenticated user entity
   * @param rememberMe - Whether to create long-term session
   * @returns Promise<SessionInfo> - Session tokens and expiration
   */
  public async generateSession(user: User, rememberMe: boolean): Promise<SessionInfo> {
    try {
      // Generate cryptographically secure tokens
      const sessionToken = this.generateSecureToken(this.config.sessionTokenLength);
      const refreshToken = this.generateSecureToken(this.config.refreshTokenLength);

      // Calculate expiration times
      const now = Date.now();
      const sessionExpiryMs = rememberMe
        ? this.config.rememberMeExpiryDays * 24 * 60 * 60 * 1000
        : this.config.sessionExpiryMinutes * 60 * 1000;
      const refreshExpiryMs = this.config.refreshExpiryDays * 24 * 60 * 60 * 1000;

      const expiresAt = now + sessionExpiryMs;
      const refreshExpiresAt = now + refreshExpiryMs;

      // Create session data
      const sessionData: SessionData = {
        userId: user.id,
        email: user.email.value,
        role: user.role.name,
        agencyId: user.agencyId,
        createdAt: now,
        lastAccessedAt: now,
        userAgent: undefined, // Will be set by caller if available
        ipAddress: undefined, // Will be set by caller if available
        isRememberMe: rememberMe,
        permissions: Array.from(user.role.permissions).map((p: any) => p.name),
      };

      // Store session in storage
      await this.sessionStorage.storeSession(sessionToken, sessionData, expiresAt);

      // Log session creation event
      await this.auditLogger.logSecurityEvent({
        type: SecurityEventType.SESSION_CREATED,
        severity: SecurityEventSeverity.LOW,
        userId: user.id,
        email: user.email.value,
        timestamp: now,
        details: {
          sessionToken: this.hashToken(sessionToken),
          rememberMe,
          expiresAt,
        },
        requestId: `session-${sessionToken.slice(0, 8)}`,
        userAgent: undefined,
        ipAddress: undefined,
      });

      return {
        sessionToken,
        refreshToken,
        expiresAt,
        refreshExpiresAt,
      };
    } catch (error) {
      throw new AuthenticationServiceError(
        'Failed to generate session',
        'generateSession',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Log authentication attempt for security monitoring
   * Implements comprehensive audit logging with security analysis
   *
   * @param attempt - Authentication attempt details
   * @returns Promise<void>
   */
  public async logAuthenticationAttempt(attempt: AuthenticationAttemptLog): Promise<void> {
    try {
      // Log the authentication attempt
      await this.auditLogger.logAuthenticationAttempt(attempt);

      // Log corresponding security event
      const securityEvent: SecurityEvent = {
        type: attempt.success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE,
        severity: attempt.success ? SecurityEventSeverity.LOW : SecurityEventSeverity.MEDIUM,
        userId: undefined, // Don't expose user ID for failed attempts
        email: attempt.success ? attempt.email : undefined, // Don't expose email for failed attempts
        timestamp: attempt.timestamp,
        details: {
          success: attempt.success,
          errorCode: attempt.errorCode,
          userAgent: attempt.userAgent,
          ipAddress: attempt.ipAddress,
        },
        requestId: attempt.requestId,
        userAgent: attempt.userAgent,
        ipAddress: attempt.ipAddress,
      };

      await this.auditLogger.logSecurityEvent(securityEvent);

      // Check for suspicious activity patterns
      if (!attempt.success) {
        await this.analyzeFailedAttempt(attempt);
      }
    } catch (error) {
      // Don't throw errors for logging failures to prevent authentication disruption
      console.error('Failed to log authentication attempt:', error);
    }
  }

  /**
   * Perform security checks before authentication
   * Implements rate limiting and suspicious activity detection
   *
   * @param email - User email for rate limiting
   * @param metadata - Request metadata for analysis
   * @returns Promise<SecurityCheckResult> - Security check results
   */
  public async performSecurityChecks(email: string, metadata: AuthenticationMetadata): Promise<SecurityCheckResult> {
    const checks: string[] = [];
    const recommendActions: string[] = [];
    let isAllowed = true;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    try {
      // Check email-based rate limiting
      checks.push('email_rate_limit');
      const emailRateLimit = await this.rateLimiter.checkRateLimit(
        `email:${email}`,
        60 * 60 * 1000, // 1 hour window
        this.config.maxLoginAttemptsPerHour
      );

      if (!emailRateLimit.isAllowed) {
        isAllowed = false;
        riskLevel = 'HIGH';
        recommendActions.push('Account temporarily locked due to too many attempts');
      }

      // Check IP-based rate limiting if IP is available
      if (metadata.ipAddress) {
        checks.push('ip_rate_limit');
        const ipRateLimit = await this.rateLimiter.checkRateLimit(
          `ip:${metadata.ipAddress}`,
          24 * 60 * 60 * 1000, // 24 hour window
          this.config.maxLoginAttemptsPerDay
        );

        if (!ipRateLimit.isAllowed) {
          isAllowed = false;
          riskLevel = 'HIGH';
          recommendActions.push('IP address temporarily blocked');
        }
      }

      // Analyze user agent for suspicious patterns
      if (metadata.userAgent) {
        checks.push('user_agent_analysis');
        const userAgentAnalysis = this.analyzeUserAgent(metadata.userAgent);
        if (userAgentAnalysis.isSuspicious) {
          riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : riskLevel;
          recommendActions.push('Unusual user agent detected');
        }
      }

      // Check for rapid successive attempts
      checks.push('rapid_attempt_detection');
      if (metadata.attemptNumber > this.config.suspiciousActivityThreshold) {
        riskLevel = 'HIGH';
        recommendActions.push('Multiple rapid authentication attempts detected');
      }

      return {
        isAllowed,
        riskLevel,
        checks,
        recommendActions,
      };
    } catch (error) {
      // Fail open for system resilience but log the error
      console.error('Security check failed:', error);

      return {
        isAllowed: true, // Fail open
        riskLevel: 'LOW',
        checks: [...checks, 'security_check_error'],
        recommendActions: ['Security check service temporarily unavailable'],
      };
    }
  }

  /**
   * Generate cryptographically secure token
   * @param length - Token length in bytes
   * @returns string - Hex-encoded secure token
   */
  private generateSecureToken(length: number): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Hash token for logging (security purpose)
   * @param token - Token to hash
   * @returns string - SHA-256 hash of token
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Analyze failed authentication attempt for suspicious patterns
   * @param attempt - Failed authentication attempt
   * @returns Promise<void>
   */
  private async analyzeFailedAttempt(attempt: AuthenticationAttemptLog): Promise<void> {
    try {
      // Get recent authentication statistics
      const stats = await this.auditLogger.getAuthenticationStats({
        startTime: Date.now() - 60 * 60 * 1000, // Last hour
        endTime: Date.now(),
      });

      // Check for suspicious activity threshold
      if (stats.failedAttempts >= this.config.suspiciousActivityThreshold) {
        await this.auditLogger.logSecurityEvent({
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: SecurityEventSeverity.HIGH,
          userId: undefined,
          email: attempt.email,
          timestamp: Date.now(),
          details: {
            failedAttemptsInLastHour: stats.failedAttempts,
            threshold: this.config.suspiciousActivityThreshold,
            attemptDetails: attempt,
          },
          requestId: attempt.requestId,
          userAgent: attempt.userAgent,
          ipAddress: attempt.ipAddress,
        });
      }
    } catch (error) {
      console.error('Failed to analyze suspicious activity:', error);
    }
  }

  /**
   * Analyze user agent for suspicious patterns
   * @param userAgent - User agent string
   * @returns object - Analysis result
   */
  private analyzeUserAgent(userAgent: string): { isSuspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Check for common bot patterns
    const botPatterns = [/bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i, /python/i, /java/i];

    for (const pattern of botPatterns) {
      if (pattern.test(userAgent)) {
        reasons.push(`Matches bot pattern: ${pattern.source}`);
      }
    }

    // Check for suspicious characteristics
    if (userAgent.length < 10) {
      reasons.push('User agent too short');
    }

    if (userAgent.length > 500) {
      reasons.push('User agent unusually long');
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Validate constructor dependencies
   * Ensures all required dependencies are provided
   */
  private validateDependencies(): void {
    if (!this.sessionStorage) {
      throw new Error('AuthenticationService: sessionStorage is required');
    }
    if (!this.auditLogger) {
      throw new Error('AuthenticationService: auditLogger is required');
    }
    if (!this.rateLimiter) {
      throw new Error('AuthenticationService: rateLimiter is required');
    }
  }
}

/**
 * Authentication Service Error
 * Domain-specific error for authentication service operations
 */
export class AuthenticationServiceError extends Error {
  public readonly name = 'AuthenticationServiceError';

  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message);
  }
}

/**
 * Factory function for creating AuthenticationService
 * Follows dependency injection pattern from Instructions
 *
 * @param sessionStorage - Session storage implementation
 * @param auditLogger - Audit logger implementation
 * @param rateLimiter - Rate limiter implementation
 * @param config - Optional service configuration
 * @returns AuthenticationService instance
 */
export function createAuthenticationService(
  sessionStorage: ISessionStorage,
  auditLogger: IAuditLogger,
  rateLimiter: IRateLimiter,
  config?: Partial<AuthenticationServiceConfig>
): AuthenticationService {
  return new AuthenticationService(sessionStorage, auditLogger, rateLimiter, config);
}
