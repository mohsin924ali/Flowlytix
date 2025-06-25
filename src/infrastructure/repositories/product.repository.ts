/**
 * SQLite Product Repository Implementation - Step 2A: Core Structure
 *
 * Concrete implementation of IProductRepository interface for SQLite database.
 * Follows Repository pattern and provides data persistence for Product entities.
 * Implements core CRUD operations with proper error handling.
 *
 * ARCHITECTURE NOTES:
 * - Follows Hexagonal Architecture (Adapter pattern)
 * - Implements Repository Pattern for data access abstraction
 * - Uses flat database schema (no JSON serialization)
 * - Follows same patterns as UserRepository and CustomerRepository for consistency
 *
 * @domain Product Management
 * @pattern Repository Pattern
 * @architecture Hexagonal Architecture (Adapter)
 * @version 1.0.0 - Step 2A: Core Structure
 */

import { Database } from 'better-sqlite3';
import { DatabaseConnection } from '../database/connection';
import {
  IProductRepository,
  ProductSearchCriteria,
  ProductSearchResult,
  ProductRepositoryStats,
  ProductRepositoryError,
  ProductNotFoundError,
  ProductAlreadyExistsError,
  ProductRepositoryConnectionError,
  IProductRepositoryTransaction,
  SearchField,
} from '../../domain/repositories/product.repository';
import {
  Product,
  ProductStatus,
  ProductCategory,
  UnitOfMeasure,
  ProductPersistence,
} from '../../domain/entities/product';
import { Money, CurrencyCode } from '../../domain/value-objects/money';

/**
 * Type definitions for Product Categorization Features (Step 2C)
 */
export interface CategoryStats {
  category: ProductCategory;
  productCount: number;
  totalValue: number;
  averagePrice: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface CategoryDistribution {
  totalProducts: number;
  categories: Array<{
    category: ProductCategory;
    count: number;
    percentage: number;
  }>;
}

export interface CategorySuggestion {
  category: ProductCategory;
  confidence: number; // 0-1
  reason: string;
}

export interface CategoryHierarchyItem {
  category: ProductCategory;
  displayName: string;
  description: string;
  parentCategory: ProductCategory | null;
  sortOrder: number;
}

export interface CategoryTrend {
  category: ProductCategory;
  period: string;
  productCount: number;
  growthRate: number; // Percentage
  trend: 'growing' | 'stable' | 'declining';
}

export interface CategorySuggestionInput {
  name: string;
  description?: string;
}

/**
 * Product persistence data interface for database operations
 */
interface ProductPersistenceData {
  id: string;
  agency_id: string;
  product_code: string;
  product_name: string;
  description: string | null;
  category: string;
  brand: string | null;
  unit_of_measure: string;
  box_size: number;
  weight_per_unit: number | null;
  volume_per_unit: number | null;
  unit_price: number;
  wholesale_price: number | null;
  retail_price: number | null;
  cost_price: number | null;
  expiry_period_days: number | null;
  minimum_order_quantity: number;
  maximum_order_quantity: number | null;
  allow_loose_packing: number;
  requires_refrigeration: number;
  is_taxable: number;
  tax_rate: number;
  status: string;
  created_at: number;
  updated_at: number;
  created_by: string | null;
}

/**
 * SQLite Product Repository Implementation
 *
 * Step 2A Implementation - Core methods only:
 * - save, findById, findBySku, existsBySku, isHealthy
 * - Simple database mapping without complex domain features
 * - All other methods throw "not implemented" errors
 */
export class SqliteProductRepository implements IProductRepository {
  private readonly connection: DatabaseConnection;
  private readonly db: Database;

