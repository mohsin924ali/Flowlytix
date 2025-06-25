/**
 * Money Value Object
 *
 * Represents monetary values with currency and precision handling.
 * Uses integer representation internally to avoid floating-point precision issues.
 * Supports multiple currencies and comprehensive monetary operations.
 *
 * Business Rules:
 * - Amounts are stored as integers (smallest currency unit, e.g., cents)
 * - Supports major world currencies with proper decimal places
 * - Immutable value object with proper encapsulation
 * - Currency-aware operations (same currency required for arithmetic)
 * - Proper rounding and precision handling
 * - Validation for valid monetary amounts and currencies
 *
 * @domain Shared Kernel
 * @version 1.0.0
 */

/**
 * Supported currencies with their properties
 */
export const SUPPORTED_CURRENCIES = {
  USD: { name: 'US Dollar', symbol: '$', decimalPlaces: 2, code: 'USD' },
  EUR: { name: 'Euro', symbol: '€', decimalPlaces: 2, code: 'EUR' },
  GBP: { name: 'British Pound', symbol: '£', decimalPlaces: 2, code: 'GBP' },
  JPY: { name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, code: 'JPY' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2, code: 'CAD' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, code: 'AUD' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2, code: 'CHF' },
  CNY: { name: 'Chinese Yuan', symbol: '¥', decimalPlaces: 2, code: 'CNY' },
  PKR: { name: 'Pakistani Rupee', symbol: '₨', decimalPlaces: 2, code: 'PKR' },
  INR: { name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2, code: 'INR' },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

/**
 * Currency information interface
 */
export interface CurrencyInfo {
  readonly name: string;
  readonly symbol: string;
  readonly decimalPlaces: number;
  readonly code: CurrencyCode;
}

/**
 * Money creation options
 */
export interface MoneyOptions {
  readonly currency?: CurrencyCode;
  readonly roundingMode?: RoundingMode;
}

/**
 * Rounding modes for monetary calculations
 */
export enum RoundingMode {
  ROUND_UP = 'ROUND_UP',
  ROUND_DOWN = 'ROUND_DOWN',
  ROUND_HALF_UP = 'ROUND_HALF_UP',
  ROUND_HALF_DOWN = 'ROUND_HALF_DOWN',
  ROUND_HALF_EVEN = 'ROUND_HALF_EVEN', // Banker's rounding
}

/**
 * Custom error classes for Money domain
 */
export class MoneyError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'MoneyError';
  }
}

export class InvalidAmountError extends MoneyError {
  constructor(amount: unknown) {
    super(`Invalid monetary amount: ${amount}`, 'INVALID_AMOUNT');
    this.name = 'InvalidAmountError';
  }
}

export class InvalidCurrencyError extends MoneyError {
  constructor(currency: unknown) {
    super(`Invalid currency code: ${currency}`, 'INVALID_CURRENCY');
    this.name = 'InvalidCurrencyError';
  }
}

export class CurrencyMismatchError extends MoneyError {
  constructor(currency1: CurrencyCode, currency2: CurrencyCode) {
    super(`Currency mismatch: ${currency1} vs ${currency2}`, 'CURRENCY_MISMATCH');
    this.name = 'CurrencyMismatchError';
  }
}

export class DivisionByZeroError extends MoneyError {
  constructor() {
    super('Division by zero is not allowed', 'DIVISION_BY_ZERO');
    this.name = 'DivisionByZeroError';
  }
}

/**
 * Money Value Object
 *
 * Immutable value object representing monetary amounts with currency.
 * Uses integer representation for precision and supports comprehensive
 * monetary operations following domain-driven design principles.
 */
export class Money {
  private readonly _amount: number; // Amount in smallest currency unit (e.g., cents)
  private readonly _currency: CurrencyCode;
  private readonly _currencyInfo: CurrencyInfo;

  private constructor(amount: number, currency: CurrencyCode) {
    this._amount = amount;
    this._currency = currency;
    this._currencyInfo = SUPPORTED_CURRENCIES[currency];
    Object.freeze(this);
  }

  /**
   * Create Money from decimal amount
   */
  public static fromDecimal(
    amount: number,
    currency: CurrencyCode = 'USD',
    roundingMode: RoundingMode = RoundingMode.ROUND_HALF_EVEN
  ): Money {
    Money.validateCurrency(currency);
    Money.validateAmount(amount);

    const currencyInfo = SUPPORTED_CURRENCIES[currency];
    const multiplier = Math.pow(10, currencyInfo.decimalPlaces);
    const integerAmount = Money.roundAmount(amount * multiplier, roundingMode);

    return new Money(integerAmount, currency);
  }

