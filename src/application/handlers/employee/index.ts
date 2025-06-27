/**
 * Employee Handlers Index
 * Barrel exports for employee command handlers
 * Following CQRS pattern and incremental approach standards
 *
 * @domain Employee Management
 * @pattern Barrel Export
 * @version 1.0.0 - Step 4: Application Layer Implementation
 */

// Create Employee Handler - Step 4: Application Layer Implementation
export * from './create-employee.handler';
export {
  CreateEmployeeHandler,
  CreateEmployeeHandlerError,
  CreateEmployeeAuthorizationError,
  CreateEmployeeDuplicateError,
  createEmployeeHandler,
} from './create-employee.handler';
export type { CreateEmployeeResult } from './create-employee.handler';
