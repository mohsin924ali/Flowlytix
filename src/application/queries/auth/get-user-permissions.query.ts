/**
 * Query to get user permissions for authorization
 * Follows CQRS pattern for read operations
 */
export interface GetUserPermissionsQuery {
  readonly userId: string;
  readonly requestedBy: string; // ID of user making the request
}

/**
 * Result of GetUserPermissions query
 */
export interface UserPermissionsResult {
  readonly userId: string;
  readonly role: string;
  readonly permissions: ReadonlyArray<string>;
  readonly isActive: boolean;
  readonly canManageUsers: boolean;
  readonly hierarchyLevel: number;
}

/**
 * Validation errors for GetUserPermissionsQuery
 */
export class GetUserPermissionsQueryValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`GetUserPermissions validation error - ${field}: ${reason}`);
    this.name = 'GetUserPermissionsQueryValidationError';
  }
}

/**
 * Validates GetUserPermissionsQuery data
 * @param query - Query to validate
 * @throws {GetUserPermissionsQueryValidationError} When validation fails
 */
export function validateGetUserPermissionsQuery(query: GetUserPermissionsQuery): void {
  if (!query.userId || typeof query.userId !== 'string') {
    throw new GetUserPermissionsQueryValidationError('userId', 'User ID is required and must be a string');
  }

  if (!query.requestedBy || typeof query.requestedBy !== 'string') {
    throw new GetUserPermissionsQueryValidationError('requestedBy', 'RequestedBy is required and must be a string');
  }
}
