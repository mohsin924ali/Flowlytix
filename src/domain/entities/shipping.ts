/**
 * Shipping Entity - Step 3A Domain Layer
 *
 * Core domain entity for shipping operations with complete business logic,
 * status management, audit trails, and validation following DDD principles.
 */

import { Money, CurrencyCode } from '../value-objects/money';

/**
 * Shipping status enumeration
 */
export enum ShippingStatus {
  PENDING = 'PENDING',
  LABEL_CREATED = 'LABEL_CREATED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  ATTEMPTED_DELIVERY = 'ATTEMPTED_DELIVERY',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
  LOST = 'LOST',
}

/**
 * Shipping carrier enumeration
 */
export enum ShippingCarrier {
  UPS = 'UPS',
  FEDEX = 'FEDEX',
  DHL = 'DHL',
  USPS = 'USPS',
  LOCAL_COURIER = 'LOCAL_COURIER',
  SELF_DELIVERY = 'SELF_DELIVERY',
  THIRD_PARTY = 'THIRD_PARTY',
}

/**
 * Shipping service type enumeration
 */
export enum ShippingServiceType {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  OVERNIGHT = 'OVERNIGHT',
  SAME_DAY = 'SAME_DAY',
  TWO_DAY = 'TWO_DAY',
  GROUND = 'GROUND',
  INTERNATIONAL = 'INTERNATIONAL',
}

/**
 * Shipping priority level enumeration
 */
export enum ShippingPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

/**
 * Shipping action types for audit trail
 */
export enum ShippingActionType {
  CREATE_SHIPPING = 'CREATE_SHIPPING',
  CREATE_LABEL = 'CREATE_LABEL',
  CONFIRM_PICKUP = 'CONFIRM_PICKUP',
  UPDATE_IN_TRANSIT = 'UPDATE_IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  ATTEMPT_DELIVERY = 'ATTEMPT_DELIVERY',
  CONFIRM_DELIVERY = 'CONFIRM_DELIVERY',
  REPORT_FAILED = 'REPORT_FAILED',
  CANCEL_SHIPPING = 'CANCEL_SHIPPING',
  MARK_LOST = 'MARK_LOST',
  UPDATE_TRACKING = 'UPDATE_TRACKING',
}

/**
 * Shipping address interface
 */
export interface ShippingAddress {
  readonly name: string;
  readonly company?: string;
  readonly street1: string;
  readonly street2?: string;
  readonly city: string;
  readonly state: string;
  readonly zipCode: string;
  readonly country: string;
  readonly phone?: string;
  readonly email?: string;
  readonly deliveryInstructions?: string;
  readonly addressType: 'RESIDENTIAL' | 'COMMERCIAL';
  readonly isValidated: boolean;
}

/**
 * Package dimensions interface
 */
export interface PackageDimensions {
  readonly length: number; // in cm
  readonly width: number; // in cm
  readonly height: number; // in cm
  readonly weight: number; // in kg
  readonly volumetricWeight?: number; // calculated volumetric weight
}

/**
 * Tracking event interface
 */
export interface TrackingEvent {
  readonly timestamp: Date;
  readonly status: ShippingStatus;
  readonly location?: string | undefined;
  readonly description: string;
  readonly carrierCode?: string | undefined;
  readonly facilityCode?: string | undefined;
  readonly eventType: 'SHIPMENT' | 'EXCEPTION' | 'DELIVERY';
}

/**
 * Delivery attempt interface
 */
export interface DeliveryAttempt {
  readonly attemptNumber: number;
  readonly attemptDate: Date;
  readonly status: 'ATTEMPTED' | 'SUCCESSFUL' | 'FAILED';
  readonly reason?: string | undefined;
  readonly nextAttemptDate?: Date | undefined;
  readonly notes?: string | undefined;
  readonly receivedBy?: string | undefined;
  readonly signatureRequired: boolean;
  readonly signatureObtained?: boolean | undefined;
}

/**
 * Shipping audit entry for tracking all operations
 */
export interface ShippingAuditEntry {
  readonly actionType: ShippingActionType;
  readonly previousStatus: ShippingStatus;
  readonly newStatus: ShippingStatus;
  readonly performedBy: string;
  readonly performedAt: Date;
  readonly notes?: string;
  readonly metadata?: Record<string, any>;
  readonly trackingEvent?: TrackingEvent;
}

