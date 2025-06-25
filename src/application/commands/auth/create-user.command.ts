import { Email } from '../../../domain/value-objects/email';
import { Role } from '../../../domain/value-objects/role';
import { UserStatus } from '../../../domain/entities/user';

/**
 * Command to create a new user
 * Follows CQRS pattern for write operations
 */
export interface CreateUserCommand {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: string;
  readonly status?: UserStatus;
  readonly createdBy: string; // ID of user creating this user
}

/**
 * Validation errors for CreateUserCommand
 */
export class CreateUserCommandValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`CreateUser validation error - ${field}: ${reason}`);
    this.name = 'CreateUserCommandValidationError';
  }
}

/**
 * Validates CreateUserCommand data
 * @param command - Command to validate
 * @throws {CreateUserCommandValidationError} When validation fails
 */
export function validateCreateUserCommand(command: CreateUserCommand): void {
  if (!command.email || typeof command.email !== 'string') {
    throw new CreateUserCommandValidationError('email', 'Email is required and must be a string');
  }

  if (!command.password || typeof command.password !== 'string') {
    throw new CreateUserCommandValidationError('password', 'Password is required and must be a string');
  }

  if (!command.firstName || typeof command.firstName !== 'string') {
    throw new CreateUserCommandValidationError('firstName', 'First name is required and must be a string');
  }

  if (!command.lastName || typeof command.lastName !== 'string') {
    throw new CreateUserCommandValidationError('lastName', 'Last name is required and must be a string');
  }

  if (!command.role || typeof command.role !== 'string') {
    throw new CreateUserCommandValidationError('role', 'Role is required and must be a string');
  }

  if (!command.createdBy || typeof command.createdBy !== 'string') {
    throw new CreateUserCommandValidationError('createdBy', 'CreatedBy is required and must be a string');
  }

  // Validate email format
  if (!Email.isValid(command.email)) {
    throw new CreateUserCommandValidationError('email', 'Invalid email format');
  }

  // Validate role
  if (!Role.isValid(command.role)) {
    throw new CreateUserCommandValidationError('role', 'Invalid role');
  }

  // Validate status if provided
  if (command.status && !Object.values(UserStatus).includes(command.status)) {
    throw new CreateUserCommandValidationError('status', 'Invalid user status');
  }
}
