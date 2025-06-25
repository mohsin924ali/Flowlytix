import Database from 'better-sqlite3';
import {
  LOT_BATCHES_TABLE_SCHEMA,
  LOT_BATCH_MOVEMENTS_TABLE_SCHEMA,
  BUSINESS_SCHEMAS,
  BUSINESS_INDEXES,
  BUSINESS_AUDIT_TRIGGERS,
} from '../business-schema';
import { USERS_TABLE_SCHEMA, AUDIT_LOG_TABLE_SCHEMA } from '../schema';

describe('Lot/Batch Database Schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Create core tables first
    db.exec(USERS_TABLE_SCHEMA);
    db.exec(AUDIT_LOG_TABLE_SCHEMA);

    // Create all business schemas
    BUSINESS_SCHEMAS.forEach((schema) => {
      db.exec(schema);
    });

    BUSINESS_INDEXES.forEach((index) => {
      db.exec(index);
    });

    BUSINESS_AUDIT_TRIGGERS.forEach((trigger) => {
      db.exec(trigger);
    });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Table Creation', () => {
    test('should create lot_batches table with correct structure', () => {
      const tableInfo = db.prepare('PRAGMA table_info(lot_batches)').all() as any[];
      const columnNames = tableInfo.map((col) => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('lot_number');
      expect(columnNames).toContain('product_id');
      expect(columnNames).toContain('agency_id');
      expect(columnNames).toContain('manufacturing_date');
      expect(columnNames).toContain('expiry_date');
      expect(columnNames).toContain('quantity');
      expect(columnNames).toContain('remaining_quantity');
      expect(columnNames).toContain('reserved_quantity');
      // Note: available_quantity is a generated column and may not appear in PRAGMA table_info
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('created_by');
      expect(columnNames).toContain('created_at');
    });

    test('should create lot_batch_movements table', () => {
      const tableInfo = db.prepare('PRAGMA table_info(lot_batch_movements)').all() as any[];
      const columnNames = tableInfo.map((col) => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('lot_batch_id');
      expect(columnNames).toContain('movement_type');
      expect(columnNames).toContain('quantity');
      expect(columnNames).toContain('created_by');
      expect(columnNames).toContain('created_at');
    });

    test('should have foreign key constraints', () => {
      const lotBatchesForeignKeys = db.prepare('PRAGMA foreign_key_list(lot_batches)').all() as any[];
      const movementsForeignKeys = db.prepare('PRAGMA foreign_key_list(lot_batch_movements)').all() as any[];

      expect(lotBatchesForeignKeys.length).toBeGreaterThan(0);
      expect(movementsForeignKeys.length).toBeGreaterThan(0);
    });
  });

  describe('Business Rules', () => {
    beforeEach(() => {
      db.prepare(
        `
        INSERT INTO users (id, email, password_hash, password_salt, password_algorithm, password_iterations, password_created_at, first_name, last_name, role, status, created_at, updated_at, created_by)
        VALUES ('user1', 'test@example.com', 'hash', 'salt', 'PBKDF2', 100000, 1000000, 'Test', 'User', 'admin', 'active', 1000000, 1000000, NULL)
      `
      ).run();

      db.prepare(
        `
        INSERT INTO agencies (id, name, database_path, created_at, updated_at, created_by)
        VALUES ('agency1', 'Test Agency', 'test-agency.db', 1000000, 1000000, 'user1')
      `
      ).run();

      db.prepare(
        `
        INSERT INTO products (id, agency_id, product_code, product_name, unit_price, created_at, updated_at, created_by)
        VALUES ('product1', 'agency1', 'PROD001', 'Test Product', 10.50, 1000000, 1000000, 'user1')
      `
      ).run();
    });

    test('should enforce lot_number constraints', () => {
      const now = Math.floor(Date.now() / 1000);

      // Should reject empty lot_number
      expect(() => {
        db.prepare(
          `
          INSERT INTO lot_batches (
            id, lot_number, product_id, agency_id, manufacturing_date, 
            quantity, remaining_quantity, created_by, created_at
          ) VALUES (
            'lot1', '', 'product1', 'agency1', ${now - 86400}, 
            100, 100, 'user1', ${now}
          )
        `
        ).run();
      }).toThrow();

      // Should accept valid lot_number
      expect(() => {
        db.prepare(
          `
          INSERT INTO lot_batches (
            id, lot_number, product_id, agency_id, manufacturing_date, 
            quantity, remaining_quantity, created_by, created_at
          ) VALUES (
            'lot2', 'LOT-2024/001', 'product1', 'agency1', ${now - 86400}, 
            100, 100, 'user1', ${now}
          )
        `
        ).run();
      }).not.toThrow();
    });

    test('should enforce status constraints', () => {
      const now = Math.floor(Date.now() / 1000);

      // Should reject invalid status
      expect(() => {
        db.prepare(
          `
          INSERT INTO lot_batches (
            id, lot_number, product_id, agency_id, manufacturing_date, 
            quantity, remaining_quantity, status, created_by, created_at
          ) VALUES (
            'lot1', 'LOT001', 'product1', 'agency1', ${now - 86400}, 
            100, 100, 'INVALID_STATUS', 'user1', ${now}
          )
        `
        ).run();
      }).toThrow();

      // Should accept valid status
      expect(() => {
        db.prepare(
          `
          INSERT INTO lot_batches (
            id, lot_number, product_id, agency_id, manufacturing_date, 
            quantity, remaining_quantity, status, created_by, created_at
          ) VALUES (
            'lot2', 'LOT002', 'product1', 'agency1', ${now - 86400}, 
            100, 100, 'ACTIVE', 'user1', ${now}
          )
        `
        ).run();
      }).not.toThrow();
    });

    test('should calculate available_quantity correctly', () => {
      const now = Math.floor(Date.now() / 1000);

      db.prepare(
        `
        INSERT INTO lot_batches (
          id, lot_number, product_id, agency_id, manufacturing_date, 
          quantity, remaining_quantity, reserved_quantity, created_by, created_at
        ) VALUES (
          'lot1', 'LOT001', 'product1', 'agency1', ${now - 86400}, 
          100, 100, 30, 'user1', ${now}
        )
      `
      ).run();

      const result = db.prepare("SELECT available_quantity FROM lot_batches WHERE id = 'lot1'").get() as any;
      expect(result.available_quantity).toBe(70); // 100 - 30
    });
  });

  describe('Indexes', () => {
    test('should have created lot/batch indexes', () => {
      const indexes = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type = 'index' 
        AND name LIKE 'idx_lot_%'
      `
        )
        .all() as any[];

      const indexNames = indexes.map((idx) => idx.name);
      expect(indexNames).toContain('idx_lot_batches_agency_id');
      expect(indexNames).toContain('idx_lot_batches_product_id');
      expect(indexNames).toContain('idx_lot_batches_status');
      expect(indexNames.length).toBeGreaterThan(5);
    });
  });

  describe('Audit Triggers', () => {
    beforeEach(() => {
      db.prepare(
        `
        INSERT INTO users (id, email, password_hash, password_salt, password_algorithm, password_iterations, password_created_at, first_name, last_name, role, status, created_at, updated_at, created_by)
        VALUES ('user1', 'test@example.com', 'hash', 'salt', 'PBKDF2', 100000, 1000000, 'Test', 'User', 'admin', 'active', 1000000, 1000000, NULL)
      `
      ).run();

      db.prepare(
        `
        INSERT INTO agencies (id, name, database_path, created_at, updated_at, created_by)
        VALUES ('agency1', 'Test Agency', 'test-agency.db', 1000000, 1000000, 'user1')
      `
      ).run();

      db.prepare(
        `
        INSERT INTO products (id, agency_id, product_code, product_name, unit_price, created_at, updated_at, created_by)
        VALUES ('product1', 'agency1', 'PROD001', 'Test Product', 10.50, 1000000, 1000000, 'user1')
      `
      ).run();
    });

    test('should create audit log entry for lot batch insert', () => {
      const now = Math.floor(Date.now() / 1000);

      db.prepare(
        `
        INSERT INTO lot_batches (
          id, lot_number, product_id, agency_id, manufacturing_date, 
          quantity, remaining_quantity, created_by, created_at
        ) VALUES (
          'lot1', 'LOT001', 'product1', 'agency1', ${now - 86400}, 
          100, 100, 'user1', ${now}
        )
      `
      ).run();

      const auditEntry = db
        .prepare(
          `
        SELECT * FROM audit_log 
        WHERE table_name = 'lot_batches' 
        AND record_id = 'lot1' 
        AND operation = 'INSERT'
      `
        )
        .get() as any;

      expect(auditEntry).toBeDefined();
      expect(auditEntry.changed_by).toBe('user1');

      const newValues = JSON.parse(auditEntry.new_values);
      expect(newValues.lot_number).toBe('LOT001');
      expect(newValues.product_id).toBe('product1');
    });
  });
});
