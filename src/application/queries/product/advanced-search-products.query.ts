/**
 * Advanced Search Products Query
 *
 * Enhanced query for advanced product search with full-text search,
 * fuzzy matching, search ranking, and complex filtering capabilities.
 * Extends basic GetProducts functionality with advanced search features.
 *
 * @domain Product Management - Advanced Search
 * @pattern Query Pattern (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { z } from 'zod';
import { ProductCategory, ProductStatus } from '../../../domain/entities/product';

/**
 * Search operators for field-specific searching
 */
export enum SearchOperator {
  EQUALS = 'equals',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  FUZZY = 'fuzzy',
  PHRASE = 'phrase',
  WILDCARD = 'wildcard',
}

/**
 * Search field configuration for targeted searching
 */
export interface SearchField {
  readonly field: 'name' | 'description' | 'sku' | 'barcode' | 'tags' | 'supplierProductCode';
  readonly value: string;
  readonly operator: SearchOperator;
  readonly boost?: number; // Relevance boost factor (1.0 = normal, 2.0 = double weight)
  readonly fuzzyLevel?: number; // For fuzzy search: 0-2 (0 = exact, 2 = very fuzzy)
}

/**
 * Price range filter
 */
export interface PriceRange {
  readonly min?: number;
  readonly max?: number;
  readonly currency?: string;
  readonly type: 'cost' | 'selling'; // Which price to filter on
}

/**
 * Date range filter
 */
export interface DateRange {
  readonly from?: Date;
  readonly to?: Date;
}

/**
 * Stock level filter
 */
export interface StockFilter {
  readonly minStock?: number;
  readonly maxStock?: number;
  readonly includeReserved?: boolean; // Include reserved stock in calculations
  readonly stockStatus?: 'available' | 'low' | 'out' | 'reorder_needed';
}

/**
 * Geographic/dimensional filters
 */
export interface DimensionFilter {
  readonly minWeight?: number;
  readonly maxWeight?: number;
  readonly minVolume?: number; // Calculated from length * width * height
  readonly maxVolume?: number;
}

/**
 * Advanced search query with enhanced filtering and ranking
 */
export interface AdvancedSearchProductsQuery {
  // Basic identification and authorization
  readonly requestedBy: string;
  readonly agencyId?: string;

  // Enhanced text search capabilities
  readonly globalSearch?: string; // Global search across all text fields
  readonly searchFields?: readonly SearchField[]; // Field-specific searches
  readonly searchMode?: 'any' | 'all'; // Match any field or all fields

  // Enhanced filtering
  readonly categories?: readonly ProductCategory[];
  readonly statuses?: readonly ProductStatus[];
  readonly supplierIds?: readonly string[];
  readonly tags?: readonly string[]; // Product must have ALL these tags
  readonly excludeTags?: readonly string[]; // Product must NOT have these tags

  // Price and cost filtering
  readonly priceRanges?: readonly PriceRange[];

  // Date-based filtering
  readonly createdDate?: DateRange;
  readonly updatedDate?: DateRange;

  // Stock and inventory filtering
  readonly stockFilter?: StockFilter;
  readonly dimensionFilter?: DimensionFilter;

  // Advanced boolean filters
  readonly hasBarcode?: boolean;
  readonly hasSupplier?: boolean;
  readonly hasImages?: boolean; // For future image support
  readonly isActive?: boolean;
  readonly needsReorder?: boolean;

  // Search behavior configuration
  readonly enableFuzzySearch?: boolean;
  readonly searchSuggestions?: boolean; // Return search suggestions
  readonly highlightMatches?: boolean; // Highlight matching terms in results
  readonly minScore?: number; // Minimum relevance score (0.0 - 1.0)

  // Pagination and sorting
  readonly page?: number;
  readonly limit?: number;
  readonly sortBy?:
    | 'relevance'
    | 'name'
    | 'sku'
    | 'createdAt'
    | 'updatedAt'
    | 'sellingPrice'
    | 'currentStock'
    | 'score';
  readonly sortOrder?: 'asc' | 'desc';

  // Result customization
  readonly includeMetadata?: boolean; // Include search metadata in results
  readonly facets?: readonly string[]; // Return facet counts for specified fields
}

/**
 * Search result with relevance scoring and highlighting
 */
export interface AdvancedProductSearchResult {
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
  readonly tags: readonly string[];
  readonly agencyId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy: string | undefined;
  readonly updatedAt: Date | undefined;

  // Enhanced business metrics
  readonly needsReorder: boolean;
  readonly isOutOfStock: boolean;
  readonly isLowStock: boolean;
  readonly profitMargin: number;
  readonly inventoryValue: number; // currentStock * costPrice
  readonly potentialRevenue: number; // availableStock * sellingPrice

