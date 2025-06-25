/**
 * Authentication IPC Handler - Step 1: Core Handler
 *
 * Secure IPC bridge for authentication operations in Electron main process.
 * This is the minimal functional piece establishing the foundation for auth operations.
 * Follows security-first design with input validation and proper error handling.
 *
 * @domain Authentication & Authorization
 * @pattern Command/Query Responsibility Segregation (CQRS)
 * @architecture Hexagonal Architecture (Adapter)
 * @security Input validation, secure error handling
 * @version 1.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { Email } from '../../domain/value-objects/email';
import { CreateUserHandler, IUserRepository } from '../../application/handlers/auth/create-user.handler';
import { AuthenticateUserHandler } from '../../application/handlers/auth/authenticate-user.handler';
import { GetUserByEmailHandler } from '../../application/handlers/auth/get-user-by-email.handler';
import { GetUserPermissionsHandler } from '../../application/handlers/auth/get-user-permissions.handler';
import {
  CreateUserCommand,
  CreateUserCommandValidationError,
} from '../../application/commands/auth/create-user.command';
import {
  AuthenticateUserCommand,
  AuthenticationResult,
  AuthenticateUserCommandValidationError,
} from '../../application/commands/auth/authenticate-user.command';
import {
  GetUserByEmailQuery,
  UserQueryResult,
  GetUserByEmailQueryValidationError,
} from '../../application/queries/auth/get-user-by-email.query';
import {
  GetUserPermissionsQuery,
  UserPermissionsResult,
  GetUserPermissionsQueryValidationError,
} from '../../application/queries/auth/get-user-permissions.query';

/**
 * Authentication operation types for IPC
 */
export type AuthOperation = 'create-user' | 'authenticate-user' | 'get-user-by-email' | 'get-user-permissions';

/**
 * Input validation schemas using Zod for security
 */
const CreateUserRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
  firstName: z.string().min(1, 'First name required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name required').max(100, 'Last name too long'),
  role: z.string().min(1, 'Role required').max(50, 'Role too long'),
  status: z.string().optional(),
  createdBy: z.string().uuid('Invalid createdBy ID format'),
});

const AuthenticateUserRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  password: z.string().min(1, 'Password required').max(128, 'Password too long'),
  rememberMe: z.boolean().optional(),
});

const GetUserByEmailRequestSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  requesterId: z.string().uuid('Invalid requester ID format'),
});

const GetUserPermissionsRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  requesterId: z.string().uuid('Invalid requester ID format'),
});

/**
 * Authentication IPC response interface
 */
export interface AuthIpcResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly code?: string;
  readonly timestamp: number;
}

/**
 * Response interfaces for authentication operations
 */
export interface CreateUserResponse {
  readonly userId: string;
}

/**
 * Response interface for authenticate user operation
 */
export interface AuthenticateUserResponse {
  readonly success: boolean;
  readonly userId?: string;
  readonly message?: string;
  readonly attemptsRemaining?: number;
  readonly isLocked?: boolean;
  readonly lockoutExpiresAt?: string; // ISO string for IPC serialization
}

export interface GetUserResponse {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly role: string;
  readonly roleName: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastLoginAt?: string | undefined;
  readonly isAccountLocked: boolean;
  readonly loginAttempts: number;
  readonly lockedUntil?: string | undefined;
  readonly isPasswordExpired: boolean;
}

export interface GetUserPermissionsResponse {
  readonly userId: string;
  readonly role: string;
  readonly permissions: readonly string[];
  readonly isActive: boolean;
  readonly canManageUsers: boolean;
  readonly hierarchyLevel: number;
}

/**
 * Authentication IPC error hierarchy
 */
export class AuthIpcError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AuthIpcError';
  }
}

export class AuthValidationError extends AuthIpcError {
  constructor(message: string, cause?: Error) {
    super(message, 'AUTH_VALIDATION_ERROR', cause);
    this.name = 'AuthValidationError';
  }
}

