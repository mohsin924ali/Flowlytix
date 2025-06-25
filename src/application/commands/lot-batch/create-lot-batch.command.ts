/**
 * Create Lot/Batch Command
 *
 * Command for creating new lot/batch records in the goods distribution system.
 * Handles comprehensive lot/batch data validation, business rules enforcement,
 * and security constraints following CQRS pattern.
 *
 * Business Rules:
 * - Lot number must be unique within product and agency
 * - Batch number must be unique within lot (if provided)
 * - Manufacturing date cannot be in the future
 * - Expiry date must be after manufacturing date (if provided)
 * - Quantity must be positive
 * - Product must exist and be active
 * - Agency must exist and be operational
 * - Only users with CREATE_INVENTORY permission can create lots
 *
 * @domain Lot/Batch Management
 * @pattern CQRS Command
 * @version 1.0.0
 */

import { z } from 'zod';
import { LotStatus } from '../../../domain/value-objects/lot-batch';

/**
 * Zod schema for create lot/batch command validation
 */
export const CreateLotBatchCommandSchema = z
  .object({
    lotNumber: z
      .string()
      .min(1, 'Lot number is required')
      .max(50, 'Lot number too long')
      .regex(
        /^[A-Z0-9][A-Z0-9_-]*[A-Z0-9]$|^[A-Z0-9]$/,
        'Lot number must contain only uppercase letters, numbers, hyphens, and underscores'
      ),

    batchNumber: z
      .string()
      .max(50, 'Batch number too long')
      .regex(
        /^[A-Z0-9][A-Z0-9_-]*[A-Z0-9]$|^[A-Z0-9]$/,
        'Batch number must contain only uppercase letters, numbers, hyphens, and underscores'
      )
      .optional(),

    manufacturingDate: z
      .date({
        required_error: 'Manufacturing date is required',
        invalid_type_error: 'Manufacturing date must be a valid date',
      })
      .refine((date) => date <= new Date(), 'Manufacturing date cannot be in the future'),

    expiryDate: z
      .date({
        invalid_type_error: 'Expiry date must be a valid date',
      })
      .optional(),

    quantity: z
      .number({
        required_error: 'Quantity is required',
        invalid_type_error: 'Quantity must be a number',
      })
      .positive('Quantity must be positive')
      .max(1000000, 'Quantity too large')
      .finite('Quantity must be a finite number'),

    productId: z.string().uuid('Invalid product ID format'),

    agencyId: z.string().uuid('Invalid agency ID format'),

    supplierId: z.string().uuid('Invalid supplier ID format').optional(),

    supplierLotCode: z.string().max(100, 'Supplier lot code too long').optional(),

    notes: z.string().max(1000, 'Notes too long').optional(),

    requestedBy: z.string().uuid('Invalid user ID format'),
  })
  .refine(
    (data) => {
      if (data.expiryDate && data.manufacturingDate) {
        return data.expiryDate > data.manufacturingDate;
      }
      return true;
    },
    {
      message: 'Expiry date must be after manufacturing date',
      path: ['expiryDate'],
    }
  );

/**
 * Create Lot/Batch Command Type
 */
export type CreateLotBatchCommand = z.infer<typeof CreateLotBatchCommandSchema>;

/**
 * Create Lot/Batch Command Result
 */
export interface CreateLotBatchCommandResult {
  readonly success: boolean;
  readonly lotBatchId?: string;
  readonly lotNumber?: string;
  readonly batchNumber?: string;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
}

/**
 * Command validation error
 */
export class CreateLotBatchCommandValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'CreateLotBatchCommandValidationError';
  }
}

/**
 * Validate create lot/batch command
 * @param command - Command to validate
 * @returns Validated command data
 * @throws {CreateLotBatchCommandValidationError} When validation fails
 */
export function validateCreateLotBatchCommand(command: unknown): CreateLotBatchCommand {
  try {
    return CreateLotBatchCommandSchema.parse(command);
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

      throw new CreateLotBatchCommandValidationError('Lot/batch creation validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Validate business rules for lot/batch creation
 * @param command - Validated command
 * @throws {Error} When business rules are violated
 */
export function validateLotBatchBusinessRules(command: CreateLotBatchCommand): void {
  // Lot number format validation (additional business rules)
  if (command.lotNumber.length < 2) {
    throw new Error('Lot number must be at least 2 characters long');
  }

  // Batch number validation (if provided)
  if (command.batchNumber && command.batchNumber.length < 2) {
    throw new Error('Batch number must be at least 2 characters long');
  }

  // Manufacturing date business rules
  const manufacturingDate = new Date(command.manufacturingDate);
  const now = new Date();
  const maxPastDate = new Date();
  maxPastDate.setFullYear(now.getFullYear() - 10); // Maximum 10 years in the past

  if (manufacturingDate < maxPastDate) {
    throw new Error('Manufacturing date cannot be more than 10 years in the past');
  }

  // Expiry date business rules
  if (command.expiryDate) {
    const expiryDate = new Date(command.expiryDate);
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(now.getFullYear() + 20); // Maximum 20 years in the future

    if (expiryDate > maxFutureDate) {
      throw new Error('Expiry date cannot be more than 20 years in the future');
    }

    // Minimum shelf life validation
    const daysDifference = Math.ceil((expiryDate.getTime() - manufacturingDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference < 1) {
      throw new Error('Shelf life must be at least 1 day');
    }
  }

  // Quantity business rules
  if (command.quantity > 100000) {
    console.warn(`Large quantity detected: ${command.quantity} units for lot ${command.lotNumber}`);
  }

  // Supplier lot code validation
  if (command.supplierLotCode && command.supplierLotCode.trim().length === 0) {
    throw new Error('Supplier lot code cannot be empty if provided');
  }

  // Notes validation
  if (command.notes && command.notes.trim().length === 0) {
    throw new Error('Notes cannot be empty if provided');
  }
}

/**
 * Helper function to create lot/batch domain objects from command
 * @param command - Validated command
 * @returns Domain object properties
 */
export function createLotBatchDomainObjects(command: CreateLotBatchCommand) {
  return {
    lotNumber: command.lotNumber.toUpperCase(),
    batchNumber: command.batchNumber?.toUpperCase(),
    manufacturingDate: new Date(command.manufacturingDate),
    expiryDate: command.expiryDate ? new Date(command.expiryDate) : undefined,
    quantity: command.quantity,
    productId: command.productId,
    agencyId: command.agencyId,
    supplierId: command.supplierId,
    supplierLotCode: command.supplierLotCode?.toUpperCase(),
    notes: command.notes?.trim(),
    createdBy: command.requestedBy,
  };
}
