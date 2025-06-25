/**
 * Analytics IPC Handler Tests
 *
 * Comprehensive unit tests for AnalyticsIpcHandler covering:
 * - IPC channel registration and management
 * - Sales summary analytics with validation
 * - Sales trends analysis with forecasting
 * - Customer segmentation operations
 * - Error handling and security validation
 * - Request/response serialization
 *
 * @domain Reports and Analytics
 * @pattern Test-Driven Development
 * @version 1.0.0
 */

import { ipcMain } from 'electron';
import {
  AnalyticsIpcHandler,
  createAnalyticsIpcHandler,
  AnalyticsIpcError,
  SalesSummaryRequestSchema,
  SalesTrendsRequestSchema,
  CustomerSegmentationRequestSchema,
  type SalesSummaryResponse,
  type SalesTrendsResponse,
  type CustomerSegmentationResponse,
} from '../analytics.ipc';
import { SalesAnalyticsService } from '../../../domain/services/sales-analytics.service';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { OrderRepository } from '../../../domain/repositories/order.repository';
import { ICustomerRepository } from '../../../domain/repositories/customer.repository';
import { IProductRepository } from '../../../domain/repositories/product.repository';
import { ReportPeriodType } from '../../../domain/value-objects/report-period';
import { Money } from '../../../domain/value-objects/money';

// Mock Electron IPC
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn(),
  },
}));

// Mock repositories and services
const mockAnalyticsService: jest.Mocked<SalesAnalyticsService> = {
  analyzeSalesTrends: jest.fn(),
  segmentCustomers: jest.fn(),
  analyzeProductPerformance: jest.fn(),
  forecastRevenue: jest.fn(),
  analyzeMarketBasket: jest.fn(),
  calculateCustomerLTV: jest.fn(),
  analyzeTerritoryPerformance: jest.fn(),
  isHealthy: jest.fn(),
};

const mockUserRepository: jest.Mocked<IUserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  deleteById: jest.fn(),
  search: jest.fn(),
  getStats: jest.fn(),
  getPermissions: jest.fn(),
};

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

