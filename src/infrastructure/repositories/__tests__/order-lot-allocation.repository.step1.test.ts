/**
 * Order Lot Allocation Repository Implementation Tests - Step 1: Repository Layer Integration
 *
 * Unit tests for SqliteOrderLotAllocationRepository implementation.
 * Tests core repository functionality, error handling, and database operations.
 * Follows incremental testing approach with comprehensive coverage.
 *
 * @domain Order Management - Lot Allocation Tracking
 * @pattern Repository Pattern Testing
 * @version 1.0.0 - Step 1: Repository Layer Integration
 */

import { DatabaseConnection } from '../../database/connection';
import { SqliteOrderLotAllocationRepository } from '../order-lot-allocation.repository';
import {
  OrderLotAllocationRepositoryError,
  OrderLotAllocationNotFoundError,
  OrderLotAllocationAlreadyExistsError,
  OrderLotAllocationConnectionError,
} from '../../../domain/repositories/order-lot-allocation.repository';
import { OrderItemLotAllocation } from '../../../domain/entities/order-lot-allocation';

// Mock dependencies
jest.mock('../../database/connection');

// Test helper functions
const createTestLotAllocation = (
  overrides: Partial<OrderItemLotAllocation & { orderId: string; orderItemId: string }> = {}
): OrderItemLotAllocation & { orderId: string; orderItemId: string } => {
  return {
    orderId: 'order-001',
    orderItemId: 'item-001',
    lotBatchId: 'lot-batch-001',
    lotNumber: 'LOT-001',
    batchNumber: 'BATCH-001',
    allocatedQuantity: 10,
    manufacturingDate: new Date('2024-01-01'),
    expiryDate: new Date('2025-01-01'),
    reservedAt: new Date(),
    reservedBy: 'user-001',
    ...overrides,
  };
};

