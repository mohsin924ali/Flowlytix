/**
 * Payment Entity Tests - Step 2A
 *
 * Comprehensive test suite for Payment domain entity covering:
 * - Payment creation and validation
 * - Payment status transitions and business rules
 * - Payment workflow operations (process, complete, fail, cancel, retry)
 * - Refund creation and validation
 * - Gateway callback handling
 * - Audit trail functionality
 * - Error handling and edge cases
 * - Persistence and immutability
 *
 * @domain Order Management - Payment Processing
 * @version 1.0.0
 */

import {
  Payment,
  PaymentStatus,
  PaymentTransactionType,
  PaymentGateway,
  PaymentActionType,
  PaymentDomainError,
  PaymentValidationError,
  InvalidPaymentAmountError,
  PaymentStatusError,
  PaymentGatewayError,
  PaymentRetryLimitExceededError,
  InvalidRefundAmountError,
  type PaymentProps,
  type GatewayResponse,
  type PaymentRetryInfo,
} from '../payment';
import { PaymentMethod } from '../order';
import { Money } from '../../value-objects/money';

describe('Payment Entity - Step 2A', () => {
  // Test data setup
  const validPaymentProps: PaymentProps = {
    orderId: 'order_123',
    orderNumber: 'ORD-2024-001',
    customerId: 'customer_456',
    customerName: 'John Doe',
    amount: Money.fromDecimal(100.5, 'USD'),
    paymentMethod: PaymentMethod.CREDIT,
    gateway: PaymentGateway.STRIPE,
    transactionReference: 'txn_stripe_123456',
    description: 'Payment for order ORD-2024-001',
    metadata: { orderId: 'order_123', source: 'web' },
    agencyId: 'agency_789',
    initiatedBy: 'user_101',
  };

  const validGatewayResponse: GatewayResponse = {
    success: true,
    transactionId: 'txn_stripe_123456',
    gatewayTransactionId: 'ch_1234567890',
    message: 'Payment successful',
    processedAt: new Date(),
  };

  const failedGatewayResponse: GatewayResponse = {
    success: false,
    transactionId: 'txn_stripe_123456',
    gatewayTransactionId: 'ch_1234567890',
    message: 'Card declined',
    errorCode: 'card_declined',
    processedAt: new Date(),
  };

  describe('Payment Creation', () => {
    it('should create payment with valid props', () => {
      const payment = Payment.create(validPaymentProps);

      expect(payment.id).toBeDefined();
      expect(payment.orderId).toBe(validPaymentProps.orderId);
      expect(payment.orderNumber).toBe(validPaymentProps.orderNumber);
      expect(payment.customerId).toBe(validPaymentProps.customerId);
      expect(payment.customerName).toBe(validPaymentProps.customerName);
      expect(payment.amount).toBe(validPaymentProps.amount);
      expect(payment.paymentMethod).toBe(validPaymentProps.paymentMethod);
      expect(payment.gateway).toBe(validPaymentProps.gateway);
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.transactionType).toBe(PaymentTransactionType.PAYMENT);
      expect(payment.transactionReference).toBe(validPaymentProps.transactionReference);
      expect(payment.description).toBe(validPaymentProps.description);
      expect(payment.metadata).toEqual(validPaymentProps.metadata);
      expect(payment.agencyId).toBe(validPaymentProps.agencyId);
      expect(payment.initiatedBy).toBe(validPaymentProps.initiatedBy);
      expect(payment.initiatedAt).toBeInstanceOf(Date);
      expect(payment.processedAt).toBeNull();
      expect(payment.completedAt).toBeNull();
      expect(payment.auditTrail).toEqual([]);
    });

    it('should create payment without optional fields', () => {
      const minimalProps: PaymentProps = {
        orderId: 'order_123',
        orderNumber: 'ORD-2024-001',
        customerId: 'customer_456',
        customerName: 'John Doe',
        amount: Money.fromDecimal(100.5, 'USD'),
        paymentMethod: PaymentMethod.CREDIT,
        gateway: PaymentGateway.STRIPE,
        transactionReference: 'txn_stripe_123456',
        agencyId: 'agency_789',
        initiatedBy: 'user_101',
      };

      const payment = Payment.create(minimalProps);

      expect(payment.description).toBeNull();
      expect(payment.metadata).toBeNull();
    });

    it('should be immutable after creation', () => {
      const payment = Payment.create(validPaymentProps);

      expect(() => {
        (payment as any).status = PaymentStatus.COMPLETED;
      }).toThrow();
    });
  });

  describe('Payment Validation', () => {
    it('should reject invalid payment amount (zero)', () => {
      const invalidProps = {
        ...validPaymentProps,
        amount: Money.fromDecimal(0, 'USD'),
      };

      expect(() => Payment.create(invalidProps)).toThrow(InvalidPaymentAmountError);
    });

    it('should reject invalid payment amount (negative)', () => {
      const invalidProps = {
        ...validPaymentProps,
        amount: Money.fromDecimal(-50, 'USD'),
      };

      expect(() => Payment.create(invalidProps)).toThrow(InvalidPaymentAmountError);
    });

    it('should reject empty transaction reference', () => {
      const invalidProps = {
        ...validPaymentProps,
        transactionReference: '',
      };

      expect(() => Payment.create(invalidProps)).toThrow(PaymentValidationError);
    });

    it('should reject transaction reference exceeding max length', () => {
      const invalidProps = {
        ...validPaymentProps,
        transactionReference: 'a'.repeat(101),
      };

      expect(() => Payment.create(invalidProps)).toThrow(PaymentValidationError);
    });

    it('should reject empty customer ID', () => {
      const invalidProps = {
        ...validPaymentProps,
        customerId: '',
      };

      expect(() => Payment.create(invalidProps)).toThrow(PaymentValidationError);
    });

    it('should reject empty customer name', () => {
      const invalidProps = {
        ...validPaymentProps,
        customerName: '',
      };

      expect(() => Payment.create(invalidProps)).toThrow(PaymentValidationError);
    });

    it('should reject empty order ID', () => {
      const invalidProps = {
        ...validPaymentProps,
        orderId: '',
      };

      expect(() => Payment.create(invalidProps)).toThrow(PaymentValidationError);
    });

    it('should reject empty order number', () => {
      const invalidProps = {
        ...validPaymentProps,
        orderNumber: '',
      };

      expect(() => Payment.create(invalidProps)).toThrow(PaymentValidationError);
    });
  });

  describe('Payment Status Validation', () => {
    it('should allow processing from pending status', () => {
      const payment = Payment.create(validPaymentProps);
      expect(payment.canProcess()).toBe(true);
    });

    it('should allow cancellation from pending status', () => {
      const payment = Payment.create(validPaymentProps);
      expect(payment.canCancel()).toBe(true);
    });

    it('should not allow refund from pending status', () => {
      const payment = Payment.create(validPaymentProps);
      expect(payment.canRefund()).toBe(false);
    });

    it('should not allow retry from pending status', () => {
      const payment = Payment.create(validPaymentProps);
      expect(payment.canRetry()).toBe(false);
    });
  });

  describe('Payment Processing Operations', () => {
    it('should start processing successfully', () => {
      const payment = Payment.create(validPaymentProps);
      const processed = payment.startProcessing('user_101', 'gateway_txn_123', 'Processing payment');

      expect(processed.status).toBe(PaymentStatus.PROCESSING);
      expect(processed.processedAt).toBeInstanceOf(Date);
      expect(processed.gatewayTransactionId).toBe('gateway_txn_123');
      expect(processed.updatedBy).toBe('user_101');
      expect(processed.updatedAt).toBeInstanceOf(Date);
      expect(processed.auditTrail).toHaveLength(1);
      expect(processed.auditTrail[0].actionType).toBe(PaymentActionType.PROCESS_PAYMENT);
      expect(processed.auditTrail[0].previousStatus).toBe(PaymentStatus.PENDING);
      expect(processed.auditTrail[0].newStatus).toBe(PaymentStatus.PROCESSING);
    });

    it('should complete payment successfully', () => {
      const payment = Payment.create(validPaymentProps);
      const processed = payment.startProcessing('user_101');
      const completed = processed.complete('user_101', validGatewayResponse, 'Payment completed');

      expect(completed.status).toBe(PaymentStatus.COMPLETED);
      expect(completed.completedAt).toBeInstanceOf(Date);
      expect(completed.gatewayTransactionId).toBe(validGatewayResponse.gatewayTransactionId);
      expect(completed.auditTrail).toHaveLength(2);
      expect(completed.auditTrail[1].actionType).toBe(PaymentActionType.COMPLETE_PAYMENT);
      expect(completed.auditTrail[1].gatewayResponse).toEqual(validGatewayResponse);
    });

    it('should fail payment with retry info', () => {
      const payment = Payment.create(validPaymentProps);
      const processed = payment.startProcessing('user_101');
      const failed = processed.fail('user_101', failedGatewayResponse, 'Payment failed');

      expect(failed.status).toBe(PaymentStatus.FAILED);
      expect(failed.retryInfo).toBeDefined();
      expect(failed.retryInfo?.attemptNumber).toBe(1);
      expect(failed.retryInfo?.maxAttempts).toBe(3);
      expect(failed.retryInfo?.lastFailureReason).toBe('Card declined');
      expect(failed.retryInfo?.nextRetryAt).toBeInstanceOf(Date);
      expect(failed.canRetry()).toBe(true);
    });

    it('should cancel payment successfully', () => {
      const payment = Payment.create(validPaymentProps);
      const cancelled = payment.cancel('user_101', 'User requested cancellation');

      expect(cancelled.status).toBe(PaymentStatus.CANCELLED);
      expect(cancelled.auditTrail).toHaveLength(1);
      expect(cancelled.auditTrail[0].actionType).toBe(PaymentActionType.CANCEL_PAYMENT);
      expect(cancelled.auditTrail[0]?.notes).toBe('User requested cancellation');
    });

    it('should retry failed payment successfully', () => {
      const payment = Payment.create(validPaymentProps);
      const processed = payment.startProcessing('user_101');
      const failed = processed.fail('user_101', failedGatewayResponse);
      const retried = failed.retry('user_101', 'Retrying payment');

      expect(retried.status).toBe(PaymentStatus.PROCESSING);
      expect(retried.processedAt).toBeInstanceOf(Date);
      expect(retried.auditTrail).toHaveLength(3);
      expect(retried.auditTrail[2]?.actionType).toBe(PaymentActionType.RETRY_PAYMENT);
      expect(retried.auditTrail[2]?.metadata).toEqual({ retryAttempt: 1 });
    });
  });

  describe('Payment Status Transition Validation', () => {
    it('should reject processing from non-pending status', () => {
      const payment = Payment.create(validPaymentProps);
      const processed = payment.startProcessing('user_101');

      expect(() => processed.startProcessing('user_101')).toThrow(PaymentStatusError);
    });

    it('should reject completion from non-processing status', () => {
      const payment = Payment.create(validPaymentProps);

      expect(() => payment.complete('user_101', validGatewayResponse)).toThrow(PaymentStatusError);
    });

    it('should reject failure from non-processing status', () => {
      const payment = Payment.create(validPaymentProps);

      expect(() => payment.fail('user_101', failedGatewayResponse)).toThrow(PaymentStatusError);
    });

    it('should reject cancellation from completed status', () => {
      const payment = Payment.create(validPaymentProps);
      const processed = payment.startProcessing('user_101');
      const completed = processed.complete('user_101', validGatewayResponse);

      expect(() => completed.cancel('user_101')).toThrow(PaymentStatusError);
    });

    it('should reject retry from non-failed status', () => {
      const payment = Payment.create(validPaymentProps);

      expect(() => payment.retry('user_101')).toThrow(PaymentStatusError);
    });

    it('should reject retry when max attempts exceeded', () => {
      let payment = Payment.create(validPaymentProps);

      // First attempt
      payment = payment.startProcessing('user_101');
      payment = payment.fail('user_101', failedGatewayResponse);

      // Second attempt
      payment = payment.retry('user_101');
      payment = payment.fail('user_101', failedGatewayResponse);

      // Third attempt
      payment = payment.retry('user_101');
      payment = payment.fail('user_101', failedGatewayResponse);

      // Fourth attempt should fail
      expect(() => payment.retry('user_101')).toThrow(PaymentRetryLimitExceededError);
    });
  });

  describe('Refund Operations', () => {
    it('should create full refund successfully', () => {
      const payment = Payment.create(validPaymentProps);
      const processed = payment.startProcessing('user_101');
      const completed = processed.complete('user_101', validGatewayResponse);

      const refund = completed.createRefund(validPaymentProps.amount, 'user_101', 'Customer requested refund', {
        reason: 'defective_product',
      });

      expect(refund.transactionType).toBe(PaymentTransactionType.REFUND);
      expect(refund.amount).toEqual(validPaymentProps.amount);
      expect(refund.transactionReference).toContain('REFUND-');
      expect(refund.description).toContain('Refund for payment');
      expect(refund.metadata?.originalPaymentId).toBe(completed.id);
      expect(refund.metadata?.refundReason).toBe('Customer requested refund');
      expect(refund.auditTrail).toHaveLength(1);
      expect(refund.auditTrail[0]?.actionType).toBe(PaymentActionType.INITIATE_REFUND);
    });

    it('should create partial refund successfully', () => {
      const payment = Payment.create(validPaymentProps);
      const processed = payment.startProcessing('user_101');
      const completed = processed.complete('user_101', validGatewayResponse);

      const partialAmount = Money.fromDecimal(50.25, 'USD');
      const refund = completed.createRefund(partialAmount, 'user_101', 'Partial refund');

      expect(refund.transactionType).toBe(PaymentTransactionType.PARTIAL_REFUND);
      expect(refund.amount).toEqual(partialAmount);
    });

    it('should reject refund from non-completed status', () => {
      const payment = Payment.create(validPaymentProps);

      expect(() => payment.createRefund(validPaymentProps.amount, 'user_101')).toThrow(PaymentStatusError);
    });

    it('should reject refund exceeding payment amount', () => {
      const payment = Payment.create(validPaymentProps);
      const processed = payment.startProcessing('user_101');
      const completed = processed.complete('user_101', validGatewayResponse);

      const excessiveAmount = Money.fromDecimal(200, 'USD');

      expect(() => completed.createRefund(excessiveAmount, 'user_101')).toThrow(InvalidRefundAmountError);
    });

    it('should reject refund with different currency', () => {
      const payment = Payment.create(validPaymentProps);
      const processed = payment.startProcessing('user_101');
      const completed = processed.complete('user_101', validGatewayResponse);

      const differentCurrencyAmount = Money.fromDecimal(50, 'EUR');

      expect(() => completed.createRefund(differentCurrencyAmount, 'user_101')).toThrow(); // Should throw any error - CurrencyMismatchError or PaymentValidationError
    });
  });

  describe('Gateway Callback Handling', () => {
    it('should handle gateway callback successfully', () => {
      const payment = Payment.create(validPaymentProps);
      const callbackResponse: GatewayResponse = {
        success: true,
        transactionId: payment.transactionReference,
        gatewayTransactionId: 'callback_txn_789',
        message: 'Webhook received',
        processedAt: new Date(),
      };

      const updated = payment.handleGatewayCallback('system', callbackResponse, 'Webhook processed');

      expect(updated.gatewayTransactionId).toBe('callback_txn_789');
      expect(updated.updatedBy).toBe('system');
      expect(updated.updatedAt).toBeInstanceOf(Date);
      expect(updated.auditTrail).toHaveLength(1);
      expect(updated.auditTrail[0].actionType).toBe(PaymentActionType.GATEWAY_CALLBACK);
      expect(updated.auditTrail[0].gatewayResponse).toEqual(callbackResponse);
    });
  });

  describe('Payment Persistence', () => {
    it('should convert to persistence format correctly', () => {
      const payment = Payment.create(validPaymentProps);
      const persistence = payment.toPersistence();

      expect(persistence.id).toBe(payment.id);
      expect(persistence.orderId).toBe(payment.orderId);
      expect(persistence.amount).toBe(payment.amount.decimalAmount);
      expect(persistence.currency).toBe(payment.amount.currency);
      expect(persistence.status).toBe(payment.status);
      expect(persistence.transactionType).toBe(payment.transactionType);
      expect(persistence.auditTrail).toEqual(payment.auditTrail);
    });

    it('should create from persistence data correctly', () => {
      const payment = Payment.create(validPaymentProps);
      const persistence = payment.toPersistence();
      const restored = Payment.fromPersistence(persistence);

      expect(restored.id).toBe(payment.id);
      expect(restored.orderId).toBe(payment.orderId);
      expect(restored.amount.decimalAmount).toBe(payment.amount.decimalAmount);
      expect(restored.amount.currency).toBe(payment.amount.currency);
      expect(restored.status).toBe(payment.status);
      expect(restored.transactionType).toBe(payment.transactionType);
      expect(restored.auditTrail).toEqual(payment.auditTrail);
    });

    it('should handle empty audit trail in persistence', () => {
      const payment = Payment.create(validPaymentProps);
      const persistence = payment.toPersistence();
      persistence.auditTrail = null as any; // Simulate null from database

      const restored = Payment.fromPersistence(persistence);
      expect(restored.auditTrail).toEqual([]);
    });
  });

  describe('Payment Display Information', () => {
    it('should provide display information correctly', () => {
      const payment = Payment.create(validPaymentProps);
      const displayInfo = payment.getDisplayInfo();

      expect(displayInfo.id).toBe(payment.id);
      expect(displayInfo.orderNumber).toBe(payment.orderNumber);
      expect(displayInfo.customerName).toBe(payment.customerName);
      expect(displayInfo.amount).toBe(payment.amount.format());
      expect(displayInfo.paymentMethod).toBe(payment.paymentMethod);
      expect(displayInfo.gateway).toBe(payment.gateway);
      expect(displayInfo.status).toBe(payment.status);
      expect(displayInfo.transactionReference).toBe(payment.transactionReference);
      expect(displayInfo.initiatedAt).toBe(payment.initiatedAt.toISOString());
      expect(displayInfo.completedAt).toBeNull();
    });

    it('should include completion date when payment is completed', () => {
      const payment = Payment.create(validPaymentProps);
      const processed = payment.startProcessing('user_101');
      const completed = processed.complete('user_101', validGatewayResponse);
      const displayInfo = completed.getDisplayInfo();

      expect(displayInfo.completedAt).toBe(completed.completedAt!.toISOString());
    });
  });

  describe('Payment Business Logic', () => {
    it('should calculate retry backoff correctly', () => {
      const payment = Payment.create(validPaymentProps);
      const processed = payment.startProcessing('user_101');
      const failed = processed.fail('user_101', failedGatewayResponse);

      expect(failed.retryInfo?.nextRetryAt).toBeInstanceOf(Date);
      expect(failed.retryInfo?.nextRetryAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it('should track multiple retry attempts', () => {
      let payment = Payment.create(validPaymentProps);

      // First attempt and failure
      payment = payment.startProcessing('user_101');
      payment = payment.fail('user_101', failedGatewayResponse);
      expect(payment.retryInfo!.attemptNumber).toBe(1);

      // Second attempt and failure
      payment = payment.retry('user_101');
      payment = payment.fail('user_101', failedGatewayResponse);
      expect(payment.retryInfo!.attemptNumber).toBe(2);

      // Third attempt and failure
      payment = payment.retry('user_101');
      payment = payment.fail('user_101', failedGatewayResponse);
      expect(payment.retryInfo!.attemptNumber).toBe(3);
      expect(payment.canRetry()).toBe(false);
    });

    it('should maintain immutability through all operations', () => {
      const originalPayment = Payment.create(validPaymentProps);
      const processed = originalPayment.startProcessing('user_101');
      const completed = processed.complete('user_101', validGatewayResponse);

      // Original payment should remain unchanged
      expect(originalPayment.status).toBe(PaymentStatus.PENDING);
      expect(originalPayment.processedAt).toBeNull();
      expect(originalPayment.auditTrail).toHaveLength(0);

      // Processed payment should remain unchanged
      expect(processed.status).toBe(PaymentStatus.PROCESSING);
      expect(processed.completedAt).toBeNull();
      expect(processed.auditTrail).toHaveLength(1);

      // Only completed payment should have final state
      expect(completed.status).toBe(PaymentStatus.COMPLETED);
      expect(completed.completedAt).toBeInstanceOf(Date);
      expect(completed.auditTrail).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should throw PaymentDomainError for domain violations', () => {
      expect(() =>
        Payment.create({
          ...validPaymentProps,
          amount: Money.fromDecimal(-100, 'USD'),
        })
      ).toThrow(PaymentDomainError);
    });

    it('should provide error codes for different error types', () => {
      try {
        Payment.create({
          ...validPaymentProps,
          amount: Money.fromDecimal(0, 'USD'),
        });
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPaymentAmountError);
        expect((error as PaymentDomainError).code).toBe('PAYMENT_VALIDATION_ERROR');
      }
    });

    it('should provide detailed error messages', () => {
      try {
        Payment.create({
          ...validPaymentProps,
          transactionReference: '',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(PaymentValidationError);
        expect((error as Error).message).toContain('Transaction reference is required');
      }
    });
  });
});
