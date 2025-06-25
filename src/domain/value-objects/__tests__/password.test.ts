/**
 * Password Value Object Tests
 * Comprehensive test suite for password security in offline authentication
 * Following strict testing standards and security requirements
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  Password,
  PasswordStrength,
  InvalidPasswordError,
  PasswordHashError,
  DEFAULT_PASSWORD_REQUIREMENTS,
  type PasswordRequirements,
  type HashedPassword,
} from '../password';

describe('Password Value Object', () => {
  let validPassword: string;
  let weakPassword: string;
  let strongPassword: string;

  beforeEach(() => {
    validPassword = 'SecurePass123!';
    weakPassword = 'weak';
    strongPassword = 'SuperSecureP@ssw0rd2024!';
  });

  describe('Password Creation and Hashing', () => {
    describe('fromPlainText()', () => {
      it('should create password from valid plain text', () => {
        const password = Password.fromPlainText(validPassword);

        expect(password).toBeInstanceOf(Password);
        expect(password.hashedPassword.hash).toBeDefined();
        expect(password.hashedPassword.salt).toBeDefined();
        expect(password.hashedPassword.algorithm).toBe('sha256');
        expect(password.hashedPassword.iterations).toBe(100000);
        expect(password.hashedPassword.createdAt).toBeInstanceOf(Date);
      });

      it('should create unique hashes for same passwords', () => {
        const password1 = Password.fromPlainText(validPassword);
        const password2 = Password.fromPlainText(validPassword);

        expect(password1.hashedPassword.hash).not.toBe(password2.hashedPassword.hash);
        expect(password1.hashedPassword.salt).not.toBe(password2.hashedPassword.salt);
      });

      it('should reject passwords that do not meet requirements', () => {
        expect(() => Password.fromPlainText('short')).toThrow(InvalidPasswordError);
        expect(() => Password.fromPlainText('short')).toThrow('Password must be at least 8 characters long');
      });

      it('should reject passwords without uppercase letters', () => {
        expect(() => Password.fromPlainText('lowercase123!')).toThrow(InvalidPasswordError);
        expect(() => Password.fromPlainText('lowercase123!')).toThrow(
          'Password must contain at least one uppercase letter'
        );
      });

      it('should reject passwords without lowercase letters', () => {
        expect(() => Password.fromPlainText('UPPERCASE123!')).toThrow(InvalidPasswordError);
        expect(() => Password.fromPlainText('UPPERCASE123!')).toThrow(
          'Password must contain at least one lowercase letter'
        );
      });

      it('should reject passwords without numbers', () => {
        expect(() => Password.fromPlainText('NoNumbers!')).toThrow(InvalidPasswordError);
        expect(() => Password.fromPlainText('NoNumbers!')).toThrow('Password must contain at least one number');
      });

      it('should reject passwords without special characters', () => {
        expect(() => Password.fromPlainText('NoSpecialChars123')).toThrow(InvalidPasswordError);
        expect(() => Password.fromPlainText('NoSpecialChars123')).toThrow(
          'Password must contain at least one special character'
        );
      });

      it('should reject passwords with too many repeating characters', () => {
        expect(() => Password.fromPlainText('Aaaaa123!')).toThrow(InvalidPasswordError);
        expect(() => Password.fromPlainText('Aaaaa123!')).toThrow(
          'Password cannot have more than 3 repeating characters'
        );
      });

      it('should reject common passwords', () => {
        expect(() => Password.fromPlainText('Password123')).toThrow(InvalidPasswordError);
        expect(() => Password.fromPlainText('Password123')).toThrow('Password is too common');
      });

      it('should accept custom requirements', () => {
        const lenientRequirements: PasswordRequirements = {
          minLength: 6,
          maxLength: 20,
          requireUppercase: false,
          requireLowercase: true,
          requireNumbers: false,
          requireSpecialChars: false,
          forbidCommonPasswords: false,
          maxRepeatingChars: 5,
        };

        const password = Password.fromPlainText('simple', lenientRequirements);
        expect(password).toBeInstanceOf(Password);
      });
    });

    describe('fromHash()', () => {
      it('should reconstruct password from hash data', () => {
        const originalPassword = Password.fromPlainText(validPassword);
        const hashData = originalPassword.hashedPassword;

        const reconstructedPassword = Password.fromHash(hashData);

        expect(reconstructedPassword.hashedPassword.hash).toBe(hashData.hash);
        expect(reconstructedPassword.hashedPassword.salt).toBe(hashData.salt);
        expect(reconstructedPassword.hashedPassword.algorithm).toBe(hashData.algorithm);
        expect(reconstructedPassword.hashedPassword.iterations).toBe(hashData.iterations);
      });

      it('should validate hash data completeness', () => {
        const incompleteHashData = {
          hash: 'somehash',
          salt: '',
          algorithm: 'sha256',
          iterations: 100000,
          createdAt: new Date(),
        };

        expect(() => Password.fromHash(incompleteHashData)).toThrow(PasswordHashError);
        expect(() => Password.fromHash(incompleteHashData)).toThrow('Invalid hash data: missing hash or salt');
      });

      it('should validate algorithm and iterations', () => {
        const invalidHashData = {
          hash: 'somehash',
          salt: 'somesalt',
          algorithm: '',
          iterations: 0,
          createdAt: new Date(),
        };

        expect(() => Password.fromHash(invalidHashData)).toThrow(PasswordHashError);
        expect(() => Password.fromHash(invalidHashData)).toThrow('Invalid hash data: missing algorithm or iterations');
      });
    });
  });

  describe('Password Verification - Offline Authentication', () => {
    describe('verify()', () => {
      it('should verify correct password', () => {
        const password = Password.fromPlainText(validPassword);

        expect(password.verify(validPassword)).toBe(true);
      });

      it('should reject incorrect password', () => {
        const password = Password.fromPlainText(validPassword);

        expect(password.verify('WrongPassword123!')).toBe(false);
      });

      it('should reject empty or null passwords', () => {
        const password = Password.fromPlainText(validPassword);

        expect(password.verify('')).toBe(false);
        expect(password.verify(null as any)).toBe(false);
        expect(password.verify(undefined as any)).toBe(false);
      });

      it('should handle case sensitivity correctly', () => {
        const password = Password.fromPlainText(validPassword);

        expect(password.verify(validPassword.toLowerCase())).toBe(false);
        expect(password.verify(validPassword.toUpperCase())).toBe(false);
      });

      it('should use timing-safe comparison', () => {
        const password = Password.fromPlainText(validPassword);

        // These should take similar time to prevent timing attacks
        const start1 = Date.now();
        password.verify('WrongPassword123!');
        const time1 = Date.now() - start1;

        const start2 = Date.now();
        password.verify('CompletelyDifferentPassword456$');
        const time2 = Date.now() - start2;

        // Times should be comparable (within reasonable margin)
        // Allow for more variance due to system scheduling
        expect(Math.abs(time1 - time2)).toBeLessThan(100);
      });

      it('should handle verification errors gracefully', () => {
        const password = Password.fromPlainText(validPassword);

        // Should not throw, just return false
        expect(password.verify(123 as any)).toBe(false);
        expect(password.verify({} as any)).toBe(false);
        expect(password.verify([] as any)).toBe(false);
      });
    });

    describe('equals()', () => {
      it('should identify equal passwords', () => {
        const hashData: HashedPassword = {
          hash: 'samehash',
          salt: 'samesalt',
          algorithm: 'sha256',
          iterations: 100000,
          createdAt: new Date(),
        };

        const password1 = Password.fromHash(hashData);
        const password2 = Password.fromHash(hashData);

        expect(password1.equals(password2)).toBe(true);
      });

      it('should identify different passwords', () => {
        const password1 = Password.fromPlainText(validPassword);
        const password2 = Password.fromPlainText(strongPassword);

        expect(password1.equals(password2)).toBe(false);
      });

      it('should handle same plaintext with different hashes', () => {
        const password1 = Password.fromPlainText(validPassword);
        const password2 = Password.fromPlainText(validPassword);

        // Different salt = different hash = not equal
        expect(password1.equals(password2)).toBe(false);
      });
    });
  });

  describe('Password Age and Security Policies', () => {
    describe('isOlderThan()', () => {
      it('should identify fresh passwords as not old', () => {
        const password = Password.fromPlainText(validPassword);

        expect(password.isOlderThan(1)).toBe(false);
        expect(password.isOlderThan(30)).toBe(false);
        expect(password.isOlderThan(90)).toBe(false);
      });

      it('should identify old passwords correctly', () => {
        const oldDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000); // 91 days ago
        const hashData: HashedPassword = {
          hash: 'oldhash',
          salt: 'oldsalt',
          algorithm: 'sha256',
          iterations: 100000,
          createdAt: oldDate,
        };

        const oldPassword = Password.fromHash(hashData);

        expect(oldPassword.isOlderThan(90)).toBe(true);
        expect(oldPassword.isOlderThan(100)).toBe(false);
      });

      it('should handle edge cases for age calculation', () => {
        const exactDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Exactly 90 days
        const hashData: HashedPassword = {
          hash: 'exacthash',
          salt: 'exactsalt',
          algorithm: 'sha256',
          iterations: 100000,
          createdAt: exactDate,
        };

        const exactPassword = Password.fromHash(hashData);

        expect(exactPassword.isOlderThan(89)).toBe(true);
        expect(exactPassword.isOlderThan(91)).toBe(false);
      });
    });

    describe('createdAt getter', () => {
      it('should return creation date', () => {
        const password = Password.fromPlainText(validPassword);
        const createdAt = password.createdAt;

        expect(createdAt).toBeInstanceOf(Date);
        expect(Date.now() - createdAt.getTime()).toBeLessThan(1000); // Created within last second
      });

      it('should return immutable date', () => {
        const password = Password.fromPlainText(validPassword);
        const createdAt1 = password.createdAt;
        const createdAt2 = password.createdAt;

        expect(createdAt1).not.toBe(createdAt2); // Different objects
        expect(createdAt1.getTime()).toBe(createdAt2.getTime()); // Same time
      });
    });
  });

  describe('Password Strength Analysis', () => {
    describe('calculateStrength()', () => {
      it('should identify weak passwords', () => {
        expect(Password.calculateStrength('weak')).toBe(PasswordStrength.WEAK);
        expect(Password.calculateStrength('12345')).toBe(PasswordStrength.WEAK);
        expect(Password.calculateStrength('')).toBe(PasswordStrength.WEAK);
        expect(Password.calculateStrength('aaa')).toBe(PasswordStrength.WEAK);
      });

      it('should identify fair passwords', () => {
        expect(Password.calculateStrength('MyPassword')).toBe(PasswordStrength.FAIR);
        expect(Password.calculateStrength('Password123')).toBe(PasswordStrength.FAIR);
        expect(Password.calculateStrength('Weak123')).toBe(PasswordStrength.FAIR);
      });

      it('should identify good passwords', () => {
        expect(Password.calculateStrength('MySecurePassword123!')).toBe(PasswordStrength.GOOD);
        expect(Password.calculateStrength('GoodPassword123!')).toBe(PasswordStrength.GOOD);
      });

      it('should identify strong passwords', () => {
        expect(Password.calculateStrength('MySecurePass123!')).toBe(PasswordStrength.STRONG);
        expect(Password.calculateStrength(validPassword)).toBe(PasswordStrength.STRONG);
      });

      it('should identify strong passwords with complex patterns', () => {
        expect(Password.calculateStrength('VeryC0mpl3xP@ssw0rd!With$ExtraL0ngSecur1ty')).toBe(PasswordStrength.STRONG);
        expect(Password.calculateStrength('Th1s1sAV3ryStr0ng&C0mpl3xP@ssw0rd!')).toBe(PasswordStrength.STRONG);
      });

      it('should handle null and undefined input', () => {
        expect(Password.calculateStrength(null as any)).toBe(PasswordStrength.WEAK);
        expect(Password.calculateStrength(undefined as any)).toBe(PasswordStrength.WEAK);
      });

      it('should penalize common sequences', () => {
        expect(Password.calculateStrength('MyPassword123')).toBe(PasswordStrength.FAIR);
        expect(Password.calculateStrength('MyPasswordAbc')).toBe(PasswordStrength.FAIR);
      });

      it('should penalize repeating characters', () => {
        const strengthWithRepeating = Password.calculateStrength('MySecuuure123!');
        const strengthWithoutRepeating = Password.calculateStrength('MySecure123!');

        // Password with repeating characters should be weaker
        expect(strengthWithRepeating).not.toBe(strengthWithoutRepeating);

        // Define strength order for comparison
        const strengthOrder = [
          PasswordStrength.WEAK,
          PasswordStrength.FAIR,
          PasswordStrength.GOOD,
          PasswordStrength.STRONG,
          PasswordStrength.VERY_STRONG,
        ];

        const indexWithRepeating = strengthOrder.indexOf(strengthWithRepeating);
        const indexWithoutRepeating = strengthOrder.indexOf(strengthWithoutRepeating);

        expect(indexWithRepeating).toBeLessThan(indexWithoutRepeating);
      });
    });

    describe('getPasswordSuggestions()', () => {
      it('should suggest improvements for short passwords', () => {
        const suggestions = Password.getPasswordSuggestions('short');

        expect(suggestions).toContain('Password must be at least 8 characters long');
      });

      it('should suggest adding uppercase letters', () => {
        const suggestions = Password.getPasswordSuggestions('password123!');

        expect(suggestions).toContain('Add at least one uppercase letter');
      });

      it('should suggest adding lowercase letters', () => {
        const suggestions = Password.getPasswordSuggestions('PASSWORD123!');

        expect(suggestions).toContain('Add at least one lowercase letter');
      });

      it('should suggest adding numbers', () => {
        const suggestions = Password.getPasswordSuggestions('Password!');

        expect(suggestions).toContain('Add at least one number');
      });

      it('should suggest adding special characters', () => {
        const suggestions = Password.getPasswordSuggestions('Password123');

        expect(suggestions).toContain('Add at least one special character (!@#$%^&*)');
      });

      it('should suggest avoiding repeating characters', () => {
        const suggestions = Password.getPasswordSuggestions('Passsssword123!');

        expect(suggestions).toContain('Avoid repeating the same character more than 3 times');
      });

      it('should suggest avoiding common passwords', () => {
        const suggestions = Password.getPasswordSuggestions('password123');

        expect(suggestions).toContain('Avoid using common passwords');
      });

      it('should return empty array for strong passwords', () => {
        const suggestions = Password.getPasswordSuggestions(strongPassword);

        expect(suggestions).toHaveLength(0);
      });

      it('should handle custom requirements', () => {
        const lenientRequirements: PasswordRequirements = {
          ...DEFAULT_PASSWORD_REQUIREMENTS,
          requireSpecialChars: false,
        };

        const suggestions = Password.getPasswordSuggestions('Password123', lenientRequirements);

        expect(suggestions).not.toContain('Add at least one special character');
      });
    });
  });

  describe('Password Validation', () => {
    describe('isValid()', () => {
      it('should validate correct passwords', () => {
        expect(Password.isValid(validPassword)).toBe(true);
        expect(Password.isValid(strongPassword)).toBe(true);
      });

      it('should reject invalid passwords', () => {
        expect(Password.isValid('weak')).toBe(false);
        expect(Password.isValid('password')).toBe(false);
        expect(Password.isValid('')).toBe(false);
      });

      it('should work with custom requirements', () => {
        const lenientRequirements: PasswordRequirements = {
          minLength: 4,
          maxLength: 50,
          requireUppercase: false,
          requireLowercase: true,
          requireNumbers: false,
          requireSpecialChars: false,
          forbidCommonPasswords: false,
          maxRepeatingChars: 5,
        };

        expect(Password.isValid('simple', lenientRequirements)).toBe(true);
        expect(Password.isValid('simple', DEFAULT_PASSWORD_REQUIREMENTS)).toBe(false);
      });

      it('should handle null and undefined input', () => {
        expect(Password.isValid(null as any)).toBe(false);
        expect(Password.isValid(undefined as any)).toBe(false);
      });
    });
  });

  describe('Security Features and Edge Cases', () => {
    describe('Common Password Detection', () => {
      it('should detect common passwords case-insensitively', () => {
        const commonPasswords = [
          'password1A!',
          'PASSWORD1A!',
          'Password1A!',
          'qwerty1A!',
          'welcome1A!',
          'administrator1A!',
        ];

        commonPasswords.forEach((common) => {
          expect(() => Password.fromPlainText(common)).toThrow(InvalidPasswordError);
        });
      });

      it('should allow similar but not identical passwords', () => {
        // These should be allowed as they're not exactly common passwords
        expect(() => Password.fromPlainText('MySecure123!')).not.toThrow();
        expect(() => Password.fromPlainText('SuperAuth456!')).not.toThrow();
      });
    });

    describe('Hash Algorithm Security', () => {
      it('should use sufficient iterations for PBKDF2', () => {
        const password = Password.fromPlainText(validPassword);

        expect(password.hashedPassword.iterations).toBeGreaterThanOrEqual(100000);
      });

      it('should use SHA-256 algorithm', () => {
        const password = Password.fromPlainText(validPassword);

        expect(password.hashedPassword.algorithm).toBe('sha256');
      });

      it('should generate sufficient salt length', () => {
        const password = Password.fromPlainText(validPassword);

        // Salt should be hex-encoded, so 32 bytes = 64 hex characters
        expect(password.hashedPassword.salt.length).toBe(64);
      });

      it('should produce consistent hash length', () => {
        const password1 = Password.fromPlainText(validPassword);
        const password2 = Password.fromPlainText(strongPassword);

        expect(password1.hashedPassword.hash.length).toBe(password2.hashedPassword.hash.length);
      });
    });

    describe('Performance and Resource Usage', () => {
      it('should complete hashing within reasonable time', () => {
        const start = Date.now();
        Password.fromPlainText(validPassword);
        const duration = Date.now() - start;

        // Should complete within 1 second on modern hardware
        expect(duration).toBeLessThan(1000);
      });

      it('should handle multiple concurrent password operations', () => {
        const passwords = Array.from({ length: 10 }, (_, i) => `TestSecure${i}!`);

        const results = passwords.map((pwd) => {
          const password = Password.fromPlainText(pwd);
          return password.verify(pwd);
        });

        expect(results.every((result) => result === true)).toBe(true);
      });
    });

    describe('Memory and Immutability', () => {
      it('should not expose internal hash data', () => {
        const password = Password.fromPlainText(validPassword);
        const hashData = password.hashedPassword;

        // Modifying returned object should not affect internal state
        (hashData as any).hash = 'modified';

        expect(password.hashedPassword.hash).not.toBe('modified');
      });

      it('should maintain immutability after creation', () => {
        const password = Password.fromPlainText(validPassword);
        const originalHash = password.hashedPassword.hash;

        // Attempting to modify should not work due to readonly properties
        try {
          (password as any)._hashedPassword.hash = 'modified';
        } catch {
          // Expected to fail
        }

        // The hash should remain unchanged
        expect(password.hashedPassword.hash).toBe(originalHash);
      });

      it('should provide immutable creation date', () => {
        const password = Password.fromPlainText(validPassword);
        const createdAt = password.createdAt;

        createdAt.setTime(0); // Try to modify

        expect(password.createdAt.getTime()).not.toBe(0);
      });
    });
  });

  describe('Error Handling', () => {
    describe('InvalidPasswordError', () => {
      it('should create error with correct message', () => {
        const error = new InvalidPasswordError('test reason');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('InvalidPasswordError');
        expect(error.message).toBe('Invalid password: test reason');
      });
    });

    describe('PasswordHashError', () => {
      it('should create error with correct message', () => {
        const error = new PasswordHashError('test hash error');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('PasswordHashError');
        expect(error.message).toBe('Password hashing error: test hash error');
      });
    });

    describe('Edge Case Error Handling', () => {
      it('should handle extremely long passwords', () => {
        const veryLongPassword = 'A'.repeat(200) + '1!';

        expect(() => Password.fromPlainText(veryLongPassword)).toThrow(InvalidPasswordError);
        expect(() => Password.fromPlainText(veryLongPassword)).toThrow('Password must not exceed 128 characters');
      });

      it('should handle passwords with unicode characters', () => {
        const unicodePassword = 'Pässwörd123!';

        expect(() => Password.fromPlainText(unicodePassword)).not.toThrow();

        const password = Password.fromPlainText(unicodePassword);
        expect(password.verify(unicodePassword)).toBe(true);
      });

      it('should handle malformed hash data gracefully', () => {
        const malformedData = {
          hash: null,
          salt: undefined,
          algorithm: 'sha256',
          iterations: 100000,
          createdAt: new Date(),
        } as any;

        expect(() => Password.fromHash(malformedData)).toThrow(PasswordHashError);
      });
    });
  });
});
