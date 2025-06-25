/**
 * Payment Command Handlers - Step 2B.2
 *
 * CQRS Command handlers for payment processing operations in the order management system.
 * Handles payment initiation, processing, completion, failure, cancellation, refunds,
 * and retry operations with comprehensive business logic, validation, and audit trail management.
 *
 * Business Logic:
 * - Validates payment and order existence
 * - Enforces payment workflow sequence rules
 * - Integrates with payment gateway services
 * - Manages payment audit trail and status transitions
 * - Handles refund creation and processing
 * - Supports payment retry mechanisms
 * - Maintains data consistency across operations
 *
 * @domain Order Management - Payment Processing
 * @pattern CQRS Command Handler
 * @version 1.0.0 - Step 2B: Application Layer Implementation
 */

import {
  InitiatePaymentCommand,
  ProcessPaymentCommand,
  CompletePaymentCommand,
  FailPaymentCommand,
  CancelPaymentCommand,
  CreateRefundCommand,
  ProcessRefundCommand,
  RetryPaymentCommand,
  PaymentCommandResult,
  validateInitiatePaymentCommand,
  validateProcessPaymentCommand,
  validateCompletePaymentCommand,
  validateFailPaymentCommand,
  validateCancelPaymentCommand,
  validateCreateRefundCommand,
  validateProcessRefundCommand,
  validateRetryPaymentCommand,
} from '../../commands/order';
import { OrderRepository } from '../../../domain/repositories/order.repository';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { PaymentGatewayService } from '../../../domain/services/payment-gateway.service';
import {
  Payment,
  PaymentStatus,
  PaymentDomainError,
  PaymentStatusError,
  PaymentGatewayError,
  PaymentRetryLimitExceededError,
  InvalidRefundAmountError,
} from '../../../domain/entities/payment';
import { Order, OrderStatus, OrderPaymentStatus } from '../../../domain/entities/order';
import { Money } from '../../../domain/value-objects/money';

/**
 * Handler dependencies interface
 */
export interface PaymentHandlerDependencies {
  readonly orderRepository: OrderRepository;
  readonly paymentRepository: PaymentRepository;
  readonly paymentGatewayService: PaymentGatewayService;
}

// ============================================================================
// Initiate Payment Handler
// ============================================================================

/**
 * Handler for InitiatePaymentCommand
 */
export class InitiatePaymentHandler {
  constructor(private readonly deps: PaymentHandlerDependencies) {}

  /**
   * Execute initiate payment command
   */
  async execute(command: unknown): Promise<PaymentCommandResult> {
    try {
      // 1. Validate command
      const validatedCommand = validateInitiatePaymentCommand(command);

      // 2. Verify order exists and can accept payment
      const order = await this.deps.orderRepository.findById(validatedCommand.orderId);
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          error: `Order with ID ${validatedCommand.orderId} not found`,
        };
      }

      // 3. Validate order status for payment
      if (![OrderStatus.CONFIRMED, OrderStatus.PROCESSING].includes(order.status)) {
        return {
          success: false,
          message: 'Order cannot accept payment in current status',
          error: `Order status ${order.status} does not allow payment`,
        };
      }

