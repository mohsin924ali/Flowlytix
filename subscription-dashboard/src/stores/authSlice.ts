/**
 * Authentication Slice
 * Manages authentication state using Redux Toolkit
 * Following Instructions file standards with comprehensive auth management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/services/api';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  avatar?: string;
  lastLoginAt?: string;
  createdAt: string;
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
  error: string | null;
  lastActivity: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastActivity: null,
};

// Async thunks
export const loginUser = createAsyncThunk('auth/login', async (credentials: LoginCredentials, { rejectWithValue }) => {
  try {
    const response = await apiClient.post<{ user: User; token: string }>('/api/v1/auth/login', credentials);

    if (response.success && response.data) {
      const { user, token } = response.data;

      // Store auth data
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));

      return { user, token };
    } else {
      return rejectWithValue(response.error || 'Login failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    return rejectWithValue(errorMessage);
  }
});

export const registerUser = createAsyncThunk('auth/register', async (data: RegisterData, { rejectWithValue }) => {
  try {
    const response = await apiClient.post<{ user: User; token: string }>('/api/v1/auth/register', data);

    if (response.success && response.data) {
      const { user, token } = response.data;

      // Store auth data
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));

      return { user, token };
    } else {
      return rejectWithValue(response.error || 'Registration failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    return rejectWithValue(errorMessage);
  }
});

export const verifyToken = createAsyncThunk('auth/verifyToken', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return rejectWithValue('No token found');
    }

    const response = await apiClient.get<User>('/api/v1/auth/profile');

    if (response.success && response.data) {
      return { user: response.data, token };
    } else {
      // Invalid token, clear auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      return rejectWithValue(response.error || 'Token verification failed');
    }
  } catch (error) {
    // Failed to verify token, clear auth data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
    return rejectWithValue(errorMessage);
  }
});

export const refreshToken = createAsyncThunk('auth/refreshToken', async (_, { rejectWithValue }) => {
  try {
    const response = await apiClient.post<{ token: string }>('/api/v1/auth/refresh');

    if (response.success && response.data) {
      const { token } = response.data;
      localStorage.setItem('auth_token', token);
      return token;
    } else {
      return rejectWithValue(response.error || 'Token refresh failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
    return rejectWithValue(errorMessage);
  }
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: Partial<User>, { rejectWithValue }) => {
    try {
      const response = await apiClient.patch<User>('/api/v1/auth/profile', data);

      if (response.success && response.data) {
        const updatedUser = response.data;

        // Update stored user data
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));

        return updatedUser;
      } else {
        return rejectWithValue(response.error || 'Profile update failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      return rejectWithValue(errorMessage);
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/v1/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (response.success) {
        return true;
      } else {
        return rejectWithValue(response.error || 'Password change failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';
      return rejectWithValue(errorMessage);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Synchronous actions
    logout: (state) => {
      // Clear local auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');

      // Reset state
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.lastActivity = null;
    },

    clearError: (state) => {
      state.error = null;
    },

    updateLastActivity: (state) => {
      state.lastActivity = new Date().toISOString();
    },

    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('auth_user', JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    // Login user
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        state.lastActivity = new Date().toISOString();
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Register user
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        state.lastActivity = new Date().toISOString();
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Verify token
    builder
      .addCase(verifyToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        state.lastActivity = new Date().toISOString();
      })
      .addCase(verifyToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });

    // Refresh token
    builder
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload;
        state.lastActivity = new Date().toISOString();
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Change password
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const { logout, clearError, updateLastActivity, setUser } = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

// Permission helpers
export const selectUserPermissions = (state: { auth: AuthState }) => state.auth.user?.permissions || [];
export const selectUserRole = (state: { auth: AuthState }) => state.auth.user?.role;

// Export reducer
export default authSlice.reducer;
