/**
 * Analytics IPC Handler
 *
 * Secure IPC bridge for analytics and reporting operations in Electron main process.
 * Handles sales analytics, customer insights, and business intelligence queries.
 * Follows security-first design with input validation and proper error handling.
 *
 * @domain Reports and Analytics
 * @pattern Command/Query Responsibility Segregation (CQRS)
 * @architecture Hexagonal Architecture (Adapter)
 * @security Input validation, secure error handling
 * @version 1.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { SalesAnalyticsService } from '../../domain/services/sales-analytics.service';
import { SalesSummaryHandler } from '../../application/handlers/analytics/sales-summary.handler';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ICustomerRepository } from '../../domain/repositories/customer.repository';
import { IProductRepository } from '../../domain/repositories/product.repository';
import { ReportPeriodType } from '../../domain/value-objects/report-period';

/**
 * Analytics operation types for IPC
 */
export type AnalyticsOperation =
  | 'sales-summary'
  | 'sales-trends'
  | 'customer-segmentation'
  | 'product-performance'
  | 'revenue-forecast'
  | 'market-basket'
  | 'customer-ltv'
  | 'territory-performance';

/**
 * Base IPC response interface for analytics operations
 */
export interface AnalyticsIpcResponse<T = Record<string, unknown>> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
  readonly code?: string;
  readonly timestamp: number;
  readonly operation: AnalyticsOperation;
  readonly duration: number;
  readonly requestId?: string;
}

/**
 * Sales summary request schema for IPC validation
 */
export const SalesSummaryRequestSchema = z.object({
  // Required fields
  agencyId: z.string().uuid('Invalid agency ID format'),
  userId: z.string().uuid('Invalid user ID format'),

  // Period configuration
  periodType: z.nativeEnum(ReportPeriodType, {
    errorMap: () => ({ message: 'Invalid period type' }),
  }),
  customStartDate: z.string().datetime().optional(),
  customEndDate: z.string().datetime().optional(),

  // Grouping and aggregation
  groupBy: z
    .array(z.enum(['day', 'week', 'month', 'quarter', 'year', 'customer', 'product', 'area']))
    .min(1, 'At least one groupBy option is required')
    .max(3, 'Maximum 3 groupBy options allowed'),

  // Metrics selection
  metrics: z.object({
    totalSales: z.boolean().default(true),
    orderCount: z.boolean().default(true),
    averageOrderValue: z.boolean().default(true),
    customerCount: z.boolean().default(true),
    topProducts: z.boolean().default(false),
    topCustomers: z.boolean().default(false),
    paymentMethods: z.boolean().default(false),
    fulfillmentStatus: z.boolean().default(false),
    growthAnalysis: z.boolean().default(false),
  }),

  // Filtering options
  filters: z
    .object({
      customerIds: z.array(z.string().uuid()).max(100, 'Maximum 100 customer filters').optional(),
      productIds: z.array(z.string().uuid()).max(100, 'Maximum 100 product filters').optional(),
      areaIds: z.array(z.string().uuid()).max(50, 'Maximum 50 area filters').optional(),
      workerIds: z.array(z.string().uuid()).max(50, 'Maximum 50 worker filters').optional(),
      paymentMethods: z.array(z.enum(['CASH', 'CREDIT', 'BANK_TRANSFER', 'CARD'])).optional(),
      orderStatusList: z.array(z.enum(['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'])).optional(),
      minimumOrderValue: z.number().min(0, 'Minimum order value cannot be negative').optional(),
      maximumOrderValue: z.number().min(0, 'Maximum order value cannot be negative').optional(),
    })
    .optional(),

  // Analysis options
  options: z
    .object({
      includeComparisons: z.boolean().default(false),
      comparisonPeriod: z.nativeEnum(ReportPeriodType).optional(),
      topN: z.number().int().min(1).max(100).default(10),
      currency: z
        .string()
        .length(3)
        .regex(/^[A-Z]{3}$/)
        .default('USD'),
      timezone: z.string().default('UTC'),
      includeForecast: z.boolean().default(false),
      forecastPeriods: z.number().int().min(1).max(12).default(3),
    })
    .optional(),

  // Request metadata
  requestId: z.string().uuid().optional(),
  requestedAt: z.string().datetime().optional(),
});