/**
 * Shipping creation properties
 */
export interface ShippingProps {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly shippingAddress: ShippingAddress;
  readonly returnAddress: ShippingAddress;
  readonly carrier: ShippingCarrier;
  readonly serviceType: ShippingServiceType;
  readonly priority: ShippingPriority;
  readonly packageDimensions: PackageDimensions;
  readonly declaredValue: Money;
  readonly shippingCost: Money;
  readonly trackingNumber?: string;
  readonly labelUrl?: string;
  readonly estimatedDeliveryDate?: Date;
  readonly requiresSignature: boolean;
  readonly isInsured: boolean;
  readonly insuranceValue?: Money;
  readonly specialInstructions?: string;
  readonly agencyId: string;
  readonly createdBy: string;
}

/**
 * Shipping persistence interface
 */
export interface ShippingPersistence {
  readonly id: string;
  readonly orderId: string;
  readonly orderNumber: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly trackingNumber: string | null;
  readonly carrier: ShippingCarrier;
  readonly serviceType: ShippingServiceType;
  readonly priority: ShippingPriority;
  readonly status: ShippingStatus;
  readonly shippingAddress: ShippingAddress;
  readonly returnAddress: ShippingAddress;
  readonly packageLength: number;
  readonly packageWidth: number;
  readonly packageHeight: number;
  readonly packageWeight: number;
  readonly volumetricWeight: number | null;
  readonly declaredValue: number;
  readonly declaredValueCurrency: CurrencyCode;
  readonly shippingCost: number;
  readonly shippingCostCurrency: CurrencyCode;
  readonly labelUrl: string | null;
  readonly estimatedDeliveryDate: Date | null;
  readonly actualDeliveryDate: Date | null;
  readonly requiresSignature: boolean;
  readonly isInsured: boolean;
  readonly insuranceValue: number | null;
  readonly insuranceValueCurrency: CurrencyCode | null;
  readonly specialInstructions: string | null;
  readonly deliveryAttempts: readonly DeliveryAttempt[];
  readonly trackingEvents: readonly TrackingEvent[];
  readonly auditTrail: readonly ShippingAuditEntry[];
  readonly agencyId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy: string | null;
  readonly updatedAt: Date | null;
  readonly pickedUpAt: Date | null;
  readonly deliveredAt: Date | null;
}

/**
 * Custom error types for shipping operations
 */
export class ShippingValidationError extends Error {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ShippingValidationError';
    this.field = field;
  }
}

export class ShippingStatusError extends Error {
  public readonly currentStatus: ShippingStatus;

  constructor(message: string, currentStatus: ShippingStatus) {
    super(message);
    this.name = 'ShippingStatusError';
    this.currentStatus = currentStatus;
  }
}

export class CarrierValidationError extends Error {
  public readonly carrier: ShippingCarrier;

  constructor(message: string, carrier: ShippingCarrier) {
    super(message);
    this.name = 'CarrierValidationError';
    this.carrier = carrier;
  }
}

/**
 * Shipping Entity
 */
export class Shipping {
  private readonly _id: string;
  private readonly _orderId: string;
  private readonly _orderNumber: string;
  private readonly _customerId: string;
  private readonly _customerName: string;
  private _trackingNumber: string | null;
  private readonly _carrier: ShippingCarrier;
  private readonly _serviceType: ShippingServiceType;
  private readonly _priority: ShippingPriority;
  private _status: ShippingStatus;
  private readonly _shippingAddress: ShippingAddress;
  private readonly _returnAddress: ShippingAddress;
  private readonly _packageDimensions: PackageDimensions;
  private readonly _declaredValue: Money;
  private readonly _shippingCost: Money;
  private _labelUrl: string | null;
  private readonly _estimatedDeliveryDate: Date | null;
  private _actualDeliveryDate: Date | null;
  private readonly _requiresSignature: boolean;
  private readonly _isInsured: boolean;
  private readonly _insuranceValue: Money | null;
  private readonly _specialInstructions: string | null;
  private _deliveryAttempts: DeliveryAttempt[];
  private _trackingEvents: TrackingEvent[];
  private _auditTrail: ShippingAuditEntry[];
  private readonly _agencyId: string;
  private readonly _createdBy: string;
  private readonly _createdAt: Date;
  private _updatedBy: string | null;
  private _updatedAt: Date | null;
  private _pickedUpAt: Date | null;
  private _deliveredAt: Date | null;

