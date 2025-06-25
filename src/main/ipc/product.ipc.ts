/**
 * Product IPC Handler - Step 1: Core Handler
 *
 * Secure IPC bridge for product operations in Electron main process.
 * This is the minimal functional piece establishing the foundation for product operations.
 * Follows security-first design with input validation and proper error handling.
 *
 * @domain Product Management
 * @pattern Command/Query Responsibility Segregation (CQRS)
 * @architecture Hexagonal Architecture (Adapter)
 * @security Input validation, secure error handling
 * @version 1.0.0
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { type IProductRepository } from '../../domain/repositories/product.repository';
import { type IUserRepository } from '../../domain/repositories/user.repository';
import { CreateProductHandler } from '../../application/handlers/product/create-product.handler';
import { GetProductsHandler } from '../../application/handlers/product/get-products.handler';
import { UpdateProductHandler } from '../../application/handlers/product/update-product.handler';
import { DeleteProductHandler } from '../../application/handlers/product/delete-product.handler';
import { AdvancedSearchProductsHandler } from '../../application/handlers/product/advanced-search-products.handler-simple';
import { GetProductsQuery } from '../../application/queries/product/get-products.query';
import { AdvancedSearchProductsQuery } from '../../application/queries/product/advanced-search-products.query';

/**
 * Product operation types for IPC
 */
export type ProductOperation =
  | 'get-products'
  | 'create-product'
  | 'update-product'
  | 'delete-product'
  | 'advanced-search-products';

/**
 * Base IPC response interface
 */
export interface ProductIpcResponse<T = Record<string, unknown>> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly code?: string;
  readonly timestamp: number;
  readonly operation?: ProductOperation;
  readonly duration?: number;
}

/**
 * Product filters interface for get-products
 */
