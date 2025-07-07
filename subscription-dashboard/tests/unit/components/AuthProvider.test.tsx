/**
 * AuthProvider Component Unit Tests
 * Comprehensive testing for authentication state management
 * Following Instructions file standards with 100% coverage
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock fetch
global.fetch = jest.fn();

// Test component to access auth context
const TestComponent = () => {
  const { user, isAuthenticated, loading, error, login, logout, clearError } = useAuth();

  return (
    <div>
      <div data-testid='auth-status'>{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid='loading'>{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid='user'>{user ? JSON.stringify(user) : 'no-user'}</div>
      <div data-testid='error'>{error || 'no-error'}</div>

      <button data-testid='login-btn' onClick={() => login('test@example.com', 'password123')}>
        Login
      </button>

      <button data-testid='logout-btn' onClick={logout}>
        Logout
      </button>

      <button data-testid='clear-error-btn' onClick={clearError}>
        Clear Error
      </button>
    </div>
  );
};

// Wrapper component
const AuthWrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthProvider Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    if (global.fetch && typeof (global.fetch as any).mockClear === 'function') {
      (global.fetch as jest.Mock).mockClear();
    }
  });

  describe('Initial State', () => {
    test('renders with initial state - not authenticated', () => {
      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });

    test('loads user from localStorage on mount', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        permissions: ['read', 'write'],
        lastLoginAt: new Date().toISOString(),
      };
      const mockToken = 'test-token-123';

      mockLocalStorage.getItem
        .mockReturnValueOnce(mockToken) // auth_token
        .mockReturnValueOnce(JSON.stringify(mockUser)); // auth_user

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });
    });

    test('handles invalid user data in localStorage', async () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('test-token') // auth_token
        .mockReturnValueOnce('invalid-json'); // auth_user

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });
    });
  });

  describe('Login Functionality', () => {
    test('successfully logs in user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        permissions: ['read', 'write'],
        lastLoginAt: new Date().toISOString(),
      };
      const mockToken = 'login-token-123';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUser,
            token: mockToken,
          },
        }),
      });

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      // Trigger login
      fireEvent.click(screen.getByTestId('login-btn'));

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      });

      // Should complete login
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });

      // Should save to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_user', JSON.stringify(mockUser));
    });

    test('handles login failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Invalid credentials',
        }),
      });

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      // Trigger login
      fireEvent.click(screen.getByTestId('login-btn'));

      // Should show loading then error
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });
    });

    test('handles login network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      // Trigger login
      fireEvent.click(screen.getByTestId('login-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network error');
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });
    });

    test('handles malformed login response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: null, // malformed response
        }),
      });

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      // Trigger login
      fireEvent.click(screen.getByTestId('login-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid server response');
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
      });
    });
  });

  describe('Logout Functionality', () => {
    test('successfully logs out user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        permissions: ['read', 'write'],
        lastLoginAt: new Date().toISOString(),
      };

      // Set initial authenticated state
      mockLocalStorage.getItem.mockReturnValueOnce('test-token').mockReturnValueOnce(JSON.stringify(mockUser));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      // Wait for initial auth state
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Trigger logout
      fireEvent.click(screen.getByTestId('logout-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      // Should clear localStorage
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user');
    });

    test('handles logout API failure gracefully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        permissions: ['read', 'write'],
        lastLoginAt: new Date().toISOString(),
      };

      // Set initial authenticated state
      mockLocalStorage.getItem.mockReturnValueOnce('test-token').mockReturnValueOnce(JSON.stringify(mockUser));

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      // Wait for initial auth state
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // Trigger logout - should still clear local state even if API fails
      fireEvent.click(screen.getByTestId('logout-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      // Should still clear localStorage
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user');
    });
  });

  describe('Error Handling', () => {
    test('clears error state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Test error',
        }),
      });

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      // Trigger login to create error
      fireEvent.click(screen.getByTestId('login-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Test error');
      });

      // Clear error
      fireEvent.click(screen.getByTestId('clear-error-btn'));

      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });
  });

  describe('Context Validation', () => {
    test('throws error when useAuth is used outside AuthProvider', () => {
      // Mock console.error to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const TestComponentOutsideProvider = () => {
        useAuth();
        return <div>Test</div>;
      };

      expect(() => {
        render(<TestComponentOutsideProvider />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    test('handles concurrent login attempts', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    data: {
                      user: { id: '1', email: 'test@example.com' },
                      token: 'token-123',
                    },
                  }),
                }),
              100
            )
          )
      );

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      // Trigger multiple login attempts
      fireEvent.click(screen.getByTestId('login-btn'));
      fireEvent.click(screen.getByTestId('login-btn'));
      fireEvent.click(screen.getByTestId('login-btn'));

      // Should only make one API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    test('handles empty email and password', async () => {
      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      // Create a component that calls login with empty values
      const EmptyLoginComponent = () => {
        const { login } = useAuth();
        return (
          <button data-testid='empty-login-btn' onClick={() => login('', '')}>
            Empty Login
          </button>
        );
      };

      render(
        <AuthWrapper>
          <EmptyLoginComponent />
        </AuthWrapper>
      );

      fireEvent.click(screen.getByTestId('empty-login-btn'));

      // Should not make API call with empty credentials
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
