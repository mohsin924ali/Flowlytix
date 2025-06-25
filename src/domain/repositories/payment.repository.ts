/**
 * Payment Repository Interface
 *
 * Domain repository interface for payment persistence operations.
 * Defines the contract for payment data access following Repository pattern.
 *
 * Features:
 * - CRUD operations for payments and payment transactions
 * - Advanced search and filtering capabilities
 * - Payment status and gateway tracking
 * - Order payment history
 * - Customer payment analytics
 * - Payment retry and audit trail management
 * - Multi-tenant agency isolation
 * - Pagination and sorting support
 *
 * @domain Order Management - Payment Processing
 * @pattern Repository
 * @version 1.0.0
 */

import { Payment, PaymentStatus, PaymentTransactionType, PaymentGateway } from '../entities/payment';
import { PaymentMethod } from '../entities/order';
import { Money } from '../value-objects/money';

/**
 * Payment search and filter criteria
 */
export interface PaymentSearchCriteria {
  readonly agencyId: string;
  readonly orderId?: string;
  readonly orderNumber?: string;
  readonly customerId?: string;
  readonly customerName?: string;
  readonly status?: PaymentStatus[];
  readonly transactionType?: PaymentTransactionType[];
  readonly paymentMethod?: PaymentMethod[];
  readonly gateway?: PaymentGateway[];
  readonly transactionReference?: string;
  readonly gatewayTransactionId?: string;
  readonly amountMin?: number;
  readonly amountMax?: number;
  readonly currency?: string;
  readonly initiatedDateFrom?: Date;
  readonly initiatedDateTo?: Date;
  readonly processedDateFrom?: Date;
  readonly processedDateTo?: Date;
  readonly completedDateFrom?: Date;
  readonly completedDateTo?: Date;
  readonly initiatedBy?: string;
  readonly hasRetries?: boolean;
  readonly searchText?: string; // Free text search in customer name, order number, transaction reference
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?:
    | 'initiatedAt'
    | 'processedAt'
    | 'completedAt'
    | 'amount'
    | 'customerName'
    | 'orderNumber'
    | 'status'
    | 'gateway';
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Payment statistics interface
 */
export interface PaymentStatistics {
  readonly totalPayments: number;
  readonly completedPayments: number;
  readonly failedPayments: number;
  readonly pendingPayments: number;
  readonly cancelledPayments: number;
  readonly refundedPayments: number;
  readonly totalAmount: Money;
  readonly completedAmount: Money;
  readonly refundedAmount: Money;
  readonly averageAmount: Money;
  readonly successRate: number; // Percentage
  readonly averageProcessingTime: number; // Minutes
}

/**
 * Gateway performance metrics
 */
export interface GatewayPerformanceMetrics {
  readonly gateway: PaymentGateway;
  readonly totalTransactions: number;
  readonly successfulTransactions: number;
  readonly failedTransactions: number;
  readonly successRate: number;
  readonly averageProcessingTime: number;
  readonly totalAmount: Money;
  readonly lastTransactionAt: Date | null;
}

/**
 * Payment retry filter criteria
 */
export interface PaymentRetryFilter {
  readonly agencyId: string;
  readonly status: PaymentStatus.FAILED;
  readonly canRetry: boolean;
  readonly nextRetryBefore?: Date;
  readonly maxAttempts?: number;
  readonly gateway?: PaymentGateway[];
  readonly limit?: number;
}

/**
 * Payment audit filter criteria
 */
export interface PaymentAuditFilter {
  readonly agencyId: string;
  readonly paymentId?: string;
  readonly orderId?: string;
  readonly actionType?: string[];
  readonly performedBy?: string;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Payment Repository Interface
 */
export interface PaymentRepository {
  /**
   * Create new payment
   */
  create(payment: Payment): Promise<Payment>;

  /**
   * Update existing payment
   */
  update(payment: Payment): Promise<Payment>;

  /**
   * Find payment by ID
   */
  findById(id: string): Promise<Payment | null>;

  /**
   * Find payment by transaction reference
   */
  findByTransactionReference(transactionReference: string, agencyId: string): Promise<Payment | null>;

  /**
   * Find payment by gateway transaction ID
   */
  findByGatewayTransactionId(gatewayTransactionId: string, gateway: PaymentGateway): Promise<Payment | null>;

  /**
   * Find payments by order ID
   */
  findByOrderId(orderId: string): Promise<readonly Payment[]>;

  /**
   * Find payments by customer ID
   */
  findByCustomerId(customerId: string, agencyId: string, limit?: number, offset?: number): Promise<readonly Payment[]>;

  /**
   * Search payments with criteria
   */
  search(criteria: PaymentSearchCriteria): Promise<readonly Payment[]>;

  /**
   * Count payments matching criteria
   */
  count(criteria: Omit<PaymentSearchCriteria, 'limit' | 'offset' | 'sortBy' | 'sortOrder'>): Promise<number>;

  /**
   * Find payments pending retry
   */
  findPendingRetries(filter: PaymentRetryFilter): Promise<readonly Payment[]>;

  /**
   * Get payment statistics for agency
   */
  getStatistics(
    agencyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    filters?: {
      customerId?: string;
      gateway?: PaymentGateway[];
      paymentMethod?: PaymentMethod[];
    }
  ): Promise<PaymentStatistics>;

  /**
   * Get gateway performance metrics
   */
  getGatewayMetrics(agencyId: string, dateFrom?: Date, dateTo?: Date): Promise<readonly GatewayPerformanceMetrics[]>;

  /**
   * Get customer payment history
   */
  getCustomerPaymentHistory(
    customerId: string,
    agencyId: string,
    limit?: number,
    offset?: number
  ): Promise<readonly Payment[]>;

  /**
   * Get order payment summary
   */
  getOrderPaymentSummary(orderId: string): Promise<{
    totalPaid: Money;
    totalRefunded: Money;
    remainingBalance: Money;
    paymentCount: number;
    refundCount: number;
    lastPaymentAt: Date | null;
  } | null>;

  /**
   * Find payments by audit criteria
   */
  findByAuditCriteria(filter: PaymentAuditFilter): Promise<readonly Payment[]>;

  /**
   * Get payment audit trail for specific payment
   */
  getPaymentAuditTrail(paymentId: string): Promise<readonly Payment['auditTrail'][0][]>;

  /**
   * Delete payment (soft delete)
   */
  delete(id: string): Promise<void>;

  /**
   * Check if transaction reference exists
   */
  existsByTransactionReference(transactionReference: string, agencyId: string): Promise<boolean>;

  /**
   * Get daily payment volume
   */
  getDailyVolume(
    agencyId: string,
    dateFrom: Date,
    dateTo: Date,
    gateway?: PaymentGateway
  ): Promise<
    Array<{
      date: Date;
      paymentCount: number;
      totalAmount: Money;
      successfulCount: number;
      failedCount: number;
    }>
  >;

  /**
   * Get top customers by payment volume
   */
  getTopCustomersByVolume(
    agencyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit?: number
  ): Promise<
    Array<{
      customerId: string;
      customerName: string;
      paymentCount: number;
      totalAmount: Money;
      averageAmount: Money;
    }>
  >;

  /**
   * Find overdue payments requiring attention
   */
  findOverduePayments(agencyId: string, overdueDays: number, limit?: number): Promise<readonly Payment[]>;

  /**
   * Bulk update payment status
   */
  bulkUpdateStatus(paymentIds: string[], status: PaymentStatus, updatedBy: string, notes?: string): Promise<number>;
}
