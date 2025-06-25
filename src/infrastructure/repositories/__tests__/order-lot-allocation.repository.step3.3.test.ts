/**
 * Order Lot Allocation Repository Tests - Step 3.3: findById Implementation
 *
 * Tests the implementation of the findById method in the order lot allocation repository.
 * Following strict incremental approach with comprehensive testing coverage.
 *
 * @testType Unit
 * @phase Phase 3: Order Repository Implementation
 * @step Step 3.3: findById Method Implementation
 * @version 1.0.0
 */

import { SqliteOrderLotAllocationRepository } from '../order-lot-allocation.repository';
import { OrderLotAllocationRepositoryError } from '../../../domain/repositories/order-lot-allocation.repository';
import type { OrderItemLotAllocation } from '../../../domain/entities/order-lot-allocation';
import type { DatabaseConnection } from '../../database/connection';
import Database from 'better-sqlite3';

describe('SqliteOrderLotAllocationRepository - Step 3.3: findById Method', () => {
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

  describe('Step 3.3a: Basic findById Functionality', () => {
    it('should find allocation by ID successfully', async () => {
      // Arrange
      const allocationId = 'alloc-001';
      const mockRow = {
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
      };

      const mockStmt = {
        get: jest.fn().mockReturnValue(mockRow),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findById(allocationId);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toEqual({
        lotBatchId: 'lot-001',
        lotNumber: 'LOT-001',
        batchNumber: 'BATCH-001',
        allocatedQuantity: 10,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        reservedAt: new Date('2024-01-15'),
        reservedBy: 'user-001',
      });

      // Verify SQL query
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM order_item_lot_allocations'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ?'));
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('LIMIT 1'));
      expect(mockStmt.get).toHaveBeenCalledWith('alloc-001');
    });

    it('should return null when allocation not found', async () => {
      // Arrange
      const allocationId = 'alloc-nonexistent';
      const mockStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findById(allocationId);

      // Assert
      expect(result).toBeNull();
      expect(mockStmt.get).toHaveBeenCalledWith('alloc-nonexistent');
    });

    it('should handle allocation with null optional fields', async () => {
      // Arrange
      const allocationId = 'alloc-nulls';
      const mockRow = {
        id: 'alloc-nulls',
        order_id: 'order-nulls',
        order_item_id: 'item-nulls',
        lot_batch_id: 'lot-nulls',
        lot_number: 'LOT-NULLS',
        batch_number: null, // Null batch number
        allocated_quantity: 20,
        manufacturing_date: 1704067200000,
        expiry_date: null, // Null expiry date
        reserved_at: 1705276800000,
        reserved_by: 'user-nulls',
        created_at: 1705276800000,
        updated_at: null,
      };

      const mockStmt = {
        get: jest.fn().mockReturnValue(mockRow),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findById(allocationId);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toEqual({
        lotBatchId: 'lot-nulls',
        lotNumber: 'LOT-NULLS',
        batchNumber: null,
        allocatedQuantity: 20,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: null,
        reservedAt: new Date('2024-01-15'),
        reservedBy: 'user-nulls',
      });
    });

    it('should handle allocation with updated_at timestamp', async () => {
      // Arrange
      const allocationId = 'alloc-updated';
      const mockRow = {
        id: 'alloc-updated',
        order_id: 'order-updated',
        order_item_id: 'item-updated',
        lot_batch_id: 'lot-updated',
        lot_number: 'LOT-UPDATED',
        batch_number: 'BATCH-UPDATED',
        allocated_quantity: 25,
        manufacturing_date: 1704067200000,
        expiry_date: 1735603200000,
        reserved_at: 1705276800000,
        reserved_by: 'user-updated',
        created_at: 1705276800000,
        updated_at: 1705363200000, // Has update timestamp
      };

      const mockStmt = {
        get: jest.fn().mockReturnValue(mockRow),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findById(allocationId);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.allocatedQuantity).toBe(25);
      expect(result!.reservedBy).toBe('user-updated');
    });
  });

  describe('Step 3.3b: Input Validation', () => {
    it('should throw error when ID is null', async () => {
      // Act & Assert
      await expect(repository.findById(null as any)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findById(null as any)).rejects.toThrow('Valid allocation ID is required');
    });

    it('should throw error when ID is undefined', async () => {
      // Act & Assert
      await expect(repository.findById(undefined as any)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findById(undefined as any)).rejects.toThrow('Valid allocation ID is required');
    });

    it('should throw error when ID is empty string', async () => {
      // Act & Assert
      await expect(repository.findById('')).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findById('')).rejects.toThrow('Valid allocation ID is required');
    });

    it('should throw error when ID is whitespace only', async () => {
      // Act & Assert
      await expect(repository.findById('   ')).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findById('   ')).rejects.toThrow('Valid allocation ID is required');
    });

    it('should throw error when ID is not a string', async () => {
      // Act & Assert
      await expect(repository.findById(123 as any)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findById(123 as any)).rejects.toThrow('Valid allocation ID is required');
    });

    it('should accept valid string IDs of various formats', async () => {
      // Arrange
      const validIds = [
        'alloc-001',
        'allocation_123',
        'ALLOC-ABC-456',
        'alloc.123.xyz',
        'alloc@domain.com',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479', // UUID format
      ];

      const mockStmt = {
        get: jest.fn().mockReturnValue(undefined), // Not found, but should not throw validation error
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act & Assert
      for (const validId of validIds) {
        const result = await repository.findById(validId);
        expect(result).toBeNull(); // Should return null for not found, not throw error
        expect(mockStmt.get).toHaveBeenCalledWith(validId);
      }
    });
  });

  describe('Step 3.3c: Error Handling', () => {
    it('should handle database query errors gracefully', async () => {
      // Arrange
      const allocationId = 'alloc-001';
      const mockStmt = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Database query failed');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act & Assert
      await expect(repository.findById(allocationId)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findById(allocationId)).rejects.toThrow('Failed to find allocation by ID');
      await expect(repository.findById(allocationId)).rejects.toThrow('Database query failed');
    });

    it('should handle database prepare errors gracefully', async () => {
      // Arrange
      const allocationId = 'alloc-001';
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database prepare failed');
      });

      // Act & Assert
      await expect(repository.findById(allocationId)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findById(allocationId)).rejects.toThrow('Failed to find allocation by ID');
      await expect(repository.findById(allocationId)).rejects.toThrow('Database prepare failed');
    });

    it('should preserve OrderLotAllocationRepositoryError when thrown from validation', async () => {
      // Act & Assert
      const promise = repository.findById('');
      await expect(promise).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(promise).rejects.toThrow('Valid allocation ID is required');
    });

    it('should handle database connection issues', async () => {
      // Arrange
      const allocationId = 'alloc-001';
      const mockStmt = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('SQLITE_BUSY: database is locked');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act & Assert
      await expect(repository.findById(allocationId)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findById(allocationId)).rejects.toThrow('Failed to find allocation by ID');
      await expect(repository.findById(allocationId)).rejects.toThrow('SQLITE_BUSY: database is locked');
    });
  });

  describe('Step 3.3d: Data Mapping and Type Safety', () => {
    it('should correctly map database timestamps to JavaScript Dates', async () => {
      // Arrange
      const allocationId = 'alloc-timestamps';
      const mockRow = {
        id: 'alloc-timestamps',
        order_id: 'order-timestamps',
        order_item_id: 'item-timestamps',
        lot_batch_id: 'lot-timestamps',
        lot_number: 'LOT-TIMESTAMPS',
        batch_number: 'BATCH-TIMESTAMPS',
        allocated_quantity: 15,
        manufacturing_date: 1704153600000, // 2024-01-02 00:00:00 UTC
        expiry_date: 1735689599999, // 2024-12-31 23:59:59.999 UTC
        reserved_at: 1705363200000, // 2024-01-16 00:00:00 UTC
        reserved_by: 'user-timestamps',
        created_at: 1705363200000,
        updated_at: 1705449600000, // 2024-01-17 00:00:00 UTC
      };

      const mockStmt = {
        get: jest.fn().mockReturnValue(mockRow),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findById(allocationId);

      // Assert
      expect(result).not.toBeNull();
      const allocation = result!;

      expect(allocation.manufacturingDate).toBeInstanceOf(Date);
      expect(allocation.manufacturingDate.toISOString()).toBe('2024-01-02T00:00:00.000Z');

      expect(allocation.expiryDate).toBeInstanceOf(Date);
      expect(allocation.expiryDate!.toISOString()).toBe('2024-12-31T23:59:59.999Z');

      expect(allocation.reservedAt).toBeInstanceOf(Date);
      expect(allocation.reservedAt.toISOString()).toBe('2024-01-16T00:00:00.000Z');
    });

    it('should return proper type for found allocation', async () => {
      // Arrange
      const allocationId = 'alloc-type-test';
      const mockRow = {
        id: 'alloc-type-test',
        order_id: 'order-type-test',
        order_item_id: 'item-type-test',
        lot_batch_id: 'lot-type-test',
        lot_number: 'LOT-TYPE-TEST',
        batch_number: 'BATCH-TYPE-TEST',
        allocated_quantity: 30,
        manufacturing_date: 1704067200000,
        expiry_date: 1735603200000,
        reserved_at: 1705276800000,
        reserved_by: 'user-type-test',
        created_at: 1705276800000,
        updated_at: null,
      };

      const mockStmt = {
        get: jest.fn().mockReturnValue(mockRow),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findById(allocationId);

      // Assert
      expect(result).not.toBeNull();

      // TypeScript should enforce proper type
      const typedResult: OrderItemLotAllocation | null = result;
      expect(typedResult).toBe(result);

      if (result) {
        expect(typeof result.lotBatchId).toBe('string');
        expect(typeof result.lotNumber).toBe('string');
        expect(typeof result.allocatedQuantity).toBe('number');
        expect(result.manufacturingDate).toBeInstanceOf(Date);
        expect(result.reservedAt).toBeInstanceOf(Date);
        expect(typeof result.reservedBy).toBe('string');
      }
    });

    it('should return proper type for not found allocation', async () => {
      // Arrange
      const allocationId = 'alloc-not-found';
      const mockStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      const result = await repository.findById(allocationId);

      // Assert
      expect(result).toBeNull();

      // TypeScript should enforce nullable type
      const typedResult: OrderItemLotAllocation | null = result;
      expect(typedResult).toBe(result);
      expect(typedResult).toBeNull();
    });
  });

  describe('Step 3.3e: Performance and Database Operations', () => {
    it('should use LIMIT 1 for performance optimization', async () => {
      // Arrange
      const allocationId = 'alloc-limit-test';
      const mockStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      await repository.findById(allocationId);

      // Assert
      const sqlQuery = mockDb.prepare.mock.calls[0][0];
      expect(sqlQuery).toContain('LIMIT 1');
    });

    it('should call database methods with correct parameters', async () => {
      // Arrange
      const allocationId = 'alloc-param-test';
      const mockStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      await repository.findById(allocationId);

      // Assert
      expect(mockDb.prepare).toHaveBeenCalledTimes(1);
      expect(mockStmt.get).toHaveBeenCalledTimes(1);
      expect(mockStmt.get).toHaveBeenCalledWith('alloc-param-test');
    });

    it('should use single database query for efficiency', async () => {
      // Arrange
      const allocationId = 'alloc-efficiency-test';
      const mockRow = {
        id: 'alloc-efficiency-test',
        order_id: 'order-efficiency',
        order_item_id: 'item-efficiency',
        lot_batch_id: 'lot-efficiency',
        lot_number: 'LOT-EFFICIENCY',
        batch_number: 'BATCH-EFFICIENCY',
        allocated_quantity: 12,
        manufacturing_date: 1704067200000,
        expiry_date: 1735603200000,
        reserved_at: 1705276800000,
        reserved_by: 'user-efficiency',
        created_at: 1705276800000,
        updated_at: null,
      };

      const mockStmt = {
        get: jest.fn().mockReturnValue(mockRow),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      await repository.findById(allocationId);

      // Assert
      // Should only prepare one statement and execute one query
      expect(mockDb.prepare).toHaveBeenCalledTimes(1);
      expect(mockStmt.get).toHaveBeenCalledTimes(1);
    });

    it('should handle primary key lookup efficiently', async () => {
      // Arrange
      const allocationId = 'alloc-pk-test';
      const mockStmt = {
        get: jest.fn().mockReturnValue(undefined),
      };
      mockDb.prepare.mockReturnValue(mockStmt as any);

      // Act
      await repository.findById(allocationId);

      // Assert
      const sqlQuery = mockDb.prepare.mock.calls[0][0];
      expect(sqlQuery).toContain('WHERE id = ?');
      expect(sqlQuery).not.toContain('JOIN'); // Should be simple lookup, no joins needed
      expect(sqlQuery).not.toContain('ORDER BY'); // No ordering needed for single record lookup
    });
  });
});
