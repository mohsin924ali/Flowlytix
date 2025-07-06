/**
 * Payment Status Enums and Types
 *
 * Defines all status-related enums and types for the payment domain.
 * Following DDD principles with proper business meaning.
 *
 * @domain Payment
 * @pattern Value Object
 * @architecture Clean Architecture
 * @version 1.0.0
 */

/**
 * Payment status enumeration
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  RECEIVED = 'RECEIVED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIAL = 'PARTIAL',
  OVERPAID = 'OVERPAID',
}

/**
 * Payment method enumeration
 */
export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT = 'CREDIT',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  MOBILE_PAYMENT = 'MOBILE_PAYMENT',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
}

/**
 * Credit status enumeration
 */
export enum CreditStatus {
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  BLOCKED = 'BLOCKED',
  SUSPENDED = 'SUSPENDED',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

/**
 * Invoice status enumeration
 */
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
}

/**
 * Transaction type enumeration
 */
export enum TransactionType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
  REVERSAL = 'REVERSAL',
  FEE = 'FEE',
  INTEREST = 'INTEREST',
  DISCOUNT = 'DISCOUNT',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
}

/**
 * Credit risk level enumeration
 */
export enum CreditRiskLevel {
  MINIMAL = 'MINIMAL',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Payment approval status enumeration
 */
export enum ApprovalStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

/**
 * Collection activity type enumeration
 */
export enum CollectionActivityType {
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  VISIT = 'VISIT',
  LETTER = 'LETTER',
  LEGAL_NOTICE = 'LEGAL_NOTICE',
  PAYMENT_PLAN = 'PAYMENT_PLAN',
}

/**
 * Collection outcome enumeration
 */
export enum CollectionOutcome {
  PROMISED_PAYMENT = 'PROMISED_PAYMENT',
  PARTIAL_PAYMENT = 'PARTIAL_PAYMENT',
  FULL_PAYMENT = 'FULL_PAYMENT',
  NO_RESPONSE = 'NO_RESPONSE',
  DISPUTED = 'DISPUTED',
  HARDSHIP = 'HARDSHIP',
  REFERRED_TO_LEGAL = 'REFERRED_TO_LEGAL',
}

/**
 * Status utility functions
 */
export class PaymentStatusUtils {
  /**
   * Check if payment status is final (cannot be changed)
   */
  static isFinalStatus(status: PaymentStatus): boolean {
    return [PaymentStatus.CONFIRMED, PaymentStatus.CANCELLED, PaymentStatus.REFUNDED, PaymentStatus.FAILED].includes(
      status
    );
  }

  /**
   * Check if payment status is in progress
   */
  static isInProgress(status: PaymentStatus): boolean {
    return [PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(status);
  }

  /**
   * Check if payment status is successful
   */
  static isSuccessful(status: PaymentStatus): boolean {
    return [PaymentStatus.RECEIVED, PaymentStatus.CONFIRMED, PaymentStatus.OVERPAID].includes(status);
  }

  /**
   * Get status color for UI
   */
  static getStatusColor(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.CONFIRMED:
      case PaymentStatus.RECEIVED:
        return '#4caf50'; // Green
      case PaymentStatus.PENDING:
      case PaymentStatus.PROCESSING:
        return '#ff9800'; // Orange
      case PaymentStatus.FAILED:
      case PaymentStatus.CANCELLED:
        return '#f44336'; // Red
      case PaymentStatus.PARTIAL:
        return '#2196f3'; // Blue
      case PaymentStatus.OVERPAID:
        return '#9c27b0'; // Purple
      case PaymentStatus.REFUNDED:
        return '#607d8b'; // Blue Grey
      default:
        return '#666666'; // Gray
    }
  }

  /**
   * Get status display text
   */
  static getStatusText(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.PENDING:
        return 'Pending';
      case PaymentStatus.PROCESSING:
        return 'Processing';
      case PaymentStatus.RECEIVED:
        return 'Received';
      case PaymentStatus.CONFIRMED:
        return 'Confirmed';
      case PaymentStatus.FAILED:
        return 'Failed';
      case PaymentStatus.CANCELLED:
        return 'Cancelled';
      case PaymentStatus.REFUNDED:
        return 'Refunded';
      case PaymentStatus.PARTIAL:
        return 'Partial';
      case PaymentStatus.OVERPAID:
        return 'Overpaid';
      default:
        return 'Unknown';
    }
  }
}

/**
 * Credit status utility functions
 */
export class CreditStatusUtils {
  /**
   * Get credit status color for UI
   */
  static getStatusColor(status: CreditStatus): string {
    switch (status) {
      case CreditStatus.GOOD:
        return '#4caf50'; // Green
      case CreditStatus.FAIR:
        return '#8bc34a'; // Light Green
      case CreditStatus.POOR:
        return '#ff9800'; // Orange
      case CreditStatus.BLOCKED:
      case CreditStatus.SUSPENDED:
        return '#f44336'; // Red
      case CreditStatus.UNDER_REVIEW:
        return '#2196f3'; // Blue
      default:
        return '#666666'; // Gray
    }
  }

