/**
 * Auth Provider Component
 * Provides authentication context and state management
 * Following Instructions file standards with comprehensive auth handling
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthUser, AuthState } from '@/types';

// Default auth state
const defaultAuthState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

// Auth context
const AuthContext = createContext<
  AuthState & {
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    clearError: () => void;
  }
>({
  ...defaultAuthState,
  login: async () => {},
  logout: () => {},
  clearError: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * Manages authentication state and provides auth context
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const userString = localStorage.getItem('auth_user');

        if (token && userString) {
          const user: AuthUser = JSON.parse(userString);
          setAuthState({
            user,
            token,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
        } else {
          setAuthState({
            ...defaultAuthState,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setAuthState({
          ...defaultAuthState,
          loading: false,
          error: 'Failed to initialize authentication',
        });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // For now, simulate login - in real app, this would call API
      if (email === 'admin@flowlytix.com' && password === 'admin') {
        const user: AuthUser = {
          id: '1',
          email: 'admin@flowlytix.com',
          name: 'Admin User',
          role: 'admin' as any,
          permissions: ['read', 'write', 'delete'],
          lastLoginAt: new Date(),
        };

        const token = 'mock-jwt-token';

        // Store in localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));

        setAuthState({
          user,
          token,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      setAuthState({
        ...defaultAuthState,
        loading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  };

  // Logout function
  const logout = (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthState({
      ...defaultAuthState,
      loading: false,
    });
  };

  // Clear error function
  const clearError = (): void => {
    setAuthState((prev) => ({ ...prev, error: null }));
  };

  const contextValue = {
    ...authState,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
