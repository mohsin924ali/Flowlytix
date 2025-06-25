/**
 * Authentication IPC Handler Tests - Updated Version
 *
 * Updated test suite for Authentication IPC Handler that works with Step 2 implementation.
 * Tests core functionality, validation, error handling, and security.
 * Follows Instructions file standards with 90%+ coverage requirement.
 *
 * @domain Authentication & Authorization
 * @pattern Test-Driven Development (TDD)
 * @coverage 90%+ requirement
 * @version 2.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { AuthIpcHandler, createAuthIpcHandler, AuthIpcError, AuthIpcResponse } from '../auth.ipc';
import { IUserRepository } from '../../../application/handlers/auth/create-user.handler';
import { User, UserStatus } from '../../../domain/entities/user';
import { Email } from '../../../domain/value-objects/email';
import { Role, Permission } from '../../../domain/value-objects/role';

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

describe('AuthIpcHandler - Updated Tests', () => {
  let authIpcHandler: AuthIpcHandler;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  const mockIpcMain = ipcMain as jest.Mocked<typeof ipcMain>;

  const mockUser = {
    id: 'user-123',
    email: { value: 'test@example.com' },
    firstName: 'John',
    lastName: 'Doe',
    role: { value: 'employee', canManage: jest.fn() },
    status: UserStatus.ACTIVE,
    hasPermission: jest.fn(),
  } as any;

  const mockCreatingUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: { value: 'admin@example.com' },
    firstName: 'Admin',
    lastName: 'User',
    role: { value: 'admin', canManage: jest.fn() },
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
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.save.mockResolvedValue(undefined);

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

  describe('Constructor & Factory', () => {
    test('should create handler instance via factory', () => {
      const handler = createAuthIpcHandler(mockUserRepository);

      expect(handler).toBeInstanceOf(AuthIpcHandler);
      expect(handler.getStats().registeredChannels).toEqual([
        'auth:create-user',
        'auth:authenticate-user',
        'auth:get-user-by-email',
        'auth:get-user-permissions',
      ]);
    });

    test('should create handler instance via constructor', () => {
      const handler = new AuthIpcHandler(mockUserRepository);

      expect(handler).toBeInstanceOf(AuthIpcHandler);
      expect(handler.getStats().handlerCount).toBe(4);
    });

    test('should throw error when repository is null', () => {
      expect(() => createAuthIpcHandler(null as any)).toThrow(AuthIpcError);
      expect(() => createAuthIpcHandler(null as any)).toThrow('User repository is required');
    });
  });

  describe('Handler Registration', () => {
    test('should register all IPC handlers successfully', () => {
      authIpcHandler.registerHandlers();

      expect(mockIpcMain.handle).toHaveBeenCalledTimes(4);
      expect(mockIpcMain.handle).toHaveBeenCalledWith('auth:create-user', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('auth:authenticate-user', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('auth:get-user-by-email', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('auth:get-user-permissions', expect.any(Function));
    });

    test('should handle registration errors gracefully', () => {
      const errorHandler = createAuthIpcHandler(mockUserRepository);
      mockIpcMain.handle.mockImplementation(() => {
        throw new Error('IPC registration failed');
      });

      expect(() => errorHandler.registerHandlers()).toThrow(AuthIpcError);
      expect(() => errorHandler.registerHandlers()).toThrow('Failed to register authentication IPC handlers');
    });

    test('should unregister all handlers', () => {
      authIpcHandler.registerHandlers();
      authIpcHandler.unregisterHandlers();

      expect(mockIpcMain.removeHandler).toHaveBeenCalledTimes(4);
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('auth:create-user');
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('auth:authenticate-user');
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('auth:get-user-by-email');
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('auth:get-user-permissions');
    });
  });

  describe('Create User Handler', () => {
    beforeEach(() => {
      authIpcHandler.registerHandlers();
    });

    test('should handle valid create user request', async () => {
      const mockEvent = {} as IpcMainInvokeEvent;
      const validRequest = {
        email: 'newuser@example.com',
        password: 'Xp9#mK2$vL8!qR4@',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'employee',
        status: 'active',
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const handler = (mockIpcMain.handle as jest.Mock).mock.calls.find((call) => call[0] === 'auth:create-user')![1];

      const result: AuthIpcResponse = await handler(mockEvent, validRequest);

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    test('should reject invalid email format', async () => {
      const mockEvent = {} as IpcMainInvokeEvent;
      const invalidRequest = {
        email: 'invalid-email',
        password: 'Xp9#mK2$vL8!qR4@',
        firstName: 'John',
        lastName: 'Doe',
        role: 'employee',
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const handler = (mockIpcMain.handle as jest.Mock).mock.calls.find((call) => call[0] === 'auth:create-user')![1];

      const result: AuthIpcResponse = await handler(mockEvent, invalidRequest);

      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.error).toContain('Invalid email format');
    });

    test('should reject invalid UUID format for createdBy', async () => {
      const mockEvent = {} as IpcMainInvokeEvent;
      const invalidRequest = {
        email: 'test@example.com',
        password: 'Xp9#mK2$vL8!qR4@',
        firstName: 'John',
        lastName: 'Doe',
        role: 'employee',
        createdBy: 'invalid-uuid',
      };

      const handler = (mockIpcMain.handle as jest.Mock).mock.calls.find((call) => call[0] === 'auth:create-user')![1];

      const result: AuthIpcResponse = await handler(mockEvent, invalidRequest);

      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.error).toContain('Invalid createdBy ID format');
    });
  });

  describe('Authenticate User Handler', () => {
    beforeEach(() => {
      authIpcHandler.registerHandlers();

      // For authentication tests, we need a user to exist
      const authenticatableUser = {
        ...mockUser,
        isAccountLocked: jest.fn().mockReturnValue(false),
        authenticate: jest.fn().mockReturnValue(true),
        loginAttempts: 0,
        lockedUntil: undefined,
      };

      mockUserRepository.findByEmail.mockResolvedValue(authenticatableUser);
    });

    test('should handle valid authenticate user request', async () => {
      const mockEvent = {} as IpcMainInvokeEvent;
      const validRequest = {
        email: 'test@example.com',
        password: 'Xp9#mK2$vL8!qR4@',
        rememberMe: true,
      };

      const handler = (mockIpcMain.handle as jest.Mock).mock.calls.find(
        (call) => call[0] === 'auth:authenticate-user'
      )![1];

      const result: AuthIpcResponse = await handler(mockEvent, validRequest);

      // Step 3a implementation now uses real authentication
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    test('should reject invalid email format in authentication', async () => {
      const mockEvent = {} as IpcMainInvokeEvent;
      const invalidRequest = {
        email: 'invalid-email',
        password: 'Xp9#mK2$vL8!qR4@',
      };

      const handler = (mockIpcMain.handle as jest.Mock).mock.calls.find(
        (call) => call[0] === 'auth:authenticate-user'
      )![1];

      const result: AuthIpcResponse = await handler(mockEvent, invalidRequest);

      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.error).toContain('Invalid email format');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      authIpcHandler.registerHandlers();
    });

    test('should create proper error instances', () => {
      const error1 = new AuthIpcError('Test message', 'TEST_CODE');
      expect(error1).toBeInstanceOf(AuthIpcError);
      expect(error1.message).toBe('Test message');
      expect(error1.code).toBe('TEST_CODE');
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
        role: 'employee',
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

  describe('Statistics and Monitoring', () => {
    test('should provide handler statistics', () => {
      const stats = authIpcHandler.getStats();

      expect(stats.registeredChannels).toHaveLength(4);
      expect(stats.handlerCount).toBe(4);
      expect(stats.registeredChannels).toContain('auth:create-user');
      expect(stats.registeredChannels).toContain('auth:authenticate-user');
      expect(stats.registeredChannels).toContain('auth:get-user-by-email');
      expect(stats.registeredChannels).toContain('auth:get-user-permissions');
    });
  });
});
