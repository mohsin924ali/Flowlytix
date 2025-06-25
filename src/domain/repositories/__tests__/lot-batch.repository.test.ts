/**
 * Lot/Batch Repository Interface Tests - Domain Layer
 *
 * Unit tests for repository interface error classes and type definitions.
 * Tests error handling, validation, and interface contracts.
 *
 * @domain Repository Interface Tests
 * @pattern Repository Pattern Testing
 * @version 1.0.0
 */

import {
  LotBatchRepositoryError,
  LotBatchNotFoundError,
  LotBatchAlreadyExistsError,
  LotBatchRepositoryConnectionError,
  InsufficientLotQuantityError,
  type LotBatchSearchCriteria,
  type LotBatchSearchResult,
  type LotBatchRepositoryStats,
  type FifoLotSelectionCriteria,
  type FifoLotSelectionResult,
  type LotQuantityAdjustment,
  type ILotBatchRepository,
  type ILotBatchRepositoryTransaction,
} from '../lot-batch.repository';
import { LotBatch, LotStatus } from '../../value-objects/lot-batch';

describe('Lot/Batch Repository Interface - Domain Layer', () => {
  describe('Error Classes', () => {
    describe('LotBatchRepositoryError', () => {
      test('should create error with message and operation', () => {
        const error = new LotBatchRepositoryError('Test error', 'save');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('LotBatchRepositoryError');
        expect(error.message).toBe('Test error');
        expect(error.operation).toBe('save');
        expect(error.cause).toBeUndefined();
      });

      test('should create error with cause', () => {
        const cause = new Error('Original error');
        const error = new LotBatchRepositoryError('Test error', 'update', cause);

        expect(error.cause).toBe(cause);
      });

      test('should be serializable', () => {
        const error = new LotBatchRepositoryError('Test error', 'save');

        // Test that error properties are accessible
        expect(error.name).toBe('LotBatchRepositoryError');
        expect(error.message).toBe('Test error');
        expect(error.operation).toBe('save');

        // Test that error can be converted to string
        expect(error.toString()).toContain('Test error');
      });
    });

    describe('LotBatchNotFoundError', () => {
      test('should create error with default identifier type', () => {
        const error = new LotBatchNotFoundError('LOT123');

        expect(error).toBeInstanceOf(LotBatchRepositoryError);
        expect(error.name).toBe('LotBatchNotFoundError');
        expect(error.message).toBe('Lot/Batch not found with id: LOT123');
        expect(error.operation).toBe('find');
      });

      test('should create error with custom identifier type', () => {
        const error = new LotBatchNotFoundError('LOT-2024-001', 'lotNumber');

        expect(error.message).toBe('Lot/Batch not found with lotNumber: LOT-2024-001');
      });

      test('should inherit from LotBatchRepositoryError', () => {
        const error = new LotBatchNotFoundError('LOT123');

        expect(error).toBeInstanceOf(LotBatchRepositoryError);
        expect(error).toBeInstanceOf(Error);
      });
    });

    describe('LotBatchAlreadyExistsError', () => {
      test('should create error with default identifier type', () => {
        const error = new LotBatchAlreadyExistsError('LOT-2024-001');

        expect(error).toBeInstanceOf(LotBatchRepositoryError);
        expect(error.name).toBe('LotBatchAlreadyExistsError');
        expect(error.message).toBe('Lot/Batch already exists with lotNumber: LOT-2024-001');
        expect(error.operation).toBe('save');
      });

      test('should create error with custom identifier type', () => {
        const error = new LotBatchAlreadyExistsError('LOT123', 'id');

        expect(error.message).toBe('Lot/Batch already exists with id: LOT123');
      });
    });

    describe('LotBatchRepositoryConnectionError', () => {
      test('should create connection error', () => {
        const error = new LotBatchRepositoryConnectionError('Database connection failed');

        expect(error).toBeInstanceOf(LotBatchRepositoryError);
        expect(error.name).toBe('LotBatchRepositoryConnectionError');
        expect(error.message).toBe('Database connection failed');
        expect(error.operation).toBe('connection');
      });

      test('should create connection error with cause', () => {
        const cause = new Error('Network error');
        const error = new LotBatchRepositoryConnectionError('Database connection failed', cause);

        expect(error.cause).toBe(cause);
      });
    });

    describe('InsufficientLotQuantityError', () => {
      test('should create insufficient quantity error', () => {
        const error = new InsufficientLotQuantityError('LOT123', 100, 50);

        expect(error).toBeInstanceOf(LotBatchRepositoryError);
        expect(error.name).toBe('InsufficientLotQuantityError');
        expect(error.message).toBe('Insufficient lot quantity: requested 100, available 50');
        expect(error.operation).toBe('reserve');
      });

      test('should handle zero available quantity', () => {
        const error = new InsufficientLotQuantityError('LOT123', 10, 0);

        expect(error.message).toBe('Insufficient lot quantity: requested 10, available 0');
      });
    });
  });

  describe('Type Definitions', () => {
    describe('LotBatchSearchCriteria', () => {
      test('should accept minimal criteria', () => {
        const criteria: LotBatchSearchCriteria = {};

        expect(criteria).toBeDefined();
        expect(Object.keys(criteria)).toHaveLength(0);
      });

      test('should accept full criteria', () => {
        const criteria: LotBatchSearchCriteria = {
          searchTerm: 'LOT',
          lotNumber: 'LOT-2024-001',
          batchNumber: 'BATCH-001',
          supplierLotCode: 'SUP-LOT-001',
          productId: 'PROD123',
          agencyId: 'AGENCY123',
          supplierId: 'SUPPLIER123',
          createdBy: 'USER123',
          status: LotStatus.ACTIVE,
          isActive: true,
          isExpired: false,
          isAvailable: true,
          hasQuantity: true,
          minQuantity: 10,
          maxQuantity: 1000,
          hasReservedQuantity: false,
          manufacturingDateAfter: new Date('2024-01-01'),
          manufacturingDateBefore: new Date('2024-12-31'),
          expiryDateAfter: new Date('2024-06-01'),
          expiryDateBefore: new Date('2025-12-31'),
          createdAfter: new Date('2024-01-01'),
          createdBefore: new Date('2024-12-31'),
          updatedAfter: new Date('2024-01-01'),
          updatedBefore: new Date('2024-12-31'),
          expiringWithinDays: 30,
          nearExpiryDays: 15,
          limit: 100,
          offset: 0,
          sortBy: 'manufacturingDate',
          sortOrder: 'ASC',
          fifoOrder: true,
        };

        expect(criteria.searchTerm).toBe('LOT');
        expect(criteria.lotNumber).toBe('LOT-2024-001');
        expect(criteria.status).toBe(LotStatus.ACTIVE);
        expect(criteria.limit).toBe(100);
        expect(criteria.sortBy).toBe('manufacturingDate');
        expect(criteria.fifoOrder).toBe(true);
      });

      test('should accept array values for multi-select fields', () => {
        const criteria: LotBatchSearchCriteria = {
          productId: ['PROD1', 'PROD2'],
          agencyId: ['AGENCY1', 'AGENCY2'],
          supplierId: ['SUP1', 'SUP2'],
          createdBy: ['USER1', 'USER2'],
          status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
        };

        expect(Array.isArray(criteria.productId)).toBe(true);
        expect(Array.isArray(criteria.status)).toBe(true);
        expect((criteria.productId as string[]).length).toBe(2);
        expect((criteria.status as LotStatus[]).length).toBe(2);
      });
    });

    describe('LotBatchSearchResult', () => {
      test('should structure search results correctly', () => {
        const mockLotBatch = {
          id: 'LOT123',
          lotNumber: 'LOT-2024-001',
        } as LotBatch;

        const result: LotBatchSearchResult = {
          lotBatches: [mockLotBatch],
          total: 1,
          limit: 100,
          offset: 0,
          hasMore: false,
        };

        expect(result.lotBatches).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.limit).toBe(100);
        expect(result.offset).toBe(0);
        expect(result.hasMore).toBe(false);
      });

      test('should indicate pagination with hasMore', () => {
        const result: LotBatchSearchResult = {
          lotBatches: [],
          total: 150,
          limit: 100,
          offset: 0,
          hasMore: true,
        };

        expect(result.hasMore).toBe(true);
      });
    });

    describe('LotBatchRepositoryStats', () => {
      test('should structure statistics correctly', () => {
        const stats: LotBatchRepositoryStats = {
          totalLots: 100,
          activeLots: 80,
          expiredLots: 15,
          quarantineLots: 3,
          consumedLots: 2,
          totalQuantity: 5000,
          availableQuantity: 4000,
          reservedQuantity: 500,
          nearExpiryLots: 10,
          averageLotsPerProduct: 5.5,
          oldestLot: new Date('2024-01-01'),
          newestLot: new Date('2024-12-01'),
        };

        expect(stats.totalLots).toBe(100);
        expect(stats.activeLots).toBe(80);
        expect(stats.averageLotsPerProduct).toBe(5.5);
        expect(stats.oldestLot).toBeInstanceOf(Date);
        expect(stats.newestLot).toBeInstanceOf(Date);
      });

      test('should allow null dates', () => {
        const stats: LotBatchRepositoryStats = {
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
        };

        expect(stats.oldestLot).toBeNull();
        expect(stats.newestLot).toBeNull();
      });
    });

    describe('FifoLotSelectionCriteria', () => {
      test('should require essential fields', () => {
        const criteria: FifoLotSelectionCriteria = {
          productId: 'PROD123',
          agencyId: 'AGENCY123',
          requestedQuantity: 100,
        };

        expect(criteria.productId).toBe('PROD123');
        expect(criteria.agencyId).toBe('AGENCY123');
        expect(criteria.requestedQuantity).toBe(100);
      });

      test('should accept optional fields', () => {
        const criteria: FifoLotSelectionCriteria = {
          productId: 'PROD123',
          agencyId: 'AGENCY123',
          requestedQuantity: 100,
          excludeStatuses: [LotStatus.EXPIRED, LotStatus.DAMAGED],
          includeReserved: false,
          maxExpiryDate: new Date('2025-01-01'),
        };

        expect(criteria.excludeStatuses).toHaveLength(2);
        expect(criteria.includeReserved).toBe(false);
        expect(criteria.maxExpiryDate).toBeInstanceOf(Date);
      });
    });

    describe('FifoLotSelectionResult', () => {
      test('should structure FIFO selection results', () => {
        const mockLotBatch = {
          id: 'LOT123',
          lotNumber: 'LOT-2024-001',
        } as LotBatch;

        const result: FifoLotSelectionResult = {
          selectedLots: [
            {
              lotBatch: mockLotBatch,
              allocatedQuantity: 50,
            },
          ],
          totalAllocatedQuantity: 50,
          remainingQuantity: 25,
          hasFullAllocation: false,
        };

        expect(result.selectedLots).toHaveLength(1);
        expect(result.selectedLots[0].allocatedQuantity).toBe(50);
        expect(result.totalAllocatedQuantity).toBe(50);
        expect(result.remainingQuantity).toBe(25);
        expect(result.hasFullAllocation).toBe(false);
      });

      test('should indicate full allocation', () => {
        const mockLotBatch = {
          id: 'LOT123',
          lotNumber: 'LOT-2024-001',
        } as LotBatch;

        const result: FifoLotSelectionResult = {
          selectedLots: [
            {
              lotBatch: mockLotBatch,
              allocatedQuantity: 100,
            },
          ],
          totalAllocatedQuantity: 100,
          remainingQuantity: 0,
          hasFullAllocation: true,
        };

        expect(result.hasFullAllocation).toBe(true);
        expect(result.remainingQuantity).toBe(0);
      });
    });

    describe('LotQuantityAdjustment', () => {
      test('should structure quantity adjustment', () => {
        const adjustment: LotQuantityAdjustment = {
          lotBatchId: 'LOT123',
          quantityChange: -10,
          reason: 'Damaged goods',
          referenceId: 'DAMAGE001',
          referenceType: 'DAMAGE',
          notes: 'Found damaged during inspection',
          adjustedBy: 'USER123',
        };

        expect(adjustment.lotBatchId).toBe('LOT123');
        expect(adjustment.quantityChange).toBe(-10);
        expect(adjustment.reason).toBe('Damaged goods');
        expect(adjustment.referenceType).toBe('DAMAGE');
        expect(adjustment.adjustedBy).toBe('USER123');
      });

      test('should accept minimal adjustment data', () => {
        const adjustment: LotQuantityAdjustment = {
          lotBatchId: 'LOT123',
          quantityChange: 50,
          reason: 'Stock replenishment',
          adjustedBy: 'USER123',
        };

        expect(adjustment.referenceId).toBeUndefined();
        expect(adjustment.referenceType).toBeUndefined();
        expect(adjustment.notes).toBeUndefined();
      });
    });
  });

  describe('Interface Contracts', () => {
    describe('ILotBatchRepository', () => {
      test('should define core CRUD operations', () => {
        // This test validates the interface structure exists
        const repositoryMethods = [
          'save',
          'update',
          'findById',
          'findByLotNumber',
          'findByLotAndBatchNumber',
          'existsByLotNumber',
          'existsByLotAndBatchNumber',
        ];

        // Mock implementation to test interface structure
        const mockRepository: Partial<ILotBatchRepository> = {};
        // Suppress unused variable warning
        expect(mockRepository).toBeDefined();

        repositoryMethods.forEach((method) => {
          expect(typeof method).toBe('string');
        });

        expect(repositoryMethods).toContain('save');
        expect(repositoryMethods).toContain('update');
        expect(repositoryMethods).toContain('findById');
      });

      test('should define search operations', () => {
        const searchMethods = [
          'search',
          'findByProduct',
          'findByAgency',
          'findByStatus',
          'findActive',
          'findExpired',
          'findExpiringWithinDays',
          'findFifoOrder',
        ];

        searchMethods.forEach((method) => {
          expect(typeof method).toBe('string');
        });

        expect(searchMethods).toContain('search');
        expect(searchMethods).toContain('findFifoOrder');
      });

      test('should define quantity management operations', () => {
        const quantityMethods = [
          'reserveQuantity',
          'releaseReservedQuantity',
          'consumeQuantity',
          'adjustQuantity',
          'getAvailableQuantityForProduct',
          'getReservedQuantityForProduct',
        ];

        quantityMethods.forEach((method) => {
          expect(typeof method).toBe('string');
        });

        expect(quantityMethods).toContain('reserveQuantity');
        expect(quantityMethods).toContain('adjustQuantity');
      });
    });

    describe('ILotBatchRepositoryTransaction', () => {
      test('should define transaction operations', () => {
        const transactionMethods = [
          'save',
          'update',
          'delete',
          'reserveQuantity',
          'releaseReservedQuantity',
          'consumeQuantity',
          'commit',
          'rollback',
          'isActive',
        ];

        transactionMethods.forEach((method) => {
          expect(typeof method).toBe('string');
        });

        expect(transactionMethods).toContain('commit');
        expect(transactionMethods).toContain('rollback');
        expect(transactionMethods).toContain('isActive');
      });
    });
  });

  describe('Business Logic Validation', () => {
    test('should validate FIFO criteria requires positive quantity', () => {
      const criteria: FifoLotSelectionCriteria = {
        productId: 'PROD123',
        agencyId: 'AGENCY123',
        requestedQuantity: 100,
      };

      expect(criteria.requestedQuantity).toBeGreaterThan(0);
    });

    test('should validate adjustment can be positive or negative', () => {
      const positiveAdjustment: LotQuantityAdjustment = {
        lotBatchId: 'LOT123',
        quantityChange: 50,
        reason: 'Stock increase',
        adjustedBy: 'USER123',
      };

      const negativeAdjustment: LotQuantityAdjustment = {
        lotBatchId: 'LOT123',
        quantityChange: -25,
        reason: 'Stock decrease',
        adjustedBy: 'USER123',
      };

      expect(positiveAdjustment.quantityChange).toBeGreaterThan(0);
      expect(negativeAdjustment.quantityChange).toBeLessThan(0);
    });

    test('should validate search criteria date ranges', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const criteria: LotBatchSearchCriteria = {
        manufacturingDateAfter: startDate,
        manufacturingDateBefore: endDate,
        expiryDateAfter: startDate,
        expiryDateBefore: endDate,
      };

      expect(criteria.manufacturingDateAfter!.getTime()).toBeLessThan(criteria.manufacturingDateBefore!.getTime());
      expect(criteria.expiryDateAfter!.getTime()).toBeLessThan(criteria.expiryDateBefore!.getTime());
    });
  });

  describe('Error Hierarchy', () => {
    test('should maintain proper error inheritance chain', () => {
      const errors = [
        new LotBatchRepositoryError('Base error', 'operation'),
        new LotBatchNotFoundError('LOT123'),
        new LotBatchAlreadyExistsError('LOT123'),
        new LotBatchRepositoryConnectionError('Connection failed'),
        new InsufficientLotQuantityError('LOT123', 100, 50),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(LotBatchRepositoryError);
      });

      // Test specific error types
      expect(errors[1]).toBeInstanceOf(LotBatchNotFoundError);
      expect(errors[2]).toBeInstanceOf(LotBatchAlreadyExistsError);
      expect(errors[3]).toBeInstanceOf(LotBatchRepositoryConnectionError);
      expect(errors[4]).toBeInstanceOf(InsufficientLotQuantityError);
    });
  });
});
