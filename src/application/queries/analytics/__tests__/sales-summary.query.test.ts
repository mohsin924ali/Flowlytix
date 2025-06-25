/**
 * Sales Summary Analytics Query Tests
 *
 * Comprehensive unit tests for SalesSummaryQuery validation covering:
 * - Required field validation
 * - Date range validation
 * - Business logic validation
 * - Filters validation
 * - Edge cases and error scenarios
 *
 * @domain Reports and Analytics
 * @pattern Test-Driven Development
 * @version 1.0.0
 */

import {
  SalesSummaryQuery,
  SalesMetrics,
  SalesSummaryFilters,
  SalesSummaryQueryValidationError,
  validateSalesSummaryQuery,
} from '../sales-summary.query';
import { ReportPeriodType } from '../../../../domain/value-objects/report-period';

describe('SalesSummaryQuery Validation', () => {
  const validMetrics: SalesMetrics = {
    includeTotalSales: true,
    includeOrderCount: true,
    includeAverageOrderValue: true,
    includeTopProducts: false,
    includeTopCustomers: false,
    includePaymentMethods: false,
    includeFulfillmentStatus: false,
    includeGrowthRate: false,
  };

  const validQuery: SalesSummaryQuery = {
    agencyId: 'agency-123',
    periodType: ReportPeriodType.LAST_30_DAYS,
    metrics: validMetrics,
    requestedBy: 'user-456',
  };

  describe('Required Fields Validation', () => {
    it('should validate a valid query successfully', () => {
      expect(() => validateSalesSummaryQuery(validQuery)).not.toThrow();
    });

    it('should throw error for missing requestedBy', () => {
      const invalidQuery = { ...validQuery, requestedBy: '' };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('RequestedBy is required');
    });

    it('should throw error for non-string requestedBy', () => {
      const invalidQuery = { ...validQuery, requestedBy: 123 as any };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('RequestedBy is required and must be a string');
    });

    it('should throw error for missing agencyId', () => {
      const invalidQuery = { ...validQuery, agencyId: '' };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('AgencyId is required');
    });

    it('should throw error for non-string agencyId', () => {
      const invalidQuery = { ...validQuery, agencyId: 123 as any };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('AgencyId is required and must be a string');
    });

    it('should throw error for missing metrics', () => {
      const invalidQuery = { ...validQuery, metrics: undefined as any };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('Metrics configuration is required');
    });

    it('should throw error for non-object metrics', () => {
      const invalidQuery = { ...validQuery, metrics: 'invalid' as any };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('Metrics configuration is required');
    });
  });

  describe('Date Validation', () => {
    it('should accept valid date range', () => {
      const queryWithDates = {
        ...validQuery,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      expect(() => validateSalesSummaryQuery(queryWithDates)).not.toThrow();
    });

    it('should throw error for invalid startDate', () => {
      const invalidQuery = {
        ...validQuery,
        startDate: 'invalid-date' as any,
        endDate: new Date('2024-01-31'),
      };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('StartDate must be a Date object');
    });

    it('should throw error for invalid endDate', () => {
      const invalidQuery = {
        ...validQuery,
        startDate: new Date('2024-01-01'),
        endDate: 'invalid-date' as any,
      };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('EndDate must be a Date object');
    });

    it('should throw error when startDate is after endDate', () => {
      const invalidQuery = {
        ...validQuery,
        startDate: new Date('2024-01-31'),
        endDate: new Date('2024-01-01'),
      };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('StartDate must be before EndDate');
    });

    it('should throw error when startDate equals endDate', () => {
      const date = new Date('2024-01-15');
      const invalidQuery = {
        ...validQuery,
        startDate: date,
        endDate: new Date(date),
      };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('StartDate must be before EndDate');
    });

    it('should throw error for date range exceeding 2 years', () => {
      const invalidQuery = {
        ...validQuery,
        startDate: new Date('2022-01-01'),
        endDate: new Date('2024-01-02'), // More than 2 years
      };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('Date range cannot exceed 2 years');
    });

    it('should accept exactly 2 years range', () => {
      const queryWith2Years = {
        ...validQuery,
        startDate: new Date('2022-01-01'),
        endDate: new Date('2023-12-31'),
      };

      expect(() => validateSalesSummaryQuery(queryWith2Years)).not.toThrow();
    });
  });

  describe('Period Type Validation', () => {
    it('should accept valid period types', () => {
      const validPeriodTypes = Object.values(ReportPeriodType);

      for (const periodType of validPeriodTypes) {
        const query = { ...validQuery, periodType };
        expect(() => validateSalesSummaryQuery(query)).not.toThrow();
      }
    });

    it('should throw error for invalid period type', () => {
      const invalidQuery = { ...validQuery, periodType: 'INVALID_PERIOD' as ReportPeriodType };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('Invalid period type');
    });
  });

  describe('GroupBy Validation', () => {
    it('should accept valid groupBy options', () => {
      const validGroupBy = ['day', 'week', 'month', 'quarter', 'year', 'customer', 'product', 'area'];

      for (const groupBy of validGroupBy) {
        const query = { ...validQuery, groupBy: groupBy as any };
        expect(() => validateSalesSummaryQuery(query)).not.toThrow();
      }
    });

    it('should throw error for invalid groupBy', () => {
      const invalidQuery = { ...validQuery, groupBy: 'invalid' as any };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('GroupBy must be one of');
    });
  });

  describe('TopN Validation', () => {
    it('should accept valid topN values', () => {
      const validTopN = [1, 10, 50, 100];

      for (const topN of validTopN) {
        const query = { ...validQuery, topN };
        expect(() => validateSalesSummaryQuery(query)).not.toThrow();
      }
    });

    it('should throw error for topN less than 1', () => {
      const invalidQuery = { ...validQuery, topN: 0 };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('TopN must be between 1 and 100');
    });

    it('should throw error for topN greater than 100', () => {
      const invalidQuery = { ...validQuery, topN: 101 };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('TopN must be between 1 and 100');
    });

    it('should throw error for non-number topN', () => {
      const invalidQuery = { ...validQuery, topN: 'ten' as any };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('TopN must be between 1 and 100');
    });
  });

  describe('Timezone Validation', () => {
    it('should accept valid timezone string', () => {
      const query = { ...validQuery, timezone: 'America/New_York' };

      expect(() => validateSalesSummaryQuery(query)).not.toThrow();
    });

    it('should throw error for non-string timezone', () => {
      const invalidQuery = { ...validQuery, timezone: 123 as any };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('Timezone must be a string');
    });
  });

  describe('Metrics Validation', () => {
    it('should validate all metrics as booleans', () => {
      const validMetricsConfig: SalesMetrics = {
        includeTotalSales: true,
        includeOrderCount: false,
        includeAverageOrderValue: true,
        includeTopProducts: false,
        includeTopCustomers: true,
        includePaymentMethods: false,
        includeFulfillmentStatus: true,
        includeGrowthRate: false,
      };

      const query = { ...validQuery, metrics: validMetricsConfig };

      expect(() => validateSalesSummaryQuery(query)).not.toThrow();
    });

    it('should throw error for non-boolean metrics', () => {
      const invalidMetrics = { ...validMetrics, includeTotalSales: 'yes' as any };
      const invalidQuery = { ...validQuery, metrics: invalidMetrics };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('includeTotalSales must be a boolean');
    });

    it('should throw error when no metrics are requested', () => {
      const noMetrics: SalesMetrics = {
        includeTotalSales: false,
        includeOrderCount: false,
        includeAverageOrderValue: false,
        includeTopProducts: false,
        includeTopCustomers: false,
        includePaymentMethods: false,
        includeFulfillmentStatus: false,
        includeGrowthRate: false,
      };

      const invalidQuery = { ...validQuery, metrics: noMetrics };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('At least one metric must be requested');
    });
  });

  describe('Filters Validation', () => {
    it('should accept valid filters', () => {
      const validFilters: SalesSummaryFilters = {
        customerId: 'customer-123',
        customerCode: 'CUST001',
        productId: 'product-456',
        productSku: 'SKU001',
        categoryId: 'category-789',
        areaId: 'area-101',
        workerId: 'worker-112',
        paymentMethod: 'cash',
        fulfillmentStatus: 'delivered',
        minimumOrderValue: 100,
        maximumOrderValue: 5000,
      };

      const query = { ...validQuery, filters: validFilters };

      expect(() => validateSalesSummaryQuery(query)).not.toThrow();
    });

    it('should throw error for negative minimumOrderValue', () => {
      const invalidFilters = { minimumOrderValue: -100 };
      const invalidQuery = { ...validQuery, filters: invalidFilters };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('MinimumOrderValue must be a positive number');
    });

    it('should throw error for non-number minimumOrderValue', () => {
      const invalidFilters = { minimumOrderValue: 'hundred' as any };
      const invalidQuery = { ...validQuery, filters: invalidFilters };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('MinimumOrderValue must be a positive number');
    });

    it('should throw error when minimumOrderValue >= maximumOrderValue', () => {
      const invalidFilters = { minimumOrderValue: 1000, maximumOrderValue: 500 };
      const invalidQuery = { ...validQuery, filters: invalidFilters };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(
        'MinimumOrderValue must be less than MaximumOrderValue'
      );
    });

    it('should throw error for empty string filters', () => {
      const stringFields = [
        'customerId',
        'customerCode',
        'productId',
        'productSku',
        'categoryId',
        'areaId',
        'workerId',
        'paymentMethod',
        'fulfillmentStatus',
      ];

      for (const field of stringFields) {
        const invalidFilters = { [field]: '' };
        const invalidQuery = { ...validQuery, filters: invalidFilters };

        expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
        expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(`${field} must be a non-empty string`);
      }
    });

    it('should throw error for non-string filters', () => {
      const invalidFilters = { customerId: 123 as any };
      const invalidQuery = { ...validQuery, filters: invalidFilters };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('customerId must be a non-empty string');
    });
  });

  describe('Business Logic Validation', () => {
    it('should require topN when includeTopProducts is true', () => {
      const metricsWithTopProducts = { ...validMetrics, includeTopProducts: true };
      const invalidQuery = { ...validQuery, metrics: metricsWithTopProducts };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow('TopN is required when includeTopProducts is true');
    });

    it('should accept topN when includeTopProducts is true', () => {
      const metricsWithTopProducts = { ...validMetrics, includeTopProducts: true };
      const validQueryWithTopProducts = { ...validQuery, metrics: metricsWithTopProducts, topN: 10 };

      expect(() => validateSalesSummaryQuery(validQueryWithTopProducts)).not.toThrow();
    });

    it('should require topN when includeTopCustomers is true', () => {
      const metricsWithTopCustomers = { ...validMetrics, includeTopCustomers: true };
      const invalidQuery = { ...validQuery, metrics: metricsWithTopCustomers };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(
        'TopN is required when includeTopCustomers is true'
      );
    });

    it('should accept topN when includeTopCustomers is true', () => {
      const metricsWithTopCustomers = { ...validMetrics, includeTopCustomers: true };
      const validQueryWithTopCustomers = { ...validQuery, metrics: metricsWithTopCustomers, topN: 5 };

      expect(() => validateSalesSummaryQuery(validQueryWithTopCustomers)).not.toThrow();
    });

    it('should require includeComparisons when includeGrowthRate is true', () => {
      const metricsWithGrowth = { ...validMetrics, includeGrowthRate: true };
      const invalidQuery = { ...validQuery, metrics: metricsWithGrowth };

      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(SalesSummaryQueryValidationError);
      expect(() => validateSalesSummaryQuery(invalidQuery)).toThrow(
        'IncludeComparisons must be true when includeGrowthRate is true'
      );
    });

    it('should accept includeComparisons when includeGrowthRate is true', () => {
      const metricsWithGrowth = { ...validMetrics, includeGrowthRate: true };
      const validQueryWithGrowth = { ...validQuery, metrics: metricsWithGrowth, includeComparisons: true };

      expect(() => validateSalesSummaryQuery(validQueryWithGrowth)).not.toThrow();
    });
  });

  describe('Complex Scenarios', () => {
    it('should validate complex query with all options', () => {
      const complexMetrics: SalesMetrics = {
        includeTotalSales: true,
        includeOrderCount: true,
        includeAverageOrderValue: true,
        includeTopProducts: true,
        includeTopCustomers: true,
        includePaymentMethods: true,
        includeFulfillmentStatus: true,
        includeGrowthRate: true,
      };

      const complexFilters: SalesSummaryFilters = {
        customerId: 'customer-123',
        productId: 'product-456',
        minimumOrderValue: 100,
        maximumOrderValue: 5000,
      };

      const complexQuery: SalesSummaryQuery = {
        agencyId: 'agency-123',
        periodType: ReportPeriodType.LAST_30_DAYS,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        timezone: 'UTC',
        groupBy: 'day',
        metrics: complexMetrics,
        filters: complexFilters,
        topN: 10,
        includeComparisons: true,
        requestedBy: 'user-456',
      };

      expect(() => validateSalesSummaryQuery(complexQuery)).not.toThrow();
    });

    it('should handle minimal valid query', () => {
      const minimalMetrics: SalesMetrics = {
        includeTotalSales: true,
        includeOrderCount: false,
        includeAverageOrderValue: false,
        includeTopProducts: false,
        includeTopCustomers: false,
        includePaymentMethods: false,
        includeFulfillmentStatus: false,
        includeGrowthRate: false,
      };

      const minimalQuery: SalesSummaryQuery = {
        agencyId: 'agency-123',
        metrics: minimalMetrics,
        requestedBy: 'user-456',
      };

      expect(() => validateSalesSummaryQuery(minimalQuery)).not.toThrow();
    });
  });

  describe('Error Message Quality', () => {
    it('should provide specific error messages', () => {
      const invalidQuery = { ...validQuery, agencyId: '' };

      try {
        validateSalesSummaryQuery(invalidQuery);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(SalesSummaryQueryValidationError);
        expect(error.message).toContain('SalesSummary validation error');
        expect(error.message).toContain('agencyId');
        expect(error.name).toBe('SalesSummaryQueryValidationError');
      }
    });

    it('should include field name in error message', () => {
      const invalidQuery = { ...validQuery, topN: 0 };

      try {
        validateSalesSummaryQuery(invalidQuery);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('topN');
        expect(error.message).toContain('TopN must be between 1 and 100');
      }
    });
  });
});
