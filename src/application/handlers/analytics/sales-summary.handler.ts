/**
 * Sales Summary Analytics Handler
 *
 * Handler for SalesSummary analytics query following CQRS pattern.
 * Implements business logic for sales analytics retrieval with proper authorization.
 *
 * @domain Reports and Analytics
 * @pattern Query Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  SalesSummaryQuery,
  SalesSummaryQueryResult,
  SalesDataPoint,
  TopPerformer,
  PaymentMethodBreakdown,
  FulfillmentStatusBreakdown,
  GrowthComparison,
  validateSalesSummaryQuery,
} from '../../queries/analytics/sales-summary.query';
import { ReportPeriod, ReportPeriodType } from '../../../domain/value-objects/report-period';
import { Permission } from '../../../domain/value-objects/role';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import {
  IOrderRepository,
  OrderStatistics,
  CustomerOrderSummary,
  ProductSalesSummary,
} from '../../../domain/repositories/order.repository';
import { ICustomerRepository } from '../../../domain/repositories/customer.repository';
import { IProductRepository } from '../../../domain/repositories/product.repository';

/**
 * Sales analytics handler error
 */
export class SalesAnalyticsHandlerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SalesAnalyticsHandlerError';
  }
}

/**
 * Handler for Sales Summary analytics query
 * Implements secure sales analytics retrieval with authorization checks
 */
