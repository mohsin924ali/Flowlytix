/**
 * Business Schema Integration Tests
 * Comprehensive testing for the enhanced database foundation
 * Phase 1: Business Entity Schema Validation
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { DatabaseConnection } from '../connection';
import { DatabaseMigration } from '../migration';
import {
  BUSINESS_SCHEMAS,
  BUSINESS_INDEXES,
  BUSINESS_VALIDATION_QUERIES,
  BUSINESS_PERFORMANCE_OPTIMIZATIONS,
} from '../business-schema';

describe('Business Schema Integration Tests', () => {
  let connection: DatabaseConnection;
  let migration: DatabaseMigration;

  beforeEach(async () => {
    // Reset singleton for testing
    DatabaseConnection.resetInstance();

    // Use in-memory database for testing
    connection = DatabaseConnection.getInstance({
      filename: ':memory:',
      inMemory: true,
    });
    await connection.connect();
    migration = new DatabaseMigration(connection);

    // Run migrations to set up complete schema
    await migration.migrate();
  });

  afterEach(async () => {
    await connection.close();
    DatabaseConnection.resetInstance();
  });

  describe('Schema Creation and Structure', () => {
    it('should create all business tables successfully', async () => {
      const db = connection.getDatabase();

      const tables = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `
        )
        .all() as { name: string }[];

      const tableNames = tables.map((t) => t.name);

      // Verify all business tables are created
      expect(tableNames).toContain('agencies');
      expect(tableNames).toContain('areas');
      expect(tableNames).toContain('workers');
      expect(tableNames).toContain('customers');
      expect(tableNames).toContain('products');
      expect(tableNames).toContain('inventory');
      expect(tableNames).toContain('orders');
      expect(tableNames).toContain('order_items');

      // Verify core tables still exist
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('user_sessions');
      expect(tableNames).toContain('audit_log');
      expect(tableNames).toContain('schema_version');
    });

    it('should create all business indexes successfully', async () => {
      const db = connection.getDatabase();

      const indexes = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name LIKE 'idx_%'
        ORDER BY name
      `
        )
        .all() as { name: string }[];

      const indexNames = indexes.map((i) => i.name);

      // Sample key indexes that should exist
      expect(indexNames).toContain('idx_agencies_name');
      expect(indexNames).toContain('idx_customers_agency_code');
      expect(indexNames).toContain('idx_orders_agency_number');
      expect(indexNames).toContain('idx_inventory_agency_product');
      expect(indexNames).toContain('idx_order_items_order_id');

      // Performance critical indexes
      expect(indexNames).toContain('idx_orders_pending');
      expect(indexNames).toContain('idx_inventory_low_stock');
      expect(indexNames).toContain('idx_customers_credit');
    });

    it('should have proper foreign key relationships', async () => {
      const db = connection.getDatabase();

      // Test foreign key constraints are properly defined
      const foreignKeys = db
        .prepare(
          `
        SELECT 
          m.name as table_name,
          p."from" as from_column,
          p."table" as referenced_table,
          p."to" as referenced_column
        FROM sqlite_master m
        JOIN pragma_foreign_key_list(m.name) p
        WHERE m.type = 'table'
        ORDER BY m.name, p.id
      `
        )
        .all() as Array<{
        table_name: string;
        from_column: string;
        referenced_table: string;
        referenced_column: string;
      }>;

      // Verify key relationships
      const relationships = foreignKeys.reduce(
        (acc, fk) => {
          const key = `${fk.table_name}.${fk.from_column}`;
          acc[key] = `${fk.referenced_table}.${fk.referenced_column}`;
          return acc;
        },
        {} as Record<string, string>
      );

      expect(relationships['areas.agency_id']).toBe('agencies.id');
      expect(relationships['workers.agency_id']).toBe('agencies.id');
      expect(relationships['customers.agency_id']).toBe('agencies.id');
      expect(relationships['products.agency_id']).toBe('agencies.id');
      expect(relationships['inventory.product_id']).toBe('products.id');
      expect(relationships['orders.customer_id']).toBe('customers.id');
      expect(relationships['order_items.order_id']).toBe('orders.id');
    });
  });

  describe('Business Entity CRUD Operations', () => {
    it('should handle complete agency lifecycle', async () => {
      const db = connection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create agency
      const agencyId = 'agency-001';
      db.prepare(
        `
        INSERT INTO agencies (id, name, database_path, contact_person, phone, email, address, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        agencyId,
        'Test Agency',
        'test-agency.db',
        'John Doe',
        '+1234567890',
        'john@test.com',
        '123 Test St',
        now,
        now
      );

      // Verify agency creation
      const agency = db.prepare('SELECT * FROM agencies WHERE id = ?').get(agencyId) as any;
      expect(agency).toBeDefined();
      expect(agency.name).toBe('Test Agency');
      expect(agency.status).toBe('active'); // default value

      // Update agency
      db.prepare(
        `
        UPDATE agencies SET name = ?, updated_at = ? WHERE id = ?
      `
      ).run('Updated Test Agency', now + 1, agencyId);

      const updatedAgency = db.prepare('SELECT * FROM agencies WHERE id = ?').get(agencyId) as any;
      expect(updatedAgency.name).toBe('Updated Test Agency');
      expect(updatedAgency.updated_at).toBe(now + 1);
    });

    it('should handle complete customer-area-worker hierarchy', async () => {
      const db = connection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create test data hierarchy
      const agencyId = 'agency-001';
      const areaId = 'area-001';
      const workerId = 'worker-001';
      const customerId = 'customer-001';

      // Agency
      db.prepare(
        `
        INSERT INTO agencies (id, name, database_path, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(agencyId, 'Test Agency', 'test.db', now, now);

      // Area
      db.prepare(
        `
        INSERT INTO areas (id, agency_id, area_code, area_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run(areaId, agencyId, 'A001', 'Downtown', now, now);

      // Worker
      db.prepare(
        `
        INSERT INTO workers (id, agency_id, worker_code, worker_name, assigned_area_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      ).run(workerId, agencyId, 'W001', 'John Worker', areaId, now, now);

      // Customer
      db.prepare(
        `
        INSERT INTO customers (id, agency_id, customer_code, customer_name, area_id, assigned_worker_id, credit_limit, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(customerId, agencyId, 'C001', 'Test Customer', areaId, workerId, 5000.0, now, now);

      // Verify relationships
      const customerWithRelations = db
        .prepare(
          `
        SELECT 
          c.customer_name,
          a.area_name,
          w.worker_name,
          ag.name as agency_name
        FROM customers c
        JOIN areas a ON c.area_id = a.id
        JOIN workers w ON c.assigned_worker_id = w.id
        JOIN agencies ag ON c.agency_id = ag.id
        WHERE c.id = ?
      `
        )
        .get(customerId) as any;

      expect(customerWithRelations).toBeDefined();
      expect(customerWithRelations.customer_name).toBe('Test Customer');
      expect(customerWithRelations.area_name).toBe('Downtown');
      expect(customerWithRelations.worker_name).toBe('John Worker');
      expect(customerWithRelations.agency_name).toBe('Test Agency');
    });

    it('should handle product-inventory relationship', async () => {
      const db = connection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create test data
      const agencyId = 'agency-001';
      const productId = 'product-001';

      // Agency
      db.prepare(
        `
        INSERT INTO agencies (id, name, database_path, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(agencyId, 'Test Agency', 'test.db', now, now);

      // Product
      db.prepare(
        `
        INSERT INTO products (id, agency_id, product_code, product_name, unit_price, box_size, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(productId, agencyId, 'P001', 'Test Product', 10.5, 12, now, now);

      // Inventory
      db.prepare(
        `
        INSERT INTO inventory (id, agency_id, product_id, available_boxes, available_loose, minimum_stock_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run('inventory-001', agencyId, productId, 100, 5, 10, now, now);

      // Verify product-inventory relationship
      const productInventory = db
        .prepare(
          `
        SELECT 
          p.product_name,
          p.unit_price,
          p.box_size,
          i.available_boxes,
          i.available_loose,
          (i.available_boxes * p.box_size + i.available_loose) as total_units
        FROM products p
        JOIN inventory i ON p.id = i.product_id
        WHERE p.id = ?
      `
        )
        .get(productId) as any;

      expect(productInventory).toBeDefined();
      expect(productInventory.total_units).toBe(100 * 12 + 5); // 1205 units
      expect(productInventory.unit_price).toBe(10.5);
    });

    it('should handle complete order lifecycle', async () => {
      const db = connection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Setup test data
      const agencyId = 'agency-001';
      const customerId = 'customer-001';
      const productId = 'product-001';
      const orderId = 'order-001';
      const orderItemId = 'item-001';

      // Create dependencies
      db.prepare(
        `
        INSERT INTO agencies (id, name, database_path, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(agencyId, 'Test Agency', 'test.db', now, now);

      db.prepare(
        `
        INSERT INTO customers (id, agency_id, customer_code, customer_name, credit_limit, current_balance, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(customerId, agencyId, 'C001', 'Test Customer', 5000.0, 1000.0, now, now);

      db.prepare(
        `
        INSERT INTO products (id, agency_id, product_code, product_name, unit_price, box_size, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(productId, agencyId, 'P001', 'Test Product', 10.5, 12, now, now);

      // Create order
      db.prepare(
        `
        INSERT INTO orders (
          id, agency_id, order_number, order_date, customer_id, customer_code, customer_name, 
          customer_credit_limit, customer_balance, area_code, area_name, worker_name,
          subtotal_amount, tax_amount, total_amount, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        orderId,
        agencyId,
        'ORD-001',
        now,
        customerId,
        'C001',
        'Test Customer',
        5000.0,
        1000.0,
        'A001',
        'Downtown',
        'John Worker',
        100.0,
        8.0,
        108.0,
        now,
        now
      );

      // Create order item
      db.prepare(
        `
        INSERT INTO order_items (
          id, order_id, product_id, product_code, product_name, unit_price, box_size,
          quantity_boxes, quantity_loose, unit_total, tax_rate, tax_amount, item_total,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(orderItemId, orderId, productId, 'P001', 'Test Product', 10.5, 12, 8, 4, 100.0, 8.0, 8.0, 108.0, now, now);

      // Verify complete order
      const orderDetails = db
        .prepare(
          `
        SELECT 
          o.order_number,
          o.customer_name,
          o.total_amount,
          oi.product_name,
          oi.quantity_boxes,
          oi.quantity_loose,
          (oi.quantity_boxes * oi.box_size + oi.quantity_loose) as total_units,
          oi.item_total
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.id = ?
      `
        )
        .get(orderId) as any;

      expect(orderDetails).toBeDefined();
      expect(orderDetails.order_number).toBe('ORD-001');
      expect(orderDetails.total_amount).toBe(108.0);
      expect(orderDetails.total_units).toBe(8 * 12 + 4); // 100 units
    });
  });

  describe('Business Rule Constraints', () => {
    it('should enforce unique constraints', async () => {
      const db = connection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create agency
      const agencyId = 'agency-001';
      db.prepare(
        `
        INSERT INTO agencies (id, name, database_path, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(agencyId, 'Test Agency', 'test.db', now, now);

      // Try to create duplicate agency name - should fail
      expect(() => {
        db.prepare(
          `
          INSERT INTO agencies (id, name, database_path, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `
        ).run('agency-002', 'Test Agency', 'test2.db', now, now);
      }).toThrow();

      // Create customer
      const customerId = 'customer-001';
      db.prepare(
        `
        INSERT INTO customers (id, agency_id, customer_code, customer_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run(customerId, agencyId, 'C001', 'Test Customer', now, now);

      // Try to create duplicate customer code in same agency - should fail
      expect(() => {
        db.prepare(
          `
          INSERT INTO customers (id, agency_id, customer_code, customer_name, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
        ).run('customer-002', agencyId, 'C001', 'Another Customer', now, now);
      }).toThrow();
    });

    it('should enforce check constraints', async () => {
      const db = connection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create agency
      const agencyId = 'agency-001';
      db.prepare(
        `
        INSERT INTO agencies (id, name, database_path, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(agencyId, 'Test Agency', 'test.db', now, now);

      // Try invalid status - should fail
      expect(() => {
        db.prepare(
          `
          INSERT INTO customers (id, agency_id, customer_code, customer_name, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
        ).run('customer-001', agencyId, 'C001', 'Test Customer', 'invalid_status', now, now);
      }).toThrow();

      // Try negative credit limit - should fail
      expect(() => {
        db.prepare(
          `
          INSERT INTO customers (id, agency_id, customer_code, customer_name, credit_limit, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
        ).run('customer-001', agencyId, 'C001', 'Test Customer', -100.0, now, now);
      }).toThrow();

      // Try negative inventory - should fail
      const productId = 'product-001';
      db.prepare(
        `
        INSERT INTO products (id, agency_id, product_code, product_name, unit_price, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      ).run(productId, agencyId, 'P001', 'Test Product', 10.5, now, now);

      expect(() => {
        db.prepare(
          `
          INSERT INTO inventory (id, agency_id, product_id, available_boxes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
        ).run('inventory-001', agencyId, productId, -10, now, now);
      }).toThrow();
    });

    it('should enforce business validation rules', async () => {
      // Run all business validation queries
      const results = await migration.validateSchema();
      expect(results).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    it('should apply performance optimizations successfully', async () => {
      const db = connection.getDatabase();

      // Test that ANALYZE commands work
      expect(() => {
        for (const optimization of BUSINESS_PERFORMANCE_OPTIMIZATIONS) {
          if (optimization.trim()) {
            db.exec(optimization);
          }
        }
      }).not.toThrow();
    });

    it('should have efficient query execution plans', async () => {
      const db = connection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create test data for performance testing
      const agencyId = 'agency-001';
      db.prepare(
        `
        INSERT INTO agencies (id, name, database_path, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(agencyId, 'Performance Test Agency', 'perf.db', now, now);

      // Test key queries use indexes
      const customerQuery = `
        EXPLAIN QUERY PLAN 
        SELECT * FROM customers 
        WHERE agency_id = ? AND status = 'active'
      `;

      const plan = db.prepare(customerQuery).all(agencyId) as Array<{
        detail: string;
      }>;

      // Should use index for agency_id and status
      const planText = plan.map((p) => p.detail).join(' ');
      expect(planText.toLowerCase()).toContain('index');
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should maintain referential integrity', async () => {
      const db = connection.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Create complete hierarchy
      const agencyId = 'agency-001';
      const customerId = 'customer-001';
      const orderId = 'order-001';

      db.prepare(
        `
        INSERT INTO agencies (id, name, database_path, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(agencyId, 'Test Agency', 'test.db', now, now);

      db.prepare(
        `
        INSERT INTO customers (id, agency_id, customer_code, customer_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run(customerId, agencyId, 'C001', 'Test Customer', now, now);

      db.prepare(
        `
        INSERT INTO orders (
          id, agency_id, order_number, order_date, customer_id, customer_code, customer_name,
          customer_credit_limit, customer_balance, area_code, area_name, worker_name,
          total_amount, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        orderId,
        agencyId,
        'ORD-001',
        now,
        customerId,
        'C001',
        'Test Customer',
        5000.0,
        0.0,
        'A001',
        'Downtown',
        'John Worker',
        100.0,
        now,
        now
      );

      // Try to delete customer with existing orders - should fail (RESTRICT)
      expect(() => {
        db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
      }).toThrow();

      // Delete order first, then customer should work
      db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
      expect(() => {
        db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
      }).not.toThrow();
    });

    it('should validate business rules through validation queries', async () => {
      const db = connection.getDatabase();

      // Run each business validation query
      for (const query of BUSINESS_VALIDATION_QUERIES) {
        const result = db.prepare(query).all() as Array<{
          check_name: string;
          violations: number;
        }>;

        for (const row of result) {
          expect(row.violations).toBe(0);
        }
      }
    });
  });

  describe('Migration Integration', () => {
    it('should have correct migration version after business schema', async () => {
      const currentVersion = await migration.getCurrentVersion();

      // Should be at version 6 after all migrations
      expect(currentVersion).toBe(6);
    });

    it('should allow schema rollback', async () => {
      // Test rollback to version 3 (before business schema)
      const rollbackResults = await migration.rollback(3);

      expect(rollbackResults.length).toBeGreaterThan(0);
      expect(rollbackResults.every((r) => r.success)).toBe(true);

      const currentVersion = await migration.getCurrentVersion();
      expect(currentVersion).toBe(3);

      // Verify business tables are gone
      const db = connection.getDatabase();
      const tables = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('agencies', 'customers', 'orders')
      `
        )
        .all();

      expect(tables).toHaveLength(0);
    });

    it('should track migration history correctly', async () => {
      const status = await migration.getStatus();

      expect(status.currentVersion).toBe(6);
      expect(status.latestVersion).toBe(6);
      expect(status.pendingMigrations).toBe(0);
      expect(status.appliedMigrations.length).toBe(6);
    });
  });
});
