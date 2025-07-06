/**
 * Payment Domain Index
 *
 * Main export file for the payment domain.
 * Following Domain-Driven Design principles with clear separation of concerns.
 *
 * @domain Payment
 * @pattern Domain Layer
 * @architecture Clean Architecture
 * @version 1.0.0
 */

// ==================== VALUE OBJECTS ====================
export { default as Money, Currency, CurrencyConstants, MoneyUtils, isMoney } from './valueObjects/Money';
export { default as CreditTerms, PaymentUrgency, CreditTermsUtils, isCreditTerms } from './valueObjects/CreditTerms';
export {
  PaymentStatus,
  PaymentMethod,
  CreditStatus,
  InvoiceStatus,
  TransactionType,
  CreditRiskLevel,
  ApprovalStatus,
  CollectionActivityType,
  CollectionOutcome,
  PaymentStatusUtils,
  CreditStatusUtils,
  PaymentMethodUtils,
  CreditRiskUtils,
  isPaymentStatus,
  isPaymentMethod,
  isCreditStatus,
  isInvoiceStatus,
  default as PaymentStatusEnums,
} from './valueObjects/PaymentStatus';

// ==================== ENTITIES ====================
export { default as Payment, PaymentId, CustomerId, UserId, CreatePaymentSchema } from './entities/Payment';
export type { PaymentMetadata, CreatePaymentData } from './entities/Payment';

// ==================== TYPES AND INTERFACES ====================
export type {
  // Core payment types
  PaymentRecord,
  PaymentListItem,
  PaymentFilters,
  PaymentListResponse,

  // Credit management types
  CreditAccount,
  CreditCheckRequest,
  CreditCheckResult,
  CreditLimitAdjustment,

  // Invoice types
  Invoice,
  InvoiceItem,
  InvoicePaymentAllocation,

  // Transaction types
  Transaction,
  CustomerAccountBalance,

  // Collection types
  CollectionActivity,
  AgingReportItem,

  // Analytics types
  PaymentAnalytics,
  DailyPaymentSummary,
  TopPayingCustomer,
  CreditAnalytics,
  AgingBucketSummary,
  CreditTrendData,

  // Form types
  PaymentRecordForm,
  CreditLimitAdjustmentForm,
  InvoiceCreationForm,
  InvoiceItemForm,
  CollectionActivityForm,

  // API types
  ApiResponse,
  PaginatedResponse,

  // Service interfaces
  IPaymentService,
  ICreditService,
  IInvoiceService,

  // Utility types
  PartialUpdate,
  CreateData,
  FilterType,
} from './types/PaymentTypes';

// Import types for internal use
import type { PaymentRecord, Invoice } from './types/PaymentTypes';

// ==================== VALIDATION SCHEMAS ====================
export {
  PaymentRecordFormSchema,
  CreditLimitAdjustmentFormSchema,
  CollectionActivityFormSchema,
} from './types/PaymentTypes';

// ==================== TYPE GUARDS ====================
export { isPaymentRecord, isCreditAccount, isInvoice } from './types/PaymentTypes';

// ==================== DOMAIN CONSTANTS ====================

/**
 * Payment configuration constants
 */
export const PaymentDomainConstants = {
  DEFAULT_CURRENCY: 'USD',
  MAX_PAYMENT_AMOUNT: 1000000,
  MIN_PAYMENT_AMOUNT: 0.01,
  MAX_CREDIT_LIMIT: 1000000,
  MIN_CREDIT_LIMIT: 0,
  DEFAULT_PAYMENT_TERMS: 30,
  MAX_PAYMENT_TERMS: 365,
  DEFAULT_RISK_THRESHOLD: 70,
  MAX_REFUND_DAYS: 90,
  DEFAULT_AGING_BUCKETS: [30, 60, 90],
  PAYMENT_BATCH_SIZE: 100,
  COLLECTION_REMINDER_DAYS: [7, 3, 1],
  CREDIT_UTILIZATION_WARNING: 80,
  CREDIT_UTILIZATION_CRITICAL: 95,
} as const;

/**
 * Payment business rules
 */
export const PaymentBusinessRules = {
  MINIMUM_PAYMENT_AMOUNT: 0.01,
  MAXIMUM_PAYMENT_AMOUNT: 1000000,
  REFUND_WINDOW_DAYS: 90,
  CREDIT_CHECK_TIMEOUT_MS: 5000,
  PAYMENT_PROCESSING_TIMEOUT_MS: 30000,
  COLLECTION_ACTIVITY_RETENTION_DAYS: 2555, // 7 years
  AGING_REPORT_RETENTION_DAYS: 365,
  CREDIT_LIMIT_ADJUSTMENT_APPROVAL_THRESHOLD: 10000,
  OVERDUE_PAYMENT_GRACE_PERIOD_DAYS: 5,
  COLLECTION_ESCALATION_OVERDUE_DAYS: 30,
  PAYMENT_REMINDER_FREQUENCY_DAYS: 7,
  CREDIT_REVIEW_FREQUENCY_DAYS: 90,
} as const;

