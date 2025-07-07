/**
 * Analytics Service Unit Tests
 * Comprehensive testing for analytics API operations
 * Following Instructions file standards with 100% coverage
 */

import { analyticsService } from '@/services/analytics';
import { apiClient } from '@/services/api';
import { mockAnalytics } from '../../utils/mockData';

// Mock the API client
jest.mock('@/services/api', () => ({
  apiClient: {
    get: jest.fn(),
    downloadFile: jest.fn(),
  },
}));

const mockApi = apiClient as jest.Mocked<typeof apiClient>;

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardAnalytics', () => {
    test('calls API with correct endpoint', async () => {
      const mockResponse = {
        success: true,
        data: mockAnalytics.dashboard,
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await analyticsService.getDashboardAnalytics();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/dashboard');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAnalytics.dashboard);
    });

    test('handles API errors gracefully', async () => {
      const mockError = {
        success: false,
        error: 'Internal server error',
      };

      mockApi.get.mockResolvedValue(mockError);

      const result = await analyticsService.getDashboardAnalytics();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('getSubscriptionAnalytics', () => {
    test('calls API with default parameters', async () => {
      const mockResponse = {
        success: true,
        data: [mockAnalytics.subscriptions],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getSubscriptionAnalytics();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/subscriptions?group_by=day');
    });

    test('calls API with date range parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockResponse = {
        success: true,
        data: [mockAnalytics.subscriptions],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getSubscriptionAnalytics(startDate, endDate, 'month');

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/analytics/subscriptions?start_date=' +
            encodeURIComponent(startDate.toISOString()) +
            '&end_date=' +
            encodeURIComponent(endDate.toISOString()) +
            '&group_by=month'
        )
      );
    });

    test('handles groupBy parameter correctly', async () => {
      const mockResponse = {
        success: true,
        data: [mockAnalytics.subscriptions],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getSubscriptionAnalytics(undefined, undefined, 'week');

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/subscriptions?group_by=week');
    });
  });

  describe('getDeviceAnalytics', () => {
    test('calls API with correct endpoint', async () => {
      const mockResponse = {
        success: true,
        data: mockAnalytics.devices,
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getDeviceAnalytics();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/devices?');
    });

    test('calls API with date range parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockResponse = {
        success: true,
        data: mockAnalytics.devices,
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getDeviceAnalytics(startDate, endDate);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/analytics/devices?start_date=' +
            encodeURIComponent(startDate.toISOString()) +
            '&end_date=' +
            encodeURIComponent(endDate.toISOString())
        )
      );
    });
  });

  describe('getRevenueAnalytics', () => {
    test('calls API with default parameters', async () => {
      const mockResponse = {
        success: true,
        data: [{ period: '2024-01', revenue: 10000 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getRevenueAnalytics();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/revenue?group_by=month');
    });

    test('calls API with all parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockResponse = {
        success: true,
        data: [{ period: '2024-01', revenue: 10000 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getRevenueAnalytics(startDate, endDate, 'day');

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/analytics/revenue?start_date=' +
            encodeURIComponent(startDate.toISOString()) +
            '&end_date=' +
            encodeURIComponent(endDate.toISOString()) +
            '&group_by=day'
        )
      );
    });
  });

  describe('getChurnAnalysis', () => {
    test('calls API with correct endpoint', async () => {
      const mockResponse = {
        success: true,
        data: { churnRate: 0.05, totalCustomers: 1000 },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getChurnAnalysis();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/churn?');
    });

    test('calls API with date range parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockResponse = {
        success: true,
        data: { churnRate: 0.05, totalCustomers: 1000 },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getChurnAnalysis(startDate, endDate);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/analytics/churn?start_date=' +
            encodeURIComponent(startDate.toISOString()) +
            '&end_date=' +
            encodeURIComponent(endDate.toISOString())
        )
      );
    });
  });

  describe('getRetentionAnalysis', () => {
    test('calls API with default cohort type', async () => {
      const mockResponse = {
        success: true,
        data: [{ cohort: '2024-01', retention: 0.85 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getRetentionAnalysis();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/retention?cohort_type=monthly');
    });

    test('calls API with weekly cohort type', async () => {
      const mockResponse = {
        success: true,
        data: [{ cohort: '2024-W01', retention: 0.9 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getRetentionAnalysis('weekly');

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/retention?cohort_type=weekly');
    });
  });

  describe('getGeographicDistribution', () => {
    test('calls API with correct endpoint', async () => {
      const mockResponse = {
        success: true,
        data: [{ country: 'USA', count: 500 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getGeographicDistribution();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/geographic');
    });
  });

  describe('getTierPerformance', () => {
    test('calls API with correct endpoint', async () => {
      const mockResponse = {
        success: true,
        data: [{ tier: 'professional', revenue: 50000, count: 100 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getTierPerformance();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/tiers?');
    });

    test('calls API with date range parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockResponse = {
        success: true,
        data: [{ tier: 'professional', revenue: 50000, count: 100 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getTierPerformance(startDate, endDate);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/analytics/tiers?start_date=' +
            encodeURIComponent(startDate.toISOString()) +
            '&end_date=' +
            encodeURIComponent(endDate.toISOString())
        )
      );
    });
  });

  describe('getFeatureUsage', () => {
    test('calls API with correct endpoint', async () => {
      const mockResponse = {
        success: true,
        data: [{ feature: 'analytics', usageCount: 1000 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getFeatureUsage();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/features?');
    });

    test('calls API with all parameters', async () => {
      const subscriptionId = 'sub-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockResponse = {
        success: true,
        data: [{ feature: 'analytics', usageCount: 1000 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getFeatureUsage(subscriptionId, startDate, endDate);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/analytics/features?subscription_id=' +
            subscriptionId +
            '&start_date=' +
            encodeURIComponent(startDate.toISOString()) +
            '&end_date=' +
            encodeURIComponent(endDate.toISOString())
        )
      );
    });
  });

  describe('getSystemHealth', () => {
    test('calls API with correct endpoint', async () => {
      const mockResponse = {
        success: true,
        data: { status: 'healthy', uptime: '99.9%' },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getSystemHealth();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/system-health');
    });
  });

  describe('getActivationTrends', () => {
    test('calls API with default parameters', async () => {
      const mockResponse = {
        success: true,
        data: [{ period: '2024-01-01', activations: 50 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getActivationTrends();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/activations?group_by=day');
    });

    test('calls API with all parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockResponse = {
        success: true,
        data: [{ period: '2024-01', activations: 150 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getActivationTrends(startDate, endDate, 'month');

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/analytics/activations?start_date=' +
            encodeURIComponent(startDate.toISOString()) +
            '&end_date=' +
            encodeURIComponent(endDate.toISOString()) +
            '&group_by=month'
        )
      );
    });
  });

  describe('getTopCustomers', () => {
    test('calls API with default parameters', async () => {
      const mockResponse = {
        success: true,
        data: [{ customerId: 'cust-1', revenue: 10000 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getTopCustomers();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/top-customers?limit=10&metric=revenue');
    });

    test('calls API with custom parameters', async () => {
      const mockResponse = {
        success: true,
        data: [{ customerId: 'cust-1', devices: 25 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getTopCustomers(5, 'devices');

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/top-customers?limit=5&metric=devices');
    });
  });

  describe('generateReport', () => {
    test('calls downloadFile with correct parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockApi.downloadFile.mockResolvedValue(undefined);

      await analyticsService.generateReport('subscriptions', startDate, endDate, 'pdf');

      expect(mockApi.downloadFile).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/analytics/reports?report_type=subscriptions&start_date=' +
            encodeURIComponent(startDate.toISOString()) +
            '&end_date=' +
            encodeURIComponent(endDate.toISOString()) +
            '&format=pdf'
        ),
        expect.stringContaining('subscriptions_report_')
      );
    });

    test('calls downloadFile with CSV format', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockApi.downloadFile.mockResolvedValue(undefined);

      await analyticsService.generateReport('revenue', startDate, endDate, 'csv');

      expect(mockApi.downloadFile).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/analytics/reports?report_type=revenue&start_date=' +
            encodeURIComponent(startDate.toISOString()) +
            '&end_date=' +
            encodeURIComponent(endDate.toISOString()) +
            '&format=csv'
        ),
        expect.stringContaining('revenue_report_')
      );
    });
  });

  describe('getRealTimeMetrics', () => {
    test('calls API with correct endpoint', async () => {
      const mockResponse = {
        success: true,
        data: { activeUsers: 1500, serverLoad: 0.75 },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getRealTimeMetrics();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/realtime');
    });
  });

  describe('getUsagePatterns', () => {
    test('calls API with default parameters', async () => {
      const mockResponse = {
        success: true,
        data: [{ timeSlot: '2024-01-01', usage: 500 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getUsagePatterns();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/usage-patterns?timeframe=daily');
    });

    test('calls API with all parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockResponse = {
        success: true,
        data: [{ timeSlot: '2024-01-01-10', usage: 150 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getUsagePatterns('hourly', startDate, endDate);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/analytics/usage-patterns?timeframe=hourly&start_date=' +
            encodeURIComponent(startDate.toISOString()) +
            '&end_date=' +
            encodeURIComponent(endDate.toISOString())
        )
      );
    });
  });

  describe('getForecasting', () => {
    test('calls API with default parameters', async () => {
      const mockResponse = {
        success: true,
        data: [{ period: 'Q1 2025', forecast: 1200 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getForecasting('subscriptions');

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/forecast?metric=subscriptions&periods=12');
    });

    test('calls API with custom parameters', async () => {
      const mockResponse = {
        success: true,
        data: [{ period: 'Q1 2025', forecast: 250000 }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await analyticsService.getForecasting('revenue', 6);

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/analytics/forecast?metric=revenue&periods=6');
    });
  });
});
