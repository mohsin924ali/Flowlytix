/**
 * Authentication store using Zustand
 * Following Instructions standards for state management
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { AuthStore, LoginCredentials, User } from '../types/auth.types';
import { AUTH_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/app.constants';
import { AuthService } from '../services/AuthService';
import { useAgencyStore } from './agency.store';

/**
 * Initial authentication state
 */
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true, will be set to false after session check
  error: null,
};

/**
 * Authentication store implementation
 * Using Zustand with TypeScript, DevTools, Persistence, and Immer
 */
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        /**
         * Login action
         * @param credentials - User login credentials
         */
        login: async (credentials: LoginCredentials): Promise<void> => {
          console.log('🔐 Auth Store: Starting login process with credentials:', {
            email: credentials.email,
            passwordLength: credentials.password.length,
          });

          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // Check if Electron API is available with retry
            if (typeof window === 'undefined' || !window.electronAPI) {
              console.log('❌ Auth Store: Electron API not available immediately, waiting...');

              // Wait a bit for the API to be available
              await new Promise((resolve) => setTimeout(resolve, 500));

              if (!window.electronAPI) {
                console.log('❌ Auth Store: Electron API still not available after wait');
                throw new Error(ERROR_MESSAGES.ELECTRON_API_UNAVAILABLE);
              }

              console.log('✅ Auth Store: Electron API became available after wait');
            }

            console.log('✅ Auth Store: Electron API available, calling AuthService.authenticate...');

            // Attempt authentication
            const result = await AuthService.authenticate(credentials);

            console.log('📡 Auth Store: AuthService.authenticate returned:', JSON.stringify(result, null, 2));

            if (result.success && result.user) {
              console.log('✅ Auth Store: Authentication successful, updating state...');

              // Update state synchronously
              set((state) => {
                state.user = result.user!;
                state.isAuthenticated = true;
                state.isLoading = false;
                state.error = null;
              });

              // CRITICAL FIX: Update agency store with user's assigned agency
              if (result.user.agency) {
                console.log('🏢 Auth Store: Setting assigned agency in agency store:', result.user.agency);
                useAgencyStore.getState().setCurrentAgency({
                  id: result.user.agency.id,
                  name: result.user.agency.name,
                  status: (result.user.agency.status as 'active' | 'inactive' | 'suspended') || 'active',
                  contactPerson: result.user.agency.contactPerson || '',
                  phone: result.user.agency.phone || '',
                  email: result.user.agency.email || '',
                  address: result.user.agency.address || '',
                  createdAt: new Date().toISOString(), // TODO: Get from backend if needed
                  databasePath: `${result.user.agency.id}.db`, // Standard format
                  settings: {
                    // Default settings - these should come from backend in future
                    allowCreditSales: true,
                    defaultCreditDays: 30,
                    maxCreditLimit: 50000,
                    requireApprovalForOrders: false,
                    enableInventoryTracking: true,
                    taxRate: 0.15,
                    currency: 'USD',
                    businessHours: {
                      start: '09:00',
                      end: '17:00',
                      timezone: 'UTC',
                    },
                    notifications: {
                      lowStock: true,
                      overduePayments: true,
                      newOrders: true,
                    },
                  },
                });
              } else if (result.user.role === 'super_admin') {
                // For super admins without specific agency assignment, clear current agency
                console.log('🏢 Auth Store: Super admin login - clearing current agency');
                useAgencyStore.getState().clearCurrentAgency();
              }

              // Store session data
              localStorage.setItem(
                AUTH_CONFIG.SESSION_STORAGE_KEY,
                JSON.stringify({
                  user: result.user,
                  timestamp: Date.now(),
                })
              );

              // Log successful state update
              console.log('✅ Authentication state updated:', {
                isAuthenticated: true,
                user: result.user.email,
                assignedAgency: result.user.agency?.name || 'None',
              });
            } else {
              console.log('❌ Auth Store: Authentication failed with result:', result);
              throw new Error(result.error || ERROR_MESSAGES.AUTHENTICATION_FAILED);
            }
          } catch (error) {
            console.log('💥 Auth Store: Login error caught:', error);
            const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;

            console.log('❌ Auth Store: Setting error state:', errorMessage);

            set((state) => {
              state.isLoading = false;
              state.error = errorMessage;
              state.user = null;
              state.isAuthenticated = false;
            });

            throw error; // Re-throw for component error handling
          }
        },

        /**
         * Logout action
         */
        logout: (): void => {
          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
          });

          // Clear agency store on logout
          useAgencyStore.getState().clearCurrentAgency();

          // Clear session data
          localStorage.removeItem(AUTH_CONFIG.SESSION_STORAGE_KEY);
          localStorage.removeItem(AUTH_CONFIG.REMEMBER_ME_STORAGE_KEY);
        },

        /**
         * Clear error action
         */
        clearError: (): void => {
          set((state) => {
            state.error = null;
          });
        },

        /**
         * Check existing session
         */
        checkSession: async (): Promise<void> => {
          try {
            // Reduce console logs for better performance
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 checkSession: Starting session check...');
            }

            // Add a maximum timeout to prevent any hanging
            const sessionCheckTimeout = setTimeout(() => {
              if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ checkSession: Timeout reached, ensuring loading is set to false');
              }
              set((state) => {
                state.isLoading = false;
                state.error = null;
              });
            }, 1500); // Reduced to 1.5 seconds for better performance

            // Simple session check - just check if we have persisted auth state
            const currentState = get();

            if (currentState.user && currentState.isAuthenticated) {
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ checkSession: Found valid persisted auth state');
              }

              // Quick session validity check
              try {
                const sessionData = localStorage.getItem(AUTH_CONFIG.SESSION_STORAGE_KEY);
                if (sessionData) {
                  const { timestamp } = JSON.parse(sessionData);
                  const now = Date.now();

                  // Check if session is expired (more than 24 hours)
                  if (now - timestamp > 24 * 60 * 60 * 1000) {
                    get().logout();
                    clearTimeout(sessionCheckTimeout);
                    return;
                  }
                }
              } catch (storageError) {
                // Silent failure for performance
              }

              // Session is valid
              set((state) => {
                state.isLoading = false;
                state.error = null;
              });
            } else {
              // No valid session - ensure logged out state
              set((state) => {
                state.isLoading = false;
                state.error = null;
                state.user = null;
                state.isAuthenticated = false;
              });
            }

            clearTimeout(sessionCheckTimeout);
          } catch (error) {
            // Silent error handling for better performance
            set((state) => {
              state.isLoading = false;
              state.error = null;
              state.user = null;
              state.isAuthenticated = false;
            });
          }
        },
      })),
      {
        name: 'flowlytix-auth-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

/**
 * Selectors for optimized component subscriptions
 */
export const authSelectors = {
  user: (state: AuthStore) => state.user,
  isAuthenticated: (state: AuthStore) => state.isAuthenticated,
  isLoading: (state: AuthStore) => state.isLoading,
  error: (state: AuthStore) => state.error,
} as const;

/**
 * Hook for authentication actions only
 */
export const useAuthActions = () => {
  const { login, logout, clearError, checkSession } = useAuthStore();
  return { login, logout, clearError, checkSession };
};

/**
 * Hook for authentication state only
 */
export const useAuthState = () => {
  const { user, isAuthenticated, isLoading, error } = useAuthStore();
  return { user, isAuthenticated, isLoading, error };
};
