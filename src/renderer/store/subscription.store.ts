/**
 * Subscription Store using Zustand
 * Implements the 5-step user flow for subscription management
 * Following Instructions standards for state management
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Global initialization guard
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Subscription types and interfaces
export interface SubscriptionState {
  // Core subscription data
  isActivated: boolean;
  subscriptionTier: string | null;
  expiresAt: Date | null;
  deviceId: string | null;
  gracePeriodDays: number;
  isInGracePeriod: boolean;
  daysRemaining: number;
  lastValidatedAt: Date | null;
  needsOnlineValidation: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;
  activationInProgress: boolean;
  syncInProgress: boolean;

  // Feature access cache
  featureAccessCache: Record<string, { hasAccess: boolean; lastChecked: number }>;

  // Warning state
  expiryWarning: {
    shouldShow: boolean;
    type: 'approaching' | 'grace_period' | 'expired';
    daysRemaining: number;
    message: string;
  } | null;

  // Device info
  deviceDescription: string | null;
}

export interface ActivationCredentials {
  licenseKey?: string;
  email?: string;
  password?: string;
}

export interface SubscriptionStore extends SubscriptionState {
  // Step 1: First Install/Activation Actions
  activateDevice: (credentials: ActivationCredentials) => Promise<boolean>;
  checkNeedsActivation: () => Promise<boolean>;

  // Step 2: Normal Daily Use Actions
  validateOnStartup: () => Promise<boolean>;
  getCurrentState: () => Promise<void>;
  initializeSubscription: () => Promise<void>;

  // Step 3: Periodic Sync Actions
  performPeriodicSync: () => Promise<boolean>;
  scheduleBackgroundSync: () => void;

  // Step 4: Expiry Warning Actions
  checkExpiryWarning: () => Promise<void>;
  dismissExpiryWarning: () => void;

  // Step 5: Feature Access Actions
  checkFeatureAccess: (featureId: string) => Promise<boolean>;
  clearFeatureAccessCache: () => void;

  // Utility Actions
  resetSubscription: () => Promise<boolean>;
  getDeviceDescription: () => Promise<void>;
  clearError: () => void;

  // Internal state management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Initial subscription state
 */
const initialState: SubscriptionState = {
  // Core subscription data
  isActivated: false,
  subscriptionTier: null,
  expiresAt: null,
  deviceId: null,
  gracePeriodDays: 0,
  isInGracePeriod: false,
  daysRemaining: 0,
  lastValidatedAt: null,
  needsOnlineValidation: false,

  // UI state
  isLoading: false,
  error: null,
  activationInProgress: false,
  syncInProgress: false,

  // Feature access cache
  featureAccessCache: {},

  // Warning state
  expiryWarning: null,

  // Device info
  deviceDescription: null,
};

/**
 * Subscription store implementation
 */
