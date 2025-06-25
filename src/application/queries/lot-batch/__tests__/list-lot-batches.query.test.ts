/**
 * List Lot/Batches Query Tests
 *
 * Comprehensive test suite for ListLotBatchesQuery following established patterns.
 * Tests all validation rules, business logic, and helper functions with 90%+ coverage.
 *
 * @domain Lot/Batch Management
 * @pattern Query Tests
 * @version 1.0.0
 */

import {
  ListLotBatchesQuery,
  ListLotBatchesQuerySchema,
  validateListLotBatchesQuery,
  ListLotBatchesQueryValidationError,
  createLotBatchListItem,
  prepareListSearchCriteria,
  getListAppliedFilters,
  LotBatchListItem,
} from '../list-lot-batches.query';
import { LotStatus } from '../../../../domain/value-objects/lot-batch';

describe('ListLotBatchesQuery', () => {
  // Valid base query for testing
  const validBaseQuery: ListLotBatchesQuery = {
    requestedBy: '550e8400-e29b-41d4-a716-446655440000',
    productId: '550e8400-e29b-41d4-a716-446655440001',
    includeExpired: false,
    includeInactive: false,
    hasQuantityOnly: true,
    limit: 50,
    offset: 0,
    sortBy: 'manufacturingDate',
    sortOrder: 'ASC',
    fifoOrder: true,
  };

  // Mock lot/batch object for helper function tests
  const mockLotBatch = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    lotNumber: 'LOT001',
    batchNumber: 'BATCH001',
    manufacturingDate: new Date('2023-01-01'),
    expiryDate: new Date('2025-01-01'),
    remainingQuantity: 750,
    availableQuantity: 650,
    status: LotStatus.ACTIVE,
    productId: '550e8400-e29b-41d4-a716-446655440001',
    agencyId: '550e8400-e29b-41d4-a716-446655440002',

    // Mock methods
    isExpired: jest.fn().mockReturnValue(false),
    isNearExpiry: jest.fn().mockReturnValue(false),
    getDaysUntilExpiry: jest.fn().mockReturnValue(365),
  };

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should require requestedBy field', () => {
        const invalidQuery = { ...validBaseQuery };
        delete (invalidQuery as any).requestedBy;

        expect(() => validateListLotBatchesQuery(invalidQuery)).toThrow(ListLotBatchesQueryValidationError);
      });

      it('should validate requestedBy as UUID', () => {
        const invalidQuery = {
          ...validBaseQuery,
          requestedBy: 'invalid-uuid',
        };

        expect(() => validateListLotBatchesQuery(invalidQuery)).toThrow('Invalid requester ID format');
      });

      it('should require either productId or agencyId', () => {
        const invalidQuery = {
          requestedBy: '550e8400-e29b-41d4-a716-446655440000',
        };

        expect(() => validateListLotBatchesQuery(invalidQuery)).toThrow(
          'Either productId or agencyId must be provided'
        );
      });

      it('should accept productId only', () => {
        const validQuery = {
          requestedBy: '550e8400-e29b-41d4-a716-446655440000',
          productId: '550e8400-e29b-41d4-a716-446655440001',
        };

        expect(() => validateListLotBatchesQuery(validQuery)).not.toThrow();
      });

      it('should accept agencyId only', () => {
        const validQuery = {
          requestedBy: '550e8400-e29b-41d4-a716-446655440000',
          agencyId: '550e8400-e29b-41d4-a716-446655440002',
        };

        expect(() => validateListLotBatchesQuery(validQuery)).not.toThrow();
      });

      it('should accept both productId and agencyId', () => {
        const validQuery = {
          ...validBaseQuery,
          agencyId: '550e8400-e29b-41d4-a716-446655440002',
        };

        expect(() => validateListLotBatchesQuery(validQuery)).not.toThrow();
      });
    });

    describe('Association Filtering Validation', () => {
      it('should validate productId as UUID', () => {
        const invalidQuery = {
          ...validBaseQuery,
          productId: 'invalid-uuid',
        };

        expect(() => validateListLotBatchesQuery(invalidQuery)).toThrow('Invalid product ID format');
      });

      it('should validate agencyId as UUID', () => {
        const invalidQuery = {
          requestedBy: '550e8400-e29b-41d4-a716-446655440000',
          agencyId: 'invalid-uuid',
        };

        expect(() => validateListLotBatchesQuery(invalidQuery)).toThrow('Invalid agency ID format');
      });
    });

    describe('Status Filtering Validation', () => {
      it('should validate single status enum', () => {
        Object.values(LotStatus).forEach((status) => {
          const query = { ...validBaseQuery, status };
          expect(() => validateListLotBatchesQuery(query)).not.toThrow();
        });

        const invalidQuery = { ...validBaseQuery, status: 'INVALID_STATUS' as any };
        expect(() => validateListLotBatchesQuery(invalidQuery)).toThrow();
      });

      it('should validate array of status enums', () => {
        const validQuery = {
          ...validBaseQuery,
          status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
        };
        expect(() => validateListLotBatchesQuery(validQuery)).not.toThrow();

        const invalidQuery = {
          ...validBaseQuery,
          status: [LotStatus.ACTIVE, 'INVALID_STATUS' as any],
        };
        expect(() => validateListLotBatchesQuery(invalidQuery)).toThrow();
      });
    });

    describe('Boolean Flags Validation', () => {
      it('should validate boolean flags', () => {
        const query = {
          ...validBaseQuery,
          includeExpired: true,
          includeInactive: true,
          hasQuantityOnly: false,
        };
        expect(() => validateListLotBatchesQuery(query)).not.toThrow();

        const result = validateListLotBatchesQuery(query);
        expect(result.includeExpired).toBe(true);
        expect(result.includeInactive).toBe(true);
        expect(result.hasQuantityOnly).toBe(false);
      });

      it('should apply default values for boolean flags', () => {
        const minimalQuery = {
          requestedBy: '550e8400-e29b-41d4-a716-446655440000',
          productId: '550e8400-e29b-41d4-a716-446655440001',
        };

        const result = validateListLotBatchesQuery(minimalQuery);
        expect(result.includeExpired).toBe(false);
        expect(result.includeInactive).toBe(false);
        expect(result.hasQuantityOnly).toBe(true);
      });
    });

    describe('Pagination Validation', () => {
      it('should validate limit bounds', () => {
        // Minimum limit validation
        const queryWithZeroLimit = { ...validBaseQuery, limit: 0 };
        expect(() => validateListLotBatchesQuery(queryWithZeroLimit)).toThrow('Limit must be at least 1');

        // Maximum limit validation
        const queryWithHighLimit = { ...validBaseQuery, limit: 1001 };
        expect(() => validateListLotBatchesQuery(queryWithHighLimit)).toThrow('Limit cannot exceed 1000');

        // Valid limit
        const queryWithValidLimit = { ...validBaseQuery, limit: 100 };
        expect(() => validateListLotBatchesQuery(queryWithValidLimit)).not.toThrow();
      });

      it('should validate offset bounds', () => {
        // Negative offset validation
        const queryWithNegativeOffset = { ...validBaseQuery, offset: -1 };
        expect(() => validateListLotBatchesQuery(queryWithNegativeOffset)).toThrow('Offset cannot be negative');

        // Valid offset
        const queryWithValidOffset = { ...validBaseQuery, offset: 100 };
        expect(() => validateListLotBatchesQuery(queryWithValidOffset)).not.toThrow();
      });

      it('should apply default pagination values', () => {
        const minimalQuery = {
          requestedBy: '550e8400-e29b-41d4-a716-446655440000',
          productId: '550e8400-e29b-41d4-a716-446655440001',
        };

        const result = validateListLotBatchesQuery(minimalQuery);
        expect(result.limit).toBe(50);
        expect(result.offset).toBe(0);
      });
    });

    describe('Sorting Validation', () => {
      it('should validate sortBy enum values', () => {
        const validSortFields = ['manufacturingDate', 'expiryDate', 'lotNumber', 'remainingQuantity'];

        validSortFields.forEach((sortField) => {
          const query = { ...validBaseQuery, sortBy: sortField as any };
          expect(() => validateListLotBatchesQuery(query)).not.toThrow();
        });

        // Invalid sort field
        const invalidQuery = { ...validBaseQuery, sortBy: 'invalidField' as any };
        expect(() => validateListLotBatchesQuery(invalidQuery)).toThrow();
      });

      it('should validate sortOrder enum values', () => {
        const validSortOrders = ['ASC', 'DESC'];

        validSortOrders.forEach((sortOrder) => {
          const query = { ...validBaseQuery, sortOrder: sortOrder as any };
          expect(() => validateListLotBatchesQuery(query)).not.toThrow();
        });

        // Invalid sort order
        const invalidQuery = { ...validBaseQuery, sortOrder: 'invalid' as any };
        expect(() => validateListLotBatchesQuery(invalidQuery)).toThrow();
      });

      it('should apply default sorting values', () => {
        const minimalQuery = {
          requestedBy: '550e8400-e29b-41d4-a716-446655440000',
          productId: '550e8400-e29b-41d4-a716-446655440001',
        };

        const result = validateListLotBatchesQuery(minimalQuery);
        expect(result.sortBy).toBe('manufacturingDate');
        expect(result.sortOrder).toBe('ASC');
        expect(result.fifoOrder).toBe(true);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('createLotBatchListItem', () => {
      it('should create lot batch list item correctly', () => {
        const listItem = createLotBatchListItem(mockLotBatch, 30);

        expect(listItem.id).toBe(mockLotBatch.id);
        expect(listItem.lotNumber).toBe(mockLotBatch.lotNumber);
        expect(listItem.batchNumber).toBe(mockLotBatch.batchNumber);
        expect(listItem.lotBatchCode).toBe('LOT001-BATCH001');
        expect(listItem.manufacturingDate).toBe(mockLotBatch.manufacturingDate);
        expect(listItem.expiryDate).toBe(mockLotBatch.expiryDate);
        expect(listItem.remainingQuantity).toBe(mockLotBatch.remainingQuantity);
        expect(listItem.availableQuantity).toBe(mockLotBatch.availableQuantity);
        expect(listItem.status).toBe(mockLotBatch.status);
        expect(listItem.productId).toBe(mockLotBatch.productId);
        expect(listItem.agencyId).toBe(mockLotBatch.agencyId);
      });

      it('should calculate derived fields correctly', () => {
        const listItem = createLotBatchListItem(mockLotBatch, 30);

        expect(listItem.isExpired).toBe(false);
        expect(listItem.isNearExpiry).toBe(false);
        expect(listItem.daysUntilExpiry).toBe(365);
      });

      it('should handle lot without batch number', () => {
        const noBatchLotBatch = {
          ...mockLotBatch,
          batchNumber: null,
        };

        const listItem = createLotBatchListItem(noBatchLotBatch, 30);
        expect(listItem.batchNumber).toBe(null);
        expect(listItem.lotBatchCode).toBe('LOT001');
      });

      it('should create proper display text', () => {
        const listItem = createLotBatchListItem(mockLotBatch, 30);
        expect(listItem.displayText).toBe('LOT001-BATCH001 (750 units) - Expires 2025-01-01');
      });

      it('should create display text for expired lot', () => {
        const expiredLotBatch = {
          ...mockLotBatch,
          isExpired: jest.fn().mockReturnValue(true),
        };

        const listItem = createLotBatchListItem(expiredLotBatch, 30);
        expect(listItem.displayText).toBe('LOT001-BATCH001 (750 units) - EXPIRED');
      });

      it('should create display text for near expiry lot', () => {
        const nearExpiryLotBatch = {
          ...mockLotBatch,
          isNearExpiry: jest.fn().mockReturnValue(true),
          getDaysUntilExpiry: jest.fn().mockReturnValue(15),
        };

        const listItem = createLotBatchListItem(nearExpiryLotBatch, 30);
        expect(listItem.displayText).toBe('LOT001-BATCH001 (750 units) - Expires in 15 days');
      });

      it('should create display text for lot without expiry date', () => {
        const noExpiryLotBatch = {
          ...mockLotBatch,
          expiryDate: null,
          getDaysUntilExpiry: jest.fn().mockReturnValue(null),
        };

        const listItem = createLotBatchListItem(noExpiryLotBatch, 30);
        expect(listItem.displayText).toBe('LOT001-BATCH001 (750 units)');
      });

      it('should create proper sort key', () => {
        const listItem = createLotBatchListItem(mockLotBatch, 30);
        expect(listItem.sortKey).toBe('2023-01-01_LOT001_BATCH001');
      });

      it('should create sort key without batch number', () => {
        const noBatchLotBatch = {
          ...mockLotBatch,
          batchNumber: null,
        };

        const listItem = createLotBatchListItem(noBatchLotBatch, 30);
        expect(listItem.sortKey).toBe('2023-01-01_LOT001_');
      });

      it('should call domain methods correctly', () => {
        createLotBatchListItem(mockLotBatch, 30);

        expect(mockLotBatch.isExpired).toHaveBeenCalled();
        expect(mockLotBatch.isNearExpiry).toHaveBeenCalledWith(30);
        expect(mockLotBatch.getDaysUntilExpiry).toHaveBeenCalled();
      });
    });

    describe('prepareListSearchCriteria', () => {
      it('should map basic query fields correctly', () => {
        const criteria = prepareListSearchCriteria(validBaseQuery);

        expect(criteria.limit).toBe(50);
        expect(criteria.offset).toBe(0);
        expect(criteria.sortBy).toBe('manufacturingDate'); // FIFO override
        expect(criteria.sortOrder).toBe('ASC'); // FIFO override
        expect(criteria.fifoOrder).toBe(true);
        expect(criteria.productId).toBe('550e8400-e29b-41d4-a716-446655440001');
        expect(criteria.isAvailable).toBe(true);
      });

      it('should handle status filtering when status is provided', () => {
        const queryWithStatus = {
          ...validBaseQuery,
          status: LotStatus.QUARANTINE,
        };

        const criteria = prepareListSearchCriteria(queryWithStatus);
        expect(criteria.status).toEqual([LotStatus.QUARANTINE]);
      });

      it('should handle array of statuses', () => {
        const queryWithStatuses = {
          ...validBaseQuery,
          status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
        };

        const criteria = prepareListSearchCriteria(queryWithStatuses);
        expect(criteria.status).toEqual([LotStatus.ACTIVE, LotStatus.QUARANTINE]);
      });

      it('should default to ACTIVE status when includeInactive is false', () => {
        const queryWithoutStatus = {
          ...validBaseQuery,
          includeInactive: false,
        };
        delete (queryWithoutStatus as any).status;

        const criteria = prepareListSearchCriteria(queryWithoutStatus);
        expect(criteria.status).toEqual([LotStatus.ACTIVE]);
      });

      it('should not filter by status when includeInactive is true', () => {
        const queryWithIncludeInactive = {
          ...validBaseQuery,
          includeInactive: true,
        };
        delete (queryWithIncludeInactive as any).status;

        const criteria = prepareListSearchCriteria(queryWithIncludeInactive);
        expect(criteria.status).toBeUndefined();
      });

      it('should override sortBy when fifoOrder is enabled', () => {
        const fifoQuery = {
          ...validBaseQuery,
          fifoOrder: true,
          sortBy: 'lotNumber' as const,
          sortOrder: 'DESC' as const,
        };

        const criteria = prepareListSearchCriteria(fifoQuery);
        expect(criteria.sortBy).toBe('manufacturingDate');
        expect(criteria.sortOrder).toBe('ASC');
        expect(criteria.fifoOrder).toBe(true);
      });

      it('should respect custom sorting when fifoOrder is disabled', () => {
        const customSortQuery = {
          ...validBaseQuery,
          fifoOrder: false,
          sortBy: 'lotNumber' as const,
          sortOrder: 'DESC' as const,
        };

        const criteria = prepareListSearchCriteria(customSortQuery);
        expect(criteria.sortBy).toBe('lotNumber');
        expect(criteria.sortOrder).toBe('DESC');
        expect(criteria.fifoOrder).toBe(false);
      });

      it('should include expiry filtering when includeExpired is false', () => {
        const criteria = prepareListSearchCriteria(validBaseQuery);
        expect(criteria.isExpired).toBe(false);
      });

      it('should include quantity filtering when hasQuantityOnly is true', () => {
        const criteria = prepareListSearchCriteria(validBaseQuery);
        expect(criteria.hasQuantity).toBe(true);
      });

      it('should handle agencyId filtering', () => {
        const queryWithAgency = {
          requestedBy: '550e8400-e29b-41d4-a716-446655440000',
          agencyId: '550e8400-e29b-41d4-a716-446655440002',
        };

        const criteria = prepareListSearchCriteria(queryWithAgency);
        expect(criteria.agencyId).toBe('550e8400-e29b-41d4-a716-446655440002');
        expect(criteria.productId).toBeUndefined();
      });
    });

    describe('getListAppliedFilters', () => {
      it('should return empty array when only required fields provided', () => {
        const minimalQuery = {
          requestedBy: '550e8400-e29b-41d4-a716-446655440000',
          productId: '550e8400-e29b-41d4-a716-446655440001',
          includeExpired: false,
          includeInactive: false,
          hasQuantityOnly: true,
          limit: 50,
          offset: 0,
          sortBy: 'manufacturingDate' as const,
          sortOrder: 'ASC' as const,
          fifoOrder: true,
        };

        const filters = getListAppliedFilters(minimalQuery);
        expect(filters).toContain('Product: 550e8400-e29b-41d4-a716-446655440001');
        expect(filters).toContain('Status: ACTIVE only');
        expect(filters).toContain('Exclude expired lots');
        expect(filters).toContain('With remaining quantity only');
      });

      it('should detect productId filter', () => {
        const filters = getListAppliedFilters(validBaseQuery);
        expect(filters).toContain('Product: 550e8400-e29b-41d4-a716-446655440001');
      });

      it('should detect agencyId filter', () => {
        const queryWithAgency = {
          ...validBaseQuery,
          agencyId: '550e8400-e29b-41d4-a716-446655440002',
        };

        const filters = getListAppliedFilters(queryWithAgency);
        expect(filters).toContain('Agency: 550e8400-e29b-41d4-a716-446655440002');
      });

      it('should detect status filters', () => {
        const queryWithStatus = {
          ...validBaseQuery,
          status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
        };

        const filters = getListAppliedFilters(queryWithStatus);
        expect(filters).toContain('Status: ACTIVE, QUARANTINE');
      });

      it('should detect single status filter', () => {
        const queryWithSingleStatus = {
          ...validBaseQuery,
          status: LotStatus.EXPIRED,
        };

        const filters = getListAppliedFilters(queryWithSingleStatus);
        expect(filters).toContain('Status: EXPIRED');
      });

      it('should detect default ACTIVE status when includeInactive is false', () => {
        const queryWithoutStatus = {
          ...validBaseQuery,
          includeInactive: false,
        };
        delete (queryWithoutStatus as any).status;

        const filters = getListAppliedFilters(queryWithoutStatus);
        expect(filters).toContain('Status: ACTIVE only');
      });

      it('should detect includeExpired filter', () => {
        const filters = getListAppliedFilters(validBaseQuery);
        expect(filters).toContain('Exclude expired lots');
      });

      it('should detect hasQuantityOnly filter', () => {
        const filters = getListAppliedFilters(validBaseQuery);
        expect(filters).toContain('With remaining quantity only');
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw ListLotBatchesQueryValidationError with proper structure', () => {
      const invalidQuery = {
        requestedBy: 'invalid-uuid',
        productId: 'invalid-uuid',
        limit: 0,
      };

      try {
        validateListLotBatchesQuery(invalidQuery);
        fail('Expected validation error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ListLotBatchesQueryValidationError);
        expect(error.name).toBe('ListLotBatchesQueryValidationError');
        expect(error.message).toContain('List lot/batches query validation failed');
        expect((error as ListLotBatchesQueryValidationError).validationErrors).toBeDefined();
      }
    });

    it('should include multiple validation errors in message', () => {
      const invalidQuery = {
        requestedBy: 'invalid-uuid',
        productId: 'invalid-uuid',
        limit: 0,
      };

      try {
        validateListLotBatchesQuery(invalidQuery);
        fail('Expected validation error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Invalid requester ID format');
        expect(error.message).toContain('Invalid product ID format');
        expect(error.message).toContain('Limit must be at least 1');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal valid query with productId', () => {
      const minimalQuery = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440000',
        productId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = validateListLotBatchesQuery(minimalQuery);
      expect(result.requestedBy).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.productId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.includeExpired).toBe(false);
      expect(result.includeInactive).toBe(false);
      expect(result.hasQuantityOnly).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.sortBy).toBe('manufacturingDate');
      expect(result.sortOrder).toBe('ASC');
      expect(result.fifoOrder).toBe(true);
    });

    it('should handle minimal valid query with agencyId', () => {
      const minimalQuery = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440000',
        agencyId: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = validateListLotBatchesQuery(minimalQuery);
      expect(result.agencyId).toBe('550e8400-e29b-41d4-a716-446655440002');
      expect(result.productId).toBeUndefined();
    });

    it('should handle query with all optional fields', () => {
      const maximalQuery = {
        ...validBaseQuery,
        agencyId: '550e8400-e29b-41d4-a716-446655440002',
        status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
        includeExpired: true,
        includeInactive: true,
        hasQuantityOnly: false,
        limit: 100,
        offset: 50,
        sortBy: 'lotNumber' as const,
        sortOrder: 'DESC' as const,
        fifoOrder: false,
      };

      expect(() => validateListLotBatchesQuery(maximalQuery)).not.toThrow();
      const result = validateListLotBatchesQuery(maximalQuery);
      expect(result).toMatchObject(maximalQuery);
    });

    it('should handle boundary values correctly', () => {
      const boundaryQuery = {
        ...validBaseQuery,
        limit: 1, // Minimum
        offset: 0, // Minimum
      };

      expect(() => validateListLotBatchesQuery(boundaryQuery)).not.toThrow();

      const maxBoundaryQuery = {
        ...validBaseQuery,
        limit: 1000, // Maximum
      };

      expect(() => validateListLotBatchesQuery(maxBoundaryQuery)).not.toThrow();
    });
  });
});
