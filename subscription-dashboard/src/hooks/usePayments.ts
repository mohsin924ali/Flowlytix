/**
 * Payments Hook
 * Manages payment data and operations
 * Following Instructions file standards with comprehensive payment management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PaymentService } from '@/services/payments';
import {
  Payment,
  PaymentFilters,
  PaginatedResponse,
  CreatePaymentForm,
  UpdatePaymentForm,
  PaymentStatus,
  PaymentMethod,
  PaymentAnalytics,
  PaymentStats,
} from '@/types';

interface PaymentsState {
  payments: Payment[];
  selectedPayment: Payment | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: PaymentFilters;
  analytics: PaymentAnalytics | null;
  stats: PaymentStats | null;
  isLoading: boolean;
  isFetching: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isProcessing: boolean;
  error: string | null;
  hasMore: boolean;
}

export interface UsePaymentsReturn extends PaymentsState {
  // Data fetching
  fetchPayments: (page?: number, reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;

  // CRUD operations
  getPayment: (id: string) => Promise<{ success: boolean; data?: Payment; error?: string }>;
  createPayment: (data: CreatePaymentForm) => Promise<{ success: boolean; data?: Payment; error?: string }>;
  updatePayment: (id: string, data: UpdatePaymentForm) => Promise<{ success: boolean; data?: Payment; error?: string }>;
  deletePayment: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Payment operations
  processPayment: (id: string, notes?: string) => Promise<{ success: boolean; data?: Payment; error?: string }>;
  failPayment: (id: string, reason: string) => Promise<{ success: boolean; data?: Payment; error?: string }>;
  refundPayment: (
    id: string,
    amount?: number,
    reason?: string
  ) => Promise<{ success: boolean; data?: Payment; error?: string }>;

  // Bulk operations
  bulkUpdatePayments: (
    paymentIds: string[],
    updates: Partial<UpdatePaymentForm>
  ) => Promise<{ success: boolean; data?: { updated: number; failed: number }; error?: string }>;
  bulkProcessPayments: (
    paymentIds: string[]
  ) => Promise<{ success: boolean; data?: { processed: number; failed: number }; error?: string }>;

  // Analytics
  fetchAnalytics: (
    startDate: Date,
    endDate: Date
  ) => Promise<{ success: boolean; data?: PaymentAnalytics; error?: string }>;
  fetchStats: () => Promise<{ success: boolean; data?: PaymentStats; error?: string }>;

  // Filters and selection
  setFilters: (filters: Partial<PaymentFilters>) => void;
  clearFilters: () => void;
  setSelectedPayment: (payment: Payment | null) => void;

  // Export
  exportPayments: () => Promise<{ success: boolean; error?: string }>;

  // Utility
  clearError: () => void;
}

/**
 * Custom hook for payment management
 */
