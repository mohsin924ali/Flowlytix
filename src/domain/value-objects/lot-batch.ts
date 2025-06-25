/**
 * Lot/Batch Value Object
 *
 * Represents lot and batch tracking information for products in the goods distribution system.
 * Handles manufacturing dates, expiry dates, lot numbers, batch numbers, and quantity tracking
 * with comprehensive validation and business rules.
 *
 * Business Rules:
 * - Lot numbers must be unique within product and agency
 * - Batch numbers must be unique within lot
 * - Manufacturing date cannot be in the future
 * - Expiry date must be after manufacturing date
 * - Quantity cannot be negative
 * - Expired lots cannot be sold or moved
 * - FIFO (First In, First Out) principle for lot selection
 * - Lot status must be valid
 *
 * @domain Product Management - Lot/Batch Tracking
 * @version 1.0.0
 */

/**
 * Lot status enumeration
 */
export enum LotStatus {
  ACTIVE = 'ACTIVE', // Available for sale/use
  QUARANTINE = 'QUARANTINE', // Under quality review
  EXPIRED = 'EXPIRED', // Past expiry date
  RECALLED = 'RECALLED', // Product recall issued
  DAMAGED = 'DAMAGED', // Physical damage
  RESERVED = 'RESERVED', // Reserved for specific orders
  CONSUMED = 'CONSUMED', // Fully used/sold
}

/**
 * Lot/Batch creation properties
 */
export interface LotBatchProps {
  readonly lotNumber: string;
  readonly batchNumber?: string | undefined;
  readonly manufacturingDate: Date;
  readonly expiryDate?: Date | undefined;
  readonly quantity: number;
  readonly remainingQuantity?: number;
  readonly productId: string;
  readonly agencyId: string;
  readonly supplierId?: string | undefined;
  readonly supplierLotCode?: string | undefined;
  readonly notes?: string | undefined;
  readonly createdBy: string;
}

/**
 * Lot/Batch persistence interface
 */
export interface LotBatchPersistence {
  readonly id: string;
  readonly lotNumber: string;
  readonly batchNumber: string | null;
  readonly manufacturingDate: Date;
  readonly expiryDate: Date | null;
  readonly quantity: number;
  readonly remainingQuantity: number;
  readonly reservedQuantity: number;
  readonly availableQuantity: number;
  readonly status: LotStatus;
  readonly productId: string;
  readonly agencyId: string;
  readonly supplierId: string | null;
  readonly supplierLotCode: string | null;
  readonly notes: string | null;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy: string | null;
  readonly updatedAt: Date | null;
}

/**
 * Custom error classes for LotBatch domain
 */
export class LotBatchDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'LotBatchDomainError';
  }
}

export class LotBatchValidationError extends LotBatchDomainError {
  constructor(message: string) {
    super(message, 'LOT_BATCH_VALIDATION_ERROR');
    this.name = 'LotBatchValidationError';
  }
}

export class InvalidLotNumberError extends LotBatchValidationError {
  constructor(lotNumber: string) {
    super(`Invalid lot number format: ${lotNumber}`);
    this.name = 'InvalidLotNumberError';
  }
}

export class InvalidDateRangeError extends LotBatchValidationError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDateRangeError';
  }
}

export class InsufficientLotQuantityError extends LotBatchDomainError {
  constructor(requested: number, available: number, lotNumber: string) {
    super(
      `Insufficient quantity in lot ${lotNumber}: requested ${requested}, available ${available}`,
      'INSUFFICIENT_LOT_QUANTITY'
    );
    this.name = 'InsufficientLotQuantityError';
  }
}

export class ExpiredLotError extends LotBatchDomainError {
  constructor(lotNumber: string, expiryDate: Date) {
    super(`Lot ${lotNumber} expired on ${expiryDate.toISOString()}`, 'EXPIRED_LOT');
    this.name = 'ExpiredLotError';
  }
}

export class LotStatusError extends LotBatchDomainError {
  constructor(operation: string, status: LotStatus, lotNumber: string) {
    super(`Cannot ${operation} for lot ${lotNumber} with status: ${status}`, 'INVALID_LOT_STATUS');
    this.name = 'LotStatusError';
  }
}

/**
 * LotBatch Value Object
 *
 * Immutable value object for lot and batch tracking with comprehensive
 * validation and business rules enforcement.
 */
