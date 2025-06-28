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
import { IAgencyRepository } from '../../domain/repositories/agency.repository';
import { GetUserByEmailHandler } from '../../application/handlers/auth/get-user-by-email.handler';
import { GetUserPermissionsHandler } from '../../application/handlers/auth/get-user-permissions.handler';
import { ListUsersHandler } from '../../application/handlers/auth/list-users.handler';
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
import {
  ListUsersQuery,
  ListUsersQueryResult,
  UserListItem,
  ListUsersQueryValidationError,
} from '../../application/queries/auth/list-users.query';

/**
 * Authentication operation types for IPC
 */
export type AuthOperation =
  | 'create-user'
  | 'authenticate-user'
  | 'get-user-by-email'
  | 'get-user-by-id'
  | 'update-user'
  | 'get-user-permissions'
  | 'list-users';

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

const GetUserByIdRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  requestedBy: z.string().uuid('Invalid requester ID format'),
});

const UpdateUserRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  requestedBy: z.string().uuid('Invalid requester ID format'),
  firstName: z.string().min(1, 'First name required').max(100, 'First name too long').optional(),
  lastName: z.string().min(1, 'Last name required').max(100, 'Last name too long').optional(),
  email: z.string().email('Invalid email format').max(255, 'Email too long').optional(),
  role: z.string().min(1, 'Role required').max(50, 'Role too long').optional(),
  status: z.string().min(1, 'Status required').max(20, 'Status too long').optional(),
  agencyId: z.string().uuid('Invalid agency ID format').optional(),
});

