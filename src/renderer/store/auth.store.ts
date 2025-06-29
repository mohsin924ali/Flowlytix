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
                  contactPerson: result.user.agency.contactPerson,
                  phone: result.user.agency.phone,
                  email: result.user.agency.email,
                  address: result.user.agency.address,
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
            console.log('🔍 checkSession: Starting session check...');

            // Check if we have persisted auth state from Zustand
            const currentState = get();
            console.log(
              '🔍 checkSession: Current state:',
              JSON.stringify(
                {
                  isAuthenticated: currentState.isAuthenticated,
                  hasUser: !!currentState.user,
                  userEmail: currentState.user?.email,
                  isLoading: currentState.isLoading,
                },
                null,
                2
              )
            );

            if (currentState.user && currentState.isAuthenticated) {
              console.log('🔍 checkSession: Found persisted auth state');

              // We have persisted state, but let's also check localStorage for session timestamp
              const sessionData = localStorage.getItem(AUTH_CONFIG.SESSION_STORAGE_KEY);

              if (sessionData) {
                const { timestamp } = JSON.parse(sessionData);
                const now = Date.now();

                // Check if session is expired
                if (now - timestamp > AUTH_CONFIG.SESSION_TIMEOUT) {
                  console.log('⚠️ checkSession: Session expired, logging out');
                  get().logout();
                  return;
                }
                console.log('✅ checkSession: Session is valid');
              }

              // Session is valid, just ensure loading is false
              set((state) => {
                state.isLoading = false;
                state.error = null;
              });

              console.log('✅ checkSession: Authentication state confirmed');
            } else {
              console.log('🔍 checkSession: No persisted auth state found');

              // No persisted state, ensure we're in logged out state
              set((state) => {
                state.isLoading = false;
                state.error = null;
              });
            }
          } catch (error) {
            console.error('❌ checkSession: Error during session check:', error);
            // If session restoration fails, clear everything
            get().logout();
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
