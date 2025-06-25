/**
 * Order Repository Interface
 *
 * Domain repository interface for order persistence operations.
 * Defines the contract for order data access following Repository pattern.
 *
 * Features:
 * - CRUD operations for orders and order items
 * - Advanced search and filtering capabilities
 * - Order status and fulfillment tracking
 * - Customer order history
 * - Business analytics and reporting
 * - Multi-tenant agency isolation
 * - Pagination and sorting support
 *
 * @domain Order Management
 * @pattern Repository
 * @version 1.0.0
 */

import { Order, OrderStatus, OrderFulfillmentStatus, OrderPaymentStatus } from '../entities/order';

/**
 * Order search and filter criteria
 */
export interface OrderSearchCriteria {
  readonly agencyId: string;
  readonly customerId?: string;
  readonly customerCode?: string;
  readonly orderNumber?: string;
  readonly status?: OrderStatus[];
  readonly fulfillmentStatus?: OrderFulfillmentStatus[];
  readonly paymentStatus?: OrderPaymentStatus[];
  readonly workerId?: string;
  readonly areaId?: string;
  readonly productId?: string;
  readonly orderDateFrom?: Date;
  readonly orderDateTo?: Date;
  readonly deliveryDateFrom?: Date;
  readonly deliveryDateTo?: Date;
  readonly totalAmountMin?: number;
  readonly totalAmountMax?: number;
  readonly createdOffline?: boolean;
  readonly syncSessionId?: string;
  readonly searchText?: string; // Free text search in customer name, order number, notes
}

/**
 * Order sorting options
 */
export interface OrderSortOptions {
  readonly field: 'orderDate' | 'orderNumber' | 'customerName' | 'totalAmount' | 'status' | 'createdAt';
  readonly direction: 'ASC' | 'DESC';
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  readonly page: number;
  readonly limit: number;
}

/**
 * Paginated order result
 */
export interface PaginatedOrderResult {
  readonly orders: Order[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

/**
 * Order statistics interface
 */
export interface OrderStatistics {
  readonly totalOrders: number;
  readonly totalValue: number;
  readonly averageOrderValue: number;
  readonly pendingOrders: number;
  readonly confirmedOrders: number;
  readonly deliveredOrders: number;
  readonly cancelledOrders: number;
  readonly overdueOrders: number;
}

/**
 * Customer order summary
 */
export interface CustomerOrderSummary {
  readonly customerId: string;
  readonly customerCode: string;
  readonly customerName: string;
  readonly totalOrders: number;
  readonly totalValue: number;
  readonly averageOrderValue: number;
  readonly lastOrderDate: Date | null;
  readonly pendingOrdersCount: number;
  readonly overdueOrdersCount: number;
}

/**
 * Product sales summary
 */
export interface ProductSalesSummary {
  readonly productId: string;
  readonly productCode: string;
  readonly productName: string;
  readonly totalQuantityOrdered: number;
  readonly totalQuantityDelivered: number;
  readonly totalSalesValue: number;
  readonly orderCount: number;
  readonly averageOrderQuantity: number;
}

/**
 * Order repository error
 */
export class OrderRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'OrderRepositoryError';
  }
}

/**
 * Order repository interface
 */
export interface OrderRepository {
  /**
   * Save a new order
   * @param order - Order entity to save
   * @returns Promise resolving to saved order
   * @throws {OrderRepositoryError} When save operation fails
   */
  save(order: Order): Promise<Order>;

  /**
   * Update an existing order
   * @param order - Order entity with updates
   * @returns Promise resolving to updated order
   * @throws {OrderRepositoryError} When update operation fails
   */
  update(order: Order): Promise<Order>;

  /**
   * Find order by ID
   * @param id - Order ID
   * @param agencyId - Agency ID for multi-tenant isolation
   * @returns Promise resolving to order or null if not found
   * @throws {OrderRepositoryError} When query fails
   */
  findById(id: string, agencyId: string): Promise<Order | null>;

  /**
   * Find order by order number
   * @param orderNumber - Order number
   * @param agencyId - Agency ID for multi-tenant isolation
   * @returns Promise resolving to order or null if not found
   * @throws {OrderRepositoryError} When query fails
   */
  findByOrderNumber(orderNumber: string, agencyId: string): Promise<Order | null>;

  /**
   * Check if order number exists
   * @param orderNumber - Order number to check
   * @param agencyId - Agency ID for multi-tenant isolation
   * @param excludeOrderId - Order ID to exclude from check (for updates)
   * @returns Promise resolving to true if exists
   * @throws {OrderRepositoryError} When query fails
   */
  existsByOrderNumber(orderNumber: string, agencyId: string, excludeOrderId?: string): Promise<boolean>;

  /**
   * Delete order by ID
   * @param id - Order ID
   * @param agencyId - Agency ID for multi-tenant isolation
   * @returns Promise resolving to true if deleted
   * @throws {OrderRepositoryError} When delete operation fails
   */
  deleteById(id: string, agencyId: string): Promise<boolean>;

