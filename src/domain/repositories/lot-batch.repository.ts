/**
 * Lot/Batch Repository Interface - Domain Layer
 *
 * Defines the contract for Lot/Batch entity persistence operations in a multi-tenant environment.
 * Implementation will be provided by infrastructure layer.
 * Supports comprehensive lot tracking, FIFO selection, and expiry management.
 *
 * @domain Repository Interface
 * @pattern Repository Pattern
 * @version 1.0.0
 */

import type { LotBatch, LotStatus } from '../value-objects/lot-batch';

/**
 * Lot/Batch repository specific errors
 */
export class LotBatchRepositoryError extends Error {
  public readonly operation: string;
  public readonly cause: Error | undefined;

  constructor(message: string, operation: string, cause?: Error) {
    super(message);
    this.name = 'LotBatchRepositoryError';
    this.operation = operation;
    this.cause = cause;
  }
}

export class LotBatchNotFoundError extends LotBatchRepositoryError {
  constructor(identifier: string, identifierType: string = 'id') {
    super(`Lot/Batch not found with ${identifierType}: ${identifier}`, 'find');
    this.name = 'LotBatchNotFoundError';
  }
}

export class LotBatchAlreadyExistsError extends LotBatchRepositoryError {
  constructor(identifier: string, identifierType: string = 'lotNumber') {
    super(`Lot/Batch already exists with ${identifierType}: ${identifier}`, 'save');
    this.name = 'LotBatchAlreadyExistsError';
  }
}

export class LotBatchRepositoryConnectionError extends LotBatchRepositoryError {
  constructor(message: string, cause?: Error) {
    super(message, 'connection', cause);
    this.name = 'LotBatchRepositoryConnectionError';
  }
}

export class InsufficientLotQuantityError extends LotBatchRepositoryError {
  constructor(lotId: string, requested: number, available: number) {
    super(`Insufficient lot quantity: requested ${requested}, available ${available}`, 'reserve');
    this.name = 'InsufficientLotQuantityError';
  }
}

/**
 * Lot/Batch search criteria for filtering and pagination
 */
export interface LotBatchSearchCriteria {
  // Text search
  readonly searchTerm?: string; // Searches in lotNumber, batchNumber, supplierLotCode
  readonly lotNumber?: string; // Exact lot number match
  readonly batchNumber?: string; // Exact batch number match
  readonly supplierLotCode?: string; // Supplier lot code filter

  // Association filtering
  readonly productId?: string | string[]; // Product ID(s)
  readonly agencyId?: string | string[]; // Agency ID(s)
  readonly supplierId?: string | string[]; // Supplier ID(s)
  readonly createdBy?: string | string[]; // Created by user ID(s)

  // Status filtering
  readonly status?: LotStatus | LotStatus[];
  readonly isActive?: boolean; // Active status only
  readonly isExpired?: boolean; // Expired lots only
  readonly isAvailable?: boolean; // Available for sale (status and quantity)

  // Quantity filtering
  readonly hasQuantity?: boolean; // Has remaining quantity > 0
  readonly minQuantity?: number; // Minimum remaining quantity
  readonly maxQuantity?: number; // Maximum remaining quantity
  readonly hasReservedQuantity?: boolean; // Has reserved quantity > 0

  // Date range filtering
  readonly manufacturingDateAfter?: Date;
  readonly manufacturingDateBefore?: Date;
  readonly expiryDateAfter?: Date;
  readonly expiryDateBefore?: Date;
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly updatedAfter?: Date;
  readonly updatedBefore?: Date;

  // Expiry filtering
  readonly expiringWithinDays?: number; // Expiring within X days
  readonly nearExpiryDays?: number; // Near expiry threshold (default: 30 days)

  // Pagination
  readonly limit?: number; // Default: 100, Max: 10000
  readonly offset?: number; // Default: 0

