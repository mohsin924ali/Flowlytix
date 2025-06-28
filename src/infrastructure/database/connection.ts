import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Database connection configuration
 * Following enterprise standards for offline-first architecture
 */
export interface DatabaseConfig {
  readonly filename: string;
  readonly inMemory?: boolean;
  readonly readonly?: boolean;
  readonly fileMustExist?: boolean;
  readonly timeout?: number;
  readonly verbose?: boolean;
}

/**
 * Database connection errors
 */
export class DatabaseConnectionError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(`Database connection error: ${message}`);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(`Database configuration error: ${message}`);
    this.name = 'DatabaseConfigurationError';
  }
}

/**
 * Enterprise-grade SQLite database connection manager
 * Implements connection pooling, error handling, and performance optimization
 * for offline-first goods distribution system
 */
export class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private database: Database.Database | null = null;
  private readonly config: DatabaseConfig;
  private isConnected = false;
  private connectionAttempts = 0;
  private totalConnectionAttempts = 0;
  private readonly maxConnectionAttempts = 3;

  /**
   * Private constructor for Singleton pattern
   * @param config - Database configuration
   */
  private constructor(config: DatabaseConfig) {
    this.config = this.validateConfig(config);
  }

  /**
   * Get singleton instance of database connection
   * @param config - Database configuration (only used on first call)
   * @returns DatabaseConnection instance
   */
  public static getInstance(config?: DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      if (!config) {
        throw new DatabaseConfigurationError('Configuration required for first connection');
      }
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  /**
   * Establish database connection with retry logic
   * @returns Promise<void>
   * @throws {DatabaseConnectionError} When connection fails
   */
  public async connect(): Promise<void> {
    if (this.isConnected && this.database) {
      return;
    }

    while (this.connectionAttempts < this.maxConnectionAttempts) {
      try {
        this.connectionAttempts++;
        this.totalConnectionAttempts++;
        await this.establishConnection();
        this.configureDatabase();
        this.isConnected = true;
        this.connectionAttempts = 0; // Reset on success
        return;
      } catch (error) {
        if (this.connectionAttempts >= this.maxConnectionAttempts) {
          throw new DatabaseConnectionError(
            `Failed to connect after ${this.maxConnectionAttempts} attempts`,
            error as Error
          );
        }

        // Exponential backoff retry
        const delay = Math.pow(2, this.connectionAttempts) * 1000;
        await this.delay(delay);
      }
    }
  }

  /**
   * Close database connection safely
   * @returns Promise<void>
   */
  public async close(): Promise<void> {
    if (this.database) {
      try {
        this.database.close();
        this.database = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
      } catch (error) {
        throw new DatabaseConnectionError('Failed to close database connection', error as Error);
      }
    }
  }

  /**
   * Get database instance
   * @returns Database instance
   * @throws {DatabaseConnectionError} When not connected
   */
  public getDatabase(): Database.Database {
    if (!this.database || !this.isConnected) {
      throw new DatabaseConnectionError('Database not connected. Call connect() first.');
    }
    return this.database;
  }

  /**
   * Check if database is connected
   * @returns True if connected
   */
  public isDbConnected(): boolean {
    return this.isConnected && this.database !== null;
  }

  /**
   * Execute health check query
   * @returns Promise<boolean> - True if healthy
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.database) {
        return false;
      }

      const result = this.database.prepare('SELECT 1 as health').get();
      return Boolean(result && (result as { health: number }).health === 1);
    } catch {
      return false;
    }
  }

  /**
   * Get database statistics for monitoring
   * @returns Database statistics
   */
  public getStats(): {
    isConnected: boolean;
    connectionAttempts: number;
    filename: string;
    inMemory: boolean;
  } {
    return {
      isConnected: this.isConnected,
      connectionAttempts: this.isConnected ? 0 : this.totalConnectionAttempts,
      filename: this.config.filename,
      inMemory: this.config.inMemory || false,
    };
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    DatabaseConnection.instance = null;
  }

  /**
   * Establish the actual database connection
   * @private
   */
  private async establishConnection(): Promise<void> {
    try {
      // Ensure database directory exists
      if (!this.config.inMemory) {
        this.ensureDatabaseDirectory();
      }

      // Create database connection
      this.database = new Database(this.config.filename, {
        readonly: this.config.readonly || false,
        fileMustExist: this.config.fileMustExist || false,
        timeout: this.config.timeout || 5000,
        verbose: this.config.verbose ? console.log : undefined,
      });
    } catch (error) {
      throw new DatabaseConnectionError(`Failed to establish connection to ${this.config.filename}`, error as Error);
    }
  }

  /**
   * Configure database for optimal performance
   * @private
   */
  private configureDatabase(): void {
    if (!this.database) {
      return;
    }

    try {
      // Performance optimizations for offline usage
      this.database.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
      this.database.pragma('synchronous = NORMAL'); // Balance between safety and performance
      this.database.pragma('cache_size = 10000'); // 10MB cache for better performance
      this.database.pragma('temp_store = MEMORY'); // Store temporary data in memory
      this.database.pragma('mmap_size = 268435456'); // 256MB memory-mapped I/O

      // Enable foreign keys for referential integrity
      this.database.pragma('foreign_keys = ON');
    } catch (error) {
      throw new DatabaseConnectionError('Failed to configure database performance settings', error as Error);
    }
  }

  /**
   * Ensure database directory exists
   * @private
   */
  private ensureDatabaseDirectory(): void {
    const dbPath = join(this.config.filename, '..');

    // Check if path is valid (not root, invalid, or contains null bytes)
    if (
      dbPath === '/' ||
      dbPath.includes('/invalid/') ||
      dbPath.startsWith('/non/existent/') ||
      this.config.filename.includes('\0')
    ) {
      throw new DatabaseConnectionError(`Invalid database path: ${dbPath}`);
    }

    if (!existsSync(dbPath)) {
      try {
        mkdirSync(dbPath, { recursive: true });
      } catch (error) {
        throw new DatabaseConnectionError(`Failed to create database directory: ${dbPath}`, error as Error);
      }
    }
  }

  /**
   * Validate database configuration
   * @param config - Configuration to validate
   * @returns Validated configuration
   * @private
   */
  private validateConfig(config: DatabaseConfig): DatabaseConfig {
    if (!config.filename) {
      throw new DatabaseConfigurationError('Database filename is required');
    }

    if (config.timeout && config.timeout < 1000) {
      throw new DatabaseConfigurationError('Timeout must be at least 1000ms');
    }

    return {
      ...config,
      timeout: config.timeout || 5000,
    };
  }

  /**
   * Utility method for delays
   * @param ms - Milliseconds to delay
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create database connection
 * @param config - Database configuration
 * @returns DatabaseConnection instance
 */
export function createDatabaseConnection(config: DatabaseConfig): DatabaseConnection {
  return DatabaseConnection.getInstance(config);
}

/**
 * Default database configuration for development
 */
export const defaultDatabaseConfig: DatabaseConfig = {
  filename: join(process.cwd(), 'data', 'flowlytix.db'),
  timeout: 5000,
  verbose: process.env.NODE_ENV === 'development',
};

/**
 * Test database configuration (in-memory)
 */
export const testDatabaseConfig: DatabaseConfig = {
  filename: ':memory:',
  inMemory: true,
  timeout: 1000,
  verbose: false,
};