/**
 * Payment error codes
 */
export const PaymentErrorCodes = {
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  PAYMENT_CANCELLED: 'PAYMENT_CANCELLED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  INSUFFICIENT_CREDIT: 'INSUFFICIENT_CREDIT',
  CREDIT_LIMIT_EXCEEDED: 'CREDIT_LIMIT_EXCEEDED',
  CUSTOMER_BLOCKED: 'CUSTOMER_BLOCKED',
  INVOICE_NOT_FOUND: 'INVOICE_NOT_FOUND',
  INVOICE_ALREADY_PAID: 'INVOICE_ALREADY_PAID',
  INVOICE_CANCELLED: 'INVOICE_CANCELLED',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Payment event types for domain events
 */
export const PaymentEventTypes = {
  PAYMENT_RECORDED: 'payment.recorded',
  PAYMENT_CONFIRMED: 'payment.confirmed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_CANCELLED: 'payment.cancelled',
  PAYMENT_REFUNDED: 'payment.refunded',
  CREDIT_LIMIT_ADJUSTED: 'credit.limit.adjusted',
  CREDIT_CHECK_PERFORMED: 'credit.check.performed',
  CREDIT_BLOCKED: 'credit.blocked',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_OVERDUE: 'invoice.overdue',
  COLLECTION_ACTIVITY_CREATED: 'collection.activity.created',
  AGING_REPORT_GENERATED: 'aging.report.generated',
  PAYMENT_REMINDER_SENT: 'payment.reminder.sent',
} as const;

/**
 * Payment permissions
 */
export const PaymentPermissions = {
  // Payment permissions
  PAYMENT_VIEW: 'payment.view',
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_UPDATE: 'payment.update',
  PAYMENT_DELETE: 'payment.delete',
  PAYMENT_REFUND: 'payment.refund',
  PAYMENT_APPROVE: 'payment.approve',

  // Credit permissions
  CREDIT_VIEW: 'credit.view',
  CREDIT_MANAGE: 'credit.manage',
  CREDIT_LIMIT_ADJUST: 'credit.limit.adjust',
  CREDIT_LIMIT_APPROVE: 'credit.limit.approve',
  CREDIT_BLOCK: 'credit.block',
  CREDIT_UNBLOCK: 'credit.unblock',

  // Invoice permissions
  INVOICE_VIEW: 'invoice.view',
  INVOICE_CREATE: 'invoice.create',
  INVOICE_UPDATE: 'invoice.update',
  INVOICE_DELETE: 'invoice.delete',
  INVOICE_SEND: 'invoice.send',
  INVOICE_PRINT: 'invoice.print',

  // Collection permissions
  COLLECTION_VIEW: 'collection.view',
  COLLECTION_CREATE: 'collection.create',
  COLLECTION_UPDATE: 'collection.update',
  COLLECTION_DELETE: 'collection.delete',

  // Analytics permissions
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',
  AGING_REPORT_VIEW: 'aging.report.view',
  AGING_REPORT_EXPORT: 'aging.report.export',

  // Administrative permissions
  PAYMENT_ADMIN: 'payment.admin',
  CREDIT_ADMIN: 'credit.admin',
  INVOICE_ADMIN: 'invoice.admin',
  COLLECTION_ADMIN: 'collection.admin',
  ANALYTICS_ADMIN: 'analytics.admin',
} as const;

/**
 * Payment UI constants
 */
export const PaymentUIConstants = {
  PAYMENT_LIST_PAGE_SIZE: 25,
  PAYMENT_SEARCH_DEBOUNCE_MS: 300,
  PAYMENT_REFRESH_INTERVAL_MS: 30000,
  PAYMENT_ANIMATION_DURATION_MS: 300,
  PAYMENT_TOAST_DURATION_MS: 4000,
  PAYMENT_MODAL_FADE_DURATION_MS: 200,
  PAYMENT_SKELETON_ROWS: 10,
  PAYMENT_EXPORT_BATCH_SIZE: 1000,
  PAYMENT_BULK_ACTION_LIMIT: 100,
  PAYMENT_AUTOCOMPLETE_MIN_CHARS: 2,
  PAYMENT_AUTOCOMPLETE_MAX_RESULTS: 10,
  PAYMENT_VALIDATION_DELAY_MS: 500,
  PAYMENT_FORM_AUTOSAVE_DELAY_MS: 2000,
} as const;

/**
 * Payment formatting utilities
 */
export const PaymentFormatters = {
  formatCurrency: (amount: number, currency: string, locale: string = 'en-US'): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  formatPercentage: (value: number, decimals: number = 2): string => {
    return `${(value * 100).toFixed(decimals)}%`;
  },

  formatDate: (date: Date, locale: string = 'en-US'): string => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  },

  formatDateTime: (date: Date, locale: string = 'en-US'): string => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  },

  formatPaymentReference: (payment: PaymentRecord): string => {
    return payment.metadata.reference || payment.metadata.orderId || payment.metadata.invoiceId || payment.id.slice(-8);
  },

  formatCreditUtilization: (used: number, limit: number): string => {
    if (limit === 0) return '0%';
    return PaymentFormatters.formatPercentage(used / limit);
  },

  formatAgingBucket: (days: number): string => {
    if (days === 0) return 'Current';
    if (days <= 30) return '1-30 days';
    if (days <= 60) return '31-60 days';
    if (days <= 90) return '61-90 days';
    return '90+ days';
  },
} as const;