export class AuthSecurityError extends AuthIpcError {
  constructor(message: string) {
    super(message, 'AUTH_SECURITY_ERROR');
    this.name = 'AuthSecurityError';
  }
}

export class AuthOperationError extends AuthIpcError {
  constructor(message: string, cause?: Error) {
    super(message, 'AUTH_OPERATION_ERROR', cause);
    this.name = 'AuthOperationError';
  }
}

/**
 * Authentication IPC Handler - Step 2: User Creation Integration
 *
 * Handles authentication operations through secure IPC channels.
 * Integrates with application layer handlers for real functionality.
 */
export class AuthIpcHandler {
  private readonly userRepository: IUserRepository;
  private readonly createUserHandler: CreateUserHandler;
  private readonly authenticateUserHandler: AuthenticateUserHandler;
  private readonly getUserByEmailHandler: GetUserByEmailHandler;
  private readonly getUserPermissionsHandler: GetUserPermissionsHandler;
  private readonly allowedChannels: readonly string[] = [
    'auth:create-user',
    'auth:authenticate-user',
    'auth:get-user-by-email',
    'auth:get-user-permissions',
  ] as const;

  /**
   * Creates Authentication IPC Handler with repository dependency injection
   * @param userRepository - User repository for data access
   * @throws {AuthIpcError} When repository is invalid
   */
  constructor(userRepository: IUserRepository) {
    this.validateRepository(userRepository);
    this.userRepository = userRepository;

    // Initialize application layer handlers
    this.createUserHandler = new CreateUserHandler(userRepository);
    this.authenticateUserHandler = new AuthenticateUserHandler(userRepository);
    this.getUserByEmailHandler = new GetUserByEmailHandler(userRepository);
    this.getUserPermissionsHandler = new GetUserPermissionsHandler(userRepository);
  }

  /**
   * Registers all authentication IPC handlers
   * @throws {AuthIpcError} When registration fails
   */
  public registerHandlers(): void {
    try {
      ipcMain.handle('auth:create-user', this.handleCreateUser.bind(this));
      ipcMain.handle('auth:authenticate-user', this.handleAuthenticateUser.bind(this));
      ipcMain.handle('auth:get-user-by-email', this.handleGetUserByEmail.bind(this));
      ipcMain.handle('auth:get-user-permissions', this.handleGetUserPermissions.bind(this));
    } catch (error) {
      throw new AuthIpcError(
        'Failed to register authentication IPC handlers',
        'HANDLER_REGISTRATION_ERROR',
        error as Error
      );
    }
  }

  /**
   * Unregisters all authentication IPC handlers
   */
  public unregisterHandlers(): void {
    this.allowedChannels.forEach((channel) => {
      ipcMain.removeHandler(channel);
    });
  }

