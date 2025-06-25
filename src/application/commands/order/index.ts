/**
 * Order Commands Index
 *
 * Barrel exports for all order-related commands.
 * Provides clean module interface for order command operations.
 *
 * @domain Order Management
 * @pattern Barrel Export
 * @version 1.0.0
 */

export {
  CreateOrderCommandSchema,
  CreateOrderCommandValidationError,
  validateCreateOrderCommand,
  calculateOrderItemTotals,
  calculateOrderTotals,
  validateOrderBusinessRules,
} from './create-order.command';

export type { CreateOrderCommand, CreateOrderCommandItem, CreateOrderCommandResult } from './create-order.command';

// Fulfillment Commands (Step 1B)
export {
  StartPickingCommandSchema,
  CompletePickingCommandSchema,
  StartPackingCommandSchema,
  CompletePackingCommandSchema,
  ShipOrderCommandSchema,
  DeliverOrderCommandSchema,
  MarkPartialFulfillmentCommandSchema,
  RollbackFulfillmentCommandSchema,
  FulfillmentCommandValidationError,
  validateStartPickingCommand,
  validateCompletePickingCommand,
  validateStartPackingCommand,
  validateCompletePackingCommand,
  validateShipOrderCommand,
  validateDeliverOrderCommand,
  validateMarkPartialFulfillmentCommand,
  validateRollbackFulfillmentCommand,
} from './fulfillment.command';

export type {
  StartPickingCommand,
  CompletePickingCommand,
  StartPackingCommand,
  CompletePackingCommand,
  ShipOrderCommand,
  DeliverOrderCommand,
  MarkPartialFulfillmentCommand,
  RollbackFulfillmentCommand,
  FulfillmentCommandResult,
} from './fulfillment.command';

// Payment Commands (Step 2B.1)
export {
  InitiatePaymentCommandSchema,
  ProcessPaymentCommandSchema,
  CompletePaymentCommandSchema,
  FailPaymentCommandSchema,
  CancelPaymentCommandSchema,
  CreateRefundCommandSchema,
  ProcessRefundCommandSchema,
  RetryPaymentCommandSchema,
  PaymentCommandValidationError,
  validateInitiatePaymentCommand,
  validateProcessPaymentCommand,
  validateCompletePaymentCommand,
  validateFailPaymentCommand,
  validateCancelPaymentCommand,
  validateCreateRefundCommand,
  validateProcessRefundCommand,
  validateRetryPaymentCommand,
} from './payment.command';

export type {
  InitiatePaymentCommand,
  ProcessPaymentCommand,
  CompletePaymentCommand,
  FailPaymentCommand,
  CancelPaymentCommand,
  CreateRefundCommand,
  ProcessRefundCommand,
  RetryPaymentCommand,
  PaymentCommandResult,
} from './payment.command';
