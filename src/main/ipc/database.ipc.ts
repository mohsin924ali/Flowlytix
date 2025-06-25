/**
 * Database IPC Handler
 *
 * Provides secure database operations through IPC communication.
 * Implements comprehensive validation, error handling, and security measures
 * following enterprise-grade standards for offline-first architecture.
 *
 * @security All database operations are validated and sanitized
 * @architecture Hexagonal Architecture - Adapter layer for IPC communication
 * @pattern Command Pattern for database operations
 * @version 1.0.0
 */

import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { DatabaseConnection } from '../../infrastructure/database/connection';
import { z } from 'zod';

/**
 * Database operation types for transaction processing
 */
export interface DatabaseOperation {
  readonly sql: string;
  readonly params?: readonly unknown[];
  readonly type: 'query' | 'execute';
}

/**
 * Database query result interface
 */
export interface DatabaseQueryResult {
  readonly rows: readonly unknown[];
  readonly rowCount: number;
  readonly executionTime: number;
}

/**
 * Database execute result interface
 */
export interface DatabaseExecuteResult {
  readonly changes: number;
  readonly lastInsertRowid: number | bigint;
  readonly executionTime: number;
}

/**
 * Database transaction result interface
 */
export interface DatabaseTransactionResult {
  readonly results: readonly unknown[];
  readonly totalChanges: number;
  readonly executionTime: number;
}

/**
 * Custom error classes for database IPC operations
 */
export class DatabaseIpcError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseIpcError';
  }
}

export class DatabaseValidationError extends DatabaseIpcError {
  constructor(message: string, cause?: Error) {
    super(`Database validation error: ${message}`, 'DB_VALIDATION_ERROR', cause);
    this.name = 'DatabaseValidationError';
  }
}

export class DatabaseSecurityError extends DatabaseIpcError {
  constructor(message: string) {
    super(`Database security error: ${message}`, 'DB_SECURITY_ERROR');
    this.name = 'DatabaseSecurityError';
  }
}

export class DatabaseExecutionError extends DatabaseIpcError {
  constructor(message: string, cause?: Error) {
    super(`Database execution error: ${message}`, 'DB_EXECUTION_ERROR', cause);
    this.name = 'DatabaseExecutionError';
  }
}

/**
 * Validation schemas using Zod for type safety and runtime validation
 */
const SqlQuerySchema = z.string().min(1).max(10000);
const SqlParamsSchema = z.array(z.unknown()).optional();
const DatabaseOperationSchema = z.object({
  sql: SqlQuerySchema,
  params: SqlParamsSchema,
  type: z.enum(['query', 'execute']),
});
const DatabaseOperationsSchema = z.array(DatabaseOperationSchema).min(1).max(100);

/**
 * Dangerous SQL patterns that should be blocked for security
 */
const DANGEROUS_SQL_PATTERNS = [
  /\bDROP\s+(?:TABLE|DATABASE|SCHEMA|INDEX|VIEW)\b/i,
  /\bTRUNCATE\s+TABLE\b/i,
  /\bALTER\s+(?:TABLE|DATABASE|SCHEMA)\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bCREATE\s+(?:USER|ROLE)\b/i,
  /\bDROP\s+(?:USER|ROLE)\b/i,
  /--[\s\S]*$/m, // SQL comments
  /\/\*[\s\S]*?\*\//g, // Multi-line comments
];

/**
 * Database IPC Handler Class
 *
 * Implements secure database operations through IPC with comprehensive
 * validation, error handling, and security measures.
 */
export class DatabaseIpcHandler {
  private readonly connection: DatabaseConnection;
  private readonly maxQueryExecutionTime: number = 30000; // 30 seconds
  private readonly allowedChannels: readonly string[] = ['db:query', 'db:execute', 'db:transaction'] as const;

  /**
   * Creates a new DatabaseIpcHandler instance
   * @param connection - Database connection instance
   */
  constructor(connection: DatabaseConnection) {
    this.connection = connection;
    this.validateConnection();
  }

  /**
   * Registers all database IPC handlers
   * @throws {DatabaseIpcError} When registration fails
   */
  public registerHandlers(): void {
    try {
      ipcMain.handle('db:query', this.handleQuery.bind(this));
      ipcMain.handle('db:execute', this.handleExecute.bind(this));
      ipcMain.handle('db:transaction', this.handleTransaction.bind(this));
    } catch (error) {
      throw new DatabaseIpcError('Failed to register database IPC handlers', 'DB_REGISTRATION_ERROR', error as Error);
    }
  }