describe('AnalyticsIpcHandler', () => {
  let handler: AnalyticsIpcHandler;
  let mockIpcMain: jest.Mocked<typeof ipcMain>;

  const testAgencyId = '550e8400-e29b-41d4-a716-446655440001';
  const testUserId = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(() => {
    jest.clearAllMocks();
    mockIpcMain = ipcMain as jest.Mocked<typeof ipcMain>;

    handler = createAnalyticsIpcHandler(
      mockAnalyticsService,
      mockUserRepository,
      mockOrderRepository,
      mockCustomerRepository,
      mockProductRepository
    );
  });

  describe('Constructor and Factory', () => {
    it('should create handler instance successfully', () => {
      expect(handler).toBeInstanceOf(AnalyticsIpcHandler);
    });

    it('should throw error for missing analytics service', () => {
      expect(() => {
        createAnalyticsIpcHandler(
          null as any,
          mockUserRepository,
          mockOrderRepository,
          mockCustomerRepository,
          mockProductRepository
        );
      }).toThrow(AnalyticsIpcError);
    });

    it('should throw error for missing repositories', () => {
      expect(() => {
        createAnalyticsIpcHandler(
          mockAnalyticsService,
          null as any,
          mockOrderRepository,
          mockCustomerRepository,
          mockProductRepository
        );
      }).toThrow(AnalyticsIpcError);
    });

    it('should validate all dependencies in constructor', () => {
      expect(() => {
        createAnalyticsIpcHandler(
          mockAnalyticsService,
          mockUserRepository,
          mockOrderRepository,
          null as any,
          mockProductRepository
        );
      }).toThrow('Customer repository is required');
    });
  });

  describe('Handler Registration', () => {
    it('should register all analytics IPC handlers', () => {
      handler.registerHandlers();

      const expectedChannels = [
        'analytics:sales-summary',
        'analytics:sales-trends',
        'analytics:customer-segmentation',
        'analytics:product-performance',
        'analytics:revenue-forecast',
        'analytics:market-basket',
        'analytics:customer-ltv',
        'analytics:territory-performance',
      ];

      expect(mockIpcMain.handle).toHaveBeenCalledTimes(expectedChannels.length);

      expectedChannels.forEach((channel) => {
        expect(mockIpcMain.handle).toHaveBeenCalledWith(channel, expect.any(Function));
      });
    });

    it('should not register handlers multiple times', () => {
      handler.registerHandlers();
      handler.registerHandlers(); // Second call should not register again

      expect(mockIpcMain.handle).toHaveBeenCalledTimes(8); // Only called once per channel
    });

    it('should unregister all handlers', () => {
      handler.registerHandlers();
      handler.unregisterHandlers();

      expect(mockIpcMain.removeHandler).toHaveBeenCalledTimes(8);
    });

    it('should provide accurate handler statistics', () => {
      handler.registerHandlers();
      const stats = handler.getStats();

      expect(stats.handlerCount).toBe(8);
      expect(stats.allowedChannelsCount).toBe(8);
      expect(stats.registeredChannels).toHaveLength(8);
      expect(stats.registeredChannels).toContain('analytics:sales-summary');
    });
  });

  describe('Request Validation Schemas', () => {
    describe('SalesSummaryRequestSchema', () => {
      const validRequest = {
        agencyId: testAgencyId,
        userId: testUserId,
        periodType: ReportPeriodType.LAST_30_DAYS,
        groupBy: ['day'],
        metrics: {
          totalSales: true,
          orderCount: true,
          averageOrderValue: true,
          customerCount: true,
        },
      };

      it('should validate valid sales summary request', () => {
        const result = SalesSummaryRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('should reject invalid agency ID format', () => {
        const invalidRequest = { ...validRequest, agencyId: 'invalid-id' };
        const result = SalesSummaryRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should reject invalid user ID format', () => {
        const invalidRequest = { ...validRequest, userId: 'invalid-user-id' };
        const result = SalesSummaryRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should reject invalid period type', () => {
        const invalidRequest = { ...validRequest, periodType: 'INVALID_PERIOD' };
        const result = SalesSummaryRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should reject empty groupBy array', () => {
        const invalidRequest = { ...validRequest, groupBy: [] };
        const result = SalesSummaryRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should reject too many groupBy options', () => {
        const invalidRequest = { ...validRequest, groupBy: ['day', 'week', 'month', 'quarter'] };
        const result = SalesSummaryRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should validate optional custom date range', () => {
        const requestWithDates = {
          ...validRequest,
          customStartDate: '2024-01-01T00:00:00.000Z',
          customEndDate: '2024-01-31T23:59:59.999Z',
        };
        const result = SalesSummaryRequestSchema.safeParse(requestWithDates);
        expect(result.success).toBe(true);
      });

      it('should validate filters with limits', () => {
        const requestWithFilters = {
          ...validRequest,
          filters: {
            customerIds: Array(50).fill(testAgencyId), // 50 customers (within limit)
            productIds: Array(100).fill(testAgencyId), // 100 products (at limit)
            minimumOrderValue: 100,
            maximumOrderValue: 10000,
          },
        };
        const result = SalesSummaryRequestSchema.safeParse(requestWithFilters);
        expect(result.success).toBe(true);
      });

      it('should reject filters exceeding limits', () => {
        const requestWithTooManyFilters = {
          ...validRequest,
          filters: {
            customerIds: Array(101).fill(testAgencyId), // Exceeds 100 limit
          },
        };
        const result = SalesSummaryRequestSchema.safeParse(requestWithTooManyFilters);
        expect(result.success).toBe(false);
      });
    });

    describe('SalesTrendsRequestSchema', () => {
      const validRequest = {
        agencyId: testAgencyId,
        userId: testUserId,
        periodType: ReportPeriodType.LAST_90_DAYS,
        granularity: 'daily' as const,
      };

      it('should validate valid sales trends request', () => {
        const result = SalesTrendsRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('should validate granularity options', () => {
        const granularities = ['daily', 'weekly', 'monthly', 'quarterly'];

        granularities.forEach((granularity) => {
          const request = { ...validRequest, granularity };
          const result = SalesTrendsRequestSchema.safeParse(request);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid granularity', () => {
        const invalidRequest = { ...validRequest, granularity: 'invalid' };
        const result = SalesTrendsRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should allow optional forecasting options', () => {
        const requestWithOptions = {
          ...validRequest,
          includeForecasting: true,
          seasonalAdjustment: true,
        };
        const result = SalesTrendsRequestSchema.safeParse(requestWithOptions);
        expect(result.success).toBe(true);
      });
    });

    describe('CustomerSegmentationRequestSchema', () => {
      const validRequest = {
        agencyId: testAgencyId,
        userId: testUserId,
        periodType: ReportPeriodType.LAST_90_DAYS,
        segmentationModel: 'RFM' as const,
      };

      it('should validate valid customer segmentation request', () => {
        const result = CustomerSegmentationRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('should validate segmentation models', () => {
        const models = ['RFM', 'CLV', 'BEHAVIORAL', 'GEOGRAPHIC'];

        models.forEach((model) => {
          const request = { ...validRequest, segmentationModel: model };
          const result = CustomerSegmentationRequestSchema.safeParse(request);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid segmentation model', () => {
        const invalidRequest = { ...validRequest, segmentationModel: 'INVALID' };
        const result = CustomerSegmentationRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('should allow optional analysis flags', () => {
        const requestWithOptions = {
          ...validRequest,
          includeChurnRisk: true,
          includeGrowthPotential: true,
        };
        const result = CustomerSegmentationRequestSchema.safeParse(requestWithOptions);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Sales Summary Handler', () => {
    const validRequest = {
      agencyId: testAgencyId,
      userId: testUserId,
      periodType: ReportPeriodType.LAST_30_DAYS,
      groupBy: ['day'],
      metrics: {
        totalSales: true,
        orderCount: true,
        averageOrderValue: true,
        customerCount: true,
      },
    };

    beforeEach(() => {
      // Mock SalesSummaryHandler result
      jest.spyOn(handler as any, 'salesSummaryHandler').mockImplementation({
        handle: jest.fn().mockResolvedValue({
          summary: {
            totalSales: Money.fromDecimal(50000, 'USD'),
            totalOrders: 100,
            averageOrderValue: Money.fromDecimal(500, 'USD'),
            uniqueCustomers: 25,
            growthRate: 15.5,
          },
          timeSeries: [
            {
              period: '2024-01-01',
              totalSales: Money.fromDecimal(1500, 'USD'),
              orderCount: 3,
            },
          ],
          topProducts: [
            {
              productId: 'prod-1',
              productName: 'Product 1',
              totalSales: Money.fromDecimal(10000, 'USD'),
            },
          ],
          topCustomers: [
            {
              customerId: 'cust-1',
              customerName: 'Customer 1',
              totalOrders: 15,
            },
          ],
        }),
      });
    });

    it('should handle valid sales summary request', async () => {
      handler.registerHandlers();

      // Get the registered handler function
      const handleCall = (mockIpcMain.handle as jest.Mock).mock.calls.find(
        ([channel]) => channel === 'analytics:sales-summary'
      );
      expect(handleCall).toBeDefined();

      const handlerFunction = handleCall[1];
      const mockEvent = {} as any;

      const response = await handlerFunction(mockEvent, validRequest);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.summary.totalSales).toBe('50000');
      expect(response.data.summary.totalOrders).toBe(100);
      expect(response.operation).toBe('sales-summary');
      expect(response.timestamp).toBeTypeOf('number');
      expect(response.duration).toBeTypeOf('number');
    });

    it('should handle validation errors gracefully', async () => {
      handler.registerHandlers();

      const handleCall = (mockIpcMain.handle as jest.Mock).mock.calls.find(
        ([channel]) => channel === 'analytics:sales-summary'
      );
      const handlerFunction = handleCall[1];
      const mockEvent = {} as any;

      const invalidRequest = { ...validRequest, agencyId: 'invalid-id' };
      const response = await handlerFunction(mockEvent, invalidRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Validation failed');
      expect(response.validationErrors).toBeDefined();
      expect(response.code).toBe('VALIDATION_ERROR');
    });

    it('should handle service errors gracefully', async () => {
      // Mock handler to throw error
      jest.spyOn(handler as any, 'salesSummaryHandler').mockImplementation({
        handle: jest.fn().mockRejectedValue(new Error('Service unavailable')),
      });

      handler.registerHandlers();

      const handleCall = (mockIpcMain.handle as jest.Mock).mock.calls.find(
        ([channel]) => channel === 'analytics:sales-summary'
      );
      const handlerFunction = handleCall[1];
      const mockEvent = {} as any;

      const response = await handlerFunction(mockEvent, validRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('An unexpected error occurred');
      expect(response.code).toBe('UNKNOWN_ERROR');
    });

    it('should sanitize error messages for security', async () => {
      // Mock handler to throw error with sensitive information
      jest.spyOn(handler as any, 'salesSummaryHandler').mockImplementation({
        handle: jest.fn().mockRejectedValue(new Error('Database error: password=secret123 at C:\\sensitive\\path')),
      });

      handler.registerHandlers();

      const handleCall = (mockIpcMain.handle as jest.Mock).mock.calls.find(
        ([channel]) => channel === 'analytics:sales-summary'
      );
      const handlerFunction = handleCall[1];
      const mockEvent = {} as any;

      const response = await handlerFunction(mockEvent, validRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('An unexpected error occurred');
      expect(response.error).not.toContain('secret123');
      expect(response.error).not.toContain('C:\\');
    });
  });

  describe('Sales Trends Handler', () => {
    const validRequest = {
      agencyId: testAgencyId,
      userId: testUserId,
      periodType: ReportPeriodType.LAST_90_DAYS,
      granularity: 'daily' as const,
      includeForecasting: true,
    };

    beforeEach(() => {
      mockAnalyticsService.analyzeSalesTrends.mockResolvedValue([
        {
          period: '2024-01-01',
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-01-01T23:59:59'),
          actualSales: Money.fromDecimal(1500, 'USD'),
          forecastedSales: Money.fromDecimal(1600, 'USD'),
          variance: -6.25,
          orderCount: 3,
          averageOrderValue: Money.fromDecimal(500, 'USD'),
          uniqueCustomers: 2,
        },
      ]);
    });

    it('should handle valid sales trends request', async () => {
      handler.registerHandlers();

      const handleCall = (mockIpcMain.handle as jest.Mock).mock.calls.find(
        ([channel]) => channel === 'analytics:sales-trends'
      );
      const handlerFunction = handleCall[1];
      const mockEvent = {} as any;

      const response = await handlerFunction(mockEvent, validRequest);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.trends).toHaveLength(1);
      expect(response.data.trends[0].actualSales).toBe('1500');
      expect(response.data.trends[0].forecastedSales).toBe('1600');
      expect(response.data.trends[0].variance).toBe(-6.25);
      expect(response.operation).toBe('sales-trends');
    });

    it('should call analytics service with correct parameters', async () => {
      handler.registerHandlers();

      const handleCall = (mockIpcMain.handle as jest.Mock).mock.calls.find(
        ([channel]) => channel === 'analytics:sales-trends'
      );
      const handlerFunction = handleCall[1];
      const mockEvent = {} as any;

      await handlerFunction(mockEvent, validRequest);

      expect(mockAnalyticsService.analyzeSalesTrends).toHaveBeenCalledWith({
        agencyId: testAgencyId,
        period: expect.any(Object), // ReportPeriod instance
        granularity: 'daily',
        includeForecasting: true,
        seasonalAdjustment: false,
      });
    });
  });

  describe('Customer Segmentation Handler', () => {
    const validRequest = {
      agencyId: testAgencyId,
      userId: testUserId,
      periodType: ReportPeriodType.LAST_90_DAYS,
      segmentationModel: 'RFM' as const,
      includeChurnRisk: true,
    };

    beforeEach(() => {
      mockAnalyticsService.segmentCustomers.mockResolvedValue([
        {
          segmentId: 'champions',
          segmentName: 'Champions',
          description: 'High value customers',
          criteria: { recency: 'HIGH', frequency: 'HIGH', monetary: 'HIGH' },
          customerCount: 15,
          totalRevenue: Money.fromDecimal(50000, 'USD'),
          averageOrderValue: Money.fromDecimal(800, 'USD'),
          purchaseFrequency: 8.5,
          churnRisk: 'LOW',
          growthPotential: 'MEDIUM',
          recommendedActions: ['VIP treatment', 'Loyalty rewards'],
        },
      ]);
    });

    it('should handle valid customer segmentation request', async () => {
      handler.registerHandlers();

      const handleCall = (mockIpcMain.handle as jest.Mock).mock.calls.find(
        ([channel]) => channel === 'analytics:customer-segmentation'
      );
      const handlerFunction = handleCall[1];
      const mockEvent = {} as any;

      const response = await handlerFunction(mockEvent, validRequest);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.segments).toHaveLength(1);
      expect(response.data.segments[0].segmentName).toBe('Champions');
      expect(response.data.totalCustomers).toBe(15);
      expect(response.data.segmentationModel).toBe('RFM');
      expect(response.operation).toBe('customer-segmentation');
    });

    it('should transform Money objects to strings for serialization', async () => {
      handler.registerHandlers();

      const handleCall = (mockIpcMain.handle as jest.Mock).mock.calls.find(
        ([channel]) => channel === 'analytics:customer-segmentation'
      );
      const handlerFunction = handleCall[1];
      const mockEvent = {} as any;

      const response = await handlerFunction(mockEvent, validRequest);

      expect(response.data.segments[0].totalRevenue).toBe('50000');
      expect(response.data.segments[0].averageOrderValue).toBe('800');
    });
  });

  describe('Placeholder Handlers', () => {
    const placeholderChannels = [
      'analytics:product-performance',
      'analytics:revenue-forecast',
      'analytics:market-basket',
      'analytics:customer-ltv',
      'analytics:territory-performance',
    ];

    placeholderChannels.forEach((channel) => {
      it(`should handle ${channel} with not implemented response`, async () => {
        handler.registerHandlers();

        const handleCall = (mockIpcMain.handle as jest.Mock).mock.calls.find(([ch]) => ch === channel);
        const handlerFunction = handleCall[1];
        const mockEvent = {} as any;

        const response = await handlerFunction(mockEvent, {});

        expect(response.success).toBe(false);
        expect(response.error).toContain('not yet implemented');
        expect(response.code).toBe('NOT_IMPLEMENTED');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle analytics service errors', async () => {
      mockAnalyticsService.analyzeSalesTrends.mockRejectedValue(new Error('Analytics service error'));

      handler.registerHandlers();

      const handleCall = (mockIpcMain.handle as jest.Mock).mock.calls.find(
        ([channel]) => channel === 'analytics:sales-trends'
      );
      const handlerFunction = handleCall[1];
      const mockEvent = {} as any;

      const response = await handlerFunction(mockEvent, {
        agencyId: testAgencyId,
        userId: testUserId,
        periodType: ReportPeriodType.LAST_30_DAYS,
        granularity: 'daily',
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('An unexpected error occurred');
      expect(response.code).toBe('UNKNOWN_ERROR');
    });

    it('should provide validation error details', async () => {
      handler.registerHandlers();

      const handleCall = (mockIpcMain.handle as jest.Mock).mock.calls.find(
        ([channel]) => channel === 'analytics:sales-summary'
      );
      const handlerFunction = handleCall[1];
      const mockEvent = {} as any;

      const invalidRequest = {
        agencyId: 'invalid',
        userId: 'invalid',
        groupBy: [], // Empty array should fail
      };

      const response = await handlerFunction(mockEvent, invalidRequest);

      expect(response.success).toBe(false);
      expect(response.validationErrors).toBeDefined();
      expect(Object.keys(response.validationErrors!)).toContain('agencyId');
      expect(Object.keys(response.validationErrors!)).toContain('userId');
      expect(Object.keys(response.validationErrors!)).toContain('groupBy');
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide accurate statistics after registration', () => {
      const stats = handler.getStats();
      expect(stats.handlerCount).toBe(0);
      expect(stats.allowedChannelsCount).toBe(8);

      handler.registerHandlers();

      const updatedStats = handler.getStats();
      expect(updatedStats.handlerCount).toBe(8);
      expect(updatedStats.registeredChannels).toContain('analytics:sales-summary');
    });

    it('should reset statistics after unregistration', () => {
      handler.registerHandlers();
      expect(handler.getStats().handlerCount).toBe(8);

      handler.unregisterHandlers();
      expect(handler.getStats().handlerCount).toBe(0);
      expect(handler.getStats().registeredChannels).toHaveLength(0);
    });
  });
});
