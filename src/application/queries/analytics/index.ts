/**
 * Analytics Queries Barrel Exports
 * Central export point for all analytics queries
 *
 * @domain Reports and Analytics
 * @pattern Barrel Export
 * @version 1.0.0
 */

// Sales Summary Query exports
export { SalesSummaryQueryValidationError, validateSalesSummaryQuery } from './sales-summary.query';

export type {
  SalesSummaryQuery,
  SalesSummaryQueryResult,
  SalesMetrics,
  SalesSummaryFilters,
  SalesDataPoint,
  TopPerformer,
  PaymentMethodBreakdown,
  FulfillmentStatusBreakdown,
  GrowthComparison,
  SalesGroupBy,
} from './sales-summary.query';
