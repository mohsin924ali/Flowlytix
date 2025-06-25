/**
 * Customer Handlers Index
 *
 * Central export point for all customer-related command handlers.
 * Provides clean imports for customer management functionality.
 *
 * @domain Customer Management
 * @pattern Command Handler Exports
 * @version 1.0.0
 */

// Command Handlers
export { CreateCustomerHandler, createCustomerHandler } from './create-customer.handler';
export { UpdateCustomerHandler, createUpdateCustomerHandler } from './update-customer.handler';
export { DeleteCustomerHandler, createDeleteCustomerHandler } from './delete-customer.handler';

// Query Handlers
export { GetCustomersHandler, createGetCustomersHandler } from './get-customers.handler';

// Re-export types for convenience
export type { CreateCustomerCommand } from '../../commands/customer/create-customer.command';
export type { UpdateCustomerCommand } from '../../commands/customer/update-customer.command';
export type { DeleteCustomerCommand } from '../../commands/customer/delete-customer.command';
export type {
  GetCustomersQuery,
  CustomerSummary,
  GetCustomersQueryResult,
} from '../../queries/customer/get-customers.query';
