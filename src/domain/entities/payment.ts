/**
 * Payment Entity
 *
 * Represents payment transactions in the goods distribution system.
 * Core aggregate root for payment processing including transaction management,
 * gateway integration, status tracking, and audit trail.
 *
 * Business Rules:
 * - Payments must have unique transaction reference
 * - Payment amounts must be positive and match order totals
 * - Payment status transitions must follow business workflow
 * - Gateway responses must be validated and recorded
 * - Payment retries must be limited and tracked
 * - Refunds cannot exceed original payment amount
 * - Payment methods must be supported by configured gateways
 * - Currency must match order currency
 *
 * @domain Order Management - Payment Processing
 * @version 1.0.0
 */

import { Money, CurrencyCode } from '../value-objects/money';
import { PaymentMethod } from './order';

/**
 * Payment status enumeration
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

/**
 * Payment transaction type enumeration
 */
export enum PaymentTransactionType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  AUTHORIZATION = 'AUTHORIZATION',
  CAPTURE = 'CAPTURE',
  VOID = 'VOID',
}

/**
 * Payment gateway enumeration
 */
export enum PaymentGateway {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  SQUARE = 'SQUARE',
  INTERNAL_CASH = 'INTERNAL_CASH',
  INTERNAL_CREDIT = 'INTERNAL_CREDIT',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

/**
 * Payment action types for audit trail
 */
export enum PaymentActionType {
  INITIATE_PAYMENT = 'INITIATE_PAYMENT',
  PROCESS_PAYMENT = 'PROCESS_PAYMENT',
  COMPLETE_PAYMENT = 'COMPLETE_PAYMENT',
  FAIL_PAYMENT = 'FAIL_PAYMENT',
  CANCEL_PAYMENT = 'CANCEL_PAYMENT',
  INITIATE_REFUND = 'INITIATE_REFUND',
  COMPLETE_REFUND = 'COMPLETE_REFUND',
  RETRY_PAYMENT = 'RETRY_PAYMENT',
  GATEWAY_CALLBACK = 'GATEWAY_CALLBACK',
}

/**
 * Gateway response interface
 */
export interface GatewayResponse {
  readonly success: boolean;
  readonly transactionId: string;
  readonly gatewayTransactionId?: string;
  readonly message?: string;
  readonly errorCode?: string;
  readonly rawResponse?: Record<string, any>;
  readonly processedAt: Date;
}

/**
 * Payment audit entry for tracking payment workflow steps
 */
export interface PaymentAuditEntry {
  readonly actionType: PaymentActionType;
  readonly previousStatus: PaymentStatus;
  readonly newStatus: PaymentStatus;
  readonly performedBy: string;
  readonly performedAt: Date;
  readonly notes?: string;
  readonly gatewayResponse?: GatewayResponse;
  readonly metadata?: Record<string, any>;
}

/**
 * Payment retry information
 */
export interface PaymentRetryInfo {
  readonly attemptNumber: number;
  readonly maxAttempts: number;
  readonly nextRetryAt?: Date;
  readonly lastFailureReason?: string;
  readonly backoffMultiplier: number;
}

/**
 * Payment creation properties
 */
export interface PaymentProps {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly amount: Money;
  readonly paymentMethod: PaymentMethod;
  readonly gateway: PaymentGateway;
  readonly transactionReference: string;
  readonly description?: string;
  readonly metadata?: Record<string, any>;
  readonly agencyId: string;
  readonly initiatedBy: string;
}

/**
 * Payment persistence interface
 */
export interface PaymentPersistence {
  readonly id: string;
  readonly orderId: string;
  readonly orderNumber: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly amount: number;
  readonly currency: CurrencyCode;
  readonly paymentMethod: PaymentMethod;
  readonly gateway: PaymentGateway;
  readonly status: PaymentStatus;
  readonly transactionType: PaymentTransactionType;
  readonly transactionReference: string;
  readonly gatewayTransactionId: string | null;
  readonly description: string | null;
  readonly metadata: Record<string, any> | null;
  readonly retryInfo: PaymentRetryInfo | null;
  readonly agencyId: string;
  readonly initiatedBy: string;
  readonly initiatedAt: Date;
  readonly processedAt: Date | null;
  readonly completedAt: Date | null;
  readonly updatedBy: string | null;
  readonly updatedAt: Date | null;
  readonly auditTrail: readonly PaymentAuditEntry[];
}

/**
 * Custom error classes for Payment domain
 */
export class PaymentDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'PaymentDomainError';
  }
}

