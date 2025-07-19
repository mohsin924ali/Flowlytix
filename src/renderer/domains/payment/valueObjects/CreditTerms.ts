/**
 * Credit Terms Value Object
 *
 * Represents payment terms for credit transactions with due dates calculation.
 * Following DDD principles with immutability and business logic encapsulation.
 *
 * @domain Payment
 * @pattern Value Object
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * Credit terms validation schema
 */
export const CreditTermsSchema = z.object({
  days: z.number().int().min(0, 'Credit days cannot be negative'),
  description: z.string().min(1, 'Description is required'),
  discountDays: z.number().int().min(0).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
});

/**
 * Credit terms data interface
 */
export interface CreditTermsData {
  readonly days: number;
  readonly description: string;
  readonly discountDays?: number;
  readonly discountPercentage?: number;
}

/**
 * Credit Terms Value Object
 *
 * Immutable value object representing payment terms for credit transactions.
 * Provides business logic for due date calculations and early payment discounts.
 */
export class CreditTerms {
  // Standard credit terms constants
  static readonly COD = new CreditTerms(0, 'Cash on Delivery');
  static readonly NET_7 = new CreditTerms(7, 'Net 7 days');
  static readonly NET_10 = new CreditTerms(10, 'Net 10 days');
  static readonly NET_15 = new CreditTerms(15, 'Net 15 days');
  static readonly NET_30 = new CreditTerms(30, 'Net 30 days');
  static readonly NET_45 = new CreditTerms(45, 'Net 45 days');
  static readonly NET_60 = new CreditTerms(60, 'Net 60 days');
  static readonly NET_90 = new CreditTerms(90, 'Net 90 days');

  // Terms with early payment discounts
  static readonly TWO_TEN_NET_30 = new CreditTerms(30, '2/10 Net 30', 10, 2);
  static readonly ONE_FIFTEEN_NET_30 = new CreditTerms(30, '1/15 Net 30', 15, 1);
  static readonly THREE_TEN_NET_60 = new CreditTerms(60, '3/10 Net 60', 10, 3);

  private constructor(
    private readonly _days: number,
    private readonly _description: string,
    private readonly _discountDays?: number,
    private readonly _discountPercentage?: number
  ) {
    // Validate on construction
    CreditTermsSchema.parse({
      days: _days,
      description: _description,
      discountDays: _discountDays,
      discountPercentage: _discountPercentage,
    });
  }

  /**
   * Create custom credit terms
   */
  static create(days: number, description: string, discountDays?: number, discountPercentage?: number): CreditTerms {
    return new CreditTerms(days, description, discountDays, discountPercentage);
  }

  /**
   * Get credit days
   */
  get days(): number {
    return this._days;
  }

  /**
   * Get description
   */
  get description(): string {
    return this._description;
  }

  /**
   * Get early payment discount days
   */
  get discountDays(): number | undefined {
    return this._discountDays;
  }

  /**
   * Get early payment discount percentage
   */
  get discountPercentage(): number | undefined {
    return this._discountPercentage;
  }

  /**
   * Check if cash on delivery
   */
  get isCashOnDelivery(): boolean {
    return this._days === 0;
  }

  /**
   * Check if has early payment discount
   */
  get hasEarlyPaymentDiscount(): boolean {
    return this._discountDays !== undefined && this._discountPercentage !== undefined;
  }

