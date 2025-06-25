/**
 * SQLite User Repository Tests
 *
 * Comprehensive test suite for SqliteUserRepository implementation.
 * Tests all CRUD operations, error handling, transactions, and edge cases.
 * Ensures 90%+ test coverage and proper behavior verification.
 *
 * @domain User Management
 * @pattern Repository Pattern Testing
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { SqliteUserRepository } from '../user.repository';
import {
  UserRepositoryError,
  UserNotFoundError,
  UserAlreadyExistsError,
  type UserSearchCriteria,
} from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/entities/user';
import { Email } from '../../../domain/value-objects/email';
import { Role } from '../../../domain/value-objects/role';
import { Password } from '../../../domain/value-objects/password';
import { DatabaseConnection } from '../../database/connection';
import { DatabaseMigration } from '../../database/migration';
import Database from 'better-sqlite3';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';
import { UserStatus } from '../../../domain/entities/user';

describe('SqliteUserRepository', () => {
  let repository: SqliteUserRepository;
  let connection: DatabaseConnection;
  let testDbPath: string;

  // Test data
  const testEmailStr = 'test@example.com';
  const testPasswordStr = 'UniqueTestPwd2024$#!';
  const testRoleStr = 'admin';
  const testEmail = Email.create(testEmailStr);
  const testPassword = Password.fromPlainText(testPasswordStr);
  const testRole = Role.create(testRoleStr);
  let testUser: User;

  beforeAll(async () => {
    // Create test database path
    testDbPath = join(tmpdir(), `test-user-repo-${Date.now()}.db`);
  });

  beforeEach(async () => {
    // Create fresh database connection for each test
    DatabaseConnection.resetInstance();
    connection = DatabaseConnection.getInstance({ filename: testDbPath });
    await connection.connect();

    // Run migrations
    const migration = new DatabaseMigration(connection);
    await migration.migrate();

    // Clean up any existing data
    const db = connection.getDatabase();
    db.exec('DELETE FROM users');

    repository = new SqliteUserRepository(connection);

    // Create test user
    testUser = User.create({
      email: testEmailStr,
      firstName: 'Test',
      lastName: 'User',
      password: testPasswordStr,
      role: testRoleStr,
    });
  });

  afterEach(async () => {
    await connection.close();
    DatabaseConnection.resetInstance();
  });

  afterAll(() => {
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('save', () => {
    it('should save a new user successfully', async () => {
      const savedUser = await repository.save(testUser);

      expect(savedUser).toBe(testUser);

      // Verify user was actually saved
      const foundUser = await repository.findById(testUser.id);
      expect(foundUser).not.toBeNull();
      expect(foundUser!.email.value).toBe(testEmail.value);
    });

    it('should throw UserAlreadyExistsError when saving duplicate email', async () => {
      await repository.save(testUser);

      const duplicateUser = User.create({
        email: testEmail.value,
        firstName: 'Duplicate',
        lastName: 'User',
        password: testPasswordStr,
        role: testRole.value,
      });

      await expect(repository.save(duplicateUser)).rejects.toThrow(UserAlreadyExistsError);
    });

    it('should handle database errors gracefully', async () => {
      // Close connection to simulate database error
      await connection.close();

      await expect(repository.save(testUser)).rejects.toThrow(UserRepositoryError);
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await repository.save(testUser);
    });

    it('should update an existing user successfully', async () => {
      testUser.updateProfile('Updated', 'Name');

      const result = await repository.update(testUser);

      expect(result).toBe(testUser);

      // Verify update was persisted
      const foundUser = await repository.findById(testUser.id);
      expect(foundUser).not.toBeNull();
      expect(foundUser!.firstName).toBe('Updated');
      expect(foundUser!.lastName).toBe('Name');
    });

    it('should throw UserNotFoundError when updating non-existent user', async () => {
      const nonExistentUser = User.create({
        email: 'nonexistent@example.com',
        firstName: 'Non',
        lastName: 'Existent',
        password: testPasswordStr,
        role: testRole.value,
      });

      await expect(repository.update(nonExistentUser)).rejects.toThrow(UserNotFoundError);
    });

    it('should handle concurrent user updates', async () => {
      // Create a unique user for this test
      const uniqueUser = User.create({
        email: 'concurrent-test@example.com',
        firstName: 'Concurrent',
        lastName: 'Test',
        password: testPasswordStr,
        role: 'admin',
      });

      await repository.save(uniqueUser);

      // Get two references to the same user
      const user1 = await repository.findById(uniqueUser.id);
      const user2 = await repository.findById(uniqueUser.id);

      expect(user1).not.toBeNull();
      expect(user2).not.toBeNull();

      // Update user1 first
      user1!.updateProfile('First Update', 'User');
      const updatedUser1 = await repository.update(user1!);
      expect(updatedUser1.firstName).toBe('First Update');

      // Update user2 (should also succeed since we don't have optimistic locking at domain level)
      user2!.updateProfile('Second Update', 'User');
      const updatedUser2 = await repository.update(user2!);
      expect(updatedUser2.firstName).toBe('Second Update');
    });
  });

  describe('findById', () => {
    beforeEach(async () => {
      await repository.save(testUser);
    });

    it('should find user by ID successfully', async () => {
      const foundUser = await repository.findById(testUser.id);

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe(testUser.id);
      expect(foundUser!.email.value).toBe(testEmail.value);
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await repository.findById('non-existent-id');

      expect(foundUser).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      await connection.close();

      await expect(repository.findById(testUser.id)).rejects.toThrow(UserRepositoryError);
    });
  });

  describe('findByEmail', () => {
    beforeEach(async () => {
      await repository.save(testUser);
    });

    it('should find user by email successfully', async () => {
      const foundUser = await repository.findByEmail(testEmail);

      expect(foundUser).not.toBeNull();
      expect(foundUser!.email.value).toBe(testEmail.value);
    });

    it('should return null for non-existent email', async () => {
      const nonExistentEmail = Email.create('nonexistent@example.com');
      const foundUser = await repository.findByEmail(nonExistentEmail);

      expect(foundUser).toBeNull();
    });
  });

  describe('existsByEmail', () => {
    beforeEach(async () => {
      await repository.save(testUser);
    });

    it('should return true for existing email', async () => {
      const exists = await repository.existsByEmail(testEmail);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const nonExistentEmail = Email.create('nonexistent@example.com');
      const exists = await repository.existsByEmail(nonExistentEmail);

      expect(exists).toBe(false);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Create multiple test users
      const users = [
        User.create({
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          password: testPasswordStr,
          role: 'admin',
        }),
        User.create({
          email: 'manager@example.com',
          firstName: 'Manager',
          lastName: 'User',
          password: testPasswordStr,
          role: 'manager',
        }),
        User.create({
          email: 'employee@example.com',
          firstName: 'Employee',
          lastName: 'User',
          password: testPasswordStr,
          role: 'employee',
        }),
      ];

      for (const user of users) {
        await repository.save(user);
      }
    });

    it('should search users without criteria', async () => {
      const result = await repository.search({});

      expect(result.users.length).toBe(3);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should search users by email pattern', async () => {
      const criteria: UserSearchCriteria = {
        email: 'admin',
      };

      const result = await repository.search(criteria);

      expect(result.users.length).toBe(1);
      expect(result.users[0].email.value).toBe('admin@example.com');
    });

    it('should search users by role', async () => {
      const criteria: UserSearchCriteria = {
        role: 'manager',
      };

      const result = await repository.search(criteria);

      expect(result.users.length).toBe(1);
      expect(result.users[0].role.value).toBe('manager');
    });

    it('should search users by status', async () => {
      const criteria: UserSearchCriteria = {
        status: 'active',
      };

      const result = await repository.search(criteria);

      expect(result.users.length).toBe(3);
      result.users.forEach((user) => {
        expect(user.status).toBe('active');
      });
    });

    it('should handle pagination correctly', async () => {
      const criteria: UserSearchCriteria = {
        limit: 2,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result.users.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
    });

    it('should handle sorting correctly', async () => {
      const criteria: UserSearchCriteria = {
        sortBy: 'email',
        sortOrder: 'asc',
      };

      const result = await repository.search(criteria);

      expect(result.users.length).toBe(3);
      expect(result.users[0].email.value).toBe('admin@example.com');
      expect(result.users[1].email.value).toBe('employee@example.com');
      expect(result.users[2].email.value).toBe('manager@example.com');
    });

    it('should search by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const criteria: UserSearchCriteria = {
        createdAfter: oneHourAgo,
        createdBefore: now,
      };

      const result = await repository.search(criteria);

      expect(result.users.length).toBe(3);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create multiple test users
      const userNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Edward'];
      for (let i = 0; i < 5; i++) {
        const user = User.create({
          email: `user${i}@example.com`,
          firstName: userNames[i],
          lastName: 'Test',
          password: testPasswordStr,
          role: testRole.value,
        });
        await repository.save(user);
      }
    });

    it('should find all users', async () => {
      const users = await repository.findAll();

      expect(users.length).toBe(5);
    });

    it('should respect limit parameter', async () => {
      const users = await repository.findAll(3);

      expect(users.length).toBe(3);
    });
  });

  describe('findByRole', () => {
    beforeEach(async () => {
      const users = [
        User.create({
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          password: testPasswordStr,
          role: 'admin',
        }),
        User.create({
          email: 'manager@example.com',
          firstName: 'Manager',
          lastName: 'User',
          password: testPasswordStr,
          role: 'manager',
        }),
      ];

      for (const user of users) {
        await repository.save(user);
      }
    });

    it('should find users by role', async () => {
      const adminRole = Role.create('admin');
      const users = await repository.findByRole(adminRole);

      expect(users.length).toBe(1);
      expect(users[0].role.value).toBe('admin');
    });

    it('should return empty array for non-existent role', async () => {
      const viewerRole = Role.create('viewer');
      const users = await repository.findByRole(viewerRole);

      expect(users.length).toBe(0);
    });
  });

  describe('findByStatus', () => {
    beforeEach(async () => {
      await repository.save(testUser);

      // Create inactive user
      const inactiveUser = User.create({
        email: 'inactive@example.com',
        firstName: 'Inactive',
        lastName: 'User',
        password: testPasswordStr,
        role: testRole.value,
        status: UserStatus.INACTIVE,
      });

      await repository.save(inactiveUser);
    });

    it('should find users by status', async () => {
      const activeUsers = await repository.findByStatus('active');

      expect(activeUsers.length).toBe(1);
      expect(activeUsers[0].status).toBe('active');
    });

    it('should find inactive users', async () => {
      const inactiveUsers = await repository.findByStatus('inactive');

      expect(inactiveUsers.length).toBe(1);
      expect(inactiveUsers[0].status).toBe('inactive');
    });
  });

  describe('findLockedUsers', () => {
    beforeEach(async () => {
      // Create a user that we'll lock
      const userToLock = User.create({
        email: 'locked@example.com',
        firstName: 'Locked',
        lastName: 'User',
        password: testPasswordStr,
        role: 'employee',
      });

      await repository.save(userToLock);

      // Simulate failed login attempts to lock the user
      let lockedUser = userToLock;
      for (let i = 0; i < 6; i++) {
        // Use authenticate with wrong password to trigger failed login tracking
        try {
          lockedUser.authenticate('wrong-password');
        } catch {
          // Expected to fail, which increments login attempts
        }
      }

      await repository.update(lockedUser);
    });

    it('should find locked users', async () => {
      const lockedUsers = await repository.findLockedUsers();

      expect(lockedUsers.length).toBe(1);
      expect(lockedUsers[0].isAccountLocked()).toBe(true);
    });

    it('should not find unlocked users', async () => {
      // Create an unlocked user
      const unlockedUser = User.create({
        email: 'unlocked@example.com',
        firstName: 'Unlocked',
        lastName: 'User',
        password: testPasswordStr,
        role: 'employee',
      });
      await repository.save(unlockedUser);

      const lockedUsers = await repository.findLockedUsers();

      // Should only find the locked user, not the unlocked one
      lockedUsers.forEach((user) => {
        expect(user.isAccountLocked()).toBe(true);
      });
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      const userNames = ['Alice', 'Bob', 'Charlie'];
      for (let i = 0; i < 3; i++) {
        const user = User.create({
          email: `user${i}@example.com`,
          firstName: userNames[i],
          lastName: 'Test',
          password: testPasswordStr,
          role: testRole.value,
        });
        await repository.save(user);
      }
    });

    it('should count all users', async () => {
      const count = await repository.count();

      expect(count).toBe(3);
    });
  });

  describe('countByCriteria', () => {
    beforeEach(async () => {
      const users = [
        User.create({
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          password: testPasswordStr,
          role: 'admin',
        }),
        User.create({
          email: 'manager@example.com',
          firstName: 'Manager',
          lastName: 'User',
          password: testPasswordStr,
          role: 'manager',
        }),
      ];

      for (const user of users) {
        await repository.save(user);
      }
    });

    it('should count users by role', async () => {
      const count = await repository.countByCriteria({ role: 'admin' });

      expect(count).toBe(1);
    });

    it('should count users by status', async () => {
      const count = await repository.countByCriteria({ status: 'active' });

      expect(count).toBe(2);
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await repository.save(testUser);
    });

    it('should soft delete user successfully', async () => {
      const result = await repository.delete(testUser.id);

      expect(result).toBe(true);

      // Verify user is soft deleted (not found in normal searches)
      const foundUser = await repository.findById(testUser.id);
      expect(foundUser).toBeNull();
    });

    it('should throw UserNotFoundError when deleting non-existent user', async () => {
      await expect(repository.delete('non-existent-id')).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      const users = [
        User.create({
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          password: testPasswordStr,
          role: 'admin',
        }),
        User.create({
          email: 'manager@example.com',
          firstName: 'Manager',
          lastName: 'User',
          password: testPasswordStr,
          role: 'manager',
        }),
        User.create({
          email: 'employee@example.com',
          firstName: 'Employee',
          lastName: 'User',
          password: testPasswordStr,
          role: 'employee',
        }),
      ];

      for (const user of users) {
        await repository.save(user);
      }
    });

    it('should return repository statistics', async () => {
      const stats = await repository.getStats();

      expect(stats.totalUsers).toBe(3);
      expect(stats.activeUsers).toBe(3);
      expect(stats.lockedUsers).toBe(0);
      expect(stats.usersByRole).toEqual({
        admin: 1,
        manager: 1,
        employee: 1,
      });
      expect(stats.recentRegistrations).toBe(3);
      expect(stats.lastActivity).toBeNull(); // No login activity yet
    });
  });

  describe('isHealthy', () => {
    it('should return true when repository is healthy', async () => {
      const healthy = await repository.isHealthy();

      expect(healthy).toBe(true);
    });

    it('should return false when repository is unhealthy', async () => {
      await connection.close();

      const healthy = await repository.isHealthy();

      expect(healthy).toBe(false);
    });
  });

  describe('beginTransaction', () => {
    it('should begin transaction successfully', async () => {
      const transaction = await repository.beginTransaction();

      expect(transaction).toBeDefined();
      expect(transaction.isActive()).toBe(true);
    });

    it('should support transactional operations', async () => {
      const transaction = await repository.beginTransaction();

      // Save user within transaction
      const savedUser = await transaction.save(testUser);
      expect(savedUser).toBe(testUser);

      // Update user within transaction
      testUser.updateProfile('Updated', 'User');
      const result = await transaction.update(testUser);
      expect(result).toBe(testUser);

      // Commit transaction
      await transaction.commit();
      expect(transaction.isActive()).toBe(false);
    });

    it('should handle transaction rollback', async () => {
      const transaction = await repository.beginTransaction();

      await transaction.save(testUser);
      await transaction.rollback();

      expect(transaction.isActive()).toBe(false);
    });

    it('should throw error when using inactive transaction', async () => {
      const transaction = await repository.beginTransaction();
      await transaction.commit();

      await expect(transaction.save(testUser)).rejects.toThrow(UserRepositoryError);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty search results', async () => {
      const result = await repository.search({ email: 'nonexistent' });

      expect(result.users.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle large offset in search', async () => {
      const result = await repository.search({ offset: 1000 });

      expect(result.users.length).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle invalid sort field gracefully', async () => {
      const result = await repository.search({
        sortBy: 'invalid_field' as any,
      });

      // Should default to created_at sorting
      expect(result.users).toBeDefined();
    });

    it('should handle null values in database properly', async () => {
      await repository.save(testUser);

      // User should have undefined lastLoginAt initially
      const foundUser = await repository.findById(testUser.id);
      expect(foundUser!.lastLoginAt).toBeUndefined();
    });
  });
});