  /**
   * Create Money from integer amount (smallest currency unit)
   */
  public static fromInteger(amount: number, currency: CurrencyCode = 'USD'): Money {
    Money.validateCurrency(currency);
    Money.validateIntegerAmount(amount);

    return new Money(amount, currency);
  }

  /**
   * Create zero money for specified currency
   */
  public static zero(currency: CurrencyCode = 'USD'): Money {
    return Money.fromInteger(0, currency);
  }

  /**
   * Parse money from string representation
   */
  public static fromString(value: string, currency: CurrencyCode = 'USD'): Money {
    Money.validateCurrency(currency);

    if (typeof value !== 'string' || value.trim() === '') {
      throw new InvalidAmountError(value);
    }

    // Remove currency symbols and whitespace
    const cleanValue = value.replace(/[$€£¥₨₹,\s]/g, '').replace(/^[A-Z]{3}\s*/, ''); // Remove currency code prefix

    const numericValue = parseFloat(cleanValue);

    // Check for multiple decimal points
    const decimalCount = (cleanValue.match(/\./g) || []).length;

    if (isNaN(numericValue) || decimalCount > 1) {
      throw new InvalidAmountError(value);
    }

    return Money.fromDecimal(numericValue, currency);
  }

  // Getters
  public get amount(): number {
    return this._amount;
  }

  public get currency(): CurrencyCode {
    return this._currency;
  }

  public get currencyInfo(): CurrencyInfo {
    const info = { ...this._currencyInfo };
    return Object.freeze(info);
  }

  /**
   * Get decimal representation of amount
   */
  public get decimalAmount(): number {
    const divisor = Math.pow(10, this._currencyInfo.decimalPlaces);
    return this._amount / divisor;
  }

  /**
   * Check if amount is zero
   */
  public isZero(): boolean {
    return this._amount === 0;
  }

  /**
   * Check if amount is positive
   */
  public isPositive(): boolean {
    return this._amount > 0;
  }

  /**
   * Check if amount is negative
   */
  public isNegative(): boolean {
    return this._amount < 0;
  }

  /**
   * Get absolute value
   */
  public abs(): Money {
    if (this._amount >= 0) {
      return this;
    }
    return new Money(Math.abs(this._amount), this._currency);
  }

  /**
   * Negate the amount
   */
  public negate(): Money {
    return new Money(-this._amount, this._currency);
  }

  // Arithmetic Operations

  /**
   * Add two money amounts (same currency required)
   */
  public add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * Subtract two money amounts (same currency required)
   */
  public subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  /**
   * Multiply by a factor
   */
  public multiply(factor: number, roundingMode: RoundingMode = RoundingMode.ROUND_HALF_EVEN): Money {
    Money.validateAmount(factor);
    const result = Money.roundAmount(this._amount * factor, roundingMode);
    return new Money(result, this._currency);
  }

  /**
   * Divide by a divisor
   */
  public divide(divisor: number, roundingMode: RoundingMode = RoundingMode.ROUND_HALF_EVEN): Money {
    Money.validateAmount(divisor);

    if (divisor === 0) {
      throw new DivisionByZeroError();
    }

    const result = Money.roundAmount(this._amount / divisor, roundingMode);
    return new Money(result, this._currency);
  }

