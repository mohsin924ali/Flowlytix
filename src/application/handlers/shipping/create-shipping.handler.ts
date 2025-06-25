import { CreateShippingCommand } from '../../commands/shipping/create-shipping.command';
import { ShippingService, ShippingCostCalculation } from '../../../domain/services/shipping.service';
import {
  Shipping,
  ShippingProps,
  ShippingValidationError,
  ShippingStatusError,
} from '../../../domain/entities/shipping';

/**
 * Create Shipping Command Handler - Step 3B.1
 *
 * Handles the creation of new shipping records with comprehensive validation,
 * cost calculation, and optional label generation.
 *
 * Business Logic:
 * - Validates command data and business rules
 * - Creates shipping entity with cost calculation
 * - Optionally generates shipping labels
 * - Handles error scenarios and logging
 *
 * @domain Order Management - Shipping Operations
 * @pattern Command Handler
 * @version 1.0.0 - Step 3B: Shipping Application Layer
 */
export class CreateShippingHandler {
  constructor(private readonly shippingService: ShippingService) {}

  /**
   * Handle create shipping command
   */
  async execute(command: CreateShippingCommand): Promise<CreateShippingResult> {
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

      // Build shipping props from command
      const shippingProps: ShippingProps = {
        orderId: command.orderId,
        orderNumber: command.orderNumber,
        customerId: command.customerId,
        customerName: command.customerName,
        shippingAddress: command.shippingAddress,
        returnAddress: command.returnAddress,
        carrier: command.carrier,
        serviceType: command.serviceType,
        priority: command.priority,
        packageDimensions: command.packageDimensions,
        declaredValue: command.declaredValue,
        shippingCost: command.shippingCost,
        requiresSignature: command.requiresSignature,
        isInsured: command.isInsured,
        agencyId: command.agencyId,
        createdBy: command.createdBy,
        ...(command.trackingNumber && { trackingNumber: command.trackingNumber }),
        ...(command.labelUrl && { labelUrl: command.labelUrl }),
        ...(command.estimatedDeliveryDate && { estimatedDeliveryDate: command.estimatedDeliveryDate }),
        ...(command.insuranceValue && { insuranceValue: command.insuranceValue }),
        ...(command.specialInstructions && { specialInstructions: command.specialInstructions }),
      };

      // Create shipping with cost calculation
      const shouldCalculateCost = command.calculateCost ?? true;
      const createResult = await this.shippingService.createShippingWithCalculation(shippingProps, shouldCalculateCost);

      let labelResponse = null;

      // Generate label if requested
      if (command.generateLabel) {
        try {
          labelResponse = await this.shippingService.generateShippingLabel({
            shippingId: createResult.shipping.id,
            userId: command.createdBy,
            notes: 'Created via command handler',
          });
        } catch (labelError) {
          // Log label generation error but don't fail the entire operation
          console.warn('Label generation failed during shipping creation:', labelError);
        }
      }

      const metadata: any = {
        shipping: createResult.shipping,
      };

      if (createResult.costCalculation) {
        metadata.costCalculation = createResult.costCalculation;
      }

      if (labelResponse) {
        metadata.labelResponse = labelResponse;
      }

      return {
        success: true,
        shippingId: createResult.shipping.id,
        message: 'Shipping created successfully',
        metadata,
      };
    } catch (error) {
      if (error instanceof ShippingValidationError || error instanceof ShippingStatusError) {
        return {
          success: false,
          message: 'Shipping validation failed',
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Failed to create shipping',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

/**
 * Create shipping result interface
 */
export interface CreateShippingResult {
  readonly success: boolean;
  readonly message: string;
  readonly error?: string;
  readonly shippingId?: string;
  readonly metadata?: {
    readonly shipping?: Shipping;
    readonly costCalculation?: ShippingCostCalculation;
    readonly labelResponse?: any;
    readonly errors?: string[];
  };
}
