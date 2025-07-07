/**
 * useAnalytics Hook Tests
 * Comprehensive testing for analytics hook
 * Following Instructions file standards with thorough coverage
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AnalyticsService } from '@/services/analytics';

// Mock the AnalyticsService
jest.mock('@/services/analytics', () => ({
  AnalyticsService: jest.fn().mockImplementation(() => ({
    getDashboardAnalytics: jest.fn(),
    getSubscriptionAnalytics: jest.fn(),
    getDeviceAnalytics: jest.fn(),
    getRevenueAnalytics: jest.fn(),
    getChurnAnalysis: jest.fn(),
    getRetentionAnalysis: jest.fn(),
    getGeographicDistribution: jest.fn(),
    getTierPerformance: jest.fn(),
    getFeatureUsage: jest.fn(),
    getSystemHealth: jest.fn(),
    getActivationTrends: jest.fn(),
    getTopCustomers: jest.fn(),
    getRealTimeMetrics: jest.fn(),
    getUsagePatterns: jest.fn(),
    getForecasting: jest.fn(),
    generateReport: jest.fn(),
  })),
}));

const mockAnalyticsService = {
  getDashboardAnalytics: jest.fn(),
  getSubscriptionAnalytics: jest.fn(),
  getDeviceAnalytics: jest.fn(),
  getRevenueAnalytics: jest.fn(),
  getChurnAnalysis: jest.fn(),
  getRetentionAnalytics: jest.fn(),
  getGeographicDistribution: jest.fn(),
  getTierPerformance: jest.fn(),
  getFeatureUsage: jest.fn(),
  getSystemHealth: jest.fn(),
  getActivationTrends: jest.fn(),
  getTopCustomers: jest.fn(),
  getRealTimeMetrics: jest.fn(),
  getUsagePatterns: jest.fn(),
  getForecasting: jest.fn(),
  generateReport: jest.fn(),
};

// Mock timers
jest.useFakeTimers();

describe('useAnalytics Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (AnalyticsService as jest.Mock).mockReturnValue(mockAnalyticsService);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAnalytics());

      expect(result.current.dashboardData).toBeNull();
      expect(result.current.subscriptionAnalytics).toEqual([]);
      expect(result.current.deviceAnalytics).toBeNull();
      expect(result.current.revenueData).toEqual([]);
      expect(result.current.isLoadingDashboard).toBe(false);
      expect(result.current.isLoadingSubscriptions).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastFetched).toEqual({});
    });
  });

  describe('Dashboard Analytics', () => {
    it('should fetch dashboard analytics successfully', async () => {
      const mockDashboardData = {
        totalSubscriptions: 100,
        activeSubscriptions: 85,
        revenue: 50000,
        growth: 15.5,
      };

      mockAnalyticsService.getDashboardAnalytics.mockResolvedValueOnce({
        success: true,
        data: mockDashboardData,
      });

      const { result } = renderHook(() => useAnalytics());

      let refreshResult: any;
      await act(async () => {
        refreshResult = await result.current.refreshDashboard();
      });

      expect(refreshResult.success).toBe(true);
      expect(result.current.dashboardData).toEqual(mockDashboardData);
      expect(result.current.isLoadingDashboard).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockAnalyticsService.getDashboardAnalytics).toHaveBeenCalledTimes(1);
    });

    it('should handle dashboard analytics error', async () => {
      mockAnalyticsService.getDashboardAnalytics.mockResolvedValueOnce({
        success: false,
        error: 'Failed to fetch dashboard data',
      });

      const { result } = renderHook(() => useAnalytics());

      let refreshResult: any;
      await act(async () => {
        refreshResult = await result.current.refreshDashboard();
      });

      expect(refreshResult.success).toBe(false);
      expect(refreshResult.error).toBe('Failed to fetch dashboard data');
      expect(result.current.error).toBe('Failed to fetch dashboard data');
      expect(result.current.isLoadingDashboard).toBe(false);
    });
  });

  describe('Subscription Analytics', () => {
    it('should fetch subscription analytics with default parameters', async () => {
      const mockAnalyticsData = [
        { date: '2024-01-01', count: 10, revenue: 1000 },
        { date: '2024-01-02', count: 15, revenue: 1500 },
      ];

      mockAnalyticsService.getSubscriptionAnalytics.mockResolvedValueOnce({
        success: true,
        data: mockAnalyticsData,
      });

      const { result } = renderHook(() => useAnalytics());

      let fetchResult: any;
      await act(async () => {
        fetchResult = await result.current.fetchSubscriptionAnalytics();
      });

      expect(fetchResult.success).toBe(true);
      expect(result.current.subscriptionAnalytics).toEqual(mockAnalyticsData);
      expect(mockAnalyticsService.getSubscriptionAnalytics).toHaveBeenCalledWith(undefined, undefined, 'day');
    });

    it('should fetch subscription analytics with custom parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockAnalyticsService.getSubscriptionAnalytics.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useAnalytics());

      await act(async () => {
        await result.current.fetchSubscriptionAnalytics(startDate, endDate, 'week');
      });

      expect(mockAnalyticsService.getSubscriptionAnalytics).toHaveBeenCalledWith(startDate, endDate, 'week');
    });
  });

  describe('Device Analytics', () => {
    it('should fetch device analytics successfully', async () => {
      const mockDeviceData = {
        totalDevices: 250,
        activeDevices: 200,
        deviceTypes: { mobile: 150, desktop: 100 },
      };

      mockAnalyticsService.getDeviceAnalytics.mockResolvedValueOnce({
        success: true,
        data: mockDeviceData,
      });

      const { result } = renderHook(() => useAnalytics());

      let fetchResult: any;
      await act(async () => {
        fetchResult = await result.current.fetchDeviceAnalytics();
      });

      expect(fetchResult.success).toBe(true);
      expect(result.current.deviceAnalytics).toEqual(mockDeviceData);
      expect(result.current.isLoadingDevices).toBe(false);
    });
  });

  describe('Revenue Analytics', () => {
    it('should fetch revenue analytics with monthly grouping', async () => {
      const mockRevenueData = [
        { period: '2024-01', revenue: 10000, subscriptions: 50 },
        { period: '2024-02', revenue: 12000, subscriptions: 60 },
      ];

      mockAnalyticsService.getRevenueAnalytics.mockResolvedValueOnce({
        success: true,
        data: mockRevenueData,
      });

      const { result } = renderHook(() => useAnalytics());

      await act(async () => {
        await result.current.fetchRevenueAnalytics(undefined, undefined, 'month');
      });

      expect(result.current.revenueData).toEqual(mockRevenueData);
      expect(mockAnalyticsService.getRevenueAnalytics).toHaveBeenCalledWith(undefined, undefined, 'month');
    });
  });

  describe('Real-time Metrics', () => {
    it('should fetch real-time metrics', async () => {
      const mockRealTimeData = {
        activeUsers: 45,
        currentSessions: 32,
        serverLoad: 0.65,
        timestamp: new Date().toISOString(),
      };

      mockAnalyticsService.getRealTimeMetrics.mockResolvedValueOnce({
        success: true,
        data: mockRealTimeData,
      });

      const { result } = renderHook(() => useAnalytics());

      let fetchResult: any;
      await act(async () => {
        fetchResult = await result.current.fetchRealTimeMetrics();
      });

      expect(fetchResult.success).toBe(true);
      expect(result.current.realTimeMetrics).toEqual(mockRealTimeData);
    });

    it('should start real-time updates', async () => {
      mockAnalyticsService.getRealTimeMetrics.mockResolvedValue({
        success: true,
        data: { activeUsers: 45 },
      });

      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.startRealTimeUpdates(1000); // 1 second for testing
      });

      // Initial call
      await waitFor(() => {
        expect(mockAnalyticsService.getRealTimeMetrics).toHaveBeenCalledTimes(1);
      });

      // Advance timer and check for another call
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockAnalyticsService.getRealTimeMetrics).toHaveBeenCalledTimes(2);
      });
    });

    it('should stop real-time updates', async () => {
      mockAnalyticsService.getRealTimeMetrics.mockResolvedValue({
        success: true,
        data: { activeUsers: 45 },
      });

      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.startRealTimeUpdates(1000);
      });

      act(() => {
        result.current.stopRealTimeUpdates();
      });

      // Advance timer - should not trigger new calls
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockAnalyticsService.getRealTimeMetrics).toHaveBeenCalledTimes(1); // Only initial call
      });
    });
  });

  describe('Auto-refresh', () => {
    it('should auto-refresh when enabled', async () => {
      mockAnalyticsService.getDashboardAnalytics.mockResolvedValue({
        success: true,
        data: { totalSubscriptions: 100 },
      });
      mockAnalyticsService.getSystemHealth.mockResolvedValue({
        success: true,
        data: { status: 'healthy' },
      });

      const { result } = renderHook(() => useAnalytics(true, 1000)); // 1 second for testing

      // Wait for initial load
      await waitFor(() => {
        expect(mockAnalyticsService.getDashboardAnalytics).toHaveBeenCalled();
      });

      const initialCalls = mockAnalyticsService.getDashboardAnalytics.mock.calls.length;

      // Advance timer to trigger auto-refresh
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockAnalyticsService.getDashboardAnalytics.mock.calls.length).toBeGreaterThan(initialCalls);
      });
    });
  });

  describe('System Health', () => {
    it('should fetch system health', async () => {
      const mockHealthData = {
        status: 'healthy',
        uptime: '99.9%',
        responseTime: 120,
        memory: { used: 512, total: 1024 },
      };

      mockAnalyticsService.getSystemHealth.mockResolvedValueOnce({
        success: true,
        data: mockHealthData,
      });

      const { result } = renderHook(() => useAnalytics());

      let fetchResult: any;
      await act(async () => {
        fetchResult = await result.current.fetchSystemHealth();
      });

      expect(fetchResult.success).toBe(true);
      expect(result.current.systemHealth).toEqual(mockHealthData);
    });
  });

  describe('Feature Usage', () => {
    it('should fetch feature usage for specific subscription', async () => {
      const mockFeatureData = [
        { feature: 'export', usage: 45, limit: 100 },
        { feature: 'api_calls', usage: 850, limit: 1000 },
      ];

      mockAnalyticsService.getFeatureUsage.mockResolvedValueOnce({
        success: true,
        data: mockFeatureData,
      });

      const { result } = renderHook(() => useAnalytics());

      let fetchResult: any;
      await act(async () => {
        fetchResult = await result.current.fetchFeatureUsage('sub-123');
      });

      expect(fetchResult.success).toBe(true);
      expect(result.current.featureUsage).toEqual(mockFeatureData);
      expect(mockAnalyticsService.getFeatureUsage).toHaveBeenCalledWith('sub-123', undefined, undefined);
    });
  });

  describe('Report Generation', () => {
    it('should generate report successfully', async () => {
      mockAnalyticsService.generateReport.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAnalytics());

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      let generateResult: any;
      await act(async () => {
        generateResult = await result.current.generateReport('subscriptions', startDate, endDate, 'pdf');
      });

      expect(generateResult.success).toBe(true);
      expect(mockAnalyticsService.generateReport).toHaveBeenCalledWith('subscriptions', startDate, endDate, 'pdf');
    });

    it('should handle report generation error', async () => {
      mockAnalyticsService.generateReport.mockRejectedValueOnce(new Error('Report generation failed'));

      const { result } = renderHook(() => useAnalytics());

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      let generateResult: any;
      await act(async () => {
        generateResult = await result.current.generateReport('revenue', startDate, endDate);
      });

      expect(generateResult.success).toBe(false);
      expect(generateResult.error).toBe('Report generation failed');
    });
  });

  describe('Data Staleness Check', () => {
    it('should identify stale data', () => {
      const { result } = renderHook(() => useAnalytics());

      // Data is stale if not fetched yet
      expect(result.current.isDataStale('dashboard')).toBe(true);

      // Mock recent fetch
      act(() => {
        result.current.refreshDashboard();
      });

      // Should not be stale immediately after fetch
      expect(result.current.isDataStale('dashboard', 1)).toBe(false);
    });
  });

  describe('Refresh All', () => {
    it('should refresh all analytics data', async () => {
      // Mock all service calls
      mockAnalyticsService.getDashboardAnalytics.mockResolvedValue({
        success: true,
        data: {},
      });
      mockAnalyticsService.getSubscriptionAnalytics.mockResolvedValue({
        success: true,
        data: [],
      });
      mockAnalyticsService.getDeviceAnalytics.mockResolvedValue({
        success: true,
        data: {},
      });
      mockAnalyticsService.getRevenueAnalytics.mockResolvedValue({
        success: true,
        data: [],
      });
      mockAnalyticsService.getSystemHealth.mockResolvedValue({
        success: true,
        data: {},
      });
      mockAnalyticsService.getTopCustomers.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useAnalytics());

      let refreshResult: any;
      await act(async () => {
        refreshResult = await result.current.refreshAll();
      });

      expect(refreshResult.success).toBe(true);
      expect(mockAnalyticsService.getDashboardAnalytics).toHaveBeenCalled();
      expect(mockAnalyticsService.getSubscriptionAnalytics).toHaveBeenCalled();
      expect(mockAnalyticsService.getDeviceAnalytics).toHaveBeenCalled();
      expect(mockAnalyticsService.getRevenueAnalytics).toHaveBeenCalled();
      expect(mockAnalyticsService.getSystemHealth).toHaveBeenCalled();
      expect(mockAnalyticsService.getTopCustomers).toHaveBeenCalled();
    });
  });

  describe('Error Clearing', () => {
    it('should clear errors', () => {
      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup intervals on unmount', () => {
      const { result, unmount } = renderHook(() => useAnalytics());

      act(() => {
        result.current.startRealTimeUpdates();
      });

      // Verify interval was created (indirectly by checking service calls)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      unmount();

      // After unmount, advancing timers should not trigger new calls
      const callsBeforeUnmount = mockAnalyticsService.getRealTimeMetrics.mock.calls.length;

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockAnalyticsService.getRealTimeMetrics.mock.calls.length).toBe(callsBeforeUnmount);
    });
  });
});
