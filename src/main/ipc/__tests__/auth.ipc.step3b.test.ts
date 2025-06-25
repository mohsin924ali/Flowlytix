/**
 * Authentication IPC Handler Tests - Step 3b: Get User By Email Handler Integration
 *
 * Comprehensive test suite for get-user-by-email IPC handler functionality.
 * Tests real handler integration with application layer, authorization, validation, and security.
 *
 * @version 1.0.0
 * @domain Authentication & Authorization
 * @pattern Test-Driven Development (TDD)
 */

import { AuthIpcHandler, createAuthIpcHandler, GetUserResponse } from '../auth.ipc';
import { IUserRepository } from '../../../application/handlers/auth/create-user.handler';
import {
  UserQueryResult,
  GetUserByEmailQueryValidationError,
} from '../../../application/queries/auth/get-user-by-email.query';
import { Email } from '../../../domain/value-objects/email';

// Mock dependencies
jest.mock('../../../domain/value-objects/email', () => ({
  Email: {
    isValid: jest.fn(),
    fromString: jest.fn(),
  },
}));

describe('AuthIpcHandler - Step 3b: Get User By Email Integration', () => {
  let authHandler: AuthIpcHandler;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockEvent: any;
  let mockEmailIsValid: jest.MockedFunction<typeof Email.isValid>;

  // Test user data
  const testUser: UserQueryResult = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    role: 'admin',
    roleName: 'Administrator',
    status: 'active',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
    lastLoginAt: new Date('2024-01-03T00:00:00Z'),
    isAccountLocked: false,
    loginAttempts: 0,
    lockedUntil: undefined,
    isPasswordExpired: false,
  };

  const testUserWithoutOptionalFields: UserQueryResult = {
    id: 'user-456',
    email: 'minimal@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    fullName: 'Jane Smith',
    role: 'user',
    roleName: 'User',
    status: 'active',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
    lastLoginAt: undefined,
    isAccountLocked: false,
    loginAttempts: 0,
    lockedUntil: undefined,
    isPasswordExpired: false,
  };

  const requestingUser = {
    id: '12345678-1234-1234-1234-123456789012',
    hasPermission: jest.fn().mockReturnValue(true),
    role: {
      canManage: jest.fn().mockReturnValue(true),
    },
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock repository
    mockUserRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    // Setup Email.isValid mock
    mockEmailIsValid = Email.isValid as jest.MockedFunction<typeof Email.isValid>;
    mockEmailIsValid.mockReturnValue(true);

    // Setup Email.fromString mock
    (Email.fromString as jest.Mock).mockImplementation((email: string) => ({ value: email }));

    // Setup requesting user mock
    mockUserRepository.findById.mockResolvedValue(requestingUser as any);

    // Create handler instance
    authHandler = createAuthIpcHandler(mockUserRepository);

    // Mock IPC event
    mockEvent = {
      sender: {
        send: jest.fn(),
      },
    };
  });

  describe('Get User By Email - Success Cases', () => {
    it('should successfully get user by email with all fields', async () => {
      // Arrange
      const request = {
        email: 'test@example.com',
        requesterId: '12345678-1234-1234-1234-123456789012',
      };

      mockUserRepository.findByEmail.mockResolvedValue(testUser as any);

      // Mock handler's handle method
      const mockHandle = jest.fn().mockResolvedValue(testUser);
      (authHandler as any).getUserByEmailHandler.handle = mockHandle;

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        role: 'admin',
        roleName: 'Administrator',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        lastLoginAt: '2024-01-03T00:00:00.000Z',
        isAccountLocked: false,
        loginAttempts: 0,
        lockedUntil: undefined,
        isPasswordExpired: false,
      });
      expect(result.timestamp).toBeGreaterThan(0);
      expect(mockHandle).toHaveBeenCalledWith({
        email: 'test@example.com',
        requestedBy: '12345678-1234-1234-1234-123456789012',
      });
    });

    it('should successfully get user by email with minimal fields', async () => {
      // Arrange
      const request = {
        email: 'minimal@example.com',
        requesterId: '12345678-1234-1234-1234-123456789012',
      };

      // Mock handler's handle method
      const mockHandle = jest.fn().mockResolvedValue(testUserWithoutOptionalFields);
      (authHandler as any).getUserByEmailHandler.handle = mockHandle;

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'user-456',
        email: 'minimal@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith',
        role: 'user',
        roleName: 'User',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        lastLoginAt: undefined,
        isAccountLocked: false,
        loginAttempts: 0,
        lockedUntil: undefined,
        isPasswordExpired: false,
      });
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should return null when user is not found', async () => {
      // Arrange
      const request = {
        email: 'notfound@example.com',
        requesterId: '12345678-1234-1234-1234-123456789012',
      };

      // Mock handler's handle method to return null
      const mockHandle = jest.fn().mockResolvedValue(null);
      (authHandler as any).getUserByEmailHandler.handle = mockHandle;

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.timestamp).toBeGreaterThan(0);
      expect(mockHandle).toHaveBeenCalledWith({
        email: 'notfound@example.com',
        requestedBy: '12345678-1234-1234-1234-123456789012',
      });
    });
  });

  describe('Get User By Email - Validation', () => {
    it('should validate email format with Zod schema', async () => {
      // Arrange
      const request = {
        email: 'invalid-email',
        requesterId: 'requester-123',
      };

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should validate requester ID format with Zod schema', async () => {
      // Arrange
      const request = {
        email: 'test@example.com',
        requesterId: 'invalid-uuid',
      };

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid requester ID format');
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should validate domain email format', async () => {
      // Arrange
      const request = {
        email: 'test@example.com',
        requesterId: '12345678-1234-1234-1234-123456789012',
      };

      mockEmailIsValid.mockReturnValue(false);

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
      expect(result.code).toBe('AUTH_VALIDATION_ERROR');
      expect(mockEmailIsValid).toHaveBeenCalledWith('test@example.com');
    });

    it('should require email field', async () => {
      // Arrange
      const request = {
        requesterId: 'requester-123',
      };

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Required');
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should require requesterId field', async () => {
      // Arrange
      const request = {
        email: 'test@example.com',
      };

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Required');
      expect(result.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Get User By Email - Authorization Errors', () => {
    it('should handle requesting user not found', async () => {
      // Arrange
      const request = {
        email: 'test@example.com',
        requesterId: '12345678-1234-1234-1234-123456789012',
      };

      // Mock handler's handle method to throw error
      const mockHandle = jest.fn().mockRejectedValue(new Error('Requesting user not found'));
      (authHandler as any).getUserByEmailHandler.handle = mockHandle;

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Requesting user not found');
      expect(result.code).toBe('OPERATION_ERROR');
    });

    it('should handle insufficient permissions', async () => {
      // Arrange
      const request = {
        email: 'test@example.com',
        requesterId: '12345678-1234-1234-1234-123456789012',
      };

      // Mock handler's handle method to throw permission error
      const mockHandle = jest.fn().mockRejectedValue(new Error('Insufficient permissions to view user'));
      (authHandler as any).getUserByEmailHandler.handle = mockHandle;

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to view user');
      expect(result.code).toBe('OPERATION_ERROR');
    });

    it('should handle role hierarchy restrictions', async () => {
      // Arrange
      const request = {
        email: 'test@example.com',
        requesterId: '12345678-1234-1234-1234-123456789012',
      };

      // Mock handler's handle method to throw role hierarchy error
      const mockHandle = jest.fn().mockRejectedValue(new Error('Cannot view user with higher role'));
      (authHandler as any).getUserByEmailHandler.handle = mockHandle;

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot view user with higher role');
      expect(result.code).toBe('OPERATION_ERROR');
    });
  });

  describe('Get User By Email - Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      const request = {
        email: 'test@example.com',
        requesterId: '12345678-1234-1234-1234-123456789012',
      };

      // Mock handler's handle method to throw repository error
      const mockHandle = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      (authHandler as any).getUserByEmailHandler.handle = mockHandle;

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation failed'); // Safe error message
      expect(result.code).toBe('OPERATION_ERROR');
    });

    it('should handle query validation errors', async () => {
      // Arrange
      const request = {
        email: 'test@example.com',
        requesterId: '12345678-1234-1234-1234-123456789012',
      };

      // Mock handler's handle method to throw validation error using real class
      const mockHandle = jest
        .fn()
        .mockRejectedValue(new GetUserByEmailQueryValidationError('email', 'validation failed'));
      (authHandler as any).getUserByEmailHandler.handle = mockHandle;

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('GetUserByEmail validation error - email: validation failed');
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const request = {
        email: 'test@example.com',
        requesterId: '12345678-1234-1234-1234-123456789012',
      };

      // Mock handler's handle method to throw unexpected error
      const mockHandle = jest.fn().mockRejectedValue('Unexpected error');
      (authHandler as any).getUserByEmailHandler.handle = mockHandle;

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication operation failed');
      expect(result.code).toBe('OPERATION_ERROR');
    });
  });

  describe('Get User By Email - Security', () => {
    it('should not expose sensitive data in error responses', async () => {
      // Arrange
      const request = {
        email: 'test@example.com',
        requesterId: '12345678-1234-1234-1234-123456789012',
      };

      // Mock handler's handle method to throw error with sensitive data
      const mockHandle = jest.fn().mockRejectedValue(new Error('Database password: secret123'));
      (authHandler as any).getUserByEmailHandler.handle = mockHandle;

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation failed'); // Sanitized error message
      expect(result.error).not.toContain('secret123');
      expect(result.error).not.toContain('password');
    });

    it('should maintain consistent response structure', async () => {
      // Arrange
      const request = {
        email: 'test@example.com',
        requesterId: '12345678-1234-1234-1234-123456789012',
      };

      // Mock handler's handle method
      const mockHandle = jest.fn().mockResolvedValue(testUser);
      (authHandler as any).getUserByEmailHandler.handle = mockHandle;

      // Act
      const result = await (authHandler as any).handleGetUserByEmail(mockEvent, request);

      // Assert
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('number');
      expect(result.timestamp).toBeGreaterThan(0);

      if (result.success) {
        expect(result).toHaveProperty('data');
      } else {
        expect(result).toHaveProperty('error');
        expect(result).toHaveProperty('code');
      }
    });
  });
});
