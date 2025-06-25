import {
  AuthenticateUserCommand,
  AuthenticationResult,
  validateAuthenticateUserCommand,
} from '../../commands/auth/authenticate-user.command';
import { User } from '../../../domain/entities/user';
import { Email } from '../../../domain/value-objects/email';
import { IUserRepository } from './create-user.handler';

/**
 * Handler for AuthenticateUser command
 * Implements secure offline authentication logic
 */
export class AuthenticateUserHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Handles user authentication command
   * @param command - AuthenticateUser command
   * @returns Promise<AuthenticationResult> - Authentication result with security details
   */
  async handle(command: AuthenticateUserCommand): Promise<AuthenticationResult> {
    try {
      // Validate command
      validateAuthenticateUserCommand(command);

      // Find user by email
      const email = Email.fromString(command.email);
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        // Return generic error to prevent email enumeration
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Check if account is locked
      if (user.isAccountLocked()) {
        return {
          success: false,
          error: 'Account is currently locked',
          isLocked: true,
          lockoutExpiresAt: user.lockedUntil,
        };
      }

      // Attempt authentication
      const authResult = user.authenticate(command.password);

      if (authResult) {
        // Authentication successful
        await this.userRepository.save(user); // Save updated login time and reset attempts

        return {
          success: true,
          userId: user.id,
        };
      } else {
        // Authentication failed
        await this.userRepository.save(user); // Save incremented login attempts

        const attemptsRemaining = Math.max(0, 5 - user.loginAttempts);

        return {
          success: false,
          error: 'Invalid credentials',
          attemptsRemaining,
          isLocked: user.isAccountLocked(),
          lockoutExpiresAt: user.lockedUntil,
        };
      }
    } catch (error) {
      // Handle domain errors (suspended account, etc.)
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Generic error for unexpected issues
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }
}

/**
 * Factory function to create AuthenticateUserHandler
 * @param userRepository - User repository implementation
 * @returns AuthenticateUserHandler instance
 */
export function createAuthenticateUserHandler(userRepository: IUserRepository): AuthenticateUserHandler {
  return new AuthenticateUserHandler(userRepository);
}
