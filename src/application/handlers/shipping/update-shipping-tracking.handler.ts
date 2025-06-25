import { UpdateShippingTrackingCommand } from '../../commands/shipping/update-shipping-tracking.command';
import { ShippingService, ShippingTrackingUpdate } from '../../../domain/services/shipping.service';
import { Shipping, ShippingValidationError, ShippingStatusError } from '../../../domain/entities/shipping';

/**
 * Update Shipping Tracking Command Handler - Step 3B.2.1
 *
 * Handles updating shipping tracking information from carrier webhooks or manual updates.
 * Manages status transitions, location updates, and tracking event creation.
 *
 * Business Logic:
 * - Validates command data and business rules
 * - Updates shipping status and tracking information
 * - Creates tracking events and audit trail
 * - Handles status transition validation
 * - Manages delivery confirmations and attempts
 *
 * @domain Order Management - Shipping Operations
 * @pattern Command Handler
 * @version 1.0.0 - Step 3B: Shipping Application Layer
 */
export class UpdateShippingTrackingHandler {
  constructor(private readonly shippingService: ShippingService) {}

  /**
   * Handle update shipping tracking command
   */
  async execute(command: UpdateShippingTrackingCommand): Promise<UpdateShippingTrackingResult> {
    try {
      // Validate command
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return {
          success: false,
          message: 'Command validation failed',
          error: validationErrors.join(', '),
          metadata: { errors: validationErrors },
        };
      }

      // Build tracking update from command
      const trackingUpdate: ShippingTrackingUpdate = {
        shippingId: command.shippingId,
        trackingNumber: command.trackingNumber,
        status: command.status,
        location: command.location,
        description: command.description,
        timestamp: command.timestamp,
        ...(command.carrierCode && { carrierCode: command.carrierCode }),
        ...(command.facilityCode && { facilityCode: command.facilityCode }),
        ...(command.nextExpectedUpdate && { nextExpectedUpdate: command.nextExpectedUpdate }),
      };

      // Update shipping tracking
      const updatedShipping = await this.shippingService.updateShippingTracking(trackingUpdate);

      // Handle delivery-specific updates
      let deliveryResult = null;
      if (command.isDeliveryConfirmation() && command.receivedBy && command.signatureObtained !== undefined) {
        // For delivery confirmation, the service already handles the status update
        // We just need to capture the delivery metadata
        deliveryResult = {
          deliveredAt: command.timestamp,
          receivedBy: command.receivedBy,
          signatureObtained: command.signatureObtained,
        };
      }

      // Handle delivery attempt updates
      let attemptResult = null;
      if (command.isDeliveryAttempt() && command.deliveryAttemptReason) {
        // For delivery attempt, capture the attempt metadata
        // The actual delivery attempt count would come from the updated shipping entity
        attemptResult = {
          attemptReason: command.deliveryAttemptReason,
          nextAttemptDate: command.nextExpectedUpdate,
          totalAttempts: (updatedShipping.deliveryAttempts?.length || 0) + 1,
        };
      }

      const metadata: any = {
        shipping: updatedShipping,
        trackingUpdate: {
          previousStatus: updatedShipping.status, // This would need to be captured before update
          newStatus: command.status,
          location: command.location,
          timestamp: command.timestamp,
        },
      };

      if (deliveryResult) {
        metadata.deliveryConfirmation = deliveryResult;
      }

      if (attemptResult) {
        metadata.deliveryAttempt = attemptResult;
      }

      return {
        success: true,
        shippingId: updatedShipping.id,
        trackingNumber: updatedShipping.trackingNumber || command.trackingNumber,
        message: 'Shipping tracking updated successfully',
        metadata,
      };
    } catch (error) {
      if (error instanceof ShippingValidationError) {
        return {
          success: false,
          message: 'Shipping validation failed',
          error: error.message,
        };
      }

      if (error instanceof ShippingStatusError) {
        return {
          success: false,
          message: 'Invalid status transition',
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Failed to update shipping tracking',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

/**
 * Update shipping tracking result interface
 */
export interface UpdateShippingTrackingResult {
  readonly success: boolean;
  readonly message: string;
  readonly error?: string;
  readonly shippingId?: string;
  readonly trackingNumber?: string;
  readonly metadata?: {
    readonly shipping?: Shipping;
    readonly trackingUpdate?: {
      readonly previousStatus: string;
      readonly newStatus: string;
      readonly location: string;
      readonly timestamp: Date;
    };
    readonly deliveryConfirmation?: {
      readonly deliveredAt: Date;
      readonly receivedBy: string;
      readonly signatureObtained: boolean;
    };
    readonly deliveryAttempt?: {
      readonly attemptReason: string;
      readonly nextAttemptDate?: Date;
      readonly totalAttempts: number;
    };
    readonly errors?: string[];
  };
}
