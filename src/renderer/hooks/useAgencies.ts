/**
 * Agency Management Hook
 *
 * Custom React hook for managing agency operations with state management,
 * loading states, error handling, and caching. Follows React best practices
 * with proper dependency management and performance optimization.
 *
 * @domain Agency Management
 * @architecture Clean Architecture - Presentation Layer
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AgencyService,
  Agency,
  CreateAgencyParams,
  CreateAgencyResult,
  ListAgenciesParams,
  ListAgenciesResult,
} from '../services/AgencyService';
import { useAuthStore } from '../store/auth.store';
import { useAgencyStore } from '../store/agency.store';

// Hook interfaces
export interface UseAgenciesState {
  agencies: Agency[];
  totalCount: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  creating: boolean;
  updating: boolean;
}

export interface UseAgenciesActions {
  loadAgencies: (params?: ListAgenciesParams) => Promise<void>;
  createAgency: (params: CreateAgencyParams) => Promise<CreateAgencyResult>;
  updateAgency: (agencyId: string, params: Partial<CreateAgencyParams>) => Promise<void>;
  refreshAgencies: () => Promise<void>;
  clearError: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setStatusFilter: (status: Agency['status'] | undefined) => void;
}

export interface UseAgenciesReturn extends UseAgenciesState, UseAgenciesActions {
  filteredAgencies: Agency[];
  hasMore: boolean;
  isEmpty: boolean;
  isFiltered: boolean;
}

// Hook parameters
export interface UseAgenciesParams {
  autoLoad?: boolean;
  initialPageSize?: number;
  enableCaching?: boolean;
  cacheDuration?: number; // in milliseconds
}

/**
 * Custom hook for agency management
 *
 * Provides complete agency management functionality with state management,
 * loading states, error handling, filtering, pagination, and caching.
 *
 * @param params - Hook configuration parameters
 * @returns Agency management state and actions
 */
export function useAgencies(params: UseAgenciesParams = {}): UseAgenciesReturn {
  const {
    autoLoad = true,
    initialPageSize = 50,
    enableCaching = true,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
  } = params;

  // Get current user from auth store
  const { user } = useAuthStore();

  // Get agency store for initialization
  const { initializeWithFirstAgency } = useAgencyStore();

  // State management
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [search, setSearchState] = useState('');
  const [statusFilter, setStatusFilterState] = useState<Agency['status'] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState<number | null>(null);

  /**
   * Load agencies with filtering and pagination
   */
  const loadAgencies = useCallback(
    async (customParams?: ListAgenciesParams) => {
      try {
        setLoading(true);
        setError(null);

        // Check cache validity
        if (enableCaching && lastLoadTime && Date.now() - lastLoadTime < cacheDuration && !customParams) {
          return;
        }

        const loadParams: ListAgenciesParams = {
          page: customParams?.page ?? page,
          pageSize: customParams?.pageSize ?? pageSize,
          ...(customParams?.search !== undefined ? { search: customParams.search } : search ? { search } : {}),
          ...(customParams?.status !== undefined
            ? { status: customParams.status }
            : statusFilter
              ? { status: statusFilter }
              : {}),
        };

        const result: ListAgenciesResult = await AgencyService.listAgencies(loadParams);

        setAgencies(result.agencies);
        setTotalCount(result.totalCount);
        setLastLoadTime(Date.now());

        // Initialize with first agency if none selected
        if (result.agencies.length > 0) {
          initializeWithFirstAgency(result.agencies);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load agencies';
        setError(errorMessage);
        console.error('useAgencies.loadAgencies error:', err);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search, statusFilter, enableCaching, cacheDuration, initializeWithFirstAgency]
  );

  /**
   * Create a new agency
   */
  const createAgency = useCallback(
    async (createParams: CreateAgencyParams): Promise<CreateAgencyResult> => {
      try {
        setCreating(true);
        setError(null);

        const result = await AgencyService.createAgency(createParams);

        // Refresh agencies list after successful creation
        await loadAgencies();

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create agency';
        setError(errorMessage);
        console.error('useAgencies.createAgency error:', err);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [loadAgencies]
  );

  /**
   * Update an existing agency
   */
  const updateAgency = useCallback(
    async (agencyId: string, updateParams: Partial<CreateAgencyParams>) => {
      try {
        setUpdating(true);
        setError(null);

        await AgencyService.updateAgency(agencyId, updateParams);

        // Refresh agencies list after successful update
        await loadAgencies();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update agency';
        setError(errorMessage);
        console.error('useAgencies.updateAgency error:', err);
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [loadAgencies]
  );

  /**
   * Refresh agencies (force reload)
   */
  const refreshAgencies = useCallback(async () => {
    setLastLoadTime(null); // Force cache invalidation
    await loadAgencies();
  }, [loadAgencies]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Set page and reload
   */
  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  /**
   * Set page size and reload
   */
  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    setPageState(1); // Reset to first page
  }, []);

  /**
   * Set search filter and reload
   */
  const setSearch = useCallback((newSearch: string) => {
    setSearchState(newSearch);
    setPageState(1); // Reset to first page
  }, []);

  /**
   * Set status filter and reload
   */
  const setStatusFilter = useCallback((newStatus: Agency['status'] | undefined) => {
    setStatusFilterState(newStatus);
    setPageState(1); // Reset to first page
  }, []);

  // Computed values
  const filteredAgencies = useMemo(() => {
    let filtered = [...agencies];

    // Apply client-side filtering if needed
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (agency) =>
          agency.name.toLowerCase().includes(searchLower) ||
          agency.contactPerson?.toLowerCase().includes(searchLower) ||
          agency.email?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((agency) => agency.status === statusFilter);
    }

    return filtered;
  }, [agencies, search, statusFilter]);

  const hasMore = useMemo(() => {
    return page * pageSize < totalCount;
  }, [page, pageSize, totalCount]);

  const isEmpty = useMemo(() => {
    return !loading && agencies.length === 0;
  }, [loading, agencies.length]);

  const isFiltered = useMemo(() => {
    return !!(search || statusFilter);
  }, [search, statusFilter]);

  // Auto-load on mount and when filters change
  useEffect(() => {
    if (autoLoad) {
      loadAgencies();
    }
  }, [autoLoad, page, pageSize, search, statusFilter, loadAgencies]);

  // Return hook interface
  return {
    // State
    agencies: filteredAgencies,
    totalCount,
    page,
    pageSize,
    loading,
    error,
    creating,
    updating,

    // Actions
    loadAgencies,
    createAgency,
    updateAgency,
    refreshAgencies,
    clearError,
    setPage,
    setPageSize,
    setSearch,
    setStatusFilter,

    // Computed
    filteredAgencies,
    hasMore,
    isEmpty,
    isFiltered,
  };
}
