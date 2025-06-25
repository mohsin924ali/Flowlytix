/**
 * Order Fulfillment Commands
 *
 * Commands for managing order fulfillment workflow operations.
 * Handles picking, packing, shipping, delivery, and rollback operations
 * following CQRS pattern with comprehensive validation.
 *
 * Business Rules:
 * - Only confirmed orders can start fulfillment
 * - Fulfillment must follow proper sequence (picking → packing → shipping → delivery)
 * - Rollback operations must validate target status compatibility
 * - Audit trail must be maintained for all operations
 * - User permissions must be validated for each operation
 * - Partial fulfillment must include reason and affected items
 *
 * @domain Order Management - Fulfillment Workflow
 * @pattern CQRS Command
 * @version 1.0.0 - Step 1B: Application Layer Enhancement
 */

import { z } from 'zod';
import { OrderFulfillmentStatus } from '../../../domain/entities/order';

/**
 * Base fulfillment command schema with common fields
 */
const BaseFulfillmentCommandSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

/**
 * Start Picking Command Schema
 */
export const StartPickingCommandSchema = BaseFulfillmentCommandSchema.extend({
  assignedWorker: z.string().max(200, 'Assigned worker name too long').optional(),
});

/**
 * Complete Picking Command Schema
 */
export const CompletePickingCommandSchema = BaseFulfillmentCommandSchema;

/**
 * Start Packing Command Schema
 */
export const StartPackingCommandSchema = BaseFulfillmentCommandSchema.extend({
  assignedWorker: z.string().max(200, 'Assigned worker name too long').optional(),
});

/**
 * Complete Packing Command Schema
 */
export const CompletePackingCommandSchema = BaseFulfillmentCommandSchema;

/**
 * Ship Order Command Schema
 */
export const ShipOrderCommandSchema = BaseFulfillmentCommandSchema.extend({
  trackingNumber: z.string().max(100, 'Tracking number too long').optional(),
  carrier: z.string().max(100, 'Carrier name too long').optional(),
});

/**
 * Deliver Order Command Schema
 */
export const DeliverOrderCommandSchema = BaseFulfillmentCommandSchema.extend({
  deliveredAt: z.coerce
    .date({
      errorMap: () => ({ message: 'Invalid delivery date' }),
    })
    .optional(),
  recipientName: z.string().max(200, 'Recipient name too long').optional(),
});

/**
 * Mark Partial Fulfillment Command Schema
 */
export const MarkPartialFulfillmentCommandSchema = BaseFulfillmentCommandSchema.extend({
  reason: z.string().min(1, 'Reason is required for partial fulfillment').max(500, 'Reason too long'),
  affectedItems: z.array(z.string()).max(100, 'Too many affected items').optional(),
});

/**
 * Rollback Fulfillment Command Schema
 */
export const RollbackFulfillmentCommandSchema = BaseFulfillmentCommandSchema.extend({
  targetStatus: z.nativeEnum(OrderFulfillmentStatus, {
    errorMap: () => ({ message: 'Invalid target fulfillment status' }),
  }),
  reason: z.string().min(1, 'Reason is required for rollback').max(500, 'Reason too long'),
});

/**
 * Command Types
 */
export type StartPickingCommand = z.infer<typeof StartPickingCommandSchema>;
export type CompletePickingCommand = z.infer<typeof CompletePickingCommandSchema>;
export type StartPackingCommand = z.infer<typeof StartPackingCommandSchema>;
export type CompletePackingCommand = z.infer<typeof CompletePackingCommandSchema>;
export type ShipOrderCommand = z.infer<typeof ShipOrderCommandSchema>;
export type DeliverOrderCommand = z.infer<typeof DeliverOrderCommandSchema>;
export type MarkPartialFulfillmentCommand = z.infer<typeof MarkPartialFulfillmentCommandSchema>;
export type RollbackFulfillmentCommand = z.infer<typeof RollbackFulfillmentCommandSchema>;

/**
 * Fulfillment Command Result
 */
export interface FulfillmentCommandResult {
  readonly success: boolean;
  readonly orderId?: string;
  readonly orderNumber?: string;
  readonly previousStatus?: OrderFulfillmentStatus;
  readonly newStatus?: OrderFulfillmentStatus;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
}

/**
 * Fulfillment Command Validation Error
 */
export class FulfillmentCommandValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'FulfillmentCommandValidationError';
  }
}

/**
 * Validate Start Picking Command
 * @param command - Command to validate
 * @returns Validated command data
 */
export function validateStartPickingCommand(command: unknown): StartPickingCommand {
  try {
    return StartPickingCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path]!.push(err.message);
      });
      throw new FulfillmentCommandValidationError('Start picking command validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Validate Complete Picking Command
 * @param command - Command to validate
 * @returns Validated command data
 */
export function validateCompletePickingCommand(command: unknown): CompletePickingCommand {
  try {
    return CompletePickingCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path]!.push(err.message);
      });
      throw new FulfillmentCommandValidationError('Complete picking command validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Validate Start Packing Command
 * @param command - Command to validate
 * @returns Validated command data
 */
export function validateStartPackingCommand(command: unknown): StartPackingCommand {
  try {
    return StartPackingCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path]!.push(err.message);
      });
      throw new FulfillmentCommandValidationError('Start packing command validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Validate Complete Packing Command
 * @param command - Command to validate
 * @returns Validated command data
 */
export function validateCompletePackingCommand(command: unknown): CompletePackingCommand {
  try {
    return CompletePackingCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path]!.push(err.message);
      });
      throw new FulfillmentCommandValidationError('Complete packing command validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Validate Ship Order Command
 * @param command - Command to validate
 * @returns Validated command data
 */
export function validateShipOrderCommand(command: unknown): ShipOrderCommand {
  try {
    return ShipOrderCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path]!.push(err.message);
      });
      throw new FulfillmentCommandValidationError('Ship order command validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Validate Deliver Order Command
 * @param command - Command to validate
 * @returns Validated command data
 */
export function validateDeliverOrderCommand(command: unknown): DeliverOrderCommand {
  try {
    return DeliverOrderCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path]!.push(err.message);
      });
      throw new FulfillmentCommandValidationError('Deliver order command validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Validate Mark Partial Fulfillment Command
 * @param command - Command to validate
 * @returns Validated command data
 */
export function validateMarkPartialFulfillmentCommand(command: unknown): MarkPartialFulfillmentCommand {
  try {
    return MarkPartialFulfillmentCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path]!.push(err.message);
      });
      throw new FulfillmentCommandValidationError(
        'Mark partial fulfillment command validation failed',
        validationErrors
      );
    }
    throw error;
  }
}

/**
 * Validate Rollback Fulfillment Command
 * @param command - Command to validate
 * @returns Validated command data
 */
export function validateRollbackFulfillmentCommand(command: unknown): RollbackFulfillmentCommand {
  try {
    return RollbackFulfillmentCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path]!.push(err.message);
      });
      throw new FulfillmentCommandValidationError('Rollback fulfillment command validation failed', validationErrors);
    }
    throw error;
  }
}
