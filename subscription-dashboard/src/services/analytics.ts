/**
 * Analytics Service
 * Handles all analytics and reporting API operations
 * Following Instructions file standards with comprehensive analytics features
 */

import { apiClient } from './api';
import { AnalyticsData, SubscriptionAnalytics, DeviceAnalytics, ApiResponse } from '@/types';

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
   */
  async getSubscriptionAnalytics(
    startDate?: Date,
    endDate?: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<ApiResponse<SubscriptionAnalytics[]>> {
    const params = new URLSearchParams();

    if (startDate) {
      params.append('start_date', startDate.toISOString());
    }
    if (endDate) {
      params.append('end_date', endDate.toISOString());
    }
    params.append('group_by', groupBy);

    const url = `${this.baseUrl}/subscriptions?${params.toString()}`;
    return apiClient.get<SubscriptionAnalytics[]>(url);
  }

  /**
   * Get device analytics
   */
  async getDeviceAnalytics(startDate?: Date, endDate?: Date): Promise<ApiResponse<DeviceAnalytics>> {
    const params = new URLSearchParams();

    if (startDate) {
      params.append('start_date', startDate.toISOString());
    }
    if (endDate) {
      params.append('end_date', endDate.toISOString());
    }

    const url = `${this.baseUrl}/devices?${params.toString()}`;
    return apiClient.get<DeviceAnalytics>(url);
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(
    startDate?: Date,
    endDate?: Date,
    groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();

    if (startDate) {
      params.append('start_date', startDate.toISOString());
    }
    if (endDate) {
      params.append('end_date', endDate.toISOString());
    }
    params.append('group_by', groupBy);

    const url = `${this.baseUrl}/revenue?${params.toString()}`;
    return apiClient.get<any[]>(url);
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
