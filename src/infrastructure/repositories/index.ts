/**
 * Infrastructure Repositories Index
 *
 * Barrel exports for all repository implementations.
 * Provides clean module interface for concrete repository adapters.
 *
 * @domain Repository Implementations
 * @pattern Barrel Export
 * @version 1.0.0
 */

// User Repository Implementation
export { SqliteUserRepository } from './user.repository';

// Customer Repository Implementation
export { SqliteCustomerRepository } from './customer.repository';

// Product Repository Implementation
export { SqliteProductRepository } from './product.repository';

// Agency Repository Implementation - Step MT-2A
export { SqliteAgencyRepository, createAgencyRepository } from './agency.repository';

// Lot-Batch Repository Implementation
export * from './lot-batch.repository';

// Order Repository Implementation - Step 1: Core Structure
export {
  SqliteOrderRepository,
  createOrderRepository,
  OrderNotFoundError,
  OrderAlreadyExistsError,
} from './order.repository';

// Order Lot Allocation Repository Implementation - Step 1: Repository Layer Integration
export {
  SqliteOrderLotAllocationRepository,
  createOrderLotAllocationRepository,
} from './order-lot-allocation.repository';

// Payment Repository Implementation - Step 2C: Payment Infrastructure Layer
export {
  SqlitePaymentRepository,
  createPaymentRepository,
  PaymentNotFoundError,
  PaymentRepositoryError,
} from './payment.repository';

// Shipping Repository Implementation - Step 3C: Shipping Infrastructure Layer
export {
  SqliteShippingRepository,
  createShippingRepository,
  ShippingNotFoundError,
  ShippingRepositoryError,
} from './shipping.repository';