export const usePayments = (initialFilters?: PaymentFilters): UsePaymentsReturn => {
  const paymentService = useRef(new PaymentService()).current;

  const [state, setState] = useState<PaymentsState>({
    payments: [],
    selectedPayment: null,
    totalCount: 0,
    currentPage: 1,
    pageSize: 10,
    filters: initialFilters || {},
    analytics: null,
    stats: null,
    isLoading: false,
    isFetching: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isProcessing: false,
    error: null,
    hasMore: false,
  });

  /**
   * Fetch payments with pagination and filters
   */
  const fetchPayments = useCallback(
    async (page = 1, reset = false) => {
      const loadingState = page === 1 ? 'isLoading' : 'isFetching';
      setState((prev) => ({
        ...prev,
        [loadingState]: true,
        error: null,
        ...(reset && { payments: [], currentPage: 1 }),
      }));

      try {
        const response = await paymentService.getPayments(state.filters, page, state.pageSize);

        if (response.success && response.data) {
          const responseData = response.data;
          const newPayments = page === 1 || reset ? responseData.data : [...state.payments, ...responseData.data];

          // Calculate if there are more pages
          const hasMore = page < responseData.totalPages;

          setState((prev) => ({
            ...prev,
            payments: newPayments,
            totalCount: responseData.totalCount,
            currentPage: page,
            hasMore,
            [loadingState]: false,
            error: null,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            [loadingState]: false,
            error: response.error || 'Failed to fetch payments',
          }));
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          [loadingState]: false,
          error: error instanceof Error ? error.message : 'Failed to fetch payments',
        }));
      }
    },
    [paymentService, state.filters, state.pageSize, state.payments]
  );

  /**
   * Load more payments (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.isFetching) return;
    await fetchPayments(state.currentPage + 1);
  }, [fetchPayments, state.hasMore, state.isFetching, state.currentPage]);

  /**
   * Refetch current data
   */
  const refetch = useCallback(async () => {
    await fetchPayments(1, true);
  }, [fetchPayments]);

  /**
   * Get single payment by ID
   */
  const getPayment = useCallback(
    async (id: string) => {
      try {
        const response = await paymentService.getPayment(id);

        if (response.success && response.data) {
          return { success: true, data: response.data };
        } else {
          return { success: false, error: response.error || 'Failed to fetch payment' };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch payment',
        };
      }
    },
    [paymentService]
  );

  /**
   * Create new payment
   */
  const createPayment = useCallback(
    async (data: CreatePaymentForm) => {
      setState((prev) => ({ ...prev, isCreating: true, error: null }));

      try {
        const response = await paymentService.createPayment(data);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            payments: [response.data!, ...prev.payments],
            totalCount: prev.totalCount + 1,
            isCreating: false,
            error: null,
          }));
          return { success: true, data: response.data };
        } else {
          setState((prev) => ({
            ...prev,
            isCreating: false,
            error: response.error || 'Failed to create payment',
          }));
          return { success: false, error: response.error || 'Failed to create payment' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create payment';
        setState((prev) => ({
          ...prev,
          isCreating: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [paymentService]
  );

  /**
   * Update payment
   */
  const updatePayment = useCallback(
    async (id: string, data: UpdatePaymentForm) => {
      setState((prev) => ({ ...prev, isUpdating: true, error: null }));

      try {
        const response = await paymentService.updatePayment(id, data);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            payments: prev.payments.map((p) => (p.id === id ? response.data! : p)),
            selectedPayment: prev.selectedPayment?.id === id ? response.data! : prev.selectedPayment,
            isUpdating: false,
            error: null,
          }));
          return { success: true, data: response.data };
        } else {
          setState((prev) => ({
            ...prev,
            isUpdating: false,
            error: response.error || 'Failed to update payment',
          }));
          return { success: false, error: response.error || 'Failed to update payment' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update payment';
        setState((prev) => ({
          ...prev,
          isUpdating: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [paymentService]
  );

  /**
   * Delete payment
   */
  const deletePayment = useCallback(
    async (id: string) => {
      setState((prev) => ({ ...prev, isDeleting: true, error: null }));

      try {
        const response = await paymentService.deletePayment(id);

        if (response.success) {
          setState((prev) => ({
            ...prev,
            payments: prev.payments.filter((p) => p.id !== id),
            selectedPayment: prev.selectedPayment?.id === id ? null : prev.selectedPayment,
            totalCount: prev.totalCount - 1,
            isDeleting: false,
            error: null,
          }));
          return { success: true };
        } else {
          setState((prev) => ({
            ...prev,
            isDeleting: false,
            error: response.error || 'Failed to delete payment',
          }));
          return { success: false, error: response.error || 'Failed to delete payment' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete payment';
        setState((prev) => ({
          ...prev,
          isDeleting: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [paymentService]
  );

  /**
   * Process payment manually
   */
  const processPayment = useCallback(
    async (id: string, notes?: string) => {
      setState((prev) => ({ ...prev, isProcessing: true, error: null }));

      try {
        const response = await paymentService.processPayment(id, notes);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            payments: prev.payments.map((p) => (p.id === id ? response.data! : p)),
            selectedPayment: prev.selectedPayment?.id === id ? response.data! : prev.selectedPayment,
            isProcessing: false,
            error: null,
          }));
          return { success: true, data: response.data };
        } else {
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            error: response.error || 'Failed to process payment',
          }));
          return { success: false, error: response.error || 'Failed to process payment' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to process payment';
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [paymentService]
  );

  /**
   * Fail payment manually
   */
  const failPayment = useCallback(
    async (id: string, reason: string) => {
      setState((prev) => ({ ...prev, isProcessing: true, error: null }));

      try {
        const response = await paymentService.failPayment(id, reason);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            payments: prev.payments.map((p) => (p.id === id ? response.data! : p)),
            selectedPayment: prev.selectedPayment?.id === id ? response.data! : prev.selectedPayment,
            isProcessing: false,
            error: null,
          }));
          return { success: true, data: response.data };
        } else {
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            error: response.error || 'Failed to fail payment',
          }));
          return { success: false, error: response.error || 'Failed to fail payment' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fail payment';
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [paymentService]
  );

  /**
   * Refund payment
   */
  const refundPayment = useCallback(
    async (id: string, amount?: number, reason?: string) => {
      setState((prev) => ({ ...prev, isProcessing: true, error: null }));

      try {
        const response = await paymentService.refundPayment(id, amount, reason);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            payments: prev.payments.map((p) => (p.id === id ? response.data! : p)),
            selectedPayment: prev.selectedPayment?.id === id ? response.data! : prev.selectedPayment,
            isProcessing: false,
            error: null,
          }));
          return { success: true, data: response.data };
        } else {
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            error: response.error || 'Failed to refund payment',
          }));
          return { success: false, error: response.error || 'Failed to refund payment' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to refund payment';
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [paymentService]
  );

  /**
   * Bulk update payments
   */
  const bulkUpdatePayments = useCallback(
    async (paymentIds: string[], updates: Partial<UpdatePaymentForm>) => {
      setState((prev) => ({ ...prev, isUpdating: true, error: null }));

      try {
        const response = await paymentService.bulkUpdatePayments(paymentIds, updates);

        if (response.success) {
          // Refresh the payments list
          await fetchPayments(1, true);
          setState((prev) => ({ ...prev, isUpdating: false, error: null }));
          return { success: true, data: response.data };
        } else {
          setState((prev) => ({
            ...prev,
            isUpdating: false,
            error: response.error || 'Failed to bulk update payments',
          }));
          return { success: false, error: response.error || 'Failed to bulk update payments' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to bulk update payments';
        setState((prev) => ({
          ...prev,
          isUpdating: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [paymentService, fetchPayments]
  );

  /**
   * Bulk process payments
   */
  const bulkProcessPayments = useCallback(
    async (paymentIds: string[]) => {
      setState((prev) => ({ ...prev, isProcessing: true, error: null }));

      try {
        const response = await paymentService.bulkProcessPayments(paymentIds);

        if (response.success) {
          // Refresh the payments list
          await fetchPayments(1, true);
          setState((prev) => ({ ...prev, isProcessing: false, error: null }));
          return { success: true, data: response.data };
        } else {
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            error: response.error || 'Failed to bulk process payments',
          }));
          return { success: false, error: response.error || 'Failed to bulk process payments' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to bulk process payments';
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [paymentService, fetchPayments]
  );

  /**
   * Fetch payment analytics
   */
  const fetchAnalytics = useCallback(
    async (startDate: Date, endDate: Date) => {
      try {
        const response = await paymentService.getAnalytics(startDate, endDate);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            analytics: response.data!,
            error: null,
          }));
          return { success: true, data: response.data };
        } else {
          setState((prev) => ({
            ...prev,
            error: response.error || 'Failed to fetch analytics',
          }));
          return { success: false, error: response.error || 'Failed to fetch analytics' };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch analytics';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [paymentService]
  );

  /**
   * Fetch payment stats
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await paymentService.getStats();

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          stats: response.data!,
          error: null,
        }));
        return { success: true, data: response.data };
      } else {
        setState((prev) => ({
          ...prev,
          error: response.error || 'Failed to fetch stats',
        }));
        return { success: false, error: response.error || 'Failed to fetch stats' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stats';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [paymentService]);

  /**
   * Update filters
   */
  const setFilters = useCallback((filters: Partial<PaymentFilters>) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
    }));
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: {},
    }));
  }, []);

  /**
   * Set selected payment
   */
  const setSelectedPayment = useCallback((payment: Payment | null) => {
    setState((prev) => ({
      ...prev,
      selectedPayment: payment,
    }));
  }, []);

  /**
   * Export payments to CSV
   */
  const exportPayments = useCallback(async () => {
    try {
      const response = await paymentService.exportPayments(state.filters);

      if (response.success) {
        return { success: true };
      } else {
        setState((prev) => ({
          ...prev,
          error: response.error || 'Failed to export payments',
        }));
        return { success: false, error: response.error || 'Failed to export payments' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export payments';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [paymentService, state.filters]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Auto-fetch payments when filters change
  useEffect(() => {
    fetchPayments(1, true);
  }, [state.filters]);

  // Auto-fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    // State
    payments: state.payments,
    selectedPayment: state.selectedPayment,
    totalCount: state.totalCount,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    filters: state.filters,
    analytics: state.analytics,
    stats: state.stats,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    isCreating: state.isCreating,
    isUpdating: state.isUpdating,
    isDeleting: state.isDeleting,
    isProcessing: state.isProcessing,
    error: state.error,
    hasMore: state.hasMore,

    // Methods
    fetchPayments,
    loadMore,
    refetch,
    getPayment,
    createPayment,
    updatePayment,
    deletePayment,
    processPayment,
    failPayment,
    refundPayment,
    bulkUpdatePayments,
    bulkProcessPayments,
    fetchAnalytics,
    fetchStats,
    setFilters,
    clearFilters,
    setSelectedPayment,
    exportPayments,
    clearError,
  };
};

export default usePayments;
