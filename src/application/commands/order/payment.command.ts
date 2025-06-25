/**
 * Payment Commands - Step 2B.1
 *
 * CQRS Commands for payment processing operations in the order management system.
 * Handles payment initiation, processing, completion, failure, cancellation, refunds,
 * and retry operations with comprehensive validation and business rules enforcement.
 *
 * Business Rules:
 * - Payment amounts must be positive and valid
 * - Order must exist and be in appropriate status
 * - Payment methods must be supported by gateway
 * - Refund amounts cannot exceed original payment
 * - Retry limits must be enforced
 * - Gateway responses must be properly validated
 * - Audit trail must be maintained for all operations
 *
 * @domain Order Management - Payment Processing
 * @pattern CQRS Command
 * @version 1.0.0 - Step 2B: Application Layer Implementation
 */

import { z } from 'zod';
import { PaymentMethod } from '../../../domain/entities/order';
import { PaymentGateway } from '../../../domain/entities/payment';

// ============================================================================
// Command Schemas
// ============================================================================

/**
 * Initiate Payment Command Schema
 */
export const InitiatePaymentCommandSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  orderNumber: z.string().min(1, 'Order number is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  amount: z.number().positive('Payment amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3-letter code').default('USD'),
  paymentMethod: z.nativeEnum(PaymentMethod, { required_error: 'Payment method is required' }),
  gateway: z.nativeEnum(PaymentGateway, { required_error: 'Payment gateway is required' }),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  agencyId: z.string().min(1, 'Agency ID is required'),
  initiatedBy: z.string().min(1, 'Initiated by user ID is required'),
});

/**
 * Process Payment Command Schema
 */
export const ProcessPaymentCommandSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  gatewayTransactionId: z.string().optional(),
  processedBy: z.string().min(1, 'Processed by user ID is required'),
  notes: z.string().optional(),
});

/**
 * Complete Payment Command Schema
 */
export const CompletePaymentCommandSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  gatewayResponse: z.object({
    success: z.boolean(),
    transactionId: z.string().min(1, 'Transaction ID is required'),
    gatewayTransactionId: z.string().min(1, 'Gateway transaction ID is required'),
    message: z.string().min(1, 'Message is required'),
    errorCode: z.string().optional(),
    processedAt: z.date(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
  completedBy: z.string().min(1, 'Completed by user ID is required'),
});

/**
 * Fail Payment Command Schema
 */
export const FailPaymentCommandSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  gatewayResponse: z.object({
    success: z.literal(false),
    transactionId: z.string().min(1, 'Transaction ID is required'),
    gatewayTransactionId: z.string().optional(),
    message: z.string().min(1, 'Message is required'),
    errorCode: z.string().min(1, 'Error code is required'),
    processedAt: z.date(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
  failedBy: z.string().min(1, 'Failed by user ID is required'),
});

/**
 * Cancel Payment Command Schema
 */
export const CancelPaymentCommandSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  reason: z.string().min(1, 'Cancellation reason is required'),
  cancelledBy: z.string().min(1, 'Cancelled by user ID is required'),
  notes: z.string().optional(),
});

/**
 * Create Refund Command Schema
 */
export const CreateRefundCommandSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().positive('Refund amount must be positive'),
  reason: z.string().min(1, 'Refund reason is required'),
  refundReference: z.string().optional(),
  notes: z.string().optional(),
  createdBy: z.string().min(1, 'Created by user ID is required'),
});

/**
 * Process Refund Command Schema
 */
export const ProcessRefundCommandSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  refundId: z.string().min(1, 'Refund ID is required'),
  gatewayResponse: z.object({
    success: z.boolean(),
    transactionId: z.string().min(1, 'Transaction ID is required'),
    gatewayTransactionId: z.string().min(1, 'Gateway transaction ID is required'),
    message: z.string().min(1, 'Message is required'),
    errorCode: z.string().optional(),
    processedAt: z.date(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
  processedBy: z.string().min(1, 'Processed by user ID is required'),
});

/**
 * Retry Payment Command Schema
 */
export const RetryPaymentCommandSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  reason: z.string().min(1, 'Retry reason is required'),
  newGateway: z.nativeEnum(PaymentGateway).optional(),
  newPaymentMethod: z.nativeEnum(PaymentMethod).optional(),
  retriedBy: z.string().min(1, 'Retried by user ID is required'),
  notes: z.string().optional(),
});