export const useSubscriptionStore = create<SubscriptionStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        /**
         * Initialize subscription system (only once per session)
         */
        initializeSubscription: async (): Promise<void> => {
          // Return existing promise if already initializing
          if (initializationPromise) {
            return initializationPromise;
          }

          // Return immediately if already initialized
          if (isInitialized) {
            return;
          }

          console.log('🚀 Store: Starting subscription initialization...');

          // Create initialization promise
          initializationPromise = (async () => {
            try {
              // Get device description
              await get().getDeviceDescription();

              // Validate on startup
              await get().validateOnStartup();

              // Schedule background sync
              get().scheduleBackgroundSync();

              isInitialized = true;
              console.log('✅ Store: Subscription initialization completed');
            } catch (error) {
              console.error('❌ Store: Subscription initialization failed:', error);
              // Reset so it can be retried
              isInitialized = false;
              initializationPromise = null;
              throw error;
            }
          })();

          return initializationPromise;
        },

        /**
         * STEP 1: FIRST INSTALL/ACTIVATION FLOW
         * Activate device with license key or credentials
         */
        activateDevice: async (credentials: ActivationCredentials): Promise<boolean> => {
          console.log('🛠 Store: Starting device activation flow...');

          set((state) => {
            state.activationInProgress = true;
            state.isLoading = true;
            state.error = null;
          });

          try {
            // Check if electron API is available
            if (!window.electronAPI?.subscription) {
              throw new Error('Subscription API not available');
            }

            const response = await window.electronAPI.subscription.activateDevice(credentials);

            if (response.success) {
              console.log('✅ Store: Device activation successful');

              set((state) => {
                state.isActivated = true;
                state.subscriptionTier = response.subscription?.tier || null;
                state.expiresAt = response.subscription?.expiresAt ? new Date(response.subscription.expiresAt) : null;
                state.deviceId = response.subscription?.deviceId || null;
                state.gracePeriodDays = response.subscription?.gracePeriodDays || 0;
                state.lastValidatedAt = new Date();
                state.activationInProgress = false;
                state.isLoading = false;
                state.error = null;
              });

              // Get updated state after activation
              await get().getCurrentState();
              return true;
            } else {
              throw new Error(response.error || 'Activation failed');
            }
          } catch (error) {
            console.error('❌ Store: Device activation failed:', error);

            set((state) => {
              state.activationInProgress = false;
              state.isLoading = false;
              state.error = error instanceof Error ? error.message : 'Activation failed';
            });

            return false;
          }
        },

        /**
         * Check if device needs activation
         */
        checkNeedsActivation: async (): Promise<boolean> => {
          try {
            if (!window.electronAPI?.subscription) {
              return true; // Assume needs activation if API not available
            }

            const response = await window.electronAPI.subscription.needsActivation();
            return response.success ? response.data : true;
          } catch (error) {
            console.error('❌ Store: Check needs activation failed:', error);
            return true;
          }
        },

        /**
         * STEP 2: NORMAL DAILY USE (OFFLINE-FIRST)
         * Validate subscription on app startup
         */
        validateOnStartup: async (): Promise<boolean> => {
          // Skip if already initialized to prevent loops
          if (isInitialized) {
            console.log('🔄 Store: Skipping validation - already initialized');
            return true;
          }

          console.log('🌐 Store: Starting startup validation...');

          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            console.log('🔍 Store: Checking subscription API availability...');
            console.log('🔍 Store: window.electronAPI exists:', !!window.electronAPI);
            console.log('🔍 Store: window.electronAPI.subscription exists:', !!window.electronAPI?.subscription);
            console.log('🔍 Store: window.electronAPI type:', typeof window.electronAPI);
            if (window.electronAPI) {
              console.log('🔍 Store: window.electronAPI keys:', Object.keys(window.electronAPI));
            }

            if (!window.electronAPI?.subscription) {
              throw new Error('Subscription API not available');
            }

            const response = await window.electronAPI.subscription.validateStartup();

            if (response.success && response.data) {
              console.log('✅ Store: Startup validation successful');

              set((state) => {
                const data = response.data;
                state.isActivated = data.isActivated;
                state.subscriptionTier = data.subscriptionTier;
                state.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
                state.deviceId = data.deviceId;
                state.gracePeriodDays = data.gracePeriodDays;
                state.isInGracePeriod = data.isInGracePeriod;
                state.daysRemaining = data.daysRemaining;
                state.lastValidatedAt = data.lastValidatedAt ? new Date(data.lastValidatedAt) : null;
                state.needsOnlineValidation = data.needsOnlineValidation;
                state.isLoading = false;
                state.error = null;
              });

              // Check for expiry warnings
              await get().checkExpiryWarning();
              return true;
            } else {
              throw new Error(response.error || 'Startup validation failed');
            }
          } catch (error) {
            console.error('❌ Store: Startup validation failed:', error);

            set((state) => {
              state.isLoading = false;
              state.error = error instanceof Error ? error.message : 'Startup validation failed';
            });

            return false;
          }
        },

        /**
         * Get current subscription state
         */
        getCurrentState: async (): Promise<void> => {
          try {
            if (!window.electronAPI?.subscription) {
              return;
            }

            const response = await window.electronAPI.subscription.getCurrentState();

            if (response.success && response.data) {
              set((state) => {
                const data = response.data;
                state.isActivated = data.isActivated;
                state.subscriptionTier = data.subscriptionTier;
                state.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
                state.deviceId = data.deviceId;
                state.gracePeriodDays = data.gracePeriodDays;
                state.isInGracePeriod = data.isInGracePeriod;
                state.daysRemaining = data.daysRemaining;
                state.lastValidatedAt = data.lastValidatedAt ? new Date(data.lastValidatedAt) : null;
                state.needsOnlineValidation = data.needsOnlineValidation;
              });
            }
          } catch (error) {
            console.error('❌ Store: Get current state failed:', error);
          }
        },

        /**
         * STEP 3: PERIODIC SYNC (ONLINE)
         * Sync with licensing server when internet is available
         */
        performPeriodicSync: async (): Promise<boolean> => {
          console.log('🔄 Store: Starting periodic sync...');

          set((state) => {
            state.syncInProgress = true;
          });

          try {
            if (!window.electronAPI?.subscription) {
              throw new Error('Subscription API not available');
            }

            const response = await window.electronAPI.subscription.performSync();

            if (response.success) {
              console.log('✅ Store: Periodic sync successful');

              // Refresh state after sync
              await get().getCurrentState();
              await get().checkExpiryWarning();

              set((state) => {
                state.syncInProgress = false;
                state.lastValidatedAt = new Date();
                state.needsOnlineValidation = false;
              });

              return true;
            } else {
              console.log('⚠️ Store: Periodic sync failed (offline?):', response.error);

              set((state) => {
                state.syncInProgress = false;
              });

              return false;
            }
          } catch (error) {
            console.error('❌ Store: Periodic sync error:', error);

            set((state) => {
              state.syncInProgress = false;
            });

            return false;
          }
        },

        /**
         * Schedule background sync (called on startup and periodically)
         */
        scheduleBackgroundSync: (): void => {
          const state = get();

          // Only schedule if activated and needs validation
          if (state.isActivated && state.needsOnlineValidation) {
            // Schedule sync in 30 seconds
            setTimeout(() => {
              get().performPeriodicSync();
            }, 30000);
          }
        },

        /**
         * STEP 4: APPROACHING EXPIRY & GRACE PERIOD
         * Check for expiry warnings
         */
        checkExpiryWarning: async (): Promise<void> => {
          try {
            if (!window.electronAPI?.subscription) {
              return;
            }

            const response = await window.electronAPI.subscription.getExpiryWarning();

            // Add null check before accessing response properties
            if (response && response.success && response.data) {
              set((state) => {
                state.expiryWarning = response.data;
              });
            }
          } catch (error) {
            console.error('❌ Store: Check expiry warning failed:', error);
          }
        },

        /**
         * Dismiss expiry warning
         */
        dismissExpiryWarning: (): void => {
          set((state) => {
            state.expiryWarning = null;
          });
        },

        /**
         * STEP 5: AFTER EXPIRY/GRACE PERIOD
         * Check feature access with caching
         */
        checkFeatureAccess: async (featureId: string): Promise<boolean> => {
          const state = get();
          const now = Date.now();
          const cacheEntry = state.featureAccessCache[featureId];

          // Use cache if recent (5 minutes)
          if (cacheEntry && now - cacheEntry.lastChecked < 5 * 60 * 1000) {
            return cacheEntry.hasAccess;
          }

          try {
            if (!window.electronAPI?.subscription) {
              return false;
            }

            const response = await window.electronAPI.subscription.checkFeatureAccess(featureId);

            if (response.success && response.data) {
              const hasAccess = response.data.hasAccess;

              set((state) => {
                state.featureAccessCache[featureId] = {
                  hasAccess,
                  lastChecked: now,
                };
              });

              return hasAccess;
            }

            return false;
          } catch (error) {
            console.error(`❌ Store: Check feature access failed for ${featureId}:`, error);
            return false;
          }
        },

        /**
         * Clear feature access cache
         */
        clearFeatureAccessCache: (): void => {
          set((state) => {
            state.featureAccessCache = {};
          });
        },

        /**
         * Reset subscription (for testing/development)
         */
        resetSubscription: async (): Promise<boolean> => {
          try {
            if (!window.electronAPI?.subscription) {
              return false;
            }

            const response = await window.electronAPI.subscription.resetSubscription();

            if (response.success) {
              // Reset global initialization state
              isInitialized = false;
              initializationPromise = null;

              set(() => ({ ...initialState }));
              return true;
            }

            return false;
          } catch (error) {
            console.error('❌ Store: Reset subscription failed:', error);
            return false;
          }
        },

        /**
         * Get device description for display
         */
        getDeviceDescription: async (): Promise<void> => {
          try {
            if (!window.electronAPI?.subscription) {
              return;
            }

            const response = await window.electronAPI.subscription.getDeviceDescription();

            if (response.success && response.data) {
              set((state) => {
                state.deviceDescription = response.data;
              });
            }
          } catch (error) {
            console.error('❌ Store: Get device description failed:', error);
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
         * Set loading state
         */
        setLoading: (loading: boolean): void => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        /**
         * Set error state
         */
        setError: (error: string | null): void => {
          set((state) => {
            state.error = error;
          });
        },
      })),
      {
        name: 'subscription-store',
        partialize: (state) => ({
          // Only persist essential data, not UI state
          isActivated: state.isActivated,
          subscriptionTier: state.subscriptionTier,
          expiresAt: state.expiresAt,
          deviceId: state.deviceId,
          gracePeriodDays: state.gracePeriodDays,
          lastValidatedAt: state.lastValidatedAt,
          deviceDescription: state.deviceDescription,
        }),
      }
    ),
    { name: 'subscription-store' }
  )
);