export class PaymentValidationError extends PaymentDomainError {
  constructor(message: string) {
    super(message, 'PAYMENT_VALIDATION_ERROR');
  }
}

export class InvalidPaymentAmountError extends PaymentValidationError {
  constructor(amount: number) {
    super(`Invalid payment amount: ${amount}. Amount must be positive.`);
  }
}

export class PaymentStatusError extends PaymentDomainError {
  constructor(message: string, status?: PaymentStatus) {
    super(message, 'PAYMENT_STATUS_ERROR');
    if (status) {
      this.message += ` Current status: ${status}`;
    }
  }
}

export class PaymentGatewayError extends PaymentDomainError {
  constructor(message: string, gateway: PaymentGateway, gatewayError?: string) {
    super(`Gateway ${gateway} error: ${message}`, 'PAYMENT_GATEWAY_ERROR');
    if (gatewayError) {
      this.message += ` Gateway error: ${gatewayError}`;
    }
  }
}

export class PaymentRetryLimitExceededError extends PaymentDomainError {
  constructor(maxAttempts: number) {
    super(`Payment retry limit exceeded. Maximum attempts: ${maxAttempts}`, 'PAYMENT_RETRY_LIMIT_EXCEEDED');
  }
}

export class InvalidRefundAmountError extends PaymentValidationError {
  constructor(refundAmount: number, originalAmount: number, alreadyRefunded: number) {
    super(
      `Invalid refund amount: ${refundAmount}. Cannot exceed remaining refundable amount: ${originalAmount - alreadyRefunded}`
    );
  }
}

/**
 * Payment Entity
 */
export class Payment {
  private _id: string;
  private _orderId: string;
  private _orderNumber: string;
  private _customerId: string;
  private _customerName: string;
  private _amount: Money;
  private _paymentMethod: PaymentMethod;
  private _gateway: PaymentGateway;
  private _status: PaymentStatus;
  private _transactionType: PaymentTransactionType;
  private _transactionReference: string;
  private _gatewayTransactionId: string | null;
  private _description: string | null;
  private _metadata: Record<string, any> | null;
  private _retryInfo: PaymentRetryInfo | null;
  private _agencyId: string;
  private _initiatedBy: string;
  private _initiatedAt: Date;
  private _processedAt: Date | null;
  private _completedAt: Date | null;
  private _updatedBy: string | null;
  private _updatedAt: Date | null;
  private _auditTrail: PaymentAuditEntry[];

  private constructor(props: PaymentProps, id?: string, skipValidationAndFreeze = false) {
    this._id = id || this.generateId();
    this._orderId = props.orderId;
    this._orderNumber = props.orderNumber;
    this._customerId = props.customerId;
    this._customerName = props.customerName;
    this._amount = props.amount;
    this._paymentMethod = props.paymentMethod;
    this._gateway = props.gateway;
    this._status = PaymentStatus.PENDING;
    this._transactionType = PaymentTransactionType.PAYMENT;
    this._transactionReference = props.transactionReference;
    this._gatewayTransactionId = null;
    this._description = props.description || null;
    this._metadata = props.metadata || null;
    this._retryInfo = null;
    this._agencyId = props.agencyId;
    this._initiatedBy = props.initiatedBy;
    this._initiatedAt = new Date();
    this._processedAt = null;
    this._completedAt = null;
    this._updatedBy = null;
    this._updatedAt = null;
    this._auditTrail = [];

    if (!skipValidationAndFreeze) {
      this.validate();
      Object.freeze(this);
    }
  }

  /**
   * Create new payment
   */
  public static create(props: PaymentProps): Payment {
    return new Payment(props);
  }

