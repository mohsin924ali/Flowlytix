/**
 * Subscriptions Hook
 * Manages subscription data and operations
 * Following Instructions file standards with comprehensive subscription management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SubscriptionService } from '@/services/subscriptions';
import {
  Subscription,
  SubscriptionFilters,
  PaginatedResponse,
  CreateSubscriptionForm,
  UpdateSubscriptionForm,
} from '@/types';

interface SubscriptionsState {
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

export interface UseSubscriptionsReturn extends SubscriptionsState {
  // Data fetching
  fetchSubscriptions: (page?: number, reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;

  // CRUD operations
  getSubscription: (id: string) => Promise<{ success: boolean; data?: Subscription; error?: string }>;
  createSubscription: (
    data: CreateSubscriptionForm
  ) => Promise<{ success: boolean; data?: Subscription; error?: string }>;
  updateSubscription: (
    id: string,
    data: UpdateSubscriptionForm
  ) => Promise<{ success: boolean; data?: Subscription; error?: string }>;
  deleteSubscription: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Subscription actions
  suspendSubscription: (
    id: string,
    reason?: string
  ) => Promise<{ success: boolean; data?: Subscription; error?: string }>;
  resumeSubscription: (id: string) => Promise<{ success: boolean; data?: Subscription; error?: string }>;
  cancelSubscription: (
    id: string,
    reason?: string
  ) => Promise<{ success: boolean; data?: Subscription; error?: string }>;
  renewSubscription: (
    id: string,
    expiresAt: Date
  ) => Promise<{ success: boolean; data?: Subscription; error?: string }>;

  // Device management
  getSubscriptionDevices: (id: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  revokeDeviceAccess: (subscriptionId: string, deviceId: string) => Promise<{ success: boolean; error?: string }>;

  // License operations
  validateLicenseKey: (
    licenseKey: string
  ) => Promise<{ success: boolean; data?: { valid: boolean; message: string }; error?: string }>;
  generateLicenseKey: (
    subscriptionId: string
  ) => Promise<{ success: boolean; data?: { licenseKey: string }; error?: string }>;

  // Bulk operations
  bulkUpdateSubscriptions: (
    subscriptionIds: string[],
    updates: Partial<UpdateSubscriptionForm>
  ) => Promise<{ success: boolean; data?: { updated: number; failed: number }; error?: string }>;

  // Filters and selection
  setFilters: (filters: Partial<SubscriptionFilters>) => void;
  clearFilters: () => void;
  setSelectedSubscription: (subscription: Subscription | null) => void;

  // Export
  exportSubscriptions: () => Promise<{ success: boolean; error?: string }>;

  // Utility
  clearError: () => void;
}

/**
 * Custom hook for subscription management
 */
