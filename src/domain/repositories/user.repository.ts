/**
 * User Repository Interface
 *
 * Domain repository contract for User entity operations.
 * Follows Repository pattern and Dependency Inversion principle.
 * Provides abstraction layer between domain and infrastructure.
 *
 * @domain User Management
 * @pattern Repository Pattern
 * @architecture Hexagonal Architecture (Port)
 * @version 1.0.0
 */

import { User } from '../entities/user';
import { Email } from '../value-objects/email';
import { Role } from '../value-objects/role';

/**
 * User search criteria for filtering and querying
 */
export interface UserSearchCriteria {
  readonly email?: string;
  readonly role?: string;
  readonly status?: string;
  readonly createdBy?: string;
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly lastLoginAfter?: Date;
  readonly lastLoginBefore?: Date;
  readonly isLocked?: boolean;
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: 'email' | 'createdAt' | 'lastLoginAt' | 'role';
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * User repository search results with pagination
 */
export interface UserSearchResult {
  readonly users: readonly User[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

/**
 * User repository statistics for monitoring and analytics
 */
export interface UserRepositoryStats {
  readonly totalUsers: number;
  readonly activeUsers: number;
  readonly lockedUsers: number;
  readonly usersByRole: Record<string, number>;
  readonly recentRegistrations: number; // Last 7 days
  readonly lastActivity: Date | null;
}

/**
 * Repository error types for proper error handling
 */
export class UserRepositoryError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'UserRepositoryError';
  }
}

export class UserNotFoundError extends UserRepositoryError {
  constructor(identifier: string, cause?: Error) {
    super(`User not found: ${identifier}`, 'find', cause);
    this.name = 'UserNotFoundError';
  }
}

export class UserAlreadyExistsError extends UserRepositoryError {
  constructor(email: string, cause?: Error) {
    super(`User already exists with email: ${email}`, 'create', cause);
    this.name = 'UserAlreadyExistsError';
  }
}

export class UserRepositoryConnectionError extends UserRepositoryError {
  constructor(message: string, operation: string, cause?: Error) {
    super(`Repository connection error: ${message}`, operation, cause);
    this.name = 'UserRepositoryConnectionError';
  }
}

/**
 * User Repository Interface
 *
 * Defines the contract for User entity persistence operations.
 * Implementation will be provided by infrastructure layer.
 *
 * @interface IUserRepository
 */
export interface IUserRepository {
  /**
   * Save a new user to the repository
   * @param user - User entity to save
   * @returns Promise<User> - Saved user with updated metadata
   * @throws {UserAlreadyExistsError} When user with email already exists
   * @throws {UserRepositoryError} When save operation fails
   */
  save(user: User): Promise<User>;

  /**
   * Update an existing user in the repository
   * @param user - User entity with updates
   * @returns Promise<User> - Updated user entity
   * @throws {UserNotFoundError} When user doesn't exist
   * @throws {UserRepositoryError} When update operation fails
   */
  update(user: User): Promise<User>;

  /**
   * Find user by unique identifier
   * @param id - User ID
   * @returns Promise<User | null> - User entity or null if not found
   * @throws {UserRepositoryError} When find operation fails
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email address (unique constraint)
   * @param email - Email value object
   * @returns Promise<User | null> - User entity or null if not found
   * @throws {UserRepositoryError} When find operation fails
   */
  findByEmail(email: Email): Promise<User | null>;

  /**
   * Check if user exists by email
   * @param email - Email value object
   * @returns Promise<boolean> - True if user exists
   * @throws {UserRepositoryError} When check operation fails
   */
  existsByEmail(email: Email): Promise<boolean>;

  /**
   * Search users with filtering and pagination
   * @param criteria - Search criteria and pagination options
   * @returns Promise<UserSearchResult> - Paginated search results
   * @throws {UserRepositoryError} When search operation fails
   */
  search(criteria: UserSearchCriteria): Promise<UserSearchResult>;

  /**
   * Find all users (with optional limit for safety)
   * @param limit - Maximum number of users to return (default: 1000)
   * @returns Promise<readonly User[]> - Array of all users
   * @throws {UserRepositoryError} When find operation fails
   */
  findAll(limit?: number): Promise<readonly User[]>;

  /**
   * Find users by role
   * @param role - Role value object
   * @param limit - Maximum number of users to return
   * @returns Promise<readonly User[]> - Array of users with specified role
   * @throws {UserRepositoryError} When find operation fails
   */
  findByRole(role: Role, limit?: number): Promise<readonly User[]>;

  /**
   * Find users by status
   * @param status - User status
   * @param limit - Maximum number of users to return
   * @returns Promise<readonly User[]> - Array of users with specified status
   * @throws {UserRepositoryError} When find operation fails
   */
  findByStatus(status: string, limit?: number): Promise<readonly User[]>;

  /**
   * Find locked users (for administrative purposes)
   * @param limit - Maximum number of users to return
   * @returns Promise<readonly User[]> - Array of locked users
   * @throws {UserRepositoryError} When find operation fails
   */
  findLockedUsers(limit?: number): Promise<readonly User[]>;

  /**
   * Count total number of users
   * @returns Promise<number> - Total user count
   * @throws {UserRepositoryError} When count operation fails
   */
  count(): Promise<number>;

  /**
   * Count users by specific criteria
   * @param criteria - Count criteria
   * @returns Promise<number> - Count of matching users
   * @throws {UserRepositoryError} When count operation fails
   */
  countByCriteria(criteria: Partial<UserSearchCriteria>): Promise<number>;

  /**
   * Delete user by ID (soft delete recommended)
   * @param id - User ID
   * @returns Promise<boolean> - True if user was deleted
   * @throws {UserNotFoundError} When user doesn't exist
   * @throws {UserRepositoryError} When delete operation fails
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get repository statistics for monitoring
   * @returns Promise<UserRepositoryStats> - Repository statistics
   * @throws {UserRepositoryError} When stats operation fails
   */
  getStats(): Promise<UserRepositoryStats>;

  /**
   * Check repository health and connectivity
   * @returns Promise<boolean> - True if repository is healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Begin transaction for atomic operations
   * @returns Promise<IUserRepositoryTransaction> - Transaction context
   * @throws {UserRepositoryError} When transaction start fails
   */
  beginTransaction(): Promise<IUserRepositoryTransaction>;
}

/**
 * User Repository Transaction Interface
 *
 * Provides transactional operations for atomic user management.
 * Ensures data consistency across multiple operations.
 */
export interface IUserRepositoryTransaction {
  /**
   * Save user within transaction
   * @param user - User entity to save
   * @returns Promise<User> - Saved user
   */
  save(user: User): Promise<User>;

  /**
   * Update user within transaction
   * @param user - User entity to update
   * @returns Promise<User> - Updated user
   */
  update(user: User): Promise<User>;

  /**
   * Delete user within transaction
   * @param id - User ID to delete
   * @returns Promise<boolean> - Success status
   */
  delete(id: string): Promise<boolean>;

  /**
   * Commit transaction changes
   * @returns Promise<void>
   * @throws {UserRepositoryError} When commit fails
   */
  commit(): Promise<void>;

  /**
   * Rollback transaction changes
   * @returns Promise<void>
   * @throws {UserRepositoryError} When rollback fails
   */
  rollback(): Promise<void>;

  /**
   * Check if transaction is active
   * @returns boolean - True if transaction is active
   */
  isActive(): boolean;
}
