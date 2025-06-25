import { Money } from '../value-objects/money';
import {
  Shipping,
  ShippingProps,
  ShippingStatus,
  ShippingCarrier,
  ShippingServiceType,
  ShippingPriority,
  ShippingValidationError,
  ShippingStatusError,
  CarrierValidationError,
  ShippingAddress,
  PackageDimensions,
  TrackingEvent,
  DeliveryAttempt,
} from '../entities/shipping';
import { ShippingRepository } from '../repositories/shipping.repository';

/**
 * Domain Service Error Classes
 */
export class ShippingServiceError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, any>;

  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message);
    this.name = 'ShippingServiceError';
    this.code = code;
    this.context = context;
  }
}

export class ShippingLabelError extends ShippingServiceError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'SHIPPING_LABEL_ERROR', context);
    this.name = 'ShippingLabelError';
  }
}

export class ShippingCarrierError extends ShippingServiceError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'SHIPPING_CARRIER_ERROR', context);
    this.name = 'ShippingCarrierError';
  }
}

export class ShippingDeliveryError extends ShippingServiceError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'SHIPPING_DELIVERY_ERROR', context);
    this.name = 'ShippingDeliveryError';
  }
}

/**
 * Shipping Service Interfaces
 */
export interface ShippingCostCalculation {
  readonly baseCost: Money;
  readonly carrierFee: Money;
  readonly serviceFee: Money;
  readonly insuranceFee: Money;
  readonly priorityFee: Money;
  readonly totalCost: Money;
  readonly estimatedDeliveryDays: number;
  readonly carrierRules: string[];
}

export interface ShippingLabelRequest {
  readonly shippingId: string;
  readonly userId: string;
  readonly carrierAccountId?: string;
  readonly generateInsuranceLabel?: boolean;
  readonly customInstructions?: string;
  readonly notes?: string;
}

export interface ShippingLabelResponse {
  readonly shippingId: string;
  readonly trackingNumber: string;
  readonly labelUrl: string;
  readonly labelFormat: 'PDF' | 'PNG' | 'ZPL';
  readonly estimatedDeliveryDate: Date;
  readonly carrierConfirmation: string;
  readonly insuranceNumber?: string;
}

export interface BulkShippingRequest {
  readonly shipments: ShippingProps[];
  readonly userId: string;
  readonly batchId?: string;
  readonly processingOptions?: {
    readonly validateAddresses?: boolean;
    readonly calculateCosts?: boolean;
    readonly generateLabels?: boolean;
    readonly sendNotifications?: boolean;
  };
}

export interface BulkShippingResult {
  readonly batchId: string;
  readonly totalShipments: number;
  readonly successfulShipments: number;
  readonly failedShipments: number;
  readonly results: Array<{
    readonly index: number;
    readonly shippingId?: string;
    readonly success: boolean;
    readonly error?: string;
    readonly trackingNumber?: string;
  }>;
  readonly summary: {
    readonly totalCost: Money;
    readonly averageDeliveryDays: number;
    readonly carrierBreakdown: Record<ShippingCarrier, number>;
  };
}

export interface ShippingTrackingUpdate {
  readonly shippingId: string;
  readonly trackingNumber: string;
  readonly status: ShippingStatus;
  readonly location?: string;
  readonly description: string;
  readonly timestamp: Date;
  readonly carrierCode?: string;
  readonly facilityCode?: string;
  readonly nextExpectedUpdate?: Date;
}

export interface DeliveryAttemptRequest {
  readonly shippingId: string;
  readonly userId: string;
  readonly attemptReason?: string;
  readonly nextAttemptDate?: Date;
  readonly customerNotified?: boolean;
  readonly notes?: string;
}

export interface DeliveryConfirmationRequest {
  readonly shippingId: string;
  readonly userId: string;
  readonly deliveryDate?: Date;
  readonly receivedBy?: string;
  readonly signatureObtained?: boolean;
  readonly deliveryLocation?: string;
  readonly notes?: string;
}

/**
 * Shipping Domain Service
 *
 * Handles complex shipping business logic including:
 * - Cost calculations and carrier selection
 * - Label generation and tracking
 * - Delivery management and confirmation
 * - Bulk shipping operations
 * - Cross-entity shipping workflows
 */
export class ShippingService {
  constructor(private readonly shippingRepository: ShippingRepository) {}

