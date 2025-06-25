/**
 * @fileoverview Step 3B Tests: FIFO and Quantity Management Operations
 *
 * Tests for lot/batch repository FIFO (First In, First Out) operations and quantity management,
 * including reservations, consumption, and quantity adjustments.
 *
 * This follows the incremental testing approach with comprehensive coverage
 * of all business logic, error scenarios, and edge cases.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Database } from 'better-sqlite3';

import { SqliteLotBatchRepository } from '../lot-batch.repository';
import { LotBatch, LotStatus, type LotBatchPersistence } from '../../../domain/value-objects/lot-batch';
import { type DatabaseConnection } from '../../../infrastructure/database/connection';
import {
  LotBatchRepositoryError,
  LotBatchNotFoundError,
  InsufficientLotQuantityError,
  type FifoLotSelectionCriteria,
  type FifoLotSelectionResult,
  type LotQuantityAdjustment,
} from '../../../domain/repositories/lot-batch.repository';

// Test data constants
const TEST_PRODUCT_ID = 'product-123';
const TEST_AGENCY_ID = 'agency-456';
const TEST_USER_ID = 'user-789';
const TEST_LOT_ID_1 = 'lot-001';
const TEST_LOT_ID_2 = 'lot-002';
const TEST_LOT_ID_3 = 'lot-003';

// Mock database row structure
interface MockLotBatchRow {
  id: string;
  lot_number: string;
  batch_number: string | null;
  product_id: string;
  agency_id: string;
  manufacturing_date: number;
  expiry_date: number | null;
  quantity: number;
  remaining_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  status: string;
  supplier_id: string | null;
  supplier_lot_code: string | null;
  notes: string | null;
  created_by: string;
  created_at: number;
  updated_by: string | null;
  updated_at: number | null;
}

/**
 * Create test lot/batch entity
 */
function createTestLotBatch(overrides: Partial<LotBatchPersistence> = {}): LotBatch {
  const now = new Date();
  const manufacturingDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

  const defaults: LotBatchPersistence = {
    id: overrides.id || TEST_LOT_ID_1,
    lotNumber: overrides.lotNumber || 'LOT-001',
    batchNumber: overrides.batchNumber || 'BATCH-001',
    productId: overrides.productId || TEST_PRODUCT_ID,
    agencyId: overrides.agencyId || TEST_AGENCY_ID,
    manufacturingDate: overrides.manufacturingDate || manufacturingDate,
    expiryDate: overrides.expiryDate || expiryDate,
    quantity: overrides.quantity || 1000,
    remainingQuantity: overrides.remainingQuantity || 800,
    reservedQuantity: overrides.reservedQuantity || 0,
    availableQuantity: (overrides.remainingQuantity || 800) - (overrides.reservedQuantity || 0),
    status: overrides.status || LotStatus.ACTIVE,
    supplierId: overrides.supplierId || null,
    supplierLotCode: overrides.supplierLotCode || null,
    notes: overrides.notes || null,
    createdBy: overrides.createdBy || TEST_USER_ID,
    createdAt: overrides.createdAt || now,
    updatedBy: overrides.updatedBy || null,
    updatedAt: overrides.updatedAt || null,
  };

  return LotBatch.fromPersistence({ ...defaults, ...overrides });
}

/**
 * Create mock database row
 */
