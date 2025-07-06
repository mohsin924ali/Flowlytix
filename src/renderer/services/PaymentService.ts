/**
 * Payment Service
 * Service layer for payment management operations
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Payment Management
 * @architecture Service Layer Pattern
 * @version 1.0.0
 */

import { z } from 'zod';
import {
  Payment,
  PaymentId,
  CustomerId,
  UserId,
  CreatePaymentData,
  CreatePaymentSchema,
  PaymentStatus,
  PaymentMethod,
  PaymentMethodUtils,
  PaymentStatusUtils,
  Money,
  Currency,
  PaymentBusinessRules,
  PaymentErrorCodes,
  PaymentDomainUtils,
  PaymentFormatters,
} from '../domains/payment';
import type {
  PaymentRecord,
  PaymentListItem,
  PaymentFilters,
  PaymentListResponse,
  PaymentAnalytics,
  DailyPaymentSummary,
  TopPayingCustomer,
  PaymentRecordForm,
  PaymentRecordFormSchema,
  ApiResponse,
} from '../domains/payment';

/**
 * Payment processing result interface
 */
export interface PaymentProcessingResult {
  readonly success: boolean;
  readonly paymentId: string;
  readonly message: string;
  readonly processingTime: number;
  readonly transactionReference?: string;
}

/**
 * Payment refund request interface
 */
export interface PaymentRefundRequest {
  readonly paymentId: string;
  readonly refundAmount?: number;
  readonly reason: string;
  readonly refundedBy: string;
  readonly notifyCustomer?: boolean;
}

/**
 * Payment validation result interface
 */
export interface PaymentValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly suggestions: string[];
}

/**
 * Payment batch processing interface
 */
export interface PaymentBatchProcessing {
  readonly batchId: string;
  readonly totalPayments: number;
  readonly processedPayments: number;
  readonly failedPayments: number;
  readonly status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly errors: string[];
}

/**
 * Payment audit log entry interface
 */
export interface PaymentAuditLogEntry {
  readonly id: string;
  readonly paymentId: string;
  readonly action: string;
  readonly oldValue?: any;
  readonly newValue?: any;
  readonly performedBy: string;
  readonly performedAt: Date;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly notes?: string;
}

/**
 * Payment Service
 *
 * Handles all payment-related operations including CRUD operations,
 * business logic, validation, and integration with payment processors.
 * Follows Domain-Driven Design principles with proper error handling.
 */
export class PaymentService {
  private static readonly BASE_DELAY = 300; // Reduced for better UX
  private static readonly PAYMENT_TIMEOUT = PaymentBusinessRules.PAYMENT_PROCESSING_TIMEOUT_MS;
  private static readonly BATCH_SIZE = PaymentBusinessRules.PAYMENT_BATCH_SIZE || 100;

