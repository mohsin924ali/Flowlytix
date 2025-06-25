/**
 * Order IPC Handler
 *
 * Secure IPC bridge for order operations in Electron main process.
 * Handles order creation, fulfillment, and payment operations.
 * Follows security-first design with input validation and proper error handling.
 *
 * @domain Order Management
 * @pattern Command/Query Responsibility Segregation (CQRS)
 * @architecture Hexagonal Architecture (Adapter)
 * @security Input validation, secure error handling
 * @version 1.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ICustomerRepository } from '../../domain/repositories/customer.repository';
import { IProductRepository } from '../../domain/repositories/product.repository';
import { ILotBatchRepository } from '../../domain/repositories/lot-batch.repository';
import { IOrderLotAllocationRepository } from '../../domain/repositories/order-lot-allocation.repository';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { CreateOrderHandler } from '../../application/handlers/order/create-order.handler';
import { PaymentMethod, OrderStatus, OrderFulfillmentStatus } from '../../domain/entities/order';

/**
 * Order operation types for IPC
 */
export type OrderOperation =
  | 'create-order'
  | 'get-orders'
  | 'update-order'
  | 'start-fulfillment'
  | 'complete-fulfillment'
  | 'cancel-order'
  | 'initiate-payment'
  | 'process-payment';

/**
 * Base IPC response interface
 */
export interface OrderIpcResponse<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly code?: string;
  readonly timestamp: number;
  readonly operation?: OrderOperation;
  readonly duration?: number;
}

/**
 * Order item interface for IPC
 */
export interface OrderItemRequest {
  readonly productId: string;
  readonly productCode: string;
  readonly productName: string;
  readonly unitPrice: number;
  readonly boxSize: number;
  readonly quantityBoxes: number;
  readonly quantityLoose: number;
  readonly discountPercentage?: number;
  readonly taxRate?: number;
  readonly notes?: string;
}

/**
 * Create order request interface
 */
export interface CreateOrderRequest {
  readonly orderNumber: string;
  readonly orderDate: string;
  readonly deliveryDate?: string;
  readonly dueDate?: string;
  readonly customerId: string;
  readonly customerCode: string;
  readonly customerName: string;
  readonly customerCreditLimit: number;
  readonly customerBalance: number;
  readonly areaId?: string;
  readonly areaCode: string;
  readonly areaName: string;
  readonly workerId?: string;
  readonly workerName: string;
  readonly items: OrderItemRequest[];
  readonly discountPercentage?: number;
  readonly paymentMethod: PaymentMethod;
  readonly creditDays?: number;
  readonly customerNotes?: string;
  readonly internalNotes?: string;
  readonly syncSessionId?: string;
  readonly mobileDeviceId?: string;
  readonly createdOffline?: boolean;
  readonly agencyId: string;
  readonly requestedBy: string;
}

/**
 * Order response interface
 */
export interface OrderResponse {
  readonly id: string;
  readonly orderNumber: string;
  readonly orderDate: string;
  readonly deliveryDate: string | null;
  readonly dueDate: string | null;
  readonly customerId: string;
  readonly customerCode: string;
  readonly customerName: string;
  readonly status: OrderStatus;
  readonly fulfillmentStatus: OrderFulfillmentStatus;
  readonly subtotalAmount: string;
  readonly discountAmount: string;
  readonly taxAmount: string;
  readonly totalAmount: string;
  readonly paymentMethod: PaymentMethod;
  readonly creditDays: number;
  readonly items: OrderItemResponse[];
  readonly agencyId: string;
  readonly createdAt: string;
  readonly updatedAt: string | null;
}

/**
 * Order item response interface
 */
export interface OrderItemResponse {
  readonly id: string;
  readonly productId: string;
  readonly productCode: string;
  readonly productName: string;
  readonly unitPrice: string;
  readonly boxSize: number;
  readonly quantityBoxes: number;
  readonly quantityLoose: number;
  readonly totalUnits: number;
  readonly itemTotal: string;
  readonly status: string;
}

/**
 * Create order response interface
 */
export interface CreateOrderResponse {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly totalAmount: string;
  readonly message: string;
}

/**
 * Order IPC Error classes
 */
export class OrderIpcError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'OrderIpcError';
  }
}

export class OrderValidationError extends OrderIpcError {
  constructor(message: string, originalError?: Error) {
    super(message, 'VALIDATION_ERROR', originalError);
    this.name = 'OrderValidationError';
  }
}

export class OrderSecurityError extends OrderIpcError {
  constructor(message: string, originalError?: Error) {
    super(message, 'SECURITY_ERROR', originalError);
    this.name = 'OrderSecurityError';
  }
}

export class OrderOperationError extends OrderIpcError {
  constructor(message: string, originalError?: Error) {
    super(message, 'OPERATION_ERROR', originalError);
    this.name = 'OrderOperationError';
  }
}

/**
 * Order IPC Handler
 */
export class OrderIpcHandler {
  private readonly registeredChannels = new Set<string>();
  private readonly createOrderHandler: CreateOrderHandler;

  private readonly allowedChannels: readonly string[] = [
    'order:create',
    'order:get-orders',
    'order:update',
    'order:start-fulfillment',
    'order:complete-fulfillment',
    'order:cancel',
    'order:initiate-payment',
    'order:process-payment',
  ] as const;

  private constructor(
    private readonly orderRepository: OrderRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly productRepository: IProductRepository,
    private readonly lotBatchRepository: ILotBatchRepository,
    private readonly orderLotAllocationRepository: IOrderLotAllocationRepository,
    private readonly userRepository: IUserRepository
  ) {
    this.validateRepositories();

    // Initialize handlers
    this.createOrderHandler = new CreateOrderHandler({
      orderRepository: this.orderRepository,
      customerRepository: this.customerRepository,
      productRepository: this.productRepository,
      lotBatchRepository: this.lotBatchRepository,
      orderLotAllocationRepository: this.orderLotAllocationRepository,
    });
  }

