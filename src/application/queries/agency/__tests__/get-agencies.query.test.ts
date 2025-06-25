/**
 * Get Agencies Query Tests - Step MT-3B
 *
 * Unit tests for GetAgenciesQuery validation, business rules, and query functionality.
 *
 * STEP MT-3B TEST SCOPE:
 * - Query validation with Zod schemas
 * - Business rules enforcement
 * - Date range validation
 * - Pagination and filtering
 * - Error handling and edge cases
 * - Performance considerations
 *
 * @domain Agency Management
 * @pattern CQRS Query Testing
 * @architecture Multi-tenant
 * @version 1.0.0
 */

import {
  GetAgenciesQuery,
  validateGetAgenciesQuery,
  validateAgenciesQueryBusinessRules,
  GetAgenciesQueryValidationError,
} from '../get-agencies.query';
import { AgencyStatus } from '../../../../domain/entities/agency';

describe('GetAgenciesQuery - Step MT-3B', () => {
  const validQueryData: GetAgenciesQuery = {
    limit: 50,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    status: AgencyStatus.ACTIVE,
    search: 'test agency',
    contactPerson: 'John Doe',
    currency: 'USD',
    createdAfter: '2024-01-01T00:00:00.000Z',
    createdBefore: '2024-12-31T23:59:59.999Z',
    updatedAfter: '2024-06-01T00:00:00.000Z',
    updatedBefore: '2024-12-31T23:59:59.999Z',
    allowsCreditSales: true,
    enablesInventoryTracking: true,
    requestedBy: '123e4567-e89b-12d3-a456-426614174000',
    agencyId: '987e6543-e21b-34c5-a765-426614174999',
  };

  describe('validateGetAgenciesQuery() - Validation', () => {
    it('should validate a valid query successfully', () => {
      expect(() => validateGetAgenciesQuery(validQueryData)).not.toThrow();

      const result = validateGetAgenciesQuery(validQueryData);
      expect(result).toEqual(validQueryData);
    });

    it('should apply default values for optional fields', () => {
      const minimalQuery = {
        requestedBy: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateGetAgenciesQuery(minimalQuery);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should validate limit bounds', () => {
      const invalidQuery = { ...validQueryData, limit: 0 };

      expect(() => validateGetAgenciesQuery(invalidQuery)).toThrow(GetAgenciesQueryValidationError);

      const invalidQuery2 = { ...validQueryData, limit: 1001 };

      expect(() => validateGetAgenciesQuery(invalidQuery2)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should validate offset bounds', () => {
      const invalidQuery = { ...validQueryData, offset: -1 };

      expect(() => validateGetAgenciesQuery(invalidQuery)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should validate integer requirements for limit and offset', () => {
      const invalidQuery = { ...validQueryData, limit: 50.5 };

      expect(() => validateGetAgenciesQuery(invalidQuery)).toThrow(GetAgenciesQueryValidationError);

      const invalidQuery2 = { ...validQueryData, offset: 10.3 };

      expect(() => validateGetAgenciesQuery(invalidQuery2)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should validate sortBy enum values', () => {
      const invalidQuery = { ...validQueryData, sortBy: 'invalidField' as any };

      expect(() => validateGetAgenciesQuery(invalidQuery)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should validate sortOrder enum values', () => {
      const invalidQuery = { ...validQueryData, sortOrder: 'invalid' as any };

      expect(() => validateGetAgenciesQuery(invalidQuery)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should validate agency status enum', () => {
      const invalidQuery = { ...validQueryData, status: 'invalid-status' as any };

      expect(() => validateGetAgenciesQuery(invalidQuery)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should validate search term length', () => {
      const invalidQuery = { ...validQueryData, search: 'a'.repeat(256) };

      expect(() => validateGetAgenciesQuery(invalidQuery)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should validate contact person name length', () => {
      const invalidQuery = { ...validQueryData, contactPerson: 'a'.repeat(101) };

      expect(() => validateGetAgenciesQuery(invalidQuery)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should validate currency code format', () => {
      const invalidQuery = { ...validQueryData, currency: 'INVALID' };

      expect(() => validateGetAgenciesQuery(invalidQuery)).toThrow(GetAgenciesQueryValidationError);

      const invalidQuery2 = { ...validQueryData, currency: 'us' };

      expect(() => validateGetAgenciesQuery(invalidQuery2)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should validate datetime formats', () => {
      const invalidQuery = { ...validQueryData, createdAfter: '2024-01-01' };

      expect(() => validateGetAgenciesQuery(invalidQuery)).toThrow(GetAgenciesQueryValidationError);

      const invalidQuery2 = { ...validQueryData, updatedBefore: 'invalid-date' };

      expect(() => validateGetAgenciesQuery(invalidQuery2)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should validate UUID formats', () => {
      const invalidQuery = { ...validQueryData, requestedBy: 'invalid-uuid' };

      expect(() => validateGetAgenciesQuery(invalidQuery)).toThrow(GetAgenciesQueryValidationError);

      const invalidQuery2 = { ...validQueryData, agencyId: 'not-a-uuid' };

      expect(() => validateGetAgenciesQuery(invalidQuery2)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should require requestedBy field', () => {
      const invalidQuery = { ...validQueryData };
      delete (invalidQuery as any).requestedBy;

      expect(() => validateGetAgenciesQuery(invalidQuery)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should handle optional fields correctly', () => {
      const queryWithOptionals = {
        requestedBy: validQueryData.requestedBy,
        limit: 25,
        offset: 10,
      };

      expect(() => validateGetAgenciesQuery(queryWithOptionals)).not.toThrow();

      const result = validateGetAgenciesQuery(queryWithOptionals);
      expect(result.status).toBeUndefined();
      expect(result.search).toBeUndefined();
      expect(result.contactPerson).toBeUndefined();
      expect(result.currency).toBeUndefined();
    });
  });

  describe('validateAgenciesQueryBusinessRules() - Business Logic Validation', () => {
    it('should pass validation for valid business rules', () => {
      expect(() => validateAgenciesQueryBusinessRules(validQueryData)).not.toThrow();
    });

    it('should enforce date range coherence for created dates', () => {
      const invalidQuery = {
        ...validQueryData,
        createdAfter: '2024-12-31T23:59:59.999Z',
        createdBefore: '2024-01-01T00:00:00.000Z',
      };

      expect(() => validateAgenciesQueryBusinessRules(invalidQuery)).toThrow(
        'createdAfter date must be before createdBefore date'
      );
    });

    it('should enforce date range coherence for updated dates', () => {
      const invalidQuery = {
        ...validQueryData,
        updatedAfter: '2024-12-31T23:59:59.999Z',
        updatedBefore: '2024-01-01T00:00:00.000Z',
      };

      expect(() => validateAgenciesQueryBusinessRules(invalidQuery)).toThrow(
        'updatedAfter date must be before updatedBefore date'
      );
    });

    it('should allow equal created dates', () => {
      const validQuery = {
        ...validQueryData,
        createdAfter: '2024-06-01T00:00:00.000Z',
        createdBefore: '2024-06-01T00:00:00.000Z',
      };

      // Equal dates should fail (not inclusive)
      expect(() => validateAgenciesQueryBusinessRules(validQuery)).toThrow();
    });

    it('should warn for large date ranges', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const queryWithLargeDateRange = {
        ...validQueryData,
        createdAfter: '2022-01-01T00:00:00.000Z',
        createdBefore: '2024-12-31T23:59:59.999Z', // > 1 year range
      };

      expect(() => validateAgenciesQueryBusinessRules(queryWithLargeDateRange)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Date range exceeds 1 year - query performance may be impacted');

      consoleWarnSpy.mockRestore();
    });

    it('should warn for large initial page sizes', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const queryWithLargeLimit = {
        ...validQueryData,
        limit: 600,
        offset: 0,
      };

      expect(() => validateAgenciesQueryBusinessRules(queryWithLargeLimit)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Large initial page size may impact performance - consider using smaller limit with pagination'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should warn for very large offsets', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const queryWithLargeOffset = {
        ...validQueryData,
        offset: 15000,
      };

      expect(() => validateAgenciesQueryBusinessRules(queryWithLargeOffset)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Very large offset may impact performance - consider using cursor-based pagination'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should warn for very short search terms', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const queryWithShortSearch = {
        ...validQueryData,
        search: 'a',
      };

      expect(() => validateAgenciesQueryBusinessRules(queryWithShortSearch)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Very short search terms may return too many results');

      consoleWarnSpy.mockRestore();
    });

    it('should warn for SQL wildcard characters in search', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const queryWithWildcards = {
        ...validQueryData,
        search: 'test%agency',
      };

      expect(() => validateAgenciesQueryBusinessRules(queryWithWildcards)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Search term contains SQL wildcard characters - ensure proper escaping'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should warn for unsupported currencies', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const queryWithUnsupportedCurrency = {
        ...validQueryData,
        currency: 'XYZ',
      };

      expect(() => validateAgenciesQueryBusinessRules(queryWithUnsupportedCurrency)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Currency filter XYZ may not be widely supported');

      consoleWarnSpy.mockRestore();
    });

    it('should handle empty search terms gracefully', () => {
      const queryWithEmptySearch = {
        ...validQueryData,
        search: '   ',
      };

      expect(() => validateAgenciesQueryBusinessRules(queryWithEmptySearch)).not.toThrow();
    });

    it('should handle queries without date filters', () => {
      const queryWithoutDates = {
        ...validQueryData,
      };
      delete queryWithoutDates.createdAfter;
      delete queryWithoutDates.createdBefore;
      delete queryWithoutDates.updatedAfter;
      delete queryWithoutDates.updatedBefore;

      expect(() => validateAgenciesQueryBusinessRules(queryWithoutDates)).not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => validateGetAgenciesQuery(null)).toThrow(GetAgenciesQueryValidationError);
      expect(() => validateGetAgenciesQuery(undefined)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should provide detailed validation errors', () => {
      const invalidQuery = {
        limit: -1,
        offset: -5,
        sortBy: 'invalid',
        requestedBy: 'not-a-uuid',
      };

      try {
        validateGetAgenciesQuery(invalidQuery);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(GetAgenciesQueryValidationError);
        const validationError = error as GetAgenciesQueryValidationError;
        expect(validationError.validationErrors).toHaveProperty('limit');
        expect(validationError.validationErrors).toHaveProperty('offset');
        expect(validationError.validationErrors).toHaveProperty('sortBy');
        expect(validationError.validationErrors).toHaveProperty('requestedBy');
      }
    });

    it('should handle large numbers appropriately', () => {
      const queryWithLargeNumbers = {
        ...validQueryData,
        limit: Number.MAX_SAFE_INTEGER,
        offset: Number.MAX_SAFE_INTEGER,
      };

      expect(() => validateGetAgenciesQuery(queryWithLargeNumbers)).toThrow(GetAgenciesQueryValidationError);
    });

    it('should handle special characters in search terms', () => {
      const queryWithSpecialChars = {
        ...validQueryData,
        search: 'test & company <script>',
      };

      expect(() => validateGetAgenciesQuery(queryWithSpecialChars)).not.toThrow();
    });

    it('should validate business rule edge cases', () => {
      // Date range with same millisecond should fail
      const sameTimeQuery = {
        ...validQueryData,
        createdAfter: '2024-06-01T12:00:00.000Z',
        createdBefore: '2024-06-01T12:00:00.000Z',
      };

      expect(() => validateAgenciesQueryBusinessRules(sameTimeQuery)).toThrow();
    });
  });

  describe('Performance and Optimization Warnings', () => {
    it('should warn for performance-impacting combinations', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const performanceQuery = {
        ...validQueryData,
        limit: 600,
        offset: 0,
        createdAfter: '2020-01-01T00:00:00.000Z',
        createdBefore: '2024-12-31T23:59:59.999Z',
        search: 'a',
      };

      expect(() => validateAgenciesQueryBusinessRules(performanceQuery)).not.toThrow();

      // Should have multiple warnings
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Large initial page size may impact performance - consider using smaller limit with pagination'
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith('Date range exceeds 1 year - query performance may be impacted');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Very short search terms may return too many results');

      consoleWarnSpy.mockRestore();
    });
  });
});
