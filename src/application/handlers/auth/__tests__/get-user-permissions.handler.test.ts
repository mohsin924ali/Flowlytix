/**
 * GetUserPermissionsHandler Tests
 *
 * Comprehensive test suite for GetUserPermissionsHandler.
 * Tests authorization, validation, error handling, and business logic.
 * Ensures 90%+ test coverage and proper behavior verification.
 *
 * @domain User Management
 * @pattern CQRS Query Handler Testing
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GetUserPermissionsHandler } from '../get-user-permissions.handler';
import { GetUserPermissionsQuery } from '../../../queries/auth/get-user-permissions.query';
import { User, UserStatus } from '../../../../domain/entities/user';
import { Email } from '../../../../domain/value-objects/email';
import { Role, Permission } from '../../../../domain/value-objects/role';
import { Password } from '../../../../domain/value-objects/password';

// Mock repository interface
interface MockUserRepository {
  findById: jest.MockedFunction<(id: string) => Promise<User | null>>;
  findByEmail: jest.MockedFunction<(email: Email) => Promise<User | null>>;
  save: jest.MockedFunction<(user: User) => Promise<User>>;
  update: jest.MockedFunction<(user: User) => Promise<User>>;
  existsByEmail: jest.MockedFunction<(email: Email) => Promise<boolean>>;
}

describe('GetUserPermissionsHandler', () => {
  let handler: GetUserPermissionsHandler;
  let mockRepository: MockUserRepository;
  let requestingUser: User;
  let targetUser: User;

  // Test data
  const testPassword = 'SecureTestPass123!';
  const requestingUserId = 'user_requesting_123';
  const targetUserId = 'user_target_456';

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      existsByEmail: jest.fn(),
    };

    handler = new GetUserPermissionsHandler(mockRepository as any);

    // Create test users
    requestingUser = User.create({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      password: testPassword,
      role: 'admin',
    });
    // Set ID for testing
    (requestingUser as any)._id = requestingUserId;

    targetUser = User.create({
      email: 'employee@example.com',
      firstName: 'Employee',
      lastName: 'User',
      password: testPassword,
      role: 'employee',
    });
    // Set ID for testing
    (targetUser as any)._id = targetUserId;
  });

  describe('handle - successful queries', () => {
    it('should return user permissions when requesting user has READ_USER permission', async () => {
      const query: GetUserPermissionsQuery = {
        userId: targetUserId,
        requestedBy: requestingUserId,
      };

      mockRepository.findById
        .mockResolvedValueOnce(requestingUser) // First call for requesting user
        .mockResolvedValueOnce(targetUser); // Second call for target user

      const result = await handler.handle(query);

      expect(result).not.toBeNull();
      expect(result!.userId).toBe(targetUserId);
      expect(result!.role).toBe('employee');
      expect(result!.permissions).toBeInstanceOf(Array);
      expect(result!.isActive).toBe(true);
      expect(result!.hierarchyLevel).toBe(3); // employee level

      expect(mockRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockRepository.findById).toHaveBeenNthCalledWith(1, requestingUserId);
      expect(mockRepository.findById).toHaveBeenNthCalledWith(2, targetUserId);
    });

    it('should allow user to view their own permissions', async () => {
      const query: GetUserPermissionsQuery = {
        userId: targetUserId,
        requestedBy: targetUserId, // Same user
      };

      mockRepository.findById
        .mockResolvedValueOnce(targetUser) // First call for requesting user
        .mockResolvedValueOnce(targetUser); // Second call for target user (same user)

      const result = await handler.handle(query);

      expect(result).not.toBeNull();
      expect(result!.userId).toBe(targetUserId);
      expect(result!.role).toBe('employee');
    });

    it('should return null when target user not found', async () => {
      const query: GetUserPermissionsQuery = {
        userId: 'nonexistent_id',
        requestedBy: requestingUserId,
      };

      mockRepository.findById.mockResolvedValueOnce(requestingUser).mockResolvedValueOnce(null);

      const result = await handler.handle(query);

      expect(result).toBeNull();
    });
  });

  describe('handle - authorization failures', () => {
    it('should throw error when requesting user not found', async () => {
      const query: GetUserPermissionsQuery = {
        userId: targetUserId,
        requestedBy: requestingUserId,
      };

      mockRepository.findById.mockResolvedValue(null);

      await expect(handler.handle(query)).rejects.toThrow('Requesting user not found');
    });

    it('should throw error when user lacks READ_USER permission', async () => {
      const viewerUser = User.create({
        email: 'viewer@example.com',
        firstName: 'Viewer',
        lastName: 'User',
        password: testPassword,
        role: 'viewer',
      });
      (viewerUser as any)._id = 'viewer_123';

      const query: GetUserPermissionsQuery = {
        userId: targetUserId,
        requestedBy: 'viewer_123',
      };

      mockRepository.findById.mockResolvedValueOnce(viewerUser).mockResolvedValueOnce(targetUser);

      await expect(handler.handle(query)).rejects.toThrow('Cannot view permissions of user with higher role');
    });
  });

  describe('handle - validation', () => {
    it('should validate query before processing', async () => {
      const invalidQuery = {
        userId: '',
        requestedBy: '',
      } as GetUserPermissionsQuery;

      await expect(handler.handle(invalidQuery)).rejects.toThrow();
    });
  });
});
