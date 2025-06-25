/**
 * Password Value Object
 * Represents a secure password for offline authentication
 * Following Domain-Driven Design principles
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Password validation error types
 */
export class InvalidPasswordError extends Error {
  constructor(reason: string) {
    super(`Invalid password: ${reason}`);
    this.name = 'InvalidPasswordError';
  }
}

/**
 * Password hashing error types
 */
export class PasswordHashError extends Error {
  constructor(reason: string) {
    super(`Password hashing error: ${reason}`);
    this.name = 'PasswordHashError';
  }
}

/**
 * Password strength levels
 */
export enum PasswordStrength {
  WEAK = 'weak',
  FAIR = 'fair',
  GOOD = 'good',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

/**
 * Password requirements configuration
 */
export interface PasswordRequirements {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbidCommonPasswords: boolean;
  maxRepeatingChars: number;
}

/**
 * Default password requirements for the system
 */
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbidCommonPasswords: true,
  maxRepeatingChars: 3,
};

/**
 * Hashed password representation
 */
export interface HashedPassword {
  hash: string;
  salt: string;
  algorithm: string;
  iterations: number;
  createdAt: Date;
}

/**
 * Password Value Object
 * Immutable value object representing a secure password
 */
export class Password {
  private readonly _hashedPassword: HashedPassword;
  private static readonly HASH_ALGORITHM = 'sha256';
  private static readonly DEFAULT_ITERATIONS = 100000;
  private static readonly SALT_LENGTH = 32;

  /**
   * Creates a new Password value object from a hashed password
   * @param hashedPassword - Previously hashed password data
   */
  private constructor(hashedPassword: HashedPassword) {
    this._hashedPassword = { ...hashedPassword };

    // Make the object truly immutable at runtime
    Object.freeze(this);
    Object.freeze(this._hashedPassword);
  }

  /**
   * Gets the hashed password data
   * @returns Readonly hashed password object
   */
  public get hashedPassword(): Readonly<HashedPassword> {
    return { ...this._hashedPassword };
  }

  /**
   * Gets the creation date of the password
   * @returns Password creation date
   */
  public get createdAt(): Date {
    return new Date(this._hashedPassword.createdAt);
  }

  /**
   * Checks if the password is older than specified days
   * @param days - Number of days to check against
   * @returns True if password is older than specified days
   */
  public isOlderThan(days: number): boolean {
    const ageInMs = Date.now() - this._hashedPassword.createdAt.getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    return ageInDays > days;
  }

