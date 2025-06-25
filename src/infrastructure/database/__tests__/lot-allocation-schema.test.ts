/**
 * Lot Allocation Persistence Schema Tests
 * Phase 2: Order Processing - Database Schema Updates
 *
 * Tests the lot allocation persistence table migration and schema integrity
 * Following TDD approach and Instructions file standards
 *
 * @testType Integration
 * @phase Database Schema Updates
 * @step 2
 */

import { DatabaseConnection, DatabaseMigration, createMigrationManager, testDatabaseConfig } from '../index';

describe('Lot Allocation Persistence Schema', () => {
  let connection: DatabaseConnection;
  let migration: DatabaseMigration;

  beforeEach(async () => {
    // Reset singleton and create fresh connection for testing
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

  describe('Step 2.1: Migration 7 Execution', () => {
    it('should execute Migration 7 successfully', async () => {
      // Arrange
      const initialVersion = await migration.getCurrentVersion();
      console.log(`Initial database version: ${initialVersion}`);

      // Act
      const results = await migration.migrate();
      const finalVersion = await migration.getCurrentVersion();

      // Assert
      expect(results.length).toBeGreaterThan(0);
      expect(finalVersion).toBe(7);

      const migration7Result = results.find((r) => r.version === 7);
      expect(migration7Result).toBeDefined();
      expect(migration7Result!.success).toBe(true);
      expect(migration7Result!.error).toBeUndefined();

      console.log(`Migration 7 executed successfully in ${migration7Result!.duration}ms`);
    });

    it('should create order_item_lot_allocations table with correct structure', async () => {
      // Arrange
      await migration.migrate();
      const db = connection.getDatabase();

      // Act
      const tableInfo = db.prepare(`PRAGMA table_info(order_item_lot_allocations)`).all();

      // Assert
      expect(tableInfo).toHaveLength(13); // All expected columns including updated_at

      const columnNames = tableInfo.map((col: any) => col.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('order_id');
      expect(columnNames).toContain('order_item_id');
      expect(columnNames).toContain('lot_batch_id');
      expect(columnNames).toContain('lot_number');
      expect(columnNames).toContain('batch_number');
      expect(columnNames).toContain('allocated_quantity');
      expect(columnNames).toContain('manufacturing_date');
      expect(columnNames).toContain('expiry_date');
      expect(columnNames).toContain('reserved_at');
      expect(columnNames).toContain('reserved_by');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');

      // Verify primary key
      const primaryKey = tableInfo.find((col: any) => col.pk === 1) as any;
      expect(primaryKey?.name).toBe('id');
    });

    it('should create all required indexes for lot allocation table', async () => {
      // Arrange
      await migration.migrate();
      const db = connection.getDatabase();

      // Act
      const indexes = db.prepare(`PRAGMA index_list(order_item_lot_allocations)`).all();

      // Assert
      const expectedIndexes = [
        'idx_order_lot_allocations_order_id',
        'idx_order_lot_allocations_order_item_id',
        'idx_order_lot_allocations_lot_batch_id',
        'idx_order_lot_allocations_lot_number',
        'idx_order_lot_allocations_reserved_at',
        'idx_order_lot_allocations_reserved_by',
        'idx_order_lot_allocations_manufacturing_date',
        'idx_order_lot_allocations_expiry_date',
        'idx_order_lot_allocations_order_tracking',
        'idx_order_lot_allocations_lot_tracking',
        'idx_order_lot_allocations_expiring_lots',
      ];

      const indexNames = indexes.map((idx: any) => idx.name);
      for (const expectedIndex of expectedIndexes) {
        expect(indexNames).toContain(expectedIndex);
      }

      console.log(`Created ${indexes.length} indexes for lot allocation table`);
    });

    it('should create all audit triggers for lot allocation table', async () => {
      // Arrange
      await migration.migrate();
      const db = connection.getDatabase();

      // Act
      const triggers = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type = 'trigger' 
        AND tbl_name = 'order_item_lot_allocations'
      `
        )
        .all();

      // Assert
      const expectedTriggers = [
        'audit_order_lot_allocations_insert',
        'audit_order_lot_allocations_update',
        'audit_order_lot_allocations_delete',
      ];

      const triggerNames = triggers.map((trigger: any) => trigger.name);
      for (const expectedTrigger of expectedTriggers) {
        expect(triggerNames).toContain(expectedTrigger);
      }

      console.log(`Created ${triggers.length} audit triggers for lot allocation table`);
    });
  });

  describe('Step 2.2: Foreign Key Constraint Validation', () => {
    beforeEach(async () => {
      await migration.migrate();
    });

    it('should enforce foreign key constraint to orders table', async () => {
      // Arrange
      const db = connection.getDatabase();

      // Act & Assert
      expect(() => {
        db.prepare(
          `
          INSERT INTO order_item_lot_allocations (
            id, order_id, order_item_id, lot_batch_id, lot_number,
            allocated_quantity, manufacturing_date, reserved_at, reserved_by
          ) VALUES (
            'test-alloc-1', 'non-existent-order', 'test-item', 'test-lot', 'LOT001',
            10, 1704067200, 1704067200, 'test-user'
          )
        `
        ).run();
      }).toThrow(); // Should fail due to foreign key constraint
    });

    it('should enforce lot_batch_id foreign key constraint', async () => {
      // Arrange
      const db = connection.getDatabase();

      // Act & Assert
      expect(() => {
        db.prepare(
          `
          INSERT INTO order_item_lot_allocations (
            id, order_id, order_item_id, lot_batch_id, lot_number,
            allocated_quantity, manufacturing_date, reserved_at, reserved_by
          ) VALUES (
            'test-alloc-2', 'test-order', 'test-item', 'non-existent-lot', 'LOT001',
            10, 1704067200, 1704067200, 'test-user'
          )
        `
        ).run();
      }).toThrow(); // Should fail due to foreign key constraint
    });
  });

  describe('Step 2.3: Business Rule Constraint Validation', () => {
    beforeEach(async () => {
      await migration.migrate();
    });

    it('should enforce positive allocated quantity constraint', async () => {
      // Arrange
      const db = connection.getDatabase();

      // Act & Assert
      expect(() => {
        db.prepare(
          `
          INSERT INTO order_item_lot_allocations (
            id, order_id, order_item_id, lot_batch_id, lot_number,
            allocated_quantity, manufacturing_date, reserved_at, reserved_by
          ) VALUES (
            'test-alloc-3', 'test-order', 'test-item', 'test-lot', 'LOT001',
            0, 1704067200, 1704067200, 'test-user'
          )
        `
        ).run();
      }).toThrow(/order_lot_allocations_allocated_quantity_positive/);
    });

    it('should enforce lot number length constraint', async () => {
      // Arrange
      const db = connection.getDatabase();
      const longLotNumber = 'A'.repeat(51); // 51 characters, exceeds limit

      // Act & Assert
      expect(() => {
        db.prepare(
          `
          INSERT INTO order_item_lot_allocations (
            id, order_id, order_item_id, lot_batch_id, lot_number,
            allocated_quantity, manufacturing_date, reserved_at, reserved_by
          ) VALUES (
            'test-alloc-4', 'test-order', 'test-item', 'test-lot', ?,
            10, 1704067200, 1704067200, 'test-user'
          )
        `
        ).run(longLotNumber);
      }).toThrow(/order_lot_allocations_lot_number_length/);
    });

    it('should enforce expiry date after manufacturing date constraint', async () => {
      // Arrange
      const db = connection.getDatabase();

      // Act & Assert
      expect(() => {
        db.prepare(
          `
          INSERT INTO order_item_lot_allocations (
            id, order_id, order_item_id, lot_batch_id, lot_number,
            allocated_quantity, manufacturing_date, expiry_date, reserved_at, reserved_by
          ) VALUES (
            'test-alloc-5', 'test-order', 'test-item', 'test-lot', 'LOT001',
            10, 1704067200, 1703980800, 1704067200, 'test-user'
          )
        `
        ).run(); // expiry_date (1703980800) is before manufacturing_date (1704067200)
      }).toThrow(/order_lot_allocations_expiry_after_manufacturing/);
    });

    it('should allow valid lot allocation insertion', async () => {
      // Arrange
      const db = connection.getDatabase();

      // First create required parent records (simplified for test)
      // Note: In real scenario, foreign key constraints would require actual parent records

      // Act & Assert - This would work if we disable foreign key checks for testing
      db.exec('PRAGMA foreign_keys = OFF;');

      expect(() => {
        db.prepare(
          `
          INSERT INTO order_item_lot_allocations (
            id, order_id, order_item_id, lot_batch_id, lot_number,
            allocated_quantity, manufacturing_date, expiry_date, reserved_at, reserved_by
          ) VALUES (
            'test-alloc-valid', 'test-order', 'test-item', 'test-lot', 'LOT001',
            25, 1704067200, 1735689600, 1704067200, 'test-user'
          )
        `
        ).run();
      }).not.toThrow();

      // Verify the record was inserted
      const inserted = db
        .prepare(
          `
        SELECT * FROM order_item_lot_allocations WHERE id = 'test-alloc-valid'
      `
        )
        .get() as any;

      expect(inserted).toBeDefined();
      expect(inserted?.allocated_quantity).toBe(25);
      expect(inserted?.lot_number).toBe('LOT001');
    });
  });

  describe('Step 2.4: Migration Rollback Testing', () => {
    it('should rollback Migration 7 successfully', async () => {
      // Arrange
      await migration.migrate();
      const beforeRollback = await migration.getCurrentVersion();
      expect(beforeRollback).toBe(7);

      // Act
      const rollbackResults = await migration.rollback(6);
      const afterRollback = await migration.getCurrentVersion();

      // Assert
      expect(rollbackResults).toHaveLength(1);
      expect(rollbackResults[0]?.version).toBe(7);
      expect(rollbackResults[0]?.success).toBe(true);
      expect(afterRollback).toBe(6);

      // Verify table is dropped
      const db = connection.getDatabase();
      const tables = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type = 'table' AND name = 'order_item_lot_allocations'
      `
        )
        .all();

      expect(tables).toHaveLength(0);
      console.log('Migration 7 rollback completed successfully');
    });
  });
});
