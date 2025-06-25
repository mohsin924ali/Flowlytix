/**
 * ChangePasswordCommand Tests
 *
 * Comprehensive test suite for ChangePasswordCommand.
 * Tests validation, error handling, and business logic.
 * Ensures 90%+ test coverage and proper behavior verification.
 *
 * @domain User Management
 * @pattern CQRS Command Testing
 * @version 1.0.0
 */

import { describe, it, expect } from '@jest/globals';
import { ChangePasswordCommand, validateChangePasswordCommand, ChangePasswordResult } from '../change-password.command';

describe('ChangePasswordCommand', () => {
  describe('validateChangePasswordCommand', () => {
    it('should pass validation with valid command', () => {
      const validCommand: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewSecurePass456!',
        changedBy: 'user_123',
      };

      expect(() => validateChangePasswordCommand(validCommand)).not.toThrow();
    });

    it('should pass validation when admin changes user password', () => {
      const validCommand: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewSecurePass456!',
        changedBy: 'admin_456',
      };

      expect(() => validateChangePasswordCommand(validCommand)).not.toThrow();
    });

    it('should throw error for empty userId', () => {
      const invalidCommand: ChangePasswordCommand = {
        userId: '',
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewSecurePass456!',
        changedBy: 'user_123',
      };

      expect(() => validateChangePasswordCommand(invalidCommand)).toThrow('User ID is required and must be a string');
    });

    it('should throw error for missing userId', () => {
      const invalidCommand = {
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewSecurePass456!',
        changedBy: 'user_123',
      } as ChangePasswordCommand;

      expect(() => validateChangePasswordCommand(invalidCommand)).toThrow('User ID is required and must be a string');
    });

    it('should throw error for empty currentPassword', () => {
      const invalidCommand: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: '',
        newPassword: 'NewSecurePass456!',
        changedBy: 'user_123',
      };

      expect(() => validateChangePasswordCommand(invalidCommand)).toThrow(
        'Current password is required and must be a string'
      );
    });

    it('should throw error for missing currentPassword', () => {
      const invalidCommand = {
        userId: 'user_123',
        newPassword: 'NewSecurePass456!',
        changedBy: 'user_123',
      } as ChangePasswordCommand;

      expect(() => validateChangePasswordCommand(invalidCommand)).toThrow(
        'Current password is required and must be a string'
      );
    });

    it('should throw error for empty newPassword', () => {
      const invalidCommand: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: 'CurrentPass123!',
        newPassword: '',
        changedBy: 'user_123',
      };

      expect(() => validateChangePasswordCommand(invalidCommand)).toThrow(
        'New password is required and must be a string'
      );
    });

    it('should throw error for missing newPassword', () => {
      const invalidCommand = {
        userId: 'user_123',
        currentPassword: 'CurrentPass123!',
        changedBy: 'user_123',
      } as ChangePasswordCommand;

      expect(() => validateChangePasswordCommand(invalidCommand)).toThrow(
        'New password is required and must be a string'
      );
    });

    it('should throw error for empty changedBy', () => {
      const invalidCommand: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewSecurePass456!',
        changedBy: '',
      };

      expect(() => validateChangePasswordCommand(invalidCommand)).toThrow('ChangedBy is required and must be a string');
    });

    it('should throw error for missing changedBy', () => {
      const invalidCommand = {
        userId: 'user_123',
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewSecurePass456!',
      } as ChangePasswordCommand;

      expect(() => validateChangePasswordCommand(invalidCommand)).toThrow('ChangedBy is required and must be a string');
    });

    it('should throw error for same current and new passwords', () => {
      const invalidCommand: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: 'SamePass123!',
        newPassword: 'SamePass123!',
        changedBy: 'user_123',
      };

      expect(() => validateChangePasswordCommand(invalidCommand)).toThrow(
        'New password must be different from current password'
      );
    });

    it('should throw error for whitespace-only currentPassword', () => {
      const invalidCommand: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: '   ',
        newPassword: 'NewSecurePass456!',
        changedBy: 'user_123',
      };

      expect(() => validateChangePasswordCommand(invalidCommand)).toThrow('Current password cannot be empty');
    });

    it('should throw error for whitespace-only newPassword', () => {
      const invalidCommand: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: 'CurrentPass123!',
        newPassword: '   ',
        changedBy: 'user_123',
      };

      expect(() => validateChangePasswordCommand(invalidCommand)).toThrow('New password cannot be empty');
    });

    it('should handle null values', () => {
      const invalidCommand = {
        userId: null,
        currentPassword: null,
        newPassword: null,
        changedBy: null,
      } as any;

      expect(() => validateChangePasswordCommand(invalidCommand)).toThrow('User ID is required and must be a string');
    });

    it('should handle undefined command', () => {
      expect(() => validateChangePasswordCommand(undefined as any)).toThrow();
    });

    it('should handle null command', () => {
      expect(() => validateChangePasswordCommand(null as any)).toThrow();
    });
  });

  describe('ChangePasswordCommand type validation', () => {
    it('should accept valid command structure', () => {
      const command: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewSecurePass456!',
        changedBy: 'user_123',
      };

      expect(command.userId).toBe('user_123');
      expect(command.currentPassword).toBe('CurrentPass123!');
      expect(command.newPassword).toBe('NewSecurePass456!');
      expect(command.changedBy).toBe('user_123');
    });

    it('should accept command with different changedBy', () => {
      const command: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewSecurePass456!',
        changedBy: 'admin_456',
      };

      // Type checking - this should compile without errors
      expect(command.userId).toBe('user_123');
      expect(command.changedBy).toBe('admin_456');
    });
  });

  describe('ChangePasswordResult type validation', () => {
    it('should accept valid success result structure', () => {
      const result: ChangePasswordResult = {
        success: true,
      };

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid failure result structure', () => {
      const result: ChangePasswordResult = {
        success: false,
        error: 'Invalid current password',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid current password');
    });

    it('should accept result with passwordExpired flag', () => {
      const result: ChangePasswordResult = {
        success: false,
        error: 'Password has expired',
        passwordExpired: true,
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password has expired');
      expect(result.passwordExpired).toBe(true);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle very long passwords', () => {
      const longPassword = 'SecurePass123!' + 'a'.repeat(500);
      const command: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: 'CurrentPass123!',
        newPassword: longPassword,
        changedBy: 'user_123',
      };

      expect(() => validateChangePasswordCommand(command)).not.toThrow();
    });

    it('should handle special characters in passwords', () => {
      const specialPassword = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const command: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: 'CurrentPass123!',
        newPassword: specialPassword,
        changedBy: 'user_123',
      };

      expect(() => validateChangePasswordCommand(command)).not.toThrow();
    });

    it('should handle unicode characters in passwords', () => {
      const unicodePassword = 'Pässwörd123!';
      const command: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: 'CurrentPass123!',
        newPassword: unicodePassword,
        changedBy: 'user_123',
      };

      expect(() => validateChangePasswordCommand(command)).not.toThrow();
    });

    it('should handle very long user IDs', () => {
      const longUserId = 'user_' + 'a'.repeat(100);
      const command: ChangePasswordCommand = {
        userId: longUserId,
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewSecurePass456!',
        changedBy: 'user_123',
      };

      expect(() => validateChangePasswordCommand(command)).not.toThrow();
    });

    it('should handle same current and new passwords in validation', () => {
      const samePassword = 'SamePass123!';
      const command: ChangePasswordCommand = {
        userId: 'user_123',
        currentPassword: samePassword,
        newPassword: samePassword,
        changedBy: 'user_123',
      };

      // Validation should throw error for same passwords
      expect(() => validateChangePasswordCommand(command)).toThrow(
        'New password must be different from current password'
      );
    });
  });
});
