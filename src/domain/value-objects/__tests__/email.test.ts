/**
 * Unit tests for Email Value Object
 * Following TDD principles with comprehensive coverage
 */

import { Email, InvalidEmailError } from '../email';

describe('Email Value Object', () => {
  describe('Constructor', () => {
    it('should create a valid email object', () => {
      const email = new Email('user@example.com');
      expect(email.value).toBe('user@example.com');
    });

    it('should normalize email by trimming whitespace', () => {
      const email = new Email('  user@example.com  ');
      expect(email.value).toBe('user@example.com');
    });

    it('should normalize email by converting to lowercase', () => {
      const email = new Email('USER@EXAMPLE.COM');
      expect(email.value).toBe('user@example.com');
    });

    it('should throw InvalidEmailError for empty string', () => {
      expect(() => new Email('')).toThrow(InvalidEmailError);
      expect(() => new Email('')).toThrow('Email cannot be empty');
    });

    it('should throw InvalidEmailError for non-string input', () => {
      expect(() => new Email(123 as any)).toThrow(InvalidEmailError);
      expect(() => new Email(123 as any)).toThrow('Email must be a string');
    });

    it('should throw InvalidEmailError for null input', () => {
      expect(() => new Email(null as any)).toThrow(InvalidEmailError);
    });

    it('should throw InvalidEmailError for undefined input', () => {
      expect(() => new Email(undefined as any)).toThrow(InvalidEmailError);
    });
  });

  describe('Email Format Validation', () => {
    it('should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
        'user123@test-domain.com',
        'a@b.co',
        'test_email@domain123.net',
        'user-name@sub.domain.com',
      ];

      validEmails.forEach((emailStr) => {
        expect(() => new Email(emailStr)).not.toThrow();
        const email = new Email(emailStr);
        expect(email.value).toBe(emailStr.toLowerCase());
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@@example.com',
        'user@example.',
        '.user@example.com',
        'user.@example.com',
        'user@.example.com',
        'user@example..com',
        'user..name@example.com',
        'user@ex ample.com',
        'user name@example.com',
      ];

      invalidEmails.forEach((emailStr) => {
        expect(() => new Email(emailStr)).toThrow(InvalidEmailError);
      });
    });

    it('should reject emails with no @ symbol', () => {
      expect(() => new Email('userexample.com')).toThrow(InvalidEmailError);
      expect(() => new Email('userexample.com')).toThrow('Invalid email format');
    });

    it('should reject emails with multiple @ symbols', () => {
      expect(() => new Email('user@@example.com')).toThrow(InvalidEmailError);
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(() => new Email(longEmail)).toThrow(InvalidEmailError);
      expect(() => new Email(longEmail)).toThrow('Email is too long');
    });

    it('should reject emails with local part too long', () => {
      const longLocalPart = 'a'.repeat(65) + '@example.com';
      expect(() => new Email(longLocalPart)).toThrow(InvalidEmailError);
      expect(() => new Email(longLocalPart)).toThrow('Local part is too long');
    });

    it('should reject emails with domain part too long', () => {
      const longDomain = 'user@' + 'a'.repeat(254) + '.com';
      expect(() => new Email(longDomain)).toThrow(InvalidEmailError);
      expect(() => new Email(longDomain)).toThrow('Email is too long');
    });

    it('should reject emails with consecutive dots', () => {
      expect(() => new Email('user..name@example.com')).toThrow(InvalidEmailError);
      expect(() => new Email('user@example..com')).toThrow(InvalidEmailError);
      expect(() => new Email('user..name@example.com')).toThrow('consecutive dots');
    });

    it('should reject emails starting or ending with dots', () => {
      expect(() => new Email('.user@example.com')).toThrow(InvalidEmailError);
      expect(() => new Email('user.@example.com')).toThrow(InvalidEmailError);
      expect(() => new Email('user@.example.com')).toThrow(InvalidEmailError);
      expect(() => new Email('user@example.com.')).toThrow(InvalidEmailError);
    });
  });

  describe('Property Getters', () => {
    const email = new Email('user.name@sub.example.com');

    it('should return correct domain', () => {
      expect(email.domain).toBe('sub.example.com');
    });

    it('should return correct local part', () => {
      expect(email.localPart).toBe('user.name');
    });

    it('should return correct value', () => {
      expect(email.value).toBe('user.name@sub.example.com');
    });
  });

  describe('Equality Methods', () => {
    it('should return true for equal emails', () => {
      const email1 = new Email('user@example.com');
      const email2 = new Email('USER@EXAMPLE.COM');
      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different emails', () => {
      const email1 = new Email('user1@example.com');
      const email2 = new Email('user2@example.com');
      expect(email1.equals(email2)).toBe(false);
    });
  });

  describe('Domain Checking', () => {
    const email = new Email('user@example.com');

    it('should return true for matching domain', () => {
      expect(email.isFromDomain('example.com')).toBe(true);
      expect(email.isFromDomain('EXAMPLE.COM')).toBe(true);
    });

    it('should return false for non-matching domain', () => {
      expect(email.isFromDomain('other.com')).toBe(false);
      expect(email.isFromDomain('subdomain.example.com')).toBe(false);
    });
  });

  describe('String Conversion', () => {
    it('should return email string when calling toString', () => {
      const email = new Email('user@example.com');
      expect(email.toString()).toBe('user@example.com');
    });

    it('should work with string concatenation', () => {
      const email = new Email('user@example.com');
      expect(`Email: ${email}`).toBe('Email: user@example.com');
    });
  });

  describe('Static Factory Methods', () => {
    it('should create email using fromString factory method', () => {
      const email = Email.fromString('user@example.com');
      expect(email.value).toBe('user@example.com');
      expect(email).toBeInstanceOf(Email);
    });

    it('should validate string using isValid static method', () => {
      expect(Email.isValid('user@example.com')).toBe(true);
      expect(Email.isValid('invalid-email')).toBe(false);
      expect(Email.isValid('')).toBe(false);
      expect(Email.isValid('user@')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw InvalidEmailError with proper message', () => {
      try {
        new Email('invalid-email');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidEmailError);
        expect(error).toBeInstanceOf(Error);
        expect((error as InvalidEmailError).name).toBe('InvalidEmailError');
        expect((error as InvalidEmailError).message).toContain('Invalid email "invalid-email"');
      }
    });

    it('should preserve error details in message', () => {
      try {
        new Email('user@');
      } catch (error) {
        expect((error as InvalidEmailError).message).toContain('user@');
        expect((error as InvalidEmailError).message).toContain('Invalid email format');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle emails with special characters in local part', () => {
      const specialEmails = [
        'user+tag@example.com',
        'user-name@example.com',
        'user_name@example.com',
        'user.name@example.com',
      ];

      specialEmails.forEach((emailStr) => {
        expect(() => new Email(emailStr)).not.toThrow();
      });
    });

    it('should handle emails with numbers', () => {
      const email = new Email('user123@domain456.com');
      expect(email.value).toBe('user123@domain456.com');
    });

    it('should handle minimum valid email', () => {
      const email = new Email('a@b.co');
      expect(email.value).toBe('a@b.co');
      expect(email.localPart).toBe('a');
      expect(email.domain).toBe('b.co');
    });
  });

  describe('Immutability', () => {
    it('should be immutable - value cannot be changed', () => {
      const email = new Email('user@example.com');
      const originalValue = email.value;

      // TypeScript should prevent this, but test runtime immutability
      try {
        (email as any)._value = 'changed@example.com';
      } catch {
        // If assignment throws, that's also fine
      }

      // The getter should still return the original value
      expect(email.value).toBe(originalValue);
    });

    it('should create new instances for different values', () => {
      const email1 = new Email('user1@example.com');
      const email2 = new Email('user2@example.com');

      expect(email1).not.toBe(email2);
      expect(email1.equals(email2)).toBe(false);
    });
  });
});
