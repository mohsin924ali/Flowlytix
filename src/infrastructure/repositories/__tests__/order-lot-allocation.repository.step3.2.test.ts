/**
 * Order Lot Allocation Repository Tests - Step 3.2: findByOrderItemId Implementation
 *
 * Tests the implementation of the findByOrderItemId method in the order lot allocation repository.
 * Following strict incremental approach with comprehensive testing coverage.
 *
 * @testType Unit
 * @phase Phase 3: Order Repository Implementation
 * @step Step 3.2: findByOrderItemId Method Implementation
 * @version 1.0.0
 */

import { SqliteOrderLotAllocationRepository } from '../order-lot-allocation.repository';
import { OrderLotAllocationRepositoryError } from '../../../domain/repositories/order-lot-allocation.repository';
import type { OrderItemLotAllocation } from '../../../domain/entities/order-lot-allocation';
import type { DatabaseConnection } from '../../database/connection';
import Database from 'better-sqlite3';

describe('SqliteOrderLotAllocationRepository - Step 3.2: findByOrderItemId Method', () => {
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

  describe('Step 3.2a: Basic findByOrderItemId Functionality', () => {
    it('should find lot allocations by order item ID successfully', async () => {
      // Arrange
      const orderItemId = 'item-001';
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
      const result = await repository.findByOrderItemId(orderItemId);

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

      // Verify SQL query - should sort by manufacturing date first for FIFO
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM order_item_lot_allocations'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE order_item_id = ?'));
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY manufacturing_date ASC, lot_number ASC')
      );
      expect(mockStmt.all).toHaveBeenCalledWith('item-001');
    });

    it('should return empty array when no allocations found for order item', async () => {
      // Arrange
      const orderItemId = 'item-nonexistent';
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findByOrderItemId(orderItemId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(mockStmt.all).toHaveBeenCalledWith('item-nonexistent');
    });

    it('should handle single allocation correctly', async () => {
      // Arrange
      const orderItemId = 'item-single';
      const mockRows = [
        {
          id: 'alloc-single',
          order_id: 'order-single',
          order_item_id: 'item-single',
          lot_batch_id: 'lot-single',
          lot_number: 'LOT-SINGLE',
          batch_number: null, // Null batch number
          allocated_quantity: 5,
          manufacturing_date: 1704067200000,
          expiry_date: null, // Null expiry date
          reserved_at: 1705276800000,
          reserved_by: 'user-single',
          created_at: 1705276800000,
          updated_at: null,
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findByOrderItemId(orderItemId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        lotBatchId: 'lot-single',
        lotNumber: 'LOT-SINGLE',
        batchNumber: null,
        allocatedQuantity: 5,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: null,
        reservedAt: new Date('2024-01-15'),
        reservedBy: 'user-single',
      });
    });
  });

  describe('Step 3.2b: Input Validation', () => {
    it('should throw error when order item ID is null', async () => {
      // Act & Assert
      await expect(repository.findByOrderItemId(null as any)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderItemId(null as any)).rejects.toThrow('Valid order item ID is required');
    });

    it('should throw error when order item ID is undefined', async () => {
      // Act & Assert
      await expect(repository.findByOrderItemId(undefined as any)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderItemId(undefined as any)).rejects.toThrow('Valid order item ID is required');
    });

    it('should throw error when order item ID is empty string', async () => {
      // Act & Assert
      await expect(repository.findByOrderItemId('')).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderItemId('')).rejects.toThrow('Valid order item ID is required');
    });

    it('should throw error when order item ID is whitespace only', async () => {
      // Act & Assert
      await expect(repository.findByOrderItemId('   ')).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderItemId('   ')).rejects.toThrow('Valid order item ID is required');
    });

    it('should throw error when order item ID is not a string', async () => {
      // Act & Assert
      await expect(repository.findByOrderItemId(123 as any)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderItemId(123 as any)).rejects.toThrow('Valid order item ID is required');
    });
  });

  describe('Step 3.2c: Error Handling', () => {
    it('should handle database query errors gracefully', async () => {
      // Arrange
      const orderItemId = 'item-001';
      const mockStmt = {
        all: jest.fn().mockImplementation(() => {
          throw new Error('Database query failed');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act & Assert
      await expect(repository.findByOrderItemId(orderItemId)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderItemId(orderItemId)).rejects.toThrow(
        'Failed to find allocations by order item ID'
      );
      await expect(repository.findByOrderItemId(orderItemId)).rejects.toThrow('Database query failed');
    });

    it('should handle database prepare errors gracefully', async () => {
      // Arrange
      const orderItemId = 'item-001';
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database prepare failed');
      });

      // Act & Assert
      await expect(repository.findByOrderItemId(orderItemId)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderItemId(orderItemId)).rejects.toThrow(
        'Failed to find allocations by order item ID'
      );
      await expect(repository.findByOrderItemId(orderItemId)).rejects.toThrow('Database prepare failed');
    });

    it('should preserve OrderLotAllocationRepositoryError when thrown from validation', async () => {
      // Act & Assert
      const promise = repository.findByOrderItemId('');
      await expect(promise).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(promise).rejects.toThrow('Valid order item ID is required');
    });
  });

  describe('Step 3.2d: FIFO Ordering and Data Mapping', () => {
    it('should order results by manufacturing date ASC for FIFO compliance', async () => {
      // Arrange - Note: This test verifies that the SQL includes the correct ORDER BY clause
      const orderItemId = 'item-fifo-test';
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      await repository.findByOrderItemId(orderItemId);

      // Assert
      const sqlQuery = mockDb.prepare.mock.calls[0][0];
      expect(sqlQuery).toContain('ORDER BY manufacturing_date ASC, lot_number ASC');
    });

    it('should correctly map database timestamps to JavaScript Dates', async () => {
      // Arrange
      const orderItemId = 'item-timestamp-test';
      const mockRows = [
        {
          id: 'alloc-timestamp',
          order_id: 'order-timestamp-test',
          order_item_id: 'item-timestamp-test',
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
      const result = await repository.findByOrderItemId(orderItemId);

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

    it('should handle split lots across multiple allocations correctly', async () => {
      // Arrange - Multiple allocations for same order item (split lots scenario)
      const orderItemId = 'item-split-lots';
      const mockRows = [
        {
          id: 'alloc-split-1',
          order_id: 'order-split',
          order_item_id: 'item-split-lots',
          lot_batch_id: 'lot-older',
          lot_number: 'LOT-OLDER',
          batch_number: 'BATCH-A',
          allocated_quantity: 8,
          manufacturing_date: 1704067200000, // 2024-01-01 (older)
          expiry_date: 1735603200000,
          reserved_at: 1705276800000,
          reserved_by: 'user-split',
          created_at: 1705276800000,
          updated_at: null,
        },
        {
          id: 'alloc-split-2',
          order_id: 'order-split',
          order_item_id: 'item-split-lots',
          lot_batch_id: 'lot-newer',
          lot_number: 'LOT-NEWER',
          batch_number: 'BATCH-B',
          allocated_quantity: 7,
          manufacturing_date: 1704153600000, // 2024-01-02 (newer)
          expiry_date: 1735603200000,
          reserved_at: 1705276800000,
          reserved_by: 'user-split',
          created_at: 1705276800000,
          updated_at: null,
        },
      ];

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findByOrderItemId(orderItemId);

      // Assert
      expect(result).toHaveLength(2);

      // Should be returned in order they come from database (which should be FIFO ordered)
      expect(result[0].lotBatchId).toBe('lot-older');
      expect(result[0].allocatedQuantity).toBe(8);
      expect(result[1].lotBatchId).toBe('lot-newer');
      expect(result[1].allocatedQuantity).toBe(7);

      // Verify total allocation
      const totalAllocated = result.reduce((sum, alloc) => sum + alloc.allocatedQuantity, 0);
      expect(totalAllocated).toBe(15);
    });
  });

  describe('Step 3.2e: Performance and Integration', () => {
    it('should use readonly return type correctly', async () => {
      // Arrange
      const orderItemId = 'item-readonly-test';
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findByOrderItemId(orderItemId);

      // Assert
      expect(Array.isArray(result)).toBe(true);

      // TypeScript should enforce readonly at compile time
      const typedResult: readonly OrderItemLotAllocation[] = result;
      expect(typedResult).toBe(result);
    });

    it('should call database methods with correct parameters', async () => {
      // Arrange
      const orderItemId = 'item-param-test';
      const mockStmt = {
        all: jest.fn().mockReturnValue([]),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      await repository.findByOrderItemId(orderItemId);

      // Assert
      expect(mockDb.prepare).toHaveBeenCalledTimes(1);
      expect(mockStmt.all).toHaveBeenCalledTimes(1);
      expect(mockStmt.all).toHaveBeenCalledWith('item-param-test');
    });

    it('should handle large result sets efficiently', async () => {
      // Arrange
      const orderItemId = 'item-large-set';
      const mockRows = Array.from({ length: 50 }, (_, index) => ({
        id: `alloc-large-${index + 1}`,
        order_id: 'order-large',
        order_item_id: 'item-large-set',
        lot_batch_id: `lot-large-${index + 1}`,
        lot_number: `LOT-LARGE-${String(index + 1).padStart(3, '0')}`,
        batch_number: `BATCH-LARGE-${index + 1}`,
        allocated_quantity: (index % 5) + 1, // 1-5
        manufacturing_date: 1704067200000 + index * 86400000, // Incrementing days
        expiry_date: 1735603200000,
        reserved_at: 1705276800000,
        reserved_by: `user-large-${(index % 3) + 1}`,
        created_at: 1705276800000 + index,
        updated_at: null,
      }));

      const mockStmt = {
        all: jest.fn().mockReturnValue(mockRows),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findByOrderItemId(orderItemId);

      // Assert
      expect(result).toHaveLength(50);
      expect(result[0].lotNumber).toBe('LOT-LARGE-001');
      expect(result[49].lotNumber).toBe('LOT-LARGE-050');

      // Verify all allocations are properly mapped
      result.forEach((allocation, index) => {
        expect(allocation.lotBatchId).toBe(`lot-large-${index + 1}`);
        expect(allocation.allocatedQuantity).toBe((index % 5) + 1);
        expect(allocation.reservedBy).toBe(`user-large-${(index % 3) + 1}`);
      });
    });
  });
});
