/**
 * Analytics Service
 * Handles all analytics and reporting API operations
 * Following Instructions file standards with comprehensive analytics features
 */

import { apiClient } from './api';
import { AnalyticsData, SubscriptionAnalytics, DeviceAnalytics, ApiResponse, SubscriptionTier } from '@/types';

/**
 * Mock data for analytics endpoints that don't exist yet
 */
const mockSubscriptionAnalytics: SubscriptionAnalytics[] = [
  {
    period: 'Jan 2024',
    newSubscriptions: 25,
    renewedSubscriptions: 18,
    cancelledSubscriptions: 5,
    revenue: 12500,
    averageLifetime: 8.5,
    topTiers: [
      { tier: SubscriptionTier.PROFESSIONAL, count: 15, revenue: 7500, percentage: 60 },
      { tier: SubscriptionTier.BASIC, count: 8, revenue: 3200, percentage: 32 },
      { tier: SubscriptionTier.ENTERPRISE, count: 2, revenue: 1800, percentage: 8 },
    ],
  },
  {
    period: 'Feb 2024',
    newSubscriptions: 30,
    renewedSubscriptions: 22,
    cancelledSubscriptions: 3,
    revenue: 15800,
    averageLifetime: 9.2,
    topTiers: [
      { tier: SubscriptionTier.PROFESSIONAL, count: 20, revenue: 10000, percentage: 63 },
      { tier: SubscriptionTier.BASIC, count: 9, revenue: 3600, percentage: 29 },
      { tier: SubscriptionTier.ENTERPRISE, count: 3, revenue: 2200, percentage: 8 },
    ],
  },
  {
    period: 'Mar 2024',
    newSubscriptions: 35,
    renewedSubscriptions: 28,
    cancelledSubscriptions: 8,
    revenue: 19200,
    averageLifetime: 8.8,
    topTiers: [
      { tier: SubscriptionTier.PROFESSIONAL, count: 22, revenue: 11000, percentage: 59 },
      { tier: SubscriptionTier.BASIC, count: 11, revenue: 4400, percentage: 30 },
      { tier: SubscriptionTier.ENTERPRISE, count: 4, revenue: 3800, percentage: 11 },
    ],
  },
];

const mockDeviceAnalytics: DeviceAnalytics = {
  totalDevices: 1247,
  activeDevices: 1089,
  devicesByPlatform: [
    { platform: 'Windows', count: 589, percentage: 47.2 },
    { platform: 'macOS', count: 312, percentage: 25.0 },
    { platform: 'Linux', count: 203, percentage: 16.3 },
    { platform: 'iOS', count: 98, percentage: 7.9 },
    { platform: 'Android', count: 45, percentage: 3.6 },
  ],
  devicesByRegion: [
    { region: 'North America', count: 456, percentage: 36.6 },
    { region: 'Europe', count: 398, percentage: 31.9 },
    { region: 'Asia Pacific', count: 289, percentage: 23.2 },
    { region: 'Latin America', count: 67, percentage: 5.4 },
    { region: 'Middle East & Africa', count: 37, percentage: 2.9 },
  ],
  averageDevicesPerSubscription: 2.8,
};

const mockRevenueData = [
  { period: '2024-01', revenue: 45000, count: 150 },
  { period: '2024-02', revenue: 52000, count: 175 },
  { period: '2024-03', revenue: 58500, count: 195 },
  { period: '2024-04', revenue: 65000, count: 220 },
  { period: '2024-05', revenue: 72000, count: 245 },
  { period: '2024-06', revenue: 78000, count: 268 },
];

/**
 * Analytics Service Class
 * Provides methods for analytics and reporting
 */
class AnalyticsService {
  private readonly baseUrl = '/api/v1/analytics';

  /**
   * Get dashboard overview analytics
   */
  async getDashboardAnalytics(): Promise<ApiResponse<AnalyticsData>> {
    return apiClient.get<AnalyticsData>(`${this.baseUrl}/dashboard`);
  }