  /**
   * Create payment from persistence data
   */
  public static fromPersistence(data: PaymentPersistence): Payment {
    const props: PaymentProps = {
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      amount: Money.fromDecimal(data.amount, data.currency),
      paymentMethod: data.paymentMethod,
      gateway: data.gateway,
      transactionReference: data.transactionReference,
      ...(data.description && { description: data.description }),
      ...(data.metadata && { metadata: data.metadata }),
      agencyId: data.agencyId,
      initiatedBy: data.initiatedBy,
    };

    const payment = new Payment(props, data.id, true);
    payment._status = data.status;
    payment._transactionType = data.transactionType;
    payment._gatewayTransactionId = data.gatewayTransactionId;
    payment._retryInfo = data.retryInfo;
    payment._initiatedAt = data.initiatedAt;
    payment._processedAt = data.processedAt;
    payment._completedAt = data.completedAt;
    payment._updatedBy = data.updatedBy;
    payment._updatedAt = data.updatedAt;
    payment._auditTrail = Array.isArray(data.auditTrail) ? [...data.auditTrail] : [];

    Object.freeze(payment);
    return payment;
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get orderId(): string {
    return this._orderId;
  }

  public get orderNumber(): string {
    return this._orderNumber;
  }

  public get customerId(): string {
    return this._customerId;
  }

  public get customerName(): string {
    return this._customerName;
  }

  public get amount(): Money {
    return this._amount;
  }

  public get paymentMethod(): PaymentMethod {
    return this._paymentMethod;
  }

  public get gateway(): PaymentGateway {
    return this._gateway;
  }

  public get status(): PaymentStatus {
    return this._status;
  }

  public get transactionType(): PaymentTransactionType {
    return this._transactionType;
  }

  public get transactionReference(): string {
    return this._transactionReference;
  }

  public get gatewayTransactionId(): string | null {
    return this._gatewayTransactionId;
  }

  public get description(): string | null {
    return this._description;
  }

  public get metadata(): Record<string, any> | null {
    return this._metadata;
  }

  public get retryInfo(): PaymentRetryInfo | null {
    return this._retryInfo;
  }

  public get agencyId(): string {
    return this._agencyId;
  }

  public get initiatedBy(): string {
    return this._initiatedBy;
  }

  public get initiatedAt(): Date {
    return this._initiatedAt;
  }

  public get processedAt(): Date | null {
    return this._processedAt;
  }

  public get completedAt(): Date | null {
    return this._completedAt;
  }

  public get updatedBy(): string | null {
    return this._updatedBy;
  }

  public get updatedAt(): Date | null {
    return this._updatedAt;
  }

  public get auditTrail(): readonly PaymentAuditEntry[] {
    return Object.freeze([...this._auditTrail]);
  }

  // Business Logic Methods

  /**
   * Check if payment can be processed
   */
  public canProcess(): boolean {
    return this._status === PaymentStatus.PENDING;
  }

  /**
   * Check if payment can be cancelled
   */
  public canCancel(): boolean {
    return [PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(this._status);
  }

  /**
   * Check if payment can be refunded
   */
  public canRefund(): boolean {
    return this._status === PaymentStatus.COMPLETED;
  }

  /**
   * Check if payment can be retried
   */
  public canRetry(): boolean {
    if (this._status !== PaymentStatus.FAILED) return false;
    if (!this._retryInfo) return true; // First retry
    return this._retryInfo.attemptNumber < this._retryInfo.maxAttempts;
  }

  /**
   * Validate payment status transition
   */
  private validateStatusTransition(newStatus: PaymentStatus): void {
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [PaymentStatus.PROCESSING, PaymentStatus.CANCELLED],
      [PaymentStatus.PROCESSING]: [PaymentStatus.COMPLETED, PaymentStatus.FAILED, PaymentStatus.CANCELLED],
      [PaymentStatus.COMPLETED]: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED],
      [PaymentStatus.FAILED]: [PaymentStatus.PROCESSING, PaymentStatus.CANCELLED], // For retries
      [PaymentStatus.CANCELLED]: [], // Terminal state
      [PaymentStatus.REFUNDED]: [], // Terminal state
      [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUNDED],
    };

    const allowedTransitions = validTransitions[this._status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new PaymentStatusError(
        `Invalid payment status transition from ${this._status} to ${newStatus}`,
        this._status
      );
    }
  }

