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
  subscriptionStatus: string | null; // 'active', 'expired', 'suspended', 'cancelled'
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
  subscriptionStatus: null,
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
              console.log('🔧 Store: Starting device description...');
              // Get device description
              await get().getDeviceDescription();

              console.log('🔧 Store: Starting validation on startup...');
              // Validate on startup
              await get().validateOnStartup();

              console.log('🔧 Store: Scheduling background sync...');
              // Schedule background sync
              get().scheduleBackgroundSync();

              // Don't perform initial sync here - only sync after activation or if subscription exists
              console.log('🔧 Store: Skipping initial sync - will sync after activation or if subscription exists');

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
                state.subscriptionStatus = 'active'; // New activations are always active
                state.subscriptionTier = response.subscription?.tier || null;
                state.expiresAt = response.subscription?.expiresAt ? new Date(response.subscription.expiresAt) : null;
                state.deviceId = response.subscription?.deviceId || null;
                state.gracePeriodDays = response.subscription?.gracePeriodDays || 0;
                state.lastValidatedAt = new Date();
                state.activationInProgress = false;
                state.isLoading = false;
                state.error = null;
              });

              // Log the updated state to ensure it's properly set
              console.log('🔄 Store: State updated after activation:', {
                isActivated: get().isActivated,
                subscriptionTier: get().subscriptionTier,
                deviceId: get().deviceId,
                error: get().error,
                isLoading: get().isLoading,
                activationInProgress: get().activationInProgress,
              });

              // CRITICAL FIX: Don't call getCurrentState immediately after activation
              // as it might overwrite the state that was just set based on the successful activation response
              // The state has already been updated based on the activation response above

              // Final verification that the state is correct
              console.log('✅ Store: Final state verification after activation:', {
                isActivated: get().isActivated,
                subscriptionTier: get().subscriptionTier,
              });

              // CRITICAL: Perform sync after activation to get latest status from server
              console.log('🔄 Store: Performing post-activation sync to get latest status...');
              try {
                await get().performPeriodicSync();
                console.log('✅ Store: Post-activation sync completed');
              } catch (syncError) {
                console.error('❌ Store: Post-activation sync failed:', syncError);
                // Don't fail activation if sync fails, but log it
              }

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
          console.log('🌐 Store: validateOnStartup called');

          // Skip if already initialized to prevent loops
          if (isInitialized) {
            console.log('🔄 Store: Skipping validation - already initialized');
            return true;
          }

          // CRITICAL FIX: Skip validation if we just completed an activation
          // This prevents the validation from overwriting the activated state
          const currentState = get();
          if (currentState.isActivated && currentState.activationInProgress === false) {
            console.log('🔄 Store: Skipping validation - device was just activated');
            set((state) => {
              state.isLoading = false;
              state.error = null;
            });
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
                state.subscriptionStatus = data.subscriptionStatus || null;
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

              // CRITICAL: Perform sync after startup validation to get latest status from server
              console.log('🔄 Store: Performing post-validation sync to check server status...');
              try {
                await get().performPeriodicSync();
                console.log('✅ Store: Post-validation sync completed');
              } catch (syncError) {
                console.error('❌ Store: Post-validation sync failed:', syncError);
                // Don't fail validation if sync fails
              }

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
              console.log('🔄 Store: getCurrentState received data:', response.data);
              set((state) => {
                const data = response.data;
                state.isActivated = data.isActivated;
                state.subscriptionStatus = data.subscriptionStatus || null;
                state.subscriptionTier = data.subscriptionTier;
                state.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
                state.deviceId = data.deviceId;
                state.gracePeriodDays = data.gracePeriodDays;
                state.isInGracePeriod = data.isInGracePeriod;
                state.daysRemaining = data.daysRemaining;
                state.lastValidatedAt = data.lastValidatedAt ? new Date(data.lastValidatedAt) : null;
                state.needsOnlineValidation = data.needsOnlineValidation;
              });
              console.log('🔄 Store: State updated with current subscription status');
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
          console.log('🔄 Store: performPeriodicSync called');
          console.log('🔄 Store: Starting periodic sync...');

          set((state) => {
            state.syncInProgress = true;
          });

          try {
            if (!window.electronAPI?.subscription) {
              console.log('❌ Store: Subscription API not available for sync');
              throw new Error('Subscription API not available');
            }

            console.log('🔄 Store: Calling electron API performSync...');
            const response = await window.electronAPI.subscription.performSync();
            console.log('🔄 Store: Sync response received:', response);

            if (response.success) {
              console.log('✅ Store: Periodic sync successful');

              // Refresh state after sync
              console.log('🔄 Store: Refreshing state after successful sync...');
              await get().getCurrentState();
              await get().checkExpiryWarning();
              console.log('🔄 Store: State refreshed after sync');

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
