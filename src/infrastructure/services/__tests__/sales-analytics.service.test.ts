/**
 * Sales Analytics Service Implementation Tests
 *
 * Comprehensive unit tests for SalesAnalyticsServiceImpl covering:
 * - Sales trend analysis with forecasting
 * - Customer segmentation models
 * - Product performance insights
 * - Revenue forecasting capabilities
 * - Market basket analysis
 * - Customer lifetime value calculations
 * - Territory performance analytics
 * - Error handling and validation
 *
 * @domain Reports and Analytics
 * @pattern Test-Driven Development
 * @version 1.0.0
 */

import { SalesAnalyticsServiceImpl, createSalesAnalyticsService, AnalyticsErrorCode } from '../sales-analytics.service';
import {
  SalesAnalyticsServiceError,
  SalesTrendRequest,
  CustomerSegmentationRequest,
  ProductPerformanceRequest,
  RevenueForecastRequest,
  MarketBasketRequest,
  CustomerLTVRequest,
  TerritoryPerformanceRequest,
} from '../../../domain/services/sales-analytics.service';
import { ReportPeriod, ReportPeriodType } from '../../../domain/value-objects/report-period';
import { Money } from '../../../domain/value-objects/money';
import { DatabaseConnection, createDatabaseConnection } from '../../database/connection';
import { createMigrationManager } from '../../database/migration';
import {
  OrderRepository,
  OrderStatistics,
  CustomerOrderSummary,
  ProductSalesSummary,
} from '../../../domain/repositories/order.repository';
import { ICustomerRepository } from '../../../domain/repositories/customer.repository';
import { IProductRepository } from '../../../domain/repositories/product.repository';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

// Mock repositories
const mockOrderRepository: jest.Mocked<OrderRepository> = {
  save: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  findByOrderNumber: jest.fn(),
  existsByOrderNumber: jest.fn(),
  deleteById: jest.fn(),
  search: jest.fn(),
  findByCustomerId: jest.fn(),
  findByWorkerId: jest.fn(),
  findByAreaId: jest.fn(),
  findPendingOrders: jest.fn(),
  findOverdueOrders: jest.fn(),
  findOrdersRequiringFulfillment: jest.fn(),
  getOrderStatistics: jest.fn(),
  getCustomerOrderSummaries: jest.fn(),
  getProductSalesSummaries: jest.fn(),
  getNextOrderNumber: jest.fn(),
  bulkUpdateStatus: jest.fn(),
  bulkUpdateFulfillmentStatus: jest.fn(),
  findOrdersContainingProduct: jest.fn(),
  findOrdersNeedingSync: jest.fn(),
  markOrdersAsSynced: jest.fn(),
};

const mockCustomerRepository: jest.Mocked<ICustomerRepository> = {
  save: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  findByCode: jest.fn(),
  existsByCode: jest.fn(),
  deleteById: jest.fn(),
  search: jest.fn(),
  getStats: jest.fn(),
};

const mockProductRepository: jest.Mocked<IProductRepository> = {
  save: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  findBySku: jest.fn(),
  existsBySku: jest.fn(),
  deleteById: jest.fn(),
  search: jest.fn(),
  findByBarcode: jest.fn(),
  getStats: jest.fn(),
  updateStock: jest.fn(),
  bulkUpdateStock: jest.fn(),
  getLowStockProducts: jest.fn(),
  getOutOfStockProducts: jest.fn(),
  searchAdvanced: jest.fn(),
};

