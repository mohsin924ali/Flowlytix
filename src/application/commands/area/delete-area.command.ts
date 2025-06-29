/**
 * Delete Area Command
 *
 * Command for deleting areas in the multi-tenant agency system.
 * Follows CQRS pattern for write operations with proper validation.
 *
 * Business Rules:
 * - Area must exist and be accessible by the user
 * - Area cannot be deleted if it has associated customers or orders
 * - Only authorized users can delete areas
 * - Soft delete is preferred to maintain audit trail
 * - Deletion should be logged for compliance
 *
 * @domain Area Management
 * @pattern CQRS Command
 * @version 1.0.0
 */

/**
 * Delete Area Command Interface
 */
export interface DeleteAreaCommand {
  readonly id: string;
  readonly reason?: string;
  readonly deletedBy: string;
}

/**
 * Delete Area Command Result
 */
export interface DeleteAreaCommandResult {
  readonly success: boolean;
  readonly areaId?: string;
  readonly areaCode?: string;
  readonly areaName?: string;
  readonly agencyId?: string;
  readonly error?: string;
  readonly validationErrors?: string[];
}

/**
 * Delete Area Command Validation Error
 */
export class DeleteAreaCommandValidationError extends Error {
  public readonly validationErrors: string[];

  constructor(errors: string[]) {
    super(`Area deletion validation failed: ${errors.join(', ')}`);
    this.name = 'DeleteAreaCommandValidationError';
    this.validationErrors = errors;
  }
}

/**
 * Validate Delete Area Command
 * @param command - Command to validate
 * @throws {DeleteAreaCommandValidationError} When validation fails
 */
export function validateDeleteAreaCommand(command: DeleteAreaCommand): void {
  const errors: string[] = [];

  // Validate area ID
  if (!command.id || typeof command.id !== 'string' || command.id.trim().length === 0) {
    errors.push('Area ID is required');
  }

  // Validate deleted by
  if (!command.deletedBy || typeof command.deletedBy !== 'string' || command.deletedBy.trim().length === 0) {
    errors.push('Deleted by is required');
  }

  // Validate optional reason
  if (command.reason !== undefined && command.reason !== null) {
    if (typeof command.reason !== 'string') {
      errors.push('Reason must be a string');
    } else if (command.reason.length > 500) {
      errors.push('Reason must not exceed 500 characters');
    }
  }

  if (errors.length > 0) {
    throw new DeleteAreaCommandValidationError(errors);
  }
}