function createMockDbRow(overrides: Partial<MockLotBatchRow> = {}): MockLotBatchRow {
  const now = Date.now();
  const manufacturingDate = Math.floor((now - 30 * 24 * 60 * 60 * 1000) / 1000);
  const expiryDate = Math.floor((now + 365 * 24 * 60 * 60 * 1000) / 1000);

  return {
    id: overrides.id || TEST_LOT_ID_1,
    lot_number: overrides.lot_number || 'LOT-001',
    batch_number: overrides.batch_number || 'BATCH-001',
    product_id: overrides.product_id || TEST_PRODUCT_ID,
    agency_id: overrides.agency_id || TEST_AGENCY_ID,
    manufacturing_date: overrides.manufacturing_date || manufacturingDate,
    expiry_date: overrides.expiry_date || expiryDate,
    quantity: overrides.quantity || 1000,
    remaining_quantity: overrides.remaining_quantity || 800,
    reserved_quantity: overrides.reserved_quantity || 0,
    available_quantity: overrides.available_quantity || 800,
    status: overrides.status || 'ACTIVE',
    supplier_id: overrides.supplier_id || null,
    supplier_lot_code: overrides.supplier_lot_code || null,
    notes: overrides.notes || null,
    created_by: overrides.created_by || TEST_USER_ID,
    created_at: overrides.created_at || Math.floor(now / 1000),
    updated_by: overrides.updated_by || null,
    updated_at: overrides.updated_at || null,
    ...overrides,
  };
}