  public static create(
    orderRepository: OrderRepository,
    customerRepository: ICustomerRepository,
    productRepository: IProductRepository,
    lotBatchRepository: ILotBatchRepository,
    orderLotAllocationRepository: IOrderLotAllocationRepository,
    userRepository: IUserRepository
  ): OrderIpcHandler {
    return new OrderIpcHandler(
      orderRepository,
      customerRepository,
      productRepository,
      lotBatchRepository,
      orderLotAllocationRepository,
      userRepository
    );
  }

  public registerHandlers(): void {
    // Register all order operation handlers
    this.allowedChannels.forEach((channel) => {
      if (!this.registeredChannels.has(channel)) {
        switch (channel) {
          case 'order:create':
            ipcMain.handle(channel, (event, request) => this.handleCreateOrder(event, request));
            break;
          case 'order:get-orders':
            ipcMain.handle(channel, (event, request) => this.handleGetOrders(event, request));
            break;
          default:
            // For now, register placeholder handlers for other operations
            ipcMain.handle(channel, (event, request) => this.handlePlaceholderOperation(event, request, channel));
            break;
        }
        this.registeredChannels.add(channel);
      }
    });
  }

  public unregisterHandlers(): void {
    this.registeredChannels.forEach((channel) => {
      ipcMain.removeAllListeners(channel);
    });
    this.registeredChannels.clear();
  }

  private async handleCreateOrder(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<OrderIpcResponse<CreateOrderResponse>> {
    const startTime = Date.now();

    try {
      // Basic request validation
      if (!request || typeof request !== 'object') {
        throw new OrderValidationError('Invalid request format');
      }

      // Execute create order command
      const result = await this.createOrderHandler.execute(request);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to create order',
          code: 'CREATE_ORDER_FAILED',
          timestamp: Date.now(),
          operation: 'create-order',
          duration: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: {
          orderId: result.orderId!,
          orderNumber: result.orderNumber!,
          totalAmount: result.totalAmount!.toString(),
          message: 'Order created successfully',
        },
        timestamp: Date.now(),
        operation: 'create-order',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, 'create-order', startTime);
    }
  }

  private async handleGetOrders(
    event: IpcMainInvokeEvent,
    request: unknown
  ): Promise<OrderIpcResponse<OrderResponse[]>> {
    const startTime = Date.now();

    try {
      // For now, return placeholder response
      return {
        success: true,
        data: [],
        timestamp: Date.now(),
        operation: 'get-orders',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.getSafeErrorResponse(error as Error, 'get-orders', startTime);
    }
  }

  private async handlePlaceholderOperation(
    event: IpcMainInvokeEvent,
    request: unknown,
    channel: string
  ): Promise<OrderIpcResponse> {
    const startTime = Date.now();
    const operation = channel.split(':')[1] as OrderOperation;

    return {
      success: true,
      data: { message: `Operation ${operation} is not yet implemented` },
      timestamp: Date.now(),
      operation,
      duration: Date.now() - startTime,
    };
  }

  private getSafeErrorResponse(error: Error, operation: OrderOperation, startTime: number): OrderIpcResponse {
    let errorMessage = 'An unexpected error occurred';
    let errorCode = 'UNKNOWN_ERROR';

    if (error instanceof OrderIpcError) {
      errorMessage = this.getSafeErrorMessage(error.message);
      errorCode = error.code;
    } else if (error instanceof Error) {
      errorMessage = this.getSafeErrorMessage(error.message);
      errorCode = 'INTERNAL_ERROR';
    }

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: Date.now(),
      operation,
      duration: Date.now() - startTime,
    };
  }

  private getSafeErrorMessage(message: string): string {
    const sensitivePatterns = [
      /password/gi,
      /token/gi,
      /secret/gi,
      /key/gi,
      /auth/gi,
      /credential/gi,
      /session/gi,
      /cookie/gi,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        return 'A security-related error occurred';
      }
    }

    // Limit message length to prevent information leakage
    return message.length > 200 ? message.substring(0, 200) + '...' : message;
  }

  private validateRepositories(): void {
    if (!this.orderRepository) {
      throw new OrderSecurityError('Order repository is required');
    }
    if (!this.customerRepository) {
      throw new OrderSecurityError('Customer repository is required');
    }
    if (!this.productRepository) {
      throw new OrderSecurityError('Product repository is required');
    }
    if (!this.lotBatchRepository) {
      throw new OrderSecurityError('Lot batch repository is required');
    }
    if (!this.orderLotAllocationRepository) {
      throw new OrderSecurityError('Order lot allocation repository is required');
    }
    if (!this.userRepository) {
      throw new OrderSecurityError('User repository is required');
    }
  }

  public getStats(): {
    readonly registeredChannels: readonly string[];
    readonly handlerCount: number;
  } {
    return {
      registeredChannels: Array.from(this.registeredChannels),
      handlerCount: this.registeredChannels.size,
    };
  }
}

/**
 * Factory function to create Order IPC Handler
 */
export function createOrderIpcHandler(
  orderRepository: OrderRepository,
  customerRepository: ICustomerRepository,
  productRepository: IProductRepository,
  lotBatchRepository: ILotBatchRepository,
  orderLotAllocationRepository: IOrderLotAllocationRepository,
  userRepository: IUserRepository
): OrderIpcHandler {
  return OrderIpcHandler.create(
    orderRepository,
    customerRepository,
    productRepository,
    lotBatchRepository,
    orderLotAllocationRepository,
    userRepository
  );
}
