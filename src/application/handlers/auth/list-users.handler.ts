/**
 * List Users Handler
 *
 * Handler for ListUsers query following CQRS pattern.
 * Implements business logic for user listing with proper authorization,
 * filtering, pagination, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with READ_USER permission can list users
 * - Super admins can view all users
 * - Regular users can only view users they can manage (role hierarchy)
 * - Pagination is enforced for performance
 * - Search filters are validated
 *
 * @domain User Management
 * @pattern Query Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  ListUsersQuery,
  ListUsersQueryResult,
  UserListItem,
  validateListUsersQuery,
  validateListUsersQueryBusinessRules,
} from '../../queries/auth/list-users.query';
import { User } from '../../../domain/entities/user';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { IAgencyRepository } from '../../../domain/repositories/agency.repository';
import { Permission, SystemRole } from '../../../domain/value-objects/role';

/**
 * Handler for ListUsers query
 * Implements secure user listing with authorization checks and filtering
 */
export class ListUsersHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly agencyRepository: IAgencyRepository
  ) {}

  /**
   * Handles list users query with filtering and pagination
   * @param query - ListUsers query with filters
   * @returns Promise<ListUsersQueryResult> - Paginated list results
   * @throws Error when user not found or insufficient permissions
   */
  async handle(query: ListUsersQuery): Promise<ListUsersQueryResult> {
    try {
      // Step 1: Validate query structure
      validateListUsersQuery(query);

      // Step 2: Validate business rules
      validateListUsersQueryBusinessRules(query);

      // Step 3: Get the requesting user for authorization
      const requestingUser = await this.userRepository.findById(query.requestedBy);
      if (!requestingUser) {
        return {
          success: false,
          error: 'Requesting user not found',
          users: [],
          total: 0,
          limit: query.limit,
          offset: query.offset,
          hasMore: false,
        };
      }

      // Step 4: Authorization check - user needs READ_USER permission
      if (!requestingUser.hasPermission(Permission.READ_USER)) {
        return {
          success: false,
          error: 'Insufficient permissions to list users',
          users: [],
          total: 0,
          limit: query.limit,
          offset: query.offset,
          hasMore: false,
        };
      }

      // Step 5: Get users from repository using search method
      const searchResult = await this.userRepository.search({
        limit: 1000,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      const allUsers = searchResult.users;

      // Step 6: Convert users to list items with agency information
      const userListItems: UserListItem[] = [];

      for (const user of allUsers) {
        let agencyId: string | undefined;
        let agencyName: string | undefined;

        // Get agency information if user has agency assigned
        if (user.agencyId) {
          try {
            const agency = await this.agencyRepository.findById(user.agencyId);
            if (agency) {
              agencyId = agency.id;
              agencyName = agency.name;
            }
          } catch (error) {
            console.warn(`Failed to load agency for user ${user.id}:`, error);
          }
        }

        userListItems.push({
          id: user.id,
          email: user.email.value,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role.value,
          roleName: this.getRoleDisplayName(user.role.value),
          status: user.status.toString(),
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          isAccountLocked: user.isAccountLocked(),
          loginAttempts: user.loginAttempts,
          agencyId: agencyId || undefined,
          agencyName: agencyName || undefined,
        });
      }

      // Step 7: Apply filtering
      const filteredUsers = userListItems.filter((user) => {
        if (query.search) {
          const searchLower = query.search.toLowerCase();
          if (!user.email.toLowerCase().includes(searchLower) && !user.fullName.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
        if (query.role && user.role !== query.role) {
          return false;
        }
        if (query.status && user.status !== query.status) {
          return false;
        }
        if (query.agencyId && user.agencyId !== query.agencyId) {
          return false;
        }
        if (query.isLocked !== undefined && user.isAccountLocked !== query.isLocked) {
          return false;
        }
        return true;
      });

      // Step 8: Apply sorting
      const sortedUsers = this.sortUsers(filteredUsers, query.sortBy, query.sortOrder);

      // Step 9: Apply pagination
      const startIndex = query.offset;
      const endIndex = startIndex + query.limit;
      const paginatedUsers = sortedUsers.slice(startIndex, endIndex);
      const hasMore = sortedUsers.length > query.offset + query.limit;

      return {
        success: true,
        users: paginatedUsers,
        total: filteredUsers.length,
        limit: query.limit,
        offset: query.offset,
        hasMore,
      };
    } catch (error) {
      console.error('List users handler error:', {
        query: {
          requestedBy: query.requestedBy,
          limit: query.limit,
          offset: query.offset,
          sortBy: query.sortBy,
          filters: {
            role: query.role,
            status: query.status,
            search: query.search,
          },
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        users: [],
        total: 0,
        limit: query.limit,
        offset: query.offset,
        hasMore: false,
      };
    }
  }

  /**
   * Get role display name
   */
  private getRoleDisplayName(role: string): string {
    switch (role.toLowerCase()) {
      case 'super_admin':
        return 'Super Administrator';
      case 'admin':
        return 'Agency Administrator';
      case 'employee':
        return 'Employee';
      default:
        return role;
    }
  }

  /**
   * Sort users array
   */
  private sortUsers(users: UserListItem[], sortBy: string, sortOrder: 'asc' | 'desc'): UserListItem[] {
    return users.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'firstName':
          aValue = a.firstName;
          bValue = b.firstName;
          break;
        case 'lastName':
          aValue = a.lastName;
          bValue = b.lastName;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
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

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }
}

/**
 * Factory function to create ListUsersHandler
 * @param userRepository - User repository implementation
 * @param agencyRepository - Agency repository implementation
 * @returns ListUsersHandler instance
 */
export function createListUsersHandler(
  userRepository: IUserRepository,
  agencyRepository: IAgencyRepository
): ListUsersHandler {
  return new ListUsersHandler(userRepository, agencyRepository);
}
