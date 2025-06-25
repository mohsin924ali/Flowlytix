/**
 * Search Lot/Batches Query Tests
 *
 * Comprehensive test suite for SearchLotBatchesQuery following established patterns.
 * Tests all validation rules, business logic, and edge cases with 90%+ coverage.
 *
 * @domain Lot/Batch Management
 * @pattern Query Tests
 * @version 1.0.0
 */

import {
  SearchLotBatchesQuery,
  SearchLotBatchesQuerySchema,
  validateSearchLotBatchesQuery,
  SearchLotBatchesQueryValidationError,
  getAppliedFilters,
  prepareSearchCriteria,
} from '../search-lot-batches.query';
import { LotStatus } from '../../../../domain/value-objects/lot-batch';

describe('SearchLotBatchesQuery', () => {
  // Valid base query for testing
  const validBaseQuery: SearchLotBatchesQuery = {
    limit: 100,
    offset: 0,
    sortBy: 'manufacturingDate',
    sortOrder: 'ASC',
    fifoOrder: false,
    nearExpiryDays: 30,
    requestedBy: '550e8400-e29b-41d4-a716-446655440000',
  };

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should require requestedBy field', () => {
        const invalidQuery = { ...validBaseQuery };
        delete (invalidQuery as any).requestedBy;

        expect(() => validateSearchLotBatchesQuery(invalidQuery)).toThrow(SearchLotBatchesQueryValidationError);
      });

      it('should validate requestedBy as UUID', () => {
        const invalidQuery = {
          ...validBaseQuery,
          requestedBy: 'invalid-uuid',
        };

        expect(() => validateSearchLotBatchesQuery(invalidQuery)).toThrow(SearchLotBatchesQueryValidationError);
      });
    });

    describe('Pagination Validation', () => {
      it('should validate limit bounds', () => {
        // Minimum limit validation
        const queryWithZeroLimit = { ...validBaseQuery, limit: 0 };
        expect(() => validateSearchLotBatchesQuery(queryWithZeroLimit)).toThrow('Limit must be at least 1');

        // Maximum limit validation
        const queryWithHighLimit = { ...validBaseQuery, limit: 10001 };
        expect(() => validateSearchLotBatchesQuery(queryWithHighLimit)).toThrow('Limit cannot exceed 10000');

        // Valid limit
        const queryWithValidLimit = { ...validBaseQuery, limit: 5000 };
        expect(() => validateSearchLotBatchesQuery(queryWithValidLimit)).not.toThrow();
      });

      it('should validate offset bounds', () => {
        // Negative offset validation
        const queryWithNegativeOffset = { ...validBaseQuery, offset: -1 };
        expect(() => validateSearchLotBatchesQuery(queryWithNegativeOffset)).toThrow('Offset cannot be negative');

        // Valid offset
        const queryWithValidOffset = { ...validBaseQuery, offset: 1000 };
        expect(() => validateSearchLotBatchesQuery(queryWithValidOffset)).not.toThrow();
      });

      it('should apply default values for pagination', () => {
        const minimalQuery = {
          requestedBy: '550e8400-e29b-41d4-a716-446655440000',
        };

        const result = validateSearchLotBatchesQuery(minimalQuery);
        expect(result.limit).toBe(100);
        expect(result.offset).toBe(0);
      });
    });

    describe('Sorting Validation', () => {
      it('should validate sortBy enum values', () => {
        const validSortFields = [
          'lotNumber',
          'batchNumber',
          'manufacturingDate',
          'expiryDate',
          'status',
          'remainingQuantity',
          'createdAt',
          'updatedAt',
        ];

        validSortFields.forEach((sortField) => {
          const query = { ...validBaseQuery, sortBy: sortField as any };
          expect(() => validateSearchLotBatchesQuery(query)).not.toThrow();
        });

        // Invalid sort field
        const invalidQuery = { ...validBaseQuery, sortBy: 'invalidField' as any };
        expect(() => validateSearchLotBatchesQuery(invalidQuery)).toThrow();
      });

      it('should validate sortOrder enum values', () => {
        const validSortOrders = ['ASC', 'DESC'];

        validSortOrders.forEach((sortOrder) => {
          const query = { ...validBaseQuery, sortOrder: sortOrder as any };
          expect(() => validateSearchLotBatchesQuery(query)).not.toThrow();
        });

        // Invalid sort order
        const invalidQuery = { ...validBaseQuery, sortOrder: 'invalid' as any };
        expect(() => validateSearchLotBatchesQuery(invalidQuery)).toThrow();
      });

      it('should apply default sorting values', () => {
        const minimalQuery = {
          requestedBy: '550e8400-e29b-41d4-a716-446655440000',
        };

        const result = validateSearchLotBatchesQuery(minimalQuery);
        expect(result.sortBy).toBe('manufacturingDate');
        expect(result.sortOrder).toBe('ASC');
        expect(result.fifoOrder).toBe(false);
      });
    });

    describe('Association Filtering Validation', () => {
      it('should validate single productId as UUID', () => {
        const validQuery = {
          ...validBaseQuery,
          productId: '550e8400-e29b-41d4-a716-446655440001',
        };
        expect(() => validateSearchLotBatchesQuery(validQuery)).not.toThrow();

        const invalidQuery = {
          ...validBaseQuery,
          productId: 'invalid-uuid',
        };
        expect(() => validateSearchLotBatchesQuery(invalidQuery)).toThrow();
      });

      it('should validate array of productIds as UUIDs', () => {
        const validQuery = {
          ...validBaseQuery,
          productId: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
        };
        expect(() => validateSearchLotBatchesQuery(validQuery)).not.toThrow();

        const invalidQuery = {
          ...validBaseQuery,
          productId: ['valid-uuid', 'invalid-uuid'],
        };
        expect(() => validateSearchLotBatchesQuery(invalidQuery)).toThrow();
      });

      it('should validate agencyId and supplierId similarly', () => {
        const validQuery = {
          ...validBaseQuery,
          agencyId: '550e8400-e29b-41d4-a716-446655440003',
          supplierId: ['550e8400-e29b-41d4-a716-446655440004'],
        };
        expect(() => validateSearchLotBatchesQuery(validQuery)).not.toThrow();
      });
    });

    describe('Text Search Validation', () => {
      it('should validate text field length limits', () => {
        // Valid lengths
        const validQuery = {
          ...validBaseQuery,
          searchTerm: 'A'.repeat(255),
          lotNumber: 'A'.repeat(50),
          batchNumber: 'A'.repeat(50),
          supplierLotCode: 'A'.repeat(100),
        };
        expect(() => validateSearchLotBatchesQuery(validQuery)).not.toThrow();

        // Exceeding limits
        const invalidSearchTerm = { ...validBaseQuery, searchTerm: 'A'.repeat(256) };
        expect(() => validateSearchLotBatchesQuery(invalidSearchTerm)).toThrow('Search term too long');

        const invalidLotNumber = { ...validBaseQuery, lotNumber: 'A'.repeat(51) };
        expect(() => validateSearchLotBatchesQuery(invalidLotNumber)).toThrow('Lot number too long');
      });

      it('should accept empty strings for text fields', () => {
        const queryWithEmptyStrings = {
          ...validBaseQuery,
          searchTerm: '',
          lotNumber: '',
          batchNumber: '',
          supplierLotCode: '',
        };
        expect(() => validateSearchLotBatchesQuery(queryWithEmptyStrings)).not.toThrow();
      });
    });

    describe('Status Filtering Validation', () => {
      it('should validate single status enum', () => {
        Object.values(LotStatus).forEach((status) => {
          const query = { ...validBaseQuery, status };
          expect(() => validateSearchLotBatchesQuery(query)).not.toThrow();
        });

        const invalidQuery = { ...validBaseQuery, status: 'INVALID_STATUS' as any };
        expect(() => validateSearchLotBatchesQuery(invalidQuery)).toThrow();
      });

      it('should validate array of status enums', () => {
        const validQuery = {
          ...validBaseQuery,
          status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
        };
        expect(() => validateSearchLotBatchesQuery(validQuery)).not.toThrow();

        const invalidQuery = {
          ...validBaseQuery,
          status: [LotStatus.ACTIVE, 'INVALID_STATUS' as any],
        };
        expect(() => validateSearchLotBatchesQuery(invalidQuery)).toThrow();
      });

      it('should validate boolean status flags', () => {
        const query = {
          ...validBaseQuery,
          isActive: true,
          isExpired: false,
          isAvailable: true,
        };
        expect(() => validateSearchLotBatchesQuery(query)).not.toThrow();
      });
    });

    describe('Quantity Filtering Validation', () => {
      it('should validate quantity bounds', () => {
        // Valid quantities
        const validQuery = {
          ...validBaseQuery,
          minQuantity: 0,
          maxQuantity: 1000,
        };
        expect(() => validateSearchLotBatchesQuery(validQuery)).not.toThrow();

        // Negative quantities
        const invalidMinQuery = { ...validBaseQuery, minQuantity: -1 };
        expect(() => validateSearchLotBatchesQuery(invalidMinQuery)).toThrow('Minimum quantity cannot be negative');

        const invalidMaxQuery = { ...validBaseQuery, maxQuantity: -1 };
        expect(() => validateSearchLotBatchesQuery(invalidMaxQuery)).toThrow('Maximum quantity cannot be negative');
      });

      it('should validate quantity range logic', () => {
        // Valid range
        const validQuery = {
          ...validBaseQuery,
          minQuantity: 10,
          maxQuantity: 100,
        };
        expect(() => validateSearchLotBatchesQuery(validQuery)).not.toThrow();

        // Invalid range (min > max)
        const invalidQuery = {
          ...validBaseQuery,
          minQuantity: 100,
          maxQuantity: 10,
        };
        expect(() => validateSearchLotBatchesQuery(invalidQuery)).toThrow(
          'Minimum quantity must be less than or equal to maximum quantity'
        );
      });

      it('should validate boolean quantity flags', () => {
        const query = {
          ...validBaseQuery,
          hasQuantity: true,
          hasReservedQuantity: false,
        };
        expect(() => validateSearchLotBatchesQuery(query)).not.toThrow();
      });
    });

    describe('Date Range Validation', () => {
      const futureDate = new Date('2025-12-31');
      const pastDate = new Date('2023-01-01');

      it('should validate manufacturing date ranges', () => {
        // Valid range
        const validQuery = {
          ...validBaseQuery,
          manufacturingDateAfter: pastDate,
          manufacturingDateBefore: futureDate,
        };
        expect(() => validateSearchLotBatchesQuery(validQuery)).not.toThrow();

        // Invalid range (after > before)
        const invalidQuery = {
          ...validBaseQuery,
          manufacturingDateAfter: futureDate,
          manufacturingDateBefore: pastDate,
        };
        expect(() => validateSearchLotBatchesQuery(invalidQuery)).toThrow(
          'Manufacturing date after must be before or equal to manufacturing date before'
        );
      });

      it('should validate expiry date ranges', () => {
        // Valid range
        const validQuery = {
          ...validBaseQuery,
          expiryDateAfter: pastDate,
          expiryDateBefore: futureDate,
        };
        expect(() => validateSearchLotBatchesQuery(validQuery)).not.toThrow();

        // Invalid range
        const invalidQuery = {
          ...validBaseQuery,
          expiryDateAfter: futureDate,
          expiryDateBefore: pastDate,
        };
        expect(() => validateSearchLotBatchesQuery(invalidQuery)).toThrow(
          'Expiry date after must be before or equal to expiry date before'
        );
      });

      it('should validate created and updated date ranges', () => {
        // Valid created range
        const validCreatedQuery = {
          ...validBaseQuery,
          createdAfter: pastDate,
          createdBefore: futureDate,
        };
        expect(() => validateSearchLotBatchesQuery(validCreatedQuery)).not.toThrow();

        // Valid updated range
        const validUpdatedQuery = {
          ...validBaseQuery,
          updatedAfter: pastDate,
          updatedBefore: futureDate,
        };
        expect(() => validateSearchLotBatchesQuery(validUpdatedQuery)).not.toThrow();
      });

      it('should coerce string dates to Date objects', () => {
        const queryWithStringDates = {
          ...validBaseQuery,
          manufacturingDateAfter: '2023-01-01',
          expiryDateBefore: '2025-12-31',
        };

        const result = validateSearchLotBatchesQuery(queryWithStringDates);
        expect(result.manufacturingDateAfter).toBeInstanceOf(Date);
        expect(result.expiryDateBefore).toBeInstanceOf(Date);
      });
    });

    describe('Expiry Filtering Validation', () => {
      it('should validate expiringWithinDays bounds', () => {
        // Valid values
        const validQuery = {
          ...validBaseQuery,
          expiringWithinDays: 30,
        };
        expect(() => validateSearchLotBatchesQuery(validQuery)).not.toThrow();

        // Negative days
        const invalidNegativeQuery = { ...validBaseQuery, expiringWithinDays: -1 };
        expect(() => validateSearchLotBatchesQuery(invalidNegativeQuery)).toThrow('Days cannot be negative');

        // Exceeding maximum
        const invalidMaxQuery = { ...validBaseQuery, expiringWithinDays: 3651 };
        expect(() => validateSearchLotBatchesQuery(invalidMaxQuery)).toThrow('Days cannot exceed 10 years');
      });

      it('should validate nearExpiryDays bounds', () => {
        // Valid values
        const validQuery = {
          ...validBaseQuery,
          nearExpiryDays: 60,
        };
        expect(() => validateSearchLotBatchesQuery(validQuery)).not.toThrow();

        // Below minimum
        const invalidMinQuery = { ...validBaseQuery, nearExpiryDays: 0 };
        expect(() => validateSearchLotBatchesQuery(invalidMinQuery)).toThrow('Near expiry days must be at least 1');

        // Exceeding maximum
        const invalidMaxQuery = { ...validBaseQuery, nearExpiryDays: 366 };
        expect(() => validateSearchLotBatchesQuery(invalidMaxQuery)).toThrow('Near expiry days cannot exceed 1 year');
      });

      it('should apply default nearExpiryDays value', () => {
        const minimalQuery = {
          requestedBy: '550e8400-e29b-41d4-a716-446655440000',
        };

        const result = validateSearchLotBatchesQuery(minimalQuery);
        expect(result.nearExpiryDays).toBe(30);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('getAppliedFilters', () => {
      it('should return empty array when no filters applied', () => {
        const filters = getAppliedFilters(validBaseQuery);
        expect(filters).toEqual([]);
      });

      it('should detect association filters', () => {
        const queryWithAssociations = {
          ...validBaseQuery,
          productId: ['550e8400-e29b-41d4-a716-446655440001'],
          agencyId: '550e8400-e29b-41d4-a716-446655440002',
          supplierId: ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004'],
        };

        const filters = getAppliedFilters(queryWithAssociations);
        expect(filters).toContain('Product ID(s): 1 selected');
        expect(filters).toContain('Agency ID(s): 1 selected');
        expect(filters).toContain('Supplier ID(s): 2 selected');
      });

      it('should detect text search filters', () => {
        const queryWithTextSearch = {
          ...validBaseQuery,
          searchTerm: 'test search',
          lotNumber: 'LOT001',
          batchNumber: 'BATCH001',
          supplierLotCode: 'SUP001',
        };

        const filters = getAppliedFilters(queryWithTextSearch);
        expect(filters).toContain('Search: "test search"');
        expect(filters).toContain('Lot Number: "LOT001"');
        expect(filters).toContain('Batch Number: "BATCH001"');
        expect(filters).toContain('Supplier Code: "SUP001"');
      });

      it('should detect status filters', () => {
        const queryWithStatusFilters = {
          ...validBaseQuery,
          status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
          isActive: true,
          isExpired: false,
          isAvailable: true,
        };

        const filters = getAppliedFilters(queryWithStatusFilters);
        expect(filters).toContain('Status: ACTIVE, QUARANTINE');
        expect(filters).toContain('Active lots only');
        expect(filters).toContain('Available lots only');
        expect(filters).not.toContain('Expired lots only');
      });

      it('should detect quantity filters', () => {
        const queryWithQuantityFilters = {
          ...validBaseQuery,
          hasQuantity: true,
          minQuantity: 10,
          maxQuantity: 100,
          hasReservedQuantity: true,
        };

        const filters = getAppliedFilters(queryWithQuantityFilters);
        expect(filters).toContain('With remaining quantity');
        expect(filters).toContain('Min quantity: 10');
        expect(filters).toContain('Max quantity: 100');
        expect(filters).toContain('With reserved quantity');
      });

      it('should detect date filters', () => {
        const queryWithDateFilters = {
          ...validBaseQuery,
          manufacturingDateAfter: new Date('2023-01-01'),
          manufacturingDateBefore: new Date('2023-12-31'),
          expiryDateAfter: new Date('2024-01-01'),
          expiryDateBefore: new Date('2024-12-31'),
          expiringWithinDays: 30,
        };

        const filters = getAppliedFilters(queryWithDateFilters);
        expect(filters).toContain('Manufacturing after: 2023-01-01');
        expect(filters).toContain('Manufacturing before: 2023-12-31');
        expect(filters).toContain('Expiry after: 2024-01-01');
        expect(filters).toContain('Expiry before: 2024-12-31');
        expect(filters).toContain('Expiring within 30 days');
      });
    });

    describe('prepareSearchCriteria', () => {
      it('should map basic query fields correctly', () => {
        const criteria = prepareSearchCriteria(validBaseQuery);
        expect(criteria.limit).toBe(100);
        expect(criteria.offset).toBe(0);
        expect(criteria.sortBy).toBe('manufacturingDate');
        expect(criteria.sortOrder).toBe('ASC');
        expect(criteria.fifoOrder).toBe(false);
      });

      it('should override sortBy when fifoOrder is enabled', () => {
        const fifoQuery = {
          ...validBaseQuery,
          fifoOrder: true,
          sortBy: 'lotNumber' as const,
          sortOrder: 'DESC' as const,
        };

        const criteria = prepareSearchCriteria(fifoQuery);
        expect(criteria.sortBy).toBe('manufacturingDate');
        expect(criteria.sortOrder).toBe('ASC');
        expect(criteria.fifoOrder).toBe(true);
      });

      it('should include all filter fields when present', () => {
        const complexQuery = {
          ...validBaseQuery,
          productId: '550e8400-e29b-41d4-a716-446655440001',
          searchTerm: 'test',
          status: LotStatus.ACTIVE,
          minQuantity: 10,
          manufacturingDateAfter: new Date('2023-01-01'),
          expiringWithinDays: 30,
        };

        const criteria = prepareSearchCriteria(complexQuery);
        expect(criteria.productId).toBe('550e8400-e29b-41d4-a716-446655440001');
        expect(criteria.searchTerm).toBe('test');
        expect(criteria.status).toBe(LotStatus.ACTIVE);
        expect(criteria.minQuantity).toBe(10);
        expect(criteria.manufacturingDateAfter).toEqual(new Date('2023-01-01'));
        expect(criteria.expiringWithinDays).toBe(30);
      });

      it('should omit undefined fields from criteria', () => {
        const criteria = prepareSearchCriteria(validBaseQuery);
        expect(criteria).not.toHaveProperty('productId');
        expect(criteria).not.toHaveProperty('searchTerm');
        expect(criteria).not.toHaveProperty('status');
        expect(criteria).not.toHaveProperty('minQuantity');
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw SearchLotBatchesQueryValidationError with proper structure', () => {
      const invalidQuery = {
        requestedBy: 'invalid-uuid',
        limit: -1,
        offset: -1,
      };

      try {
        validateSearchLotBatchesQuery(invalidQuery);
        fail('Expected validation error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SearchLotBatchesQueryValidationError);
        expect(error.name).toBe('SearchLotBatchesQueryValidationError');
        expect(error.message).toContain('Search lot/batches query validation failed');
        expect((error as SearchLotBatchesQueryValidationError).validationErrors).toBeDefined();
      }
    });

    it('should include multiple validation errors in message', () => {
      const invalidQuery = {
        requestedBy: 'invalid-uuid',
        limit: 0,
        minQuantity: 100,
        maxQuantity: 10,
      };

      try {
        validateSearchLotBatchesQuery(invalidQuery);
        fail('Expected validation error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Invalid requester ID format');
        expect(error.message).toContain('Limit must be at least 1');
        expect(error.message).toContain('Minimum quantity must be less than or equal to maximum quantity');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal valid query', () => {
      const minimalQuery = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = validateSearchLotBatchesQuery(minimalQuery);
      expect(result.requestedBy).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
      expect(result.sortBy).toBe('manufacturingDate');
      expect(result.sortOrder).toBe('ASC');
      expect(result.fifoOrder).toBe(false);
      expect(result.nearExpiryDays).toBe(30);
    });

    it('should handle query with all optional fields', () => {
      const maximalQuery = {
        ...validBaseQuery,
        productId: ['550e8400-e29b-41d4-a716-446655440001'],
        agencyId: '550e8400-e29b-41d4-a716-446655440002',
        supplierId: ['550e8400-e29b-41d4-a716-446655440003'],
        createdBy: ['550e8400-e29b-41d4-a716-446655440004'],
        searchTerm: 'comprehensive search',
        lotNumber: 'LOT001',
        batchNumber: 'BATCH001',
        supplierLotCode: 'SUP001',
        status: [LotStatus.ACTIVE, LotStatus.QUARANTINE],
        isActive: true,
        isExpired: false,
        isAvailable: true,
        hasQuantity: true,
        minQuantity: 10,
        maxQuantity: 1000,
        hasReservedQuantity: true,
        manufacturingDateAfter: new Date('2023-01-01'),
        manufacturingDateBefore: new Date('2023-12-31'),
        expiryDateAfter: new Date('2024-01-01'),
        expiryDateBefore: new Date('2024-12-31'),
        createdAfter: new Date('2023-06-01'),
        createdBefore: new Date('2023-06-30'),
        updatedAfter: new Date('2023-07-01'),
        updatedBefore: new Date('2023-07-31'),
        expiringWithinDays: 60,
        nearExpiryDays: 45,
        limit: 500,
        offset: 100,
        sortBy: 'expiryDate' as const,
        sortOrder: 'DESC' as const,
        fifoOrder: true,
      };

      expect(() => validateSearchLotBatchesQuery(maximalQuery)).not.toThrow();
      const result = validateSearchLotBatchesQuery(maximalQuery);
      expect(result).toMatchObject(maximalQuery);
    });

    it('should handle boundary values correctly', () => {
      const boundaryQuery = {
        ...validBaseQuery,
        limit: 1, // Minimum
        offset: 0, // Minimum
        minQuantity: 0, // Minimum
        maxQuantity: 0, // Equal to min (edge case)
        expiringWithinDays: 0, // Minimum
        nearExpiryDays: 1, // Minimum
        searchTerm: 'A'.repeat(255), // Maximum length
        lotNumber: 'A'.repeat(50), // Maximum length
        batchNumber: 'A'.repeat(50), // Maximum length
        supplierLotCode: 'A'.repeat(100), // Maximum length
      };

      expect(() => validateSearchLotBatchesQuery(boundaryQuery)).not.toThrow();
    });
  });
});