/**
 * Sales trends request schema for IPC validation
 */
export const SalesTrendsRequestSchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  periodType: z.nativeEnum(ReportPeriodType),
  granularity: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  includeForecasting: z.boolean().default(false),
  seasonalAdjustment: z.boolean().default(false),
  requestId: z.string().uuid().optional(),
});

/**
 * Customer segmentation request schema for IPC validation
 */
export const CustomerSegmentationRequestSchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  periodType: z.nativeEnum(ReportPeriodType),
  segmentationModel: z.enum(['RFM', 'CLV', 'BEHAVIORAL', 'GEOGRAPHIC']),
  includeChurnRisk: z.boolean().default(false),
  includeGrowthPotential: z.boolean().default(false),
  requestId: z.string().uuid().optional(),
});

/**
 * Product performance request schema for IPC validation
 */
export const ProductPerformanceRequestSchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  periodType: z.nativeEnum(ReportPeriodType),
  analysisType: z.enum(['SALES_VELOCITY', 'MARGIN_ANALYSIS', 'INVENTORY_TURNOVER', 'CROSS_SELL']),
  categoryId: z.string().uuid().optional(),
  minimumOrders: z.number().int().min(1).max(1000).default(5),
  includeSeasonality: z.boolean().default(false),
  requestId: z.string().uuid().optional(),
});

/**
 * Revenue forecast request schema for IPC validation
 */
export const RevenueForecastRequestSchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  historicalPeriodType: z.nativeEnum(ReportPeriodType),
  forecastPeriodType: z.nativeEnum(ReportPeriodType),
  forecastModel: z.enum(['LINEAR', 'EXPONENTIAL', 'SEASONAL', 'ARIMA']).default('LINEAR'),
  confidenceLevel: z.number().min(0.5).max(0.99).default(0.95),
  includeScenarios: z.boolean().default(false),
  requestId: z.string().uuid().optional(),
});

/**
 * Market basket analysis request schema for IPC validation
 */
export const MarketBasketRequestSchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  periodType: z.nativeEnum(ReportPeriodType),
  minimumSupport: z.number().min(0).max(1).default(0.1),
  minimumConfidence: z.number().min(0).max(1).default(0.6),
  productIds: z.array(z.string().uuid()).max(100).optional(),
  requestId: z.string().uuid().optional(),
});

/**
 * Customer LTV request schema for IPC validation
 */
export const CustomerLTVRequestSchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  customerId: z.string().uuid().optional(),
  calculationMethod: z.enum(['HISTORICAL', 'PREDICTIVE', 'COHORT']).default('PREDICTIVE'),
  timeHorizon: z.number().int().min(1).max(120).default(24),
  includeAcquisitionCosts: z.boolean().default(false),
  includeRetentionCosts: z.boolean().default(false),
  requestId: z.string().uuid().optional(),
});

/**
 * Territory performance request schema for IPC validation
 */
