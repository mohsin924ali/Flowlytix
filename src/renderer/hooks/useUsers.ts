/**
 * Custom hook for users data management
 *
 * Handles user listing, filtering, and pagination with proper state management.
 * Follows React hooks best practices with proper error handling and loading states.
 *
 * Business Rules:
 * - Requires authenticated user to access
 * - Implements proper pagination
 * - Handles loading and error states
 * - Provides search and filtering capabilities
 *
 * @domain User Management
 * @pattern Custom Hook
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UsersService, type ListUsersParams, type ListUsersResult, type UserListItem } from '../services/UsersService';
import { useAuthState } from '../store/auth.store';

/**
 * Users filter options
 */
export interface UsersFilters {
  readonly search?: string;
  readonly role?: string;
  readonly status?: string;
  readonly isLocked?: boolean;
}

/**
 * Users pagination options
 */
export interface UsersPagination {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'firstName' | 'lastName' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt';
  readonly sortOrder: 'asc' | 'desc';
}

/**
 * Users hook return type
 */
export interface UseUsersReturn {
  // Data
  readonly users: readonly UserListItem[];
  readonly total: number;
  readonly hasMore: boolean;

  // State
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly isInitialized: boolean;

  // Pagination
  readonly pagination: UsersPagination;
  readonly setPagination: (pagination: Partial<UsersPagination>) => void;

  // Filtering
  readonly filters: UsersFilters;
  readonly setFilters: (filters: Partial<UsersFilters>) => void;

  // Actions
  readonly refetch: () => Promise<void>;
  readonly clearError: () => void;
  readonly resetFilters: () => void;
}

/**
 * Default pagination settings
 */
const DEFAULT_PAGINATION: UsersPagination = {
  page: 1,
  limit: 50,
  sortBy: 'createdAt',
  sortOrder: 'desc',
} as const;

/**
 * Default filters
 */
const DEFAULT_FILTERS: UsersFilters = {} as const;

/**
 * Custom hook for users data management
 * @returns UseUsersReturn - Users data and management functions
 */
export const useUsers = (): UseUsersReturn => {
  // Auth state
  const { user, isAuthenticated } = useAuthState();

  // Component state
  const [users, setUsers] = useState<readonly UserListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Pagination state
  const [pagination, setPaginationState] = useState<UsersPagination>(DEFAULT_PAGINATION);

  // Filters state
  const [filters, setFiltersState] = useState<UsersFilters>(DEFAULT_FILTERS);

  /**
   * Calculate offset from page and limit
   */
  const offset = useMemo(() => (pagination.page - 1) * pagination.limit, [pagination.page, pagination.limit]);

  /**
   * Build list users parameters
   */
  const buildListUsersParams = useCallback((): ListUsersParams | null => {
    if (!user?.id) {
      return null;
    }

    const params: ListUsersParams = {
      requestedBy: user.id,
      limit: pagination.limit,
      offset,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    };

    // Add optional properties only if they have values
    if (filters.search) {
      (params as any).search = filters.search;
    }
    if (filters.role) {
      (params as any).role = filters.role;
    }
    if (filters.status) {
      (params as any).status = filters.status;
    }
    if (filters.isLocked !== undefined) {
      (params as any).isLocked = filters.isLocked;
    }

    return params;
  }, [user?.id, pagination, offset, filters]);

  /**
   * Fetch users data
   */
  const fetchUsers = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !user?.id) {
      console.log('👥 useUsers: Not authenticated, skipping fetch');
      return;
    }

    const params = buildListUsersParams();
    if (!params) {
      console.log('👥 useUsers: Invalid parameters, skipping fetch');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('👥 useUsers: Fetching users with params:', params);

      const result: ListUsersResult = await UsersService.listUsers(params);

      if (result.success) {
        setUsers(result.users);
        setTotal(result.total);
        setHasMore(result.hasMore);
        console.log('✅ useUsers: Successfully fetched', result.users.length, 'users');
      } else {
        setError(result.error || 'Failed to fetch users');
        console.error('❌ useUsers: Failed to fetch users:', result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('💥 useUsers: Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [isAuthenticated, user?.id, buildListUsersParams]);

  /**
   * Update pagination
   */
  const setPagination = useCallback((newPagination: Partial<UsersPagination>): void => {
    setPaginationState((prev) => ({
      ...prev,
      ...newPagination,
      // Reset to page 1 when changing filters or sorting
      ...(newPagination.sortBy || newPagination.sortOrder ? { page: 1 } : {}),
    }));
  }, []);

  /**
   * Update filters
   */
  const setFilters = useCallback((newFilters: Partial<UsersFilters>): void => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    // Reset to page 1 when filters change
    setPaginationState((prev) => ({ ...prev, page: 1 }));
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Reset filters to defaults
   */
  const resetFilters = useCallback((): void => {
    setFiltersState(DEFAULT_FILTERS);
    setPaginationState((prev) => ({ ...prev, page: 1 }));
  }, []);

  /**
   * Refetch data (alias for fetchUsers)
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchUsers();
  }, [fetchUsers]);

  /**
   * Fetch users when dependencies change
   */
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Clear data when user logs out
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setUsers([]);
      setTotal(0);
      setHasMore(false);
      setError(null);
      setIsInitialized(false);
      setPaginationState(DEFAULT_PAGINATION);
      setFiltersState(DEFAULT_FILTERS);
    }
  }, [isAuthenticated]);

  return {
    // Data
    users,
    total,
    hasMore,

    // State
    isLoading,
    error,
    isInitialized,

    // Pagination
    pagination,
    setPagination,

    // Filtering
    filters,
    setFilters,

    // Actions
    refetch,
    clearError,
    resetFilters,
  };
};