  /**
   * Add payment audit entry
   */
  private addPaymentAudit(
    actionType: PaymentActionType,
    previousStatus: PaymentStatus,
    newStatus: PaymentStatus,
    userId: string,
    notes?: string,
    gatewayResponse?: GatewayResponse,
    metadata?: Record<string, any>
  ): void {
    const auditEntry: PaymentAuditEntry = {
      actionType,
      previousStatus,
      newStatus,
      performedBy: userId,
      performedAt: new Date(),
      ...(notes && { notes }),
      ...(gatewayResponse && { gatewayResponse }),
      ...(metadata && { metadata }),
    };
    this._auditTrail.push(auditEntry);
  }

  /**
   * Start payment processing
   */
  public startProcessing(userId: string, gatewayTransactionId?: string, notes?: string): Payment {
    if (!this.canProcess()) {
      throw new PaymentStatusError('Cannot start processing for this payment', this._status);
    }

    const updated = this.clone();
    const previousStatus = updated._status;

    updated._status = PaymentStatus.PROCESSING;
    updated._processedAt = new Date();
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    if (gatewayTransactionId) {
      updated._gatewayTransactionId = gatewayTransactionId;
    }

    // Add audit entry
    updated.addPaymentAudit(PaymentActionType.PROCESS_PAYMENT, previousStatus, PaymentStatus.PROCESSING, userId, notes);

    Object.freeze(updated);
    return updated;
  }

