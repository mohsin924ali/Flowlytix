/**
 * Order Lot Allocation Repository Interface - Domain Layer
 * Step 1: Repository Layer Integration - Add lot allocation repository methods
 *
 * Defines the contract for OrderItemLotAllocation persistence operations.
 * Implementation will be provided by infrastructure layer.
 * Supports lot allocation tracking, persistence, and retrieval operations.
 *
 * @domain Repository Interface
 * @pattern Repository Pattern
 * @version 1.0.0
 */

import type { OrderItemLotAllocation } from '../entities/order-lot-allocation';

/**
 * Order lot allocation repository specific errors
 */
export class OrderLotAllocationRepositoryError extends Error {
  public readonly operation: string;
  public readonly cause: Error | undefined;

  constructor(message: string, operation: string, cause?: Error) {
    super(message);
    this.name = 'OrderLotAllocationRepositoryError';
    this.operation = operation;
    this.cause = cause;
  }
}

export class OrderLotAllocationNotFoundError extends OrderLotAllocationRepositoryError {
  constructor(identifier: string, identifierType: string = 'id') {
    super(`Order lot allocation not found: ${identifierType}=${identifier}`, 'find');
    this.name = 'OrderLotAllocationNotFoundError';
  }
}

export class OrderLotAllocationAlreadyExistsError extends OrderLotAllocationRepositoryError {
  constructor(orderItemId: string, lotBatchId: string) {
    super(`Order lot allocation already exists for order item ${orderItemId} and lot ${lotBatchId}`, 'save');
    this.name = 'OrderLotAllocationAlreadyExistsError';
  }
}

export class OrderLotAllocationConnectionError extends OrderLotAllocationRepositoryError {
  constructor(cause?: Error) {
    super('Database connection error in order lot allocation repository', 'connection', cause);
    this.name = 'OrderLotAllocationConnectionError';
  }
}

/**
 * Order lot allocation persistence interface for database operations
 */
