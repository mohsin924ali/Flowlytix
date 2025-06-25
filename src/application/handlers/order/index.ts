/**
 * Order Handlers Index
 *
 * Barrel exports for all order-related handlers.
 * Provides clean module interface for order handler operations.
 *
 * @domain Order Management
 * @pattern Barrel Export
 * @version 1.0.0
 */

export { CreateOrderHandler } from './create-order.handler';
export type { CreateOrderHandlerDependencies } from './create-order.handler';

// Fulfillment Handlers (Step 1B)
export {
  StartPickingHandler,
  CompletePickingHandler,
  StartPackingHandler,
  CompletePackingHandler,
  ShipOrderHandler,
  DeliverOrderHandler,
  MarkPartialFulfillmentHandler,
  RollbackFulfillmentHandler,
} from './fulfillment.handler';
export type { FulfillmentHandlerDependencies } from './fulfillment.handler';

// Payment Handlers (Step 2B.2)
export {
  InitiatePaymentHandler,
  ProcessPaymentHandler,
  CompletePaymentHandler,
  FailPaymentHandler,
  CancelPaymentHandler,
  CreateRefundHandler,
  ProcessRefundHandler,
  RetryPaymentHandler,
} from './payment.handler';
export type { PaymentHandlerDependencies } from './payment.handler';
