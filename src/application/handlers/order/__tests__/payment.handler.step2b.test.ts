/**
 * Payment Command Handlers Tests - Step 2B.2
 *
 * Comprehensive test suite for payment command handlers including:
 * - Handler execution and business logic validation
 * - Repository integration and error handling
 * - Command validation and domain entity integration
 * - Order status updates and payment workflow
 *
 * @domain Order Management - Payment Processing
 * @version 1.0.0 - Step 2B: Application Layer Implementation
 */

import {
  InitiatePaymentHandler,
  ProcessPaymentHandler,
  CompletePaymentHandler,
  FailPaymentHandler,
  CancelPaymentHandler,
  CreateRefundHandler,
  ProcessRefundHandler,
  RetryPaymentHandler,
  PaymentHandlerDependencies,
} from '../payment.handler';
import { OrderRepository } from '../../../../domain/repositories/order.repository';
import { PaymentRepository } from '../../../../domain/repositories/payment.repository';
import { PaymentGatewayService } from '../../../../domain/services/payment-gateway.service';
import { Payment, PaymentStatus, PaymentGateway } from '../../../../domain/entities/payment';
import { Order, OrderStatus, OrderPaymentStatus, PaymentMethod } from '../../../../domain/entities/order';
import { Money } from '../../../../domain/value-objects/money';

// ============================================================================
// Test Setup and Mocks
// ============================================================================

