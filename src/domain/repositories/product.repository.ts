/**
 * Product Repository Interface
 *
 * Domain repository contract for Product entity operations.
 * Follows Repository pattern and Dependency Inversion principle.
 * Provides abstraction layer between domain and infrastructure.
 *
 * @domain Product Management
 * @pattern Repository Pattern
 * @architecture Hexagonal Architecture (Port)
 * @version 1.0.0
 */

import { Product, ProductStatus, ProductCategory, UnitOfMeasure } from '../entities/product';

/**
 * Advanced search operators for field-specific searching
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
  readonly field: 'name' | 'description' | 'sku' | 'barcode' | 'tags';
  readonly value: string;
  readonly operator: SearchOperator;
  readonly boost?: number; // Relevance boost factor (1.0 = normal, 2.0 = double weight)
}

/**
 * Search result metadata for advanced search features
 */
export interface ProductSearchMetadata {
  readonly similarityScore?: number; // Fuzzy matching similarity (0-1)
  readonly relevanceScore?: number; // Overall relevance score (0-1)
  readonly matchedFields?: readonly string[]; // Fields that matched the search
  readonly highlights?: Record<string, string>; // Field -> highlighted text
  readonly executionTime?: number; // Search execution time in milliseconds
  readonly normalizedQuery?: string; // Processed search query
  readonly originalQuery?: string; // Original search query
}

/**
 * Enhanced product search criteria with advanced features
 */
export interface ProductSearchCriteria {
  readonly agencyId?: string;
  readonly sku?: string;
  readonly name?: string;
  readonly category?: ProductCategory;
  readonly status?: ProductStatus;
  readonly supplierId?: string;
  readonly barcode?: string;
  readonly lowStock?: boolean;
  readonly outOfStock?: boolean;
  readonly needsReorder?: boolean;
  readonly createdBy?: string;
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly updatedAfter?: Date;
  readonly updatedBefore?: Date;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly search?: string; // Full text search
  readonly tags?: string[];
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?: 'sku' | 'name' | 'createdAt' | 'updatedAt' | 'sellingPrice' | 'currentStock' | 'relevance';
  readonly sortOrder?: 'asc' | 'desc';

  // Advanced search features - Step 3B
  readonly searchFields?: readonly SearchField[]; // Field-specific searches
  readonly searchMode?: 'any' | 'all'; // Match any field or all fields
  readonly enableFuzzySearch?: boolean; // Enable fuzzy matching
  readonly fuzzyThreshold?: number; // Fuzzy matching threshold (0-1)
  readonly highlightMatches?: boolean; // Highlight matching terms in results
  readonly includeSearchMetadata?: boolean; // Include search metadata in results
}

/**
 * Enhanced product with search metadata
 */
export interface ProductWithSearchMetadata extends Product {
  readonly searchMetadata?: ProductSearchMetadata;
}

/**
 * Enhanced product repository search results with pagination and metadata
 */
export interface ProductSearchResult {
  readonly products: readonly Product[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
  readonly searchMetadata?: {
    readonly executionTime?: number;
    readonly normalizedQuery?: string;
    readonly originalQuery?: string;
  };
}

/**
 * Product repository statistics for monitoring and analytics
 */
export interface ProductRepositoryStats {
  readonly totalProducts: number;
  readonly activeProducts: number;
  readonly inactiveProducts: number;
  readonly discontinuedProducts: number;
  readonly outOfStockProducts: number;
  readonly lowStockProducts: number;
  readonly productsNeedingReorder: number;
  readonly productsByCategory: Record<string, number>;
  readonly productsByStatus: Record<string, number>;
  readonly averageSellingPrice: number;
  readonly totalInventoryValue: number;
  readonly lastActivity: Date | null;
}

/**
 * Repository error types for proper error handling
 */
export class ProductRepositoryError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ProductRepositoryError';
  }
}

export class ProductNotFoundError extends ProductRepositoryError {
  constructor(identifier: string, cause?: Error) {
    super(`Product not found: ${identifier}`, 'find', cause);
    this.name = 'ProductNotFoundError';
  }
}

