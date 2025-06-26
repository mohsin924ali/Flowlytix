/**
 * Domain Repositories Index
 *
 * Barrel exports for all domain repository interfaces.
 * Provides clean module interface for repository contracts.
 *
 * @domain Repository Interfaces
 * @pattern Barrel Export
 * @version 1.0.0
 */

// User Repository
export {
  UserRepositoryError,
  UserNotFoundError,
  UserAlreadyExistsError,
  UserRepositoryConnectionError,
} from './user.repository';

export type {
  IUserRepository,
  IUserRepositoryTransaction,
  UserSearchCriteria,
  UserSearchResult,
  UserRepositoryStats,
} from './user.repository';

// Product Repository
export {
  ProductRepositoryError,
  ProductNotFoundError,
  ProductAlreadyExistsError,
  ProductRepositoryConnectionError,
} from './product.repository';

export type {
  IProductRepository,
  IProductRepositoryTransaction,
  ProductSearchCriteria,
  ProductSearchResult,
  ProductRepositoryStats,
} from './product.repository';

// Customer Repository
export type {
  ICustomerRepository,
  ICustomerRepositoryTransaction,
  CustomerSearchCriteria,
  CustomerSearchResult,
  CustomerRepositoryStats,
} from './customer.repository';

export {
  CustomerRepositoryError,
  CustomerNotFoundError,
  CustomerAlreadyExistsError,
  CustomerRepositoryConnectionError,
} from './customer.repository';

// Agency Repository
export {
  AgencyRepositoryError,
  AgencyNotFoundError,
  AgencyAlreadyExistsError,
  AgencyRepositoryConnectionError,
} from './agency.repository';

export type {
  IAgencyRepository,
  IAgencyRepositoryTransaction,
  AgencySearchCriteria,
  AgencySearchResult,
  AgencyRepositoryStats,
} from './agency.repository';

// Future repository interfaces will be exported here
// export { ICustomerRepository } from './customer.repository';
// export { IAgencyRepository } from './agency.repository';

export * from './lot-batch.repository';

// Order Repository
export type { OrderRepository } from './order.repository';
export { OrderRepositoryError } from './order.repository';

export type {
  OrderSearchCriteria,
  OrderSortOptions,
  PaginationOptions,
  PaginatedOrderResult,
  OrderStatistics,
  CustomerOrderSummary,
  ProductSalesSummary,
} from './order.repository';

// Order Lot Allocation Repository
export {
  OrderLotAllocationRepositoryError,
  OrderLotAllocationNotFoundError,
  OrderLotAllocationAlreadyExistsError,
  OrderLotAllocationConnectionError,
} from './order-lot-allocation.repository';

export type {
  IOrderLotAllocationRepository,
  OrderLotAllocationPersistence,
  OrderLotAllocationSearchCriteria,
  OrderLotAllocationSearchResult,
  OrderLotAllocationStats,
  BatchLotAllocationOperation,
} from './order-lot-allocation.repository';

// Payment Repository
export type {
  PaymentRepository,
  PaymentSearchCriteria,
  PaymentStatistics,
  GatewayPerformanceMetrics,
  PaymentRetryFilter,
  PaymentAuditFilter,
} from './payment.repository';

// Shipping Repository
export type { ShippingRepository, ShippingSearchCriteria, ShippingQueryOptions } from './shipping.repository';

// Employee repository interface exports
export type { IEmployeeRepository } from './employee.repository';
export {
  EmployeeRepositoryError,
  EmployeeNotFoundError,
  EmployeeAlreadyExistsError,
  EmployeeConstraintViolationError,
} from './employee.repository';
export type {
  EmployeeSearchCriteria,
  EmployeeSortOptions,
  PaginationParams,
  PaginatedResult,
} from './employee.repository';

// Report repository not yet implemented
