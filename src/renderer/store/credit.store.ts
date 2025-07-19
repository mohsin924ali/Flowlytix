/**
 * Credit Store using Zustand
 * Following Instructions standards for state management and credit domain patterns
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { CreditService } from '../services/CreditService';
import type {
  CreditAccount,
  CreditCheckRequest,
  CreditCheckResult,
  CreditLimitAdjustment,
  CreditLimitAdjustmentForm,
  CreditAnalytics,
  AgingReportItem,
} from '../domains/payment/types/PaymentTypes';
import { CreditStatus, CreditRiskLevel } from '../domains/payment/valueObjects/PaymentStatus';

/**
 * Credit store state interface
 */
interface CreditState {
  // Core credit data
  creditAccounts: Record<string, CreditAccount>; // Keyed by customerId
  selectedCreditAccount: CreditAccount | null;
  creditAnalytics: CreditAnalytics | null;
  agingReport: AgingReportItem[];

  // Credit checks and approvals
  recentCreditChecks: Record<string, CreditCheckResult>; // Keyed by customerId
  pendingApprovals: CreditLimitAdjustment[];

  // UI state
  loading: boolean;
  error: string | null;

  // Performance and caching
  lastAnalyticsUpdate: Date | null;
  lastAgingReportUpdate: Date | null;
  creditCheckCache: Record<string, { result: CreditCheckResult; timestamp: Date }>;

  // Real-time monitoring
  riskAlerts: {
    customerId: string;
    customerName: string;
    riskLevel: CreditRiskLevel;
    reason: string;
    timestamp: Date;
  }[];

  // Configuration
  creditSettings: {
    enableAutoApproval: boolean;
    autoApprovalLimit: number;
    requireManagerApproval: boolean;
    creditCheckCacheTime: number; // in minutes
    riskThresholds: {
      low: number;
      moderate: number;
      high: number;
    };
  };
}

/**
 * Credit store actions interface
 */
interface CreditActions {
  // Credit account management
  getCreditAccount: (customerId: string) => Promise<CreditAccount | null>;
  refreshCreditAccount: (customerId: string) => Promise<void>;
  selectCreditAccount: (customerId: string) => Promise<void>;
  clearSelectedCreditAccount: () => void;

  // Credit checks and risk assessment
  performCreditCheck: (request: CreditCheckRequest) => Promise<CreditCheckResult>;
  getCachedCreditCheck: (customerId: string) => CreditCheckResult | null;
  clearCreditCheckCache: (customerId?: string) => void;

  // Credit limit adjustments
  requestCreditLimitAdjustment: (
    data: CreditLimitAdjustmentForm,
    requestedBy: string,
    agencyId: string
  ) => Promise<CreditLimitAdjustment>;
  approveCreditAdjustment: (adjustmentId: string, approvedBy: string) => Promise<CreditLimitAdjustment>;
  rejectCreditAdjustment: (adjustmentId: string, rejectedBy: string, reason: string) => Promise<void>;
  loadPendingApprovals: (agencyId: string) => Promise<void>;

  // Analytics and reporting
  loadCreditAnalytics: (agencyId: string, dateFrom: Date, dateTo: Date) => Promise<void>;
  generateAgingReport: (agencyId: string, asOfDate?: Date) => Promise<void>;

  // Risk management
  addRiskAlert: (customerId: string, customerName: string, riskLevel: CreditRiskLevel, reason: string) => void;
  clearRiskAlert: (customerId: string) => void;
  clearAllRiskAlerts: () => void;

  // Settings and configuration
  updateCreditSettings: (newSettings: Partial<CreditState['creditSettings']>) => void;
  resetCreditSettings: () => void;

  // Utility actions
  refresh: () => Promise<void>;
  clearError: () => void;
  clearCache: () => void;
}

/**
 * Combined credit store interface
 */
export interface CreditStore extends CreditState, CreditActions {}

/**
 * Default credit settings
 */
const defaultCreditSettings: CreditState['creditSettings'] = {
  enableAutoApproval: true,
  autoApprovalLimit: 5000,
  requireManagerApproval: true,
  creditCheckCacheTime: 30, // 30 minutes
  riskThresholds: {
    low: 20,
    moderate: 50,
    high: 80,
  },
};

/**
 * Initial credit state
 */
const initialState: CreditState = {
  creditAccounts: {},
  selectedCreditAccount: null,
  creditAnalytics: null,
  agingReport: [],
  recentCreditChecks: {},
  pendingApprovals: [],
  loading: false,
  error: null,
  lastAnalyticsUpdate: null,
  lastAgingReportUpdate: null,
  creditCheckCache: {},
  riskAlerts: [],
  creditSettings: defaultCreditSettings,
};

/**
 * Credit store implementation
 * Using Zustand with TypeScript, DevTools, Persistence, and Immer
 */
