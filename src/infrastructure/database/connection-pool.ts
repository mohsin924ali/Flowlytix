/**
 * Multi-Tenant Database Connection Pool
 *
 * Sophisticated connection pool manager for multi-tenant SQLite databases.
 * Uses better-sqlite3 for optimal performance in Electron applications.
 *
 * Features:
 * - Agency-specific database connections
 * - Connection pooling and reuse
 * - Automatic connection cleanup
 * - Thread-safe operations
 * - Memory optimization
 *
 * @architecture Infrastructure Layer
 * @version 1.0.0
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Database connection errors
 */
export class DatabasePoolError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(`Database pool error: ${message}`);
    this.name = 'DatabasePoolError';
  }
}

/**
 * Database connection configuration
 */
interface DatabaseConfig {
  agencyId: string;
  databasePath: string;
  readonly?: boolean;
  memory?: boolean;
  timeout?: number;
}

/**
 * Connection pool statistics
 */
interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  createdConnections: number;
  destroyedConnections: number;
  lastActivity: number;
}

/**
 * Cached database connection
 */
interface CachedConnection {
  database: Database.Database;
  agencyId: string;
  lastUsed: number;
  isActive: boolean;
  databasePath: string;
}

/**
 * Multi-Tenant Database Connection Pool Manager
 */
export class DatabaseConnectionPool {
  private static instance: DatabaseConnectionPool | null = null;
  private connections: Map<string, CachedConnection> = new Map();
  private maxConnections: number = 10;
  private maxIdleTime: number = 1000 * 60 * 30; // 30 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;
  private dataDirectory: string;

