/**
 * Payment Commands Tests - Step 2B.1
 *
 * Comprehensive test suite for payment command schemas and validation functions.
 * Tests command structure validation, business rule enforcement, error handling,
 * and type safety for all payment operations.
 *
 * @domain Order Management - Payment Processing
 * @version 1.0.0 - Step 2B: Application Layer Implementation
 */

import {
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
  type InitiatePaymentCommand,
  type ProcessPaymentCommand,
  type CompletePaymentCommand,
  type FailPaymentCommand,
  type CancelPaymentCommand,
  type CreateRefundCommand,
  type ProcessRefundCommand,
  type RetryPaymentCommand,
} from '../payment.command';
import { PaymentMethod } from '../../../../domain/entities/order';
import { PaymentGateway } from '../../../../domain/entities/payment';

describe('Payment Commands - Step 2B.1', () => {
  // Test data setup
  const validInitiatePaymentCommand = {
    orderId: 'order_123',
    orderNumber: 'ORD-2024-001',
    customerId: 'customer_456',
    customerName: 'John Doe',
    amount: 100.5,
    currency: 'USD',
    paymentMethod: PaymentMethod.CREDIT,
    gateway: PaymentGateway.STRIPE,
    description: 'Payment for order ORD-2024-001',
    metadata: { orderId: 'order_123', source: 'web' },
    agencyId: 'agency_789',
    initiatedBy: 'user_101',
  };

  const validGatewayResponse = {
    success: true,
    transactionId: 'txn_stripe_123456',
    gatewayTransactionId: 'ch_1234567890',
    message: 'Payment successful',
    processedAt: new Date(),
    metadata: { cardLast4: '1234' },
  };

  const validFailedGatewayResponse = {
    success: false as const,
    transactionId: 'txn_stripe_123456',
    gatewayTransactionId: 'ch_1234567890',
    message: 'Card declined',
    errorCode: 'card_declined',
    processedAt: new Date(),
    metadata: { declineCode: 'insufficient_funds' },
  };

  describe('InitiatePaymentCommand Schema Validation', () => {
    it('should validate correct InitiatePaymentCommand', () => {
      const result = InitiatePaymentCommandSchema.parse(validInitiatePaymentCommand);

      expect(result).toEqual(validInitiatePaymentCommand);
      expect(result.orderId).toBe('order_123');
      expect(result.amount).toBe(100.5);
      expect(result.paymentMethod).toBe(PaymentMethod.CREDIT);
      expect(result.gateway).toBe(PaymentGateway.STRIPE);
    });

    it('should apply default currency when not provided', () => {
      const { currency, ...commandWithoutCurrency } = validInitiatePaymentCommand;

      const result = InitiatePaymentCommandSchema.parse(commandWithoutCurrency);
      expect(result.currency).toBe('USD');
    });

    it('should reject command with missing required fields', () => {
      const { orderId, ...invalidCommand } = validInitiatePaymentCommand;

      expect(() => InitiatePaymentCommandSchema.parse(invalidCommand)).toThrow();
    });

    it('should reject command with invalid amount (zero)', () => {
      const invalidCommand = { ...validInitiatePaymentCommand, amount: 0 };

      expect(() => InitiatePaymentCommandSchema.parse(invalidCommand)).toThrow();
    });

    it('should reject command with invalid amount (negative)', () => {
      const invalidCommand = { ...validInitiatePaymentCommand, amount: -50 };

      expect(() => InitiatePaymentCommandSchema.parse(invalidCommand)).toThrow();
    });

    it('should reject command with invalid currency code', () => {
      const invalidCommand = { ...validInitiatePaymentCommand, currency: 'INVALID' };

      expect(() => InitiatePaymentCommandSchema.parse(invalidCommand)).toThrow();
    });

    it('should reject command with invalid payment method', () => {
      const invalidCommand = { ...validInitiatePaymentCommand, paymentMethod: 'INVALID' as any };

      expect(() => InitiatePaymentCommandSchema.parse(invalidCommand)).toThrow();
    });

    it('should reject command with invalid gateway', () => {
      const invalidCommand = { ...validInitiatePaymentCommand, gateway: 'INVALID' as any };

      expect(() => InitiatePaymentCommandSchema.parse(invalidCommand)).toThrow();
    });

    it('should accept optional fields', () => {
      const commandWithOptionals = {
        ...validInitiatePaymentCommand,
        description: undefined,
        metadata: undefined,
      };

      const result = InitiatePaymentCommandSchema.parse(commandWithOptionals);
      expect(result.description).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });
  });

  describe('ProcessPaymentCommand Schema Validation', () => {
    const validProcessCommand = {
      paymentId: 'payment_123',
      gatewayTransactionId: 'ch_1234567890',
      processedBy: 'user_101',
      notes: 'Processing payment',
    };

    it('should validate correct ProcessPaymentCommand', () => {
      const result = ProcessPaymentCommandSchema.parse(validProcessCommand);
      expect(result).toEqual(validProcessCommand);
    });

    it('should accept command without optional fields', () => {
      const minimalCommand = {
        paymentId: 'payment_123',
        processedBy: 'user_101',
      };

      const result = ProcessPaymentCommandSchema.parse(minimalCommand);
      expect(result.paymentId).toBe('payment_123');
      expect(result.processedBy).toBe('user_101');
      expect(result.gatewayTransactionId).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });

    it('should reject command with missing required fields', () => {
      const invalidCommand = { processedBy: 'user_101' };

      expect(() => ProcessPaymentCommandSchema.parse(invalidCommand)).toThrow();
    });
  });

  describe('CompletePaymentCommand Schema Validation', () => {
    const validCompleteCommand = {
      paymentId: 'payment_123',
      gatewayResponse: validGatewayResponse,
      completedBy: 'user_101',
    };

    it('should validate correct CompletePaymentCommand', () => {
      const result = CompletePaymentCommandSchema.parse(validCompleteCommand);
      expect(result).toEqual(validCompleteCommand);
      expect(result.gatewayResponse.success).toBe(true);
      expect(result.gatewayResponse.transactionId).toBe('txn_stripe_123456');
    });

    it('should reject command with invalid gateway response', () => {
      const invalidCommand = {
        ...validCompleteCommand,
        gatewayResponse: { ...validGatewayResponse, transactionId: '', message: '' },
      };

      expect(() => CompletePaymentCommandSchema.parse(invalidCommand)).toThrow();
    });

    it('should reject command with missing gateway response fields', () => {
      const invalidCommand = {
        ...validCompleteCommand,
        gatewayResponse: { success: true },
      };

      expect(() => CompletePaymentCommandSchema.parse(invalidCommand)).toThrow();
    });
  });

  describe('FailPaymentCommand Schema Validation', () => {
    const validFailCommand = {
      paymentId: 'payment_123',
      gatewayResponse: validFailedGatewayResponse,
      failedBy: 'user_101',
    };

    it('should validate correct FailPaymentCommand', () => {
      const result = FailPaymentCommandSchema.parse(validFailCommand);
      expect(result).toEqual(validFailCommand);
      expect(result.gatewayResponse.success).toBe(false);
      expect(result.gatewayResponse.errorCode).toBe('card_declined');
    });

    it('should reject command with success=true in gateway response', () => {
      const invalidCommand = {
        ...validFailCommand,
        gatewayResponse: { ...validFailedGatewayResponse, success: true },
      };

      expect(() => FailPaymentCommandSchema.parse(invalidCommand)).toThrow();
    });

    it('should require errorCode in failed gateway response', () => {
      const { errorCode, ...invalidResponse } = validFailedGatewayResponse;

      const invalidCommand = {
        ...validFailCommand,
        gatewayResponse: invalidResponse,
      };

      expect(() => FailPaymentCommandSchema.parse(invalidCommand)).toThrow();
    });
  });

  describe('CancelPaymentCommand Schema Validation', () => {
    const validCancelCommand = {
      paymentId: 'payment_123',
      reason: 'Customer requested cancellation',
      cancelledBy: 'user_101',
      notes: 'Cancelled due to customer request',
    };

    it('should validate correct CancelPaymentCommand', () => {
      const result = CancelPaymentCommandSchema.parse(validCancelCommand);
      expect(result).toEqual(validCancelCommand);
    });

    it('should accept command without optional notes', () => {
      const { notes, ...commandWithoutNotes } = validCancelCommand;

      const result = CancelPaymentCommandSchema.parse(commandWithoutNotes);
      expect(result.notes).toBeUndefined();
    });

    it('should reject command with empty reason', () => {
      const invalidCommand = { ...validCancelCommand, reason: '' };

      expect(() => CancelPaymentCommandSchema.parse(invalidCommand)).toThrow();
    });
  });

  describe('CreateRefundCommand Schema Validation', () => {
    const validRefundCommand = {
      paymentId: 'payment_123',
      amount: 50.25,
      reason: 'Product return',
      refundReference: 'REF-001',
      notes: 'Customer returned product',
      createdBy: 'user_101',
    };

    it('should validate correct CreateRefundCommand', () => {
      const result = CreateRefundCommandSchema.parse(validRefundCommand);
      expect(result).toEqual(validRefundCommand);
    });

    it('should accept command without optional fields', () => {
      const minimalCommand = {
        paymentId: 'payment_123',
        amount: 50.25,
        reason: 'Product return',
        createdBy: 'user_101',
      };

      const result = CreateRefundCommandSchema.parse(minimalCommand);
      expect(result.refundReference).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });

    it('should reject command with invalid amount (zero)', () => {
      const invalidCommand = { ...validRefundCommand, amount: 0 };

      expect(() => CreateRefundCommandSchema.parse(invalidCommand)).toThrow();
    });

    it('should reject command with invalid amount (negative)', () => {
      const invalidCommand = { ...validRefundCommand, amount: -25 };

      expect(() => CreateRefundCommandSchema.parse(invalidCommand)).toThrow();
    });
  });

  describe('ProcessRefundCommand Schema Validation', () => {
    const validProcessRefundCommand = {
      paymentId: 'payment_123',
      refundId: 'refund_456',
      gatewayResponse: validGatewayResponse,
      processedBy: 'user_101',
    };

    it('should validate correct ProcessRefundCommand', () => {
      const result = ProcessRefundCommandSchema.parse(validProcessRefundCommand);
      expect(result).toEqual(validProcessRefundCommand);
    });

    it('should reject command with missing refund ID', () => {
      const { refundId, ...invalidCommand } = validProcessRefundCommand;

      expect(() => ProcessRefundCommandSchema.parse(invalidCommand)).toThrow();
    });
  });

  describe('RetryPaymentCommand Schema Validation', () => {
    const validRetryCommand = {
      paymentId: 'payment_123',
      reason: 'Previous attempt failed due to network issue',
      newGateway: PaymentGateway.PAYPAL,
      newPaymentMethod: PaymentMethod.CREDIT,
      retriedBy: 'user_101',
      notes: 'Retrying with different gateway',
    };

    it('should validate correct RetryPaymentCommand', () => {
      const result = RetryPaymentCommandSchema.parse(validRetryCommand);
      expect(result).toEqual(validRetryCommand);
    });

    it('should accept command without optional fields', () => {
      const minimalCommand = {
        paymentId: 'payment_123',
        reason: 'Previous attempt failed',
        retriedBy: 'user_101',
      };

      const result = RetryPaymentCommandSchema.parse(minimalCommand);
      expect(result.newGateway).toBeUndefined();
      expect(result.newPaymentMethod).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });

    it('should reject command with empty reason', () => {
      const invalidCommand = { ...validRetryCommand, reason: '' };

      expect(() => RetryPaymentCommandSchema.parse(invalidCommand)).toThrow();
    });
  });

  describe('Command Validation Functions', () => {
    describe('validateInitiatePaymentCommand', () => {
      it('should validate correct command', () => {
        const result = validateInitiatePaymentCommand(validInitiatePaymentCommand);
        expect(result).toEqual(validInitiatePaymentCommand);
      });

      it('should throw PaymentCommandValidationError for invalid command', () => {
        const invalidCommand = { ...validInitiatePaymentCommand, amount: -50 };

        expect(() => validateInitiatePaymentCommand(invalidCommand)).toThrow(PaymentCommandValidationError);
      });

      it('should provide detailed validation errors', () => {
        const invalidCommand = { orderId: '', amount: 0 };

        try {
          validateInitiatePaymentCommand(invalidCommand);
        } catch (error) {
          expect(error).toBeInstanceOf(PaymentCommandValidationError);
          const validationError = error as PaymentCommandValidationError;
          expect(validationError.code).toBe('PAYMENT_COMMAND_VALIDATION_ERROR');
          expect(validationError.validationErrors).toBeDefined();
          expect(Object.keys(validationError.validationErrors).length).toBeGreaterThan(0);
        }
      });
    });

    describe('validateProcessPaymentCommand', () => {
      it('should validate correct command', () => {
        const validCommand = {
          paymentId: 'payment_123',
          processedBy: 'user_101',
        };

        const result = validateProcessPaymentCommand(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should throw PaymentCommandValidationError for invalid command', () => {
        const invalidCommand = { paymentId: '' };

        expect(() => validateProcessPaymentCommand(invalidCommand)).toThrow(PaymentCommandValidationError);
      });
    });

    describe('validateCompletePaymentCommand', () => {
      it('should validate correct command', () => {
        const validCommand = {
          paymentId: 'payment_123',
          gatewayResponse: validGatewayResponse,
          completedBy: 'user_101',
        };

        const result = validateCompletePaymentCommand(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should throw PaymentCommandValidationError for invalid command', () => {
        const invalidCommand = {
          paymentId: 'payment_123',
          gatewayResponse: { success: true },
          completedBy: 'user_101',
        };

        expect(() => validateCompletePaymentCommand(invalidCommand)).toThrow(PaymentCommandValidationError);
      });
    });

    describe('validateFailPaymentCommand', () => {
      it('should validate correct command', () => {
        const validCommand = {
          paymentId: 'payment_123',
          gatewayResponse: validFailedGatewayResponse,
          failedBy: 'user_101',
        };

        const result = validateFailPaymentCommand(validCommand);
        expect(result).toEqual(validCommand);
      });
    });

    describe('validateCancelPaymentCommand', () => {
      it('should validate correct command', () => {
        const validCommand = {
          paymentId: 'payment_123',
          reason: 'Customer requested',
          cancelledBy: 'user_101',
        };

        const result = validateCancelPaymentCommand(validCommand);
        expect(result).toEqual(validCommand);
      });
    });

    describe('validateCreateRefundCommand', () => {
      it('should validate correct command', () => {
        const validCommand = {
          paymentId: 'payment_123',
          amount: 50.25,
          reason: 'Product return',
          createdBy: 'user_101',
        };

        const result = validateCreateRefundCommand(validCommand);
        expect(result).toEqual(validCommand);
      });
    });

    describe('validateProcessRefundCommand', () => {
      it('should validate correct command', () => {
        const validCommand = {
          paymentId: 'payment_123',
          refundId: 'refund_456',
          gatewayResponse: validGatewayResponse,
          processedBy: 'user_101',
        };

        const result = validateProcessRefundCommand(validCommand);
        expect(result).toEqual(validCommand);
      });
    });

    describe('validateRetryPaymentCommand', () => {
      it('should validate correct command', () => {
        const validCommand = {
          paymentId: 'payment_123',
          reason: 'Previous attempt failed',
          retriedBy: 'user_101',
        };

        const result = validateRetryPaymentCommand(validCommand);
        expect(result).toEqual(validCommand);
      });
    });
  });

  describe('Error Handling', () => {
    it('should create PaymentCommandValidationError with proper structure', () => {
      const validationErrors = {
        amount: ['Amount must be positive'],
        orderId: ['Order ID is required'],
      };

      const error = new PaymentCommandValidationError('Validation failed', validationErrors);

      expect(error.name).toBe('PaymentCommandValidationError');
      expect(error.code).toBe('PAYMENT_COMMAND_VALIDATION_ERROR');
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.message).toBe('Validation failed');
    });

    it('should handle unknown validation errors gracefully', () => {
      const mockError = new Error('Unknown error');

      expect(() => {
        try {
          throw mockError;
        } catch (error) {
          if (!(error instanceof PaymentCommandValidationError)) {
            throw error;
          }
        }
      }).toThrow('Unknown error');
    });
  });

  describe('Type Safety', () => {
    it('should ensure proper TypeScript types for all commands', () => {
      // This test ensures TypeScript compilation passes with proper types
      const initiateCommand: InitiatePaymentCommand = validInitiatePaymentCommand;
      const processCommand: ProcessPaymentCommand = { paymentId: 'test', processedBy: 'user' };
      const completeCommand: CompletePaymentCommand = {
        paymentId: 'test',
        gatewayResponse: validGatewayResponse,
        completedBy: 'user',
      };
      const failCommand: FailPaymentCommand = {
        paymentId: 'test',
        gatewayResponse: validFailedGatewayResponse,
        failedBy: 'user',
      };
      const cancelCommand: CancelPaymentCommand = {
        paymentId: 'test',
        reason: 'test',
        cancelledBy: 'user',
      };
      const refundCommand: CreateRefundCommand = {
        paymentId: 'test',
        amount: 50,
        reason: 'test',
        createdBy: 'user',
      };
      const processRefundCommand: ProcessRefundCommand = {
        paymentId: 'test',
        refundId: 'ref',
        gatewayResponse: validGatewayResponse,
        processedBy: 'user',
      };
      const retryCommand: RetryPaymentCommand = {
        paymentId: 'test',
        reason: 'test',
        retriedBy: 'user',
      };

      // If this compiles, the types are properly defined
      expect(initiateCommand).toBeDefined();
      expect(processCommand).toBeDefined();
      expect(completeCommand).toBeDefined();
      expect(failCommand).toBeDefined();
      expect(cancelCommand).toBeDefined();
      expect(refundCommand).toBeDefined();
      expect(processRefundCommand).toBeDefined();
      expect(retryCommand).toBeDefined();
    });
  });
});
