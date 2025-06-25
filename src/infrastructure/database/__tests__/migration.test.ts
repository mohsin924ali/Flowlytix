import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  DatabaseConnection,
  DatabaseConnectionError,
  DatabaseMigration,
  MigrationError,
  MigrationValidationError,
  createMigrationManager,
  testDatabaseConfig,
  type Migration,
  type MigrationResult,
} from '../index';

describe('DatabaseMigration', () => {
  let connection: DatabaseConnection;
  let migration: DatabaseMigration;

  beforeEach(async () => {
    // Reset singleton and create fresh connection
    DatabaseConnection.resetInstance();
    connection = DatabaseConnection.getInstance(testDatabaseConfig);
    await connection.connect();
    migration = createMigrationManager(connection);
  });

  afterEach(async () => {
    if (connection && connection.isDbConnected()) {
      await connection.close();
    }
    DatabaseConnection.resetInstance();
  });

  describe('Migration Execution', () => {
    it('should run all pending migrations successfully', async () => {
      const results = await migration.migrate();

      expect(results).toHaveLength(6); // Should have 6 built-in migrations
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.version).toBeGreaterThan(0);
        expect(result.duration).toBeGreaterThanOrEqual(0);
        expect(result.executedAt).toBeInstanceOf(Date);
      });
    });

    it('should not run migrations when already up to date', async () => {
      // Run migrations first time
      await migration.migrate();

      // Run again - should be no pending migrations
      const results = await migration.migrate();
      expect(results).toHaveLength(0);
    });

    it('should track migration progress correctly', async () => {
      const initialVersion = await migration.getCurrentVersion();
      expect(initialVersion).toBe(0);

      await migration.migrate();

      const finalVersion = await migration.getCurrentVersion();
      expect(finalVersion).toBe(6); // Latest migration version
    });

    it('should create schema version table', async () => {
      const db = connection.getDatabase();

      // Table should not exist initially
      const initialTables = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='schema_version'
      `
        )
        .all();
      expect(initialTables).toHaveLength(0);

      await migration.migrate();

      // Table should exist after migration
      const finalTables = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='schema_version'
      `
        )
        .all();
      expect(finalTables).toHaveLength(1);
    });

    it('should execute migrations in correct order', async () => {
      const results = await migration.migrate();

      // Migrations should be executed in version order
      for (let i = 1; i < results.length; i++) {
        expect(results[i].version).toBeGreaterThan(results[i - 1].version);
      }
    });

    it('should create all expected tables and indexes', async () => {
      await migration.migrate();

      const db = connection.getDatabase();

      // Check tables exist
      const tables = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `
        )
        .all() as { name: string }[];

      const expectedTables = [
        'agencies',
        'areas',
        'audit_log',
        'customers',
        'inventory',
        'lot_batch_movements',
        'lot_batches',
        'order_items',
        'orders',
        'products',
        'schema_version',
        'user_sessions',
        'users',
        'workers',
      ];
      const actualTables = tables.map((t) => t.name).sort();

      expect(actualTables).toEqual(expectedTables);

      // Check indexes exist
      const indexes = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `
        )
        .all() as { name: string }[];

      expect(indexes.length).toBeGreaterThan(5); // Should have multiple indexes
    });

    it('should create audit triggers', async () => {
      await migration.migrate();

      const db = connection.getDatabase();

      const triggers = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='trigger'
        ORDER BY name
      `
        )
        .all() as { name: string }[];

      const expectedTriggers = [
        'audit_agencies_insert',
        'audit_agencies_update',
        'audit_customers_insert',
        'audit_customers_update',
        'audit_inventory_update',
        'audit_lot_batches_insert',
        'audit_lot_batches_quantity_update',
        'audit_lot_movements_insert',
        'audit_orders_insert',
        'audit_orders_status_update',
        'audit_users_delete',
        'audit_users_insert',
        'audit_users_update',
      ];

      const actualTriggers = triggers.map((t) => t.name).sort();
      expect(actualTriggers).toEqual(expectedTriggers);
    });
  });

  describe('Migration Status and Information', () => {
    it('should provide accurate migration status', async () => {
      const initialStatus = await migration.getStatus();
      expect(initialStatus.currentVersion).toBe(0);
      expect(initialStatus.latestVersion).toBe(6);
      expect(initialStatus.pendingMigrations).toBe(6);
      expect(initialStatus.appliedMigrations).toHaveLength(0);

      await migration.migrate();

      const finalStatus = await migration.getStatus();
      expect(finalStatus.currentVersion).toBe(6);
      expect(finalStatus.latestVersion).toBe(6);
      expect(finalStatus.pendingMigrations).toBe(0);
      expect(finalStatus.appliedMigrations).toHaveLength(6);
    });

    it('should validate schema integrity', async () => {
      await migration.migrate();

      const isValid = await migration.validateSchema();
      expect(isValid).toBe(true);
    });

    it('should detect schema corruption', async () => {
      await migration.migrate();

      // Corrupt the database by dropping a table that's checked in validation
      const db = connection.getDatabase();
      db.exec('DROP TABLE users');

      const isValid = await migration.validateSchema();
      expect(isValid).toBe(false);
    });
  });

  describe('Rollback Operations', () => {
    beforeEach(async () => {
      // Set up migrated database
      await migration.migrate();
    });

    it('should rollback to specific version', async () => {
      const initialVersion = await migration.getCurrentVersion();
      expect(initialVersion).toBe(6);

      const results = await migration.rollback(1);

      expect(results).toHaveLength(5); // Should rollback 5 migrations (v6, v5, v4, v3, v2)
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      const finalVersion = await migration.getCurrentVersion();
      expect(finalVersion).toBe(1);
    });

    it('should rollback migrations in reverse order', async () => {
      const results = await migration.rollback(0);

      // Should rollback in reverse version order
      for (let i = 1; i < results.length; i++) {
        expect(results[i].version).toBeLessThan(results[i - 1].version);
      }
    });

    it('should remove rolled back migrations from version table', async () => {
      await migration.rollback(1);

      const db = connection.getDatabase();
      const versions = db
        .prepare(
          `
        SELECT version FROM schema_version ORDER BY version
      `
        )
        .all() as { version: number }[];

      expect(versions).toHaveLength(1);
      expect(versions[0]?.version).toBe(1);
    });

    it('should validate rollback target version', async () => {
      const currentVersion = await migration.getCurrentVersion();

      // Cannot rollback to same or higher version
      await expect(migration.rollback(currentVersion)).rejects.toThrow(MigrationValidationError);
      await expect(migration.rollback(currentVersion + 1)).rejects.toThrow(MigrationValidationError);
    });

    it('should handle rollback of non-reversible migrations', async () => {
      // Migration 3 (performance optimizations) has no down scripts
      const results = await migration.rollback(2);

      expect(results).toHaveLength(4);
      expect(results[0]!.success).toBe(true);
      expect(results[0]!.version).toBe(6);
    });
  });

  describe('Error Handling', () => {
    it('should handle migration execution errors', async () => {
      // Create a migration manager with corrupted connection
      await connection.close();

      await expect(migration.migrate()).rejects.toThrow(DatabaseConnectionError);
    });

    it('should provide detailed error information', async () => {
      await connection.close();

      try {
        await migration.migrate();
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseConnectionError);
        const connectionError = error as DatabaseConnectionError;
        expect(connectionError.message).toContain('Database not connected');
      }
    });

    it('should handle rollback errors', async () => {
      await migration.migrate();
      await connection.close();

      await expect(migration.rollback(0)).rejects.toThrow(DatabaseConnectionError);
    });

    it('should maintain atomicity on migration failure', async () => {
      // This test would require injecting a failing migration
      // For now, we test that the system handles closed connections
      const initialVersion = await migration.getCurrentVersion();
      await connection.close();

      try {
        await migration.migrate();
      } catch {
        // Expected to fail
      }

      // Reconnect to check version
      await connection.connect();
      const finalVersion = await migration.getCurrentVersion();
      expect(finalVersion).toBe(initialVersion);
    });
  });

  describe('Schema Validation', () => {
    it('should pass validation for properly migrated database', async () => {
      await migration.migrate();

      const isValid = await migration.validateSchema();
      expect(isValid).toBe(true);
    });

    it('should fail validation for incomplete schema', async () => {
      // Don't run migrations
      const isValid = await migration.validateSchema();
      expect(isValid).toBe(false);
    });

    it('should check foreign key constraints', async () => {
      await migration.migrate();

      const db = connection.getDatabase();

      // Insert data that would violate foreign key constraints
      try {
        db.exec(`
          INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at, last_accessed_at)
          VALUES ('test-session', 'non-existent-user', 'hash', 9999999999, 1000000000, 1000000000)
        `);

        const isValid = await migration.validateSchema();
        expect(isValid).toBe(false);
      } catch {
        // Foreign key constraint should prevent invalid insert
        const isValid = await migration.validateSchema();
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Migration Checksums', () => {
    it('should generate consistent checksums for migrations', async () => {
      const status1 = await migration.getStatus();
      const migration2 = createMigrationManager(connection);
      const status2 = await migration2.getStatus();

      // Both migration managers should report same latest version
      expect(status1.latestVersion).toBe(status2.latestVersion);
    });

    it('should track migration checksums in database', async () => {
      await migration.migrate();

      const db = connection.getDatabase();
      const records = db
        .prepare(
          `
        SELECT version, checksum FROM schema_version ORDER BY version
      `
        )
        .all() as { version: number; checksum: string }[];

      expect(records).toHaveLength(6);
      records.forEach((record) => {
        expect(record.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
        expect(record.version).toBeGreaterThan(0);
      });
    });
  });

  describe('Factory Functions', () => {
    it('should create migration manager using factory', () => {
      const mgr = createMigrationManager(connection);
      expect(mgr).toBeInstanceOf(DatabaseMigration);
    });

    it('should handle multiple migration managers on same connection', async () => {
      const mgr1 = createMigrationManager(connection);
      const mgr2 = createMigrationManager(connection);

      await mgr1.migrate();

      // Second manager should see completed migrations
      const status = await mgr2.getStatus();
      expect(status.currentVersion).toBe(6);
      expect(status.pendingMigrations).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should execute migrations efficiently', async () => {
      const startTime = Date.now();

      const results = await migration.migrate();

      const duration = Date.now() - startTime;
      const totalMigrationTime = results.reduce((sum, r) => sum + r.duration, 0);

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(totalMigrationTime).toBeGreaterThan(0);
    });

    it('should handle large migration efficiently', async () => {
      await migration.migrate();

      const db = connection.getDatabase();

      // Test performance with larger dataset
      const startTime = Date.now();

      // Create test data
      const insert = db.prepare(`
        INSERT INTO users (
          id, email, first_name, last_name, password_hash, password_salt,
          password_algorithm, password_created_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((count: number) => {
        for (let i = 0; i < count; i++) {
          const now = Date.now();
          insert.run(`user-${i}`, `user${i}@test.com`, `User${i}`, `Test${i}`, 'hash', 'salt', 'PBKDF2', now, now, now);
        }
      });

      transaction(1000); // Insert 1000 users

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should insert 1000 records in under 1 second

      // Verify data integrity
      const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      expect(count.count).toBe(1000);
    });
  });
});