export const TerritoryPerformanceRequestSchema = z.object({
  agencyId: z.string().uuid('Invalid agency ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  periodType: z.nativeEnum(ReportPeriodType),
  territoryType: z.enum(['AREA', 'WORKER', 'REGION', 'ZIP_CODE']),
  includeComparisons: z.boolean().default(false),
  benchmarkType: z.enum(['HISTORICAL', 'PEER', 'TARGET']).optional(),
  requestId: z.string().uuid().optional(),
});

/**
 * Analytics response interfaces
 */
export interface SalesSummaryResponse {
  readonly summary: {
    readonly totalSales: string; // Money as string for serialization
    readonly totalOrders: number;
    readonly averageOrderValue: string;
    readonly uniqueCustomers: number;
    readonly growthRate?: number;
  };
  readonly timeSeries?: readonly Record<string, unknown>[];
  readonly topProducts?: readonly Record<string, unknown>[];
  readonly topCustomers?: readonly Record<string, unknown>[];
  readonly paymentBreakdown?: readonly Record<string, unknown>[];
  readonly fulfillmentBreakdown?: readonly Record<string, unknown>[];
  readonly comparison?: Record<string, unknown>;
  readonly requestId?: string;
}

export interface SalesTrendsResponse {
  readonly trends: readonly any[];
  readonly forecasts?: readonly any[];
  readonly seasonalFactors?: readonly number[];
  readonly requestId?: string;
}

export interface CustomerSegmentationResponse {
  readonly segments: readonly any[];
  readonly totalCustomers: number;
  readonly segmentationModel: string;
  readonly requestId?: string;
}

export interface ProductPerformanceResponse {
  readonly products: readonly any[];
  readonly analysisType: string;
  readonly totalProducts: number;
  readonly requestId?: string;
}

export interface RevenueForecastResponse {
  readonly forecast: any;
  readonly accuracy?: number;
  readonly scenarios?: any;
  readonly requestId?: string;
}

export interface MarketBasketResponse {
  readonly rules: readonly any[];
  readonly totalRules: number;
  readonly averageConfidence: number;
  readonly requestId?: string;
}

export interface CustomerLTVResponse {
  readonly customers: readonly any[];
  readonly averageLTV: string;
  readonly totalCustomers: number;
  readonly requestId?: string;
}

export interface TerritoryPerformanceResponse {
  readonly territories: readonly any[];
  readonly territoryType: string;
  readonly totalTerritories: number;
  readonly requestId?: string;
}

/**
 * Analytics IPC Error classes
 */
export class AnalyticsIpcError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AnalyticsIpcError';
  }
}

export class AnalyticsValidationError extends AnalyticsIpcError {
  constructor(message: string, originalError?: Error) {
    super(message, 'VALIDATION_ERROR', originalError);
    this.name = 'AnalyticsValidationError';
  }
}

export class AnalyticsSecurityError extends AnalyticsIpcError {
  constructor(message: string, originalError?: Error) {
    super(message, 'SECURITY_ERROR', originalError);
    this.name = 'AnalyticsSecurityError';
  }
}

export class AnalyticsOperationError extends AnalyticsIpcError {
  constructor(message: string, originalError?: Error) {
    super(message, 'OPERATION_ERROR', originalError);
    this.name = 'AnalyticsOperationError';
  }
}

/**
 * Analytics IPC Handler
 */
export class AnalyticsIpcHandler {
  private readonly registeredChannels = new Set<string>();
  private readonly salesSummaryHandler: SalesSummaryHandler;

  private readonly allowedChannels: readonly string[] = [
    'analytics:sales-summary',
    'analytics:sales-trends',
    'analytics:customer-segmentation',
    'analytics:product-performance',
    'analytics:revenue-forecast',
    'analytics:market-basket',
    'analytics:customer-ltv',
    'analytics:territory-performance',
  ];

  private constructor(
    private readonly analyticsService: SalesAnalyticsService,
    private readonly userRepository: IUserRepository,
    private readonly orderRepository: OrderRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly productRepository: IProductRepository
  ) {
    this.validateRepositoriesAndServices();

    // Initialize handlers
    this.salesSummaryHandler = new SalesSummaryHandler(
      this.userRepository,
      this.orderRepository,
      this.customerRepository,
      this.productRepository
    );
  }

  /**
   * Factory method to create AnalyticsIpcHandler instance
   */
  public static create(
    analyticsService: SalesAnalyticsService,
    userRepository: IUserRepository,
    orderRepository: OrderRepository,
    customerRepository: ICustomerRepository,
    productRepository: IProductRepository
  ): AnalyticsIpcHandler {
    return new AnalyticsIpcHandler(
      analyticsService,
      userRepository,
      orderRepository,
      customerRepository,
      productRepository
    );
  }

