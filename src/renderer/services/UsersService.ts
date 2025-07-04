/**
 * Users Service
 *
 * Handles user management operations via IPC calls to the main process.
 * Follows service layer pattern with proper error handling and type safety.
 *
 * Business Rules:
 * - All operations require proper authentication
 * - Input validation is performed
 * - Errors are handled gracefully
 * - Results are properly typed
 *
 * @domain User Management
 * @pattern Service Layer
 * @architecture Clean Architecture
 * @version 1.0.0
 */

/**
 * Interface for user list item display
 */
export interface UserListItem {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly role: string;
  readonly roleName: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly lastLoginAt?: Date;
  readonly isAccountLocked: boolean;
  readonly loginAttempts: number;
}

/**
 * Parameters for listing users
 */
export interface ListUsersParams {
  readonly requestedBy: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: 'firstName' | 'lastName' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt';
  readonly sortOrder?: 'asc' | 'desc';
  readonly role?: string;
  readonly status?: string;
  readonly search?: string;
  readonly createdAfter?: string;
  readonly createdBefore?: string;
  readonly isLocked?: boolean;
}

/**
 * Result of list users operation
 */
export interface ListUsersResult {
  readonly success: boolean;
  readonly users: readonly UserListItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
  readonly error?: string;
}

/**
 * Service for user management operations
 * Implements secure communication with main process via IPC
 */
export class UsersService {
  /**
   * List users with filtering and pagination
   * @param params - List users parameters
   * @returns Promise<ListUsersResult> - Paginated user list
   * @throws Error when IPC communication fails
   */
  static async listUsers(params: ListUsersParams): Promise<ListUsersResult> {
    try {
      console.log('👥 UsersService.listUsers called with:', {
        requestedBy: params.requestedBy,
        limit: params.limit,
        offset: params.offset,
        sortBy: params.sortBy,
        filters: {
          role: params.role,
          status: params.status,
          search: params.search,
        },
      });

      // Check if electron API is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Validate required parameters
      if (!params.requestedBy) {
        throw new Error('RequestedBy parameter is required');
      }

      console.log('🔗 Calling electronAPI.auth.listUsers...');

      // Call the main process via IPC
      const result = await (window.electronAPI.auth as any).listUsers({
        requestedBy: params.requestedBy,
        limit: params.limit || 50,
        offset: params.offset || 0,
        sortBy: params.sortBy || 'createdAt',
        sortOrder: params.sortOrder || 'desc',
        role: params.role,
        status: params.status,
        search: params.search,
        createdAfter: params.createdAfter,
        createdBefore: params.createdBefore,
        isLocked: params.isLocked,
      });

      console.log('📡 IPC Response received:', result);

      if (result.success && result.data) {
        console.log('✅ List users successful, count:', result.data.users.length);

        // Convert dates from strings to Date objects
        const users: UserListItem[] = result.data.users.map((user: any) => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          roleName: user.roleName,
          status: user.status,
          createdAt: new Date(user.createdAt),
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined,
          isAccountLocked: user.isAccountLocked,
          loginAttempts: user.loginAttempts,
        }));

        return {
          success: true,
          users,
          total: result.data.total,
          limit: result.data.limit,
          offset: result.data.offset,
          hasMore: result.data.hasMore,
        };
      } else {
        console.log('❌ List users failed:', result.error || result.data?.error);
        return {
          success: false,
          users: [],
          total: 0,
          limit: params.limit || 50,
          offset: params.offset || 0,
          hasMore: false,
          error: result.error || result.data?.error || 'Failed to list users',
        };
      }
    } catch (error) {
      console.error('💥 Users service error:', error);
      return {
        success: false,
        users: [],
        total: 0,
        limit: params.limit || 50,
        offset: params.offset || 0,
        hasMore: false,
        error: error instanceof Error ? error.message : 'Failed to list users',
      };
    }
  }

  /**
   * Validates list users parameters
   * @param params - Parameters to validate
   * @throws Error when validation fails
   */
  private static validateListUsersParams(params: ListUsersParams): void {
    if (!params.requestedBy || typeof params.requestedBy !== 'string') {
      throw new Error('RequestedBy is required and must be a string');
    }

    if (params.limit !== undefined && (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 1000)) {
      throw new Error('Limit must be a number between 1 and 1000');
    }

    if (params.offset !== undefined && (typeof params.offset !== 'number' || params.offset < 0)) {
      throw new Error('Offset must be a non-negative number');
    }

    const validSortFields = ['firstName', 'lastName', 'email', 'role', 'status', 'createdAt', 'lastLoginAt'];
    if (params.sortBy !== undefined && !validSortFields.includes(params.sortBy)) {
      throw new Error(`SortBy must be one of: ${validSortFields.join(', ')}`);
    }

    const validSortOrders = ['asc', 'desc'];
    if (params.sortOrder !== undefined && !validSortOrders.includes(params.sortOrder)) {
      throw new Error('SortOrder must be either "asc" or "desc"');
    }

    if (params.search !== undefined && (typeof params.search !== 'string' || params.search.length > 255)) {
      throw new Error('Search term must be a string with maximum 255 characters');
    }
  }
}