describe('SalesAnalyticsServiceImpl', () => {
  let service: SalesAnalyticsServiceImpl;
  let connection: DatabaseConnection;
  let testDbPath: string;

  const testAgencyId = 'agency-123';

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create test database
    testDbPath = join(process.cwd(), 'temp', `test-analytics-${Date.now()}.db`);
    connection = createDatabaseConnection(testDbPath);

    // Run migrations
    const migrationManager = createMigrationManager(connection);
    await migrationManager.migrateToLatest();

    // Create service instance
    service = new SalesAnalyticsServiceImpl(
      connection,
      mockOrderRepository,
      mockCustomerRepository,
      mockProductRepository
    );
  });

  afterEach(async () => {
    // Clean up
    if (connection) {
      connection.close();
    }
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('Constructor and Validation', () => {
    it('should create service instance successfully', () => {
      expect(service).toBeInstanceOf(SalesAnalyticsServiceImpl);
    });

    it('should throw error for missing database connection', () => {
      expect(() => {
        new SalesAnalyticsServiceImpl(null as any, mockOrderRepository, mockCustomerRepository, mockProductRepository);
      }).toThrow(SalesAnalyticsServiceError);
    });

    it('should throw error for missing repositories', () => {
      expect(() => {
        new SalesAnalyticsServiceImpl(connection, null as any, mockCustomerRepository, mockProductRepository);
      }).toThrow(SalesAnalyticsServiceError);
    });

    it('should check health successfully', async () => {
      const isHealthy = await service.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Sales Trend Analysis', () => {
    const validTrendRequest: SalesTrendRequest = {
      agencyId: testAgencyId,
      period: ReportPeriod.fromType(ReportPeriodType.LAST_30_DAYS),
      granularity: 'daily',
      includeForecasting: true,
      seasonalAdjustment: false,
    };

    beforeEach(() => {
      // Mock order statistics
      mockOrderRepository.getOrderStatistics.mockResolvedValue({
        totalOrders: 100,
        totalValue: 50000,
        averageOrderValue: 500,
        pendingOrders: 10,
        confirmedOrders: 80,
        deliveredOrders: 10,
        cancelledOrders: 0,
        overdueOrders: 0,
      });

      // Mock customer summaries
      mockOrderRepository.getCustomerOrderSummaries.mockResolvedValue([
        {
          customerId: 'cust-1',
          customerCode: 'CUST001',
          customerName: 'Customer 1',
          totalOrders: 5,
          totalValue: 2500,
          averageOrderValue: 500,
          lastOrderDate: new Date(),
          pendingOrdersCount: 0,
          overdueOrdersCount: 0,
        },
      ]);
    });

    it('should analyze sales trends successfully', async () => {
      const result = await service.analyzeSalesTrends(validTrendRequest);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('period');
      expect(result[0]).toHaveProperty('actualSales');
      expect(result[0]).toHaveProperty('orderCount');
      expect(result[0]).toHaveProperty('uniqueCustomers');
    });

    it('should include forecasting when requested', async () => {
      const requestWithForecast = { ...validTrendRequest, includeForecasting: true };

      const result = await service.analyzeSalesTrends(requestWithForecast);

      // Forecasting only applies after we have several data points
      if (result.length >= 4) {
        const lastPoint = result[result.length - 1];
        expect(lastPoint.forecastedSales).toBeDefined();
        expect(lastPoint.variance).toBeDefined();
      }
    });

    it('should handle different granularities', async () => {
      const granularities: Array<'daily' | 'weekly' | 'monthly' | 'quarterly'> = [
        'daily',
        'weekly',
        'monthly',
        'quarterly',
      ];

      for (const granularity of granularities) {
        const request = { ...validTrendRequest, granularity };
        const result = await service.analyzeSalesTrends(request);
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('should validate trend request parameters', async () => {
      const invalidRequests = [
        { ...validTrendRequest, agencyId: '' },
        { ...validTrendRequest, granularity: 'invalid' as any },
        { ...validTrendRequest, period: null as any },
      ];

      for (const invalidRequest of invalidRequests) {
        await expect(service.analyzeSalesTrends(invalidRequest)).rejects.toThrow(SalesAnalyticsServiceError);
      }
    });
  });

  describe('Customer Segmentation', () => {
    const validSegmentationRequest: CustomerSegmentationRequest = {
      agencyId: testAgencyId,
      period: ReportPeriod.fromType(ReportPeriodType.LAST_90_DAYS),
      segmentationModel: 'RFM',
      includeChurnRisk: true,
      includeGrowthPotential: true,
    };

    it('should perform RFM segmentation successfully', async () => {
      const result = await service.segmentCustomers(validSegmentationRequest);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('segmentId');
      expect(result[0]).toHaveProperty('segmentName');
      expect(result[0]).toHaveProperty('customerCount');
      expect(result[0]).toHaveProperty('totalRevenue');
      expect(result[0]).toHaveProperty('churnRisk');
      expect(result[0]).toHaveProperty('growthPotential');
    });

    it('should handle different segmentation models', async () => {
      const models: Array<'RFM' | 'CLV' | 'BEHAVIORAL' | 'GEOGRAPHIC'> = ['RFM', 'CLV', 'BEHAVIORAL', 'GEOGRAPHIC'];

      for (const model of models) {
        const request = { ...validSegmentationRequest, segmentationModel: model };
        const result = await service.segmentCustomers(request);
        expect(result).toBeDefined();
      }
    });

    it('should validate segmentation request parameters', async () => {
      const invalidRequests = [
        { ...validSegmentationRequest, agencyId: '' },
        { ...validSegmentationRequest, segmentationModel: 'INVALID' as any },
        { ...validSegmentationRequest, period: null as any },
      ];

      for (const invalidRequest of invalidRequests) {
        await expect(service.segmentCustomers(invalidRequest)).rejects.toThrow(SalesAnalyticsServiceError);
      }
    });
  });

  describe('Product Performance Analysis', () => {
    const validPerformanceRequest: ProductPerformanceRequest = {
      agencyId: testAgencyId,
      period: ReportPeriod.fromType(ReportPeriodType.LAST_30_DAYS),
      analysisType: 'SALES_VELOCITY',
      minimumOrders: 5,
      includeSeasonality: true,
    };

    beforeEach(() => {
      // Mock product sales summaries
      mockOrderRepository.getProductSalesSummaries.mockResolvedValue([
        {
          productId: 'prod-1',
          productCode: 'PROD001',
          productName: 'Product 1',
          totalQuantityOrdered: 100,
          totalQuantityDelivered: 95,
          totalSalesValue: 10000,
          orderCount: 20,
          averageOrderQuantity: 5,
        },
        {
          productId: 'prod-2',
          productCode: 'PROD002',
          productName: 'Product 2',
          totalQuantityOrdered: 50,
          totalQuantityDelivered: 48,
          totalSalesValue: 6000,
          orderCount: 12,
          averageOrderQuantity: 4,
        },
      ]);
    });

    it('should analyze product performance successfully', async () => {
      const result = await service.analyzeProductPerformance(validPerformanceRequest);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('productId');
      expect(result[0]).toHaveProperty('salesVelocity');
      expect(result[0]).toHaveProperty('revenueVelocity');
      expect(result[0]).toHaveProperty('performanceScore');
      expect(result[0]).toHaveProperty('trendDirection');
    });

    it('should filter products by minimum orders', async () => {
      const requestWithHighMinimum = { ...validPerformanceRequest, minimumOrders: 15 };
      const result = await service.analyzeProductPerformance(requestWithHighMinimum);

      // Should only include products with >= 15 orders
      expect(result.length).toBe(1); // Only first product has 20 orders
      expect(result[0].productId).toBe('prod-1');
    });

    it('should sort products by performance score', async () => {
      const result = await service.analyzeProductPerformance(validPerformanceRequest);

      // Results should be sorted by performance score descending
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].performanceScore).toBeGreaterThanOrEqual(result[i].performanceScore);
      }
    });

    it('should validate performance request parameters', async () => {
      const invalidRequests = [
        { ...validPerformanceRequest, agencyId: '' },
        { ...validPerformanceRequest, period: null as any },
      ];

      for (const invalidRequest of invalidRequests) {
        await expect(service.analyzeProductPerformance(invalidRequest)).rejects.toThrow(SalesAnalyticsServiceError);
      }
    });
  });

  describe('Revenue Forecasting', () => {
    const validForecastRequest: RevenueForecastRequest = {
      agencyId: testAgencyId,
      historicalPeriod: ReportPeriod.fromType(ReportPeriodType.LAST_90_DAYS),
      forecastPeriod: ReportPeriod.fromType(ReportPeriodType.NEXT_30_DAYS),
      forecastModel: 'LINEAR',
      confidenceLevel: 0.95,
      includeScenarios: true,
    };

    beforeEach(() => {
      // Mock historical order statistics
      mockOrderRepository.getOrderStatistics.mockResolvedValue({
        totalOrders: 300,
        totalValue: 150000,
        averageOrderValue: 500,
        pendingOrders: 30,
        confirmedOrders: 240,
        deliveredOrders: 30,
        cancelledOrders: 0,
        overdueOrders: 0,
      });
    });

    it('should generate revenue forecast successfully', async () => {
      const result = await service.forecastRevenue(validForecastRequest);

      expect(result).toBeDefined();
      expect(result.forecastedRevenue).toBeInstanceOf(Money);
      expect(result.lowerBound).toBeInstanceOf(Money);
      expect(result.upperBound).toBeInstanceOf(Money);
      expect(result.confidence).toBe(0.95);
      expect(result.model).toBe('LINEAR');
      expect(result.accuracy).toBeDefined();
    });

    it('should include scenarios when requested', async () => {
      const result = await service.forecastRevenue(validForecastRequest);

      expect(result.scenarios).toBeDefined();
      expect(result.scenarios!.optimistic).toBeInstanceOf(Money);
      expect(result.scenarios!.mostLikely).toBeInstanceOf(Money);
      expect(result.scenarios!.pessimistic).toBeInstanceOf(Money);

      // Optimistic should be higher than pessimistic
      expect(result.scenarios!.optimistic.amount).toBeGreaterThan(result.scenarios!.pessimistic.amount);
    });

    it('should handle different forecast models', async () => {
      const models: Array<'LINEAR' | 'EXPONENTIAL' | 'SEASONAL' | 'ARIMA'> = [
        'LINEAR',
        'EXPONENTIAL',
        'SEASONAL',
        'ARIMA',
      ];

      for (const model of models) {
        const request = { ...validForecastRequest, forecastModel: model };
        const result = await service.forecastRevenue(request);
        expect(result.model).toBe(model);
        expect(result.forecastedRevenue.amount).toBeGreaterThan(0);
      }
    });

    it('should validate forecast request parameters', async () => {
      const invalidRequests = [
        { ...validForecastRequest, agencyId: '' },
        { ...validForecastRequest, confidenceLevel: 1.5 },
        { ...validForecastRequest, confidenceLevel: 0.3 },
        { ...validForecastRequest, historicalPeriod: null as any },
      ];

      for (const invalidRequest of invalidRequests) {
        await expect(service.forecastRevenue(invalidRequest)).rejects.toThrow(SalesAnalyticsServiceError);
      }
    });
  });

  describe('Market Basket Analysis', () => {
    const validBasketRequest: MarketBasketRequest = {
      agencyId: testAgencyId,
      period: ReportPeriod.fromType(ReportPeriodType.LAST_60_DAYS),
      minimumSupport: 0.1,
      minimumConfidence: 0.6,
      productIds: ['product-1', 'product-2', 'product-3'],
    };

    it('should perform market basket analysis successfully', async () => {
      const result = await service.analyzeMarketBasket(validBasketRequest);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        expect(result[0]).toHaveProperty('antecedent');
        expect(result[0]).toHaveProperty('consequent');
        expect(result[0]).toHaveProperty('support');
        expect(result[0]).toHaveProperty('confidence');
        expect(result[0]).toHaveProperty('lift');
        expect(result[0]).toHaveProperty('revenueImpact');
      }
    });

    it('should filter rules by minimum support and confidence', async () => {
      const result = await service.analyzeMarketBasket(validBasketRequest);

      for (const rule of result) {
        expect(rule.support).toBeGreaterThanOrEqual(validBasketRequest.minimumSupport);
        expect(rule.confidence).toBeGreaterThanOrEqual(validBasketRequest.minimumConfidence);
      }
    });

    it('should validate market basket request parameters', async () => {
      const invalidRequests = [
        { ...validBasketRequest, agencyId: '' },
        { ...validBasketRequest, minimumSupport: -0.1 },
        { ...validBasketRequest, minimumSupport: 1.5 },
        { ...validBasketRequest, minimumConfidence: -0.1 },
        { ...validBasketRequest, minimumConfidence: 1.5 },
        { ...validBasketRequest, period: null as any },
      ];

      for (const invalidRequest of invalidRequests) {
        await expect(service.analyzeMarketBasket(invalidRequest)).rejects.toThrow(SalesAnalyticsServiceError);
      }
    });
  });

  describe('Customer Lifetime Value', () => {
    const validLTVRequest: CustomerLTVRequest = {
      agencyId: testAgencyId,
      calculationMethod: 'PREDICTIVE',
      timeHorizon: 24,
      includeAcquisitionCosts: true,
      includeRetentionCosts: true,
    };

    beforeEach(() => {
      // Mock customer order summaries
      mockOrderRepository.getCustomerOrderSummaries.mockResolvedValue([
        {
          customerId: 'cust-1',
          customerCode: 'CUST001',
          customerName: 'Customer 1',
          totalOrders: 15,
          totalValue: 7500,
          averageOrderValue: 500,
          lastOrderDate: new Date(),
          pendingOrdersCount: 1,
          overdueOrdersCount: 0,
        },
        {
          customerId: 'cust-2',
          customerCode: 'CUST002',
          customerName: 'Customer 2',
          totalOrders: 8,
          totalValue: 4000,
          averageOrderValue: 500,
          lastOrderDate: new Date(),
          pendingOrdersCount: 0,
          overdueOrdersCount: 1,
        },
      ]);
    });

    it('should calculate customer LTV successfully', async () => {
      const result = await service.calculateCustomerLTV(validLTVRequest);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('customerId');
      expect(result[0]).toHaveProperty('currentLTV');
      expect(result[0]).toHaveProperty('predictedLTV');
      expect(result[0]).toHaveProperty('churnProbability');
      expect(result[0]).toHaveProperty('expectedLifetime');
      expect(result[0]).toHaveProperty('riskScore');
    });

    it('should sort customers by predicted LTV', async () => {
      const result = await service.calculateCustomerLTV(validLTVRequest);

      // Results should be sorted by predicted LTV descending
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].predictedLTV.amount).toBeGreaterThanOrEqual(result[i].predictedLTV.amount);
      }
    });

    it('should calculate risk scores correctly', async () => {
      const result = await service.calculateCustomerLTV(validLTVRequest);

      for (const customer of result) {
        expect(customer.riskScore).toBeGreaterThanOrEqual(0);
        expect(customer.riskScore).toBeLessThanOrEqual(100);
      }
    });

    it('should validate LTV request parameters', async () => {
      const invalidRequests = [
        { ...validLTVRequest, agencyId: '' },
        { ...validLTVRequest, timeHorizon: 0 },
        { ...validLTVRequest, timeHorizon: 150 },
      ];

      for (const invalidRequest of invalidRequests) {
        await expect(service.calculateCustomerLTV(invalidRequest)).rejects.toThrow(SalesAnalyticsServiceError);
      }
    });
  });

  describe('Territory Performance Analysis', () => {
    const validTerritoryRequest: TerritoryPerformanceRequest = {
      agencyId: testAgencyId,
      period: ReportPeriod.fromType(ReportPeriodType.LAST_30_DAYS),
      territoryType: 'AREA',
      includeComparisons: true,
      benchmarkType: 'HISTORICAL',
    };

    it('should analyze territory performance successfully', async () => {
      const result = await service.analyzeTerritoryPerformance(validTerritoryRequest);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('territoryId');
      expect(result[0]).toHaveProperty('territoryName');
      expect(result[0]).toHaveProperty('revenue');
      expect(result[0]).toHaveProperty('orderCount');
      expect(result[0]).toHaveProperty('customerCount');
      expect(result[0]).toHaveProperty('performanceIndex');
      expect(result[0]).toHaveProperty('challenges');
      expect(result[0]).toHaveProperty('recommendations');
    });

    it('should validate territory request parameters', async () => {
      const invalidRequests = [
        { ...validTerritoryRequest, agencyId: '' },
        { ...validTerritoryRequest, period: null as any },
      ];

      for (const invalidRequest of invalidRequests) {
        await expect(service.analyzeTerritoryPerformance(invalidRequest)).rejects.toThrow(SalesAnalyticsServiceError);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockOrderRepository.getOrderStatistics.mockRejectedValue(new Error('Database connection failed'));

      const trendRequest: SalesTrendRequest = {
        agencyId: testAgencyId,
        period: ReportPeriod.fromType(ReportPeriodType.LAST_30_DAYS),
        granularity: 'daily',
      };

      await expect(service.analyzeSalesTrends(trendRequest)).rejects.toThrow(SalesAnalyticsServiceError);
    });

    it('should preserve original error in service error', async () => {
      const originalError = new Error('Network timeout');
      mockOrderRepository.getOrderStatistics.mockRejectedValue(originalError);

      const trendRequest: SalesTrendRequest = {
        agencyId: testAgencyId,
        period: ReportPeriod.fromType(ReportPeriodType.LAST_30_DAYS),
        granularity: 'daily',
      };

      try {
        await service.analyzeSalesTrends(trendRequest);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(SalesAnalyticsServiceError);
        expect((error as SalesAnalyticsServiceError).cause).toBe(originalError);
      }
    });
  });

  describe('Factory Function', () => {
    it('should create service instance with factory function', () => {
      const factoryService = createSalesAnalyticsService(
        connection,
        mockOrderRepository,
        mockCustomerRepository,
        mockProductRepository
      );

      expect(factoryService).toBeInstanceOf(SalesAnalyticsServiceImpl);
    });
  });
});