  // Search-specific metadata
  readonly score?: number; // Relevance score (0.0 - 1.0)
  readonly highlights?: Record<string, string[]> | undefined; // Field -> highlighted snippets
  readonly matchedFields?: readonly string[]; // Fields that matched the search
  readonly suggestion?: string; // Alternative search suggestion if applicable
}

/**
 * Search facet for result categorization
 */
export interface SearchFacet {
  readonly field: string;
  readonly values: readonly {
    readonly value: string;
    readonly count: number;
    readonly selected?: boolean;
  }[];
}

/**
 * Search suggestions and autocomplete
 */
export interface SearchSuggestion {
  readonly query: string;
  readonly type: 'completion' | 'correction' | 'popular';
  readonly score: number;
  readonly resultCount?: number;
}

/**
 * Advanced search results with metadata and facets
 */
export interface AdvancedSearchProductsQueryResult {
  readonly products: readonly AdvancedProductSearchResult[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;

  // Search metadata
  readonly searchTime?: number; // Search execution time in milliseconds
  readonly maxScore?: number | undefined; // Highest relevance score in results
  readonly facets?: readonly SearchFacet[] | undefined; // Search facets for filtering
  readonly suggestions?: readonly SearchSuggestion[] | undefined; // Search suggestions
  readonly appliedFilters?: Record<string, any>; // Summary of applied filters
  readonly searchQuery?: string; // Processed search query
}

/**
 * Zod schema for advanced search query validation
 */
export const AdvancedSearchProductsQuerySchema = z.object({
  requestedBy: z.string().uuid('RequestedBy must be a valid UUID'),
  agencyId: z.string().uuid('AgencyId must be a valid UUID').optional(),

  globalSearch: z.string().min(1).max(500).optional(),
  searchFields: z
    .array(
      z.object({
        field: z.enum(['name', 'description', 'sku', 'barcode', 'tags', 'supplierProductCode']),
        value: z.string().min(1).max(200),
        operator: z.nativeEnum(SearchOperator),
        boost: z.number().min(0.1).max(10.0).optional(),
        fuzzyLevel: z.number().min(0).max(2).optional(),
      })
    )
    .max(10)
    .optional(),
  searchMode: z.enum(['any', 'all']).optional(),

  categories: z.array(z.nativeEnum(ProductCategory)).max(20).optional(),
  statuses: z.array(z.nativeEnum(ProductStatus)).max(10).optional(),
  supplierIds: z.array(z.string().uuid()).max(50).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  excludeTags: z.array(z.string().min(1).max(50)).max(20).optional(),

  priceRanges: z
    .array(
      z.object({
        min: z.number().min(0).optional(),
        max: z.number().min(0).optional(),
        currency: z.string().length(3).optional(),
        type: z.enum(['cost', 'selling']),
      })
    )
    .max(5)
    .optional(),

  createdDate: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .optional(),
  updatedDate: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .optional(),

  stockFilter: z
    .object({
      minStock: z.number().min(0).optional(),
      maxStock: z.number().min(0).optional(),
      includeReserved: z.boolean().optional(),
      stockStatus: z.enum(['available', 'low', 'out', 'reorder_needed']).optional(),
    })
    .optional(),

  dimensionFilter: z
    .object({
      minWeight: z.number().min(0).optional(),
      maxWeight: z.number().min(0).optional(),
      minVolume: z.number().min(0).optional(),
      maxVolume: z.number().min(0).optional(),
    })
    .optional(),

  hasBarcode: z.boolean().optional(),
  hasSupplier: z.boolean().optional(),
  hasImages: z.boolean().optional(),
  isActive: z.boolean().optional(),
  needsReorder: z.boolean().optional(),

  enableFuzzySearch: z.boolean().default(true),
  searchSuggestions: z.boolean().default(false),
  highlightMatches: z.boolean().default(false),
  minScore: z.number().min(0).max(1).optional(),

  page: z.number().min(1).max(10000).default(1),
  limit: z.number().min(1).max(1000).default(50),
  sortBy: z
    .enum(['relevance', 'name', 'sku', 'createdAt', 'updatedAt', 'sellingPrice', 'currentStock', 'score'])
    .default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  includeMetadata: z.boolean().default(false),
  facets: z.array(z.string()).max(10).optional(),
});

/**
 * Validation error for advanced search query
 */
export class AdvancedSearchProductsQueryValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: z.ZodError
  ) {
    super(`Advanced search validation error: ${message}`);
    this.name = 'AdvancedSearchProductsQueryValidationError';
  }
}

/**
 * Validates advanced search products query
 * @param query - Query to validate
 * @returns Validated query object
 * @throws {AdvancedSearchProductsQueryValidationError} When validation fails
 */
export function validateAdvancedSearchProductsQuery(query: unknown): AdvancedSearchProductsQuery {
  try {
    return AdvancedSearchProductsQuerySchema.parse(query) as AdvancedSearchProductsQuery;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new AdvancedSearchProductsQueryValidationError(message, error);
    }
    throw error;
  }
}
