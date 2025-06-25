/**
 * Advanced Search Products Handler - Simplified
 *
 * Simplified handler for advanced product search queries following CQRS pattern.
 * Implements core enhanced search capabilities with basic relevance scoring.
 *
 * @domain Product Management - Advanced Search
 * @pattern Query Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  AdvancedSearchProductsQuery,
  AdvancedSearchProductsQueryResult,
  AdvancedProductSearchResult,
  validateAdvancedSearchProductsQuery,
} from '../../queries/product/advanced-search-products.query';
import { Product, ProductStatus } from '../../../domain/entities/product';
import { Permission } from '../../../domain/value-objects/role';
import { IProductRepository, ProductSearchCriteria } from '../../../domain/repositories/product.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';

/**
 * Simplified advanced search handler
 */
export class AdvancedSearchProductsHandler {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles advanced search products query
   * @param query - Advanced search query
   * @returns Promise<AdvancedSearchProductsQueryResult> - Enhanced search results
   * @throws Error when user not found or insufficient permissions
   */
  async handle(query: AdvancedSearchProductsQuery): Promise<AdvancedSearchProductsQueryResult> {
    const startTime = Date.now();

    // Step 1: Validate query
    const validatedQuery = validateAdvancedSearchProductsQuery(query);

    // Step 2: Get the requesting user for authorization
    const requestingUser = await this.userRepository.findById(validatedQuery.requestedBy);
    if (!requestingUser) {
      throw new Error('Requesting user not found');
    }

    // Step 3: Authorization check - user needs READ_PRODUCT permission
    if (!requestingUser.hasPermission(Permission.READ_PRODUCT)) {
      throw new Error('Insufficient permissions to view products');
    }

    // Step 4: Build search criteria
    const searchCriteria = this.buildSearchCriteria(validatedQuery);

    // Step 5: Execute search through repository
    const searchResult = await this.productRepository.search(searchCriteria);

    // Step 6: Apply advanced filtering
    let filteredProducts = this.applyAdvancedFilters(searchResult.products, validatedQuery);

    // Step 7: Convert to search results with scoring
    let processedProducts = filteredProducts.map((product) => this.convertToSearchResult(product, validatedQuery));

    // Step 8: Apply scoring and sorting
    if (validatedQuery.sortBy === 'relevance' || validatedQuery.sortBy === 'score') {
      processedProducts = this.applyScoringAndSort(processedProducts, validatedQuery);
    }

    // Step 9: Apply minimum score filter
    if (validatedQuery.minScore !== undefined) {
      processedProducts = processedProducts.filter((product) => (product.score || 0) >= validatedQuery.minScore!);
    }

    // Step 10: Calculate pagination
    const limit = validatedQuery.limit || 50;
    const page = validatedQuery.page || 1;
    const total = processedProducts.length;
    const totalPages = Math.ceil(total / limit);

    // Step 11: Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = processedProducts.slice(startIndex, endIndex);

    const searchTime = Date.now() - startTime;

    return {
      products: paginatedProducts,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      searchTime,
      maxScore: processedProducts.length > 0 ? Math.max(...processedProducts.map((p) => p.score || 0)) : undefined,
      facets: undefined,
      suggestions: undefined,
      appliedFilters: this.summarizeAppliedFilters(validatedQuery),
      searchQuery: validatedQuery.globalSearch || '',
    };
  }

  /**
   * Builds search criteria from advanced query
   * @private
   */
  private buildSearchCriteria(query: AdvancedSearchProductsQuery): ProductSearchCriteria {
    const criteria: any = {
      limit: 10000, // Get more results for post-processing
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };

    // Add basic filters
    if (query.agencyId) {
      criteria.agencyId = query.agencyId;
    }

    if (query.globalSearch) {
      criteria.search = query.globalSearch;
    }

    if (query.categories && query.categories.length === 1) {
      criteria.category = query.categories[0];
    }

    if (query.statuses && query.statuses.length === 1) {
      criteria.status = query.statuses[0];
    }

    if (query.supplierIds && query.supplierIds.length === 1) {
      criteria.supplierId = query.supplierIds[0];
    }

    if (query.stockFilter) {
      if (query.stockFilter.stockStatus === 'low') {
        criteria.lowStock = true;
      } else if (query.stockFilter.stockStatus === 'out') {
        criteria.outOfStock = true;
      }
    }

    if (query.needsReorder !== undefined) {
      criteria.needsReorder = query.needsReorder;
    }

    return criteria as ProductSearchCriteria;
  }

