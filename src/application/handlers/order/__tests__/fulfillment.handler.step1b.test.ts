/**
 * Order Fulfillment Handlers Tests - Step 1B
 *
 * Comprehensive test suite for order fulfillment command handlers.
 * Tests handler business logic, error handling, validation, and integration
 * with domain entities and repositories.
 *
 * @domain Order Management - Fulfillment Workflow
 * @version 1.0.0 - Step 1B: Application Layer Enhancement
 */

import {
  StartPickingHandler,
  CompletePickingHandler,
  ShipOrderHandler,
  DeliverOrderHandler,
  MarkPartialFulfillmentHandler,
  RollbackFulfillmentHandler,
  type FulfillmentHandlerDependencies,
} from '../fulfillment.handler';
import {
  type StartPickingCommand,
  type CompletePickingCommand,
  type ShipOrderCommand,
  type DeliverOrderCommand,
  type MarkPartialFulfillmentCommand,
  type RollbackFulfillmentCommand,
} from '../../../commands/order';
import {
  Order,
  OrderStatus,
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  PaymentMethod,
  OrderItemStatus,
} from '../../../../domain/entities/order';
import { OrderRepository } from '../../../../domain/repositories/order.repository';
import { Money } from '../../../../domain/value-objects/money';

describe('Order Fulfillment Handlers - Step 1B', () => {
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let dependencies: FulfillmentHandlerDependencies;

  // Test order data
  const orderId = '12345678-1234-1234-1234-123456789abc';
  const userId = 'user-123';
  const agencyId = 'agency-456';
  const customerId = 'customer-789';

  beforeEach(() => {
    // Mock repository - create partial mock and cast to avoid type issues
    mockOrderRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByOrderNumber: jest.fn(),
      existsByOrderNumber: jest.fn(),
      deleteById: jest.fn(),
      search: jest.fn(),
      findByCustomerId: jest.fn(),
      findByWorkerId: jest.fn(),
      findByAreaId: jest.fn(),
      findPendingOrders: jest.fn(),
      findOverdueOrders: jest.fn(),
      findOrdersRequiringFulfillment: jest.fn(),
      getOrderStatistics: jest.fn(),
      getCustomerOrderSummaries: jest.fn(),
      getProductSalesSummaries: jest.fn(),
      getNextOrderNumber: jest.fn(),
      bulkUpdateStatus: jest.fn(),
      bulkUpdateFulfillmentStatus: jest.fn(),
      findOrdersContainingProduct: jest.fn(),
      findOrdersNeedingSync: jest.fn(),
      markOrdersAsSynced: jest.fn(),
    } as jest.Mocked<OrderRepository>;

    dependencies = {
      orderRepository: mockOrderRepository,
    };
  });

  // Helper function to create test order
  const createTestOrder = (
    status: OrderStatus = OrderStatus.CONFIRMED,
    fulfillmentStatus: OrderFulfillmentStatus = OrderFulfillmentStatus.PENDING
  ): Order => {
    // Use fromPersistence to create order with specific status
    return Order.fromPersistence({
      id: orderId,
      orderNumber: 'ORD-001',
      orderDate: new Date('2024-01-15'),
      deliveryDate: null,
      dueDate: null,
      customerId,
      customerCode: 'CUST-001',
      customerName: 'Test Customer',
      customerCreditLimit: 10000,
      customerBalance: 2000,
      areaId: null,
      areaCode: 'AREA-01',
      areaName: 'Test Area',
      workerId: null,
      workerName: 'Test Worker',
      subtotalAmount: 2400,
      discountPercentage: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 2400,
      paymentMethod: PaymentMethod.CREDIT,
      creditDays: 30,
      status,
      fulfillmentStatus,
      paymentStatus: OrderPaymentStatus.PENDING,
      customerNotes: null,
      internalNotes: null,
      syncSessionId: null,
      mobileDeviceId: null,
      createdOffline: false,
      agencyId,
      createdBy: userId,
      createdAt: new Date('2024-01-15T08:00:00Z'),
      updatedBy: null,
      updatedAt: null,
      syncedAt: null,
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          productCode: 'PROD-001',
          productName: 'Test Product',
          unitPrice: Money.fromDecimal(100, 'USD'),
          boxSize: 12,
          quantityBoxes: 2,
          quantityLoose: 0,
          totalUnits: 24,
          unitTotal: Money.fromDecimal(2400, 'USD'),
          discountPercentage: 0,
          discountAmount: Money.fromDecimal(0, 'USD'),
          taxRate: 0,
          taxAmount: Money.fromDecimal(0, 'USD'),
          itemTotal: Money.fromDecimal(2400, 'USD'),
          fulfilledBoxes: 0,
          fulfilledLoose: 0,
          fulfilledUnits: 0,
          status: OrderItemStatus.PENDING,
        },
      ],
      fulfillmentAuditTrail: [],
    });
  };

  describe('StartPickingHandler', () => {
    let handler: StartPickingHandler;

    beforeEach(() => {
      handler = new StartPickingHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should start picking for confirmed order', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.CONFIRMED, OrderFulfillmentStatus.PENDING);
        const command: StartPickingCommand = {
          orderId,
          userId,
          notes: 'Starting picking process',
          assignedWorker: 'John Doe',
        };

        mockOrderRepository.findById.mockResolvedValue(order);
        mockOrderRepository.save.mockImplementation(async (orderToSave) => orderToSave);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.orderId).toBe(orderId);
        expect(result.orderNumber).toBe('ORD-001');
        expect(result.previousStatus).toBe(OrderFulfillmentStatus.PENDING);
        expect(result.newStatus).toBe(OrderFulfillmentStatus.PICKING);
        expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
        expect(mockOrderRepository.save).toHaveBeenCalled();
      });

      it('should start picking without assigned worker', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.CONFIRMED, OrderFulfillmentStatus.PENDING);
        const command: StartPickingCommand = {
          orderId,
          userId,
        };

        mockOrderRepository.findById.mockResolvedValue(order);
        mockOrderRepository.save.mockImplementation(async (orderToSave) => orderToSave);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.newStatus).toBe(OrderFulfillmentStatus.PICKING);
      });
    });

    describe('Error Handling', () => {
      it('should handle order not found', async () => {
        // Arrange
        const command: StartPickingCommand = {
          orderId,
          userId,
        };

        mockOrderRepository.findById.mockResolvedValue(null);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Order not found');
      });

      it('should handle order that cannot start picking', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.PROCESSING, OrderFulfillmentStatus.SHIPPED);
        const command: StartPickingCommand = {
          orderId,
          userId,
        };

        mockOrderRepository.findById.mockResolvedValue(order);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('cannot start picking');
      });

      it('should handle invalid command', async () => {
        // Arrange
        const invalidCommand = { orderId: '', userId };

        // Act
        const result = await handler.execute(invalidCommand);

        // Assert
        expect(result.success).toBe(false);
        expect(result.validationErrors).toBeDefined();
      });

      it('should handle repository save error', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.CONFIRMED, OrderFulfillmentStatus.PENDING);
        const command: StartPickingCommand = {
          orderId,
          userId,
        };

        mockOrderRepository.findById.mockResolvedValue(order);
        mockOrderRepository.save.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Database error');
      });
    });
  });

  describe('CompletePickingHandler', () => {
    let handler: CompletePickingHandler;

    beforeEach(() => {
      handler = new CompletePickingHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should complete picking for picking order', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.PROCESSING, OrderFulfillmentStatus.PICKING);
        const command: CompletePickingCommand = {
          orderId,
          userId,
          notes: 'Picking completed successfully',
        };

        mockOrderRepository.findById.mockResolvedValue(order);
        mockOrderRepository.save.mockImplementation(async (orderToSave) => orderToSave);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.orderId).toBe(orderId);
        expect(result.previousStatus).toBe(OrderFulfillmentStatus.PICKING);
        expect(result.newStatus).toBe(OrderFulfillmentStatus.PACKED);
      });
    });

    describe('Error Handling', () => {
      it('should handle order not found', async () => {
        // Arrange
        const command: CompletePickingCommand = {
          orderId,
          userId,
        };

        mockOrderRepository.findById.mockResolvedValue(null);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Order not found');
      });
    });
  });

  describe('ShipOrderHandler', () => {
    let handler: ShipOrderHandler;

    beforeEach(() => {
      handler = new ShipOrderHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should ship order with tracking information', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.PROCESSING, OrderFulfillmentStatus.PACKED);
        const command: ShipOrderCommand = {
          orderId,
          userId,
          trackingNumber: 'TRK123456789',
          carrier: 'UPS',
          notes: 'Shipped via UPS',
        };

        mockOrderRepository.findById.mockResolvedValue(order);
        mockOrderRepository.save.mockImplementation(async (orderToSave) => orderToSave);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.orderId).toBe(orderId);
        expect(result.previousStatus).toBe(OrderFulfillmentStatus.PACKED);
        expect(result.newStatus).toBe(OrderFulfillmentStatus.SHIPPED);
      });

      it('should ship order without tracking information', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.PROCESSING, OrderFulfillmentStatus.PACKED);
        const command: ShipOrderCommand = {
          orderId,
          userId,
        };

        mockOrderRepository.findById.mockResolvedValue(order);
        mockOrderRepository.save.mockImplementation(async (orderToSave) => orderToSave);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.newStatus).toBe(OrderFulfillmentStatus.SHIPPED);
      });
    });

    describe('Error Handling', () => {
      it('should handle order that cannot be shipped', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.CONFIRMED, OrderFulfillmentStatus.PENDING);
        const command: ShipOrderCommand = {
          orderId,
          userId,
        };

        mockOrderRepository.findById.mockResolvedValue(order);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('cannot be shipped');
      });
    });
  });

  describe('DeliverOrderHandler', () => {
    let handler: DeliverOrderHandler;

    beforeEach(() => {
      handler = new DeliverOrderHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should deliver order with delivery details', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.SHIPPED, OrderFulfillmentStatus.SHIPPED);
        const command: DeliverOrderCommand = {
          orderId,
          userId,
          deliveredAt: new Date('2024-01-20T10:00:00Z'),
          recipientName: 'Jane Smith',
          notes: 'Delivered successfully',
        };

        mockOrderRepository.findById.mockResolvedValue(order);
        mockOrderRepository.save.mockImplementation(async (orderToSave) => orderToSave);

        // Act
        const result = await handler.execute(command);

        // Assert
        if (!result.success) {
          console.log('DeliverOrder failed:', result.error);
        }
        expect(result.success).toBe(true);
        expect(result.orderId).toBe(orderId);
        expect(result.previousStatus).toBe(OrderFulfillmentStatus.SHIPPED);
        expect(result.newStatus).toBe(OrderFulfillmentStatus.DELIVERED);
      });
    });

    describe('Error Handling', () => {
      it('should handle order that cannot be delivered', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.CONFIRMED, OrderFulfillmentStatus.PENDING);
        const command: DeliverOrderCommand = {
          orderId,
          userId,
        };

        mockOrderRepository.findById.mockResolvedValue(order);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('cannot be delivered');
      });
    });
  });

  describe('MarkPartialFulfillmentHandler', () => {
    let handler: MarkPartialFulfillmentHandler;

    beforeEach(() => {
      handler = new MarkPartialFulfillmentHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should mark partial fulfillment with affected items', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.PROCESSING, OrderFulfillmentStatus.PICKING);
        const command: MarkPartialFulfillmentCommand = {
          orderId,
          userId,
          reason: 'Stock shortage for some items',
          affectedItems: ['item-1', 'item-2'],
          notes: 'Partial fulfillment due to inventory issues',
        };

        mockOrderRepository.findById.mockResolvedValue(order);
        mockOrderRepository.save.mockImplementation(async (orderToSave) => orderToSave);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(true);
        expect(result.orderId).toBe(orderId);
        expect(result.previousStatus).toBe(OrderFulfillmentStatus.PICKING);
        expect(result.newStatus).toBe(OrderFulfillmentStatus.PARTIAL);
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid command with missing reason', async () => {
        // Arrange
        const invalidCommand = { orderId, userId, reason: '' };

        // Act
        const result = await handler.execute(invalidCommand);

        // Assert
        expect(result.success).toBe(false);
        expect(result.validationErrors).toBeDefined();
      });
    });
  });

  describe('RollbackFulfillmentHandler', () => {
    let handler: RollbackFulfillmentHandler;

    beforeEach(() => {
      handler = new RollbackFulfillmentHandler(dependencies);
    });

    describe('Successful Execution', () => {
      it('should rollback fulfillment to target status', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.PROCESSING, OrderFulfillmentStatus.SHIPPED);
        const command: RollbackFulfillmentCommand = {
          orderId,
          userId,
          targetStatus: OrderFulfillmentStatus.PACKED,
          reason: 'Shipping error - need to repack',
          notes: 'Rolling back due to shipping issues',
        };

        mockOrderRepository.findById.mockResolvedValue(order);
        mockOrderRepository.save.mockImplementation(async (orderToSave) => orderToSave);

        // Act
        const result = await handler.execute(command);

        // Assert
        if (!result.success) {
          console.log('RollbackFulfillment failed:', result.error);
        }
        expect(result.success).toBe(true);
        expect(result.orderId).toBe(orderId);
        expect(result.previousStatus).toBe(OrderFulfillmentStatus.SHIPPED);
        expect(result.newStatus).toBe(OrderFulfillmentStatus.PACKED);
      });
    });

    describe('Error Handling', () => {
      it('should handle order that cannot be rolled back', async () => {
        // Arrange
        const order = createTestOrder(OrderStatus.DELIVERED, OrderFulfillmentStatus.DELIVERED);
        const command: RollbackFulfillmentCommand = {
          orderId,
          userId,
          targetStatus: OrderFulfillmentStatus.PACKED,
          reason: 'Test rollback',
        };

        mockOrderRepository.findById.mockResolvedValue(order);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('cannot rollback fulfillment');
      });

      it('should handle invalid target status', async () => {
        // Arrange
        const invalidCommand = {
          orderId,
          userId,
          targetStatus: 'INVALID_STATUS',
          reason: 'Test rollback',
        };

        // Act
        const result = await handler.execute(invalidCommand);

        // Assert
        expect(result.success).toBe(false);
        expect(result.validationErrors).toBeDefined();
      });
    });
  });
});
