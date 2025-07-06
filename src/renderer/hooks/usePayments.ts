/**
 * Custom hook for payment management
 * Combines store actions and state with additional utility functions
 * Following Instructions standards for hooks and business logic separation
 */

import { useCallback, useEffect, useMemo } from 'react';
import { usePaymentStore, usePaymentActions, usePaymentState } from '../store/payment.store';
import { useAgencyStore } from '../store/agency.store';
import { useAuthStore } from '../store/auth.store';
import type {
  PaymentFilters,
  PaymentRecordForm,
  PaymentListItem,
  PaymentAnalytics,
} from '../domains/payment/types/PaymentTypes';
import { PaymentStatus } from '../domains/payment/valueObjects/PaymentStatus';

/**
 * Payment hook return type
 */
export interface UsePaymentsReturn {
  // Core payment data
  payments: PaymentListItem[];
  selectedPayment: any; // PaymentRecord | null
  paymentAnalytics: PaymentAnalytics | null;

  // UI state
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;

  // Pagination and filtering
  currentPage: number;
  totalPages: number;
  totalPayments: number;
  filters: PaymentFilters;
  hasMore: boolean;

  // Actions
  loadPayments: (page?: number, limit?: number) => Promise<void>;
  recordPayment: (data: PaymentRecordForm) => Promise<any>;
  updatePayment: (paymentId: string, updates: Partial<PaymentRecordForm>) => Promise<any>;
  cancelPayment: (paymentId: string, reason: string) => Promise<any>;
  selectPayment: (paymentId: string) => Promise<void>;
  clearSelectedPayment: () => void;

  // Filtering and search
  setFilters: (filters: Partial<PaymentFilters>) => void;
  clearFilters: () => void;
  searchPayments: (query: string) => void;

  // Analytics
  loadAnalytics: (dateFrom: Date, dateTo: Date) => Promise<void>;

  // Utility functions
  refresh: () => Promise<void>;
  clearError: () => void;

  // Computed values
  recentPayments: PaymentListItem[];
  overduePayments: PaymentListItem[];
  todayPayments: PaymentListItem[];
  paymentsByStatus: Record<PaymentStatus, PaymentListItem[]>;

  // Status helpers
  getPaymentStatusColor: (status: PaymentStatus) => string;
  getPaymentStatusText: (status: PaymentStatus) => string;
  isPaymentEditable: (payment: PaymentListItem) => boolean;
  isPaymentCancellable: (payment: PaymentListItem) => boolean;
}

/**
 * Hook for payment management
 */
