/**
 * Payment Gateway Service Tests - Step 2C: Payment Infrastructure Layer
 *
 * Simple test suite for payment gateway service implementation.
 * Tests basic gateway operations and core functionality.
 *
 * @domain Order Management - Payment Processing
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { DatabaseConnection } from '../../database/connection';
import { PaymentGatewayServiceImpl, PaymentGatewayServiceError, GatewayErrorCode } from '../payment-gateway.service';
import { PaymentGateway, PaymentStatus } from '../../../domain/entities/payment';
import { PaymentMethod } from '../../../domain/entities/order';
import { Money } from '../../../domain/value-objects/money';

describe('PaymentGatewayService - Step 2C', () => {
  let connection: DatabaseConnection;
  let service: PaymentGatewayServiceImpl;

  beforeAll(async () => {
    // Create in-memory database for testing
    connection = DatabaseConnection.getInstance({
      filename: ':memory:',
      inMemory: true,
    });
    await connection.connect();

    // Create payment gateway service
    service = new PaymentGatewayServiceImpl(connection);
  });

  afterAll(async () => {
    await connection.close();
    DatabaseConnection.resetInstance();
  });

  describe('Constructor', () => {
    it('should create service with valid connection', () => {
      expect(service).toBeInstanceOf(PaymentGatewayServiceImpl);
    });

    it('should throw error with null connection', () => {
      expect(() => new PaymentGatewayServiceImpl(null as any)).toThrow(PaymentGatewayServiceError);
    });

    it('should throw error with invalid connection', () => {
      const invalidConnection = {
        getDatabase: () => null,
      } as any;

      expect(() => new PaymentGatewayServiceImpl(invalidConnection)).toThrow(PaymentGatewayServiceError);
    });
  });

  describe('Gateway Configuration', () => {
    it('should return mock configuration for any gateway', async () => {
      const config = await service.getConfig(PaymentGateway.INTERNAL_CASH);

      expect(config).toBeDefined();
      expect(config.gateway).toBe(PaymentGateway.INTERNAL_CASH);
      expect(config.enabled).toBe(true);
      expect(config.environment).toBe('sandbox');
      expect(config.supportedMethods).toBeDefined();
      expect(Array.isArray(config.supportedMethods)).toBe(true);
    });
  });

  describe('Gateway Capabilities', () => {
    it('should return capabilities for Stripe', async () => {
      const capabilities = await service.getCapabilities(PaymentGateway.STRIPE);

      expect(capabilities).toBeDefined();
      expect(capabilities.supportsVoid).toBe(true);
      expect(capabilities.supportsPartialRefund).toBe(true);
      expect(capabilities.supportsWebhooks).toBe(true);
      expect(capabilities.supports3DS).toBe(true);
      expect(capabilities.minAmount).toBeDefined();
      expect(capabilities.maxAmount).toBeDefined();
    });

    it('should return capabilities for internal cash gateway', async () => {
      const capabilities = await service.getCapabilities(PaymentGateway.INTERNAL_CASH);

      expect(capabilities).toBeDefined();
      expect(capabilities.supportsWebhooks).toBe(false);
      expect(capabilities.supports3DS).toBe(false);
      expect(capabilities.supportsTokenization).toBe(false);
    });
  });

  describe('Payment Request Validation', () => {
    it('should validate valid payment request', async () => {
      const request = {
        amount: Money.fromDecimal(100.0, 'USD'),
        paymentMethod: PaymentMethod.CREDIT,
        transactionReference: 'txn_123',
        orderId: 'order_123',
        orderNumber: 'ORD-001',
        customerId: 'customer_123',
        customerName: 'Test Customer',
      };

      const validation = await service.validatePaymentRequest(PaymentGateway.INTERNAL_CREDIT, request);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid payment request', async () => {
      const request = {
        amount: Money.fromDecimal(-10.0, 'USD'), // Invalid negative amount
        paymentMethod: PaymentMethod.CREDIT,
        transactionReference: '', // Empty transaction reference
        orderId: '', // Empty order ID
        orderNumber: 'ORD-001',
        customerId: '', // Empty customer ID
        customerName: 'Test Customer',
      };

      const validation = await service.validatePaymentRequest(PaymentGateway.INTERNAL_CREDIT, request);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Payment amount must be positive');
      expect(validation.errors).toContain('Transaction reference is required');
      expect(validation.errors).toContain('Order ID is required');
      expect(validation.errors).toContain('Customer ID is required');
    });
  });

  describe('Payment Processing', () => {
    it('should process internal cash payment successfully', async () => {
      const request = {
        amount: Money.fromDecimal(100.0, 'USD'),
        paymentMethod: PaymentMethod.CASH,
        transactionReference: 'txn_cash_123',
        orderId: 'order_123',
        orderNumber: 'ORD-001',
        customerId: 'customer_123',
        customerName: 'Test Customer',
      };

      const result = await service.processPayment(PaymentGateway.INTERNAL_CASH, request);

      expect(result.success).toBe(true);
      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.transactionId).toBe(request.transactionReference);
      expect(result.gatewayTransactionId).toBeDefined();
      expect(result.gatewayResponse).toBeDefined();
      expect(result.gatewayResponse.success).toBe(true);
    });

    it('should handle validation failure in payment processing', async () => {
      const request = {
        amount: Money.fromDecimal(-10.0, 'USD'), // Invalid amount
        paymentMethod: PaymentMethod.CREDIT,
        transactionReference: 'txn_invalid_123',
        orderId: 'order_123',
        orderNumber: 'ORD-001',
        customerId: 'customer_123',
        customerName: 'Test Customer',
      };

      const result = await service.processPayment(PaymentGateway.INTERNAL_CREDIT, request);

      expect(result.success).toBe(false);
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.errorCode).toBe(GatewayErrorCode.INVALID_PAYMENT_METHOD);
    });
  });

  describe('Gateway Health Check', () => {
    it('should return healthy status for any gateway', async () => {
      const health = await service.checkHealth(PaymentGateway.INTERNAL_CASH);

      expect(health).toBeDefined();
      expect(health.gateway).toBe(PaymentGateway.INTERNAL_CASH);
      expect(health.isHealthy).toBe(true);
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
      expect(health.uptime).toBe(100);
      expect(Array.isArray(health.supportedMethods)).toBe(true);
    });
  });

  describe('Fee Calculation', () => {
    it('should calculate no fees for internal gateways', async () => {
      const fees = await service.calculateFees(
        PaymentGateway.INTERNAL_CASH,
        Money.fromDecimal(100.0, 'USD'),
        PaymentMethod.CASH
      );

      expect(fees.gatewayFee.decimalAmount).toBe(0);
      expect(fees.processingFee.decimalAmount).toBe(0.3);
      expect(fees.feePercentage).toBe(0);
    });

    it('should calculate fees for external gateways', async () => {
      const fees = await service.calculateFees(
        PaymentGateway.STRIPE,
        Money.fromDecimal(100.0, 'USD'),
        PaymentMethod.CREDIT
      );

      expect(fees.gatewayFee.decimalAmount).toBeCloseTo(2.9, 1); // 2.9%
      expect(fees.processingFee.decimalAmount).toBe(0.3);
      expect(fees.totalFees.decimalAmount).toBeCloseTo(3.2, 1);
      expect(fees.feePercentage).toBeCloseTo(2.9, 1);
    });
  });

  describe('Error Handling', () => {
    it('should create PaymentGatewayServiceError correctly', () => {
      const error = new PaymentGatewayServiceError(
        'Test error',
        GatewayErrorCode.GATEWAY_UNAVAILABLE,
        PaymentGateway.STRIPE
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(GatewayErrorCode.GATEWAY_UNAVAILABLE);
      expect(error.gateway).toBe(PaymentGateway.STRIPE);
    });
  });
});
