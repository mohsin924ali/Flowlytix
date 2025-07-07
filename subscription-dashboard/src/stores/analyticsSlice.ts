/**
 * Analytics Slice
 * Manages analytics state using Redux Toolkit
 * Following Instructions file standards with comprehensive analytics management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AnalyticsState {
  dashboardData: any | null;
  subscriptionAnalytics: any[];
  deviceAnalytics: any | null;
  revenueData: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  dashboardData: null,
  subscriptionAnalytics: [],
  deviceAnalytics: null,
  revenueData: [],
  isLoading: false,
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setDashboardData: (state, action: PayloadAction<any>) => {
      state.dashboardData = action.payload;
    },

    setSubscriptionAnalytics: (state, action: PayloadAction<any[]>) => {
      state.subscriptionAnalytics = action.payload;
    },

    setDeviceAnalytics: (state, action: PayloadAction<any>) => {
      state.deviceAnalytics = action.payload;
    },

    setRevenueData: (state, action: PayloadAction<any[]>) => {
      state.revenueData = action.payload;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
});

// Export actions
export const {
  setDashboardData,
  setSubscriptionAnalytics,
  setDeviceAnalytics,
  setRevenueData,
  setLoading,
  setError,
  clearError,
} = analyticsSlice.actions;

// Selectors
export const selectAnalytics = (state: { analytics: AnalyticsState }) => state.analytics;
export const selectDashboardData = (state: { analytics: AnalyticsState }) => state.analytics.dashboardData;
export const selectAnalyticsLoading = (state: { analytics: AnalyticsState }) => state.analytics.isLoading;
export const selectAnalyticsError = (state: { analytics: AnalyticsState }) => state.analytics.error;

// Export reducer
export default analyticsSlice.reducer;