  /**
   * Search orders with criteria
   * @param criteria - Search criteria
   * @param sort - Sort options
   * @param pagination - Pagination options
   * @returns Promise resolving to paginated order results
   * @throws {OrderRepositoryError} When search fails
   */
  search(
    criteria: OrderSearchCriteria,
    sort?: OrderSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedOrderResult>;

  /**
   * Find orders by customer ID
   * @param customerId - Customer ID
   * @param agencyId - Agency ID for multi-tenant isolation
   * @param limit - Maximum number of orders to return
   * @returns Promise resolving to customer orders
   * @throws {OrderRepositoryError} When query fails
   */
  findByCustomerId(customerId: string, agencyId: string, limit?: number): Promise<Order[]>;

  /**
   * Find orders by worker ID
   * @param workerId - Worker ID
   * @param agencyId - Agency ID for multi-tenant isolation
   * @param dateFrom - Date range start
   * @param dateTo - Date range end
   * @returns Promise resolving to worker orders
   * @throws {OrderRepositoryError} When query fails
   */
  findByWorkerId(workerId: string, agencyId: string, dateFrom?: Date, dateTo?: Date): Promise<Order[]>;

  /**
   * Find orders by area ID
   * @param areaId - Area ID
   * @param agencyId - Agency ID for multi-tenant isolation
   * @param dateFrom - Date range start
   * @param dateTo - Date range end
   * @returns Promise resolving to area orders
   * @throws {OrderRepositoryError} When query fails
   */
  findByAreaId(areaId: string, agencyId: string, dateFrom?: Date, dateTo?: Date): Promise<Order[]>;

  /**
   * Find pending orders
   * @param agencyId - Agency ID for multi-tenant isolation
   * @param limit - Maximum number of orders to return
   * @returns Promise resolving to pending orders
   * @throws {OrderRepositoryError} When query fails
   */
  findPendingOrders(agencyId: string, limit?: number): Promise<Order[]>;

  /**
   * Find overdue orders
   * @param agencyId - Agency ID for multi-tenant isolation
   * @param asOfDate - Date to check for overdue (defaults to current date)
   * @returns Promise resolving to overdue orders
   * @throws {OrderRepositoryError} When query fails
   */
  findOverdueOrders(agencyId: string, asOfDate?: Date): Promise<Order[]>;

  /**
   * Find orders requiring fulfillment
   * @param agencyId - Agency ID for multi-tenant isolation
   * @param limit - Maximum number of orders to return
   * @returns Promise resolving to orders requiring fulfillment
   * @throws {OrderRepositoryError} When query fails
   */
  findOrdersRequiringFulfillment(agencyId: string, limit?: number): Promise<Order[]>;

  /**
   * Get order statistics
   * @param agencyId - Agency ID for multi-tenant isolation
   * @param dateFrom - Date range start
   * @param dateTo - Date range end
   * @returns Promise resolving to order statistics
   * @throws {OrderRepositoryError} When query fails
   */
  getOrderStatistics(agencyId: string, dateFrom?: Date, dateTo?: Date): Promise<OrderStatistics>;

  /**
   * Get customer order summaries
   * @param agencyId - Agency ID for multi-tenant isolation
   * @param dateFrom - Date range start
   * @param dateTo - Date range end
   * @param limit - Maximum number of customers to return
   * @returns Promise resolving to customer order summaries
   * @throws {OrderRepositoryError} When query fails
   */
  getCustomerOrderSummaries(
    agencyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit?: number
  ): Promise<CustomerOrderSummary[]>;

  /**
   * Get product sales summaries
   * @param agencyId - Agency ID for multi-tenant isolation
   * @param dateFrom - Date range start
   * @param dateTo - Date range end
   * @param limit - Maximum number of products to return
   * @returns Promise resolving to product sales summaries
   * @throws {OrderRepositoryError} When query fails
   */
  getProductSalesSummaries(
    agencyId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit?: number
  ): Promise<ProductSalesSummary[]>;

  /**
   * Get next order number for agency
   * @param agencyId - Agency ID
   * @param prefix - Order number prefix (optional)
   * @returns Promise resolving to next available order number
   * @throws {OrderRepositoryError} When generation fails
   */
  getNextOrderNumber(agencyId: string, prefix?: string): Promise<string>;

  /**
   * Bulk update order statuses
   * @param orderIds - Array of order IDs
   * @param status - New status
   * @param userId - User performing the update
   * @param agencyId - Agency ID for multi-tenant isolation
   * @returns Promise resolving to number of updated orders
   * @throws {OrderRepositoryError} When bulk update fails
   */
  bulkUpdateStatus(orderIds: string[], status: OrderStatus, userId: string, agencyId: string): Promise<number>;

  /**
   * Bulk update fulfillment statuses
   * @param orderIds - Array of order IDs
   * @param fulfillmentStatus - New fulfillment status
   * @param userId - User performing the update
   * @param agencyId - Agency ID for multi-tenant isolation
   * @returns Promise resolving to number of updated orders
   * @throws {OrderRepositoryError} When bulk update fails
   */
  bulkUpdateFulfillmentStatus(
    orderIds: string[],
    fulfillmentStatus: OrderFulfillmentStatus,
    userId: string,
    agencyId: string
  ): Promise<number>;

  /**
   * Find orders containing specific product
   * @param productId - Product ID
   * @param agencyId - Agency ID for multi-tenant isolation
   * @param dateFrom - Date range start
   * @param dateTo - Date range end
   * @returns Promise resolving to orders containing the product
   * @throws {OrderRepositoryError} When query fails
   */
  findOrdersContainingProduct(productId: string, agencyId: string, dateFrom?: Date, dateTo?: Date): Promise<Order[]>;

  /**
   * Get orders created offline that need syncing
   * @param agencyId - Agency ID for multi-tenant isolation
   * @param mobileDeviceId - Mobile device ID (optional)
   * @returns Promise resolving to orders needing sync
   * @throws {OrderRepositoryError} When query fails
   */
  findOrdersNeedingSync(agencyId: string, mobileDeviceId?: string): Promise<Order[]>;

  /**
   * Mark orders as synced
   * @param orderIds - Array of order IDs
   * @param agencyId - Agency ID for multi-tenant isolation
   * @returns Promise resolving to number of updated orders
   * @throws {OrderRepositoryError} When update fails
   */
  markOrdersAsSynced(orderIds: string[], agencyId: string): Promise<number>;
}
