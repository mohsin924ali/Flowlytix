/**
 * useSubscription Hook
 * Provides easy access to subscription state and actions
 * Following Instructions standards for React hooks
 */

import { useEffect, useCallback, useState } from 'react';
import { useSubscriptionStore } from '../store/subscription.store';

export interface UseSubscriptionReturn {
  // State
  isActivated: boolean;
  subscriptionTier: string | null;
  expiresAt: Date | null;
  deviceId: string | null;
  gracePeriodDays: number;
  isInGracePeriod: boolean;
  daysRemaining: number;
  lastValidatedAt: Date | null;
  needsOnlineValidation: boolean;

  // UI State
  isLoading: boolean;
  error: string | null;
  activationInProgress: boolean;
  syncInProgress: boolean;

  // Expiry Warning
  expiryWarning: {
    shouldShow: boolean;
    type: 'approaching' | 'grace_period' | 'expired';
    daysRemaining: number;
    message: string;
  } | null;

  // Device Info
  deviceDescription: string | null;

  // Actions
  activateDevice: (credentials: any) => Promise<boolean>;
  validateOnStartup: () => Promise<boolean>;
  performSync: () => Promise<boolean>;
  checkFeatureAccess: (featureId: string) => Promise<boolean>;
  checkNeedsActivation: () => Promise<boolean>;
  resetSubscription: () => Promise<boolean>;
  dismissExpiryWarning: () => void;
  clearError: () => void;

  // Computed values
  isExpired: boolean;
  isCompletelyExpired: boolean;
  shouldShowWarning: boolean;
}

/**
 * Main subscription hook
 */
export const useSubscription = (): UseSubscriptionReturn => {
  const {
    // State
    isActivated,
    subscriptionTier,
    expiresAt,
    deviceId,
    gracePeriodDays,
    isInGracePeriod,
    daysRemaining,
    lastValidatedAt,
    needsOnlineValidation,

    // UI State
    isLoading,
    error,
    activationInProgress,
    syncInProgress,

    // Expiry Warning
    expiryWarning,

    // Device Info
    deviceDescription,

    // Actions
    activateDevice,
    validateOnStartup,
    performPeriodicSync,
    checkFeatureAccess,
    checkNeedsActivation,
    resetSubscription,
    dismissExpiryWarning,
    clearError,
    scheduleBackgroundSync,
    getDeviceDescription,
  } = useSubscriptionStore();

  // Computed values
  const isExpired = expiresAt ? new Date() > expiresAt : false;
  const isCompletelyExpired = isExpired && !isInGracePeriod;
  const shouldShowWarning = expiryWarning?.shouldShow || false;

  // Initialize subscription on mount (only once)
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (hasInitialized) return;

    let mounted = true;

    const initializeSubscription = async () => {
      if (!mounted || hasInitialized) return;

      console.log('🚀 useSubscription: Initializing subscription...');

      try {
        setHasInitialized(true);

        // Use the centralized initialization method
        await useSubscriptionStore.getState().initializeSubscription();
      } catch (error) {
        console.error('❌ useSubscription: Initialization error:', error);
        setHasInitialized(false); // Reset on error to allow retry
      }
    };

    initializeSubscription();

    return () => {
      mounted = false;
    };
  }, []); // Remove hasInitialized dependency to prevent re-initialization

  // Wrapped sync function with automatic rescheduling
  const performSync = useCallback(async (): Promise<boolean> => {
    const success = await performPeriodicSync();

    // Reschedule background sync
    if (success) {
      scheduleBackgroundSync();
    }

    return success;
  }, [performPeriodicSync, scheduleBackgroundSync]);

  return {
    // State
    isActivated,
    subscriptionTier,
    expiresAt,
    deviceId,
    gracePeriodDays,
    isInGracePeriod,
    daysRemaining,
    lastValidatedAt,
    needsOnlineValidation,

    // UI State
    isLoading,
    error,
    activationInProgress,
    syncInProgress,

    // Expiry Warning
    expiryWarning,

    // Device Info
    deviceDescription,

    // Actions
    activateDevice,
    validateOnStartup,
    performSync,
    checkFeatureAccess,
    checkNeedsActivation,
    resetSubscription,
    dismissExpiryWarning,
    clearError,

    // Computed values
    isExpired,
    isCompletelyExpired,
    shouldShowWarning,
  };
};

/**
 * Hook for feature access checking
 */
export const useFeatureAccess = (featureId: string) => {
  const { checkFeatureAccess, isActivated, isCompletelyExpired } = useSubscription();

  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!isActivated || isCompletelyExpired) {
        setHasAccess(false);
        return;
      }

      setIsChecking(true);
      try {
        const access = await checkFeatureAccess(featureId);
        setHasAccess(access);
      } catch (error) {
        console.error(`Feature access check failed for ${featureId}:`, error);
        setHasAccess(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [featureId, checkFeatureAccess, isActivated, isCompletelyExpired]);

  return {
    hasAccess,
    isChecking,
    isBlocked: !hasAccess,
  };
};

/**
 * Hook for subscription status display
 */
export const useSubscriptionStatus = () => {
  const { isActivated, subscriptionTier, expiresAt, daysRemaining, isInGracePeriod, isExpired, isCompletelyExpired } =
    useSubscription();

  const getStatusColor = (): string => {
    if (!isActivated) return '#9e9e9e'; // Gray
    if (isCompletelyExpired) return '#f44336'; // Red
    if (isInGracePeriod) return '#ff9800'; // Orange
    if (daysRemaining <= 7) return '#ff9800'; // Orange
    return '#4caf50'; // Green
  };

  const getStatusText = (): string => {
    if (!isActivated) return 'Not Activated';
    if (isCompletelyExpired) return 'Expired';
    if (isInGracePeriod) return `Grace Period (${daysRemaining} days)`;
    if (isExpired) return 'Expired';
    if (daysRemaining <= 7) return `Expires in ${daysRemaining} days`;
    return 'Active';
  };

  const getTierDisplayName = (): string => {
    if (!subscriptionTier) return 'Unknown';
    return subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1);
  };

  return {
    statusColor: getStatusColor(),
    statusText: getStatusText(),
    tierDisplayName: getTierDisplayName(),
    expiryDate: expiresAt,
    daysRemaining,
    isActivated,
    isExpired,
    isInGracePeriod,
    isCompletelyExpired,
  };
};