export const useCreditStore = create<CreditStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        /**
         * Get credit account for a customer
         */
        getCreditAccount: async (customerId: string): Promise<CreditAccount | null> => {
          console.log('💳 Credit Store: Getting credit account for:', customerId);

          // Check cache first
          const cached = get().creditAccounts[customerId];
          if (cached) {
            console.log('✅ Credit Store: Found cached credit account:', customerId);
            return cached;
          }

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            const creditAccount = await CreditService.getCreditAccount(customerId);

            if (creditAccount) {
              set((state) => {
                state.creditAccounts[customerId] = creditAccount;
                state.loading = false;
              });

              console.log('✅ Credit Store: Credit account loaded:', customerId);
            } else {
              set((state) => {
                state.loading = false;
              });
              console.log('ℹ️ Credit Store: No credit account found for:', customerId);
            }

            return creditAccount;
          } catch (error) {
            console.error('❌ Credit Store: Failed to get credit account:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to load credit account';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Refresh credit account data
         */
        refreshCreditAccount: async (customerId: string): Promise<void> => {
          console.log('🔄 Credit Store: Refreshing credit account:', customerId);

          // Remove from cache and reload
          set((state) => {
            delete state.creditAccounts[customerId];
          });

          await get().getCreditAccount(customerId);
        },

        /**
         * Select credit account for detailed view
         */
        selectCreditAccount: async (customerId: string): Promise<void> => {
          console.log('💳 Credit Store: Selecting credit account:', customerId);

          const creditAccount = await get().getCreditAccount(customerId);

          set((state) => {
            state.selectedCreditAccount = creditAccount;
          });
        },

        /**
         * Clear selected credit account
         */
        clearSelectedCreditAccount: (): void => {
          set((state) => {
            state.selectedCreditAccount = null;
          });
        },

        /**
         * Perform credit check with caching
         */
        performCreditCheck: async (request: CreditCheckRequest): Promise<CreditCheckResult> => {
          console.log('🔍 Credit Store: Performing credit check:', request);

          // Check cache first
          const cached = get().getCachedCreditCheck(request.customerId);
          if (cached) {
            console.log('✅ Credit Store: Using cached credit check result:', request.customerId);
            return cached;
          }

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            const result = await CreditService.checkCreditAvailability(request);

            set((state) => {
              // Cache the result
              state.creditCheckCache[request.customerId] = {
                result,
                timestamp: new Date(),
              };

              // Store in recent checks
              state.recentCreditChecks[request.customerId] = result;

              state.loading = false;

              // Add risk alert if needed
              if (result.riskLevel === CreditRiskLevel.HIGH || result.riskLevel === CreditRiskLevel.CRITICAL) {
                const existingAlert = state.riskAlerts.find((alert) => alert.customerId === request.customerId);
                if (!existingAlert) {
                  state.riskAlerts.push({
                    customerId: request.customerId,
                    customerName: result.customerId, // TODO: Get actual customer name
                    riskLevel: result.riskLevel,
                    reason: result.reasons.join(', '),
                    timestamp: new Date(),
                  });
                }
              }
            });

            console.log('✅ Credit Store: Credit check completed:', {
              customerId: request.customerId,
              approved: result.approved,
              riskLevel: result.riskLevel,
            });

            return result;
          } catch (error) {
            console.error('❌ Credit Store: Credit check failed:', error);

            const errorMessage = error instanceof Error ? error.message : 'Credit check failed';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Get cached credit check result
         */
        getCachedCreditCheck: (customerId: string): CreditCheckResult | null => {
          const cached = get().creditCheckCache[customerId];
          if (!cached) return null;

          const { creditCheckCacheTime } = get().creditSettings;
          const cacheAge = (Date.now() - cached.timestamp.getTime()) / (1000 * 60); // in minutes

          if (cacheAge > creditCheckCacheTime) {
            // Cache expired, remove it
            set((state) => {
              delete state.creditCheckCache[customerId];
            });
            return null;
          }

          return cached.result;
        },

        /**
         * Clear credit check cache
         */
        clearCreditCheckCache: (customerId?: string): void => {
          console.log('🗑️ Credit Store: Clearing credit check cache:', customerId || 'all');

          set((state) => {
            if (customerId) {
              delete state.creditCheckCache[customerId];
              delete state.recentCreditChecks[customerId];
            } else {
              state.creditCheckCache = {};
              state.recentCreditChecks = {};
            }
          });
        },

        /**
         * Request credit limit adjustment
         */
        requestCreditLimitAdjustment: async (
          data: CreditLimitAdjustmentForm,
          requestedBy: string,
          agencyId: string
        ): Promise<CreditLimitAdjustment> => {
          console.log('📝 Credit Store: Requesting credit limit adjustment:', data);

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            const adjustment = await CreditService.adjustCreditLimit(data, requestedBy, agencyId);

            set((state) => {
              // Add to pending approvals if it requires approval
              if (adjustment.approvalStatus === 'PENDING') {
                state.pendingApprovals.push(adjustment);
              }

              state.loading = false;
            });

            console.log('✅ Credit Store: Credit limit adjustment requested:', adjustment.id);
            return adjustment;
          } catch (error) {
            console.error('❌ Credit Store: Failed to request credit adjustment:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to request credit adjustment';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Approve credit adjustment
         */
        approveCreditAdjustment: async (adjustmentId: string, approvedBy: string): Promise<CreditLimitAdjustment> => {
          console.log('✅ Credit Store: Approving credit adjustment:', adjustmentId);

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            const approvedAdjustment = await CreditService.approveCreditAdjustment(adjustmentId, approvedBy);

            set((state) => {
              // Remove from pending approvals
              state.pendingApprovals = state.pendingApprovals.filter((adj) => adj.id !== adjustmentId);

              // Update credit account cache if available
              const customerId = approvedAdjustment.customerId;
              if (state.creditAccounts[customerId]) {
                state.creditAccounts[customerId] = {
                  ...state.creditAccounts[customerId],
                  creditLimit: approvedAdjustment.newLimit,
                  availableCredit: approvedAdjustment.newLimit - state.creditAccounts[customerId].outstandingBalance,
                };
              }

              state.loading = false;
            });

            console.log('✅ Credit Store: Credit adjustment approved:', adjustmentId);
            return approvedAdjustment;
          } catch (error) {
            console.error('❌ Credit Store: Failed to approve credit adjustment:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to approve credit adjustment';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Reject credit adjustment
         */
        rejectCreditAdjustment: async (adjustmentId: string, rejectedBy: string, reason: string): Promise<void> => {
          console.log('❌ Credit Store: Rejecting credit adjustment:', { adjustmentId, reason });

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            // TODO: Implement reject functionality in CreditService
            // await CreditService.rejectCreditAdjustment(adjustmentId, rejectedBy, reason);

            set((state) => {
              // Remove from pending approvals
              state.pendingApprovals = state.pendingApprovals.filter((adj) => adj.id !== adjustmentId);
              state.loading = false;
            });

            console.log('✅ Credit Store: Credit adjustment rejected:', adjustmentId);
          } catch (error) {
            console.error('❌ Credit Store: Failed to reject credit adjustment:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to reject credit adjustment';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Load pending approvals
         */
        loadPendingApprovals: async (agencyId: string): Promise<void> => {
          console.log('📋 Credit Store: Loading pending approvals for agency:', agencyId);

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            // TODO: Implement getPendingApprovals in CreditService
            // const pendingApprovals = await CreditService.getPendingApprovals(agencyId);

            // Mock data for now
            const pendingApprovals: CreditLimitAdjustment[] = [];

            set((state) => {
              state.pendingApprovals = pendingApprovals;
              state.loading = false;
            });

            console.log('✅ Credit Store: Pending approvals loaded:', pendingApprovals.length);
          } catch (error) {
            console.error('❌ Credit Store: Failed to load pending approvals:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to load pending approvals';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Load credit analytics
         */
        loadCreditAnalytics: async (agencyId: string, dateFrom: Date, dateTo: Date): Promise<void> => {
          console.log('📊 Credit Store: Loading credit analytics:', { agencyId, dateFrom, dateTo });

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            const analytics = await CreditService.getCreditAnalytics(agencyId, dateFrom, dateTo);

            set((state) => {
              state.creditAnalytics = analytics;
              state.lastAnalyticsUpdate = new Date();
              state.loading = false;
            });

            console.log('✅ Credit Store: Credit analytics loaded');
          } catch (error) {
            console.error('❌ Credit Store: Failed to load credit analytics:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to load credit analytics';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Generate aging report
         */
        generateAgingReport: async (agencyId: string, asOfDate?: Date): Promise<void> => {
          console.log('📈 Credit Store: Generating aging report:', { agencyId, asOfDate });

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            const agingReport = await CreditService.generateAgingReport(agencyId, asOfDate);

            set((state) => {
              state.agingReport = agingReport;
              state.lastAgingReportUpdate = new Date();
              state.loading = false;
            });

            console.log('✅ Credit Store: Aging report generated:', agingReport.length);
          } catch (error) {
            console.error('❌ Credit Store: Failed to generate aging report:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to generate aging report';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Add risk alert
         */
        addRiskAlert: (customerId: string, customerName: string, riskLevel: CreditRiskLevel, reason: string): void => {
          console.log('⚠️ Credit Store: Adding risk alert:', { customerId, riskLevel, reason });

          set((state) => {
            // Remove existing alert for this customer
            state.riskAlerts = state.riskAlerts.filter((alert) => alert.customerId !== customerId);

            // Add new alert
            state.riskAlerts.push({
              customerId,
              customerName,
              riskLevel,
              reason,
              timestamp: new Date(),
            });
          });
        },

        /**
         * Clear risk alert for customer
         */
        clearRiskAlert: (customerId: string): void => {
          console.log('🗑️ Credit Store: Clearing risk alert for:', customerId);

          set((state) => {
            state.riskAlerts = state.riskAlerts.filter((alert) => alert.customerId !== customerId);
          });
        },

        /**
         * Clear all risk alerts
         */
        clearAllRiskAlerts: (): void => {
          console.log('🗑️ Credit Store: Clearing all risk alerts');

          set((state) => {
            state.riskAlerts = [];
          });
        },

        /**
         * Update credit settings
         */
        updateCreditSettings: (newSettings: Partial<CreditState['creditSettings']>): void => {
          console.log('⚙️ Credit Store: Updating credit settings:', newSettings);

          set((state) => {
            state.creditSettings = { ...state.creditSettings, ...newSettings };
          });
        },

        /**
         * Reset credit settings to defaults
         */
        resetCreditSettings: (): void => {
          console.log('🔄 Credit Store: Resetting credit settings to defaults');

          set((state) => {
            state.creditSettings = { ...defaultCreditSettings };
          });
        },

        /**
         * Refresh all credit data
         */
        refresh: async (): Promise<void> => {
          console.log('🔄 Credit Store: Refreshing all credit data');

          const { loadCreditAnalytics, generateAgingReport, loadPendingApprovals } = get();
          const agencyId = 'current-agency-id'; // TODO: Get from agency store

          try {
            await Promise.all([
              loadCreditAnalytics(agencyId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
              generateAgingReport(agencyId),
              loadPendingApprovals(agencyId),
            ]);

            console.log('✅ Credit Store: Refresh completed');
          } catch (error) {
            console.error('❌ Credit Store: Refresh failed:', error);
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
          console.log('🗑️ Credit Store: Clearing cache');

          set((state) => {
            state.creditAccounts = {};
            state.selectedCreditAccount = null;
            state.creditAnalytics = null;
            state.agingReport = [];
            state.recentCreditChecks = {};
            state.creditCheckCache = {};
            state.lastAnalyticsUpdate = null;
            state.lastAgingReportUpdate = null;
          });
        },
      })),
      {
        name: 'flowlytix-credit-store',
        // Persist important settings and minimal data
        partialize: (state) => ({
          creditSettings: state.creditSettings,
          riskAlerts: state.riskAlerts,
        }),
      }
    ),
    {
      name: 'CreditStore',
    }
  )
);

/**
 * Credit store action hooks for better component integration
 */
export const useCreditActions = () => {
  const store = useCreditStore();

  return {
    getCreditAccount: store.getCreditAccount,
    refreshCreditAccount: store.refreshCreditAccount,
    selectCreditAccount: store.selectCreditAccount,
    clearSelectedCreditAccount: store.clearSelectedCreditAccount,
    performCreditCheck: store.performCreditCheck,
    getCachedCreditCheck: store.getCachedCreditCheck,
    clearCreditCheckCache: store.clearCreditCheckCache,
    requestCreditLimitAdjustment: store.requestCreditLimitAdjustment,
    approveCreditAdjustment: store.approveCreditAdjustment,
    rejectCreditAdjustment: store.rejectCreditAdjustment,
    loadPendingApprovals: store.loadPendingApprovals,
    loadCreditAnalytics: store.loadCreditAnalytics,
    generateAgingReport: store.generateAgingReport,
    addRiskAlert: store.addRiskAlert,
    clearRiskAlert: store.clearRiskAlert,
    clearAllRiskAlerts: store.clearAllRiskAlerts,
    updateCreditSettings: store.updateCreditSettings,
    resetCreditSettings: store.resetCreditSettings,
    refresh: store.refresh,
    clearError: store.clearError,
    clearCache: store.clearCache,
  };
};

/**
 * Credit store state hooks for reactive components
 */
export const useCreditState = () => {
  const store = useCreditStore();

  return {
    creditAccounts: store.creditAccounts,
    selectedCreditAccount: store.selectedCreditAccount,
    creditAnalytics: store.creditAnalytics,
    agingReport: store.agingReport,
    recentCreditChecks: store.recentCreditChecks,
    pendingApprovals: store.pendingApprovals,
    loading: store.loading,
    error: store.error,
    lastAnalyticsUpdate: store.lastAnalyticsUpdate,
    lastAgingReportUpdate: store.lastAgingReportUpdate,
    riskAlerts: store.riskAlerts,
    creditSettings: store.creditSettings,
  };
};
