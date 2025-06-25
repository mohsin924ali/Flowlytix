/**
 * Search Lot/Batches Query
 *
 * Query for searching lot/batches with comprehensive filtering, pagination, and sorting.
 * Follows CQRS pattern for read operations with advanced search capabilities.
 * Supports FIFO ordering, expiry filtering, and multi-tenant access control.
 *
 * Business Rules:
 * - Users must have READ_LOT_BATCH permission
 * - Results are filtered by user's agency access
 * - FIFO ordering prioritizes older manufacturing dates
 * - Expired lots are included but clearly marked
 * - Search supports lot numbers, batch numbers, and supplier codes
 *
 * @domain Lot/Batch Management
 * @pattern Query Pattern (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { z } from 'zod';
import { LotStatus } from '../../../domain/value-objects/lot-batch';

/**
 * Search Lot/Batches Query Schema with comprehensive validation
 */
export const SearchLotBatchesQuerySchema = z
  .object({
    // Pagination
    limit: z.number().min(1, 'Limit must be at least 1').max(10000, 'Limit cannot exceed 10000').default(100),
    offset: z.number().min(0, 'Offset cannot be negative').default(0),

    // Sorting
    sortBy: z
      .enum([
        'lotNumber',
        'batchNumber',
        'manufacturingDate',
        'expiryDate',
        'status',
        'remainingQuantity',
        'createdAt',
        'updatedAt',
      ])
      .default('manufacturingDate'),
    sortOrder: z.enum(['ASC', 'DESC']).default('ASC'),

    // FIFO ordering (overrides sortBy when enabled)
    fifoOrder: z.boolean().default(false),

    // Required fields
    requestedBy: z.string().uuid('Invalid requester ID format'),

    // Association filtering
    productId: z
      .union([z.string().uuid('Invalid product ID format'), z.array(z.string().uuid('Invalid product ID format'))])
      .optional(),
    agencyId: z
      .union([z.string().uuid('Invalid agency ID format'), z.array(z.string().uuid('Invalid agency ID format'))])
      .optional(),
    supplierId: z
      .union([z.string().uuid('Invalid supplier ID format'), z.array(z.string().uuid('Invalid supplier ID format'))])
      .optional(),
    createdBy: z
      .union([z.string().uuid('Invalid creator ID format'), z.array(z.string().uuid('Invalid creator ID format'))])
      .optional(),

    // Text search
    searchTerm: z.string().max(255, 'Search term too long').optional(),
    lotNumber: z.string().max(50, 'Lot number too long').optional(),
    batchNumber: z.string().max(50, 'Batch number too long').optional(),
    supplierLotCode: z.string().max(100, 'Supplier lot code too long').optional(),

    // Status filtering
    status: z.union([z.nativeEnum(LotStatus), z.array(z.nativeEnum(LotStatus))]).optional(),
    isActive: z.boolean().optional(),
    isExpired: z.boolean().optional(),
    isAvailable: z.boolean().optional(),

    // Quantity filtering
    hasQuantity: z.boolean().optional(),
    minQuantity: z.number().min(0, 'Minimum quantity cannot be negative').optional(),
    maxQuantity: z.number().min(0, 'Maximum quantity cannot be negative').optional(),
    hasReservedQuantity: z.boolean().optional(),

    // Date range filtering
    manufacturingDateAfter: z.coerce.date().optional(),
    manufacturingDateBefore: z.coerce.date().optional(),
    expiryDateAfter: z.coerce.date().optional(),
    expiryDateBefore: z.coerce.date().optional(),
    createdAfter: z.coerce.date().optional(),
    createdBefore: z.coerce.date().optional(),
    updatedAfter: z.coerce.date().optional(),
    updatedBefore: z.coerce.date().optional(),

    // Expiry filtering
    expiringWithinDays: z
      .number()
      .min(0, 'Days cannot be negative')
      .max(3650, 'Days cannot exceed 10 years')
      .optional(),
    nearExpiryDays: z
      .number()
      .min(1, 'Near expiry days must be at least 1')
      .max(365, 'Near expiry days cannot exceed 1 year')
      .default(30),
  })
  .refine(
    (data) => {
      // Validate date ranges
      if (data.manufacturingDateAfter && data.manufacturingDateBefore) {
        return data.manufacturingDateAfter <= data.manufacturingDateBefore;
      }
      return true;
    },
    {
      message: 'Manufacturing date after must be before or equal to manufacturing date before',
      path: ['manufacturingDateAfter'],
    }
  )
  .refine(
    (data) => {
      // Validate expiry date ranges
      if (data.expiryDateAfter && data.expiryDateBefore) {
        return data.expiryDateAfter <= data.expiryDateBefore;
      }
      return true;
    },
    {
      message: 'Expiry date after must be before or equal to expiry date before',
      path: ['expiryDateAfter'],
    }
  )
  .refine(
    (data) => {
      // Validate quantity ranges
      if (data.minQuantity !== undefined && data.maxQuantity !== undefined) {
        return data.minQuantity <= data.maxQuantity;
      }
      return true;
    },
    {
      message: 'Minimum quantity must be less than or equal to maximum quantity',
      path: ['minQuantity'],
    }
  )
  .refine(
    (data) => {
      // Validate created date ranges
      if (data.createdAfter && data.createdBefore) {
        return data.createdAfter <= data.createdBefore;
      }
      return true;
    },
    {
      message: 'Created after date must be before or equal to created before date',
      path: ['createdAfter'],
    }
  )
  .refine(
    (data) => {
      // Validate updated date ranges
      if (data.updatedAfter && data.updatedBefore) {
        return data.updatedAfter <= data.updatedBefore;
      }
      return true;
    },
    {
      message: 'Updated after date must be before or equal to updated before date',
      path: ['updatedAfter'],
    }
  );

