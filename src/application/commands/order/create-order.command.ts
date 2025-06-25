/**
 * Create Order Command
 *
 * Command for creating new orders in the goods distribution system.
 * Handles comprehensive order validation, business rules enforcement,
 * and order item management following CQRS pattern.
 *
 * Business Rules:
 * - Order number must be unique within agency
 * - Order must have at least one item
 * - Customer must exist and be active
 * - Credit limit checks must be performed
 * - Product availability must be validated
 * - Financial calculations must be accurate
 * - Worker and area assignments must be valid
 *
 * @domain Order Management
 * @pattern CQRS Command
 * @version 1.0.0
 */

import { z } from 'zod';
import { Money } from '../../../domain/value-objects/money';
import { PaymentMethod } from '../../../domain/entities/order';

/**
 * Zod schema for order item validation
 */
const OrderItemSchema = z
  .object({
    productId: z.string().min(1, 'Product ID is required'),
    productCode: z.string().min(1, 'Product code is required').max(50, 'Product code too long'),
    productName: z.string().min(1, 'Product name is required').max(200, 'Product name too long'),
    unitPrice: z.number().min(0, 'Unit price cannot be negative').finite('Unit price must be a valid number'),
    boxSize: z.number().int().positive('Box size must be a positive integer'),
    quantityBoxes: z.number().int().min(0, 'Quantity boxes cannot be negative'),
    quantityLoose: z.number().int().min(0, 'Quantity loose cannot be negative'),
    discountPercentage: z
      .number()
      .min(0, 'Discount percentage cannot be negative')
      .max(100, 'Discount percentage cannot exceed 100')
      .default(0),
    taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100').default(0),
    notes: z.string().max(500, 'Item notes too long').optional(),
  })
  .refine((data) => data.quantityBoxes > 0 || data.quantityLoose > 0, {
    message: 'At least one of quantity boxes or quantity loose must be greater than 0',
    path: ['quantityBoxes'],
  });

/**
 * Zod schema for create order command validation
 */
export const CreateOrderCommandSchema = z
  .object({
    orderNumber: z
      .string()
      .min(1, 'Order number is required')
      .max(50, 'Order number too long')
      .regex(
        /^[A-Za-z0-9]+([_-][A-Za-z0-9]+)*$/,
        'Order number must contain only letters, numbers, hyphens, and underscores'
      )
      .refine((val) => val.length >= 2, {
        message: 'Order number must be at least 2 characters',
      }),

    orderDate: z.coerce.date({
      errorMap: () => ({ message: 'Invalid order date' }),
    }),

    deliveryDate: z.coerce
      .date({
        errorMap: () => ({ message: 'Invalid delivery date' }),
      })
      .optional(),

    dueDate: z.coerce
      .date({
        errorMap: () => ({ message: 'Invalid due date' }),
      })
      .optional(),

    customerId: z.string().min(1, 'Customer ID is required'),

    customerCode: z.string().min(1, 'Customer code is required').max(50, 'Customer code too long'),

    customerName: z
      .string()
      .min(1, 'Customer name is required')
      .max(200, 'Customer name too long')
      .regex(
        /^[\p{L}\p{N}\s\-'\.&]+$/u,
        'Customer name can only contain letters, numbers, spaces, hyphens, apostrophes, periods, and ampersands'
      ),

    customerCreditLimit: z
      .number()
      .min(0, 'Customer credit limit cannot be negative')
      .finite('Customer credit limit must be a valid number'),

    customerBalance: z
      .number()
      .min(0, 'Customer balance cannot be negative')
      .finite('Customer balance must be a valid number'),

    areaId: z.string().min(1, 'Area ID must be valid').optional(),

    areaCode: z.string().min(1, 'Area code is required').max(50, 'Area code too long'),

    areaName: z.string().min(1, 'Area name is required').max(200, 'Area name too long'),

    workerId: z.string().min(1, 'Worker ID must be valid').optional(),

    workerName: z.string().min(1, 'Worker name is required').max(200, 'Worker name too long'),

    items: z
      .array(OrderItemSchema)
      .min(1, 'Order must have at least one item')
      .max(100, 'Too many items (maximum 100)'),

    discountPercentage: z
      .number()
      .min(0, 'Discount percentage cannot be negative')
      .max(100, 'Discount percentage cannot exceed 100')
      .default(0),

    paymentMethod: z.nativeEnum(PaymentMethod, {
      errorMap: () => ({ message: 'Invalid payment method' }),
    }),

    creditDays: z
      .number()
      .int()
      .min(0, 'Credit days cannot be negative')
      .max(365, 'Credit days cannot exceed 365')
      .default(30),

    customerNotes: z.string().max(1000, 'Customer notes too long').optional(),

    internalNotes: z.string().max(1000, 'Internal notes too long').optional(),

    syncSessionId: z.string().max(100, 'Sync session ID too long').optional(),

    mobileDeviceId: z.string().max(100, 'Mobile device ID too long').optional(),

    createdOffline: z.boolean().default(false),

    agencyId: z.string().min(1, 'Agency ID is required'),

    requestedBy: z.string().min(1, 'Requested by is required'),
  })
  .refine((data) => !data.deliveryDate || !data.orderDate || data.deliveryDate >= data.orderDate, {
    message: 'Delivery date cannot be before order date',
    path: ['deliveryDate'],
  })
  .refine((data) => !data.dueDate || !data.orderDate || data.dueDate >= data.orderDate, {
    message: 'Due date cannot be before order date',
    path: ['dueDate'],
  });

/**
 * Create Order Command Type
 */
export type CreateOrderCommand = z.infer<typeof CreateOrderCommandSchema>;

/**
 * Order item from command
 */
export type CreateOrderCommandItem = CreateOrderCommand['items'][0];

/**
 * Create Order Command Result
 */
export interface CreateOrderCommandResult {
  readonly success: boolean;
  readonly orderId?: string;
  readonly orderNumber?: string;
  readonly totalAmount?: number;
  readonly error?: string;
  readonly validationErrors?: Record<string, string[]>;
}

/**
 * Command validation error
 */
export class CreateOrderCommandValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'CreateOrderCommandValidationError';
  }
}

