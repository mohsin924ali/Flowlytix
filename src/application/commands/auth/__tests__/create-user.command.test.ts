import { CreateUserCommand, validateCreateUserCommand, CreateUserCommandValidationError } from '../create-user.command';
import { UserStatus } from '../../../../domain/entities/user';

describe('CreateUserCommand', () => {
  const validCommand: CreateUserCommand = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'admin',
    createdBy: 'user-123',
  };

  describe('validateCreateUserCommand', () => {
    it('should validate a correct command', () => {
      expect(() => validateCreateUserCommand(validCommand)).not.toThrow();
    });

    describe('email validation', () => {
      it('should throw error for missing email', () => {
        const command = { ...validCommand, email: '' };
        expect(() => validateCreateUserCommand(command)).toThrow(CreateUserCommandValidationError);
        expect(() => validateCreateUserCommand(command)).toThrow('Email is required and must be a string');
      });

      it('should throw error for non-string email', () => {
        const command = { ...validCommand, email: 123 as any };
        expect(() => validateCreateUserCommand(command)).toThrow(CreateUserCommandValidationError);
      });

      it('should throw error for invalid email format', () => {
        const command = { ...validCommand, email: 'invalid-email' };
        expect(() => validateCreateUserCommand(command)).toThrow(CreateUserCommandValidationError);
        expect(() => validateCreateUserCommand(command)).toThrow('Invalid email format');
      });
    });

    describe('password validation', () => {
      it('should throw error for missing password', () => {
        const command = { ...validCommand, password: '' };
        expect(() => validateCreateUserCommand(command)).toThrow('Password is required and must be a string');
      });

      it('should throw error for non-string password', () => {
        const command = { ...validCommand, password: null as any };
        expect(() => validateCreateUserCommand(command)).toThrow(CreateUserCommandValidationError);
      });
    });

    describe('firstName validation', () => {
      it('should throw error for missing firstName', () => {
        const command = { ...validCommand, firstName: '' };
        expect(() => validateCreateUserCommand(command)).toThrow('First name is required and must be a string');
      });

      it('should throw error for non-string firstName', () => {
        const command = { ...validCommand, firstName: 123 as any };
        expect(() => validateCreateUserCommand(command)).toThrow(CreateUserCommandValidationError);
      });
    });

    describe('lastName validation', () => {
      it('should throw error for missing lastName', () => {
        const command = { ...validCommand, lastName: '' };
        expect(() => validateCreateUserCommand(command)).toThrow('Last name is required and must be a string');
      });

      it('should throw error for non-string lastName', () => {
        const command = { ...validCommand, lastName: undefined as any };
        expect(() => validateCreateUserCommand(command)).toThrow(CreateUserCommandValidationError);
      });
    });

    describe('role validation', () => {
      it('should throw error for missing role', () => {
        const command = { ...validCommand, role: '' };
        expect(() => validateCreateUserCommand(command)).toThrow('Role is required and must be a string');
      });

      it('should throw error for invalid role', () => {
        const command = { ...validCommand, role: 'invalid-role' };
        expect(() => validateCreateUserCommand(command)).toThrow('Invalid role');
      });

      it('should accept valid roles', () => {
        const validRoles = ['super_admin', 'admin', 'manager', 'employee', 'viewer'];
        validRoles.forEach((role) => {
          const command = { ...validCommand, role };
          expect(() => validateCreateUserCommand(command)).not.toThrow();
        });
      });
    });

    describe('createdBy validation', () => {
      it('should throw error for missing createdBy', () => {
        const command = { ...validCommand, createdBy: '' };
        expect(() => validateCreateUserCommand(command)).toThrow('CreatedBy is required and must be a string');
      });

      it('should throw error for non-string createdBy', () => {
        const command = { ...validCommand, createdBy: null as any };
        expect(() => validateCreateUserCommand(command)).toThrow(CreateUserCommandValidationError);
      });
    });

    describe('status validation', () => {
      it('should accept valid status values', () => {
        const validStatuses = Object.values(UserStatus);
        validStatuses.forEach((status) => {
          const command = { ...validCommand, status };
          expect(() => validateCreateUserCommand(command)).not.toThrow();
        });
      });

      it('should throw error for invalid status', () => {
        const command = { ...validCommand, status: 'invalid-status' as any };
        expect(() => validateCreateUserCommand(command)).toThrow('Invalid user status');
      });

      it('should allow undefined status', () => {
        const { status, ...commandWithoutStatus } = validCommand;
        expect(() => validateCreateUserCommand(commandWithoutStatus)).not.toThrow();
      });
    });
  });

  describe('CreateUserCommandValidationError', () => {
    it('should create error with proper format', () => {
      const error = new CreateUserCommandValidationError('email', 'Invalid format');
      expect(error.name).toBe('CreateUserCommandValidationError');
      expect(error.message).toBe('CreateUser validation error - email: Invalid format');
    });

    it('should be instance of Error', () => {
      const error = new CreateUserCommandValidationError('test', 'test reason');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
