/**
 * Get Products Handler
 *
 * Handler for GetProducts query following CQRS pattern.
 * Implements business logic for product retrieval with proper authorization.
 *
 * @domain Product Management
 * @pattern Query Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  GetProductsQuery,
  ProductQueryResult,
  GetProductsQueryResult,
  validateGetProductsQuery,
} from '../../queries/product/get-products.query';
import { Product } from '../../../domain/entities/product';
import { Permission } from '../../../domain/value-objects/role';
import { IProductRepository, ProductSearchCriteria } from '../../../domain/repositories/product.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';

/**
 * Handler for GetProducts query
 * Implements secure product retrieval with authorization checks and filtering
 */
export class GetProductsHandler {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles get products query with filtering and pagination
   * @param query - GetProducts query with filters
   * @returns Promise<GetProductsQueryResult> - Paginated product results
   * @throws Error when user not found or insufficient permissions
   */
  async handle(query: GetProductsQuery): Promise<GetProductsQueryResult> {
    // Step 1: Validate query
    validateGetProductsQuery(query);

    // Step 2: Get the requesting user for authorization
    const requestingUser = await this.userRepository.findById(query.requestedBy);
    if (!requestingUser) {
      throw new Error('Requesting user not found');
    }

    // Step 3: Authorization check - user needs READ_PRODUCT permission
    if (!requestingUser.hasPermission(Permission.READ_PRODUCT)) {
      throw new Error('Insufficient permissions to view products');
    }

    // Step 4: Build search criteria from query
    const searchCriteria: ProductSearchCriteria = {
      limit: query.limit || 50, // Default limit
      offset: query.page ? (query.page - 1) * (query.limit || 50) : 0,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };

    // Add optional properties only if they exist
    if (query.agencyId !== undefined) {
      (searchCriteria as any).agencyId = query.agencyId;
    }
    if (query.category !== undefined) {
      (searchCriteria as any).category = query.category;
    }
    if (query.status !== undefined) {
      (searchCriteria as any).status = query.status;
    }
    if (query.lowStock !== undefined) {
      (searchCriteria as any).lowStock = query.lowStock;
    }
    if (query.outOfStock !== undefined) {
      (searchCriteria as any).outOfStock = query.outOfStock;
    }
    if (query.search !== undefined) {
      (searchCriteria as any).search = query.search;
    }
    if (query.supplierId !== undefined) {
      (searchCriteria as any).supplierId = query.supplierId;
    }

    // Step 5: Execute search through repository
    const searchResult = await this.productRepository.search(searchCriteria);

    // Step 6: Convert products to query results
    const productResults: ProductQueryResult[] = searchResult.products.map((product) =>
      this.convertProductToQueryResult(product)
    );

    // Step 7: Calculate pagination metadata
    const limit = query.limit || 50;
    const page = query.page || 1;
    const totalPages = Math.ceil(searchResult.total / limit);

    return {
      products: productResults,
      total: searchResult.total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Converts Product entity to ProductQueryResult
   * @private
   */
  private convertProductToQueryResult(product: Product): ProductQueryResult {
    const persistenceData = product.toPersistence();

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description || undefined,
      category: product.category.toString(),
      unitOfMeasure: product.unitOfMeasure.toString(),
      status: product.status.toString(),
      costPrice: persistenceData.costPrice,
      costPriceCurrency: persistenceData.costPriceCurrency,
      sellingPrice: persistenceData.sellingPrice,
      sellingPriceCurrency: persistenceData.sellingPriceCurrency,
      barcode: product.barcode || undefined,
      supplierId: product.supplierId || undefined,
      supplierProductCode: product.supplierProductCode || undefined,
      minStockLevel: product.minStockLevel,
      maxStockLevel: product.maxStockLevel,
      reorderLevel: product.reorderLevel,
      currentStock: product.currentStock,
      reservedStock: product.reservedStock,
      availableStock: product.availableStock,
      weight: product.weight || undefined,
      dimensions: product.dimensions
        ? {
            length: product.dimensions.length,
            width: product.dimensions.width,
            height: product.dimensions.height,
          }
        : undefined,
      tags: product.tags,
      agencyId: product.agencyId,
      createdBy: product.createdBy,
      createdAt: product.createdAt,
      updatedBy: product.updatedBy || undefined,
      updatedAt: product.updatedAt || undefined,
      needsReorder: product.needsReorder(),
      isOutOfStock: product.isOutOfStock(),
      isLowStock: product.isLowStock(),
      profitMargin: product.getProfitMargin(),
    };
  }
}

/**
 * Factory function to create GetProductsHandler
 * @param productRepository - Product repository implementation
 * @param userRepository - User repository implementation
 * @returns GetProductsHandler instance
 */
export function createGetProductsHandler(
  productRepository: IProductRepository,
  userRepository: IUserRepository
): GetProductsHandler {
  return new GetProductsHandler(productRepository, userRepository);
}
