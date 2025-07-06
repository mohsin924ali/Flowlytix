/**
 * Custom hook for credit management
 * Combines store actions and state with additional utility functions
 * Following Instructions standards for hooks and business logic separation
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useCreditStore, useCreditActions, useCreditState } from '../store/credit.store';
import { useAgencyStore } from '../store/agency.store';
import { useAuthStore } from '../store/auth.store';
import type {
  CreditAccount,
  CreditCheckRequest,
  CreditCheckResult,
  CreditLimitAdjustmentForm,
  CreditAnalytics,
  AgingReportItem,
} from '../domains/payment/types/PaymentTypes';
import { CreditStatus, CreditRiskLevel } from '../domains/payment/valueObjects/PaymentStatus';

/**
 * Credit hook return type
 */
export interface UseCreditReturn {
  // Core credit data
  creditAccounts: Record<string, CreditAccount>;
  selectedCreditAccount: CreditAccount | null;
  creditAnalytics: CreditAnalytics | null;
  agingReport: AgingReportItem[];

  // Credit checks and approvals
  recentCreditChecks: Record<string, CreditCheckResult>;
  pendingApprovals: any[]; // CreditLimitAdjustment[]
  riskAlerts: any[]; // RiskAlert[]

  // UI state
  loading: boolean;
  error: string | null;

  // Settings
  creditSettings: any; // CreditSettings

  // Actions
  getCreditAccount: (customerId: string) => Promise<CreditAccount | null>;
  refreshCreditAccount: (customerId: string) => Promise<void>;
  selectCreditAccount: (customerId: string) => Promise<void>;
  clearSelectedCreditAccount: () => void;

  // Credit checks
  performCreditCheck: (customerId: string, amount: number, orderType?: string) => Promise<CreditCheckResult>;
  getCachedCreditCheck: (customerId: string) => CreditCheckResult | null;
  clearCreditCheckCache: (customerId?: string) => void;

  // Credit adjustments
  requestCreditAdjustment: (data: CreditLimitAdjustmentForm) => Promise<any>;
  approveCreditAdjustment: (adjustmentId: string) => Promise<any>;
  rejectCreditAdjustment: (adjustmentId: string, reason: string) => Promise<void>;

  // Analytics and reporting
  loadAnalytics: (dateFrom: Date, dateTo: Date) => Promise<void>;
  generateAgingReport: (asOfDate?: Date) => Promise<void>;

  // Risk management
  addRiskAlert: (customerId: string, customerName: string, riskLevel: CreditRiskLevel, reason: string) => void;
  clearRiskAlert: (customerId: string) => void;

  // Utility functions
  refresh: () => Promise<void>;
  clearError: () => void;

  // Computed values
  highRiskAccounts: CreditAccount[];
  accountsNearLimit: CreditAccount[];
  overdueAccounts: CreditAccount[];

  // Status helpers
  getCreditStatusColor: (status: CreditStatus) => string;
  getCreditStatusText: (status: CreditStatus) => string;
  getRiskLevelColor: (level: CreditRiskLevel) => string;
  getRiskLevelText: (level: CreditRiskLevel) => string;
  isAccountInGoodStanding: (account: CreditAccount) => boolean;
  canExtendCredit: (account: CreditAccount, amount: number) => boolean;
}

/**
 * Hook for credit management
 */
