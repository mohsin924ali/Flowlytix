/**
 * User Entity Tests
 * Comprehensive test suite for the User domain entity
 * Following strict testing standards and offline authentication scenarios
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { User, UserStatus, UserDomainError, UserValidationError, UserSecurityError } from '../user';
import type { CreateUserParams, UserProps } from '../user';

// Test constants
const MOCK_DATE = new Date('2024-01-01T00:00:00.000Z');

describe('User Entity', () => {
  let validUserParams: CreateUserParams;
  let validUserProps: UserProps;
  let adminUser: User;
  let regularUser: User;

  beforeEach(() => {
    // Mock Date for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(MOCK_DATE.getTime());
    
    validUserParams = {
      email: 'john.doe@example.com',
      password: 'SecurePass123!',
      role: 'employee',
      firstName: 'John',
      lastName: 'Doe',
      status: UserStatus.ACTIVE,
    };

    // Setup test users with proper mocking
    const { Email } = require('../../value-objects/email');
    const { Password } = require('../../value-objects/password');
    const { Role, SystemRole } = require('../../value-objects/role');

    const email = Email.fromString('john.doe@example.com');
    const password = Password.fromPlainText('SecurePass123!');
    const role = Role.fromString('employee');

    validUserProps = {
      id: 'user_123',
      email,
      password,
      role,
      firstName: 'John',
      lastName: 'Doe',
      status: UserStatus.ACTIVE,
      createdAt: MOCK_DATE,
      updatedAt: MOCK_DATE,
      loginAttempts: 0,
    };

    // Create admin user for authorization tests
    const adminEmail = Email.fromString('admin@example.com');
    const adminPassword = Password.fromPlainText('AdminPass123!');
    const adminRole = Role.fromString('admin');
    
    const adminProps: UserProps = {
      id: 'admin_123',
      email: adminEmail,
      password: adminPassword,
      role: adminRole,
      firstName: 'Admin',
      lastName: 'User',
      status: UserStatus.ACTIVE,
      createdAt: MOCK_DATE,
      updatedAt: MOCK_DATE,
      loginAttempts: 0,
    };

    adminUser = new User(adminProps);
    regularUser = new User(validUserProps);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor and Basic Properties', () => {
    it('should create a valid user entity', () => {
      const user = new User(validUserProps);

      expect(user.id).toBe('user_123');
      expect(user.email.value).toBe('john.doe@example.com');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.fullName).toBe('John Doe');
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.loginAttempts).toBe(0);
      expect(user.createdAt).toEqual(MOCK_DATE);
      expect(user.updatedAt).toEqual(MOCK_DATE);
    });

    it('should validate required ID', () => {
      const invalidProps = { ...validUserProps, id: '' };
      
      expect(() => new User(invalidProps)).toThrow(UserValidationError);
      expect(() => new User(invalidProps)).toThrow('ID is required');
    });

    it('should validate firstName length and characters', () => {
      const shortName = { ...validUserProps, firstName: 'A' };
      const invalidChars = { ...validUserProps, firstName: 'John123' };
      
      expect(() => new User(shortName)).toThrow(UserValidationError);
      expect(() => new User(shortName)).toThrow('firstName must be at least 2 characters');
      
      expect(() => new User(invalidChars)).toThrow(UserValidationError);
      expect(() => new User(invalidChars)).toThrow('firstName contains invalid characters');
    });

    it('should validate lastName requirements', () => {
      const shortName = { ...validUserProps, lastName: 'B' };
      const longName = { ...validUserProps, lastName: 'A'.repeat(51) };
      
      expect(() => new User(shortName)).toThrow(UserValidationError);
      expect(() => new User(longName)).toThrow(UserValidationError);
    });

    it('should not allow negative login attempts', () => {
      const invalidProps = { ...validUserProps, loginAttempts: -1 };
      
      expect(() => new User(invalidProps)).toThrow(UserValidationError);
      expect(() => new User(invalidProps)).toThrow('Login attempts cannot be negative');
    });
  });

  describe('Offline Authentication', () => {
    describe('authenticate() - Core Authentication', () => {
      it('should authenticate with correct password', () => {
        const result = regularUser.authenticate('SecurePass123!');
        
        expect(result).toBe(true);
        expect(regularUser.loginAttempts).toBe(0);
        expect(regularUser.lastLoginAt).toBeDefined();
      });

      it('should fail with incorrect password', () => {
        const result = regularUser.authenticate('WrongPassword');
        
        expect(result).toBe(false);
        expect(regularUser.loginAttempts).toBe(1);
        expect(regularUser.lastLoginAt).toBeUndefined();
      });

      it('should increment login attempts on failure', () => {
        regularUser.authenticate('Wrong1');
        regularUser.authenticate('Wrong2');
        regularUser.authenticate('Wrong3');
        
        expect(regularUser.loginAttempts).toBe(3);
      });

      it('should lock account after max failed attempts', () => {
        // Trigger 5 failed attempts
        for (let i = 0; i < 5; i++) {
          regularUser.authenticate('WrongPassword');
        }
        
        expect(regularUser.isAccountLocked()).toBe(true);
        expect(regularUser.lockedUntil).toBeDefined();
        expect(regularUser.loginAttempts).toBe(5);
      });

      it('should throw error when account is locked', () => {
        // Lock the account first
        for (let i = 0; i < 5; i++) {
          regularUser.authenticate('WrongPassword');
        }
        
        expect(() => regularUser.authenticate('SecurePass123!'))
          .toThrow(UserSecurityError);
        expect(() => regularUser.authenticate('SecurePass123!'))
          .toThrow('Account is currently locked');
      });

      it('should reset attempts and update login time on successful auth', () => {
        // Fail a few times first
        regularUser.authenticate('Wrong1');
        regularUser.authenticate('Wrong2');
        expect(regularUser.loginAttempts).toBe(2);
        
        // Then succeed
        const result = regularUser.authenticate('SecurePass123!');
        
        expect(result).toBe(true);
        expect(regularUser.loginAttempts).toBe(0);
        expect(regularUser.lastLoginAt).toBeDefined();
        expect(regularUser.lockedUntil).toBeUndefined();
      });
    });

    describe('authenticate() - Account Status Checks', () => {
      it('should prevent authentication for suspended users', () => {
        const suspendedProps = { ...validUserProps, status: UserStatus.SUSPENDED };
        const suspendedUser = new User(suspendedProps);
        
        expect(() => suspendedUser.authenticate('SecurePass123!'))
          .toThrow(UserSecurityError);
        expect(() => suspendedUser.authenticate('SecurePass123!'))
          .toThrow('Account is suspended');
      });

      it('should prevent authentication for inactive users', () => {
        const inactiveProps = { ...validUserProps, status: UserStatus.INACTIVE };
        const inactiveUser = new User(inactiveProps);
        
        expect(() => inactiveUser.authenticate('SecurePass123!'))
          .toThrow(UserSecurityError);
        expect(() => inactiveUser.authenticate('SecurePass123!'))
          .toThrow('Account is inactive');
      });

      it('should allow authentication for pending users', () => {
        const pendingProps = { ...validUserProps, status: UserStatus.PENDING };
        const pendingUser = new User(pendingProps);
        
        const result = pendingUser.authenticate('SecurePass123!');
        expect(result).toBe(true);
      });
    });

    describe('changePassword() - Offline Password Management', () => {
      it('should change password successfully with valid current password', () => {
        const result = regularUser.changePassword('SecurePass123!', 'NewSecurePass456!');
        
        expect(result).toBe(true);
        
        // Verify new password works
        expect(regularUser.authenticate('NewSecurePass456!')).toBe(true);
        
        // Verify old password no longer works
        expect(regularUser.authenticate('SecurePass123!')).toBe(false);
      });

      it('should fail with incorrect current password', () => {
        expect(() => regularUser.changePassword('WrongPassword', 'NewSecurePass456!'))
          .toThrow(UserSecurityError);
        expect(() => regularUser.changePassword('WrongPassword', 'NewSecurePass456!'))
          .toThrow('Current password is invalid');
      });

      it('should not allow setting same password', () => {
        expect(() => regularUser.changePassword('SecurePass123!', 'SecurePass123!'))
          .toThrow(UserSecurityError);
        expect(() => regularUser.changePassword('SecurePass123!', 'SecurePass123!'))
          .toThrow('New password must be different from current password');
      });

      it('should update timestamp on password change', () => {
        const originalUpdatedAt = regularUser.updatedAt;
        
        // Wait a moment to ensure timestamp difference
        jest.spyOn(Date, 'now').mockReturnValue(MOCK_DATE.getTime() + 1000);
        
        regularUser.changePassword('SecurePass123!', 'NewSecurePass456!');
        
        expect(regularUser.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      });
    });

    describe('Account Locking and Unlocking', () => {
      it('should auto-unlock expired locks', () => {
        // Create user with expired lock (2 hours ago)
        const expiredLockTime = new Date(MOCK_DATE.getTime() - 2 * 60 * 60 * 1000);
        const lockedProps = { 
          ...validUserProps, 
          loginAttempts: 5, 
          lockedUntil: expiredLockTime 
        };
        const lockedUser = new User(lockedProps);
        
        // Check should auto-unlock
        expect(lockedUser.isAccountLocked()).toBe(false);
        expect(lockedUser.loginAttempts).toBe(0);
        expect(lockedUser.lockedUntil).toBeUndefined();
      });

      it('should maintain lock for non-expired accounts', () => {
        // Create user with future lock time
        const futureLockTime = new Date(MOCK_DATE.getTime() + 60 * 60 * 1000);
        const lockedProps = { 
          ...validUserProps, 
          loginAttempts: 5, 
          lockedUntil: futureLockTime 
        };
        const lockedUser = new User(lockedProps);
        
        expect(lockedUser.isAccountLocked()).toBe(true);
        expect(lockedUser.lockedUntil).toEqual(futureLockTime);
      });

      it('should manually unlock with proper authorization', () => {
        // Lock the account
        for (let i = 0; i < 5; i++) {
          regularUser.authenticate('WrongPassword');
        }
        
        expect(regularUser.isAccountLocked()).toBe(true);
        
        // Unlock with admin
        regularUser.unlock(adminUser);
        
        expect(regularUser.isAccountLocked()).toBe(false);
        expect(regularUser.loginAttempts).toBe(0);
        expect(regularUser.lockedUntil).toBeUndefined();
      });
    });
  });

  describe('User Management Operations', () => {
    describe('updateEmail()', () => {
      it('should update email successfully', () => {
        regularUser.updateEmail('newemail@example.com');
        
        expect(regularUser.email.value).toBe('newemail@example.com');
      });

      it('should reject same email', () => {
        expect(() => regularUser.updateEmail('john.doe@example.com'))
          .toThrow(UserValidationError);
        expect(() => regularUser.updateEmail('john.doe@example.com'))
          .toThrow('New email must be different from current email');
      });

      it('should validate email format', () => {
        expect(() => regularUser.updateEmail('invalid-email-format'))
          .toThrow(); // Should throw email validation error
      });
    });

    describe('updateProfile()', () => {
      it('should update profile information', () => {
        regularUser.updateProfile('Jane', 'Smith');
        
        expect(regularUser.firstName).toBe('Jane');
        expect(regularUser.lastName).toBe('Smith');
        expect(regularUser.fullName).toBe('Jane Smith');
      });

      it('should trim whitespace from names', () => {
        regularUser.updateProfile('  Jane  ', '  Smith  ');
        
        expect(regularUser.firstName).toBe('Jane');
        expect(regularUser.lastName).toBe('Smith');
      });

      it('should validate name requirements', () => {
        expect(() => regularUser.updateProfile('A', 'ValidLastName'))
          .toThrow(UserValidationError);
        expect(() => regularUser.updateProfile('ValidFirstName', 'B'))
          .toThrow(UserValidationError);
      });
    });

    describe('activate() and suspend()', () => {
      it('should activate inactive user with proper authorization', () => {
        const inactiveProps = { ...validUserProps, status: UserStatus.INACTIVE };
        const inactiveUser = new User(inactiveProps);
        
        inactiveUser.activate(adminUser);
        
        expect(inactiveUser.status).toBe(UserStatus.ACTIVE);
        expect(inactiveUser.loginAttempts).toBe(0);
        expect(inactiveUser.lockedUntil).toBeUndefined();
      });

      it('should prevent unauthorized activation', () => {
        const inactiveProps = { ...validUserProps, status: UserStatus.INACTIVE };
        const inactiveUser = new User(inactiveProps);
        
        expect(() => inactiveUser.activate(regularUser))
          .toThrow(UserSecurityError);
        expect(() => inactiveUser.activate(regularUser))
          .toThrow('Insufficient permissions to activate user');
      });

      it('should suspend user with proper authorization', () => {
        regularUser.suspend(adminUser);
        
        expect(regularUser.status).toBe(UserStatus.SUSPENDED);
      });

      it('should prevent suspending equal or higher roles', () => {
        expect(() => adminUser.suspend(regularUser))
          .toThrow(UserSecurityError);
        expect(() => adminUser.suspend(regularUser))
          .toThrow('Cannot suspend users with equal or higher roles');
      });
    });
  });

  describe('Permissions and Authorization', () => {
    describe('hasPermission()', () => {
      it('should return correct permissions for user roles', () => {
        const { Permission } = require('../../value-objects/role');
        
        // Admin should have management permissions
        expect(adminUser.hasPermission(Permission.CREATE_USER)).toBe(true);
        expect(adminUser.hasPermission(Permission.UPDATE_USER)).toBe(true);
        
        // Employee should have limited permissions
        expect(regularUser.hasPermission(Permission.READ_USER)).toBe(true);
        expect(regularUser.hasPermission(Permission.CREATE_USER)).toBe(false);
      });

      it('should return false for inactive users', () => {
        const { Permission } = require('../../value-objects/role');
        const inactiveProps = { ...validUserProps, status: UserStatus.INACTIVE };
        const inactiveUser = new User(inactiveProps);
        
        expect(inactiveUser.hasPermission(Permission.READ_USER)).toBe(false);
      });
    });

    describe('canManageUser()', () => {
      it('should allow higher roles to manage lower roles', () => {
        expect(adminUser.canManageUser(regularUser)).toBe(true);
      });

      it('should prevent lower roles from managing higher roles', () => {
        expect(regularUser.canManageUser(adminUser)).toBe(false);
      });

      it('should require management permission', () => {
        expect(regularUser.canManageUser(regularUser)).toBe(false);
      });
    });
  });

  describe('Security and Validation', () => {
    describe('isPasswordExpired()', () => {
      it('should return false for new passwords', () => {
        expect(regularUser.isPasswordExpired()).toBe(false);
      });

      it('should detect expired passwords', () => {
        // Mock password age check
        const { Password } = require('../../value-objects/password');
        jest.spyOn(Password.prototype, 'isOlderThan').mockReturnValue(true);
        
        expect(regularUser.isPasswordExpired()).toBe(true);
      });
    });

    describe('Data Display and Persistence', () => {
      it('should provide safe display information', () => {
        const displayInfo = regularUser.getDisplayInfo();
        
        expect(displayInfo).toEqual({
          id: 'user_123',
          email: 'john.doe@example.com',
          fullName: 'John Doe',
          role: 'employee',
          roleName: 'Employee',
          status: UserStatus.ACTIVE,
          lastLoginAt: undefined,
          isLocked: false,
          isPasswordExpired: false,
        });
      });

      it('should provide persistence data structure', () => {
        const persistenceData = regularUser.toPersistence();
        
        expect(persistenceData).toHaveProperty('id');
        expect(persistenceData).toHaveProperty('email');
        expect(persistenceData).toHaveProperty('password');
        expect(persistenceData).toHaveProperty('role');
        expect(persistenceData).toHaveProperty('firstName');
        expect(persistenceData).toHaveProperty('lastName');
        expect(persistenceData).toHaveProperty('status');
        expect(persistenceData).toHaveProperty('createdAt');
        expect(persistenceData).toHaveProperty('updatedAt');
        expect(persistenceData).toHaveProperty('loginAttempts');
        
        expect(persistenceData.email).toBe('john.doe@example.com');
        expect(persistenceData.role).toBe('employee');
      });
    });
  });

  describe('Factory Methods', () => {
    describe('create()', () => {
      it('should create user with valid parameters', () => {
        const user = User.create(validUserParams);
        
        expect(user.email.value).toBe('john.doe@example.com');
        expect(user.firstName).toBe('John');
        expect(user.lastName).toBe('Doe');
        expect(user.status).toBe(UserStatus.ACTIVE);
        expect(user.id).toMatch(/^user_/);
      });

      it('should create user with admin authorization', () => {
        const user = User.create(validUserParams, adminUser);
        
        expect(user.email.value).toBe('john.doe@example.com');
      });

      it('should prevent unauthorized user creation', () => {
        expect(() => User.create(validUserParams, regularUser))
          .toThrow(UserSecurityError);
        expect(() => User.create(validUserParams, regularUser))
          .toThrow('Insufficient permissions to create user');
      });

      it('should generate unique IDs', () => {
        const user1 = User.create({ ...validUserParams, email: 'user1@example.com' });
        const user2 = User.create({ ...validUserParams, email: 'user2@example.com' });
        
        expect(user1.id).not.toBe(user2.id);
        expect(user1.id).toMatch(/^user_/);
        expect(user2.id).toMatch(/^user_/);
      });

      it('should default to ACTIVE status when not specified', () => {
        const paramsWithoutStatus = {
          email: 'test@example.com',
          password: 'TestPass123!',
          role: 'employee',
          firstName: 'Test',
          lastName: 'User'
        };
        
        const user = User.create(paramsWithoutStatus);
        expect(user.status).toBe(UserStatus.ACTIVE);
      });
    });

    describe('fromPersistence()', () => {
      it('should reconstruct user from storage data', () => {
        const persistenceData = {
          id: 'user_456',
          email: 'stored@example.com',
          password: regularUser.getHashedPassword(),
          role: 'manager',
          firstName: 'Stored',
          lastName: 'User',
          status: UserStatus.ACTIVE,
          createdAt: MOCK_DATE,
          updatedAt: MOCK_DATE,
          loginAttempts: 2,
          lockedUntil: undefined,
        };
        
        const user = User.fromPersistence(persistenceData);
        
        expect(user.id).toBe('user_456');
        expect(user.email.value).toBe('stored@example.com');
        expect(user.role.value).toBe('manager');
        expect(user.firstName).toBe('Stored');
        expect(user.lastName).toBe('User');
        expect(user.loginAttempts).toBe(2);
      });

      it('should handle optional fields correctly', () => {
        const lockTime = new Date(MOCK_DATE.getTime() + 60 * 60 * 1000);
        const persistenceData = {
          id: 'user_789',
          email: 'optional@example.com',
          password: regularUser.getHashedPassword(),
          role: 'employee',
          firstName: 'Optional',
          lastName: 'User',
          status: UserStatus.ACTIVE,
          createdAt: MOCK_DATE,
          updatedAt: MOCK_DATE,
          lastLoginAt: MOCK_DATE,
          loginAttempts: 0,
          lockedUntil: lockTime,
        };
        
        const user = User.fromPersistence(persistenceData);
        
        expect(user.lastLoginAt).toEqual(MOCK_DATE);
        expect(user.lockedUntil).toEqual(lockTime);
      });
    });
  });

  describe('Error Types', () => {
    it('should create UserDomainError correctly', () => {
      const error = new UserDomainError('Test domain error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('UserDomainError');
      expect(error.message).toBe('Test domain error');
    });

    it('should create UserValidationError correctly', () => {
      const error = new UserValidationError('email', 'Invalid format');
      
      expect(error).toBeInstanceOf(UserDomainError);
      expect(error.name).toBe('UserValidationError');
      expect(error.message).toBe('User validation error in email: Invalid format');
    });

    it('should create UserSecurityError correctly', () => {
      const error = new UserSecurityError('Unauthorized action');
      
      expect(error).toBeInstanceOf(UserDomainError);
      expect(error.name).toBe('UserSecurityError');
      expect(error.message).toBe('User security error: Unauthorized action');
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle multiple rapid operations correctly', () => {
      // Multiple failed authentications
      for (let i = 0; i < 3; i++) {
        regularUser.authenticate('Wrong' + i);
      }
      
      // Profile update
      regularUser.updateProfile('Updated', 'Name');
      
      // Successful authentication
      const authResult = regularUser.authenticate('SecurePass123!');
      
      expect(authResult).toBe(true);
      expect(regularUser.fullName).toBe('Updated Name');
      expect(regularUser.loginAttempts).toBe(0);
    });

    it('should maintain immutability of value objects', () => {
      const originalEmail = regularUser.email;
      
      regularUser.updateEmail('new@example.com');
      
      expect(originalEmail.value).toBe('john.doe@example.com');
      expect(regularUser.email.value).toBe('new@example.com');
      expect(originalEmail).not.toBe(regularUser.email);
    });

    it('should handle concurrent password changes', () => {
      regularUser.changePassword('SecurePass123!', 'NewPass1!');
      regularUser.changePassword('NewPass1!', 'NewPass2!');
      regularUser.changePassword('NewPass2!', 'FinalPass123!');
      
      expect(regularUser.authenticate('FinalPass123!')).toBe(true);
      expect(regularUser.authenticate('SecurePass123!')).toBe(false);
      expect(regularUser.authenticate('NewPass1!')).toBe(false);
      expect(regularUser.authenticate('NewPass2!')).toBe(false);
    });
  });
}); 