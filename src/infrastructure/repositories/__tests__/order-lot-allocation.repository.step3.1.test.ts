/**
 * Order Lot Allocation Repository Tests - Step 3.1: findByOrderId Implementation
 *
 * Tests the implementation of the findByOrderId method in the order lot allocation repository.
 * Following strict incremental approach with comprehensive testing coverage.
 *
 * @testType Unit
 * @phase Phase 3: Order Repository Implementation
 * @step Step 3.1: findByOrderId Method Implementation
 * @version 1.0.0
 */

import { SqliteOrderLotAllocationRepository } from '../order-lot-allocation.repository';
import { OrderLotAllocationRepositoryError } from '../../../domain/repositories/order-lot-allocation.repository';
import type { OrderItemLotAllocation } from '../../../domain/entities/order-lot-allocation';
import type { DatabaseConnection } from '../../database/connection';
import Database from 'better-sqlite3';

// Test data helpers
const createTestLotAllocation = (
  overrides: Partial<any> = {}
): OrderItemLotAllocation & { orderId: string; orderItemId: string } => ({
  orderId: 'order-001',
  orderItemId: 'item-001',
  lotBatchId: 'lot-001',
  lotNumber: 'LOT-001',
  batchNumber: 'BATCH-001',
  allocatedQuantity: 10,
  manufacturingDate: new Date('2024-01-01'),
  expiryDate: new Date('2024-12-31'),
  reservedAt: new Date('2024-01-15'),
  reservedBy: 'user-001',
  ...overrides,
});

