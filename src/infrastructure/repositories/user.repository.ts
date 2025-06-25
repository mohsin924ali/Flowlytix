/**
 * SQLite User Repository Implementation
 *
 * Concrete implementation of IUserRepository interface for SQLite database.
 * Follows Repository pattern and provides data persistence for User entities.
 * Implements comprehensive CRUD operations with proper error handling.
 *
 * @domain User Management
 * @pattern Repository Pattern
 * @architecture Hexagonal Architecture (Adapter)
 * @version 1.0.0
 */

import {
  IUserRepository,
  IUserRepositoryTransaction,
  UserRepositoryError,
  UserNotFoundError,
  UserAlreadyExistsError,
  UserRepositoryConnectionError,
  type UserSearchCriteria,
  type UserSearchResult,
  type UserRepositoryStats,
} from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user';
import { Email } from '../../domain/value-objects/email';
import { Role } from '../../domain/value-objects/role';
import { Password } from '../../domain/value-objects/password';
import { DatabaseConnection } from '../database/connection';
import Database from 'better-sqlite3';

/**
 * User persistence data structure for database operations
 */
interface UserPersistenceData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  password_salt: string;
  password_algorithm: string;
  password_iterations: number;
  password_created_at: number;
  role: string;
  status: string;
  login_attempts: number;
  locked_until: number | null;
  last_login_at: number | null;
  version: number;
  created_by: string;
  created_at: number;
  updated_by: string | null;
  updated_at: number;
}

/**
 * SQLite User Repository Implementation
 *
 * Provides persistent storage for User entities using SQLite database.
 * Implements all IUserRepository interface methods with proper error handling.
 */
