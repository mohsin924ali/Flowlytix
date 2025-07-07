/**
 * Authentication Hook
 * Manages user authentication state and operations
 * Following Instructions file standards with comprehensive auth management
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api';
import { ApiResponse } from '@/types';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  avatar?: string;
  lastLoginAt?: Date;
  createdAt: Date;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
}

export interface UseAuthReturn extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  checkPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

/**
 * Custom hook for authentication management
 */
export const useAuth = (): UseAuthReturn => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isInitializing: true,
    error: null,
  });

  /**
   * Initialize authentication state from localStorage
   */
  const initializeAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');

      if (token && userStr) {
        const user = JSON.parse(userStr);

        // Verify token with server
        const response = await apiClient.get<User>('/api/v1/auth/profile');

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            user: response.data!,
            token,
            isAuthenticated: true,
            isInitializing: false,
          }));
        } else {
          // Invalid token, clear auth data
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setState((prev) => ({
            ...prev,
            isInitializing: false,
          }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          isInitializing: false,
        }));
      }
    } catch (error) {
      // Failed to verify token, clear auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setState((prev) => ({
        ...prev,
        isInitializing: false,
        error: 'Authentication verification failed',
      }));
    }
  }, []);

  /**
   * Login user with credentials
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.post<{ user: User; token: string }>('/api/v1/auth/login', credentials);

      if (response.success && response.data) {
        const { user, token } = response.data;

        // Store auth data
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));

        setState((prev) => ({
          ...prev,
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));

        return { success: true };
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Login failed',
        }));
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (data: RegisterData) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.post<{ user: User; token: string }>('/api/v1/auth/register', data);

      if (response.success && response.data) {
        const { user, token } = response.data;

        // Store auth data
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));

        setState((prev) => ({
          ...prev,
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));

        return { success: true };
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Registration failed',
        }));
        return { success: false, error: response.error || 'Registration failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Call logout endpoint to invalidate token on server
      await apiClient.post('/api/v1/auth/logout');
    } catch (error) {
      // Continue with logout even if server call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear local auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');

      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isInitializing: false,
        error: null,
      });
    }
  }, []);

  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async () => {
    try {
      const response = await apiClient.post<{ token: string }>('/api/v1/auth/refresh');

      if (response.success && response.data) {
        const { token } = response.data;
        localStorage.setItem('auth_token', token);

        setState((prev) => ({
          ...prev,
          token,
          error: null,
        }));

        return { success: true };
      } else {
        return { success: false, error: response.error || 'Token refresh failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data: Partial<User>) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.patch<User>('/api/v1/auth/profile', data);

      if (response.success && response.data) {
        const updatedUser = response.data;

        // Update stored user data
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));

        setState((prev) => ({
          ...prev,
          user: updatedUser,
          isLoading: false,
          error: null,
        }));

        return { success: true };
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Profile update failed',
        }));
        return { success: false, error: response.error || 'Profile update failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Change user password
   */
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.post('/api/v1/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (response.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
        return { success: true };
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Password change failed',
        }));
        return { success: false, error: response.error || 'Password change failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Reset password via email
   */
  const resetPassword = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.post('/api/v1/auth/reset-password', { email });

      if (response.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
        return { success: true };
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Password reset failed',
        }));
        return { success: false, error: response.error || 'Password reset failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Check if user has specific permission
   */
  const checkPermission = useCallback(
    (permission: string): boolean => {
      return state.user?.permissions?.includes(permission) || false;
    },
    [state.user]
  );

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      return state.user?.role === role;
    },
    [state.user]
  );

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    updateProfile,
    changePassword,
    resetPassword,
    checkPermission,
    hasRole,
  };
};