  /**
   * Calculate due date from invoice date
   */
  calculateDueDate(invoiceDate: Date): Date {
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + this._days);
    return dueDate;
  }

  /**
   * Calculate early payment discount date
   */
  calculateDiscountDate(invoiceDate: Date): Date | null {
    if (!this.hasEarlyPaymentDiscount) {
      return null;
    }

    const discountDate = new Date(invoiceDate);
    discountDate.setDate(discountDate.getDate() + this._discountDays!);
    return discountDate;
  }

  /**
   * Check if payment date qualifies for early payment discount
   */
  qualifiesForEarlyPaymentDiscount(invoiceDate: Date, paymentDate: Date): boolean {
    const discountDate = this.calculateDiscountDate(invoiceDate);
    if (!discountDate) {
      return false;
    }

    return paymentDate <= discountDate;
  }

  /**
   * Calculate days until due
   */
  calculateDaysUntilDue(invoiceDate: Date, currentDate: Date = new Date()): number {
    const dueDate = this.calculateDueDate(invoiceDate);
    const timeDiff = dueDate.getTime() - currentDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Check if payment is overdue
   */
  isOverdue(invoiceDate: Date, currentDate: Date = new Date()): boolean {
    const daysUntilDue = this.calculateDaysUntilDue(invoiceDate, currentDate);
    return daysUntilDue < 0;
  }

  /**
   * Get overdue days
   */
  getOverdueDays(invoiceDate: Date, currentDate: Date = new Date()): number {
    const daysUntilDue = this.calculateDaysUntilDue(invoiceDate, currentDate);
    return daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;
  }

  /**
   * Get payment urgency level
   */
  getPaymentUrgency(invoiceDate: Date, currentDate: Date = new Date()): PaymentUrgency {
    if (this.isCashOnDelivery) {
      return PaymentUrgency.IMMEDIATE;
    }

    const daysUntilDue = this.calculateDaysUntilDue(invoiceDate, currentDate);

    if (daysUntilDue < 0) {
      return PaymentUrgency.OVERDUE;
    } else if (daysUntilDue <= 3) {
      return PaymentUrgency.CRITICAL;
    } else if (daysUntilDue <= 7) {
      return PaymentUrgency.HIGH;
    } else if (daysUntilDue <= 14) {
      return PaymentUrgency.MEDIUM;
    } else {
      return PaymentUrgency.LOW;
    }
  }

  /**
   * Compare with another CreditTerms object
   */
  equals(other: CreditTerms): boolean {
    return (
      this._days === other._days &&
      this._description === other._description &&
      this._discountDays === other._discountDays &&
      this._discountPercentage === other._discountPercentage
    );
  }

  /**
   * Check if terms are more lenient than another
   */
  isMoreLenientThan(other: CreditTerms): boolean {
    return this._days > other._days;
  }

  /**
   * Check if terms are stricter than another
   */
  isStricterThan(other: CreditTerms): boolean {
    return this._days < other._days;
  }

  /**
   * Convert to plain object
   */
  toJSON(): CreditTermsData {
    return {
      days: this._days,
      description: this._description,
      ...(this._discountDays !== undefined && { discountDays: this._discountDays }),
      ...(this._discountPercentage !== undefined && { discountPercentage: this._discountPercentage }),
    };
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return this._description;
  }

  /**
   * Create CreditTerms from plain object
   */
  static fromJSON(data: CreditTermsData): CreditTerms {
    return new CreditTerms(data.days, data.description, data.discountDays, data.discountPercentage);
  }

  /**
   * Get all standard credit terms
   */
  static getAllStandardTerms(): CreditTerms[] {
    return [
      CreditTerms.COD,
      CreditTerms.NET_7,
      CreditTerms.NET_10,
      CreditTerms.NET_15,
      CreditTerms.NET_30,
      CreditTerms.NET_45,
      CreditTerms.NET_60,
      CreditTerms.NET_90,
      CreditTerms.TWO_TEN_NET_30,
      CreditTerms.ONE_FIFTEEN_NET_30,
      CreditTerms.THREE_TEN_NET_60,
    ];
  }

  /**
   * Find credit terms by days
   */
  static findByDays(days: number): CreditTerms | undefined {
    return CreditTerms.getAllStandardTerms().find((terms) => terms.days === days);
  }

  /**
   * Find credit terms by description
   */
  static findByDescription(description: string): CreditTerms | undefined {
    return CreditTerms.getAllStandardTerms().find(
      (terms) => terms.description.toLowerCase() === description.toLowerCase()
    );
  }
}

/**
 * Payment urgency levels
 */
export enum PaymentUrgency {
  IMMEDIATE = 'IMMEDIATE',
  OVERDUE = 'OVERDUE',
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Credit terms utility functions
 */
export class CreditTermsUtils {
  /**
   * Get urgency color for UI
   */
  static getUrgencyColor(urgency: PaymentUrgency): string {
    switch (urgency) {
      case PaymentUrgency.IMMEDIATE:
        return '#1976d2'; // Blue
      case PaymentUrgency.OVERDUE:
        return '#d32f2f'; // Red
      case PaymentUrgency.CRITICAL:
        return '#f57c00'; // Orange
      case PaymentUrgency.HIGH:
        return '#ff9800'; // Amber
      case PaymentUrgency.MEDIUM:
        return '#fbc02d'; // Yellow
      case PaymentUrgency.LOW:
        return '#388e3c'; // Green
      default:
        return '#666666'; // Gray
    }
  }

  /**
   * Get urgency display text
   */
  static getUrgencyText(urgency: PaymentUrgency): string {
    switch (urgency) {
      case PaymentUrgency.IMMEDIATE:
        return 'Due Immediately';
      case PaymentUrgency.OVERDUE:
        return 'Overdue';
      case PaymentUrgency.CRITICAL:
        return 'Due Soon';
      case PaymentUrgency.HIGH:
        return 'Due This Week';
      case PaymentUrgency.MEDIUM:
        return 'Due This Month';
      case PaymentUrgency.LOW:
        return 'Due Later';
      default:
        return 'Unknown';
    }
  }

  /**
   * Sort credit terms by strictness (shortest terms first)
   */
  static sortByStrictness(terms: CreditTerms[]): CreditTerms[] {
    return [...terms].sort((a, b) => a.days - b.days);
  }

  /**
   * Sort credit terms by leniency (longest terms first)
   */
  static sortByLeniency(terms: CreditTerms[]): CreditTerms[] {
    return [...terms].sort((a, b) => b.days - a.days);
  }
}

/**
 * Type guard for CreditTerms objects
 */
export function isCreditTerms(value: any): value is CreditTerms {
  return value instanceof CreditTerms;
}

export default CreditTerms;
