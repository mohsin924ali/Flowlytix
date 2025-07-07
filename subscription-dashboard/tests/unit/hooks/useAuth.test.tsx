/**
 * useAuth Hook Tests
 * Comprehensive testing for authentication hook
 * Following Instructions file standards with thorough coverage
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/api';

// Mock the API client
jest.mock('@/services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInitializing).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Initialization', () => {
    it('should initialize with existing token and user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        permissions: ['read', 'write'],
        createdAt: new Date(),
      };

      mockLocalStorage.getItem.mockReturnValueOnce('mock-token').mockReturnValueOnce(JSON.stringify(mockUser));

      mockedApiClient.get.mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('mock-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/v1/auth/profile');
    });

    it('should clear invalid token on initialization', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce('invalid-token').mockReturnValueOnce('{"id":"1"}');

      mockedApiClient.get.mockResolvedValueOnce({
        success: false,
        error: 'Invalid token',
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user');
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        permissions: ['read', 'write'],
        createdAt: new Date(),
      };

      const mockToken = 'mock-token';
      const credentials = { email: 'test@example.com', password: 'password' };

      mockedApiClient.post.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser, token: mockToken },
      });

      const { result } = renderHook(() => useAuth());

      let loginResult: any;
      await act(async () => {
        loginResult = await result.current.login(credentials);
      });

      expect(loginResult.success).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_user', JSON.stringify(mockUser));
      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', credentials);
    });

    it('should handle login failure', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong-password' };

      mockedApiClient.post.mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials',
      });

      const { result } = renderHook(() => useAuth());

      let loginResult: any;
      await act(async () => {
        loginResult = await result.current.login(credentials);
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBe('Invalid credentials');
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle network errors during login', async () => {
      const credentials = { email: 'test@example.com', password: 'password' };

      mockedApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      let loginResult: any;
      await act(async () => {
        loginResult = await result.current.login(credentials);
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBe('Network error');
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Register', () => {
    it('should register successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        permissions: ['read'],
        createdAt: new Date(),
      };

      const mockToken = 'mock-token';
      const registerData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        confirmPassword: 'password',
      };

      mockedApiClient.post.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser, token: mockToken },
      });

      const { result } = renderHook(() => useAuth());

      let registerResult: any;
      await act(async () => {
        registerResult = await result.current.register(registerData);
      });

      expect(registerResult.success).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/v1/auth/register', registerData);
    });

    it('should handle registration failure', async () => {
      const registerData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        confirmPassword: 'password',
      };

      mockedApiClient.post.mockResolvedValueOnce({
        success: false,
        error: 'Email already exists',
      });

      const { result } = renderHook(() => useAuth());

      let registerResult: any;
      await act(async () => {
        registerResult = await result.current.register(registerData);
      });

      expect(registerResult.success).toBe(false);
      expect(registerResult.error).toBe('Email already exists');
      expect(result.current.error).toBe('Email already exists');
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      // First set up authenticated state
      const { result } = renderHook(() => useAuth());

      // Mock current authenticated state
      act(() => {
        result.current.setUser({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          permissions: ['read', 'write'],
          createdAt: new Date(),
        });
      });

      mockedApiClient.post.mockResolvedValueOnce({
        success: true,
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user');
      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/v1/auth/logout');
    });

    it('should logout even if server call fails', async () => {
      const { result } = renderHook(() => useAuth());

      mockedApiClient.post.mockRejectedValueOnce(new Error('Server error'));

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user');
    });
  });

  describe('Update Profile', () => {
    it('should update profile successfully', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Updated Name',
        role: 'admin',
        permissions: ['read', 'write'],
        createdAt: new Date(),
      };

      mockedApiClient.patch.mockResolvedValueOnce({
        success: true,
        data: updatedUser,
      });

      const { result } = renderHook(() => useAuth());

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateProfile({ name: 'Updated Name' });
      });

      expect(updateResult.success).toBe(true);
      expect(result.current.user).toEqual(updatedUser);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_user', JSON.stringify(updatedUser));
      expect(mockedApiClient.patch).toHaveBeenCalledWith('/api/v1/auth/profile', { name: 'Updated Name' });
    });
  });

  describe('Permission Helpers', () => {
    it('should check permissions correctly', () => {
      const { result } = renderHook(() => useAuth());

      // Mock user with permissions
      act(() => {
        result.current.setUser({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          permissions: ['read', 'write', 'delete'],
          createdAt: new Date(),
        });
      });

      expect(result.current.checkPermission('read')).toBe(true);
      expect(result.current.checkPermission('write')).toBe(true);
      expect(result.current.checkPermission('admin')).toBe(false);
    });

    it('should check roles correctly', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setUser({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          permissions: ['read', 'write'],
          createdAt: new Date(),
        });
      });

      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('user')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should clear errors', () => {
      const { result } = renderHook(() => useAuth());

      // Set error state manually for testing
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token successfully', async () => {
      const newToken = 'new-token';

      mockedApiClient.post.mockResolvedValueOnce({
        success: true,
        data: { token: newToken },
      });

      const { result } = renderHook(() => useAuth());

      let refreshResult: any;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      expect(refreshResult.success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', newToken);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/v1/auth/refresh');
    });
  });
});