describe('SqliteLotBatchRepository - Step 3B: FIFO and Quantity Management', () => {
  let repository: SqliteLotBatchRepository;
  let mockDb: jest.Mocked<Database>;
  let mockConnection: jest.Mocked<DatabaseConnection>;
  let mockPreparedStatement: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock prepared statement
    mockPreparedStatement = {
      get: jest.fn(),
      all: jest.fn(),
      run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
    };

    // Create mock database
    mockDb = {
      prepare: jest.fn().mockReturnValue(mockPreparedStatement),
      transaction: jest.fn(),
      exec: jest.fn(),
      close: jest.fn(),
      name: 'test.db',
      open: true,
      inTransaction: false,
      readonly: false,
      memory: false,
    } as any;

    // Create mock connection
    mockConnection = {
      getDatabase: jest.fn().mockReturnValue(mockDb),
      isHealthy: jest.fn().mockReturnValue(true),
      close: jest.fn(),
    } as any;

    // Create repository instance
    repository = new SqliteLotBatchRepository(mockConnection);
  });

  describe('findFifoOrder', () => {
    it('should find lots in FIFO order successfully', async () => {
      // Arrange
      const mockRows = [
        createMockDbRow({
          id: TEST_LOT_ID_1,
          lot_number: 'LOT-001',
          manufacturing_date: Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000), // 60 days ago
          available_quantity: 500,
        }),
        createMockDbRow({
          id: TEST_LOT_ID_2,
          lot_number: 'LOT-002',
          manufacturing_date: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000), // 30 days ago
          available_quantity: 300,
        }),
      ];

      mockPreparedStatement.all.mockReturnValue(mockRows);

      // Act
      const result = await repository.findFifoOrder(TEST_PRODUCT_ID, TEST_AGENCY_ID, 100);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].lotNumber).toBe('LOT-001'); // Older lot first
      expect(result[1].lotNumber).toBe('LOT-002'); // Newer lot second

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY manufacturing_date ASC, lot_number ASC')
      );
      expect(mockPreparedStatement.all).toHaveBeenCalledWith(TEST_PRODUCT_ID, TEST_AGENCY_ID, 'ACTIVE', 100);
    });

    it('should apply default limit when not specified', async () => {
      // Arrange
      mockPreparedStatement.all.mockReturnValue([]);

      // Act
      await repository.findFifoOrder(TEST_PRODUCT_ID, TEST_AGENCY_ID);

      // Assert
      expect(mockPreparedStatement.all).toHaveBeenCalledWith(
        TEST_PRODUCT_ID,
        TEST_AGENCY_ID,
        'ACTIVE',
        1000 // Default limit
      );
    });

    it('should throw error when productId is missing', async () => {
      // Act & Assert
      await expect(repository.findFifoOrder('', TEST_AGENCY_ID)).rejects.toThrow(
        new LotBatchRepositoryError('Product ID and agency ID are required', 'findFifoOrder')
      );
    });

    it('should throw error when agencyId is missing', async () => {
      // Act & Assert
      await expect(repository.findFifoOrder(TEST_PRODUCT_ID, '')).rejects.toThrow(
        new LotBatchRepositoryError('Product ID and agency ID are required', 'findFifoOrder')
      );
    });

    it('should throw error when limit exceeds maximum', async () => {
      // Act & Assert
      await expect(repository.findFifoOrder(TEST_PRODUCT_ID, TEST_AGENCY_ID, 15000)).rejects.toThrow(
        new LotBatchRepositoryError('Limit cannot exceed 10000 records', 'findFifoOrder')
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockPreparedStatement.all.mockImplementation(() => {
        throw dbError;
      });

      // Act & Assert
      await expect(repository.findFifoOrder(TEST_PRODUCT_ID, TEST_AGENCY_ID)).rejects.toThrow(
        new LotBatchRepositoryError(
          'Failed to find lot/batches in FIFO order: Database connection failed',
          'findFifoOrder',
          dbError
        )
      );
    });
  });

  describe('selectFifoLots', () => {
    it('should select lots to fulfill requested quantity', async () => {
      // Arrange
      const criteria: FifoLotSelectionCriteria = {
        productId: TEST_PRODUCT_ID,
        agencyId: TEST_AGENCY_ID,
        requestedQuantity: 800,
      };

      const mockRows = [
        createMockDbRow({
          id: TEST_LOT_ID_1,
          lot_number: 'LOT-001',
          manufacturing_date: Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000),
          remaining_quantity: 500,
          reserved_quantity: 0,
          available_quantity: 500,
        }),
        createMockDbRow({
          id: TEST_LOT_ID_2,
          lot_number: 'LOT-002',
          manufacturing_date: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000),
          remaining_quantity: 400,
          reserved_quantity: 0,
          available_quantity: 400,
        }),
      ];

      mockPreparedStatement.all.mockReturnValue(mockRows);

      // Act
      const result = await repository.selectFifoLots(criteria);

      // Assert
      expect(result.hasFullAllocation).toBe(true);
      expect(result.totalAllocatedQuantity).toBe(800);
      expect(result.remainingQuantity).toBe(0);
      expect(result.selectedLots).toHaveLength(2);
      expect(result.selectedLots[0].allocatedQuantity).toBe(500); // Full lot 1
      expect(result.selectedLots[1].allocatedQuantity).toBe(300); // Partial lot 2
    });

    it('should handle partial allocation when insufficient quantity', async () => {
      // Arrange
      const criteria: FifoLotSelectionCriteria = {
        productId: TEST_PRODUCT_ID,
        agencyId: TEST_AGENCY_ID,
        requestedQuantity: 1000,
      };

      const mockRows = [
        createMockDbRow({
          id: TEST_LOT_ID_1,
          remaining_quantity: 300,
          reserved_quantity: 0,
          available_quantity: 300,
        }),
      ];

      mockPreparedStatement.all.mockReturnValue(mockRows);

      // Act
      const result = await repository.selectFifoLots(criteria);

      // Assert
      expect(result.hasFullAllocation).toBe(false);
      expect(result.totalAllocatedQuantity).toBe(300);
      expect(result.remainingQuantity).toBe(700);
      expect(result.selectedLots).toHaveLength(1);
    });

    it('should throw error when productId is missing', async () => {
      // Arrange
      const criteria: FifoLotSelectionCriteria = {
        productId: '',
        agencyId: TEST_AGENCY_ID,
        requestedQuantity: 100,
      };

      // Act & Assert
      await expect(repository.selectFifoLots(criteria)).rejects.toThrow(
        new LotBatchRepositoryError('Product ID and agency ID are required', 'selectFifoLots')
      );
    });

    it('should throw error when requestedQuantity is zero or negative', async () => {
      // Arrange - Test with zero quantity
      const criteria: FifoLotSelectionCriteria = {
        productId: TEST_PRODUCT_ID,
        agencyId: TEST_AGENCY_ID,
        requestedQuantity: 0,
      };

      // Act & Assert
      await expect(repository.selectFifoLots(criteria)).rejects.toThrow(
        new LotBatchRepositoryError('Requested quantity must be greater than 0', 'selectFifoLots')
      );
    });
  });

  describe('reserveQuantity', () => {
    it('should reserve quantity successfully', async () => {
      // Arrange
      const currentLot = createTestLotBatch({
        id: TEST_LOT_ID_1,
        remainingQuantity: 800,
        reservedQuantity: 100,
        status: LotStatus.ACTIVE,
      });

      const updatedLot = createTestLotBatch({
        id: TEST_LOT_ID_1,
        remainingQuantity: 800,
        reservedQuantity: 200, // 100 + 100 reserved
        status: LotStatus.ACTIVE,
      });

      // Mock findById calls
      jest
        .spyOn(repository, 'findById')
        .mockResolvedValueOnce(currentLot) // First call for validation
        .mockResolvedValueOnce(updatedLot); // Second call for result

      // Act
      const result = await repository.reserveQuantity(TEST_LOT_ID_1, 100, TEST_USER_ID);

      // Assert
      expect(result.reservedQuantity).toBe(200);
      expect(mockPreparedStatement.run).toHaveBeenCalledWith(
        200, // new reserved quantity
        TEST_USER_ID,
        expect.any(Number), // timestamp
        TEST_LOT_ID_1
      );
    });

    it('should throw error when lot not found', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(repository.reserveQuantity(TEST_LOT_ID_1, 100, TEST_USER_ID)).rejects.toThrow(
        new LotBatchNotFoundError(TEST_LOT_ID_1, 'reserveQuantity')
      );
    });

    it('should throw error when insufficient quantity available', async () => {
      // Arrange
      const currentLot = createTestLotBatch({
        remainingQuantity: 100,
        reservedQuantity: 50, // Available = 100 - 50 = 50
        status: LotStatus.ACTIVE,
      });

      jest.spyOn(repository, 'findById').mockResolvedValue(currentLot);

      // Act & Assert
      await expect(repository.reserveQuantity(TEST_LOT_ID_1, 100, TEST_USER_ID)).rejects.toThrow(
        new InsufficientLotQuantityError(TEST_LOT_ID_1, 100, 50)
      );
    });

    it('should throw error when lot is not active', async () => {
      // Arrange
      const currentLot = createTestLotBatch({
        status: LotStatus.EXPIRED,
      });

      jest.spyOn(repository, 'findById').mockResolvedValue(currentLot);

      // Act & Assert
      await expect(repository.reserveQuantity(TEST_LOT_ID_1, 100, TEST_USER_ID)).rejects.toThrow(
        new LotBatchRepositoryError('Cannot reserve quantity from lot with status: EXPIRED', 'reserveQuantity')
      );
    });

    it('should throw error with invalid parameters', async () => {
      // Act & Assert - Missing lotBatchId
      await expect(repository.reserveQuantity('', 100, TEST_USER_ID)).rejects.toThrow(
        new LotBatchRepositoryError('Lot/batch ID and user ID are required', 'reserveQuantity')
      );

      // Act & Assert - Missing userId
      await expect(repository.reserveQuantity(TEST_LOT_ID_1, 100, '')).rejects.toThrow(
        new LotBatchRepositoryError('Lot/batch ID and user ID are required', 'reserveQuantity')
      );

      // Act & Assert - Invalid quantity
      await expect(repository.reserveQuantity(TEST_LOT_ID_1, 0, TEST_USER_ID)).rejects.toThrow(
        new LotBatchRepositoryError('Quantity must be greater than 0', 'reserveQuantity')
      );
    });
  });

  describe('releaseReservedQuantity', () => {
    it('should release reserved quantity successfully', async () => {
      // Arrange
      const currentLot = createTestLotBatch({
        reservedQuantity: 200,
      });

      const updatedLot = createTestLotBatch({
        reservedQuantity: 100, // 200 - 100 released
      });

      jest.spyOn(repository, 'findById').mockResolvedValueOnce(currentLot).mockResolvedValueOnce(updatedLot);

      // Act
      const result = await repository.releaseReservedQuantity(TEST_LOT_ID_1, 100, TEST_USER_ID);

      // Assert
      expect(result.reservedQuantity).toBe(100);
      expect(mockPreparedStatement.run).toHaveBeenCalledWith(
        100, // new reserved quantity
        TEST_USER_ID,
        expect.any(Number),
        TEST_LOT_ID_1
      );
    });

    it('should throw error when trying to release more than reserved', async () => {
      // Arrange
      const currentLot = createTestLotBatch({
        reservedQuantity: 50, // Less than requested release of 100
      });

      jest.spyOn(repository, 'findById').mockResolvedValue(currentLot);

      // Act & Assert
      await expect(repository.releaseReservedQuantity(TEST_LOT_ID_1, 100, TEST_USER_ID)).rejects.toThrow(
        new LotBatchRepositoryError('Cannot release 100 units. Only 50 units are reserved', 'releaseReservedQuantity')
      );
    });
  });

  describe('consumeQuantity', () => {
    it('should consume quantity successfully', async () => {
      // Arrange
      const currentLot = createTestLotBatch({
        remainingQuantity: 500,
        reservedQuantity: 100,
        status: LotStatus.ACTIVE,
      });

      const updatedLot = createTestLotBatch({
        remainingQuantity: 400, // 500 - 100 consumed
        reservedQuantity: 0, // All reserved quantity consumed
      });

      jest.spyOn(repository, 'findById').mockResolvedValueOnce(currentLot).mockResolvedValueOnce(updatedLot);

      // Act
      const result = await repository.consumeQuantity(TEST_LOT_ID_1, 100, TEST_USER_ID);

      // Assert
      expect(result.remainingQuantity).toBe(400);
      expect(result.reservedQuantity).toBe(0);
      expect(mockPreparedStatement.run).toHaveBeenCalledWith(
        400, // new remaining quantity
        0, // new reserved quantity
        TEST_USER_ID,
        expect.any(Number),
        TEST_LOT_ID_1
      );
    });

    it('should handle partial consumption from reserved quantity', async () => {
      // Arrange
      const currentLot = createTestLotBatch({
        remainingQuantity: 500,
        reservedQuantity: 200,
        status: LotStatus.ACTIVE,
      });

      const updatedLot = createTestLotBatch({
        remainingQuantity: 400, // 500 - 100 consumed
        reservedQuantity: 100, // 200 - 100 from reserved
      });

      jest.spyOn(repository, 'findById').mockResolvedValueOnce(currentLot).mockResolvedValueOnce(updatedLot);

      // Act
      const result = await repository.consumeQuantity(TEST_LOT_ID_1, 100, TEST_USER_ID);

      // Assert
      expect(result.remainingQuantity).toBe(400);
      expect(result.reservedQuantity).toBe(100);
    });

    it('should throw error when insufficient remaining quantity', async () => {
      // Arrange
      const currentLot = createTestLotBatch({
        remainingQuantity: 50, // Less than requested 100
        status: LotStatus.ACTIVE,
      });

      jest.spyOn(repository, 'findById').mockResolvedValue(currentLot);

      // Act & Assert
      await expect(repository.consumeQuantity(TEST_LOT_ID_1, 100, TEST_USER_ID)).rejects.toThrow(
        new InsufficientLotQuantityError(TEST_LOT_ID_1, 100, 50)
      );
    });
  });

  describe('adjustQuantity', () => {
    it('should increase quantity successfully', async () => {
      // Arrange
      const adjustment: LotQuantityAdjustment = {
        lotBatchId: TEST_LOT_ID_1,
        quantityChange: 200,
        reason: 'Stock replenishment',
        adjustedBy: TEST_USER_ID,
      };

      const currentLot = createTestLotBatch({
        quantity: 1000,
        remainingQuantity: 800,
        reservedQuantity: 100,
      });

      const updatedLot = createTestLotBatch({
        quantity: 1200, // 1000 + 200
        remainingQuantity: 1000, // 800 + 200
      });

      jest.spyOn(repository, 'findById').mockResolvedValueOnce(currentLot).mockResolvedValueOnce(updatedLot);

      // Act
      const result = await repository.adjustQuantity(adjustment);

      // Assert
      expect(result.quantity).toBe(1200);
      expect(result.remainingQuantity).toBe(1000);
      expect(mockPreparedStatement.run).toHaveBeenCalledWith(
        1200, // new quantity
        1000, // new remaining quantity
        TEST_USER_ID,
        expect.any(Number),
        TEST_LOT_ID_1
      );
    });

    it('should decrease quantity successfully', async () => {
      // Arrange
      const adjustment: LotQuantityAdjustment = {
        lotBatchId: TEST_LOT_ID_1,
        quantityChange: -100,
        reason: 'Damage writeoff',
        adjustedBy: TEST_USER_ID,
      };

      const currentLot = createTestLotBatch({
        quantity: 1000,
        remainingQuantity: 800,
        reservedQuantity: 100,
      });

      const updatedLot = createTestLotBatch({
        quantity: 900, // 1000 - 100
        remainingQuantity: 700, // 800 - 100
      });

      jest.spyOn(repository, 'findById').mockResolvedValueOnce(currentLot).mockResolvedValueOnce(updatedLot);

      // Act
      const result = await repository.adjustQuantity(adjustment);

      // Assert
      expect(result.quantity).toBe(900);
      expect(result.remainingQuantity).toBe(700);
    });

    it('should throw error when adjustment would make quantity negative', async () => {
      // Arrange
      const adjustment: LotQuantityAdjustment = {
        lotBatchId: TEST_LOT_ID_1,
        quantityChange: -1500, // More than current quantity
        reason: 'Test negative adjustment',
        adjustedBy: TEST_USER_ID,
      };

      const currentLot = createTestLotBatch({
        quantity: 1000,
      });

      jest.spyOn(repository, 'findById').mockResolvedValue(currentLot);

      // Act & Assert
      await expect(repository.adjustQuantity(adjustment)).rejects.toThrow(
        new LotBatchRepositoryError('Adjusted quantity cannot be negative', 'adjustQuantity')
      );
    });

    it('should throw error when remaining quantity would be less than reserved', async () => {
      // Arrange
      const adjustment: LotQuantityAdjustment = {
        lotBatchId: TEST_LOT_ID_1,
        quantityChange: -600, // Would make remaining quantity 200, but reserved is 300
        reason: 'Test invalid adjustment',
        adjustedBy: TEST_USER_ID,
      };

      const currentLot = createTestLotBatch({
        quantity: 1000,
        remainingQuantity: 800,
        reservedQuantity: 300,
      });

      jest.spyOn(repository, 'findById').mockResolvedValue(currentLot);

      // Act & Assert
      await expect(repository.adjustQuantity(adjustment)).rejects.toThrow(
        new LotBatchRepositoryError(
          'Adjusted remaining quantity cannot be less than reserved quantity',
          'adjustQuantity'
        )
      );
    });

    it('should throw error with invalid parameters', async () => {
      // Act & Assert - Missing lotBatchId
      const invalidAdjustment1: LotQuantityAdjustment = {
        lotBatchId: '',
        quantityChange: 100,
        reason: 'Test',
        adjustedBy: TEST_USER_ID,
      };
      await expect(repository.adjustQuantity(invalidAdjustment1)).rejects.toThrow(
        new LotBatchRepositoryError('Lot/batch ID and adjustedBy user ID are required', 'adjustQuantity')
      );

      // Act & Assert - Zero quantity change
      const invalidAdjustment2: LotQuantityAdjustment = {
        lotBatchId: TEST_LOT_ID_1,
        quantityChange: 0,
        reason: 'Test',
        adjustedBy: TEST_USER_ID,
      };
      await expect(repository.adjustQuantity(invalidAdjustment2)).rejects.toThrow(
        new LotBatchRepositoryError('Quantity change cannot be zero', 'adjustQuantity')
      );
    });

    it('should handle database errors in adjustQuantity', async () => {
      // Arrange
      const adjustment: LotQuantityAdjustment = {
        lotBatchId: TEST_LOT_ID_1,
        quantityChange: 100,
        reason: 'Test',
        adjustedBy: TEST_USER_ID,
      };

      const currentLot = createTestLotBatch();
      jest.spyOn(repository, 'findById').mockResolvedValue(currentLot);

      const dbError = new Error('Database update failed');
      mockPreparedStatement.run.mockImplementation(() => {
        throw dbError;
      });

      // Act & Assert
      await expect(repository.adjustQuantity(adjustment)).rejects.toThrow(
        new LotBatchRepositoryError('Failed to adjust quantity: Database update failed', 'adjustQuantity', dbError)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      // Arrange
      const dbError = new Error('Connection lost');
      mockDb.prepare.mockImplementation(() => {
        throw dbError;
      });

      // Act & Assert
      await expect(repository.findFifoOrder(TEST_PRODUCT_ID, TEST_AGENCY_ID)).rejects.toThrow(LotBatchRepositoryError);
    });

    it('should handle SQL syntax errors', async () => {
      // Arrange
      const sqlError = new Error('SQL syntax error');
      mockPreparedStatement.all.mockImplementation(() => {
        throw sqlError;
      });

      // Act & Assert
      await expect(repository.findFifoOrder(TEST_PRODUCT_ID, TEST_AGENCY_ID)).rejects.toThrow(
        new LotBatchRepositoryError(
          'Failed to find lot/batches in FIFO order: SQL syntax error',
          'findFifoOrder',
          sqlError
        )
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty result sets', async () => {
      // Arrange
      mockPreparedStatement.all.mockReturnValue([]);

      const criteria: FifoLotSelectionCriteria = {
        productId: TEST_PRODUCT_ID,
        agencyId: TEST_AGENCY_ID,
        requestedQuantity: 100,
      };

      // Act
      const result = await repository.selectFifoLots(criteria);

      // Assert
      expect(result.selectedLots).toHaveLength(0);
      expect(result.hasFullAllocation).toBe(false);
      expect(result.totalAllocatedQuantity).toBe(0);
      expect(result.remainingQuantity).toBe(100);
    });

    it('should handle lots with zero available quantity', async () => {
      // Arrange
      const mockRows = [
        createMockDbRow({
          id: TEST_LOT_ID_1,
          remaining_quantity: 100,
          reserved_quantity: 100,
          available_quantity: 0,
        }),
        createMockDbRow({
          id: TEST_LOT_ID_2,
          remaining_quantity: 500,
          reserved_quantity: 0,
          available_quantity: 500,
        }),
      ];

      mockPreparedStatement.all.mockReturnValue(mockRows);

      const criteria: FifoLotSelectionCriteria = {
        productId: TEST_PRODUCT_ID,
        agencyId: TEST_AGENCY_ID,
        requestedQuantity: 300,
      };

      // Act
      const result = await repository.selectFifoLots(criteria);

      // Assert
      // Should only allocate from the second lot since first has 0 available
      expect(result.selectedLots).toHaveLength(1);
      expect(result.selectedLots[0].lotBatch.id).toBe(TEST_LOT_ID_2);
      expect(result.selectedLots[0].allocatedQuantity).toBe(300);
    });
  });
});
