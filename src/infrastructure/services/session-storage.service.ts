/**
 * In-Memory Session Storage Implementation - Infrastructure Layer
 *
 * Simple adapter implementation for ISessionStorage port.
 * Follows Instructions file requirements for strict TypeScript and SOLID principles.
 * Provides in-memory session storage for Phase 1.2 implementation.
 *
 * @domain Authentication
 * @pattern Adapter Pattern
 * @layer Infrastructure
 * @version 1.2.0
 */

import { ISessionStorage, SessionData } from './authentication.service';

/**
 * Session Storage Entry
 * Internal structure for storing session data with expiration
 */
interface SessionStorageEntry {
  readonly sessionData: SessionData;
  readonly expiresAt: number;
  readonly createdAt: number;
}

/**
 * In-Memory Session Storage Implementation
 * Provides temporary session storage for development and testing
 */
export class InMemorySessionStorage implements ISessionStorage {
  private readonly sessions = new Map<string, SessionStorageEntry>();
  private cleanupInterval: NodeJS.Timeout | undefined;

  constructor(
    private readonly cleanupIntervalMs: number = 5 * 60 * 1000 // 5 minutes
  ) {
    this.startPeriodicCleanup();
  }

  /**
   * Store session data in memory
   * @param sessionId - Unique session identifier
   * @param sessionData - Session information to store
   * @param expiresAt - Session expiration timestamp
   * @returns Promise<void>
   */
  public async storeSession(sessionId: string, sessionData: SessionData, expiresAt: number): Promise<void> {
    try {
      this.validateSessionId(sessionId);
      this.validateSessionData(sessionData);
      this.validateExpiration(expiresAt);

      const entry: SessionStorageEntry = {
        sessionData,
        expiresAt,
        createdAt: Date.now(),
      };

      this.sessions.set(sessionId, entry);

      console.log(`📝 Session stored: ${sessionId.slice(0, 8)}...`);
    } catch (error) {
      throw new SessionStorageError(
        `Failed to store session: ${sessionId}`,
        'storeSession',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Retrieve session data from memory
   * @param sessionId - Session identifier
   * @returns Promise<SessionData | null> - Session data or null if not found/expired
   */
  public async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      this.validateSessionId(sessionId);

      const entry = this.sessions.get(sessionId);

      if (!entry) {
        return null;
      }

      // Check if session has expired
      if (Date.now() > entry.expiresAt) {
        this.sessions.delete(sessionId);
        console.log(`⏰ Session expired and removed: ${sessionId.slice(0, 8)}...`);
        return null;
      }

      console.log(`✅ Session retrieved: ${sessionId.slice(0, 8)}...`);
      return entry.sessionData;
    } catch (error) {
      throw new SessionStorageError(
        `Failed to get session: ${sessionId}`,
        'getSession',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Remove session from memory
   * @param sessionId - Session identifier
   * @returns Promise<boolean> - True if session was removed
   */
  public async removeSession(sessionId: string): Promise<boolean> {
    try {
      this.validateSessionId(sessionId);

      const wasDeleted = this.sessions.delete(sessionId);

      if (wasDeleted) {
        console.log(`🗑️ Session removed: ${sessionId.slice(0, 8)}...`);
      }

      return wasDeleted;
    } catch (error) {
      throw new SessionStorageError(
        `Failed to remove session: ${sessionId}`,
        'removeSession',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Clean up expired sessions from memory
   * @returns Promise<number> - Number of sessions cleaned up
   */
  public async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [sessionId, entry] of this.sessions) {
        if (now > entry.expiresAt) {
          this.sessions.delete(sessionId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
      }

      return cleanedCount;
    } catch (error) {
      throw new SessionStorageError(
        'Failed to cleanup expired sessions',
        'cleanupExpiredSessions',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Get session storage statistics
   * @returns object - Storage statistics
   */
  public getStats(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  } {
    const now = Date.now();
    let activeSessions = 0;
    let expiredSessions = 0;

    for (const entry of this.sessions.values()) {
      if (now > entry.expiresAt) {
        expiredSessions++;
      } else {
        activeSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
    };
  }

  /**
   * Shutdown session storage and cleanup resources
   * @returns void
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.sessions.clear();
    console.log('🛑 Session storage shutdown complete');
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        console.error('Failed to cleanup expired sessions:', error);
      }
    }, this.cleanupIntervalMs);
  }

  /**
   * Validate session ID
   * @param sessionId - Session ID to validate
   * @throws {SessionStorageError} When session ID is invalid
   */
  private validateSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new SessionStorageError(
        'Session ID must be a non-empty string',
        'validation',
        new Error('Invalid session ID')
      );
    }

    if (sessionId.length < 10) {
      throw new SessionStorageError(
        'Session ID too short',
        'validation',
        new Error('Session ID must be at least 10 characters')
      );
    }
  }

  /**
   * Validate session data
   * @param sessionData - Session data to validate
   * @throws {SessionStorageError} When session data is invalid
   */
  private validateSessionData(sessionData: SessionData): void {
    if (!sessionData) {
      throw new SessionStorageError('Session data is required', 'validation', new Error('Missing session data'));
    }

    if (!sessionData.userId || !sessionData.email) {
      throw new SessionStorageError(
        'Session data must include userId and email',
        'validation',
        new Error('Incomplete session data')
      );
    }
  }

  /**
   * Validate expiration timestamp
   * @param expiresAt - Expiration timestamp to validate
   * @throws {SessionStorageError} When expiration is invalid
   */
  private validateExpiration(expiresAt: number): void {
    if (!expiresAt || typeof expiresAt !== 'number') {
      throw new SessionStorageError(
        'Expiration timestamp must be a number',
        'validation',
        new Error('Invalid expiration timestamp')
      );
    }

    if (expiresAt <= Date.now()) {
      throw new SessionStorageError(
        'Expiration timestamp must be in the future',
        'validation',
        new Error('Past expiration timestamp')
      );
    }
  }
}

/**
 * Session Storage Error
 * Domain-specific error for session storage operations
 */
export class SessionStorageError extends Error {
  public readonly name = 'SessionStorageError';

  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message);
  }
}

/**
 * Factory function for creating InMemorySessionStorage
 * Follows dependency injection pattern from Instructions
 *
 * @param cleanupIntervalMs - Optional cleanup interval in milliseconds
 * @returns InMemorySessionStorage instance
 */
export function createInMemorySessionStorage(cleanupIntervalMs?: number): InMemorySessionStorage {
  return new InMemorySessionStorage(cleanupIntervalMs);
}
