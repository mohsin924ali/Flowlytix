/**
 * Sales Summary Analytics Query
 *
 * Query to get comprehensive sales analytics with filtering and grouping.
 * Follows CQRS pattern for read operations with analytics-specific capabilities.
 *
 * @domain Reports and Analytics
 * @pattern Query Pattern (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { ReportPeriodType } from '../../../domain/value-objects/report-period';

/**
 * Sales summary grouping options
 */
export type SalesGroupBy = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'customer' | 'product' | 'area';

/**
 * Sales metrics to include in the summary
 */
export interface SalesMetrics {
  readonly includeTotalSales: boolean;
  readonly includeOrderCount: boolean;
  readonly includeAverageOrderValue: boolean;
  readonly includeTopProducts: boolean;
  readonly includeTopCustomers: boolean;
  readonly includePaymentMethods: boolean;
  readonly includeFulfillmentStatus: boolean;
  readonly includeGrowthRate: boolean;
}

/**
 * Sales summary filters
 */
export interface SalesSummaryFilters {
  readonly customerId?: string;
  readonly customerCode?: string;
  readonly productId?: string;
  readonly productSku?: string;
  readonly categoryId?: string;
  readonly areaId?: string;
  readonly workerId?: string;
  readonly paymentMethod?: string;
  readonly fulfillmentStatus?: string;
  readonly minimumOrderValue?: number;
  readonly maximumOrderValue?: number;
}

/**
 * Query to get sales summary analytics
 */
export interface SalesSummaryQuery {
  readonly agencyId: string;
  readonly periodType?: ReportPeriodType;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly timezone?: string;
  readonly groupBy?: SalesGroupBy;
  readonly metrics: SalesMetrics;
  readonly filters?: SalesSummaryFilters;
  readonly topN?: number; // Number of top items to include
  readonly includeComparisons?: boolean; // Compare with previous period
  readonly requestedBy: string; // ID of user making the request
}

/**
 * Individual sales data point
 */
export interface SalesDataPoint {
  readonly period: string; // Date/period label
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly totalSales: number;
  readonly salesCurrency: string;
  readonly orderCount: number;
  readonly averageOrderValue: number;
  readonly uniqueCustomers: number;
  readonly totalUnits: number;
}

/**
 * Top performing item (customer/product)
 */
export interface TopPerformer {
  readonly id: string;
  readonly name: string;
  readonly code?: string;
  readonly totalSales: number;
  readonly salesCurrency: string;
  readonly orderCount: number;
  readonly averageOrderValue: number;
  readonly totalUnits?: number;
  readonly rank: number;
}

/**
 * Payment method breakdown
 */
export interface PaymentMethodBreakdown {
  readonly paymentMethod: string;
  readonly totalSales: number;
  readonly salesCurrency: string;
  readonly orderCount: number;
  readonly percentage: number;
}

/**
 * Fulfillment status breakdown
 */
export interface FulfillmentStatusBreakdown {
  readonly status: string;
  readonly orderCount: number;
  readonly totalValue: number;
  readonly valueCurrency: string;
  readonly percentage: number;
}

/**
 * Growth comparison with previous period
 */
export interface GrowthComparison {
  readonly currentPeriod: {
    readonly totalSales: number;
    readonly orderCount: number;
    readonly averageOrderValue: number;
  };
  readonly previousPeriod: {
    readonly totalSales: number;
    readonly orderCount: number;
    readonly averageOrderValue: number;
  };
  readonly growth: {
    readonly salesGrowthRate: number; // Percentage
    readonly orderGrowthRate: number; // Percentage
    readonly avgOrderValueGrowthRate: number; // Percentage
  };
}

/**
 * Complete sales summary result
 */
export interface SalesSummaryQueryResult {
  readonly summary: {
    readonly totalSales: number;
    readonly salesCurrency: string;
    readonly totalOrders: number;
    readonly averageOrderValue: number;
    readonly uniqueCustomers: number;
    readonly totalUnits: number;
    readonly period: {
      readonly start: Date;
      readonly end: Date;
      readonly type: string;
      readonly label: string;
    };
  };
  readonly timeSeries?: readonly SalesDataPoint[];
  readonly topProducts?: readonly TopPerformer[];
  readonly topCustomers?: readonly TopPerformer[];
  readonly paymentMethods?: readonly PaymentMethodBreakdown[];
  readonly fulfillmentStatus?: readonly FulfillmentStatusBreakdown[];
  readonly growthComparison?: GrowthComparison;
  readonly generatedAt: Date;
  readonly generatedBy: string;
}

/**
 * Validation errors for SalesSummaryQuery
 */
export class SalesSummaryQueryValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`SalesSummary validation error - ${field}: ${reason}`);
    this.name = 'SalesSummaryQueryValidationError';
  }
}

/**
 * Validates SalesSummaryQuery data
 * @param query - Query to validate
 * @throws {SalesSummaryQueryValidationError} When validation fails
 */
