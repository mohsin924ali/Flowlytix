import { CreateUserCommand, validateCreateUserCommand } from '../../commands/auth/create-user.command';
import { User, UserStatus } from '../../../domain/entities/user';
import { Email } from '../../../domain/value-objects/email';
import { Password } from '../../../domain/value-objects/password';
import { Role, Permission } from '../../../domain/value-objects/role';

/**
 * Repository interface for user persistence
 * Following Hexagonal Architecture - this will be implemented in infrastructure layer
 */
export interface IUserRepository {
  findByEmail(email: Email): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  exists(email: Email): Promise<boolean>;
}

/**
 * Handler for CreateUser command
 * Implements business logic for user creation with proper authorization
 */
export class CreateUserHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Handles user creation command
   * @param command - CreateUser command
   * @returns Promise<string> - ID of created user
   * @throws {Error} When validation fails or unauthorized
   */
  async handle(command: CreateUserCommand): Promise<string> {
    // Validate command
    validateCreateUserCommand(command);

    // Get the user who is creating this user (for authorization)
    const createdByUser = await this.userRepository.findById(command.createdBy);
    if (!createdByUser) {
      throw new Error('Creating user not found');
    }

    // Check authorization - only users with CREATE_USER permission can create users
    if (!createdByUser.hasPermission(Permission.CREATE_USER)) {
      throw new Error('Insufficient permissions to create user');
    }

    // Check if user already exists
    const email = Email.fromString(command.email);
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create password and role value objects
    const password = Password.fromPlainText(command.password);
    const role = Role.fromString(command.role);

    // Role hierarchy check - users can only create users with lower or equal roles
    if (!createdByUser.role.canManage(role)) {
      throw new Error('Cannot create user with higher role than your own');
    }

    // Create the user
    const newUser = User.create(
      {
        email: command.email,
        password: command.password,
        firstName: command.firstName,
        lastName: command.lastName,
        role: command.role,
        status: command.status || UserStatus.ACTIVE,
      },
      createdByUser
    );

    // Save to repository
    await this.userRepository.save(newUser);

    return newUser.id;
  }
}

/**
 * Factory function to create CreateUserHandler
 * @param userRepository - User repository implementation
 * @returns CreateUserHandler instance
 */
export function createUserHandler(userRepository: IUserRepository): CreateUserHandler {
  return new CreateUserHandler(userRepository);
}