  /**
   * Unregisters all database IPC handlers (for cleanup)
   */
  public unregisterHandlers(): void {
    this.allowedChannels.forEach((channel) => {
      ipcMain.removeHandler(channel);
    });
  }

  /**
   * Handles database query operations
   * @param event - IPC event object
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns Promise<DatabaseQueryResult> - Query results
   * @throws {DatabaseValidationError} When validation fails
   * @throws {DatabaseSecurityError} When security check fails
   * @throws {DatabaseExecutionError} When execution fails
   */
  private async handleQuery(event: IpcMainInvokeEvent, sql: string, params?: unknown[]): Promise<DatabaseQueryResult> {
    const startTime = Date.now();

    try {
      // Validate input parameters
      this.validateSqlQuery(sql, params);

      // Security validation
      this.validateSqlSecurity(sql);

      // Ensure database connection
      await this.ensureConnection();

      // Execute query with timeout
      const database = this.connection.getDatabase();
      const statement = database.prepare(sql);

      const result = await this.executeWithTimeout(
        () => (params ? statement.all(...params) : statement.all()),
        this.maxQueryExecutionTime
      );

      const executionTime = Date.now() - startTime;

      return {
        rows: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : result ? 1 : 0,
        executionTime,
      };
    } catch (error) {
      if (error instanceof DatabaseIpcError) {
        throw error;
      }
      throw new DatabaseExecutionError('Failed to execute database query', error as Error);
    }
  }

  /**
   * Handles database execute operations (INSERT, UPDATE, DELETE)
   * @param event - IPC event object
   * @param sql - SQL statement string
   * @param params - Statement parameters
   * @returns Promise<DatabaseExecuteResult> - Execution results
   * @throws {DatabaseValidationError} When validation fails
   * @throws {DatabaseSecurityError} When security check fails
   * @throws {DatabaseExecutionError} When execution fails
   */
  private async handleExecute(
    event: IpcMainInvokeEvent,
    sql: string,
    params?: unknown[]
  ): Promise<DatabaseExecuteResult> {
    const startTime = Date.now();

    try {
      // Validate input parameters
      this.validateSqlQuery(sql, params);

      // Security validation
      this.validateSqlSecurity(sql);

      // Ensure database connection
      await this.ensureConnection();

      // Execute statement with timeout
      const database = this.connection.getDatabase();
      const statement = database.prepare(sql);

      const result = await this.executeWithTimeout(
        () => (params ? statement.run(...params) : statement.run()),
        this.maxQueryExecutionTime
      );

      const executionTime = Date.now() - startTime;

      return {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid,
        executionTime,
      };
    } catch (error) {
      if (error instanceof DatabaseIpcError) {
        throw error;
      }
      throw new DatabaseExecutionError('Failed to execute database statement', error as Error);
    }
  }

  /**
   * Handles database transaction operations
   * @param event - IPC event object
   * @param operations - Array of database operations to execute in transaction
   * @returns Promise<DatabaseTransactionResult> - Transaction results
   * @throws {DatabaseValidationError} When validation fails
   * @throws {DatabaseSecurityError} When security check fails
   * @throws {DatabaseExecutionError} When execution fails
   */
  private async handleTransaction(
    event: IpcMainInvokeEvent,
    operations: DatabaseOperation[]
  ): Promise<DatabaseTransactionResult> {
    const startTime = Date.now();

    try {
      // Validate input parameters
      this.validateTransactionOperations(operations);

      // Security validation for all operations
      operations.forEach((op) => this.validateSqlSecurity(op.sql));

      // Ensure database connection
      await this.ensureConnection();

      const database = this.connection.getDatabase();
      const results: unknown[] = [];
      let totalChanges = 0;

      // Execute transaction with timeout
      const transactionResult = await this.executeWithTimeout(
        () =>
          database.transaction(() => {
            for (const operation of operations) {
              const statement = database.prepare(operation.sql);

              if (operation.type === 'query') {
                const result = operation.params ? statement.all(...operation.params) : statement.all();
                results.push(result);
              } else {
                const result = operation.params ? statement.run(...operation.params) : statement.run();
                results.push(result);
                totalChanges += result.changes;
              }
            }
          })(),
        this.maxQueryExecutionTime
      );

      const executionTime = Date.now() - startTime;

      return {
        results,
        totalChanges,
        executionTime,
      };
    } catch (error) {
      if (error instanceof DatabaseIpcError) {
        throw error;
      }
      throw new DatabaseExecutionError('Failed to execute database transaction', error as Error);
    }
  }