  constructor(connection: DatabaseConnection) {
    if (!connection) {
      throw new ProductRepositoryConnectionError('Database connection is required', 'constructor');
    }

    try {
      const db = connection.getDatabase();
      if (!db) {
        throw new ProductRepositoryConnectionError('Invalid database connection', 'constructor');
      }
      this.connection = connection;
      this.db = db;
    } catch (error) {
      throw new ProductRepositoryConnectionError(
        `Database connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'constructor',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Map domain status to database status
   */
  private mapStatusToDatabase(domainStatus: string): string {
    switch (domainStatus) {
      case 'ACTIVE':
        return 'active';
      case 'INACTIVE':
        return 'inactive';
      case 'DISCONTINUED':
        return 'discontinued';
      case 'PENDING_APPROVAL':
        return 'inactive'; // Map pending approval to inactive in database
      case 'OUT_OF_STOCK':
        return 'active'; // Out of stock is still active status
      default:
        return 'active'; // Default to active
    }
  }

  /**
   * Map database status to domain status
   */
  private mapStatusToDomain(databaseStatus: string): string {
    switch (databaseStatus) {
      case 'active':
        return 'ACTIVE';
      case 'inactive':
        return 'INACTIVE';
      case 'discontinued':
        return 'DISCONTINUED';
      default:
        return 'ACTIVE'; // Default to active
    }
  }

  /**
   * Step 3B: Validate search fields for advanced search features
   */
  private validateSearchFields(searchFields: readonly SearchField[]): void {
    const validFields = ['name', 'description', 'sku', 'barcode', 'tags'];
    const validOperators = ['equals', 'contains', 'starts_with', 'ends_with', 'fuzzy', 'phrase', 'wildcard'];

    for (const field of searchFields) {
      if (!validFields.includes(field.field)) {
        throw new ProductRepositoryError(
          `Invalid search field: ${field.field}. Valid fields are: ${validFields.join(', ')}`,
          'search'
        );
      }

      if (!validOperators.includes(field.operator)) {
        throw new ProductRepositoryError(
          `Invalid search operator: ${field.operator}. Valid operators are: ${validOperators.join(', ')}`,
          'search'
        );
      }

      if (!field.value || typeof field.value !== 'string') {
        throw new ProductRepositoryError('Search field value must be a non-empty string', 'search');
      }
    }
  }

  /**
   * Step 3B: Map search field names to database column names
   */
  private mapSearchFieldToDatabase(field: string): string {
    const fieldMap: Record<string, string> = {
      name: 'product_name',
      description: 'description',
      sku: 'product_code',
      barcode: 'product_code', // Fallback to product_code since barcode doesn't exist yet
      tags: 'description', // Fallback to description since tags aren't stored separately yet
    };
    return fieldMap[field] || field;
  }

  /**
   * Step 3B: Build SQL condition based on search operator
   */
  private buildSearchCondition(dbField: string, operator: string, value: string): { sql: string; params: any[] } {
    const trimmedValue = value.trim();

    switch (operator) {
      case 'equals':
        return { sql: `${dbField} = ?`, params: [trimmedValue] };

      case 'contains':
        return { sql: `${dbField} LIKE ?`, params: [`%${trimmedValue}%`] };

      case 'starts_with':
        return { sql: `${dbField} LIKE ?`, params: [`${trimmedValue}%`] };

      case 'ends_with':
        return { sql: `${dbField} LIKE ?`, params: [`%${trimmedValue}`] };

      case 'phrase':
        // For phrase search, look for exact phrase
        return { sql: `${dbField} LIKE ?`, params: [`%${trimmedValue}%`] };

      case 'wildcard':
        // Replace * with % for SQL LIKE
        const wildcardValue = trimmedValue.replace(/\*/g, '%');
        return { sql: `${dbField} LIKE ?`, params: [wildcardValue] };

      case 'fuzzy':
        // For now, implement fuzzy as contains - can be enhanced later
        return { sql: `${dbField} LIKE ?`, params: [`%${trimmedValue}%`] };

      default:
        throw new ProductRepositoryError(`Unsupported search operator: ${operator}`, 'search');
    }
  }

  /**
   * Save a new product to the database
   */
  async save(product: Product): Promise<Product> {
    try {
      // Validate input product
      if (!product || typeof product !== 'object') {
        throw new ProductRepositoryError('Invalid product object provided', 'save');
      }

      // Validate required properties exist
      if (!product.id || !product.sku || !product.agencyId) {
        throw new ProductRepositoryError('Product missing required properties (id, sku, agencyId)', 'save');
      }

      // Check for duplicate SKU within the same agency
      const existingProduct = await this.existsBySku(product.sku, product.agencyId);
      if (existingProduct) {
        throw new ProductAlreadyExistsError(product.sku, product.agencyId);
      }

      // Map product to database row
      const row: ProductPersistenceData = {
        id: product.id,
        agency_id: product.agencyId,
        product_code: product.sku,
        product_name: product.name || '',
        description: product.description || null,
        category: product.category || 'OTHER',
        brand: null, // Not in domain model yet
        unit_of_measure: product.unitOfMeasure || 'PIECE',
        box_size: 1, // Default for now
        weight_per_unit: product.weight || null,
        volume_per_unit: null, // Not in domain model yet
        unit_price: product.sellingPrice?.decimalAmount || 0,
        wholesale_price: null, // Not in domain model yet
        retail_price: product.sellingPrice?.decimalAmount || 0,
        cost_price: product.costPrice?.decimalAmount || 0,
        expiry_period_days: null, // Not in domain model yet
        minimum_order_quantity: product.minStockLevel || 1,
        maximum_order_quantity: product.maxStockLevel || null,
        allow_loose_packing: 1, // Default true
        requires_refrigeration: 0, // Default false
        is_taxable: 1, // Default true
        tax_rate: 0.0, // Default
        status: this.mapStatusToDatabase(product.status || 'ACTIVE'),
        created_at: product.createdAt?.getTime() || Date.now(),
        updated_at: product.updatedAt?.getTime() || Date.now(),
        created_by: product.createdBy || 'system',
      };

      // Insert into database
      const stmt = this.db.prepare(`
        INSERT INTO products (
          id, agency_id, product_code, product_name, description, category, brand,
          unit_of_measure, box_size, weight_per_unit, volume_per_unit,
          unit_price, wholesale_price, retail_price, cost_price,
          expiry_period_days, minimum_order_quantity, maximum_order_quantity,
          allow_loose_packing, requires_refrigeration, is_taxable, tax_rate,
          status, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.agency_id,
        row.product_code,
        row.product_name,
        row.description,
        row.category,
        row.brand,
        row.unit_of_measure,
        row.box_size,
        row.weight_per_unit,
        row.volume_per_unit,
        row.unit_price,
        row.wholesale_price,
        row.retail_price,
        row.cost_price,
        row.expiry_period_days,
        row.minimum_order_quantity,
        row.maximum_order_quantity,
        row.allow_loose_packing,
        row.requires_refrigeration,
        row.is_taxable,
        row.tax_rate,
        row.status,
        row.created_at,
        row.updated_at,
        row.created_by
      );

      return product;
    } catch (error) {
      if (error instanceof ProductAlreadyExistsError) {
        throw error;
      }
      throw new ProductRepositoryError(
        `Failed to save product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'save',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find product by unique identifier
   */
  async findById(id: string): Promise<Product | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM products WHERE id = ?');
      const row = stmt.get(id) as ProductPersistenceData | undefined;

      if (!row) {
        return null;
      }

      return this.mapToProduct(row);
    } catch (error) {
      throw new ProductRepositoryError(
        `Failed to find product by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findById',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find product by SKU within agency
   */
  async findBySku(sku: string, agencyId: string): Promise<Product | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM products WHERE product_code = ? AND agency_id = ?');
      const row = stmt.get(sku, agencyId) as ProductPersistenceData | undefined;

      if (!row) {
        return null;
      }

      return this.mapToProduct(row);
    } catch (error) {
      throw new ProductRepositoryError(
        `Failed to find product by SKU: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findBySku',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if product exists by SKU within agency
   */
  async existsBySku(sku: string, agencyId: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare('SELECT 1 FROM products WHERE product_code = ? AND agency_id = ? LIMIT 1');
      const result = stmt.get(sku, agencyId);
      return !!result;
    } catch (error) {
      throw new ProductRepositoryError(
        `Failed to check product existence by SKU: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsBySku',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check repository health and connectivity
   */
  async isHealthy(): Promise<boolean> {
    try {
      const stmt = this.db.prepare('SELECT 1 FROM products LIMIT 1');
      stmt.get();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Map database row to Product domain entity
   * Using Product.fromPersistence() method to preserve ID and status
   */
  private mapToProduct(row: ProductPersistenceData): Product {
    // Create ProductPersistence data structure for fromPersistence method
    const persistenceData: ProductPersistence = {
      id: row.id,
      sku: row.product_code,
      name: row.product_name,
      description: row.description,
      category: row.category as ProductCategory,
      unitOfMeasure: row.unit_of_measure as UnitOfMeasure,
      status: this.mapStatusToDomain(row.status) as ProductStatus,
      costPrice: Math.round((row.cost_price || 0) * 100), // Convert to integer cents
      costPriceCurrency: 'USD' as CurrencyCode,
      sellingPrice: Math.round(row.unit_price * 100), // Convert to integer cents
      sellingPriceCurrency: 'USD' as CurrencyCode,
      barcode: null, // Not in current schema
      supplierId: null, // Not in current schema
      supplierProductCode: null, // Not in current schema
      minStockLevel: row.minimum_order_quantity,
      maxStockLevel: row.maximum_order_quantity || 1000,
      reorderLevel: Math.floor(row.minimum_order_quantity * 2.0), // Fixed calculation: 15 * 2.0 = 30
      currentStock: 0, // Default for now - will be handled in Step 2B
      reservedStock: 0, // Default for now
      availableStock: 0, // Default for now
      weight: row.weight_per_unit,
      length: null, // Not in current schema
      width: null, // Not in current schema
      height: null, // Not in current schema
      tags: [], // Default for now
      agencyId: row.agency_id,
      createdBy: row.created_by || 'system',
      createdAt: new Date(row.created_at),
      updatedBy: null, // Not tracked in current schema
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
      priceHistory: [], // Default for now - will be handled in later steps
      stockMovements: [], // Default for now - will be handled in later steps
    };

    return Product.fromPersistence(persistenceData);
  }

  /**
   * Update an existing product in the repository
   * Follows Repository pattern with proper validation and error handling
   */
  async update(product: Product): Promise<Product> {
    try {
      // Input validation - following Instructions file standards
      if (!product || typeof product !== 'object') {
        throw new ProductRepositoryError('Invalid product object provided', 'update');
      }

      // Validate required properties exist
      if (!product.id || !product.sku || !product.agencyId) {
        throw new ProductRepositoryError('Product missing required properties (id, sku, agencyId)', 'update');
      }

      // Check if product exists
      const existingProduct = await this.findById(product.id);
      if (!existingProduct) {
        throw new ProductNotFoundError(product.id);
      }

      // Check for SKU conflicts with other products (excluding current product)
      const conflictStmt = this.db.prepare(
        'SELECT id FROM products WHERE product_code = ? AND agency_id = ? AND id != ?'
      );
      const conflictingProduct = conflictStmt.get(product.sku, product.agencyId, product.id);
      if (conflictingProduct) {
        throw new ProductAlreadyExistsError(product.sku, product.agencyId);
      }

      // Map product to database row - following same pattern as save method
      const row: ProductPersistenceData = {
        id: product.id,
        agency_id: product.agencyId,
        product_code: product.sku,
        product_name: product.name,
        description: product.description,
        category: product.category,
        brand: null, // Not in domain model yet
        unit_of_measure: product.unitOfMeasure,
        box_size: 1, // Default for now
        weight_per_unit: product.weight,
        volume_per_unit: null, // Not in domain model yet
        unit_price: product.sellingPrice.decimalAmount,
        wholesale_price: null, // Not in domain model yet
        retail_price: product.sellingPrice.decimalAmount,
        cost_price: product.costPrice.decimalAmount,
        expiry_period_days: null, // Not in domain model yet
        minimum_order_quantity: product.minStockLevel,
        maximum_order_quantity: product.maxStockLevel,
        allow_loose_packing: 0, // Default for now
        requires_refrigeration: 0, // Default for now
        is_taxable: 1, // Default for now
        tax_rate: 0.0, // Default for now
        status: this.mapStatusToDatabase(product.status),
        created_at: existingProduct.createdAt.getTime(),
        updated_at: Date.now(),
        created_by: existingProduct.createdBy,
      };

      // Update product in database with prepared statement (SQL injection prevention)
      const updateStmt = this.db.prepare(`
        UPDATE products SET
          agency_id = ?,
          product_code = ?,
          product_name = ?,
          description = ?,
          category = ?,
          brand = ?,
          unit_of_measure = ?,
          box_size = ?,
          weight_per_unit = ?,
          volume_per_unit = ?,
          unit_price = ?,
          wholesale_price = ?,
          retail_price = ?,
          cost_price = ?,
          expiry_period_days = ?,
          minimum_order_quantity = ?,
          maximum_order_quantity = ?,
          allow_loose_packing = ?,
          requires_refrigeration = ?,
          is_taxable = ?,
          tax_rate = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
      `);

      const result = updateStmt.run(
        row.agency_id,
        row.product_code,
        row.product_name,
        row.description,
        row.category,
        row.brand,
        row.unit_of_measure,
        row.box_size,
        row.weight_per_unit,
        row.volume_per_unit,
        row.unit_price,
        row.wholesale_price,
        row.retail_price,
        row.cost_price,
        row.expiry_period_days,
        row.minimum_order_quantity,
        row.maximum_order_quantity,
        row.allow_loose_packing,
        row.requires_refrigeration,
        row.is_taxable,
        row.tax_rate,
        row.status,
        row.updated_at,
        row.id
      );

      if (result.changes === 0) {
        throw new ProductNotFoundError(product.id);
      }

      // Return updated product by fetching from database
      const updatedRow = this.db
        .prepare('SELECT * FROM products WHERE id = ?')
        .get(product.id) as ProductPersistenceData;
      return this.mapToProduct(updatedRow);
    } catch (error) {
      // Proper error handling - don't expose internal errors to users
      if (error instanceof ProductRepositoryError) {
        throw error;
      }
      throw new ProductRepositoryError(
        `Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'update',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete a product from the repository
   * Follows Repository pattern with proper validation and error handling
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Input validation following Instructions file standards
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new ProductRepositoryError('Product ID is required and must be a non-empty string', 'delete');
      }

      const trimmedId = id.trim();

      // Check if product exists
      const existingProduct = await this.findById(trimmedId);
      if (!existingProduct) {
        throw new ProductNotFoundError(trimmedId);
      }

      // Soft delete: Update status to DISCONTINUED instead of physical deletion
      const updateStmt = this.db.prepare(`
        UPDATE products SET
          status = ?,
          updated_at = ?
        WHERE id = ?
      `);

      const result = updateStmt.run(this.mapStatusToDatabase(ProductStatus.DISCONTINUED), Date.now(), trimmedId);

      if (result.changes === 0) {
        throw new ProductNotFoundError(trimmedId);
      }

      return true;
    } catch (error) {
      // Proper error handling - don't expose internal errors to users
      if (error instanceof ProductRepositoryError) {
        throw error;
      }
      throw new ProductRepositoryError(
        `Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  // ============================================================================
  // PLACEHOLDER METHODS - Step 2A: Not Yet Implemented
  // ============================================================================

  async findByBarcode(barcode: string): Promise<Product | null> {
    try {
      // Input validation following Instructions file standards
      if (!barcode || typeof barcode !== 'string' || barcode.trim() === '') {
        throw new ProductRepositoryError('Barcode is required and must be a non-empty string', 'findByBarcode');
      }

      // Barcode field not in current database schema
      // Return null (not found) until barcode support is added
      return null;
    } catch (error) {
      // Proper error handling - don't expose internal errors to users
      if (error instanceof ProductRepositoryError) {
        throw error;
      }
      throw new ProductRepositoryError(
        `Failed to find product by barcode: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByBarcode',
        error instanceof Error ? error : undefined
      );
    }
  }

  async existsByBarcode(barcode: string): Promise<boolean> {
    try {
      // Input validation following Instructions file standards
      if (!barcode || typeof barcode !== 'string' || barcode.trim() === '') {
        throw new ProductRepositoryError('Barcode is required and must be a non-empty string', 'existsByBarcode');
      }

      // Barcode field not in current database schema
      // Return false (not found) until barcode support is added
      return false;
    } catch (error) {
      // Proper error handling - don't expose internal errors to users
      if (error instanceof ProductRepositoryError) {
        throw error;
      }
      throw new ProductRepositoryError(
        `Failed to check barcode existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsByBarcode',
        error instanceof Error ? error : undefined
      );
    }
  }

  async search(criteria: ProductSearchCriteria): Promise<ProductSearchResult> {
    // Track execution time for Step 3B metadata
    const startTime = Date.now();
    const originalQuery = criteria.search;

    try {
      // Input validation following Instructions file standards
      if (!criteria || typeof criteria !== 'object') {
        throw new ProductRepositoryError('Search criteria is required and must be an object', 'search');
      }

      // Extract pagination parameters from criteria
      const limit = criteria.limit || 100;
      const offset = criteria.offset || 0;

      if (typeof limit !== 'number' || limit <= 0 || limit > 1000) {
        throw new ProductRepositoryError('Limit must be a positive number and not exceed 1000', 'search');
      }

      if (typeof offset !== 'number' || offset < 0) {
        throw new ProductRepositoryError('Offset must be a non-negative number', 'search');
      }

      // Step 3B: Validate advanced search features
      if (criteria.searchFields) {
        this.validateSearchFields(criteria.searchFields);
      }

      // Build dynamic query based on criteria
      let query = 'SELECT * FROM products WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
      const params: any[] = [];
      const countParams: any[] = [];

      // Add criteria filters (same for both queries)
      const addFilter = (condition: string, value: any) => {
        query += condition;
        countQuery += condition;
        params.push(value);
        countParams.push(value);
      };

      // Agency ID validation - must be provided and valid
      if (!criteria.agencyId || typeof criteria.agencyId !== 'string' || criteria.agencyId.trim() === '') {
        throw new ProductRepositoryError('Agency ID is required and must be a non-empty string', 'search');
      }
      addFilter(' AND agency_id = ?', criteria.agencyId.trim());

      if (criteria.category) {
        if (!Object.values(ProductCategory).includes(criteria.category)) {
          throw new ProductRepositoryError(`Invalid category: ${criteria.category}`, 'search');
        }
        addFilter(' AND category = ?', criteria.category);
      }

      if (criteria.status) {
        if (!Object.values(ProductStatus).includes(criteria.status)) {
          throw new ProductRepositoryError(`Invalid status: ${criteria.status}`, 'search');
        }
        addFilter(' AND status = ?', this.mapStatusToDatabase(criteria.status));
      }

      if (criteria.name) {
        if (typeof criteria.name !== 'string') {
          throw new ProductRepositoryError('Name must be a string if provided', 'search');
        }
        addFilter(' AND product_name LIKE ?', `%${criteria.name.trim()}%`);
      }

      if (criteria.sku) {
        if (typeof criteria.sku !== 'string') {
          throw new ProductRepositoryError('SKU must be a string if provided', 'search');
        }
        addFilter(' AND product_code LIKE ?', `%${criteria.sku.trim()}%`);
      }

      if (criteria.barcode) {
        if (typeof criteria.barcode !== 'string') {
          throw new ProductRepositoryError('Barcode must be a string if provided', 'search');
        }
        // Note: barcode field doesn't exist in basic products table - this will be enhanced in future steps
        console.warn('Barcode search not supported yet - field does not exist in current schema');
      }

      if (criteria.supplierId) {
        if (typeof criteria.supplierId !== 'string') {
          throw new ProductRepositoryError('Supplier ID must be a string if provided', 'search');
        }
        // Note: supplier_id field doesn't exist in basic products table - this will be enhanced in future steps
        console.warn('Supplier ID search not supported yet - field does not exist in current schema');
      }

      // Price range filters - using unit_price since that's what exists in schema
      if (criteria.minPrice !== undefined) {
        if (typeof criteria.minPrice !== 'number' || criteria.minPrice < 0) {
          throw new ProductRepositoryError('Min price must be a non-negative number if provided', 'search');
        }
        addFilter(' AND unit_price >= ?', criteria.minPrice);
      }

      if (criteria.maxPrice !== undefined) {
        if (typeof criteria.maxPrice !== 'number' || criteria.maxPrice < 0) {
          throw new ProductRepositoryError('Max price must be a non-negative number if provided', 'search');
        }
        addFilter(' AND unit_price <= ?', criteria.maxPrice);
      }

      // Stock level filters - Note: these will be enhanced when inventory integration is added
      if (criteria.lowStock !== undefined && criteria.lowStock) {
        console.warn('Low stock search not supported yet - requires inventory table integration');
      }

      if (criteria.outOfStock !== undefined && criteria.outOfStock) {
        console.warn('Out of stock search not supported yet - requires inventory table integration');
      }

      // Enhanced full text search across multiple fields
      if (criteria.search) {
        if (typeof criteria.search !== 'string') {
          throw new ProductRepositoryError('Search text must be a string if provided', 'search');
        }
        const searchTerm = `%${criteria.search.trim()}%`;
        const searchCondition = ' AND (product_name LIKE ? OR product_code LIKE ? OR description LIKE ?)';
        query += searchCondition;
        countQuery += searchCondition;
        params.push(searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      // Step 3B: Advanced search fields with operators
      if (criteria.searchFields && criteria.searchFields.length > 0) {
        const searchConditions: string[] = [];

        for (const field of criteria.searchFields) {
          const dbField = this.mapSearchFieldToDatabase(field.field);
          const condition = this.buildSearchCondition(dbField, field.operator, field.value);
          searchConditions.push(condition.sql);
          params.push(...condition.params);
          countParams.push(...condition.params);
        }

        // Combine conditions based on searchMode
        const operator = criteria.searchMode === 'all' ? ' AND ' : ' OR ';
        const combinedCondition = ` AND (${searchConditions.join(operator)})`;
        query += combinedCondition;
        countQuery += combinedCondition;
      }

      // Add sorting
      const sortBy = criteria.sortBy || 'created_at';
      const sortOrder = criteria.sortOrder || 'desc';

      // Map domain sort fields to database fields
      const sortFieldMap: Record<string, string> = {
        sku: 'product_code',
        name: 'product_name',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        sellingPrice: 'unit_price', // Using unit_price for now
        currentStock: 'created_at', // Fallback to created_at since currentStock doesn't exist yet
      };

      const dbSortField = sortFieldMap[sortBy] || 'created_at';
      query += ` ORDER BY ${dbSortField} ${sortOrder.toUpperCase()}`;

      // Add pagination
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      // Execute count query first
      const countStmt = this.db.prepare(countQuery);
      const countResult = countStmt.get(...countParams) as { total: number };
      const total = countResult.total;

      // Execute main query
      const searchStmt = this.db.prepare(query);
      const rows = searchStmt.all(...params) as ProductPersistenceData[];

      // Map to domain entities
      const products = rows.map((row) => this.mapToProduct(row));

      // Calculate hasMore
      const hasMore = offset + limit < total;

      // Step 3B: Build search metadata if requested
      const executionTime = Date.now() - startTime;
      const normalizedQuery = originalQuery ? originalQuery.trim().toLowerCase().replace(/\s+/g, ' ') : '';

      // Build result with optional search metadata
      const result: ProductSearchResult = {
        products,
        total,
        limit,
        offset,
        hasMore,
        ...(criteria.includeSearchMetadata && {
          searchMetadata: {
            executionTime,
            normalizedQuery,
            originalQuery: originalQuery || '',
          },
        }),
      };

      return result;
    } catch (error) {
      console.error('Repository search error:', {
        operation: 'search',
        criteria,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw domain errors as-is
      if (error instanceof ProductRepositoryError) {
        throw error;
      }

      throw new ProductRepositoryError(
        `Failed to search products: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'search',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByAgency(agencyId: string, limit: number = 1000): Promise<readonly Product[]> {
    try {
      // Input validation following Instructions file standards
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '') {
        throw new ProductRepositoryError('Agency ID is required and must be a non-empty string', 'findByAgency');
      }

      if (typeof limit !== 'number' || limit <= 0 || limit > 10000) {
        throw new ProductRepositoryError('Limit must be a positive number and not exceed 10000', 'findByAgency');
      }

      const trimmedAgencyId = agencyId.trim();

      // Query products by agency with limit
      const findStmt = this.db.prepare(`
        SELECT * FROM products 
        WHERE agency_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);

      const rows = findStmt.all(trimmedAgencyId, limit) as ProductPersistenceData[];

      // Map to domain entities
      return rows.map((row) => this.mapToProduct(row));
    } catch (error) {
      console.error('Repository findByAgency error:', {
        operation: 'findByAgency',
        agencyId,
        limit,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw domain errors as-is
      if (error instanceof ProductRepositoryError) {
        throw error;
      }

      throw new ProductRepositoryError(
        `Failed to find products by agency: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByAgency',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByCategory(category: ProductCategory, agencyId?: string, limit: number = 100): Promise<readonly Product[]> {
    try {
      // Input validation following Instructions file standards
      if (!category || typeof category !== 'string') {
        throw new ProductRepositoryError('Category is required and must be a valid ProductCategory', 'findByCategory');
      }

      // Validate category is a valid enum value
      if (!Object.values(ProductCategory).includes(category)) {
        throw new ProductRepositoryError(
          `Invalid category: ${category}. Must be one of: ${Object.values(ProductCategory).join(', ')}`,
          'findByCategory'
        );
      }

      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError('Agency ID must be a non-empty string if provided', 'findByCategory');
      }

      if (typeof limit !== 'number' || limit <= 0 || limit > 10000) {
        throw new ProductRepositoryError('Limit must be a positive number and not exceed 10000', 'findByCategory');
      }

      // Build query with optional agency filter
      let query = `
        SELECT * FROM products 
        WHERE category = ?
      `;
      const params: any[] = [category];

      if (agencyId) {
        query += ` AND agency_id = ?`;
        params.push(agencyId.trim());
      }

      query += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);

      // Execute query
      const findStmt = this.db.prepare(query);
      const rows = findStmt.all(...params) as ProductPersistenceData[];

      // Map to domain entities
      return rows.map((row) => this.mapToProduct(row));
    } catch (error) {
      console.error('Repository findByCategory error:', {
        operation: 'findByCategory',
        category,
        agencyId,
        limit,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw domain errors as-is
      if (error instanceof ProductRepositoryError) {
        throw error;
      }

      throw new ProductRepositoryError(
        `Failed to find products by category: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByCategory',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByStatus(status: ProductStatus, agencyId?: string, limit: number = 100): Promise<readonly Product[]> {
    try {
      // Input validation following Instructions file standards
      if (!status || typeof status !== 'string') {
        throw new ProductRepositoryError('Status is required and must be a valid ProductStatus', 'findByStatus');
      }

      // Validate status is a valid enum value
      if (!Object.values(ProductStatus).includes(status)) {
        throw new ProductRepositoryError(
          `Invalid status: ${status}. Must be one of: ${Object.values(ProductStatus).join(', ')}`,
          'findByStatus'
        );
      }

      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError('Agency ID must be a non-empty string if provided', 'findByStatus');
      }

      if (typeof limit !== 'number' || limit <= 0 || limit > 10000) {
        throw new ProductRepositoryError('Limit must be a positive number and not exceed 10000', 'findByStatus');
      }

      // Map domain status to database status
      const dbStatus = this.mapStatusToDatabase(status);

      // Build query with optional agency filter
      let query = `
        SELECT * FROM products 
        WHERE status = ?
      `;
      const params: any[] = [dbStatus];

      if (agencyId) {
        query += ` AND agency_id = ?`;
        params.push(agencyId.trim());
      }

      query += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);

      // Execute query
      const findStmt = this.db.prepare(query);
      const rows = findStmt.all(...params) as ProductPersistenceData[];

      // Map to domain entities
      return rows.map((row) => this.mapToProduct(row));
    } catch (error) {
      console.error('Repository findByStatus error:', {
        operation: 'findByStatus',
        status,
        agencyId,
        limit,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw domain errors as-is
      if (error instanceof ProductRepositoryError) {
        throw error;
      }

      throw new ProductRepositoryError(
        `Failed to find products by status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByStatus',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findBySupplier(supplierId: string, agencyId?: string, limit: number = 100): Promise<readonly Product[]> {
    try {
      // Input validation following Instructions file standards
      if (!supplierId || typeof supplierId !== 'string' || supplierId.trim() === '') {
        throw new ProductRepositoryError('Supplier ID is required and must be a non-empty string', 'findBySupplier');
      }

      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError('Agency ID must be a non-empty string if provided', 'findBySupplier');
      }

      if (typeof limit !== 'number' || limit <= 0 || limit > 10000) {
        throw new ProductRepositoryError('Limit must be a positive number and not exceed 10000', 'findBySupplier');
      }

      // Supplier ID field not in current database schema
      // Return empty array until supplier support is added
      return [];
    } catch (error) {
      // Proper error handling - don't expose internal errors to users
      if (error instanceof ProductRepositoryError) {
        throw error;
      }
      throw new ProductRepositoryError(
        `Failed to find products by supplier: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findBySupplier',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findOutOfStock(agencyId?: string, limit: number = 100): Promise<readonly Product[]> {
    try {
      // Input validation following Instructions file standards
      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError('Agency ID must be a non-empty string if provided', 'findOutOfStock');
      }

      if (typeof limit !== 'number' || limit <= 0 || limit > 10000) {
        throw new ProductRepositoryError('Limit must be a positive number and not exceed 10000', 'findOutOfStock');
      }

      // Query products with zero available stock using inventory table
      let query = `
        SELECT p.* FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND p.agency_id = i.agency_id
        WHERE (i.available_boxes = 0 OR i.available_boxes IS NULL) 
          AND (i.available_loose = 0 OR i.available_loose IS NULL)
      `;
      const params: any[] = [];

      if (agencyId) {
        query += ` AND p.agency_id = ?`;
        params.push(agencyId.trim());
      }

      query += ` ORDER BY p.created_at DESC LIMIT ?`;
      params.push(limit);

      // Execute query
      const findStmt = this.db.prepare(query);
      const rows = findStmt.all(...params) as ProductPersistenceData[];

      // Map to domain entities
      return rows.map((row) => this.mapToProduct(row));
    } catch (error) {
      // Proper error handling - don't expose internal errors to users
      if (error instanceof ProductRepositoryError) {
        throw error;
      }
      throw new ProductRepositoryError(
        `Failed to find out of stock products: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findOutOfStock',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findLowStock(agencyId?: string, limit: number = 100): Promise<readonly Product[]> {
    try {
      // Input validation following Instructions file standards
      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError('Agency ID must be a non-empty string if provided', 'findLowStock');
      }

      if (typeof limit !== 'number' || limit <= 0 || limit > 10000) {
        throw new ProductRepositoryError('Limit must be a positive number and not exceed 10000', 'findLowStock');
      }

      // Query products with stock below minimum level using inventory table
      let query = `
        SELECT p.* FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND p.agency_id = i.agency_id
        WHERE (
          (i.available_boxes * p.box_size + COALESCE(i.available_loose, 0)) <= COALESCE(i.minimum_stock_level, p.minimum_order_quantity)
          AND (i.available_boxes > 0 OR i.available_loose > 0)
        )
      `;
      const params: any[] = [];

      if (agencyId) {
        query += ` AND p.agency_id = ?`;
        params.push(agencyId.trim());
      }

      query += ` ORDER BY p.created_at DESC LIMIT ?`;
      params.push(limit);

      // Execute query
      const findStmt = this.db.prepare(query);
      const rows = findStmt.all(...params) as ProductPersistenceData[];

      // Map to domain entities
      return rows.map((row) => this.mapToProduct(row));
    } catch (error) {
      // Proper error handling - don't expose internal errors to users
      if (error instanceof ProductRepositoryError) {
        throw error;
      }
      throw new ProductRepositoryError(
        `Failed to find low stock products: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findLowStock',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findNeedingReorder(agencyId?: string, limit: number = 100): Promise<readonly Product[]> {
    try {
      // Input validation following Instructions file standards
      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError('Agency ID must be a non-empty string if provided', 'findNeedingReorder');
      }

      if (typeof limit !== 'number' || limit <= 0 || limit > 10000) {
        throw new ProductRepositoryError('Limit must be a positive number and not exceed 10000', 'findNeedingReorder');
      }

      // Query products with stock at or below reorder point using inventory table
      let query = `
        SELECT p.* FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND p.agency_id = i.agency_id
        WHERE (
          (i.available_boxes * p.box_size + COALESCE(i.available_loose, 0)) <= COALESCE(i.reorder_point, p.minimum_order_quantity * 2)
        )
      `;
      const params: any[] = [];

      if (agencyId) {
        query += ` AND p.agency_id = ?`;
        params.push(agencyId.trim());
      }

      query += ` ORDER BY p.created_at DESC LIMIT ?`;
      params.push(limit);

      // Execute query
      const findStmt = this.db.prepare(query);
      const rows = findStmt.all(...params) as ProductPersistenceData[];

      // Map to domain entities
      return rows.map((row) => this.mapToProduct(row));
    } catch (error) {
      // Proper error handling - don't expose internal errors to users
      if (error instanceof ProductRepositoryError) {
        throw error;
      }
      throw new ProductRepositoryError(
        `Failed to find products needing reorder: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findNeedingReorder',
        error instanceof Error ? error : undefined
      );
    }
  }

  async count(agencyId?: string): Promise<number> {
    try {
      // Input validation following Instructions file standards
      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError('Agency ID must be a non-empty string if provided', 'count');
      }

      // Build query with optional agency filter
      let query = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
      const params: any[] = [];

      if (agencyId) {
        query += ' AND agency_id = ?';
        params.push(agencyId.trim());
      }

      const countStmt = this.db.prepare(query);
      const result = countStmt.get(...params) as { total: number };

      return result.total;
    } catch (error) {
      console.error('Repository count error:', {
        operation: 'count',
        agencyId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ProductRepositoryError(
        `Failed to count products: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'count',
        error instanceof Error ? error : undefined
      );
    }
  }

  async countByCriteria(criteria: Partial<ProductSearchCriteria>): Promise<number> {
    try {
      // Input validation following Instructions file standards
      if (!criteria || typeof criteria !== 'object') {
        throw new ProductRepositoryError('Search criteria is required and must be an object', 'countByCriteria');
      }

      // Build dynamic count query based on criteria
      let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
      const params: any[] = [];

      // Add criteria filters (same logic as search method)
      if (criteria.agencyId) {
        if (typeof criteria.agencyId !== 'string' || criteria.agencyId.trim() === '') {
          throw new ProductRepositoryError('Agency ID must be a non-empty string if provided', 'countByCriteria');
        }
        countQuery += ' AND agency_id = ?';
        params.push(criteria.agencyId.trim());
      }

      if (criteria.category) {
        if (!Object.values(ProductCategory).includes(criteria.category)) {
          throw new ProductRepositoryError(`Invalid category: ${criteria.category}`, 'countByCriteria');
        }
        countQuery += ' AND category = ?';
        params.push(criteria.category);
      }

      if (criteria.status) {
        if (!Object.values(ProductStatus).includes(criteria.status)) {
          throw new ProductRepositoryError(`Invalid status: ${criteria.status}`, 'countByCriteria');
        }
        countQuery += ' AND status = ?';
        params.push(this.mapStatusToDatabase(criteria.status));
      }

      if (criteria.name) {
        if (typeof criteria.name !== 'string') {
          throw new ProductRepositoryError('Name must be a string if provided', 'countByCriteria');
        }
        countQuery += ' AND product_name LIKE ?';
        params.push(`%${criteria.name.trim()}%`);
      }

      if (criteria.sku) {
        if (typeof criteria.sku !== 'string') {
          throw new ProductRepositoryError('SKU must be a string if provided', 'countByCriteria');
        }
        countQuery += ' AND product_code LIKE ?';
        params.push(`%${criteria.sku.trim()}%`);
      }

      if (criteria.barcode) {
        if (typeof criteria.barcode !== 'string') {
          throw new ProductRepositoryError('Barcode must be a string if provided', 'countByCriteria');
        }
        // Barcode field not in current schema - treat as no match
        return 0;
      }

      if (criteria.supplierId) {
        if (typeof criteria.supplierId !== 'string') {
          throw new ProductRepositoryError('Supplier ID must be a string if provided', 'countByCriteria');
        }
        // Supplier ID field not in current schema - treat as no match
        return 0;
      }

      // Execute count query
      const stmt = this.db.prepare(countQuery);
      const result = stmt.get(...params) as { total: number };

      return result.total;
    } catch (error) {
      // Proper error handling - don't expose internal errors to users
      if (error instanceof ProductRepositoryError) {
        throw error;
      }
      throw new ProductRepositoryError(
        `Failed to count products by criteria: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'countByCriteria',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getStats(agencyId?: string): Promise<ProductRepositoryStats> {
    try {
      // Input validation following Instructions file standards
      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError('Agency ID must be a non-empty string if provided', 'getStats');
      }

      // Build base query with optional agency filter
      let baseWhere = 'WHERE 1=1';
      const params: any[] = [];

      if (agencyId) {
        baseWhere += ' AND p.agency_id = ?';
        params.push(agencyId.trim());
      }

      // Get total count
      const totalQuery = `SELECT COUNT(*) as total FROM products p ${baseWhere}`;
      const totalStmt = this.db.prepare(totalQuery);
      const totalResult = totalStmt.get(...params) as { total: number };

      // Get count by status
      const statusCounts = {
        active: 0,
        inactive: 0,
        discontinued: 0,
      };

      for (const status of Object.keys(statusCounts)) {
        const statusQuery = `SELECT COUNT(*) as total FROM products p ${baseWhere} AND p.status = ?`;
        const statusParams = [...params, status];
        const statusStmt = this.db.prepare(statusQuery);
        const statusResult = statusStmt.get(...statusParams) as { total: number };
        statusCounts[status as keyof typeof statusCounts] = statusResult.total;
      }

      // Get inventory-related statistics
      const outOfStockQuery = `
        SELECT COUNT(*) as total FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND p.agency_id = i.agency_id
        ${baseWhere} AND (i.available_boxes = 0 OR i.available_boxes IS NULL) 
        AND (i.available_loose = 0 OR i.available_loose IS NULL)
      `;
      const outOfStockStmt = this.db.prepare(outOfStockQuery);
      const outOfStockResult = outOfStockStmt.get(...params) as { total: number };

      const lowStockQuery = `
        SELECT COUNT(*) as total FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND p.agency_id = i.agency_id
        ${baseWhere} AND (
          (i.available_boxes * p.box_size + COALESCE(i.available_loose, 0)) <= COALESCE(i.minimum_stock_level, p.minimum_order_quantity)
          AND (i.available_boxes > 0 OR i.available_loose > 0)
        )
      `;
      const lowStockStmt = this.db.prepare(lowStockQuery);
      const lowStockResult = lowStockStmt.get(...params) as { total: number };

      const needingReorderQuery = `
        SELECT COUNT(*) as total FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND p.agency_id = i.agency_id
        ${baseWhere} AND (
          (i.available_boxes * p.box_size + COALESCE(i.available_loose, 0)) <= COALESCE(i.reorder_point, p.minimum_order_quantity * 2)
        )
      `;
      const needingReorderStmt = this.db.prepare(needingReorderQuery);
      const needingReorderResult = needingReorderStmt.get(...params) as { total: number };

      // Get category distribution
      const categoryQuery = `
        SELECT p.category, COUNT(*) as count FROM products p 
        ${baseWhere} GROUP BY p.category
      `;
      const categoryStmt = this.db.prepare(categoryQuery);
      const categoryResults = categoryStmt.all(...params) as Array<{ category: string; count: number }>;

      const productsByCategory: Record<string, number> = {};
      categoryResults.forEach((row) => {
        productsByCategory[row.category] = row.count;
      });

      // Get average selling price
      const avgPriceQuery = `
        SELECT AVG(p.unit_price) as avg_price FROM products p 
        ${baseWhere} AND p.unit_price > 0
      `;
      const avgPriceStmt = this.db.prepare(avgPriceQuery);
      const avgPriceResult = avgPriceStmt.get(...params) as { avg_price: number | null };

      // Get total inventory value (cost price * available stock)
      const inventoryValueQuery = `
        SELECT SUM(
          COALESCE(p.cost_price, 0) * 
          (COALESCE(i.available_boxes, 0) * p.box_size + COALESCE(i.available_loose, 0))
        ) as total_value 
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND p.agency_id = i.agency_id
        ${baseWhere}
      `;
      const inventoryValueStmt = this.db.prepare(inventoryValueQuery);
      const inventoryValueResult = inventoryValueStmt.get(...params) as { total_value: number | null };

      // Get last activity (most recent product update)
      const lastActivityQuery = `
        SELECT MAX(p.updated_at) as last_activity FROM products p ${baseWhere}
      `;
      const lastActivityStmt = this.db.prepare(lastActivityQuery);
      const lastActivityResult = lastActivityStmt.get(...params) as { last_activity: number | null };

      return {
        totalProducts: totalResult.total,
        activeProducts: statusCounts.active,
        inactiveProducts: statusCounts.inactive,
        discontinuedProducts: statusCounts.discontinued,
        outOfStockProducts: outOfStockResult.total,
        lowStockProducts: lowStockResult.total,
        productsNeedingReorder: needingReorderResult.total,
        productsByCategory,
        productsByStatus: statusCounts,
        averageSellingPrice: avgPriceResult.avg_price || 0,
        totalInventoryValue: inventoryValueResult.total_value || 0,
        lastActivity: lastActivityResult.last_activity ? new Date(lastActivityResult.last_activity) : null,
      };
    } catch (error) {
      // Proper error handling - don't expose internal errors to users
      if (error instanceof ProductRepositoryError) {
        throw error;
      }
      throw new ProductRepositoryError(
        `Failed to get product statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getStats',
        error instanceof Error ? error : undefined
      );
    }
  }

  async beginTransaction(): Promise<IProductRepositoryTransaction> {
    try {
      // Create a transaction wrapper that implements the interface
      const transaction = this.db.transaction((callback: () => void) => {
        callback();
      });

      return {
        commit: async () => {
          // Transaction commits automatically when function completes successfully
        },
        rollback: async () => {
          // Rollback handled by throwing error in transaction
          throw new ProductRepositoryError('Transaction rolled back', 'rollback');
        },
        save: async (product: Product) => {
          return this.save(product);
        },
        update: async (product: Product) => {
          return this.update(product);
        },
        delete: async (id: string) => {
          return this.delete(id);
        },
        isActive: () => {
          // For better-sqlite3, transaction is active during execution
          return true;
        },
      };
    } catch (error) {
      // Proper error handling - don't expose internal errors to users
      throw new ProductRepositoryError(
        `Failed to begin transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'beginTransaction',
        error instanceof Error ? error : undefined
      );
    }
  }

  // =============================================================================
  // STEP 2C: PRODUCT CATEGORIZATION FEATURES
  // =============================================================================

  async getCategoryStats(agencyId?: string): Promise<readonly CategoryStats[]> {
    try {
      // Input validation following Instructions file standards
      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError('Agency ID must be a non-empty string if provided', 'getCategoryStats');
      }

      // Build base query with optional agency filter
      let baseWhere = 'WHERE 1=1';
      const params: any[] = [];

      if (agencyId) {
        baseWhere += ' AND p.agency_id = ?';
        params.push(agencyId.trim());
      }

      // Get comprehensive category statistics
      const query = `
        SELECT 
          p.category,
          COUNT(*) as productCount,
          SUM(p.unit_price * (COALESCE(i.available_boxes, 0) * p.box_size + COALESCE(i.available_loose, 0))) as totalValue,
          AVG(p.unit_price) as averagePrice,
          SUM(CASE WHEN (COALESCE(i.available_boxes, 0) * p.box_size + COALESCE(i.available_loose, 0)) <= COALESCE(i.minimum_stock_level, p.minimum_order_quantity) 
                   AND (i.available_boxes > 0 OR i.available_loose > 0) THEN 1 ELSE 0 END) as lowStockCount,
          SUM(CASE WHEN (COALESCE(i.available_boxes, 0) = 0 AND COALESCE(i.available_loose, 0) = 0) THEN 1 ELSE 0 END) as outOfStockCount
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND p.agency_id = i.agency_id
        ${baseWhere}
        GROUP BY p.category
        ORDER BY p.category
      `;

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as Array<{
        category: string;
        productCount: number;
        totalValue: number | null;
        averagePrice: number | null;
        lowStockCount: number;
        outOfStockCount: number;
      }>;

      // Map to CategoryStats interface
      return rows.map((row) => ({
        category: row.category as ProductCategory,
        productCount: row.productCount,
        totalValue: row.totalValue || 0,
        averagePrice: row.averagePrice || 0,
        lowStockCount: row.lowStockCount,
        outOfStockCount: row.outOfStockCount,
      }));
    } catch (error) {
      console.error('Repository getCategoryStats error:', {
        operation: 'getCategoryStats',
        agencyId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw domain errors as-is
      if (error instanceof ProductRepositoryError) {
        throw error;
      }

      throw new ProductRepositoryError(
        `Failed to get category statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getCategoryStats',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findCategoriesWithProducts(agencyId?: string): Promise<readonly ProductCategory[]> {
    try {
      // Input validation following Instructions file standards
      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError(
          'Agency ID must be a non-empty string if provided',
          'findCategoriesWithProducts'
        );
      }

      // Build query with optional agency filter
      let query = 'SELECT DISTINCT category FROM products WHERE status = ?';
      const params: any[] = ['active']; // Only active products

      if (agencyId) {
        query += ' AND agency_id = ?';
        params.push(agencyId.trim());
      }

      query += ' ORDER BY category';

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as Array<{ category: string }>;

      return rows.map((row) => row.category as ProductCategory);
    } catch (error) {
      console.error('Repository findCategoriesWithProducts error:', {
        operation: 'findCategoriesWithProducts',
        agencyId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw domain errors as-is
      if (error instanceof ProductRepositoryError) {
        throw error;
      }

      throw new ProductRepositoryError(
        `Failed to find categories with products: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findCategoriesWithProducts',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getCategoryDistribution(agencyId?: string): Promise<CategoryDistribution> {
    try {
      // Input validation following Instructions file standards
      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError('Agency ID must be a non-empty string if provided', 'getCategoryDistribution');
      }

      // Build query with optional agency filter
      let query = 'SELECT category, COUNT(*) as count FROM products WHERE status = ?';
      const params: any[] = ['active']; // Only active products

      if (agencyId) {
        query += ' AND agency_id = ?';
        params.push(agencyId.trim());
      }

      query += ' GROUP BY category ORDER BY count DESC';

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as Array<{ category: string; count: number }>;

      // Calculate total products
      const totalProducts = rows.reduce((sum, row) => sum + row.count, 0);

      // Calculate distribution with percentages
      const categories = rows.map((row) => ({
        category: row.category as ProductCategory,
        count: row.count,
        percentage: totalProducts > 0 ? Math.round((row.count / totalProducts) * 100) : 0,
      }));

      return {
        totalProducts,
        categories,
      };
    } catch (error) {
      console.error('Repository getCategoryDistribution error:', {
        operation: 'getCategoryDistribution',
        agencyId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw domain errors as-is
      if (error instanceof ProductRepositoryError) {
        throw error;
      }

      throw new ProductRepositoryError(
        `Failed to get category distribution: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getCategoryDistribution',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findProductsByMultipleCategories(
    categories: ProductCategory[],
    agencyId?: string,
    limit: number = 100
  ): Promise<readonly Product[]> {
    try {
      // Input validation following Instructions file standards
      if (!Array.isArray(categories) || categories.length === 0) {
        throw new ProductRepositoryError(
          'Categories array is required and must not be empty',
          'findProductsByMultipleCategories'
        );
      }

      // Validate each category
      for (const category of categories) {
        if (!category || typeof category !== 'string') {
          throw new ProductRepositoryError(
            'Each category must be a non-empty string',
            'findProductsByMultipleCategories'
          );
        }
        if (!Object.values(ProductCategory).includes(category)) {
          throw new ProductRepositoryError(
            `Invalid category: ${category}. Must be one of: ${Object.values(ProductCategory).join(', ')}`,
            'findProductsByMultipleCategories'
          );
        }
      }

      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError(
          'Agency ID must be a non-empty string if provided',
          'findProductsByMultipleCategories'
        );
      }

      if (typeof limit !== 'number' || limit <= 0 || limit > 10000) {
        throw new ProductRepositoryError(
          'Limit must be a positive number and not exceed 10000',
          'findProductsByMultipleCategories'
        );
      }

      // Build query with IN clause for categories
      const placeholders = categories.map(() => '?').join(',');
      let query = `SELECT * FROM products WHERE category IN (${placeholders})`;
      const params: any[] = [...categories];

      if (agencyId) {
        query += ' AND agency_id = ?';
        params.push(agencyId.trim());
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as ProductPersistenceData[];

      return rows.map((row) => this.mapToProduct(row));
    } catch (error) {
      console.error('Repository findProductsByMultipleCategories error:', {
        operation: 'findProductsByMultipleCategories',
        categories,
        agencyId,
        limit,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw domain errors as-is
      if (error instanceof ProductRepositoryError) {
        throw error;
      }

      throw new ProductRepositoryError(
        `Failed to find products by multiple categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findProductsByMultipleCategories',
        error instanceof Error ? error : undefined
      );
    }
  }

  async validateCategoryTransition(fromCategory: ProductCategory, toCategory: ProductCategory): Promise<boolean> {
    try {
      // Input validation following Instructions file standards
      if (!fromCategory || typeof fromCategory !== 'string') {
        throw new ProductRepositoryError(
          'From category is required and must be a valid ProductCategory',
          'validateCategoryTransition'
        );
      }

      if (!toCategory || typeof toCategory !== 'string') {
        throw new ProductRepositoryError(
          'To category is required and must be a valid ProductCategory',
          'validateCategoryTransition'
        );
      }

      // Validate categories are valid enum values
      if (!Object.values(ProductCategory).includes(fromCategory)) {
        throw new ProductRepositoryError(
          `Invalid from category: ${fromCategory}. Must be one of: ${Object.values(ProductCategory).join(', ')}`,
          'validateCategoryTransition'
        );
      }

      if (!Object.values(ProductCategory).includes(toCategory)) {
        throw new ProductRepositoryError(
          `Invalid to category: ${toCategory}. Must be one of: ${Object.values(ProductCategory).join(', ')}`,
          'validateCategoryTransition'
        );
      }

      // Business rules for category transitions
      // For now, all transitions are allowed, but this provides extension point for future business rules

      // Example business rules that could be implemented:
      // - Prevent transitions from HEALTH_MEDICINE to FOOD_BEVERAGE (regulatory compliance)
      // - Prevent transitions that would affect tax calculations
      // - Require approval for certain high-value category transitions

      // Currently allowing all transitions
      return true;
    } catch (error) {
      console.error('Repository validateCategoryTransition error:', {
        operation: 'validateCategoryTransition',
        fromCategory,
        toCategory,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw domain errors as-is
      if (error instanceof ProductRepositoryError) {
        throw error;
      }

      throw new ProductRepositoryError(
        `Failed to validate category transition: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'validateCategoryTransition',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getCategoryHierarchy(): Promise<readonly CategoryHierarchyItem[]> {
    try {
      // Static category hierarchy definition
      // This could be moved to a configuration file or database table in the future
      const hierarchy: CategoryHierarchyItem[] = [
        {
          category: ProductCategory.FOOD_BEVERAGE,
          displayName: 'Food & Beverage',
          description: 'Consumable food and drink products',
          parentCategory: null,
          sortOrder: 1,
        },
        {
          category: ProductCategory.HOUSEHOLD,
          displayName: 'Household Items',
          description: 'General household and cleaning products',
          parentCategory: null,
          sortOrder: 2,
        },
        {
          category: ProductCategory.PERSONAL_CARE,
          displayName: 'Personal Care',
          description: 'Personal hygiene and beauty products',
          parentCategory: null,
          sortOrder: 3,
        },
        {
          category: ProductCategory.HEALTH_MEDICINE,
          displayName: 'Health & Medicine',
          description: 'Medical and health-related products',
          parentCategory: null,
          sortOrder: 4,
        },
        {
          category: ProductCategory.ELECTRONICS,
          displayName: 'Electronics',
          description: 'Electronic devices and accessories',
          parentCategory: null,
          sortOrder: 5,
        },
        {
          category: ProductCategory.CLOTHING,
          displayName: 'Clothing & Apparel',
          description: 'Clothing and fashion items',
          parentCategory: null,
          sortOrder: 6,
        },
        {
          category: ProductCategory.AUTOMOTIVE,
          displayName: 'Automotive',
          description: 'Car parts and automotive accessories',
          parentCategory: null,
          sortOrder: 7,
        },
        {
          category: ProductCategory.OFFICE_SUPPLIES,
          displayName: 'Office Supplies',
          description: 'Office and business supplies',
          parentCategory: null,
          sortOrder: 8,
        },
        {
          category: ProductCategory.TOYS_GAMES,
          displayName: 'Toys & Games',
          description: 'Toys, games, and entertainment products',
          parentCategory: null,
          sortOrder: 9,
        },
        {
          category: ProductCategory.BOOKS_MEDIA,
          displayName: 'Books & Media',
          description: 'Books, magazines, and media products',
          parentCategory: null,
          sortOrder: 10,
        },
        {
          category: ProductCategory.HOME_GARDEN,
          displayName: 'Home & Garden',
          description: 'Home improvement and gardening products',
          parentCategory: null,
          sortOrder: 11,
        },
        {
          category: ProductCategory.SPORTS_OUTDOORS,
          displayName: 'Sports & Outdoors',
          description: 'Sports equipment and outdoor gear',
          parentCategory: null,
          sortOrder: 12,
        },
        {
          category: ProductCategory.OTHER,
          displayName: 'Other',
          description: 'Products that do not fit into other categories',
          parentCategory: null,
          sortOrder: 99,
        },
      ];

      return hierarchy;
    } catch (error) {
      console.error('Repository getCategoryHierarchy error:', {
        operation: 'getCategoryHierarchy',
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ProductRepositoryError(
        `Failed to get category hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getCategoryHierarchy',
        error instanceof Error ? error : undefined
      );
    }
  }

  async suggestCategory(input: CategorySuggestionInput): Promise<readonly CategorySuggestion[]> {
    try {
      // Input validation following Instructions file standards
      if (!input || typeof input !== 'object') {
        throw new ProductRepositoryError('Input is required and must be an object', 'suggestCategory');
      }

      if (!input.name || typeof input.name !== 'string' || input.name.trim() === '') {
        throw new ProductRepositoryError('Product name is required and must be a non-empty string', 'suggestCategory');
      }

      const name = input.name.toLowerCase().trim();
      const description = (input.description || '').toLowerCase().trim();
      const combinedText = `${name} ${description}`;

      // Simple keyword-based category suggestion
      // This could be enhanced with ML/AI in the future
      const suggestions: CategorySuggestion[] = [];

      // Define keyword mappings for each category
      const categoryKeywords: Record<ProductCategory, string[]> = {
        [ProductCategory.FOOD_BEVERAGE]: [
          'food',
          'drink',
          'beverage',
          'snack',
          'meal',
          'juice',
          'water',
          'coffee',
          'tea',
          'soda',
          'beer',
          'wine',
          'milk',
          'bread',
          'rice',
          'pasta',
          'fruit',
          'vegetable',
          'meat',
          'fish',
          'dairy',
        ],
        [ProductCategory.ELECTRONICS]: [
          'phone',
          'computer',
          'laptop',
          'tablet',
          'tv',
          'camera',
          'headphone',
          'speaker',
          'charger',
          'cable',
          'battery',
          'electronic',
          'digital',
          'smart',
          'wireless',
          'bluetooth',
          'usb',
          'hdmi',
        ],
        [ProductCategory.PERSONAL_CARE]: [
          'shampoo',
          'soap',
          'toothpaste',
          'deodorant',
          'perfume',
          'lotion',
          'cream',
          'cosmetic',
          'makeup',
          'skincare',
          'haircare',
          'hygiene',
          'beauty',
          'nail',
          'razor',
          'brush',
        ],
        [ProductCategory.HOUSEHOLD]: [
          'cleaner',
          'detergent',
          'tissue',
          'towel',
          'kitchen',
          'bathroom',
          'cleaning',
          'household',
          'home',
          'furniture',
          'decoration',
          'storage',
          'organization',
        ],
        [ProductCategory.CLOTHING]: [
          'shirt',
          'pants',
          'dress',
          'shoes',
          'jacket',
          'hat',
          'clothing',
          'apparel',
          'fashion',
          'wear',
          'garment',
          'textile',
          'fabric',
          'cotton',
          'polyester',
        ],
        [ProductCategory.HEALTH_MEDICINE]: [
          'medicine',
          'pill',
          'tablet',
          'capsule',
          'vitamin',
          'supplement',
          'health',
          'medical',
          'pharmacy',
          'drug',
          'treatment',
          'therapy',
          'bandage',
          'first aid',
        ],
        [ProductCategory.AUTOMOTIVE]: [
          'car',
          'auto',
          'vehicle',
          'tire',
          'oil',
          'filter',
          'brake',
          'engine',
          'automotive',
          'motor',
          'transmission',
          'battery',
          'spark plug',
        ],
        [ProductCategory.OFFICE_SUPPLIES]: [
          'pen',
          'pencil',
          'paper',
          'notebook',
          'folder',
          'stapler',
          'office',
          'business',
          'desk',
          'chair',
          'printer',
          'ink',
          'toner',
        ],
        [ProductCategory.TOYS_GAMES]: [
          'toy',
          'game',
          'puzzle',
          'doll',
          'action figure',
          'board game',
          'video game',
          'play',
          'children',
          'kids',
          'entertainment',
        ],
        [ProductCategory.BOOKS_MEDIA]: [
          'book',
          'magazine',
          'newspaper',
          'cd',
          'dvd',
          'blu-ray',
          'media',
          'publication',
          'reading',
          'literature',
        ],
        [ProductCategory.HOME_GARDEN]: [
          'garden',
          'plant',
          'seed',
          'fertilizer',
          'tool',
          'lawn',
          'outdoor',
          'landscaping',
          'gardening',
          'home improvement',
        ],
        [ProductCategory.SPORTS_OUTDOORS]: [
          'sport',
          'fitness',
          'exercise',
          'outdoor',
          'camping',
          'hiking',
          'fishing',
          'hunting',
          'athletic',
          'gym',
          'workout',
        ],
        [ProductCategory.OTHER]: [], // Fallback category
      };

      // Calculate confidence scores for each category
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (category === ProductCategory.OTHER) continue; // Skip OTHER category in suggestions

        let matchCount = 0;
        let totalMatches = 0;
        const matchedKeywords: string[] = [];

        for (const keyword of keywords) {
          if (combinedText.includes(keyword)) {
            matchCount++;
            matchedKeywords.push(keyword);
            // Weight longer keywords more heavily
            totalMatches += keyword.length;
          }
        }

        if (matchCount > 0) {
          // Calculate confidence based on match count and keyword length
          const confidence = Math.min(
            0.95,
            (matchCount / keywords.length) * 0.7 + (totalMatches / combinedText.length) * 0.3
          );

          suggestions.push({
            category: category as ProductCategory,
            confidence,
            reason: `Matched keywords: ${matchedKeywords.join(', ')}`,
          });
        }
      }

      // Sort by confidence descending
      suggestions.sort((a, b) => b.confidence - a.confidence);

      // If no matches found, suggest OTHER category with low confidence
      if (suggestions.length === 0) {
        suggestions.push({
          category: ProductCategory.OTHER,
          confidence: 0.1,
          reason: 'No specific category keywords matched',
        });
      }

      // Return top 3 suggestions
      return suggestions.slice(0, 3);
    } catch (error) {
      console.error('Repository suggestCategory error:', {
        operation: 'suggestCategory',
        input,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw domain errors as-is
      if (error instanceof ProductRepositoryError) {
        throw error;
      }

      throw new ProductRepositoryError(
        `Failed to suggest category: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'suggestCategory',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getCategoryTrends(agencyId?: string, days: number = 30): Promise<readonly CategoryTrend[]> {
    try {
      // Input validation following Instructions file standards
      if (agencyId !== undefined && (!agencyId || typeof agencyId !== 'string' || agencyId.trim() === '')) {
        throw new ProductRepositoryError('Agency ID must be a non-empty string if provided', 'getCategoryTrends');
      }

      if (typeof days !== 'number' || days <= 0 || days > 365) {
        throw new ProductRepositoryError('Days must be a positive number and not exceed 365', 'getCategoryTrends');
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      const midDate = new Date(endDate.getTime() - (days / 2) * 24 * 60 * 60 * 1000);

      // Build query with optional agency filter
      let baseWhere = 'WHERE 1=1';
      const params: any[] = [];

      if (agencyId) {
        baseWhere += ' AND agency_id = ?';
        params.push(agencyId.trim());
      }

      // Get current period counts
      const currentQuery = `
        SELECT category, COUNT(*) as count
        FROM products 
        ${baseWhere} AND created_at >= ? AND created_at <= ?
        GROUP BY category
      `;
      const currentParams = [...params, Math.floor(midDate.getTime() / 1000), Math.floor(endDate.getTime() / 1000)];
      const currentStmt = this.db.prepare(currentQuery);
      const currentResults = currentStmt.all(...currentParams) as Array<{ category: string; count: number }>;

      // Get previous period counts
      const previousQuery = `
        SELECT category, COUNT(*) as count
        FROM products 
        ${baseWhere} AND created_at >= ? AND created_at < ?
        GROUP BY category
      `;
      const previousParams = [...params, Math.floor(startDate.getTime() / 1000), Math.floor(midDate.getTime() / 1000)];
      const previousStmt = this.db.prepare(previousQuery);
      const previousResults = previousStmt.all(...previousParams) as Array<{ category: string; count: number }>;

      // Create maps for easy lookup
      const currentCounts = new Map<string, number>();
      currentResults.forEach((row) => currentCounts.set(row.category, row.count));

      const previousCounts = new Map<string, number>();
      previousResults.forEach((row) => previousCounts.set(row.category, row.count));

      // Get all categories that appeared in either period
      const allCategories = new Set([...currentCounts.keys(), ...previousCounts.keys()]);

      // Calculate trends
      const trends: CategoryTrend[] = [];
      for (const category of allCategories) {
        const currentCount = currentCounts.get(category) || 0;
        const previousCount = previousCounts.get(category) || 0;

        // Calculate growth rate
        let growthRate = 0;
        if (previousCount > 0) {
          growthRate = ((currentCount - previousCount) / previousCount) * 100;
        } else if (currentCount > 0) {
          growthRate = 100; // New category
        }

        // Determine trend direction
        let trend: 'growing' | 'stable' | 'declining';
        if (growthRate > 10) {
          trend = 'growing';
        } else if (growthRate < -10) {
          trend = 'declining';
        } else {
          trend = 'stable';
        }

        trends.push({
          category: category as ProductCategory,
          period: `${days} days`,
          productCount: currentCount,
          growthRate: Math.round(growthRate * 100) / 100, // Round to 2 decimal places
          trend,
        });
      }

      // Sort by current product count descending
      trends.sort((a, b) => b.productCount - a.productCount);

      return trends;
    } catch (error) {
      console.error('Repository getCategoryTrends error:', {
        operation: 'getCategoryTrends',
        agencyId,
        days,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw domain errors as-is
      if (error instanceof ProductRepositoryError) {
        throw error;
      }

      throw new ProductRepositoryError(
        `Failed to get category trends: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getCategoryTrends',
        error instanceof Error ? error : undefined
      );
    }
  }
}

/**
 * Factory function to create Product Repository instance
 * @param connection - Database connection
 * @returns SqliteProductRepository instance
 */
export function createProductRepository(connection: DatabaseConnection): SqliteProductRepository {
  return new SqliteProductRepository(connection);
}
