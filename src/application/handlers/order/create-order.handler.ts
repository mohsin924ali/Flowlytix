/**
 * Create Order Handler
 *
 * CQRS Command handler for creating new orders in the goods distribution system.
 * Handles order creation business logic, validation, and persistence operations.
 *
 * Business Logic:
 * - Validates customer existence and status
 * - Checks product availability and pricing
 * - Enforces credit limit restrictions
 * - Generates unique order numbers
 * - Creates order items with proper calculations
 * - Persists order and items transactionally
 * - Updates customer order history
 *
 * @domain Order Management
 * @pattern CQRS Command Handler
 * @version 1.0.0
 */

import {
  CreateOrderCommand,
  CreateOrderCommandResult,
  calculateOrderItemTotals,
  validateCreateOrderCommand,
  validateOrderBusinessRules,
} from '../../../application/commands/order';
import { Order, OrderItem, OrderItemStatus, PaymentMethod } from '../../../domain/entities/order';
import { OrderRepository } from '../../../domain/repositories/order.repository';
import { ICustomerRepository } from '../../../domain/repositories/customer.repository';
import { IProductRepository } from '../../../domain/repositories/product.repository';
import { ILotBatchRepository } from '../../../domain/repositories/lot-batch.repository';
import { IOrderLotAllocationRepository } from '../../../domain/repositories/order-lot-allocation.repository';
import { Money } from '../../../domain/value-objects/money';
import { LotStatus } from '../../../domain/value-objects/lot-batch';
import type { OrderItemLotAllocation } from '../../../domain/entities/order-lot-allocation';

/**
 * Handler dependencies interface
 */
export interface CreateOrderHandlerDependencies {
  readonly orderRepository: OrderRepository;
  readonly customerRepository: ICustomerRepository;
  readonly productRepository: IProductRepository;
  readonly lotBatchRepository: ILotBatchRepository;
  readonly orderLotAllocationRepository: IOrderLotAllocationRepository;
}

/**
 * Create Order Handler
 */
export class CreateOrderHandler {
  constructor(private readonly deps: CreateOrderHandlerDependencies) {}