  // Sorting
  readonly sortBy?:
    | 'lotNumber'
    | 'batchNumber'
    | 'manufacturingDate'
    | 'expiryDate'
    | 'status'
    | 'remainingQuantity'
    | 'createdAt'
    | 'updatedAt';
  readonly sortOrder?: 'ASC' | 'DESC'; // Default: ASC

  // FIFO selection (First In, First Out)
  readonly fifoOrder?: boolean; // Sort by manufacturing date for FIFO selection
}

/**
 * Lot/Batch search result with pagination metadata
 */
export interface LotBatchSearchResult {
  readonly lotBatches: readonly LotBatch[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

/**
 * Lot/Batch repository statistics for monitoring
 */
export interface LotBatchRepositoryStats {
  readonly totalLots: number;
  readonly activeLots: number;
  readonly expiredLots: number;
  readonly quarantineLots: number;
  readonly consumedLots: number;
  readonly totalQuantity: number;
  readonly availableQuantity: number;
  readonly reservedQuantity: number;
  readonly nearExpiryLots: number; // Expiring within 30 days
  readonly averageLotsPerProduct: number;
  readonly oldestLot: Date | null;
  readonly newestLot: Date | null;
}

/**
 * FIFO lot selection criteria for automatic lot selection
 */
export interface FifoLotSelectionCriteria {
  readonly productId: string;
  readonly agencyId: string;
  readonly requestedQuantity: number;
  readonly excludeStatuses?: LotStatus[]; // Exclude specific statuses (default: exclude expired, damaged, recalled)
  readonly includeReserved?: boolean; // Include reserved lots (default: false)
  readonly maxExpiryDate?: Date; // Only select lots expiring before this date
}

/**
 * FIFO lot selection result
 */
export interface FifoLotSelectionResult {
  readonly selectedLots: readonly {
    readonly lotBatch: LotBatch;
    readonly allocatedQuantity: number;
  }[];
  readonly totalAllocatedQuantity: number;
  readonly remainingQuantity: number; // Unfulfilled quantity
  readonly hasFullAllocation: boolean;
}

/**
 * Lot quantity adjustment operation
 */
export interface LotQuantityAdjustment {
  readonly lotBatchId: string;
  readonly quantityChange: number; // Positive for increase, negative for decrease
  readonly reason: string;
  readonly referenceId?: string; // Optional reference to order, transfer, etc.
  readonly referenceType?: 'ORDER' | 'TRANSFER' | 'ADJUSTMENT' | 'DAMAGE' | 'EXPIRY' | 'RETURN';
  readonly notes?: string;
  readonly adjustedBy: string;
}

/**
 * Lot/Batch repository transaction interface for atomic operations
 */
export interface ILotBatchRepositoryTransaction {
  /**
   * Save lot/batch within transaction
   */
  save(lotBatch: LotBatch): Promise<LotBatch>;

  /**
   * Update lot/batch within transaction
   */
  update(lotBatch: LotBatch): Promise<LotBatch>;

  /**
   * Delete lot/batch within transaction
   */
  delete(id: string): Promise<boolean>;

  /**
   * Reserve quantity within transaction
   */
  reserveQuantity(lotBatchId: string, quantity: number, userId: string): Promise<LotBatch>;

  /**
   * Release reserved quantity within transaction
   */
  releaseReservedQuantity(lotBatchId: string, quantity: number, userId: string): Promise<LotBatch>;

  /**
   * Consume quantity within transaction
   */
  consumeQuantity(lotBatchId: string, quantity: number, userId: string): Promise<LotBatch>;

  /**
   * Commit transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback transaction
   */
  rollback(): Promise<void>;

  /**
   * Check if transaction is active
   */
  isActive(): boolean;
}

/**
 * Lot/Batch Repository Interface
 *
 * Defines the contract for Lot/Batch entity persistence operations.
 * Supports comprehensive lot tracking, FIFO selection, and expiry management.
 *
 * @interface ILotBatchRepository
 */
export interface ILotBatchRepository {
  /**
   * Save a new lot/batch to the repository
   * @param lotBatch - LotBatch entity to save
   * @returns Promise<LotBatch> - Saved lot/batch with updated metadata
   * @throws {LotBatchAlreadyExistsError} When lot/batch with same lotNumber already exists for product
   * @throws {LotBatchRepositoryError} When save operation fails
   */
  save(lotBatch: LotBatch): Promise<LotBatch>;

  /**
   * Update an existing lot/batch in the repository
   * @param lotBatch - LotBatch entity with updates
   * @returns Promise<LotBatch> - Updated lot/batch entity
   * @throws {LotBatchNotFoundError} When lot/batch doesn't exist
   * @throws {LotBatchRepositoryError} When update operation fails
   */
  update(lotBatch: LotBatch): Promise<LotBatch>;

  /**
   * Find lot/batch by unique identifier
   * @param id - Lot/Batch ID
   * @returns Promise<LotBatch | null> - LotBatch entity or null if not found
   * @throws {LotBatchRepositoryError} When find operation fails
   */
  findById(id: string): Promise<LotBatch | null>;

  /**
   * Find lot/batch by lot number within product and agency
   * @param lotNumber - Lot number
   * @param productId - Product ID
   * @param agencyId - Agency ID
   * @returns Promise<LotBatch | null> - LotBatch entity or null if not found
   * @throws {LotBatchRepositoryError} When find operation fails
   */
  findByLotNumber(lotNumber: string, productId: string, agencyId: string): Promise<LotBatch | null>;

  /**
   * Find lot/batch by lot and batch number within product and agency
   * @param lotNumber - Lot number
   * @param batchNumber - Batch number
   * @param productId - Product ID
   * @param agencyId - Agency ID
   * @returns Promise<LotBatch | null> - LotBatch entity or null if not found
   * @throws {LotBatchRepositoryError} When find operation fails
   */
  findByLotAndBatchNumber(
    lotNumber: string,
    batchNumber: string,
    productId: string,
    agencyId: string
  ): Promise<LotBatch | null>;

  /**
   * Check if lot/batch exists by lot number
   * @param lotNumber - Lot number
   * @param productId - Product ID
   * @param agencyId - Agency ID
   * @returns Promise<boolean> - True if lot/batch exists
   * @throws {LotBatchRepositoryError} When check operation fails
   */
  existsByLotNumber(lotNumber: string, productId: string, agencyId: string): Promise<boolean>;

  /**
   * Check if lot/batch exists by lot and batch number
   * @param lotNumber - Lot number
   * @param batchNumber - Batch number
   * @param productId - Product ID
   * @param agencyId - Agency ID
   * @returns Promise<boolean> - True if lot/batch exists
   * @throws {LotBatchRepositoryError} When check operation fails
   */
  existsByLotAndBatchNumber(
    lotNumber: string,
    batchNumber: string,
    productId: string,
    agencyId: string
  ): Promise<boolean>;

  /**
   * Search lot/batches with filtering and pagination
   * @param criteria - Search criteria and pagination options
   * @returns Promise<LotBatchSearchResult> - Paginated search results
   * @throws {LotBatchRepositoryError} When search operation fails
   */
  search(criteria: LotBatchSearchCriteria): Promise<LotBatchSearchResult>;

  /**
   * Find all lot/batches for a product
   * @param productId - Product ID
   * @param agencyId - Agency ID
   * @param limit - Maximum number of lot/batches to return
   * @returns Promise<readonly LotBatch[]> - Array of lot/batches for product
   * @throws {LotBatchRepositoryError} When find operation fails
   */
  findByProduct(productId: string, agencyId: string, limit?: number): Promise<readonly LotBatch[]>;

  /**
   * Find all lot/batches for an agency
   * @param agencyId - Agency ID
   * @param limit - Maximum number of lot/batches to return
   * @returns Promise<readonly LotBatch[]> - Array of lot/batches for agency
   * @throws {LotBatchRepositoryError} When find operation fails
   */
  findByAgency(agencyId: string, limit?: number): Promise<readonly LotBatch[]>;

  /**
   * Find lot/batches by status
   * @param status - Lot status
   * @param agencyId - Agency ID (optional)
   * @param limit - Maximum number of lot/batches to return
   * @returns Promise<readonly LotBatch[]> - Array of lot/batches with specified status
   * @throws {LotBatchRepositoryError} When find operation fails
   */
  findByStatus(status: LotStatus, agencyId?: string, limit?: number): Promise<readonly LotBatch[]>;

  /**
   * Find active lot/batches (available for sale)
   * @param agencyId - Agency ID (optional)
   * @param limit - Maximum number of lot/batches to return
   * @returns Promise<readonly LotBatch[]> - Array of active lot/batches
   * @throws {LotBatchRepositoryError} When find operation fails
   */
  findActive(agencyId?: string, limit?: number): Promise<readonly LotBatch[]>;

  /**
   * Find expired lot/batches
   * @param agencyId - Agency ID (optional)
   * @param limit - Maximum number of lot/batches to return
   * @returns Promise<readonly LotBatch[]> - Array of expired lot/batches
   * @throws {LotBatchRepositoryError} When find operation fails
   */
  findExpired(agencyId?: string, limit?: number): Promise<readonly LotBatch[]>;

  /**
   * Find lot/batches expiring within specified days
   * @param days - Number of days from now
   * @param agencyId - Agency ID (optional)
   * @param limit - Maximum number of lot/batches to return
   * @returns Promise<readonly LotBatch[]> - Array of lot/batches expiring soon
   * @throws {LotBatchRepositoryError} When find operation fails
   */
  findExpiringWithinDays(days: number, agencyId?: string, limit?: number): Promise<readonly LotBatch[]>;

  /**
   * Find lot/batches using FIFO order (First In, First Out)
   * @param productId - Product ID
   * @param agencyId - Agency ID
   * @param limit - Maximum number of lot/batches to return
   * @returns Promise<readonly LotBatch[]> - Array of lot/batches in FIFO order
   * @throws {LotBatchRepositoryError} When find operation fails
   */
  findFifoOrder(productId: string, agencyId: string, limit?: number): Promise<readonly LotBatch[]>;

  /**
   * Select lots using FIFO algorithm for quantity allocation
   * @param criteria - FIFO selection criteria
   * @returns Promise<FifoLotSelectionResult> - FIFO selection result with allocated lots
   * @throws {LotBatchRepositoryError} When selection operation fails
   */
  selectFifoLots(criteria: FifoLotSelectionCriteria): Promise<FifoLotSelectionResult>;

  /**
   * Reserve quantity in lot/batch
   * @param lotBatchId - Lot/Batch ID
   * @param quantity - Quantity to reserve
   * @param userId - User ID performing the reservation
   * @returns Promise<LotBatch> - Updated lot/batch entity
   * @throws {LotBatchNotFoundError} When lot/batch doesn't exist
   * @throws {InsufficientLotQuantityError} When insufficient quantity available
   * @throws {LotBatchRepositoryError} When reserve operation fails
   */
  reserveQuantity(lotBatchId: string, quantity: number, userId: string): Promise<LotBatch>;

  /**
   * Release reserved quantity in lot/batch
   * @param lotBatchId - Lot/Batch ID
   * @param quantity - Quantity to release
   * @param userId - User ID performing the release
   * @returns Promise<LotBatch> - Updated lot/batch entity
   * @throws {LotBatchNotFoundError} When lot/batch doesn't exist
   * @throws {LotBatchRepositoryError} When release operation fails
   */
  releaseReservedQuantity(lotBatchId: string, quantity: number, userId: string): Promise<LotBatch>;

  /**
   * Consume quantity from lot/batch
   * @param lotBatchId - Lot/Batch ID
   * @param quantity - Quantity to consume
   * @param userId - User ID performing the consumption
   * @returns Promise<LotBatch> - Updated lot/batch entity
   * @throws {LotBatchNotFoundError} When lot/batch doesn't exist
   * @throws {InsufficientLotQuantityError} When insufficient quantity available
   * @throws {LotBatchRepositoryError} When consume operation fails
   */
  consumeQuantity(lotBatchId: string, quantity: number, userId: string): Promise<LotBatch>;

  /**
   * Adjust lot/batch quantity (increase or decrease)
   * @param adjustment - Quantity adjustment details
   * @returns Promise<LotBatch> - Updated lot/batch entity
   * @throws {LotBatchNotFoundError} When lot/batch doesn't exist
   * @throws {LotBatchRepositoryError} When adjustment operation fails
   */
  adjustQuantity(adjustment: LotQuantityAdjustment): Promise<LotBatch>;

  /**
   * Update lot/batch status
   * @param lotBatchId - Lot/Batch ID
   * @param status - New status
   * @param userId - User ID performing the update
   * @param reason - Reason for status change (optional)
   * @returns Promise<LotBatch> - Updated lot/batch entity
   * @throws {LotBatchNotFoundError} When lot/batch doesn't exist
   * @throws {LotBatchRepositoryError} When status update fails
   */
  updateStatus(lotBatchId: string, status: LotStatus, userId: string, reason?: string): Promise<LotBatch>;

  /**
   * Count total number of lot/batches
   * @param agencyId - Agency ID (optional)
   * @returns Promise<number> - Total lot/batch count
   * @throws {LotBatchRepositoryError} When count operation fails
   */
  count(agencyId?: string): Promise<number>;

  /**
   * Count lot/batches by specific criteria
   * @param criteria - Count criteria
   * @returns Promise<number> - Count of matching lot/batches
   * @throws {LotBatchRepositoryError} When count operation fails
   */
  countByCriteria(criteria: Partial<LotBatchSearchCriteria>): Promise<number>;

  /**
   * Delete lot/batch by ID (hard delete - removes lot/batch and all related data)
   * WARNING: This is destructive and will remove all lot/batch movement history
   * @param id - Lot/Batch ID
   * @returns Promise<boolean> - True if lot/batch was deleted
   * @throws {LotBatchNotFoundError} When lot/batch doesn't exist
   * @throws {LotBatchRepositoryError} When delete operation fails
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get repository statistics for monitoring
   * @param agencyId - Agency ID (optional)
   * @returns Promise<LotBatchRepositoryStats> - Repository statistics
   * @throws {LotBatchRepositoryError} When stats operation fails
   */
  getStats(agencyId?: string): Promise<LotBatchRepositoryStats>;

  /**
   * Check repository health and connectivity
   * @returns Promise<boolean> - True if repository is healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Begin transaction for atomic operations
   * @returns Promise<ILotBatchRepositoryTransaction> - Transaction context
   * @throws {LotBatchRepositoryError} When transaction start fails
   */
  beginTransaction(): Promise<ILotBatchRepositoryTransaction>;

  /**
   * Expire lot/batches that have passed their expiry date
   * @param agencyId - Agency ID (optional)
   * @param userId - User ID performing the expiry update
   * @returns Promise<number> - Number of lots expired
   * @throws {LotBatchRepositoryError} When expiry operation fails
   */
  expireOverdueLots(agencyId?: string, userId?: string): Promise<number>;

  /**
   * Get available quantity for a product across all lots
   * @param productId - Product ID
   * @param agencyId - Agency ID
   * @returns Promise<number> - Total available quantity
   * @throws {LotBatchRepositoryError} When quantity calculation fails
   */
  getAvailableQuantityForProduct(productId: string, agencyId: string): Promise<number>;

  /**
   * Get reserved quantity for a product across all lots
   * @param productId - Product ID
   * @param agencyId - Agency ID
   * @returns Promise<number> - Total reserved quantity
   * @throws {LotBatchRepositoryError} When quantity calculation fails
   */
  getReservedQuantityForProduct(productId: string, agencyId: string): Promise<number>;
}