  /**
   * Allocate money into proportions (useful for splitting bills, taxes, etc.)
   */
  public allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) {
      throw new MoneyError('Ratios array cannot be empty', 'EMPTY_RATIOS');
    }

    const totalRatio = ratios.reduce((sum, ratio) => {
      if (ratio < 0) {
        throw new MoneyError('Ratios must be non-negative', 'NEGATIVE_RATIO');
      }
      return sum + ratio;
    }, 0);

    if (totalRatio === 0) {
      return ratios.map(() => Money.zero(this._currency));
    }

    const results: Money[] = [];
    let remainder = this._amount;

    for (let i = 0; i < ratios.length; i++) {
      const allocation = Math.floor((this._amount * ratios[i]) / totalRatio);
      results.push(new Money(allocation, this._currency));
      remainder -= allocation;
    }

    // Distribute remainder to maintain total
    for (let i = 0; i < remainder; i++) {
      const index = i % results.length;
      results[index] = new Money(results[index]._amount + 1, this._currency);
    }

    return results;
  }

  // Comparison Operations

  /**
   * Check equality with another money amount
   */
  public equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  /**
   * Compare with another money amount (same currency required)
   */
  public compareTo(other: Money): number {
    this.ensureSameCurrency(other);
    return this._amount - other._amount;
  }

  /**
   * Check if greater than another amount
   */
  public greaterThan(other: Money): boolean {
    return this.compareTo(other) > 0;
  }

  /**
   * Check if greater than or equal to another amount
   */
  public greaterThanOrEqual(other: Money): boolean {
    return this.compareTo(other) >= 0;
  }

  /**
   * Check if less than another amount
   */
  public lessThan(other: Money): boolean {
    return this.compareTo(other) < 0;
  }

  /**
   * Check if less than or equal to another amount
   */
  public lessThanOrEqual(other: Money): boolean {
    return this.compareTo(other) <= 0;
  }

  // Formatting

  /**
   * Format as currency string
   */
  public format(locale: string = 'en-US'): string {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this._currency,
      minimumFractionDigits: this._currencyInfo.decimalPlaces,
      maximumFractionDigits: this._currencyInfo.decimalPlaces,
    });

    return formatter.format(this.decimalAmount);
  }

  /**
   * Format as simple string with currency symbol
   */
  public toString(): string {
    const decimalAmount = this.decimalAmount;
    const formattedAmount =
      this._currencyInfo.decimalPlaces > 0
        ? decimalAmount.toFixed(this._currencyInfo.decimalPlaces)
        : decimalAmount.toString();

    return `${this._currencyInfo.symbol}${formattedAmount}`;
  }

  /**
   * Convert to JSON representation
   */
  public toJSON(): { amount: number; currency: CurrencyCode; decimalAmount: number } {
    return {
      amount: this._amount,
      currency: this._currency,
      decimalAmount: this.decimalAmount,
    };
  }

  // Private helper methods

  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new CurrencyMismatchError(this._currency, other._currency);
    }
  }

  private static validateCurrency(currency: unknown): asserts currency is CurrencyCode {
    if (typeof currency !== 'string' || !(currency in SUPPORTED_CURRENCIES)) {
      throw new InvalidCurrencyError(currency);
    }
  }

  private static validateAmount(amount: unknown): asserts amount is number {
    if (typeof amount !== 'number' || !isFinite(amount)) {
      throw new InvalidAmountError(amount);
    }
  }

  private static validateIntegerAmount(amount: unknown): asserts amount is number {
    Money.validateAmount(amount);
    if (!Number.isInteger(amount)) {
      throw new InvalidAmountError(amount);
    }
  }

  private static roundAmount(amount: number, mode: RoundingMode): number {
    switch (mode) {
      case RoundingMode.ROUND_UP:
        return Math.ceil(amount);
      case RoundingMode.ROUND_DOWN:
        return Math.floor(amount);
      case RoundingMode.ROUND_HALF_UP:
        return Math.floor(amount + 0.5);
      case RoundingMode.ROUND_HALF_DOWN:
        return Math.ceil(amount - 0.5);
      case RoundingMode.ROUND_HALF_EVEN:
        return Math.round(amount);
      default:
        return Math.round(amount);
    }
  }

  // Static utility methods

  /**
   * Get minimum of multiple money amounts (same currency required)
   */
  public static min(...amounts: Money[]): Money {
    if (amounts.length === 0) {
      throw new MoneyError('Cannot find minimum of empty array', 'EMPTY_ARRAY');
    }

    return amounts.reduce((min, current) => (current.lessThan(min) ? current : min));
  }

  /**
   * Get maximum of multiple money amounts (same currency required)
   */
  public static max(...amounts: Money[]): Money {
    if (amounts.length === 0) {
      throw new MoneyError('Cannot find maximum of empty array', 'EMPTY_ARRAY');
    }

    return amounts.reduce((max, current) => (current.greaterThan(max) ? current : max));
  }

  /**
   * Sum multiple money amounts (same currency required)
   */
  public static sum(...amounts: Money[]): Money {
    if (amounts.length === 0) {
      throw new MoneyError('Cannot sum empty array', 'EMPTY_ARRAY');
    }

    return amounts.reduce((sum, current) => sum.add(current));
  }

  /**
   * Check if all currencies are supported
   */
  public static isSupportedCurrency(currency: string): currency is CurrencyCode {
    return currency in SUPPORTED_CURRENCIES;
  }

  /**
   * Get all supported currencies
   */
  public static getSupportedCurrencies(): CurrencyInfo[] {
    return Object.values(SUPPORTED_CURRENCIES);
  }
}