export class LotBatch {
  private readonly _id: string;
  private readonly _lotNumber: string;
  private readonly _batchNumber: string | null;
  private readonly _manufacturingDate: Date;
  private readonly _expiryDate: Date | null;
  private readonly _quantity: number;
  private readonly _remainingQuantity: number;
  private readonly _reservedQuantity: number;
  private readonly _status: LotStatus;
  private readonly _productId: string;
  private readonly _agencyId: string;
  private readonly _supplierId: string | null;
  private readonly _supplierLotCode: string | null;
  private readonly _notes: string | null;
  private readonly _createdBy: string;
  private readonly _createdAt: Date;
  private readonly _updatedBy: string | null;
  private readonly _updatedAt: Date | null;

  private constructor(
    props: LotBatchProps,
    id?: string,
    status?: LotStatus,
    reservedQuantity?: number,
    updatedBy?: string,
    updatedAt?: Date,
    createdAt?: Date,
    skipValidation = false
  ) {
    this._id = id || this.generateId();
    this._lotNumber = props.lotNumber;
    this._batchNumber = props.batchNumber || null;
    this._manufacturingDate = new Date(props.manufacturingDate);
    this._expiryDate = props.expiryDate ? new Date(props.expiryDate) : null;
    this._quantity = props.quantity;
    this._remainingQuantity = props.remainingQuantity ?? props.quantity;
    this._reservedQuantity = reservedQuantity ?? 0;
    this._status = status ?? this.determineInitialStatus();
    this._productId = props.productId;
    this._agencyId = props.agencyId;
    this._supplierId = props.supplierId || null;
    this._supplierLotCode = props.supplierLotCode || null;
    this._notes = props.notes || null;
    this._createdBy = props.createdBy;
    this._createdAt = createdAt || new Date();
    this._updatedBy = updatedBy || null;
    this._updatedAt = updatedAt || null;

    if (!skipValidation) {
      this.validate();
    }

    Object.freeze(this);
  }

  /**
   * Create new LotBatch
   */
  public static create(props: LotBatchProps): LotBatch {
    return new LotBatch(props);
  }

  /**
   * Reconstruct LotBatch from persistence
   */
  public static fromPersistence(data: LotBatchPersistence): LotBatch {
    const props: LotBatchProps = {
      lotNumber: data.lotNumber,
      batchNumber: data.batchNumber || undefined,
      manufacturingDate: data.manufacturingDate,
      expiryDate: data.expiryDate || undefined,
      quantity: data.quantity,
      remainingQuantity: data.remainingQuantity,
      productId: data.productId,
      agencyId: data.agencyId,
      supplierId: data.supplierId || undefined,
      supplierLotCode: data.supplierLotCode || undefined,
      notes: data.notes || undefined,
      createdBy: data.createdBy,
    };

    return new LotBatch(
      props,
      data.id,
      data.status,
      data.reservedQuantity,
      data.updatedBy || undefined,
      data.updatedAt || undefined,
      data.createdAt,
      true // skip validation for persistence data
    );
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get lotNumber(): string {
    return this._lotNumber;
  }

  public get batchNumber(): string | null {
    return this._batchNumber;
  }

  public get manufacturingDate(): Date {
    return new Date(this._manufacturingDate);
  }

  public get expiryDate(): Date | null {
    return this._expiryDate ? new Date(this._expiryDate) : null;
  }

  public get quantity(): number {
    return this._quantity;
  }

  public get remainingQuantity(): number {
    return this._remainingQuantity;
  }

  public get reservedQuantity(): number {
    return this._reservedQuantity;
  }

  public get availableQuantity(): number {
    return this._remainingQuantity - this._reservedQuantity;
  }

  public get status(): LotStatus {
    return this._status;
  }

  public get productId(): string {
    return this._productId;
  }

  public get agencyId(): string {
    return this._agencyId;
  }

  public get supplierId(): string | null {
    return this._supplierId;
  }

  public get supplierLotCode(): string | null {
    return this._supplierLotCode;
  }

  public get notes(): string | null {
    return this._notes;
  }

  public get createdBy(): string {
    return this._createdBy;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt);
  }

  public get updatedBy(): string | null {
    return this._updatedBy;
  }

  public get updatedAt(): Date | null {
    return this._updatedAt ? new Date(this._updatedAt) : null;
  }

  // Business logic methods

  /**
   * Check if lot is expired
   */
  public isExpired(): boolean {
    if (!this._expiryDate) return false;
    return new Date() > this._expiryDate;
  }

  /**
   * Check if lot is near expiry (within 30 days)
   */
  public isNearExpiry(daysThreshold = 30): boolean {
    if (!this._expiryDate) return false;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    return this._expiryDate <= thresholdDate;
  }

