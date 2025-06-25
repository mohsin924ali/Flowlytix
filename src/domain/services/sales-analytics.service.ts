/**
 * Sales Analytics Service Interface
 *
 * Domain service interface for advanced sales analytics and reporting.
 * Provides comprehensive sales insights beyond basic repository queries.
 *
 * Features:
 * - Advanced sales trend analysis
 * - Customer segmentation analytics
 * - Product performance insights
 * - Revenue forecasting capabilities
 * - Cross-period comparative analysis
 * - Market basket analysis
 * - Sales territory performance
 * - Customer lifetime value calculations
 *
 * @domain Reports and Analytics
 * @pattern Domain Service
 * @version 1.0.0
 */

import { ReportPeriod } from '../value-objects/report-period';
import { Money } from '../value-objects/money';

/**
 * Sales trend analysis request
 */
export interface SalesTrendRequest {
  readonly agencyId: string;
  readonly period: ReportPeriod;
  readonly granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  readonly includeForecasting?: boolean;
  readonly seasonalAdjustment?: boolean;
}

/**
 * Sales trend data point
 */
export interface SalesTrendPoint {
  readonly period: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly actualSales: Money;
  readonly forecastedSales?: Money;
  readonly variance?: number; // Percentage difference from forecast
  readonly seasonalIndex?: number; // Seasonal adjustment factor
  readonly trendIndex?: number; // Trend progression factor
  readonly orderCount: number;
  readonly averageOrderValue: Money;
  readonly uniqueCustomers: number;
  readonly conversionRate?: number; // If visitor data available
}

/**
 * Customer segmentation analysis request
 */
export interface CustomerSegmentationRequest {
  readonly agencyId: string;
  readonly period: ReportPeriod;
  readonly segmentationModel: 'RFM' | 'CLV' | 'BEHAVIORAL' | 'GEOGRAPHIC';
  readonly includeChurnRisk?: boolean;
  readonly includeGrowthPotential?: boolean;
}

/**
 * Customer segment definition
 */
export interface CustomerSegment {
  readonly segmentId: string;
  readonly segmentName: string;
  readonly description: string;
  readonly criteria: Record<string, any>;
  readonly customerCount: number;
  readonly totalRevenue: Money;
  readonly averageOrderValue: Money;
  readonly purchaseFrequency: number;
  readonly churnRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly growthPotential?: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly recommendedActions: string[];
}

/**
 * Product performance analysis request
 */
export interface ProductPerformanceRequest {
  readonly agencyId: string;
  readonly period: ReportPeriod;
  readonly analysisType: 'SALES_VELOCITY' | 'MARGIN_ANALYSIS' | 'INVENTORY_TURNOVER' | 'CROSS_SELL';
  readonly categoryId?: string;
  readonly minimumOrders?: number;
  readonly includeSeasonality?: boolean;
}

/**
 * Product performance insight
 */
export interface ProductPerformanceInsight {
  readonly productId: string;
  readonly productName: string;
  readonly productCode: string;
  readonly category: string;
  readonly salesVelocity: number; // Units per day
  readonly revenueVelocity: Money; // Revenue per day
  readonly marginPercentage: number;
  readonly inventoryTurnover: number;
  readonly stockoutRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly crossSellOpportunities: readonly string[]; // Product IDs
  readonly seasonalityFactor: number;
  readonly trendDirection: 'RISING' | 'STABLE' | 'DECLINING';
  readonly performanceScore: number; // 0-100 composite score
}

/**
 * Revenue forecasting request
 */
export interface RevenueForecastRequest {
  readonly agencyId: string;
  readonly historicalPeriod: ReportPeriod;
  readonly forecastPeriod: ReportPeriod;
  readonly forecastModel: 'LINEAR' | 'EXPONENTIAL' | 'SEASONAL' | 'ARIMA';
  readonly confidenceLevel: number; // 0.90, 0.95, 0.99
  readonly includeScenarios?: boolean; // Optimistic, Pessimistic, Most Likely
}

/**
 * Revenue forecast result
 */
export interface RevenueForecast {
  readonly forecastPeriod: ReportPeriod;
  readonly model: string;
  readonly confidence: number;
  readonly forecastedRevenue: Money;
  readonly lowerBound: Money;
  readonly upperBound: Money;
  readonly scenarios?: {
    readonly optimistic: Money;
    readonly mostLikely: Money;
    readonly pessimistic: Money;
  };
  readonly seasonalFactors?: readonly number[];
  readonly trendCoefficient?: number;
  readonly accuracy?: number; // R-squared or similar measure
}

/**
 * Market basket analysis request
 */
export interface MarketBasketRequest {
  readonly agencyId: string;
  readonly period: ReportPeriod;
  readonly minimumSupport: number; // Minimum frequency of item combinations
  readonly minimumConfidence: number; // Minimum confidence level for rules
  readonly productIds?: readonly string[]; // Analyze specific products
}

/**
 * Market basket rule
 */
