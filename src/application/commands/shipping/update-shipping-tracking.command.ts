import { ShippingStatus } from '../../../domain/entities/shipping';

/**
 * Update Shipping Tracking Command - Step 3B.2.1
 *
 * Command to update shipping tracking information from carrier webhooks or manual updates.
 * Handles status transitions, location updates, and tracking event creation.
 *
 * @domain Order Management - Shipping Operations
 * @pattern Command
 * @version 1.0.0 - Step 3B: Shipping Application Layer
 */
export class UpdateShippingTrackingCommand {
  constructor(
    public readonly shippingId: string,
    public readonly trackingNumber: string,
    public readonly status: ShippingStatus,
    public readonly location: string,
    public readonly description: string,
    public readonly timestamp: Date,
    public readonly updatedBy: string,
    public readonly carrierCode?: string,
    public readonly facilityCode?: string,
    public readonly nextExpectedUpdate?: Date,
    public readonly deliveryAttemptReason?: string,
    public readonly receivedBy?: string,
    public readonly signatureObtained?: boolean
  ) {}

  /**
   * Validate command data
   */
  validate(): string[] {
    const errors: string[] = [];

    // Required field validations
    if (!this.shippingId?.trim()) {
      errors.push('Shipping ID is required');
    }

    if (!this.trackingNumber?.trim()) {
      errors.push('Tracking number is required');
    }

    if (!this.description?.trim()) {
      errors.push('Description is required');
    }

    if (!this.location?.trim()) {
      errors.push('Location is required');
    }

    if (!this.updatedBy?.trim()) {
      errors.push('Updated by is required');
    }

    // Status validation
    if (!Object.values(ShippingStatus).includes(this.status)) {
      errors.push('Invalid shipping status');
    }

    // Timestamp validation
    if (!this.timestamp || isNaN(this.timestamp.getTime())) {
      errors.push('Valid timestamp is required');
    }

    // Future timestamp validation (allow up to 1 hour in future for carrier delays)
    if (this.timestamp && this.timestamp > new Date(Date.now() + 60 * 60 * 1000)) {
      errors.push('Timestamp cannot be more than 1 hour in the future');
    }

    // Tracking number format validation
    if (this.trackingNumber && this.trackingNumber.trim().length < 3) {
      errors.push('Tracking number must be at least 3 characters');
    }

    if (this.trackingNumber && this.trackingNumber.trim().length > 50) {
      errors.push('Tracking number cannot exceed 50 characters');
    }

    // Description length validation
    if (this.description && this.description.trim().length > 500) {
      errors.push('Description cannot exceed 500 characters');
    }

    // Location validation
    if (this.location && this.location.trim().length > 200) {
      errors.push('Location cannot exceed 200 characters');
    }

    // Carrier code validation (if provided)
    if (this.carrierCode && this.carrierCode.trim().length > 10) {
      errors.push('Carrier code cannot exceed 10 characters');
    }

    // Facility code validation (if provided)
    if (this.facilityCode && this.facilityCode.trim().length > 20) {
      errors.push('Facility code cannot exceed 20 characters');
    }

    // Delivery-specific validations
    if (this.status === ShippingStatus.DELIVERED) {
      if (!this.receivedBy?.trim()) {
        errors.push('Received by is required for delivery confirmation');
      }

      if (this.receivedBy && this.receivedBy.trim().length > 100) {
        errors.push('Received by cannot exceed 100 characters');
      }

      if (this.signatureObtained === undefined) {
        errors.push('Signature obtained status is required for delivery confirmation');
      }
    }

    // Delivery attempt validations
    if (this.status === ShippingStatus.ATTEMPTED_DELIVERY) {
      if (!this.deliveryAttemptReason?.trim()) {
        errors.push('Delivery attempt reason is required for attempted delivery');
      }

      if (this.deliveryAttemptReason && this.deliveryAttemptReason.trim().length > 200) {
        errors.push('Delivery attempt reason cannot exceed 200 characters');
      }
    }

    // Next expected update validation
    if (this.nextExpectedUpdate && this.nextExpectedUpdate <= this.timestamp) {
      errors.push('Next expected update must be after the current timestamp');
    }

    return errors;
  }

  /**
   * Get command summary for logging
   */
  getLogSummary(): Record<string, any> {
    return {
      shippingId: this.shippingId,
      trackingNumber: this.trackingNumber,
      status: this.status,
      location: this.location,
      timestamp: this.timestamp.toISOString(),
      updatedBy: this.updatedBy,
      carrierCode: this.carrierCode,
      facilityCode: this.facilityCode,
      hasNextExpectedUpdate: !!this.nextExpectedUpdate,
      isDeliveryAttempt: this.status === ShippingStatus.ATTEMPTED_DELIVERY,
      isDelivery: this.status === ShippingStatus.DELIVERED,
    };
  }

  /**
   * Check if this is a delivery confirmation
   */
  isDeliveryConfirmation(): boolean {
    return this.status === ShippingStatus.DELIVERED;
  }

  /**
   * Check if this is a delivery attempt
   */
  isDeliveryAttempt(): boolean {
    return this.status === ShippingStatus.ATTEMPTED_DELIVERY;
  }

  /**
   * Check if this is a status regression (going backwards in workflow)
   */
  isStatusRegression(currentStatus: ShippingStatus): boolean {
    const statusOrder = [
      ShippingStatus.PENDING,
      ShippingStatus.LABEL_CREATED,
      ShippingStatus.PICKED_UP,
      ShippingStatus.IN_TRANSIT,
      ShippingStatus.OUT_FOR_DELIVERY,
      ShippingStatus.DELIVERED,
    ];

    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = statusOrder.indexOf(this.status);

    return currentIndex > newIndex && newIndex !== -1;
  }
}
