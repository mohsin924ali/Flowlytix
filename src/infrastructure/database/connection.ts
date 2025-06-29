import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { getConnectionPool } from './connection-pool';

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
   * Get singleton instance
   * @param config - Database configuration
   */
  public static getInstance(config: DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    if (DatabaseConnection.instance) {
      DatabaseConnection.instance.close();
      DatabaseConnection.instance = null;
    }
  }

  /**
   * Validate database configuration
   * @param config - Database configuration to validate
   * @private
   */
  private validateConfig(config: DatabaseConfig): DatabaseConfig {
    if (!config.filename && !config.inMemory) {
      throw new DatabaseConfigurationError('Either filename or inMemory must be specified');
    }

    if (config.fileMustExist && !config.filename) {
      throw new DatabaseConfigurationError('fileMustExist requires filename to be specified');
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
   * Connect to the database
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.connectionAttempts++;
      this.totalConnectionAttempts++;

      await this.establishConnection();
      this.configureDatabase();

      this.isConnected = true;
      this.connectionAttempts = 0;

      console.log(`✅ Database: Connected to ${this.config.filename || ':memory:'}`);
    } catch (error) {
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.warn(`⚠️ Database: Connection attempt ${this.connectionAttempts} failed, retrying...`);
        await this.connect();
      } else {
        throw new DatabaseConnectionError(
          `Failed to connect after ${this.maxConnectionAttempts} attempts`,
          error as Error
        );
      }
    }
  }

  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    if (!this.isConnected || !this.database) {
      return;
    }

    try {
      this.database.close();
      this.database = null;
      this.isConnected = false;

      console.log(`✅ Database: Closed connection to ${this.config.filename || ':memory:'}`);
    } catch (error) {
      throw new DatabaseConnectionError('Failed to close database connection', error as Error);
    }
  }

  /**
   * Get the database instance
   */
  public getDatabase(): Database.Database {
    if (!this.isConnected || !this.database) {
      throw new DatabaseConnectionError('Not connected to database');
    }
    return this.database;
  }

  /**
   * Check if connected to database
   */
  public isConnectedToDatabase(): boolean {
    return this.isConnected && this.database !== null;
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): {
    isConnected: boolean;
    totalAttempts: number;
    currentAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      totalAttempts: this.totalConnectionAttempts,
      currentAttempts: this.connectionAttempts,
    };
  }

  /**
   * Establish the actual database connection
   * @private
   */
  private async establishConnection(): Promise<void> {
    try {
      // For in-memory database, create directly
      if (this.config.inMemory) {
        this.database = new Database(':memory:', {
          readonly: this.config.readonly || false,
          timeout: this.config.timeout || 5000,
          verbose: this.config.verbose ? console.log : undefined,
        });
        return;
      }

      // For file-based database, use the connection pool
      const pool = getConnectionPool();
      this.database = await pool.getConnection('main', {
        databasePath: this.config.filename,
        readonly: this.config.readonly ?? false,
        timeout: this.config.timeout ?? 5000,
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
