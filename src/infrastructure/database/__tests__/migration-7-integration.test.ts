/**
 * Migration 7 Integration Test
 * Phase 2: Order Processing - Database Schema Updates
 *
 * Comprehensive integration test to verify Migration 7 (lot allocation persistence)
 * integrates properly with the existing migration system and works end-to-end
 *
 * @testType Integration
 * @phase Database Schema Updates
 * @step Final Integration Verification
 */

import { DatabaseConnection, DatabaseMigration, createMigrationManager, testDatabaseConfig } from '../index';

describe('Migration 7 Integration Verification', () => {
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

  describe('Full Migration Suite with Migration 7', () => {
    it('should execute all migrations including Migration 7 successfully', async () => {
      // Arrange
      const initialStatus = await migration.getStatus();
      console.log(
        `Initial: v${initialStatus.currentVersion}, Latest: v${initialStatus.latestVersion}, Pending: ${initialStatus.pendingMigrations}`
      );

      // Act
      const results = await migration.migrate();
      const finalStatus = await migration.getStatus();

      // Assert
      expect(results.length).toBe(7); // Should now have 7 migrations including our new one
      expect(finalStatus.currentVersion).toBe(7);
      expect(finalStatus.latestVersion).toBe(7);
      expect(finalStatus.pendingMigrations).toBe(0);

      // Verify Migration 7 specifically
      const migration7Result = results.find((r) => r.version === 7);
      expect(migration7Result).toBeDefined();
      expect(migration7Result!.success).toBe(true);
      expect(migration7Result!.error).toBeUndefined();

      console.log(`✅ Migration 7 executed successfully in ${migration7Result!.duration}ms`);
    });

    it('should create complete database schema including lot allocation table', async () => {
      // Arrange
      await migration.migrate();
      const db = connection.getDatabase();

      // Act
      const tables = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `
        )
        .all() as { name: string }[];

      // Assert - All expected tables including our new one
      const expectedTables = [
        'agencies',
        'areas',
        'audit_log',
        'customers',
        'inventory',
        'lot_batch_movements',
        'lot_batches',
        'order_item_lot_allocations', // ← Our new table
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

      console.log(`✅ All ${tables.length} expected tables created including order_item_lot_allocations`);
    });

    it('should create lot allocation table with correct structure and constraints', async () => {
      // Arrange
      await migration.migrate();
      const db = connection.getDatabase();

      // Act
      const tableInfo = db.prepare(`PRAGMA table_info(order_item_lot_allocations)`).all();
      const foreignKeys = db.prepare(`PRAGMA foreign_key_list(order_item_lot_allocations)`).all();
      const indexes = db.prepare(`PRAGMA index_list(order_item_lot_allocations)`).all();

      // Assert table structure
      expect(tableInfo).toHaveLength(13); // All expected columns
      const columnNames = tableInfo.map((col: any) => col.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('order_id');
      expect(columnNames).toContain('lot_batch_id');
      expect(columnNames).toContain('allocated_quantity');

      // Assert foreign key constraints
      expect(foreignKeys).toHaveLength(4); // 4 foreign key references
      const fkTables = foreignKeys.map((fk: any) => fk.table);
      expect(fkTables).toContain('orders');
      expect(fkTables).toContain('order_items');
      expect(fkTables).toContain('lot_batches');
      expect(fkTables).toContain('users');

      // Assert indexes
      expect(indexes.length).toBeGreaterThanOrEqual(11); // Should have all our performance indexes

      console.log(
        `✅ Table structure: ${columnNames.length} columns, ${foreignKeys.length} FKs, ${indexes.length} indexes`
      );
    });

    it('should create all audit triggers for lot allocation tracking', async () => {
      // Arrange
      await migration.migrate();
      const db = connection.getDatabase();

      // Act
      const allTriggers = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type = 'trigger'
        ORDER BY name
      `
        )
        .all() as { name: string }[];

      const lotAllocationTriggers = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type = 'trigger' AND tbl_name = 'order_item_lot_allocations'
      `
        )
        .all() as { name: string }[];

      // Assert
      const expectedLotTriggers = [
        'audit_order_lot_allocations_insert',
        'audit_order_lot_allocations_update',
        'audit_order_lot_allocations_delete',
      ];

      const lotTriggerNames = lotAllocationTriggers.map((t) => t.name);
      for (const expectedTrigger of expectedLotTriggers) {
        expect(lotTriggerNames).toContain(expectedTrigger);
      }

      // Should have all original triggers plus our 3 new ones
      expect(allTriggers.length).toBe(16); // 13 original + 3 new lot allocation triggers

      console.log(`✅ Created ${lotAllocationTriggers.length}/3 lot allocation audit triggers`);
    });

    it('should support rollback of Migration 7 cleanly', async () => {
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

      // Verify table and related objects are completely removed
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

      const indexes = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type = 'index' AND name LIKE '%order_lot_allocations%'
      `
        )
        .all();
      expect(indexes).toHaveLength(0);

      const triggers = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type = 'trigger' AND tbl_name = 'order_item_lot_allocations'
      `
        )
        .all();
      expect(triggers).toHaveLength(0);

      console.log('✅ Migration 7 rollback completed - all objects cleanly removed');
    });

    it('should maintain database integrity after lot allocation migration', async () => {
      // Arrange
      await migration.migrate();

      // Act
      const isValid = await migration.validateSchema();

      // Assert
      expect(isValid).toBe(true);

      console.log('✅ Database schema validation passed after Migration 7');
    });
  });

  describe('Business Integration Validation', () => {
    beforeEach(async () => {
      await migration.migrate();
    });

    it('should support insertion of valid lot allocation records', async () => {
      // Arrange
      const db = connection.getDatabase();

      // Disable foreign key checks for this test (parent records don't exist)
      db.exec('PRAGMA foreign_keys = OFF;');

      // Act
      const testAllocation = {
        id: 'test-alloc-001',
        order_id: 'test-order-001',
        order_item_id: 'test-item-001',
        lot_batch_id: 'test-lot-001',
        lot_number: 'LOT-20241201-001',
        batch_number: 'BATCH-A',
        allocated_quantity: 50,
        manufacturing_date: Math.floor(new Date('2024-01-01').getTime() / 1000),
        expiry_date: Math.floor(new Date('2024-12-31').getTime() / 1000),
        reserved_at: Math.floor(Date.now() / 1000),
        reserved_by: 'test-user-001',
      };

      expect(() => {
        db.prepare(
          `
          INSERT INTO order_item_lot_allocations (
            id, order_id, order_item_id, lot_batch_id, lot_number, batch_number,
            allocated_quantity, manufacturing_date, expiry_date, reserved_at, reserved_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          testAllocation.id,
          testAllocation.order_id,
          testAllocation.order_item_id,
          testAllocation.lot_batch_id,
          testAllocation.lot_number,
          testAllocation.batch_number,
          testAllocation.allocated_quantity,
          testAllocation.manufacturing_date,
          testAllocation.expiry_date,
          testAllocation.reserved_at,
          testAllocation.reserved_by
        );
      }).not.toThrow();

      // Verify record was inserted
      const inserted = db
        .prepare(
          `
        SELECT * FROM order_item_lot_allocations WHERE id = ?
      `
        )
        .get(testAllocation.id) as any;

      expect(inserted).toBeDefined();
      expect(inserted?.lot_number).toBe('LOT-20241201-001');
      expect(inserted?.allocated_quantity).toBe(50);

      console.log('✅ Successfully inserted test lot allocation record');
    });

    it('should enforce business rule constraints correctly', async () => {
      // Arrange
      const db = connection.getDatabase();
      db.exec('PRAGMA foreign_keys = OFF;');

      // Test: Negative allocated quantity should fail
      expect(() => {
        db.prepare(
          `
          INSERT INTO order_item_lot_allocations (
            id, order_id, order_item_id, lot_batch_id, lot_number,
            allocated_quantity, manufacturing_date, reserved_at, reserved_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          'test-negative',
          'order-1',
          'item-1',
          'lot-1',
          'LOT001',
          -5, // Negative quantity
          1704067200,
          1704067200,
          'user-1'
        );
      }).toThrow(/order_lot_allocations_allocated_quantity_positive/);

      // Test: Empty lot number should fail
      expect(() => {
        db.prepare(
          `
          INSERT INTO order_item_lot_allocations (
            id, order_id, order_item_id, lot_batch_id, lot_number,
            allocated_quantity, manufacturing_date, reserved_at, reserved_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          'test-empty-lot',
          'order-1',
          'item-1',
          'lot-1',
          '', // Empty lot number
          10,
          1704067200,
          1704067200,
          'user-1'
        );
      }).toThrow(/order_lot_allocations_lot_number_not_empty/);

      console.log('✅ Business rule constraints working correctly');
    });
  });
});
