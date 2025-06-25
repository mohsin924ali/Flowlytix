/**
 * Get Lot/Batch Query
 *
 * Query for retrieving a single lot/batch by ID with comprehensive details.
 * Follows CQRS pattern for read operations with authorization and business rules.
 * Includes calculated fields and expiry status information.
 *
 * Business Rules:
 * - Users must have READ_LOT_BATCH permission
 * - Results are filtered by user's agency access
 * - Expired status is calculated in real-time
 * - Near expiry warning is calculated based on threshold
 * - Includes availability calculations
 *
 * @domain Lot/Batch Management
 * @pattern Query Pattern (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { z } from 'zod';
import { LotStatus } from '../../../domain/value-objects/lot-batch';

/**
 * Get Lot/Batch Query Schema with validation
 */
export const GetLotBatchQuerySchema = z.object({
  // Required fields
  lotBatchId: z.string().uuid('Invalid lot/batch ID format'),
  requestedBy: z.string().uuid('Invalid requester ID format'),

  // Optional fields
  includeHistory: z.boolean().default(false), // Include quantity change history
  includeRelated: z.boolean().default(false), // Include related lots for same product
  nearExpiryDays: z
    .number()
    .min(1, 'Near expiry days must be at least 1')
    .max(365, 'Near expiry days cannot exceed 1 year')
    .default(30),
});

/**
 * Inferred TypeScript type for GetLotBatchQuery
 */
export type GetLotBatchQuery = z.infer<typeof GetLotBatchQuerySchema>;

/**
 * Lot/Batch quantity history entry
 */
export interface LotBatchQuantityHistory {
  readonly id: string;
  readonly changeDate: Date;
  readonly changeType: 'CREATED' | 'RESERVED' | 'RELEASED' | 'CONSUMED' | 'ADJUSTED' | 'EXPIRED';
  readonly quantityBefore: number;
  readonly quantityAfter: number;
  readonly quantityChange: number;
  readonly reason: string;
  readonly referenceId: string | null;
  readonly referenceType: string | null;
  readonly performedBy: string;
  readonly notes: string | null;
}

/**
 * Related lot/batch summary for same product
 */
export interface RelatedLotBatchSummary {
  readonly id: string;
  readonly lotNumber: string;
  readonly batchNumber: string | null;
  readonly manufacturingDate: Date;
  readonly expiryDate: Date | null;
  readonly remainingQuantity: number;
  readonly status: LotStatus;
  readonly isExpired: boolean;
  readonly daysUntilExpiry: number | null;
}

/**
 * Comprehensive lot/batch details
 */
export interface LotBatchDetails {
  readonly id: string;
  readonly lotNumber: string;
  readonly batchNumber: string | null;
  readonly manufacturingDate: Date;
  readonly expiryDate: Date | null;
  readonly quantity: number;
  readonly remainingQuantity: number;
  readonly reservedQuantity: number;
  readonly availableQuantity: number;
  readonly consumedQuantity: number;
  readonly status: LotStatus;
  readonly productId: string;
  readonly agencyId: string;
  readonly supplierId: string | null;
  readonly supplierLotCode: string | null;
  readonly notes: string | null;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy: string | null;
  readonly updatedAt: Date | null;

  // Calculated fields
  readonly isExpired: boolean;
  readonly isNearExpiry: boolean;
  readonly daysUntilExpiry: number | null;
  readonly isAvailable: boolean;
  readonly isFullyConsumed: boolean;
  readonly utilizationPercentage: number;

  // Display information
  readonly displayInfo: {
    readonly lotBatchCode: string;
    readonly statusDisplay: string;
    readonly quantityDisplay: string;
    readonly expiryDisplay: string;
    readonly availabilityDisplay: string;
  };
}

/**
 * Get Lot/Batch Query Result
 */
export interface GetLotBatchQueryResult {
  readonly success: boolean;
  readonly lotBatch: LotBatchDetails | null;
  readonly quantityHistory?: readonly LotBatchQuantityHistory[];
  readonly relatedLots?: readonly RelatedLotBatchSummary[];
  readonly metadata: {
    readonly includeHistory: boolean;
    readonly includeRelated: boolean;
    readonly nearExpiryThreshold: number;
  };
  readonly error?: string;
}

/**
 * Get Lot/Batch Query Validation Error
 */
export class GetLotBatchQueryValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: z.ZodError
  ) {
    super(message);
    this.name = 'GetLotBatchQueryValidationError';
  }
}

/**
 * Validates GetLotBatchQuery with comprehensive error handling
 * @param query - Raw query object to validate
 * @returns GetLotBatchQuery - Validated and parsed query
 * @throws GetLotBatchQueryValidationError - When validation fails
 */
export function validateGetLotBatchQuery(query: unknown): GetLotBatchQuery {
  try {
    return GetLotBatchQuerySchema.parse(query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = `Get lot/batch query validation failed: ${error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`;
      throw new GetLotBatchQueryValidationError(message, error);
    }
    throw error;
  }
}

/**
 * Helper function to create lot/batch details from domain object
 * @param lotBatch - LotBatch domain object
 * @param nearExpiryDays - Near expiry threshold in days
 * @returns LotBatchDetails - Comprehensive lot/batch details
 */