  /**
   * Simulate processing delay (for mock implementation)
   */
  private static delay(ms: number = PaymentService.BASE_DELAY): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get payments with filtering and pagination
   */
  static async getPayments(
    agencyId: string,
    page: number = 1,
    limit: number = 25,
    filters: PaymentFilters = {}
  ): Promise<PaymentListResponse> {
    try {
      await PaymentService.delay(200); // Quick response for good UX

      // Validate inputs
      if (!agencyId || agencyId.trim().length === 0) {
        throw new Error('Agency ID is required');
      }

      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 25;

      // Mock implementation - in production, this would call actual API/database
      const mockPayments = PaymentService.generateMockPayments(agencyId, filters);

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPayments = mockPayments.slice(startIndex, endIndex);

      // Convert to list items with UI-friendly properties
      const paymentListItems: PaymentListItem[] = paginatedPayments.map((payment) => ({
        id: payment.id,
        customerId: payment.customerId,
        customerName: payment.customerName,
        amount: payment.amount,
        currency: payment.currency,
        formattedAmount: PaymentFormatters.formatCurrency(payment.amount, payment.currency),
        paymentMethod: payment.paymentMethod,
        paymentMethodText: PaymentMethodUtils.getMethodText(payment.paymentMethod),
        status: payment.status,
        statusText: PaymentStatusUtils.getStatusText(payment.status),
        statusColor: PaymentStatusUtils.getStatusColor(payment.status),
        reference: PaymentFormatters.formatPaymentReference(payment),
        createdAt: payment.createdAt,
        agencyId: payment.agencyId,
        isRecent: PaymentService.isRecentPayment(payment.createdAt),
        canEdit: PaymentService.canEditPayment(payment.status),
        canCancel: PaymentService.canCancelPayment(payment.status),
        canRefund: PaymentService.canRefundPayment(payment.status),
      }));

      const total = mockPayments.length;
      const totalPages = Math.ceil(total / limit);

      return {
        payments: paymentListItems,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      console.error('PaymentService.getPayments error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve payments');
    }
  }

  /**
   * Get payment by ID
   */
  static async getPaymentById(paymentId: string): Promise<PaymentRecord | null> {
    try {
      await PaymentService.delay(150);

      if (!paymentId || paymentId.trim().length === 0) {
        throw new Error('Payment ID is required');
      }

      // Mock implementation - in production, this would call actual API/database
      const mockPayment = PaymentService.generateMockPaymentById(paymentId);
      return mockPayment;
    } catch (error) {
      console.error('PaymentService.getPaymentById error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve payment');
    }
  }

  /**
   * Record a new payment
   */
  static async recordPayment(data: PaymentRecordForm, createdBy: string, agencyId: string): Promise<PaymentRecord> {
    try {
      // Validate input data
      const validatedData = PaymentRecordFormSchema.parse(data);

      if (!createdBy || createdBy.trim().length === 0) {
        throw new Error('Created by user ID is required');
      }

      if (!agencyId || agencyId.trim().length === 0) {
        throw new Error('Agency ID is required');
      }

      // Validate payment amount
      if (!PaymentDomainUtils.validatePaymentAmount(validatedData.amount)) {
        throw new Error(
          `Payment amount must be between ${PaymentBusinessRules.MINIMUM_PAYMENT_AMOUNT} and ${PaymentBusinessRules.MAXIMUM_PAYMENT_AMOUNT}`
        );
      }

      // Create payment using domain entity
      const paymentData: CreatePaymentData = {
        customerId: validatedData.customerId,
        customerName: validatedData.customerName,
        amount: validatedData.amount,
        currency: 'USD', // Default currency - could be configurable
        paymentMethod: validatedData.paymentMethod,
        metadata: {
          reference: validatedData.reference,
          notes: validatedData.notes,
          orderId: validatedData.orderId,
          invoiceId: validatedData.invoiceId,
          cashDrawerId: validatedData.cashDrawerId,
          bankAccount: validatedData.bankAccount,
          checkNumber: validatedData.checkNumber,
          tags: validatedData.tags,
        },
        createdBy,
        agencyId,
      };

      const payment = Payment.create(paymentData);

      // Simulate processing time based on payment method
      const processingTime = PaymentMethodUtils.isImmediate(validatedData.paymentMethod) ? 500 : 1500;
      await PaymentService.delay(processingTime);

      // Auto-confirm immediate payment methods
      let finalPayment = payment;
      if (PaymentMethodUtils.isImmediate(validatedData.paymentMethod)) {
        finalPayment = payment
          .markAsReceived(UserId.fromString(createdBy))
          .markAsConfirmed(UserId.fromString(createdBy));
      }

      // Convert to record format
      const paymentRecord: PaymentRecord = {
        id: finalPayment.id.toString(),
        customerId: finalPayment.customerId.toString(),
        customerName: finalPayment.customerName,
        amount: finalPayment.amount.amount,
        currency: finalPayment.amount.currency,
        paymentMethod: finalPayment.paymentMethod,
        status: finalPayment.status,
        metadata: finalPayment.metadata,
        createdBy: finalPayment.createdBy.toString(),
        createdAt: finalPayment.createdAt,
        updatedBy: finalPayment.updatedBy?.toString(),
        updatedAt: finalPayment.updatedAt,
        agencyId: finalPayment.agencyId,
        version: finalPayment.version,
      };

      // Log audit trail
      await PaymentService.logAuditEntry({
        id: `audit_${Date.now()}`,
        paymentId: paymentRecord.id,
        action: 'PAYMENT_RECORDED',
        newValue: paymentRecord,
        performedBy: createdBy,
        performedAt: new Date(),
        notes: `Payment recorded for customer ${validatedData.customerName}`,
      });

      return paymentRecord;
    } catch (error) {
      console.error('PaymentService.recordPayment error:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(', ')}`);
      }
      throw new Error(error instanceof Error ? error.message : 'Failed to record payment');
    }
  }

  /**
   * Update payment information
   */
  static async updatePayment(
    paymentId: string,
    updates: Partial<PaymentRecordForm>,
    updatedBy: string
  ): Promise<PaymentRecord> {
    try {
      await PaymentService.delay(400);

      if (!paymentId || paymentId.trim().length === 0) {
        throw new Error('Payment ID is required');
      }

      if (!updatedBy || updatedBy.trim().length === 0) {
        throw new Error('Updated by user ID is required');
      }

      // Get existing payment
      const existingPayment = await PaymentService.getPaymentById(paymentId);
      if (!existingPayment) {
        throw new Error('Payment not found');
      }

      // Check if payment can be updated
      if (PaymentStatusUtils.isFinalStatus(existingPayment.status)) {
        throw new Error('Cannot update payment with final status');
      }

      // Validate updates
      if (updates.amount !== undefined && !PaymentDomainUtils.validatePaymentAmount(updates.amount)) {
        throw new Error(
          `Payment amount must be between ${PaymentBusinessRules.MINIMUM_PAYMENT_AMOUNT} and ${PaymentBusinessRules.MAXIMUM_PAYMENT_AMOUNT}`
        );
      }

      // Apply updates (mock implementation)
      const updatedPayment: PaymentRecord = {
        ...existingPayment,
        ...updates,
        updatedBy,
        updatedAt: new Date(),
        version: existingPayment.version + 1,
      };

      // Log audit trail
      await PaymentService.logAuditEntry({
        id: `audit_${Date.now()}`,
        paymentId: paymentId,
        action: 'PAYMENT_UPDATED',
        oldValue: existingPayment,
        newValue: updatedPayment,
        performedBy: updatedBy,
        performedAt: new Date(),
        notes: `Payment updated by ${updatedBy}`,
      });

      return updatedPayment;
    } catch (error) {
      console.error('PaymentService.updatePayment error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update payment');
    }
  }

  /**
   * Cancel payment
   */
  static async cancelPayment(paymentId: string, reason: string, cancelledBy: string): Promise<PaymentRecord> {
    try {
      await PaymentService.delay(600);

      if (!paymentId || paymentId.trim().length === 0) {
        throw new Error('Payment ID is required');
      }

      if (!reason || reason.trim().length === 0) {
        throw new Error('Cancellation reason is required');
      }

      if (!cancelledBy || cancelledBy.trim().length === 0) {
        throw new Error('Cancelled by user ID is required');
      }

      // Get existing payment
      const existingPayment = await PaymentService.getPaymentById(paymentId);
      if (!existingPayment) {
        throw new Error('Payment not found');
      }

      // Check if payment can be cancelled
      if (!PaymentService.canCancelPayment(existingPayment.status)) {
        throw new Error(`Cannot cancel payment with status: ${existingPayment.status}`);
      }

      // Update payment status to cancelled
      const cancelledPayment: PaymentRecord = {
        ...existingPayment,
        status: PaymentStatus.CANCELLED,
        metadata: {
          ...existingPayment.metadata,
          notes: `${existingPayment.metadata.notes || ''}\n[CANCELLED] ${reason}`.trim(),
        },
        updatedBy: cancelledBy,
        updatedAt: new Date(),
        version: existingPayment.version + 1,
      };

      // Log audit trail
      await PaymentService.logAuditEntry({
        id: `audit_${Date.now()}`,
        paymentId: paymentId,
        action: 'PAYMENT_CANCELLED',
        oldValue: existingPayment,
        newValue: cancelledPayment,
        performedBy: cancelledBy,
        performedAt: new Date(),
        notes: `Payment cancelled: ${reason}`,
      });

      return cancelledPayment;
    } catch (error) {
      console.error('PaymentService.cancelPayment error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to cancel payment');
    }
  }

  /**
   * Process payment refund
   */
  static async refundPayment(request: PaymentRefundRequest): Promise<PaymentRecord> {
    try {
      await PaymentService.delay(800);

      if (!request.paymentId || request.paymentId.trim().length === 0) {
        throw new Error('Payment ID is required');
      }

      if (!request.reason || request.reason.trim().length === 0) {
        throw new Error('Refund reason is required');
      }

      if (!request.refundedBy || request.refundedBy.trim().length === 0) {
        throw new Error('Refunded by user ID is required');
      }

      // Get existing payment
      const existingPayment = await PaymentService.getPaymentById(request.paymentId);
      if (!existingPayment) {
        throw new Error('Payment not found');
      }

      // Check if payment can be refunded
      if (!PaymentService.canRefundPayment(existingPayment.status)) {
        throw new Error(`Cannot refund payment with status: ${existingPayment.status}`);
      }

      // Check refund window
      if (!PaymentDomainUtils.isWithinRefundWindow(existingPayment.createdAt)) {
        throw new Error(`Refund window of ${PaymentBusinessRules.REFUND_WINDOW_DAYS} days has expired`);
      }

      // Validate refund amount
      const refundAmount = request.refundAmount || existingPayment.amount;
      if (refundAmount > existingPayment.amount) {
        throw new Error('Refund amount cannot exceed original payment amount');
      }

      // Process refund
      const refundedPayment: PaymentRecord = {
        ...existingPayment,
        status: PaymentStatus.REFUNDED,
        metadata: {
          ...existingPayment.metadata,
          notes:
            `${existingPayment.metadata.notes || ''}\n[REFUNDED] ${request.reason} - Amount: ${PaymentFormatters.formatCurrency(refundAmount, existingPayment.currency)}`.trim(),
        },
        updatedBy: request.refundedBy,
        updatedAt: new Date(),
        version: existingPayment.version + 1,
      };

      // Log audit trail
      await PaymentService.logAuditEntry({
        id: `audit_${Date.now()}`,
        paymentId: request.paymentId,
        action: 'PAYMENT_REFUNDED',
        oldValue: existingPayment,
        newValue: refundedPayment,
        performedBy: request.refundedBy,
        performedAt: new Date(),
        notes: `Payment refunded: ${request.reason} - Amount: ${PaymentFormatters.formatCurrency(refundAmount, existingPayment.currency)}`,
      });

      return refundedPayment;
    } catch (error) {
      console.error('PaymentService.refundPayment error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to process refund');
    }
  }

  /**
   * Get payment analytics
   */
  static async getPaymentAnalytics(agencyId: string, dateFrom: Date, dateTo: Date): Promise<PaymentAnalytics> {
    try {
      await PaymentService.delay(800);

      if (!agencyId || agencyId.trim().length === 0) {
        throw new Error('Agency ID is required');
      }

      if (dateFrom > dateTo) {
        throw new Error('Date from cannot be greater than date to');
      }

      // Mock analytics data - in production, this would aggregate from database
      const mockAnalytics: PaymentAnalytics = {
        totalPayments: 1250,
        totalAmount: 487500.75,
        currency: 'USD',
        averagePaymentAmount: 390.0,
        paymentsByMethod: {
          [PaymentMethod.CASH]: 450,
          [PaymentMethod.CREDIT]: 380,
          [PaymentMethod.CREDIT_CARD]: 200,
          [PaymentMethod.BANK_TRANSFER]: 150,
          [PaymentMethod.CHECK]: 50,
          [PaymentMethod.DEBIT_CARD]: 20,
          [PaymentMethod.MOBILE_PAYMENT]: 0,
          [PaymentMethod.DIGITAL_WALLET]: 0,
        },
        paymentsByStatus: {
          [PaymentStatus.CONFIRMED]: 1000,
          [PaymentStatus.PENDING]: 150,
          [PaymentStatus.PROCESSING]: 50,
          [PaymentStatus.RECEIVED]: 30,
          [PaymentStatus.FAILED]: 15,
          [PaymentStatus.CANCELLED]: 5,
          [PaymentStatus.REFUNDED]: 0,
          [PaymentStatus.PARTIAL]: 0,
          [PaymentStatus.OVERPAID]: 0,
        },
        dailyPayments: PaymentService.generateDailyPaymentSummary(dateFrom, dateTo),
        topCustomers: PaymentService.generateTopPayingCustomers(),
        pendingPayments: 200,
        overduePayments: 45,
        agencyId,
        periodStart: dateFrom,
        periodEnd: dateTo,
        generatedAt: new Date(),
      };

      return mockAnalytics;
    } catch (error) {
      console.error('PaymentService.getPaymentAnalytics error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve payment analytics');
    }
  }

  /**
   * Validate payment data
   */
  static async validatePayment(data: PaymentRecordForm): Promise<PaymentValidationResult> {
    try {
      await PaymentService.delay(100);

      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      // Basic validation
      try {
        PaymentRecordFormSchema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(...error.errors.map((e) => e.message));
        }
      }

      // Business rule validation
      if (!PaymentDomainUtils.validatePaymentAmount(data.amount)) {
        errors.push(
          `Payment amount must be between ${PaymentBusinessRules.MINIMUM_PAYMENT_AMOUNT} and ${PaymentBusinessRules.MAXIMUM_PAYMENT_AMOUNT}`
        );
      }

      // Method-specific validation
      if (data.paymentMethod === PaymentMethod.CHECK && !data.checkNumber) {
        warnings.push('Check number is recommended for check payments');
      }

      if (data.paymentMethod === PaymentMethod.BANK_TRANSFER && !data.bankAccount) {
        warnings.push('Bank account information is recommended for bank transfers');
      }

      // Amount-based suggestions
      if (data.amount > 10000) {
        suggestions.push('Consider requiring manager approval for large payments');
      }

      if (data.amount < 1) {
        warnings.push('Very small payment amount detected');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
      };
    } catch (error) {
      console.error('PaymentService.validatePayment error:', error);
      return {
        isValid: false,
        errors: ['Validation service error'],
        warnings: [],
        suggestions: [],
      };
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Check if payment is recent (within last 24 hours)
   */
  private static isRecentPayment(createdAt: Date): boolean {
    const now = new Date();
    const diffTime = now.getTime() - createdAt.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  /**
   * Check if payment can be edited
   */
  private static canEditPayment(status: PaymentStatus): boolean {
    return [PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(status);
  }

  /**
   * Check if payment can be cancelled
   */
  private static canCancelPayment(status: PaymentStatus): boolean {
    return [PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(status);
  }

  /**
   * Check if payment can be refunded
   */
  private static canRefundPayment(status: PaymentStatus): boolean {
    return [PaymentStatus.RECEIVED, PaymentStatus.CONFIRMED].includes(status);
  }

  /**
   * Generate mock payments for testing (would be replaced with actual data access)
   */
  private static generateMockPayments(agencyId: string, filters: PaymentFilters): PaymentRecord[] {
    // Mock implementation - in production, this would query actual database
    const mockPayments: PaymentRecord[] = [];

    for (let i = 1; i <= 100; i++) {
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      mockPayments.push({
        id: `pay_${Date.now()}_${i}`,
        customerId: `cust_${Math.floor(Math.random() * 50) + 1}`,
        customerName: `Customer ${Math.floor(Math.random() * 50) + 1}`,
        amount: Math.round((Math.random() * 5000 + 100) * 100) / 100,
        currency: 'USD',
        paymentMethod: Object.values(PaymentMethod)[Math.floor(Math.random() * Object.values(PaymentMethod).length)],
        status: Object.values(PaymentStatus)[Math.floor(Math.random() * Object.values(PaymentStatus).length)],
        metadata: {
          reference: `REF-${i.toString().padStart(6, '0')}`,
          notes: Math.random() > 0.5 ? `Payment note for transaction ${i}` : undefined,
        },
        createdBy: `user_${Math.floor(Math.random() * 10) + 1}`,
        createdAt,
        agencyId,
        version: 1,
      });
    }

    return mockPayments;
  }

  /**
   * Generate mock payment by ID
   */
  private static generateMockPaymentById(paymentId: string): PaymentRecord | null {
    // Mock implementation
    return {
      id: paymentId,
      customerId: 'cust_1',
      customerName: 'Mock Customer',
      amount: 1500.0,
      currency: 'USD',
      paymentMethod: PaymentMethod.CASH,
      status: PaymentStatus.CONFIRMED,
      metadata: {
        reference: 'REF-001234',
        notes: 'Mock payment for testing',
      },
      createdBy: 'user_1',
      createdAt: new Date(),
      agencyId: 'agency_1',
      version: 1,
    };
  }

  /**
   * Generate daily payment summary for analytics
   */
  private static generateDailyPaymentSummary(dateFrom: Date, dateTo: Date): DailyPaymentSummary[] {
    const summaries: DailyPaymentSummary[] = [];
    const currentDate = new Date(dateFrom);

    while (currentDate <= dateTo) {
      summaries.push({
        date: new Date(currentDate),
        totalPayments: Math.floor(Math.random() * 50) + 10,
        totalAmount: Math.round((Math.random() * 25000 + 5000) * 100) / 100,
        cashPayments: Math.floor(Math.random() * 30) + 5,
        creditPayments: Math.floor(Math.random() * 20) + 5,
        averageAmount: Math.round((Math.random() * 500 + 100) * 100) / 100,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return summaries;
  }

  /**
   * Generate top paying customers for analytics
   */
  private static generateTopPayingCustomers(): TopPayingCustomer[] {
    const customers: TopPayingCustomer[] = [];

    for (let i = 1; i <= 10; i++) {
      customers.push({
        customerId: `cust_${i}`,
        customerName: `Top Customer ${i}`,
        totalPaid: Math.round((Math.random() * 50000 + 10000) * 100) / 100,
        paymentCount: Math.floor(Math.random() * 100) + 20,
        averagePayment: Math.round((Math.random() * 1000 + 200) * 100) / 100,
        lastPaymentDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        rank: i,
      });
    }

    return customers.sort((a, b) => b.totalPaid - a.totalPaid);
  }

  /**
   * Log audit entry for payment actions
   */
  private static async logAuditEntry(entry: PaymentAuditLogEntry): Promise<void> {
    try {
      // Mock implementation - in production, this would save to audit log
      console.log('Payment Audit Log:', entry);
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw error for audit logging failures
    }
  }
}

export default PaymentService;