  /**
   * Create shipping with cost calculation and validation
   */
  async createShippingWithCalculation(
    props: ShippingProps,
    calculateCost = true
  ): Promise<{ shipping: Shipping; costCalculation?: ShippingCostCalculation }> {
    try {
      // Validate shipping address
      await this.validateShippingAddress(props.shippingAddress);

      // Calculate shipping cost if requested
      let costCalculation: ShippingCostCalculation | undefined;
      let finalProps = props;

      if (calculateCost) {
        costCalculation = await this.calculateShippingCost(props);

        // Update props with calculated cost if not provided
        if (props.shippingCost.decimalAmount === 0) {
          finalProps = {
            ...props,
            shippingCost: costCalculation.totalCost,
          };
        }
      }

      // Create shipping entity
      const shipping = Shipping.create(finalProps);

      // Persist shipping
      const savedShipping = await this.shippingRepository.save(shipping);

      return {
        shipping: savedShipping,
        costCalculation,
      };
    } catch (error) {
      if (error instanceof ShippingValidationError || error instanceof CarrierValidationError) {
        throw error;
      }

      throw new ShippingServiceError('Failed to create shipping with calculation', 'CREATE_SHIPPING_ERROR', {
        props,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate shipping label
   */
  async generateShippingLabel(request: ShippingLabelRequest): Promise<ShippingLabelResponse> {
    try {
      // Get shipping entity
      const shipping = await this.shippingRepository.findById(request.shippingId);
      if (!shipping) {
        throw new ShippingLabelError('Shipping not found', { shippingId: request.shippingId });
      }

      // Validate shipping can have label created
      if (!shipping.canCreateLabel()) {
        throw new ShippingLabelError('Cannot create label for shipping in current status', {
          shippingId: request.shippingId,
          currentStatus: shipping.status,
        });
      }

      // Generate label with carrier
      const labelResponse = await this.generateCarrierLabel(shipping, request);

      // Update shipping with label information
      const updatedShipping = shipping.createLabel(
        request.userId,
        labelResponse.trackingNumber,
        labelResponse.labelUrl,
        request.notes
      );

      // Save updated shipping
      await this.shippingRepository.save(updatedShipping);

      return labelResponse;
    } catch (error) {
      if (error instanceof ShippingLabelError) {
        throw error;
      }

      throw new ShippingLabelError('Failed to generate shipping label', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Process bulk shipping creation
   */
  async processBulkShipping(request: BulkShippingRequest): Promise<BulkShippingResult> {
    const batchId = request.batchId || `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const results: BulkShippingResult['results'] = [];
    let totalCost = Money.fromDecimal(0, 'USD');
    let totalDeliveryDays = 0;
    const carrierBreakdown: Record<ShippingCarrier, number> = {} as any;

    try {
      for (let i = 0; i < request.shipments.length; i++) {
        const shipmentProps = request.shipments[i];

        try {
          // Create shipping with calculation
          const { shipping, costCalculation } = await this.createShippingWithCalculation(
            shipmentProps,
            request.processingOptions?.calculateCosts ?? true
          );

          // Generate label if requested
          let trackingNumber: string | undefined;
          if (request.processingOptions?.generateLabels) {
            try {
              const labelResponse = await this.generateShippingLabel({
                shippingId: shipping.id,
                userId: request.userId,
                notes: `Bulk batch: ${batchId}`,
              });
              trackingNumber = labelResponse.trackingNumber;
            } catch (labelError) {
              // Label generation failed, but shipping was created
              console.warn(`Label generation failed for shipping ${shipping.id}:`, labelError);
            }
          }

          // Accumulate statistics
          if (costCalculation) {
            totalCost = totalCost.add(costCalculation.totalCost);
            totalDeliveryDays += costCalculation.estimatedDeliveryDays;
            carrierBreakdown[shipping.carrier] = (carrierBreakdown[shipping.carrier] || 0) + 1;
          }

          results.push({
            index: i,
            shippingId: shipping.id,
            success: true,
            trackingNumber,
          });
        } catch (error) {
          results.push({
            index: i,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const successfulShipments = results.filter((r) => r.success).length;
      const failedShipments = results.filter((r) => !r.success).length;

      return {
        batchId,
        totalShipments: request.shipments.length,
        successfulShipments,
        failedShipments,
        results,
        summary: {
          totalCost,
          averageDeliveryDays: successfulShipments > 0 ? Math.round(totalDeliveryDays / successfulShipments) : 0,
          carrierBreakdown,
        },
      };
    } catch (error) {
      throw new ShippingServiceError('Failed to process bulk shipping', 'BULK_SHIPPING_ERROR', {
        batchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update shipping tracking information
   */
  async updateShippingTracking(update: ShippingTrackingUpdate): Promise<Shipping> {
    try {
      const shipping = await this.shippingRepository.findById(update.shippingId);
      if (!shipping) {
        throw new ShippingServiceError('Shipping not found', 'SHIPPING_NOT_FOUND', { shippingId: update.shippingId });
      }

      // Validate tracking number matches
      if (shipping.trackingNumber !== update.trackingNumber) {
        throw new ShippingServiceError('Tracking number mismatch', 'TRACKING_MISMATCH', {
          shippingId: update.shippingId,
          expectedTracking: shipping.trackingNumber,
          providedTracking: update.trackingNumber,
        });
      }

      // Create tracking event
      const trackingEvent: Omit<TrackingEvent, 'timestamp'> = {
        status: update.status,
        location: update.location,
        description: update.description,
        carrierCode: update.carrierCode,
        facilityCode: update.facilityCode,
        eventType: this.determineEventType(update.status),
      };

      // Update shipping based on status
      let updatedShipping: Shipping;
      const systemUserId = 'system-tracking';

      switch (update.status) {
        case ShippingStatus.PICKED_UP:
          if (shipping.canPickup()) {
            updatedShipping = shipping.confirmPickup(systemUserId, update.timestamp);
          } else {
            updatedShipping = shipping.addTrackingEvent(systemUserId, trackingEvent);
          }
          break;

        case ShippingStatus.IN_TRANSIT:
          if (shipping.canMarkInTransit()) {
            updatedShipping = shipping.markInTransit(systemUserId, update.location);
          } else {
            updatedShipping = shipping.addTrackingEvent(systemUserId, trackingEvent);
          }
          break;

        case ShippingStatus.OUT_FOR_DELIVERY:
          updatedShipping = shipping.markOutForDelivery(systemUserId, update.location);
          break;

        case ShippingStatus.DELIVERED:
          if (shipping.canDeliver()) {
            updatedShipping = shipping.confirmDelivery(systemUserId, update.timestamp);
          } else {
            updatedShipping = shipping.addTrackingEvent(systemUserId, trackingEvent);
          }
          break;

        case ShippingStatus.FAILED:
          updatedShipping = shipping.markFailed(systemUserId, update.description);
          break;

        default:
          updatedShipping = shipping.addTrackingEvent(systemUserId, trackingEvent);
      }

      // Save updated shipping
      return await this.shippingRepository.save(updatedShipping);
    } catch (error) {
      if (error instanceof ShippingServiceError) {
        throw error;
      }

      throw new ShippingServiceError('Failed to update shipping tracking', 'TRACKING_UPDATE_ERROR', {
        update,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Attempt delivery
   */
  async attemptDelivery(request: DeliveryAttemptRequest): Promise<Shipping> {
    try {
      const shipping = await this.shippingRepository.findById(request.shippingId);
      if (!shipping) {
        throw new ShippingDeliveryError('Shipping not found', { shippingId: request.shippingId });
      }

      // Attempt delivery
      const updatedShipping = shipping.attemptDelivery(
        request.userId,
        request.attemptReason,
        request.nextAttemptDate,
        request.notes
      );

      // Save updated shipping
      return await this.shippingRepository.save(updatedShipping);
    } catch (error) {
      if (error instanceof ShippingStatusError) {
        throw new ShippingDeliveryError(error.message, { request });
      }

      throw new ShippingDeliveryError('Failed to attempt delivery', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Confirm delivery
   */
  async confirmDelivery(request: DeliveryConfirmationRequest): Promise<Shipping> {
    try {
      const shipping = await this.shippingRepository.findById(request.shippingId);
      if (!shipping) {
        throw new ShippingDeliveryError('Shipping not found', { shippingId: request.shippingId });
      }

      // Confirm delivery
      const updatedShipping = shipping.confirmDelivery(
        request.userId,
        request.deliveryDate,
        request.receivedBy,
        request.signatureObtained,
        request.notes
      );

      // Save updated shipping
      return await this.shippingRepository.save(updatedShipping);
    } catch (error) {
      if (error instanceof ShippingStatusError || error instanceof ShippingValidationError) {
        throw new ShippingDeliveryError(error.message, { request });
      }

      throw new ShippingDeliveryError('Failed to confirm delivery', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get shipping analytics for agency
   */
  async getShippingAnalytics(agencyId: string, dateRange?: { from: Date; to: Date }) {
    try {
      const shipments = dateRange
        ? await this.shippingRepository.findByAgencyAndDateRange(agencyId, dateRange.from, dateRange.to)
        : await this.shippingRepository.search({ agencyId });

      const analytics = {
        totalShipments: shipments.length,
        totalCost: Money.fromDecimal(0, 'USD'),
        averageDeliveryTime: 0,
        statusBreakdown: {} as Record<ShippingStatus, number>,
        carrierBreakdown: {} as Record<ShippingCarrier, number>,
        deliveryPerformance: {
          onTimeDeliveries: 0,
          lateDeliveries: 0,
          failedDeliveries: 0,
          averageDeliveryDays: 0,
        },
      };

      let totalDeliveryDays = 0;
      let deliveredCount = 0;

      for (const shipping of shipments) {
        // Accumulate cost
        analytics.totalCost = analytics.totalCost.add(shipping.shippingCost);

        // Status breakdown
        analytics.statusBreakdown[shipping.status] = (analytics.statusBreakdown[shipping.status] || 0) + 1;

        // Carrier breakdown
        analytics.carrierBreakdown[shipping.carrier] = (analytics.carrierBreakdown[shipping.carrier] || 0) + 1;

        // Delivery performance
        if (shipping.status === ShippingStatus.DELIVERED && shipping.actualDeliveryDate) {
          deliveredCount++;
          const deliveryTime = shipping.actualDeliveryDate.getTime() - shipping.createdAt.getTime();
          const deliveryDays = Math.ceil(deliveryTime / (1000 * 60 * 60 * 24));
          totalDeliveryDays += deliveryDays;

          if (shipping.estimatedDeliveryDate) {
            if (shipping.actualDeliveryDate <= shipping.estimatedDeliveryDate) {
              analytics.deliveryPerformance.onTimeDeliveries++;
            } else {
              analytics.deliveryPerformance.lateDeliveries++;
            }
          }
        } else if (shipping.status === ShippingStatus.FAILED) {
          analytics.deliveryPerformance.failedDeliveries++;
        }
      }

      if (deliveredCount > 0) {
        analytics.deliveryPerformance.averageDeliveryDays = Math.round(totalDeliveryDays / deliveredCount);
      }

      return analytics;
    } catch (error) {
      throw new ShippingServiceError('Failed to get shipping analytics', 'ANALYTICS_ERROR', {
        agencyId,
        dateRange,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Private helper methods
   */
  private async validateShippingAddress(address: ShippingAddress): Promise<void> {
    // Address validation logic would go here
    // For now, just basic validation
    if (!address.street1 || !address.city || !address.state || !address.zipCode) {
      throw new ShippingValidationError('Incomplete shipping address', 'address');
    }
  }

  private async calculateShippingCost(props: ShippingProps): Promise<ShippingCostCalculation> {
    // Shipping cost calculation logic
    // This would typically integrate with carrier APIs

    const baseCost = Money.fromDecimal(10.0, 'USD');
    let carrierFee = Money.fromDecimal(0, 'USD');
    let serviceFee = Money.fromDecimal(0, 'USD');
    let insuranceFee = Money.fromDecimal(0, 'USD');
    let priorityFee = Money.fromDecimal(0, 'USD');

    // Carrier-specific fees
    switch (props.carrier) {
      case ShippingCarrier.UPS:
        carrierFee = Money.fromDecimal(5.0, 'USD');
        break;
      case ShippingCarrier.FEDEX:
        carrierFee = Money.fromDecimal(6.0, 'USD');
        break;
      case ShippingCarrier.DHL:
        carrierFee = Money.fromDecimal(8.0, 'USD');
        break;
      default:
        carrierFee = Money.fromDecimal(3.0, 'USD');
    }

    // Service type fees
    switch (props.serviceType) {
      case ShippingServiceType.OVERNIGHT:
        serviceFee = Money.fromDecimal(25.0, 'USD');
        break;
      case ShippingServiceType.EXPRESS:
        serviceFee = Money.fromDecimal(15.0, 'USD');
        break;
      case ShippingServiceType.TWO_DAY:
        serviceFee = Money.fromDecimal(10.0, 'USD');
        break;
      case ShippingServiceType.SAME_DAY:
        serviceFee = Money.fromDecimal(50.0, 'USD');
        break;
      default:
        serviceFee = Money.fromDecimal(0, 'USD');
    }

    // Insurance fee
    if (props.isInsured && props.insuranceValue) {
      const insuranceRate = 0.02; // 2% of declared value
      insuranceFee = Money.fromDecimal(
        props.insuranceValue.decimalAmount * insuranceRate,
        props.insuranceValue.currency
      );
    }

    // Priority fee
    switch (props.priority) {
      case ShippingPriority.URGENT:
        priorityFee = Money.fromDecimal(10.0, 'USD');
        break;
      case ShippingPriority.CRITICAL:
        priorityFee = Money.fromDecimal(20.0, 'USD');
        break;
      default:
        priorityFee = Money.fromDecimal(0, 'USD');
    }

    const totalCost = baseCost.add(carrierFee).add(serviceFee).add(insuranceFee).add(priorityFee);

    // Estimated delivery days
    let estimatedDeliveryDays = 5; // Default
    switch (props.serviceType) {
      case ShippingServiceType.SAME_DAY:
        estimatedDeliveryDays = 1;
        break;
      case ShippingServiceType.OVERNIGHT:
        estimatedDeliveryDays = 1;
        break;
      case ShippingServiceType.EXPRESS:
        estimatedDeliveryDays = 2;
        break;
      case ShippingServiceType.TWO_DAY:
        estimatedDeliveryDays = 2;
        break;
      case ShippingServiceType.GROUND:
        estimatedDeliveryDays = 5;
        break;
      case ShippingServiceType.STANDARD:
        estimatedDeliveryDays = 7;
        break;
    }

    return {
      baseCost,
      carrierFee,
      serviceFee,
      insuranceFee,
      priorityFee,
      totalCost,
      estimatedDeliveryDays,
      carrierRules: this.getCarrierRules(props.carrier),
    };
  }

  private async generateCarrierLabel(
    shipping: Shipping,
    request: ShippingLabelRequest
  ): Promise<ShippingLabelResponse> {
    // This would integrate with actual carrier APIs
    // For now, return mock response

    const trackingNumber = `${shipping.carrier}${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const labelUrl = `https://labels.example.com/${trackingNumber}.pdf`;

    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5);

    return {
      shippingId: shipping.id,
      trackingNumber,
      labelUrl,
      labelFormat: 'PDF',
      estimatedDeliveryDate,
      carrierConfirmation: `CONF-${trackingNumber}`,
      insuranceNumber: shipping.isInsured ? `INS-${trackingNumber}` : undefined,
    };
  }

  private determineEventType(status: ShippingStatus): TrackingEvent['eventType'] {
    switch (status) {
      case ShippingStatus.DELIVERED:
      case ShippingStatus.ATTEMPTED_DELIVERY:
        return 'DELIVERY';
      case ShippingStatus.FAILED:
      case ShippingStatus.LOST:
        return 'EXCEPTION';
      default:
        return 'SHIPMENT';
    }
  }

  private getCarrierRules(carrier: ShippingCarrier): string[] {
    const rules: Record<ShippingCarrier, string[]> = {
      [ShippingCarrier.UPS]: [
        'Maximum package weight: 70kg',
        'Maximum dimensions: 274cm length + girth',
        'Signature required for packages over $500',
      ],
      [ShippingCarrier.FEDEX]: [
        'Maximum package weight: 68kg',
        'Maximum dimensions: 330cm length + girth',
        'Adult signature required for certain destinations',
      ],
      [ShippingCarrier.DHL]: [
        'Maximum package weight: 70kg',
        'Maximum dimensions: 300cm length + girth',
        'International shipping documentation required',
      ],
      [ShippingCarrier.USPS]: [
        'Maximum package weight: 32kg',
        'Maximum dimensions: 274cm length + girth',
        'Delivery confirmation available',
      ],
      [ShippingCarrier.LOCAL_COURIER]: [
        'Same-day delivery available',
        'Local area coverage only',
        'Direct contact with driver possible',
      ],
      [ShippingCarrier.SELF_DELIVERY]: [
        'Company vehicle required',
        'Driver must be licensed',
        'Delivery confirmation required',
      ],
      [ShippingCarrier.THIRD_PARTY]: [
        'Third-party terms apply',
        'Tracking may be limited',
        'Insurance coverage varies',
      ],
    };

    return rules[carrier] || [];
  }
}