describe('Payment Command Handlers - Step 2B.2', () => {
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockPaymentRepository: jest.Mocked<PaymentRepository>;
  let mockPaymentGatewayService: jest.Mocked<PaymentGatewayService>;
  let dependencies: PaymentHandlerDependencies;

  // Test data
  const testOrderId = 'order-12345';
  const testPaymentId = 'payment-67890';
  const testUserId = 'user-123';
  const testCustomerId = 'customer-456';
  const testAgencyId = 'agency-789';

  beforeEach(() => {
    // Mock OrderRepository
    mockOrderRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByNumber: jest.fn(),
      findByCustomer: jest.fn(),
      findByAgency: jest.fn(),
      findByStatus: jest.fn(),
      findByDateRange: jest.fn(),
      search: jest.fn(),
      count: jest.fn(),
      exists: jest.fn(),
      bulkUpdate: jest.fn(),
      getOrderStatistics: jest.fn(),
      findRecentOrders: jest.fn(),
      findOverdueOrders: jest.fn(),
    } as jest.Mocked<OrderRepository>;

    // Mock PaymentRepository
    mockPaymentRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByOrderId: jest.fn(),
      findByCustomerId: jest.fn(),
      findByTransactionReference: jest.fn(),
      findByGatewayTransactionId: jest.fn(),
      findByDateRange: jest.fn(),
      findByStatus: jest.fn(),
      findByGateway: jest.fn(),
      findByPaymentMethod: jest.fn(),
      search: jest.fn(),
      count: jest.fn(),
      exists: jest.fn(),
      bulkUpdate: jest.fn(),
      bulkUpdateStatus: jest.fn(),
      getPaymentStatistics: jest.fn(),
      findFailedPayments: jest.fn(),
      findPendingPayments: jest.fn(),
      findRefundablePayments: jest.fn(),
      calculateTotalAmount: jest.fn(),
      findDuplicatePayments: jest.fn(),
      archiveOldPayments: jest.fn(),
    } as jest.Mocked<PaymentRepository>;

    // Mock PaymentGatewayService
    mockPaymentGatewayService = {
      processPayment: jest.fn(),
      capturePayment: jest.fn(),
      refundPayment: jest.fn(),
      cancelPayment: jest.fn(),
      getPaymentStatus: jest.fn(),
      validatePaymentMethod: jest.fn(),
      checkHealth: jest.fn(),
    } as jest.Mocked<PaymentGatewayService>;

    dependencies = {
      orderRepository: mockOrderRepository,
      paymentRepository: mockPaymentRepository,
      paymentGatewayService: mockPaymentGatewayService,
    };
  });

  // Helper function to create test order
  const createTestOrder = (overrides: Partial<any> = {}): Order => {
    return Order.fromPersistence({
      id: testOrderId,
      orderNumber: 'ORD-001',
      customerId: testCustomerId,
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '+1234567890',
      agencyId: testAgencyId,
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Test Product',
          sku: 'TEST-001',
          quantity: 2,
          unitPrice: { amount: 1000, currency: 'USD', decimalAmount: 10.0 },
          totalPrice: { amount: 2000, currency: 'USD', decimalAmount: 20.0 },
          taxRate: 0.1,
          taxAmount: { amount: 200, currency: 'USD', decimalAmount: 2.0 },
          discountPercentage: 0,
          discountAmount: { amount: 0, currency: 'USD', decimalAmount: 0 },
          status: 'PENDING',
          lotAllocations: [],
        },
      ],
      subtotal: { amount: 2000, currency: 'USD', decimalAmount: 20.0 },
      taxAmount: { amount: 200, currency: 'USD', decimalAmount: 2.0 },
      discountAmount: { amount: 0, currency: 'USD', decimalAmount: 0 },
      totalAmount: { amount: 2200, currency: 'USD', decimalAmount: 22.0 },
      paymentMethod: 'CREDIT_CARD',
      creditDays: 0,
      notes: 'Test order',
      status: OrderStatus.CONFIRMED,
      fulfillmentStatus: 'PENDING',
      paymentStatus: OrderPaymentStatus.PENDING,
      fulfillmentAuditTrail: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: testUserId,
      updatedBy: null,
      ...overrides,
    });
  };

  // Helper function to create test payment
  const createTestPayment = (overrides: Partial<any> = {}): Payment => {
    return Payment.fromPersistence({
      id: testPaymentId,
      orderId: testOrderId,
      orderNumber: 'ORD-001',
      customerId: testCustomerId,
      customerName: 'Test Customer',
      amount: { amount: 2200, currency: 'USD', decimalAmount: 22.0 },
      paymentMethod: PaymentMethod.CREDIT_CARD,
      gateway: PaymentGateway.STRIPE,
      transactionReference: 'txn-123',
      description: 'Payment for order ORD-001',
      status: PaymentStatus.PENDING,
      gatewayTransactionId: null,
      gatewayResponse: null,
      metadata: {},
      refunds: [],
      auditTrail: [],
      retryInfo: null,
      agencyId: testAgencyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      initiatedBy: testUserId,
      ...overrides,
    });
  };

  // ============================================================================
  // InitiatePaymentHandler Tests
  // ============================================================================

  describe('InitiatePaymentHandler', () => {
    let handler: InitiatePaymentHandler;

    beforeEach(() => {
      handler = new InitiatePaymentHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should initiate payment successfully', async () => {
        // Arrange
        const command = {
          orderId: testOrderId,
          orderNumber: 'ORD-001',
          customerId: testCustomerId,
          customerName: 'Test Customer',
          amount: 22.0,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          gateway: PaymentGateway.STRIPE,
          agencyId: testAgencyId,
          initiatedBy: testUserId,
        };

        const testOrder = createTestOrder();
        const testPayment = createTestPayment();

        mockOrderRepository.findById.mockResolvedValue(testOrder);
        mockPaymentRepository.save.mockResolvedValue(testPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.paymentId).toBe(testPaymentId);
        expect(result.transactionReference).toBe('txn-123');
        expect(mockOrderRepository.findById).toHaveBeenCalledWith(testOrderId);
        expect(mockPaymentRepository.save).toHaveBeenCalled();
      });

      it('should handle optional parameters correctly', async () => {
        // Arrange
        const command = {
          orderId: testOrderId,
          orderNumber: 'ORD-001',
          customerId: testCustomerId,
          customerName: 'Test Customer',
          amount: 22.0,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          gateway: PaymentGateway.STRIPE,
          description: 'Custom payment description',
          metadata: { source: 'web' },
          agencyId: testAgencyId,
          initiatedBy: testUserId,
        };

        const testOrder = createTestOrder();
        const testPayment = createTestPayment();

        mockOrderRepository.findById.mockResolvedValue(testOrder);
        mockPaymentRepository.save.mockResolvedValue(testPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(mockPaymentRepository.save).toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should handle order not found', async () => {
        // Arrange
        const command = {
          orderId: testOrderId,
          orderNumber: 'ORD-001',
          customerId: testCustomerId,
          customerName: 'Test Customer',
          amount: 22.0,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          gateway: PaymentGateway.STRIPE,
          agencyId: testAgencyId,
          initiatedBy: testUserId,
        };

        mockOrderRepository.findById.mockResolvedValue(null);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Order not found');
        expect(result.error).toContain(testOrderId);
      });

      it('should handle invalid order status', async () => {
        // Arrange
        const command = {
          orderId: testOrderId,
          orderNumber: 'ORD-001',
          customerId: testCustomerId,
          customerName: 'Test Customer',
          amount: 22.0,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          gateway: PaymentGateway.STRIPE,
          agencyId: testAgencyId,
          initiatedBy: testUserId,
        };

        const testOrder = createTestOrder({ status: OrderStatus.CANCELLED });
        mockOrderRepository.findById.mockResolvedValue(testOrder);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Order cannot accept payment in current status');
      });

      it('should handle repository errors', async () => {
        // Arrange
        const command = {
          orderId: testOrderId,
          orderNumber: 'ORD-001',
          customerId: testCustomerId,
          customerName: 'Test Customer',
          amount: 22.0,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          gateway: PaymentGateway.STRIPE,
          agencyId: testAgencyId,
          initiatedBy: testUserId,
        };

        mockOrderRepository.findById.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Failed to initiate payment');
        expect(result.error).toBe('Database error');
      });

      it('should handle invalid command', async () => {
        // Arrange
        const command = {
          orderId: testOrderId,
          // Missing required fields
        };

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Failed to initiate payment');
      });
    });
  });

  // ============================================================================
  // ProcessPaymentHandler Tests
  // ============================================================================

  describe('ProcessPaymentHandler', () => {
    let handler: ProcessPaymentHandler;

    beforeEach(() => {
      handler = new ProcessPaymentHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should process payment successfully', async () => {
        // Arrange
        const command = {
          paymentId: testPaymentId,
          processedBy: testUserId,
          gatewayTransactionId: 'gw-txn-123',
        };

        const testPayment = createTestPayment();
        const processedPayment = createTestPayment({
          status: PaymentStatus.PROCESSING,
          gatewayTransactionId: 'gw-txn-123',
        });

        // Mock the process method
        jest.spyOn(testPayment, 'process').mockReturnValue(processedPayment);
        jest.spyOn(testPayment, 'canProcess').mockReturnValue(true);

        mockPaymentRepository.findById.mockResolvedValue(testPayment);
        mockPaymentRepository.update.mockResolvedValue(processedPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.paymentId).toBe(testPaymentId);
        expect(mockPaymentRepository.findById).toHaveBeenCalledWith(testPaymentId);
        expect(mockPaymentRepository.update).toHaveBeenCalledWith(processedPayment);
      });
    });

    describe('Error Handling', () => {
      it('should handle payment not found', async () => {
        // Arrange
        const command = {
          paymentId: testPaymentId,
          processedBy: testUserId,
        };

        mockPaymentRepository.findById.mockResolvedValue(null);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Payment not found');
      });

      it('should handle payment cannot be processed', async () => {
        // Arrange
        const command = {
          paymentId: testPaymentId,
          processedBy: testUserId,
        };

        const testPayment = createTestPayment({ status: PaymentStatus.COMPLETED });
        jest.spyOn(testPayment, 'canProcess').mockReturnValue(false);

        mockPaymentRepository.findById.mockResolvedValue(testPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Payment cannot be processed');
      });
    });
  });

  // ============================================================================
  // CompletePaymentHandler Tests
  // ============================================================================

  describe('CompletePaymentHandler', () => {
    let handler: CompletePaymentHandler;

    beforeEach(() => {
      handler = new CompletePaymentHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should complete payment and update order status', async () => {
        // Arrange
        const gatewayResponse = {
          success: true,
          transactionId: 'txn-456',
          gatewayTransactionId: 'gw-txn-456',
          message: 'Payment completed',
          processedAt: new Date(),
        };

        const command = {
          paymentId: testPaymentId,
          gatewayResponse,
          completedBy: testUserId,
        };

        const testPayment = createTestPayment({ status: PaymentStatus.PROCESSING });
        const completedPayment = createTestPayment({
          status: PaymentStatus.COMPLETED,
          completedAt: new Date(),
        });
        const testOrder = createTestOrder();
        const updatedOrder = createTestOrder({ paymentStatus: OrderPaymentStatus.PAID });

        // Mock domain methods
        jest.spyOn(testPayment, 'complete').mockReturnValue(completedPayment);
        jest.spyOn(testOrder, 'updatePaymentStatus').mockReturnValue(updatedOrder);

        mockPaymentRepository.findById.mockResolvedValue(testPayment);
        mockPaymentRepository.update.mockResolvedValue(completedPayment);
        mockOrderRepository.findById.mockResolvedValue(testOrder);
        mockOrderRepository.update.mockResolvedValue(updatedOrder);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.paymentId).toBe(testPaymentId);
        expect(mockPaymentRepository.update).toHaveBeenCalledWith(completedPayment);
        expect(mockOrderRepository.update).toHaveBeenCalledWith(updatedOrder);
      });

      it('should complete payment without updating order if payment failed', async () => {
        // Arrange
        const gatewayResponse = {
          success: false,
          transactionId: 'txn-456',
          gatewayTransactionId: 'gw-txn-456',
          message: 'Payment failed',
          errorCode: 'INSUFFICIENT_FUNDS',
          processedAt: new Date(),
        };

        const command = {
          paymentId: testPaymentId,
          gatewayResponse,
          completedBy: testUserId,
        };

        const testPayment = createTestPayment({ status: PaymentStatus.PROCESSING });
        const failedPayment = createTestPayment({ status: PaymentStatus.FAILED });

        jest.spyOn(testPayment, 'complete').mockReturnValue(failedPayment);

        mockPaymentRepository.findById.mockResolvedValue(testPayment);
        mockPaymentRepository.update.mockResolvedValue(failedPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.paymentId).toBe(testPaymentId);
        expect(mockPaymentRepository.update).toHaveBeenCalledWith(failedPayment);
        expect(mockOrderRepository.findById).not.toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should handle payment not found', async () => {
        // Arrange
        const command = {
          paymentId: testPaymentId,
          gatewayResponse: {
            success: true,
            transactionId: 'txn-456',
            gatewayTransactionId: 'gw-txn-456',
            message: 'Payment completed',
            processedAt: new Date(),
          },
          completedBy: testUserId,
        };

        mockPaymentRepository.findById.mockResolvedValue(null);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Payment not found');
      });
    });
  });

  // ============================================================================
  // FailPaymentHandler Tests
  // ============================================================================

  describe('FailPaymentHandler', () => {
    let handler: FailPaymentHandler;

    beforeEach(() => {
      handler = new FailPaymentHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should fail payment successfully', async () => {
        // Arrange
        const gatewayResponse = {
          success: false,
          transactionId: 'txn-456',
          gatewayTransactionId: 'gw-txn-456',
          message: 'Payment failed',
          errorCode: 'CARD_DECLINED',
          processedAt: new Date(),
        };

        const command = {
          paymentId: testPaymentId,
          gatewayResponse,
          failedBy: testUserId,
        };

        const testPayment = createTestPayment({ status: PaymentStatus.PROCESSING });
        const failedPayment = createTestPayment({ status: PaymentStatus.FAILED });

        jest.spyOn(testPayment, 'fail').mockReturnValue(failedPayment);

        mockPaymentRepository.findById.mockResolvedValue(testPayment);
        mockPaymentRepository.update.mockResolvedValue(failedPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.paymentId).toBe(testPaymentId);
        expect(result.metadata?.errorCode).toBe('CARD_DECLINED');
        expect(mockPaymentRepository.update).toHaveBeenCalledWith(failedPayment);
      });
    });
  });

  // ============================================================================
  // CancelPaymentHandler Tests
  // ============================================================================

  describe('CancelPaymentHandler', () => {
    let handler: CancelPaymentHandler;

    beforeEach(() => {
      handler = new CancelPaymentHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should cancel payment successfully', async () => {
        // Arrange
        const command = {
          paymentId: testPaymentId,
          reason: 'Customer requested cancellation',
          cancelledBy: testUserId,
        };

        const testPayment = createTestPayment({ status: PaymentStatus.PENDING });
        const cancelledPayment = createTestPayment({ status: PaymentStatus.CANCELLED });

        jest.spyOn(testPayment, 'canCancel').mockReturnValue(true);
        jest.spyOn(testPayment, 'cancel').mockReturnValue(cancelledPayment);

        mockPaymentRepository.findById.mockResolvedValue(testPayment);
        mockPaymentRepository.update.mockResolvedValue(cancelledPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.paymentId).toBe(testPaymentId);
        expect(result.metadata?.cancellationReason).toBe('Customer requested cancellation');
      });
    });

    describe('Error Handling', () => {
      it('should handle payment cannot be cancelled', async () => {
        // Arrange
        const command = {
          paymentId: testPaymentId,
          reason: 'Customer requested cancellation',
          cancelledBy: testUserId,
        };

        const testPayment = createTestPayment({ status: PaymentStatus.COMPLETED });
        jest.spyOn(testPayment, 'canCancel').mockReturnValue(false);

        mockPaymentRepository.findById.mockResolvedValue(testPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Payment cannot be cancelled');
      });
    });
  });

  // ============================================================================
  // CreateRefundHandler Tests
  // ============================================================================

  describe('CreateRefundHandler', () => {
    let handler: CreateRefundHandler;

    beforeEach(() => {
      handler = new CreateRefundHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should create refund successfully', async () => {
        // Arrange
        const command = {
          paymentId: testPaymentId,
          amount: 10.0,
          reason: 'Partial refund requested',
          createdBy: testUserId,
        };

        const testPayment = createTestPayment({ status: PaymentStatus.COMPLETED });
        const refund = {
          id: 'refund-123',
          amount: Money.fromDecimal(10.0, 'USD'),
          status: 'PENDING',
        };
        const updatedPayment = createTestPayment({
          status: PaymentStatus.COMPLETED,
          refunds: [refund],
        });

        jest.spyOn(testPayment, 'canRefund').mockReturnValue(true);
        jest.spyOn(testPayment, 'createRefund').mockReturnValue({
          payment: updatedPayment,
          refund,
        });

        mockPaymentRepository.findById.mockResolvedValue(testPayment);
        mockPaymentRepository.update.mockResolvedValue(updatedPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.paymentId).toBe(testPaymentId);
        expect(result.refundId).toBe('refund-123');
        expect(result.metadata?.refundAmount).toBe('$10.00');
      });
    });

    describe('Error Handling', () => {
      it('should handle payment cannot be refunded', async () => {
        // Arrange
        const command = {
          paymentId: testPaymentId,
          amount: 10.0,
          reason: 'Partial refund requested',
          createdBy: testUserId,
        };

        const testPayment = createTestPayment({ status: PaymentStatus.PENDING });
        jest.spyOn(testPayment, 'canRefund').mockReturnValue(false);

        mockPaymentRepository.findById.mockResolvedValue(testPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Payment cannot be refunded');
      });
    });
  });

  // ============================================================================
  // ProcessRefundHandler Tests
  // ============================================================================

  describe('ProcessRefundHandler', () => {
    let handler: ProcessRefundHandler;

    beforeEach(() => {
      handler = new ProcessRefundHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should process refund successfully', async () => {
        // Arrange
        const gatewayResponse = {
          success: true,
          transactionId: 'refund-txn-123',
          gatewayTransactionId: 'gw-refund-123',
          message: 'Refund processed',
          processedAt: new Date(),
        };

        const command = {
          paymentId: testPaymentId,
          refundId: 'refund-123',
          gatewayResponse,
          processedBy: testUserId,
        };

        const testPayment = createTestPayment();
        const updatedPayment = createTestPayment();

        jest.spyOn(testPayment, 'processRefund').mockReturnValue(updatedPayment);

        mockPaymentRepository.findById.mockResolvedValue(testPayment);
        mockPaymentRepository.update.mockResolvedValue(updatedPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.paymentId).toBe(testPaymentId);
        expect(result.refundId).toBe('refund-123');
      });
    });
  });

  // ============================================================================
  // RetryPaymentHandler Tests
  // ============================================================================

  describe('RetryPaymentHandler', () => {
    let handler: RetryPaymentHandler;

    beforeEach(() => {
      handler = new RetryPaymentHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should retry payment successfully', async () => {
        // Arrange
        const command = {
          paymentId: testPaymentId,
          reason: 'Gateway timeout, retrying',
          retriedBy: testUserId,
          newGateway: PaymentGateway.PAYPAL,
        };

        const testPayment = createTestPayment({ status: PaymentStatus.FAILED });
        const retriedPayment = createTestPayment({
          status: PaymentStatus.PROCESSING,
          gateway: PaymentGateway.PAYPAL,
        });

        jest.spyOn(testPayment, 'canRetry').mockReturnValue(true);
        jest.spyOn(testPayment, 'retry').mockReturnValue(retriedPayment);

        mockPaymentRepository.findById.mockResolvedValue(testPayment);
        mockPaymentRepository.update.mockResolvedValue(retriedPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.paymentId).toBe(testPaymentId);
        expect(result.metadata?.newGateway).toBe(PaymentGateway.PAYPAL);
      });
    });

    describe('Error Handling', () => {
      it('should handle payment cannot be retried', async () => {
        // Arrange
        const command = {
          paymentId: testPaymentId,
          reason: 'Gateway timeout, retrying',
          retriedBy: testUserId,
        };

        const testPayment = createTestPayment({ status: PaymentStatus.COMPLETED });
        jest.spyOn(testPayment, 'canRetry').mockReturnValue(false);

        mockPaymentRepository.findById.mockResolvedValue(testPayment);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toBe('Payment cannot be retried');
      });
    });
  });
});
