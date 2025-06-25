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

/**
 * Initial authentication state
 */
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
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
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // Check if Electron API is available
            if (typeof window === 'undefined' || !window.electronAPI) {
              throw new Error(ERROR_MESSAGES.ELECTRON_API_UNAVAILABLE);
            }

            // Attempt authentication
            const result = await AuthService.authenticate(credentials);

            if (result.success && result.user) {
              set((state) => {
                state.user = result.user!;
                state.isAuthenticated = true;
                state.isLoading = false;
                state.error = null;
              });

              // Store session data
              localStorage.setItem(
                AUTH_CONFIG.SESSION_STORAGE_KEY,
                JSON.stringify({
                  user: result.user,
                  timestamp: Date.now(),
                })
              );
            } else {
              throw new Error(result.error || ERROR_MESSAGES.AUTHENTICATION_FAILED);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;

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
            const sessionData = localStorage.getItem(AUTH_CONFIG.SESSION_STORAGE_KEY);

            if (!sessionData) {
              return;
            }

            const { user, timestamp } = JSON.parse(sessionData);
            const now = Date.now();

            // Check if session is expired
            if (now - timestamp > AUTH_CONFIG.SESSION_TIMEOUT) {
              get().logout();
              return;
            }

            // Restore session
            set((state) => {
              state.user = user;
              state.isAuthenticated = true;
              state.isLoading = false;
              state.error = null;
            });
          } catch (error) {
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