  /**
   * Handles create user IPC request (Step 2 - Real Implementation)
   * @private
   */
  private async handleCreateUser(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AuthIpcResponse<CreateUserResponse>> {
    const startTime = Date.now();

    try {
      // Input validation
      const validatedRequest = CreateUserRequestSchema.parse(request);

      // Create command
      const command: CreateUserCommand = {
        email: validatedRequest.email,
        password: validatedRequest.password,
        firstName: validatedRequest.firstName,
        lastName: validatedRequest.lastName,
        role: validatedRequest.role,
        status: validatedRequest.status as any,
        createdBy: validatedRequest.createdBy,
      };

      // Execute command through application layer
      const userId = await this.createUserHandler.handle(command);

      return {
        success: true,
        data: { userId },
        timestamp: Date.now(),
      };
    } catch (error) {
      return this.handleError(error, 'create-user', Date.now() - startTime);
    }
  }

  /**
   * Handles authenticate user IPC request - Step 3a: Real Implementation
   * Implements secure authentication with proper error handling and security measures
   * @private
   */
  private async handleAuthenticateUser(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AuthIpcResponse<AuthenticateUserResponse>> {
    const startTime = Date.now();

    try {
      // Step 1: Input validation with Zod schema
      const validatedRequest = AuthenticateUserRequestSchema.parse(request);

      // Step 2: Domain validation
      if (!Email.isValid(validatedRequest.email)) {
        throw new AuthValidationError('Invalid email format');
      }

      // Step 3: Create command for application layer
      const command = {
        email: validatedRequest.email,
        password: validatedRequest.password,
        rememberMe: validatedRequest.rememberMe || false,
      };

      // Step 4: Execute authentication through application layer
      const result = await this.authenticateUserHandler.handle(command);

      // Step 5: Transform result for IPC response
      if (result.success) {
        return {
          success: true,
          data: {
            success: true,
            userId: result.userId!,
            message: 'Authentication successful',
          },
          timestamp: Date.now(),
        };
      } else {
        // Authentication failed - return secure error response
        const responseData: AuthenticateUserResponse = {
          success: false,
          message: result.error || 'Authentication failed',
          ...(result.attemptsRemaining !== undefined && { attemptsRemaining: result.attemptsRemaining }),
          ...(result.isLocked && { isLocked: true }),
          ...(result.isLocked &&
            result.lockoutExpiresAt && { lockoutExpiresAt: result.lockoutExpiresAt.toISOString() }),
        };

        return {
          success: false,
          data: responseData,
          error: result.error || 'Authentication failed',
          code: result.isLocked ? 'ACCOUNT_LOCKED' : 'AUTHENTICATION_FAILED',
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      return this.handleError(error, 'authenticate-user', Date.now() - startTime);
    }
  }

  /**
   * Handles get user by email IPC request (Step 3b - Real Implementation)
   * @private
   */
  private async handleGetUserByEmail(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AuthIpcResponse<GetUserResponse | null>> {
    const startTime = Date.now();

    try {
      // Input validation with Zod schema
      const validatedInput = GetUserByEmailRequestSchema.parse(request);

      // Domain validation - Email format
      if (!Email.isValid(validatedInput.email)) {
        throw new AuthValidationError('Invalid email format');
      }

      // Create query object for application layer
      const query: GetUserByEmailQuery = {
        email: validatedInput.email,
        requestedBy: validatedInput.requesterId,
      };

      // Execute query through application layer
      const result = await this.getUserByEmailHandler.handle(query);

      if (!result) {
        // User not found - return null result (not an error)
        return {
          success: true,
          data: null,
          timestamp: Date.now(),
        };
      }

      // Convert domain result to IPC response format
      const responseData: GetUserResponse = {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        fullName: result.fullName,
        role: result.role,
        roleName: result.roleName,
        status: result.status,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        lastLoginAt: result.lastLoginAt?.toISOString(),
        isAccountLocked: result.isAccountLocked,
        loginAttempts: result.loginAttempts,
        lockedUntil: result.lockedUntil?.toISOString(),
        isPasswordExpired: result.isPasswordExpired,
      };

      return {
        success: true,
        data: responseData,
        timestamp: Date.now(),
      };
    } catch (error) {
      return this.handleError(error, 'get-user-by-email', Date.now() - startTime);
    }
  }

  /**
   * Handles get user permissions IPC request (Step 3c - Real Implementation)
   * @private
   */
  private async handleGetUserPermissions(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AuthIpcResponse<GetUserPermissionsResponse | null>> {
    const startTime = Date.now();

    try {
      // Input validation with Zod schema
      const validatedInput = GetUserPermissionsRequestSchema.parse(request);

      // Create query object for application layer
      const query: GetUserPermissionsQuery = {
        userId: validatedInput.userId,
        requestedBy: validatedInput.requesterId,
      };

      // Execute query through application layer
      const result = await this.getUserPermissionsHandler.handle(query);

      if (!result) {
        // User not found - return null result (not an error)
        return {
          success: true,
          data: null,
          timestamp: Date.now(),
        };
      }

      // Convert domain result to IPC response format
      const responseData: GetUserPermissionsResponse = {
        userId: result.userId,
        role: result.role,
        permissions: result.permissions,
        isActive: result.isActive,
        canManageUsers: result.canManageUsers,
        hierarchyLevel: result.hierarchyLevel,
      };

      return {
        success: true,
        data: responseData,
        timestamp: Date.now(),
      };
    } catch (error) {
      return this.handleError(error, 'get-user-permissions', Date.now() - startTime);
    }
  }

  /**
   * Handles errors and returns appropriate IPC response
   * Implements security-first error handling - no sensitive data exposed
   * @private
   */
  private handleError(error: unknown, operation: string, executionTime: number): AuthIpcResponse<any> {
    // Log error for debugging (without sensitive data)
    console.error(`Auth IPC error in ${operation}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      executionTime,
    });

    if (error instanceof AuthIpcError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        timestamp: Date.now(),
      };
    }

    if (
      error instanceof CreateUserCommandValidationError ||
      error instanceof AuthenticateUserCommandValidationError ||
      error instanceof GetUserByEmailQueryValidationError ||
      error instanceof GetUserPermissionsQueryValidationError
    ) {
      return {
        success: false,
        error: error.message,
        code: 'VALIDATION_ERROR',
        timestamp: Date.now(),
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.errors.map((e) => e.message).join(', ')}`,
        code: 'VALIDATION_ERROR',
        timestamp: Date.now(),
      };
    }

    // Handle domain/application layer errors
    if (error instanceof Error) {
      // Security: Don't expose sensitive error details
      const secureMessage = this.getSafeErrorMessage(error.message);
      return {
        success: false,
        error: secureMessage,
        code: 'OPERATION_ERROR',
        timestamp: Date.now(),
      };
    }

    // Generic error response (no sensitive information exposed)
    return {
      success: false,
      error: 'Authentication operation failed',
      code: 'OPERATION_ERROR',
      timestamp: Date.now(),
    };
  }

  /**
   * Validates the user repository
   * @private
   */
  private validateRepository(repository: IUserRepository): void {
    if (!repository) {
      throw new AuthIpcError('User repository is required', 'REPOSITORY_REQUIRED');
    }
  }

  /**
   * Gets a safe error message that doesn't expose sensitive information
   * @private
   */
  private getSafeErrorMessage(message: string): string {
    // Map known safe error messages
    const safeMessages = [
      'User with this email already exists',
      'Creating user not found',
      'Insufficient permissions to create user',
      'Cannot create user with higher role than your own',
      'Invalid credentials',
      'Account is currently locked',
      'Requesting user not found',
      'Insufficient permissions to view user',
      'Cannot view user with higher role',
      'User not found',
      'Insufficient permissions to view user permissions',
      'Cannot view permissions of user with higher role',
      'Email validation failed',
      'GetUserByEmail validation error - email: validation failed',
      'GetUserPermissions validation error - userId: validation failed',
    ];

    // Return the message if it's in the safe list
    if (safeMessages.includes(message)) {
      return message;
    }

    // Return generic message for unknown/potentially sensitive errors
    return 'Operation failed';
  }

  /**
   * Gets handler statistics for monitoring
   * @returns Handler statistics
   */
  public getStats(): {
    readonly registeredChannels: readonly string[];
    readonly handlerCount: number;
  } {
    return {
      registeredChannels: this.allowedChannels,
      handlerCount: this.allowedChannels.length,
    };
  }
}

/**
 * Factory function to create AuthIpcHandler
 * @param userRepository - User repository instance
 * @returns AuthIpcHandler instance
 */
export function createAuthIpcHandler(userRepository: IUserRepository): AuthIpcHandler {
  return new AuthIpcHandler(userRepository);
}