/**
 * Inferred TypeScript type for SearchLotBatchesQuery
 */
export type SearchLotBatchesQuery = z.infer<typeof SearchLotBatchesQuerySchema>;

/**
 * Lot/Batch summary for search results
 */
export interface LotBatchSummary {
  readonly id: string;
  readonly lotNumber: string;
  readonly batchNumber: string | null;
  readonly manufacturingDate: Date;
  readonly expiryDate: Date | null;
  readonly quantity: number;
  readonly remainingQuantity: number;
  readonly reservedQuantity: number;
  readonly availableQuantity: number;
  readonly status: LotStatus;
  readonly productId: string;
  readonly agencyId: string;
  readonly supplierId: string | null;
  readonly supplierLotCode: string | null;
  readonly isExpired: boolean;
  readonly isNearExpiry: boolean;
  readonly daysUntilExpiry: number | null;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy: string | null;
  readonly updatedAt: Date | null;
}

/**
 * Search Lot/Batches Query Result with pagination metadata
 */
export interface SearchLotBatchesQueryResult {
  readonly success: boolean;
  readonly lotBatches: readonly LotBatchSummary[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
  readonly searchCriteria: {
    readonly appliedFilters: string[];
    readonly sortBy: string;
    readonly sortOrder: string;
    readonly fifoOrder: boolean;
  };
  readonly error?: string;
}

/**
 * Search Lot/Batches Query Validation Error
 */
export class SearchLotBatchesQueryValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: z.ZodError
  ) {
    super(message);
    this.name = 'SearchLotBatchesQueryValidationError';
  }
}

/**
 * Validates SearchLotBatchesQuery with comprehensive error handling
 * @param query - Raw query object to validate
 * @returns SearchLotBatchesQuery - Validated and parsed query
 * @throws SearchLotBatchesQueryValidationError - When validation fails
 */
export function validateSearchLotBatchesQuery(query: unknown): SearchLotBatchesQuery {
  try {
    return SearchLotBatchesQuerySchema.parse(query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = `Search lot/batches query validation failed: ${error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`;
      throw new SearchLotBatchesQueryValidationError(message, error);
    }
    throw error;
  }
}

/**
 * Helper function to determine applied filters for search criteria
 * @param query - Validated SearchLotBatchesQuery
 * @returns Array of applied filter descriptions
 */
