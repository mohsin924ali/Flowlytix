/**
 * Email Value Object
 * Represents a valid email address with proper validation
 * Following Domain-Driven Design principles
 */

/**
 * Email validation error types
 */
export class InvalidEmailError extends Error {
  constructor(email: string, reason: string) {
    super(`Invalid email "${email}": ${reason}`);
    this.name = 'InvalidEmailError';
  }
}

/**
 * Email Value Object
 * Immutable value object representing a validated email address
 */
export class Email {
  private readonly _value: string;

  /**
   * Creates a new Email value object
   * @param value - The email address string
   * @throws {InvalidEmailError} When email format is invalid
   */
  constructor(value: string) {
    const normalizedValue = this.normalize(value);
    this.validateEmail(normalizedValue);
    this._value = normalizedValue;

    // Make the object truly immutable at runtime
    Object.freeze(this);
  }

  /**
   * Gets the email value
   * @returns The email address string
   */
  public get value(): string {
    return this._value;
  }

  /**
   * Gets the domain part of the email
   * @returns The domain portion of the email
   */
  public get domain(): string {
    return this._value.split('@')[1] || '';
  }

  /**
   * Gets the local part of the email
   * @returns The local portion of the email (before @)
   */
  public get localPart(): string {
    return this._value.split('@')[0] || '';
  }

  /**
   * Checks if this email equals another email
   * @param other - Another Email value object
   * @returns True if emails are equal
   */
  public equals(other: Email): boolean {
    return this._value === other._value;
  }

  /**
   * Checks if the email is from a specific domain
   * @param domain - Domain to check against
   * @returns True if email is from the specified domain
   */
  public isFromDomain(domain: string): boolean {
    return this.domain.toLowerCase() === domain.toLowerCase();
  }

  /**
   * Returns string representation of the email
   * @returns The email address string
   */
  public toString(): string {
    return this._value;
  }

  /**
   * Creates Email from string (factory method)
   * @param value - Email string
   * @returns Email value object
   */
  public static create(value: string): Email {
    return new Email(value);
  }

  /**
   * Creates Email from string (alias for create)
   * @param value - Email string
   * @returns Email value object
   */
  public static fromString(value: string): Email {
    return new Email(value);
  }

  /**
   * Validates if a string is a valid email format
   * @param value - String to validate
   * @returns True if valid email format
   */
  public static isValid(value: string): boolean {
    try {
      new Email(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalizes email by trimming and converting to lowercase
   * @param value - Raw email string
   * @returns Normalized email string
   */
  private normalize(value: string): string {
    if (typeof value !== 'string') {
      throw new InvalidEmailError(String(value), 'Email must be a string');
    }
    return value.trim().toLowerCase();
  }

  /**
   * Validates email format using comprehensive regex
   * @param value - Email string to validate
   * @throws {InvalidEmailError} When email format is invalid
   */
  private validateEmail(value: string): void {
    if (!value || value.length === 0) {
      throw new InvalidEmailError(value, 'Email cannot be empty');
    }

    if (value.length > 254) {
      throw new InvalidEmailError(value, 'Email is too long (max 254 characters)');
    }

    // RFC 5322 compliant email regex (simplified but comprehensive)
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(value)) {
      throw new InvalidEmailError(value, 'Invalid email format');
    }

    // Additional validation for edge cases
    const parts = value.split('@');
    if (parts.length !== 2) {
      throw new InvalidEmailError(value, 'Email must contain exactly one @ symbol');
    }

    const localPart = parts[0];
    const domainPart = parts[1];

    if (!localPart || !domainPart) {
      throw new InvalidEmailError(value, 'Email must have both local and domain parts');
    }

    if (localPart.length === 0) {
      throw new InvalidEmailError(value, 'Local part cannot be empty');
    }

    if (localPart.length > 64) {
      throw new InvalidEmailError(value, 'Local part is too long (max 64 characters)');
    }

    if (domainPart.length === 0) {
      throw new InvalidEmailError(value, 'Domain part cannot be empty');
    }

    if (domainPart.length > 253) {
      throw new InvalidEmailError(value, 'Domain part is too long (max 253 characters)');
    }

    // Check for consecutive dots
    if (localPart.includes('..') || domainPart.includes('..')) {
      throw new InvalidEmailError(value, 'Email cannot contain consecutive dots');
    }

    // Check for starting/ending dots
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      throw new InvalidEmailError(value, 'Local part cannot start or end with a dot');
    }

    if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
      throw new InvalidEmailError(value, 'Domain part cannot start or end with a dot');
    }
  }
}
