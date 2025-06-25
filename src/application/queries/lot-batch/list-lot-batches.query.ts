/**
 * List Lot/Batches Query
 *
 * Query for listing lot/batches by product/agency with basic filtering and sorting.
 * Follows CQRS pattern for read operations with simplified interface for common use cases.
 * Optimized for dropdown lists, selection components, and quick lot lookups.
 *
 * Business Rules:
 * - Users must have READ_LOT_BATCH permission
 * - Results are filtered by user's agency access
 * - Default FIFO ordering by manufacturing date
 * - Only active and available lots by default
 * - Supports basic status and expiry filtering
 *
 * @domain Lot/Batch Management
 * @pattern Query Pattern (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { z } from 'zod';
import { LotStatus } from '../../../domain/value-objects/lot-batch';

/**
 * List Lot/Batches Query Schema with validation
 */
export const ListLotBatchesQuerySchema = z
  .object({
    // Required fields
    requestedBy: z.string().uuid('Invalid requester ID format'),

    // Association filtering (at least one required)
    productId: z.string().uuid('Invalid product ID format').optional(),
    agencyId: z.string().uuid('Invalid agency ID format').optional(),

    // Optional filtering
    status: z.union([z.nativeEnum(LotStatus), z.array(z.nativeEnum(LotStatus))]).optional(),
    includeExpired: z.boolean().default(false),
    includeInactive: z.boolean().default(false), // Include non-ACTIVE statuses
    hasQuantityOnly: z.boolean().default(true), // Only lots with remaining quantity > 0

    // Pagination
    limit: z.number().min(1, 'Limit must be at least 1').max(1000, 'Limit cannot exceed 1000').default(50),
    offset: z.number().min(0, 'Offset cannot be negative').default(0),

    // Sorting (simplified)
    sortBy: z.enum(['manufacturingDate', 'expiryDate', 'lotNumber', 'remainingQuantity']).default('manufacturingDate'),
    sortOrder: z.enum(['ASC', 'DESC']).default('ASC'),
    fifoOrder: z.boolean().default(true), // FIFO ordering (overrides sortBy)
  })
  .refine(
    (data) => {
      // At least one of productId or agencyId must be provided
      return data.productId || data.agencyId;
    },
    {
      message: 'Either productId or agencyId must be provided',
      path: ['productId'],
    }
  );

/**
 * Inferred TypeScript type for ListLotBatchesQuery
 */
export type ListLotBatchesQuery = z.infer<typeof ListLotBatchesQuerySchema>;

/**
 * Simplified lot/batch item for lists
 */
export interface LotBatchListItem {
  readonly id: string;
  readonly lotNumber: string;
  readonly batchNumber: string | null;
  readonly lotBatchCode: string; // Combined lot-batch display code
  readonly manufacturingDate: Date;
  readonly expiryDate: Date | null;
  readonly remainingQuantity: number;
  readonly availableQuantity: number;
  readonly status: LotStatus;
  readonly isExpired: boolean;
  readonly isNearExpiry: boolean;
  readonly daysUntilExpiry: number | null;
  readonly productId: string;
  readonly agencyId: string;
  readonly displayText: string; // Formatted display text for UI
  readonly sortKey: string; // Key for sorting/grouping
}

/**
 * List Lot/Batches Query Result
 */
export interface ListLotBatchesQueryResult {
  readonly success: boolean;
  readonly lotBatches: readonly LotBatchListItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
  readonly filters: {
    readonly productId?: string;
    readonly agencyId?: string;
    readonly statusFilter: string[];
    readonly includeExpired: boolean;
    readonly includeInactive: boolean;
    readonly hasQuantityOnly: boolean;
  };
  readonly sorting: {
    readonly sortBy: string;
    readonly sortOrder: string;
    readonly fifoOrder: boolean;
  };
  readonly error?: string;
}

/**
 * List Lot/Batches Query Validation Error
 */
export class ListLotBatchesQueryValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: z.ZodError
  ) {
    super(message);
    this.name = 'ListLotBatchesQueryValidationError';
  }
}

/**
 * Validates ListLotBatchesQuery with comprehensive error handling
 * @param query - Raw query object to validate
 * @returns ListLotBatchesQuery - Validated and parsed query
 * @throws ListLotBatchesQueryValidationError - When validation fails
 */
export function validateListLotBatchesQuery(query: unknown): ListLotBatchesQuery {
  try {
    return ListLotBatchesQuerySchema.parse(query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = `List lot/batches query validation failed: ${error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`;
      throw new ListLotBatchesQueryValidationError(message, error);
    }
    throw error;
  }
}

/**
 * Helper function to create lot/batch list item from domain object
 * @param lotBatch - LotBatch domain object
 * @param nearExpiryDays - Near expiry threshold in days
 * @returns LotBatchListItem - Simplified lot/batch list item
 */