describe('SqliteOrderLotAllocationRepository - Step 1: Repository Layer Integration', () => {
  let repository: SqliteOrderLotAllocationRepository;
  let mockConnection: jest.Mocked<DatabaseConnection>;
  let mockDb: any;

  beforeEach(() => {
    // Setup database mock
    mockDb = {
      prepare: jest.fn(),
      exec: jest.fn(),
      close: jest.fn(),
    };

    // Setup connection mock
    mockConnection = {
      getDatabase: jest.fn().mockReturnValue(mockDb),
      isConnected: jest.fn().mockReturnValue(true),
    } as any;

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up mocks
    jest.resetAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create repository with valid database connection', () => {
      // Act
      repository = new SqliteOrderLotAllocationRepository(mockConnection);

      // Assert
      expect(repository).toBeInstanceOf(SqliteOrderLotAllocationRepository);
      expect(mockConnection.getDatabase).toHaveBeenCalledTimes(1);
    });

    it('should throw OrderLotAllocationConnectionError with null connection', () => {
      // Act & Assert
      expect(() => new SqliteOrderLotAllocationRepository(null as any)).toThrow(OrderLotAllocationConnectionError);
      expect(() => new SqliteOrderLotAllocationRepository(null as any)).toThrow(
        'Database connection error in order lot allocation repository'
      );
    });

    it('should throw OrderLotAllocationConnectionError with invalid connection', () => {
      // Arrange
      const invalidConnection = { getDatabase: () => null } as any;

      // Act & Assert
      expect(() => new SqliteOrderLotAllocationRepository(invalidConnection)).toThrow(
        OrderLotAllocationConnectionError
      );
      expect(() => new SqliteOrderLotAllocationRepository(invalidConnection)).toThrow(
        'Database connection error in order lot allocation repository'
      );
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      repository = new SqliteOrderLotAllocationRepository(mockConnection);
    });

    it('should return true when repository is healthy', async () => {
      // Arrange
      const mockStmt = { get: jest.fn().mockReturnValue({ count: 0 }) };
      mockDb.prepare.mockReturnValue(mockStmt);

      // Act
      const isHealthy = await repository.isHealthy();

      // Assert
      expect(isHealthy).toBe(true);
    });

    it('should return false when database connection is broken', async () => {
      // Arrange - Mock database error
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Act
      const isHealthy = await repository.isHealthy();

      // Assert
      expect(isHealthy).toBe(false);
    });
  });

  describe('Save Method', () => {
    beforeEach(() => {
      repository = new SqliteOrderLotAllocationRepository(mockConnection);
    });

    it('should save valid lot allocation successfully', async () => {
      // Arrange
      const allocation = createTestLotAllocation();
      const mockExistsStmt = { get: jest.fn().mockReturnValue(undefined) }; // No existing records
      const mockInsertStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

      mockDb.prepare
        .mockReturnValueOnce(mockExistsStmt) // existsByOrderItemAndLot check
        .mockReturnValueOnce(mockInsertStmt); // insert statement

      // Act
      const saved = await repository.save(allocation);

      // Assert
      expect(saved).toEqual({
        lotBatchId: allocation.lotBatchId,
        lotNumber: allocation.lotNumber,
        batchNumber: allocation.batchNumber,
        allocatedQuantity: allocation.allocatedQuantity,
        manufacturingDate: allocation.manufacturingDate,
        expiryDate: allocation.expiryDate,
        reservedAt: allocation.reservedAt,
        reservedBy: allocation.reservedBy,
      });
      expect(mockInsertStmt.run).toHaveBeenCalledTimes(1);
    });

    it('should handle allocation without expiry date', async () => {
      // Arrange
      const allocation = createTestLotAllocation({ expiryDate: null });
      const mockExistsStmt = { get: jest.fn().mockReturnValue(undefined) };
      const mockInsertStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

      mockDb.prepare.mockReturnValueOnce(mockExistsStmt).mockReturnValueOnce(mockInsertStmt);

      // Act
      const saved = await repository.save(allocation);

      // Assert
      expect(saved.expiryDate).toBeNull();
      expect(saved.lotBatchId).toBe(allocation.lotBatchId);
    });

    it('should handle allocation without batch number', async () => {
      // Arrange
      const allocation = createTestLotAllocation({ batchNumber: null });
      const mockExistsStmt = { get: jest.fn().mockReturnValue(undefined) };
      const mockInsertStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

      mockDb.prepare.mockReturnValueOnce(mockExistsStmt).mockReturnValueOnce(mockInsertStmt);

      // Act
      const saved = await repository.save(allocation);

      // Assert
      expect(saved.batchNumber).toBeNull();
      expect(saved.lotNumber).toBe(allocation.lotNumber);
    });

    it('should throw error when allocation object is invalid', async () => {
      // Act & Assert
      await expect(repository.save(null as any)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.save(null as any)).rejects.toThrow('Invalid allocation object provided');
    });

    it('should throw error when order ID is missing', async () => {
      // Arrange
      const allocation = createTestLotAllocation({ orderId: '' });

      // Act & Assert
      await expect(repository.save(allocation)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.save(allocation)).rejects.toThrow('Allocation missing required properties');
    });

    it('should throw error when order item ID is missing', async () => {
      // Arrange
      const allocation = createTestLotAllocation({ orderItemId: '' });

      // Act & Assert
      await expect(repository.save(allocation)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.save(allocation)).rejects.toThrow('Allocation missing required properties');
    });

    it('should throw error when lot batch ID is missing', async () => {
      // Arrange
      const allocation = createTestLotAllocation({ lotBatchId: '' });

      // Act & Assert
      await expect(repository.save(allocation)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.save(allocation)).rejects.toThrow('Allocation missing required properties');
    });

    it('should throw error when allocated quantity is zero', async () => {
      // Arrange
      const allocation = createTestLotAllocation({ allocatedQuantity: 0 });

      // Act & Assert
      await expect(repository.save(allocation)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.save(allocation)).rejects.toThrow('Allocated quantity must be positive');
    });

    it('should throw error when allocated quantity is negative', async () => {
      // Arrange
      const allocation = createTestLotAllocation({ allocatedQuantity: -5 });

      // Act & Assert
      await expect(repository.save(allocation)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.save(allocation)).rejects.toThrow('Allocated quantity must be positive');
    });

    it('should throw OrderLotAllocationAlreadyExistsError for duplicate allocation', async () => {
      // Arrange
      const allocation = createTestLotAllocation();
      const mockExistsStmt = { get: jest.fn().mockReturnValue({ count: 1 }) }; // Existing record found

      mockDb.prepare.mockReturnValue(mockExistsStmt);

      // Act & Assert
      await expect(repository.save(allocation)).rejects.toThrow(OrderLotAllocationAlreadyExistsError);
      await expect(repository.save(allocation)).rejects.toThrow('Order lot allocation already exists');
    });
  });

  describe('ExistsByOrderItemAndLot Method', () => {
    beforeEach(() => {
      repository = new SqliteOrderLotAllocationRepository(mockConnection);
    });

    it('should return true when allocation exists', async () => {
      // Arrange
      const mockStmt = { get: jest.fn().mockReturnValue({ id: 'some-id' }) };
      mockDb.prepare.mockReturnValue(mockStmt);

      // Act
      const exists = await repository.existsByOrderItemAndLot('item-001', 'lot-001');

      // Assert
      expect(exists).toBe(true);
      expect(mockStmt.get).toHaveBeenCalledWith('item-001', 'lot-001');
    });

    it('should return false when allocation does not exist', async () => {
      // Arrange
      const mockStmt = { get: jest.fn().mockReturnValue(undefined) };
      mockDb.prepare.mockReturnValue(mockStmt);

      // Act
      const exists = await repository.existsByOrderItemAndLot('nonexistent-item', 'nonexistent-lot');

      // Assert
      expect(exists).toBe(false);
    });

    it('should throw error when order item ID is empty', async () => {
      // Act & Assert
      await expect(repository.existsByOrderItemAndLot('', 'lot-batch-001')).rejects.toThrow(
        OrderLotAllocationRepositoryError
      );
      await expect(repository.existsByOrderItemAndLot('', 'lot-batch-001')).rejects.toThrow(
        'Order item ID and lot batch ID are required'
      );
    });

    it('should throw error when lot batch ID is empty', async () => {
      // Act & Assert
      await expect(repository.existsByOrderItemAndLot('item-001', '')).rejects.toThrow(
        OrderLotAllocationRepositoryError
      );
      await expect(repository.existsByOrderItemAndLot('item-001', '')).rejects.toThrow(
        'Order item ID and lot batch ID are required'
      );
    });

    it('should throw error when both parameters are empty', async () => {
      // Act & Assert
      await expect(repository.existsByOrderItemAndLot('', '')).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.existsByOrderItemAndLot('', '')).rejects.toThrow(
        'Order item ID and lot batch ID are required'
      );
    });
  });

  describe('Method Implementation Status', () => {
    beforeEach(() => {
      repository = new SqliteOrderLotAllocationRepository(mockConnection);
    });

    it('should throw "not implemented" error for saveBatch method', async () => {
      // Arrange
      const operation = {
        orderId: 'order-001',
        allocations: [
          {
            orderItemId: 'item-001',
            lotBatchId: 'lot-001',
            lotNumber: 'LOT-001',
            batchNumber: null,
            allocatedQuantity: 10,
            manufacturingDate: new Date(),
            expiryDate: null,
            reservedBy: 'user-001',
          },
        ],
      };

      // Act & Assert
      await expect(repository.saveBatch(operation)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.saveBatch(operation)).rejects.toThrow('Method not implemented yet');
    });

    it('should throw "not implemented" error for update method', async () => {
      // Act & Assert
      await expect(repository.update('id', { allocatedQuantity: 5 })).rejects.toThrow(
        OrderLotAllocationRepositoryError
      );
      await expect(repository.update('id', { allocatedQuantity: 5 })).rejects.toThrow('Method not implemented yet');
    });

    it('should throw "not implemented" error for findById method', async () => {
      // Act & Assert
      await expect(repository.findById('id')).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findById('id')).rejects.toThrow('Method not implemented yet');
    });

    it('should throw "not implemented" error for findByOrderId method', async () => {
      // Act & Assert
      await expect(repository.findByOrderId('order-001')).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderId('order-001')).rejects.toThrow('Method not implemented yet');
    });

    it('should throw "not implemented" error for findByOrderItemId method', async () => {
      // Act & Assert
      await expect(repository.findByOrderItemId('item-001')).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.findByOrderItemId('item-001')).rejects.toThrow('Method not implemented yet');
    });

    it('should throw "not implemented" error for count method', async () => {
      // Act & Assert
      await expect(repository.count()).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.count()).rejects.toThrow('Method not implemented yet');
    });

    it('should throw "not implemented" error for delete method', async () => {
      // Act & Assert
      await expect(repository.delete('id')).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.delete('id')).rejects.toThrow('Method not implemented yet');
    });
  });

  describe('Database Schema Validation', () => {
    beforeEach(() => {
      repository = new SqliteOrderLotAllocationRepository(mockConnection);
    });

    it('should handle complex lot allocation data correctly', async () => {
      // Arrange
      const allocation = createTestLotAllocation({
        lotNumber: 'LOT-2024-001-COMPLEX',
        batchNumber: 'BATCH-2024-001-SUB',
        allocatedQuantity: 99.5,
        manufacturingDate: new Date('2024-01-15T10:30:00.000Z'),
        expiryDate: new Date('2026-01-15T23:59:59.999Z'),
        reservedAt: new Date('2024-12-01T14:22:33.456Z'),
        reservedBy: 'user-with-complex-id-123',
      });

      const mockExistsStmt = { get: jest.fn().mockReturnValue(undefined) };
      const mockInsertStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

      mockDb.prepare.mockReturnValueOnce(mockExistsStmt).mockReturnValueOnce(mockInsertStmt);

      // Act
      const saved = await repository.save(allocation);

      // Assert
      expect(saved.lotNumber).toBe(allocation.lotNumber);
      expect(saved.batchNumber).toBe(allocation.batchNumber);
      expect(saved.allocatedQuantity).toBe(allocation.allocatedQuantity);
      expect(saved.manufacturingDate.getTime()).toBe(allocation.manufacturingDate.getTime());
      expect(saved.expiryDate?.getTime()).toBe(allocation.expiryDate?.getTime());
      expect(saved.reservedAt.getTime()).toBe(allocation.reservedAt.getTime());
      expect(saved.reservedBy).toBe(allocation.reservedBy);
    });

    it('should handle edge case dates correctly', async () => {
      // Arrange
      const allocation = createTestLotAllocation({
        manufacturingDate: new Date('1970-01-01T00:00:00.001Z'), // Near epoch
        expiryDate: new Date('2099-12-31T23:59:59.999Z'), // Far future
        reservedAt: new Date('2024-02-29T12:00:00.000Z'), // Leap year
      });

      const mockExistsStmt = { get: jest.fn().mockReturnValue(undefined) };
      const mockInsertStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

      mockDb.prepare.mockReturnValueOnce(mockExistsStmt).mockReturnValueOnce(mockInsertStmt);

      // Act
      const saved = await repository.save(allocation);

      // Assert
      expect(saved.manufacturingDate.getTime()).toBe(allocation.manufacturingDate.getTime());
      expect(saved.expiryDate?.getTime()).toBe(allocation.expiryDate?.getTime());
      expect(saved.reservedAt.getTime()).toBe(allocation.reservedAt.getTime());
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      repository = new SqliteOrderLotAllocationRepository(mockConnection);
    });

    it('should handle very large allocated quantities', async () => {
      // Arrange
      const allocation = createTestLotAllocation({
        allocatedQuantity: 999999999.99,
      });

      const mockExistsStmt = { get: jest.fn().mockReturnValue(undefined) };
      const mockInsertStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

      mockDb.prepare.mockReturnValueOnce(mockExistsStmt).mockReturnValueOnce(mockInsertStmt);

      // Act
      const saved = await repository.save(allocation);

      // Assert
      expect(saved.allocatedQuantity).toBe(allocation.allocatedQuantity);
    });

    it('should handle very small allocated quantities', async () => {
      // Arrange
      const allocation = createTestLotAllocation({
        allocatedQuantity: 0.01,
      });

      const mockExistsStmt = { get: jest.fn().mockReturnValue(undefined) };
      const mockInsertStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

      mockDb.prepare.mockReturnValueOnce(mockExistsStmt).mockReturnValueOnce(mockInsertStmt);

      // Act
      const saved = await repository.save(allocation);

      // Assert
      expect(saved.allocatedQuantity).toBe(allocation.allocatedQuantity);
    });

    it('should preserve proper error handling for database failures', async () => {
      // Arrange
      const allocation = createTestLotAllocation();

      // Mock prepare to throw error on first call (existsByOrderItemAndLot check)
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Act & Assert
      await expect(repository.save(allocation)).rejects.toThrow(OrderLotAllocationRepositoryError);
      await expect(repository.save(allocation)).rejects.toThrow('Failed to check allocation existence');
    });
  });
});