  /**
   * Registers all IPC handlers for analytics operations
   */
  public registerHandlers(): void {
    for (const channel of this.allowedChannels) {
      if (!this.registeredChannels.has(channel)) {
        // Register based on operation type
        switch (channel) {
          case 'analytics:sales-summary':
            ipcMain.handle(channel, this.handleSalesSummary.bind(this));
            break;
          case 'analytics:sales-trends':
            ipcMain.handle(channel, this.handleSalesTrends.bind(this));
            break;
          case 'analytics:customer-segmentation':
            ipcMain.handle(channel, this.handleCustomerSegmentation.bind(this));
            break;
          case 'analytics:product-performance':
            ipcMain.handle(channel, this.handleProductPerformance.bind(this));
            break;
          case 'analytics:revenue-forecast':
            ipcMain.handle(channel, this.handleRevenueForecast.bind(this));
            break;
          case 'analytics:market-basket':
            ipcMain.handle(channel, this.handleMarketBasket.bind(this));
            break;
          case 'analytics:customer-ltv':
            ipcMain.handle(channel, this.handleCustomerLTV.bind(this));
            break;
          case 'analytics:territory-performance':
            ipcMain.handle(channel, this.handleTerritoryPerformance.bind(this));
            break;
        }
        this.registeredChannels.add(channel);
      }
    }
  }

  /**
   * Unregisters all IPC handlers
   */
  public unregisterHandlers(): void {
    for (const channel of this.registeredChannels) {
      ipcMain.removeHandler(channel);
    }
    this.registeredChannels.clear();
  }

  /**
   * Get handler statistics
   */
  public getStats(): {
    readonly registeredChannels: readonly string[];
    readonly handlerCount: number;
    readonly allowedChannelsCount: number;
  } {
    return {
      registeredChannels: Array.from(this.registeredChannels),
      handlerCount: this.registeredChannels.size,
      allowedChannelsCount: this.allowedChannels.length,
    };
  }

  /**
   * Handle sales summary analytics request
   */
  private async handleSalesSummary(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AnalyticsIpcResponse<SalesSummaryResponse>> {
    const startTime = Date.now();
    const operation: AnalyticsOperation = 'sales-summary';

    try {
      // Validate request
      const validatedRequest = SalesSummaryRequestSchema.parse(request);

      // Execute sales summary query
      const result = await this.salesSummaryHandler.handle({
        agencyId: validatedRequest.agencyId,
        userId: validatedRequest.userId,
        periodType: validatedRequest.periodType,
        customStartDate: validatedRequest.customStartDate ? new Date(validatedRequest.customStartDate) : undefined,
        customEndDate: validatedRequest.customEndDate ? new Date(validatedRequest.customEndDate) : undefined,
        groupBy: validatedRequest.groupBy,
        metrics: validatedRequest.metrics,
        filters: validatedRequest.filters,
        options: validatedRequest.options,
      });

      // Transform result for IPC response
      const response: SalesSummaryResponse = {
        summary: {
          totalSales: result.summary.totalSales.toString(),
          totalOrders: result.summary.totalOrders,
          averageOrderValue: result.summary.averageOrderValue.toString(),
          uniqueCustomers: result.summary.uniqueCustomers,
          growthRate: result.summary.growthRate,
        },
        timeSeries: result.timeSeries,
        topProducts: result.topProducts,
        topCustomers: result.topCustomers,
        paymentBreakdown: result.paymentBreakdown,
        fulfillmentBreakdown: result.fulfillmentBreakdown,
        comparison: result.comparison,
        requestId: validatedRequest.requestId,
      };

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        operation,
        duration: Date.now() - startTime,
        requestId: validatedRequest.requestId,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, operation, startTime);
    }
  }

