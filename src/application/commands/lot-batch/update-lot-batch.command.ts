/**
 * Update Lot/Batch Command
 *
 * Command for updating existing lot/batch records in the goods distribution system.
 * Handles comprehensive lot/batch data validation, business rules enforcement,
 * and security constraints following CQRS pattern.
 *
 * Business Rules:
 * - Only certain fields can be updated (lot/batch numbers are immutable)
 * - Manufacturing date cannot be changed once set
 * - Expiry date can be extended but not shortened significantly
 * - Quantity can only be adjusted through specific operations
 * - Status transitions must follow business rules
 * - Only users with UPDATE_INVENTORY permission can update lots
 *
 * @domain Lot/Batch Management
 * @pattern CQRS Command
 * @version 1.0.0
 */

import { z } from 'zod';
import { LotStatus } from '../../../domain/value-objects/lot-batch';

/**
 * Zod schema for update lot/batch command validation
 */
export const UpdateLotBatchCommandSchema = z
  .object({
    lotBatchId: z.string().uuid('Invalid lot/batch ID format'),

    // Immutable fields that cannot be updated
    // lotNumber: Not allowed to change
    // batchNumber: Not allowed to change
    // manufacturingDate: Not allowed to change
    // quantity: Updated through separate quantity operations

    expiryDate: z
      .date({
        invalid_type_error: 'Expiry date must be a valid date',
      })
      .optional(),

    status: z
      .nativeEnum(LotStatus, {
        errorMap: () => ({ message: 'Invalid lot status' }),
      })
      .optional(),

    supplierId: z.string().uuid('Invalid supplier ID format').optional(),

    supplierLotCode: z.string().max(100, 'Supplier lot code too long').optional(),

    notes: z.string().max(1000, 'Notes too long').optional(),

    reason: z.string().min(1, 'Update reason is required').max(500, 'Update reason too long'),

    requestedBy: z.string().uuid('Invalid user ID format'),
  })
  .refine(
    (data) => {
      // At least one field must be provided for update
      return (
        data.expiryDate !== undefined ||
        data.status !== undefined ||
        data.supplierId !== undefined ||
        data.supplierLotCode !== undefined ||
        data.notes !== undefined
      );
    },
    {
      message: 'At least one field must be provided for update',
      path: ['_root'],
    }
  );

/**
 * Update Lot/Batch Command Type
 */
export type UpdateLotBatchCommand = z.infer<typeof UpdateLotBatchCommandSchema>;

/**
 * Update Lot/Batch Command Result
 */
export interface UpdateLotBatchCommandResult {
  readonly success: boolean;
  readonly lotBatchId?: string;
  readonly updatedFields?: string[];
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
}

/**
 * Command validation error
 */
export class UpdateLotBatchCommandValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'UpdateLotBatchCommandValidationError';
  }
}

/**
 * Validate update lot/batch command
 * @param command - Command to validate
 * @returns Validated command data
 * @throws {UpdateLotBatchCommandValidationError} When validation fails
 */
