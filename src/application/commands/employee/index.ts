/**
 * Employee Commands Index
 * Barrel exports for employee command operations
 * Following CQRS pattern and incremental approach standards
 *
 * @domain Employee Management
 * @pattern Barrel Export
 * @version 1.0.0 - Step 4: Application Layer Implementation
 */

// Create Employee Command - Step 4: Application Layer Implementation
export * from './create-employee.command';
export type { CreateEmployeeCommand } from './create-employee.command';
export { validateCreateEmployeeCommand, CreateEmployeeCommandValidationError } from './create-employee.command';