// ==================== DOMAIN UTILITIES ====================

/**
 * Payment domain utilities
 */
export const PaymentDomainUtils = {
  /**
   * Calculate days overdue
   */
  calculateDaysOverdue: (dueDate: Date, currentDate: Date = new Date()): number => {
    const timeDiff = currentDate.getTime() - dueDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    return daysDiff > 0 ? daysDiff : 0;
  },

  /**
   * Calculate credit utilization percentage
   */
  calculateCreditUtilization: (outstandingBalance: number, creditLimit: number): number => {
    if (creditLimit === 0) return 0;
    return Math.min((outstandingBalance / creditLimit) * 100, 100);
  },

  /**
   * Determine collection priority
   */
  determineCollectionPriority: (daysOverdue: number, amount: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
    if (daysOverdue >= 90 || amount >= 10000) return 'CRITICAL';
    if (daysOverdue >= 60 || amount >= 5000) return 'HIGH';
    if (daysOverdue >= 30 || amount >= 1000) return 'MEDIUM';
    return 'LOW';
  },

  /**
   * Calculate payment allocation priority
   */
  calculatePaymentAllocationPriority: (invoices: Invoice[]): Invoice[] => {
    return invoices.sort((a, b) => {
      // First by overdue days (descending)
      const aOverdue = PaymentDomainUtils.calculateDaysOverdue(a.dueDate);
      const bOverdue = PaymentDomainUtils.calculateDaysOverdue(b.dueDate);

      if (aOverdue !== bOverdue) {
        return bOverdue - aOverdue;
      }

      // Then by amount (descending)
      return b.outstandingAmount - a.outstandingAmount;
    });
  },

  /**
   * Generate payment reference
   */
  generatePaymentReference: (customerId: string, date: Date): string => {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const customerRef = customerId.slice(-4).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `PAY-${dateStr}-${customerRef}-${random}`;
  },

  /**
   * Validate payment amount
   */
  validatePaymentAmount: (amount: number): boolean => {
    return (
      amount >= PaymentBusinessRules.MINIMUM_PAYMENT_AMOUNT && amount <= PaymentBusinessRules.MAXIMUM_PAYMENT_AMOUNT
    );
  },

  /**
   * Check if payment is within refund window
   */
  isWithinRefundWindow: (paymentDate: Date, currentDate: Date = new Date()): boolean => {
    const daysDiff = PaymentDomainUtils.calculateDaysOverdue(paymentDate, currentDate);
    return daysDiff <= PaymentBusinessRules.REFUND_WINDOW_DAYS;
  },
} as const;

// ==================== VERSION INFORMATION ====================

/**
 * Payment domain version information
 */
export const PaymentDomainVersion = {
  VERSION: '1.0.0',
  BUILD_DATE: new Date().toISOString(),
  API_VERSION: 'v1',
  SCHEMA_VERSION: '1.0',
  COMPATIBILITY: {
    MIN_APP_VERSION: '1.0.0',
    MAX_APP_VERSION: '2.0.0',
  },
} as const;

// Default export object with constants and utilities
export default {
  // Constants
  PaymentDomainConstants,
  PaymentBusinessRules,
  PaymentErrorCodes,
  PaymentEventTypes,
  PaymentPermissions,
  PaymentUIConstants,

  // Utilities
  PaymentFormatters,
  PaymentDomainUtils,

  // Version
  PaymentDomainVersion,
};
