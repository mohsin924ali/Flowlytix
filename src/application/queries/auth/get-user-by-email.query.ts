/**
 * Query to get user by email address
 * Follows CQRS pattern for read operations
 */
export interface GetUserByEmailQuery {
  readonly email: string;
  readonly requestedBy: string; // ID of user making the request
}

/**
 * Result of GetUserByEmail query
 */
export interface UserQueryResult {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly role: string;
  readonly roleName: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLoginAt?: Date | undefined;
  readonly isAccountLocked: boolean;
  readonly loginAttempts: number;
  readonly lockedUntil?: Date | undefined;
  readonly isPasswordExpired: boolean;
}

/**
 * Validation errors for GetUserByEmailQuery
 */
export class GetUserByEmailQueryValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`GetUserByEmail validation error - ${field}: ${reason}`);
    this.name = 'GetUserByEmailQueryValidationError';
  }
}

/**
 * Validates GetUserByEmailQuery data
 * @param query - Query to validate
 * @throws {GetUserByEmailQueryValidationError} When validation fails
 */
export function validateGetUserByEmailQuery(query: GetUserByEmailQuery): void {
  if (!query.email || typeof query.email !== 'string') {
    throw new GetUserByEmailQueryValidationError('email', 'Email is required and must be a string');
  }

  if (!query.requestedBy || typeof query.requestedBy !== 'string') {
    throw new GetUserByEmailQueryValidationError('requestedBy', 'RequestedBy is required and must be a string');
  }

  // Basic email format check
  if (!query.email.includes('@')) {
    throw new GetUserByEmailQueryValidationError('email', 'Invalid email format');
  }
}
