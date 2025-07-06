/**
 * Money Value Object
 *
 * Represents monetary values with currency and provides arithmetic operations.
 * Following DDD principles with immutability and proper encapsulation.
 *
 * @domain Payment
 * @pattern Value Object
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * Supported currencies
 */
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  PKR = 'PKR',
}

/**
 * Money validation schema
 */
export const MoneySchema = z.object({
  amount: z.number().finite().min(0, 'Amount cannot be negative'),
  currency: z.nativeEnum(Currency),
});

/**
 * Money value object interface
 */
export interface MoneyData {
  readonly amount: number;
  readonly currency: Currency;
}

/**
 * Money Value Object
 *
 * Immutable value object representing monetary amounts with currency.
 * Provides arithmetic operations and validation.
 */
export class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: Currency
  ) {
    // Validate on construction
    MoneySchema.parse({ amount: _amount, currency: _currency });
  }

  /**
   * Create Money from decimal amount and currency
   */
  static fromDecimal(amount: number, currency: Currency | string): Money {
    const currencyEnum =
      typeof currency === 'string' ? Currency[currency.toUpperCase() as keyof typeof Currency] : currency;

    if (!currencyEnum) {
      throw new Error(`Invalid currency: ${currency}`);
    }

    return new Money(Math.round(amount * 100) / 100, currencyEnum);
  }

  /**
   * Create Money from cents/smallest unit
   */
  static fromCents(cents: number, currency: Currency): Money {
    return new Money(cents / 100, currency);
  }

  /**
   * Create zero amount
   */
  static zero(currency: Currency): Money {
    return new Money(0, currency);
  }

  /**
   * Get amount as decimal
   */
  get amount(): number {
    return this._amount;
  }

  /**
   * Get amount in cents/smallest unit
   */
  get cents(): number {
    return Math.round(this._amount * 100);
  }

  /**
   * Get currency
   */
  get currency(): Currency {
    return this._currency;
  }

  /**
   * Check if amount is zero
   */
  get isZero(): boolean {
    return this._amount === 0;
  }

  /**
   * Check if amount is positive
   */
  get isPositive(): boolean {
    return this._amount > 0;
  }

  /**
   * Check if amount is negative
   */
  get isNegative(): boolean {
    return this._amount < 0;
  }

  /**
   * Add two Money objects
   */
  add(other: Money): Money {
    this.validateSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * Subtract two Money objects
   */
  subtract(other: Money): Money {
    this.validateSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  /**
   * Multiply by a scalar
   */
  multiply(multiplier: number): Money {
    if (!Number.isFinite(multiplier)) {
      throw new Error('Multiplier must be a finite number');
    }
    return new Money(this._amount * multiplier, this._currency);
  }

  /**
   * Divide by a scalar
   */
  divide(divisor: number): Money {
    if (!Number.isFinite(divisor) || divisor === 0) {
      throw new Error('Divisor must be a finite non-zero number');
    }
    return new Money(this._amount / divisor, this._currency);
  }

  /**
   * Calculate percentage of amount
   */
  percentage(percent: number): Money {
    return this.multiply(percent / 100);
  }

  /**
   * Compare with another Money object
   */
  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  /**
   * Check if greater than another Money object
   */
  greaterThan(other: Money): boolean {
    this.validateSameCurrency(other);
    return this._amount > other._amount;
  }

  /**
   * Check if less than another Money object
   */
  lessThan(other: Money): boolean {
    this.validateSameCurrency(other);
    return this._amount < other._amount;
  }

  /**
   * Check if greater than or equal to another Money object
   */
  greaterThanOrEqual(other: Money): boolean {
    this.validateSameCurrency(other);
    return this._amount >= other._amount;
  }

  /**
   * Check if less than or equal to another Money object
   */
  lessThanOrEqual(other: Money): boolean {
    this.validateSameCurrency(other);
    return this._amount <= other._amount;
  }

  /**
   * Get absolute value
   */
  abs(): Money {
    return new Money(Math.abs(this._amount), this._currency);
  }

  /**
   * Round to specified decimal places
   */
  round(decimals: number = 2): Money {
    const factor = Math.pow(10, decimals);
    return new Money(Math.round(this._amount * factor) / factor, this._currency);
  }

  /**
   * Format as currency string
   */
  format(locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this._currency,
    }).format(this._amount);
  }

  /**
   * Convert to plain object
   */
  toJSON(): MoneyData {
    return {
      amount: this._amount,
      currency: this._currency,
    };
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `${this._amount} ${this._currency}`;
  }

  /**
   * Create Money from plain object
   */
  static fromJSON(data: MoneyData): Money {
    return new Money(data.amount, data.currency);
  }

  /**
   * Validate that two Money objects have the same currency
   */
  private validateSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Cannot operate on different currencies: ${this._currency} and ${other._currency}`);
    }
  }
}

/**
 * Utility functions for Money operations
 */
export class MoneyUtils {
  /**
   * Sum an array of Money objects
   */
  static sum(amounts: Money[]): Money {
    if (amounts.length === 0) {
      throw new Error('Cannot sum empty array');
    }

    return amounts.reduce((sum, amount) => sum.add(amount));
  }

  /**
   * Find minimum Money value
   */
  static min(...amounts: Money[]): Money {
    if (amounts.length === 0) {
      throw new Error('Cannot find minimum of empty array');
    }

    return amounts.reduce((min, amount) => (amount.lessThan(min) ? amount : min));
  }

  /**
   * Find maximum Money value
   */
  static max(...amounts: Money[]): Money {
    if (amounts.length === 0) {
      throw new Error('Cannot find maximum of empty array');
    }

    return amounts.reduce((max, amount) => (amount.greaterThan(max) ? amount : max));
  }

  /**
   * Calculate average of Money amounts
   */
  static average(amounts: Money[]): Money {
    if (amounts.length === 0) {
      throw new Error('Cannot calculate average of empty array');
    }

    return MoneyUtils.sum(amounts).divide(amounts.length);
  }

  /**
   * Distribute amount evenly across given number of parts
   */
  static distribute(amount: Money, parts: number): Money[] {
    if (parts <= 0) {
      throw new Error('Parts must be positive');
    }

    const baseAmount = amount.divide(parts);
    const remainder = amount.subtract(baseAmount.multiply(parts));

    const result: Money[] = [];
    for (let i = 0; i < parts; i++) {
      if (i < remainder.cents) {
        result.push(baseAmount.add(Money.fromCents(1, amount.currency)));
      } else {
        result.push(baseAmount);
      }
    }

    return result;
  }
}

/**
 * Type guard for Money objects
 */
export function isMoney(value: any): value is Money {
  return value instanceof Money;
}

/**
 * Common currency constants
 */
export const CurrencyConstants = {
  USD: Currency.USD,
  EUR: Currency.EUR,
  GBP: Currency.GBP,
  PKR: Currency.PKR,
} as const;

export default Money;
