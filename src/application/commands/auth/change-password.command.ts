/**
 * Command to change a user's password
 * Follows CQRS pattern for password management operations
 */
export interface ChangePasswordCommand {
  readonly userId: string;
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly changedBy: string; // ID of user performing the change
}

/**
 * Result of password change command
 */
export interface ChangePasswordResult {
  readonly success: boolean;
  readonly error?: string;
  readonly passwordExpired?: boolean;
}

/**
 * Validation errors for ChangePasswordCommand
 */
export class ChangePasswordCommandValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`ChangePassword validation error - ${field}: ${reason}`);
    this.name = 'ChangePasswordCommandValidationError';
  }
}

/**
 * Validates ChangePasswordCommand data
 * @param command - Command to validate
 * @throws {ChangePasswordCommandValidationError} When validation fails
 */
export function validateChangePasswordCommand(command: ChangePasswordCommand): void {
  if (!command.userId || typeof command.userId !== 'string') {
    throw new ChangePasswordCommandValidationError('userId', 'User ID is required and must be a string');
  }

  if (!command.currentPassword || typeof command.currentPassword !== 'string') {
    throw new ChangePasswordCommandValidationError(
      'currentPassword',
      'Current password is required and must be a string'
    );
  }

  if (!command.newPassword || typeof command.newPassword !== 'string') {
    throw new ChangePasswordCommandValidationError('newPassword', 'New password is required and must be a string');
  }

  if (!command.changedBy || typeof command.changedBy !== 'string') {
    throw new ChangePasswordCommandValidationError('changedBy', 'ChangedBy is required and must be a string');
  }

  // Passwords should not be empty
  if (command.currentPassword.trim().length === 0) {
    throw new ChangePasswordCommandValidationError('currentPassword', 'Current password cannot be empty');
  }

  if (command.newPassword.trim().length === 0) {
    throw new ChangePasswordCommandValidationError('newPassword', 'New password cannot be empty');
  }

  // New password should be different from current
  if (command.currentPassword === command.newPassword) {
    throw new ChangePasswordCommandValidationError(
      'newPassword',
      'New password must be different from current password'
    );
  }
}