  /**
   * Get credit status display text
   */
  static getStatusText(status: CreditStatus): string {
    switch (status) {
      case CreditStatus.GOOD:
        return 'Good Standing';
      case CreditStatus.FAIR:
        return 'Fair Standing';
      case CreditStatus.POOR:
        return 'Poor Standing';
      case CreditStatus.BLOCKED:
        return 'Blocked';
      case CreditStatus.SUSPENDED:
        return 'Suspended';
      case CreditStatus.UNDER_REVIEW:
        return 'Under Review';
      default:
        return 'Unknown';
    }
  }

  /**
   * Check if credit status allows new orders
   */
  static allowsNewOrders(status: CreditStatus): boolean {
    return [CreditStatus.GOOD, CreditStatus.FAIR].includes(status);
  }

  /**
   * Check if credit status requires approval
   */
  static requiresApproval(status: CreditStatus): boolean {
    return [CreditStatus.POOR, CreditStatus.UNDER_REVIEW].includes(status);
  }
}

/**
 * Payment method utility functions
 */
export class PaymentMethodUtils {
  /**
   * Check if payment method is immediate
   */
  static isImmediate(method: PaymentMethod): boolean {
    return [
      PaymentMethod.CASH,
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.DEBIT_CARD,
      PaymentMethod.MOBILE_PAYMENT,
      PaymentMethod.DIGITAL_WALLET,
    ].includes(method);
  }

  /**
   * Check if payment method requires verification
   */
  static requiresVerification(method: PaymentMethod): boolean {
    return [PaymentMethod.CHECK, PaymentMethod.BANK_TRANSFER].includes(method);
  }

  /**
   * Get payment method display text
   */
  static getMethodText(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CASH:
        return 'Cash';
      case PaymentMethod.CREDIT:
        return 'Credit';
      case PaymentMethod.BANK_TRANSFER:
        return 'Bank Transfer';
      case PaymentMethod.CHECK:
        return 'Check';
      case PaymentMethod.CREDIT_CARD:
        return 'Credit Card';
      case PaymentMethod.DEBIT_CARD:
        return 'Debit Card';
      case PaymentMethod.MOBILE_PAYMENT:
        return 'Mobile Payment';
      case PaymentMethod.DIGITAL_WALLET:
        return 'Digital Wallet';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get payment method icon name (Material-UI icons)
   */
  static getMethodIcon(method: PaymentMethod): string {
    switch (method) {
      case PaymentMethod.CASH:
        return 'AttachMoney';
      case PaymentMethod.CREDIT:
        return 'CreditScore';
      case PaymentMethod.BANK_TRANSFER:
        return 'AccountBalance';
      case PaymentMethod.CHECK:
        return 'Receipt';
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        return 'CreditCard';
      case PaymentMethod.MOBILE_PAYMENT:
        return 'Smartphone';
      case PaymentMethod.DIGITAL_WALLET:
        return 'AccountBalanceWallet';
      default:
        return 'Payment';
    }
  }
}

/**
 * Risk level utility functions
 */
export class CreditRiskUtils {
  /**
   * Get risk level color for UI
   */
  static getRiskColor(level: CreditRiskLevel): string {
    switch (level) {
      case CreditRiskLevel.MINIMAL:
        return '#4caf50'; // Green
      case CreditRiskLevel.LOW:
        return '#8bc34a'; // Light Green
      case CreditRiskLevel.MODERATE:
        return '#ff9800'; // Orange
      case CreditRiskLevel.HIGH:
        return '#f44336'; // Red
      case CreditRiskLevel.CRITICAL:
        return '#9c27b0'; // Purple
      default:
        return '#666666'; // Gray
    }
  }

  /**
   * Get risk level display text
   */
  static getRiskText(level: CreditRiskLevel): string {
    switch (level) {
      case CreditRiskLevel.MINIMAL:
        return 'Minimal Risk';
      case CreditRiskLevel.LOW:
        return 'Low Risk';
      case CreditRiskLevel.MODERATE:
        return 'Moderate Risk';
      case CreditRiskLevel.HIGH:
        return 'High Risk';
      case CreditRiskLevel.CRITICAL:
        return 'Critical Risk';
      default:
        return 'Unknown Risk';
    }
  }

  /**
   * Calculate risk score (0-100)
   */
  static getRiskScore(level: CreditRiskLevel): number {
    switch (level) {
      case CreditRiskLevel.MINIMAL:
        return 10;
      case CreditRiskLevel.LOW:
        return 25;
      case CreditRiskLevel.MODERATE:
        return 50;
      case CreditRiskLevel.HIGH:
        return 75;
      case CreditRiskLevel.CRITICAL:
        return 95;
      default:
        return 0;
    }
  }
}

/**
 * Type guards for payment enums
 */
export function isPaymentStatus(value: any): value is PaymentStatus {
  return Object.values(PaymentStatus).includes(value);
}

export function isPaymentMethod(value: any): value is PaymentMethod {
  return Object.values(PaymentMethod).includes(value);
}

export function isCreditStatus(value: any): value is CreditStatus {
  return Object.values(CreditStatus).includes(value);
}

export function isInvoiceStatus(value: any): value is InvoiceStatus {
  return Object.values(InvoiceStatus).includes(value);
}

export default {
  PaymentStatus,
  PaymentMethod,
  CreditStatus,
  InvoiceStatus,
  TransactionType,
  CreditRiskLevel,
  ApprovalStatus,
  CollectionActivityType,
  CollectionOutcome,
};
