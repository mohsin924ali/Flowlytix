/**
 * Order Fulfillment Handlers
 *
 * CQRS Command handlers for order fulfillment workflow operations.
 * Handles picking, packing, shipping, delivery, and rollback operations
 * with comprehensive business logic, validation, and audit trail management.
 *
 * Business Logic:
 * - Validates order existence and current status
 * - Enforces fulfillment workflow sequence rules
 * - Manages audit trail for all operations
 * - Handles partial fulfillment scenarios
 * - Supports rollback operations with validation
 * - Maintains data consistency across operations
 *
 * @domain Order Management - Fulfillment Workflow
 * @pattern CQRS Command Handler
 * @version 1.0.0 - Step 1B: Application Layer Enhancement
 */

import {
  StartPickingCommand,
  CompletePickingCommand,
  StartPackingCommand,
  CompletePackingCommand,
  ShipOrderCommand,
  DeliverOrderCommand,
  MarkPartialFulfillmentCommand,
  RollbackFulfillmentCommand,
  FulfillmentCommandResult,
  validateStartPickingCommand,
  validateCompletePickingCommand,
  validateStartPackingCommand,
  validateCompletePackingCommand,
  validateShipOrderCommand,
  validateDeliverOrderCommand,
  validateMarkPartialFulfillmentCommand,
  validateRollbackFulfillmentCommand,
} from '../../commands/order';
import { OrderRepository } from '../../../domain/repositories/order.repository';
import { Order, OrderFulfillmentStatus, FulfillmentStatusError } from '../../../domain/entities/order';

/**
 * Handler dependencies interface
 */
export interface FulfillmentHandlerDependencies {
  readonly orderRepository: OrderRepository;
}

/**
 * Start Picking Handler
 */
export class StartPickingHandler {
  constructor(private readonly deps: FulfillmentHandlerDependencies) {}

  /**
   * Execute start picking command
   * @param command - Raw command data
   * @returns Promise resolving to command result
   */
  public async execute(command: unknown): Promise<FulfillmentCommandResult> {
    try {
      // 1. Validate command structure
      const validatedCommand = validateStartPickingCommand(command);

      // 2. Get order and validate it exists
      const order = await this.deps.orderRepository.findById(validatedCommand.orderId);
      if (!order) {
        return {
          success: false,
          error: `Order not found: ${validatedCommand.orderId}`,
        };
      }

      // 3. Check if order can start picking
      if (!order.canStartPicking()) {
        return {
          success: false,
          error: `Order ${order.orderNumber} cannot start picking (current status: ${order.status}, fulfillment: ${order.fulfillmentStatus})`,
        };
      }

      // 4. Start picking process
      const previousStatus = order.fulfillmentStatus;
      const updatedOrder = order.startPicking(
        validatedCommand.userId,
        validatedCommand.assignedWorker,
        validatedCommand.notes
      );

      // 5. Save updated order
      const savedOrder = await this.deps.orderRepository.save(updatedOrder);

      return {
        success: true,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        previousStatus,
        newStatus: savedOrder.fulfillmentStatus,
      };
    } catch (error) {
      if (error instanceof FulfillmentStatusError) {
        return {
          success: false,
          error: error.message,
        };
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
        error: 'An unexpected error occurred while starting picking process',
      };
    }
  }
}

/**
 * Complete Picking Handler
 */
export class CompletePickingHandler {
  constructor(private readonly deps: FulfillmentHandlerDependencies) {}

  /**
   * Execute complete picking command
   * @param command - Raw command data
   * @returns Promise resolving to command result
   */
  public async execute(command: unknown): Promise<FulfillmentCommandResult> {
    try {
      // 1. Validate command structure
      const validatedCommand = validateCompletePickingCommand(command);

      // 2. Get order and validate it exists
      const order = await this.deps.orderRepository.findById(validatedCommand.orderId);
      if (!order) {
        return {
          success: false,
          error: `Order not found: ${validatedCommand.orderId}`,
        };
      }

      // 3. Complete picking process
      const previousStatus = order.fulfillmentStatus;
      const updatedOrder = order.completePicking(validatedCommand.userId, validatedCommand.notes);

      // 4. Save updated order
      const savedOrder = await this.deps.orderRepository.save(updatedOrder);

      return {
        success: true,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        previousStatus,
        newStatus: savedOrder.fulfillmentStatus,
      };
    } catch (error) {
      if (error instanceof FulfillmentStatusError) {
        return {
          success: false,
          error: error.message,
        };
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
        error: 'An unexpected error occurred while completing picking process',
      };
    }
  }
}

/**
 * Start Packing Handler
 */