export const usePayments = (): UsePaymentsReturn => {
  // Store hooks
  const actions = usePaymentActions();
  const state = usePaymentState();

  // Context hooks
  const currentAgency = useAgencyStore((state) => state.currentAgency);
  const currentUser = useAuthStore((state) => state.user);

  // Memoized computed values
  const hasMore = useMemo(() => {
    return state.currentPage < state.totalPages;
  }, [state.currentPage, state.totalPages]);

  const recentPayments = useMemo(() => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return state.payments.filter((payment) => new Date(payment.createdAt) >= threeDaysAgo).slice(0, 10);
  }, [state.payments]);

  const overduePayments = useMemo(() => {
    // Note: OVERDUE is an InvoiceStatus, for payments we check for failed/past due payments
    return state.payments.filter(
      (payment) =>
        payment.status === PaymentStatus.FAILED || (payment.status === PaymentStatus.PENDING && payment.isPastDue)
    );
  }, [state.payments]);

  const todayPayments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return state.payments.filter((payment) => {
      const paymentDate = new Date(payment.createdAt);
      return paymentDate >= today && paymentDate < tomorrow;
    });
  }, [state.payments]);

  const paymentsByStatus = useMemo(() => {
    const grouped: Record<PaymentStatus, PaymentListItem[]> = {
      [PaymentStatus.PENDING]: [],
      [PaymentStatus.PROCESSING]: [],
      [PaymentStatus.RECEIVED]: [],
      [PaymentStatus.CONFIRMED]: [],
      [PaymentStatus.FAILED]: [],
      [PaymentStatus.CANCELLED]: [],
      [PaymentStatus.REFUNDED]: [],
      [PaymentStatus.PARTIAL]: [],
      [PaymentStatus.OVERPAID]: [],
    };

    state.payments.forEach((payment) => {
      if (grouped[payment.status]) {
        grouped[payment.status].push(payment);
      }
    });

    return grouped;
  }, [state.payments]);

  // Enhanced actions with context
  const loadPayments = useCallback(
    async (page = 1, limit = 25) => {
      console.log('🔄 usePayments: Loading payments', { page, limit });

      try {
        await actions.loadPayments(page, limit);
      } catch (error) {
        console.error('❌ usePayments: Failed to load payments:', error);
      }
    },
    [actions]
  );

  const recordPayment = useCallback(
    async (data: PaymentRecordForm) => {
      console.log('💰 usePayments: Recording payment');

      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      if (!currentAgency?.id) {
        throw new Error('No agency selected');
      }

      try {
        const payment = await actions.recordPayment(data, currentUser.id, currentAgency.id);

        // Auto-refresh analytics if loaded
        if (state.paymentAnalytics) {
          await loadAnalytics(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
        }

        return payment;
      } catch (error) {
        console.error('❌ usePayments: Failed to record payment:', error);
        throw error;
      }
    },
    [actions, currentUser, currentAgency, state.paymentAnalytics]
  );

  const updatePayment = useCallback(
    async (paymentId: string, updates: Partial<PaymentRecordForm>) => {
      console.log('📝 usePayments: Updating payment:', paymentId);

      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      try {
        const payment = await actions.updatePayment(paymentId, updates, currentUser.id);

        // Auto-refresh analytics if loaded
        if (state.paymentAnalytics) {
          await loadAnalytics(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
        }

        return payment;
      } catch (error) {
        console.error('❌ usePayments: Failed to update payment:', error);
        throw error;
      }
    },
    [actions, currentUser, state.paymentAnalytics]
  );

  const cancelPayment = useCallback(
    async (paymentId: string, reason: string) => {
      console.log('❌ usePayments: Cancelling payment:', paymentId);

      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      try {
        const payment = await actions.cancelPayment(paymentId, reason, currentUser.id);

        // Auto-refresh analytics if loaded
        if (state.paymentAnalytics) {
          await loadAnalytics(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
        }

        return payment;
      } catch (error) {
        console.error('❌ usePayments: Failed to cancel payment:', error);
        throw error;
      }
    },
    [actions, currentUser, state.paymentAnalytics]
  );

  const searchPayments = useCallback(
    (query: string) => {
      console.log('🔍 usePayments: Searching payments:', query);

      const searchFilters: Partial<PaymentFilters> = {
        search: query,
      };

      actions.setFilters(searchFilters);
    },
    [actions]
  );

  const loadAnalytics = useCallback(
    async (dateFrom: Date, dateTo: Date) => {
      console.log('📊 usePayments: Loading analytics');

      if (!currentAgency?.id) {
        console.warn('⚠️ usePayments: No agency selected for analytics');
        return;
      }

      try {
        await actions.loadPaymentAnalytics(currentAgency.id, dateFrom, dateTo);
      } catch (error) {
        console.error('❌ usePayments: Failed to load analytics:', error);
      }
    },
    [actions, currentAgency]
  );

  // Utility functions
  const getPaymentStatusColor = useCallback((status: PaymentStatus): string => {
    switch (status) {
      case PaymentStatus.CONFIRMED:
      case PaymentStatus.RECEIVED:
        return '#4caf50'; // Green
      case PaymentStatus.PENDING:
      case PaymentStatus.PROCESSING:
        return '#ff9800'; // Orange
      case PaymentStatus.FAILED:
      case PaymentStatus.CANCELLED:
        return '#f44336'; // Red
      case PaymentStatus.REFUNDED:
        return '#2196f3'; // Blue
      case PaymentStatus.PARTIAL:
        return '#ff5722'; // Deep Orange
      case PaymentStatus.OVERPAID:
        return '#9c27b0'; // Purple
      default:
        return '#757575'; // Grey
    }
  }, []);

  const getPaymentStatusText = useCallback((status: PaymentStatus): string => {
    switch (status) {
      case PaymentStatus.COMPLETED:
        return 'Completed';
      case PaymentStatus.PENDING:
        return 'Pending';
      case PaymentStatus.FAILED:
        return 'Failed';
      case PaymentStatus.CANCELLED:
        return 'Cancelled';
      case PaymentStatus.REFUNDED:
        return 'Refunded';
      case PaymentStatus.OVERDUE:
        return 'Overdue';
      case PaymentStatus.PAID:
        return 'Paid';
      default:
        return 'Unknown';
    }
  }, []);

  const isPaymentEditable = useCallback((payment: PaymentListItem): boolean => {
    // Payment is editable if it's pending and user has permission
    return payment.status === PaymentStatus.PENDING && payment.canEdit;
  }, []);

  const isPaymentCancellable = useCallback((payment: PaymentListItem): boolean => {
    // Payment is cancellable if it's pending or completed and user has permission
    return (
      (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.COMPLETED) && payment.canCancel
    );
  }, []);

  // Auto-load payments on mount if agency is available
  useEffect(() => {
    if (currentAgency?.id && state.payments.length === 0 && !state.loading) {
      loadPayments();
    }
  }, [currentAgency, state.payments.length, state.loading, loadPayments]);

  return {
    // Core payment data
    payments: state.payments,
    selectedPayment: state.selectedPayment,
    paymentAnalytics: state.paymentAnalytics,

    // UI state
    loading: state.loading,
    error: state.error,
    isRefreshing: state.isRefreshing,

    // Pagination and filtering
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    totalPayments: state.totalPayments,
    filters: state.filters,
    hasMore,

    // Actions
    loadPayments,
    recordPayment,
    updatePayment,
    cancelPayment,
    selectPayment: actions.selectPayment,
    clearSelectedPayment: actions.clearSelectedPayment,

    // Filtering and search
    setFilters: actions.setFilters,
    clearFilters: actions.clearFilters,
    searchPayments,

    // Analytics
    loadAnalytics,

    // Utility functions
    refresh: actions.refresh,
    clearError: actions.clearError,

    // Computed values
    recentPayments,
    overduePayments,
    todayPayments,
    paymentsByStatus,

    // Status helpers
    getPaymentStatusColor,
    getPaymentStatusText,
    isPaymentEditable,
    isPaymentCancellable,
  };
};

/**
 * Hook for payment analytics and reporting
 */
export const usePaymentAnalytics = (dateFrom?: Date, dateTo?: Date) => {
  const { paymentAnalytics, loadAnalytics, loading, error } = usePayments();

  // Auto-load analytics when dates change
  useEffect(() => {
    if (dateFrom && dateTo) {
      loadAnalytics(dateFrom, dateTo);
    }
  }, [dateFrom, dateTo, loadAnalytics]);

  const analytics = useMemo(() => {
    if (!paymentAnalytics) return null;

    return {
      ...paymentAnalytics,
      // Additional computed analytics can be added here
      averagePaymentValue:
        paymentAnalytics.totalPayments > 0 ? paymentAnalytics.totalAmount / paymentAnalytics.totalPayments : 0,
      collectionRate:
        paymentAnalytics.totalInvoiced > 0
          ? (paymentAnalytics.totalCollected / paymentAnalytics.totalInvoiced) * 100
          : 0,
    };
  }, [paymentAnalytics]);

  return {
    analytics,
    loading,
    error,
    refresh: () => dateFrom && dateTo && loadAnalytics(dateFrom, dateTo),
  };
};

/**
 * Hook for payment filtering and search
 */
export const usePaymentFilters = () => {
  const { filters, setFilters, clearFilters, searchPayments } = usePayments();

  const setStatusFilter = useCallback(
    (status: PaymentStatus | null) => {
      setFilters({ status });
    },
    [setFilters]
  );

  const setDateRangeFilter = useCallback(
    (dateFrom: Date | null, dateTo: Date | null) => {
      setFilters({ dateFrom, dateTo });
    },
    [setFilters]
  );

  const setCustomerFilter = useCallback(
    (customerId: string | null) => {
      setFilters({ customerId });
    },
    [setFilters]
  );

  const setAmountRangeFilter = useCallback(
    (minAmount: number | null, maxAmount: number | null) => {
      setFilters({ minAmount, maxAmount });
    },
    [setFilters]
  );

  return {
    filters,
    setFilters,
    clearFilters,
    searchPayments,
    setStatusFilter,
    setDateRangeFilter,
    setCustomerFilter,
    setAmountRangeFilter,
  };
};