  /**
   * Get subscription analytics with date range
   * Note: Using mock data as backend endpoint doesn't exist yet
   */
  async getSubscriptionAnalytics(
    _startDate?: Date,
    _endDate?: Date,
    _groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<ApiResponse<SubscriptionAnalytics[]>> {
    // Return mock data to prevent 404 errors
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: mockSubscriptionAnalytics,
          message: 'Mock subscription analytics data',
        });
      }, 500); // Simulate network delay
    });
  }

  /**
   * Get device analytics
   * Note: Using mock data as backend endpoint doesn't exist yet
   */
  async getDeviceAnalytics(_startDate?: Date, _endDate?: Date): Promise<ApiResponse<DeviceAnalytics>> {
    // Return mock data to prevent 404 errors
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: mockDeviceAnalytics,
          message: 'Mock device analytics data',
        });
      }, 500); // Simulate network delay
    });
  }

  /**
   * Get revenue analytics
   * Note: Using mock data as backend endpoint doesn't exist yet
   */
  async getRevenueAnalytics(
    _startDate?: Date,
    _endDate?: Date,
    _groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<ApiResponse<any[]>> {
    // Return mock data to prevent 404 errors
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: mockRevenueData,
          message: 'Mock revenue analytics data',
        });
      }, 500); // Simulate network delay
    });
  }

  /**
   * Get churn analysis
   */
  async getChurnAnalysis(startDate?: Date, endDate?: Date): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();

    if (startDate) {
      params.append('start_date', startDate.toISOString());
    }
    if (endDate) {
      params.append('end_date', endDate.toISOString());
    }

    const url = `${this.baseUrl}/churn?${params.toString()}`;
    return apiClient.get<any>(url);
  }

  /**
   * Get retention analysis
   */
  async getRetentionAnalysis(cohortType: 'monthly' | 'weekly' = 'monthly'): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    params.append('cohort_type', cohortType);

    const url = `${this.baseUrl}/retention?${params.toString()}`;
    return apiClient.get<any[]>(url);
  }

  /**
   * Get geographic distribution
   */
  async getGeographicDistribution(): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`${this.baseUrl}/geographic`);
  }

  /**
   * Get subscription tier performance
   */
  async getTierPerformance(startDate?: Date, endDate?: Date): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();

    if (startDate) {
      params.append('start_date', startDate.toISOString());
    }
    if (endDate) {
      params.append('end_date', endDate.toISOString());
    }

    const url = `${this.baseUrl}/tiers?${params.toString()}`;
    return apiClient.get<any[]>(url);
  }

  /**
   * Get feature usage analytics
   */
  async getFeatureUsage(subscriptionId?: string, startDate?: Date, endDate?: Date): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();

    if (subscriptionId) {
      params.append('subscription_id', subscriptionId);
    }
    if (startDate) {
      params.append('start_date', startDate.toISOString());
    }
    if (endDate) {
      params.append('end_date', endDate.toISOString());
    }

    const url = `${this.baseUrl}/features?${params.toString()}`;
    return apiClient.get<any[]>(url);
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.baseUrl}/system-health`);
  }

  /**
   * Get license activation trends
   */
  async getActivationTrends(
    startDate?: Date,
    endDate?: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();

    if (startDate) {
      params.append('start_date', startDate.toISOString());
    }
    if (endDate) {
      params.append('end_date', endDate.toISOString());
    }
    params.append('group_by', groupBy);

    const url = `${this.baseUrl}/activations?${params.toString()}`;
    return apiClient.get<any[]>(url);
  }

  /**
   * Get top customers by usage
   */
  async getTopCustomers(
    limit: number = 10,
    metric: 'devices' | 'revenue' | 'features' = 'revenue'
  ): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('metric', metric);

    const url = `${this.baseUrl}/top-customers?${params.toString()}`;
    return apiClient.get<any[]>(url);
  }

  /**
   * Generate analytics report
   */
  async generateReport(
    reportType: 'subscriptions' | 'devices' | 'revenue' | 'churn',
    startDate: Date,
    endDate: Date,
    format: 'pdf' | 'csv' | 'excel' = 'pdf'
  ): Promise<void> {
    const params = new URLSearchParams();
    params.append('report_type', reportType);
    params.append('start_date', startDate.toISOString());
    params.append('end_date', endDate.toISOString());
    params.append('format', format);

    const url = `${this.baseUrl}/reports?${params.toString()}`;
    const filename = `${reportType}_report_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.${format}`;

    await apiClient.downloadFile(url, filename);
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.baseUrl}/realtime`);
  }

  /**
   * Get usage patterns
   */
  async getUsagePatterns(
    timeframe: 'hourly' | 'daily' | 'weekly' = 'daily',
    startDate?: Date,
    endDate?: Date
  ): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    params.append('timeframe', timeframe);

    if (startDate) {
      params.append('start_date', startDate.toISOString());
    }
    if (endDate) {
      params.append('end_date', endDate.toISOString());
    }

    const url = `${this.baseUrl}/usage-patterns?${params.toString()}`;
    return apiClient.get<any[]>(url);
  }

  /**
   * Get forecasting data
   */
  async getForecasting(
    metric: 'subscriptions' | 'revenue' | 'churn',
    periods: number = 12
  ): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    params.append('metric', metric);
    params.append('periods', periods.toString());

    const url = `${this.baseUrl}/forecast?${params.toString()}`;
    return apiClient.get<any[]>(url);
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Export class for testing
export { AnalyticsService };
export default analyticsService;
