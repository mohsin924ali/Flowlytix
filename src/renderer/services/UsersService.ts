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
  readonly agencyId?: string;
  readonly agencyName?: string;
}

/**
 * Interface for user details for editing
 */
export interface UserDetails {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: string;
  readonly status: string;
  readonly agencyId?: string;
  readonly agencyName?: string;
  readonly createdAt: Date;
  readonly lastLoginAt?: Date | undefined;
  readonly isAccountLocked: boolean;
  readonly loginAttempts: number;
}

/**
 * Parameters for updating a user
 */
export interface UpdateUserParams {
  readonly userId: string;
  readonly requestedBy: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly email?: string;
  readonly role?: string;
  readonly status?: string;
  readonly agencyId?: string;
}

/**
 * Result of update user operation
 */
export interface UpdateUserResult {
  readonly success: boolean;
  readonly message?: string;
  readonly error?: string;
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
  readonly agencyId?: string;
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
          agencyId: params.agencyId,
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
        agencyId: params.agencyId,
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
          agencyId: user.agencyId,
          agencyName: user.agencyName,
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
   * Get user details by ID
   * @param userId - User ID to fetch
   * @param requestedBy - ID of user making the request
   * @returns Promise<UserDetails | null> - User details or null if not found
   */
  static async getUserById(userId: string, requestedBy: string): Promise<UserDetails | null> {
    try {
      console.log('👤 UsersService.getUserById called:', { userId, requestedBy });

      // Check if electron API is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Validate required parameters
      if (!userId || !requestedBy) {
        throw new Error('userId and requestedBy parameters are required');
      }

      const result = await (window.electronAPI.auth as any).getUserById({
        userId,
        requestedBy,
      });

      if (result.success && result.data) {
        const user = result.data;
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          agencyId: user.agencyId,
          agencyName: user.agencyName,
          createdAt: new Date(user.createdAt),
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined,
          isAccountLocked: user.isAccountLocked,
          loginAttempts: user.loginAttempts,
        };
      } else {
        console.log('❌ Get user failed:', result.error);
        return null;
      }
    } catch (error) {
      console.error('💥 Get user error:', error);
      return null;
    }
  }

  /**
   * Update user information
   * @param params - Update user parameters
   * @returns Promise<UpdateUserResult> - Update result
   */
  static async updateUser(params: UpdateUserParams): Promise<UpdateUserResult> {
    try {
      console.log('👤 UsersService.updateUser called:', params);

      // Check if electron API is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Validate required parameters
      if (!params.userId || !params.requestedBy) {
        throw new Error('userId and requestedBy parameters are required');
      }

      const result = await (window.electronAPI.auth as any).updateUser(params);

      if (result.success) {
        return {
          success: true,
          message: result.message || 'User updated successfully',
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to update user',
        };
      }
    } catch (error) {
      console.error('💥 Update user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
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
  }
}
