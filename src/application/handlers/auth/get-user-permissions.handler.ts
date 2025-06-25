import {
  GetUserPermissionsQuery,
  UserPermissionsResult,
  validateGetUserPermissionsQuery,
} from '../../queries/auth/get-user-permissions.query';
import { User } from '../../../domain/entities/user';
import { Permission } from '../../../domain/value-objects/role';
import { IUserRepository } from './create-user.handler';

/**
 * Handler for GetUserPermissions query
 * Implements secure permission retrieval for authorization
 */
export class GetUserPermissionsHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Handles get user permissions query
   * @param query - GetUserPermissions query
   * @returns Promise<UserPermissionsResult | null> - User permissions or null if not found/unauthorized
   */
  async handle(query: GetUserPermissionsQuery): Promise<UserPermissionsResult | null> {
    // Validate query
    validateGetUserPermissionsQuery(query);

    // Get the requesting user for authorization
    const requestingUser = await this.userRepository.findById(query.requestedBy);
    if (!requestingUser) {
      throw new Error('Requesting user not found');
    }

    // Find the target user
    const targetUser = await this.userRepository.findById(query.userId);
    if (!targetUser) {
      return null;
    }

    // Authorization check - users can view their own permissions or need READ_USER permission
    const canViewPermissions =
      requestingUser.id === targetUser.id || requestingUser.hasPermission(Permission.READ_USER);

    if (!canViewPermissions) {
      throw new Error('Insufficient permissions to view user permissions');
    }

    // Additional check - users can only view permissions of users they can manage (role hierarchy)
    if (requestingUser.id !== targetUser.id && !requestingUser.role.canManage(targetUser.role)) {
      throw new Error('Cannot view permissions of user with higher role');
    }

    // Get permissions from role
    const permissions = Array.from(targetUser.role.permissions);

    // Calculate hierarchy level (0 = highest, 4 = lowest)
    const hierarchy = ['super_admin', 'admin', 'manager', 'employee', 'viewer'];
    const hierarchyLevel = hierarchy.indexOf(targetUser.role.value);

    return {
      userId: targetUser.id,
      role: targetUser.role.value,
      permissions,
      isActive: targetUser.status === 'active',
      canManageUsers: targetUser.hasPermission(Permission.UPDATE_USER),
      hierarchyLevel,
    };
  }
}

/**
 * Factory function to create GetUserPermissionsHandler
 * @param userRepository - User repository implementation
 * @returns GetUserPermissionsHandler instance
 */
export function createGetUserPermissionsHandler(userRepository: IUserRepository): GetUserPermissionsHandler {
  return new GetUserPermissionsHandler(userRepository);
}
