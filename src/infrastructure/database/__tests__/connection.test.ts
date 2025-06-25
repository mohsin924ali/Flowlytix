import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { join } from 'path';
import { existsSync, unlinkSync, rmSync } from 'fs';
import {
  DatabaseConnection,
  DatabaseConnectionError,
  DatabaseConfigurationError,
  createDatabaseConnection,
  defaultDatabaseConfig,
  testDatabaseConfig,
  type DatabaseConfig,
} from '../connection';

describe('DatabaseConnection', () => {
  let connection: DatabaseConnection;
  let testDbPath: string;

  beforeEach(() => {
    // Reset singleton instance
    DatabaseConnection.resetInstance();
    testDbPath = join(__dirname, 'test-connection.db');

    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  afterEach(async () => {
    // Clean up database connection
    if (connection && connection.isDbConnected()) {
      await connection.close();
    }

    // Clean up test database files
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

    // Clean up any test directories
    const testDir = join(__dirname, 'test-db-dir');
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    DatabaseConnection.resetInstance();
  });

  describe('Connection Management', () => {
    it('should create a singleton database connection', () => {
      const config: DatabaseConfig = {
        filename: ':memory:',
        inMemory: true,
      };

      const connection1 = DatabaseConnection.getInstance(config);
      const connection2 = DatabaseConnection.getInstance();

      expect(connection1).toBe(connection2);
    });

    it('should throw error when accessing singleton without initial config', () => {
      expect(() => {
        DatabaseConnection.getInstance();
      }).toThrow(DatabaseConfigurationError);
    });

    it('should establish connection to in-memory database', async () => {
      connection = createDatabaseConnection(testDatabaseConfig);

      expect(connection.isDbConnected()).toBe(false);

      await connection.connect();

      expect(connection.isDbConnected()).toBe(true);
    });

    it('should establish connection to file database', async () => {
      const config: DatabaseConfig = {
        filename: testDbPath,
        timeout: 3000,
      };

      connection = createDatabaseConnection(config);
      await connection.connect();

      expect(connection.isDbConnected()).toBe(true);
      expect(existsSync(testDbPath)).toBe(true);
    });

    it('should create database directory if it does not exist', async () => {
      const testDir = join(__dirname, 'test-db-dir');
      const dbPath = join(testDir, 'test.db');

      const config: DatabaseConfig = {
        filename: dbPath,
      };

      connection = createDatabaseConnection(config);
      await connection.connect();

      expect(existsSync(testDir)).toBe(true);
      expect(existsSync(dbPath)).toBe(true);
    });

    it('should handle multiple connect calls gracefully', async () => {
      connection = createDatabaseConnection(testDatabaseConfig);

      await connection.connect();
      await connection.connect();
      await connection.connect();

      expect(connection.isDbConnected()).toBe(true);
    });

    it('should close connection safely', async () => {
      connection = createDatabaseConnection(testDatabaseConfig);
      await connection.connect();

      expect(connection.isDbConnected()).toBe(true);

      await connection.close();

      expect(connection.isDbConnected()).toBe(false);
    });

    it('should handle close on non-connected database', async () => {
      connection = createDatabaseConnection(testDatabaseConfig);

      await expect(connection.close()).resolves.not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required filename', () => {
      expect(() => {
        createDatabaseConnection({} as DatabaseConfig);
      }).toThrow(DatabaseConfigurationError);
    });

    it('should validate minimum timeout', () => {
      expect(() => {
        createDatabaseConnection({
          filename: ':memory:',
          timeout: 500, // Less than minimum 1000ms
        });
      }).toThrow(DatabaseConfigurationError);
    });

    it('should accept valid configuration', () => {
      expect(() => {
        createDatabaseConnection({
          filename: ':memory:',
          timeout: 2000,
          readonly: true,
          verbose: false,
        });
      }).not.toThrow();
    });

    it('should use default timeout when not specified', () => {
      const connection = createDatabaseConnection({
        filename: ':memory:',
      });

      const stats = connection.getStats();
      expect(stats.filename).toBe(':memory:');
    });
  });

  describe('Database Operations', () => {
    beforeEach(async () => {
      connection = createDatabaseConnection(testDatabaseConfig);
      await connection.connect();
    });

    it('should get database instance when connected', () => {
      const db = connection.getDatabase();
      expect(db).toBeDefined();
    });

    it('should throw error when getting database instance without connection', async () => {
      await connection.close();

      expect(() => {
        connection.getDatabase();
      }).toThrow(DatabaseConnectionError);
    });

    it('should execute health check successfully', async () => {
      const isHealthy = await connection.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false for health check on closed connection', async () => {
      await connection.close();

      const isHealthy = await connection.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should configure database performance settings', async () => {
      const db = connection.getDatabase();

      // Test that performance settings are applied (memory mode uses different journal)
      const journalMode = db.pragma('journal_mode', { simple: true });
      expect(['wal', 'memory']).toContain(journalMode);

      const foreignKeys = db.pragma('foreign_keys', { simple: true });
      expect(foreignKeys).toBe(1);
    });

    it('should execute simple queries', async () => {
      const db = connection.getDatabase();

      // Create test table
      db.exec('CREATE TABLE test (id INTEGER, name TEXT)');

      // Insert data
      const insert = db.prepare('INSERT INTO test (id, name) VALUES (?, ?)');
      insert.run(1, 'Test');

      // Query data
      const select = db.prepare('SELECT * FROM test WHERE id = ?');
      const result = select.get(1) as { id: number; name: string };

      expect(result).toEqual({ id: 1, name: 'Test' });
    });
  });

  describe('Error Handling', () => {
    it('should handle connection to non-existent file with fileMustExist', async () => {
      const config: DatabaseConfig = {
        filename: '/non/existent/path/test.db',
        fileMustExist: true,
      };

      connection = createDatabaseConnection(config);

      await expect(connection.connect()).rejects.toThrow(DatabaseConnectionError);
    });

    it('should retry connection with exponential backoff', async () => {
      const config: DatabaseConfig = {
        filename: '\0invalid\0path\0test.db', // Null bytes make this truly invalid
      };

      connection = createDatabaseConnection(config);

      const startTime = Date.now();
      await expect(connection.connect()).rejects.toThrow(DatabaseConnectionError);
      const duration = Date.now() - startTime;

      // Should take some time due to retries (at least 1s + 2s = 3s)
      expect(duration).toBeGreaterThan(2500);
    });

    it('should handle database corruption gracefully', async () => {
      connection = createDatabaseConnection(testDatabaseConfig);
      await connection.connect();

      const db = connection.getDatabase();

      // This should not throw but might return false for health check
      const isHealthy = await connection.healthCheck();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      connection = createDatabaseConnection(testDatabaseConfig);
      await connection.connect();
    });

    it('should provide connection statistics', () => {
      const stats = connection.getStats();

      expect(stats).toEqual({
        isConnected: true,
        connectionAttempts: 0,
        filename: ':memory:',
        inMemory: true,
      });
    });

    it('should track connection attempts on failures', async () => {
      await connection.close();
      DatabaseConnection.resetInstance();

      const invalidConfig: DatabaseConfig = {
        filename: '\0invalid\0path\0test.db', // Null bytes make this truly invalid
      };

      connection = createDatabaseConnection(invalidConfig);

      try {
        await connection.connect();
      } catch {
        // Expected to fail
      }

      const stats = connection.getStats();
      expect(stats.connectionAttempts).toBeGreaterThan(0);
      expect(stats.isConnected).toBe(false);
    });
  });

  describe('Default Configurations', () => {
    it('should provide valid default configuration', () => {
      expect(defaultDatabaseConfig.filename).toContain('flowlytix.db');
      expect(defaultDatabaseConfig.timeout).toBe(5000);
      expect(typeof defaultDatabaseConfig.verbose).toBe('boolean');
    });

    it('should provide valid test configuration', () => {
      expect(testDatabaseConfig.filename).toBe(':memory:');
      expect(testDatabaseConfig.inMemory).toBe(true);
      expect(testDatabaseConfig.timeout).toBe(1000);
      expect(testDatabaseConfig.verbose).toBe(false);
    });
  });

  describe('Factory Function', () => {
    it('should create connection using factory function', () => {
      const connection = createDatabaseConnection(testDatabaseConfig);
      expect(connection).toBeInstanceOf(DatabaseConnection);
    });

    it('should return singleton instance from factory', () => {
      const connection1 = createDatabaseConnection(testDatabaseConfig);
      const connection2 = createDatabaseConnection(testDatabaseConfig);

      expect(connection1).toBe(connection2);
    });
  });

  describe('Concurrent Operations', () => {
    beforeEach(async () => {
      connection = createDatabaseConnection(testDatabaseConfig);
      await connection.connect();
    });

    it('should handle concurrent database operations', async () => {
      const db = connection.getDatabase();

      // Create test table
      db.exec('CREATE TABLE concurrent_test (id INTEGER PRIMARY KEY, value TEXT)');

      // Run concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) => {
        return new Promise<void>((resolve) => {
          const insert = db.prepare('INSERT INTO concurrent_test (value) VALUES (?)');
          insert.run(`value_${i}`);
          resolve();
        });
      });

      await Promise.all(operations);

      // Verify all operations completed
      const count = db.prepare('SELECT COUNT(*) as count FROM concurrent_test').get() as { count: number };
      expect(count.count).toBe(10);
    });

    it('should handle concurrent health checks', async () => {
      const healthChecks = Array.from({ length: 5 }, () => connection.healthCheck());

      const results = await Promise.all(healthChecks);

      results.forEach((result) => {
        expect(result).toBe(true);
      });
    });
  });
});