      // 4. Create payment entity
      const paymentAmount = Money.fromDecimal(validatedCommand.amount, validatedCommand.currency);
      const payment = Payment.create({
        orderId: validatedCommand.orderId,
        orderNumber: validatedCommand.orderNumber,
        customerId: validatedCommand.customerId,
        customerName: validatedCommand.customerName,
        amount: paymentAmount,
        paymentMethod: validatedCommand.paymentMethod,
        gateway: validatedCommand.gateway,
        transactionReference: `${validatedCommand.gateway}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        description: validatedCommand.description || `Payment for order ${validatedCommand.orderNumber}`,
        metadata: validatedCommand.metadata || {},
        agencyId: validatedCommand.agencyId,
        initiatedBy: validatedCommand.initiatedBy,
      });

      // 5. Save payment to repository
      const savedPayment = await this.deps.paymentRepository.save(payment);

      return {
        success: true,
        paymentId: savedPayment.id,
        transactionReference: savedPayment.transactionReference,
        message: 'Payment initiated successfully',
        metadata: {
          paymentStatus: savedPayment.status,
          amount: savedPayment.amount.toString(),
          gateway: savedPayment.gateway,
        },
      };
    } catch (error) {
      if (error instanceof PaymentDomainError) {
        return {
          success: false,
          message: 'Payment validation failed',
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Failed to initiate payment',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// ============================================================================
// Process Payment Handler
// ============================================================================

/**
 * Handler for ProcessPaymentCommand
 */
export class ProcessPaymentHandler {
  constructor(private readonly deps: PaymentHandlerDependencies) {}

  /**
   * Execute process payment command
   */
  async execute(command: unknown): Promise<PaymentCommandResult> {
    try {
      // 1. Validate command
      const validatedCommand = validateProcessPaymentCommand(command);

      // 2. Get payment from repository
      const payment = await this.deps.paymentRepository.findById(validatedCommand.paymentId);
      if (!payment) {
        return {
          success: false,
          message: 'Payment not found',
          error: `Payment with ID ${validatedCommand.paymentId} not found`,
        };
      }

      // 3. Validate payment can be processed
      if (!payment.canProcess()) {
        return {
          success: false,
          message: 'Payment cannot be processed',
          error: `Payment status ${payment.status} does not allow processing`,
        };
      }

      // 4. Process payment through domain entity
      const processedPayment = payment.process(
        validatedCommand.processedBy,
        validatedCommand.gatewayTransactionId,
        validatedCommand.notes
      );

      // 5. Save updated payment
      await this.deps.paymentRepository.update(processedPayment);

      return {
        success: true,
        paymentId: processedPayment.id,
        message: 'Payment processing started',
        metadata: {
          paymentStatus: processedPayment.status,
          gatewayTransactionId: validatedCommand.gatewayTransactionId,
        },
      };
    } catch (error) {
      if (error instanceof PaymentStatusError) {
        return {
          success: false,
          message: 'Payment status error',
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Failed to process payment',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// ============================================================================
// Complete Payment Handler
// ============================================================================

/**
 * Handler for CompletePaymentCommand
 */
export class CompletePaymentHandler {
  constructor(private readonly deps: PaymentHandlerDependencies) {}

  /**
   * Execute complete payment command
   */
  async execute(command: unknown): Promise<PaymentCommandResult> {
    try {
      // 1. Validate command
      const validatedCommand = validateCompletePaymentCommand(command);

      // 2. Get payment from repository
      const payment = await this.deps.paymentRepository.findById(validatedCommand.paymentId);
      if (!payment) {
        return {
          success: false,
          message: 'Payment not found',
          error: `Payment with ID ${validatedCommand.paymentId} not found`,
        };
      }

      // 3. Complete payment through domain entity
      const completedPayment = payment.complete(validatedCommand.gatewayResponse, validatedCommand.completedBy);

      // 4. Save updated payment
      await this.deps.paymentRepository.update(completedPayment);

      // 5. Update order payment status if payment completed successfully
      if (completedPayment.status === PaymentStatus.COMPLETED) {
        const order = await this.deps.orderRepository.findById(completedPayment.orderId);
        if (order) {
          const updatedOrder = order.updatePaymentStatus(OrderPaymentStatus.PAID, validatedCommand.completedBy);
          await this.deps.orderRepository.update(updatedOrder);
        }
      }

      return {
        success: true,
        paymentId: completedPayment.id,
        message: 'Payment completed successfully',
        metadata: {
          paymentStatus: completedPayment.status,
          gatewayTransactionId: validatedCommand.gatewayResponse.gatewayTransactionId,
          completedAt: completedPayment.completedAt,
        },
      };
    } catch (error) {
      if (error instanceof PaymentGatewayError) {
        return {
          success: false,
          message: 'Payment gateway error',
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Failed to complete payment',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// ============================================================================
// Fail Payment Handler
// ============================================================================

/**
 * Handler for FailPaymentCommand
 */
export class FailPaymentHandler {
  constructor(private readonly deps: PaymentHandlerDependencies) {}

  /**
   * Execute fail payment command
   */
  async execute(command: unknown): Promise<PaymentCommandResult> {
    try {
      // 1. Validate command
      const validatedCommand = validateFailPaymentCommand(command);

      // 2. Get payment from repository
      const payment = await this.deps.paymentRepository.findById(validatedCommand.paymentId);
      if (!payment) {
        return {
          success: false,
          message: 'Payment not found',
          error: `Payment with ID ${validatedCommand.paymentId} not found`,
        };
      }

      // 3. Fail payment through domain entity
      const failedPayment = payment.fail(validatedCommand.gatewayResponse, validatedCommand.failedBy);

      // 4. Save updated payment
      await this.deps.paymentRepository.update(failedPayment);

      return {
        success: true,
        paymentId: failedPayment.id,
        message: 'Payment marked as failed',
        metadata: {
          paymentStatus: failedPayment.status,
          errorCode: validatedCommand.gatewayResponse.errorCode,
          failureReason: validatedCommand.gatewayResponse.message,
        },
      };
    } catch (error) {
      if (error instanceof PaymentGatewayError) {
        return {
          success: false,
          message: 'Payment gateway error',
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Failed to mark payment as failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// ============================================================================
// Cancel Payment Handler
// ============================================================================

/**
 * Handler for CancelPaymentCommand
 */
export class CancelPaymentHandler {
  constructor(private readonly deps: PaymentHandlerDependencies) {}

  /**
   * Execute cancel payment command
   */
  async execute(command: unknown): Promise<PaymentCommandResult> {
    try {
      // 1. Validate command
      const validatedCommand = validateCancelPaymentCommand(command);

      // 2. Get payment from repository
      const payment = await this.deps.paymentRepository.findById(validatedCommand.paymentId);
      if (!payment) {
        return {
          success: false,
          message: 'Payment not found',
          error: `Payment with ID ${validatedCommand.paymentId} not found`,
        };
      }

      // 3. Validate payment can be cancelled
      if (!payment.canCancel()) {
        return {
          success: false,
          message: 'Payment cannot be cancelled',
          error: `Payment status ${payment.status} does not allow cancellation`,
        };
      }

      // 4. Cancel payment through domain entity
      const cancelledPayment = payment.cancel(
        validatedCommand.reason,
        validatedCommand.cancelledBy,
        validatedCommand.notes
      );

      // 5. Save updated payment
      await this.deps.paymentRepository.update(cancelledPayment);

      return {
        success: true,
        paymentId: cancelledPayment.id,
        message: 'Payment cancelled successfully',
        metadata: {
          paymentStatus: cancelledPayment.status,
          cancellationReason: validatedCommand.reason,
        },
      };
    } catch (error) {
      if (error instanceof PaymentStatusError) {
        return {
          success: false,
          message: 'Payment status error',
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Failed to cancel payment',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// ============================================================================
// Create Refund Handler
// ============================================================================

/**
 * Handler for CreateRefundCommand
 */
export class CreateRefundHandler {
  constructor(private readonly deps: PaymentHandlerDependencies) {}

  /**
   * Execute create refund command
   */
  async execute(command: unknown): Promise<PaymentCommandResult> {
    try {
      // 1. Validate command
      const validatedCommand = validateCreateRefundCommand(command);

      // 2. Get payment from repository
      const payment = await this.deps.paymentRepository.findById(validatedCommand.paymentId);
      if (!payment) {
        return {
          success: false,
          message: 'Payment not found',
          error: `Payment with ID ${validatedCommand.paymentId} not found`,
        };
      }

      // 3. Validate payment can be refunded
      if (!payment.canRefund()) {
        return {
          success: false,
          message: 'Payment cannot be refunded',
          error: `Payment status ${payment.status} does not allow refund`,
        };
      }

      // 4. Create refund through domain entity
      const refundAmount = Money.fromDecimal(validatedCommand.amount, payment.amount.currency);
      const { payment: updatedPayment, refund } = payment.createRefund(
        refundAmount,
        validatedCommand.reason,
        validatedCommand.createdBy,
        validatedCommand.refundReference,
        validatedCommand.notes
      );

      // 5. Save updated payment
      await this.deps.paymentRepository.update(updatedPayment);

      return {
        success: true,
        paymentId: updatedPayment.id,
        refundId: refund.id,
        message: 'Refund created successfully',
        metadata: {
          refundAmount: refund.amount.toString(),
          refundReason: validatedCommand.reason,
          refundStatus: refund.status,
        },
      };
    } catch (error) {
      if (error instanceof InvalidRefundAmountError) {
        return {
          success: false,
          message: 'Invalid refund amount',
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Failed to create refund',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// ============================================================================
// Process Refund Handler
// ============================================================================

/**
 * Handler for ProcessRefundCommand
 */
export class ProcessRefundHandler {
  constructor(private readonly deps: PaymentHandlerDependencies) {}

  /**
   * Execute process refund command
   */
  async execute(command: unknown): Promise<PaymentCommandResult> {
    try {
      // 1. Validate command
      const validatedCommand = validateProcessRefundCommand(command);

      // 2. Get payment from repository
      const payment = await this.deps.paymentRepository.findById(validatedCommand.paymentId);
      if (!payment) {
        return {
          success: false,
          message: 'Payment not found',
          error: `Payment with ID ${validatedCommand.paymentId} not found`,
        };
      }

      // 3. Process refund through domain entity
      const updatedPayment = payment.processRefund(
        validatedCommand.refundId,
        validatedCommand.gatewayResponse,
        validatedCommand.processedBy
      );

      // 4. Save updated payment
      await this.deps.paymentRepository.update(updatedPayment);

      return {
        success: true,
        paymentId: updatedPayment.id,
        refundId: validatedCommand.refundId,
        message: 'Refund processed successfully',
        metadata: {
          gatewayTransactionId: validatedCommand.gatewayResponse.gatewayTransactionId,
          refundProcessed: validatedCommand.gatewayResponse.success,
        },
      };
    } catch (error) {
      if (error instanceof PaymentGatewayError) {
        return {
          success: false,
          message: 'Refund processing error',
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Failed to process refund',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// ============================================================================
// Retry Payment Handler
// ============================================================================

/**
 * Handler for RetryPaymentCommand
 */
export class RetryPaymentHandler {
  constructor(private readonly deps: PaymentHandlerDependencies) {}

  /**
   * Execute retry payment command
   */
  async execute(command: unknown): Promise<PaymentCommandResult> {
    try {
      // 1. Validate command
      const validatedCommand = validateRetryPaymentCommand(command);

      // 2. Get payment from repository
      const payment = await this.deps.paymentRepository.findById(validatedCommand.paymentId);
      if (!payment) {
        return {
          success: false,
          message: 'Payment not found',
          error: `Payment with ID ${validatedCommand.paymentId} not found`,
        };
      }

      // 3. Validate payment can be retried
      if (!payment.canRetry()) {
        return {
          success: false,
          message: 'Payment cannot be retried',
          error: `Payment status ${payment.status} does not allow retry`,
        };
      }

      // 4. Retry payment through domain entity
      const retriedPayment = payment.retry(
        validatedCommand.reason,
        validatedCommand.retriedBy,
        validatedCommand.newGateway,
        validatedCommand.newPaymentMethod,
        validatedCommand.notes
      );

      // 5. Save updated payment
      await this.deps.paymentRepository.update(retriedPayment);

      return {
        success: true,
        paymentId: retriedPayment.id,
        message: 'Payment retry initiated',
        metadata: {
          paymentStatus: retriedPayment.status,
          retryCount: retriedPayment.retryInfo?.retryCount || 0,
          newGateway: validatedCommand.newGateway,
          newPaymentMethod: validatedCommand.newPaymentMethod,
        },
      };
    } catch (error) {
      if (error instanceof PaymentRetryLimitExceededError) {
        return {
          success: false,
          message: 'Payment retry limit exceeded',
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'Failed to retry payment',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
