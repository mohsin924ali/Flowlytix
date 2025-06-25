/**
 * Delete Product Command
 *
 * Command to delete (deactivate) an existing product in the goods distribution system.
 * Follows CQRS pattern for write operations with comprehensive validation.
 * Note: Products are typically soft-deleted by marking as DISCONTINUED status.
 *
 * @domain Product Management
 * @pattern Command Pattern (CQRS)
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * Command to delete an existing product
 * Follows CQRS pattern for write operations
 */
export interface DeleteProductCommand {
  readonly id: string;
  readonly deletedBy: string; // ID of user deleting this product
  readonly reason?: string; // Optional reason for deletion
}

/**
 * Result of delete product operation
 */
export interface DeleteProductResult {
  readonly success: boolean;
  readonly productId?: string;
  readonly error?: string;
  readonly validationErrors?: string[];
}

/**
 * Zod schema for DeleteProductCommand validation
 */
export const DeleteProductCommandSchema = z.object({
  id: z.string().uuid('Product ID must be a valid UUID'),
  deletedBy: z.string().uuid('DeletedBy must be a valid UUID'),
  reason: z.string().max(500, 'Deletion reason cannot exceed 500 characters').optional(),
});

/**
 * Custom error class for delete product command validation
 */
export class DeleteProductCommandValidationError extends Error {
  constructor(
    public readonly field: string,
    message: string
  ) {
    super(`Delete product validation error for field '${field}': ${message}`);
    this.name = 'DeleteProductCommandValidationError';
  }
}

/**
 * Business validation for DeleteProductCommand
 */
export function validateDeleteProductCommand(command: DeleteProductCommand): void {
  // Validate with Zod schema
  const result = DeleteProductCommandSchema.safeParse(command);
  if (!result.success) {
    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Delete product command validation failed: ${errors.join(', ')}`);
  }

  // Additional business validations can be added here
  // For example, checking if deletion reason is required based on business rules
}

/**
 * Type guard to check if an object is a DeleteProductCommand
 */
export function isDeleteProductCommand(obj: unknown): obj is DeleteProductCommand {
  try {
    DeleteProductCommandSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}