// ============================================================================
// Command Types
// ============================================================================

export type InitiatePaymentCommand = z.infer<typeof InitiatePaymentCommandSchema>;
export type ProcessPaymentCommand = z.infer<typeof ProcessPaymentCommandSchema>;
export type CompletePaymentCommand = z.infer<typeof CompletePaymentCommandSchema>;
export type FailPaymentCommand = z.infer<typeof FailPaymentCommandSchema>;
export type CancelPaymentCommand = z.infer<typeof CancelPaymentCommandSchema>;
export type CreateRefundCommand = z.infer<typeof CreateRefundCommandSchema>;
export type ProcessRefundCommand = z.infer<typeof ProcessRefundCommandSchema>;
export type RetryPaymentCommand = z.infer<typeof RetryPaymentCommandSchema>;

// ============================================================================
// Command Result Types
// ============================================================================

/**
 * Payment Command Result Interface
 */
export interface PaymentCommandResult {
  success: boolean;
  paymentId?: string;
  refundId?: string;
  transactionReference?: string;
  message: string;
  error?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Payment Command Validation Error
 */
export class PaymentCommandValidationError extends Error {
  public readonly code = 'PAYMENT_COMMAND_VALIDATION_ERROR';
  public readonly validationErrors: Record<string, string[]>;

  constructor(message: string, validationErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'PaymentCommandValidationError';
    this.validationErrors = validationErrors;
  }
}

// ============================================================================
// Command Validation Functions
// ============================================================================

/**
 * Validates InitiatePaymentCommand
 */
export function validateInitiatePaymentCommand(command: unknown): InitiatePaymentCommand {
  try {
    return InitiatePaymentCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });
      throw new PaymentCommandValidationError('Invalid InitiatePaymentCommand', validationErrors);
    }
    throw error;
  }
}

/**
 * Validates ProcessPaymentCommand
 */
export function validateProcessPaymentCommand(command: unknown): ProcessPaymentCommand {
  try {
    return ProcessPaymentCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });
      throw new PaymentCommandValidationError('Invalid ProcessPaymentCommand', validationErrors);
    }
    throw error;
  }
}

/**
 * Validates CompletePaymentCommand
 */
export function validateCompletePaymentCommand(command: unknown): CompletePaymentCommand {
  try {
    return CompletePaymentCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });
      throw new PaymentCommandValidationError('Invalid CompletePaymentCommand', validationErrors);
    }
    throw error;
  }
}

/**
 * Validates FailPaymentCommand
 */
export function validateFailPaymentCommand(command: unknown): FailPaymentCommand {
  try {
    return FailPaymentCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });
      throw new PaymentCommandValidationError('Invalid FailPaymentCommand', validationErrors);
    }
    throw error;
  }
}

/**
 * Validates CancelPaymentCommand
 */
export function validateCancelPaymentCommand(command: unknown): CancelPaymentCommand {
  try {
    return CancelPaymentCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });
      throw new PaymentCommandValidationError('Invalid CancelPaymentCommand', validationErrors);
    }
    throw error;
  }
}

/**
 * Validates CreateRefundCommand
 */
export function validateCreateRefundCommand(command: unknown): CreateRefundCommand {
  try {
    return CreateRefundCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });
      throw new PaymentCommandValidationError('Invalid CreateRefundCommand', validationErrors);
    }
    throw error;
  }
}

/**
 * Validates ProcessRefundCommand
 */
export function validateProcessRefundCommand(command: unknown): ProcessRefundCommand {
  try {
    return ProcessRefundCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });
      throw new PaymentCommandValidationError('Invalid ProcessRefundCommand', validationErrors);
    }
    throw error;
  }
}

/**
 * Validates RetryPaymentCommand
 */
export function validateRetryPaymentCommand(command: unknown): RetryPaymentCommand {
  try {
    return RetryPaymentCommandSchema.parse(command);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!validationErrors[path]) {
          validationErrors[path] = [];
        }
        validationErrors[path].push(err.message);
      });
      throw new PaymentCommandValidationError('Invalid RetryPaymentCommand', validationErrors);
    }
    throw error;
  }
}