export const useCredit = (): UseCreditReturn => {
  // Store hooks
  const actions = useCreditActions();
  const state = useCreditState();

  // Context hooks
  const currentAgency = useAgencyStore((state) => state.currentAgency);
  const currentUser = useAuthStore((state) => state.user);

  // Memoized computed values
  const highRiskAccounts = useMemo(() => {
    return Object.values(state.creditAccounts).filter(
      (account) => account.riskLevel === CreditRiskLevel.HIGH || account.riskLevel === CreditRiskLevel.CRITICAL
    );
  }, [state.creditAccounts]);

  const accountsNearLimit = useMemo(() => {
    return Object.values(state.creditAccounts).filter((account) => {
      const utilizationRate = account.outstandingBalance / account.creditLimit;
      return utilizationRate >= 0.9; // 90% utilization or higher
    });
  }, [state.creditAccounts]);

  const overdueAccounts = useMemo(() => {
    return Object.values(state.creditAccounts).filter((account) => account.overdueBalance > 0);
  }, [state.creditAccounts]);

  // Enhanced actions with context
  const getCreditAccount = useCallback(
    async (customerId: string): Promise<CreditAccount | null> => {
      console.log('💳 useCredit: Getting credit account for:', customerId);

      try {
        return await actions.getCreditAccount(customerId);
      } catch (error) {
        console.error('❌ useCredit: Failed to get credit account:', error);
        return null;
      }
    },
    [actions]
  );

  const performCreditCheck = useCallback(
    async (customerId: string, amount: number, orderType = 'regular'): Promise<CreditCheckResult> => {
      console.log('🔍 useCredit: Performing credit check:', { customerId, amount, orderType });

      const request: CreditCheckRequest = {
        customerId,
        amount,
        orderType,
        requestedBy: currentUser?.id || 'unknown',
        agencyId: currentAgency?.id || 'unknown',
        timestamp: new Date(),
      };

      try {
        const result = await actions.performCreditCheck(request);

        // Auto-refresh credit account if check failed
        if (!result.approved) {
          await actions.refreshCreditAccount(customerId);
        }

        return result;
      } catch (error) {
        console.error('❌ useCredit: Failed to perform credit check:', error);
        throw error;
      }
    },
    [actions, currentUser, currentAgency]
  );

  const requestCreditAdjustment = useCallback(
    async (data: CreditLimitAdjustmentForm) => {
      console.log('📝 useCredit: Requesting credit adjustment');

      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      if (!currentAgency?.id) {
        throw new Error('No agency selected');
      }

      try {
        const adjustment = await actions.requestCreditLimitAdjustment(data, currentUser.id, currentAgency.id);

        // Auto-refresh analytics if loaded
        if (state.creditAnalytics) {
          await loadAnalytics(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
        }

        return adjustment;
      } catch (error) {
        console.error('❌ useCredit: Failed to request credit adjustment:', error);
        throw error;
      }
    },
    [actions, currentUser, currentAgency, state.creditAnalytics]
  );

  const approveCreditAdjustment = useCallback(
    async (adjustmentId: string) => {
      console.log('✅ useCredit: Approving credit adjustment:', adjustmentId);

      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      try {
        const adjustment = await actions.approveCreditAdjustment(adjustmentId, currentUser.id);

        // Auto-refresh analytics if loaded
        if (state.creditAnalytics) {
          await loadAnalytics(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
        }

        return adjustment;
      } catch (error) {
        console.error('❌ useCredit: Failed to approve credit adjustment:', error);
        throw error;
      }
    },
    [actions, currentUser, state.creditAnalytics]
  );

  const rejectCreditAdjustment = useCallback(
    async (adjustmentId: string, reason: string) => {
      console.log('❌ useCredit: Rejecting credit adjustment:', adjustmentId);

      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      try {
        await actions.rejectCreditAdjustment(adjustmentId, currentUser.id, reason);
      } catch (error) {
        console.error('❌ useCredit: Failed to reject credit adjustment:', error);
        throw error;
      }
    },
    [actions, currentUser]
  );

  const loadAnalytics = useCallback(
    async (dateFrom: Date, dateTo: Date) => {
      console.log('📊 useCredit: Loading analytics');

      if (!currentAgency?.id) {
        console.warn('⚠️ useCredit: No agency selected for analytics');
        return;
      }

      try {
        await actions.loadCreditAnalytics(currentAgency.id, dateFrom, dateTo);
      } catch (error) {
        console.error('❌ useCredit: Failed to load analytics:', error);
      }
    },
    [actions, currentAgency]
  );

  const generateAgingReport = useCallback(
    async (asOfDate?: Date) => {
      console.log('📈 useCredit: Generating aging report');

      if (!currentAgency?.id) {
        console.warn('⚠️ useCredit: No agency selected for aging report');
        return;
      }

      try {
        await actions.generateAgingReport(currentAgency.id, asOfDate);
      } catch (error) {
        console.error('❌ useCredit: Failed to generate aging report:', error);
      }
    },
    [actions, currentAgency]
  );

  // Utility functions
  const getCreditStatusColor = useCallback((status: CreditStatus): string => {
    switch (status) {
      case CreditStatus.GOOD:
        return '#4caf50'; // Green
      case CreditStatus.FAIR:
        return '#ff9800'; // Orange
      case CreditStatus.POOR:
        return '#f44336'; // Red
      case CreditStatus.BLOCKED:
      case CreditStatus.SUSPENDED:
        return '#9e9e9e'; // Grey
      case CreditStatus.UNDER_REVIEW:
        return '#2196f3'; // Blue
      default:
        return '#757575'; // Grey
    }
  }, []);

  const getCreditStatusText = useCallback((status: CreditStatus): string => {
    switch (status) {
      case CreditStatus.GOOD:
        return 'Good';
      case CreditStatus.FAIR:
        return 'Fair';
      case CreditStatus.POOR:
        return 'Poor';
      case CreditStatus.BLOCKED:
        return 'Blocked';
      case CreditStatus.SUSPENDED:
        return 'Suspended';
      case CreditStatus.UNDER_REVIEW:
        return 'Under Review';
      default:
        return 'Unknown';
    }
  }, []);

  const getRiskLevelColor = useCallback((level: CreditRiskLevel): string => {
    switch (level) {
      case CreditRiskLevel.MINIMAL:
        return '#4caf50'; // Green
      case CreditRiskLevel.LOW:
        return '#8bc34a'; // Light Green
      case CreditRiskLevel.MODERATE:
        return '#ff9800'; // Orange
      case CreditRiskLevel.HIGH:
        return '#f44336'; // Red
      case CreditRiskLevel.CRITICAL:
        return '#9c27b0'; // Purple
      default:
        return '#757575'; // Grey
    }
  }, []);

  const getRiskLevelText = useCallback((level: CreditRiskLevel): string => {
    switch (level) {
      case CreditRiskLevel.MINIMAL:
        return 'Minimal';
      case CreditRiskLevel.LOW:
        return 'Low';
      case CreditRiskLevel.MODERATE:
        return 'Moderate';
      case CreditRiskLevel.HIGH:
        return 'High';
      case CreditRiskLevel.CRITICAL:
        return 'Critical';
      default:
        return 'Unknown';
    }
  }, []);

  const isAccountInGoodStanding = useCallback((account: CreditAccount): boolean => {
    return (
      account.status === CreditStatus.GOOD &&
      account.overdueBalance === 0 &&
      account.riskLevel !== CreditRiskLevel.HIGH &&
      account.riskLevel !== CreditRiskLevel.CRITICAL
    );
  }, []);

  const canExtendCredit = useCallback((account: CreditAccount, amount: number): boolean => {
    const availableCredit = account.creditLimit - account.outstandingBalance;
    return (
      availableCredit >= amount && account.status !== CreditStatus.BLOCKED && account.status !== CreditStatus.SUSPENDED
    );
  }, []);

  // Auto-load pending approvals on mount if agency is available
  useEffect(() => {
    if (currentAgency?.id && state.pendingApprovals.length === 0 && !state.loading) {
      actions.loadPendingApprovals(currentAgency.id);
    }
  }, [currentAgency, state.pendingApprovals.length, state.loading, actions]);

  return {
    // Core credit data
    creditAccounts: state.creditAccounts,
    selectedCreditAccount: state.selectedCreditAccount,
    creditAnalytics: state.creditAnalytics,
    agingReport: state.agingReport,

    // Credit checks and approvals
    recentCreditChecks: state.recentCreditChecks,
    pendingApprovals: state.pendingApprovals,
    riskAlerts: state.riskAlerts,

    // UI state
    loading: state.loading,
    error: state.error,

    // Settings
    creditSettings: state.creditSettings,

    // Actions
    getCreditAccount,
    refreshCreditAccount: actions.refreshCreditAccount,
    selectCreditAccount: actions.selectCreditAccount,
    clearSelectedCreditAccount: actions.clearSelectedCreditAccount,

    // Credit checks
    performCreditCheck,
    getCachedCreditCheck: actions.getCachedCreditCheck,
    clearCreditCheckCache: actions.clearCreditCheckCache,

    // Credit adjustments
    requestCreditAdjustment,
    approveCreditAdjustment,
    rejectCreditAdjustment,

    // Analytics and reporting
    loadAnalytics,
    generateAgingReport,

    // Risk management
    addRiskAlert: actions.addRiskAlert,
    clearRiskAlert: actions.clearRiskAlert,

    // Utility functions
    refresh: actions.refresh,
    clearError: actions.clearError,

    // Computed values
    highRiskAccounts,
    accountsNearLimit,
    overdueAccounts,

    // Status helpers
    getCreditStatusColor,
    getCreditStatusText,
    getRiskLevelColor,
    getRiskLevelText,
    isAccountInGoodStanding,
    canExtendCredit,
  };
};

/**
 * Hook for credit analytics and reporting
 */
export const useCreditAnalytics = (dateFrom?: Date, dateTo?: Date) => {
  const { creditAnalytics, loadAnalytics, loading, error } = useCredit();

  // Auto-load analytics when dates change
  useEffect(() => {
    if (dateFrom && dateTo) {
      loadAnalytics(dateFrom, dateTo);
    }
  }, [dateFrom, dateTo, loadAnalytics]);

  const analytics = useMemo(() => {
    if (!creditAnalytics) return null;

    return {
      ...creditAnalytics,
      // Additional computed analytics can be added here
      averageCreditLimit:
        creditAnalytics.totalAccounts > 0 ? creditAnalytics.totalCreditLimit / creditAnalytics.totalAccounts : 0,
      utilizationRate:
        creditAnalytics.totalCreditLimit > 0
          ? (creditAnalytics.totalOutstanding / creditAnalytics.totalCreditLimit) * 100
          : 0,
      overdueRate:
        creditAnalytics.totalOutstanding > 0
          ? (creditAnalytics.totalOverdue / creditAnalytics.totalOutstanding) * 100
          : 0,
    };
  }, [creditAnalytics]);

  return {
    analytics,
    loading,
    error,
    refresh: () => dateFrom && dateTo && loadAnalytics(dateFrom, dateTo),
  };
};

/**
 * Hook for credit risk management
 */
export const useCreditRisk = () => {
  const { highRiskAccounts, accountsNearLimit, overdueAccounts, riskAlerts, addRiskAlert, clearRiskAlert } =
    useCredit();

  const criticalRiskAccounts = useMemo(() => {
    return highRiskAccounts.filter((account) => account.riskLevel === CreditRiskLevel.CRITICAL);
  }, [highRiskAccounts]);

  const accountsRequiringAttention = useMemo(() => {
    const uniqueAccounts = new Set([
      ...highRiskAccounts.map((a) => a.customerId),
      ...accountsNearLimit.map((a) => a.customerId),
      ...overdueAccounts.map((a) => a.customerId),
    ]);

    return Array.from(uniqueAccounts);
  }, [highRiskAccounts, accountsNearLimit, overdueAccounts]);

  return {
    highRiskAccounts,
    criticalRiskAccounts,
    accountsNearLimit,
    overdueAccounts,
    accountsRequiringAttention,
    riskAlerts,
    addRiskAlert,
    clearRiskAlert,
  };
};