export interface ProductFilters {
  readonly agencyId?: string;
  readonly category?: string;
  readonly status?: string;
  readonly lowStock?: boolean;
  readonly outOfStock?: boolean;
  readonly search?: string;
  readonly supplierId?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Create product request interface
 */
export interface CreateProductRequest {
  readonly sku: string;
  readonly name: string;
  readonly description?: string;
  readonly category: string;
  readonly unitOfMeasure: string;
  readonly costPrice: number;
  readonly costPriceCurrency: string;
  readonly sellingPrice: number;
  readonly sellingPriceCurrency: string;
  readonly barcode?: string;
  readonly supplierId?: string;
  readonly supplierProductCode?: string;
  readonly minStockLevel: number;
  readonly maxStockLevel: number;
  readonly reorderLevel: number;
  readonly currentStock: number;
  readonly reservedStock?: number;
  readonly weight?: number;
  readonly dimensions?: {
    readonly length: number;
    readonly width: number;
    readonly height: number;
  };
  readonly tags?: string[];
  readonly agencyId: string;
  readonly createdBy: string;
}

/**
 * Update product request interface
 */
export interface UpdateProductRequest {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly category?: string;
  readonly unitOfMeasure?: string;
  readonly costPrice?: number;
  readonly costPriceCurrency?: string;
  readonly sellingPrice?: number;
  readonly sellingPriceCurrency?: string;
  readonly barcode?: string;
  readonly supplierId?: string;
  readonly supplierProductCode?: string;
  readonly minStockLevel?: number;
  readonly maxStockLevel?: number;
  readonly reorderLevel?: number;
  readonly weight?: number;
  readonly dimensions?: {
    readonly length: number;
    readonly width: number;
    readonly height: number;
  };
  readonly tags?: string[];
  readonly status?: string;
  readonly updatedBy: string;
}

/**
 * Delete product request interface
 */
export interface DeleteProductRequest {
  readonly id: string;
  readonly deletedBy: string;
  readonly reason?: string;
}

/**
 * Advanced search products request interface
 */
export interface AdvancedSearchProductsRequest {
  readonly requestedBy: string;
  readonly globalSearch?: string;
  readonly categories?: string[];
  readonly statuses?: string[];
  readonly tags?: string[];
  readonly excludeTags?: string[];
  readonly priceRanges?: Array<{
    readonly min?: number;
    readonly max?: number;
    readonly type: 'cost' | 'selling';
  }>;
  readonly stockFilter?: {
    readonly min?: number;
    readonly max?: number;
    readonly stockStatus?: 'in' | 'low' | 'out';
  };
  readonly supplierIds?: string[];
  readonly hasBarcode?: boolean;
  readonly hasSupplier?: boolean;
  readonly isActive?: boolean;
  readonly needsReorder?: boolean;
  readonly createdDate?: {
    readonly from?: Date;
    readonly to?: Date;
  };
  readonly updatedDate?: {
    readonly from?: Date;
    readonly to?: Date;
  };
  readonly sortBy?:
    | 'name'
    | 'sku'
    | 'category'
    | 'status'
    | 'currentStock'
    | 'createdAt'
    | 'updatedAt'
    | 'relevance'
    | 'score';
  readonly sortOrder?: 'asc' | 'desc';
  readonly page?: number;
  readonly limit?: number;
  readonly minScore?: number;
  readonly agencyId?: string;
}

/**
 * Product response interface
 */
export interface ProductResponse {
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
  readonly createdAt: string;
  readonly updatedBy: string | undefined;
  readonly updatedAt: string | undefined;
  readonly needsReorder: boolean;
  readonly isOutOfStock: boolean;
  readonly isLowStock: boolean;
  readonly profitMargin: number;
}

/**
 * Products list response interface
 */
export interface ProductsListResponse {
  readonly products: ProductResponse[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

/**
 * Advanced search product result interface
 */
export interface AdvancedSearchProductResult extends ProductResponse {
  readonly score?: number;
  readonly highlights?: string[];
  readonly matchedFields?: readonly string[] | undefined;
  readonly inventoryValue?: number;
  readonly potentialRevenue?: number;
}

/**
 * Advanced search products response interface
 */
export interface AdvancedSearchProductsResponse {
  readonly products: AdvancedSearchProductResult[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly executionTime: number;
  readonly searchMetadata?: {
    readonly searchQuery?: string;
    readonly appliedFilters: string[];
    readonly suggestedFilters?: string[];
  };
}

// Zod Schemas for Input Validation

/**
 * Product filters validation schema
 */
const ProductFiltersSchema = z.object({
  agencyId: z.string().uuid().optional(),
  category: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'PENDING_APPROVAL', 'OUT_OF_STOCK']).optional(),
  lowStock: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
  search: z.string().min(1).max(100).optional(),
  supplierId: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'sku', 'category', 'status', 'currentStock', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Create product validation schema
 */
const CreateProductRequestSchema = z.object({
  sku: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Z0-9-_]+$/, 'SKU must contain only uppercase letters, numbers, hyphens, and underscores'),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.enum([
    'FOOD_BEVERAGE',
    'HOUSEHOLD',
    'PERSONAL_CARE',
    'ELECTRONICS',
    'CLOTHING',
    'HEALTH_MEDICINE',
    'AUTOMOTIVE',
    'OFFICE_SUPPLIES',
    'TOYS_GAMES',
    'BOOKS_MEDIA',
    'HOME_GARDEN',
    'SPORTS_OUTDOORS',
    'OTHER',
  ]),
  unitOfMeasure: z.enum([
    'PIECE',
    'KILOGRAM',
    'GRAM',
    'LITER',
    'MILLILITER',
    'METER',
    'CENTIMETER',
    'PACK',
    'BOX',
    'DOZEN',
    'CASE',
  ]),
  costPrice: z.number().positive(),
  costPriceCurrency: z.enum(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']).default('USD'),
  sellingPrice: z.number().positive(),
  sellingPriceCurrency: z.enum(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']).default('USD'),
  barcode: z.string().min(8).max(20).optional(),
  supplierId: z.string().uuid().optional(),
  supplierProductCode: z.string().max(100).optional(),
  minStockLevel: z.number().int().min(0),
  maxStockLevel: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  currentStock: z.number().int().min(0),
  reservedStock: z.number().int().min(0).default(0),
  weight: z.number().positive().optional(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).default([]),
  agencyId: z.string().uuid(),
  createdBy: z.string().uuid(),
});

/**
 * Update product validation schema
 */
const UpdateProductRequestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z
    .enum([
      'FOOD_BEVERAGE',
      'HOUSEHOLD',
      'PERSONAL_CARE',
      'ELECTRONICS',
      'CLOTHING',
      'HEALTH_MEDICINE',
      'AUTOMOTIVE',
      'OFFICE_SUPPLIES',
      'TOYS_GAMES',
      'BOOKS_MEDIA',
      'HOME_GARDEN',
      'SPORTS_OUTDOORS',
      'OTHER',
    ])
    .optional(),
  unitOfMeasure: z
    .enum(['PIECE', 'KILOGRAM', 'GRAM', 'LITER', 'MILLILITER', 'METER', 'CENTIMETER', 'PACK', 'BOX', 'DOZEN', 'CASE'])
    .optional(),
  costPrice: z.number().positive().optional(),
  costPriceCurrency: z.enum(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']).optional(),
  sellingPrice: z.number().positive().optional(),
  sellingPriceCurrency: z.enum(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']).optional(),
  barcode: z.string().min(8).max(20).optional(),
  supplierId: z.string().uuid().optional(),
  supplierProductCode: z.string().max(100).optional(),
  minStockLevel: z.number().int().min(0).optional(),
  maxStockLevel: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  weight: z.number().positive().optional(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'PENDING_APPROVAL', 'OUT_OF_STOCK']).optional(),
  updatedBy: z.string().uuid(),
});

/**
 * Delete product validation schema
 */
const DeleteProductRequestSchema = z.object({
  id: z.string().uuid(),
  deletedBy: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

/**
 * Advanced search products validation schema
 */
const AdvancedSearchProductsRequestSchema = z.object({
  requestedBy: z.string().uuid(),
  globalSearch: z.string().min(1).max(200).optional(),
  categories: z.array(z.string().min(1)).max(10).optional(),
  statuses: z.array(z.string().min(1)).max(10).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  excludeTags: z.array(z.string().min(1).max(50)).max(20).optional(),
  priceRanges: z
    .array(
      z.object({
        min: z.number().min(0).optional(),
        max: z.number().min(0).optional(),
        type: z.enum(['cost', 'selling']),
      })
    )
    .max(5)
    .optional(),
  stockFilter: z
    .object({
      min: z.number().int().min(0).optional(),
      max: z.number().int().min(0).optional(),
      stockStatus: z.enum(['in', 'low', 'out']).optional(),
    })
    .optional(),
  supplierIds: z.array(z.string().uuid()).max(20).optional(),
  hasBarcode: z.boolean().optional(),
  hasSupplier: z.boolean().optional(),
  isActive: z.boolean().optional(),
  needsReorder: z.boolean().optional(),
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
  sortBy: z
    .enum(['name', 'sku', 'category', 'status', 'currentStock', 'createdAt', 'updatedAt', 'relevance', 'score'])
    .default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  minScore: z.number().min(0).max(1).optional(),
  agencyId: z.string().uuid().optional(),
});

/**
 * Product IPC Error Classes
 */
export class ProductIpcError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProductIpcError';
  }
}

export class ProductValidationError extends ProductIpcError {
  constructor(message: string, originalError?: Error) {
    super(message, 'PRODUCT_VALIDATION_ERROR', originalError);
    this.name = 'ProductValidationError';
  }
}

export class ProductSecurityError extends ProductIpcError {
  constructor(message: string, originalError?: Error) {
    super(message, 'PRODUCT_SECURITY_ERROR', originalError);
    this.name = 'ProductSecurityError';
  }
}

export class ProductOperationError extends ProductIpcError {
  constructor(message: string, originalError?: Error) {
    super(message, 'PRODUCT_OPERATION_ERROR', originalError);
    this.name = 'ProductOperationError';
  }
}

/**
 * Product IPC Handler
 *
 * Handles all product-related IPC communications with security-first design.
 * Implements input validation, error handling, and proper response formatting.
 */
export class ProductIpcHandler {
  private readonly registeredChannels = new Set<string>();
  private readonly createProductHandler: CreateProductHandler;
  private readonly getProductsHandler: GetProductsHandler;
  private readonly updateProductHandler: UpdateProductHandler;
  private readonly deleteProductHandler: DeleteProductHandler;
  private readonly advancedSearchProductsHandler: AdvancedSearchProductsHandler;

  /**
   * Private constructor to enforce factory pattern and dependency injection
   * @param productRepository - Product repository for data operations
   * @param userRepository - User repository for authorization
   * @private
   */
  private constructor(
    private readonly productRepository: IProductRepository,
    private readonly userRepository: IUserRepository
  ) {
    this.createProductHandler = new CreateProductHandler(productRepository, userRepository);
    this.getProductsHandler = new GetProductsHandler(productRepository, userRepository);
    this.updateProductHandler = new UpdateProductHandler(productRepository, userRepository);
    this.deleteProductHandler = new DeleteProductHandler(productRepository, userRepository);
    this.advancedSearchProductsHandler = new AdvancedSearchProductsHandler(productRepository, userRepository);
  }

  /**
   * Factory method to create ProductIpcHandler instance
   * @param productRepository - Product repository for data operations
   * @param userRepository - User repository for authorization
   * @returns ProductIpcHandler instance
   */
  public static create(productRepository: IProductRepository, userRepository: IUserRepository): ProductIpcHandler {
    return new ProductIpcHandler(productRepository, userRepository);
  }

  /**
   * Registers all product IPC handlers
   */
  public registerHandlers(): void {
    ipcMain.handle('inventory:get-products', this.handleGetProducts.bind(this));
    ipcMain.handle('inventory:create-product', this.handleCreateProduct.bind(this));
    ipcMain.handle('inventory:update-product', this.handleUpdateProduct.bind(this));
    ipcMain.handle('inventory:delete-product', this.handleDeleteProduct.bind(this));
    ipcMain.handle('inventory:advanced-search-products', this.handleAdvancedSearchProducts.bind(this));

    this.registeredChannels.add('inventory:get-products');
    this.registeredChannels.add('inventory:create-product');
    this.registeredChannels.add('inventory:update-product');
    this.registeredChannels.add('inventory:delete-product');
    this.registeredChannels.add('inventory:advanced-search-products');
  }

  /**
   * Unregisters all product IPC handlers
   */
  public unregisterHandlers(): void {
    const channels = [
      'inventory:get-products',
      'inventory:create-product',
      'inventory:update-product',
      'inventory:delete-product',
      'inventory:advanced-search-products',
    ];

    channels.forEach((channel) => {
      ipcMain.removeHandler(channel);
      this.registeredChannels.delete(channel);
    });
  }

  /**
   * Gets handler statistics for monitoring
   */
  public getStats(): { registeredChannels: number; totalHandlers: number } {
    return {
      registeredChannels: this.registeredChannels.size,
      totalHandlers: 5, // get, create, update, delete, advanced-search
    };
  }

  /**
   * Real handler for get products - Step 3b Implementation
   * @private
   */
  private async handleGetProducts(event: IpcMainInvokeEvent, filters: unknown): Promise<ProductIpcResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Validate input with Zod schema
      const validatedFilters = ProductFiltersSchema.parse(filters || {});

      // Step 2: Extract requestedBy from event context (assuming it's set by auth middleware)
      // In real implementation, this would come from authenticated session
      // Extract user ID from event context - needs proper authentication
      const requestedBy = 'system-user'; // TODO: Implement proper user extraction from authenticated session

      // Step 3: Convert to query format
      const query: Record<string, unknown> = {
        requestedBy,
        page: validatedFilters.page,
        limit: validatedFilters.limit,
        sortBy: validatedFilters.sortBy,
        sortOrder: validatedFilters.sortOrder,
      };

      // Add optional properties only if they exist
      if (validatedFilters.agencyId !== undefined) {
        query.agencyId = validatedFilters.agencyId;
      }
      if (validatedFilters.category !== undefined) {
        query.category = validatedFilters.category;
      }
      if (validatedFilters.status !== undefined) {
        query.status = validatedFilters.status;
      }
      if (validatedFilters.lowStock !== undefined) {
        query.lowStock = validatedFilters.lowStock;
      }
      if (validatedFilters.outOfStock !== undefined) {
        query.outOfStock = validatedFilters.outOfStock;
      }
      if (validatedFilters.search !== undefined) {
        query.search = validatedFilters.search;
      }
      if (validatedFilters.supplierId !== undefined) {
        query.supplierId = validatedFilters.supplierId;
      }

      // Step 4: Execute query through handler
      const result = await this.getProductsHandler.handle(query);

      // Step 5: Convert to response format
      const productsResponse: ProductsListResponse = {
        products: result.products.map((product) => ({
          id: product.id,
          sku: product.sku,
          name: product.name,
          description: product.description,
          category: product.category,
          unitOfMeasure: product.unitOfMeasure,
          status: product.status,
          costPrice: product.costPrice,
          costPriceCurrency: product.costPriceCurrency,
          sellingPrice: product.sellingPrice,
          sellingPriceCurrency: product.sellingPriceCurrency,
          barcode: product.barcode,
          supplierId: product.supplierId,
          supplierProductCode: product.supplierProductCode,
          minStockLevel: product.minStockLevel,
          maxStockLevel: product.maxStockLevel,
          reorderLevel: product.reorderLevel,
          currentStock: product.currentStock,
          reservedStock: product.reservedStock,
          availableStock: product.availableStock,
          weight: product.weight,
          dimensions: product.dimensions,
          tags: product.tags,
          agencyId: product.agencyId,
          createdBy: product.createdBy,
          createdAt: product.createdAt.toISOString(),
          updatedBy: product.updatedBy,
          updatedAt: product.updatedAt?.toISOString(),
          needsReorder: product.needsReorder,
          isOutOfStock: product.isOutOfStock,
          isLowStock: product.isLowStock,
          profitMargin: product.profitMargin,
        })),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
      };

      // Step 6: Return success response
      return {
        success: true,
        data: productsResponse,
        timestamp: Date.now(),
        operation: 'get-products',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      // Step 7: Handle errors safely
      return this.getSafeErrorResponse(error as Error, 'get-products', startTime);
    }
  }

  /**
   * Real handler for create product - Step 3a Implementation
   * @private
   */
  private async handleCreateProduct(event: IpcMainInvokeEvent, request: unknown): Promise<ProductIpcResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Validate input with Zod schema
      const validatedRequest = CreateProductRequestSchema.parse(request);

      // Step 2: Convert to command format
      const command: Record<string, unknown> = {
        sku: validatedRequest.sku,
        name: validatedRequest.name,
        category: validatedRequest.category,
        unitOfMeasure: validatedRequest.unitOfMeasure,
        costPrice: validatedRequest.costPrice,
        costPriceCurrency: validatedRequest.costPriceCurrency,
        sellingPrice: validatedRequest.sellingPrice,
        sellingPriceCurrency: validatedRequest.sellingPriceCurrency,
        minStockLevel: validatedRequest.minStockLevel,
        maxStockLevel: validatedRequest.maxStockLevel,
        reorderLevel: validatedRequest.reorderLevel,
        currentStock: validatedRequest.currentStock,
        reservedStock: validatedRequest.reservedStock || 0,
        agencyId: validatedRequest.agencyId,
        createdBy: validatedRequest.createdBy,
      };

      // Add optional properties only if they exist
      if (validatedRequest.description !== undefined) {
        command.description = validatedRequest.description;
      }
      if (validatedRequest.barcode !== undefined) {
        command.barcode = validatedRequest.barcode;
      }
      if (validatedRequest.supplierId !== undefined) {
        command.supplierId = validatedRequest.supplierId;
      }
      if (validatedRequest.supplierProductCode !== undefined) {
        command.supplierProductCode = validatedRequest.supplierProductCode;
      }
      if (validatedRequest.weight !== undefined) {
        command.weight = validatedRequest.weight;
      }
      if (validatedRequest.dimensions !== undefined) {
        command.dimensions = validatedRequest.dimensions;
      }
      if (validatedRequest.tags !== undefined && validatedRequest.tags.length > 0) {
        command.tags = validatedRequest.tags;
      }

      // Step 3: Execute command through handler
      const productId = await this.createProductHandler.handle(command);

      // Step 4: Return success response
      return {
        success: true,
        data: {
          productId,
          message: 'Product created successfully',
        },
        timestamp: Date.now(),
        operation: 'create-product',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      // Step 5: Handle errors safely
      return this.getSafeErrorResponse(error as Error, 'create-product', startTime);
    }
  }