  /**
   * Complete payment successfully
   */
  public complete(userId: string, gatewayResponse: GatewayResponse, notes?: string): Payment {
    if (this._status !== PaymentStatus.PROCESSING) {
      throw new PaymentStatusError('Payment is not in processing status', this._status);
    }

    const updated = this.clone();
    const previousStatus = updated._status;

    updated._status = PaymentStatus.COMPLETED;
    updated._completedAt = new Date();
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    if (gatewayResponse.gatewayTransactionId) {
      updated._gatewayTransactionId = gatewayResponse.gatewayTransactionId;
    }

    // Add audit entry
    updated.addPaymentAudit(
      PaymentActionType.COMPLETE_PAYMENT,
      previousStatus,
      PaymentStatus.COMPLETED,
      userId,
      notes,
      gatewayResponse
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Fail payment
   */
  public fail(userId: string, gatewayResponse: GatewayResponse, notes?: string): Payment {
    if (this._status !== PaymentStatus.PROCESSING) {
      throw new PaymentStatusError('Payment is not in processing status', this._status);
    }

    const updated = this.clone();
    const previousStatus = updated._status;

    updated._status = PaymentStatus.FAILED;
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    // Initialize or update retry info
    if (!updated._retryInfo) {
      updated._retryInfo = {
        attemptNumber: 1,
        maxAttempts: 3,
        backoffMultiplier: 2,
        lastFailureReason: gatewayResponse.message || 'Unknown error',
      };
    } else {
      updated._retryInfo = {
        ...updated._retryInfo,
        attemptNumber: updated._retryInfo.attemptNumber + 1,
        lastFailureReason: gatewayResponse.message || 'Unknown error',
      };
    }

    // Calculate next retry time if retries are available
    if (updated.canRetry()) {
      const backoffMinutes = Math.pow(updated._retryInfo.backoffMultiplier, updated._retryInfo.attemptNumber - 1) * 5;
      updated._retryInfo = {
        ...updated._retryInfo,
        nextRetryAt: new Date(Date.now() + backoffMinutes * 60 * 1000),
      };
    }

    // Add audit entry
    updated.addPaymentAudit(
      PaymentActionType.FAIL_PAYMENT,
      previousStatus,
      PaymentStatus.FAILED,
      userId,
      notes,
      gatewayResponse
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Cancel payment
   */
  public cancel(userId: string, reason?: string): Payment {
    if (!this.canCancel()) {
      throw new PaymentStatusError('Cannot cancel payment in current status', this._status);
    }

    const updated = this.clone();
    const previousStatus = updated._status;

    updated._status = PaymentStatus.CANCELLED;
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    // Add audit entry
    updated.addPaymentAudit(PaymentActionType.CANCEL_PAYMENT, previousStatus, PaymentStatus.CANCELLED, userId, reason);

    Object.freeze(updated);
    return updated;
  }

  /**
   * Retry failed payment
   */
  public retry(userId: string, notes?: string): Payment {
    if (!this.canRetry()) {
      if (this._retryInfo && this._retryInfo.attemptNumber >= this._retryInfo.maxAttempts) {
        throw new PaymentRetryLimitExceededError(this._retryInfo.maxAttempts);
      }
      throw new PaymentStatusError('Cannot retry payment in current status', this._status);
    }

    const updated = this.clone();
    const previousStatus = updated._status;

    updated._status = PaymentStatus.PROCESSING;
    updated._processedAt = new Date();
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    // Update retry info
    if (updated._retryInfo) {
      const { nextRetryAt, ...retryInfoWithoutNextRetry } = updated._retryInfo;
      updated._retryInfo = retryInfoWithoutNextRetry;
    }

    // Add audit entry
    updated.addPaymentAudit(
      PaymentActionType.RETRY_PAYMENT,
      previousStatus,
      PaymentStatus.PROCESSING,
      userId,
      notes,
      undefined,
      { retryAttempt: updated._retryInfo?.attemptNumber || 1 }
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Create refund payment
   */
  public createRefund(refundAmount: Money, userId: string, reason?: string, metadata?: Record<string, any>): Payment {
    if (!this.canRefund()) {
      throw new PaymentStatusError('Cannot refund payment in current status', this._status);
    }

    if (refundAmount.greaterThan(this._amount)) {
      throw new InvalidRefundAmountError(refundAmount.decimalAmount, this._amount.decimalAmount, 0);
    }

    if (refundAmount.currency !== this._amount.currency) {
      throw new PaymentValidationError('Refund currency must match original payment currency');
    }

    // Create refund payment props
    const refundProps: PaymentProps = {
      orderId: this._orderId,
      orderNumber: this._orderNumber,
      customerId: this._customerId,
      customerName: this._customerName,
      amount: refundAmount,
      paymentMethod: this._paymentMethod,
      gateway: this._gateway,
      transactionReference: `REFUND-${this._transactionReference}-${Date.now()}`,
      description: `Refund for payment ${this._transactionReference}`,
      metadata: {
        originalPaymentId: this._id,
        refundReason: reason,
        ...metadata,
      },
      agencyId: this._agencyId,
      initiatedBy: userId,
    };

    const refundPayment = new Payment(refundProps, undefined, true);
    refundPayment._transactionType = refundAmount.equals(this._amount)
      ? PaymentTransactionType.REFUND
      : PaymentTransactionType.PARTIAL_REFUND;

    // Add audit entry to refund payment
    refundPayment.addPaymentAudit(
      PaymentActionType.INITIATE_REFUND,
      PaymentStatus.PENDING,
      PaymentStatus.PENDING,
      userId,
      reason,
      undefined,
      { originalPaymentId: this._id }
    );

    Object.freeze(refundPayment);
    return refundPayment;
  }

  /**
   * Handle gateway callback
   */
  public handleGatewayCallback(userId: string, gatewayResponse: GatewayResponse, notes?: string): Payment {
    const updated = this.clone();
    const previousStatus = updated._status;

    // Update gateway transaction ID if provided
    if (gatewayResponse.gatewayTransactionId) {
      updated._gatewayTransactionId = gatewayResponse.gatewayTransactionId;
    }

    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    // Add audit entry for callback
    updated.addPaymentAudit(
      PaymentActionType.GATEWAY_CALLBACK,
      previousStatus,
      updated._status,
      userId,
      notes,
      gatewayResponse
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Convert to persistence format
   */
  public toPersistence(): PaymentPersistence {
    return {
      id: this._id,
      orderId: this._orderId,
      orderNumber: this._orderNumber,
      customerId: this._customerId,
      customerName: this._customerName,
      amount: this._amount.decimalAmount,
      currency: this._amount.currency,
      paymentMethod: this._paymentMethod,
      gateway: this._gateway,
      status: this._status,
      transactionType: this._transactionType,
      transactionReference: this._transactionReference,
      gatewayTransactionId: this._gatewayTransactionId,
      description: this._description,
      metadata: this._metadata,
      retryInfo: this._retryInfo,
      agencyId: this._agencyId,
      initiatedBy: this._initiatedBy,
      initiatedAt: this._initiatedAt,
      processedAt: this._processedAt,
      completedAt: this._completedAt,
      updatedBy: this._updatedBy,
      updatedAt: this._updatedAt,
      auditTrail: this._auditTrail,
    };
  }

  /**
   * Get display information
   */
  public getDisplayInfo() {
    return {
      id: this._id,
      orderNumber: this._orderNumber,
      customerName: this._customerName,
      amount: this._amount.format(),
      paymentMethod: this._paymentMethod,
      gateway: this._gateway,
      status: this._status,
      transactionReference: this._transactionReference,
      initiatedAt: this._initiatedAt.toISOString(),
      completedAt: this._completedAt?.toISOString() || null,
    };
  }

  /**
   * Clone payment for immutability
   */
  private clone(): Payment {
    const props: PaymentProps = {
      orderId: this._orderId,
      orderNumber: this._orderNumber,
      customerId: this._customerId,
      customerName: this._customerName,
      amount: this._amount,
      paymentMethod: this._paymentMethod,
      gateway: this._gateway,
      transactionReference: this._transactionReference,
      ...(this._description && { description: this._description }),
      ...(this._metadata && { metadata: this._metadata }),
      agencyId: this._agencyId,
      initiatedBy: this._initiatedBy,
    };

    const cloned = new Payment(props, this._id, true);
    cloned._status = this._status;
    cloned._transactionType = this._transactionType;
    cloned._gatewayTransactionId = this._gatewayTransactionId;
    cloned._retryInfo = this._retryInfo ? { ...this._retryInfo } : null;
    cloned._initiatedAt = this._initiatedAt;
    cloned._processedAt = this._processedAt;
    cloned._completedAt = this._completedAt;
    cloned._updatedBy = this._updatedBy;
    cloned._updatedAt = this._updatedAt;
    cloned._auditTrail = [...this._auditTrail];

    return cloned;
  }

  /**
   * Generate unique payment ID
   */
  private generateId(): string {
    return `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate payment data
   */
  private validate(): void {
    this.validateAmount();
    this.validateTransactionReference();
    this.validateCustomerInfo();
    this.validateOrderInfo();
  }

  /**
   * Validate payment amount
   */
  private validateAmount(): void {
    if (this._amount.decimalAmount <= 0) {
      throw new InvalidPaymentAmountError(this._amount.decimalAmount);
    }
  }

  /**
   * Validate transaction reference
   */
  private validateTransactionReference(reference?: string): void {
    const ref = reference || this._transactionReference;
    if (!ref || ref.trim().length === 0) {
      throw new PaymentValidationError('Transaction reference is required');
    }
    if (ref.length > 100) {
      throw new PaymentValidationError('Transaction reference cannot exceed 100 characters');
    }
  }

  /**
   * Validate customer information
   */
  private validateCustomerInfo(): void {
    if (!this._customerId || this._customerId.trim().length === 0) {
      throw new PaymentValidationError('Customer ID is required');
    }
    if (!this._customerName || this._customerName.trim().length === 0) {
      throw new PaymentValidationError('Customer name is required');
    }
  }

  /**
   * Validate order information
   */
  private validateOrderInfo(): void {
    if (!this._orderId || this._orderId.trim().length === 0) {
      throw new PaymentValidationError('Order ID is required');
    }
    if (!this._orderNumber || this._orderNumber.trim().length === 0) {
      throw new PaymentValidationError('Order number is required');
    }
  }
}
