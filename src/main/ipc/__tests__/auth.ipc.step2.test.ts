/**
 * Authentication IPC Handler Tests - Step 2: User Creation Integration
 *
 * Comprehensive test suite for Authentication IPC Handler with real functionality.
 * Tests repository integration, user creation flow, error scenarios, and security.
 * Follows Instructions file standards with 90%+ coverage requirement.
 *
 * @domain Authentication & Authorization
 * @pattern Test-Driven Development (TDD)
 * @coverage 90%+ requirement
 * @version 1.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { AuthIpcHandler, createAuthIpcHandler, AuthIpcError, AuthIpcResponse, CreateUserResponse } from '../auth.ipc';
import { IUserRepository } from '../../../application/handlers/auth/create-user.handler';
import { User, UserStatus } from '../../../domain/entities/user';
import { Email } from '../../../domain/value-objects/email';
import { Role } from '../../../domain/value-objects/role';
import { CreateUserCommandValidationError } from '../../../application/commands/auth/create-user.command';
import { Permission } from '../../../domain/value-objects/role';

// Mock Electron IPC
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn(),
  },
}));

// Mock domain entities
jest.mock('../../../domain/entities/user');
jest.mock('../../../domain/value-objects/email');
jest.mock('../../../domain/value-objects/role');

describe('AuthIpcHandler - Step 2: User Creation Integration', () => {
  let authIpcHandler: AuthIpcHandler;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  const mockIpcMain = ipcMain as jest.Mocked<typeof ipcMain>;

  // Mock user instance
  const mockUser = {
    id: 'user-123',
    email: { value: 'test@example.com' },
    firstName: 'John',
    lastName: 'Doe',
    role: { value: 'USER', canManage: jest.fn() },
    status: UserStatus.ACTIVE,
    hasPermission: jest.fn(),
  } as any;

  // Mock creating user instance
  const mockCreatingUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: { value: 'creator@example.com' },
    firstName: 'Admin',
    lastName: 'User',
    role: { value: 'ADMIN', canManage: jest.fn() },
    status: UserStatus.ACTIVE,
    hasPermission: jest.fn((permission) => permission === Permission.CREATE_USER),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockIpcMain.handle.mockImplementation(() => {});

    // Setup mock repository
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
      existsByEmail: jest.fn(),
      update: jest.fn(),
      search: jest.fn(),
      findAll: jest.fn(),
      findByRole: jest.fn(),
      findByStatus: jest.fn(),
      findLockedUsers: jest.fn(),
      count: jest.fn(),
      countByCriteria: jest.fn(),
      delete: jest.fn(),
      getStats: jest.fn(),
      isHealthy: jest.fn(),
      beginTransaction: jest.fn(),
    } as any;

    // Setup successful repository responses by default
    mockUserRepository.findById.mockResolvedValue(mockCreatingUser);
    mockUserRepository.findByEmail.mockResolvedValue(null); // No existing user
    mockUserRepository.save.mockResolvedValue(mockUser);

    // Mock domain constructors and validators
    (Email.fromString as jest.Mock).mockReturnValue(mockUser.email);
    (Email.isValid as jest.Mock).mockReturnValue(true);
    (Role.fromString as jest.Mock).mockReturnValue(mockCreatingUser.role);
    (Role.isValid as jest.Mock).mockReturnValue(true);
    (User.create as jest.Mock).mockReturnValue(mockUser);
    mockCreatingUser.role.canManage.mockReturnValue(true);

    authIpcHandler = createAuthIpcHandler(mockUserRepository);
  });

  afterEach(() => {
    authIpcHandler.unregisterHandlers();
  });

  describe('Constructor with Repository', () => {
    test('should create handler with valid repository', () => {
      const handler = createAuthIpcHandler(mockUserRepository);

      expect(handler).toBeInstanceOf(AuthIpcHandler);
      expect(handler.getStats().registeredChannels).toEqual([
        'auth:create-user',
        'auth:authenticate-user',
        'auth:get-user-by-email',
        'auth:get-user-permissions',
      ]);
    });

    test('should throw error when repository is null', () => {
      expect(() => createAuthIpcHandler(null as any)).toThrow(AuthIpcError);
      expect(() => createAuthIpcHandler(null as any)).toThrow('User repository is required');
    });
  });

  describe('Create User Handler - Step 2 (Real Implementation)', () => {
    beforeEach(() => {
      authIpcHandler.registerHandlers();
    });

    test('should create user successfully with valid request', async () => {
      const mockEvent = {} as IpcMainInvokeEvent;
      const validRequest = {
        email: 'newuser@example.com',
        password: 'Xp9#mK2$vL8!qR4@',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'employee', // Use valid SystemRole value
        status: 'active', // Use correct UserStatus value
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const handler = (mockIpcMain.handle as jest.Mock).mock.calls.find((call) => call[0] === 'auth:create-user')![1];

      const result: AuthIpcResponse<CreateUserResponse> = await handler(mockEvent, validRequest);

      expect(result.success).toBe(true);
      expect(result.data?.userId).toBe('user-123');
      expect(result.timestamp).toBeGreaterThan(0);

      // Verify repository calls
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });

    test('should handle creating user not found', async () => {
      // Setup validation to pass for this test
      (Email.isValid as jest.Mock).mockReturnValueOnce(true);
      (Role.isValid as jest.Mock).mockReturnValueOnce(true);

      // Mock repository to return null for creating user lookup
      mockUserRepository.findById.mockResolvedValueOnce(null);

      const mockEvent = {} as IpcMainInvokeEvent;
      const validRequest = {
        email: 'newuser@example.com',
        password: 'Xp9#mK2$vL8!qR4@',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'employee', // Use valid SystemRole value
        createdBy: '550e8400-e29b-41d4-a716-446655440002',
      };

      const handler = (mockIpcMain.handle as jest.Mock).mock.calls.find((call) => call[0] === 'auth:create-user')![1];

      const result: AuthIpcResponse = await handler(mockEvent, validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Creating user not found');
      expect(result.code).toBe('OPERATION_ERROR');
    });

    test('should handle input validation errors from Zod schema', async () => {
      const mockEvent = {} as IpcMainInvokeEvent;
      const invalidRequest = {
        email: 'invalid-email', // Invalid email format (Zod will catch this)
        password: 'Xp9#mK2$vL8!qR4@',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'employee', // Use valid SystemRole value
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const handler = (mockIpcMain.handle as jest.Mock).mock.calls.find((call) => call[0] === 'auth:create-user')![1];

      const result: AuthIpcResponse = await handler(mockEvent, invalidRequest);

      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.error).toContain('Invalid email format');
    });

    test('should handle domain layer validation errors', async () => {
      // Mock Email.isValid to return false for this specific test
      (Email.isValid as jest.Mock).mockReturnValueOnce(false);

      const mockEvent = {} as IpcMainInvokeEvent;
      const validRequest = {
        email: 'test@example.com', // Valid format but will be rejected by domain mock
        password: 'Xp9#mK2$vL8!qR4@',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'employee', // Use valid SystemRole value
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const handler = (mockIpcMain.handle as jest.Mock).mock.calls.find((call) => call[0] === 'auth:create-user')![1];

      const result: AuthIpcResponse = await handler(mockEvent, validRequest);

      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.error).toContain('Invalid email format');
    });
  });

  describe('Error Handling and Security', () => {
    beforeEach(() => {
      authIpcHandler.registerHandlers();
    });

    test('should handle getSafeErrorMessage correctly', () => {
      const getSafeErrorMessage = (authIpcHandler as any).getSafeErrorMessage.bind(authIpcHandler);

      // Test safe messages
      expect(getSafeErrorMessage('Creating user not found')).toBe('Creating user not found');
      expect(getSafeErrorMessage('Insufficient permissions to create user')).toBe(
        'Insufficient permissions to create user'
      );

      // Test unsafe messages
      expect(getSafeErrorMessage('Database connection string: postgres://user:pass@host')).toBe('Operation failed');
      expect(getSafeErrorMessage('Unknown error message')).toBe('Operation failed');
    });

    test('should not expose sensitive data in error responses', async () => {
      // Setup validation to pass
      (Email.isValid as jest.Mock).mockReturnValueOnce(true);
      (Role.isValid as jest.Mock).mockReturnValueOnce(true);

      // Mock the repository save to fail with sensitive error
      mockUserRepository.save.mockRejectedValueOnce(new Error('Database connection string: postgres://user:pass@host'));

      const mockEvent = {} as IpcMainInvokeEvent;
      const validRequest = {
        email: 'test@example.com',
        password: 'Xp9#mK2$vL8!qR4@',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'employee', // Use valid SystemRole value
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const handler = (mockIpcMain.handle as jest.Mock).mock.calls.find((call) => call[0] === 'auth:create-user')![1];

      const result: AuthIpcResponse = await handler(mockEvent, validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation failed'); // Safe generic message
      expect(result.error).not.toContain('postgres://');
      expect(result.error).not.toContain('connection string');
    });
  });
});
