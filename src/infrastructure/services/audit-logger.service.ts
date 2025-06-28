/**
 * In-Memory Audit Logger Implementation - Infrastructure Layer
 *
 * Simple adapter implementation for IAuditLogger port.
 * Follows Instructions file requirements for strict TypeScript and SOLID principles.
 * Provides in-memory audit logging for Phase 1.2 implementation.
 *
 * @domain Authentication
 * @pattern Adapter Pattern
 * @layer Infrastructure
 * @version 1.2.0
 */

import { IAuditLogger, SecurityEvent, AuthenticationStats, TimeRange } from './authentication.service';
import { AuthenticationAttemptLog } from '../../application/handlers/auth/authenticate-user.handler';

/**
 * Audit Log Entry
 * Internal structure for storing audit log entries
 */
interface AuditLogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly type: 'AUTHENTICATION_ATTEMPT' | 'SECURITY_EVENT';
  readonly data: AuthenticationAttemptLog | SecurityEvent;
  readonly createdAt: number;
}

/**
 * In-Memory Audit Logger Implementation
 * Provides temporary audit logging for development and testing
 */
export class InMemoryAuditLogger implements IAuditLogger {
  private readonly auditLogs = new Map<string, AuditLogEntry>();
  private sequenceNumber = 0;

  constructor(
    private readonly maxLogEntries: number = 10000,
    private readonly retentionDays: number = 30
  ) {
    this.validateConfiguration();
  }

  /**
   * Log authentication attempt
   * @param attempt - Authentication attempt details
   * @returns Promise<void>
   */
  public async logAuthenticationAttempt(attempt: AuthenticationAttemptLog): Promise<void> {
    try {
      this.validateAuthenticationAttempt(attempt);

      const logId = this.generateLogId();
      const entry: AuditLogEntry = {
        id: logId,
        timestamp: attempt.timestamp,
        type: 'AUTHENTICATION_ATTEMPT',
        data: attempt,
        createdAt: Date.now(),
      };

      this.auditLogs.set(logId, entry);
      this.enforceRetentionPolicy();

      console.log(`📋 Authentication attempt logged: ${attempt.email} - ${attempt.success ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      throw new AuditLoggerError(
        'Failed to log authentication attempt',
        'logAuthenticationAttempt',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Log security event
   * @param event - Security event details
   * @returns Promise<void>
   */
  public async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      this.validateSecurityEvent(event);

      const logId = this.generateLogId();
      const entry: AuditLogEntry = {
        id: logId,
        timestamp: event.timestamp,
        type: 'SECURITY_EVENT',
        data: event,
        createdAt: Date.now(),
      };

      this.auditLogs.set(logId, entry);
      this.enforceRetentionPolicy();

      console.log(`🔒 Security event logged: ${event.type} - ${event.severity}`);
    } catch (error) {
      throw new AuditLoggerError(
        'Failed to log security event',
        'logSecurityEvent',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Get authentication statistics for a time range
   * @param timeRange - Time range for statistics
   * @returns Promise<AuthenticationStats> - Authentication statistics
   */
  public async getAuthenticationStats(timeRange: TimeRange): Promise<AuthenticationStats> {
    try {
      this.validateTimeRange(timeRange);

      const authAttempts = this.getAuthenticationAttemptsInRange(timeRange);
      const uniqueUsers = new Set<string>();
      let successfulAttempts = 0;
      let failedAttempts = 0;
      let lockedAccounts = 0;
      let suspiciousActivity = 0;

      // Process authentication attempts
      for (const attempt of authAttempts) {
        if (attempt.success) {
          successfulAttempts++;
          uniqueUsers.add(attempt.email);
        } else {
          failedAttempts++;

          // Check for account lockout indicators
          if (attempt.errorCode === 'ACCOUNT_LOCKED') {
            lockedAccounts++;
          }
        }
      }

      // Count suspicious activity events
      const securityEvents = this.getSecurityEventsInRange(timeRange);
      for (const event of securityEvents) {
        if (event.type === 'SUSPICIOUS_ACTIVITY') {
          suspiciousActivity++;
        }
      }

      return {
        totalAttempts: authAttempts.length,
        successfulAttempts,
        failedAttempts,
        uniqueUsers: uniqueUsers.size,
        lockedAccounts,
        suspiciousActivity,
        timeRange,
      };
    } catch (error) {
      throw new AuditLoggerError(
        'Failed to get authentication statistics',
        'getAuthenticationStats',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Get audit log statistics
   * @returns object - Audit log statistics
   */
  public getAuditStats(): {
    totalEntries: number;
    authenticationAttempts: number;
    securityEvents: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    let authenticationAttempts = 0;
    let securityEvents = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    for (const entry of this.auditLogs.values()) {
      if (entry.type === 'AUTHENTICATION_ATTEMPT') {
        authenticationAttempts++;
      } else if (entry.type === 'SECURITY_EVENT') {
        securityEvents++;
      }

      if (oldestEntry === null || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }

      if (newestEntry === null || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    return {
      totalEntries: this.auditLogs.size,
      authenticationAttempts,
      securityEvents,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Clear all audit logs
   * @returns void
   */
  public clearLogs(): void {
    this.auditLogs.clear();
    this.sequenceNumber = 0;
    console.log('🧹 All audit logs cleared');
  }

  /**
   * Generate unique log ID
   * @returns string - Unique log identifier
   */
  private generateLogId(): string {
    this.sequenceNumber++;
    return `audit-${Date.now()}-${this.sequenceNumber.toString().padStart(6, '0')}`;
  }

  /**
   * Get authentication attempts within time range
   * @param timeRange - Time range to filter
   * @returns AuthenticationAttemptLog[] - Filtered authentication attempts
   */
  private getAuthenticationAttemptsInRange(timeRange: TimeRange): AuthenticationAttemptLog[] {
    const attempts: AuthenticationAttemptLog[] = [];

    for (const entry of this.auditLogs.values()) {
      if (
        entry.type === 'AUTHENTICATION_ATTEMPT' &&
        entry.timestamp >= timeRange.startTime &&
        entry.timestamp <= timeRange.endTime
      ) {
        attempts.push(entry.data as AuthenticationAttemptLog);
      }
    }

    return attempts;
  }

  /**
   * Get security events within time range
   * @param timeRange - Time range to filter
   * @returns SecurityEvent[] - Filtered security events
   */
  private getSecurityEventsInRange(timeRange: TimeRange): SecurityEvent[] {
    const events: SecurityEvent[] = [];

    for (const entry of this.auditLogs.values()) {
      if (
        entry.type === 'SECURITY_EVENT' &&
        entry.timestamp >= timeRange.startTime &&
        entry.timestamp <= timeRange.endTime
      ) {
        events.push(entry.data as SecurityEvent);
      }
    }

    return events;
  }

  /**
   * Enforce retention policy by removing old entries
   */
  private enforceRetentionPolicy(): void {
    const now = Date.now();
    const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = now - retentionMs;
    let removedCount = 0;

    // Remove entries older than retention period
    for (const [logId, entry] of this.auditLogs) {
      if (entry.createdAt < cutoffTime) {
        this.auditLogs.delete(logId);
        removedCount++;
      }
    }

    // If still over max entries, remove oldest entries
    if (this.auditLogs.size > this.maxLogEntries) {
      const entries = Array.from(this.auditLogs.entries()).sort(([, a], [, b]) => a.createdAt - b.createdAt);

      const entriesToRemove = entries.slice(0, this.auditLogs.size - this.maxLogEntries);

      for (const [logId] of entriesToRemove) {
        this.auditLogs.delete(logId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🗑️ Removed ${removedCount} old audit log entries`);
    }
  }

