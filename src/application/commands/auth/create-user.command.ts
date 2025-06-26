import { Email } from '../../../domain/value-objects/email';
import { Role } from '../../../domain/value-objects/role';
import { UserStatus } from '../../../domain/entities/user';

/**
 * Command to create a new user
 * Follows CQRS pattern for write operations
 * Updated for simplified role system: super_admin and admin only
 */
export interface CreateUserCommand {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: string; // 'super_admin' or 'admin'
  readonly status?: UserStatus;
  readonly createdBy: string; // ID of user creating this user
  readonly agencyId?: string; // For agency admin assignment (super admin only)
}

/**
 * Command validation error
 */
export class CreateUserCommandValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreateUserCommandValidationError';
  }
}

/**
 * Validates CreateUser command
 * @param command - Command to validate
 * @throws {CreateUserCommandValidationError} When validation fails
 */
export function validateCreateUserCommand(command: CreateUserCommand): void {
  // Email validation
  if (!command.email || typeof command.email !== 'string' || command.email.trim().length === 0) {
    throw new CreateUserCommandValidationError('Email is required and must be a string');
  }

  try {
    Email.fromString(command.email);
  } catch (error) {
    throw new CreateUserCommandValidationError('Invalid email format');
  }

  // Password validation
  if (!command.password || typeof command.password !== 'string') {
    throw new CreateUserCommandValidationError('Password is required and must be a string');
  }

  if (command.password.length < 8) {
    throw new CreateUserCommandValidationError('Password must be at least 8 characters long');
  }

  if (command.password.length > 128) {
    throw new CreateUserCommandValidationError('Password cannot exceed 128 characters');
  }

  // First name validation
  if (!command.firstName || typeof command.firstName !== 'string' || command.firstName.trim().length === 0) {
    throw new CreateUserCommandValidationError('First name is required and must be a string');
  }

  if (command.firstName.trim().length > 50) {
    throw new CreateUserCommandValidationError('First name cannot exceed 50 characters');
  }

  // Last name validation
  if (!command.lastName || typeof command.lastName !== 'string' || command.lastName.trim().length === 0) {
    throw new CreateUserCommandValidationError('Last name is required and must be a string');
  }

  if (command.lastName.trim().length > 50) {
    throw new CreateUserCommandValidationError('Last name cannot exceed 50 characters');
  }

  // Role validation - only super_admin and admin allowed
  if (!command.role || typeof command.role !== 'string' || command.role.trim().length === 0) {
    throw new CreateUserCommandValidationError('Role is required and must be a string');
  }

  const validRoles = ['super_admin', 'admin'];
  if (!validRoles.includes(command.role.toLowerCase().trim())) {
    throw new CreateUserCommandValidationError('Invalid role. Only super_admin and admin are allowed.');
  }

  try {
    Role.fromString(command.role);
  } catch (error) {
    throw new CreateUserCommandValidationError('Invalid role');
  }

  // CreatedBy validation
  if (!command.createdBy || typeof command.createdBy !== 'string' || command.createdBy.trim().length === 0) {
    throw new CreateUserCommandValidationError('CreatedBy is required and must be a string');
  }

  // UUID format validation for createdBy
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(command.createdBy)) {
    throw new CreateUserCommandValidationError('CreatedBy must be a valid UUID');
  }

  // Agency ID validation - only when role is admin
  if (command.agencyId) {
    if (typeof command.agencyId !== 'string' || command.agencyId.trim().length === 0) {
      throw new CreateUserCommandValidationError('AgencyId must be a valid string');
    }

    if (command.role.toLowerCase().trim() !== 'admin') {
      throw new CreateUserCommandValidationError('AgencyId can only be assigned to admin users');
    }
  }

  // Status validation (optional)
  if (command.status !== undefined) {
    const validStatuses = Object.values(UserStatus);
    if (!validStatuses.includes(command.status)) {
      throw new CreateUserCommandValidationError('Invalid status');
    }
  }
}