  /**
   * Creates safe error response without exposing sensitive information
   * @private
   */
  private getSafeErrorResponse(error: Error, operation: ProductOperation, startTime: number): ProductIpcResponse {
    let errorMessage = 'An unexpected error occurred';
    let errorCode = 'PRODUCT_UNKNOWN_ERROR';

    // Handle known error types
    if (error.name === 'ZodError') {
      errorMessage = 'Invalid input data';
      errorCode = 'PRODUCT_VALIDATION_ERROR';
    } else if (
      error.message.includes('Creating user not found') ||
      error.message.includes('Requesting user not found')
    ) {
      errorMessage = 'User not found';
      errorCode = 'PRODUCT_USER_NOT_FOUND';
    } else if (error.message.includes('Insufficient permissions')) {
      if (operation === 'create-product') {
        errorMessage = 'Insufficient permissions to create product';
      } else if (operation === 'get-products') {
        errorMessage = 'Insufficient permissions to view products';
      } else if (operation === 'update-product') {
        errorMessage = 'Insufficient permissions to update product';
      } else if (operation === 'delete-product') {
        errorMessage = 'Insufficient permissions to delete product';
      } else {
        errorMessage = 'Insufficient permissions';
      }
      errorCode = 'PRODUCT_INSUFFICIENT_PERMISSIONS';
    } else if (error.message.includes('Product not found')) {
      errorMessage = 'Product not found';
      errorCode = 'PRODUCT_NOT_FOUND';
    } else if (error.message.includes('Cannot update product from different agency')) {
      errorMessage = 'Cannot update product from different agency';
      errorCode = 'PRODUCT_AGENCY_MISMATCH';
    } else if (error.message.includes('Invalid status transition')) {
      errorMessage = 'Invalid product status transition';
      errorCode = 'PRODUCT_INVALID_STATUS_TRANSITION';
    } else if (error.message.includes('already exists')) {
      if (error.message.includes('barcode')) {
        errorMessage = 'Product with this barcode already exists';
        errorCode = 'PRODUCT_BARCODE_EXISTS';
      } else {
        errorMessage = 'Product with this SKU already exists';
        errorCode = 'PRODUCT_ALREADY_EXISTS';
      }
    } else if (error.message.includes('At least one field must be provided for product update')) {
      errorMessage = 'Product validation failed';
      errorCode = 'PRODUCT_VALIDATION_ERROR';
    } else if (error.message.includes('validation error') || error.message.includes('validation failed')) {
      errorMessage = 'Product validation failed';
      errorCode = 'PRODUCT_VALIDATION_ERROR';
    } else if (error.message.includes('Updating user not found')) {
      errorMessage = 'Updating user not found';
      errorCode = 'PRODUCT_USER_NOT_FOUND';
    } else if (error.message.includes('Deleting user not found')) {
      errorMessage = 'Deleting user not found';
      errorCode = 'PRODUCT_USER_NOT_FOUND';
    } else if (error.message.includes('Product is already discontinued')) {
      errorMessage = 'Product is already discontinued';
      errorCode = 'PRODUCT_ALREADY_DISCONTINUED';
    }

    const endTime = Date.now();
    const duration = Math.max(1, endTime - startTime); // Ensure minimum 1ms duration

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: endTime,
      operation,
      duration,
    };
  }

