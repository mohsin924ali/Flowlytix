/**
 * Database Infrastructure Layer - Index
 * Centralized exports for database functionality
 * Following enterprise standards with proper encapsulation
 */

// Connection Management
export {
  DatabaseConnection,
  DatabaseConnectionError,
  DatabaseConfigurationError,
  createDatabaseConnection,
  defaultDatabaseConfig,
  testDatabaseConfig,
  type DatabaseConfig,
} from './connection';

// Schema Definitions
export {
  USERS_TABLE_SCHEMA,
  USERS_TABLE_INDEXES,
  USER_SESSIONS_TABLE_SCHEMA,
  USER_SESSIONS_TABLE_INDEXES,
  AUDIT_LOG_TABLE_SCHEMA,
  AUDIT_LOG_TABLE_INDEXES,
  SCHEMA_VERSION_TABLE_SCHEMA,
  SCHEMA_CREATION_ORDER,
  PERFORMANCE_OPTIMIZATIONS,
  AUDIT_TRIGGERS,
  SCHEMA_VALIDATION_QUERIES,
  DATABASE_STATS_QUERIES,
} from './schema';

// Migration Management
export {
  DatabaseMigration,
  MigrationError,
  MigrationValidationError,
  createMigrationManager,
  type Migration,
  type MigrationResult,
} from './migration';

// Import for utility functions
import { DatabaseConnection, createDatabaseConnection, defaultDatabaseConfig, type DatabaseConfig } from './connection';
import { DatabaseMigration, createMigrationManager, type MigrationResult } from './migration';

/**
 * Database initialization utility
 * Creates connection, runs migrations, and validates schema
 */
export async function initializeDatabase(config?: DatabaseConfig): Promise<{
  connection: DatabaseConnection;
  migration: DatabaseMigration;
  migrationResults: MigrationResult[];
}> {
  const connection = createDatabaseConnection(config || defaultDatabaseConfig);
  await connection.connect();

  const migration = createMigrationManager(connection);
  const migrationResults = await migration.migrate();

  // Validate schema after migrations
  const isValid = await migration.validateSchema();
  if (!isValid) {
    throw new Error('Database schema validation failed after migration');
  }

  return {
    connection,
    migration,
    migrationResults,
  };
}

/**
 * Database health check utility
 */
export async function checkDatabaseHealth(connection: DatabaseConnection): Promise<{
  isHealthy: boolean;
  stats: ReturnType<DatabaseConnection['getStats']>;
  schemaValid: boolean;
}> {
  const isHealthy = await connection.healthCheck();
  const stats = connection.getStats();

  let schemaValid = false;
  if (isHealthy) {
    try {
      const migration = createMigrationManager(connection);
      schemaValid = await migration.validateSchema();
    } catch {
      schemaValid = false;
    }
  }

  return {
    isHealthy,
    stats,
    schemaValid,
  };
}