export interface MarketBasketRule {
  readonly antecedent: readonly string[]; // Product IDs that trigger the rule
  readonly consequent: readonly string[]; // Product IDs that are recommended
  readonly support: number; // Frequency of the itemset
  readonly confidence: number; // Likelihood of consequent given antecedent
  readonly lift: number; // Strength of association vs random
  readonly conviction: number; // Measure of implication strength
  readonly revenueImpact: Money; // Estimated revenue from this rule
}

/**
 * Customer lifetime value analysis request
 */
export interface CustomerLTVRequest {
  readonly agencyId: string;
  readonly customerId?: string; // Specific customer or all customers
  readonly calculationMethod: 'HISTORICAL' | 'PREDICTIVE' | 'COHORT';
  readonly timeHorizon: number; // Months to predict
  readonly includeAcquisitionCosts?: boolean;
  readonly includeRetentionCosts?: boolean;
}

/**
 * Customer lifetime value result
 */
export interface CustomerLTVResult {
  readonly customerId: string;
  readonly customerName: string;
  readonly currentLTV: Money;
  readonly predictedLTV: Money;
  readonly acquisitionCost?: Money;
  readonly retentionCost?: Money;
  readonly netLTV: Money;
  readonly churnProbability: number;
  readonly expectedLifetime: number; // Months
  readonly averageOrderValue: Money;
  readonly purchaseFrequency: number;
  readonly profitMargin: number;
  readonly riskScore: number; // 0-100, higher = more risk
}

/**
 * Sales territory performance request
 */
export interface TerritoryPerformanceRequest {
  readonly agencyId: string;
  readonly period: ReportPeriod;
  readonly territoryType: 'AREA' | 'WORKER' | 'REGION' | 'ZIP_CODE';
  readonly includeComparisons?: boolean;
  readonly benchmarkType?: 'HISTORICAL' | 'PEER' | 'TARGET';
}

/**
 * Territory performance result
 */
export interface TerritoryPerformance {
  readonly territoryId: string;
  readonly territoryName: string;
  readonly territoryType: string;
  readonly revenue: Money;
  readonly orderCount: number;
  readonly customerCount: number;
  readonly averageOrderValue: Money;
  readonly marketPenetration: number; // Percentage
  readonly growthRate: number; // Period over period
  readonly performanceIndex: number; // vs benchmark
  readonly opportunityScore: number; // Growth potential
  readonly challenges: readonly string[];
  readonly recommendations: readonly string[];
}

/**
 * Sales analytics service errors
 */
export class SalesAnalyticsServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SalesAnalyticsServiceError';
  }
}

/**
 * Sales Analytics Service Interface
 *
 * Provides advanced analytics capabilities beyond basic reporting
 */
export interface SalesAnalyticsService {
  /**
   * Analyze sales trends over time with forecasting
   * @param request - Trend analysis parameters
   * @returns Promise<SalesTrendPoint[]> - Time series trend data
   * @throws {SalesAnalyticsServiceError} When analysis fails
   */
  analyzeSalesTrends(request: SalesTrendRequest): Promise<readonly SalesTrendPoint[]>;

  /**
   * Segment customers based on various models
   * @param request - Segmentation parameters
   * @returns Promise<CustomerSegment[]> - Customer segments with insights
   * @throws {SalesAnalyticsServiceError} When segmentation fails
   */
  segmentCustomers(request: CustomerSegmentationRequest): Promise<readonly CustomerSegment[]>;

  /**
   * Analyze product performance and identify opportunities
   * @param request - Performance analysis parameters
   * @returns Promise<ProductPerformanceInsight[]> - Product insights
   * @throws {SalesAnalyticsServiceError} When analysis fails
   */
  analyzeProductPerformance(request: ProductPerformanceRequest): Promise<readonly ProductPerformanceInsight[]>;

  /**
   * Generate revenue forecasts with confidence intervals
   * @param request - Forecasting parameters
   * @returns Promise<RevenueForecast> - Forecast with scenarios
   * @throws {SalesAnalyticsServiceError} When forecasting fails
   */
  forecastRevenue(request: RevenueForecastRequest): Promise<RevenueForecast>;

  /**
   * Perform market basket analysis for cross-selling
   * @param request - Market basket analysis parameters
   * @returns Promise<MarketBasketRule[]> - Association rules
   * @throws {SalesAnalyticsServiceError} When analysis fails
   */
  analyzeMarketBasket(request: MarketBasketRequest): Promise<readonly MarketBasketRule[]>;

  /**
   * Calculate customer lifetime value
   * @param request - LTV calculation parameters
   * @returns Promise<CustomerLTVResult[]> - LTV analysis results
   * @throws {SalesAnalyticsServiceError} When calculation fails
   */
  calculateCustomerLTV(request: CustomerLTVRequest): Promise<readonly CustomerLTVResult[]>;

  /**
   * Analyze sales territory performance
   * @param request - Territory analysis parameters
   * @returns Promise<TerritoryPerformance[]> - Territory insights
   * @throws {SalesAnalyticsServiceError} When analysis fails
   */
  analyzeTerritoryPerformance(request: TerritoryPerformanceRequest): Promise<readonly TerritoryPerformance[]>;

  /**
   * Check service health and connectivity
   * @returns Promise<boolean> - True if service is healthy
   */
  isHealthy(): Promise<boolean>;
}