  /**
   * Check if lot is available for use
   */
  public isAvailable(): boolean {
    return this._status === LotStatus.ACTIVE && !this.isExpired() && this.availableQuantity > 0;
  }

  /**
   * Check if lot is fully consumed
   */
  public isFullyConsumed(): boolean {
    return this._remainingQuantity <= 0;
  }

  /**
   * Get days until expiry
   */
  public getDaysUntilExpiry(): number | null {
    if (!this._expiryDate) return null;
    const now = new Date();
    const timeDiff = this._expiryDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Reserve quantity from lot
   */
  public reserve(quantity: number, userId: string): LotBatch {
    if (quantity <= 0) {
      throw new LotBatchValidationError('Reserve quantity must be positive');
    }

    if (quantity > this.availableQuantity) {
      throw new InsufficientLotQuantityError(quantity, this.availableQuantity, this._lotNumber);
    }

    if (!this.isAvailable()) {
      throw new LotStatusError('reserve quantity', this._status, this._lotNumber);
    }

    return new LotBatch(
      this.toProps(),
      this._id,
      this._status,
      this._reservedQuantity + quantity,
      userId,
      new Date(),
      undefined,
      true
    );
  }

  /**
   * Release reserved quantity
   */
  public releaseReserved(quantity: number, userId: string): LotBatch {
    if (quantity <= 0) {
      throw new LotBatchValidationError('Release quantity must be positive');
    }

    if (quantity > this._reservedQuantity) {
      throw new LotBatchValidationError(`Cannot release ${quantity}, only ${this._reservedQuantity} reserved`);
    }

    return new LotBatch(
      this.toProps(),
      this._id,
      this._status,
      this._reservedQuantity - quantity,
      userId,
      new Date(),
      undefined,
      true
    );
  }

  /**
   * Consume quantity from lot
   */
  public consume(quantity: number, userId: string): LotBatch {
    if (quantity <= 0) {
      throw new LotBatchValidationError('Consume quantity must be positive');
    }

    if (quantity > this._remainingQuantity) {
      throw new InsufficientLotQuantityError(quantity, this._remainingQuantity, this._lotNumber);
    }

    if (!this.isAvailable() && this._status !== LotStatus.RESERVED) {
      throw new LotStatusError('consume from', this._status, this._lotNumber);
    }

    const newRemainingQuantity = this._remainingQuantity - quantity;
    const newStatus = newRemainingQuantity <= 0 ? LotStatus.CONSUMED : this._status;

    const props = {
      ...this.toProps(),
      remainingQuantity: newRemainingQuantity,
    };

    return new LotBatch(
      props,
      this._id,
      newStatus,
      Math.max(0, this._reservedQuantity - quantity),
      userId,
      new Date(),
      undefined,
      true
    );
  }

  /**
   * Update lot status
   */
  public updateStatus(newStatus: LotStatus, userId: string): LotBatch {
    if (newStatus === this._status) {
      return this;
    }

    // Business rules for status transitions
    this.validateStatusTransition(newStatus);

    return new LotBatch(
      this.toProps(),
      this._id,
      newStatus,
      this._reservedQuantity,
      userId,
      new Date(),
      undefined,
      true
    );
  }

  /**
   * Convert to persistence format
   */
  public toPersistence(): LotBatchPersistence {
    return {
      id: this._id,
      lotNumber: this._lotNumber,
      batchNumber: this._batchNumber,
      manufacturingDate: this._manufacturingDate,
      expiryDate: this._expiryDate,
      quantity: this._quantity,
      remainingQuantity: this._remainingQuantity,
      reservedQuantity: this._reservedQuantity,
      availableQuantity: this.availableQuantity,
      status: this._status,
      productId: this._productId,
      agencyId: this._agencyId,
      supplierId: this._supplierId,
      supplierLotCode: this._supplierLotCode,
      notes: this._notes,
      createdBy: this._createdBy,
      createdAt: this._createdAt,
      updatedBy: this._updatedBy,
      updatedAt: this._updatedAt,
    };
  }

  /**
   * Get display information (safe for UI)
   */
  public getDisplayInfo() {
    return {
      id: this._id,
      lotNumber: this._lotNumber,
      batchNumber: this._batchNumber,
      manufacturingDate: this._manufacturingDate.toISOString(),
      expiryDate: this._expiryDate?.toISOString() || null,
      quantity: this._quantity,
      remainingQuantity: this._remainingQuantity,
      reservedQuantity: this._reservedQuantity,
      availableQuantity: this.availableQuantity,
      status: this._status,
      isExpired: this.isExpired(),
      isNearExpiry: this.isNearExpiry(),
      isAvailable: this.isAvailable(),
      daysUntilExpiry: this.getDaysUntilExpiry(),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt?.toISOString() || null,
    };
  }

  // Private methods

  private toProps(): LotBatchProps {
    return {
      lotNumber: this._lotNumber,
      batchNumber: this._batchNumber || undefined,
      manufacturingDate: this._manufacturingDate,
      expiryDate: this._expiryDate || undefined,
      quantity: this._quantity,
      remainingQuantity: this._remainingQuantity,
      productId: this._productId,
      agencyId: this._agencyId,
      supplierId: this._supplierId || undefined,
      supplierLotCode: this._supplierLotCode || undefined,
      notes: this._notes || undefined,
      createdBy: this._createdBy,
    };
  }

  private determineInitialStatus(): LotStatus {
    if (this.isExpired()) {
      return LotStatus.EXPIRED;
    }
    return LotStatus.ACTIVE;
  }

  private generateId(): string {
    return `lot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validate(): void {
    this.validateLotNumber(this._lotNumber);
    this.validateDates();
    this.validateQuantities();

    if (this._batchNumber) {
      this.validateBatchNumber(this._batchNumber);
    }
  }

  private validateLotNumber(lotNumber: string): void {
    if (!lotNumber || lotNumber.trim().length === 0) {
      throw new InvalidLotNumberError('Lot number cannot be empty');
    }

    if (lotNumber.length > 50) {
      throw new InvalidLotNumberError('Lot number cannot exceed 50 characters');
    }

    // Allow alphanumeric, hyphens, underscores, and forward slashes
    const lotNumberRegex = /^[A-Za-z0-9\-_/]+$/;
    if (!lotNumberRegex.test(lotNumber)) {
      throw new InvalidLotNumberError(
        'Lot number can only contain letters, numbers, hyphens, underscores, and forward slashes'
      );
    }
  }

  private validateBatchNumber(batchNumber: string): void {
    if (batchNumber.length > 50) {
      throw new LotBatchValidationError('Batch number cannot exceed 50 characters');
    }

    const batchNumberRegex = /^[A-Za-z0-9\-_/]+$/;
    if (!batchNumberRegex.test(batchNumber)) {
      throw new LotBatchValidationError(
        'Batch number can only contain letters, numbers, hyphens, underscores, and forward slashes'
      );
    }
  }

  private validateDates(): void {
    const now = new Date();

    // Manufacturing date cannot be in the future
    if (this._manufacturingDate > now) {
      throw new InvalidDateRangeError('Manufacturing date cannot be in the future');
    }

    // If expiry date exists, it must be after manufacturing date
    if (this._expiryDate && this._expiryDate <= this._manufacturingDate) {
      throw new InvalidDateRangeError('Expiry date must be after manufacturing date');
    }
  }

  private validateQuantities(): void {
    if (this._quantity < 0) {
      throw new LotBatchValidationError('Quantity cannot be negative');
    }

    if (this._remainingQuantity < 0) {
      throw new LotBatchValidationError('Remaining quantity cannot be negative');
    }

    if (this._remainingQuantity > this._quantity) {
      throw new LotBatchValidationError('Remaining quantity cannot exceed original quantity');
    }
  }

  private validateStatusTransition(newStatus: LotStatus): void {
    // Define valid status transitions
    const validTransitions: Record<LotStatus, LotStatus[]> = {
      [LotStatus.ACTIVE]: [
        LotStatus.QUARANTINE,
        LotStatus.EXPIRED,
        LotStatus.RECALLED,
        LotStatus.DAMAGED,
        LotStatus.RESERVED,
        LotStatus.CONSUMED,
      ],
      [LotStatus.QUARANTINE]: [LotStatus.ACTIVE, LotStatus.DAMAGED, LotStatus.RECALLED, LotStatus.EXPIRED],
      [LotStatus.RESERVED]: [LotStatus.ACTIVE, LotStatus.CONSUMED, LotStatus.EXPIRED, LotStatus.RECALLED],
      [LotStatus.EXPIRED]: [LotStatus.RECALLED], // Can only recall expired lots
      [LotStatus.RECALLED]: [], // Terminal state
      [LotStatus.DAMAGED]: [LotStatus.RECALLED], // Can only recall damaged lots
      [LotStatus.CONSUMED]: [], // Terminal state
    };

    const allowedTransitions = validTransitions[this._status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new LotStatusError(`transition from ${this._status} to ${newStatus}`, this._status, this._lotNumber);
    }
  }
}
