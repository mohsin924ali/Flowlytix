// Application Layer - Handlers Index
// Exports all command and query handlers for the application layer

// Employee Handlers - Step 4: Application Layer Implementation
export * from './employee/create-employee.handler';
export {
  CreateEmployeeHandler,
  CreateEmployeeHandlerError,
  CreateEmployeeAuthorizationError,
  CreateEmployeeDuplicateError,
  createEmployeeHandler,
} from './employee/create-employee.handler';
export type { CreateEmployeeResult } from './employee/create-employee.handler';

// Shipping Handlers - Step 3B.1, 3B.2 & 3B.3
export * from './shipping/create-shipping.handler';
export * from './shipping/update-shipping-tracking.handler';
export * from './shipping/generate-shipping-label.handler';

// Analytics Handlers - Phase 2: Reports and Analytics Module
export * from './analytics/sales-summary.handler';
export { SalesAnalyticsHandlerError } from './analytics/sales-summary.handler';
