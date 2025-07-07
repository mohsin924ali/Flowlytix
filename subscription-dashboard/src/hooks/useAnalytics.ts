/**
 * Analytics Hook
 * Manages analytics data and operations
 * Following Instructions file standards with comprehensive analytics management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnalyticsService } from '@/services/analytics';
import { AnalyticsData, SubscriptionAnalytics, DeviceAnalytics } from '@/types';

interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

interface AnalyticsState {
  // Dashboard data
  dashboardData: AnalyticsData | null;

  // Subscription analytics
  subscriptionAnalytics: SubscriptionAnalytics[];

  // Device analytics
  deviceAnalytics: DeviceAnalytics | null;

  // Revenue analytics
  revenueData: any[];

  // Other analytics
  churnData: any | null;
  retentionData: any[];
  geographicData: any[];
  tierPerformance: any[];
  featureUsage: any[];
  systemHealth: any | null;
  activationTrends: any[];
  topCustomers: any[];
  realTimeMetrics: any | null;
  usagePatterns: any[];
  forecasting: any[];

  // Loading states
  isLoadingDashboard: boolean;
  isLoadingSubscriptions: boolean;
  isLoadingDevices: boolean;
  isLoadingRevenue: boolean;
  isLoadingChurn: boolean;
  isLoadingRetention: boolean;
  isLoadingGeographic: boolean;
  isLoadingTiers: boolean;
  isLoadingFeatures: boolean;
  isLoadingHealth: boolean;
  isLoadingActivations: boolean;
  isLoadingCustomers: boolean;
  isLoadingRealTime: boolean;
  isLoadingPatterns: boolean;
  isLoadingForecasting: boolean;

  // Error states
  error: string | null;

  // Cache timestamps
  lastFetched: Record<string, Date>;
}

export interface UseAnalyticsReturn extends AnalyticsState {
  // Dashboard
  refreshDashboard: () => Promise<{ success: boolean; error?: string }>;

  // Subscription analytics
  fetchSubscriptionAnalytics: (
    startDate?: Date,
    endDate?: Date,
    groupBy?: 'day' | 'week' | 'month'
  ) => Promise<{ success: boolean; error?: string }>;

  // Device analytics
  fetchDeviceAnalytics: (startDate?: Date, endDate?: Date) => Promise<{ success: boolean; error?: string }>;

  // Revenue analytics
  fetchRevenueAnalytics: (
    startDate?: Date,
    endDate?: Date,
    groupBy?: 'day' | 'week' | 'month'
  ) => Promise<{ success: boolean; error?: string }>;

  // Churn analysis
  fetchChurnAnalysis: (startDate?: Date, endDate?: Date) => Promise<{ success: boolean; error?: string }>;

  // Retention analysis
  fetchRetentionAnalysis: (cohortType?: 'monthly' | 'weekly') => Promise<{ success: boolean; error?: string }>;

  // Geographic distribution
  fetchGeographicDistribution: () => Promise<{ success: boolean; error?: string }>;

  // Tier performance
  fetchTierPerformance: (startDate?: Date, endDate?: Date) => Promise<{ success: boolean; error?: string }>;

  // Feature usage
  fetchFeatureUsage: (
    subscriptionId?: string,
    startDate?: Date,
    endDate?: Date
  ) => Promise<{ success: boolean; error?: string }>;

  // System health
  fetchSystemHealth: () => Promise<{ success: boolean; error?: string }>;

  // Activation trends
  fetchActivationTrends: (
    startDate?: Date,
    endDate?: Date,
    groupBy?: 'day' | 'week' | 'month'
  ) => Promise<{ success: boolean; error?: string }>;

  // Top customers
  fetchTopCustomers: (
    limit?: number,
    metric?: 'devices' | 'revenue' | 'features'
  ) => Promise<{ success: boolean; error?: string }>;

  // Real-time metrics
  fetchRealTimeMetrics: () => Promise<{ success: boolean; error?: string }>;
  startRealTimeUpdates: (intervalMs?: number) => void;
  stopRealTimeUpdates: () => void;

  // Usage patterns
  fetchUsagePatterns: (
    timeframe?: 'hourly' | 'daily' | 'weekly',
    startDate?: Date,
    endDate?: Date
  ) => Promise<{ success: boolean; error?: string }>;

  // Forecasting
  fetchForecasting: (
    metric?: 'subscriptions' | 'revenue' | 'churn',
    periods?: number
  ) => Promise<{ success: boolean; error?: string }>;

  // Report generation
  generateReport: (
    reportType: 'subscriptions' | 'devices' | 'revenue' | 'churn',
    startDate: Date,
    endDate: Date,
    format?: 'pdf' | 'csv' | 'excel'
  ) => Promise<{ success: boolean; error?: string }>;

  // Utility functions
  refreshAll: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  isDataStale: (key: string, maxAgeMinutes?: number) => boolean;
}

/**
 * Custom hook for analytics management
 */
