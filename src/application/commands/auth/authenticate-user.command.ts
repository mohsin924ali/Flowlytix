/**
 * Command to authenticate a user with email and password
 * Follows CQRS pattern for authentication operations
 */
export interface AuthenticateUserCommand {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
}

/**
 * Result of authentication command
 */
export interface AuthenticationResult {
  readonly success: boolean;
  readonly userId?: string;
  readonly error?: string;
  readonly isLocked?: boolean;
  readonly attemptsRemaining?: number;
  readonly lockoutExpiresAt?: Date | undefined;
  readonly isAgencyInactive?: boolean;
}

/**
 * Validation errors for AuthenticateUserCommand
 */
export class AuthenticateUserCommandValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`AuthenticateUser validation error - ${field}: ${reason}`);
    this.name = 'AuthenticateUserCommandValidationError';
  }
}

/**
 * Validates AuthenticateUserCommand data
 * @param command - Command to validate
 * @throws {AuthenticateUserCommandValidationError} When validation fails
 */
export function validateAuthenticateUserCommand(command: AuthenticateUserCommand): void {
  if (!command.email || typeof command.email !== 'string') {
    throw new AuthenticateUserCommandValidationError('email', 'Email is required and must be a string');
  }

  if (!command.password || typeof command.password !== 'string') {
    throw new AuthenticateUserCommandValidationError('password', 'Password is required and must be a string');
  }

  // Basic email format check
  if (!command.email.includes('@')) {
    throw new AuthenticateUserCommandValidationError('email', 'Invalid email format');
  }

  // Password should not be empty
  if (command.password.trim().length === 0) {
    throw new AuthenticateUserCommandValidationError('password', 'Password cannot be empty');
  }
}
