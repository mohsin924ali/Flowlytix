/**
 * In-Memory Rate Limiter Implementation - Infrastructure Layer
 *
 * Simple adapter implementation for IRateLimiter port.
 * Follows Instructions file requirements for strict TypeScript and SOLID principles.
 * Provides in-memory rate limiting for Phase 1.2 implementation.
 *
 * @domain Authentication
 * @pattern Adapter Pattern
 * @layer Infrastructure
 * @version 1.2.0
 */

import { IRateLimiter, RateLimitResult } from './authentication.service';

/**
 * Rate Limit Entry
 * Internal structure for tracking rate limit attempts
 */
interface RateLimitEntry {
  readonly key: string;
  readonly windowStart: number;
  readonly windowMs: number;
  readonly maxAttempts: number;
  attempts: number;
  readonly createdAt: number;
  lastAttemptAt: number;
}

/**
 * In-Memory Rate Limiter Implementation
 * Provides temporary rate limiting for development and testing
 */
export class InMemoryRateLimiter implements IRateLimiter {
  private readonly rateLimits = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | undefined;

  constructor(
    private readonly cleanupIntervalMs: number = 5 * 60 * 1000 // 5 minutes
  ) {
    this.startPeriodicCleanup();
  }

  /**
   * Check if request is allowed based on rate limiting rules
   * @param key - Rate limiting key (IP, email, etc.)
   * @param windowMs - Time window in milliseconds
   * @param maxAttempts - Maximum attempts allowed in window
   * @returns Promise<RateLimitResult> - Rate limit check result
   */
  public async checkRateLimit(key: string, windowMs: number, maxAttempts: number): Promise<RateLimitResult> {
    try {
      this.validateRateLimitParameters(key, windowMs, maxAttempts);

      const now = Date.now();
      const entry = this.rateLimits.get(key);

      if (!entry) {
        // First attempt for this key
        const newEntry: RateLimitEntry = {
          key,
          windowStart: now,
          windowMs,
          maxAttempts,
          attempts: 1,
          createdAt: now,
          lastAttemptAt: now,
        };

        this.rateLimits.set(key, newEntry);

        return {
          isAllowed: true,
          remainingAttempts: maxAttempts - 1,
          resetTime: now + windowMs,
          windowMs,
        };
      }

      // Check if we need to reset the window
      if (now >= entry.windowStart + entry.windowMs) {
        // Reset window
        const resetEntry: RateLimitEntry = {
          ...entry,
          windowStart: now,
          windowMs,
          maxAttempts,
          attempts: 1,
          lastAttemptAt: now,
        };

        this.rateLimits.set(key, resetEntry);

        return {
          isAllowed: true,
          remainingAttempts: maxAttempts - 1,
          resetTime: now + windowMs,
          windowMs,
        };
      }

      // Increment attempt count
      entry.attempts++;
      entry.lastAttemptAt = now;

      const isAllowed = entry.attempts <= maxAttempts;
      const remainingAttempts = Math.max(0, maxAttempts - entry.attempts);
      const resetTime = entry.windowStart + entry.windowMs;

      if (!isAllowed) {
        console.log(`🚫 Rate limit exceeded for key: ${key} (${entry.attempts}/${maxAttempts})`);
      }

      return {
        isAllowed,
        remainingAttempts,
        resetTime,
        windowMs,
      };
    } catch (error) {
      throw new RateLimiterError(
        `Failed to check rate limit for key: ${key}`,
        'checkRateLimit',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Reset rate limit for a specific key
   * @param key - Rate limiting key
   * @returns Promise<void>
   */
  public async resetRateLimit(key: string): Promise<void> {
    try {
      this.validateKey(key);

      const wasDeleted = this.rateLimits.delete(key);

      if (wasDeleted) {
        console.log(`🔄 Rate limit reset for key: ${key}`);
      }
    } catch (error) {
      throw new RateLimiterError(
        `Failed to reset rate limit for key: ${key}`,
        'resetRateLimit',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Get rate limit statistics for a specific key
   * @param key - Rate limiting key
   * @returns object - Rate limit statistics or null if not found
   */
  public getRateLimitStats(key: string): {
    attempts: number;
    maxAttempts: number;
    windowStart: number;
    windowMs: number;
    remainingAttempts: number;
    resetTime: number;
    isCurrentlyLimited: boolean;
  } | null {
    this.validateKey(key);

    const entry = this.rateLimits.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const resetTime = entry.windowStart + entry.windowMs;
    const remainingAttempts = Math.max(0, entry.maxAttempts - entry.attempts);
    const isCurrentlyLimited = entry.attempts > entry.maxAttempts && now < resetTime;

    return {
      attempts: entry.attempts,
      maxAttempts: entry.maxAttempts,
      windowStart: entry.windowStart,
      windowMs: entry.windowMs,
      remainingAttempts,
      resetTime,
      isCurrentlyLimited,
    };
  }

  /**
   * Get overall rate limiter statistics
   * @returns object - Overall statistics
   */
  public getOverallStats(): {
    totalKeys: number;
    activeKeys: number;
    limitedKeys: number;
    totalAttempts: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const now = Date.now();
    let activeKeys = 0;
    let limitedKeys = 0;
    let totalAttempts = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    for (const entry of this.rateLimits.values()) {
      totalAttempts += entry.attempts;

      // Check if entry is still within active window
      if (now < entry.windowStart + entry.windowMs) {
        activeKeys++;

        // Check if currently limited
        if (entry.attempts > entry.maxAttempts) {
          limitedKeys++;
        }
      }

      // Track oldest and newest entries
      if (oldestEntry === null || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }

      if (newestEntry === null || entry.lastAttemptAt > newestEntry) {
        newestEntry = entry.lastAttemptAt;
      }
    }

    return {
      totalKeys: this.rateLimits.size,
      activeKeys,
      limitedKeys,
      totalAttempts,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Clear all rate limit entries
   * @returns void
   */
  public clearAllLimits(): void {
    this.rateLimits.clear();
    console.log('🧹 All rate limits cleared');
  }

  /**
   * Shutdown rate limiter and cleanup resources
   * @returns void
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.rateLimits.clear();
    console.log('🛑 Rate limiter shutdown complete');
  }

  /**
   * Start periodic cleanup of expired rate limit entries
   */
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      try {
        this.cleanupExpiredEntries();
      } catch (error) {
        console.error('Failed to cleanup expired rate limit entries:', error);
      }
    }, this.cleanupIntervalMs);
  }

  /**
   * Clean up expired rate limit entries
   * @returns number - Number of entries cleaned up
   */
  private cleanupExpiredEntries(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.rateLimits) {
      // Remove entries that have expired (past their window + some buffer)
      const expiryTime = entry.windowStart + entry.windowMs + 60 * 1000; // 1 minute buffer

      if (now > expiryTime) {
        this.rateLimits.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired rate limit entries`);
    }

    return cleanedCount;
  }

  /**
   * Validate rate limit parameters
   * @param key - Rate limiting key
   * @param windowMs - Time window in milliseconds
   * @param maxAttempts - Maximum attempts allowed
   */
  private validateRateLimitParameters(key: string, windowMs: number, maxAttempts: number): void {
    this.validateKey(key);

    if (!windowMs || typeof windowMs !== 'number' || windowMs <= 0) {
      throw new RateLimiterError(
        'Window duration must be a positive number',
        'validation',
        new Error('Invalid window duration')
      );
    }

    if (!maxAttempts || typeof maxAttempts !== 'number' || maxAttempts <= 0) {
      throw new RateLimiterError(
        'Max attempts must be a positive number',
        'validation',
        new Error('Invalid max attempts')
      );
    }

    // Reasonable limits to prevent abuse
    if (windowMs > 24 * 60 * 60 * 1000) {
      // 24 hours
      throw new RateLimiterError(
        'Window duration cannot exceed 24 hours',
        'validation',
        new Error('Window duration too long')
      );
    }

    if (maxAttempts > 10000) {
      throw new RateLimiterError('Max attempts cannot exceed 10000', 'validation', new Error('Max attempts too high'));
    }
  }

  /**
   * Validate rate limiting key
   * @param key - Rate limiting key
   */
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new RateLimiterError(
        'Rate limiting key must be a non-empty string',
        'validation',
        new Error('Invalid key')
      );
    }

    if (key.length > 200) {
      throw new RateLimiterError('Rate limiting key too long', 'validation', new Error('Key length exceeds maximum'));
    }
  }
}

/**
 * Rate Limiter Error
 * Domain-specific error for rate limiter operations
 */
export class RateLimiterError extends Error {
  public readonly name = 'RateLimiterError';

  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message);
  }
}

/**
 * Factory function for creating InMemoryRateLimiter
 * Follows dependency injection pattern from Instructions
 *
 * @param cleanupIntervalMs - Optional cleanup interval in milliseconds
 * @returns InMemoryRateLimiter instance
 */
export function createInMemoryRateLimiter(cleanupIntervalMs?: number): InMemoryRateLimiter {
  return new InMemoryRateLimiter(cleanupIntervalMs);
}
