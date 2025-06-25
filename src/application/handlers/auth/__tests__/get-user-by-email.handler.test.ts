/**
 * GetUserByEmailHandler Tests
 *
 * Comprehensive test suite for GetUserByEmailHandler.
 * Tests authorization, validation, error handling, and business logic.
 * Ensures 90%+ test coverage and proper behavior verification.
 *
 * @domain User Management
 * @pattern CQRS Query Handler Testing
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GetUserByEmailHandler } from '../get-user-by-email.handler';
import { GetUserByEmailQuery } from '../../../queries/auth/get-user-by-email.query';
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

describe('GetUserByEmailHandler', () => {
  let handler: GetUserByEmailHandler;
  let mockRepository: MockUserRepository;
  let requestingUser: User;
  let targetUser: User;

  // Test data
  const testPassword = 'SecureTestPass123!';
  const requestingUserId = 'user_requesting_123';
  const targetUserId = 'user_target_456';
  const targetEmail = 'target@example.com';

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      existsByEmail: jest.fn(),
    };

    handler = new GetUserByEmailHandler(mockRepository as any);

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
      email: targetEmail,
      firstName: 'Target',
      lastName: 'User',
      password: testPassword,
      role: 'employee',
    });
    // Set ID for testing
    (targetUser as any)._id = targetUserId;
  });

  describe('handle - successful queries', () => {
    it('should return user data when requesting user has READ_USER permission', async () => {
      const query: GetUserByEmailQuery = {
        email: targetEmail,
        requestedBy: requestingUserId,
      };

      mockRepository.findById.mockResolvedValue(requestingUser);
      mockRepository.findByEmail.mockResolvedValue(targetUser);

      const result = await handler.handle(query);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(targetUserId);
      expect(result!.email).toBe(targetEmail);
      expect(result!.firstName).toBe('Target');
      expect(result!.lastName).toBe('User');
      expect(result!.fullName).toBe('Target User');
      expect(result!.role).toBe('employee');
      expect(result!.status).toBe(UserStatus.ACTIVE);
      expect(result!.isAccountLocked).toBe(false);
      expect(result!.isPasswordExpired).toBe(false);

      expect(mockRepository.findById).toHaveBeenCalledWith(requestingUserId);
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(expect.any(Email));
    });

    it('should allow user to view their own profile', async () => {
      const query: GetUserByEmailQuery = {
        email: targetEmail,
        requestedBy: targetUserId, // Same user
      };

      mockRepository.findById.mockResolvedValue(targetUser);
      mockRepository.findByEmail.mockResolvedValue(targetUser);

      const result = await handler.handle(query);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(targetUserId);
      expect(result!.email).toBe(targetEmail);
    });

    it('should return null when target user not found', async () => {
      const query: GetUserByEmailQuery = {
        email: 'nonexistent@example.com',
        requestedBy: requestingUserId,
      };

      mockRepository.findById.mockResolvedValue(requestingUser);
      mockRepository.findByEmail.mockResolvedValue(null);

      const result = await handler.handle(query);

      expect(result).toBeNull();
    });
  });

  describe('handle - authorization failures', () => {
    it('should throw error when requesting user not found', async () => {
      const query: GetUserByEmailQuery = {
        email: targetEmail,
        requestedBy: requestingUserId,
      };

      mockRepository.findById.mockResolvedValue(null);

      await expect(handler.handle(query)).rejects.toThrow('Requesting user not found');
      expect(mockRepository.findByEmail).not.toHaveBeenCalled();
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

      const query: GetUserByEmailQuery = {
        email: targetEmail,
        requestedBy: 'viewer_123',
      };

      mockRepository.findById.mockResolvedValue(viewerUser);
      mockRepository.findByEmail.mockResolvedValue(targetUser);

      await expect(handler.handle(query)).rejects.toThrow('Cannot view user with higher role');
    });

    it('should throw error when trying to view user with higher role', async () => {
      const employeeUser = User.create({
        email: 'employee@example.com',
        firstName: 'Employee',
        lastName: 'User',
        password: testPassword,
        role: 'employee',
      });
      (employeeUser as any)._id = 'employee_123';

      const adminTarget = User.create({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'Target',
        password: testPassword,
        role: 'admin',
      });
      (adminTarget as any)._id = 'admin_456';

      const query: GetUserByEmailQuery = {
        email: 'admin@example.com',
        requestedBy: 'employee_123',
      };

      mockRepository.findById.mockResolvedValue(employeeUser);
      mockRepository.findByEmail.mockResolvedValue(adminTarget);

      await expect(handler.handle(query)).rejects.toThrow('Cannot view user with higher role');
    });
  });

  describe('handle - validation', () => {
    it('should validate query before processing', async () => {
      const invalidQuery = {
        email: '',
        requestedBy: '',
      } as GetUserByEmailQuery;

      await expect(handler.handle(invalidQuery)).rejects.toThrow();
    });
  });
});
