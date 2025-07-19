/**
 * Mock Users Hook
 *
 * Mock implementation of the useUsers hook for frontend-only operation.
 * Uses MockUsersService instead of real backend services.
 *
 * @domain User Management
 * @pattern Custom Hook - Mock Implementation
 * @architecture Clean Architecture - Mock Layer
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MockUsersService } from '../mocks/services/MockUsersService';
import { UserListItem, ListUsersParams, ListUsersResult } from '../services/UsersService';

/**
 * Users filter options - same as original
 */
export interface UsersFilters {
  readonly search?: string;
  readonly role?: string;
  readonly status?: string;
  readonly isLocked?: boolean;
}

/**
 * Users pagination options - same as original
 */
export interface UsersPagination {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'firstName' | 'lastName' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt';
  readonly sortOrder: 'asc' | 'desc';
}

/**
 * Users hook return type - same as original
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
 * Mock Users Hook Implementation
 * Uses MockUsersService for frontend-only operation
 *
 * @returns UseUsersReturn - Users data and management functions
 */
export const useMockUsers = (): UseUsersReturn => {
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
   * Build list users parameters for MockUsersService
   */
  const buildListUsersParams = useCallback((): ListUsersParams => {
    const params: ListUsersParams = {
      requestedBy: '550e8400-e29b-41d4-a716-446655440000', // Use super admin for mock
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
  }, [pagination, offset, filters]);

  /**
   * Fetch users data using MockUsersService
   */
  const fetchUsers = useCallback(async (): Promise<void> => {
    const params = buildListUsersParams();

    try {
      setIsLoading(true);
      setError(null);

      console.log('👥 useMockUsers: Fetching users with params:', params);

      const result: ListUsersResult = await MockUsersService.listUsers(params);

      if (result.success) {
        setUsers(result.users);
        setTotal(result.total);
        setHasMore(result.hasMore);
        console.log('✅ useMockUsers: Successfully fetched', result.users.length, 'users');
      } else {
        setError(result.error || 'Failed to fetch users');
        console.error('❌ useMockUsers: Failed to fetch users:', result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('💥 useMockUsers: Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [buildListUsersParams]);

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
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
    }));
    // Reset to page 1 when filters change
    setPaginationState((prev) => ({ ...prev, page: 1 }));
  }, []);

  /**
   * Refetch users data
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchUsers();
  }, [fetchUsers]);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Reset filters to defaults
   */
  const resetFilters = useCallback((): void => {
    setFiltersState(DEFAULT_FILTERS);
    setPaginationState(DEFAULT_PAGINATION);
  }, []);

  /**
   * Effect to fetch users when dependencies change
   */
  useEffect(() => {
    console.log('🚀 useMockUsers: Dependencies changed, fetching users...');
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Return hook interface
   */
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
