/**
 * Payment Entity
 *
 * Core payment entity with business logic and state management.
 * Following DDD principles with proper encapsulation and behavior.
 *
 * @domain Payment
 * @pattern Entity
 * @architecture Clean Architecture
 * @version 1.0.0
 */

import { z } from 'zod';
import Money from '../valueObjects/Money';
import { PaymentStatus, PaymentMethod, PaymentStatusUtils } from '../valueObjects/PaymentStatus';

/**
 * Payment ID value object
 */
export class PaymentId {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Payment ID cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: PaymentId): boolean {
    return this.value === other.value;
  }

  static generate(): PaymentId {
    return new PaymentId(`pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  static fromString(value: string): PaymentId {
    return new PaymentId(value);
  }
}

/**
 * Customer ID value object
 */
export class CustomerId {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Customer ID cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: CustomerId): boolean {
    return this.value === other.value;
  }

  static fromString(value: string): CustomerId {
    return new CustomerId(value);
  }
}

/**
 * User ID value object
 */
export class UserId {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('User ID cannot be empty');
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  static fromString(value: string): UserId {
    return new UserId(value);
  }
}

/**
 * Payment metadata interface
 */
export interface PaymentMetadata {
  orderId?: string;
  invoiceId?: string;
  reference?: string;
  notes?: string;
  source?: string;
  receivedBy?: string;
  receivedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  cashDrawerId?: string;
  bankAccount?: string;
  checkNumber?: string;
  transactionId?: string;
  verificationCode?: string;
  tags?: string[];
  attachments?: string[];
}

/**
 * Payment creation data interface
 */
export interface CreatePaymentData {
  readonly customerId: string;
  readonly customerName: string;
  readonly amount: number;
  readonly currency: string;
  readonly paymentMethod: PaymentMethod;
  readonly metadata: PaymentMetadata;
  readonly createdBy: string;
  readonly agencyId: string;
}

/**
 * Payment validation schema
 */
export const CreatePaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 letters'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  metadata: z
    .object({
      orderId: z.string().optional(),
      invoiceId: z.string().optional(),
      reference: z.string().optional(),
      notes: z.string().max(1000, 'Notes too long').optional(),
      source: z.string().optional(),
      cashDrawerId: z.string().optional(),
      bankAccount: z.string().optional(),
      checkNumber: z.string().optional(),
      transactionId: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
  createdBy: z.string().min(1, 'Created by is required'),
  agencyId: z.string().min(1, 'Agency ID is required'),
});

/**
 * Payment Entity
 *
 * Represents a payment transaction with full lifecycle management.
 * Encapsulates business rules and state transitions.
 */
export class Payment {
  private constructor(
    private readonly _id: PaymentId,
    private readonly _customerId: CustomerId,
    private readonly _customerName: string,
    private readonly _amount: Money,
    private readonly _paymentMethod: PaymentMethod,
    private _status: PaymentStatus,
    private _metadata: PaymentMetadata,
    private readonly _createdBy: UserId,
    private readonly _createdAt: Date,
    private readonly _agencyId: string,
    private _updatedBy?: UserId,
    private _updatedAt?: Date,
    private _version: number = 1
  ) {}

  /**
   * Create new payment
   */
  static create(data: CreatePaymentData): Payment {
    // Validate input data
    const validatedData = CreatePaymentSchema.parse(data);

    // Filter out undefined values from metadata
    const metadata: PaymentMetadata = {};
    if (validatedData.metadata) {
      Object.entries(validatedData.metadata).forEach(([key, value]) => {
        if (value !== undefined) {
          (metadata as any)[key] = value;
        }
      });
    }

    return new Payment(
      PaymentId.generate(),
      CustomerId.fromString(validatedData.customerId),
      validatedData.customerName,
      Money.fromDecimal(validatedData.amount, validatedData.currency),
      validatedData.paymentMethod,
      PaymentStatus.PENDING,
      metadata,
      UserId.fromString(validatedData.createdBy),
      new Date(),
      validatedData.agencyId
    );
  }

  /**
   * Reconstitute payment from persistence
   */
  static fromPersistence(data: {
    id: string;
    customerId: string;
    customerName: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    status: PaymentStatus;
    metadata: PaymentMetadata;
    createdBy: string;
    createdAt: Date;
    agencyId: string;
    updatedBy?: string;
    updatedAt?: Date;
    version?: number;
  }): Payment {
    return new Payment(
      PaymentId.fromString(data.id),
      CustomerId.fromString(data.customerId),
      data.customerName,
      Money.fromDecimal(data.amount, data.currency),
      data.paymentMethod,
      data.status,
      data.metadata,
      UserId.fromString(data.createdBy),
      data.createdAt,
      data.agencyId,
      data.updatedBy ? UserId.fromString(data.updatedBy) : undefined,
      data.updatedAt,
      data.version || 1
    );
  }

  // Getters
  get id(): PaymentId {
    return this._id;
  }

  get customerId(): CustomerId {
    return this._customerId;
  }

  get customerName(): string {
    return this._customerName;
  }

  get amount(): Money {
    return this._amount;
  }

  get paymentMethod(): PaymentMethod {
    return this._paymentMethod;
  }

  get status(): PaymentStatus {
    return this._status;
  }

  get metadata(): PaymentMetadata {
    return this._metadata;
  }

  get createdBy(): UserId {
    return this._createdBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get agencyId(): string {
    return this._agencyId;
  }

  get updatedBy(): UserId | undefined {
    return this._updatedBy;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }

  get version(): number {
    return this._version;
  }

  // Business logic methods

  /**
   * Mark payment as received
   */
  markAsReceived(receivedBy: UserId, receivedAt: Date = new Date()): Payment {
    this.ensureCanTransitionTo(PaymentStatus.RECEIVED);

    const newPayment = this.clone();
    newPayment._status = PaymentStatus.RECEIVED;
    newPayment._updatedBy = receivedBy;
    newPayment._updatedAt = receivedAt;
    newPayment._version += 1;

    // Update metadata
    newPayment._metadata.receivedBy = receivedBy.toString();
    newPayment._metadata.receivedAt = receivedAt;

    return newPayment;
  }

  /**
   * Mark payment as confirmed
   */
  markAsConfirmed(confirmedBy: UserId, confirmedAt: Date = new Date()): Payment {
    this.ensureCanTransitionTo(PaymentStatus.CONFIRMED);

    const newPayment = this.clone();
    newPayment._status = PaymentStatus.CONFIRMED;
    newPayment._updatedBy = confirmedBy;
    newPayment._updatedAt = confirmedAt;
    newPayment._version += 1;

    return newPayment;
  }

  /**
   * Mark payment as failed
   */
  markAsFailed(failedBy: UserId, reason: string, failedAt: Date = new Date()): Payment {
    this.ensureCanTransitionTo(PaymentStatus.FAILED);

    const newPayment = this.clone();
    newPayment._status = PaymentStatus.FAILED;
    newPayment._updatedBy = failedBy;
    newPayment._updatedAt = failedAt;
    newPayment._version += 1;

    // Update metadata with failure reason
    newPayment._metadata.notes = reason;

    return newPayment;
  }

  /**
   * Cancel payment
   */
  cancel(cancelledBy: UserId, reason: string, cancelledAt: Date = new Date()): Payment {
    this.ensureCanTransitionTo(PaymentStatus.CANCELLED);

    const newPayment = this.clone();
    newPayment._status = PaymentStatus.CANCELLED;
    newPayment._updatedBy = cancelledBy;
    newPayment._updatedAt = cancelledAt;
    newPayment._version += 1;

    // Update metadata with cancellation reason
    newPayment._metadata.notes = reason;

    return newPayment;
  }

  /**
   * Process refund
   */
  refund(refundedBy: UserId, refundAmount?: Money, refundedAt: Date = new Date()): Payment {
    if (!this.isRefundable()) {
      throw new Error('Payment cannot be refunded in current status');
    }

    const refundMoney = refundAmount || this._amount;
    if (refundMoney.greaterThan(this._amount)) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    const newPayment = this.clone();
    newPayment._status = PaymentStatus.REFUNDED;
    newPayment._updatedBy = refundedBy;
    newPayment._updatedAt = refundedAt;
    newPayment._version += 1;

    return newPayment;
  }

  /**
   * Add note to payment
   */
  addNote(note: string, addedBy: UserId, addedAt: Date = new Date()): Payment {
    if (!note || note.trim().length === 0) {
      throw new Error('Note cannot be empty');
    }

    const newPayment = this.clone();
    const existingNotes = newPayment._metadata.notes || '';
    const timestamp = addedAt.toISOString();
    const newNote = `[${timestamp}] ${addedBy.toString()}: ${note}`;

    newPayment._metadata.notes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;

    newPayment._updatedBy = addedBy;
    newPayment._updatedAt = addedAt;
    newPayment._version += 1;

    return newPayment;
  }

  /**
   * Update payment metadata
   */
  updateMetadata(updates: Partial<PaymentMetadata>, updatedBy: UserId, updatedAt: Date = new Date()): Payment {
    if (this.isFinal()) {
      throw new Error('Cannot update metadata for finalized payment');
    }

    const newPayment = this.clone();
    newPayment._metadata = { ...newPayment._metadata, ...updates };
    newPayment._updatedBy = updatedBy;
    newPayment._updatedAt = updatedAt;
    newPayment._version += 1;

    return newPayment;
  }

  // Query methods

  /**
   * Check if payment is pending
   */
  isPending(): boolean {
    return this._status === PaymentStatus.PENDING;
  }

  /**
   * Check if payment is processing
   */
  isProcessing(): boolean {
    return this._status === PaymentStatus.PROCESSING;
  }

  /**
   * Check if payment is successful
   */
  isSuccessful(): boolean {
    return PaymentStatusUtils.isSuccessful(this._status);
  }

  /**
   * Check if payment is final (cannot be changed)
   */
  isFinal(): boolean {
    return PaymentStatusUtils.isFinalStatus(this._status);
  }

  /**
   * Check if payment can be refunded
   */
  isRefundable(): boolean {
    return [PaymentStatus.RECEIVED, PaymentStatus.CONFIRMED].includes(this._status);
  }

  /**
   * Check if payment can be cancelled
   */
  isCancellable(): boolean {
    return [PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(this._status);
  }

  /**
   * Get payment age in days
   */
  getAgeInDays(): number {
    const now = new Date();
    const diffTime = now.getTime() - this._createdAt.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if payment is recent (within last 24 hours)
   */
  isRecent(): boolean {
    return this.getAgeInDays() <= 1;
  }

  /**
   * Get status color for UI
   */
  getStatusColor(): string {
    return PaymentStatusUtils.getStatusColor(this._status);
  }

  /**
   * Get status display text
   */
  getStatusText(): string {
    return PaymentStatusUtils.getStatusText(this._status);
  }

  /**
   * Get display reference
   */
  getDisplayReference(): string {
    return (
      this._metadata.reference || this._metadata.orderId || this._metadata.invoiceId || this._id.toString().slice(-8)
    );
  }

  /**
   * Check equality with another payment
   */
  equals(other: Payment): boolean {
    return this._id.equals(other._id) && this._version === other._version;
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON(): Record<string, any> {
    return {
      id: this._id.toString(),
      customerId: this._customerId.toString(),
      customerName: this._customerName,
      amount: this._amount.amount,
      currency: this._amount.currency,
      paymentMethod: this._paymentMethod,
      status: this._status,
      metadata: this._metadata,
      createdBy: this._createdBy.toString(),
      createdAt: this._createdAt.toISOString(),
      agencyId: this._agencyId,
      updatedBy: this._updatedBy?.toString(),
      updatedAt: this._updatedAt?.toISOString(),
      version: this._version,
    };
  }

  /**
   * Ensure payment can transition to new status
   */
  private ensureCanTransitionTo(newStatus: PaymentStatus): void {
    if (this.isFinal()) {
      throw new Error(`Cannot change status from ${this._status} to ${newStatus}`);
    }

    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [PaymentStatus.PROCESSING, PaymentStatus.RECEIVED, PaymentStatus.CANCELLED],
      [PaymentStatus.PROCESSING]: [PaymentStatus.RECEIVED, PaymentStatus.FAILED, PaymentStatus.CANCELLED],
      [PaymentStatus.RECEIVED]: [PaymentStatus.CONFIRMED, PaymentStatus.REFUNDED],
      [PaymentStatus.CONFIRMED]: [PaymentStatus.REFUNDED],
      [PaymentStatus.FAILED]: [],
      [PaymentStatus.CANCELLED]: [],
      [PaymentStatus.REFUNDED]: [],
      [PaymentStatus.PARTIAL]: [PaymentStatus.RECEIVED, PaymentStatus.CONFIRMED],
      [PaymentStatus.OVERPAID]: [PaymentStatus.CONFIRMED, PaymentStatus.REFUNDED],
    };

    const allowedTransitions = validTransitions[this._status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${this._status} to ${newStatus}`);
    }
  }

  /**
   * Create a clone of the payment (for immutability)
   */
  private clone(): Payment {
    return new Payment(
      this._id,
      this._customerId,
      this._customerName,
      this._amount,
      this._paymentMethod,
      this._status,
      { ...this._metadata },
      this._createdBy,
      this._createdAt,
      this._agencyId,
      this._updatedBy,
      this._updatedAt,
      this._version
    );
  }
}

export default Payment;
