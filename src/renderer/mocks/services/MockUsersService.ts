/**
 * Mock Users Service
 *
 * Mock implementation of the UsersService for frontend-only operation.
 * Implements all the same interfaces and methods as the real service.
 *
 * @domain User Management
 * @pattern Service Layer - Mock Implementation
 * @architecture Clean Architecture - Mock Layer
 * @version 1.0.0
 */

import {
  UserListItem,
  UserDetails,
  ListUsersParams,
  ListUsersResult,
  UpdateUserParams,
  UpdateUserResult,
} from '../../services/UsersService';
import { mockUsers, searchUsers, getUsersByRole, getUsersByStatus, getUsersByAgency } from '../data/users.mock';

/**
 * Mock Users Service Implementation
 * Provides same interface as real UsersService but uses mock data
 */
export class MockUsersService {
  /**
   * Simulated network delay for realistic testing
   */
  private static readonly MOCK_DELAY = 300;

  /**
   * Add artificial delay to simulate network calls
   */
  private static async delay(ms: number = MockUsersService.MOCK_DELAY): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * List users with filtering and pagination
   * @param params - List users parameters
   * @returns Promise<ListUsersResult> - Paginated user list
   */
  static async listUsers(params: ListUsersParams): Promise<ListUsersResult> {
    try {
      console.log('👥 MockUsersService.listUsers called with:', {
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

      // Simulate network delay
      await this.delay();

      // Start with all users
      let filteredUsers = [...mockUsers];

      // Apply search filter
      if (params.search && params.search.trim().length > 0) {
        filteredUsers = searchUsers(params.search.trim());
        console.log(`🔍 Applied search filter "${params.search}", found ${filteredUsers.length} users`);
      }

      // Apply role filter
      if (params.role && params.role.trim().length > 0) {
        filteredUsers = filteredUsers.filter((user) => user.role === params.role);
        console.log(`👨‍💼 Applied role filter "${params.role}", found ${filteredUsers.length} users`);
      }

      // Apply status filter
      if (params.status && params.status.trim().length > 0) {
        filteredUsers = filteredUsers.filter((user) => user.status === params.status);
        console.log(`📊 Applied status filter "${params.status}", found ${filteredUsers.length} users`);
      }

      // Apply agency filter
      if (params.agencyId && params.agencyId.trim().length > 0) {
        filteredUsers = filteredUsers.filter((user) => user.agencyId === params.agencyId);
        console.log(`🏢 Applied agency filter "${params.agencyId}", found ${filteredUsers.length} users`);
      }

      // Apply locked filter
      if (params.isLocked !== undefined) {
        filteredUsers = filteredUsers.filter((user) => user.isAccountLocked === params.isLocked);
        console.log(`🔒 Applied locked filter "${params.isLocked}", found ${filteredUsers.length} users`);
      }

      // Apply sorting
      const sortBy = params.sortBy || 'createdAt';
      const sortOrder = params.sortOrder || 'desc';

      filteredUsers.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
          case 'firstName':
            aValue = a.firstName.toLowerCase();
            bValue = b.firstName.toLowerCase();
            break;
          case 'lastName':
            aValue = a.lastName.toLowerCase();
            bValue = b.lastName.toLowerCase();
            break;
          case 'email':
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case 'role':
            aValue = a.role.toLowerCase();
            bValue = b.role.toLowerCase();
            break;
          case 'status':
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case 'createdAt':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          case 'lastLoginAt':
            aValue = a.lastLoginAt?.getTime() || 0;
            bValue = b.lastLoginAt?.getTime() || 0;
            break;
          default:
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      console.log(`🔄 Applied sorting by ${sortBy} ${sortOrder}`);

      // Apply pagination
      const limit = params.limit || 50;
      const offset = params.offset || 0;
      const total = filteredUsers.length;
      const paginatedUsers = filteredUsers.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      console.log(`📄 Applied pagination: offset=${offset}, limit=${limit}, total=${total}, hasMore=${hasMore}`);
      console.log(`✅ MockUsersService.listUsers successful, returning ${paginatedUsers.length} users`);

      return {
        success: true,
        users: paginatedUsers,
        total,
        limit,
        offset,
        hasMore,
      };
    } catch (error) {
      console.error('❌ MockUsersService.listUsers error:', error);
      return {
        success: false,
        users: [],
        total: 0,
        limit: params.limit || 50,
        offset: params.offset || 0,
        hasMore: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get user by ID
   * @param userId - User ID to retrieve
   * @param requestedBy - ID of user making the request
   * @returns Promise<UserDetails | null> - User details or null if not found
   */
  static async getUserById(userId: string, requestedBy: string): Promise<UserDetails | null> {
    try {
      console.log(`👤 MockUsersService.getUserById called for userId: ${userId}, requestedBy: ${requestedBy}`);

      // Simulate network delay
      await this.delay();

      const user = mockUsers.find((u) => u.id === userId);

      if (!user) {
        console.log(`❌ User not found: ${userId}`);
        return null;
      }

      const userDetails: UserDetails = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        isAccountLocked: user.isAccountLocked,
        loginAttempts: user.loginAttempts,
        ...(user.agencyId && { agencyId: user.agencyId }),
        ...(user.agencyName && { agencyName: user.agencyName }),
      };

      console.log(`✅ MockUsersService.getUserById successful for ${userId}`);
      return userDetails;
    } catch (error) {
      console.error('❌ MockUsersService.getUserById error:', error);
      return null;
    }
  }

  /**
   * Update user
   * @param params - Update user parameters
   * @returns Promise<UpdateUserResult> - Update result
   */
  static async updateUser(params: UpdateUserParams): Promise<UpdateUserResult> {
    try {
      console.log('👥 MockUsersService.updateUser called with:', params);

      // Simulate network delay
      await this.delay();

      const userIndex = mockUsers.findIndex((u) => u.id === params.userId);

      if (userIndex === -1) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // In a real implementation, we would update the user in the database
      // For mock purposes, we'll just simulate success
      console.log(`✅ MockUsersService.updateUser successful for ${params.userId}`);

      return {
        success: true,
        message: 'User updated successfully',
      };
    } catch (error) {
      console.error('❌ MockUsersService.updateUser error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get user statistics for dashboard
   * @returns Promise with user statistics
   */
  static async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    locked: number;
  }> {
    try {
      await this.delay(100); // Shorter delay for stats

      const stats = {
        total: mockUsers.length,
        active: mockUsers.filter((u) => u.status === 'active').length,
        inactive: mockUsers.filter((u) => u.status === 'inactive').length,
        suspended: mockUsers.filter((u) => u.status === 'suspended').length,
        locked: mockUsers.filter((u) => u.isAccountLocked).length,
      };

      console.log('📊 MockUsersService.getUserStats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ MockUsersService.getUserStats error:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
        locked: 0,
      };
    }
  }
}