export function validateUpdateLotBatchCommand(command: unknown): UpdateLotBatchCommand {
  try {
    return UpdateLotBatchCommandSchema.parse(command);
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

      throw new UpdateLotBatchCommandValidationError('Lot/batch update validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Validate business rules for lot/batch updates
 * @param command - Validated command
 * @param currentLot - Current lot/batch state
 * @throws {Error} When business rules are violated
 */
export function validateLotBatchUpdateBusinessRules(
  command: UpdateLotBatchCommand,
  currentLot: {
    manufacturingDate: Date;
    expiryDate: Date | null;
    status: LotStatus;
    remainingQuantity: number;
    reservedQuantity: number;
  }
): void {
  // Expiry date business rules
  if (command.expiryDate) {
    const newExpiryDate = new Date(command.expiryDate);
    const now = new Date();

    // Cannot set expiry date in the past
    if (newExpiryDate < now) {
      throw new Error('Cannot set expiry date in the past');
    }

    // Cannot set expiry date before manufacturing date
    if (newExpiryDate <= currentLot.manufacturingDate) {
      throw new Error('Expiry date must be after manufacturing date');
    }

    // If shortening expiry date significantly (more than 30 days), require special permission
    if (currentLot.expiryDate) {
      const daysDifference = Math.ceil(
        (currentLot.expiryDate.getTime() - newExpiryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDifference > 30) {
        throw new Error('Cannot shorten expiry date by more than 30 days without special authorization');
      }
    }

    // Maximum future date validation
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(now.getFullYear() + 20);
    if (newExpiryDate > maxFutureDate) {
      throw new Error('Expiry date cannot be more than 20 years in the future');
    }
  }

  // Status transition business rules
  if (command.status) {
    validateStatusTransition(currentLot.status, command.status, currentLot);
  }

  // Supplier lot code validation
  if (command.supplierLotCode && command.supplierLotCode.trim().length === 0) {
    throw new Error('Supplier lot code cannot be empty if provided');
  }

  // Notes validation
  if (command.notes && command.notes.trim().length === 0) {
    throw new Error('Notes cannot be empty if provided');
  }

  // Reason validation
  if (command.reason.trim().length < 5) {
    throw new Error('Update reason must be at least 5 characters long');
  }
}

/**
 * Validate status transition rules
 * @param currentStatus - Current lot status
 * @param newStatus - Requested new status
 * @param lotData - Current lot data
 * @throws {Error} When status transition is not allowed
 */
function validateStatusTransition(
  currentStatus: LotStatus,
  newStatus: LotStatus,
  lotData: { remainingQuantity: number; reservedQuantity: number }
): void {
  // Same status - no change needed
  if (currentStatus === newStatus) {
    return;
  }

  const now = new Date();

  // Define allowed transitions
  const allowedTransitions: Record<LotStatus, LotStatus[]> = {
    [LotStatus.ACTIVE]: [
      LotStatus.QUARANTINE,
      LotStatus.EXPIRED,
      LotStatus.RECALLED,
      LotStatus.DAMAGED,
      LotStatus.RESERVED,
      LotStatus.CONSUMED,
    ],
    [LotStatus.QUARANTINE]: [
      LotStatus.ACTIVE,
      LotStatus.EXPIRED,
      LotStatus.RECALLED,
      LotStatus.DAMAGED,
      LotStatus.CONSUMED,
    ],
    [LotStatus.EXPIRED]: [LotStatus.RECALLED, LotStatus.DAMAGED, LotStatus.CONSUMED],
    [LotStatus.RECALLED]: [LotStatus.DAMAGED, LotStatus.CONSUMED],
    [LotStatus.DAMAGED]: [LotStatus.CONSUMED],
    [LotStatus.RESERVED]: [
      LotStatus.ACTIVE,
      LotStatus.QUARANTINE,
      LotStatus.EXPIRED,
      LotStatus.RECALLED,
      LotStatus.DAMAGED,
      LotStatus.CONSUMED,
    ],
    [LotStatus.CONSUMED]: [],
  };

  // Check if transition is allowed
  const allowedTargets = allowedTransitions[currentStatus] || [];
  if (!allowedTargets.includes(newStatus)) {
    throw new Error(`Invalid status transition: cannot change from ${currentStatus} to ${newStatus}`);
  }

  // Additional business rules for specific transitions
  switch (newStatus) {
    case LotStatus.CONSUMED:
      // Can only mark as consumed if remaining quantity is 0 or very small
      if (lotData.remainingQuantity > 0.001) {
        throw new Error('Cannot mark lot as consumed while quantity remains');
      }
      break;

    case LotStatus.RESERVED:
      // Can only reserve if there's available quantity
      if (lotData.remainingQuantity <= lotData.reservedQuantity) {
        throw new Error('Cannot reserve lot without available quantity');
      }
      break;

    case LotStatus.ACTIVE:
      // Additional checks when reactivating
      if (currentStatus === LotStatus.EXPIRED) {
        throw new Error('Cannot reactivate expired lot');
      }
      if (currentStatus === LotStatus.CONSUMED) {
        throw new Error('Cannot reactivate consumed lot');
      }
      break;
  }
}

/**
 * Helper function to prepare lot/batch update data
 * @param command - Validated command
 * @returns Update data object
 */
export function prepareLotBatchUpdateData(command: UpdateLotBatchCommand) {
  const updateData: any = {
    updatedBy: command.requestedBy,
  };

  // Only include fields that are being updated
  if (command.expiryDate !== undefined) {
    updateData.expiryDate = new Date(command.expiryDate);
  }

  if (command.status !== undefined) {
    updateData.status = command.status;
  }

  if (command.supplierId !== undefined) {
    updateData.supplierId = command.supplierId;
  }

  if (command.supplierLotCode !== undefined) {
    updateData.supplierLotCode = command.supplierLotCode?.toUpperCase();
  }

  if (command.notes !== undefined) {
    updateData.notes = command.notes?.trim();
  }

  return updateData;
}
