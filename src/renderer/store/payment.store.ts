/**
 * Payment Store using Zustand
 * Following Instructions standards for state management and payment domain patterns
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { PaymentService } from '../services/PaymentService';
import type {
  PaymentRecord,
  PaymentListItem,
  PaymentFilters,
  PaymentListResponse,
  PaymentAnalytics,
  PaymentRecordForm,
} from '../domains/payment/types/PaymentTypes';

/**
 * Payment store state interface
 */
interface PaymentState {
  // Core payment data
  payments: PaymentListItem[];
  selectedPayment: PaymentRecord | null;
  paymentAnalytics: PaymentAnalytics | null;

  // UI state
  loading: boolean;
  error: string | null;

  // Filters and pagination
  filters: PaymentFilters;
  currentPage: number;
  totalPages: number;
  totalPayments: number;

  // Cache and performance
  lastLoadTime: Date | null;
  isRefreshing: boolean;

  // Feature flags
  enableRealTimeUpdates: boolean;
}

/**
 * Payment store actions interface
 */
interface PaymentActions {
  // Payment CRUD operations
  loadPayments: (page?: number, limit?: number, customFilters?: PaymentFilters) => Promise<void>;
  recordPayment: (data: PaymentRecordForm, createdBy: string, agencyId: string) => Promise<PaymentRecord>;
  updatePayment: (paymentId: string, updates: Partial<PaymentRecordForm>, updatedBy: string) => Promise<PaymentRecord>;
  cancelPayment: (paymentId: string, reason: string, cancelledBy: string) => Promise<PaymentRecord>;

  // Payment selection and details
  selectPayment: (paymentId: string) => Promise<void>;
  clearSelectedPayment: () => void;

  // Analytics and reporting
  loadPaymentAnalytics: (agencyId: string, dateFrom: Date, dateTo: Date) => Promise<void>;

  // Filters and search
  setFilters: (newFilters: Partial<PaymentFilters>) => void;
  clearFilters: () => void;

  // Utility actions
  refresh: () => Promise<void>;
  clearError: () => void;
  clearCache: () => void;

  // Real-time updates
  enableRealTime: () => void;
  disableRealTime: () => void;
}

/**
 * Combined payment store interface
 */
export interface PaymentStore extends PaymentState, PaymentActions {}

/**
 * Initial payment state
 */
const initialState: PaymentState = {
  payments: [],
  selectedPayment: null,
  paymentAnalytics: null,
  loading: false,
  error: null,
  filters: {},
  currentPage: 1,
  totalPages: 0,
  totalPayments: 0,
  lastLoadTime: null,
  isRefreshing: false,
  enableRealTimeUpdates: false,
};

/**
 * Payment store implementation
 * Using Zustand with TypeScript, DevTools, Persistence, and Immer
 */
