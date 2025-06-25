/**
 * Get Products Query
 *
 * Query to get products with filtering and pagination.
 * Follows CQRS pattern for read operations with comprehensive search capabilities.
 *
 * @domain Product Management
 * @pattern Query Pattern (CQRS)
 * @version 1.0.0
 */

import { ProductCategory, ProductStatus } from '../../../domain/entities/product';

/**
 * Query to get products with filtering and pagination
 * Follows CQRS pattern for read operations
 */
export interface GetProductsQuery {
  readonly agencyId?: string;
  readonly category?: ProductCategory;
  readonly status?: ProductStatus;
  readonly lowStock?: boolean;
  readonly outOfStock?: boolean;
  readonly search?: string; // Full text search
  readonly supplierId?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly sortBy?: 'sku' | 'name' | 'createdAt' | 'updatedAt' | 'sellingPrice' | 'currentStock';
  readonly sortOrder?: 'asc' | 'desc';
  readonly requestedBy: string; // ID of user making the request
}

/**
 * Result of a single product query
 */
export interface ProductQueryResult {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly description: string | undefined;
  readonly category: string;
  readonly unitOfMeasure: string;
  readonly status: string;
  readonly costPrice: number;
  readonly costPriceCurrency: string;
  readonly sellingPrice: number;
  readonly sellingPriceCurrency: string;
  readonly barcode: string | undefined;
  readonly supplierId: string | undefined;
  readonly supplierProductCode: string | undefined;
  readonly minStockLevel: number;
  readonly maxStockLevel: number;
  readonly reorderLevel: number;
  readonly currentStock: number;
  readonly reservedStock: number;
  readonly availableStock: number;
  readonly weight: number | undefined;
  readonly dimensions:
    | {
        readonly length: number;
        readonly width: number;
        readonly height: number;
      }
    | undefined;
  readonly tags: string[];
  readonly agencyId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy: string | undefined;
  readonly updatedAt: Date | undefined;
  readonly needsReorder: boolean;
  readonly isOutOfStock: boolean;
  readonly isLowStock: boolean;
  readonly profitMargin: number;
}

/**
 * Result of GetProducts query with pagination
 */
export interface GetProductsQueryResult {
  readonly products: readonly ProductQueryResult[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

/**
 * Validation errors for GetProductsQuery
 */
export class GetProductsQueryValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`GetProducts validation error - ${field}: ${reason}`);
    this.name = 'GetProductsQueryValidationError';
  }
}

/**
 * Validates GetProductsQuery data
 * @param query - Query to validate
 * @throws {GetProductsQueryValidationError} When validation fails
 */
export function validateGetProductsQuery(query: GetProductsQuery): void {
  if (!query.requestedBy || typeof query.requestedBy !== 'string') {
    throw new GetProductsQueryValidationError('requestedBy', 'RequestedBy is required and must be a string');
  }

  // Validate optional agencyId format (UUID)
  if (query.agencyId && typeof query.agencyId !== 'string') {
    throw new GetProductsQueryValidationError('agencyId', 'AgencyId must be a string');
  }

  // Validate category enum
  if (query.category && !Object.values(ProductCategory).includes(query.category)) {
    throw new GetProductsQueryValidationError('category', 'Invalid product category');
  }

  // Validate status enum
  if (query.status && !Object.values(ProductStatus).includes(query.status)) {
    throw new GetProductsQueryValidationError('status', 'Invalid product status');
  }

  // Validate pagination parameters
  if (query.page !== undefined) {
    if (typeof query.page !== 'number' || query.page < 1) {
      throw new GetProductsQueryValidationError('page', 'Page must be a positive number');
    }
  }

  if (query.limit !== undefined) {
    if (typeof query.limit !== 'number' || query.limit < 1 || query.limit > 1000) {
      throw new GetProductsQueryValidationError('limit', 'Limit must be between 1 and 1000');
    }
  }

  // Validate sort parameters
  const validSortFields = ['sku', 'name', 'createdAt', 'updatedAt', 'sellingPrice', 'currentStock'];
  if (query.sortBy && !validSortFields.includes(query.sortBy)) {
    throw new GetProductsQueryValidationError('sortBy', `SortBy must be one of: ${validSortFields.join(', ')}`);
  }

  if (query.sortOrder && !['asc', 'desc'].includes(query.sortOrder)) {
    throw new GetProductsQueryValidationError('sortOrder', 'SortOrder must be "asc" or "desc"');
  }

  // Validate search string length
  if (query.search && typeof query.search !== 'string') {
    throw new GetProductsQueryValidationError('search', 'Search must be a string');
  }

  if (query.search && query.search.length > 200) {
    throw new GetProductsQueryValidationError('search', 'Search query cannot exceed 200 characters');
  }

  // Validate boolean flags
  if (query.lowStock !== undefined && typeof query.lowStock !== 'boolean') {
    throw new GetProductsQueryValidationError('lowStock', 'LowStock must be a boolean');
  }

  if (query.outOfStock !== undefined && typeof query.outOfStock !== 'boolean') {
    throw new GetProductsQueryValidationError('outOfStock', 'OutOfStock must be a boolean');
  }

  // Validate supplierId format
  if (query.supplierId && typeof query.supplierId !== 'string') {
    throw new GetProductsQueryValidationError('supplierId', 'SupplierId must be a string');
  }
}