  /**
   * Applies advanced filters
   * @private
   */
  private applyAdvancedFilters(products: readonly Product[], query: AdvancedSearchProductsQuery): Product[] {
    let filtered = [...products];

    // Filter by multiple categories
    if (query.categories && query.categories.length > 1) {
      filtered = filtered.filter((product) => query.categories!.includes(product.category));
    }

    // Filter by multiple statuses
    if (query.statuses && query.statuses.length > 1) {
      filtered = filtered.filter((product) => query.statuses!.includes(product.status));
    }

    // Filter by tags (must have ALL specified tags)
    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter((product) => query.tags!.every((tag) => product.tags.includes(tag)));
    }

    // Filter by excluded tags
    if (query.excludeTags && query.excludeTags.length > 0) {
      filtered = filtered.filter((product) => !query.excludeTags!.some((tag) => product.tags.includes(tag)));
    }

    // Filter by price ranges
    if (query.priceRanges && query.priceRanges.length > 0) {
      filtered = filtered.filter((product) => {
        return query.priceRanges!.some((range) => {
          const price = range.type === 'cost' ? product.costPrice.decimalAmount : product.sellingPrice.decimalAmount;

          const minMatch = range.min === undefined || price >= range.min;
          const maxMatch = range.max === undefined || price <= range.max;

          return minMatch && maxMatch;
        });
      });
    }

    // Filter by active status
    if (query.isActive !== undefined) {
      filtered = filtered.filter((product) => {
        const isActive = product.status === ProductStatus.ACTIVE;
        return query.isActive ? isActive : !isActive;
      });
    }

    // Filter by hasBarcode
    if (query.hasBarcode !== undefined) {
      filtered = filtered.filter((product) => (query.hasBarcode ? product.barcode !== null : product.barcode === null));
    }

    // Filter by hasSupplier
    if (query.hasSupplier !== undefined) {
      filtered = filtered.filter((product) =>
        query.hasSupplier ? product.supplierId !== null : product.supplierId === null
      );
    }

    return filtered;
  }

  /**
   * Converts Product entity to search result
   * @private
   */
  private convertToSearchResult(product: Product, query: AdvancedSearchProductsQuery): AdvancedProductSearchResult {
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

      // Enhanced business metrics
      needsReorder: product.needsReorder(),
      isOutOfStock: product.isOutOfStock(),
      isLowStock: product.isLowStock(),
      profitMargin: product.getProfitMargin(),
      inventoryValue: product.currentStock * product.costPrice.amount,
      potentialRevenue: product.availableStock * product.sellingPrice.amount,

      // Search metadata
      score: 0.5, // Default score, will be updated by scoring
      highlights: undefined,
      matchedFields: [],
    };
  }

  /**
   * Applies scoring and sorting
   * @private
   */
  private applyScoringAndSort(
    products: AdvancedProductSearchResult[],
    query: AdvancedSearchProductsQuery
  ): AdvancedProductSearchResult[] {
    // Apply simple scoring
    const scoredProducts = products.map((product) => ({
      ...product,
      score: this.calculateSimpleScore(product, query),
    }));

    // Sort by score
    return scoredProducts.sort((a, b) => {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      return query.sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
  }

  /**
   * Calculates simple relevance score
   * @private
   */
  private calculateSimpleScore(product: AdvancedProductSearchResult, query: AdvancedSearchProductsQuery): number {
    let score = 0.5; // Base score

    // Text matching boost
    if (query.globalSearch) {
      const searchTerm = query.globalSearch.toLowerCase();
      if (product.name.toLowerCase().includes(searchTerm)) {
        score += 0.3;
      }
      if (product.sku.toLowerCase().includes(searchTerm)) {
        score += 0.2;
      }
      if (product.description && product.description.toLowerCase().includes(searchTerm)) {
        score += 0.1;
      }
    }

    // Business scoring
    if (product.status === 'ACTIVE') {
      score += 0.1;
    }
    if (product.profitMargin > 0.3) {
      score += 0.1;
    }
    if (!product.isOutOfStock && !product.isLowStock) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Summarizes applied filters
   * @private
   */
  private summarizeAppliedFilters(query: AdvancedSearchProductsQuery): Record<string, any> {
    const filters: Record<string, any> = {};

    if (query.categories) filters.categories = query.categories;
    if (query.statuses) filters.statuses = query.statuses;
    if (query.supplierIds) filters.supplierIds = query.supplierIds;
    if (query.tags) filters.tags = query.tags;
    if (query.priceRanges) filters.priceRanges = query.priceRanges;

    return filters;
  }
}

/**
 * Factory function to create AdvancedSearchProductsHandler
 */
export function createAdvancedSearchProductsHandler(
  productRepository: IProductRepository,
  userRepository: IUserRepository
): AdvancedSearchProductsHandler {
  return new AdvancedSearchProductsHandler(productRepository, userRepository);
}