const ListUsersRequestSchema = z.object({
  requestedBy: z.string().uuid('Invalid requester ID format'),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'role', 'status', 'createdAt', 'lastLoginAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  role: z.string().optional(),
  status: z.string().optional(),
  search: z.string().max(255).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  isLocked: z.boolean().optional(),
  agencyId: z.string().uuid('Invalid agency ID format').optional(),
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

export interface UpdateUserResponse {
  readonly success: boolean;
  readonly message: string;
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

export interface ListUsersResponse {
  readonly success: boolean;
  readonly users: readonly UserListItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
  readonly error?: string;
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
  private readonly agencyRepository: IAgencyRepository;
  private readonly createUserHandler: CreateUserHandler;
  private readonly authenticateUserHandler: AuthenticateUserHandler;
  private readonly getUserByEmailHandler: GetUserByEmailHandler;
  private readonly getUserPermissionsHandler: GetUserPermissionsHandler;
  private readonly listUsersHandler: ListUsersHandler;
  private readonly allowedChannels: readonly string[] = [
    'auth:create-user',
    'auth:authenticate-user',
    'auth:get-user-by-email',
    'auth:get-user-by-id',
    'auth:update-user',
    'auth:get-user-permissions',
    'auth:list-users',
  ] as const;

  /**
   * Creates Authentication IPC Handler with repository dependency injection
   * @param userRepository - User repository for data access
   * @param agencyRepository - Agency repository for agency status checks
   * @throws {AuthIpcError} When repository is invalid
   */
  constructor(userRepository: IUserRepository, agencyRepository: IAgencyRepository) {
    this.validateRepository(userRepository);
    this.userRepository = userRepository;
    this.agencyRepository = agencyRepository;

    // Initialize application layer handlers
    this.createUserHandler = new CreateUserHandler(userRepository);
    this.authenticateUserHandler = new AuthenticateUserHandler(userRepository, agencyRepository);
    this.getUserByEmailHandler = new GetUserByEmailHandler(userRepository);
    this.getUserPermissionsHandler = new GetUserPermissionsHandler(userRepository);
    this.listUsersHandler = new ListUsersHandler(userRepository, agencyRepository);
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
      ipcMain.handle('auth:get-user-by-id', this.handleGetUserById.bind(this));
      ipcMain.handle('auth:update-user', this.handleUpdateUser.bind(this));
      ipcMain.handle('auth:get-user-permissions', this.handleGetUserPermissions.bind(this));
      ipcMain.handle('auth:list-users', this.handleListUsers.bind(this));
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
   * Handles list users IPC request
   * @private
   */
  private async handleListUsers(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AuthIpcResponse<ListUsersResponse>> {
    const startTime = Date.now();

    try {
      // Input validation with Zod schema
      const validatedInput = ListUsersRequestSchema.parse(request);

      // Create query object for application layer
      const query: ListUsersQuery = {
        requestedBy: validatedInput.requestedBy,
        limit: validatedInput.limit,
        offset: validatedInput.offset,
        sortBy: validatedInput.sortBy,
        sortOrder: validatedInput.sortOrder,
        ...(validatedInput.role && { role: validatedInput.role }),
        ...(validatedInput.status && { status: validatedInput.status }),
        ...(validatedInput.search && { search: validatedInput.search }),
        ...(validatedInput.createdAfter && { createdAfter: new Date(validatedInput.createdAfter) }),
        ...(validatedInput.createdBefore && { createdBefore: new Date(validatedInput.createdBefore) }),
        ...(validatedInput.isLocked !== undefined && { isLocked: validatedInput.isLocked }),
      };

      // For now, directly query the database to get working implementation
      // TODO: Fix domain layer implementation later
      const db = (this.userRepository as any).db;

      // Build query
      let whereClause = "WHERE status != 'inactive'";
      const params: any[] = [];

      if (query.search) {
        whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
        const searchTerm = `%${query.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (query.role) {
        whereClause += ' AND role = ?';
        params.push(query.role);
      }

      if (query.status) {
        whereClause += ' AND status = ?';
        params.push(query.status);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`;
      const totalResult = db.prepare(countQuery).get(...params) as { count: number };
      const total = totalResult.count;

      // Get paginated users with agency info
      const usersQuery = `
        SELECT u.*, a.name as agency_name 
        FROM users u
        LEFT JOIN agencies a ON u.agency_id = a.id
        ${whereClause}
        ORDER BY u.${
          query.sortBy === 'firstName'
            ? 'first_name'
            : query.sortBy === 'lastName'
              ? 'last_name'
              : query.sortBy === 'email'
                ? 'email'
                : query.sortBy === 'role'
                  ? 'role'
                  : query.sortBy === 'status'
                    ? 'status'
                    : query.sortBy === 'lastLoginAt'
                      ? 'last_login_at'
                      : 'created_at'
        } ${query.sortOrder}
        LIMIT ? OFFSET ?
      `;

      const users = db.prepare(usersQuery).all(...params, query.limit, query.offset) as any[];

      // Convert to UserListItem format
      const userListItems = users.map((row: any) => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: `${row.first_name} ${row.last_name}`,
        role: row.role,
        roleName:
          row.role === 'super_admin'
            ? 'Super Administrator'
            : row.role === 'admin'
              ? 'Agency Administrator'
              : row.role === 'employee'
                ? 'Employee'
                : row.role,
        status: row.status,
        createdAt: new Date(row.created_at),
        lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
        isAccountLocked: row.locked_until && row.locked_until > Date.now(),
        loginAttempts: row.login_attempts || 0,
        agencyId: row.agency_id || undefined,
        agencyName: row.agency_name || undefined,
      }));

      // Convert domain result to IPC response format
      const responseData: ListUsersResponse = {
        success: true,
        users: userListItems,
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: total > query.offset + query.limit,
      };

      return {
        success: true,
        data: responseData,
        timestamp: Date.now(),
      };
    } catch (error) {
      return this.handleError(error, 'list-users', Date.now() - startTime);
    }
  }

  /**
   * Handle get user by ID request
   */
  private async handleGetUserById(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AuthIpcResponse<GetUserResponse | null>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validatedRequest = GetUserByIdRequestSchema.parse(request);

      // Find user by ID
      const user = await this.userRepository.findById(validatedRequest.userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: Date.now(),
        };
      }

      // Convert to response format
      const userResponse: GetUserResponse = {
        id: user.id,
        email: user.email.value,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role.value,
        roleName: user.role.displayName,
        status: user.status.value,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
        isAccountLocked: user.isAccountLocked,
        loginAttempts: user.loginAttempts,
        lockedUntil: user.lockedUntil?.toISOString(),
        isPasswordExpired: false, // TODO: Implement password expiry
      };

      // Add agency information if user has agency
      if (user.agencyId) {
        const agency = await this.agencyRepository.findById(user.agencyId);
        if (agency) {
          (userResponse as any).agencyId = agency.id;
          (userResponse as any).agencyName = agency.name;
        }
      }

      return {
        success: true,
        data: userResponse,
        timestamp: Date.now(),
      };
    } catch (error) {
      return this.handleError(error, 'get-user-by-id', Date.now() - startTime);
    }
  }

  /**
   * Handle update user request
   */
  private async handleUpdateUser(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<AuthIpcResponse<UpdateUserResponse>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validatedRequest = UpdateUserRequestSchema.parse(request);

      // Find user to update
      const user = await this.userRepository.findById(validatedRequest.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: Date.now(),
        };
      }

      // Check permissions - for now, only allow if requester is super admin
      const requester = await this.userRepository.findById(validatedRequest.requestedBy);
      if (!requester || requester.role.value !== 'super_admin') {
        return {
          success: false,
          error: 'Insufficient permissions to update user',
          timestamp: Date.now(),
        };
      }

      // Update user fields
      if (validatedRequest.firstName) {
        user.updateProfile({ firstName: validatedRequest.firstName });
      }
      if (validatedRequest.lastName) {
        user.updateProfile({ lastName: validatedRequest.lastName });
      }
      if (validatedRequest.email) {
        user.updateProfile({ email: new Email(validatedRequest.email) });
      }
      if (validatedRequest.status) {
        user.updateStatus(validatedRequest.status as any);
      }
      if (validatedRequest.agencyId) {
        user.assignToAgency(validatedRequest.agencyId);
      }

      // Save updated user
      await this.userRepository.update(user);

      return {
        success: true,
        data: {
          success: true,
          message: 'User updated successfully',
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return this.handleError(error, 'update-user', Date.now() - startTime);
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
      error instanceof GetUserPermissionsQueryValidationError ||
      error instanceof ListUsersQueryValidationError
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
export function createAuthIpcHandler(
  userRepository: IUserRepository,
  agencyRepository: IAgencyRepository
): AuthIpcHandler {
  return new AuthIpcHandler(userRepository, agencyRepository);
}