export const usePaymentStore = create<PaymentStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        /**
         * Load payments with filtering and pagination
         */
        loadPayments: async (page: number = 1, limit: number = 25, customFilters?: PaymentFilters): Promise<void> => {
          console.log('💰 Payment Store: Loading payments with filters:', { page, limit, customFilters });

          set((state) => {
            state.loading = true;
            state.error = null;
            if (page === 1) {
              state.payments = []; // Clear payments for fresh load
            }
          });

          try {
            const currentFilters = customFilters || get().filters;

            // Get current agency from agency store (TODO: implement proper dependency)
            const agencyId = 'current-agency-id'; // TODO: Get from agency store

            const response: PaymentListResponse = await PaymentService.getPayments(
              agencyId,
              page,
              limit,
              currentFilters
            );

            set((state) => {
              if (page === 1) {
                state.payments = response.payments;
              } else {
                // Append for pagination
                state.payments.push(...response.payments);
              }

              state.currentPage = response.page;
              state.totalPages = response.totalPages;
              state.totalPayments = response.total;
              state.loading = false;
              state.lastLoadTime = new Date();

              // Update filters if custom filters were provided
              if (customFilters) {
                state.filters = { ...state.filters, ...customFilters };
              }
            });

            console.log('✅ Payment Store: Payments loaded successfully', {
              count: response.payments.length,
              total: response.total,
              page: response.page,
            });
          } catch (error) {
            console.error('❌ Payment Store: Failed to load payments:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to load payments';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Record a new payment
         */
        recordPayment: async (data: PaymentRecordForm, createdBy: string, agencyId: string): Promise<PaymentRecord> => {
          console.log('💰 Payment Store: Recording payment:', { customerId: data.customerId, amount: data.amount });

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            const payment = await PaymentService.recordPayment(data, createdBy, agencyId);

            // Convert to list item for UI
            const paymentListItem: PaymentListItem = {
              id: payment.id,
              customerId: payment.customerId,
              customerName: payment.customerName,
              amount: payment.amount,
              currency: payment.currency,
              formattedAmount: `$${payment.amount.toLocaleString()}`,
              paymentMethod: payment.paymentMethod,
              paymentMethodText: payment.paymentMethod, // TODO: Use PaymentMethodUtils
              status: payment.status,
              statusText: payment.status, // TODO: Use PaymentStatusUtils
              statusColor: '#4caf50', // TODO: Use PaymentStatusUtils
              reference: payment.metadata.reference || '',
              createdAt: payment.createdAt,
              agencyId: payment.agencyId,
              isRecent: true,
              canEdit: true,
              canCancel: true,
              canRefund: false,
            };

            set((state) => {
              // Add new payment to the beginning of the list
              state.payments.unshift(paymentListItem);
              state.totalPayments += 1;
              state.loading = false;
            });

            console.log('✅ Payment Store: Payment recorded successfully:', payment.id);
            return payment;
          } catch (error) {
            console.error('❌ Payment Store: Failed to record payment:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to record payment';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Update an existing payment
         */
        updatePayment: async (
          paymentId: string,
          updates: Partial<PaymentRecordForm>,
          updatedBy: string
        ): Promise<PaymentRecord> => {
          console.log('💰 Payment Store: Updating payment:', { paymentId, updates });

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            const updatedPayment = await PaymentService.updatePayment(paymentId, updates, updatedBy);

            set((state) => {
              // Update payment in the list
              const index = state.payments.findIndex((p) => p.id === paymentId);
              if (index !== -1) {
                state.payments[index] = {
                  ...state.payments[index],
                  amount: updatedPayment.amount,
                  paymentMethod: updatedPayment.paymentMethod,
                  status: updatedPayment.status,
                  // TODO: Update other fields as needed
                };
              }

              // Update selected payment if it's the one being updated
              if (state.selectedPayment?.id === paymentId) {
                state.selectedPayment = updatedPayment;
              }

              state.loading = false;
            });

            console.log('✅ Payment Store: Payment updated successfully:', paymentId);
            return updatedPayment;
          } catch (error) {
            console.error('❌ Payment Store: Failed to update payment:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to update payment';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Cancel a payment
         */
        cancelPayment: async (paymentId: string, reason: string, cancelledBy: string): Promise<PaymentRecord> => {
          console.log('💰 Payment Store: Cancelling payment:', { paymentId, reason });

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            const cancelledPayment = await PaymentService.cancelPayment(paymentId, reason, cancelledBy);

            set((state) => {
              // Update payment status in the list
              const index = state.payments.findIndex((p) => p.id === paymentId);
              if (index !== -1) {
                state.payments[index] = {
                  ...state.payments[index],
                  status: cancelledPayment.status,
                  statusText: 'Cancelled',
                  statusColor: '#f44336',
                  canEdit: false,
                  canCancel: false,
                };
              }

              // Update selected payment if it's the one being cancelled
              if (state.selectedPayment?.id === paymentId) {
                state.selectedPayment = cancelledPayment;
              }

              state.loading = false;
            });

            console.log('✅ Payment Store: Payment cancelled successfully:', paymentId);
            return cancelledPayment;
          } catch (error) {
            console.error('❌ Payment Store: Failed to cancel payment:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to cancel payment';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Select a payment for detailed view
         */
        selectPayment: async (paymentId: string): Promise<void> => {
          console.log('💰 Payment Store: Selecting payment:', paymentId);

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            const payment = await PaymentService.getPaymentById(paymentId);

            set((state) => {
              state.selectedPayment = payment;
              state.loading = false;
            });

            console.log('✅ Payment Store: Payment selected successfully:', paymentId);
          } catch (error) {
            console.error('❌ Payment Store: Failed to select payment:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to load payment details';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Clear selected payment
         */
        clearSelectedPayment: (): void => {
          set((state) => {
            state.selectedPayment = null;
          });
        },

        /**
         * Load payment analytics
         */
        loadPaymentAnalytics: async (agencyId: string, dateFrom: Date, dateTo: Date): Promise<void> => {
          console.log('📊 Payment Store: Loading analytics:', { agencyId, dateFrom, dateTo });

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            const analytics = await PaymentService.getPaymentAnalytics(agencyId, dateFrom, dateTo);

            set((state) => {
              state.paymentAnalytics = analytics;
              state.loading = false;
            });

            console.log('✅ Payment Store: Analytics loaded successfully');
          } catch (error) {
            console.error('❌ Payment Store: Failed to load analytics:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to load payment analytics';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Set payment filters
         */
        setFilters: (newFilters: Partial<PaymentFilters>): void => {
          console.log('🔍 Payment Store: Setting filters:', newFilters);

          set((state) => {
            state.filters = { ...state.filters, ...newFilters };
          });

          // Auto-reload with new filters
          get().loadPayments(1, 25);
        },

        /**
         * Clear all filters
         */
        clearFilters: (): void => {
          console.log('🔍 Payment Store: Clearing filters');

          set((state) => {
            state.filters = {};
          });

          // Reload without filters
          get().loadPayments(1, 25);
        },

        /**
         * Refresh payments data
         */
        refresh: async (): Promise<void> => {
          console.log('🔄 Payment Store: Refreshing payments');

          set((state) => {
            state.isRefreshing = true;
          });

          try {
            await get().loadPayments(1, 25);
          } finally {
            set((state) => {
              state.isRefreshing = false;
            });
          }
        },

        /**
         * Clear error state
         */
        clearError: (): void => {
          set((state) => {
            state.error = null;
          });
        },

        /**
         * Clear cache and reset state
         */
        clearCache: (): void => {
          console.log('🗑️ Payment Store: Clearing cache');

          set((state) => {
            state.payments = [];
            state.selectedPayment = null;
            state.paymentAnalytics = null;
            state.lastLoadTime = null;
            state.currentPage = 1;
            state.totalPages = 0;
            state.totalPayments = 0;
          });
        },

        /**
         * Enable real-time updates
         */
        enableRealTime: (): void => {
          console.log('🔄 Payment Store: Enabling real-time updates');

          set((state) => {
            state.enableRealTimeUpdates = true;
          });

          // TODO: Implement WebSocket or polling for real-time updates
        },

        /**
         * Disable real-time updates
         */
        disableRealTime: (): void => {
          console.log('⏸️ Payment Store: Disabling real-time updates');

          set((state) => {
            state.enableRealTimeUpdates = false;
          });

          // TODO: Cleanup WebSocket or polling
        },
      })),
      {
        name: 'flowlytix-payment-store',
        // Only persist essential data to avoid storage bloat
        partialize: (state) => ({
          filters: state.filters,
          enableRealTimeUpdates: state.enableRealTimeUpdates,
        }),
      }
    ),
    {
      name: 'PaymentStore',
    }
  )
);

/**
 * Payment store action hooks for better component integration
 */
export const usePaymentActions = () => {
  const store = usePaymentStore();

  return {
    loadPayments: store.loadPayments,
    recordPayment: store.recordPayment,
    updatePayment: store.updatePayment,
    cancelPayment: store.cancelPayment,
    selectPayment: store.selectPayment,
    clearSelectedPayment: store.clearSelectedPayment,
    loadPaymentAnalytics: store.loadPaymentAnalytics,
    setFilters: store.setFilters,
    clearFilters: store.clearFilters,
    refresh: store.refresh,
    clearError: store.clearError,
    clearCache: store.clearCache,
    enableRealTime: store.enableRealTime,
    disableRealTime: store.disableRealTime,
  };
};

/**
 * Payment store state hooks for reactive components
 */
export const usePaymentState = () => {
  const store = usePaymentStore();

  return {
    payments: store.payments,
    selectedPayment: store.selectedPayment,
    paymentAnalytics: store.paymentAnalytics,
    loading: store.loading,
    error: store.error,
    filters: store.filters,
    currentPage: store.currentPage,
    totalPages: store.totalPages,
    totalPayments: store.totalPayments,
    lastLoadTime: store.lastLoadTime,
    isRefreshing: store.isRefreshing,
    enableRealTimeUpdates: store.enableRealTimeUpdates,
  };
};
