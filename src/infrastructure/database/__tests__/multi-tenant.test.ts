import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { DatabaseConnection } from '../connection';
import { DatabaseConnectionPool } from '../connection-pool';
import { AgencyContextManager } from '../agency-context';
import { DatabaseMigration } from '../migration';

describe('Multi-Tenant Database Support', () => {
  let mainConnection: DatabaseConnection;
  let migration: DatabaseMigration;
  let pool: DatabaseConnectionPool;
  let contextManager: AgencyContextManager;

  beforeEach(async () => {
    // Reset all singletons
    DatabaseConnection.resetInstance();
    DatabaseConnectionPool.resetInstance();
    AgencyContextManager.resetInstance();

    // Initialize main database in memory
    mainConnection = DatabaseConnection.getInstance({
      filename: ':memory:',
      inMemory: true,
    });
    await mainConnection.connect();

    // Run migrations
    migration = new DatabaseMigration(mainConnection);
    await migration.migrate();

    // Get instances
    pool = DatabaseConnectionPool.getInstance();
    contextManager = AgencyContextManager.getInstance();
    await contextManager.initialize();
  });

  afterEach(async () => {
    await mainConnection.close();
    await pool.shutdown();
    contextManager.reset();
  });

  describe('Agency Database Management', () => {
    it('should create and track agency databases', async () => {
      const db = mainConnection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create test agency
      const agencyId = 'test-agency-001';
      db.prepare(
        `INSERT INTO agencies (id, name, database_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(agencyId, 'Test Agency', 'test-agency.db', now, now);

      // Create agency database record
      const databaseId = 'db-001';
      db.prepare(
        `INSERT INTO agency_databases (id, agency_id, database_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(databaseId, agencyId, 'test-agency-001.db', now, now);

      // Verify database record
      const dbRecord = db.prepare('SELECT * FROM agency_databases WHERE id = ?').get(databaseId) as any;
      expect(dbRecord).toBeDefined();
      expect(dbRecord.agency_id).toBe(agencyId);
      expect(dbRecord.status).toBe('active');
    });

    it('should track database connections', async () => {
      const db = mainConnection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create test agency
      const agencyId = 'test-agency-002';
      db.prepare(
        `INSERT INTO agencies (id, name, database_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(agencyId, 'Test Agency 2', 'test-agency-2.db', now, now);

      // Create agency database record
      const databaseId = 'db-002';
      db.prepare(
        `INSERT INTO agency_databases (id, agency_id, database_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(databaseId, agencyId, 'test-agency-002.db', now, now);

      // Create connection record
      const connectionId = 'conn-001';
      db.prepare(
        `INSERT INTO agency_database_connections 
         (id, agency_id, database_id, connected_at, connection_status)
         VALUES (?, ?, ?, ?, ?)`
      ).run(connectionId, agencyId, databaseId, now, 'active');

      // Verify connection record
      const connRecord = db.prepare('SELECT * FROM agency_database_connections WHERE id = ?').get(connectionId) as any;
      expect(connRecord).toBeDefined();
      expect(connRecord.agency_id).toBe(agencyId);
      expect(connRecord.database_id).toBe(databaseId);
      expect(connRecord.connection_status).toBe('active');
    });
  });

  describe('Connection Pool Integration', () => {
    it('should manage agency database connections through pool', async () => {
      const db = mainConnection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create test agency
      const agencyId = 'test-agency-003';
      db.prepare(
        `INSERT INTO agencies (id, name, database_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(agencyId, 'Test Agency 3', 'test-agency-3.db', now, now);

      // Get connection through pool
      const connection = await pool.getConnection(agencyId);
      expect(connection).toBeDefined();
      expect(connection.open).toBe(true);

      // Verify pool stats
      const stats = pool.getStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.activeConnections).toBe(1);
    });

    it('should reuse existing connections', async () => {
      const db = mainConnection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create test agency
      const agencyId = 'test-agency-004';
      db.prepare(
        `INSERT INTO agencies (id, name, database_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(agencyId, 'Test Agency 4', 'test-agency-4.db', now, now);

      // Get first connection
      const conn1 = await pool.getConnection(agencyId);
      expect(conn1).toBeDefined();

      // Get second connection - should reuse first
      const conn2 = await pool.getConnection(agencyId);
      expect(conn2).toBe(conn1);

      // Verify pool stats
      const stats = pool.getStats();
      expect(stats.totalConnections).toBe(1);
      expect(stats.activeConnections).toBe(1);
    });
  });

  describe('Agency Context Integration', () => {
    it('should manage agency context with database connections', async () => {
      const db = mainConnection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create test agency
      const agencyId = 'test-agency-005';
      const userId = 'user-001';
      db.prepare(
        `INSERT INTO agencies (id, name, database_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(agencyId, 'Test Agency 5', 'test-agency-5.db', now, now);

      // Set agency context
      const success = await contextManager.setAgencyContext(agencyId, userId, 'Test Agency 5');
      expect(success).toBe(true);

      // Verify current context
      const currentContext = contextManager.getCurrentContext();
      expect(currentContext).toBeDefined();
      expect(currentContext?.agencyId).toBe(agencyId);

      // Get database through context
      const agencyDb = await contextManager.getCurrentDatabase();
      expect(agencyDb).toBeDefined();
      expect(agencyDb?.open).toBe(true);
    });

    it('should handle context switching between agencies', async () => {
      const db = mainConnection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create test agencies
      const agency1Id = 'test-agency-006';
      const agency2Id = 'test-agency-007';
      const userId = 'user-002';

      db.prepare(
        `INSERT INTO agencies (id, name, database_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(agency1Id, 'Test Agency 6', 'test-agency-6.db', now, now);

      db.prepare(
        `INSERT INTO agencies (id, name, database_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(agency2Id, 'Test Agency 7', 'test-agency-7.db', now, now);

      // Set first agency context
      await contextManager.setAgencyContext(agency1Id, userId, 'Test Agency 6');
      expect(contextManager.getCurrentAgencyId()).toBe(agency1Id);

      // Switch to second agency
      await contextManager.setAgencyContext(agency2Id, userId, 'Test Agency 7');
      expect(contextManager.getCurrentAgencyId()).toBe(agency2Id);

      // Switch back to previous context
      const switched = contextManager.switchToPreviousContext();
      expect(switched).toBe(true);
      expect(contextManager.getCurrentAgencyId()).toBe(agency1Id);
    });
  });
});
