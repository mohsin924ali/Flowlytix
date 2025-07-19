/**
 * Subscription Slice
 * Manages subscription state using Redux Toolkit
 * Following Instructions file standards with comprehensive subscription management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SubscriptionService } from '@/services/subscriptions';
import { Subscription, SubscriptionFilters, CreateSubscriptionForm, UpdateSubscriptionForm } from '@/types';

interface SubscriptionState {
  subscriptions: Subscription[];
  selectedSubscription: Subscription | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: SubscriptionFilters;
  isLoading: boolean;
  isFetching: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  hasMore: boolean;
}

const initialState: SubscriptionState = {
  subscriptions: [],
  selectedSubscription: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  filters: {},
  isLoading: false,
  isFetching: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  hasMore: false,
};

const subscriptionService = new SubscriptionService();

// Async thunks
export const fetchSubscriptions = createAsyncThunk(
  'subscriptions/fetchSubscriptions',
  async (
    { page = 1, reset = false, filters }: { page?: number; reset?: boolean; filters?: SubscriptionFilters },
    { rejectWithValue }
  ) => {
    try {
      const response = await subscriptionService.getSubscriptions(filters, page, 10);

      if (response.success && response.data) {
        return {
          data: response.data,
          page,
          reset,
        };
      } else {
        return rejectWithValue(response.error || 'Failed to fetch subscriptions');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch subscriptions');
    }
  }
);

export const fetchSubscription = createAsyncThunk(
  'subscriptions/fetchSubscription',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await subscriptionService.getSubscription(id);

      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Failed to fetch subscription');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch subscription');
    }
  }
);

export const createSubscription = createAsyncThunk(
  'subscriptions/createSubscription',
  async (data: CreateSubscriptionForm, { rejectWithValue }) => {
    try {
      const response = await subscriptionService.createSubscription(data);

      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Failed to create subscription');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create subscription');
    }
  }
);

export const updateSubscription = createAsyncThunk(
  'subscriptions/updateSubscription',
  async ({ id, data }: { id: string; data: UpdateSubscriptionForm }, { rejectWithValue }) => {
    try {
      const response = await subscriptionService.updateSubscription(id, data);

      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Failed to update subscription');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update subscription');
    }
  }
);

export const deleteSubscription = createAsyncThunk(
  'subscriptions/deleteSubscription',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await subscriptionService.deleteSubscription(id);

      if (response.success) {
        return id;
      } else {
        return rejectWithValue(response.error || 'Failed to delete subscription');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete subscription');
    }
  }
);

// Subscription slice
const subscriptionSlice = createSlice({
  name: 'subscriptions',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<SubscriptionFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.currentPage = 1;
    },

    clearFilters: (state) => {
      state.filters = {};
      state.currentPage = 1;
    },

    setSelectedSubscription: (state, action: PayloadAction<Subscription | null>) => {
      state.selectedSubscription = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
      state.currentPage = 1;
    },
  },
  extraReducers: (builder) => {
    // Fetch subscriptions
    builder
      .addCase(fetchSubscriptions.pending, (state, action) => {
        const { page = 1 } = action.meta.arg;
        if (page === 1) {
          state.isLoading = true;
        } else {
          state.isFetching = true;
        }
        state.error = null;
      })
      .addCase(fetchSubscriptions.fulfilled, (state, action) => {
        const { data, page, reset } = action.payload;

        state.isLoading = false;
        state.isFetching = false;

        if (page === 1 || reset) {
          state.subscriptions = data.data;
        } else {
          state.subscriptions.push(...data.data);
        }

        state.totalCount = data.totalCount;
        state.currentPage = page;
        state.hasMore = page < data.totalPages;
        state.error = null;
      })
      .addCase(fetchSubscriptions.rejected, (state, action) => {
        state.isLoading = false;
        state.isFetching = false;
        state.error = action.payload as string;
      });

    // Fetch single subscription
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedSubscription = action.payload;
        state.error = null;
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create subscription
    builder
      .addCase(createSubscription.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createSubscription.fulfilled, (state, action) => {
        state.isCreating = false;
        state.subscriptions.unshift(action.payload);
        state.totalCount += 1;
        state.error = null;
      })
      .addCase(createSubscription.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      });

    // Update subscription
    builder
      .addCase(updateSubscription.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateSubscription.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.subscriptions.findIndex((sub) => sub.id === action.payload.id);
        if (index !== -1) {
          state.subscriptions[index] = action.payload;
        }
        if (state.selectedSubscription?.id === action.payload.id) {
          state.selectedSubscription = action.payload;
        }
        state.error = null;
      })
      .addCase(updateSubscription.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });

    // Delete subscription
    builder
      .addCase(deleteSubscription.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteSubscription.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.subscriptions = state.subscriptions.filter((sub) => sub.id !== action.payload);
        if (state.selectedSubscription?.id === action.payload) {
          state.selectedSubscription = null;
        }
        state.totalCount -= 1;
        state.error = null;
      })
      .addCase(deleteSubscription.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const { setFilters, clearFilters, setSelectedSubscription, clearError, setPageSize } = subscriptionSlice.actions;

// Selectors
export const selectSubscriptions = (state: { subscriptions: SubscriptionState }) => state.subscriptions;
export const selectSubscriptionsList = (state: { subscriptions: SubscriptionState }) =>
  state.subscriptions.subscriptions;
export const selectSelectedSubscription = (state: { subscriptions: SubscriptionState }) =>
  state.subscriptions.selectedSubscription;
export const selectSubscriptionsLoading = (state: { subscriptions: SubscriptionState }) =>
  state.subscriptions.isLoading;
export const selectSubscriptionsError = (state: { subscriptions: SubscriptionState }) => state.subscriptions.error;
export const selectSubscriptionsFilters = (state: { subscriptions: SubscriptionState }) => state.subscriptions.filters;

// Export reducer
export default subscriptionSlice.reducer;
