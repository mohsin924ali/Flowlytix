/**
 * Get Lot/Batch Query Tests
 *
 * Comprehensive test suite for GetLotBatchQuery following established patterns.
 * Tests all validation rules, business logic, and helper functions with 90%+ coverage.
 *
 * @domain Lot/Batch Management
 * @pattern Query Tests
 * @version 1.0.0
 */

import {
  GetLotBatchQuery,
  GetLotBatchQuerySchema,
  validateGetLotBatchQuery,
  GetLotBatchQueryValidationError,
  createLotBatchDetails,
  createRelatedLotSummary,
  LotBatchDetails,
  RelatedLotBatchSummary,
} from '../get-lot-batch.query';
import { LotStatus } from '../../../../domain/value-objects/lot-batch';

describe('GetLotBatchQuery', () => {
  // Valid base query for testing
  const validBaseQuery: GetLotBatchQuery = {
    lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
    requestedBy: '550e8400-e29b-41d4-a716-446655440001',
    includeHistory: false,
    includeRelated: false,
    nearExpiryDays: 30,
  };

  // Mock lot/batch object for helper function tests
  const mockLotBatch = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    lotNumber: 'LOT001',
    batchNumber: 'BATCH001',
    manufacturingDate: new Date('2023-01-01'),
    expiryDate: new Date('2025-01-01'),
    quantity: 1000,
    remainingQuantity: 750,
    reservedQuantity: 100,
    availableQuantity: 650,
    status: LotStatus.ACTIVE,
    productId: '550e8400-e29b-41d4-a716-446655440002',
    agencyId: '550e8400-e29b-41d4-a716-446655440003',
    supplierId: '550e8400-e29b-41d4-a716-446655440004',
    supplierLotCode: 'SUP001',
    notes: 'Test lot batch',
    createdBy: '550e8400-e29b-41d4-a716-446655440005',
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedBy: '550e8400-e29b-41d4-a716-446655440006',
    updatedAt: new Date('2023-06-01T10:00:00Z'),

    // Mock methods
    isExpired: jest.fn().mockReturnValue(false),
    isNearExpiry: jest.fn().mockReturnValue(false),
    getDaysUntilExpiry: jest.fn().mockReturnValue(365),
    isAvailable: jest.fn().mockReturnValue(true),
    isFullyConsumed: jest.fn().mockReturnValue(false),
  };

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should require lotBatchId field', () => {
        const invalidQuery = { ...validBaseQuery };
        delete (invalidQuery as any).lotBatchId;

        expect(() => validateGetLotBatchQuery(invalidQuery)).toThrow(GetLotBatchQueryValidationError);
      });

      it('should require requestedBy field', () => {
        const invalidQuery = { ...validBaseQuery };
        delete (invalidQuery as any).requestedBy;

        expect(() => validateGetLotBatchQuery(invalidQuery)).toThrow(GetLotBatchQueryValidationError);
      });

      it('should validate lotBatchId as UUID', () => {
        const invalidQuery = {
          ...validBaseQuery,
          lotBatchId: 'invalid-uuid',
        };

        expect(() => validateGetLotBatchQuery(invalidQuery)).toThrow('Invalid lot/batch ID format');
      });

      it('should validate requestedBy as UUID', () => {
        const invalidQuery = {
          ...validBaseQuery,
          requestedBy: 'invalid-uuid',
        };

        expect(() => validateGetLotBatchQuery(invalidQuery)).toThrow('Invalid requester ID format');
      });
    });

    describe('Optional Fields', () => {
      it('should apply default values for optional fields', () => {
        const minimalQuery = {
          lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
          requestedBy: '550e8400-e29b-41d4-a716-446655440001',
        };

        const result = validateGetLotBatchQuery(minimalQuery);
        expect(result.includeHistory).toBe(false);
        expect(result.includeRelated).toBe(false);
        expect(result.nearExpiryDays).toBe(30);
      });

      it('should validate boolean fields', () => {
        const queryWithBooleans = {
          ...validBaseQuery,
          includeHistory: true,
          includeRelated: true,
        };

        const result = validateGetLotBatchQuery(queryWithBooleans);
        expect(result.includeHistory).toBe(true);
        expect(result.includeRelated).toBe(true);
      });

      it('should validate nearExpiryDays bounds', () => {
        // Valid values
        const validQuery = {
          ...validBaseQuery,
          nearExpiryDays: 60,
        };
        expect(() => validateGetLotBatchQuery(validQuery)).not.toThrow();

        // Below minimum
        const invalidMinQuery = { ...validBaseQuery, nearExpiryDays: 0 };
        expect(() => validateGetLotBatchQuery(invalidMinQuery)).toThrow('Near expiry days must be at least 1');

        // Exceeding maximum
        const invalidMaxQuery = { ...validBaseQuery, nearExpiryDays: 366 };
        expect(() => validateGetLotBatchQuery(invalidMaxQuery)).toThrow('Near expiry days cannot exceed 1 year');
      });
    });
  });

  describe('Helper Functions', () => {
    describe('createLotBatchDetails', () => {
      it('should create comprehensive lot batch details', () => {
        const details = createLotBatchDetails(mockLotBatch, 30);

        expect(details.id).toBe(mockLotBatch.id);
        expect(details.lotNumber).toBe(mockLotBatch.lotNumber);
        expect(details.batchNumber).toBe(mockLotBatch.batchNumber);
        expect(details.manufacturingDate).toBe(mockLotBatch.manufacturingDate);
        expect(details.expiryDate).toBe(mockLotBatch.expiryDate);
        expect(details.quantity).toBe(mockLotBatch.quantity);
        expect(details.remainingQuantity).toBe(mockLotBatch.remainingQuantity);
        expect(details.reservedQuantity).toBe(mockLotBatch.reservedQuantity);
        expect(details.availableQuantity).toBe(mockLotBatch.availableQuantity);
        expect(details.status).toBe(mockLotBatch.status);
        expect(details.productId).toBe(mockLotBatch.productId);
        expect(details.agencyId).toBe(mockLotBatch.agencyId);
        expect(details.supplierId).toBe(mockLotBatch.supplierId);
        expect(details.supplierLotCode).toBe(mockLotBatch.supplierLotCode);
        expect(details.notes).toBe(mockLotBatch.notes);
        expect(details.createdBy).toBe(mockLotBatch.createdBy);
        expect(details.createdAt).toBe(mockLotBatch.createdAt);
        expect(details.updatedBy).toBe(mockLotBatch.updatedBy);
        expect(details.updatedAt).toBe(mockLotBatch.updatedAt);
      });

      it('should calculate derived fields correctly', () => {
        const details = createLotBatchDetails(mockLotBatch, 30);

        expect(details.consumedQuantity).toBe(250); // 1000 - 750
        expect(details.utilizationPercentage).toBe(25); // (250/1000) * 100
        expect(details.isExpired).toBe(false);
        expect(details.isNearExpiry).toBe(false);
        expect(details.daysUntilExpiry).toBe(365);
        expect(details.isAvailable).toBe(true);
        expect(details.isFullyConsumed).toBe(false);
      });

      it('should handle zero quantity correctly', () => {
        const zeroQuantityLotBatch = {
          ...mockLotBatch,
          quantity: 0,
          remainingQuantity: 0,
        };

        const details = createLotBatchDetails(zeroQuantityLotBatch, 30);
        expect(details.utilizationPercentage).toBe(0);
        expect(details.consumedQuantity).toBe(0);
      });

      it('should handle null/undefined optional fields', () => {
        const minimalLotBatch = {
          ...mockLotBatch,
          batchNumber: null,
          expiryDate: null,
          supplierId: null,
          supplierLotCode: null,
          notes: null,
          updatedBy: null,
          updatedAt: null,
        };

        const details = createLotBatchDetails(minimalLotBatch, 30);
        expect(details.batchNumber).toBe(null);
        expect(details.expiryDate).toBe(null);
        expect(details.supplierId).toBe(null);
        expect(details.supplierLotCode).toBe(null);
        expect(details.notes).toBe(null);
        expect(details.updatedBy).toBe(null);
        expect(details.updatedAt).toBe(null);
      });

      it('should create proper display information', () => {
        const details = createLotBatchDetails(mockLotBatch, 30);

        expect(details.displayInfo.lotBatchCode).toBe('LOT001-BATCH001');
        expect(details.displayInfo.statusDisplay).toBe('ACTIVE');
        expect(details.displayInfo.quantityDisplay).toBe('750/1000 units');
        expect(details.displayInfo.expiryDisplay).toContain('2025-01-01');
        expect(details.displayInfo.availabilityDisplay).toBe('650 available (100 reserved)');
      });

      it('should handle lot without batch number in display', () => {
        const noBatchLotBatch = {
          ...mockLotBatch,
          batchNumber: null,
        };

        const details = createLotBatchDetails(noBatchLotBatch, 30);
        expect(details.displayInfo.lotBatchCode).toBe('LOT001');
      });

      it('should handle expired lot in display', () => {
        const expiredLotBatch = {
          ...mockLotBatch,
          isExpired: jest.fn().mockReturnValue(true),
        };

        const details = createLotBatchDetails(expiredLotBatch, 30);
        expect(details.displayInfo.statusDisplay).toBe('ACTIVE (EXPIRED)');
        expect(details.displayInfo.expiryDisplay).toContain('(EXPIRED)');
      });

      it('should handle near expiry lot in display', () => {
        const nearExpiryLotBatch = {
          ...mockLotBatch,
          isNearExpiry: jest.fn().mockReturnValue(true),
          getDaysUntilExpiry: jest.fn().mockReturnValue(15),
        };

        const details = createLotBatchDetails(nearExpiryLotBatch, 30);
        expect(details.displayInfo.statusDisplay).toBe('ACTIVE (NEAR EXPIRY)');
        expect(details.displayInfo.expiryDisplay).toContain('(15 days remaining)');
      });

      it('should handle no expiry date in display', () => {
        const noExpiryLotBatch = {
          ...mockLotBatch,
          expiryDate: null,
          getDaysUntilExpiry: jest.fn().mockReturnValue(null),
        };

        const details = createLotBatchDetails(noExpiryLotBatch, 30);
        expect(details.displayInfo.expiryDisplay).toBe('No expiry date');
      });

      it('should handle unavailable lot in display', () => {
        const unavailableLotBatch = {
          ...mockLotBatch,
          isAvailable: jest.fn().mockReturnValue(false),
        };

        const details = createLotBatchDetails(unavailableLotBatch, 30);
        expect(details.displayInfo.availabilityDisplay).toBe('Not available');
      });

      it('should handle lot without reserved quantity in display', () => {
        const noReservedLotBatch = {
          ...mockLotBatch,
          reservedQuantity: 0,
        };

        const details = createLotBatchDetails(noReservedLotBatch, 30);
        expect(details.displayInfo.availabilityDisplay).toBe('650 available');
      });
    });

    describe('createRelatedLotSummary', () => {
      it('should create related lot summary correctly', () => {
        const summary = createRelatedLotSummary(mockLotBatch, 30);

        expect(summary.id).toBe(mockLotBatch.id);
        expect(summary.lotNumber).toBe(mockLotBatch.lotNumber);
        expect(summary.batchNumber).toBe(mockLotBatch.batchNumber);
        expect(summary.manufacturingDate).toBe(mockLotBatch.manufacturingDate);
        expect(summary.expiryDate).toBe(mockLotBatch.expiryDate);
        expect(summary.remainingQuantity).toBe(mockLotBatch.remainingQuantity);
        expect(summary.status).toBe(mockLotBatch.status);
        expect(summary.isExpired).toBe(false);
        expect(summary.daysUntilExpiry).toBe(365);
      });

      it('should handle null optional fields in summary', () => {
        const minimalLotBatch = {
          ...mockLotBatch,
          batchNumber: null,
          expiryDate: null,
          getDaysUntilExpiry: jest.fn().mockReturnValue(null),
        };

        const summary = createRelatedLotSummary(minimalLotBatch, 30);
        expect(summary.batchNumber).toBe(null);
        expect(summary.expiryDate).toBe(null);
        expect(summary.daysUntilExpiry).toBe(null);
      });

      it('should call domain methods correctly', () => {
        createRelatedLotSummary(mockLotBatch, 30);

        expect(mockLotBatch.isExpired).toHaveBeenCalled();
        expect(mockLotBatch.getDaysUntilExpiry).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw GetLotBatchQueryValidationError with proper structure', () => {
      const invalidQuery = {
        lotBatchId: 'invalid-uuid',
        requestedBy: 'invalid-uuid',
        nearExpiryDays: -1,
      };

      try {
        validateGetLotBatchQuery(invalidQuery);
        fail('Expected validation error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GetLotBatchQueryValidationError);
        expect(error.name).toBe('GetLotBatchQueryValidationError');
        expect(error.message).toContain('Get lot/batch query validation failed');
        expect((error as GetLotBatchQueryValidationError).validationErrors).toBeDefined();
      }
    });

    it('should include multiple validation errors in message', () => {
      const invalidQuery = {
        lotBatchId: 'invalid-uuid',
        requestedBy: 'invalid-uuid',
        nearExpiryDays: 0,
      };

      try {
        validateGetLotBatchQuery(invalidQuery);
        fail('Expected validation error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Invalid lot/batch ID format');
        expect(error.message).toContain('Invalid requester ID format');
        expect(error.message).toContain('Near expiry days must be at least 1');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal valid query', () => {
      const minimalQuery = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
        requestedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = validateGetLotBatchQuery(minimalQuery);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.requestedBy).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.includeHistory).toBe(false);
      expect(result.includeRelated).toBe(false);
      expect(result.nearExpiryDays).toBe(30);
    });

    it('should handle query with all optional fields', () => {
      const maximalQuery = {
        ...validBaseQuery,
        includeHistory: true,
        includeRelated: true,
        nearExpiryDays: 60,
      };

      expect(() => validateGetLotBatchQuery(maximalQuery)).not.toThrow();
      const result = validateGetLotBatchQuery(maximalQuery);
      expect(result).toMatchObject(maximalQuery);
    });

    it('should handle boundary values correctly', () => {
      const boundaryQuery = {
        ...validBaseQuery,
        nearExpiryDays: 1, // Minimum
      };

      expect(() => validateGetLotBatchQuery(boundaryQuery)).not.toThrow();

      const maxBoundaryQuery = {
        ...validBaseQuery,
        nearExpiryDays: 365, // Maximum
      };

      expect(() => validateGetLotBatchQuery(maxBoundaryQuery)).not.toThrow();
    });

    it('should handle fully consumed lot in calculations', () => {
      const fullyConsumedLotBatch = {
        ...mockLotBatch,
        quantity: 1000,
        remainingQuantity: 0,
        isFullyConsumed: jest.fn().mockReturnValue(true),
      };

      const details = createLotBatchDetails(fullyConsumedLotBatch, 30);
      expect(details.consumedQuantity).toBe(1000);
      expect(details.utilizationPercentage).toBe(100);
      expect(details.isFullyConsumed).toBe(true);
    });

    it('should handle lot with different status in display', () => {
      const quarantineLotBatch = {
        ...mockLotBatch,
        status: LotStatus.QUARANTINE,
      };

      const details = createLotBatchDetails(quarantineLotBatch, 30);
      expect(details.displayInfo.statusDisplay).toBe('QUARANTINE');
    });
  });
});