  /**
   * Handle sales trends analytics request
   */
  private async handleSalesTrends(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AnalyticsIpcResponse<SalesTrendsResponse>> {
    const startTime = Date.now();
    const operation: AnalyticsOperation = 'sales-trends';

    try {
      // Validate request
      const validatedRequest = SalesTrendsRequestSchema.parse(request);

      // Execute sales trends analysis
      const trendsResult = await this.analyticsService.analyzeSalesTrends({
        agencyId: validatedRequest.agencyId,
        period: this.createReportPeriod(validatedRequest.periodType),
        granularity: validatedRequest.granularity,
        includeForecasting: validatedRequest.includeForecasting,
        seasonalAdjustment: validatedRequest.seasonalAdjustment,
      });

      // Transform result for IPC response
      const response: SalesTrendsResponse = {
        trends: trendsResult.map((trend) => ({
          period: trend.period,
          periodStart: trend.periodStart.toISOString(),
          periodEnd: trend.periodEnd.toISOString(),
          actualSales: trend.actualSales.toString(),
          forecastedSales: trend.forecastedSales?.toString(),
          variance: trend.variance,
          seasonalIndex: trend.seasonalIndex,
          trendIndex: trend.trendIndex,
          orderCount: trend.orderCount,
          averageOrderValue: trend.averageOrderValue.toString(),
          uniqueCustomers: trend.uniqueCustomers,
          conversionRate: trend.conversionRate,
        })),
        requestId: validatedRequest.requestId,
      };

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        operation,
        duration: Date.now() - startTime,
        requestId: validatedRequest.requestId,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, operation, startTime);
    }
  }

