import { Email } from '../../../domain/value-objects/email';
import { EmployeeDepartment, EmployeeStatus } from '../../../domain/entities/employee';

/**
 * Command to create a new employee
 * Follows CQRS pattern for write operations
 * Employees are business entities, not user accounts
 */
export interface CreateEmployeeCommand {
  readonly employeeId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly department: EmployeeDepartment;
  readonly position: string;
  readonly agencyId: string;
  readonly status?: EmployeeStatus;
  readonly phoneNumber?: string;
  readonly address?: string;
  readonly hireDate?: Date;
  readonly salary?: number;
  readonly createdBy: string; // ID of user creating this employee
}

/**
 * Command validation error
 */
export class CreateEmployeeCommandValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreateEmployeeCommandValidationError';
  }
}

/**
 * Validates CreateEmployee command
 * @param command - Command to validate
 * @throws {CreateEmployeeCommandValidationError} When validation fails
 */
export function validateCreateEmployeeCommand(command: CreateEmployeeCommand): void {
  // Employee ID validation
  if (!command.employeeId || typeof command.employeeId !== 'string' || command.employeeId.trim().length === 0) {
    throw new CreateEmployeeCommandValidationError('Employee ID is required and must be a string');
  }

  if (command.employeeId.trim().length > 50) {
    throw new CreateEmployeeCommandValidationError('Employee ID cannot exceed 50 characters');
  }

  // First name validation
  if (!command.firstName || typeof command.firstName !== 'string' || command.firstName.trim().length === 0) {
    throw new CreateEmployeeCommandValidationError('First name is required and must be a string');
  }

  if (command.firstName.trim().length > 50) {
    throw new CreateEmployeeCommandValidationError('First name cannot exceed 50 characters');
  }

  // Last name validation
  if (!command.lastName || typeof command.lastName !== 'string' || command.lastName.trim().length === 0) {
    throw new CreateEmployeeCommandValidationError('Last name is required and must be a string');
  }

  if (command.lastName.trim().length > 50) {
    throw new CreateEmployeeCommandValidationError('Last name cannot exceed 50 characters');
  }

  // Email validation
  if (!command.email || typeof command.email !== 'string' || command.email.trim().length === 0) {
    throw new CreateEmployeeCommandValidationError('Email is required and must be a string');
  }

  try {
    Email.fromString(command.email);
  } catch (error) {
    throw new CreateEmployeeCommandValidationError('Invalid email format');
  }

  // Department validation
  if (!command.department) {
    throw new CreateEmployeeCommandValidationError('Department is required');
  }

  if (!Object.values(EmployeeDepartment).includes(command.department)) {
    throw new CreateEmployeeCommandValidationError('Invalid department');
  }

  // Position validation
  if (!command.position || typeof command.position !== 'string' || command.position.trim().length === 0) {
    throw new CreateEmployeeCommandValidationError('Position is required and must be a string');
  }

  if (command.position.trim().length > 100) {
    throw new CreateEmployeeCommandValidationError('Position cannot exceed 100 characters');
  }

  // Agency ID validation
  if (!command.agencyId || typeof command.agencyId !== 'string' || command.agencyId.trim().length === 0) {
    throw new CreateEmployeeCommandValidationError('Agency ID is required and must be a string');
  }

  // CreatedBy validation
  if (!command.createdBy || typeof command.createdBy !== 'string' || command.createdBy.trim().length === 0) {
    throw new CreateEmployeeCommandValidationError('CreatedBy is required and must be a string');
  }

  // Status validation (optional)
  if (command.status !== undefined) {
    if (!Object.values(EmployeeStatus).includes(command.status)) {
      throw new CreateEmployeeCommandValidationError('Invalid status');
    }
  }

  // Phone number validation (optional)
  if (command.phoneNumber !== undefined) {
    if (typeof command.phoneNumber !== 'string' || command.phoneNumber.trim().length === 0) {
      throw new CreateEmployeeCommandValidationError('Phone number must be a valid string');
    }

    if (command.phoneNumber.trim().length > 20) {
      throw new CreateEmployeeCommandValidationError('Phone number cannot exceed 20 characters');
    }
  }

  // Address validation (optional)
  if (command.address !== undefined) {
    if (typeof command.address !== 'string' || command.address.trim().length === 0) {
      throw new CreateEmployeeCommandValidationError('Address must be a valid string');
    }

    if (command.address.trim().length > 500) {
      throw new CreateEmployeeCommandValidationError('Address cannot exceed 500 characters');
    }
  }

  // Salary validation (optional)
  if (command.salary !== undefined) {
    if (typeof command.salary !== 'number' || command.salary < 0) {
      throw new CreateEmployeeCommandValidationError('Salary must be a positive number');
    }
  }

  // Hire date validation (optional)
  if (command.hireDate !== undefined) {
    if (!(command.hireDate instanceof Date) || isNaN(command.hireDate.getTime())) {
      throw new CreateEmployeeCommandValidationError('Hire date must be a valid date');
    }
  }
}
