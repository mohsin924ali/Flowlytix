/**
 * Customer Commands Index
 *
 * Central export point for all customer-related commands.
 * Provides clean imports for handlers and application services.
 *
 * @domain Customer Management
 * @pattern CQRS Commands
 * @version 1.0.0
 */

// Create Customer Command
export type { CreateCustomerCommand, CreateCustomerCommandResult } from './create-customer.command';

export {
  CreateCustomerCommandSchema,
  CreateCustomerCommandValidationError,
  validateCreateCustomerCommand,
  createCustomerDomainObjects,
  validateCustomerBusinessRules,
} from './create-customer.command';

// Update Customer Command
export type { UpdateCustomerCommand, UpdateCustomerCommandResult } from './update-customer.command';

export {
  UpdateCustomerCommandSchema,
  UpdateCustomerCommandValidationError,
  validateUpdateCustomerCommand,
  createCustomerUpdateDomainObjects,
  validateCustomerUpdateBusinessRules,
} from './update-customer.command';

// Delete Customer Command
export type { DeleteCustomerCommand, DeleteCustomerCommandResult } from './delete-customer.command';

export {
  DeleteCustomerCommandSchema,
  DeleteCustomerCommandValidationError,
  validateDeleteCustomerCommand,
} from './delete-customer.command';