export class ProductAlreadyExistsError extends ProductRepositoryError {
  constructor(sku: string, agencyId: string, cause?: Error) {
    super(`Product already exists with SKU '${sku}' in agency '${agencyId}'`, 'create', cause);
    this.name = 'ProductAlreadyExistsError';
  }
}

export class ProductRepositoryConnectionError extends ProductRepositoryError {
  constructor(message: string, operation: string, cause?: Error) {
    super(`Repository connection error: ${message}`, operation, cause);
    this.name = 'ProductRepositoryConnectionError';
  }
}

/**
 * Product Repository Interface
 *
 * Defines the contract for Product entity persistence operations.
 * Implementation will be provided by infrastructure layer.
 *
 * @interface IProductRepository
 */
export interface IProductRepository {
  /**
   * Save a new product to the repository
   * @param product - Product entity to save
   * @returns Promise<Product> - Saved product with updated metadata
   * @throws {ProductAlreadyExistsError} When product with SKU already exists in agency
   * @throws {ProductRepositoryError} When save operation fails
   */
  save(product: Product): Promise<Product>;

  /**
   * Update an existing product in the repository
   * @param product - Product entity with updates
   * @returns Promise<Product> - Updated product entity
   * @throws {ProductNotFoundError} When product doesn't exist
   * @throws {ProductRepositoryError} When update operation fails
   */
  update(product: Product): Promise<Product>;

  /**
   * Find product by unique identifier
   * @param id - Product ID
   * @returns Promise<Product | null> - Product entity or null if not found
   * @throws {ProductRepositoryError} When find operation fails
   */
  findById(id: string): Promise<Product | null>;

  /**
   * Find product by SKU within agency (unique constraint)
   * @param sku - Product SKU
   * @param agencyId - Agency ID
   * @returns Promise<Product | null> - Product entity or null if not found
   * @throws {ProductRepositoryError} When find operation fails
   */
  findBySku(sku: string, agencyId: string): Promise<Product | null>;

  /**
   * Find product by barcode (if provided and unique)
   * @param barcode - Product barcode
   * @returns Promise<Product | null> - Product entity or null if not found
   * @throws {ProductRepositoryError} When find operation fails
   */
  findByBarcode(barcode: string): Promise<Product | null>;

  /**
   * Check if product exists by SKU within agency
   * @param sku - Product SKU
   * @param agencyId - Agency ID
   * @returns Promise<boolean> - True if product exists
   * @throws {ProductRepositoryError} When check operation fails
   */
  existsBySku(sku: string, agencyId: string): Promise<boolean>;

  /**
   * Check if product exists by barcode
   * @param barcode - Product barcode
   * @returns Promise<boolean> - True if product exists
   * @throws {ProductRepositoryError} When check operation fails
   */
  existsByBarcode(barcode: string): Promise<boolean>;

  /**
   * Search products with filtering and pagination
   * @param criteria - Search criteria and pagination options
   * @returns Promise<ProductSearchResult> - Paginated search results
   * @throws {ProductRepositoryError} When search operation fails
   */
  search(criteria: ProductSearchCriteria): Promise<ProductSearchResult>;

  /**
   * Find all products for an agency (with optional limit for safety)
   * @param agencyId - Agency ID
   * @param limit - Maximum number of products to return (default: 1000)
   * @returns Promise<readonly Product[]> - Array of all products
   * @throws {ProductRepositoryError} When find operation fails
   */
  findByAgency(agencyId: string, limit?: number): Promise<readonly Product[]>;

  /**
   * Find products by category
   * @param category - Product category
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @param limit - Maximum number of products to return
   * @returns Promise<readonly Product[]> - Array of products in specified category
   * @throws {ProductRepositoryError} When find operation fails
   */
  findByCategory(category: ProductCategory, agencyId?: string, limit?: number): Promise<readonly Product[]>;

