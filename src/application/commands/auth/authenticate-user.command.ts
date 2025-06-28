/**
 * Authentication Command - CQRS Implementation
 *
 * Follows Command pattern for user actions as specified in Instructions.
 * Implements strict TypeScript with no 'any' types.
 * Part of Hexagonal Architecture (Application Layer).
 *
 * @domain Authentication
 * @pattern Command Pattern
 * @architecture CQRS + Hexagonal Architecture
 * @version 1.2.0
 */

import { z } from 'zod';

/**
 * Authentication Command Schema for strict validation
 * Follows Instructions requirement for input validation
 */
const AuthenticateUserCommandSchema = z.object({
  email: z
    .string()
    .email({ message: 'Invalid email format' })
    .min(1, { message: 'Email is required' })
    .max(255, { message: 'Email too long' })
    .toLowerCase()
    .trim(),
  password: z.string().min(1, { message: 'Password is required' }).max(128, { message: 'Password too long' }),
  rememberMe: z.boolean().optional().default(false),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  requestId: z.string().uuid().optional(),
});

/**
 * Authentication Command Interface
 * Immutable command following CQRS pattern
 */
export interface AuthenticateUserCommand {
  readonly email: string;
  readonly password: string;
  readonly rememberMe: boolean;
  readonly userAgent: string | undefined;
  readonly ipAddress: string | undefined;
  readonly requestId: string;
  readonly timestamp: number;
}

/**
 * Authentication Result Interface
 * Strict typing with all possible outcomes
 */
export interface AuthenticationResult {
  readonly success: boolean;
  readonly userId?: string;
  readonly sessionToken?: string;
  readonly refreshToken?: string;
  readonly expiresAt?: number;
  readonly user?: AuthenticatedUserInfo;
  readonly error?: AuthenticationError;
  readonly metadata: AuthenticationMetadata;
}

/**
 * Authenticated User Information
 * Data returned on successful authentication
 */
export interface AuthenticatedUserInfo {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly role: string;
  readonly permissions: readonly string[];
  readonly agencyId: string | undefined;
  readonly lastLoginAt: number | undefined;
  readonly isFirstLogin: boolean;
  readonly mustChangePassword: boolean;
}

/**
 * Authentication Error Details
 * Comprehensive error information following Instructions
 */
export interface AuthenticationError {
  readonly code: AuthenticationErrorCode;
  readonly message: string;
  readonly details: Record<string, unknown>;
  readonly retryable: boolean;
  readonly attemptsRemaining: number | undefined;
  readonly lockoutExpiresAt: number | undefined;
}

/**
 * Authentication Error Codes
 * Enumerated error types for proper error handling
 */
export enum AuthenticationErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  AGENCY_INACTIVE = 'AGENCY_INACTIVE',
  PASSWORD_EXPIRED = 'PASSWORD_EXPIRED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

/**
 * Authentication Metadata
 * Additional information about the authentication attempt
 */
export interface AuthenticationMetadata {
  readonly timestamp: number;
  readonly duration: number;
  readonly requestId: string;
  readonly userAgent: string | undefined;
  readonly ipAddress: string | undefined;
  readonly attemptNumber: number;
  readonly securityChecks: readonly string[];
}

/**
 * Command Handler Interface
 * Defines the contract for command execution following Hexagonal Architecture
 */
export interface IAuthenticateUserCommandHandler {
  /**
   * Execute authentication command
   * @param command - Authentication command
   * @returns Promise<AuthenticationResult> - Authentication result
   */
  handle(command: AuthenticateUserCommand): Promise<AuthenticationResult>;
}

/**
 * Command Factory
 * Creates authenticated command instances with validation
 */
export class AuthenticateUserCommandFactory {
  /**
   * Create command from raw input with validation
   * @param input - Raw authentication input
   * @returns AuthenticateUserCommand - Validated command
   * @throws {AuthenticateUserCommandValidationError} When validation fails
   */
  public static create(input: unknown): AuthenticateUserCommand {
    try {
      const validated = AuthenticateUserCommandSchema.parse(input);

      return {
        email: validated.email,
        password: validated.password,
        rememberMe: validated.rememberMe,
        userAgent: validated.userAgent || undefined,
        ipAddress: validated.ipAddress || undefined,
        requestId: validated.requestId || this.generateRequestId(),
        timestamp: Date.now(),
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AuthenticateUserCommandValidationError(
          'Command validation failed',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }))
        );
      }
      throw new AuthenticateUserCommandValidationError('Unknown validation error', [
        { field: 'unknown', message: 'Unexpected error occurred' },
      ]);
    }
  }

  /**
   * Generate unique request ID for tracing
   * @returns string - UUID request ID
   */
  private static generateRequestId(): string {
    return `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Command Validation Error
 * Domain-specific error for command validation failures
 */
export class AuthenticateUserCommandValidationError extends Error {
  public readonly name = 'AuthenticateUserCommandValidationError';

  constructor(
    message: string,
    public readonly validationErrors: readonly ValidationError[]
  ) {
    super(message);
  }
}

/**
 * Validation Error Detail
 * Individual validation error information
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * Command validator utility function
 * @param command - Command to validate
 * @throws {AuthenticateUserCommandValidationError} When validation fails
 */
export function validateAuthenticateUserCommand(command: AuthenticateUserCommand): void {
  try {
    AuthenticateUserCommandSchema.parse({
      email: command.email,
      password: command.password,
      rememberMe: command.rememberMe,
      userAgent: command.userAgent,
      ipAddress: command.ipAddress,
      requestId: command.requestId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AuthenticateUserCommandValidationError(
        'Command validation failed',
        error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))
      );
    }
    throw error;
  }
}