  /**
   * Real handler for update product - Step 3c Implementation
   * @private
   */
  private async handleUpdateProduct(event: IpcMainInvokeEvent, request: unknown): Promise<ProductIpcResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Validate input with Zod schema
      const validatedRequest = UpdateProductRequestSchema.parse(request);

      // Step 2: Convert to command format
      const command: any = {
        id: validatedRequest.id,
        updatedBy: validatedRequest.updatedBy,
      };

      // Add optional properties only if they exist
      if (validatedRequest.name !== undefined) {
        command.name = validatedRequest.name;
      }
      if (validatedRequest.description !== undefined) {
        command.description = validatedRequest.description;
      }
      if (validatedRequest.category !== undefined) {
        command.category = validatedRequest.category;
      }
      if (validatedRequest.unitOfMeasure !== undefined) {
        command.unitOfMeasure = validatedRequest.unitOfMeasure;
      }
      if (validatedRequest.costPrice !== undefined) {
        command.costPrice = validatedRequest.costPrice;
      }
      if (validatedRequest.costPriceCurrency !== undefined) {
        command.costPriceCurrency = validatedRequest.costPriceCurrency;
      }
      if (validatedRequest.sellingPrice !== undefined) {
        command.sellingPrice = validatedRequest.sellingPrice;
      }
      if (validatedRequest.sellingPriceCurrency !== undefined) {
        command.sellingPriceCurrency = validatedRequest.sellingPriceCurrency;
      }
      if (validatedRequest.barcode !== undefined) {
        command.barcode = validatedRequest.barcode;
      }
      if (validatedRequest.supplierId !== undefined) {
        command.supplierId = validatedRequest.supplierId;
      }
      if (validatedRequest.supplierProductCode !== undefined) {
        command.supplierProductCode = validatedRequest.supplierProductCode;
      }
      if (validatedRequest.minStockLevel !== undefined) {
        command.minStockLevel = validatedRequest.minStockLevel;
      }
      if (validatedRequest.maxStockLevel !== undefined) {
        command.maxStockLevel = validatedRequest.maxStockLevel;
      }
      if (validatedRequest.reorderLevel !== undefined) {
        command.reorderLevel = validatedRequest.reorderLevel;
      }
      if (validatedRequest.weight !== undefined) {
        command.weight = validatedRequest.weight;
      }
      if (validatedRequest.dimensions !== undefined) {
        command.dimensions = validatedRequest.dimensions;
      }
      if (validatedRequest.tags !== undefined && validatedRequest.tags.length > 0) {
        command.tags = validatedRequest.tags;
      }
      if (validatedRequest.status !== undefined) {
        command.status = validatedRequest.status;
      }

