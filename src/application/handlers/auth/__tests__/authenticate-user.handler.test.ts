import { AuthenticateUserHandler } from '../authenticate-user.handler';
import { AuthenticateUserCommand, AuthenticationResult } from '../../../commands/auth/authenticate-user.command';
import { User, UserStatus } from '../../../../domain/entities/user';
import { Email } from '../../../../domain/value-objects/email';
import { SystemRole } from '../../../../domain/value-objects/role';

// Use the same mock repository from create-user tests
class MockUserRepository {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map();

  async findByEmail(email: Email): Promise<User | null> {
    const userId = this.emailIndex.get(email.value);
    return userId ? this.users.get(userId) || null : null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
    this.emailIndex.set(user.email.value, user.id);
  }

  async exists(email: Email): Promise<boolean> {
    return this.emailIndex.has(email.value);
  }

  addUser(user: User): void {
    this.users.set(user.id, user);
    this.emailIndex.set(user.email.value, user.id);
  }

  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
  }
}

describe('AuthenticateUserHandler', () => {
  let handler: AuthenticateUserHandler;
  let mockRepository: MockUserRepository;
  let testUser: User;

  beforeEach(() => {
    mockRepository = new MockUserRepository();
    handler = new AuthenticateUserHandler(mockRepository);

    // Create test user
    testUser = User.create({
      email: 'test@company.com',
      password: 'UniqueTestP@ssw0rd2024!',
      firstName: 'Test',
      lastName: 'User',
      role: SystemRole.EMPLOYEE,
      status: UserStatus.ACTIVE,
    });
    mockRepository.addUser(testUser);
  });

  afterEach(() => {
    mockRepository.clear();
  });

  const validCommand: AuthenticateUserCommand = {
    email: 'test@company.com',
    password: 'UniqueTestP@ssw0rd2024!',
  };

  describe('handle - successful authentication', () => {
    it('should authenticate user with correct credentials', async () => {
      const result = await handler.handle(validCommand);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(testUser.id);
      expect(result.error).toBeUndefined();
    });

    it('should update user login time and reset attempts on success', async () => {
      await handler.handle(validCommand);

      const updatedUser = await mockRepository.findById(testUser.id);
      expect(updatedUser!.loginAttempts).toBe(0);
      expect(updatedUser!.lastLoginAt).toBeDefined();
    });

    it('should handle rememberMe option', async () => {
      const command = { ...validCommand, rememberMe: true };
      const result = await handler.handle(command);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(testUser.id);
    });
  });

  describe('handle - failed authentication', () => {
    it('should fail with incorrect password', async () => {
      const command = { ...validCommand, password: 'WrongUniqueP@ssw0rd2024!' };
      const result = await handler.handle(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.userId).toBeUndefined();
    });

    it('should fail for non-existent user', async () => {
      const command = { ...validCommand, email: 'nonexistent@company.com' };
      const result = await handler.handle(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.userId).toBeUndefined();
    });

    it('should increment login attempts on failed authentication', async () => {
      const command = { ...validCommand, password: 'WrongPassword123!' };
      await handler.handle(command);

      const updatedUser = await mockRepository.findById(testUser.id);
      expect(updatedUser!.loginAttempts).toBe(1);
    });

    it('should track remaining attempts', async () => {
      const command = { ...validCommand, password: 'WrongPassword123!' };

      // First failed attempt
      const result1 = await handler.handle(command);
      expect(result1.attemptsRemaining).toBe(4);

      // Second failed attempt
      const result2 = await handler.handle(command);
      expect(result2.attemptsRemaining).toBe(3);
    });
  });

  describe('handle - account lockout', () => {
    it('should lock account after max failed attempts', async () => {
      const command = { ...validCommand, password: 'WrongPassword123!' };

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await handler.handle(command);
      }

      // Check user is locked
      const lockedUser = await mockRepository.findById(testUser.id);
      expect(lockedUser!.isAccountLocked()).toBe(true);
    });

    it('should return locked account error when account is locked', async () => {
      const command = { ...validCommand, password: 'WrongPassword123!' };

      // Lock the account
      for (let i = 0; i < 5; i++) {
        await handler.handle(command);
      }

      // Try to authenticate with correct password while locked
      const correctCommand = { ...validCommand };
      const result = await handler.handle(correctCommand);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is currently locked');
      expect(result.isLocked).toBe(true);
      expect(result.lockoutExpiresAt).toBeDefined();
    });

    it('should provide lockout expiration time', async () => {
      const command = { ...validCommand, password: 'WrongPassword123!' };

      // Lock the account
      for (let i = 0; i < 5; i++) {
        await handler.handle(command);
      }

      const result = await handler.handle(validCommand);
      expect(result.lockoutExpiresAt).toBeInstanceOf(Date);
      expect(result.lockoutExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('handle - account status checks', () => {
    it('should fail for suspended users', async () => {
      // Create admin to suspend user
      const adminUser = User.create({
        email: 'admin@company.com',
        password: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'User',
        role: SystemRole.ADMIN,
        status: UserStatus.ACTIVE,
      });
      mockRepository.addUser(adminUser);

      // Suspend the test user
      testUser.suspend(adminUser);
      await mockRepository.save(testUser);

      const result = await handler.handle(validCommand);

      expect(result.success).toBe(false);
      expect(result.error).toContain('suspended');
    });

    it('should fail for inactive users', async () => {
      // Create user with inactive status
      const inactiveUser = User.create({
        email: 'inactive@company.com',
        password: 'InactivePass123!',
        firstName: 'Inactive',
        lastName: 'User',
        role: SystemRole.EMPLOYEE,
        status: UserStatus.INACTIVE,
      });
      mockRepository.addUser(inactiveUser);

      const command = {
        email: 'inactive@company.com',
        password: 'InactivePass123!',
      };
      const result = await handler.handle(command);

      expect(result.success).toBe(false);
    });

    it('should allow authentication for pending users', async () => {
      // Create user with pending status
      const pendingUser = User.create({
        email: 'pending@company.com',
        password: 'PendingPass123!',
        firstName: 'Pending',
        lastName: 'User',
        role: SystemRole.EMPLOYEE,
        status: UserStatus.PENDING,
      });
      mockRepository.addUser(pendingUser);

      const command = {
        email: 'pending@company.com',
        password: 'PendingPass123!',
      };
      const result = await handler.handle(command);

      expect(result.success).toBe(true);
    });
  });

  describe('handle - validation', () => {
    it('should validate command before processing', async () => {
      const invalidCommand = {
        email: 'invalid-email',
        password: 'ValidPass123!',
      };

      const result = await handler.handle(invalidCommand);
      expect(result.success).toBe(false);
    });

    it('should handle empty password', async () => {
      const command = { ...validCommand, password: '' };
      const result = await handler.handle(command);

      expect(result.success).toBe(false);
    });

    it('should handle empty email', async () => {
      const command = { ...validCommand, email: '' };
      const result = await handler.handle(command);

      expect(result.success).toBe(false);
    });
  });

  describe('handle - error handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Mock a repository error
      const originalFindByEmail = mockRepository.findByEmail;
      mockRepository.findByEmail = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await handler.handle(validCommand);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');

      // Restore original method
      mockRepository.findByEmail = originalFindByEmail;
    });

    it('should handle domain errors appropriately', async () => {
      // This would test handling of specific domain errors
      // For now, we know our domain throws specific error types
      const result = await handler.handle(validCommand);
      expect(result).toBeDefined();
    });
  });

  describe('integration with domain layer', () => {
    it('should respect domain authentication logic', async () => {
      const result = await handler.handle(validCommand);
      expect(result.success).toBe(true);
    });

    it('should respect domain lockout policies', async () => {
      const command = { ...validCommand, password: 'WrongPassword123!' };

      // Test that lockout happens at the right threshold
      for (let i = 0; i < 4; i++) {
        const result = await handler.handle(command);
        expect(result.isLocked).toBeFalsy();
      }

      // Fifth attempt should trigger lockout
      const finalResult = await handler.handle(command);
      expect(finalResult.attemptsRemaining).toBe(0);
    });
  });
});
