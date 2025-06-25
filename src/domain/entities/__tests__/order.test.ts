/**
 * Order Entity Tests
 *
 * Comprehensive test suite for Order entity validation, business rules,
 * and domain operations. Ensures 90%+ test coverage following TDD principles
 * and strict adherence to domain-driven design patterns.
 *
 * @domain Order Management
 * @pattern Domain Entity Testing
 * @version 1.0.0
 */

import {
  Order,
  OrderProps,
  OrderStatus,
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  PaymentMethod,
  OrderItem,
  OrderItemStatus,
  OrderDomainError,
  OrderValidationError,
  InvalidOrderNumberError,
  OrderStatusError,
  InsufficientInventoryError,
  CreditLimitExceededError,
  EmptyOrderError,
} from '../order';
import { Money } from '../../value-objects/money';

describe('Order Entity', () => {
  // Test data following existing patterns
  const validOrderProps: OrderProps = {
    orderNumber: 'ORD-2024-001',
    orderDate: new Date('2024-01-15T10:00:00Z'),
    deliveryDate: new Date('2024-01-20T10:00:00Z'),
    dueDate: new Date('2024-02-14T23:59:59Z'),
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    customerCode: 'CUST001',
    customerName: 'John Doe',
    customerCreditLimit: Money.fromDecimal(10000, 'USD'),
    customerBalance: Money.fromDecimal(2500, 'USD'),
    areaId: '550e8400-e29b-41d4-a716-446655440001',
    areaCode: 'AREA001',
    areaName: 'Downtown District',
    workerId: '550e8400-e29b-41d4-a716-446655440002',
    workerName: 'Jane Smith',
    items: [
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        productId: '550e8400-e29b-41d4-a716-446655440004',
        productCode: 'PROD001',
        productName: 'Premium Product A',
        unitPrice: Money.fromDecimal(25.5, 'USD'),
        boxSize: 12,
        quantityBoxes: 2,
        quantityLoose: 5,
        totalUnits: 29,
        unitTotal: Money.fromDecimal(739.5, 'USD'),
        discountPercentage: 5,
        discountAmount: Money.fromDecimal(36.98, 'USD'),
        taxRate: 8.5,
        taxAmount: Money.fromDecimal(59.71, 'USD'),
        itemTotal: Money.fromDecimal(762.23, 'USD'),
        fulfilledBoxes: 0,
        fulfilledLoose: 0,
        fulfilledUnits: 0,
        status: OrderItemStatus.PENDING,
        notes: 'Handle with care',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        productId: '550e8400-e29b-41d4-a716-446655440006',
        productCode: 'PROD002',
        productName: 'Standard Product B',
        unitPrice: Money.fromDecimal(15.75, 'USD'),
        boxSize: 24,
        quantityBoxes: 1,
        quantityLoose: 0,
        totalUnits: 24,
        unitTotal: Money.fromDecimal(378.0, 'USD'),
        discountPercentage: 0,
        discountAmount: Money.fromDecimal(0, 'USD'),
        taxRate: 8.5,
        taxAmount: Money.fromDecimal(32.13, 'USD'),
        itemTotal: Money.fromDecimal(410.13, 'USD'),
        fulfilledBoxes: 0,
        fulfilledLoose: 0,
        fulfilledUnits: 0,
        status: OrderItemStatus.PENDING,
      },
    ],
    discountPercentage: 0,
    paymentMethod: PaymentMethod.CREDIT,
    creditDays: 30,
    customerNotes: 'Please deliver in the morning',
    internalNotes: 'Priority customer',
    syncSessionId: '550e8400-e29b-41d4-a716-446655440007',
    mobileDeviceId: 'DEVICE001',
    createdOffline: false,
    agencyId: '550e8400-e29b-41d4-a716-446655440008',
    createdBy: '550e8400-e29b-41d4-a716-446655440009',
  };

  describe('Order Creation', () => {
    it('should create a valid order with all required properties', () => {
      const order = Order.create(validOrderProps);

      expect(order).toBeInstanceOf(Order);
      expect(order.id).toBeDefined();
      expect(order.orderNumber).toBe(validOrderProps.orderNumber);
      expect(order.orderDate).toEqual(validOrderProps.orderDate);
      expect(order.deliveryDate).toEqual(validOrderProps.deliveryDate);
      expect(order.dueDate).toEqual(validOrderProps.dueDate);
      expect(order.customerId).toBe(validOrderProps.customerId);
      expect(order.customerCode).toBe(validOrderProps.customerCode);
      expect(order.customerName).toBe(validOrderProps.customerName);
      expect(order.customerCreditLimit.equals(validOrderProps.customerCreditLimit)).toBe(true);
      expect(order.customerBalance.equals(validOrderProps.customerBalance)).toBe(true);
      expect(order.areaId).toBe(validOrderProps.areaId);
      expect(order.areaCode).toBe(validOrderProps.areaCode);
      expect(order.areaName).toBe(validOrderProps.areaName);
      expect(order.workerId).toBe(validOrderProps.workerId);
      expect(order.workerName).toBe(validOrderProps.workerName);
      expect(order.items).toHaveLength(2);
      expect(order.discountPercentage).toBe(validOrderProps.discountPercentage);
      expect(order.paymentMethod).toBe(validOrderProps.paymentMethod);
      expect(order.creditDays).toBe(validOrderProps.creditDays);
      expect(order.customerNotes).toBe(validOrderProps.customerNotes);
      expect(order.internalNotes).toBe(validOrderProps.internalNotes);
      expect(order.agencyId).toBe(validOrderProps.agencyId);
      expect(order.createdBy).toBe(validOrderProps.createdBy);
      expect(order.createdAt).toBeInstanceOf(Date);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.fulfillmentStatus).toBe(OrderFulfillmentStatus.PENDING);
      expect(order.paymentStatus).toBe(OrderPaymentStatus.PENDING);
    });

    it('should create order with minimal required properties', () => {
      const minimalProps: OrderProps = {
        orderNumber: 'ORD-MIN-001',
        orderDate: new Date('2024-01-15T10:00:00Z'),
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        customerCode: 'CUST001',
        customerName: 'John Doe',
        customerCreditLimit: Money.fromDecimal(5000, 'USD'),
        customerBalance: Money.fromDecimal(0, 'USD'),
        areaCode: 'AREA001',
        areaName: 'Downtown District',
        workerName: 'Jane Smith',
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            productId: '550e8400-e29b-41d4-a716-446655440004',
            productCode: 'PROD001',
            productName: 'Test Product',
            unitPrice: Money.fromDecimal(10.0, 'USD'),
            boxSize: 1,
            quantityBoxes: 1,
            quantityLoose: 0,
            totalUnits: 1,
            unitTotal: Money.fromDecimal(10.0, 'USD'),
            discountPercentage: 0,
            discountAmount: Money.fromDecimal(0, 'USD'),
            taxRate: 0,
            taxAmount: Money.fromDecimal(0, 'USD'),
            itemTotal: Money.fromDecimal(10.0, 'USD'),
            fulfilledBoxes: 0,
            fulfilledLoose: 0,
            fulfilledUnits: 0,
            status: OrderItemStatus.PENDING,
          },
        ],
        discountPercentage: 0,
        paymentMethod: PaymentMethod.CASH,
        creditDays: 0,
        createdOffline: false,
        agencyId: '550e8400-e29b-41d4-a716-446655440008',
        createdBy: '550e8400-e29b-41d4-a716-446655440009',
      };

      const order = Order.create(minimalProps);

      expect(order).toBeInstanceOf(Order);
      expect(order.orderNumber).toBe(minimalProps.orderNumber);
      expect(order.deliveryDate).toBeNull();
      expect(order.dueDate).toBeNull();
      expect(order.areaId).toBeNull();
      expect(order.workerId).toBeNull();
      expect(order.customerNotes).toBeNull();
      expect(order.internalNotes).toBeNull();
      expect(order.syncSessionId).toBeNull();
      expect(order.mobileDeviceId).toBeNull();
    });

    it('should generate unique IDs for different orders', () => {
      const order1 = Order.create(validOrderProps);
      const order2 = Order.create({
        ...validOrderProps,
        orderNumber: 'ORD-2024-002',
      });

      expect(order1.id).not.toBe(order2.id);
      expect(order1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(order2.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should calculate order totals correctly during creation', () => {
      const order = Order.create(validOrderProps);

      // Expected calculations based on test data:
      // Item 1: (25.50 * 29) - 36.98 + 59.71 = 762.23
      // Item 2: (15.75 * 24) - 0 + 32.13 = 410.13
      // Subtotal: 739.50 + 378.00 = 1117.50
      // Discount: 36.98 + 0 = 36.98
      // Tax: 59.71 + 32.13 = 91.84
      // Total: 762.23 + 410.13 = 1172.36

      expect(order.subtotalAmount.decimalAmount).toBeCloseTo(1117.5, 2);
      expect(order.discountAmount.decimalAmount).toBeCloseTo(36.98, 2);
      expect(order.taxAmount.decimalAmount).toBeCloseTo(91.84, 2);
      expect(order.totalAmount.decimalAmount).toBeCloseTo(1172.36, 2);
      expect(order.getTotalQuantity()).toBe(53); // 29 + 24
    });
  });

  describe('Order Number Validation', () => {
    it('should accept valid order number formats', () => {
      const validOrderNumbers = ['ORD-2024-001', 'ORDER-001', 'O123456', 'ORD_2024_001', 'CUSTOM-ORDER-123', 'A1B2C3'];

      validOrderNumbers.forEach((orderNumber) => {
        const props = { ...validOrderProps, orderNumber };
        expect(() => Order.create(props)).not.toThrow();
      });
    });

    it('should reject invalid order number formats', () => {
      const invalidOrderNumbers = [
        '', // Empty
        'ord-2024-001', // Lowercase
        'ORD 2024 001', // Spaces
        'ORD@2024#001', // Special characters
        'O', // Too short
        'A'.repeat(101), // Too long
        'ORD-2024-001-', // Trailing hyphen
        '-ORD-2024-001', // Leading hyphen
      ];

      invalidOrderNumbers.forEach((orderNumber) => {
        const props = { ...validOrderProps, orderNumber };
        expect(() => Order.create(props)).toThrow(InvalidOrderNumberError);
      });
    });
  });

  describe('Customer Information Validation', () => {
    it('should validate customer ID format', () => {
      const validCustomerIds = ['550e8400-e29b-41d4-a716-446655440000', 'CUST123', 'customer-001'];

      validCustomerIds.forEach((customerId) => {
        const props = { ...validOrderProps, customerId };
        expect(() => Order.create(props)).not.toThrow();
      });
    });

    it('should reject empty customer information', () => {
      const invalidCustomerData = [{ customerId: '' }, { customerCode: '' }, { customerName: '' }];

      invalidCustomerData.forEach((invalidData) => {
        const props = { ...validOrderProps, ...invalidData };
        expect(() => Order.create(props)).toThrow(OrderValidationError);
      });
    });

    it('should validate customer credit information', () => {
      const props = {
        ...validOrderProps,
        customerCreditLimit: Money.fromDecimal(-1000, 'USD'),
      };

      expect(() => Order.create(props)).toThrow(OrderValidationError);
    });
  });

  describe('Order Items Validation', () => {
    it('should reject orders with no items', () => {
      const props = { ...validOrderProps, items: [] };

      expect(() => Order.create(props)).toThrow(EmptyOrderError);
    });

    it('should validate item quantities', () => {
      const invalidItem = {
        ...validOrderProps.items[0],
        quantityBoxes: -1,
      };

      const props = {
        ...validOrderProps,
        items: [invalidItem],
      };

      expect(() => Order.create(props)).toThrow(OrderValidationError);
    });

    it('should validate item pricing', () => {
      const invalidItem = {
        ...validOrderProps.items[0],
        unitPrice: Money.fromDecimal(-10, 'USD'),
      };

      const props = {
        ...validOrderProps,
        items: [invalidItem],
      };

      expect(() => Order.create(props)).toThrow(OrderValidationError);
    });

    it('should validate tax rates', () => {
      const invalidItem = {
        ...validOrderProps.items[0],
        taxRate: -5,
      };

      const props = {
        ...validOrderProps,
        items: [invalidItem],
      };

      expect(() => Order.create(props)).toThrow(OrderValidationError);
    });

    it('should validate discount percentages', () => {
      const invalidItem = {
        ...validOrderProps.items[0],
        discountPercentage: 150, // Over 100%
      };

      const props = {
        ...validOrderProps,
        items: [invalidItem],
      };

      expect(() => Order.create(props)).toThrow(OrderValidationError);
    });
  });

  describe('Financial Calculations', () => {
    it('should calculate subtotal correctly', () => {
      const order = Order.create(validOrderProps);

      // Subtotal = sum of unitTotal for all items
      const expectedSubtotal = validOrderProps.items.reduce((sum, item) => sum + item.unitTotal.decimalAmount, 0);

      expect(order.subtotalAmount.decimalAmount).toBeCloseTo(expectedSubtotal, 2);
    });

    it('should calculate discount correctly', () => {
      const order = Order.create(validOrderProps);

      // Discount = sum of discountAmount for all items
      const expectedDiscount = validOrderProps.items.reduce((sum, item) => sum + item.discountAmount.decimalAmount, 0);

      expect(order.discountAmount.decimalAmount).toBeCloseTo(expectedDiscount, 2);
    });

    it('should calculate tax correctly', () => {
      const order = Order.create(validOrderProps);

      // Tax = sum of taxAmount for all items
      const expectedTax = validOrderProps.items.reduce((sum, item) => sum + item.taxAmount.decimalAmount, 0);

      expect(order.taxAmount.decimalAmount).toBeCloseTo(expectedTax, 2);
    });

    it('should calculate total correctly', () => {
      const order = Order.create(validOrderProps);

      // Total = sum of itemTotal for all items
      const expectedTotal = validOrderProps.items.reduce((sum, item) => sum + item.itemTotal.decimalAmount, 0);

      expect(order.totalAmount.decimalAmount).toBeCloseTo(expectedTotal, 2);
    });

    it('should handle zero amounts correctly', () => {
      const zeroAmountProps: OrderProps = {
        ...validOrderProps,
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            productId: '550e8400-e29b-41d4-a716-446655440004',
            productCode: 'FREE-SAMPLE',
            productName: 'Free Sample',
            unitPrice: Money.fromDecimal(0, 'USD'),
            boxSize: 1,
            quantityBoxes: 1,
            quantityLoose: 0,
            totalUnits: 1,
            unitTotal: Money.fromDecimal(0, 'USD'),
            discountPercentage: 0,
            discountAmount: Money.fromDecimal(0, 'USD'),
            taxRate: 0,
            taxAmount: Money.fromDecimal(0, 'USD'),
            itemTotal: Money.fromDecimal(0, 'USD'),
            fulfilledBoxes: 0,
            fulfilledLoose: 0,
            fulfilledUnits: 0,
            status: OrderItemStatus.PENDING,
          },
        ],
      };

      const order = Order.create(zeroAmountProps);

      expect(order.subtotalAmount.isZero()).toBe(true);
      expect(order.discountAmount.isZero()).toBe(true);
      expect(order.taxAmount.isZero()).toBe(true);
      expect(order.totalAmount.isZero()).toBe(true);
    });
  });

  describe('Business Rules and Status Management', () => {
    it('should initialize with correct default statuses', () => {
      const order = Order.create(validOrderProps);

      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.fulfillmentStatus).toBe(OrderFulfillmentStatus.PENDING);
      expect(order.paymentStatus).toBe(OrderPaymentStatus.PENDING);
    });

    it('should allow modification when status is PENDING', () => {
      const order = Order.create(validOrderProps);

      expect(order.canModify()).toBe(true);
    });

    it('should prevent modification when status is CONFIRMED or higher', () => {
      const order = Order.create(validOrderProps);
      const confirmedOrder = order.confirm('user123');

      expect(confirmedOrder.canModify()).toBe(false);
    });

    it('should allow cancellation when status is PENDING or CONFIRMED', () => {
      const order = Order.create(validOrderProps);

      expect(order.canCancel()).toBe(true);

      const confirmedOrder = order.confirm('user123');
      expect(confirmedOrder.canCancel()).toBe(true);
    });

    it('should prevent cancellation when status is SHIPPED or higher', () => {
      const order = Order.create(validOrderProps);
      const confirmedOrder = order.confirm('user123');
      const shippedOrder = confirmedOrder.updateFulfillmentStatus(OrderFulfillmentStatus.SHIPPED, 'user123');

      expect(shippedOrder.canCancel()).toBe(false);
    });

    it('should allow confirmation when status is PENDING', () => {
      const order = Order.create(validOrderProps);

      expect(order.canConfirm()).toBe(true);
    });

    it('should prevent confirmation when status is not PENDING', () => {
      const order = Order.create(validOrderProps);
      const confirmedOrder = order.confirm('user123');

      expect(confirmedOrder.canConfirm()).toBe(false);
    });
  });

  describe('Credit Limit Validation', () => {
    it('should detect when order would exceed credit limit', () => {
      // Create order with total that exceeds available credit
      const highValueProps: OrderProps = {
        ...validOrderProps,
        customerCreditLimit: Money.fromDecimal(1000, 'USD'),
        customerBalance: Money.fromDecimal(500, 'USD'),
        // Order total is ~1172.36, available credit is 500
      };

      const order = Order.create(highValueProps);

      expect(order.wouldExceedCreditLimit()).toBe(true);
    });

    it('should allow orders within credit limit', () => {
      const order = Order.create(validOrderProps);

      // Credit limit: 10000, Balance: 2500, Available: 7500
      // Order total: ~1172.36, should be within limit
      expect(order.wouldExceedCreditLimit()).toBe(false);
    });

    it('should handle zero credit limit correctly', () => {
      const zeroCreditProps: OrderProps = {
        ...validOrderProps,
        customerCreditLimit: Money.fromDecimal(0, 'USD'),
        customerBalance: Money.fromDecimal(0, 'USD'),
      };

      const order = Order.create(zeroCreditProps);

      expect(order.wouldExceedCreditLimit()).toBe(true);
    });
  });

  describe('Order Operations', () => {
    it('should confirm order successfully', () => {
      const order = Order.create(validOrderProps);
      const confirmedOrder = order.confirm('user123');

      expect(confirmedOrder.status).toBe(OrderStatus.CONFIRMED);
      expect(confirmedOrder.updatedBy).toBe('user123');
      expect(confirmedOrder.updatedAt).toBeInstanceOf(Date);
      expect(confirmedOrder.id).toBe(order.id); // Same order entity
    });

    it('should throw error when confirming non-pending order', () => {
      const order = Order.create(validOrderProps);
      const confirmedOrder = order.confirm('user123');

      expect(() => confirmedOrder.confirm('user456')).toThrow(OrderStatusError);
    });

    it('should cancel order successfully', () => {
      const order = Order.create(validOrderProps);
      const cancelledOrder = order.cancel('user123', 'Customer request');

      expect(cancelledOrder.status).toBe(OrderStatus.CANCELLED);
      expect(cancelledOrder.updatedBy).toBe('user123');
      expect(cancelledOrder.updatedAt).toBeInstanceOf(Date);
    });

    it('should update fulfillment status successfully', () => {
      const order = Order.create(validOrderProps);
      const confirmedOrder = order.confirm('user123');
      const shippedOrder = confirmedOrder.updateFulfillmentStatus(OrderFulfillmentStatus.SHIPPED, 'user456');

      expect(shippedOrder.fulfillmentStatus).toBe(OrderFulfillmentStatus.SHIPPED);
      expect(shippedOrder.updatedBy).toBe('user456');
      expect(shippedOrder.updatedAt).toBeInstanceOf(Date);
    });

    it('should update payment status successfully', () => {
      const order = Order.create(validOrderProps);
      const paidOrder = order.updatePaymentStatus(OrderPaymentStatus.PAID, 'user123');

      expect(paidOrder.paymentStatus).toBe(OrderPaymentStatus.PAID);
      expect(paidOrder.updatedBy).toBe('user123');
      expect(paidOrder.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Utility Methods', () => {
    it('should find item by product ID', () => {
      const order = Order.create(validOrderProps);
      const productId = validOrderProps.items[0].productId;

      const foundItem = order.getItemByProductId(productId);

      expect(foundItem).toBeDefined();
      expect(foundItem?.productId).toBe(productId);
      expect(foundItem?.productCode).toBe(validOrderProps.items[0].productCode);
    });

    it('should return null for non-existent product ID', () => {
      const order = Order.create(validOrderProps);

      const foundItem = order.getItemByProductId('non-existent-id');

      expect(foundItem).toBeNull();
    });

    it('should calculate total quantity correctly', () => {
      const order = Order.create(validOrderProps);

      const expectedQuantity = validOrderProps.items.reduce((sum, item) => sum + item.totalUnits, 0);

      expect(order.getTotalQuantity()).toBe(expectedQuantity);
    });
  });

  describe('Persistence and Reconstruction', () => {
    it('should convert to persistence format correctly', () => {
      const order = Order.create(validOrderProps);
      const persistence = order.toPersistence();

      expect(persistence.id).toBe(order.id);
      expect(persistence.orderNumber).toBe(order.orderNumber);
      expect(persistence.orderDate).toEqual(order.orderDate);
      expect(persistence.customerId).toBe(order.customerId);
      expect(persistence.customerCode).toBe(order.customerCode);
      expect(persistence.customerName).toBe(order.customerName);
      expect(persistence.customerCreditLimit).toBe(order.customerCreditLimit.decimalAmount);
      expect(persistence.customerBalance).toBe(order.customerBalance.decimalAmount);
      expect(persistence.subtotalAmount).toBe(order.subtotalAmount.decimalAmount);
      expect(persistence.discountAmount).toBe(order.discountAmount.decimalAmount);
      expect(persistence.taxAmount).toBe(order.taxAmount.decimalAmount);
      expect(persistence.totalAmount).toBe(order.totalAmount.decimalAmount);
      expect(persistence.status).toBe(order.status);
      expect(persistence.fulfillmentStatus).toBe(order.fulfillmentStatus);
      expect(persistence.paymentStatus).toBe(order.paymentStatus);
      expect(persistence.agencyId).toBe(order.agencyId);
      expect(persistence.createdBy).toBe(order.createdBy);
      expect(persistence.createdAt).toEqual(order.createdAt);
      expect(persistence.items).toEqual(order.items);
    });

    it('should reconstruct from persistence format correctly', () => {
      const originalOrder = Order.create(validOrderProps);
      const persistence = originalOrder.toPersistence();
      const reconstructedOrder = Order.fromPersistence(persistence);

      expect(reconstructedOrder.id).toBe(originalOrder.id);
      expect(reconstructedOrder.orderNumber).toBe(originalOrder.orderNumber);
      expect(reconstructedOrder.orderDate).toEqual(originalOrder.orderDate);
      expect(reconstructedOrder.customerId).toBe(originalOrder.customerId);
      expect(reconstructedOrder.customerCode).toBe(originalOrder.customerCode);
      expect(reconstructedOrder.customerName).toBe(originalOrder.customerName);
      expect(reconstructedOrder.customerCreditLimit.equals(originalOrder.customerCreditLimit)).toBe(true);
      expect(reconstructedOrder.customerBalance.equals(originalOrder.customerBalance)).toBe(true);
      expect(reconstructedOrder.subtotalAmount.equals(originalOrder.subtotalAmount)).toBe(true);
      expect(reconstructedOrder.totalAmount.equals(originalOrder.totalAmount)).toBe(true);
      expect(reconstructedOrder.status).toBe(originalOrder.status);
      expect(reconstructedOrder.fulfillmentStatus).toBe(originalOrder.fulfillmentStatus);
      expect(reconstructedOrder.paymentStatus).toBe(originalOrder.paymentStatus);
      expect(reconstructedOrder.items).toEqual(originalOrder.items);
    });
  });

  describe('Display Information', () => {
    it('should provide correct display information', () => {
      const order = Order.create(validOrderProps);
      const displayInfo = order.getDisplayInfo();

      expect(displayInfo.orderNumber).toBe(order.orderNumber);
      expect(displayInfo.customerName).toBe(order.customerName);
      expect(displayInfo.totalAmount).toBe(order.totalAmount.decimalAmount);
      expect(displayInfo.status).toBe(order.status);
      expect(displayInfo.fulfillmentStatus).toBe(order.fulfillmentStatus);
      expect(displayInfo.paymentStatus).toBe(order.paymentStatus);
      expect(displayInfo.itemCount).toBe(order.items.length);
      expect(displayInfo.totalQuantity).toBe(order.getTotalQuantity());
    });
  });

  describe('Date Validation', () => {
    it('should validate that delivery date is after order date', () => {
      const invalidProps: OrderProps = {
        ...validOrderProps,
        orderDate: new Date('2024-01-20T10:00:00Z'),
        deliveryDate: new Date('2024-01-15T10:00:00Z'), // Before order date
      };

      expect(() => Order.create(invalidProps)).toThrow(OrderValidationError);
    });

    it('should validate that due date is after order date', () => {
      const invalidProps: OrderProps = {
        ...validOrderProps,
        orderDate: new Date('2024-02-15T10:00:00Z'),
        dueDate: new Date('2024-01-15T10:00:00Z'), // Before order date
      };

      expect(() => Order.create(invalidProps)).toThrow(OrderValidationError);
    });

    it('should allow null delivery and due dates', () => {
      const propsWithNullDates: OrderProps = {
        ...validOrderProps,
        deliveryDate: undefined,
        dueDate: undefined,
      };

      expect(() => Order.create(propsWithNullDates)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw OrderValidationError for validation failures', () => {
      const invalidProps = { ...validOrderProps, orderNumber: '' };

      expect(() => Order.create(invalidProps)).toThrow(OrderValidationError);
      expect(() => Order.create(invalidProps)).toThrow(OrderDomainError);
    });

    it('should throw InvalidOrderNumberError for invalid order numbers', () => {
      const invalidProps = { ...validOrderProps, orderNumber: 'ord-invalid' };

      expect(() => Order.create(invalidProps)).toThrow(InvalidOrderNumberError);
      expect(() => Order.create(invalidProps)).toThrow(OrderValidationError);
    });

    it('should throw EmptyOrderError for orders with no items', () => {
      const invalidProps = { ...validOrderProps, items: [] };

      expect(() => Order.create(invalidProps)).toThrow(EmptyOrderError);
      expect(() => Order.create(invalidProps)).toThrow(OrderValidationError);
    });

    it('should throw OrderStatusError for invalid status transitions', () => {
      const order = Order.create(validOrderProps);
      const confirmedOrder = order.confirm('user123');

      expect(() => confirmedOrder.confirm('user456')).toThrow(OrderStatusError);
      expect(() => confirmedOrder.confirm('user456')).toThrow(OrderDomainError);
    });
  });

  describe('Immutability', () => {
    it('should return new instances for state changes', () => {
      const order = Order.create(validOrderProps);
      const confirmedOrder = order.confirm('user123');

      expect(confirmedOrder).not.toBe(order);
      expect(confirmedOrder.id).toBe(order.id);
      expect(confirmedOrder.status).not.toBe(order.status);
    });

    it('should not mutate original order when updating', () => {
      const order = Order.create(validOrderProps);
      const originalStatus = order.status;

      order.confirm('user123');

      expect(order.status).toBe(originalStatus);
      expect(order.updatedBy).toBeNull();
      expect(order.updatedAt).toBeNull();
    });

    it('should freeze order instances', () => {
      const order = Order.create(validOrderProps);

      expect(Object.isFrozen(order)).toBe(true);
    });
  });
});