export class StartPackingHandler {
  constructor(private readonly deps: FulfillmentHandlerDependencies) {}

  /**
   * Execute start packing command
   * @param command - Raw command data
   * @returns Promise resolving to command result
   */
  public async execute(command: unknown): Promise<FulfillmentCommandResult> {
    try {
      // 1. Validate command structure
      const validatedCommand = validateStartPackingCommand(command);

      // 2. Get order and validate it exists
      const order = await this.deps.orderRepository.findById(validatedCommand.orderId);
      if (!order) {
        return {
          success: false,
          error: `Order not found: ${validatedCommand.orderId}`,
        };
      }

      // 3. Check if order can start packing
      if (!order.canStartPacking()) {
        return {
          success: false,
          error: `Order ${order.orderNumber} cannot start packing (current status: ${order.status}, fulfillment: ${order.fulfillmentStatus})`,
        };
      }

      // 4. Start packing process
      const previousStatus = order.fulfillmentStatus;
      const updatedOrder = order.startPacking(
        validatedCommand.userId,
        validatedCommand.assignedWorker,
        validatedCommand.notes
      );

      // 5. Save updated order
      const savedOrder = await this.deps.orderRepository.save(updatedOrder);

      return {
        success: true,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        previousStatus,
        newStatus: savedOrder.fulfillmentStatus,
      };
    } catch (error) {
      if (error instanceof FulfillmentStatusError) {
        return {
          success: false,
          error: error.message,
        };
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
        error: 'An unexpected error occurred while starting packing process',
      };
    }
  }
}

/**
 * Complete Packing Handler
 */
export class CompletePackingHandler {
  constructor(private readonly deps: FulfillmentHandlerDependencies) {}

  /**
   * Execute complete packing command
   * @param command - Raw command data
   * @returns Promise resolving to command result
   */
  public async execute(command: unknown): Promise<FulfillmentCommandResult> {
    try {
      // 1. Validate command structure
      const validatedCommand = validateCompletePackingCommand(command);

      // 2. Get order and validate it exists
      const order = await this.deps.orderRepository.findById(validatedCommand.orderId);
      if (!order) {
        return {
          success: false,
          error: `Order not found: ${validatedCommand.orderId}`,
        };
      }

      // 3. Complete packing process
      const previousStatus = order.fulfillmentStatus;
      const updatedOrder = order.completePacking(validatedCommand.userId, validatedCommand.notes);

      // 4. Save updated order
      const savedOrder = await this.deps.orderRepository.save(updatedOrder);

      return {
        success: true,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        previousStatus,
        newStatus: savedOrder.fulfillmentStatus,
      };
    } catch (error) {
      if (error instanceof FulfillmentStatusError) {
        return {
          success: false,
          error: error.message,
        };
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
        error: 'An unexpected error occurred while completing packing process',
      };
    }
  }
}

/**
 * Ship Order Handler
 */
export class ShipOrderHandler {
  constructor(private readonly deps: FulfillmentHandlerDependencies) {}

  /**
   * Execute ship order command
   * @param command - Raw command data
   * @returns Promise resolving to command result
   */
  public async execute(command: unknown): Promise<FulfillmentCommandResult> {
    try {
      // 1. Validate command structure
      const validatedCommand = validateShipOrderCommand(command);

      // 2. Get order and validate it exists
      const order = await this.deps.orderRepository.findById(validatedCommand.orderId);
      if (!order) {
        return {
          success: false,
          error: `Order not found: ${validatedCommand.orderId}`,
        };
      }

      // 3. Check if order can be shipped
      if (!order.canShip()) {
        return {
          success: false,
          error: `Order ${order.orderNumber} cannot be shipped (current status: ${order.status}, fulfillment: ${order.fulfillmentStatus})`,
        };
      }

      // 4. Ship order
      const previousStatus = order.fulfillmentStatus;
      const updatedOrder = order.ship(
        validatedCommand.userId,
        validatedCommand.trackingNumber,
        validatedCommand.carrier,
        validatedCommand.notes
      );

      // 5. Save updated order
      const savedOrder = await this.deps.orderRepository.save(updatedOrder);

      return {
        success: true,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        previousStatus,
        newStatus: savedOrder.fulfillmentStatus,
      };
    } catch (error) {
      if (error instanceof FulfillmentStatusError) {
        return {
          success: false,
          error: error.message,
        };
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
        error: 'An unexpected error occurred while shipping order',
      };
    }
  }
}

/**
 * Deliver Order Handler
 */
export class DeliverOrderHandler {
  constructor(private readonly deps: FulfillmentHandlerDependencies) {}