  /**
   * Find products by status
   * @param status - Product status
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @param limit - Maximum number of products to return
   * @returns Promise<readonly Product[]> - Array of products with specified status
   * @throws {ProductRepositoryError} When find operation fails
   */
  findByStatus(status: ProductStatus, agencyId?: string, limit?: number): Promise<readonly Product[]>;

  /**
   * Find products by supplier
   * @param supplierId - Supplier ID
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @param limit - Maximum number of products to return
   * @returns Promise<readonly Product[]> - Array of products from specified supplier
   * @throws {ProductRepositoryError} When find operation fails
   */
  findBySupplier(supplierId: string, agencyId?: string, limit?: number): Promise<readonly Product[]>;

  /**
   * Find products that are out of stock
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @param limit - Maximum number of products to return
   * @returns Promise<readonly Product[]> - Array of out-of-stock products
   * @throws {ProductRepositoryError} When find operation fails
   */
  findOutOfStock(agencyId?: string, limit?: number): Promise<readonly Product[]>;

  /**
   * Find products with low stock
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @param limit - Maximum number of products to return
   * @returns Promise<readonly Product[]> - Array of low-stock products
   * @throws {ProductRepositoryError} When find operation fails
   */
  findLowStock(agencyId?: string, limit?: number): Promise<readonly Product[]>;

  /**
   * Find products that need reordering
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @param limit - Maximum number of products to return
   * @returns Promise<readonly Product[]> - Array of products needing reorder
   * @throws {ProductRepositoryError} When find operation fails
   */
  findNeedingReorder(agencyId?: string, limit?: number): Promise<readonly Product[]>;

  /**
   * Count total number of products
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @returns Promise<number> - Total product count
   * @throws {ProductRepositoryError} When count operation fails
   */
  count(agencyId?: string): Promise<number>;

  /**
   * Count products by specific criteria
   * @param criteria - Count criteria
   * @returns Promise<number> - Count of matching products
   * @throws {ProductRepositoryError} When count operation fails
   */
  countByCriteria(criteria: Partial<ProductSearchCriteria>): Promise<number>;

  /**
   * Delete product by ID (soft delete recommended)
   * @param id - Product ID
   * @returns Promise<boolean> - True if product was deleted
   * @throws {ProductNotFoundError} When product doesn't exist
   * @throws {ProductRepositoryError} When delete operation fails
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get repository statistics for monitoring
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @returns Promise<ProductRepositoryStats> - Repository statistics
   * @throws {ProductRepositoryError} When stats operation fails
   */
  getStats(agencyId?: string): Promise<ProductRepositoryStats>;

  /**
   * Check repository health and connectivity
   * @returns Promise<boolean> - True if repository is healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Begin transaction for atomic operations
   * @returns Promise<IProductRepositoryTransaction> - Transaction context
   * @throws {ProductRepositoryError} When transaction start fails
   */
  beginTransaction(): Promise<IProductRepositoryTransaction>;
}

/**
 * Product Repository Transaction Interface
 *
 * Provides transactional operations for atomic product operations.
 * Ensures data consistency across multiple product operations.
 */
export interface IProductRepositoryTransaction {
  /**
   * Save product within transaction
   * @param product - Product entity to save
   * @returns Promise<Product> - Saved product
   */
  save(product: Product): Promise<Product>;

  /**
   * Update product within transaction
   * @param product - Product entity to update
   * @returns Promise<Product> - Updated product
   */
  update(product: Product): Promise<Product>;

  /**
   * Delete product within transaction
   * @param id - Product ID to delete
   * @returns Promise<boolean> - Success status
   */
  delete(id: string): Promise<boolean>;

  /**
   * Commit transaction changes
   * @returns Promise<void>
   * @throws {ProductRepositoryError} When commit fails
   */
  commit(): Promise<void>;

  /**
   * Rollback transaction changes
   * @returns Promise<void>
   * @throws {ProductRepositoryError} When rollback fails
   */
  rollback(): Promise<void>;

  /**
   * Check if transaction is active
   * @returns boolean - True if transaction is active
   */
  isActive(): boolean;
}