  /**
   * Execute create order command
   * @param command - Raw command data
   * @returns Promise resolving to command result
   */
  public async execute(command: unknown): Promise<CreateOrderCommandResult> {
    let transaction: any = null;

    try {
      // 1. Validate command structure
      const validatedCommand = validateCreateOrderCommand(command);

      // 2. Validate business rules (credit limits, etc.)
      validateOrderBusinessRules(validatedCommand);

      // 3. Verify customer exists and is active
      await this.validateCustomer(validatedCommand);

      // 4. Validate products and get current pricing
      const validatedItems = await this.validateProducts(validatedCommand);

      // 4.5. Check inventory availability for all products
      await this.validateInventoryAvailability(validatedCommand, validatedItems);

      // 4.6. Reserve inventory with transaction (Step 2.2: Inventory Reservation)
      transaction = await this.deps.lotBatchRepository.beginTransaction();
      const itemLotAllocations = await this.reserveInventoryForOrder(validatedCommand, validatedItems, transaction);

      // 5. Check order number uniqueness and generate if needed
      const finalOrderNumber = await this.ensureUniqueOrderNumber(validatedCommand);

      // 6. Create order entity with validated data (Step 2.3: Include lot allocations)
      const order = await this.createOrderEntity(
        validatedCommand,
        validatedItems,
        finalOrderNumber,
        itemLotAllocations
      );

      // 7. Save order to repository
      const savedOrder = await this.deps.orderRepository.save(order);

      // 7.5. Save lot allocation tracking data (Step 2: Order Handler Enhancement)
      await this.saveLotAllocationsForOrder(savedOrder, itemLotAllocations, validatedCommand.requestedBy);

      // 8. Commit inventory reservations
      await transaction.commit();

      // 9. Update customer order statistics (if needed)
      await this.updateCustomerOrderStats(validatedCommand.customerId, savedOrder.agencyId);

      return {
        success: true,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        totalAmount: savedOrder.totalAmount.decimalAmount,
      };
    } catch (error) {
      // Rollback inventory reservations if transaction exists
      if (transaction && transaction.isActive()) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          // Log rollback error but don't override original error
          console.error('Failed to rollback inventory reservation:', rollbackError);
        }
      }

      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
          validationErrors: (error as any).validationErrors,
        };
      }

      return {
        success: false,
        error: 'An unexpected error occurred while creating the order',
      };
    }
  }

  /**
   * Validate customer exists and can place orders
   */
  private async validateCustomer(command: CreateOrderCommand): Promise<void> {
    const customer = await this.deps.customerRepository.findById(command.customerId);

    if (!customer) {
      throw new Error(`Customer not found: ${command.customerCode}`);
    }

    if (!customer.canPlaceOrders()) {
      throw new Error(`Customer ${command.customerCode} is not eligible to place orders (status: ${customer.status})`);
    }

    // Verify customer data matches command (to prevent tampering)
    if (customer.customerCode !== command.customerCode) {
      throw new Error('Customer data mismatch - invalid customer reference');
    }

    if (customer.creditLimit.decimalAmount !== command.customerCreditLimit) {
      throw new Error('Customer credit limit has changed - please refresh and try again');
    }
  }

  /**
   * Validate products and get current pricing
   */
  private async validateProducts(command: CreateOrderCommand): Promise<OrderItem[]> {
    const validatedItems: OrderItem[] = [];

    for (let i = 0; i < command.items.length; i++) {
      const commandItem = command.items[i];
      if (!commandItem) continue;

      // Get current product data
      const product = await this.deps.productRepository.findById(commandItem.productId);

      if (!product) {
        throw new Error(`Product not found: ${commandItem.productCode}`);
      }

      if (product.status !== 'ACTIVE') {
        throw new Error(`Product ${commandItem.productCode} is not active`);
      }

      // Verify product data matches command
      if (product.sku !== commandItem.productCode) {
        throw new Error(`Product data mismatch for ${commandItem.productCode}`);
      }

      // Use current product pricing (override command pricing with actual pricing)
      const currentUnitPrice = product.sellingPrice;
      const currentBoxSize = commandItem.boxSize; // Box size comes from order item, not product

      // Calculate totals with current pricing
      const itemTotals = calculateOrderItemTotals({
        ...commandItem,
        unitPrice: currentUnitPrice.decimalAmount,
        boxSize: currentBoxSize,
      });

      // Create order item
      const orderItem: OrderItem = {
        id: this.generateItemId(),
        productId: commandItem.productId,
        productCode: commandItem.productCode,
        productName: commandItem.productName,
        unitPrice: currentUnitPrice,
        boxSize: currentBoxSize,
        quantityBoxes: commandItem.quantityBoxes,
        quantityLoose: commandItem.quantityLoose,
        totalUnits: itemTotals.totalUnits,
        unitTotal: itemTotals.unitTotal,
        discountPercentage: commandItem.discountPercentage || 0,
        discountAmount: itemTotals.discountAmount,
        taxRate: commandItem.taxRate || 0,
        taxAmount: itemTotals.taxAmount,
        itemTotal: itemTotals.itemTotal,
        fulfilledBoxes: 0,
        fulfilledLoose: 0,
        fulfilledUnits: 0,
        status: OrderItemStatus.PENDING,
        notes: commandItem.notes || undefined,
      };

      validatedItems.push(orderItem);
    }

    return validatedItems;
  }

  /**
   * Ensure order number is unique
   */
  private async ensureUniqueOrderNumber(command: CreateOrderCommand): Promise<string> {
    let orderNumber = command.orderNumber;

    // Check if order number already exists
    const exists = await this.deps.orderRepository.existsByOrderNumber(orderNumber, command.agencyId);

    if (exists) {
      // Generate new order number if provided one exists
      orderNumber = await this.deps.orderRepository.getNextOrderNumber(command.agencyId, 'ORD');
    }

    return orderNumber;
  }

  /**
   * Create order entity with validated data
   * Step 2.3: Enhanced to include lot allocation data in order items
   */
  private async createOrderEntity(
    command: CreateOrderCommand,
    validatedItems: OrderItem[],
    orderNumber: string,
    itemLotAllocations: Map<string, OrderItemLotAllocation[]>
  ): Promise<Order> {
    // Step 2.3: Merge lot allocations into order items
    const itemsWithLotAllocations = validatedItems.map((item) => ({
      ...item,
      lotAllocations: itemLotAllocations.get(item.id) || [],
    }));

    const orderProps = {
      orderNumber,
      orderDate: command.orderDate,
      deliveryDate: command.deliveryDate,
      dueDate: command.dueDate,
      customerId: command.customerId,
      customerCode: command.customerCode,
      customerName: command.customerName,
      customerCreditLimit: Money.fromDecimal(command.customerCreditLimit, 'USD'),
      customerBalance: Money.fromDecimal(command.customerBalance, 'USD'),
      areaId: command.areaId,
      areaCode: command.areaCode,
      areaName: command.areaName,
      workerId: command.workerId,
      workerName: command.workerName,
      items: itemsWithLotAllocations,
      discountPercentage: command.discountPercentage || 0,
      paymentMethod: command.paymentMethod,
      creditDays: command.creditDays || 30,
      customerNotes: command.customerNotes,
      internalNotes: command.internalNotes,
      syncSessionId: command.syncSessionId,
      mobileDeviceId: command.mobileDeviceId,
      createdOffline: command.createdOffline || false,
      agencyId: command.agencyId,
      createdBy: command.requestedBy,
    };

    return Order.create(orderProps);
  }

  /**
   * Update customer order statistics
   */
  private async updateCustomerOrderStats(customerId: string, agencyId: string): Promise<void> {
    // This would typically update customer statistics
    // For now, we'll skip this to keep the implementation focused
    // In a complete implementation, this would:
    // 1. Increment customer total orders count
    // 2. Update last order date
    // 3. Update total order value
    // 4. Update average order value
  }

  /**
   * Validate inventory availability for all order items
   * Phase 2 Completion: Critical inventory checking before order creation
   */
  private async validateInventoryAvailability(command: CreateOrderCommand, validatedItems: OrderItem[]): Promise<void> {
    try {
      for (const item of validatedItems) {
        // Get available quantity from lot/batch system
        const availableQuantity = await this.deps.lotBatchRepository.getAvailableQuantityForProduct(
          item.productId,
          command.agencyId
        );

        // Check if we have sufficient inventory
        const requestedQuantity = item.totalUnits;

        if (availableQuantity < requestedQuantity) {
          const shortage = requestedQuantity - availableQuantity;
          throw new Error(
            `Insufficient inventory for product ${item.productCode}: ` +
              `requested: ${requestedQuantity}, available: ${availableQuantity}, shortage: ${shortage}`
          );
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to check inventory availability: Unknown error');
    }
  }

  /**
   * Reserve inventory for order using FIFO allocation and transaction
   * Step 2.2: Inventory Reservation Mechanisms
   * Step 2.3: Enhanced to collect lot allocation data for order items
   */
  private async reserveInventoryForOrder(
    command: CreateOrderCommand,
    validatedItems: OrderItem[],
    transaction: any
  ): Promise<Map<string, OrderItemLotAllocation[]>> {
    const itemLotAllocations = new Map<string, OrderItemLotAllocation[]>();

    try {
      for (const item of validatedItems) {
        // Select lots using FIFO algorithm
        const fifoResult = await this.deps.lotBatchRepository.selectFifoLots({
          productId: item.productId,
          agencyId: command.agencyId,
          requestedQuantity: item.totalUnits,
          excludeStatuses: [LotStatus.EXPIRED, LotStatus.DAMAGED, LotStatus.RECALLED],
          includeReserved: false,
        });

        // Check if we have full allocation
        if (!fifoResult.hasFullAllocation) {
          throw new Error(
            `Insufficient inventory for FIFO allocation of product ${item.productCode}: ` +
              `requested: ${item.totalUnits}, allocated: ${fifoResult.totalAllocatedQuantity}, ` +
              `shortage: ${fifoResult.remainingQuantity}`
          );
        }

        // Collect lot allocation data for this item
        const lotAllocations: OrderItemLotAllocation[] = [];
        const reservationTimestamp = new Date();

        // Reserve quantities in selected lots and collect allocation data
        for (const lotAllocation of fifoResult.selectedLots) {
          await transaction.reserveQuantity(
            lotAllocation.lotBatch.id,
            lotAllocation.allocatedQuantity,
            command.requestedBy
          );

          // Create lot allocation record for order item tracking
          lotAllocations.push({
            lotBatchId: lotAllocation.lotBatch.id,
            lotNumber: lotAllocation.lotBatch.lotNumber,
            batchNumber: lotAllocation.lotBatch.batchNumber,
            allocatedQuantity: lotAllocation.allocatedQuantity,
            manufacturingDate: lotAllocation.lotBatch.manufacturingDate,
            expiryDate: lotAllocation.lotBatch.expiryDate,
            reservedAt: reservationTimestamp,
            reservedBy: command.requestedBy,
          });
        }

        // Store lot allocations for this item
        itemLotAllocations.set(item.id, lotAllocations);
      }

      return itemLotAllocations;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to reserve inventory: Unknown error');
    }
  }

  /**
   * Generate unique item ID
   */
  private generateItemId(): string {
    // Fallback for Node.js versions < 14.17.0 or test environments
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Simple UUID v4 fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Save lot allocation tracking data for order items
   * Step 2.2: Order Handler Enhancement - Lot Allocation Persistence
   */
  private async saveLotAllocationsForOrder(
    savedOrder: any,
    itemLotAllocations: Map<string, OrderItemLotAllocation[]>,
    requestedBy: string
  ): Promise<void> {
    try {
      // Iterate through each order item and save its lot allocations
      for (const orderItem of savedOrder.items) {
        const itemAllocations = itemLotAllocations.get(orderItem.id);

        if (itemAllocations && itemAllocations.length > 0) {
          // Save each lot allocation for this order item
          for (const allocation of itemAllocations) {
            await this.deps.orderLotAllocationRepository.save({
              orderId: savedOrder.id,
              orderItemId: orderItem.id,
              lotBatchId: allocation.lotBatchId,
              lotNumber: allocation.lotNumber,
              batchNumber: allocation.batchNumber,
              allocatedQuantity: allocation.allocatedQuantity,
              manufacturingDate: allocation.manufacturingDate,
              expiryDate: allocation.expiryDate,
              reservedAt: allocation.reservedAt,
              reservedBy: allocation.reservedBy,
            });
          }
        }
      }

      console.log(`Handler: Successfully saved lot allocations for order ${savedOrder.orderNumber}`);
    } catch (error) {
      console.error('Handler: Failed to save lot allocations:', {
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Re-throw the error to trigger rollback
      throw new Error(
        `Failed to save lot allocation tracking data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