export interface OrderLotAllocationPersistence {
  readonly id: string;
  readonly orderId: string;
  readonly orderItemId: string;
  readonly lotBatchId: string;
  readonly lotNumber: string;
  readonly batchNumber: string | null;
  readonly allocatedQuantity: number;
  readonly manufacturingDate: Date;
  readonly expiryDate: Date | null;
  readonly reservedAt: Date;
  readonly reservedBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

/**
 * Order lot allocation search criteria
 */
export interface OrderLotAllocationSearchCriteria {
  readonly orderId?: string;
  readonly orderItemId?: string;
  readonly lotBatchId?: string;
  readonly lotNumber?: string;
  readonly agencyId?: string; // For multi-tenant filtering
  readonly reservedBy?: string;
  readonly reservedAfter?: Date;
  readonly reservedBefore?: Date;
  readonly hasExpiringLots?: boolean; // Within 30 days
  readonly minAllocatedQuantity?: number;
  readonly maxAllocatedQuantity?: number;
  readonly sortBy?: 'reservedAt' | 'allocatedQuantity' | 'manufacturingDate' | 'expiryDate';
  readonly sortOrder?: 'ASC' | 'DESC';
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Order lot allocation search result with pagination metadata
 */
export interface OrderLotAllocationSearchResult {
  readonly allocations: readonly OrderItemLotAllocation[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

/**
 * Order lot allocation summary statistics
 */
export interface OrderLotAllocationStats {
  readonly totalAllocations: number;
  readonly totalAllocatedQuantity: number;
  readonly uniqueOrders: number;
  readonly uniqueLots: number;
  readonly averageAllocationsPerOrder: number;
  readonly averageQuantityPerAllocation: number;
  readonly allocationsWithExpiringLots: number;
  readonly oldestAllocation: Date | null;
  readonly newestAllocation: Date | null;
}

/**
 * Batch lot allocation operations for order creation
 */
export interface BatchLotAllocationOperation {
  readonly orderId: string;
  readonly allocations: readonly {
    readonly orderItemId: string;
    readonly lotBatchId: string;
    readonly lotNumber: string;
    readonly batchNumber: string | null;
    readonly allocatedQuantity: number;
    readonly manufacturingDate: Date;
    readonly expiryDate: Date | null;
    readonly reservedBy: string;
  }[];
}

/**
 * Order Lot Allocation Repository Interface
 *
 * Defines the contract for order lot allocation persistence operations.
 * Supports CRUD operations, searching, and batch operations for order processing.
 *
 * @interface IOrderLotAllocationRepository
 */
export interface IOrderLotAllocationRepository {
  /**
   * Save a new order lot allocation to the repository
   * @param allocation - Order lot allocation data
   * @returns Promise<OrderItemLotAllocation> - Saved allocation
   * @throws {OrderLotAllocationAlreadyExistsError} When allocation already exists
   * @throws {OrderLotAllocationRepositoryError} When save operation fails
   */
  save(allocation: OrderItemLotAllocation & { orderId: string; orderItemId: string }): Promise<OrderItemLotAllocation>;

  /**
   * Save multiple lot allocations in a batch operation
   * @param operation - Batch allocation operation data
   * @returns Promise<readonly OrderItemLotAllocation[]> - Saved allocations
   * @throws {OrderLotAllocationRepositoryError} When batch save operation fails
   */
  saveBatch(operation: BatchLotAllocationOperation): Promise<readonly OrderItemLotAllocation[]>;

  /**
   * Update an existing order lot allocation
   * @param id - Allocation ID
   * @param updates - Partial allocation updates
   * @returns Promise<OrderItemLotAllocation> - Updated allocation
   * @throws {OrderLotAllocationNotFoundError} When allocation doesn't exist
   * @throws {OrderLotAllocationRepositoryError} When update operation fails
   */
  update(
    id: string,
    updates: Partial<Pick<OrderItemLotAllocation, 'allocatedQuantity'>>
  ): Promise<OrderItemLotAllocation>;

  /**
   * Find order lot allocation by unique identifier
   * @param id - Allocation ID
   * @returns Promise<OrderItemLotAllocation | null> - Allocation or null if not found
   * @throws {OrderLotAllocationRepositoryError} When find operation fails
   */
  findById(id: string): Promise<OrderItemLotAllocation | null>;

  /**
   * Find all lot allocations for an order
   * @param orderId - Order ID
   * @returns Promise<readonly OrderItemLotAllocation[]> - Array of lot allocations for order
   * @throws {OrderLotAllocationRepositoryError} When find operation fails
   */
  findByOrderId(orderId: string): Promise<readonly OrderItemLotAllocation[]>;

  /**
   * Find all lot allocations for an order item
   * @param orderItemId - Order item ID
   * @returns Promise<readonly OrderItemLotAllocation[]> - Array of lot allocations for order item
   * @throws {OrderLotAllocationRepositoryError} When find operation fails
   */
  findByOrderItemId(orderItemId: string): Promise<readonly OrderItemLotAllocation[]>;

  /**
   * Find all lot allocations for a specific lot/batch
   * @param lotBatchId - Lot batch ID
   * @returns Promise<readonly OrderItemLotAllocation[]> - Array of lot allocations for lot
   * @throws {OrderLotAllocationRepositoryError} When find operation fails
   */
  findByLotBatchId(lotBatchId: string): Promise<readonly OrderItemLotAllocation[]>;

  /**
   * Find lot allocations by lot number
   * @param lotNumber - Lot number
   * @param agencyId - Agency ID for multi-tenant filtering (optional)
   * @returns Promise<readonly OrderItemLotAllocation[]> - Array of lot allocations for lot number
   * @throws {OrderLotAllocationRepositoryError} When find operation fails
   */
  findByLotNumber(lotNumber: string, agencyId?: string): Promise<readonly OrderItemLotAllocation[]>;

  /**
   * Find allocations with lots expiring within specified days
   * @param days - Number of days from now
   * @param agencyId - Agency ID for multi-tenant filtering (optional)
   * @returns Promise<readonly OrderItemLotAllocation[]> - Array of allocations with expiring lots
   * @throws {OrderLotAllocationRepositoryError} When find operation fails
   */
  findWithExpiringLots(days: number, agencyId?: string): Promise<readonly OrderItemLotAllocation[]>;

  /**
   * Find allocations by reserved user
   * @param userId - User ID
   * @param limit - Maximum number of allocations to return
   * @returns Promise<readonly OrderItemLotAllocation[]> - Array of allocations reserved by user
   * @throws {OrderLotAllocationRepositoryError} When find operation fails
   */
  findByReservedBy(userId: string, limit?: number): Promise<readonly OrderItemLotAllocation[]>;

  /**
   * Search lot allocations with filtering and pagination
   * @param criteria - Search criteria and pagination options
   * @returns Promise<OrderLotAllocationSearchResult> - Paginated search results
   * @throws {OrderLotAllocationRepositoryError} When search operation fails
   */
  search(criteria: OrderLotAllocationSearchCriteria): Promise<OrderLotAllocationSearchResult>;

  /**
   * Check if allocation exists for order item and lot batch
   * @param orderItemId - Order item ID
   * @param lotBatchId - Lot batch ID
   * @returns Promise<boolean> - True if allocation exists
   * @throws {OrderLotAllocationRepositoryError} When check operation fails
   */
  existsByOrderItemAndLot(orderItemId: string, lotBatchId: string): Promise<boolean>;

  /**
   * Count total number of lot allocations
   * @param agencyId - Agency ID for multi-tenant filtering (optional)
   * @returns Promise<number> - Total allocation count
   * @throws {OrderLotAllocationRepositoryError} When count operation fails
   */
  count(agencyId?: string): Promise<number>;

  /**
   * Count lot allocations by specific criteria
   * @param criteria - Count criteria
   * @returns Promise<number> - Count of matching allocations
   * @throws {OrderLotAllocationRepositoryError} When count operation fails
   */
  countByCriteria(criteria: Partial<OrderLotAllocationSearchCriteria>): Promise<number>;

  /**
   * Delete lot allocation by ID
   * @param id - Allocation ID
   * @returns Promise<boolean> - True if allocation was deleted
   * @throws {OrderLotAllocationNotFoundError} When allocation doesn't exist
   * @throws {OrderLotAllocationRepositoryError} When delete operation fails
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete all lot allocations for an order
   * @param orderId - Order ID
   * @returns Promise<number> - Number of allocations deleted
   * @throws {OrderLotAllocationRepositoryError} When delete operation fails
   */
  deleteByOrderId(orderId: string): Promise<number>;

  /**
   * Delete all lot allocations for an order item
   * @param orderItemId - Order item ID
   * @returns Promise<number> - Number of allocations deleted
   * @throws {OrderLotAllocationRepositoryError} When delete operation fails
   */
  deleteByOrderItemId(orderItemId: string): Promise<number>;

  /**
   * Get repository statistics for monitoring
   * @param agencyId - Agency ID for multi-tenant filtering (optional)
   * @returns Promise<OrderLotAllocationStats> - Repository statistics
   * @throws {OrderLotAllocationRepositoryError} When stats operation fails
   */
  getStats(agencyId?: string): Promise<OrderLotAllocationStats>;

  /**
   * Check repository health and connectivity
   * @returns Promise<boolean> - True if repository is healthy
   */
  isHealthy(): Promise<boolean>;
}