  private constructor() {
    // Set up data directory
    this.dataDirectory = join(process.cwd(), 'data', 'agencies');
    this.ensureDataDirectory();
    this.startCleanupProcess();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseConnectionPool {
    if (!DatabaseConnectionPool.instance) {
      DatabaseConnectionPool.instance = new DatabaseConnectionPool();
    }
    return DatabaseConnectionPool.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    if (DatabaseConnectionPool.instance) {
      DatabaseConnectionPool.instance.shutdown();
      DatabaseConnectionPool.instance = null;
    }
  }

  /**
   * Get database connection for specific agency
   */
  public async getConnection(agencyId: string, options?: Partial<DatabaseConfig>): Promise<Database.Database> {
    try {
      const connectionKey = this.getConnectionKey(agencyId);

      // Check if connection exists and is valid
      const existingConnection = this.connections.get(connectionKey);
      if (existingConnection && this.isConnectionValid(existingConnection)) {
        existingConnection.lastUsed = Date.now();
        existingConnection.isActive = true;

        console.log(`🔄 DatabasePool: Reusing existing connection for agency: ${agencyId}`);
        return existingConnection.database;
      }

      // Create new connection
      return this.createConnection(agencyId, options);
    } catch (error) {
      throw new DatabasePoolError(`Failed to get connection for agency: ${agencyId}`, error as Error);
    }
  }

  /**
   * Switch to different agency database
   */
  public async switchToAgency(agencyId: string): Promise<Database.Database> {
    try {
      console.log(`🔄 DatabasePool: Switching to agency database: ${agencyId}`);

      // Close current active connections if needed (implement connection limit)
      await this.cleanupExcessConnections();

      // Get connection for the new agency
      const connection = await this.getConnection(agencyId);

      console.log(`✅ DatabasePool: Successfully switched to agency: ${agencyId}`);
      return connection;
    } catch (error) {
      throw new DatabasePoolError(`Failed to switch to agency: ${agencyId}`, error as Error);
    }
  }

  /**
   * Create new database connection
   */
  private async createConnection(agencyId: string, options?: Partial<DatabaseConfig>): Promise<Database.Database> {
    const connectionKey = this.getConnectionKey(agencyId);
    const databasePath = this.getDatabasePath(agencyId);

    console.log(`🔗 DatabasePool: Creating new connection for agency: ${agencyId}`);
    console.log(`📁 DatabasePool: Database path: ${databasePath}`);

    try {
      // Create database connection with optimized settings
      const database = new Database(databasePath, {
        readonly: options?.readonly || false,
        timeout: options?.timeout || 10000,
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
      });

      // Optimize SQLite settings for multi-tenant performance
      this.optimizeDatabase(database);

      // Cache the connection
      const cachedConnection: CachedConnection = {
        database,
        agencyId,
        lastUsed: Date.now(),
        isActive: true,
        databasePath,
      };

      this.connections.set(connectionKey, cachedConnection);

      console.log(`✅ DatabasePool: Created connection for agency: ${agencyId}`);
      console.log(`📊 DatabasePool: Total connections: ${this.connections.size}`);

      return database;
    } catch (error) {
      throw new DatabasePoolError(`Failed to create connection for agency: ${agencyId}`, error as Error);
    }
  }

  /**
   * Optimize database settings for performance
   */
  private optimizeDatabase(database: Database.Database): void {
    try {
      // Enable WAL mode for better concurrency
      database.pragma('journal_mode = WAL');

      // Optimize for performance
      database.pragma('synchronous = NORMAL');
      database.pragma('cache_size = 1000');
      database.pragma('temp_store = MEMORY');
      database.pragma('mmap_size = 268435456'); // 256MB

      // Enable foreign keys
      database.pragma('foreign_keys = ON');

      console.log('⚡ DatabasePool: Database optimizations applied');
    } catch (error) {
      throw new DatabasePoolError('Failed to apply database optimizations', error as Error);
    }
  }

  /**
   * Get database path for agency
   */
  private getDatabasePath(agencyId: string): string {
    // Sanitize agency ID for filename
    const sanitizedId = agencyId.replace(/[^a-zA-Z0-9-_]/g, '');
    const filename = `${sanitizedId}.db`;
    return join(this.dataDirectory, filename);
  }

  /**
   * Get connection key
   */
  private getConnectionKey(agencyId: string): string {
    return `agency_${agencyId.toLowerCase()}`;
  }

  /**
   * Check if connection is valid
   */
  private isConnectionValid(connection: CachedConnection): boolean {
    try {
      // Check if database is still open
      if (!connection.database.open) {
        return false;
      }

      // Check if connection is not too old
      const age = Date.now() - connection.lastUsed;
      if (age > this.maxIdleTime) {
        return false;
      }

      // Test connection with a simple query
      connection.database.prepare('SELECT 1').get();
      return true;
    } catch (error) {
      console.warn(`⚠️ DatabasePool: Invalid connection for agency: ${connection.agencyId}`, error);
      return false;
    }
  }

  /**
   * Cleanup excess connections
   */
  private async cleanupExcessConnections(): Promise<void> {
    if (this.connections.size <= this.maxConnections) {
      return;
    }

    console.log(
      `🧹 DatabasePool: Cleaning up excess connections (current: ${this.connections.size}, max: ${this.maxConnections})`
    );

    // Sort connections by last used time
    const connectionsArray = Array.from(this.connections.entries());
    connectionsArray.sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

    // Close oldest connections
    const connectionsToClose = connectionsArray.slice(0, this.connections.size - this.maxConnections);

    for (const [key, connection] of connectionsToClose) {
      this.closeConnection(key, connection);
    }
  }

  /**
   * Close specific connection
   */
  private closeConnection(key: string, connection: CachedConnection): void {
    try {
      connection.database.close();
      this.connections.delete(key);
      console.log(`🔒 DatabasePool: Closed connection for agency: ${connection.agencyId}`);
    } catch (error) {
      console.error(`❌ DatabasePool: Error closing connection for agency: ${connection.agencyId}`, error);
      throw new DatabasePoolError(`Failed to close connection for agency: ${connection.agencyId}`, error as Error);
    }
  }

  /**
   * Start periodic cleanup process
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(
      () => {
        this.performCleanup();
      },
      1000 * 60 * 5
    ); // Run cleanup every 5 minutes

    console.log('🧹 DatabasePool: Cleanup process started');
  }

  /**
   * Perform periodic cleanup
   */
  private performCleanup(): void {
    const now = Date.now();
    const connectionsToClose: Array<[string, CachedConnection]> = [];

    for (const [key, connection] of this.connections.entries()) {
      // Close idle connections
      if (now - connection.lastUsed > this.maxIdleTime || !this.isConnectionValid(connection)) {
        connectionsToClose.push([key, connection]);
      }
    }

    // Close identified connections
    for (const [key, connection] of connectionsToClose) {
      this.closeConnection(key, connection);
    }

    console.log(`🧹 DatabasePool: Cleaned up ${connectionsToClose.length} connections`);
  }

  /**
   * Get pool statistics
   */
  public getStats(): PoolStats {
    const activeConnections = Array.from(this.connections.values()).filter((c) => c.isActive).length;

    return {
      totalConnections: this.connections.size,
      activeConnections,
      idleConnections: this.connections.size - activeConnections,
      createdConnections: this.connections.size, // Simplified for now
      destroyedConnections: 0, // Would need to track this
      lastActivity: Date.now(),
    };
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDirectory(): void {
    try {
      if (!existsSync(this.dataDirectory)) {
        mkdirSync(this.dataDirectory, { recursive: true });
        console.log(`📁 DatabasePool: Created data directory: ${this.dataDirectory}`);
      }
    } catch (error) {
      throw new DatabasePoolError(`Failed to create data directory: ${this.dataDirectory}`, error as Error);
    }
  }

  /**
   * Close all connections and cleanup
   */
  public async shutdown(): Promise<void> {
    try {
      console.log('🔒 DatabasePool: Shutting down connection pool...');

      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      // Close all connections
      for (const [key, connection] of this.connections.entries()) {
        this.closeConnection(key, connection);
      }

      console.log('✅ DatabasePool: Connection pool shutdown complete');
    } catch (error) {
      throw new DatabasePoolError('Failed to shutdown connection pool', error as Error);
    }
  }

  /**
   * Test connection to specific agency database
   */
  public async testConnection(agencyId: string): Promise<boolean> {
    try {
      const connection = await this.getConnection(agencyId);
      connection.prepare('SELECT 1 as test').get();
      console.log(`✅ DatabasePool: Connection test successful for agency: ${agencyId}`);
      return true;
    } catch (error) {
      console.error(`❌ DatabasePool: Connection test failed for agency: ${agencyId}`, error);
      return false;
    }
  }
}

/**
 * Get the database connection pool instance
 */
export const getConnectionPool = (): DatabaseConnectionPool => {
  return DatabaseConnectionPool.getInstance();
};

/**
 * Helper function to get agency database connection
 */
export const getAgencyDatabase = async (agencyId: string): Promise<Database.Database> => {
  const pool = getConnectionPool();
  return pool.getConnection(agencyId);
};

/**
 * Helper function to switch to agency database
 */
export const switchToAgencyDatabase = async (agencyId: string): Promise<Database.Database> => {
  const pool = getConnectionPool();
  return pool.switchToAgency(agencyId);
};