export function createLotBatchListItem(lotBatch: any, nearExpiryDays: number = 30): LotBatchListItem {
  // Create combined lot-batch code
  const lotBatchCode = lotBatch.batchNumber ? `${lotBatch.lotNumber}-${lotBatch.batchNumber}` : lotBatch.lotNumber;

  // Calculate derived fields
  const isExpired = lotBatch.isExpired();
  const isNearExpiry = lotBatch.isNearExpiry(nearExpiryDays);
  const daysUntilExpiry = lotBatch.getDaysUntilExpiry();

  // Create display text for UI components
  const displayText = createDisplayText(
    lotBatchCode,
    lotBatch.remainingQuantity,
    lotBatch.expiryDate,
    isExpired,
    isNearExpiry,
    daysUntilExpiry
  );

  // Create sort key for consistent ordering
  const sortKey = createSortKey(lotBatch.manufacturingDate, lotBatch.lotNumber, lotBatch.batchNumber);

  return {
    id: lotBatch.id,
    lotNumber: lotBatch.lotNumber,
    batchNumber: lotBatch.batchNumber || null,
    lotBatchCode,
    manufacturingDate: lotBatch.manufacturingDate,
    expiryDate: lotBatch.expiryDate || null,
    remainingQuantity: lotBatch.remainingQuantity,
    availableQuantity: lotBatch.availableQuantity,
    status: lotBatch.status,
    isExpired,
    isNearExpiry,
    daysUntilExpiry,
    productId: lotBatch.productId,
    agencyId: lotBatch.agencyId,
    displayText,
    sortKey,
  };
}

/**
 * Helper function to create display text for UI components
 * @param lotBatchCode - Combined lot-batch code
 * @param remainingQuantity - Remaining quantity
 * @param expiryDate - Expiry date
 * @param isExpired - Whether lot is expired
 * @param isNearExpiry - Whether lot is near expiry
 * @param daysUntilExpiry - Days until expiry
 * @returns Formatted display text
 */
function createDisplayText(
  lotBatchCode: string,
  remainingQuantity: number,
  expiryDate: Date | null,
  isExpired: boolean,
  isNearExpiry: boolean,
  daysUntilExpiry: number | null
): string {
  let displayText = `${lotBatchCode} (${remainingQuantity} units)`;

  if (isExpired) {
    displayText += ' - EXPIRED';
  } else if (isNearExpiry && daysUntilExpiry !== null) {
    displayText += ` - Expires in ${daysUntilExpiry} days`;
  } else if (expiryDate) {
    const expiryStr = expiryDate.toISOString().split('T')[0];
    displayText += ` - Expires ${expiryStr}`;
  }

  return displayText;
}

/**
 * Helper function to create sort key for consistent ordering
 * @param manufacturingDate - Manufacturing date
 * @param lotNumber - Lot number
 * @param batchNumber - Batch number
 * @returns Sort key string
 */
function createSortKey(manufacturingDate: Date, lotNumber: string, batchNumber: string | null): string {
  const dateStr = manufacturingDate.toISOString().split('T')[0];
  const batchStr = batchNumber || '';
  return `${dateStr}_${lotNumber}_${batchStr}`;
}

/**
 * Helper function to prepare search criteria for repository
 * @param query - Validated ListLotBatchesQuery
 * @returns Search criteria for repository layer
 */
export function prepareListSearchCriteria(query: ListLotBatchesQuery) {
  // Determine status filtering
  let statusFilter: LotStatus[] | undefined;

  if (query.status) {
    statusFilter = Array.isArray(query.status) ? query.status : [query.status];
  } else if (!query.includeInactive) {
    // Default to ACTIVE status only
    statusFilter = [LotStatus.ACTIVE];
  }

  return {
    // Pagination
    limit: query.limit,
    offset: query.offset,

    // Sorting
    sortBy: query.fifoOrder ? 'manufacturingDate' : query.sortBy,
    sortOrder: query.fifoOrder ? 'ASC' : query.sortOrder,
    fifoOrder: query.fifoOrder,

    // Association filtering
    ...(query.productId && { productId: query.productId }),
    ...(query.agencyId && { agencyId: query.agencyId }),

    // Status filtering
    ...(statusFilter && { status: statusFilter }),

    // Expiry filtering
    ...(query.includeExpired === false && { isExpired: false }),

    // Quantity filtering
    ...(query.hasQuantityOnly && { hasQuantity: true }),

    // Additional filters for list optimization
    isAvailable: true, // Only available lots for selection
  };
}

/**
 * Helper function to get applied filters description
 * @param query - Validated ListLotBatchesQuery
 * @returns Array of applied filter descriptions
 */
export function getListAppliedFilters(query: ListLotBatchesQuery): string[] {
  const filters: string[] = [];

  if (query.productId) filters.push(`Product: ${query.productId}`);
  if (query.agencyId) filters.push(`Agency: ${query.agencyId}`);

  if (query.status) {
    const statuses = Array.isArray(query.status) ? query.status : [query.status];
    filters.push(`Status: ${statuses.join(', ')}`);
  } else if (!query.includeInactive) {
    filters.push('Status: ACTIVE only');
  }

  if (!query.includeExpired) filters.push('Exclude expired lots');
  if (query.hasQuantityOnly) filters.push('With remaining quantity only');

  return filters;
}