export function createLotBatchDetails(lotBatch: any, nearExpiryDays: number = 30): LotBatchDetails {
  // Calculate derived fields
  const isExpired = lotBatch.isExpired();
  const isNearExpiry = lotBatch.isNearExpiry(nearExpiryDays);
  const daysUntilExpiry = lotBatch.getDaysUntilExpiry();
  const isAvailable = lotBatch.isAvailable();
  const isFullyConsumed = lotBatch.isFullyConsumed();
  const consumedQuantity = lotBatch.quantity - lotBatch.remainingQuantity;
  const utilizationPercentage = lotBatch.quantity > 0 ? Math.round((consumedQuantity / lotBatch.quantity) * 100) : 0;

  // Create display information
  const displayInfo = {
    lotBatchCode: lotBatch.batchNumber ? `${lotBatch.lotNumber}-${lotBatch.batchNumber}` : lotBatch.lotNumber,
    statusDisplay: getStatusDisplay(lotBatch.status, isExpired, isNearExpiry),
    quantityDisplay: `${lotBatch.remainingQuantity}/${lotBatch.quantity} units`,
    expiryDisplay: getExpiryDisplay(lotBatch.expiryDate, daysUntilExpiry, isExpired, isNearExpiry),
    availabilityDisplay: getAvailabilityDisplay(lotBatch.availableQuantity, lotBatch.reservedQuantity, isAvailable),
  };

  return {
    id: lotBatch.id,
    lotNumber: lotBatch.lotNumber,
    batchNumber: lotBatch.batchNumber || null,
    manufacturingDate: lotBatch.manufacturingDate,
    expiryDate: lotBatch.expiryDate || null,
    quantity: lotBatch.quantity,
    remainingQuantity: lotBatch.remainingQuantity,
    reservedQuantity: lotBatch.reservedQuantity,
    availableQuantity: lotBatch.availableQuantity,
    consumedQuantity,
    status: lotBatch.status,
    productId: lotBatch.productId,
    agencyId: lotBatch.agencyId,
    supplierId: lotBatch.supplierId || null,
    supplierLotCode: lotBatch.supplierLotCode || null,
    notes: lotBatch.notes || null,
    createdBy: lotBatch.createdBy,
    createdAt: lotBatch.createdAt,
    updatedBy: lotBatch.updatedBy || null,
    updatedAt: lotBatch.updatedAt || null,

    // Calculated fields
    isExpired,
    isNearExpiry,
    daysUntilExpiry,
    isAvailable,
    isFullyConsumed,
    utilizationPercentage,
    displayInfo,
  };
}

/**
 * Helper function to get status display text
 * @param status - Lot status
 * @param isExpired - Whether lot is expired
 * @param isNearExpiry - Whether lot is near expiry
 * @returns Status display text
 */
function getStatusDisplay(status: LotStatus, isExpired: boolean, isNearExpiry: boolean): string {
  if (isExpired && status !== LotStatus.EXPIRED) {
    return `${status} (EXPIRED)`;
  }
  if (isNearExpiry && status === LotStatus.ACTIVE) {
    return `${status} (NEAR EXPIRY)`;
  }
  return status;
}

/**
 * Helper function to get expiry display text
 * @param expiryDate - Expiry date
 * @param daysUntilExpiry - Days until expiry
 * @param isExpired - Whether lot is expired
 * @param isNearExpiry - Whether lot is near expiry
 * @returns Expiry display text
 */
function getExpiryDisplay(
  expiryDate: Date | null,
  daysUntilExpiry: number | null,
  isExpired: boolean,
  isNearExpiry: boolean
): string {
  if (!expiryDate) {
    return 'No expiry date';
  }

  const dateStr = expiryDate.toISOString().split('T')[0];

  if (isExpired) {
    return `${dateStr} (EXPIRED)`;
  }

  if (isNearExpiry && daysUntilExpiry !== null) {
    return `${dateStr} (${daysUntilExpiry} days remaining)`;
  }

  if (daysUntilExpiry !== null && daysUntilExpiry !== undefined) {
    return `${dateStr} (${daysUntilExpiry} days remaining)`;
  }

  return dateStr;
}

/**
 * Helper function to get availability display text
 * @param availableQuantity - Available quantity
 * @param reservedQuantity - Reserved quantity
 * @param isAvailable - Whether lot is available
 * @returns Availability display text
 */
function getAvailabilityDisplay(availableQuantity: number, reservedQuantity: number, isAvailable: boolean): string {
  if (!isAvailable) {
    return 'Not available';
  }

  if (reservedQuantity > 0) {
    return `${availableQuantity} available (${reservedQuantity} reserved)`;
  }

  return `${availableQuantity} available`;
}

/**
 * Helper function to create related lot summary
 * @param lotBatch - LotBatch domain object
 * @param nearExpiryDays - Near expiry threshold
 * @returns RelatedLotBatchSummary
 */
export function createRelatedLotSummary(lotBatch: any, nearExpiryDays: number = 30): RelatedLotBatchSummary {
  return {
    id: lotBatch.id,
    lotNumber: lotBatch.lotNumber,
    batchNumber: lotBatch.batchNumber || null,
    manufacturingDate: lotBatch.manufacturingDate,
    expiryDate: lotBatch.expiryDate || null,
    remainingQuantity: lotBatch.remainingQuantity,
    status: lotBatch.status,
    isExpired: lotBatch.isExpired(),
    daysUntilExpiry: lotBatch.getDaysUntilExpiry(),
  };
}
