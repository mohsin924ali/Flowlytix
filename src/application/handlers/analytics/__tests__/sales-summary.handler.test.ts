/**
 * Sales Summary Analytics Handler Tests
 *
 * Comprehensive unit tests for SalesSummaryHandler covering:
 * - Authorization and validation
 * - Business logic processing
 * - Analytics calculations
 * - Error handling scenarios
 * - Integration with domain repositories
 *
 * @domain Reports and Analytics
 * @pattern Test-Driven Development
 * @version 1.0.0
 */

import { SalesSummaryHandler, SalesAnalyticsHandlerError, createSalesSummaryHandler } from '../sales-summary.handler';
import {
  SalesSummaryQuery,
  SalesMetrics,
  SalesSummaryQueryValidationError,
} from '../../../queries/analytics/sales-summary.query';
import { ReportPeriodType } from '../../../../domain/value-objects/report-period';
import { User, UserStatus } from '../../../../domain/entities/user';
import { Role, Permission, SystemRole } from '../../../../domain/value-objects/role';
import { Email } from '../../../../domain/value-objects/email';
import { Password } from '../../../../domain/value-objects/password';
import { IUserRepository } from '../../../../domain/repositories/user.repository';
import {
  IOrderRepository,
  OrderStatistics,
  CustomerOrderSummary,
  ProductSalesSummary,
} from '../../../../domain/repositories/order.repository';
import { ICustomerRepository } from '../../../../domain/repositories/customer.repository';
import { IProductRepository } from '../../../../domain/repositories/product.repository';

// Mock repositories
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

