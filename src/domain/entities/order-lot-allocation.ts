/**
 * Order Lot Allocation Value Objects
 *
 * Represents lot/batch allocation tracking for order items in the distribution system.
 * Used for inventory traceability and FIFO fulfillment tracking.
 *
 * Business Rules:
 * - Each order item can have multiple lot allocations
 * - Total allocated quantities must match order item quantities
 * - Lot allocations must reference valid lot/batch records
 * - Allocation quantities must be positive
 * - FIFO ordering must be maintained
 *
 * @domain Order Management - Lot Allocation Tracking
 * @version 1.0.0
 */

/**
 * Lot allocation for an order item
 * Tracks which specific lots/batches are allocated to fulfill an order item
 */
export interface OrderItemLotAllocation {
  readonly lotBatchId: string;
  readonly lotNumber: string;
  readonly batchNumber: string | null;
  readonly allocatedQuantity: number;
  readonly manufacturingDate: Date;
  readonly expiryDate: Date | null;
  readonly reservedAt: Date;
  readonly reservedBy: string;
}

/**
 * Lot allocation summary for an order item
 * Provides aggregate information about all lot allocations for an item
 */
export interface OrderItemLotAllocationSummary {
  readonly totalAllocations: number;
  readonly totalAllocatedQuantity: number;
  readonly oldestLotDate: Date;
  readonly newestLotDate: Date;
  readonly hasExpiringLots: boolean; // Within 30 days
  readonly allocations: readonly OrderItemLotAllocation[];
}

/**
 * Validation errors for lot allocations
 */
export class LotAllocationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LotAllocationValidationError';
  }
}

/**
 * Utility functions for lot allocation validation
 */
export const validateLotAllocations = (allocations: OrderItemLotAllocation[], expectedQuantity: number): void => {
  if (!allocations || allocations.length === 0) {
    throw new LotAllocationValidationError('Order item must have at least one lot allocation');
  }

  // Validate individual allocations
  for (const allocation of allocations) {
    if (allocation.allocatedQuantity <= 0) {
      throw new LotAllocationValidationError(`Allocated quantity must be positive for lot ${allocation.lotNumber}`);
    }

    if (!allocation.lotBatchId || !allocation.lotNumber) {
      throw new LotAllocationValidationError('Lot allocation must have valid lot batch ID and number');
    }

    if (!allocation.reservedBy) {
      throw new LotAllocationValidationError('Lot allocation must have reservedBy user');
    }
  }

  // Validate total quantities
  const totalAllocated = allocations.reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);
  if (totalAllocated !== expectedQuantity) {
    throw new LotAllocationValidationError(
      `Total allocated quantity (${totalAllocated}) must match expected quantity (${expectedQuantity})`
    );
  }
};

/**
 * Create lot allocation summary from allocations array
 */
export const createLotAllocationSummary = (allocations: OrderItemLotAllocation[]): OrderItemLotAllocationSummary => {
  if (!allocations || allocations.length === 0) {
    throw new LotAllocationValidationError('Cannot create summary from empty allocations');
  }

  const totalAllocatedQuantity = allocations.reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);
  const manufacturingDates = allocations.map((a) => a.manufacturingDate);
  const oldestLotDate = new Date(Math.min(...manufacturingDates.map((d) => d.getTime())));
  const newestLotDate = new Date(Math.max(...manufacturingDates.map((d) => d.getTime())));

  // Check for expiring lots (within 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const hasExpiringLots = allocations.some((a) => a.expiryDate && a.expiryDate <= thirtyDaysFromNow);

  return {
    totalAllocations: allocations.length,
    totalAllocatedQuantity,
    oldestLotDate,
    newestLotDate,
    hasExpiringLots,
    allocations: Object.freeze([...allocations]), // Create readonly copy
  };
};