export function validateSalesSummaryQuery(query: SalesSummaryQuery): void {
  // Required fields validation
  if (!query.requestedBy || typeof query.requestedBy !== 'string') {
    throw new SalesSummaryQueryValidationError('requestedBy', 'RequestedBy is required and must be a string');
  }

  if (!query.agencyId || typeof query.agencyId !== 'string') {
    throw new SalesSummaryQueryValidationError('agencyId', 'AgencyId is required and must be a string');
  }

  if (!query.metrics || typeof query.metrics !== 'object') {
    throw new SalesSummaryQueryValidationError('metrics', 'Metrics configuration is required');
  }

  // Date validation
  if (query.startDate && !(query.startDate instanceof Date)) {
    throw new SalesSummaryQueryValidationError('startDate', 'StartDate must be a Date object');
  }

  if (query.endDate && !(query.endDate instanceof Date)) {
    throw new SalesSummaryQueryValidationError('endDate', 'EndDate must be a Date object');
  }

  if (query.startDate && query.endDate && query.startDate >= query.endDate) {
    throw new SalesSummaryQueryValidationError('dateRange', 'StartDate must be before EndDate');
  }

  // Date range validation (max 2 years)
  if (query.startDate && query.endDate) {
    const maxRangeMs = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years
    if (query.endDate.getTime() - query.startDate.getTime() > maxRangeMs) {
      throw new SalesSummaryQueryValidationError('dateRange', 'Date range cannot exceed 2 years');
    }
  }

  // Period type validation
  if (query.periodType && !Object.values(ReportPeriodType).includes(query.periodType)) {
    throw new SalesSummaryQueryValidationError('periodType', 'Invalid period type');
  }

  // Group by validation
  const validGroupBy: SalesGroupBy[] = ['day', 'week', 'month', 'quarter', 'year', 'customer', 'product', 'area'];
  if (query.groupBy && !validGroupBy.includes(query.groupBy)) {
    throw new SalesSummaryQueryValidationError('groupBy', `GroupBy must be one of: ${validGroupBy.join(', ')}`);
  }

  // TopN validation
  if (query.topN !== undefined) {
    if (typeof query.topN !== 'number' || query.topN < 1 || query.topN > 100) {
      throw new SalesSummaryQueryValidationError('topN', 'TopN must be between 1 and 100');
    }
  }

  // Timezone validation
  if (query.timezone && typeof query.timezone !== 'string') {
    throw new SalesSummaryQueryValidationError('timezone', 'Timezone must be a string');
  }

  // Metrics validation
  const metricsKeys = [
    'includeTotalSales',
    'includeOrderCount',
    'includeAverageOrderValue',
    'includeTopProducts',
    'includeTopCustomers',
    'includePaymentMethods',
    'includeFulfillmentStatus',
    'includeGrowthRate',
  ];

  for (const key of metricsKeys) {
    if (
      query.metrics[key as keyof SalesMetrics] !== undefined &&
      typeof query.metrics[key as keyof SalesMetrics] !== 'boolean'
    ) {
      throw new SalesSummaryQueryValidationError(`metrics.${key}`, `${key} must be a boolean`);
    }
  }

  // Filters validation
  if (query.filters) {
    if (query.filters.minimumOrderValue !== undefined) {
      if (typeof query.filters.minimumOrderValue !== 'number' || query.filters.minimumOrderValue < 0) {
        throw new SalesSummaryQueryValidationError(
          'filters.minimumOrderValue',
          'MinimumOrderValue must be a positive number'
        );
      }
    }

    if (query.filters.maximumOrderValue !== undefined) {
      if (typeof query.filters.maximumOrderValue !== 'number' || query.filters.maximumOrderValue < 0) {
        throw new SalesSummaryQueryValidationError(
          'filters.maximumOrderValue',
          'MaximumOrderValue must be a positive number'
        );
      }
    }

    if (
      query.filters.minimumOrderValue &&
      query.filters.maximumOrderValue &&
      query.filters.minimumOrderValue >= query.filters.maximumOrderValue
    ) {
      throw new SalesSummaryQueryValidationError(
        'filters.orderValue',
        'MinimumOrderValue must be less than MaximumOrderValue'
      );
    }

    // String field validations
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
      const value = query.filters[field as keyof SalesSummaryFilters];
      if (value !== undefined && (typeof value !== 'string' || value.length === 0)) {
        throw new SalesSummaryQueryValidationError(`filters.${field}`, `${field} must be a non-empty string`);
      }
    }
  }

  // Business logic validation
  if (query.metrics.includeTopProducts && (query.topN === undefined || query.topN === null)) {
    throw new SalesSummaryQueryValidationError('topN', 'TopN is required when includeTopProducts is true');
  }

  if (query.metrics.includeTopCustomers && (query.topN === undefined || query.topN === null)) {
    throw new SalesSummaryQueryValidationError('topN', 'TopN is required when includeTopCustomers is true');
  }

  if (query.metrics.includeGrowthRate && !query.includeComparisons) {
    throw new SalesSummaryQueryValidationError(
      'includeComparisons',
      'IncludeComparisons must be true when includeGrowthRate is true'
    );
  }

  // At least one metric must be requested
  const hasAnyMetric = Object.values(query.metrics).some((value) => value === true);
  if (!hasAnyMetric) {
    throw new SalesSummaryQueryValidationError('metrics', 'At least one metric must be requested');
  }
}