  /**
   * Handle customer segmentation analytics request
   */
  private async handleCustomerSegmentation(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AnalyticsIpcResponse<CustomerSegmentationResponse>> {
    const startTime = Date.now();
    const operation: AnalyticsOperation = 'customer-segmentation';

    try {
      // Validate request
      const validatedRequest = CustomerSegmentationRequestSchema.parse(request);

      // Execute customer segmentation
      const segmentationResult = await this.analyticsService.segmentCustomers({
        agencyId: validatedRequest.agencyId,
        period: this.createReportPeriod(validatedRequest.periodType),
        segmentationModel: validatedRequest.segmentationModel,
        includeChurnRisk: validatedRequest.includeChurnRisk,
        includeGrowthPotential: validatedRequest.includeGrowthPotential,
      });

      // Transform result for IPC response
      const response: CustomerSegmentationResponse = {
        segments: segmentationResult.map((segment) => ({
          segmentId: segment.segmentId,
          segmentName: segment.segmentName,
          description: segment.description,
          criteria: segment.criteria,
          customerCount: segment.customerCount,
          totalRevenue: segment.totalRevenue.toString(),
          averageOrderValue: segment.averageOrderValue.toString(),
          purchaseFrequency: segment.purchaseFrequency,
          churnRisk: segment.churnRisk,
          growthPotential: segment.growthPotential,
          recommendedActions: segment.recommendedActions,
        })),
        totalCustomers: segmentationResult.reduce((sum, segment) => sum + segment.customerCount, 0),
        segmentationModel: validatedRequest.segmentationModel,
        requestId: validatedRequest.requestId,
      };

      return {
        success: true,
        data: response,
        timestamp: Date.now(),
        operation,
        duration: Date.now() - startTime,
        requestId: validatedRequest.requestId,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, operation, startTime);
    }
  }

  /**
   * Handle placeholder analytics operations (to be implemented)
   */
  private async handleProductPerformance(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AnalyticsIpcResponse<ProductPerformanceResponse>> {
    return this.handlePlaceholderOperation(event, request, 'product-performance');
  }

  private async handleRevenueForecast(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AnalyticsIpcResponse<RevenueForecastResponse>> {
    return this.handlePlaceholderOperation(event, request, 'revenue-forecast');
  }

  private async handleMarketBasket(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AnalyticsIpcResponse<MarketBasketResponse>> {
    return this.handlePlaceholderOperation(event, request, 'market-basket');
  }

  private async handleCustomerLTV(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AnalyticsIpcResponse<CustomerLTVResponse>> {
    return this.handlePlaceholderOperation(event, request, 'customer-ltv');
  }

  private async handleTerritoryPerformance(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AnalyticsIpcResponse<TerritoryPerformanceResponse>> {
    return this.handlePlaceholderOperation(event, request, 'territory-performance');
  }

  /**
   * Handle placeholder operations
   */
  private async handlePlaceholderOperation(
    event: IpcMainInvokeEvent,
    request: unknown,
    operation: string
  ): Promise<AnalyticsIpcResponse> {
    const startTime = Date.now();

    return {
      success: false,
      error: `${operation} analytics not yet implemented`,
      code: 'NOT_IMPLEMENTED',
      timestamp: Date.now(),
      operation: operation as AnalyticsOperation,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Generate safe error response
   */
  private getSafeErrorResponse(error: Error, operation: AnalyticsOperation, startTime: number): AnalyticsIpcResponse {
    const duration = Date.now() - startTime;

    // Handle validation errors
    if (error.name === 'ZodError') {
      const zodError = error as any;
      const validationErrors: Record<string, string[]> = {};

      zodError.errors?.forEach((err: any) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });

      return {
        success: false,
        error: 'Validation failed',
        validationErrors,
        code: 'VALIDATION_ERROR',
        timestamp: Date.now(),
        operation,
        duration,
      };
    }

    // Handle analytics specific errors
    if (error instanceof AnalyticsIpcError) {
      return {
        success: false,
        error: this.getSafeErrorMessage(error.message),
        code: error.code,
        timestamp: Date.now(),
        operation,
        duration,
      };
    }

    // Handle unknown errors
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      timestamp: Date.now(),
      operation,
      duration,
    };
  }

  /**
   * Sanitize error messages for security
   */
  private getSafeErrorMessage(message: string): string {
    // Remove sensitive information patterns
    return message
      .replace(/password\s*[=:]\s*[^\s]+/gi, 'password=***')
      .replace(/token\s*[=:]\s*[^\s]+/gi, 'token=***')
      .replace(/key\s*[=:]\s*[^\s]+/gi, 'key=***')
      .replace(/secret\s*[=:]\s*[^\s]+/gi, 'secret=***')
      .replace(/\/[A-Za-z]:\\/g, '/***:/')
      .replace(/[a-f0-9]{32,}/gi, '***');
  }

  /**
   * Validate all dependencies
   */
  private validateRepositoriesAndServices(): void {
    if (!this.analyticsService) {
      throw new AnalyticsIpcError('Analytics service is required', 'DEPENDENCY_ERROR');
    }
    if (!this.userRepository) {
      throw new AnalyticsIpcError('User repository is required', 'DEPENDENCY_ERROR');
    }
    if (!this.orderRepository) {
      throw new AnalyticsIpcError('Order repository is required', 'DEPENDENCY_ERROR');
    }
    if (!this.customerRepository) {
      throw new AnalyticsIpcError('Customer repository is required', 'DEPENDENCY_ERROR');
    }
    if (!this.productRepository) {
      throw new AnalyticsIpcError('Product repository is required', 'DEPENDENCY_ERROR');
    }
  }

  /**
   * Helper to create ReportPeriod from period type
   */
  private createReportPeriod(periodType: ReportPeriodType) {
    const { ReportPeriod } = require('../../domain/value-objects/report-period');
    return ReportPeriod.fromType(periodType);
  }
}

/**
 * Factory function to create AnalyticsIpcHandler
 */
export function createAnalyticsIpcHandler(
  analyticsService: SalesAnalyticsService,
  userRepository: IUserRepository,
  orderRepository: OrderRepository,
  customerRepository: ICustomerRepository,
  productRepository: IProductRepository
): AnalyticsIpcHandler {
  return AnalyticsIpcHandler.create(
    analyticsService,
    userRepository,
    orderRepository,
    customerRepository,
    productRepository
  );
}