      // Step 3: Execute command through handler
      const productId = await this.updateProductHandler.handle(command);

      // Step 4: Return success response
      const endTime = Date.now();
      const duration = Math.max(1, endTime - startTime); // Ensure minimum 1ms duration

      return {
        success: true,
        data: {
          productId,
          message: 'Product updated successfully',
        },
        timestamp: endTime,
        operation: 'update-product',
        duration,
      };
    } catch (error) {
      // Step 5: Handle errors safely
      return this.getSafeErrorResponse(error as Error, 'update-product', startTime);
    }
  }

  /**
   * Real handler for delete product - Step 3d Implementation
   * @private
   */
  private async handleDeleteProduct(event: IpcMainInvokeEvent, request: unknown): Promise<ProductIpcResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Validate input with Zod schema
      const validatedRequest = DeleteProductRequestSchema.parse(request);

      // Step 2: Convert to command format
      const command: any = {
        id: validatedRequest.id,
        deletedBy: validatedRequest.deletedBy,
      };

      // Add optional properties only if they exist
      if (validatedRequest.reason !== undefined) {
        command.reason = validatedRequest.reason;
      }

      // Step 3: Execute command through handler
      const productId = await this.deleteProductHandler.handle(command);

      // Step 4: Return success response
      const endTime = Date.now();
      const duration = Math.max(1, endTime - startTime); // Ensure minimum 1ms duration

      return {
        success: true,
        data: {
          productId,
          message: 'Product deleted successfully',
        },
        timestamp: endTime,
        operation: 'delete-product',
        duration,
      };
    } catch (error) {
      // Step 5: Handle errors safely
      return this.getSafeErrorResponse(error as Error, 'delete-product', startTime);
    }
  }

  /**
   * Real handler for advanced search products - Step 3e Implementation
   * @private
   */
  private async handleAdvancedSearchProducts(event: IpcMainInvokeEvent, request: unknown): Promise<ProductIpcResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Validate input with Zod schema
      const validatedRequest = AdvancedSearchProductsRequestSchema.parse(request);

      // Step 2: Convert to query format
      const query: any = {
        requestedBy: validatedRequest.requestedBy,
        globalSearch: validatedRequest.globalSearch,
        categories: validatedRequest.categories,
        statuses: validatedRequest.statuses,
        tags: validatedRequest.tags,
        excludeTags: validatedRequest.excludeTags,
        priceRanges: validatedRequest.priceRanges,
        stockFilter: validatedRequest.stockFilter,
        supplierIds: validatedRequest.supplierIds,
        hasBarcode: validatedRequest.hasBarcode,
        hasSupplier: validatedRequest.hasSupplier,
        isActive: validatedRequest.isActive,
        needsReorder: validatedRequest.needsReorder,
        createdDate: validatedRequest.createdDate,
        updatedDate: validatedRequest.updatedDate,
        sortBy: validatedRequest.sortBy,
        sortOrder: validatedRequest.sortOrder,
        page: validatedRequest.page,
        limit: validatedRequest.limit,
        minScore: validatedRequest.minScore,
        agencyId: validatedRequest.agencyId,
      };

      // Step 3: Execute query through handler
      const result = await this.advancedSearchProductsHandler.handle(query);

      // Step 4: Convert to response format
      const advancedSearchResponse: AdvancedSearchProductsResponse = {
        products: result.products.map((product) => ({
          id: product.id,
          sku: product.sku,
          name: product.name,
          description: product.description,
          category: product.category,
          unitOfMeasure: product.unitOfMeasure,
          status: product.status,
          costPrice: product.costPrice,
          costPriceCurrency: product.costPriceCurrency,
          sellingPrice: product.sellingPrice,
          sellingPriceCurrency: product.sellingPriceCurrency,
          barcode: product.barcode,
          supplierId: product.supplierId,
          supplierProductCode: product.supplierProductCode,
          minStockLevel: product.minStockLevel,
          maxStockLevel: product.maxStockLevel,
          reorderLevel: product.reorderLevel,
          currentStock: product.currentStock,
          reservedStock: product.reservedStock,
          availableStock: product.availableStock,
          weight: product.weight,
          dimensions: product.dimensions,
          tags: product.tags,
          agencyId: product.agencyId,
          createdBy: product.createdBy,
          createdAt: product.createdAt.toISOString(),
          updatedBy: product.updatedBy,
          updatedAt: product.updatedAt?.toISOString(),
          needsReorder: product.needsReorder,
          isOutOfStock: product.isOutOfStock,
          isLowStock: product.isLowStock,
          profitMargin: product.profitMargin,
          ...(product.score !== undefined && { score: product.score }),
          ...(product.highlights && { highlights: Object.values(product.highlights).flat() }),
          ...(product.matchedFields && { matchedFields: product.matchedFields }),
          ...(product.inventoryValue !== undefined && { inventoryValue: product.inventoryValue }),
          ...(product.potentialRevenue !== undefined && { potentialRevenue: product.potentialRevenue }),
        })),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
        executionTime: result.searchTime || 0,
        ...((result.searchQuery || result.appliedFilters || result.suggestions) && {
          searchMetadata: {
            ...(result.searchQuery && { searchQuery: result.searchQuery }),
            appliedFilters: result.appliedFilters ? Object.keys(result.appliedFilters) : [],
            ...(result.suggestions && { suggestedFilters: result.suggestions.map((s) => s.query) }),
          },
        }),
      };

      // Step 5: Return success response
      return {
        success: true,
        data: advancedSearchResponse,
        timestamp: Date.now(),
        operation: 'advanced-search-products',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      // Step 6: Handle errors safely
      return this.getSafeErrorResponse(error as Error, 'advanced-search-products', startTime);
    }
  }
}

/**
 * Factory function to create ProductIpcHandler
 * @param productRepository - Product repository for data operations
 * @param userRepository - User repository for authorization
 * @returns ProductIpcHandler instance
 */
export function createProductIpcHandler(
  productRepository: IProductRepository,
  userRepository: IUserRepository
): ProductIpcHandler {
  return ProductIpcHandler.create(productRepository, userRepository);
}
