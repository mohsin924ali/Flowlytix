import { CreateUserHandler, IUserRepository } from '../create-user.handler';
import { CreateUserCommand } from '../../../commands/auth/create-user.command';
import { User, UserStatus } from '../../../../domain/entities/user';
import { Email } from '../../../../domain/value-objects/email';
import { Role, SystemRole, Permission } from '../../../../domain/value-objects/role';

// Mock repository implementation
class MockUserRepository implements IUserRepository {
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

  // Helper methods for testing
  addUser(user: User): void {
    this.users.set(user.id, user);
    this.emailIndex.set(user.email.value, user.id);
  }

  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
  }
}

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let mockRepository: MockUserRepository;
  let adminUser: User;

  beforeEach(() => {
    mockRepository = new MockUserRepository();
    handler = new CreateUserHandler(mockRepository);

    // Create admin user for authorization
    adminUser = User.create({
      email: 'admin@company.com',
      password: 'AdminPass123!',
      firstName: 'Admin',
      lastName: 'User',
      role: SystemRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    mockRepository.addUser(adminUser);
  });

  afterEach(() => {
    mockRepository.clear();
  });

  const validCommand: CreateUserCommand = {
    email: 'newuser@company.com',
    password: 'NewUserPass123!',
    firstName: 'New',
    lastName: 'User',
    role: 'employee',
    createdBy: 'admin-id',
  };

  describe('handle', () => {
    it('should create user successfully with valid command', async () => {
      const command = { ...validCommand, createdBy: adminUser.id };

      const userId = await handler.handle(command);

      expect(userId).toBeDefined();
      expect(typeof userId).toBe('string');

      // Verify user was saved
      const savedUser = await mockRepository.findById(userId);
      expect(savedUser).toBeDefined();
      expect(savedUser!.email.value).toBe(command.email);
      expect(savedUser!.firstName).toBe(command.firstName);
      expect(savedUser!.lastName).toBe(command.lastName);
      expect(savedUser!.role.value).toBe(command.role);
    });

    it('should throw error when creating user not found', async () => {
      const command = { ...validCommand, createdBy: 'non-existent-user' };

      await expect(handler.handle(command)).rejects.toThrow('Creating user not found');
    });

    it('should throw error when creating user lacks permission', async () => {
      // Create user without CREATE_USER permission
      const viewerUser = User.create({
        email: 'viewer@company.com',
        password: 'ViewerPass123!',
        firstName: 'Viewer',
        lastName: 'User',
        role: SystemRole.VIEWER,
        status: UserStatus.ACTIVE,
      });
      mockRepository.addUser(viewerUser);

      const command = { ...validCommand, createdBy: viewerUser.id };

      await expect(handler.handle(command)).rejects.toThrow('Insufficient permissions to create user');
    });

    it('should throw error when user already exists', async () => {
      // Create existing user
      const existingUser = User.create({
        email: validCommand.email,
        password: 'ExistingPass123!',
        firstName: 'Existing',
        lastName: 'User',
        role: SystemRole.EMPLOYEE,
        status: UserStatus.ACTIVE,
      });
      mockRepository.addUser(existingUser);

      const command = { ...validCommand, createdBy: adminUser.id };

      await expect(handler.handle(command)).rejects.toThrow('User with this email already exists');
    });

    it('should throw error when trying to create user with higher role', async () => {
      // Admin user trying to create super admin (higher role)
      const command = {
        ...validCommand,
        role: 'super_admin',
        createdBy: adminUser.id,
      };

      await expect(handler.handle(command)).rejects.toThrow('Cannot create user with higher role than your own');
    });

    it('should allow creating user with same role', async () => {
      const command = {
        ...validCommand,
        role: 'admin',
        createdBy: adminUser.id,
      };

      const userId = await handler.handle(command);
      expect(userId).toBeDefined();

      const savedUser = await mockRepository.findById(userId);
      expect(savedUser!.role.value).toBe('admin');
    });

    it('should allow creating user with lower role', async () => {
      const command = {
        ...validCommand,
        role: 'employee',
        createdBy: adminUser.id,
      };

      const userId = await handler.handle(command);
      expect(userId).toBeDefined();

      const savedUser = await mockRepository.findById(userId);
      expect(savedUser!.role.value).toBe('employee');
    });

    it('should use provided status', async () => {
      const command = {
        ...validCommand,
        status: UserStatus.PENDING,
        createdBy: adminUser.id,
      };

      const userId = await handler.handle(command);
      const savedUser = await mockRepository.findById(userId);
      expect(savedUser!.status).toBe(UserStatus.PENDING);
    });

    it('should default to ACTIVE status when not provided', async () => {
      const command = { ...validCommand, createdBy: adminUser.id };

      const userId = await handler.handle(command);
      const savedUser = await mockRepository.findById(userId);
      expect(savedUser!.status).toBe(UserStatus.ACTIVE);
    });

    it('should validate command before processing', async () => {
      const invalidCommand = {
        ...validCommand,
        email: 'invalid-email',
        createdBy: adminUser.id,
      };

      await expect(handler.handle(invalidCommand)).rejects.toThrow();
    });

    it('should allow super admin to create any role', async () => {
      // Create super admin user
      const superAdminUser = User.create({
        email: 'superadmin@company.com',
        password: 'SuperPass123!',
        firstName: 'Super',
        lastName: 'Admin',
        role: SystemRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      });
      mockRepository.addUser(superAdminUser);

      const command = {
        ...validCommand,
        role: 'admin',
        createdBy: superAdminUser.id,
      };

      const userId = await handler.handle(command);
      expect(userId).toBeDefined();

      const savedUser = await mockRepository.findById(userId);
      expect(savedUser!.role.value).toBe('admin');
    });
  });

  describe('integration with domain validation', () => {
    it('should respect domain password validation', async () => {
      const command = {
        ...validCommand,
        password: 'weak',
        createdBy: adminUser.id,
      };

      await expect(handler.handle(command)).rejects.toThrow();
    });

    it('should respect domain email validation', async () => {
      const command = {
        ...validCommand,
        email: 'invalid-email-format',
        createdBy: adminUser.id,
      };

      await expect(handler.handle(command)).rejects.toThrow();
    });

    it('should respect domain role validation', async () => {
      const command = {
        ...validCommand,
        role: 'invalid-role',
        createdBy: adminUser.id,
      };

      await expect(handler.handle(command)).rejects.toThrow();
    });
  });
});