export const useSubscriptions = (initialFilters?: SubscriptionFilters): UseSubscriptionsReturn => {
  const subscriptionService = useRef(new SubscriptionService()).current;

  const [state, setState] = useState<SubscriptionsState>({
    subscriptions: [],
    selectedSubscription: null,
    totalCount: 0,
    currentPage: 1,
    pageSize: 10,
    filters: initialFilters || {},
    isLoading: false,
    isFetching: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    error: null,
    hasMore: false,
  });

  /**
   * Fetch subscriptions with pagination and filters
   */
  const fetchSubscriptions = useCallback(
    async (page = 1, reset = false) => {
      const loadingState = page === 1 ? 'isLoading' : 'isFetching';
      setState((prev) => ({
        ...prev,
        [loadingState]: true,
        error: null,
        ...(reset && { subscriptions: [], currentPage: 1 }),
      }));

      try {
        const response = await subscriptionService.getSubscriptions(state.filters, page, state.pageSize);

        if (response.success && response.data) {
          const newSubscriptions =
            page === 1 || reset ? response.data.items : [...state.subscriptions, ...response.data.items];

          setState((prev) => ({
            ...prev,
            subscriptions: newSubscriptions,
            totalCount: response.data.total,
            currentPage: page,
            hasMore: response.data.has_more,
            [loadingState]: false,
            error: null,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            [loadingState]: false,
            error: response.error || 'Failed to fetch subscriptions',
          }));
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          [loadingState]: false,
          error: error instanceof Error ? error.message : 'Failed to fetch subscriptions',
        }));
      }
    },
    [subscriptionService, state.filters, state.pageSize, state.subscriptions]
  );

  /**
   * Load more subscriptions (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.isFetching) return;
    await fetchSubscriptions(state.currentPage + 1);
  }, [fetchSubscriptions, state.hasMore, state.isFetching, state.currentPage]);

  /**
   * Refetch current data
   */
  const refetch = useCallback(async () => {
    await fetchSubscriptions(1, true);
  }, [fetchSubscriptions]);

  /**
   * Get single subscription by ID
   */
  const getSubscription = useCallback(
    async (id: string) => {
      try {
        const response = await subscriptionService.getSubscription(id);

        if (response.success && response.data) {
          return { success: true, data: response.data };
        } else {
          return { success: false, error: response.error || 'Failed to fetch subscription' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch subscription',
        };
      }
    },
    [subscriptionService]
  );

  /**
   * Create new subscription
   */
  const createSubscription = useCallback(
    async (data: CreateSubscriptionForm) => {
      setState((prev) => ({ ...prev, isCreating: true, error: null }));

      try {
        const response = await subscriptionService.createSubscription(data);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            subscriptions: [response.data!, ...prev.subscriptions],
            totalCount: prev.totalCount + 1,
            isCreating: false,
            error: null,
          }));

          return { success: true, data: response.data };
        } else {
          setState((prev) => ({
            ...prev,
            isCreating: false,
            error: response.error || 'Failed to create subscription',
          }));
          return { success: false, error: response.error || 'Failed to create subscription' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create subscription';
        setState((prev) => ({
          ...prev,
          isCreating: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [subscriptionService]
  );

  /**
   * Update existing subscription
   */
  const updateSubscription = useCallback(
    async (id: string, data: UpdateSubscriptionForm) => {
      setState((prev) => ({ ...prev, isUpdating: true, error: null }));

      try {
        const response = await subscriptionService.updateSubscription(id, data);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            subscriptions: prev.subscriptions.map((sub) => (sub.id === id ? response.data! : sub)),
            selectedSubscription: prev.selectedSubscription?.id === id ? response.data! : prev.selectedSubscription,
            isUpdating: false,
            error: null,
          }));

          return { success: true, data: response.data };
        } else {
          setState((prev) => ({
            ...prev,
            isUpdating: false,
            error: response.error || 'Failed to update subscription',
          }));
          return { success: false, error: response.error || 'Failed to update subscription' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update subscription';
        setState((prev) => ({
          ...prev,
          isUpdating: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [subscriptionService]
  );

  /**
   * Delete subscription
   */
  const deleteSubscription = useCallback(
    async (id: string) => {
      setState((prev) => ({ ...prev, isDeleting: true, error: null }));

      try {
        const response = await subscriptionService.deleteSubscription(id);

        if (response.success) {
          setState((prev) => ({
            ...prev,
            subscriptions: prev.subscriptions.filter((sub) => sub.id !== id),
            selectedSubscription: prev.selectedSubscription?.id === id ? null : prev.selectedSubscription,
            totalCount: prev.totalCount - 1,
            isDeleting: false,
            error: null,
          }));

          return { success: true };
        } else {
          setState((prev) => ({
            ...prev,
            isDeleting: false,
            error: response.error || 'Failed to delete subscription',
          }));
          return { success: false, error: response.error || 'Failed to delete subscription' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete subscription';
        setState((prev) => ({
          ...prev,
          isDeleting: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [subscriptionService]
  );

  /**
   * Suspend subscription
   */
  const suspendSubscription = useCallback(
    async (id: string, reason?: string) => {
      try {
        const response = await subscriptionService.suspendSubscription(id, reason);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            subscriptions: prev.subscriptions.map((sub) => (sub.id === id ? response.data! : sub)),
            selectedSubscription: prev.selectedSubscription?.id === id ? response.data! : prev.selectedSubscription,
          }));

          return { success: true, data: response.data };
        } else {
          return { success: false, error: response.error || 'Failed to suspend subscription' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to suspend subscription',
        };
      }
    },
    [subscriptionService]
  );

  /**
   * Resume subscription
   */
  const resumeSubscription = useCallback(
    async (id: string) => {
      try {
        const response = await subscriptionService.resumeSubscription(id);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            subscriptions: prev.subscriptions.map((sub) => (sub.id === id ? response.data! : sub)),
            selectedSubscription: prev.selectedSubscription?.id === id ? response.data! : prev.selectedSubscription,
          }));

          return { success: true, data: response.data };
        } else {
          return { success: false, error: response.error || 'Failed to resume subscription' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to resume subscription',
        };
      }
    },
    [subscriptionService]
  );

  /**
   * Cancel subscription
   */
  const cancelSubscription = useCallback(
    async (id: string, reason?: string) => {
      try {
        const response = await subscriptionService.cancelSubscription(id, reason);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            subscriptions: prev.subscriptions.map((sub) => (sub.id === id ? response.data! : sub)),
            selectedSubscription: prev.selectedSubscription?.id === id ? response.data! : prev.selectedSubscription,
          }));

          return { success: true, data: response.data };
        } else {
          return { success: false, error: response.error || 'Failed to cancel subscription' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to cancel subscription',
        };
      }
    },
    [subscriptionService]
  );

  /**
   * Renew subscription
   */
  const renewSubscription = useCallback(
    async (id: string, expiresAt: Date) => {
      try {
        const response = await subscriptionService.renewSubscription(id, expiresAt);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            subscriptions: prev.subscriptions.map((sub) => (sub.id === id ? response.data! : sub)),
            selectedSubscription: prev.selectedSubscription?.id === id ? response.data! : prev.selectedSubscription,
          }));

          return { success: true, data: response.data };
        } else {
          return { success: false, error: response.error || 'Failed to renew subscription' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to renew subscription',
        };
      }
    },
    [subscriptionService]
  );

  /**
   * Get subscription devices
   */
  const getSubscriptionDevices = useCallback(
    async (id: string) => {
      try {
        const response = await subscriptionService.getSubscriptionDevices(id);

        if (response.success && response.data) {
          return { success: true, data: response.data };
        } else {
          return { success: false, error: response.error || 'Failed to fetch devices' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch devices',
        };
      }
    },
    [subscriptionService]
  );

  /**
   * Revoke device access
   */
  const revokeDeviceAccess = useCallback(
    async (subscriptionId: string, deviceId: string) => {
      try {
        const response = await subscriptionService.revokeDeviceAccess(subscriptionId, deviceId);

        if (response.success) {
          return { success: true };
        } else {
          return { success: false, error: response.error || 'Failed to revoke device access' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to revoke device access',
        };
      }
    },
    [subscriptionService]
  );

  /**
   * Validate license key
   */
  const validateLicenseKey = useCallback(
    async (licenseKey: string) => {
      try {
        const response = await subscriptionService.validateLicenseKey(licenseKey);

        if (response.success && response.data) {
          return { success: true, data: response.data };
        } else {
          return { success: false, error: response.error || 'Failed to validate license key' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to validate license key',
        };
      }
    },
    [subscriptionService]
  );

  /**
   * Generate license key
   */
  const generateLicenseKey = useCallback(
    async (subscriptionId: string) => {
      try {
        const response = await subscriptionService.generateLicenseKey(subscriptionId);

        if (response.success && response.data) {
          return { success: true, data: response.data };
        } else {
          return { success: false, error: response.error || 'Failed to generate license key' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate license key',
        };
      }
    },
    [subscriptionService]
  );

  /**
   * Bulk update subscriptions
   */
  const bulkUpdateSubscriptions = useCallback(
    async (subscriptionIds: string[], updates: Partial<UpdateSubscriptionForm>) => {
      try {
        const response = await subscriptionService.bulkUpdateSubscriptions(subscriptionIds, updates);

        if (response.success && response.data) {
          // Refetch data to get updated subscriptions
          await refetch();
          return { success: true, data: response.data };
        } else {
          return { success: false, error: response.error || 'Failed to bulk update subscriptions' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to bulk update subscriptions',
        };
      }
    },
    [subscriptionService, refetch]
  );

  /**
   * Set filters and refetch data
   */
  const setFilters = useCallback((newFilters: Partial<SubscriptionFilters>) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      currentPage: 1,
    }));
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: {},
      currentPage: 1,
    }));
  }, []);

  /**
   * Set selected subscription
   */
  const setSelectedSubscription = useCallback((subscription: Subscription | null) => {
    setState((prev) => ({
      ...prev,
      selectedSubscription: subscription,
    }));
  }, []);

  /**
   * Export subscriptions
   */
  const exportSubscriptions = useCallback(async () => {
    try {
      await subscriptionService.exportSubscriptions(state.filters);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export subscriptions',
      };
    }
  }, [subscriptionService, state.filters]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Auto-fetch when filters change
  useEffect(() => {
    fetchSubscriptions(1, true);
  }, [state.filters]); // Only watch filters, not the function

  return {
    ...state,
    fetchSubscriptions,
    loadMore,
    refetch,
    getSubscription,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    suspendSubscription,
    resumeSubscription,
    cancelSubscription,
    renewSubscription,
    getSubscriptionDevices,
    revokeDeviceAccess,
    validateLicenseKey,
    generateLicenseKey,
    bulkUpdateSubscriptions,
    setFilters,
    clearFilters,
    setSelectedSubscription,
    exportSubscriptions,
    clearError,
  };
};
