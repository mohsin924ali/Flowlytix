/**
 * Order Repository Implementation Tests - Step 3: Search and Query Operations
 *
 * Tests for SqliteOrderRepository search and query functionality including:
 * - search() - Complex search with criteria, sorting, pagination
 * - findByCustomerId() - Customer's order history
 * - findByWorkerId() - Worker's orders with date range
 * - findByAreaId() - Area orders with date range
 * - findPendingOrders() - Orders pending processing
 * - findOverdueOrders() - Overdue orders detection
 * - findOrdersRequiringFulfillment() - Orders needing fulfillment
 *
 * @domain Order Management
 * @pattern Test-Driven Development
 * @architecture Hexagonal Architecture Testing
 * @version 1.0.0 - Step 3 Search Operations
 */

import {
  SqliteOrderRepository,
  createOrderRepository,
  OrderNotFoundError,
  OrderAlreadyExistsError,
} from '../order.repository';
import { DatabaseConnection, createDatabaseConnection } from '../../database/connection';
import { createMigrationManager } from '../../database/migration';
import {
  OrderRepositoryError,
  type OrderSearchCriteria,
  type OrderSortOptions,
  type PaginationOptions,
  type PaginatedOrderResult,
} from '../../../domain/repositories/order.repository';
import {
  Order,
  OrderStatus,
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  PaymentMethod,
  OrderItem,
  OrderItemStatus,
} from '../../../domain/entities/order';
import { Money } from '../../../domain/value-objects/money';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('SqliteOrderRepository - Step 3: Search and Query Operations', () => {
  let connection: DatabaseConnection;
  let repository: SqliteOrderRepository;
  const testDbPath = join(__dirname, 'test-order-step3.db');

  // Test data constants
  const testAgencyId = 'test-agency-001';
  const testCustomerId1 = 'customer-001';
  const testCustomerId2 = 'customer-002';
  const testWorkerId1 = 'worker-001';
  const testWorkerId2 = 'worker-002';
  const testAreaId1 = 'area-001';
  const testAreaId2 = 'area-002';
  const testProductId = 'product-001';

  beforeAll(async () => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

    // Create test database connection with proper configuration
    connection = createDatabaseConnection({
      filename: testDbPath,
      inMemory: false,
      readonly: false,
      fileMustExist: false,
      timeout: 5000,
      verbose: false,
    });

    await connection.connect();

    // Disable foreign key constraints for testing
    const db = connection.getDatabase();
    db.pragma('foreign_keys = OFF');

    // Run database migrations to create tables
    const migrationManager = createMigrationManager(connection);
    await migrationManager.migrate();

    // Create repository
    repository = createOrderRepository(connection) as SqliteOrderRepository;
  });

  afterAll(async () => {
    if (connection) {
      await connection.close();
    }
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    const db = connection.getDatabase();
    db.exec('DELETE FROM order_items');
    db.exec('DELETE FROM orders');
  });

  // Helper function to create test order
  const createTestOrder = (overrides: any = {}): Order => {
    const baseOrder = {
      orderNumber: overrides.orderNumber || 'ORD-2024-001',
      orderDate: overrides.orderDate || new Date('2024-01-15'),
      deliveryDate: overrides.deliveryDate || null,
      customerId: overrides.customerId || testCustomerId1,
      customerCode: overrides.customerCode || 'CUST001',
      customerName: overrides.customerName || 'Test Customer 1',
      customerCreditLimit: overrides.customerCreditLimit || Money.fromDecimal(50000, 'USD'),
      customerBalance: overrides.customerBalance || Money.fromDecimal(500, 'USD'),
      areaId: overrides.areaId || testAreaId1,
      areaCode: overrides.areaCode || 'AREA001',
      areaName: overrides.areaName || 'Test Area 1',
      workerId: overrides.workerId || testWorkerId1,
      workerName: overrides.workerName || 'Test Worker 1',
      subtotalAmount: overrides.subtotalAmount || Money.fromDecimal(100, 'USD'),
      discountPercentage: overrides.discountPercentage || 0.0,
      discountAmount: overrides.discountAmount || Money.fromDecimal(0, 'USD'),
      taxAmount: overrides.taxAmount || Money.fromDecimal(10, 'USD'),
      totalAmount: overrides.totalAmount || Money.fromDecimal(110, 'USD'),
      paymentMethod: overrides.paymentMethod || PaymentMethod.CASH,
      creditDays: overrides.creditDays || 0,
      status: overrides.status || OrderStatus.PENDING,
      fulfillmentStatus: overrides.fulfillmentStatus || OrderFulfillmentStatus.PENDING,
      paymentStatus: overrides.paymentStatus || OrderPaymentStatus.PENDING,
      customerNotes: overrides.customerNotes || '',
      internalNotes: overrides.internalNotes || '',
      createdOffline: overrides.createdOffline || false,
      agencyId: testAgencyId,
      items: overrides.items || [
        {
          productId: testProductId,
          productCode: 'PROD001',
          productName: 'Test Product',
          unitPrice: Money.fromDecimal(10.0, 'USD'),
          boxSize: 10,
          quantityBoxes: 1,
          quantityLoose: 0,
          totalUnits: 10,
          unitTotal: Money.fromDecimal(100.0, 'USD'),
          discountPercentage: 0.0,
          discountAmount: Money.fromDecimal(0.0, 'USD'),
          taxRate: 10.0,
          taxAmount: Money.fromDecimal(10.0, 'USD'),
          itemTotal: Money.fromDecimal(110.0, 'USD'),
          status: OrderItemStatus.PENDING,
        },
      ],
      createdBy: 'test-user',
    };

    return Order.create(baseOrder);
  };

  describe('search() - Complex Search Operations', () => {
    beforeEach(async () => {
      // Create test orders for search testing
      const orders = [
        createTestOrder({
          orderNumber: 'ORD-2024-001',
          customerId: testCustomerId1,
          customerName: 'Alpha Customer',
          status: OrderStatus.PENDING,
          orderDate: new Date('2024-01-15'),
          totalAmount: 100.0,
        }),
        createTestOrder({
          orderNumber: 'ORD-2024-002',
          customerId: testCustomerId2,
          customerName: 'Beta Customer',
          status: OrderStatus.CONFIRMED,
          orderDate: new Date('2024-01-20'),
          totalAmount: 200.0,
        }),
        createTestOrder({
          orderNumber: 'ORD-2024-003',
          customerId: testCustomerId1,
          customerName: 'Alpha Customer',
          status: OrderStatus.DELIVERED,
          orderDate: new Date('2024-01-25'),
          totalAmount: 300.0,
        }),
      ];

      for (const order of orders) {
        await repository.save(order);
      }
    });

    describe('Basic Search Functionality', () => {
      it('should search with empty criteria and return all orders', async () => {
        const criteria: OrderSearchCriteria = { agencyId: testAgencyId };

        const result = await repository.search(criteria);

        expect(result).toEqual({
          orders: expect.any(Array),
          total: 3,
          page: 1,
          limit: 50,
          totalPages: 1,
        });
        expect(result.orders).toHaveLength(3);
      });

      it('should search by customer ID', async () => {
        const criteria: OrderSearchCriteria = {
          agencyId: testAgencyId,
          customerId: testCustomerId1,
        };

        const result = await repository.search(criteria);

        expect(result.total).toBe(2);
        expect(result.orders).toHaveLength(2);
        expect(result.orders.every((order) => order.customerId === testCustomerId1)).toBe(true);
      });

      it('should search by order status', async () => {
        const criteria: OrderSearchCriteria = {
          agencyId: testAgencyId,
          status: [OrderStatus.PENDING],
        };

        const result = await repository.search(criteria);

        expect(result.total).toBe(1);
        expect(result.orders[0]?.status).toBe(OrderStatus.PENDING);
      });

      it('should search by multiple statuses', async () => {
        const criteria: OrderSearchCriteria = {
          agencyId: testAgencyId,
          status: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
        };

        const result = await repository.search(criteria);

        expect(result.total).toBe(2);
        expect(
          result.orders.every((order) => [OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status))
        ).toBe(true);
      });

      it('should search by date range', async () => {
        const criteria: OrderSearchCriteria = {
          agencyId: testAgencyId,
          orderDateFrom: new Date('2024-01-18'),
          orderDateTo: new Date('2024-01-22'),
        };

        const result = await repository.search(criteria);

        expect(result.total).toBe(1);
        expect(result.orders[0].orderNumber).toBe('ORD-2024-002');
      });

      it('should search with text search', async () => {
        const criteria: OrderSearchCriteria = {
          agencyId: testAgencyId,
          searchText: 'Alpha',
        };

        const result = await repository.search(criteria);

        expect(result.total).toBe(2);
        expect(result.orders.every((order) => order.customerName.includes('Alpha'))).toBe(true);
      });
    });

    describe('Pagination', () => {
      it('should apply pagination correctly', async () => {
        const criteria: OrderSearchCriteria = { agencyId: testAgencyId };
        const pagination: PaginationOptions = { page: 1, limit: 2 };

        const result = await repository.search(criteria, undefined, pagination);

        expect(result.total).toBe(3);
        expect(result.orders).toHaveLength(2);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(2);
        expect(result.totalPages).toBe(2);
      });

      it('should handle second page pagination', async () => {
        const criteria: OrderSearchCriteria = { agencyId: testAgencyId };
        const pagination: PaginationOptions = { page: 2, limit: 2 };

        const result = await repository.search(criteria, undefined, pagination);

        expect(result.total).toBe(3);
        expect(result.orders).toHaveLength(1);
        expect(result.page).toBe(2);
        expect(result.totalPages).toBe(2);
      });
    });

    describe('Sorting', () => {
      it('should sort by order date ascending', async () => {
        const criteria: OrderSearchCriteria = { agencyId: testAgencyId };
        const sort: OrderSortOptions = { field: 'orderDate', direction: 'ASC' };

        const result = await repository.search(criteria, sort);

        expect(result.orders[0].orderNumber).toBe('ORD-2024-001');
        expect(result.orders[1].orderNumber).toBe('ORD-2024-002');
        expect(result.orders[2].orderNumber).toBe('ORD-2024-003');
      });

      it('should sort by total amount descending', async () => {
        const criteria: OrderSearchCriteria = { agencyId: testAgencyId };
        const sort: OrderSortOptions = { field: 'totalAmount', direction: 'DESC' };

        const result = await repository.search(criteria, sort);

        expect(result.orders[0].totalAmount).toBe(300.0);
        expect(result.orders[1].totalAmount).toBe(200.0);
        expect(result.orders[2].totalAmount).toBe(100.0);
      });
    });

    describe('Error Handling', () => {
      it('should throw error for invalid agency ID', async () => {
        const criteria: OrderSearchCriteria = { agencyId: '' };

        await expect(repository.search(criteria)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.search(criteria)).rejects.toThrow(/Agency ID is required/);
      });

      it('should throw error for invalid pagination', async () => {
        const criteria: OrderSearchCriteria = { agencyId: testAgencyId };
        const pagination: PaginationOptions = { page: -1, limit: 10 };

        await expect(repository.search(criteria, undefined, pagination)).rejects.toThrow(OrderRepositoryError);
      });
    });
  });

  describe('findByCustomerId() - Customer Order History', () => {
    beforeEach(async () => {
      // Create orders for different customers
      const orders = [
        createTestOrder({
          orderNumber: 'ORD-CUST1-001',
          customerId: testCustomerId1,
          orderDate: new Date('2024-01-15'),
        }),
        createTestOrder({
          orderNumber: 'ORD-CUST1-002',
          customerId: testCustomerId1,
          orderDate: new Date('2024-01-20'),
        }),
        createTestOrder({
          orderNumber: 'ORD-CUST2-001',
          customerId: testCustomerId2,
          orderDate: new Date('2024-01-25'),
        }),
      ];

      for (const order of orders) {
        await repository.save(order);
      }
    });

    it('should find orders by customer ID successfully', async () => {
      const result = await repository.findByCustomerId(testCustomerId1, testAgencyId);

      expect(result).toHaveLength(2);
      expect(result.every((order) => order.customerId === testCustomerId1)).toBe(true);
      expect(result[0].orderDate.getTime()).toBeGreaterThanOrEqual(result[1].orderDate.getTime());
    });

    it('should apply limit correctly', async () => {
      const result = await repository.findByCustomerId(testCustomerId1, testAgencyId, 1);

      expect(result).toHaveLength(1);
      expect(result[0].customerId).toBe(testCustomerId1);
    });

    it('should return empty array for customer with no orders', async () => {
      const result = await repository.findByCustomerId('non-existent-customer', testAgencyId);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error for invalid customer ID', async () => {
      await expect(repository.findByCustomerId('', testAgencyId)).rejects.toThrow(OrderRepositoryError);
      await expect(repository.findByCustomerId('', testAgencyId)).rejects.toThrow(/Customer ID is required/);
    });

    it('should throw error for invalid agency ID', async () => {
      await expect(repository.findByCustomerId(testCustomerId1, '')).rejects.toThrow(OrderRepositoryError);
      await expect(repository.findByCustomerId(testCustomerId1, '')).rejects.toThrow(/Agency ID is required/);
    });
  });

  describe('findByWorkerId() - Worker Order History', () => {
    beforeEach(async () => {
      // Create orders for different workers
      const orders = [
        createTestOrder({
          orderNumber: 'ORD-WORK1-001',
          workerId: testWorkerId1,
          orderDate: new Date('2024-01-15'),
        }),
        createTestOrder({
          orderNumber: 'ORD-WORK1-002',
          workerId: testWorkerId1,
          orderDate: new Date('2024-01-20'),
        }),
        createTestOrder({
          orderNumber: 'ORD-WORK2-001',
          workerId: testWorkerId2,
          orderDate: new Date('2024-01-25'),
        }),
      ];

      for (const order of orders) {
        await repository.save(order);
      }
    });

    it('should find orders by worker ID successfully', async () => {
      const result = await repository.findByWorkerId(testWorkerId1, testAgencyId);

      expect(result).toHaveLength(2);
      expect(result.every((order) => order.workerId === testWorkerId1)).toBe(true);
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date('2024-01-18');
      const dateTo = new Date('2024-01-22');

      const result = await repository.findByWorkerId(testWorkerId1, testAgencyId, dateFrom, dateTo);

      expect(result).toHaveLength(1);
      expect(result[0].orderNumber).toBe('ORD-WORK1-002');
    });

    it('should return empty array for worker with no orders', async () => {
      const result = await repository.findByWorkerId('non-existent-worker', testAgencyId);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error for invalid worker ID', async () => {
      await expect(repository.findByWorkerId('', testAgencyId)).rejects.toThrow(OrderRepositoryError);
      await expect(repository.findByWorkerId('', testAgencyId)).rejects.toThrow(/Worker ID is required/);
    });
  });

  describe('findByAreaId() - Area Order History', () => {
    beforeEach(async () => {
      // Create orders for different areas
      const orders = [
        createTestOrder({
          orderNumber: 'ORD-AREA1-001',
          areaId: testAreaId1,
          orderDate: new Date('2024-01-15'),
        }),
        createTestOrder({
          orderNumber: 'ORD-AREA1-002',
          areaId: testAreaId1,
          orderDate: new Date('2024-01-20'),
        }),
        createTestOrder({
          orderNumber: 'ORD-AREA2-001',
          areaId: testAreaId2,
          orderDate: new Date('2024-01-25'),
        }),
      ];

      for (const order of orders) {
        await repository.save(order);
      }
    });

    it('should find orders by area ID successfully', async () => {
      const result = await repository.findByAreaId(testAreaId1, testAgencyId);

      expect(result).toHaveLength(2);
      expect(result.every((order) => order.areaId === testAreaId1)).toBe(true);
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date('2024-01-18');
      const dateTo = new Date('2024-01-22');

      const result = await repository.findByAreaId(testAreaId1, testAgencyId, dateFrom, dateTo);

      expect(result).toHaveLength(1);
      expect(result[0].orderNumber).toBe('ORD-AREA1-002');
    });

    it('should throw error for invalid area ID', async () => {
      await expect(repository.findByAreaId('', testAgencyId)).rejects.toThrow(OrderRepositoryError);
      await expect(repository.findByAreaId('', testAgencyId)).rejects.toThrow(/Area ID is required/);
    });
  });

  describe('findPendingOrders() - Pending Orders', () => {
    beforeEach(async () => {
      // Create orders with different statuses
      const orders = [
        createTestOrder({
          orderNumber: 'ORD-PENDING-001',
          status: OrderStatus.PENDING,
        }),
        createTestOrder({
          orderNumber: 'ORD-PENDING-002',
          status: OrderStatus.PENDING,
        }),
        createTestOrder({
          orderNumber: 'ORD-CONFIRMED-001',
          status: OrderStatus.CONFIRMED,
        }),
      ];

      for (const order of orders) {
        await repository.save(order);
      }
    });

    it('should find pending orders successfully', async () => {
      const result = await repository.findPendingOrders(testAgencyId);

      expect(result).toHaveLength(2);
      expect(result.every((order) => order.status === OrderStatus.PENDING)).toBe(true);
    });

    it('should apply limit correctly', async () => {
      const result = await repository.findPendingOrders(testAgencyId, 1);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(OrderStatus.PENDING);
    });

    it('should return empty array when no pending orders', async () => {
      // Delete all pending orders
      const db = connection.getDatabase();
      db.exec("DELETE FROM orders WHERE status = 'pending'");

      const result = await repository.findPendingOrders(testAgencyId);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error for invalid agency ID', async () => {
      await expect(repository.findPendingOrders('')).rejects.toThrow(OrderRepositoryError);
      await expect(repository.findPendingOrders('')).rejects.toThrow(/Agency ID is required/);
    });
  });

  describe('findOverdueOrders() - Overdue Detection', () => {
    beforeEach(async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      // Create orders with different due dates
      const orders = [
        createTestOrder({
          orderNumber: 'ORD-OVERDUE-001',
          dueDate: yesterday,
          status: OrderStatus.CONFIRMED,
        }),
        createTestOrder({
          orderNumber: 'ORD-CURRENT-001',
          dueDate: tomorrow,
          status: OrderStatus.CONFIRMED,
        }),
        createTestOrder({
          orderNumber: 'ORD-NO-DUE-001',
          dueDate: null,
          status: OrderStatus.CONFIRMED,
        }),
      ];

      for (const order of orders) {
        await repository.save(order);
      }
    });

    it('should find overdue orders successfully', async () => {
      const result = await repository.findOverdueOrders(testAgencyId);

      expect(result).toHaveLength(1);
      expect(result[0].orderNumber).toBe('ORD-OVERDUE-001');
    });

    it('should use custom as-of date', async () => {
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      const result = await repository.findOverdueOrders(testAgencyId, futureDate);

      expect(result).toHaveLength(2); // Both orders with due dates will be overdue
    });

    it('should return empty array when no overdue orders', async () => {
      const pastDate = new Date('2023-01-01');

      const result = await repository.findOverdueOrders(testAgencyId, pastDate);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error for invalid agency ID', async () => {
      await expect(repository.findOverdueOrders('')).rejects.toThrow(OrderRepositoryError);
      await expect(repository.findOverdueOrders('')).rejects.toThrow(/Agency ID is required/);
    });
  });

  describe('findOrdersRequiringFulfillment() - Fulfillment Queue', () => {
    beforeEach(async () => {
      // Create orders with different fulfillment statuses
      const orders = [
        createTestOrder({
          orderNumber: 'ORD-FULFILL-001',
          status: OrderStatus.CONFIRMED,
          fulfillmentStatus: OrderFulfillmentStatus.PENDING,
        }),
        createTestOrder({
          orderNumber: 'ORD-FULFILL-002',
          status: OrderStatus.CONFIRMED,
          fulfillmentStatus: OrderFulfillmentStatus.PARTIAL,
        }),
        createTestOrder({
          orderNumber: 'ORD-COMPLETED-001',
          status: OrderStatus.DELIVERED,
          fulfillmentStatus: OrderFulfillmentStatus.COMPLETED,
        }),
      ];

      for (const order of orders) {
        await repository.save(order);
      }
    });

    it('should find orders requiring fulfillment successfully', async () => {
      const result = await repository.findOrdersRequiringFulfillment(testAgencyId);

      expect(result).toHaveLength(2);
      expect(
        result.every((order) =>
          [OrderFulfillmentStatus.PENDING, OrderFulfillmentStatus.PARTIAL].includes(order.fulfillmentStatus)
        )
      ).toBe(true);
    });

    it('should apply limit correctly', async () => {
      const result = await repository.findOrdersRequiringFulfillment(testAgencyId, 1);

      expect(result).toHaveLength(1);
      expect([OrderFulfillmentStatus.PENDING, OrderFulfillmentStatus.PARTIAL]).toContain(result[0].fulfillmentStatus);
    });

    it('should return empty array when no orders require fulfillment', async () => {
      // Update all orders to completed
      const db = connection.getDatabase();
      db.exec("UPDATE orders SET fulfillment_status = 'completed'");

      const result = await repository.findOrdersRequiringFulfillment(testAgencyId);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error for invalid agency ID', async () => {
      await expect(repository.findOrdersRequiringFulfillment('')).rejects.toThrow(OrderRepositoryError);
      await expect(repository.findOrdersRequiringFulfillment('')).rejects.toThrow(/Agency ID is required/);
    });
  });

  describe('Integration Tests', () => {
    it('should maintain data integrity across search operations', async () => {
      // Create a complex test scenario
      const order = createTestOrder({
        orderNumber: 'ORD-INTEGRATION-001',
        customerId: testCustomerId1,
        workerId: testWorkerId1,
        areaId: testAreaId1,
        status: OrderStatus.PENDING,
        fulfillmentStatus: OrderFulfillmentStatus.PENDING,
      });

      await repository.save(order);

      // Test multiple search operations
      const searchResult = await repository.search({ agencyId: testAgencyId });
      const customerOrders = await repository.findByCustomerId(testCustomerId1, testAgencyId);
      const workerOrders = await repository.findByWorkerId(testWorkerId1, testAgencyId);
      const pendingOrders = await repository.findPendingOrders(testAgencyId);
      const fulfillmentOrders = await repository.findOrdersRequiringFulfillment(testAgencyId);

      // All should find the same order
      expect(searchResult.orders).toHaveLength(1);
      expect(customerOrders).toHaveLength(1);
      expect(workerOrders).toHaveLength(1);
      expect(pendingOrders).toHaveLength(1);
      expect(fulfillmentOrders).toHaveLength(1);

      // All should return the same order instance data
      const orderIds = [
        searchResult.orders[0].id,
        customerOrders[0].id,
        workerOrders[0].id,
        pendingOrders[0].id,
        fulfillmentOrders[0].id,
      ];

      expect(orderIds.every((id) => id === order.id)).toBe(true);
    });

    it('should handle complex search scenarios efficiently', async () => {
      // Create multiple orders for performance testing
      const orders = Array.from({ length: 10 }, (_, i) =>
        createTestOrder({
          orderNumber: `ORD-PERF-${String(i + 1).padStart(3, '0')}`,
          customerId: i % 2 === 0 ? testCustomerId1 : testCustomerId2,
          orderDate: new Date(2024, 0, i + 1),
          totalAmount: (i + 1) * 100,
        })
      );

      for (const order of orders) {
        await repository.save(order);
      }

      // Test complex search
      const criteria: OrderSearchCriteria = {
        agencyId: testAgencyId,
        customerId: testCustomerId1,
        orderDateFrom: new Date('2024-01-05'),
        orderDateTo: new Date('2024-01-08'),
      };

      const sort: OrderSortOptions = { field: 'totalAmount', direction: 'DESC' };
      const pagination: PaginationOptions = { page: 1, limit: 2 };

      const result = await repository.search(criteria, sort, pagination);

      expect(result.total).toBe(4); // Customer 1 orders in date range
      expect(result.orders).toHaveLength(2); // Limited by pagination
      expect(result.orders[0].totalAmount).toBeGreaterThan(result.orders[1].totalAmount); // Sorted DESC
    });
  });

  // Helper function for creating test order items
  function createTestOrderItem(overrides: Partial<any> = {}): OrderItem {
    const unitPrice = Money.fromDecimal(10, 'USD');
    const quantity = 10;
    const discountPercentage = 0;
    const taxRate = 10;

    return {
      id: 'item-' + Math.random().toString(36).substring(2, 11),
      productId: testProductId,
      productCode: 'PROD-001',
      productName: 'Test Product',
      unitPrice,
      boxSize: 1,
      quantityBoxes: quantity,
      quantityLoose: 0,
      totalUnits: quantity,
      unitTotal: Money.fromDecimal(quantity * unitPrice.decimalAmount, 'USD'),
      discountPercentage,
      discountAmount: Money.fromDecimal(0, 'USD'),
      taxRate,
      taxAmount: Money.fromDecimal((quantity * unitPrice.decimalAmount * taxRate) / 100, 'USD'),
      itemTotal: Money.fromDecimal(quantity * unitPrice.decimalAmount * (1 + taxRate / 100), 'USD'),
      fulfilledBoxes: 0,
      fulfilledLoose: 0,
      fulfilledUnits: 0,
      status: OrderItemStatus.PENDING,
      ...overrides,
    };
  }
});