  /**
   * Execute deliver order command
   * @param command - Raw command data
   * @returns Promise resolving to command result
   */
  public async execute(command: unknown): Promise<FulfillmentCommandResult> {
    try {
      // 1. Validate command structure
      const validatedCommand = validateDeliverOrderCommand(command);

      // 2. Get order and validate it exists
      const order = await this.deps.orderRepository.findById(validatedCommand.orderId);
      if (!order) {
        return {
          success: false,
          error: `Order not found: ${validatedCommand.orderId}`,
        };
      }

      // 3. Check if order can be delivered
      if (!order.canDeliver()) {
        return {
          success: false,
          error: `Order ${order.orderNumber} cannot be delivered (current status: ${order.status}, fulfillment: ${order.fulfillmentStatus})`,
        };
      }

      // 4. Deliver order
      const previousStatus = order.fulfillmentStatus;
      const updatedOrder = order.deliver(
        validatedCommand.userId,
        validatedCommand.deliveredAt,
        validatedCommand.recipientName,
        validatedCommand.notes
      );

      // 5. Save updated order
      const savedOrder = await this.deps.orderRepository.save(updatedOrder);

      return {
        success: true,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        previousStatus,
        newStatus: savedOrder.fulfillmentStatus,
      };
    } catch (error) {
      if (error instanceof FulfillmentStatusError) {
        return {
          success: false,
          error: error.message,
        };
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
        error: 'An unexpected error occurred while delivering order',
      };
    }
  }
}

/**
 * Mark Partial Fulfillment Handler
 */
export class MarkPartialFulfillmentHandler {
  constructor(private readonly deps: FulfillmentHandlerDependencies) {}

  /**
   * Execute mark partial fulfillment command
   * @param command - Raw command data
   * @returns Promise resolving to command result
   */
  public async execute(command: unknown): Promise<FulfillmentCommandResult> {
    try {
      // 1. Validate command structure
      const validatedCommand = validateMarkPartialFulfillmentCommand(command);

      // 2. Get order and validate it exists
      const order = await this.deps.orderRepository.findById(validatedCommand.orderId);
      if (!order) {
        return {
          success: false,
          error: `Order not found: ${validatedCommand.orderId}`,
        };
      }

      // 3. Mark partial fulfillment
      const previousStatus = order.fulfillmentStatus;
      const updatedOrder = order.markPartialFulfillment(
        validatedCommand.userId,
        validatedCommand.reason,
        validatedCommand.affectedItems
      );

      // 4. Save updated order
      const savedOrder = await this.deps.orderRepository.save(updatedOrder);

      return {
        success: true,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        previousStatus,
        newStatus: savedOrder.fulfillmentStatus,
      };
    } catch (error) {
      if (error instanceof FulfillmentStatusError) {
        return {
          success: false,
          error: error.message,
        };
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
        error: 'An unexpected error occurred while marking partial fulfillment',
      };
    }
  }
}

/**
 * Rollback Fulfillment Handler
 */
export class RollbackFulfillmentHandler {
  constructor(private readonly deps: FulfillmentHandlerDependencies) {}

  /**
   * Execute rollback fulfillment command
   * @param command - Raw command data
   * @returns Promise resolving to command result
   */
  public async execute(command: unknown): Promise<FulfillmentCommandResult> {
    try {
      // 1. Validate command structure
      const validatedCommand = validateRollbackFulfillmentCommand(command);

      // 2. Get order and validate it exists
      const order = await this.deps.orderRepository.findById(validatedCommand.orderId);
      if (!order) {
        return {
          success: false,
          error: `Order not found: ${validatedCommand.orderId}`,
        };
      }

      // 3. Check if rollback is allowed
      if (!order.canRollbackFulfillment()) {
        return {
          success: false,
          error: `Order ${order.orderNumber} cannot rollback fulfillment (current status: ${order.status}, fulfillment: ${order.fulfillmentStatus})`,
        };
      }

      // 4. Rollback fulfillment
      const previousStatus = order.fulfillmentStatus;
      const updatedOrder = order.rollbackFulfillment(
        validatedCommand.userId,
        validatedCommand.targetStatus,
        validatedCommand.reason
      );

      // 5. Save updated order
      const savedOrder = await this.deps.orderRepository.save(updatedOrder);

      return {
        success: true,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        previousStatus,
        newStatus: savedOrder.fulfillmentStatus,
      };
    } catch (error) {
      if (error instanceof FulfillmentStatusError) {
        return {
          success: false,
          error: error.message,
        };
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
        error: 'An unexpected error occurred while rolling back fulfillment',
      };
    }
  }
}