  /**
   * Validates SQL query and parameters
   * @param sql - SQL query string
   * @param params - Query parameters
   * @throws {DatabaseValidationError} When validation fails
   */
  private validateSqlQuery(sql: string, params?: unknown[]): void {
    try {
      SqlQuerySchema.parse(sql);
      if (params !== undefined) {
        SqlParamsSchema.parse(params);
      }
    } catch (error) {
      throw new DatabaseValidationError('Invalid SQL query or parameters', error as Error);
    }

    // Additional validation
    if (sql.trim().length === 0) {
      throw new DatabaseValidationError('SQL query cannot be empty');
    }

    if (params && params.length > 100) {
      throw new DatabaseValidationError('Too many parameters (max 100)');
    }
  }

  /**
   * Validates transaction operations
   * @param operations - Array of database operations
   * @throws {DatabaseValidationError} When validation fails
   */
  private validateTransactionOperations(operations: DatabaseOperation[]): void {
    try {
      DatabaseOperationsSchema.parse(operations);
    } catch (error) {
      throw new DatabaseValidationError('Invalid transaction operations', error as Error);
    }

    // Validate each operation individually
    operations.forEach((op, index) => {
      this.validateSqlQuery(op.sql, op.params ? Array.from(op.params) : undefined);

      if (!['query', 'execute'].includes(op.type)) {
        throw new DatabaseValidationError(`Invalid operation type at index ${index}: ${op.type}`);
      }
    });
  }

  /**
   * Validates SQL for security threats
   * @param sql - SQL string to validate
   * @throws {DatabaseSecurityError} When security threat detected
   */
  private validateSqlSecurity(sql: string): void {
    const normalizedSql = sql.trim().toUpperCase();

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_SQL_PATTERNS) {
      if (pattern.test(sql)) {
        throw new DatabaseSecurityError(`Dangerous SQL pattern detected: ${pattern.source}`);
      }
    }

    // Additional security checks
    if (normalizedSql.includes('PRAGMA')) {
      throw new DatabaseSecurityError('PRAGMA statements are not allowed');
    }

    if (normalizedSql.includes('ATTACH') || normalizedSql.includes('DETACH')) {
      throw new DatabaseSecurityError('Database attach/detach operations are not allowed');
    }
  }

  /**
   * Ensures database connection is available
   * @throws {DatabaseExecutionError} When connection is not available
   */
  private async ensureConnection(): Promise<void> {
    if (!this.connection.isDbConnected()) {
      try {
        await this.connection.connect();
      } catch (error) {
        throw new DatabaseExecutionError('Failed to establish database connection', error as Error);
      }
    }

    // Health check
    const isHealthy = await this.connection.healthCheck();
    if (!isHealthy) {
      throw new DatabaseExecutionError('Database connection is unhealthy');
    }
  }

  /**
   * Executes a function with timeout
   * @param fn - Function to execute
   * @param timeout - Timeout in milliseconds
   * @returns Promise with the function result
   * @throws {DatabaseExecutionError} When timeout occurs
   */
  private async executeWithTimeout<T>(fn: () => T, timeout: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new DatabaseExecutionError(`Database operation timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = fn();
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Validates the database connection on initialization
   * @throws {DatabaseIpcError} When connection is invalid
   */
  private validateConnection(): void {
    if (!this.connection) {
      throw new DatabaseIpcError('Database connection is required', 'DB_CONNECTION_REQUIRED');
    }
  }

  /**
   * Gets handler statistics for monitoring
   * @returns Handler statistics
   */
  public getStats(): {
    readonly isConnected: boolean;
    readonly registeredChannels: readonly string[];
    readonly connectionStats: ReturnType<DatabaseConnection['getStats']>;
  } {
    return {
      isConnected: this.connection.isDbConnected(),
      registeredChannels: this.allowedChannels,
      connectionStats: this.connection.getStats(),
    };
  }
}

/**
 * Factory function to create DatabaseIpcHandler
 * @param connection - Database connection instance
 * @returns DatabaseIpcHandler instance
 */
export function createDatabaseIpcHandler(connection: DatabaseConnection): DatabaseIpcHandler {
  return new DatabaseIpcHandler(connection);
}
