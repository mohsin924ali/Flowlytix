/**
 * List Users Query
 *
 * Query for retrieving and searching users in the system.
 * Handles comprehensive user filtering, pagination, and business rules enforcement
 * following CQRS pattern.
 *
 * Business Rules:
 * - Only users with READ_USER permission can list users
 * - Super admins can view all users
 * - Regular users can only view users they can manage (role hierarchy)
 * - Pagination is required for large result sets
 * - Search filters must be valid
 *
 * @domain User Management
 * @pattern CQRS Query
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

/**
 * Query to list users with filtering and pagination
 * Follows CQRS pattern for read operations
 */
export interface ListUsersQuery {
  readonly requestedBy: string; // ID of user making the request
  readonly limit: number;
  readonly offset: number;
  readonly sortBy: 'firstName' | 'lastName' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt';
  readonly sortOrder: 'asc' | 'desc';

  // Filtering options
  readonly role?: string;
  readonly status?: string;
  readonly search?: string; // Search in name or email
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly isLocked?: boolean;
}

/**
 * Summary of a user for list display
 */
export interface UserListItem {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly role: string;
  readonly roleName: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly lastLoginAt?: Date | undefined;
  readonly isAccountLocked: boolean;
  readonly loginAttempts: number;
}

/**
 * Result of ListUsers query with pagination
 */
export interface ListUsersQueryResult {
  readonly success: boolean;
  readonly users: readonly UserListItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
  readonly error?: string;
}

/**
 * Validation errors for ListUsersQuery
 */
export class ListUsersQueryValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`ListUsers validation error - ${field}: ${reason}`);
    this.name = 'ListUsersQueryValidationError';
  }
}

/**
 * Validates ListUsersQuery data
 * @param query - Query to validate
 * @throws {ListUsersQueryValidationError} When validation fails
 */
export function validateListUsersQuery(query: ListUsersQuery): void {
  if (!query.requestedBy || typeof query.requestedBy !== 'string') {
    throw new ListUsersQueryValidationError('requestedBy', 'RequestedBy is required and must be a string');
  }

  if (!query.limit || typeof query.limit !== 'number' || query.limit < 1 || query.limit > 1000) {
    throw new ListUsersQueryValidationError('limit', 'Limit must be a number between 1 and 1000');
  }

  if (typeof query.offset !== 'number' || query.offset < 0) {
    throw new ListUsersQueryValidationError('offset', 'Offset must be a non-negative number');
  }

  const validSortFields = ['firstName', 'lastName', 'email', 'role', 'status', 'createdAt', 'lastLoginAt'];
  if (!validSortFields.includes(query.sortBy)) {
    throw new ListUsersQueryValidationError('sortBy', `SortBy must be one of: ${validSortFields.join(', ')}`);
  }

  const validSortOrders = ['asc', 'desc'];
  if (!validSortOrders.includes(query.sortOrder)) {
    throw new ListUsersQueryValidationError('sortOrder', 'SortOrder must be either "asc" or "desc"');
  }

  // Optional field validations
  if (query.search !== undefined && (typeof query.search !== 'string' || query.search.length > 255)) {
    throw new ListUsersQueryValidationError('search', 'Search term must be a string with maximum 255 characters');
  }

  if (query.role !== undefined && (typeof query.role !== 'string' || query.role.length === 0)) {
    throw new ListUsersQueryValidationError('role', 'Role must be a non-empty string');
  }

  if (query.status !== undefined && (typeof query.status !== 'string' || query.status.length === 0)) {
    throw new ListUsersQueryValidationError('status', 'Status must be a non-empty string');
  }

  if (query.createdAfter !== undefined && !(query.createdAfter instanceof Date)) {
    throw new ListUsersQueryValidationError('createdAfter', 'CreatedAfter must be a valid Date object');
  }

  if (query.createdBefore !== undefined && !(query.createdBefore instanceof Date)) {
    throw new ListUsersQueryValidationError('createdBefore', 'CreatedBefore must be a valid Date object');
  }

  if (query.isLocked !== undefined && typeof query.isLocked !== 'boolean') {
    throw new ListUsersQueryValidationError('isLocked', 'IsLocked must be a boolean value');
  }
}

/**
 * Validates business rules for ListUsersQuery
 * @param query - Query to validate
 * @throws {ListUsersQueryValidationError} When business rules are violated
 */
export function validateListUsersQueryBusinessRules(query: ListUsersQuery): void {
  // Date range validation
  if (query.createdAfter && query.createdBefore && query.createdAfter >= query.createdBefore) {
    throw new ListUsersQueryValidationError('dateRange', 'CreatedAfter must be before CreatedBefore');
  }

  // Pagination limits
  if (query.offset > 10000) {
    throw new ListUsersQueryValidationError('offset', 'Offset cannot exceed 10000 for performance reasons');
  }
}