export function getAppliedFilters(query: SearchLotBatchesQuery): string[] {
  const filters: string[] = [];

  // Association filters
  if (query.productId) {
    const productIds = Array.isArray(query.productId) ? query.productId : [query.productId];
    filters.push(`Product ID(s): ${productIds.length} selected`);
  }
  if (query.agencyId) {
    const agencyIds = Array.isArray(query.agencyId) ? query.agencyId : [query.agencyId];
    filters.push(`Agency ID(s): ${agencyIds.length} selected`);
  }
  if (query.supplierId) {
    const supplierIds = Array.isArray(query.supplierId) ? query.supplierId : [query.supplierId];
    filters.push(`Supplier ID(s): ${supplierIds.length} selected`);
  }

  // Text search filters
  if (query.searchTerm) filters.push(`Search: "${query.searchTerm}"`);
  if (query.lotNumber) filters.push(`Lot Number: "${query.lotNumber}"`);
  if (query.batchNumber) filters.push(`Batch Number: "${query.batchNumber}"`);
  if (query.supplierLotCode) filters.push(`Supplier Code: "${query.supplierLotCode}"`);

  // Status filters
  if (query.status) {
    const statuses = Array.isArray(query.status) ? query.status : [query.status];
    filters.push(`Status: ${statuses.join(', ')}`);
  }
  if (query.isActive) filters.push('Active lots only');
  if (query.isExpired) filters.push('Expired lots only');
  if (query.isAvailable) filters.push('Available lots only');

  // Quantity filters
  if (query.hasQuantity) filters.push('With remaining quantity');
  if (query.minQuantity !== undefined) filters.push(`Min quantity: ${query.minQuantity}`);
  if (query.maxQuantity !== undefined) filters.push(`Max quantity: ${query.maxQuantity}`);
  if (query.hasReservedQuantity) filters.push('With reserved quantity');

  // Date filters
  if (query.manufacturingDateAfter)
    filters.push(`Manufacturing after: ${query.manufacturingDateAfter.toISOString().split('T')[0]}`);
  if (query.manufacturingDateBefore)
    filters.push(`Manufacturing before: ${query.manufacturingDateBefore.toISOString().split('T')[0]}`);
  if (query.expiryDateAfter) filters.push(`Expiry after: ${query.expiryDateAfter.toISOString().split('T')[0]}`);
  if (query.expiryDateBefore) filters.push(`Expiry before: ${query.expiryDateBefore.toISOString().split('T')[0]}`);
  if (query.expiringWithinDays !== undefined) filters.push(`Expiring within ${query.expiringWithinDays} days`);

  return filters;
}

/**
 * Helper function to prepare search criteria for repository
 * @param query - Validated SearchLotBatchesQuery
 * @returns LotBatchSearchCriteria for repository layer
 */
export function prepareSearchCriteria(query: SearchLotBatchesQuery) {
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
    ...(query.supplierId && { supplierId: query.supplierId }),
    ...(query.createdBy && { createdBy: query.createdBy }),

    // Text search
    ...(query.searchTerm && { searchTerm: query.searchTerm }),
    ...(query.lotNumber && { lotNumber: query.lotNumber }),
    ...(query.batchNumber && { batchNumber: query.batchNumber }),
    ...(query.supplierLotCode && { supplierLotCode: query.supplierLotCode }),

    // Status filtering
    ...(query.status && { status: query.status }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
    ...(query.isExpired !== undefined && { isExpired: query.isExpired }),
    ...(query.isAvailable !== undefined && { isAvailable: query.isAvailable }),

    // Quantity filtering
    ...(query.hasQuantity !== undefined && { hasQuantity: query.hasQuantity }),
    ...(query.minQuantity !== undefined && { minQuantity: query.minQuantity }),
    ...(query.maxQuantity !== undefined && { maxQuantity: query.maxQuantity }),
    ...(query.hasReservedQuantity !== undefined && { hasReservedQuantity: query.hasReservedQuantity }),

    // Date range filtering
    ...(query.manufacturingDateAfter && { manufacturingDateAfter: query.manufacturingDateAfter }),
    ...(query.manufacturingDateBefore && { manufacturingDateBefore: query.manufacturingDateBefore }),
    ...(query.expiryDateAfter && { expiryDateAfter: query.expiryDateAfter }),
    ...(query.expiryDateBefore && { expiryDateBefore: query.expiryDateBefore }),
    ...(query.createdAfter && { createdAfter: query.createdAfter }),
    ...(query.createdBefore && { createdBefore: query.createdBefore }),
    ...(query.updatedAfter && { updatedAfter: query.updatedAfter }),
    ...(query.updatedBefore && { updatedBefore: query.updatedBefore }),

    // Expiry filtering
    ...(query.expiringWithinDays !== undefined && { expiringWithinDays: query.expiringWithinDays }),
    ...(query.nearExpiryDays !== undefined && { nearExpiryDays: query.nearExpiryDays }),
  };
}