  private constructor(props: ShippingProps & { id?: string }, skipFreeze = false) {
    this.validateShippingProps(props);

    this._id = props.id || `shipping-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this._orderId = props.orderId;
    this._orderNumber = props.orderNumber;
    this._customerId = props.customerId;
    this._customerName = props.customerName;
    this._trackingNumber = props.trackingNumber || null;
    this._carrier = props.carrier;
    this._serviceType = props.serviceType;
    this._priority = props.priority;
    this._status = ShippingStatus.PENDING;
    this._shippingAddress = { ...props.shippingAddress };
    this._returnAddress = { ...props.returnAddress };
    this._packageDimensions = { ...props.packageDimensions };
    this._declaredValue = props.declaredValue;
    this._shippingCost = props.shippingCost;
    this._labelUrl = props.labelUrl || null;
    this._estimatedDeliveryDate = props.estimatedDeliveryDate || null;
    this._actualDeliveryDate = null;
    this._requiresSignature = props.requiresSignature;
    this._isInsured = props.isInsured;
    this._insuranceValue = props.insuranceValue || null;
    this._specialInstructions = props.specialInstructions || null;
    this._deliveryAttempts = [];
    this._trackingEvents = [];
    this._auditTrail = [];
    this._agencyId = props.agencyId;
    this._createdBy = props.createdBy;
    this._createdAt = new Date();
    this._updatedBy = null;
    this._updatedAt = null;
    this._pickedUpAt = null;
    this._deliveredAt = null;

    this.validatePackageDimensions();

    if (!skipFreeze) {
      Object.freeze(this);
    }
  }

  // Static Factory Methods

  /**
   * Create new shipping instance
   */
  public static create(props: ShippingProps): Shipping {
    return new Shipping(props);
  }

  /**
   * Restore from persistence
   */
  public static fromPersistence(data: ShippingPersistence): Shipping {
    const props: ShippingProps & { id: string } = {
      id: data.id,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      shippingAddress: data.shippingAddress,
      returnAddress: data.returnAddress,
      carrier: data.carrier,
      serviceType: data.serviceType,
      priority: data.priority,
      packageDimensions: {
        length: data.packageLength,
        width: data.packageWidth,
        height: data.packageHeight,
        weight: data.packageWeight,
        volumetricWeight: data.volumetricWeight || undefined,
      },
      declaredValue: Money.fromDecimal(data.declaredValue / 100, data.declaredValueCurrency),
      shippingCost: Money.fromDecimal(data.shippingCost / 100, data.shippingCostCurrency),
      trackingNumber: data.trackingNumber || undefined,
      labelUrl: data.labelUrl || undefined,
      estimatedDeliveryDate: data.estimatedDeliveryDate || undefined,
      requiresSignature: data.requiresSignature,
      isInsured: data.isInsured,
      insuranceValue:
        data.insuranceValue && data.insuranceValueCurrency
          ? Money.fromDecimal(data.insuranceValue / 100, data.insuranceValueCurrency)
          : undefined,
      specialInstructions: data.specialInstructions || undefined,
      agencyId: data.agencyId,
      createdBy: data.createdBy,
    };

    const shipping = new Shipping(props, true); // Skip freeze initially

    // Restore mutable state before freezing
    (shipping as any)._status = data.status;
    (shipping as any)._actualDeliveryDate = data.actualDeliveryDate;
    (shipping as any)._deliveryAttempts = [...data.deliveryAttempts];
    (shipping as any)._trackingEvents = [...data.trackingEvents];
    (shipping as any)._auditTrail = [...data.auditTrail];
    (shipping as any)._updatedBy = data.updatedBy;
    (shipping as any)._updatedAt = data.updatedAt;
    (shipping as any)._pickedUpAt = data.pickedUpAt;
    (shipping as any)._deliveredAt = data.deliveredAt;
    (shipping as any)._createdAt = data.createdAt;

    Object.freeze(shipping);
    return shipping;
  }

  // Public Getters

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
  public get trackingNumber(): string | null {
    return this._trackingNumber;
  }
  public get carrier(): ShippingCarrier {
    return this._carrier;
  }
  public get serviceType(): ShippingServiceType {
    return this._serviceType;
  }
  public get priority(): ShippingPriority {
    return this._priority;
  }
  public get status(): ShippingStatus {
    return this._status;
  }
  public get shippingAddress(): ShippingAddress {
    return { ...this._shippingAddress };
  }
  public get returnAddress(): ShippingAddress {
    return { ...this._returnAddress };
  }
  public get packageDimensions(): PackageDimensions {
    return { ...this._packageDimensions };
  }
  public get declaredValue(): Money {
    return this._declaredValue;
  }
  public get shippingCost(): Money {
    return this._shippingCost;
  }
  public get labelUrl(): string | null {
    return this._labelUrl;
  }
  public get estimatedDeliveryDate(): Date | null {
    return this._estimatedDeliveryDate;
  }
  public get actualDeliveryDate(): Date | null {
    return this._actualDeliveryDate;
  }
  public get requiresSignature(): boolean {
    return this._requiresSignature;
  }
  public get isInsured(): boolean {
    return this._isInsured;
  }
  public get insuranceValue(): Money | null {
    return this._insuranceValue;
  }
  public get specialInstructions(): string | null {
    return this._specialInstructions;
  }
  public get deliveryAttempts(): readonly DeliveryAttempt[] {
    return [...this._deliveryAttempts];
  }
  public get trackingEvents(): readonly TrackingEvent[] {
    return [...this._trackingEvents];
  }
  public get auditTrail(): readonly ShippingAuditEntry[] {
    return [...this._auditTrail];
  }
  public get agencyId(): string {
    return this._agencyId;
  }
  public get createdBy(): string {
    return this._createdBy;
  }
  public get createdAt(): Date {
    return this._createdAt;
  }
  public get updatedBy(): string | null {
    return this._updatedBy;
  }
  public get updatedAt(): Date | null {
    return this._updatedAt;
  }
  public get pickedUpAt(): Date | null {
    return this._pickedUpAt;
  }
  public get deliveredAt(): Date | null {
    return this._deliveredAt;
  }

  // Business Logic Methods

  /**
   * Check if shipping label can be created
   */
  public canCreateLabel(): boolean {
    return this._status === ShippingStatus.PENDING;
  }

  /**
   * Check if shipment can be picked up
   */
  public canPickup(): boolean {
    return this._status === ShippingStatus.LABEL_CREATED;
  }

  /**
   * Check if shipment can be marked in transit
   */
  public canMarkInTransit(): boolean {
    return this._status === ShippingStatus.PICKED_UP;
  }

  /**
   * Check if delivery can be attempted
   */
  public canAttemptDelivery(): boolean {
    return [ShippingStatus.IN_TRANSIT, ShippingStatus.OUT_FOR_DELIVERY, ShippingStatus.ATTEMPTED_DELIVERY].includes(
      this._status
    );
  }

  /**
   * Check if shipment can be delivered
   */
  public canDeliver(): boolean {
    return [ShippingStatus.IN_TRANSIT, ShippingStatus.OUT_FOR_DELIVERY, ShippingStatus.ATTEMPTED_DELIVERY].includes(
      this._status
    );
  }

  /**
   * Check if shipment can be cancelled
   */
  public canCancel(): boolean {
    return [ShippingStatus.PENDING, ShippingStatus.LABEL_CREATED].includes(this._status);
  }

  /**
   * Check if delivery retry is allowed
   */
  public canRetryDelivery(): boolean {
    return this._status === ShippingStatus.FAILED && this._deliveryAttempts.length < 3;
  }

  /**
   * Create shipping label
   */
  public createLabel(userId: string, trackingNumber: string, labelUrl: string, notes?: string): Shipping {
    if (!this.canCreateLabel()) {
      throw new ShippingStatusError('Cannot create label for this shipment', this._status);
    }

    if (!trackingNumber.trim()) {
      throw new ShippingValidationError('Tracking number is required', 'trackingNumber');
    }

    if (!labelUrl.trim()) {
      throw new ShippingValidationError('Label URL is required', 'labelUrl');
    }

    const updated = this.clone();
    const previousStatus = updated._status;

    updated._status = ShippingStatus.LABEL_CREATED;
    updated._trackingNumber = trackingNumber.trim();
    updated._labelUrl = labelUrl.trim();
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    updated.addShippingAudit(
      ShippingActionType.CREATE_LABEL,
      previousStatus,
      ShippingStatus.LABEL_CREATED,
      userId,
      notes,
      { trackingNumber, labelUrl }
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Confirm pickup
   */
  public confirmPickup(userId: string, pickupDate?: Date, notes?: string): Shipping {
    if (!this.canPickup()) {
      throw new ShippingStatusError('Cannot confirm pickup for this shipment', this._status);
    }

    const updated = this.clone();
    const previousStatus = updated._status;
    const actualPickupDate = pickupDate || new Date();

    updated._status = ShippingStatus.PICKED_UP;
    updated._pickedUpAt = actualPickupDate;
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    updated.addShippingAudit(
      ShippingActionType.CONFIRM_PICKUP,
      previousStatus,
      ShippingStatus.PICKED_UP,
      userId,
      notes,
      { pickupDate: actualPickupDate.toISOString() }
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Mark shipment as in transit
   */
  public markInTransit(userId: string, location?: string, notes?: string): Shipping {
    if (!this.canMarkInTransit()) {
      throw new ShippingStatusError('Cannot mark shipment as in transit', this._status);
    }

    const updated = this.clone();
    const previousStatus = updated._status;

    updated._status = ShippingStatus.IN_TRANSIT;
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    const trackingEvent: TrackingEvent = {
      timestamp: new Date(),
      status: ShippingStatus.IN_TRANSIT,
      location: location || undefined,
      description: notes || 'Package is in transit',
      eventType: 'SHIPMENT',
    };
    updated._trackingEvents.push(trackingEvent);

    updated.addShippingAudit(
      ShippingActionType.UPDATE_IN_TRANSIT,
      previousStatus,
      ShippingStatus.IN_TRANSIT,
      userId,
      notes,
      location ? { location } : undefined,
      trackingEvent
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Mark shipment as out for delivery
   */
  public markOutForDelivery(userId: string, location?: string, notes?: string): Shipping {
    if (this._status !== ShippingStatus.IN_TRANSIT) {
      throw new ShippingStatusError('Shipment must be in transit to mark out for delivery', this._status);
    }

    const updated = this.clone();
    const previousStatus = updated._status;

    updated._status = ShippingStatus.OUT_FOR_DELIVERY;
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    const trackingEvent: TrackingEvent = {
      timestamp: new Date(),
      status: ShippingStatus.OUT_FOR_DELIVERY,
      location,
      description: notes || 'Package is out for delivery',
      eventType: 'SHIPMENT',
    };
    updated._trackingEvents.push(trackingEvent);

    updated.addShippingAudit(
      ShippingActionType.OUT_FOR_DELIVERY,
      previousStatus,
      ShippingStatus.OUT_FOR_DELIVERY,
      userId,
      notes,
      location ? { location } : undefined,
      trackingEvent
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Attempt delivery
   */
  public attemptDelivery(userId: string, reason?: string, nextAttemptDate?: Date, notes?: string): Shipping {
    if (!this.canAttemptDelivery()) {
      throw new ShippingStatusError('Cannot attempt delivery for this shipment', this._status);
    }

    if (this._deliveryAttempts.length >= 3) {
      throw new ShippingValidationError('Maximum delivery attempts reached');
    }

    const updated = this.clone();
    const previousStatus = updated._status;
    const attemptNumber = updated._deliveryAttempts.length + 1;

    updated._status = ShippingStatus.ATTEMPTED_DELIVERY;
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    const attempt: DeliveryAttempt = {
      attemptNumber,
      attemptDate: new Date(),
      status: 'ATTEMPTED',
      reason: reason || undefined,
      nextAttemptDate: nextAttemptDate || undefined,
      notes: notes || undefined,
      signatureRequired: updated._requiresSignature,
    };
    updated._deliveryAttempts.push(attempt);

    const trackingEvent: TrackingEvent = {
      timestamp: new Date(),
      status: ShippingStatus.ATTEMPTED_DELIVERY,
      description: `Delivery attempt ${attemptNumber}${reason ? `: ${reason}` : ''}`,
      eventType: 'DELIVERY',
    };
    updated._trackingEvents.push(trackingEvent);

    updated.addShippingAudit(
      ShippingActionType.ATTEMPT_DELIVERY,
      previousStatus,
      ShippingStatus.ATTEMPTED_DELIVERY,
      userId,
      notes,
      { attemptNumber, reason, nextAttemptDate: nextAttemptDate?.toISOString() },
      trackingEvent
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Confirm delivery
   */
  public confirmDelivery(
    userId: string,
    deliveryDate?: Date,
    receivedBy?: string,
    signatureObtained?: boolean,
    notes?: string
  ): Shipping {
    if (!this.canDeliver()) {
      throw new ShippingStatusError('Cannot confirm delivery for this shipment', this._status);
    }

    if (this._requiresSignature && !signatureObtained) {
      throw new ShippingValidationError('Signature is required for delivery confirmation');
    }

    const updated = this.clone();
    const previousStatus = updated._status;
    const actualDeliveryDate = deliveryDate || new Date();

    updated._status = ShippingStatus.DELIVERED;
    updated._actualDeliveryDate = actualDeliveryDate;
    updated._deliveredAt = actualDeliveryDate;
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    if (updated._deliveryAttempts.length > 0) {
      const lastAttempt = updated._deliveryAttempts[updated._deliveryAttempts.length - 1];
      updated._deliveryAttempts[updated._deliveryAttempts.length - 1] = {
        ...lastAttempt,
        status: 'SUCCESSFUL',
        receivedBy: receivedBy || undefined,
        signatureObtained: signatureObtained || false,
      };
    } else {
      const attempt: DeliveryAttempt = {
        attemptNumber: 1,
        attemptDate: actualDeliveryDate,
        status: 'SUCCESSFUL',
        receivedBy: receivedBy || undefined,
        signatureRequired: updated._requiresSignature,
        signatureObtained: signatureObtained || false,
        notes: notes || undefined,
      };
      updated._deliveryAttempts.push(attempt);
    }

    const trackingEvent: TrackingEvent = {
      timestamp: actualDeliveryDate,
      status: ShippingStatus.DELIVERED,
      description: `Package delivered${receivedBy ? ` to ${receivedBy}` : ''}`,
      eventType: 'DELIVERY',
    };
    updated._trackingEvents.push(trackingEvent);

    updated.addShippingAudit(
      ShippingActionType.CONFIRM_DELIVERY,
      previousStatus,
      ShippingStatus.DELIVERED,
      userId,
      notes,
      {
        deliveryDate: actualDeliveryDate.toISOString(),
        receivedBy,
        signatureObtained,
      },
      trackingEvent
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Mark shipment as failed
   */
  public markFailed(userId: string, reason: string, notes?: string): Shipping {
    if (this._status === ShippingStatus.DELIVERED) {
      throw new ShippingStatusError('Cannot mark delivered shipment as failed', this._status);
    }

    if (!reason.trim()) {
      throw new ShippingValidationError('Failure reason is required', 'reason');
    }

    const updated = this.clone();
    const previousStatus = updated._status;

    updated._status = ShippingStatus.FAILED;
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    const trackingEvent: TrackingEvent = {
      timestamp: new Date(),
      status: ShippingStatus.FAILED,
      description: `Shipment failed: ${reason}`,
      eventType: 'EXCEPTION',
    };
    updated._trackingEvents.push(trackingEvent);

    updated.addShippingAudit(
      ShippingActionType.REPORT_FAILED,
      previousStatus,
      ShippingStatus.FAILED,
      userId,
      notes,
      { reason },
      trackingEvent
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Cancel shipment
   */
  public cancel(userId: string, reason: string, notes?: string): Shipping {
    if (!this.canCancel()) {
      throw new ShippingStatusError('Cannot cancel this shipment', this._status);
    }

    if (!reason.trim()) {
      throw new ShippingValidationError('Cancellation reason is required', 'reason');
    }

    const updated = this.clone();
    const previousStatus = updated._status;

    updated._status = ShippingStatus.CANCELLED;
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    updated.addShippingAudit(
      ShippingActionType.CANCEL_SHIPPING,
      previousStatus,
      ShippingStatus.CANCELLED,
      userId,
      notes,
      { reason }
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Add tracking event
   */
  public addTrackingEvent(userId: string, event: Omit<TrackingEvent, 'timestamp'>, notes?: string): Shipping {
    const updated = this.clone();

    const trackingEvent: TrackingEvent = {
      ...event,
      timestamp: new Date(),
    };

    updated._trackingEvents.push(trackingEvent);
    updated._updatedBy = userId;
    updated._updatedAt = new Date();

    updated.addShippingAudit(
      ShippingActionType.UPDATE_TRACKING,
      updated._status,
      updated._status,
      userId,
      notes,
      { event: trackingEvent },
      trackingEvent
    );

    Object.freeze(updated);
    return updated;
  }

  /**
   * Get shipping summary
   */
  public getShippingSummary() {
    return {
      id: this._id,
      orderId: this._orderId,
      orderNumber: this._orderNumber,
      trackingNumber: this._trackingNumber,
      carrier: this._carrier,
      serviceType: this._serviceType,
      status: this._status,
      estimatedDeliveryDate: this._estimatedDeliveryDate?.toISOString() || null,
      actualDeliveryDate: this._actualDeliveryDate?.toISOString() || null,
      shippingCost: this._shippingCost.format(),
      deliveryAttempts: this._deliveryAttempts.length,
      isDelivered: this._status === ShippingStatus.DELIVERED,
      hasLabel: !!this._labelUrl,
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
      trackingNumber: this._trackingNumber,
      carrier: this._carrier,
      status: this._status,
      estimatedDelivery: this._estimatedDeliveryDate?.toISOString() || null,
      actualDelivery: this._actualDeliveryDate?.toISOString() || null,
      shippingCost: this._shippingCost.format(),
      createdAt: this._createdAt.toISOString(),
    };
  }

  /**
   * Convert to persistence format
   */
  public toPersistence(): ShippingPersistence {
    return {
      id: this._id,
      orderId: this._orderId,
      orderNumber: this._orderNumber,
      customerId: this._customerId,
      customerName: this._customerName,
      trackingNumber: this._trackingNumber,
      carrier: this._carrier,
      serviceType: this._serviceType,
      priority: this._priority,
      status: this._status,
      shippingAddress: this._shippingAddress,
      returnAddress: this._returnAddress,
      packageLength: this._packageDimensions.length,
      packageWidth: this._packageDimensions.width,
      packageHeight: this._packageDimensions.height,
      packageWeight: this._packageDimensions.weight,
      volumetricWeight: this._packageDimensions.volumetricWeight || null,
      declaredValue: this._declaredValue.decimalAmount * 100,
      declaredValueCurrency: this._declaredValue.currency,
      shippingCost: this._shippingCost.decimalAmount * 100,
      shippingCostCurrency: this._shippingCost.currency,
      labelUrl: this._labelUrl,
      estimatedDeliveryDate: this._estimatedDeliveryDate,
      actualDeliveryDate: this._actualDeliveryDate,
      requiresSignature: this._requiresSignature,
      isInsured: this._isInsured,
      insuranceValue: this._insuranceValue ? this._insuranceValue.decimalAmount * 100 : null,
      insuranceValueCurrency: this._insuranceValue?.currency || null,
      specialInstructions: this._specialInstructions,
      deliveryAttempts: this._deliveryAttempts,
      trackingEvents: this._trackingEvents,
      auditTrail: this._auditTrail,
      agencyId: this._agencyId,
      createdBy: this._createdBy,
      createdAt: this._createdAt,
      updatedBy: this._updatedBy,
      updatedAt: this._updatedAt,
      pickedUpAt: this._pickedUpAt,
      deliveredAt: this._deliveredAt,
    };
  }

  // Private Helper Methods

  private clone(): Shipping {
    const cloned = Object.create(Object.getPrototypeOf(this));
    Object.assign(cloned, this);

    cloned._deliveryAttempts = [...this._deliveryAttempts];
    cloned._trackingEvents = [...this._trackingEvents];
    cloned._auditTrail = [...this._auditTrail];

    return cloned;
  }

  private validateShippingProps(props: ShippingProps): void {
    if (!props.orderId?.trim()) {
      throw new ShippingValidationError('Order ID is required', 'orderId');
    }

    if (!props.orderNumber?.trim()) {
      throw new ShippingValidationError('Order number is required', 'orderNumber');
    }

    if (!props.customerId?.trim()) {
      throw new ShippingValidationError('Customer ID is required', 'customerId');
    }

    if (!props.customerName?.trim()) {
      throw new ShippingValidationError('Customer name is required', 'customerName');
    }

    if (!props.agencyId?.trim()) {
      throw new ShippingValidationError('Agency ID is required', 'agencyId');
    }

    if (!props.createdBy?.trim()) {
      throw new ShippingValidationError('Created by is required', 'createdBy');
    }

    this.validateShippingAddress(props.shippingAddress, 'shippingAddress');
    this.validateShippingAddress(props.returnAddress, 'returnAddress');
    this.validateCarrierServiceType(props.carrier, props.serviceType);
  }

  private validateShippingAddress(address: ShippingAddress, field: string): void {
    if (!address.name?.trim()) {
      throw new ShippingValidationError(`${field} name is required`, `${field}.name`);
    }

    if (!address.street1?.trim()) {
      throw new ShippingValidationError(`${field} street address is required`, `${field}.street1`);
    }

    if (!address.city?.trim()) {
      throw new ShippingValidationError(`${field} city is required`, `${field}.city`);
    }

    if (!address.state?.trim()) {
      throw new ShippingValidationError(`${field} state is required`, `${field}.state`);
    }

    if (!address.zipCode?.trim()) {
      throw new ShippingValidationError(`${field} zip code is required`, `${field}.zipCode`);
    }

    if (!address.country?.trim()) {
      throw new ShippingValidationError(`${field} country is required`, `${field}.country`);
    }
  }

  private validateCarrierServiceType(carrier: ShippingCarrier, serviceType: ShippingServiceType): void {
    const carrierServiceTypes: Record<ShippingCarrier, ShippingServiceType[]> = {
      [ShippingCarrier.UPS]: [
        ShippingServiceType.GROUND,
        ShippingServiceType.STANDARD,
        ShippingServiceType.EXPRESS,
        ShippingServiceType.OVERNIGHT,
        ShippingServiceType.TWO_DAY,
      ],
      [ShippingCarrier.FEDEX]: [
        ShippingServiceType.GROUND,
        ShippingServiceType.STANDARD,
        ShippingServiceType.EXPRESS,
        ShippingServiceType.OVERNIGHT,
        ShippingServiceType.TWO_DAY,
      ],
      [ShippingCarrier.DHL]: [
        ShippingServiceType.STANDARD,
        ShippingServiceType.EXPRESS,
        ShippingServiceType.INTERNATIONAL,
      ],
      [ShippingCarrier.USPS]: [ShippingServiceType.GROUND, ShippingServiceType.STANDARD, ShippingServiceType.EXPRESS],
      [ShippingCarrier.LOCAL_COURIER]: [ShippingServiceType.SAME_DAY, ShippingServiceType.STANDARD],
      [ShippingCarrier.SELF_DELIVERY]: [ShippingServiceType.SAME_DAY, ShippingServiceType.STANDARD],
      [ShippingCarrier.THIRD_PARTY]: Object.values(ShippingServiceType),
    };

    const allowedServiceTypes = carrierServiceTypes[carrier];
    if (!allowedServiceTypes.includes(serviceType)) {
      throw new CarrierValidationError(`Service type ${serviceType} is not supported by carrier ${carrier}`, carrier);
    }
  }

  private validatePackageDimensions(): void {
    const { length, width, height, weight } = this._packageDimensions;

    if (length <= 0 || width <= 0 || height <= 0) {
      throw new ShippingValidationError('Package dimensions must be positive values');
    }

    if (weight <= 0) {
      throw new ShippingValidationError('Package weight must be positive');
    }

    const maxDimension = Math.max(length, width, height);
    const totalDimensions = length + width + height;

    if (maxDimension > 270) {
      throw new ShippingValidationError('Package dimension exceeds carrier limits');
    }

    if (totalDimensions > 400) {
      throw new ShippingValidationError('Package total dimensions exceed carrier limits');
    }

    if (weight > 70) {
      throw new ShippingValidationError('Package weight exceeds carrier limits');
    }
  }

  private addShippingAudit(
    actionType: ShippingActionType,
    previousStatus: ShippingStatus,
    newStatus: ShippingStatus,
    performedBy: string,
    notes?: string,
    metadata?: Record<string, any>,
    trackingEvent?: TrackingEvent
  ): void {
    const auditEntry: ShippingAuditEntry = {
      actionType,
      previousStatus,
      newStatus,
      performedBy,
      performedAt: new Date(),
      notes,
      metadata,
      trackingEvent,
    };

    this._auditTrail.push(auditEntry);
  }
}