describe('SqliteOrderLotAllocationRepository - Step 3.1: findByOrderId Method', () => {
  let repository: SqliteOrderLotAllocationRepository;
  let mockConnection: jest.Mocked<DatabaseConnection>;
  let mockDb: jest.Mocked<Database.Database>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock database
    mockDb = {
      prepare: jest.fn(),
      close: jest.fn(),
    } as any;

    // Mock connection
    mockConnection = {
      getDatabase: jest.fn().mockReturnValue(mockDb),
      isConnected: jest.fn().mockReturnValue(true),
    } as any;

    repository = new SqliteOrderLotAllocationRepository(mockConnection);
  });

  describe('Step 3.1a: Basic findByOrderId Functionality', () => {
    it('should find lot allocations by order ID successfully', async () => {
      // Arrange
      const orderId = 'order-001';
      const mockRows = [
        {
          id: 'alloc-001',
          order_id: 'order-001',
          order_item_id: 'item-001',
          lot_batch_id: 'lot-001',
          lot_number: 'LOT-001',
          batch_number: 'BATCH-001',
          allocated_quantity: 10,
          manufacturing_date: 1704067200000, // 2024-01-01 Unix timestamp
          expiry_date: 1735603200000, // 2024-12-31 Unix timestamp
          reserved_at: 1705276800000, // 2024-01-15 Unix timestamp
          reserved_by: 'user-001',
          created_at: 1705276800000,
          updated_at: null,
        },
        {
          id: 'alloc-002',
          order_id: 'order-001',
          order_item_id: 'item-001',
          lot_batch_id: 'lot-002',
          lot_number: 'LOT-002',
          batch_number: 'BATCH-002',
          allocated_quantity: 15,
          manufacturing_date: 1704153600000, // 2024-01-02 Unix timestamp
          expiry_date: 1735603200000, // 2024-12-31 Unix timestamp
          reserved_at: 1705276800000, // 2024-01-15 Unix timestamp
          reserved_by: 'user-001',
          created_at: 1705276800000,
          updated_at: null,
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findByOrderId(orderId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        lotBatchId: 'lot-001',
        lotNumber: 'LOT-001',
        batchNumber: 'BATCH-001',
        allocatedQuantity: 10,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        reservedAt: new Date('2024-01-15'),
        reservedBy: 'user-001',
      });
      expect(result[1]).toEqual({
        lotBatchId: 'lot-002',
        lotNumber: 'LOT-002',
        batchNumber: 'BATCH-002',
        allocatedQuantity: 15,
        manufacturingDate: new Date('2024-01-02'),
        expiryDate: new Date('2024-12-31'),
        reservedAt: new Date('2024-01-15'),
        reservedBy: 'user-001',
      });

      // Verify SQL query
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM order_item_lot_allocations'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE order_id = ?'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY created_at ASC, lot_number ASC'));
      expect(mockStmt.all).toHaveBeenCalledWith('order-001');
    });

    it('should return empty array when no allocations found for order', async () => {
      // Arrange
      const orderId = 'order-nonexistent';
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findByOrderId(orderId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(mockStmt.all).toHaveBeenCalledWith('order-nonexistent');
    });

    it('should handle null batch numbers correctly', async () => {
      // Arrange
      const orderId = 'order-002';
      const mockRows = [
        {
          id: 'alloc-003',
          order_id: 'order-002',
          order_item_id: 'item-002',
          lot_batch_id: 'lot-003',
          lot_number: 'LOT-003',
          batch_number: null, // Null batch number
          allocated_quantity: 20,
          manufacturing_date: 1704067200000,
          expiry_date: null, // Null expiry date
          reserved_at: 1705276800000,
          reserved_by: 'user-002',
          created_at: 1705276800000,
          updated_at: null,
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findByOrderId(orderId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        lotBatchId: 'lot-003',
        lotNumber: 'LOT-003',
        batchNumber: null,
        allocatedQuantity: 20,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: null,
        reservedAt: new Date('2024-01-15'),
        reservedBy: 'user-002',
      });
    });
  });

  describe('Step 3.1b: Input Validation', () => {
    it('should throw error when order ID is null', async () => {
      // Act & Assert
      await expect(repository.findByOrderId(null as any)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderId(null as any)).rejects.toThrow('Valid order ID is required');
    });

    it('should throw error when order ID is undefined', async () => {
      // Act & Assert
      await expect(repository.findByOrderId(undefined as any)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderId(undefined as any)).rejects.toThrow('Valid order ID is required');
    });

    it('should throw error when order ID is empty string', async () => {
      // Act & Assert
      await expect(repository.findByOrderId('')).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderId('')).rejects.toThrow('Valid order ID is required');
    });

    it('should throw error when order ID is whitespace only', async () => {
      // Act & Assert
      await expect(repository.findByOrderId('   ')).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderId('   ')).rejects.toThrow('Valid order ID is required');
    });

    it('should throw error when order ID is not a string', async () => {
      // Act & Assert
      await expect(repository.findByOrderId(123 as any)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderId(123 as any)).rejects.toThrow('Valid order ID is required');
    });
  });

  describe('Step 3.1c: Error Handling', () => {
    it('should handle database query errors gracefully', async () => {
      // Arrange
      const orderId = 'order-001';
      const mockStmt = {
        all: jest.fn().mockImplementation(() => {
          throw new Error('Database query failed');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act & Assert
      await expect(repository.findByOrderId(orderId)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderId(orderId)).rejects.toThrow('Failed to find allocations by order ID');
      await expect(repository.findByOrderId(orderId)).rejects.toThrow('Database query failed');
    });

    it('should handle database prepare errors gracefully', async () => {
      // Arrange
      const orderId = 'order-001';
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database prepare failed');
      });

      // Act & Assert
      await expect(repository.findByOrderId(orderId)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderId(orderId)).rejects.toThrow('Failed to find allocations by order ID');
      await expect(repository.findByOrderId(orderId)).rejects.toThrow('Database prepare failed');
    });

    it('should preserve OrderLotAllocationRepositoryError when thrown from validation', async () => {
      // Act & Assert
      const promise = repository.findByOrderId('');
      await expect(promise).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(promise).rejects.toThrow('Valid order ID is required');
    });
  });

  describe('Step 3.1d: Data Mapping and Type Safety', () => {
    it('should correctly map database timestamps to JavaScript Dates', async () => {
      // Arrange
      const orderId = 'order-timestamp-test';
      const mockRows = [
        {
          id: 'alloc-timestamp',
          order_id: 'order-timestamp-test',
          order_item_id: 'item-timestamp',
          lot_batch_id: 'lot-timestamp',
          lot_number: 'LOT-TIMESTAMP',
          batch_number: 'BATCH-TIMESTAMP',
          allocated_quantity: 5,
          manufacturing_date: 1704153600000, // 2024-01-02 00:00:00 UTC
          expiry_date: 1735689599999, // 2024-12-31 23:59:59.999 UTC
          reserved_at: 1705363200000, // 2024-01-16 00:00:00 UTC
          reserved_by: 'user-timestamp',
          created_at: 1705363200000,
          updated_at: 1705449600000, // 2024-01-17 00:00:00 UTC
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findByOrderId(orderId);

      // Assert
      expect(result).toHaveLength(1);
      const allocation = result[0];

      expect(allocation.manufacturingDate).toBeInstanceOf(Date);
      expect(allocation.manufacturingDate.toISOString()).toBe('2024-01-02T00:00:00.000Z');

      expect(allocation.expiryDate).toBeInstanceOf(Date);
      expect(allocation.expiryDate!.toISOString()).toBe('2024-12-31T23:59:59.999Z');

      expect(allocation.reservedAt).toBeInstanceOf(Date);
      expect(allocation.reservedAt.toISOString()).toBe('2024-01-16T00:00:00.000Z');
    });

    it('should handle large result sets efficiently', async () => {
      // Arrange
      const orderId = 'order-large-set';
      const mockRows = Array.from({ length: 100 }, (_, index) => ({
        id: `alloc-${index + 1}`,
        order_id: 'order-large-set',
        order_item_id: `item-${Math.floor(index / 10) + 1}`,
        lot_batch_id: `lot-${index + 1}`,
        lot_number: `LOT-${String(index + 1).padStart(3, '0')}`,
        batch_number: `BATCH-${index + 1}`,
        allocated_quantity: (index % 10) + 1,
        manufacturing_date: 1704067200000 + index * 86400000, // Incrementing days
        expiry_date: 1735689600000,
        reserved_at: 1705276800000,
        reserved_by: `user-${(index % 5) + 1}`,
        created_at: 1705276800000 + index,
        updated_at: null,
      }));

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findByOrderId(orderId);

      // Assert
      expect(result).toHaveLength(100);
      expect(result[0].lotNumber).toBe('LOT-001');
      expect(result[99].lotNumber).toBe('LOT-100');

      // Verify all allocations are properly mapped
      result.forEach((allocation, index) => {
        expect(allocation.lotBatchId).toBe(`lot-${index + 1}`);
        expect(allocation.allocatedQuantity).toBe((index % 10) + 1);
        expect(allocation.reservedBy).toBe(`user-${(index % 5) + 1}`);
      });
    });

    it('should maintain order by created_at ASC, lot_number ASC', async () => {
      // Arrange
      const orderId = 'order-ordering-test';
      // Note: We'll verify that the SQL query includes the ORDER BY clause
      // The actual ordering is handled by the database

      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      await repository.findByOrderId(orderId);

      // Assert
      const sqlQuery = mockDb.prepare.mock.calls[0][0];
      expect(sqlQuery).toContain('ORDER BY created_at ASC, lot_number ASC');
    });
  });

  describe('Step 3.1e: Integration and Performance', () => {
    it('should use readonly return type correctly', async () => {
      // Arrange
      const orderId = 'order-readonly-test';
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findByOrderId(orderId);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(Object.isFrozen(result)).toBe(false); // The array itself isn't frozen, but the type is readonly

      // TypeScript should enforce readonly at compile time
      // This test verifies the method signature matches the interface
      const typedResult: readonly OrderItemLotAllocation[] = result;
      expect(typedResult).toBe(result);
    });

    it('should call database methods with correct parameters', async () => {
      // Arrange
      const orderId = 'order-param-test';
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      await repository.findByOrderId(orderId);

      // Assert
      expect(mockDb.prepare).toHaveBeenCalledTimes(1);
      expect(mockStmt.all).toHaveBeenCalledTimes(1);
      expect(mockStmt.all).toHaveBeenCalledWith('order-param-test');
    });
  });
});
