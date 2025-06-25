/**
 * Order Repository Implementation Tests - Step 2: Core CRUD Operations
 *
 * Tests for SqliteOrderRepository core CRUD functionality including:
 * - save() - Create new orders with validation
 * - update() - Update existing orders with validation
 * - findById() - Retrieve orders by ID with agency isolation
 * - findByOrderNumber() - Find orders by unique order number
 * - existsByOrderNumber() - Check order number existence
 * - deleteById() - Delete orders with validation
 * - getNextOrderNumber() - Generate next order number
 *
 * @domain Order Management
 * @pattern Test-Driven Development
 * @architecture Hexagonal Architecture Testing
 * @version 1.0.0 - Step 2 Core CRUD Operations
 */

import {
  SqliteOrderRepository,
  createOrderRepository,
  OrderNotFoundError,
  OrderAlreadyExistsError,
} from '../order.repository';
import { DatabaseConnection, createDatabaseConnection } from '../../database/connection';
import { createMigrationManager } from '../../database/migration';
import { OrderRepositoryError } from '../../../domain/repositories/order.repository';
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

describe('SqliteOrderRepository - Step 2: Core CRUD Operations', () => {
  let connection: DatabaseConnection;
  let repository: SqliteOrderRepository;
  let testDbPath: string;

  // Test data constants
  const testAgencyId = 'test-agency-001';
  const testUserId = 'test-user-001';
  const testCustomerId = 'customer-123';
  const testProductId = 'product-456';

  beforeEach(async () => {
    // Create test database
    testDbPath = join(__dirname, 'test-order-repo-step2.db');
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

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

    repository = createOrderRepository(connection) as SqliteOrderRepository;
  });

  afterEach(async () => {
    await connection.close();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('Core CRUD Operations - Step 2', () => {
    describe('save()', () => {
      it('should save new order successfully', async () => {
        const testOrder = createTestOrder();

        const result = await repository.save(testOrder);

        expect(result).toBe(testOrder);
        expect(result.id).toBeDefined();
        expect(result.orderNumber).toBe('ORD-2024-001');
        expect(result.agencyId).toBe(testAgencyId);
        expect(result.customerId).toBe(testCustomerId);
      });

      it('should save order with minimal required data', async () => {
        const minimalOrder = createMinimalTestOrder();

        const result = await repository.save(minimalOrder);

        expect(result).toBe(minimalOrder);
        expect(result.id).toBeDefined();
        expect(result.orderNumber).toBeDefined();
        expect(result.agencyId).toBe(testAgencyId);
      });

      it('should throw error for invalid order object', async () => {
        await expect(repository.save(null as any)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.save(undefined as any)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.save('invalid' as any)).rejects.toThrow(OrderRepositoryError);
      });

      it('should throw error for order missing required properties', async () => {
        const incompleteOrder = { orderNumber: 'ORD-001' } as any;
        await expect(repository.save(incompleteOrder)).rejects.toThrow(OrderRepositoryError);
      });

      it('should throw error for duplicate order number', async () => {
        const testOrder = createTestOrder();

        // Save first order
        await repository.save(testOrder);

        // Try to save another order with same order number
        const duplicateOrder = createTestOrder({ orderNumber: 'ORD-2024-001' });

        await expect(repository.save(duplicateOrder)).rejects.toThrow(OrderAlreadyExistsError);
      });

      it('should handle order with multiple items', async () => {
        const orderWithMultipleItems = createTestOrderWithMultipleItems();

        const result = await repository.save(orderWithMultipleItems);

        expect(result).toBe(orderWithMultipleItems);
        expect(result.items).toHaveLength(3);
      });

      it('should validate agency isolation', async () => {
        const orderAgencyA = createTestOrder({ agencyId: 'agency-a' });
        const orderAgencyB = createTestOrder({ agencyId: 'agency-b', orderNumber: 'ORD-2024-002' });

        await repository.save(orderAgencyA);
        await repository.save(orderAgencyB);

        // Should be able to save orders with same number in different agencies
        const anotherOrderAgencyB = createTestOrder({ agencyId: 'agency-b', orderNumber: 'ORD-2024-001' });

        await expect(async () => {
          await repository.save(anotherOrderAgencyB);
        }).not.toThrow();
      });
    });

    describe('update()', () => {
      let existingOrder: Order;

      beforeEach(async () => {
        existingOrder = createTestOrder();
        await repository.save(existingOrder);
      });

      it('should update existing order successfully', async () => {
        // Update order with new status
        const updatedOrder = existingOrder.confirm(testUserId);

        const result = await repository.update(updatedOrder);

        expect(result).toBe(updatedOrder);
        expect(result.status).toBe(OrderStatus.CONFIRMED);
        expect(result.updatedBy).toBe(testUserId);
        expect(result.updatedAt).toBeDefined();
      });

      it('should throw error for invalid order object', async () => {
        await expect(repository.update(null as any)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.update(undefined as any)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.update('invalid' as any)).rejects.toThrow(OrderRepositoryError);
      });

      it('should throw error for order without ID', async () => {
        const orderWithoutId = { orderNumber: 'ORD-001' } as any;
        await expect(repository.update(orderWithoutId)).rejects.toThrow(OrderRepositoryError);
      });

      it('should throw error for non-existent order', async () => {
        const nonExistentOrder = createTestOrder({ id: 'non-existent-id' });

        await expect(repository.update(nonExistentOrder)).rejects.toThrow(OrderNotFoundError);
      });

      it('should validate agency isolation on update', async () => {
        const orderFromDifferentAgency = createTestOrder({
          id: existingOrder.id,
          agencyId: 'different-agency',
        });

        await expect(repository.update(orderFromDifferentAgency)).rejects.toThrow(OrderNotFoundError);
      });
    });

    describe('findById()', () => {
      let savedOrder: Order;

      beforeEach(async () => {
        savedOrder = createTestOrder();
        await repository.save(savedOrder);
      });

      it('should find order by ID successfully', async () => {
        const result = await repository.findById(savedOrder.id, testAgencyId);

        expect(result).not.toBeNull();
        expect(result!.id).toBe(savedOrder.id);
        expect(result!.orderNumber).toBe(savedOrder.orderNumber);
        expect(result!.agencyId).toBe(testAgencyId);
        expect(result!.customerId).toBe(testCustomerId);
        expect(result!.items).toHaveLength(savedOrder.items.length);
      });

      it('should return null when order not found', async () => {
        const result = await repository.findById('non-existent-id', testAgencyId);
        expect(result).toBeNull();
      });

      it('should return null when order belongs to different agency', async () => {
        const result = await repository.findById(savedOrder.id, 'different-agency');
        expect(result).toBeNull();
      });

      it('should validate ID parameter', async () => {
        await expect(repository.findById('', testAgencyId)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.findById('   ', testAgencyId)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.findById(null as any, testAgencyId)).rejects.toThrow(OrderRepositoryError);
      });

      it('should validate agency ID parameter', async () => {
        await expect(repository.findById(savedOrder.id, '')).rejects.toThrow(OrderRepositoryError);
        await expect(repository.findById(savedOrder.id, '   ')).rejects.toThrow(OrderRepositoryError);
        await expect(repository.findById(savedOrder.id, null as any)).rejects.toThrow(OrderRepositoryError);
      });
    });

    describe('findByOrderNumber()', () => {
      let savedOrder: Order;

      beforeEach(async () => {
        savedOrder = createTestOrder();
        await repository.save(savedOrder);
      });

      it('should find order by order number successfully', async () => {
        const result = await repository.findByOrderNumber(savedOrder.orderNumber, testAgencyId);

        expect(result).not.toBeNull();
        expect(result!.id).toBe(savedOrder.id);
        expect(result!.orderNumber).toBe(savedOrder.orderNumber);
        expect(result!.agencyId).toBe(testAgencyId);
      });

      it('should return null when order number not found', async () => {
        const result = await repository.findByOrderNumber('NON-EXISTENT', testAgencyId);
        expect(result).toBeNull();
      });

      it('should return null when order belongs to different agency', async () => {
        const result = await repository.findByOrderNumber(savedOrder.orderNumber, 'different-agency');
        expect(result).toBeNull();
      });

      it('should validate order number parameter', async () => {
        await expect(repository.findByOrderNumber('', testAgencyId)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.findByOrderNumber('   ', testAgencyId)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.findByOrderNumber(null as any, testAgencyId)).rejects.toThrow(OrderRepositoryError);
      });

      it('should validate agency ID parameter', async () => {
        await expect(repository.findByOrderNumber(savedOrder.orderNumber, '')).rejects.toThrow(OrderRepositoryError);
        await expect(repository.findByOrderNumber(savedOrder.orderNumber, '   ')).rejects.toThrow(OrderRepositoryError);
        await expect(repository.findByOrderNumber(savedOrder.orderNumber, null as any)).rejects.toThrow(
          OrderRepositoryError
        );
      });
    });

    describe('existsByOrderNumber()', () => {
      let savedOrder: Order;

      beforeEach(async () => {
        savedOrder = createTestOrder();
        await repository.save(savedOrder);
      });

      it('should return true when order number exists', async () => {
        const result = await repository.existsByOrderNumber(savedOrder.orderNumber, testAgencyId);
        expect(result).toBe(true);
      });

      it('should return false when order number does not exist', async () => {
        const result = await repository.existsByOrderNumber('NON-EXISTENT', testAgencyId);
        expect(result).toBe(false);
      });

      it('should return false when order belongs to different agency', async () => {
        const result = await repository.existsByOrderNumber(savedOrder.orderNumber, 'different-agency');
        expect(result).toBe(false);
      });

      it('should exclude specified order ID from check', async () => {
        const result = await repository.existsByOrderNumber(savedOrder.orderNumber, testAgencyId, savedOrder.id);
        expect(result).toBe(false);
      });

      it('should validate order number parameter', async () => {
        await expect(repository.existsByOrderNumber('', testAgencyId)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.existsByOrderNumber('   ', testAgencyId)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.existsByOrderNumber(null as any, testAgencyId)).rejects.toThrow(OrderRepositoryError);
      });

      it('should validate agency ID parameter', async () => {
        await expect(repository.existsByOrderNumber(savedOrder.orderNumber, '')).rejects.toThrow(OrderRepositoryError);
        await expect(repository.existsByOrderNumber(savedOrder.orderNumber, '   ')).rejects.toThrow(
          OrderRepositoryError
        );
        await expect(repository.existsByOrderNumber(savedOrder.orderNumber, null as any)).rejects.toThrow(
          OrderRepositoryError
        );
      });
    });

    describe('deleteById()', () => {
      let savedOrder: Order;

      beforeEach(async () => {
        savedOrder = createTestOrder();
        await repository.save(savedOrder);
      });

      it('should delete existing order successfully', async () => {
        const result = await repository.deleteById(savedOrder.id, testAgencyId);

        expect(result).toBe(true);

        // Verify order is deleted
        const foundOrder = await repository.findById(savedOrder.id, testAgencyId);
        expect(foundOrder).toBeNull();
      });

      it('should return false when order does not exist', async () => {
        const result = await repository.deleteById('non-existent-id', testAgencyId);
        expect(result).toBe(false);
      });

      it('should return false when order belongs to different agency', async () => {
        const result = await repository.deleteById(savedOrder.id, 'different-agency');
        expect(result).toBe(false);
      });

      it('should validate ID parameter', async () => {
        await expect(repository.deleteById('', testAgencyId)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.deleteById('   ', testAgencyId)).rejects.toThrow(OrderRepositoryError);
        await expect(repository.deleteById(null as any, testAgencyId)).rejects.toThrow(OrderRepositoryError);
      });

      it('should validate agency ID parameter', async () => {
        await expect(repository.deleteById(savedOrder.id, '')).rejects.toThrow(OrderRepositoryError);
        await expect(repository.deleteById(savedOrder.id, '   ')).rejects.toThrow(OrderRepositoryError);
        await expect(repository.deleteById(savedOrder.id, null as any)).rejects.toThrow(OrderRepositoryError);
      });
    });

    describe('getNextOrderNumber()', () => {
      it('should generate next order number for new agency', async () => {
        const orderNumber = await repository.getNextOrderNumber(testAgencyId);

        expect(orderNumber).toMatch(/^ORD-\d{4}-\d{6}$/);
      });

      it('should generate sequential order numbers', async () => {
        const orderNumber1 = await repository.getNextOrderNumber(testAgencyId);
        const orderNumber2 = await repository.getNextOrderNumber(testAgencyId);

        expect(orderNumber1).not.toBe(orderNumber2);

        // Extract sequence numbers
        const seq1 = parseInt(orderNumber1.split('-')[2]);
        const seq2 = parseInt(orderNumber2.split('-')[2]);

        expect(seq2).toBe(seq1 + 1);
      });

      it('should handle custom prefix', async () => {
        const orderNumber = await repository.getNextOrderNumber(testAgencyId, 'CUST');

        expect(orderNumber).toMatch(/^CUST-\d{4}-\d{6}$/);
      });

      it('should generate unique numbers per agency', async () => {
        const orderNumberA = await repository.getNextOrderNumber('agency-a');
        const orderNumberB = await repository.getNextOrderNumber('agency-b');

        expect(orderNumberA).toMatch(/^ORD-\d{4}-\d{6}$/);
        expect(orderNumberB).toMatch(/^ORD-\d{4}-\d{6}$/);
        // Both should start from sequence 1 for different agencies
        expect(orderNumberA.split('-')[2]).toBe('000001');
        expect(orderNumberB.split('-')[2]).toBe('000001');
      });

      it('should validate agency ID parameter', async () => {
        await expect(repository.getNextOrderNumber('')).rejects.toThrow(OrderRepositoryError);
        await expect(repository.getNextOrderNumber('   ')).rejects.toThrow(OrderRepositoryError);
        await expect(repository.getNextOrderNumber(null as any)).rejects.toThrow(OrderRepositoryError);
      });
    });
  });

  describe('Integration Tests - Step 2', () => {
    it('should handle complete CRUD workflow', async () => {
      // Create
      const order = createTestOrder();
      const savedOrder = await repository.save(order);
      expect(savedOrder.id).toBeDefined();

      // Read
      const foundOrder = await repository.findById(savedOrder.id, testAgencyId);
      expect(foundOrder).not.toBeNull();
      expect(foundOrder!.orderNumber).toBe(order.orderNumber);

      // Update
      const updatedOrder = foundOrder!.confirm(testUserId);
      const result = await repository.update(updatedOrder);
      expect(result.status).toBe(OrderStatus.CONFIRMED);

      // Delete
      const deleteResult = await repository.deleteById(savedOrder.id, testAgencyId);
      expect(deleteResult).toBe(true);

      // Verify deletion
      const deletedOrder = await repository.findById(savedOrder.id, testAgencyId);
      expect(deletedOrder).toBeNull();
    });

    it('should maintain data integrity across operations', async () => {
      // Test order number uniqueness across multiple operations
      const order1 = createTestOrder({ orderNumber: 'ORD-UNIQUE-001' });
      const order2 = createTestOrder({ orderNumber: 'ORD-UNIQUE-002' });

      await repository.save(order1);
      await repository.save(order2);

      // Verify both exist
      expect(await repository.existsByOrderNumber('ORD-UNIQUE-001', testAgencyId)).toBe(true);
      expect(await repository.existsByOrderNumber('ORD-UNIQUE-002', testAgencyId)).toBe(true);

      // Delete one
      await repository.deleteById(order1.id, testAgencyId);

      // Verify deletion and other order still exists
      expect(await repository.existsByOrderNumber('ORD-UNIQUE-001', testAgencyId)).toBe(false);
      expect(await repository.existsByOrderNumber('ORD-UNIQUE-002', testAgencyId)).toBe(true);
    });
  });

  // Helper functions for creating test orders
  function createTestOrder(overrides: Partial<any> = {}): Order {
    const orderProps = {
      orderNumber: 'ORD-2024-001',
      orderDate: new Date(),
      customerId: testCustomerId,
      customerCode: 'CUST-001',
      customerName: 'Test Customer',
      customerCreditLimit: Money.fromDecimal(50000, 'USD'),
      customerBalance: Money.fromDecimal(500, 'USD'),
      areaCode: 'AREA-001',
      areaName: 'Test Area',
      workerName: 'Test Worker',
      items: [createTestOrderItem()],
      subtotalAmount: Money.fromDecimal(100, 'USD'),
      discountPercentage: 0,
      discountAmount: Money.fromDecimal(0, 'USD'),
      taxAmount: Money.fromDecimal(10, 'USD'),
      totalAmount: Money.fromDecimal(110, 'USD'),
      paymentMethod: PaymentMethod.CREDIT,
      creditDays: 30,
      status: OrderStatus.PENDING,
      fulfillmentStatus: OrderFulfillmentStatus.PENDING,
      paymentStatus: OrderPaymentStatus.PENDING,
      agencyId: testAgencyId,
      createdOffline: false,
      createdBy: testUserId,
      ...overrides,
    };

    return Order.create(orderProps);
  }

  function createMinimalTestOrder(): Order {
    return createTestOrder({
      orderNumber: 'ORD-MINIMAL-001',
      items: [createTestOrderItem()],
    });
  }

  function createTestOrderWithMultipleItems(): Order {
    return createTestOrder({
      orderNumber: 'ORD-MULTI-001',
      items: [
        createTestOrderItem({ productId: 'product-1', productCode: 'PROD-001' }),
        createTestOrderItem({ productId: 'product-2', productCode: 'PROD-002' }),
        createTestOrderItem({ productId: 'product-3', productCode: 'PROD-003' }),
      ],
      subtotalAmount: Money.fromDecimal(300, 'USD'),
      taxAmount: Money.fromDecimal(30, 'USD'),
      totalAmount: Money.fromDecimal(330, 'USD'),
    });
  }

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
      unitTotal: Money.fromDecimal(quantity * unitPrice.amount, 'USD'),
      discountPercentage,
      discountAmount: Money.fromDecimal(0, 'USD'),
      taxRate,
      taxAmount: Money.fromDecimal((quantity * unitPrice.amount * taxRate) / 100, 'USD'),
      itemTotal: Money.fromDecimal(quantity * unitPrice.amount * (1 + taxRate / 100), 'USD'),
      fulfilledBoxes: 0,
      fulfilledLoose: 0,
      fulfilledUnits: 0,
      status: OrderItemStatus.PENDING,
      ...overrides,
    };
  }
});