const mockOrderRepository: jest.Mocked<IOrderRepository> = {
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

describe('SalesSummaryHandler', () => {
  let handler: SalesSummaryHandler;
  let testUser: User;
  let validQuery: SalesSummaryQuery;

  const testUserId = 'user-123';
  const testAgencyId = 'agency-456';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create handler instance
    handler = new SalesSummaryHandler(
      mockUserRepository,
      mockOrderRepository,
      mockCustomerRepository,
      mockProductRepository
    );

    // Create test user with analytics permissions
    const userRole = Role.create(SystemRole.MANAGER);

    testUser = User.create({
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'John',
      lastName: 'Doe',
      role: userRole.value,
      agencyId: testAgencyId,
      createdBy: 'admin-123',
    });

    // Setup valid query
    const metrics: SalesMetrics = {
      includeTotalSales: true,
      includeOrderCount: true,
      includeAverageOrderValue: true,
      includeTopProducts: false,
      includeTopCustomers: false,
      includePaymentMethods: false,
      includeFulfillmentStatus: false,
      includeGrowthRate: false,
    };

    validQuery = {
      agencyId: testAgencyId,
      periodType: ReportPeriodType.LAST_30_DAYS,
      metrics,
      requestedBy: testUserId,
    };
  });

  describe('Authorization and Validation', () => {
    it('should handle valid query successfully', async () => {
      // Setup mocks
      mockUserRepository.findById.mockResolvedValue(testUser);
      mockOrderRepository.getOrderStatistics.mockResolvedValue({
        totalOrders: 100,
        totalValue: 50000,
        averageOrderValue: 500,
        pendingOrders: 10,
        confirmedOrders: 70,
        deliveredOrders: 15,
        cancelledOrders: 5,
        overdueOrders: 2,
      });
      mockOrderRepository.getCustomerOrderSummaries.mockResolvedValue([]);

      const result = await handler.handle(validQuery);

      expect(result).toBeDefined();
      expect(result.summary.totalSales).toBe(50000);
      expect(result.summary.totalOrders).toBe(100);
      expect(result.summary.averageOrderValue).toBe(500);
      expect(result.generatedBy).toBe(testUserId);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for invalid query', async () => {
      const invalidQuery = { ...validQuery, agencyId: '' };

      await expect(handler.handle(invalidQuery)).rejects.toThrow(SalesSummaryQueryValidationError);
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(handler.handle(validQuery)).rejects.toThrow(SalesAnalyticsHandlerError);
      await expect(handler.handle(validQuery)).rejects.toThrow('Requesting user not found');
    });

    it('should throw error for insufficient permissions', async () => {
      // Create user without analytics permissions
      const userWithoutPermission = User.create({
        email: Email.create('user@example.com'),
        password: Password.create('TestPass123!'),
        firstName: 'Jane',
        lastName: 'Doe',
        role: Role.create({
          name: 'Basic User',
          permissions: [Permission.READ_ORDER], // No analytics permission
        }),
        agencyId: testAgencyId,
        createdBy: 'admin-123',
      });

      mockUserRepository.findById.mockResolvedValue(userWithoutPermission);

      await expect(handler.handle(validQuery)).rejects.toThrow(SalesAnalyticsHandlerError);
      await expect(handler.handle(validQuery)).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Basic Analytics Functionality', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(testUser);
    });

    it('should generate basic sales summary', async () => {
      const orderStats: OrderStatistics = {
        totalOrders: 150,
        totalValue: 75000,
        averageOrderValue: 500,
        pendingOrders: 20,
        confirmedOrders: 100,
        deliveredOrders: 25,
        cancelledOrders: 5,
        overdueOrders: 3,
      };

      mockOrderRepository.getOrderStatistics.mockResolvedValue(orderStats);
      mockOrderRepository.getCustomerOrderSummaries.mockResolvedValue([
        {
          customerId: 'cust-1',
          customerCode: 'CUST001',
          customerName: 'Customer 1',
          totalOrders: 10,
          totalValue: 5000,
          averageOrderValue: 500,
          lastOrderDate: new Date(),
          pendingOrdersCount: 1,
          overdueOrdersCount: 0,
        },
        {
          customerId: 'cust-2',
          customerCode: 'CUST002',
          customerName: 'Customer 2',
          totalOrders: 5,
          totalValue: 2500,
          averageOrderValue: 500,
          lastOrderDate: new Date(),
          pendingOrdersCount: 0,
          overdueOrdersCount: 0,
        },
      ]);

      const result = await handler.handle(validQuery);

      expect(result.summary.totalSales).toBe(75000);
      expect(result.summary.totalOrders).toBe(150);
      expect(result.summary.averageOrderValue).toBe(500);
      expect(result.summary.uniqueCustomers).toBe(2);
      expect(result.summary.period.type).toBe(ReportPeriodType.LAST_30_DAYS);
    });

    it('should handle custom date range', async () => {
      const customQuery = {
        ...validQuery,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        periodType: undefined,
      };

      mockOrderRepository.getOrderStatistics.mockResolvedValue({
        totalOrders: 50,
        totalValue: 25000,
        averageOrderValue: 500,
        pendingOrders: 5,
        confirmedOrders: 40,
        deliveredOrders: 5,
        cancelledOrders: 0,
        overdueOrders: 0,
      });
      mockOrderRepository.getCustomerOrderSummaries.mockResolvedValue([]);

      const result = await handler.handle(customQuery);

      expect(mockOrderRepository.getOrderStatistics).toHaveBeenCalledWith(
        testAgencyId,
        customQuery.startDate,
        customQuery.endDate
      );
      expect(result.summary.totalSales).toBe(25000);
    });
  });

  describe('Time Series Analytics', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(testUser);
    });

    it('should generate daily time series data', async () => {
      const queryWithTimeSeries = {
        ...validQuery,
        groupBy: 'day' as const,
      };

      mockOrderRepository.getOrderStatistics.mockImplementation(
        async (agencyId: string, startDate?: Date, endDate?: Date) => ({
          totalOrders: 10,
          totalValue: 5000,
          averageOrderValue: 500,
          pendingOrders: 1,
          confirmedOrders: 8,
          deliveredOrders: 1,
          cancelledOrders: 0,
          overdueOrders: 0,
        })
      );

      mockOrderRepository.getCustomerOrderSummaries.mockImplementation(
        async (agencyId: string, startDate?: Date, endDate?: Date) => [
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
        ]
      );

      const result = await handler.handle(queryWithTimeSeries);

      expect(result.timeSeries).toBeDefined();
      expect(result.timeSeries!.length).toBeGreaterThan(0);
      expect(result.timeSeries![0]).toHaveProperty('period');
      expect(result.timeSeries![0]).toHaveProperty('totalSales');
      expect(result.timeSeries![0]).toHaveProperty('orderCount');
    });

    it('should generate weekly time series data', async () => {
      const queryWithWeekly = {
        ...validQuery,
        groupBy: 'week' as const,
      };

      mockOrderRepository.getOrderStatistics.mockResolvedValue({
        totalOrders: 20,
        totalValue: 10000,
        averageOrderValue: 500,
        pendingOrders: 2,
        confirmedOrders: 16,
        deliveredOrders: 2,
        cancelledOrders: 0,
        overdueOrders: 0,
      });
      mockOrderRepository.getCustomerOrderSummaries.mockResolvedValue([]);

      const result = await handler.handle(queryWithWeekly);

      expect(result.timeSeries).toBeDefined();
      expect(result.timeSeries!.length).toBeGreaterThan(0);
    });
  });

  describe('Top Performers Analytics', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(testUser);
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
      mockOrderRepository.getCustomerOrderSummaries.mockResolvedValue([]);
    });

    it('should get top products when requested', async () => {
      const queryWithTopProducts = {
        ...validQuery,
        metrics: {
          ...validQuery.metrics,
          includeTopProducts: true,
        },
        topN: 5,
      };

      const productSummaries: ProductSalesSummary[] = [
        {
          productId: 'prod-1',
          productCode: 'PROD001',
          productName: 'Product 1',
          totalQuantityOrdered: 100,
          totalQuantityDelivered: 90,
          totalSalesValue: 15000,
          orderCount: 30,
          averageOrderQuantity: 3.33,
        },
        {
          productId: 'prod-2',
          productCode: 'PROD002',
          productName: 'Product 2',
          totalQuantityOrdered: 80,
          totalQuantityDelivered: 75,
          totalSalesValue: 12000,
          orderCount: 25,
          averageOrderQuantity: 3.2,
        },
      ];

      mockOrderRepository.getProductSalesSummaries.mockResolvedValue(productSummaries);

      const result = await handler.handle(queryWithTopProducts);

      expect(result.topProducts).toBeDefined();
      expect(result.topProducts!).toHaveLength(2);
      expect(result.topProducts![0].rank).toBe(1);
      expect(result.topProducts![0].name).toBe('Product 1');
      expect(result.topProducts![0].totalSales).toBe(15000);
      expect(result.topProducts![1].rank).toBe(2);
    });

    it('should get top customers when requested', async () => {
      const queryWithTopCustomers = {
        ...validQuery,
        metrics: {
          ...validQuery.metrics,
          includeTopCustomers: true,
        },
        topN: 3,
      };

      const customerSummaries: CustomerOrderSummary[] = [
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
          totalOrders: 10,
          totalValue: 5000,
          averageOrderValue: 500,
          lastOrderDate: new Date(),
          pendingOrdersCount: 0,
          overdueOrdersCount: 0,
        },
      ];

      mockOrderRepository.getCustomerOrderSummaries.mockResolvedValue(customerSummaries);

      const result = await handler.handle(queryWithTopCustomers);

      expect(result.topCustomers).toBeDefined();
      expect(result.topCustomers!).toHaveLength(2);
      expect(result.topCustomers![0].rank).toBe(1);
      expect(result.topCustomers![0].name).toBe('Customer 1');
      expect(result.topCustomers![0].totalSales).toBe(7500);
    });
  });

  describe('Breakdown Analytics', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(testUser);
      mockOrderRepository.getCustomerOrderSummaries.mockResolvedValue([]);
    });

    it('should get payment method breakdown when requested', async () => {
      const queryWithPaymentBreakdown = {
        ...validQuery,
        metrics: {
          ...validQuery.metrics,
          includePaymentMethods: true,
        },
      };

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

      const result = await handler.handle(queryWithPaymentBreakdown);

      expect(result.paymentMethods).toBeDefined();
      expect(result.paymentMethods!).toHaveLength(2);
      expect(result.paymentMethods![0].paymentMethod).toBe('cash');
      expect(result.paymentMethods![0].percentage).toBe(60);
      expect(result.paymentMethods![1].paymentMethod).toBe('credit');
      expect(result.paymentMethods![1].percentage).toBe(40);
    });

    it('should get fulfillment status breakdown when requested', async () => {
      const queryWithFulfillmentBreakdown = {
        ...validQuery,
        metrics: {
          ...validQuery.metrics,
          includeFulfillmentStatus: true,
        },
      };

      mockOrderRepository.getOrderStatistics.mockResolvedValue({
        totalOrders: 100,
        totalValue: 50000,
        averageOrderValue: 500,
        pendingOrders: 20,
        confirmedOrders: 60,
        deliveredOrders: 15,
        cancelledOrders: 5,
        overdueOrders: 0,
      });

      const result = await handler.handle(queryWithFulfillmentBreakdown);

      expect(result.fulfillmentStatus).toBeDefined();
      expect(result.fulfillmentStatus!).toHaveLength(3);
      expect(result.fulfillmentStatus![0].status).toBe('delivered');
      expect(result.fulfillmentStatus![0].orderCount).toBe(15);
    });
  });

  describe('Growth Comparison Analytics', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(testUser);
      mockOrderRepository.getCustomerOrderSummaries.mockResolvedValue([]);
    });

    it('should calculate growth comparison when requested', async () => {
      const queryWithGrowth = {
        ...validQuery,
        metrics: {
          ...validQuery.metrics,
          includeGrowthRate: true,
        },
        includeComparisons: true,
      };

      // Mock current period stats
      mockOrderRepository.getOrderStatistics.mockImplementation(
        async (agencyId: string, startDate?: Date, endDate?: Date) => {
          // Return different stats based on date range to simulate current vs previous period
          const isCurrentPeriod = endDate && endDate.getTime() > Date.now() - 31 * 24 * 60 * 60 * 1000;

          return isCurrentPeriod
            ? {
                totalOrders: 120,
                totalValue: 60000,
                averageOrderValue: 500,
                pendingOrders: 12,
                confirmedOrders: 96,
                deliveredOrders: 12,
                cancelledOrders: 0,
                overdueOrders: 0,
              }
            : {
                totalOrders: 100,
                totalValue: 50000,
                averageOrderValue: 500,
                pendingOrders: 10,
                confirmedOrders: 80,
                deliveredOrders: 10,
                cancelledOrders: 0,
                overdueOrders: 0,
              };
        }
      );

      const result = await handler.handle(queryWithGrowth);

      expect(result.growthComparison).toBeDefined();
      expect(result.growthComparison!.currentPeriod.totalSales).toBe(60000);
      expect(result.growthComparison!.previousPeriod.totalSales).toBe(50000);
      expect(result.growthComparison!.growth.salesGrowthRate).toBe(20);
      expect(result.growthComparison!.growth.orderGrowthRate).toBe(20);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(testUser);
    });

    it('should handle repository errors gracefully', async () => {
      mockOrderRepository.getOrderStatistics.mockRejectedValue(new Error('Database connection failed'));

      await expect(handler.handle(validQuery)).rejects.toThrow(SalesAnalyticsHandlerError);
      await expect(handler.handle(validQuery)).rejects.toThrow('Failed to process sales analytics');
    });

    it('should preserve original error in handler error', async () => {
      const originalError = new Error('Network timeout');
      mockOrderRepository.getOrderStatistics.mockRejectedValue(originalError);

      try {
        await handler.handle(validQuery);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(SalesAnalyticsHandlerError);
        expect((error as SalesAnalyticsHandlerError).cause).toBe(originalError);
      }
    });
  });

  describe('Factory Function', () => {
    it('should create handler instance with factory function', () => {
      const factoryHandler = createSalesSummaryHandler(
        mockUserRepository,
        mockOrderRepository,
        mockCustomerRepository,
        mockProductRepository
      );

      expect(factoryHandler).toBeInstanceOf(SalesSummaryHandler);
    });
  });

  describe('Complex Scenarios', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(testUser);
    });

    it('should handle query with all metrics enabled', async () => {
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

      const complexQuery = {
        ...validQuery,
        metrics: complexMetrics,
        topN: 5,
        includeComparisons: true,
        groupBy: 'week' as const,
      };

      // Setup comprehensive mocks
      mockOrderRepository.getOrderStatistics.mockResolvedValue({
        totalOrders: 200,
        totalValue: 100000,
        averageOrderValue: 500,
        pendingOrders: 20,
        confirmedOrders: 160,
        deliveredOrders: 20,
        cancelledOrders: 0,
        overdueOrders: 0,
      });

      mockOrderRepository.getCustomerOrderSummaries.mockResolvedValue([
        {
          customerId: 'cust-1',
          customerCode: 'CUST001',
          customerName: 'Customer 1',
          totalOrders: 20,
          totalValue: 10000,
          averageOrderValue: 500,
          lastOrderDate: new Date(),
          pendingOrdersCount: 2,
          overdueOrdersCount: 0,
        },
      ]);

      mockOrderRepository.getProductSalesSummaries.mockResolvedValue([
        {
          productId: 'prod-1',
          productCode: 'PROD001',
          productName: 'Product 1',
          totalQuantityOrdered: 200,
          totalQuantityDelivered: 180,
          totalSalesValue: 30000,
          orderCount: 60,
          averageOrderQuantity: 3.33,
        },
      ]);

      const result = await handler.handle(complexQuery);

      expect(result.summary).toBeDefined();
      expect(result.timeSeries).toBeDefined();
      expect(result.topProducts).toBeDefined();
      expect(result.topCustomers).toBeDefined();
      expect(result.paymentMethods).toBeDefined();
      expect(result.fulfillmentStatus).toBeDefined();
      expect(result.growthComparison).toBeDefined();
    });
  });
});
