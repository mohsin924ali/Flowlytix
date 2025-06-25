import { Money } from '../../../domain/value-objects/money';
import {
  ShippingCarrier,
  ShippingServiceType,
  ShippingPriority,
  ShippingAddress,
  PackageDimensions,
} from '../../../domain/entities/shipping';

/**
 * Create Shipping Command - Step 3B.1
 *
 * Command to create a new shipping record with comprehensive validation.
 * Includes cost calculation, address validation, and carrier selection.
 *
 * @domain Order Management - Shipping Operations
 * @pattern Command
 * @version 1.0.0 - Step 3B: Shipping Application Layer
 */
export class CreateShippingCommand {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly customerId: string,
    public readonly customerName: string,
    public readonly shippingAddress: ShippingAddress,
    public readonly returnAddress: ShippingAddress,
    public readonly carrier: ShippingCarrier,
    public readonly serviceType: ShippingServiceType,
    public readonly priority: ShippingPriority,
    public readonly packageDimensions: PackageDimensions,
    public readonly declaredValue: Money,
    public readonly shippingCost: Money,
    public readonly requiresSignature: boolean,
    public readonly isInsured: boolean,
    public readonly agencyId: string,
    public readonly createdBy: string,
    public readonly trackingNumber?: string,
    public readonly labelUrl?: string,
    public readonly estimatedDeliveryDate?: Date,
    public readonly insuranceValue?: Money,
    public readonly specialInstructions?: string,
    public readonly calculateCost?: boolean,
    public readonly validateAddress?: boolean,
    public readonly generateLabel?: boolean
  ) {}

  /**
   * Validate command data
   */
  validate(): string[] {
    const errors: string[] = [];

    // Required field validations
    if (!this.orderId?.trim()) {
      errors.push('Order ID is required');
    }

    if (!this.orderNumber?.trim()) {
      errors.push('Order number is required');
    }

    if (!this.customerId?.trim()) {
      errors.push('Customer ID is required');
    }

    if (!this.customerName?.trim()) {
      errors.push('Customer name is required');
    }

    if (!this.agencyId?.trim()) {
      errors.push('Agency ID is required');
    }

    if (!this.createdBy?.trim()) {
      errors.push('Created by is required');
    }

    // Address validations
    if (!this.shippingAddress) {
      errors.push('Shipping address is required');
    } else {
      const addressErrors = this.validateShippingAddress(this.shippingAddress, 'Shipping');
      errors.push(...addressErrors);
    }

    if (!this.returnAddress) {
      errors.push('Return address is required');
    } else {
      const addressErrors = this.validateShippingAddress(this.returnAddress, 'Return');
      errors.push(...addressErrors);
    }

    // Package dimensions validation
    if (!this.packageDimensions) {
      errors.push('Package dimensions are required');
    } else {
      const dimensionErrors = this.validatePackageDimensions();
      errors.push(...dimensionErrors);
    }

    // Money validations
    if (!this.declaredValue) {
      errors.push('Declared value is required');
    } else if (this.declaredValue.decimalAmount <= 0) {
      errors.push('Declared value must be greater than zero');
    }

    if (!this.shippingCost) {
      errors.push('Shipping cost is required');
    } else if (this.shippingCost.decimalAmount < 0) {
      errors.push('Shipping cost cannot be negative');
    }

    // Insurance validation
    if (this.isInsured) {
      if (!this.insuranceValue) {
        errors.push('Insurance value is required when shipment is insured');
      } else if (this.insuranceValue.decimalAmount <= 0) {
        errors.push('Insurance value must be greater than zero when shipment is insured');
      }
    }

    // Carrier and service type validation
    if (!Object.values(ShippingCarrier).includes(this.carrier)) {
      errors.push('Invalid shipping carrier');
    }

    if (!Object.values(ShippingServiceType).includes(this.serviceType)) {
      errors.push('Invalid shipping service type');
    }

    if (!Object.values(ShippingPriority).includes(this.priority)) {
      errors.push('Invalid shipping priority');
    }

    // Conditional validations
    if (this.trackingNumber && this.trackingNumber.trim().length < 3) {
      errors.push('Tracking number must be at least 3 characters');
    }

    if (this.labelUrl && !this.isValidUrl(this.labelUrl)) {
      errors.push('Label URL must be a valid URL');
    }

    if (this.estimatedDeliveryDate && this.estimatedDeliveryDate < new Date()) {
      errors.push('Estimated delivery date cannot be in the past');
    }

    return errors;
  }

  /**
   * Validate shipping address
   */
  private validateShippingAddress(address: ShippingAddress, type: string): string[] {
    const errors: string[] = [];

    if (!address.name?.trim()) {
      errors.push(`${type} address name is required`);
    }

    if (!address.street1?.trim()) {
      errors.push(`${type} address street is required`);
    }

    if (!address.city?.trim()) {
      errors.push(`${type} address city is required`);
    }

    if (!address.state?.trim()) {
      errors.push(`${type} address state is required`);
    }

    if (!address.zipCode?.trim()) {
      errors.push(`${type} address zip code is required`);
    }

    if (!address.country?.trim()) {
      errors.push(`${type} address country is required`);
    }

    if (!['RESIDENTIAL', 'COMMERCIAL'].includes(address.addressType)) {
      errors.push(`${type} address type must be RESIDENTIAL or COMMERCIAL`);
    }

    // Phone validation (if provided)
    if (address.phone && !this.isValidPhone(address.phone)) {
      errors.push(`${type} address phone number is invalid`);
    }

    // Email validation (if provided)
    if (address.email && !this.isValidEmail(address.email)) {
      errors.push(`${type} address email is invalid`);
    }

    return errors;
  }

  /**
   * Validate package dimensions
   */
  private validatePackageDimensions(): string[] {
    const errors: string[] = [];

    if (this.packageDimensions.length <= 0) {
      errors.push('Package length must be greater than zero');
    }

    if (this.packageDimensions.width <= 0) {
      errors.push('Package width must be greater than zero');
    }

    if (this.packageDimensions.height <= 0) {
      errors.push('Package height must be greater than zero');
    }

    if (this.packageDimensions.weight <= 0) {
      errors.push('Package weight must be greater than zero');
    }

    // Maximum dimension limits (carrier-agnostic)
    if (this.packageDimensions.length > 300) {
      errors.push('Package length cannot exceed 300cm');
    }

    if (this.packageDimensions.width > 300) {
      errors.push('Package width cannot exceed 300cm');
    }

    if (this.packageDimensions.height > 300) {
      errors.push('Package height cannot exceed 300cm');
    }

    if (this.packageDimensions.weight > 100) {
      errors.push('Package weight cannot exceed 100kg');
    }

    return errors;
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate phone number format
   */
  private isValidPhone(phone: string): boolean {
    // Basic phone validation - adjust regex as needed
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get command summary for logging
   */
  getLogSummary(): Record<string, any> {
    return {
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      customerId: this.customerId,
      carrier: this.carrier,
      serviceType: this.serviceType,
      priority: this.priority,
      declaredValue: this.declaredValue.decimalAmount,
      shippingCost: this.shippingCost.decimalAmount,
      requiresSignature: this.requiresSignature,
      isInsured: this.isInsured,
      agencyId: this.agencyId,
      createdBy: this.createdBy,
      calculateCost: this.calculateCost,
      shouldValidateAddress: this.validateAddress,
      generateLabel: this.generateLabel,
    };
  }
}