export const useAnalytics = (autoRefresh = false, refreshInterval = 300000): UseAnalyticsReturn => {
  const analyticsService = useRef(new AnalyticsService()).current;
  const realTimeInterval = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<AnalyticsState>({
    // Data
    dashboardData: null,
    subscriptionAnalytics: [],
    deviceAnalytics: null,
    revenueData: [],
    churnData: null,
    retentionData: [],
    geographicData: [],
    tierPerformance: [],
    featureUsage: [],
    systemHealth: null,
    activationTrends: [],
    topCustomers: [],
    realTimeMetrics: null,
    usagePatterns: [],
    forecasting: [],

    // Loading states
    isLoadingDashboard: false,
    isLoadingSubscriptions: false,
    isLoadingDevices: false,
    isLoadingRevenue: false,
    isLoadingChurn: false,
    isLoadingRetention: false,
    isLoadingGeographic: false,
    isLoadingTiers: false,
    isLoadingFeatures: false,
    isLoadingHealth: false,
    isLoadingActivations: false,
    isLoadingCustomers: false,
    isLoadingRealTime: false,
    isLoadingPatterns: false,
    isLoadingForecasting: false,

    // Error state
    error: null,

    // Cache
    lastFetched: {},
  });

  /**
   * Generic fetch wrapper with error handling and loading states
   */
  const fetchWithState = useCallback(
    async <T>(
      apiCall: () => Promise<any>,
      loadingKey: keyof AnalyticsState,
      dataKey: keyof AnalyticsState,
      cacheKey: string
    ): Promise<{ success: boolean; error?: string }> => {
      setState((prev) => ({ ...prev, [loadingKey]: true, error: null }));

      try {
        const response = await apiCall();

        if (response.success && response.data !== undefined) {
          setState((prev) => ({
            ...prev,
            [dataKey]: response.data,
            [loadingKey]: false,
            lastFetched: { ...prev.lastFetched, [cacheKey]: new Date() },
            error: null,
          }));

          return { success: true };
        } else {
          const errorMessage = response.error || `Failed to fetch ${cacheKey}`;
          setState((prev) => ({
            ...prev,
            [loadingKey]: false,
            error: errorMessage,
          }));
          return { success: false, error: errorMessage };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Failed to fetch ${cacheKey}`;
        setState((prev) => ({
          ...prev,
          [loadingKey]: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  /**
   * Refresh dashboard data
   */
  const refreshDashboard = useCallback(async () => {
    return fetchWithState(
      () => analyticsService.getDashboardAnalytics(),
      'isLoadingDashboard',
      'dashboardData',
      'dashboard'
    );
  }, [analyticsService, fetchWithState]);

  /**
   * Fetch subscription analytics
   */
  const fetchSubscriptionAnalytics = useCallback(
    async (startDate?: Date, endDate?: Date, groupBy: 'day' | 'week' | 'month' = 'day') => {
      return fetchWithState(
        () => analyticsService.getSubscriptionAnalytics(startDate, endDate, groupBy),
        'isLoadingSubscriptions',
        'subscriptionAnalytics',
        'subscriptions'
      );
    },
    [analyticsService, fetchWithState]
  );

  /**
   * Fetch device analytics
   */
  const fetchDeviceAnalytics = useCallback(
    async (startDate?: Date, endDate?: Date) => {
      return fetchWithState(
        () => analyticsService.getDeviceAnalytics(startDate, endDate),
        'isLoadingDevices',
        'deviceAnalytics',
        'devices'
      );
    },
    [analyticsService, fetchWithState]
  );

  /**
   * Fetch revenue analytics
   */
  const fetchRevenueAnalytics = useCallback(
    async (startDate?: Date, endDate?: Date, groupBy: 'day' | 'week' | 'month' = 'month') => {
      return fetchWithState(
        () => analyticsService.getRevenueAnalytics(startDate, endDate, groupBy),
        'isLoadingRevenue',
        'revenueData',
        'revenue'
      );
    },
    [analyticsService, fetchWithState]
  );

  /**
   * Fetch churn analysis
   */
  const fetchChurnAnalysis = useCallback(
    async (startDate?: Date, endDate?: Date) => {
      return fetchWithState(
        () => analyticsService.getChurnAnalysis(startDate, endDate),
        'isLoadingChurn',
        'churnData',
        'churn'
      );
    },
    [analyticsService, fetchWithState]
  );

  /**
   * Fetch retention analysis
   */
  const fetchRetentionAnalysis = useCallback(
    async (cohortType: 'monthly' | 'weekly' = 'monthly') => {
      return fetchWithState(
        () => analyticsService.getRetentionAnalysis(cohortType),
        'isLoadingRetention',
        'retentionData',
        'retention'
      );
    },
    [analyticsService, fetchWithState]
  );

  /**
   * Fetch geographic distribution
   */
  const fetchGeographicDistribution = useCallback(async () => {
    return fetchWithState(
      () => analyticsService.getGeographicDistribution(),
      'isLoadingGeographic',
      'geographicData',
      'geographic'
    );
  }, [analyticsService, fetchWithState]);

  /**
   * Fetch tier performance
   */
  const fetchTierPerformance = useCallback(
    async (startDate?: Date, endDate?: Date) => {
      return fetchWithState(
        () => analyticsService.getTierPerformance(startDate, endDate),
        'isLoadingTiers',
        'tierPerformance',
        'tiers'
      );
    },
    [analyticsService, fetchWithState]
  );

  /**
   * Fetch feature usage
   */
  const fetchFeatureUsage = useCallback(
    async (subscriptionId?: string, startDate?: Date, endDate?: Date) => {
      return fetchWithState(
        () => analyticsService.getFeatureUsage(subscriptionId, startDate, endDate),
        'isLoadingFeatures',
        'featureUsage',
        'features'
      );
    },
    [analyticsService, fetchWithState]
  );

  /**
   * Fetch system health
   */
  const fetchSystemHealth = useCallback(async () => {
    return fetchWithState(() => analyticsService.getSystemHealth(), 'isLoadingHealth', 'systemHealth', 'health');
  }, [analyticsService, fetchWithState]);

  /**
   * Fetch activation trends
   */
  const fetchActivationTrends = useCallback(
    async (startDate?: Date, endDate?: Date, groupBy: 'day' | 'week' | 'month' = 'day') => {
      return fetchWithState(
        () => analyticsService.getActivationTrends(startDate, endDate, groupBy),
        'isLoadingActivations',
        'activationTrends',
        'activations'
      );
    },
    [analyticsService, fetchWithState]
  );

  /**
   * Fetch top customers
   */
  const fetchTopCustomers = useCallback(
    async (limit = 10, metric: 'devices' | 'revenue' | 'features' = 'revenue') => {
      return fetchWithState(
        () => analyticsService.getTopCustomers(limit, metric),
        'isLoadingCustomers',
        'topCustomers',
        'customers'
      );
    },
    [analyticsService, fetchWithState]
  );

  /**
   * Fetch real-time metrics
   */
  const fetchRealTimeMetrics = useCallback(async () => {
    return fetchWithState(
      () => analyticsService.getRealTimeMetrics(),
      'isLoadingRealTime',
      'realTimeMetrics',
      'realtime'
    );
  }, [analyticsService, fetchWithState]);

  /**
   * Start real-time updates
   */
  const startRealTimeUpdates = useCallback(
    (intervalMs = 30000) => {
      stopRealTimeUpdates(); // Clear existing interval

      realTimeInterval.current = setInterval(() => {
        fetchRealTimeMetrics();
      }, intervalMs);

      // Fetch immediately
      fetchRealTimeMetrics();
    },
    [fetchRealTimeMetrics]
  );

  /**
   * Stop real-time updates
   */
  const stopRealTimeUpdates = useCallback(() => {
    if (realTimeInterval.current) {
      clearInterval(realTimeInterval.current);
      realTimeInterval.current = null;
    }
  }, []);

  /**
   * Fetch usage patterns
   */
  const fetchUsagePatterns = useCallback(
    async (timeframe: 'hourly' | 'daily' | 'weekly' = 'daily', startDate?: Date, endDate?: Date) => {
      return fetchWithState(
        () => analyticsService.getUsagePatterns(timeframe, startDate, endDate),
        'isLoadingPatterns',
        'usagePatterns',
        'patterns'
      );
    },
    [analyticsService, fetchWithState]
  );

  /**
   * Fetch forecasting data
   */
  const fetchForecasting = useCallback(
    async (metric: 'subscriptions' | 'revenue' | 'churn' = 'subscriptions', periods = 12) => {
      return fetchWithState(
        () => analyticsService.getForecasting(metric, periods),
        'isLoadingForecasting',
        'forecasting',
        'forecasting'
      );
    },
    [analyticsService, fetchWithState]
  );

  /**
   * Generate report
   */
  const generateReport = useCallback(
    async (
      reportType: 'subscriptions' | 'devices' | 'revenue' | 'churn',
      startDate: Date,
      endDate: Date,
      format: 'pdf' | 'csv' | 'excel' = 'pdf'
    ) => {
      try {
        await analyticsService.generateReport(reportType, startDate, endDate, format);
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
        return { success: false, error: errorMessage };
      }
    },
    [analyticsService]
  );

  /**
   * Refresh all analytics data
   */
  const refreshAll = useCallback(async () => {
    const promises = [
      refreshDashboard(),
      fetchSubscriptionAnalytics(),
      fetchDeviceAnalytics(),
      fetchRevenueAnalytics(),
      fetchSystemHealth(),
      fetchTopCustomers(),
    ];

    try {
      await Promise.all(promises);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh all data',
      };
    }
  }, [
    refreshDashboard,
    fetchSubscriptionAnalytics,
    fetchDeviceAnalytics,
    fetchRevenueAnalytics,
    fetchSystemHealth,
    fetchTopCustomers,
  ]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Check if data is stale
   */
  const isDataStale = useCallback(
    (key: string, maxAgeMinutes = 5): boolean => {
      const lastFetch = state.lastFetched[key];
      if (!lastFetch) return true;

      const now = new Date();
      const ageMinutes = (now.getTime() - lastFetch.getTime()) / (1000 * 60);
      return ageMinutes > maxAgeMinutes;
    },
    [state.lastFetched]
  );

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshInterval.current = setInterval(() => {
        refreshAll();
      }, refreshInterval);

      return () => {
        if (autoRefreshInterval.current) {
          clearInterval(autoRefreshInterval.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refreshAll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRealTimeUpdates();
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, [stopRealTimeUpdates]);

  // Initial data fetch
  useEffect(() => {
    refreshDashboard();
    fetchSystemHealth();
  }, [refreshDashboard, fetchSystemHealth]);

  return {
    ...state,
    refreshDashboard,
    fetchSubscriptionAnalytics,
    fetchDeviceAnalytics,
    fetchRevenueAnalytics,
    fetchChurnAnalysis,
    fetchRetentionAnalysis,
    fetchGeographicDistribution,
    fetchTierPerformance,
    fetchFeatureUsage,
    fetchSystemHealth,
    fetchActivationTrends,
    fetchTopCustomers,
    fetchRealTimeMetrics,
    startRealTimeUpdates,
    stopRealTimeUpdates,
    fetchUsagePatterns,
    fetchForecasting,
    generateReport,
    refreshAll,
    clearError,
    isDataStale,
  };
};
