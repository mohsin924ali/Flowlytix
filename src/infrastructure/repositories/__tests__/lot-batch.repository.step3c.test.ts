/**
 * Lot Batch Repository Infrastructure Implementation Tests - Step 3C: Advanced Operations
 *
 * This test suite validates the advanced operations functionality of the SqliteLotBatchRepository
 * including status updates, deletion, statistics, expiry management, and quantity aggregation.
 *
 * Test Categories:
 * 1. Status Updates (updateStatus)
 * 2. Hard Deletion (delete)
 * 3. Repository Statistics (getStats)
 * 4. Automatic Expiry Management (expireOverdueLots)
 * 5. Product Quantity Aggregation (getAvailableQuantityForProduct, getReservedQuantityForProduct)
 *
 * Coverage: 100% of Step 3C operations
 */

import { DatabaseConnection } from '../../database/connection';
import { SqliteLotBatchRepository } from '../lot-batch.repository';
import {
  LotBatchRepositoryError,
  LotBatchNotFoundError,
  type LotBatchRepositoryStats,
} from '../../../domain/repositories/lot-batch.repository';
import { LotBatch, LotStatus } from '../../../domain/value-objects/lot-batch';

// Mock dependencies
const mockDb = {
  prepare: jest.fn(),
  close: jest.fn(),
  exec: jest.fn(),
} as any;

const mockConnection = {
  getDatabase: jest.fn().mockReturnValue(mockDb),
  isConnected: jest.fn().mockReturnValue(true),
} as any;

// Mock statement for database operations
const createMockStatement = (returnValue?: any, runResult?: any) => ({
  get: jest.fn().mockReturnValue(returnValue),
  all: jest.fn().mockReturnValue(returnValue || []),
  run: jest.fn().mockReturnValue(runResult || { changes: 1, lastInsertRowid: 1 }),
});

// Helper function to create test lot batch
const createTestLotBatch = (overrides: Partial<any> = {}): LotBatch => {
  return LotBatch.fromPersistence({
    id: 'test-lot-id',
    lotNumber: 'LOT-001',
    batchNumber: 'BATCH-001',
    productId: 'product-1',
    agencyId: 'agency-1',
    manufacturingDate: new Date('2024-01-01'),
    expiryDate: new Date('2024-12-31'),
    quantity: 100,
    remainingQuantity: 80,
    reservedQuantity: 10,
    availableQuantity: 70, // remainingQuantity - reservedQuantity
    status: LotStatus.ACTIVE,
    supplierId: 'supplier-1',
    supplierLotCode: 'SUP-LOT-001',
    notes: 'Test lot',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedBy: 'user-1',
    updatedAt: new Date('2024-01-02'),
    ...overrides,
  });
};

