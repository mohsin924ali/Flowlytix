/**
 * Delete Customer Command
 *
 * Command for deleting customers from the goods distribution system.
 * Implements soft delete with comprehensive validation, business rules enforcement,
 * and security constraints following CQRS pattern.
 *
 * Business Rules:
 * - Customer must exist and be accessible by the requesting user
 * - Customer cannot be deleted if they have outstanding orders
 * - Customer cannot be deleted if they have outstanding balance
 * - Deletion requires proper authorization
 * - Soft delete is preferred to maintain audit trail
 * - Related data integrity must be maintained
 *
 * @domain Customer Management
 * @pattern CQRS Command
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * Zod schema for delete customer command validation
 */
export const DeleteCustomerCommandSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID format'),

  reason: z.string().min(1, 'Deletion reason is required').max(500, 'Deletion reason too long'),

  requestedBy: z.string().uuid('Invalid user ID format'),
});

/**
 * Delete Customer Command Type
 */
export type DeleteCustomerCommand = z.infer<typeof DeleteCustomerCommandSchema>;

/**
 * Delete Customer Command Result
 */
export interface DeleteCustomerCommandResult {
  readonly success: boolean;
  readonly customerId?: string;
  readonly customerCode?: string;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
}

/**
 * Command validation error
 */
export class DeleteCustomerCommandValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'DeleteCustomerCommandValidationError';
  }
}

/**
 * Validate delete customer command
 * @param command - Command to validate
 * @returns Validated command data
 * @throws {DeleteCustomerCommandValidationError} When validation fails
 */
export function validateDeleteCustomerCommand(command: unknown): DeleteCustomerCommand {
  try {
    return DeleteCustomerCommandSchema.parse(command);
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

      throw new DeleteCustomerCommandValidationError('Customer deletion validation failed', validationErrors);
    }
    throw error;
  }
}