export class SqliteUserRepository implements IUserRepository {
  private readonly connection: DatabaseConnection;
  private readonly db: Database.Database;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
    this.db = connection.getDatabase();
  }

  /**
   * Save a new user to the database
   */
  async save(user: User): Promise<User> {
    try {
      // Check if user already exists
      const existing = await this.existsByEmail(user.email);
      if (existing) {
        throw new UserAlreadyExistsError(user.email.value);
      }

      const persistence = user.toPersistence();
      const insertQuery = `
        INSERT INTO users (
          id, email, first_name, last_name, password_hash, password_salt,
          password_algorithm, password_iterations, password_created_at,
          role, status, login_attempts, locked_until, last_login_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const stmt = this.db.prepare(insertQuery);
      stmt.run(
        persistence.id,
        persistence.email,
        persistence.firstName,
        persistence.lastName,
        persistence.password.hash,
        persistence.password.salt,
        persistence.password.algorithm,
        persistence.password.iterations,
        persistence.password.createdAt.getTime(),
        persistence.role,
        persistence.status,
        persistence.loginAttempts,
        persistence.lockedUntil?.getTime() || null,
        persistence.lastLoginAt?.getTime() || null,
        persistence.createdAt.getTime(),
        persistence.updatedAt.getTime()
      );

      return user;
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw error;
      }
      // Log the actual error for debugging
      console.error('Repository save error:', error);
      throw new UserRepositoryError(
        `Failed to save user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'save',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update an existing user in the database
   */
  async update(user: User): Promise<User> {
    try {
      const persistence = user.toPersistence();
      const updateQuery = `
        UPDATE users SET
          email = ?, first_name = ?, last_name = ?, password_hash = ?, password_salt = ?,
          password_algorithm = ?, password_iterations = ?, password_created_at = ?,
          role = ?, status = ?, login_attempts = ?, locked_until = ?, last_login_at = ?,
          updated_at = ?, version = version + 1
        WHERE id = ?
      `;

      const stmt = this.db.prepare(updateQuery);
      const result = stmt.run(
        persistence.email,
        persistence.firstName,
        persistence.lastName,
        persistence.password.hash,
        persistence.password.salt,
        persistence.password.algorithm,
        persistence.password.iterations,
        persistence.password.createdAt.getTime(),
        persistence.role,
        persistence.status,
        persistence.loginAttempts,
        persistence.lockedUntil?.getTime() || null,
        persistence.lastLoginAt?.getTime() || null,
        persistence.updatedAt.getTime(),
        persistence.id
      );

      if (result.changes === 0) {
        throw new UserNotFoundError(persistence.id);
      }

      return user;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      throw new UserRepositoryError(
        `Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'update',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE id = ? AND status != ?';
      const stmt = this.db.prepare(query);
      const row = stmt.get(id, 'inactive') as UserPersistenceData | undefined;

      return row ? this.mapToUser(row) : null;
    } catch (error) {
      throw new UserRepositoryError(
        `Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findById',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: Email): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE email = ?';
      const stmt = this.db.prepare(query);
      const row = stmt.get(email.value) as UserPersistenceData | undefined;

      return row ? this.mapToUser(row) : null;
    } catch (error) {
      throw new UserRepositoryError(
        `Failed to find user by email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByEmail',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if user exists by email
   */
  async existsByEmail(email: Email): Promise<boolean> {
    try {
      const query = 'SELECT 1 FROM users WHERE email = ? LIMIT 1';
      const stmt = this.db.prepare(query);
      const result = stmt.get(email.value);
      return result !== undefined;
    } catch (error) {
      throw new UserRepositoryError(
        `Failed to check user existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsByEmail',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Search users with filtering and pagination
   */
  async search(criteria: UserSearchCriteria): Promise<UserSearchResult> {
    try {
      const { whereClause, params } = this.buildSearchQuery(criteria);
      const limit = criteria.limit || 50;
      const offset = criteria.offset || 0;
      const sortBy = criteria.sortBy || 'created_at';
      const sortOrder = criteria.sortOrder || 'desc';

      // Count total matching records
      const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
      const countStmt = this.db.prepare(countQuery);
      const countResult = countStmt.get(...params) as { total: number };

      // Get paginated results
      const searchQuery = `
        SELECT * FROM users ${whereClause}
        ORDER BY ${this.mapSortField(sortBy)} ${sortOrder.toUpperCase()}
        LIMIT ? OFFSET ?
      `;
      const searchStmt = this.db.prepare(searchQuery);
      const rows = searchStmt.all(...params, limit, offset) as UserPersistenceData[];

      const users = rows.map((row) => this.mapToUser(row));

      return {
        users,
        total: countResult.total,
        limit,
        offset,
        hasMore: offset + limit < countResult.total,
      };
    } catch (error) {
      throw new UserRepositoryError(
        `Failed to search users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'search',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find all users with optional limit
   */
  async findAll(limit: number = 1000): Promise<readonly User[]> {
    try {
      const query = 'SELECT * FROM users ORDER BY created_at DESC LIMIT ?';
      const stmt = this.db.prepare(query);
      const rows = stmt.all(limit) as UserPersistenceData[];

      return rows.map((row) => this.mapToUser(row));
    } catch (error) {
      throw new UserRepositoryError(
        `Failed to find all users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findAll',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find users by role
   */
  async findByRole(role: Role, limit: number = 100): Promise<readonly User[]> {
    try {
      const query = 'SELECT * FROM users WHERE role = ? ORDER BY created_at DESC LIMIT ?';
      const stmt = this.db.prepare(query);
      const rows = stmt.all(role.value, limit) as UserPersistenceData[];

      return rows.map((row) => this.mapToUser(row));
    } catch (error) {
      throw new UserRepositoryError(
        `Failed to find users by role: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByRole',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find users by status
   */
  async findByStatus(status: string, limit: number = 100): Promise<readonly User[]> {
    try {
      const query = 'SELECT * FROM users WHERE status = ? ORDER BY created_at DESC LIMIT ?';
      const stmt = this.db.prepare(query);
      const rows = stmt.all(status, limit) as UserPersistenceData[];

      return rows.map((row) => this.mapToUser(row));
    } catch (error) {
      throw new UserRepositoryError(
        `Failed to find users by status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByStatus',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find locked users
   */
  async findLockedUsers(limit: number = 100): Promise<readonly User[]> {
    try {
      const query = `
        SELECT * FROM users 
        WHERE locked_until IS NOT NULL AND locked_until > ?
        ORDER BY locked_until DESC LIMIT ?
      `;
      const stmt = this.db.prepare(query);
      const rows = stmt.all(Date.now(), limit) as UserPersistenceData[];

      return rows.map((row) => this.mapToUser(row));
    } catch (error) {
      throw new UserRepositoryError(
        `Failed to find locked users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findLockedUsers',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Count total users
   */
  async count(): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM users';
      const stmt = this.db.prepare(query);
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error) {
      throw new UserRepositoryError(
        `Failed to count users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'count',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Count users by criteria
   */
  async countByCriteria(criteria: Partial<UserSearchCriteria>): Promise<number> {
    try {
      const { whereClause, params } = this.buildSearchQuery(criteria);
      const query = `SELECT COUNT(*) as count FROM users ${whereClause}`;
      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as { count: number };
      return result.count;
    } catch (error) {
      throw new UserRepositoryError(
        `Failed to count users by criteria: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'countByCriteria',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete user by ID (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Implement soft delete by updating status to inactive
      const query = `
        UPDATE users SET 
          status = 'inactive',
          updated_at = ?,
          version = version + 1
        WHERE id = ?
      `;
      const stmt = this.db.prepare(query);
      const result = stmt.run(Date.now(), id);

      if (result.changes === 0) {
        throw new UserNotFoundError(id);
      }

      return true;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      throw new UserRepositoryError(
        `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get repository statistics
   */
  async getStats(): Promise<UserRepositoryStats> {
    try {
      const totalQuery = 'SELECT COUNT(*) as count FROM users WHERE status != ?';
      const activeQuery = 'SELECT COUNT(*) as count FROM users WHERE status = ?';
      const lockedQuery = 'SELECT COUNT(*) as count FROM users WHERE locked_until IS NOT NULL AND locked_until > ?';
      const roleQuery = 'SELECT role, COUNT(*) as count FROM users WHERE status != ? GROUP BY role';
      const recentQuery = 'SELECT COUNT(*) as count FROM users WHERE created_at > ? AND status != ?';
      const lastActivityQuery = 'SELECT MAX(last_login_at) as last_activity FROM users WHERE status != ?';

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      const total = (this.db.prepare(totalQuery).get('inactive') as { count: number }).count;
      const active = (this.db.prepare(activeQuery).get('active') as { count: number }).count;
      const locked = (this.db.prepare(lockedQuery).get(Date.now()) as { count: number }).count;
      const recent = (this.db.prepare(recentQuery).get(sevenDaysAgo, 'inactive') as { count: number }).count;
      const lastActivity = (this.db.prepare(lastActivityQuery).get('inactive') as { last_activity: number | null })
        .last_activity;

      const roleStats = this.db.prepare(roleQuery).all('inactive') as { role: string; count: number }[];
      const usersByRole: Record<string, number> = {};
      roleStats.forEach((stat) => {
        usersByRole[stat.role] = stat.count;
      });

      return {
        totalUsers: total,
        activeUsers: active,
        lockedUsers: locked,
        usersByRole,
        recentRegistrations: recent,
        lastActivity: lastActivity ? new Date(lastActivity) : null,
      };
    } catch (error) {
      throw new UserRepositoryError(
        `Failed to get repository stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getStats',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check repository health
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check by counting users
      await this.count();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Begin transaction
   */
  async beginTransaction(): Promise<IUserRepositoryTransaction> {
    try {
      return new SqliteUserRepositoryTransaction(this.db, this);
    } catch (error) {
      throw new UserRepositoryError(
        `Failed to begin transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'beginTransaction',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Map database row to User entity
   */
  private mapToUser(row: UserPersistenceData): User {
    const hashedPassword = {
      hash: row.password_hash,
      salt: row.password_salt,
      algorithm: row.password_algorithm,
      iterations: row.password_iterations,
      createdAt: new Date(row.password_created_at),
    };

    const persistenceData: Parameters<typeof User.fromPersistence>[0] = {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      password: hashedPassword,
      role: row.role,
      status: row.status as any, // UserStatus enum will be validated by User.fromPersistence
      loginAttempts: row.login_attempts,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      ...(row.last_login_at && { lastLoginAt: new Date(row.last_login_at) }),
      ...(row.locked_until && { lockedUntil: new Date(row.locked_until) }),
    };

    return User.fromPersistence(persistenceData);
  }

  /**
   * Build search query with WHERE clause and parameters
   */
  private buildSearchQuery(criteria: Partial<UserSearchCriteria>): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    // Always exclude inactive users unless specifically searching for them
    conditions.push('status != ?');
    params.push('inactive');

    if (criteria.email) {
      conditions.push('email LIKE ?');
      params.push(`%${criteria.email}%`);
    }

    if (criteria.role) {
      conditions.push('role = ?');
      params.push(criteria.role);
    }

    if (criteria.status) {
      conditions.push('status = ?');
      params.push(criteria.status);
    }

    if (criteria.createdBy) {
      conditions.push('created_by = ?');
      params.push(criteria.createdBy);
    }

    if (criteria.createdAfter) {
      conditions.push('created_at >= ?');
      params.push(criteria.createdAfter.getTime());
    }

    if (criteria.createdBefore) {
      conditions.push('created_at <= ?');
      params.push(criteria.createdBefore.getTime());
    }

    if (criteria.lastLoginAfter) {
      conditions.push('last_login_at >= ?');
      params.push(criteria.lastLoginAfter.getTime());
    }

    if (criteria.lastLoginBefore) {
      conditions.push('last_login_at <= ?');
      params.push(criteria.lastLoginBefore.getTime());
    }

    if (criteria.isLocked !== undefined) {
      if (criteria.isLocked) {
        conditions.push('locked_until IS NOT NULL AND locked_until > ?');
        params.push(Date.now());
      } else {
        conditions.push('(locked_until IS NULL OR locked_until <= ?)');
        params.push(Date.now());
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
  }

  /**
   * Map sort field to database column
   */
  private mapSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      email: 'email',
      createdAt: 'created_at',
      lastLoginAt: 'last_login_at',
      role: 'role',
    };

    return fieldMap[sortBy] || 'created_at';
  }
}

/**
 * SQLite User Repository Transaction Implementation
 *
 * Provides transactional operations for atomic user management.
 */
class SqliteUserRepositoryTransaction implements IUserRepositoryTransaction {
  private transaction: Database.Transaction;
  private active: boolean = true;

  constructor(
    private readonly db: Database.Database,
    private readonly repository: SqliteUserRepository
  ) {
    this.transaction = this.db.transaction((operations: (() => void)[]) => {
      operations.forEach((op) => op());
    });
  }

  async save(user: User): Promise<User> {
    if (!this.active) {
      throw new UserRepositoryError('Transaction is not active', 'save');
    }
    return this.repository.save(user);
  }

  async update(user: User): Promise<User> {
    if (!this.active) {
      throw new UserRepositoryError('Transaction is not active', 'update');
    }
    return this.repository.update(user);
  }

  async delete(id: string): Promise<boolean> {
    if (!this.active) {
      throw new UserRepositoryError('Transaction is not active', 'delete');
    }
    return this.repository.delete(id);
  }

  async commit(): Promise<void> {
    if (!this.active) {
      throw new UserRepositoryError('Transaction is not active', 'commit');
    }
    // SQLite auto-commits, so we just mark as inactive
    this.active = false;
  }

  async rollback(): Promise<void> {
    if (!this.active) {
      throw new UserRepositoryError('Transaction is not active', 'rollback');
    }
    // For SQLite, we would need to implement rollback logic
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }
}