/**
 * Validate create order command
 * @param command - Command to validate
 * @returns Validated command data
 * @throws {CreateOrderCommandValidationError} When validation fails
 */
export function validateCreateOrderCommand(command: unknown): CreateOrderCommand {
  try {
    return CreateOrderCommandSchema.parse(command);
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

      throw new CreateOrderCommandValidationError('Order creation validation failed', validationErrors);
    }
    throw error;
  }
}

/**
 * Calculate order item totals
 * @param item - Order item data
 * @returns Calculated totals
 */
export function calculateOrderItemTotals(item: CreateOrderCommandItem) {
  // Calculate total units
  const totalUnits = item.quantityBoxes * item.boxSize + item.quantityLoose;

  // Calculate unit total (before discount and tax)
  const unitTotal = Money.fromDecimal(item.unitPrice * totalUnits, 'USD');

  // Calculate discount amount
  const discountAmount = unitTotal.multiply(item.discountPercentage / 100);

  // Calculate subtotal after discount
  const subtotal = unitTotal.subtract(discountAmount);

  // Calculate tax amount
  const taxAmount = subtotal.multiply(item.taxRate / 100);

  // Calculate item total
  const itemTotal = subtotal.add(taxAmount);

  return {
    totalUnits,
    unitTotal,
    discountAmount,
    afterDiscount: subtotal,
    taxAmount,
    itemTotal,
  };
}

/**
 * Calculate order totals from command or items
 * @param commandOrItems - Command object or array of order items
 * @param orderDiscountPercentage - Order-level discount percentage (optional if command provided)
 * @returns Calculated order totals
 */
export function calculateOrderTotals(
  commandOrItems: CreateOrderCommand | CreateOrderCommandItem[],
  orderDiscountPercentage?: number
) {
  // Handle both command object and items array
  const items = Array.isArray(commandOrItems) ? commandOrItems : commandOrItems.items;
  const discountPercentage =
    orderDiscountPercentage ?? (Array.isArray(commandOrItems) ? 0 : commandOrItems.discountPercentage);
  let subtotalAmount = Money.fromDecimal(0, 'USD');
  let totalDiscountAmount = Money.fromDecimal(0, 'USD');
  let totalTaxAmount = Money.fromDecimal(0, 'USD');
  let totalAmount = Money.fromDecimal(0, 'USD');

  // Sum up all item totals
  for (const item of items) {
    const itemTotals = calculateOrderItemTotals(item);
    subtotalAmount = subtotalAmount.add(itemTotals.unitTotal); // Before discount
    totalDiscountAmount = totalDiscountAmount.add(itemTotals.discountAmount); // Item discounts
    totalTaxAmount = totalTaxAmount.add(itemTotals.taxAmount);
    totalAmount = totalAmount.add(itemTotals.itemTotal); // Final item totals
  }

  // Apply order-level discount if any
  const orderDiscountAmount = subtotalAmount.multiply(discountPercentage / 100);
  const finalDiscountAmount = totalDiscountAmount.add(orderDiscountAmount);

  // Adjust total if order-level discount exists
  if (discountPercentage > 0) {
    totalAmount = subtotalAmount.subtract(finalDiscountAmount).add(totalTaxAmount);
  }

  return {
    totalItems: items.length,
    totalUnits: items.reduce((sum, item) => sum + (item.quantityBoxes * item.boxSize + item.quantityLoose), 0),
    subtotalAmount,
    discountAmount: finalDiscountAmount,
    taxAmount: totalTaxAmount,
    totalAmount,
  };
}

/**
 * Validate order business rules
 * @param command - Validated command
 * @throws {CreateOrderCommandValidationError} When business rules fail
 */
export function validateOrderBusinessRules(command: CreateOrderCommand): void {
  // Calculate order totals to validate credit limit
  const orderTotals = calculateOrderTotals(command);

  // Check credit limit
  const availableCredit = command.customerCreditLimit - command.customerBalance;
  if (orderTotals.totalAmount.decimalAmount > availableCredit) {
    throw new CreateOrderCommandValidationError('Order would exceed customer credit limit', {
      totalAmount: [
        `Order total (${orderTotals.totalAmount.decimalAmount}) exceeds available credit (${availableCredit})`,
      ],
    });
  }

  // Validate item quantities are reasonable
  for (let i = 0; i < command.items.length; i++) {
    const item = command.items[i];
    if (!item) continue;
    const totalUnits = item.quantityBoxes * item.boxSize + item.quantityLoose;

    if (totalUnits > 10000) {
      throw new CreateOrderCommandValidationError('Order item quantity too large', {
        [`items.${i}.quantityBoxes`]: ['Total quantity exceeds maximum allowed (10,000 units)'],
      });
    }
  }

  // Validate no duplicate products
  const productIds = new Set<string>();
  for (let i = 0; i < command.items.length; i++) {
    const item = command.items[i];
    if (!item) continue;
    if (productIds.has(item.productId)) {
      throw new CreateOrderCommandValidationError('Duplicate products not allowed', {
        [`items.${i}.productId`]: ['Product already exists in this order'],
      });
    }
    productIds.add(item.productId);
  }
}
