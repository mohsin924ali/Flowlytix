/**
 * Subscription Store using Zustand
 * Implements the 5-step user flow for subscription management
 * Following Instructions standards for state management
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Global initialization guard - SINGLETON PATTERN
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 3;

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
  forceRefreshStatus: () => Promise<boolean>;

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
         * Initialize subscription system - SINGLETON PATTERN
         * This is called once during app startup and prevents multiple simultaneous calls
         */
        initializeSubscription: async (): Promise<void> => {
          // Return existing promise if initialization is already in progress
          if (initializationPromise) {
            console.log('🔄 Store: Initialization already in progress, waiting...');
            return initializationPromise;
          }

          // Skip if already initialized successfully
          if (isInitialized) {
            console.log('🔄 Store: Already initialized successfully, skipping');
            return;
          }

          // Check attempt limit
          if (initializationAttempts >= MAX_INITIALIZATION_ATTEMPTS) {
            console.log(`🚫 Store: Maximum initialization attempts (${MAX_INITIALIZATION_ATTEMPTS}) reached, skipping`);
            return;
          }

          // Create singleton initialization promise
          initializationPromise = (async () => {
            try {
              initializationAttempts++;
              console.log(
                `🚀 Store: Starting initialization attempt ${initializationAttempts}/${MAX_INITIALIZATION_ATTEMPTS}`
              );

              set((state) => {
                state.isLoading = true;
                state.error = null;
              });

              // Validate on startup (offline-first)
              const success = await get().validateOnStartup();
              if (!success) {
                console.log('🔄 Store: Startup validation failed, device may need activation');
                // Don't return here - let the app continue to show activation screen
              }

              // Only perform additional operations if activated
              if (get().isActivated) {
                console.log('🔄 Store: Device is activated, loading additional state...');

                // Load additional state
                await get().getCurrentState();

                // Note: checkExpiryWarning and performPeriodicSync are already handled in validateOnStartup
              } else {
                console.log('🔄 Store: Device not activated, ready for activation screen');
              }

              // Mark as successfully initialized
              isInitialized = true;
              console.log('✅ Store: Subscription initialization completed successfully');
            } catch (error) {
              console.error(`❌ Store: Subscription initialization error (attempt ${initializationAttempts}):`, error);
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Initialization failed';
              });
              // Don't mark as initialized on error to allow retry
            } finally {
              set((state) => {
                state.isLoading = false;
              });
              // Clear the promise to allow future attempts if needed
              initializationPromise = null;
            }
          })();

          return initializationPromise;
        },

        /**
         * Force refresh subscription status from server
         */
        forceRefreshStatus: async (): Promise<boolean> => {
          if (!get().isActivated) {
            return false;
          }

          // Temporarily reset initialization flag to allow fresh sync
          const wasInitialized = isInitialized;
          isInitialized = false;

          set((state) => {
            state.syncInProgress = true;
            state.error = null;
          });

          try {
            const syncSuccess = await get().performPeriodicSync();
            return syncSuccess;
          } catch (error) {
            console.error('❌ Store: Force refresh failed:', error);
            set((state) => {
              state.syncInProgress = false;
              state.error = error instanceof Error ? error.message : 'Refresh failed';
            });
            return false;
          } finally {
            isInitialized = wasInitialized;
          }
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

              // SKIP: Don't perform immediate sync after activation to avoid server timing issues
              // Let background sync handle validation later when server has time to propagate device registration
              console.log('⏭️ Store: Skipping immediate post-activation sync to avoid server timing issues');
              console.log('🔄 Store: Background sync will validate the device later');

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
            return true;
          }

          // Only skip validation during active activation process
          const currentState = get();
          if (currentState.activationInProgress) {
            set((state) => {
              state.isLoading = false;
              state.error = null;
            });
            return true;
          }

          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            if (!window.electronAPI?.subscription) {
              throw new Error('Subscription API not available');
            }

            const response = await window.electronAPI.subscription.validateStartup();

            if (response.success && response.data) {
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

              // Check for expiry warnings only if activated
              if (get().isActivated) {
                await get().checkExpiryWarning();

                // Perform sync after startup validation to get latest status from server
                try {
                  await get().performPeriodicSync();
                } catch (syncError) {
                  console.error('❌ Store: Post-validation sync failed:', syncError);
                }
              } else {
                console.log('🔄 Store: Device not activated, skipping sync and expiry checks');
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
            }
          } catch (error) {
            console.error('❌ Store: Get current state failed:', error);
          }
        },

        /**
         * STEP 3: PERIODIC SYNC (ONLINE)
         * Sync subscription status with licensing server when internet is available
         */
        performPeriodicSync: async (): Promise<boolean> => {
          set((state) => {
            state.syncInProgress = true;
            state.error = null;
          });

          try {
            if (!window.electronAPI?.subscription) {
              throw new Error('Subscription API not available');
            }

            const response = await window.electronAPI.subscription.performSync();

            if (response.success && response.data.success) {
              // Check if subscription data was cleared due to invalid license
              if (response.data.shouldClearData) {
                console.log('🚨 Store: License invalidated - clearing app state');

                // SECURITY FIX: Immediately update UI state to block the app
                set((state) => {
                  state.isActivated = false;
                  state.subscriptionStatus = null;
                  state.subscriptionTier = null;
                  state.expiresAt = null;
                  state.deviceId = null;
                  state.gracePeriodDays = 0;
                  state.isInGracePeriod = false;
                  state.daysRemaining = 0;
                  state.lastValidatedAt = null;
                  state.needsOnlineValidation = true;
                  state.syncInProgress = false;
                  state.error = null; // CLEAR error - let SubscriptionGate handle the activation flow
                });

                console.log('🚨 Store: App is now blocked - activation required');
                return false; // License was invalidated
              }

              // Always refresh current state to ensure UI shows latest status
              const statusBeforeRefresh = get().subscriptionStatus;
              await get().getCurrentState();
              const statusAfterRefresh = get().subscriptionStatus;

              // Log status changes for production monitoring
              if (statusBeforeRefresh !== statusAfterRefresh) {
                console.log(`🔄 Store: Status changed: ${statusBeforeRefresh} → ${statusAfterRefresh}`);
              }

              // Log critical status changes
              if (statusAfterRefresh === 'suspended' || statusAfterRefresh === 'cancelled') {
                console.log('🚨 Store: Critical status detected:', statusAfterRefresh);
              }

              set((state) => {
                state.syncInProgress = false;
              });

              return true;
            } else {
              console.log('⚠️ Store: Periodic sync failed:', response.data?.error);

              // CRITICAL SECURITY CHECK: Even if sync "failed", check if it was due to invalid license
              if (
                response.data?.shouldClearData ||
                response.data?.error?.includes('invalid_license') ||
                response.data?.error?.includes('License validation failed')
              ) {
                console.log('🚨 Store: Sync failed due to invalid license - blocking app');

                // SECURITY FIX: Block the app immediately
                set((state) => {
                  state.isActivated = false;
                  state.subscriptionStatus = null;
                  state.subscriptionTier = null;
                  state.expiresAt = null;
                  state.deviceId = null;
                  state.gracePeriodDays = 0;
                  state.isInGracePeriod = false;
                  state.daysRemaining = 0;
                  state.lastValidatedAt = null;
                  state.needsOnlineValidation = true;
                  state.syncInProgress = false;
                  state.error = null; // CLEAR error - let SubscriptionGate handle the activation flow
                });

                return false; // License was invalidated
              }

              set((state) => {
                state.error = response.data?.error || 'Sync failed';
                state.syncInProgress = false;
              });

              return false;
            }
          } catch (error) {
            console.error('❌ Store: Periodic sync error:', error);

            set((state) => {
              state.error = error instanceof Error ? error.message : 'Sync failed';
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
          subscriptionStatus: state.subscriptionStatus, // CRITICAL FIX: Persist subscription status
          subscriptionTier: state.subscriptionTier,
          expiresAt: state.expiresAt,
          deviceId: state.deviceId,
          gracePeriodDays: state.gracePeriodDays,
          isInGracePeriod: state.isInGracePeriod, // CRITICAL FIX: Persist grace period state
          daysRemaining: state.daysRemaining, // CRITICAL FIX: Persist days remaining
          lastValidatedAt: state.lastValidatedAt,
          deviceDescription: state.deviceDescription,
        }),
      }
    ),
    { name: 'subscription-store' }
  )
);
