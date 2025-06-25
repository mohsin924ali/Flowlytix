import { GenerateShippingLabelCommand } from '../../commands/shipping/generate-shipping-label.command';
import {
  ShippingService,
  ShippingLabelRequest,
  ShippingLabelResponse,
} from '../../../domain/services/shipping.service';
import { ShippingValidationError, ShippingStatusError } from '../../../domain/entities/shipping';

/**
 * Generate Shipping Label Command Handler - Step 3B.3.2
 *
 * Handles generating shipping labels for pending shipments.
 * Manages carrier integration, label generation, and tracking number assignment.
 *
 * Business Logic:
 * - Validates command data and business rules
 * - Generates shipping labels through carrier APIs
 * - Updates shipping status to LABEL_CREATED
 * - Assigns tracking numbers and label URLs
 * - Handles insurance label generation
 * - Creates audit trail for label generation
 *
 * @domain Order Management - Shipping Operations
 * @pattern Command Handler (CQRS)
 * @version 1.0.0 - Step 3B: Shipping Application Layer
 */

/**
 * Result interface for generate shipping label operation
 */
export interface GenerateShippingLabelResult {
  readonly success: boolean;
  readonly message: string;
  readonly shippingId?: string;
  readonly trackingNumber?: string;
  readonly labelUrl?: string;
  readonly error?: string;
  readonly metadata?: {
    readonly labelResponse?: ShippingLabelResponse;
    readonly carrierConfirmation?: string;
    readonly estimatedDeliveryDate?: Date;
    readonly insuranceNumber?: string;
  };
}

/**
 * Generate Shipping Label Handler
 */
export class GenerateShippingLabelHandler {
  constructor(private readonly shippingService: ShippingService) {}

  /**
   * Execute generate shipping label command
   */
  async execute(command: GenerateShippingLabelCommand): Promise<GenerateShippingLabelResult> {
    try {
      // Validate command
      const validationErrors = command.validate();
      if (validationErrors.length > 0) {
        return {
          success: false,
          message: 'Command validation failed',
          error: validationErrors.join(', '),
        };
      }

      // Build label request from command
      const labelRequest: ShippingLabelRequest = {
        shippingId: command.shippingId,
        userId: command.userId,
        ...(command.carrierAccountId && { carrierAccountId: command.carrierAccountId }),
        ...(command.generateInsuranceLabel !== undefined && { generateInsuranceLabel: command.generateInsuranceLabel }),
        ...(command.customInstructions && { customInstructions: command.customInstructions }),
        ...(command.notes && { notes: command.notes }),
      };

      // Generate shipping label through service
      const labelResponse = await this.shippingService.generateShippingLabel(labelRequest);

      // Build metadata for response
      const metadata: GenerateShippingLabelResult['metadata'] = {
        labelResponse,
        carrierConfirmation: labelResponse.carrierConfirmation,
        estimatedDeliveryDate: labelResponse.estimatedDeliveryDate,
      };

      // Include insurance number if present
      if (labelResponse.insuranceNumber) {
        metadata.insuranceNumber = labelResponse.insuranceNumber;
      }

      return {
        success: true,
        message: 'Shipping label generated successfully',
        shippingId: labelResponse.shippingId,
        trackingNumber: labelResponse.trackingNumber,
        labelUrl: labelResponse.labelUrl,
        metadata,
      };
    } catch (error) {
      // Handle shipping validation errors
      if (error instanceof ShippingValidationError) {
        return {
          success: false,
          message: 'Shipping validation failed',
          error: error.message,
        };
      }

      // Handle shipping status errors
      if (error instanceof ShippingStatusError) {
        return {
          success: false,
          message: 'Invalid shipping status for label generation',
          error: error.message,
        };
      }

      // Handle generic errors
      return {
        success: false,
        message: 'Failed to generate shipping label',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