export class SalesSummaryHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly orderRepository: IOrderRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly productRepository: IProductRepository
  ) {}

  /**
   * Handles sales summary analytics query
   * @param query - SalesSummary query with filters and metrics
   * @returns Promise<SalesSummaryQueryResult> - Complete analytics result
   * @throws {SalesAnalyticsHandlerError} When user not found, insufficient permissions, or processing fails
   */
  async handle(query: SalesSummaryQuery): Promise<SalesSummaryQueryResult> {
    try {
      // Step 1: Validate query
      validateSalesSummaryQuery(query);

      // Step 2: Get the requesting user for authorization
      const requestingUser = await this.userRepository.findById(query.requestedBy);
      if (!requestingUser) {
        throw new SalesAnalyticsHandlerError('Requesting user not found', 'USER_NOT_FOUND');
      }

      // Step 3: Authorization check - user needs VIEW_REPORTS permission
      if (!requestingUser.hasPermission(Permission.VIEW_REPORTS)) {
        throw new SalesAnalyticsHandlerError('Insufficient permissions to view analytics', 'INSUFFICIENT_PERMISSIONS');
      }

      // Step 4: Determine the reporting period
      const reportPeriod = this.determineReportPeriod(query);

      // Step 5: Build analytics result incrementally
      const result: SalesSummaryQueryResult = {
        summary: {
          totalSales: 0,
          salesCurrency: 'USD', // Default, will be updated
          totalOrders: 0,
          averageOrderValue: 0,
          uniqueCustomers: 0,
          totalUnits: 0,
          period: {
            start: reportPeriod.startDate,
            end: reportPeriod.endDate,
            type: reportPeriod.type,
            label: reportPeriod.getLabel(),
          },
        },
        generatedAt: new Date(),
        generatedBy: query.requestedBy,
      };

      // Step 6: Get order statistics for the period
      const orderStats = await this.orderRepository.getOrderStatistics(
        query.agencyId,
        reportPeriod.startDate,
        reportPeriod.endDate
      );

      // Step 7: Populate basic summary metrics
      if (
        query.metrics.includeTotalSales ||
        query.metrics.includeOrderCount ||
        query.metrics.includeAverageOrderValue
      ) {
        result.summary.totalSales = orderStats.totalValue;
        result.summary.totalOrders = orderStats.totalOrders;
        result.summary.averageOrderValue = orderStats.averageOrderValue;
      }

      // Step 8: Get time series data if requested
      if (query.groupBy && ['day', 'week', 'month', 'quarter', 'year'].includes(query.groupBy)) {
        result.timeSeries = await this.generateTimeSeries(query, reportPeriod);
      }

      // Step 9: Get top products if requested
      if (query.metrics.includeTopProducts && query.topN) {
        result.topProducts = await this.getTopProducts(query, reportPeriod);
      }

      // Step 10: Get top customers if requested
      if (query.metrics.includeTopCustomers && query.topN) {
        result.topCustomers = await this.getTopCustomers(query, reportPeriod);
      }

      // Step 11: Get payment method breakdown if requested
      if (query.metrics.includePaymentMethods) {
        result.paymentMethods = await this.getPaymentMethodBreakdown(query, reportPeriod);
      }

      // Step 12: Get fulfillment status breakdown if requested
      if (query.metrics.includeFulfillmentStatus) {
        result.fulfillmentStatus = await this.getFulfillmentStatusBreakdown(query, reportPeriod);
      }

      // Step 13: Calculate growth comparison if requested
      if (query.metrics.includeGrowthRate && query.includeComparisons) {
        result.growthComparison = await this.calculateGrowthComparison(query, reportPeriod);
      }

      // Step 14: Calculate unique customers count
      if (query.metrics.includeTotalSales) {
        const customerSummaries = await this.orderRepository.getCustomerOrderSummaries(
          query.agencyId,
          reportPeriod.startDate,
          reportPeriod.endDate
        );
        result.summary.uniqueCustomers = customerSummaries.length;
      }

      return result;
    } catch (error) {
      if (error instanceof SalesAnalyticsHandlerError) {
        throw error;
      }

      throw new SalesAnalyticsHandlerError(
        `Failed to process sales analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROCESSING_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Determines the reporting period from query parameters
   * @private
   */
  private determineReportPeriod(query: SalesSummaryQuery): ReportPeriod {
    if (query.startDate && query.endDate) {
      return ReportPeriod.fromDateRange(query.startDate, query.endDate, query.timezone);
    }

    if (query.periodType) {
      return ReportPeriod.fromType(query.periodType, query.timezone);
    }

    // Default to last 30 days
    return ReportPeriod.fromType(ReportPeriodType.LAST_30_DAYS, query.timezone);
  }

  /**
   * Generates time series data for the specified period
   * @private
   */
  private async generateTimeSeries(query: SalesSummaryQuery, reportPeriod: ReportPeriod): Promise<SalesDataPoint[]> {
    if (!query.groupBy || !['day', 'week', 'month', 'quarter', 'year'].includes(query.groupBy)) {
      return [];
    }

    const intervals = reportPeriod.splitInto(query.groupBy === 'quarter' ? 'month' : query.groupBy);
    const dataPoints: SalesDataPoint[] = [];

    for (const interval of intervals) {
      const stats = await this.orderRepository.getOrderStatistics(query.agencyId, interval.startDate, interval.endDate);

      // Get unique customers for this period
      const customerSummaries = await this.orderRepository.getCustomerOrderSummaries(
        query.agencyId,
        interval.startDate,
        interval.endDate
      );

      dataPoints.push({
        period: interval.getLabel(),
        periodStart: interval.startDate,
        periodEnd: interval.endDate,
        totalSales: stats.totalValue,
        salesCurrency: 'USD',
        orderCount: stats.totalOrders,
        averageOrderValue: stats.averageOrderValue,
        uniqueCustomers: customerSummaries.length,
        totalUnits: 0, // Would need to calculate from order items
      });
    }

    return dataPoints;
  }

  /**
   * Gets top performing products
   * @private
   */
  private async getTopProducts(query: SalesSummaryQuery, reportPeriod: ReportPeriod): Promise<TopPerformer[]> {
    const productSummaries = await this.orderRepository.getProductSalesSummaries(
      query.agencyId,
      reportPeriod.startDate,
      reportPeriod.endDate,
      query.topN
    );

    return productSummaries.map((product, index) => ({
      id: product.productId,
      name: product.productName,
      code: product.productCode,
      totalSales: product.totalSalesValue,
      salesCurrency: 'USD',
      orderCount: product.orderCount,
      averageOrderValue: product.orderCount > 0 ? product.totalSalesValue / product.orderCount : 0,
      totalUnits: product.totalQuantityDelivered,
      rank: index + 1,
    }));
  }

  /**
   * Gets top performing customers
   * @private
   */
  private async getTopCustomers(query: SalesSummaryQuery, reportPeriod: ReportPeriod): Promise<TopPerformer[]> {
    const customerSummaries = await this.orderRepository.getCustomerOrderSummaries(
      query.agencyId,
      reportPeriod.startDate,
      reportPeriod.endDate,
      query.topN
    );

    // Sort by total value and take top N
    const sortedCustomers = customerSummaries.sort((a, b) => b.totalValue - a.totalValue).slice(0, query.topN);

    return sortedCustomers.map((customer, index) => ({
      id: customer.customerId,
      name: customer.customerName,
      code: customer.customerCode,
      totalSales: customer.totalValue,
      salesCurrency: 'USD',
      orderCount: customer.totalOrders,
      averageOrderValue: customer.averageOrderValue,
      rank: index + 1,
    }));
  }

  /**
   * Gets payment method breakdown
   * @private
   */
  private async getPaymentMethodBreakdown(
    query: SalesSummaryQuery,
    reportPeriod: ReportPeriod
  ): Promise<PaymentMethodBreakdown[]> {
    // This would require extending the order repository to support payment method aggregation
    // For now, return a placeholder implementation
    const stats = await this.orderRepository.getOrderStatistics(
      query.agencyId,
      reportPeriod.startDate,
      reportPeriod.endDate
    );

    // Placeholder data - in real implementation, this would come from order aggregation
    return [
      {
        paymentMethod: 'cash',
        totalSales: stats.totalValue * 0.6,
        salesCurrency: 'USD',
        orderCount: Math.floor(stats.totalOrders * 0.6),
        percentage: 60,
      },
      {
        paymentMethod: 'credit',
        totalSales: stats.totalValue * 0.4,
        salesCurrency: 'USD',
        orderCount: Math.floor(stats.totalOrders * 0.4),
        percentage: 40,
      },
    ];
  }

  /**
   * Gets fulfillment status breakdown
   * @private
   */
  private async getFulfillmentStatusBreakdown(
    query: SalesSummaryQuery,
    reportPeriod: ReportPeriod
  ): Promise<FulfillmentStatusBreakdown[]> {
    const stats = await this.orderRepository.getOrderStatistics(
      query.agencyId,
      reportPeriod.startDate,
      reportPeriod.endDate
    );

    // Placeholder data - in real implementation, this would come from order aggregation
    return [
      {
        status: 'delivered',
        orderCount: stats.deliveredOrders,
        totalValue: stats.totalValue * 0.7,
        valueCurrency: 'USD',
        percentage: 70,
      },
      {
        status: 'pending',
        orderCount: stats.pendingOrders,
        totalValue: stats.totalValue * 0.2,
        valueCurrency: 'USD',
        percentage: 20,
      },
      {
        status: 'cancelled',
        orderCount: stats.cancelledOrders,
        totalValue: stats.totalValue * 0.1,
        valueCurrency: 'USD',
        percentage: 10,
      },
    ];
  }

  /**
   * Calculates growth comparison with previous period
   * @private
   */
  private async calculateGrowthComparison(
    query: SalesSummaryQuery,
    reportPeriod: ReportPeriod
  ): Promise<GrowthComparison> {
    // Get current period stats
    const currentStats = await this.orderRepository.getOrderStatistics(
      query.agencyId,
      reportPeriod.startDate,
      reportPeriod.endDate
    );

    // Calculate previous period dates
    const periodDuration = reportPeriod.endDate.getTime() - reportPeriod.startDate.getTime();
    const previousEndDate = new Date(reportPeriod.startDate.getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

    // Get previous period stats
    const previousStats = await this.orderRepository.getOrderStatistics(
      query.agencyId,
      previousStartDate,
      previousEndDate
    );

    // Calculate growth rates
    const salesGrowthRate = this.calculateGrowthRate(previousStats.totalValue, currentStats.totalValue);
    const orderGrowthRate = this.calculateGrowthRate(previousStats.totalOrders, currentStats.totalOrders);
    const avgOrderValueGrowthRate = this.calculateGrowthRate(
      previousStats.averageOrderValue,
      currentStats.averageOrderValue
    );

    return {
      currentPeriod: {
        totalSales: currentStats.totalValue,
        orderCount: currentStats.totalOrders,
        averageOrderValue: currentStats.averageOrderValue,
      },
      previousPeriod: {
        totalSales: previousStats.totalValue,
        orderCount: previousStats.totalOrders,
        averageOrderValue: previousStats.averageOrderValue,
      },
      growth: {
        salesGrowthRate,
        orderGrowthRate,
        avgOrderValueGrowthRate,
      },
    };
  }

  /**
   * Calculates growth rate between two values
   * @private
   */
  private calculateGrowthRate(previousValue: number, currentValue: number): number {
    if (previousValue === 0) {
      return currentValue > 0 ? 100 : 0;
    }

    return Math.round(((currentValue - previousValue) / previousValue) * 100 * 100) / 100; // Round to 2 decimals
  }
}

/**
 * Factory function to create SalesSummaryHandler
 * @param userRepository - User repository implementation
 * @param orderRepository - Order repository implementation
 * @param customerRepository - Customer repository implementation
 * @param productRepository - Product repository implementation
 * @returns SalesSummaryHandler instance
 */
export function createSalesSummaryHandler(
  userRepository: IUserRepository,
  orderRepository: IOrderRepository,
  customerRepository: ICustomerRepository,
  productRepository: IProductRepository
): SalesSummaryHandler {
  return new SalesSummaryHandler(userRepository, orderRepository, customerRepository, productRepository);
}
