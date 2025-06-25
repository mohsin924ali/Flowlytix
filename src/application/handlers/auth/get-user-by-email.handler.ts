import {
  GetUserByEmailQuery,
  UserQueryResult,
  validateGetUserByEmailQuery,
} from '../../queries/auth/get-user-by-email.query';
import { User } from '../../../domain/entities/user';
import { Email } from '../../../domain/value-objects/email';
import { Permission } from '../../../domain/value-objects/role';
import { IUserRepository } from './create-user.handler';

/**
 * Handler for GetUserByEmail query
 * Implements secure user retrieval with authorization checks
 */
export class GetUserByEmailHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Handles get user by email query
   * @param query - GetUserByEmail query
   * @returns Promise<UserQueryResult | null> - User data or null if not found/unauthorized
   */
  async handle(query: GetUserByEmailQuery): Promise<UserQueryResult | null> {
    // Validate query
    validateGetUserByEmailQuery(query);

    // Get the requesting user for authorization
    const requestingUser = await this.userRepository.findById(query.requestedBy);
    if (!requestingUser) {
      throw new Error('Requesting user not found');
    }

    // Find the target user
    const email = Email.fromString(query.email);
    const targetUser = await this.userRepository.findByEmail(email);

    if (!targetUser) {
      return null;
    }

    // Authorization check - users can view their own profile or need READ_USER permission
    const canViewUser = requestingUser.id === targetUser.id || requestingUser.hasPermission(Permission.READ_USER);

    if (!canViewUser) {
      throw new Error('Insufficient permissions to view user');
    }

    // Additional check - users can only view users they can manage (role hierarchy)
    if (requestingUser.id !== targetUser.id && !requestingUser.role.canManage(targetUser.role)) {
      throw new Error('Cannot view user with higher role');
    }

    // Convert to query result
    const displayInfo = targetUser.getDisplayInfo();
    const persistenceData = targetUser.toPersistence();

    return {
      id: targetUser.id,
      email: displayInfo.email,
      firstName: persistenceData.firstName,
      lastName: persistenceData.lastName,
      fullName: displayInfo.fullName,
      role: displayInfo.role,
      roleName: displayInfo.roleName,
      status: displayInfo.status,
      createdAt: persistenceData.createdAt,
      updatedAt: persistenceData.updatedAt,
      lastLoginAt: displayInfo.lastLoginAt,
      isAccountLocked: displayInfo.isLocked,
      loginAttempts: targetUser.loginAttempts,
      lockedUntil: targetUser.lockedUntil,
      isPasswordExpired: displayInfo.isPasswordExpired,
    };
  }
}

/**
 * Factory function to create GetUserByEmailHandler
 * @param userRepository - User repository implementation
 * @returns GetUserByEmailHandler instance
 */
export function createGetUserByEmailHandler(userRepository: IUserRepository): GetUserByEmailHandler {
  return new GetUserByEmailHandler(userRepository);
}