  /**
   * Validate constructor configuration
   */
  private validateConfiguration(): void {
    if (this.maxLogEntries <= 0) {
      throw new Error('maxLogEntries must be greater than 0');
    }

    if (this.retentionDays <= 0) {
      throw new Error('retentionDays must be greater than 0');
    }
  }

  /**
   * Validate authentication attempt
   * @param attempt - Authentication attempt to validate
   */
  private validateAuthenticationAttempt(attempt: AuthenticationAttemptLog): void {
    if (!attempt) {
      throw new AuditLoggerError(
        'Authentication attempt is required',
        'validation',
        new Error('Missing authentication attempt')
      );
    }

    if (!attempt.email || !attempt.timestamp || !attempt.requestId) {
      throw new AuditLoggerError(
        'Authentication attempt must include email, timestamp, and requestId',
        'validation',
        new Error('Incomplete authentication attempt')
      );
    }
  }

  /**
   * Validate security event
   * @param event - Security event to validate
   */
  private validateSecurityEvent(event: SecurityEvent): void {
    if (!event) {
      throw new AuditLoggerError('Security event is required', 'validation', new Error('Missing security event'));
    }

    if (!event.type || !event.severity || !event.timestamp || !event.requestId) {
      throw new AuditLoggerError(
        'Security event must include type, severity, timestamp, and requestId',
        'validation',
        new Error('Incomplete security event')
      );
    }
  }

  /**
   * Validate time range
   * @param timeRange - Time range to validate
   */
  private validateTimeRange(timeRange: TimeRange): void {
    if (!timeRange) {
      throw new AuditLoggerError('Time range is required', 'validation', new Error('Missing time range'));
    }

    if (timeRange.startTime >= timeRange.endTime) {
      throw new AuditLoggerError('Start time must be before end time', 'validation', new Error('Invalid time range'));
    }
  }
}

/**
 * Audit Logger Error
 * Domain-specific error for audit logger operations
 */
export class AuditLoggerError extends Error {
  public readonly name = 'AuditLoggerError';

  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message);
  }
}

/**
 * Factory function for creating InMemoryAuditLogger
 * Follows dependency injection pattern from Instructions
 *
 * @param maxLogEntries - Maximum number of log entries to keep
 * @param retentionDays - Number of days to retain logs
 * @returns InMemoryAuditLogger instance
 */
export function createInMemoryAuditLogger(maxLogEntries?: number, retentionDays?: number): InMemoryAuditLogger {
  return new InMemoryAuditLogger(maxLogEntries, retentionDays);
}