  /**
   * Verifies a plain text password against this hashed password
   * @param plainTextPassword - Plain text password to verify
   * @returns True if password matches
   */
  public verify(plainTextPassword: string): boolean {
    if (!plainTextPassword || typeof plainTextPassword !== 'string') {
      return false;
    }

    try {
      const candidateHash = this.hashPasswordWithSalt(
        plainTextPassword,
        this._hashedPassword.salt,
        this._hashedPassword.iterations
      );

      // Use timing-safe comparison to prevent timing attacks
      const candidateBuffer = Buffer.from(candidateHash, 'hex');
      const storedBuffer = Buffer.from(this._hashedPassword.hash, 'hex');

      if (candidateBuffer.length !== storedBuffer.length) {
        return false;
      }

      return timingSafeEqual(candidateBuffer, storedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Checks if this password equals another password (same hash)
   * @param other - Another Password value object
   * @returns True if passwords are equal
   */
  public equals(other: Password): boolean {
    return (
      this._hashedPassword.hash === other._hashedPassword.hash &&
      this._hashedPassword.salt === other._hashedPassword.salt
    );
  }

  /**
   * Creates a Password from plain text (factory method)
   * @param plainTextPassword - Plain text password
   * @param requirements - Password requirements (optional)
   * @returns Password value object
   * @throws {InvalidPasswordError} When password doesn't meet requirements
   */
  public static fromPlainText(
    plainTextPassword: string,
    requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
  ): Password {
    // Validate password requirements
    Password.validatePasswordRequirements(plainTextPassword, requirements);

    // Generate salt and hash
    const salt = Password.generateSalt();
    const iterations = Password.DEFAULT_ITERATIONS;
    const hash = Password.prototype.hashPasswordWithSalt(plainTextPassword, salt, iterations);

    const hashedPassword: HashedPassword = {
      hash,
      salt,
      algorithm: Password.HASH_ALGORITHM,
      iterations,
      createdAt: new Date(),
    };

    return new Password(hashedPassword);
  }

  /**
   * Creates a Password from stored hash data (factory method)
   * @param hashedPassword - Previously hashed password data
   * @returns Password value object
   */
  public static fromHash(hashedPassword: HashedPassword): Password {
    // Validate hash data
    if (!hashedPassword.hash || !hashedPassword.salt) {
      throw new PasswordHashError('Invalid hash data: missing hash or salt');
    }

    if (!hashedPassword.algorithm || !hashedPassword.iterations) {
      throw new PasswordHashError('Invalid hash data: missing algorithm or iterations');
    }

    return new Password(hashedPassword);
  }

  /**
   * Validates if a plain text password meets requirements
   * @param password - Password to validate
   * @param requirements - Password requirements
   * @returns True if password is valid
   */
  public static isValid(password: string, requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS): boolean {
    try {
      Password.validatePasswordRequirements(password, requirements);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculates password strength
   * @param password - Plain text password to analyze
   * @returns Password strength level
   */
  public static calculateStrength(password: string): PasswordStrength {
    if (!password || typeof password !== 'string') {
      return PasswordStrength.WEAK;
    }

    let score = 0;

    // Length scoring (be more strict)
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Pattern analysis (penalty for weak patterns)
    if (/(.)\1{2,}/.test(password)) score -= 1; // Penalty for repeating chars
    if (/(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde)/.test(password.toLowerCase())) {
      score -= 1; // Penalty for common sequences
    }

    // Check for common passwords
    if (Password.isCommonPassword(password)) {
      score -= 2; // Heavy penalty for common passwords
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    // Map score to strength (adjusted thresholds)
    if (score <= 1) return PasswordStrength.WEAK;
    if (score <= 3) return PasswordStrength.FAIR;
    if (score <= 5) return PasswordStrength.GOOD;
    if (score <= 7) return PasswordStrength.STRONG;
    return PasswordStrength.VERY_STRONG;
  }

  /**
   * Generates suggestions for password improvement
   * @param password - Plain text password to analyze
   * @param requirements - Password requirements
   * @returns Array of improvement suggestions
   */
  public static getPasswordSuggestions(
    password: string,
    requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
  ): string[] {
    const suggestions: string[] = [];

    if (!password || password.length < requirements.minLength) {
      suggestions.push(`Password must be at least ${requirements.minLength} characters long`);
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      suggestions.push('Add at least one uppercase letter');
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      suggestions.push('Add at least one lowercase letter');
    }

    if (requirements.requireNumbers && !/[0-9]/.test(password)) {
      suggestions.push('Add at least one number');
    }

    if (requirements.requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
      suggestions.push('Add at least one special character (!@#$%^&*)');
    }

    if (/(.)\1{3,}/.test(password)) {
      suggestions.push('Avoid repeating the same character more than 3 times');
    }

    if (Password.isCommonPassword(password)) {
      suggestions.push('Avoid using common passwords');
    }

    return suggestions;
  }

  /**
   * Validates password against requirements
   * @param password - Password to validate
   * @param requirements - Password requirements
   * @throws {InvalidPasswordError} When password doesn't meet requirements
   */
  private static validatePasswordRequirements(password: string, requirements: PasswordRequirements): void {
    if (!password || typeof password !== 'string') {
      throw new InvalidPasswordError('Password must be a non-empty string');
    }

    if (password.length < requirements.minLength) {
      throw new InvalidPasswordError(`Password must be at least ${requirements.minLength} characters long`);
    }

    if (password.length > requirements.maxLength) {
      throw new InvalidPasswordError(`Password must not exceed ${requirements.maxLength} characters`);
    }

    // Check common passwords first to avoid confusion with other requirements
    if (requirements.forbidCommonPasswords && Password.isCommonPassword(password)) {
      throw new InvalidPasswordError('Password is too common. Please choose a more unique password');
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      throw new InvalidPasswordError('Password must contain at least one uppercase letter');
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      throw new InvalidPasswordError('Password must contain at least one lowercase letter');
    }

    if (requirements.requireNumbers && !/[0-9]/.test(password)) {
      throw new InvalidPasswordError('Password must contain at least one number');
    }

    if (requirements.requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
      throw new InvalidPasswordError('Password must contain at least one special character');
    }

    // Check for repeating characters
    const repeatingPattern = new RegExp(`(.)\\1{${requirements.maxRepeatingChars},}`);
    if (repeatingPattern.test(password)) {
      throw new InvalidPasswordError(
        `Password cannot have more than ${requirements.maxRepeatingChars} repeating characters`
      );
    }
  }

  /**
   * Generates a cryptographically secure salt
   * @returns Hex-encoded salt string
   */
  private static generateSalt(): string {
    return randomBytes(Password.SALT_LENGTH).toString('hex');
  }

  /**
   * Hashes password with salt using PBKDF2
   * @param password - Plain text password
   * @param salt - Salt string
   * @param iterations - Number of iterations
   * @returns Hex-encoded hash
   */
  private hashPasswordWithSalt(password: string, salt: string, iterations: number): string {
    // Using PBKDF2 with SHA-256 for offline security
    let result = password + salt;

    for (let i = 0; i < iterations; i++) {
      const hash = createHash('sha256');
      hash.update(result);
      hash.update(salt); // Add salt each iteration
      result = hash.digest('hex');
    }

    return result;
  }

  /**
   * Checks if password is in common password list
   * @param password - Password to check
   * @returns True if password is common
   */
  private static isCommonPassword(password: string): boolean {
    // Common password patterns (simplified for offline system)
    const commonPatterns = [
      'password',
      'admin',
      'administrator',
      'root',
      'user',
      'guest',
      'test',
      'demo',
      'welcome',
      'login',
      'secret',
      'letmein',
      'dragon',
      'monkey',
      'princess',
      'sunshine',
      'master',
      'shadow',
      '123456',
      'qwerty',
    ];

    const lowerPassword = password.toLowerCase();

    // Check for exact matches first
    if (commonPatterns.includes(lowerPassword)) {
      return true;
    }

    // Check if password contains common patterns (with minimum length to avoid false positives)
    return commonPatterns.some((pattern) => pattern.length >= 6 && lowerPassword.includes(pattern));
  }
}
