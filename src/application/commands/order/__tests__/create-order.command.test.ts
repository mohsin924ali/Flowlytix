/**
 * Create Order Command Tests
 *
 * Comprehensive test suite for order creation command validation,
 * business rules enforcement, and domain object creation.
 * Ensures 90%+ test coverage following TDD principles.
 *
 * @domain Order Management
 * @pattern CQRS Command Testing
 * @version 1.0.0
 */

import {
  CreateOrderCommand,
  CreateOrderCommandSchema,
  CreateOrderCommandValidationError,
  validateCreateOrderCommand,
  validateOrderBusinessRules,
  calculateOrderItemTotals,
  calculateOrderTotals,
} from '../create-order.command';
import { PaymentMethod } from '../../../../domain/entities/order';
import { Money } from '../../../../domain/value-objects/money';

describe('CreateOrderCommand', () => {
  const validCommand: CreateOrderCommand = {
    orderNumber: 'ORD-2024-001',
    orderDate: new Date('2024-01-15T10:00:00Z'),
    deliveryDate: new Date('2024-01-20T10:00:00Z'),
    dueDate: new Date('2024-02-14T23:59:59Z'),
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    customerCode: 'CUST001',
    customerName: 'John Doe',
    customerCreditLimit: 10000,
    customerBalance: 2500,
    areaId: '550e8400-e29b-41d4-a716-446655440001',
    areaCode: 'AREA001',
    areaName: 'Downtown District',
    workerId: '550e8400-e29b-41d4-a716-446655440002',
    workerName: 'Jane Smith',
    items: [
      {
        productId: '550e8400-e29b-41d4-a716-446655440004',
        productCode: 'PROD001',
        productName: 'Premium Product A',
        unitPrice: 25.5,
        boxSize: 12,
        quantityBoxes: 2,
        quantityLoose: 5,
        discountPercentage: 5,
        taxRate: 8.5,
        notes: 'Handle with care',
      },
      {
        productId: '550e8400-e29b-41d4-a716-446655440006',
        productCode: 'PROD002',
        productName: 'Standard Product B',
        unitPrice: 15.75,
        boxSize: 24,
        quantityBoxes: 1,
        quantityLoose: 0,
        discountPercentage: 0,
        taxRate: 8.5,
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
    requestedBy: '550e8400-e29b-41d4-a716-446655440009',
  };

  describe('Command Validation', () => {
    it('should validate a complete valid command', () => {
      const result = validateCreateOrderCommand(validCommand);
      expect(result).toEqual(validCommand);
    });

    it('should validate command with minimal required fields', () => {
      const minimalCommand: CreateOrderCommand = {
        orderNumber: 'ORD-MIN-001',
        orderDate: new Date('2024-01-15T10:00:00Z'),
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        customerCode: 'CUST001',
        customerName: 'John Doe',
        customerCreditLimit: 5000,
        customerBalance: 0,
        areaCode: 'AREA001',
        areaName: 'Downtown District',
        workerName: 'Jane Smith',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440004',
            productCode: 'PROD001',
            productName: 'Test Product',
            unitPrice: 10.0,
            boxSize: 1,
            quantityBoxes: 1,
            quantityLoose: 0,
            discountPercentage: 0,
            taxRate: 0,
          },
        ],
        discountPercentage: 0,
        paymentMethod: PaymentMethod.CASH,
        creditDays: 0,
        createdOffline: false,
        agencyId: '550e8400-e29b-41d4-a716-446655440008',
        requestedBy: '550e8400-e29b-41d4-a716-446655440009',
      };

      const result = validateCreateOrderCommand(minimalCommand);
      expect(result).toEqual(minimalCommand);
    });

    it('should validate command with optional fields', () => {
      const commandWithOptionals = {
        ...validCommand,
        deliveryDate: new Date('2024-01-25T10:00:00Z'),
        dueDate: new Date('2024-02-20T23:59:59Z'),
        customerNotes: 'Special delivery instructions',
        internalNotes: 'VIP customer',
        syncSessionId: 'session-123',
        mobileDeviceId: 'mobile-456',
      };

      const result = validateCreateOrderCommand(commandWithOptionals);
      expect(result).toEqual(commandWithOptionals);
    });
  });

  describe('Required Field Validation', () => {
    it('should reject command without order number', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).orderNumber;

      expect(() => validateCreateOrderCommand(invalidCommand)).toThrow(CreateOrderCommandValidationError);
    });

    it('should reject command without order date', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).orderDate;

      expect(() => validateCreateOrderCommand(invalidCommand)).toThrow(CreateOrderCommandValidationError);
    });

    it('should reject command without customer ID', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).customerId;

      expect(() => validateCreateOrderCommand(invalidCommand)).toThrow(CreateOrderCommandValidationError);
    });

    it('should reject command without customer code', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).customerCode;

      expect(() => validateCreateOrderCommand(invalidCommand)).toThrow(CreateOrderCommandValidationError);
    });

    it('should reject command without customer name', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).customerName;

      expect(() => validateCreateOrderCommand(invalidCommand)).toThrow(CreateOrderCommandValidationError);
    });

    it('should reject command without items', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).items;

      expect(() => validateCreateOrderCommand(invalidCommand)).toThrow(CreateOrderCommandValidationError);
    });

    it('should reject command with empty items array', () => {
      const invalidCommand = { ...validCommand, items: [] };

      expect(() => validateCreateOrderCommand(invalidCommand)).toThrow(CreateOrderCommandValidationError);
    });

    it('should reject command without agency ID', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).agencyId;

      expect(() => validateCreateOrderCommand(invalidCommand)).toThrow(CreateOrderCommandValidationError);
    });

    it('should reject command without requested by', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).requestedBy;

      expect(() => validateCreateOrderCommand(invalidCommand)).toThrow(CreateOrderCommandValidationError);
    });
  });

  describe('Order Number Validation', () => {
    it('should accept valid order number formats', () => {
      const validOrderNumbers = ['ORD-2024-001', 'ORDER-001', 'O123456', 'ORD_2024_001', 'CUSTOM-ORDER-123', 'A1B2C3'];

      validOrderNumbers.forEach((orderNumber) => {
        const command = { ...validCommand, orderNumber };
        expect(() => validateCreateOrderCommand(command)).not.toThrow();
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
      ];

      invalidOrderNumbers.forEach((orderNumber) => {
        const command = { ...validCommand, orderNumber };
        expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
      });
    });
  });

  describe('Customer Information Validation', () => {
    it('should validate customer credit limit', () => {
      const validCreditLimits = [0, 1000, 50000, 100000];

      validCreditLimits.forEach((creditLimit) => {
        const command = { ...validCommand, customerCreditLimit: creditLimit };
        expect(() => validateCreateOrderCommand(command)).not.toThrow();
      });
    });

    it('should reject negative customer credit limit', () => {
      const command = { ...validCommand, customerCreditLimit: -1000 };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should validate customer balance', () => {
      const validBalances = [0, 1000, 25000];

      validBalances.forEach((balance) => {
        const command = { ...validCommand, customerBalance: balance };
        expect(() => validateCreateOrderCommand(command)).not.toThrow();
      });
    });

    it('should reject negative customer balance', () => {
      const command = { ...validCommand, customerBalance: -500 };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should validate customer names', () => {
      const validNames = ['John Doe', "O'Connor", 'Jean-Pierre Smith', 'María García'];

      validNames.forEach((customerName) => {
        const command = { ...validCommand, customerName };
        expect(() => validateCreateOrderCommand(command)).not.toThrow();
      });
    });

    it('should reject invalid customer names', () => {
      const invalidNames = ['', 'A'.repeat(201), 'John123', 'Test@Name'];

      invalidNames.forEach((customerName) => {
        const command = { ...validCommand, customerName };
        expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
      });
    });
  });

  describe('Order Items Validation', () => {
    it('should validate order items with valid quantities', () => {
      const validItems = [
        { ...validCommand.items[0], quantityBoxes: 1, quantityLoose: 0 },
        { ...validCommand.items[0], quantityBoxes: 0, quantityLoose: 5 },
        { ...validCommand.items[0], quantityBoxes: 2, quantityLoose: 3 },
      ];

      validItems.forEach((item) => {
        const command = { ...validCommand, items: [item] };
        expect(() => validateCreateOrderCommand(command)).not.toThrow();
      });
    });

    it('should reject items with negative quantities', () => {
      const invalidItems = [
        { ...validCommand.items[0], quantityBoxes: -1 },
        { ...validCommand.items[0], quantityLoose: -1 },
        { ...validCommand.items[0], quantityBoxes: -1, quantityLoose: -1 },
      ];

      invalidItems.forEach((item) => {
        const command = { ...validCommand, items: [item] };
        expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
      });
    });

    it('should reject items with zero total quantity', () => {
      const invalidItem = { ...validCommand.items[0], quantityBoxes: 0, quantityLoose: 0 };
      const command = { ...validCommand, items: [invalidItem] };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should validate pricing fields', () => {
      const validPrices = [0.01, 10.5, 100.0, 999.99];

      validPrices.forEach((unitPrice) => {
        const item = { ...validCommand.items[0], unitPrice };
        const command = { ...validCommand, items: [item] };
        expect(() => validateCreateOrderCommand(command)).not.toThrow();
      });
    });

    it('should reject negative unit prices', () => {
      const invalidItem = { ...validCommand.items[0], unitPrice: -10.5 };
      const command = { ...validCommand, items: [invalidItem] };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should validate discount percentages', () => {
      const validDiscounts = [0, 5, 10, 25, 50, 100];

      validDiscounts.forEach((discountPercentage) => {
        const item = { ...validCommand.items[0], discountPercentage };
        const command = { ...validCommand, items: [item] };
        expect(() => validateCreateOrderCommand(command)).not.toThrow();
      });
    });

    it('should reject invalid discount percentages', () => {
      const invalidDiscounts = [-5, 150, 200];

      invalidDiscounts.forEach((discountPercentage) => {
        const item = { ...validCommand.items[0], discountPercentage };
        const command = { ...validCommand, items: [item] };
        expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
      });
    });

    it('should validate tax rates', () => {
      const validTaxRates = [0, 5.5, 8.25, 10, 15];

      validTaxRates.forEach((taxRate) => {
        const item = { ...validCommand.items[0], taxRate };
        const command = { ...validCommand, items: [item] };
        expect(() => validateCreateOrderCommand(command)).not.toThrow();
      });
    });

    it('should reject negative tax rates', () => {
      const invalidItem = { ...validCommand.items[0], taxRate: -5 };
      const command = { ...validCommand, items: [invalidItem] };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should reject excessive tax rates', () => {
      const invalidItem = { ...validCommand.items[0], taxRate: 150 };
      const command = { ...validCommand, items: [invalidItem] };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });
  });

  describe('Business Rules Validation', () => {
    it('should validate order with sufficient credit', () => {
      const command = {
        ...validCommand,
        customerCreditLimit: 10000,
        customerBalance: 1000, // Available credit: 9000
      };

      expect(() => validateOrderBusinessRules(command)).not.toThrow();
    });

    it('should reject order that exceeds credit limit', () => {
      // Calculate approximate order total: (25.50 * 29) + (15.75 * 24) ≈ 1117.5
      const command = {
        ...validCommand,
        customerCreditLimit: 1000,
        customerBalance: 900, // Available credit: 100, but order total > 1000
      };

      expect(() => validateOrderBusinessRules(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should prevent duplicate products in same order', () => {
      const duplicateItem = { ...validCommand.items[0] };
      const command = {
        ...validCommand,
        items: [validCommand.items[0], duplicateItem], // Same product twice
      };

      expect(() => validateOrderBusinessRules(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should enforce maximum items per order', () => {
      const manyItems = Array(101)
        .fill(null)
        .map((_, index) => ({
          ...validCommand.items[0],
          productId: `product-${index}`,
          productCode: `PROD${index.toString().padStart(3, '0')}`,
        }));

      const command = { ...validCommand, items: manyItems };

      expect(() => validateOrderBusinessRules(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should enforce maximum quantity per item', () => {
      const highQuantityItem = {
        ...validCommand.items[0],
        quantityBoxes: 10000, // Exceeds reasonable limit
      };

      const command = { ...validCommand, items: [highQuantityItem] };

      expect(() => validateOrderBusinessRules(command)).toThrow(CreateOrderCommandValidationError);
    });
  });

  describe('Financial Calculations', () => {
    it('should calculate order item totals correctly', () => {
      const item = {
        unitPrice: 25.5,
        boxSize: 12,
        quantityBoxes: 2,
        quantityLoose: 5,
        discountPercentage: 10,
        taxRate: 8.5,
      };

      const totals = calculateOrderItemTotals(item);

      expect(totals.totalUnits).toBe(29); // (2 * 12) + 5
      expect(totals.unitTotal.decimalAmount).toBeCloseTo(739.5, 2); // 25.50 * 29
      expect(totals.discountAmount.decimalAmount).toBeCloseTo(73.95, 2); // 739.50 * 0.10
      expect(totals.afterDiscount.decimalAmount).toBeCloseTo(665.55, 2); // 739.50 - 73.95
      expect(totals.taxAmount.decimalAmount).toBeCloseTo(56.57, 2); // 665.55 * 0.085
      expect(totals.itemTotal.decimalAmount).toBeCloseTo(722.12, 2); // 665.55 + 56.57
    });

    it('should handle zero discount correctly', () => {
      const item = {
        unitPrice: 10.0,
        boxSize: 1,
        quantityBoxes: 1,
        quantityLoose: 0,
        discountPercentage: 0,
        taxRate: 0,
      };

      const totals = calculateOrderItemTotals(item);

      expect(totals.totalUnits).toBe(1);
      expect(totals.unitTotal.decimalAmount).toBe(10.0);
      expect(totals.discountAmount.decimalAmount).toBe(0);
      expect(totals.afterDiscount.decimalAmount).toBe(10.0);
      expect(totals.taxAmount.decimalAmount).toBe(0);
      expect(totals.itemTotal.decimalAmount).toBe(10.0);
    });

    it('should handle 100% discount correctly', () => {
      const item = {
        unitPrice: 50.0,
        boxSize: 1,
        quantityBoxes: 2,
        quantityLoose: 0,
        discountPercentage: 100,
        taxRate: 10,
      };

      const totals = calculateOrderItemTotals(item);

      expect(totals.totalUnits).toBe(2);
      expect(totals.unitTotal.decimalAmount).toBe(100.0);
      expect(totals.discountAmount.decimalAmount).toBe(100.0);
      expect(totals.afterDiscount.decimalAmount).toBe(0);
      expect(totals.taxAmount.decimalAmount).toBe(0); // No tax on zero amount
      expect(totals.itemTotal.decimalAmount).toBe(0);
    });

    it('should calculate order totals correctly', () => {
      const orderTotals = calculateOrderTotals(validCommand);

      // Expected calculations based on test data
      expect(orderTotals.totalItems).toBe(2);
      expect(orderTotals.totalUnits).toBe(53); // 29 + 24
      expect(orderTotals.subtotalAmount.decimalAmount).toBeCloseTo(1117.5, 2);
      expect(orderTotals.discountAmount.decimalAmount).toBeCloseTo(36.98, 2);
      expect(orderTotals.taxAmount.decimalAmount).toBeCloseTo(91.84, 2);
      expect(orderTotals.totalAmount.decimalAmount).toBeCloseTo(1172.36, 2);
    });
  });

  describe('Date Validation', () => {
    it('should validate that delivery date is after order date', () => {
      const command = {
        ...validCommand,
        orderDate: new Date('2024-01-15T10:00:00Z'),
        deliveryDate: new Date('2024-01-20T10:00:00Z'),
      };

      expect(() => validateCreateOrderCommand(command)).not.toThrow();
    });

    it('should reject delivery date before order date', () => {
      const command = {
        ...validCommand,
        orderDate: new Date('2024-01-20T10:00:00Z'),
        deliveryDate: new Date('2024-01-15T10:00:00Z'),
      };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should validate that due date is after order date', () => {
      const command = {
        ...validCommand,
        orderDate: new Date('2024-01-15T10:00:00Z'),
        dueDate: new Date('2024-02-15T10:00:00Z'),
      };

      expect(() => validateCreateOrderCommand(command)).not.toThrow();
    });

    it('should reject due date before order date', () => {
      const command = {
        ...validCommand,
        orderDate: new Date('2024-02-15T10:00:00Z'),
        dueDate: new Date('2024-01-15T10:00:00Z'),
      };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should allow null optional dates', () => {
      const command = {
        ...validCommand,
        deliveryDate: undefined,
        dueDate: undefined,
      };

      expect(() => validateCreateOrderCommand(command)).not.toThrow();
    });
  });

  describe('Payment Method Validation', () => {
    it('should accept all valid payment methods', () => {
      const validPaymentMethods = [
        PaymentMethod.CASH,
        PaymentMethod.CREDIT,
        PaymentMethod.CHEQUE,
        PaymentMethod.BANK_TRANSFER,
      ];

      validPaymentMethods.forEach((paymentMethod) => {
        const command = { ...validCommand, paymentMethod };
        expect(() => validateCreateOrderCommand(command)).not.toThrow();
      });
    });

    it('should validate credit days for credit payment', () => {
      const command = {
        ...validCommand,
        paymentMethod: PaymentMethod.CREDIT,
        creditDays: 30,
      };

      expect(() => validateCreateOrderCommand(command)).not.toThrow();
    });

    it('should reject negative credit days', () => {
      const command = {
        ...validCommand,
        paymentMethod: PaymentMethod.CREDIT,
        creditDays: -10,
      };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should reject excessive credit days', () => {
      const command = {
        ...validCommand,
        paymentMethod: PaymentMethod.CREDIT,
        creditDays: 400, // Over maximum allowed
      };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });
  });

  describe('Text Field Validation', () => {
    it('should validate customer notes length', () => {
      const validNotes = [
        'Short note',
        'A'.repeat(500), // Within limit
        '',
      ];

      validNotes.forEach((customerNotes) => {
        const command = { ...validCommand, customerNotes };
        expect(() => validateCreateOrderCommand(command)).not.toThrow();
      });
    });

    it('should reject excessively long customer notes', () => {
      const command = {
        ...validCommand,
        customerNotes: 'A'.repeat(1001), // Over limit
      };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should validate internal notes length', () => {
      const validNotes = [
        'Internal note',
        'A'.repeat(500), // Within limit
        '',
      ];

      validNotes.forEach((internalNotes) => {
        const command = { ...validCommand, internalNotes };
        expect(() => validateCreateOrderCommand(command)).not.toThrow();
      });
    });

    it('should reject excessively long internal notes', () => {
      const command = {
        ...validCommand,
        internalNotes: 'A'.repeat(1001), // Over limit
      };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });

    it('should validate item notes length', () => {
      const validNotes = ['Handle with care', 'A'.repeat(250), ''];

      validNotes.forEach((notes) => {
        const item = { ...validCommand.items[0], notes };
        const command = { ...validCommand, items: [item] };
        expect(() => validateCreateOrderCommand(command)).not.toThrow();
      });
    });

    it('should reject excessively long item notes', () => {
      const item = { ...validCommand.items[0], notes: 'A'.repeat(501) };
      const command = { ...validCommand, items: [item] };

      expect(() => validateCreateOrderCommand(command)).toThrow(CreateOrderCommandValidationError);
    });
  });

  describe('Error Handling', () => {
    it('should throw CreateOrderCommandValidationError for validation failures', () => {
      const invalidCommand = { ...validCommand, orderNumber: '' };

      expect(() => validateCreateOrderCommand(invalidCommand)).toThrow(CreateOrderCommandValidationError);
    });

    it('should provide detailed validation error messages', () => {
      const invalidCommand = { ...validCommand, orderNumber: '', customerName: '' };

      try {
        validateCreateOrderCommand(invalidCommand);
        fail('Expected validation to throw error');
      } catch (error) {
        expect(error).toBeInstanceOf(CreateOrderCommandValidationError);
        expect((error as CreateOrderCommandValidationError).validationErrors).toHaveProperty('orderNumber');
        expect((error as CreateOrderCommandValidationError).validationErrors).toHaveProperty('customerName');
      }
    });

    it('should handle business rule validation errors', () => {
      const invalidCommand = {
        ...validCommand,
        customerCreditLimit: 100,
        customerBalance: 99, // Available credit: 1, but order total > 1000
      };

      expect(() => validateOrderBusinessRules(invalidCommand)).toThrow(CreateOrderCommandValidationError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid order', () => {
      const minimalCommand: CreateOrderCommand = {
        orderNumber: 'MIN-001',
        orderDate: new Date(),
        customerId: 'cust-001',
        customerCode: 'C001',
        customerName: 'Customer',
        customerCreditLimit: 1000,
        customerBalance: 0,
        areaCode: 'A001',
        areaName: 'Area',
        workerName: 'Worker',
        items: [
          {
            productId: 'prod-001',
            productCode: 'P001',
            productName: 'Product',
            unitPrice: 1,
            boxSize: 1,
            quantityBoxes: 1,
            quantityLoose: 0,
            discountPercentage: 0,
            taxRate: 0,
          },
        ],
        discountPercentage: 0,
        paymentMethod: PaymentMethod.CASH,
        creditDays: 0,
        createdOffline: false,
        agencyId: 'agency-001',
        requestedBy: 'user-001',
      };

      expect(() => validateCreateOrderCommand(minimalCommand)).not.toThrow();
    });

    it('should handle maximum valid order', () => {
      const maxItems = Array(100)
        .fill(null)
        .map((_, index) => ({
          productId: `product-${index}`,
          productCode: `PROD${index.toString().padStart(3, '0')}`,
          productName: `Product ${index}`,
          unitPrice: 1.0,
          boxSize: 1,
          quantityBoxes: 1,
          quantityLoose: 0,
          discountPercentage: 0,
          taxRate: 0,
        }));

      const maxCommand = {
        ...validCommand,
        items: maxItems,
        customerCreditLimit: 10000, // Sufficient for 100 items at $1 each
      };

      expect(() => validateCreateOrderCommand(maxCommand)).not.toThrow();
    });

    it('should handle zero-value orders', () => {
      const zeroValueCommand = {
        ...validCommand,
        items: [
          {
            productId: 'free-sample',
            productCode: 'FREE001',
            productName: 'Free Sample',
            unitPrice: 0,
            boxSize: 1,
            quantityBoxes: 1,
            quantityLoose: 0,
            discountPercentage: 0,
            taxRate: 0,
          },
        ],
      };

      expect(() => validateCreateOrderCommand(zeroValueCommand)).not.toThrow();
    });
  });
});