describe('SqliteLotBatchRepository - Step 3C: Advanced Operations', () => {
  let repository: SqliteLotBatchRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SqliteLotBatchRepository(mockConnection);
  });

  describe('updateStatus', () => {
    it('should update lot status successfully', async () => {
      const testLot = createTestLotBatch();
      const mockStatement = createMockStatement(testLot);

      // Mock findById to return existing lot
      const findByIdStmt = createMockStatement({
        id: 'test-lot-id',
        lot_number: 'LOT-001',
        batch_number: 'BATCH-001',
        product_id: 'product-1',
        agency_id: 'agency-1',
        manufacturing_date: Math.floor(new Date('2024-01-01').getTime() / 1000),
        expiry_date: Math.floor(new Date('2024-12-31').getTime() / 1000),
        quantity: 100,
        remaining_quantity: 80,
        reserved_quantity: 10,
        available_quantity: 70,
        status: 'ACTIVE',
        supplier_id: 'supplier-1',
        supplier_lot_code: 'SUP-LOT-001',
        notes: 'Test lot',
        created_by: 'user-1',
        created_at: Math.floor(new Date('2024-01-01').getTime() / 1000),
        updated_by: 'user-1',
        updated_at: Math.floor(new Date('2024-01-02').getTime() / 1000),
      });

      mockDb.prepare
        .mockReturnValueOnce(findByIdStmt) // First call: findById
        .mockReturnValueOnce(mockStatement) // Second call: update
        .mockReturnValueOnce(findByIdStmt); // Third call: findById after update

      const result = await repository.updateStatus('test-lot-id', LotStatus.QUARANTINE, 'user-1');

      expect(result).toBeInstanceOf(LotBatch);
      expect(result.status).toBe(LotStatus.ACTIVE); // From mock return
      expect(mockDb.prepare).toHaveBeenCalledTimes(3);
      expect(mockStatement.run).toHaveBeenCalledWith('QUARANTINE', 'user-1', expect.any(Number), 'test-lot-id');
    });

    it('should throw error for invalid status transition', async () => {
      const testLot = createTestLotBatch({ status: LotStatus.CONSUMED });
      const findByIdStmt = createMockStatement({
        id: 'test-lot-id',
        lot_number: 'LOT-001',
        batch_number: 'BATCH-001',
        product_id: 'product-1',
        agency_id: 'agency-1',
        manufacturing_date: Math.floor(new Date('2024-01-01').getTime() / 1000),
        expiry_date: Math.floor(new Date('2024-12-31').getTime() / 1000),
        quantity: 100,
        remaining_quantity: 0,
        reserved_quantity: 0,
        available_quantity: 0,
        status: 'CONSUMED',
        supplier_id: 'supplier-1',
        supplier_lot_code: 'SUP-LOT-001',
        notes: 'Test lot',
        created_by: 'user-1',
        created_at: Math.floor(new Date('2024-01-01').getTime() / 1000),
        updated_by: 'user-1',
        updated_at: Math.floor(new Date('2024-01-02').getTime() / 1000),
      });

      mockDb.prepare.mockReturnValueOnce(findByIdStmt);

      await expect(repository.updateStatus('test-lot-id', LotStatus.ACTIVE, 'user-1')).rejects.toThrow(
        LotBatchRepositoryError
      );

      expect(mockDb.prepare).toHaveBeenCalledTimes(1);
    });

    it('should throw error when trying to mark lot with remaining quantity as CONSUMED', async () => {
      const testLot = createTestLotBatch({ remainingQuantity: 50 });
      const findByIdStmt = createMockStatement({
        id: 'test-lot-id',
        lot_number: 'LOT-001',
        batch_number: 'BATCH-001',
        product_id: 'product-1',
        agency_id: 'agency-1',
        manufacturing_date: Math.floor(new Date('2024-01-01').getTime() / 1000),
        expiry_date: Math.floor(new Date('2024-12-31').getTime() / 1000),
        quantity: 100,
        remaining_quantity: 50,
        reserved_quantity: 10,
        available_quantity: 40,
        status: 'ACTIVE',
        supplier_id: 'supplier-1',
        supplier_lot_code: 'SUP-LOT-001',
        notes: 'Test lot',
        created_by: 'user-1',
        created_at: Math.floor(new Date('2024-01-01').getTime() / 1000),
        updated_by: 'user-1',
        updated_at: Math.floor(new Date('2024-01-02').getTime() / 1000),
      });

      mockDb.prepare.mockReturnValueOnce(findByIdStmt);

      await expect(repository.updateStatus('test-lot-id', LotStatus.CONSUMED, 'user-1')).rejects.toThrow(
        'Cannot mark lot as CONSUMED while remaining quantity is 50'
      );
    });

    it('should throw error when trying to mark expired lot as ACTIVE', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const findByIdStmt = createMockStatement({
        id: 'test-lot-id',
        lot_number: 'LOT-001',
        batch_number: 'BATCH-001',
        product_id: 'product-1',
        agency_id: 'agency-1',
        manufacturing_date: Math.floor(new Date('2024-01-01').getTime() / 1000),
        expiry_date: Math.floor(expiredDate.getTime() / 1000),
        quantity: 100,
        remaining_quantity: 50,
        reserved_quantity: 10,
        available_quantity: 40,
        status: 'EXPIRED',
        supplier_id: 'supplier-1',
        supplier_lot_code: 'SUP-LOT-001',
        notes: 'Test lot',
        created_by: 'user-1',
        created_at: Math.floor(new Date('2024-01-01').getTime() / 1000),
        updated_by: 'user-1',
        updated_at: Math.floor(new Date('2024-01-02').getTime() / 1000),
      });

      mockDb.prepare.mockReturnValueOnce(findByIdStmt);

      await expect(repository.updateStatus('test-lot-id', LotStatus.ACTIVE, 'user-1')).rejects.toThrow(
        'Invalid status transition from EXPIRED to ACTIVE'
      );
    });

    it('should throw error for missing required parameters', async () => {
      await expect(repository.updateStatus('', LotStatus.ACTIVE, 'user-1')).rejects.toThrow(
        'Lot/batch ID and user ID are required'
      );

      await expect(repository.updateStatus('test-id', LotStatus.ACTIVE, '')).rejects.toThrow(
        'Lot/batch ID and user ID are required'
      );
    });

    it('should throw error when lot not found', async () => {
      const findByIdStmt = createMockStatement(null);
      mockDb.prepare.mockReturnValueOnce(findByIdStmt);

      await expect(repository.updateStatus('nonexistent-id', LotStatus.QUARANTINE, 'user-1')).rejects.toThrow(
        LotBatchNotFoundError
      );
    });
  });

  describe('delete', () => {
    it('should delete lot successfully when conditions are met', async () => {
      const testLot = createTestLotBatch({
        status: LotStatus.CONSUMED,
        remainingQuantity: 0,
        reservedQuantity: 0,
      });

      const findByIdStmt = createMockStatement({
        id: 'test-lot-id',
        lot_number: 'LOT-001',
        batch_number: 'BATCH-001',
        product_id: 'product-1',
        agency_id: 'agency-1',
        manufacturing_date: Math.floor(new Date('2024-01-01').getTime() / 1000),
        expiry_date: Math.floor(new Date('2024-12-31').getTime() / 1000),
        quantity: 100,
        remaining_quantity: 0,
        reserved_quantity: 0,
        available_quantity: 0,
        status: 'CONSUMED',
        supplier_id: 'supplier-1',
        supplier_lot_code: 'SUP-LOT-001',
        notes: 'Test lot',
        created_by: 'user-1',
        created_at: Math.floor(new Date('2024-01-01').getTime() / 1000),
        updated_by: 'user-1',
        updated_at: Math.floor(new Date('2024-01-02').getTime() / 1000),
      });

      const deleteStmt = createMockStatement(null, { changes: 1 });

      mockDb.prepare
        .mockReturnValueOnce(findByIdStmt) // findById call
        .mockReturnValueOnce(deleteStmt); // delete call

      const result = await repository.delete('test-lot-id');

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledTimes(2);
      expect(deleteStmt.run).toHaveBeenCalledWith('test-lot-id');
    });

    it('should throw error when trying to delete lot with reserved quantity', async () => {
      const findByIdStmt = createMockStatement({
        id: 'test-lot-id',
        lot_number: 'LOT-001',
        batch_number: 'BATCH-001',
        product_id: 'product-1',
        agency_id: 'agency-1',
        manufacturing_date: Math.floor(new Date('2024-01-01').getTime() / 1000),
        expiry_date: Math.floor(new Date('2024-12-31').getTime() / 1000),
        quantity: 100,
        remaining_quantity: 50,
        reserved_quantity: 10,
        available_quantity: 40,
        status: 'ACTIVE',
        supplier_id: 'supplier-1',
        supplier_lot_code: 'SUP-LOT-001',
        notes: 'Test lot',
        created_by: 'user-1',
        created_at: Math.floor(new Date('2024-01-01').getTime() / 1000),
        updated_by: 'user-1',
        updated_at: Math.floor(new Date('2024-01-02').getTime() / 1000),
      });

      mockDb.prepare.mockReturnValueOnce(findByIdStmt);

      await expect(repository.delete('test-lot-id')).rejects.toThrow(
        'Cannot delete lot/batch with reserved quantity: 10'
      );
    });

    it('should throw error when trying to delete active lot with remaining quantity', async () => {
      const findByIdStmt = createMockStatement({
        id: 'test-lot-id',
        lot_number: 'LOT-001',
        batch_number: 'BATCH-001',
        product_id: 'product-1',
        agency_id: 'agency-1',
        manufacturing_date: Math.floor(new Date('2024-01-01').getTime() / 1000),
        expiry_date: Math.floor(new Date('2024-12-31').getTime() / 1000),
        quantity: 100,
        remaining_quantity: 50,
        reserved_quantity: 0,
        available_quantity: 50,
        status: 'ACTIVE',
        supplier_id: 'supplier-1',
        supplier_lot_code: 'SUP-LOT-001',
        notes: 'Test lot',
        created_by: 'user-1',
        created_at: Math.floor(new Date('2024-01-01').getTime() / 1000),
        updated_by: 'user-1',
        updated_at: Math.floor(new Date('2024-01-02').getTime() / 1000),
      });

      mockDb.prepare.mockReturnValueOnce(findByIdStmt);

      await expect(repository.delete('test-lot-id')).rejects.toThrow(
        'Cannot delete active lot/batch with remaining quantity: 50'
      );
    });

    it('should throw error when lot not found', async () => {
      const findByIdStmt = createMockStatement(null);
      mockDb.prepare.mockReturnValueOnce(findByIdStmt);

      await expect(repository.delete('nonexistent-id')).rejects.toThrow(LotBatchNotFoundError);
    });

    it('should return false when no rows affected', async () => {
      const findByIdStmt = createMockStatement({
        id: 'test-lot-id',
        lot_number: 'LOT-001',
        batch_number: 'BATCH-001',
        product_id: 'product-1',
        agency_id: 'agency-1',
        manufacturing_date: Math.floor(new Date('2024-01-01').getTime() / 1000),
        expiry_date: Math.floor(new Date('2024-12-31').getTime() / 1000),
        quantity: 100,
        remaining_quantity: 0,
        reserved_quantity: 0,
        available_quantity: 0,
        status: 'CONSUMED',
        supplier_id: 'supplier-1',
        supplier_lot_code: 'SUP-LOT-001',
        notes: 'Test lot',
        created_by: 'user-1',
        created_at: Math.floor(new Date('2024-01-01').getTime() / 1000),
        updated_by: 'user-1',
        updated_at: Math.floor(new Date('2024-01-02').getTime() / 1000),
      });

      const deleteStmt = createMockStatement(null, { changes: 0 });

      mockDb.prepare.mockReturnValueOnce(findByIdStmt).mockReturnValueOnce(deleteStmt);

      const result = await repository.delete('test-lot-id');

      expect(result).toBe(false);
    });

    it('should throw error for missing ID parameter', async () => {
      await expect(repository.delete('')).rejects.toThrow('Lot/batch ID is required');
    });
  });

  describe('getStats', () => {
    it('should return comprehensive statistics without agency filter', async () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const basicStatsRow = {
        totalLots: 100,
        activeLots: 70,
        expiredLots: 10,
        quarantineLots: 5,
        consumedLots: 15,
        totalQuantity: 10000,
        availableQuantity: 7000,
        reservedQuantity: 1000,
        oldestLotTimestamp: currentTimestamp - 365 * 24 * 60 * 60, // 1 year ago
        newestLotTimestamp: currentTimestamp,
      };

      const nearExpiryRow = { nearExpiryLots: 12 };
      const productCountRow = { productCount: 25 };

      const basicStatsStmt = createMockStatement(basicStatsRow);
      const nearExpiryStmt = createMockStatement(nearExpiryRow);
      const productCountStmt = createMockStatement(productCountRow);

      mockDb.prepare
        .mockReturnValueOnce(basicStatsStmt) // Basic stats
        .mockReturnValueOnce(nearExpiryStmt) // Near expiry
        .mockReturnValueOnce(productCountStmt); // Product count

      const result = await repository.getStats();

      expect(result).toEqual({
        totalLots: 100,
        activeLots: 70,
        expiredLots: 10,
        quarantineLots: 5,
        consumedLots: 15,
        totalQuantity: 10000,
        availableQuantity: 7000,
        reservedQuantity: 1000,
        nearExpiryLots: 12,
        averageLotsPerProduct: 4, // 100 / 25
        oldestLot: new Date(basicStatsRow.oldestLotTimestamp * 1000),
        newestLot: new Date(basicStatsRow.newestLotTimestamp * 1000),
      });
    });

    it('should return comprehensive statistics with agency filter', async () => {
      const basicStatsRow = {
        totalLots: 50,
        activeLots: 35,
        expiredLots: 5,
        quarantineLots: 3,
        consumedLots: 7,
        totalQuantity: 5000,
        availableQuantity: 3500,
        reservedQuantity: 500,
        oldestLotTimestamp: null,
        newestLotTimestamp: null,
      };

      const nearExpiryRow = { nearExpiryLots: 6 };
      const productCountRow = { productCount: 10 };

      const basicStatsStmt = createMockStatement(basicStatsRow);
      const nearExpiryStmt = createMockStatement(nearExpiryRow);
      const productCountStmt = createMockStatement(productCountRow);

      mockDb.prepare
        .mockReturnValueOnce(basicStatsStmt)
        .mockReturnValueOnce(nearExpiryStmt)
        .mockReturnValueOnce(productCountStmt);

      const result = await repository.getStats('agency-1');

      expect(result).toEqual({
        totalLots: 50,
        activeLots: 35,
        expiredLots: 5,
        quarantineLots: 3,
        consumedLots: 7,
        totalQuantity: 5000,
        availableQuantity: 3500,
        reservedQuantity: 500,
        nearExpiryLots: 6,
        averageLotsPerProduct: 5, // 50 / 10
        oldestLot: null,
        newestLot: null,
      });

      // Verify agency filter was applied
      expect(basicStatsStmt.get).toHaveBeenCalledWith('agency-1');
      expect(nearExpiryStmt.get).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'agency-1');
      expect(productCountStmt.get).toHaveBeenCalledWith('agency-1');
    });

    it('should handle zero division for average lots per product', async () => {
      const basicStatsRow = {
        totalLots: 50,
        activeLots: 35,
        expiredLots: 5,
        quarantineLots: 3,
        consumedLots: 7,
        totalQuantity: 5000,
        availableQuantity: 3500,
        reservedQuantity: 500,
        oldestLotTimestamp: null,
        newestLotTimestamp: null,
      };

      const nearExpiryRow = { nearExpiryLots: 6 };
      const productCountRow = { productCount: 0 }; // No products

      const basicStatsStmt = createMockStatement(basicStatsRow);
      const nearExpiryStmt = createMockStatement(nearExpiryRow);
      const productCountStmt = createMockStatement(productCountRow);

      mockDb.prepare
        .mockReturnValueOnce(basicStatsStmt)
        .mockReturnValueOnce(nearExpiryStmt)
        .mockReturnValueOnce(productCountStmt);

      const result = await repository.getStats();

      expect(result.averageLotsPerProduct).toBe(0);
    });

    it('should handle null/undefined values gracefully', async () => {
      const basicStatsRow = {
        totalLots: null,
        activeLots: null,
        expiredLots: null,
        quarantineLots: null,
        consumedLots: null,
        totalQuantity: null,
        availableQuantity: null,
        reservedQuantity: null,
        oldestLotTimestamp: null,
        newestLotTimestamp: null,
      };

      const nearExpiryRow = { nearExpiryLots: null };
      const productCountRow = { productCount: 0 };

      const basicStatsStmt = createMockStatement(basicStatsRow);
      const nearExpiryStmt = createMockStatement(nearExpiryRow);
      const productCountStmt = createMockStatement(productCountRow);

      mockDb.prepare
        .mockReturnValueOnce(basicStatsStmt)
        .mockReturnValueOnce(nearExpiryStmt)
        .mockReturnValueOnce(productCountStmt);

      const result = await repository.getStats();

      expect(result).toEqual({
        totalLots: 0,
        activeLots: 0,
        expiredLots: 0,
        quarantineLots: 0,
        consumedLots: 0,
        totalQuantity: 0,
        availableQuantity: 0,
        reservedQuantity: 0,
        nearExpiryLots: 0,
        averageLotsPerProduct: 0,
        oldestLot: null,
        newestLot: null,
      });
    });
  });

  describe('expireOverdueLots', () => {
    it('should expire overdue lots without agency filter', async () => {
      const updateStmt = createMockStatement(null, { changes: 5 });
      mockDb.prepare.mockReturnValueOnce(updateStmt);

      const result = await repository.expireOverdueLots();

      expect(result).toBe(5);
      expect(updateStmt.run).toHaveBeenCalledWith(
        'EXPIRED', // status
        'SYSTEM', // default user
        expect.any(Number), // timestamp
        expect.any(Number), // current timestamp
        'ACTIVE', // active status
        'QUARANTINE' // quarantine status
      );
    });

    it('should expire overdue lots with agency filter and custom user', async () => {
      const updateStmt = createMockStatement(null, { changes: 3 });
      mockDb.prepare.mockReturnValueOnce(updateStmt);

      const result = await repository.expireOverdueLots('agency-1', 'user-1');

      expect(result).toBe(3);
      expect(updateStmt.run).toHaveBeenCalledWith(
        'EXPIRED', // status
        'user-1', // custom user
        expect.any(Number), // timestamp
        expect.any(Number), // current timestamp
        'ACTIVE', // active status
        'QUARANTINE', // quarantine status
        'agency-1' // agency filter
      );
    });

    it('should return 0 when no lots need expiring', async () => {
      const updateStmt = createMockStatement(null, { changes: 0 });
      mockDb.prepare.mockReturnValueOnce(updateStmt);

      const result = await repository.expireOverdueLots();

      expect(result).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockDb.prepare.mockImplementation(() => {
        throw error;
      });

      await expect(repository.expireOverdueLots()).rejects.toThrow(LotBatchRepositoryError);
    });
  });

  describe('getAvailableQuantityForProduct', () => {
    it('should return total available quantity for product', async () => {
      const queryStmt = createMockStatement({ totalAvailable: 750 });
      mockDb.prepare.mockReturnValueOnce(queryStmt);

      const result = await repository.getAvailableQuantityForProduct('product-1', 'agency-1');

      expect(result).toBe(750);
      expect(queryStmt.get).toHaveBeenCalledWith('product-1', 'agency-1', 'ACTIVE');
    });

    it('should return 0 when no available quantity found', async () => {
      const queryStmt = createMockStatement({ totalAvailable: 0 });
      mockDb.prepare.mockReturnValueOnce(queryStmt);

      const result = await repository.getAvailableQuantityForProduct('product-1', 'agency-1');

      expect(result).toBe(0);
    });

    it('should throw error for missing parameters', async () => {
      await expect(repository.getAvailableQuantityForProduct('', 'agency-1')).rejects.toThrow(
        'Product ID and agency ID are required'
      );

      await expect(repository.getAvailableQuantityForProduct('product-1', '')).rejects.toThrow(
        'Product ID and agency ID are required'
      );
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database query failed');
      mockDb.prepare.mockImplementation(() => {
        throw error;
      });

      await expect(repository.getAvailableQuantityForProduct('product-1', 'agency-1')).rejects.toThrow(
        LotBatchRepositoryError
      );
    });
  });

  describe('getReservedQuantityForProduct', () => {
    it('should return total reserved quantity for product', async () => {
      const queryStmt = createMockStatement({ totalReserved: 250 });
      mockDb.prepare.mockReturnValueOnce(queryStmt);

      const result = await repository.getReservedQuantityForProduct('product-1', 'agency-1');

      expect(result).toBe(250);
      expect(queryStmt.get).toHaveBeenCalledWith('product-1', 'agency-1', 'ACTIVE');
    });

    it('should return 0 when no reserved quantity found', async () => {
      const queryStmt = createMockStatement({ totalReserved: 0 });
      mockDb.prepare.mockReturnValueOnce(queryStmt);

      const result = await repository.getReservedQuantityForProduct('product-1', 'agency-1');

      expect(result).toBe(0);
    });

    it('should throw error for missing parameters', async () => {
      await expect(repository.getReservedQuantityForProduct('', 'agency-1')).rejects.toThrow(
        'Product ID and agency ID are required'
      );

      await expect(repository.getReservedQuantityForProduct('product-1', '')).rejects.toThrow(
        'Product ID and agency ID are required'
      );
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database query failed');
      mockDb.prepare.mockImplementation(() => {
        throw error;
      });

      await expect(repository.getReservedQuantityForProduct('product-1', 'agency-1')).rejects.toThrow(
        LotBatchRepositoryError
      );
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors in updateStatus', async () => {
      const dbError = new Error('Database connection lost');
      mockDb.prepare.mockImplementation(() => {
        throw dbError;
      });

      await expect(repository.updateStatus('test-id', LotStatus.QUARANTINE, 'user-1')).rejects.toThrow(
        LotBatchRepositoryError
      );
    });

    it('should handle database connection errors in delete', async () => {
      const dbError = new Error('Database connection lost');
      mockDb.prepare.mockImplementation(() => {
        throw dbError;
      });

      await expect(repository.delete('test-id')).rejects.toThrow(LotBatchRepositoryError);
    });

    it('should handle database connection errors in getStats', async () => {
      const dbError = new Error('Database connection lost');
      mockDb.prepare.mockImplementation(() => {
        throw dbError;
      });

      await expect(repository.getStats()).rejects.toThrow(LotBatchRepositoryError);
    });
  });
});
