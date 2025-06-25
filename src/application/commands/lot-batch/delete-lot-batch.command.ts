/**
 * Delete Lot/Batch Command
 *
 * Command for deleting lot/batch records in the goods distribution system.
 * Handles comprehensive validation, business rules enforcement, and security
 * constraints following CQRS pattern.
 *
 * Business Rules:
 * - Only empty lots (remaining quantity = 0) can be deleted
 * - Lots with reserved quantity cannot be deleted
 * - Lots referenced in orders/transactions cannot be deleted
 * - Only users with DELETE_INVENTORY permission can delete lots
 * - Soft delete is preferred over hard delete for audit trail
 * - Deletion reason must be provided
 * - Manager approval may be required for certain scenarios
 *
 * @domain Lot/Batch Management
 * @pattern CQRS Command
 * @version 1.0.0
 */

import { z } from 'zod';
import { LotStatus } from '../../../domain/value-objects/lot-batch';

/**
 * Delete type enumeration
 */
export enum DeleteType {
  SOFT = 'SOFT', // Mark as inactive/consumed (preferred)
  HARD = 'HARD', // Permanently remove from database
}

/**
 * Zod schema for delete lot/batch command validation
 */
export const DeleteLotBatchCommandSchema = z.object({
  lotBatchId: z.string().uuid('Invalid lot/batch ID format'),

  deleteType: z
    .nativeEnum(DeleteType, {
      errorMap: () => ({ message: 'Invalid delete type' }),
    })
    .default(DeleteType.SOFT),

  reason: z.string().min(5, 'Deletion reason must be at least 5 characters long').max(500, 'Deletion reason too long'),

  force: z.boolean().default(false).describe('Force deletion even if business rules would normally prevent it'),

  requestedBy: z.string().uuid('Invalid user ID format'),
});

/**
 * Delete Lot/Batch Command Type
 */
export type DeleteLotBatchCommand = z.infer<typeof DeleteLotBatchCommandSchema>;

/**
 * Delete Lot/Batch Command Result
 */
export interface DeleteLotBatchCommandResult {
  readonly success: boolean;
  readonly lotBatchId?: string;
  readonly deleteType?: DeleteType;
  readonly warning?: string;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
}

/**
 * Command validation error
 */
export class DeleteLotBatchCommandValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'DeleteLotBatchCommandValidationError';
  }
}

/**
 * Validate delete lot/batch command
 * @param command - Command to validate
 * @returns Validated command data
 * @throws {DeleteLotBatchCommandValidationError} When validation fails
 */
export function validateDeleteLotBatchCommand(command: unknown): DeleteLotBatchCommand {
  try {
    return DeleteLotBatchCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};

      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });

      throw new DeleteLotBatchCommandValidationError('Lot/batch deletion validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Validate business rules for lot/batch deletion
 * @param command - Validated command
 * @param currentLot - Current lot/batch state
 * @throws {Error} When business rules are violated
 */
export function validateLotBatchDeletionBusinessRules(
  command: DeleteLotBatchCommand,
  currentLot: {
    lotNumber: string;
    batchNumber: string | null;
    status: LotStatus;
    quantity: number;
    remainingQuantity: number;
    reservedQuantity: number;
    productId: string;
    agencyId: string;
  }
): void {
  // Cannot delete lots with remaining quantity (unless forced)
  if (currentLot.remainingQuantity > 0 && !command.force) {
    throw new Error(
      `Cannot delete lot ${currentLot.lotNumber}: ${currentLot.remainingQuantity} units remaining. ` +
        'Use force=true to override.'
    );
  }

  // Cannot delete lots with reserved quantity (unless forced)
  if (currentLot.reservedQuantity > 0 && !command.force) {
    throw new Error(
      `Cannot delete lot ${currentLot.lotNumber}: ${currentLot.reservedQuantity} units reserved. ` +
        'Use force=true to override.'
    );
  }

  // Cannot delete active lots with remaining quantity
  if (currentLot.status === LotStatus.ACTIVE && currentLot.remainingQuantity > 0 && !command.force) {
    throw new Error(
      `Cannot delete active lot ${currentLot.lotNumber} with remaining quantity. ` +
        'Consider marking as consumed instead.'
    );
  }

  // Validate deletion reason quality
  const reason = command.reason.trim();
  if (reason.length < 10 && !command.force) {
    throw new Error('Deletion reason must be at least 10 characters long for non-forced deletions');
  }

  // Hard delete additional restrictions
  if (command.deleteType === DeleteType.HARD) {
    // Hard delete requires consumed or damaged status (unless forced)
    if (currentLot.status !== LotStatus.CONSUMED && currentLot.status !== LotStatus.DAMAGED && !command.force) {
      throw new Error(
        `Hard delete requires lot to be CONSUMED or DAMAGED status. Current status: ${currentLot.status}. ` +
          'Use soft delete instead or force=true to override.'
      );
    }

    // Hard delete requires special reasons
    const hardDeleteReasons = [
      'data_cleanup',
      'test_data',
      'duplicate_entry',
      'system_error',
      'compliance_requirement',
    ];

    const hasValidReason = hardDeleteReasons.some((validReason) => reason.toLowerCase().includes(validReason));

    if (!hasValidReason && !command.force) {
      throw new Error(
        `Hard delete requires specific reason keywords: ${hardDeleteReasons.join(', ')}. ` +
          'Use force=true to override.'
      );
    }
  }

  // Warn about potential issues
  if (currentLot.quantity > 10000) {
    console.warn(`Deleting large quantity lot: ${currentLot.lotNumber} (${currentLot.quantity} units)`);
  }

  if (currentLot.status === LotStatus.RECALLED) {
    console.warn(`Deleting recalled lot: ${currentLot.lotNumber}. Ensure regulatory compliance.`);
  }
}

/**
 * Determine appropriate deletion strategy
 * @param command - Delete command
 * @param currentLot - Current lot state
 * @returns Recommended deletion approach
 */
export function determineDeletionStrategy(
  command: DeleteLotBatchCommand,
  currentLot: {
    status: LotStatus;
    remainingQuantity: number;
    reservedQuantity: number;
  }
): {
  strategy: 'mark_consumed' | 'hard_delete' | 'soft_delete';
  reason: string;
} {
  // If explicitly requesting hard delete and conditions are met
  if (command.deleteType === DeleteType.HARD) {
    if (
      currentLot.remainingQuantity === 0 &&
      currentLot.reservedQuantity === 0 &&
      (currentLot.status === LotStatus.CONSUMED || currentLot.status === LotStatus.DAMAGED)
    ) {
      return {
        strategy: 'hard_delete',
        reason: 'Eligible for permanent deletion',
      };
    }
  }

  // If lot has remaining quantity, mark as consumed instead
  if (currentLot.remainingQuantity > 0 || currentLot.reservedQuantity > 0) {
    return {
      strategy: 'mark_consumed',
      reason: 'Lot has remaining/reserved quantity - marking as consumed',
    };
  }

  // Default to soft delete (mark as consumed)
  return {
    strategy: 'soft_delete',
    reason: 'Safe soft deletion approach',
  };
}

/**
 * Helper function to prepare deletion data
 * @param command - Validated command
 * @returns Deletion operation data
 */
export function prepareLotBatchDeletionData(command: DeleteLotBatchCommand) {
  return {
    lotBatchId: command.lotBatchId,
    deleteType: command.deleteType,
    reason: command.reason.trim(),
    force: command.force,
    deletedBy: command.requestedBy,
    deletedAt: new Date(),
  };
}
