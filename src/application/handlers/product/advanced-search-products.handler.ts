/**
 * Advanced Search Products Handler
 *
 * Handler for advanced product search queries following CQRS pattern.
 * Implements enhanced search capabilities including full-text search,
 * fuzzy matching, relevance scoring, and advanced filtering.
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
  SearchOperator,
  SearchSuggestion,
  SearchFacet,
  validateAdvancedSearchProductsQuery,
} from '../../queries/product/advanced-search-products.query';
import { Product } from '../../../domain/entities/product';
import { Permission } from '../../../domain/value-objects/role';
import { IProductRepository, ProductSearchCriteria } from '../../../domain/repositories/product.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';

/**
 * Search scoring configuration
 */
interface SearchScoringConfig {
  readonly fieldWeights: Record<string, number>;
  readonly fuzzyBoost: number;
  readonly exactMatchBoost: number;
  readonly phraseBoost: number;
  readonly recentBoost: number;
}

/**
 * Default search scoring configuration
 */
const DEFAULT_SCORING_CONFIG: SearchScoringConfig = {
  fieldWeights: {
    name: 2.0,
    sku: 1.8,
    description: 1.0,
    tags: 1.5,
    barcode: 1.2,
    supplierProductCode: 0.8,
  },
  fuzzyBoost: 0.7, // Reduce score for fuzzy matches
  exactMatchBoost: 1.5, // Boost exact matches
  phraseBoost: 1.3, // Boost phrase matches
  recentBoost: 1.1, // Slight boost for recently updated items
};

/**
 * Advanced search handler with enhanced search capabilities
 */
export class AdvancedSearchProductsHandler {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly userRepository: IUserRepository,
    private readonly scoringConfig: SearchScoringConfig = DEFAULT_SCORING_CONFIG
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

    // Step 4: Build enhanced search criteria
    const searchCriteria = this.buildSearchCriteria(validatedQuery);

    // Step 5: Execute search through repository
    const searchResult = await this.productRepository.search(searchCriteria);

    // Step 6: Apply advanced search processing
    let processedProducts = await this.processSearchResults(searchResult.products, validatedQuery);

    // Step 7: Apply relevance scoring and ranking
    if (validatedQuery.sortBy === 'relevance' || validatedQuery.sortBy === 'score') {
      processedProducts = this.applyRelevanceScoring(processedProducts, validatedQuery);
      processedProducts = this.sortByRelevance(processedProducts, validatedQuery.sortOrder);
    }

    // Step 8: Apply minimum score filter
    if (validatedQuery.minScore !== undefined) {
      processedProducts = processedProducts.filter((product) => (product.score || 0) >= validatedQuery.minScore!);
    }

    // Step 9: Generate search suggestions if requested
    const suggestions = validatedQuery.searchSuggestions
      ? await this.generateSearchSuggestions(validatedQuery, processedProducts.length)
      : undefined;

    // Step 10: Generate facets if requested
    const facets = validatedQuery.facets
      ? await this.generateSearchFacets(validatedQuery, searchResult.products)
      : undefined;

    // Step 11: Calculate pagination metadata
    const limit = validatedQuery.limit || 50;
    const page = validatedQuery.page || 1;
    const total = processedProducts.length;
    const totalPages = Math.ceil(total / limit);

    // Step 12: Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = processedProducts.slice(startIndex, endIndex);

    const searchTime = Date.now() - startTime;
    const scores = processedProducts.map((p) => p.score || 0);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    return {
      products: paginatedProducts,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      searchTime,
      maxScore: maxScore > 0 ? maxScore : undefined,
      facets,
      suggestions,
      appliedFilters: this.summarizeAppliedFilters(validatedQuery),
      searchQuery: this.buildSearchQuerySummary(validatedQuery),
    };
  }

  /**
   * Builds search criteria from advanced query
   * @private
   */
  private buildSearchCriteria(query: AdvancedSearchProductsQuery): ProductSearchCriteria {
    const criteria: ProductSearchCriteria = {
      limit: 10000, // Get more results for post-processing
      offset: 0,
      sortBy: query.sortBy === 'relevance' || query.sortBy === 'score' ? 'createdAt' : query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };

    // Add basic filters
    if (query.agencyId) {
      (criteria as any).agencyId = query.agencyId;
    }

    // Handle multiple categories
    if (query.categories && query.categories.length === 1) {
      (criteria as any).category = query.categories[0];
    }

    // Handle multiple statuses
    if (query.statuses && query.statuses.length === 1) {
      (criteria as any).status = query.statuses[0];
    }

    // Handle global search
    if (query.globalSearch) {
      (criteria as any).search = query.globalSearch;
    }

    // Handle supplier filter
    if (query.supplierIds && query.supplierIds.length === 1) {
      (criteria as any).supplierId = query.supplierIds[0];
    }

    // Handle stock filters
    if (query.stockFilter) {
      if (query.stockFilter.stockStatus === 'low') {
        (criteria as any).lowStock = true;
      } else if (query.stockFilter.stockStatus === 'out') {
        (criteria as any).outOfStock = true;
      }
    }

    // Handle boolean filters
    if (query.needsReorder !== undefined) {
      (criteria as any).needsReorder = query.needsReorder;
    }

    // Handle date filters
    if (query.createdDate) {
      if (query.createdDate.from) {
        (criteria as any).createdAfter = query.createdDate.from;
      }
      if (query.createdDate.to) {
        (criteria as any).createdBefore = query.createdDate.to;
      }
    }

    if (query.updatedDate) {
      if (query.updatedDate.from) {
        (criteria as any).updatedAfter = query.updatedDate.from;
      }
      if (query.updatedDate.to) {
        (criteria as any).updatedBefore = query.updatedDate.to;
      }
    }

    return criteria;
  }

  /**
   * Processes search results with advanced filtering
   * @private
   */
  private async processSearchResults(
    products: readonly Product[],
    query: AdvancedSearchProductsQuery
  ): Promise<AdvancedProductSearchResult[]> {
    let filteredProducts = [...products];

    // Apply complex filters that can't be handled at repository level
    filteredProducts = this.applyAdvancedFilters(filteredProducts, query);

    // Convert to search results
    return filteredProducts.map((product) => this.convertToSearchResult(product, query));
  }

  /**
   * Applies advanced filters that require business logic
   * @private
   */
  private applyAdvancedFilters(products: Product[], query: AdvancedSearchProductsQuery): Product[] {
    let filtered = products;

    // Filter by multiple categories
    if (query.categories && query.categories.length > 1) {
      filtered = filtered.filter((product) => query.categories!.includes(product.category));
    }

    // Filter by multiple statuses
    if (query.statuses && query.statuses.length > 1) {
      filtered = filtered.filter((product) => query.statuses!.includes(product.status));
    }

    // Filter by multiple suppliers
    if (query.supplierIds && query.supplierIds.length > 1) {
      filtered = filtered.filter((product) => product.supplierId && query.supplierIds!.includes(product.supplierId));
    }

    // Filter by tags (must have ALL specified tags)
    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter((product) => query.tags!.every((tag) => product.tags.includes(tag)));
    }

    // Filter by excluded tags (must NOT have any of these tags)
    if (query.excludeTags && query.excludeTags.length > 0) {
      filtered = filtered.filter((product) => !query.excludeTags!.some((tag) => product.tags.includes(tag)));
    }

    // Filter by price ranges
    if (query.priceRanges && query.priceRanges.length > 0) {
      filtered = filtered.filter((product) => {
        return query.priceRanges!.some((range) => {
          const price = range.type === 'cost' ? product.costPrice.amount : product.sellingPrice.amount;

          const minMatch = range.min === undefined || price >= range.min;
          const maxMatch = range.max === undefined || price <= range.max;

          return minMatch && maxMatch;
        });
      });
    }

    // Filter by stock levels
    if (query.stockFilter) {
      const { minStock, maxStock, includeReserved, stockStatus } = query.stockFilter;

      filtered = filtered.filter((product) => {
        const stock = includeReserved ? product.currentStock : product.availableStock;

        const minMatch = minStock === undefined || stock >= minStock;
        const maxMatch = maxStock === undefined || stock <= maxStock;

        let statusMatch = true;
        if (stockStatus) {
          switch (stockStatus) {
            case 'available':
              statusMatch = !product.isOutOfStock() && !product.isLowStock();
              break;
            case 'low':
              statusMatch = product.isLowStock();
              break;
            case 'out':
              statusMatch = product.isOutOfStock();
              break;
            case 'reorder_needed':
              statusMatch = product.needsReorder();
              break;
          }
        }

        return minMatch && maxMatch && statusMatch;
      });
    }

    // Filter by dimensions
    if (query.dimensionFilter) {
      const { minWeight, maxWeight, minVolume, maxVolume } = query.dimensionFilter;

      filtered = filtered.filter((product) => {
        let weightMatch = true;
        if (minWeight !== undefined || maxWeight !== undefined) {
          const weight = product.weight;
          if (weight === undefined) return false;

          weightMatch =
            (minWeight === undefined || weight >= minWeight) && (maxWeight === undefined || weight <= maxWeight);
        }

        let volumeMatch = true;
        if (minVolume !== undefined || maxVolume !== undefined) {
          const dimensions = product.dimensions;
          if (!dimensions) return false;

          const volume = dimensions.length * dimensions.width * dimensions.height;
          volumeMatch =
            (minVolume === undefined || volume >= minVolume) && (maxVolume === undefined || volume <= maxVolume);
        }

        return weightMatch && volumeMatch;
      });
    }

    // Filter by boolean properties
    if (query.hasBarcode !== undefined) {
      filtered = filtered.filter((product) =>
        query.hasBarcode ? product.barcode !== undefined : product.barcode === undefined
      );
    }

    if (query.hasSupplier !== undefined) {
      filtered = filtered.filter((product) =>
        query.hasSupplier ? product.supplierId !== undefined : product.supplierId === undefined
      );
    }

    if (query.isActive !== undefined) {
      filtered = filtered.filter((product) => (query.isActive ? product.isActive() : !product.isActive()));
    }

    return filtered;
  }

  /**
   * Converts Product entity to AdvancedProductSearchResult
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

      // Search metadata (will be populated by scoring)
      score: 0,
      highlights: query.highlightMatches ? {} : undefined,
      matchedFields: [],
    };
  }

  /**
   * Applies relevance scoring to search results
   * @private
   */
  private applyRelevanceScoring(
    products: AdvancedProductSearchResult[],
    query: AdvancedSearchProductsQuery
  ): AdvancedProductSearchResult[] {
    if (!query.globalSearch && (!query.searchFields || query.searchFields.length === 0)) {
      // No search terms, use simple scoring based on business metrics
      return products.map((product) => ({
        ...product,
        score: this.calculateBusinessScore(product),
      }));
    }

    return products.map((product) => {
      const score = this.calculateSearchScore(product, query);
      const matchedFields = this.findMatchedFields(product, query);
      const highlights = query.highlightMatches ? this.generateHighlights(product, query) : undefined;

      return {
        ...product,
        score,
        matchedFields,
        highlights,
      };
    });
  }

  /**
   * Calculates search relevance score
   * @private
   */
  private calculateSearchScore(product: AdvancedProductSearchResult, query: AdvancedSearchProductsQuery): number {
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Score global search
    if (query.globalSearch) {
      const globalScore = this.scoreGlobalSearch(product, query.globalSearch);
      totalScore += globalScore;
      maxPossibleScore += 1;
    }

    // Score field-specific searches
    if (query.searchFields) {
      for (const searchField of query.searchFields) {
        const fieldScore = this.scoreFieldSearch(product, searchField);
        const boost = searchField.boost || 1.0;
        totalScore += fieldScore * boost;
        maxPossibleScore += boost;
      }
    }

    // Normalize score to 0-1 range
    const normalizedScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

    // Apply business boost
    const businessBoost = this.calculateBusinessScore(product);

    return Math.min(1.0, normalizedScore * 0.8 + businessBoost * 0.2);
  }

  /**
   * Calculates business-based scoring (independent of search terms)
   * @private
   */
  private calculateBusinessScore(product: AdvancedProductSearchResult): number {
    let score = 0.5; // Base score

    // Boost active products
    if (product.status === 'ACTIVE') {
      score += 0.1;
    }

    // Boost products with good profit margins
    if (product.profitMargin > 0.3) {
      score += 0.1;
    }

    // Boost products with good stock levels
    if (!product.isOutOfStock && !product.isLowStock) {
      score += 0.1;
    }

    // Boost recently updated products
    if (product.updatedAt) {
      const daysSinceUpdate = (Date.now() - product.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) {
        score += 0.1 * this.scoringConfig.recentBoost;
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Scores global search against all text fields
   * @private
   */
  private scoreGlobalSearch(product: AdvancedProductSearchResult, searchTerm: string): number {
    const searchLower = searchTerm.toLowerCase();
    let maxScore = 0;

    const fields = [
      { value: product.name, weight: this.scoringConfig.fieldWeights.name },
      { value: product.sku, weight: this.scoringConfig.fieldWeights.sku },
      { value: product.description || '', weight: this.scoringConfig.fieldWeights.description },
      { value: product.barcode || '', weight: this.scoringConfig.fieldWeights.barcode },
      { value: product.supplierProductCode || '', weight: this.scoringConfig.fieldWeights.supplierProductCode },
      { value: product.tags.join(' '), weight: this.scoringConfig.fieldWeights.tags },
    ];

    for (const field of fields) {
      if (field.value) {
        const fieldScore = this.scoreTextMatch(field.value, searchLower) * field.weight;
        maxScore = Math.max(maxScore, fieldScore);
      }
    }

    return maxScore;
  }

  /**
   * Scores field-specific search
   * @private
   */
  private scoreFieldSearch(product: AdvancedProductSearchResult, searchField: any): number {
    const fieldValue = this.getFieldValue(product, searchField.field);
    if (!fieldValue) return 0;

    return this.scoreTextMatch(fieldValue, searchField.value, searchField.operator, searchField.fuzzyLevel);
  }

  /**
   * Gets field value from product
   * @private
   */
  private getFieldValue(product: AdvancedProductSearchResult, field: string): string {
    switch (field) {
      case 'name':
        return product.name;
      case 'description':
        return product.description || '';
      case 'sku':
        return product.sku;
      case 'barcode':
        return product.barcode || '';
      case 'tags':
        return product.tags.join(' ');
      case 'supplierProductCode':
        return product.supplierProductCode || '';
      default:
        return '';
    }
  }

  /**
   * Scores text matching with different operators
   * @private
   */
  private scoreTextMatch(
    fieldValue: string,
    searchValue: string,
    operator: SearchOperator = SearchOperator.CONTAINS,
    fuzzyLevel: number = 1
  ): number {
    const fieldLower = fieldValue.toLowerCase();
    const searchLower = searchValue.toLowerCase();

    switch (operator) {
      case SearchOperator.EQUALS:
        return fieldLower === searchLower ? this.scoringConfig.exactMatchBoost : 0;

      case SearchOperator.CONTAINS:
        return fieldLower.includes(searchLower) ? 1.0 : 0;

      case SearchOperator.STARTS_WITH:
        return fieldLower.startsWith(searchLower) ? 1.2 : 0;

      case SearchOperator.ENDS_WITH:
        return fieldLower.endsWith(searchLower) ? 1.1 : 0;

      case SearchOperator.PHRASE:
        return fieldLower.includes(searchLower) ? this.scoringConfig.phraseBoost : 0;

      case SearchOperator.WILDCARD:
        const pattern = searchLower.replace(/\*/g, '.*');
        const regex = new RegExp(pattern);
        return regex.test(fieldLower) ? 1.0 : 0;

      case SearchOperator.FUZZY:
        const distance = this.calculateLevenshteinDistance(fieldLower, searchLower);
        const maxLength = Math.max(fieldLower.length, searchLower.length);
        const similarity = 1 - distance / maxLength;
        const threshold = 1 - fuzzyLevel * 0.3; // More fuzzy = lower threshold
        return similarity >= threshold ? similarity * this.scoringConfig.fuzzyBoost : 0;

      default:
        return 0;
    }
  }

  /**
   * Calculates Levenshtein distance for fuzzy matching
   * @private
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Finds fields that matched the search
   * @private
   */
  private findMatchedFields(product: AdvancedProductSearchResult, query: AdvancedSearchProductsQuery): string[] {
    const matchedFields: string[] = [];

    // Check global search matches
    if (query.globalSearch) {
      const searchLower = query.globalSearch.toLowerCase();
      const fields = ['name', 'sku', 'description', 'barcode', 'supplierProductCode', 'tags'];

      for (const field of fields) {
        const value = this.getFieldValue(product, field);
        if (value && value.toLowerCase().includes(searchLower)) {
          matchedFields.push(field);
        }
      }
    }

    // Check field-specific matches
    if (query.searchFields) {
      for (const searchField of query.searchFields) {
        const value = this.getFieldValue(product, searchField.field);
        if (value && this.scoreTextMatch(value, searchField.value, searchField.operator) > 0) {
          matchedFields.push(searchField.field);
        }
      }
    }

    return [...new Set(matchedFields)]; // Remove duplicates
  }

  /**
   * Generates highlighted snippets for matched text
   * @private
   */
  private generateHighlights(
    product: AdvancedProductSearchResult,
    query: AdvancedSearchProductsQuery
  ): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};

    if (query.globalSearch) {
      const searchTerm = query.globalSearch;
      const fields = ['name', 'sku', 'description'];

      for (const field of fields) {
        const value = this.getFieldValue(product, field);
        if (value) {
          const highlighted = this.highlightText(value, searchTerm);
          if (highlighted !== value) {
            highlights[field] = [highlighted];
          }
        }
      }
    }

    return highlights;
  }

  /**
   * Highlights search terms in text
   * @private
   */
  private highlightText(text: string, searchTerm: string): string {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Sorts products by relevance score
   * @private
   */
  private sortByRelevance(
    products: AdvancedProductSearchResult[],
    sortOrder: 'asc' | 'desc' = 'desc'
  ): AdvancedProductSearchResult[] {
    return products.sort((a, b) => {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });
  }

  /**
   * Generates search suggestions
   * @private
   */
  private async generateSearchSuggestions(
    query: AdvancedSearchProductsQuery,
    resultCount: number
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    // If search yielded few results, suggest alternatives
    if (resultCount < 5 && query.globalSearch) {
      // Generate spelling corrections (simplified)
      suggestions.push({
        query: query.globalSearch.toLowerCase(),
        type: 'correction',
        score: 0.8,
        resultCount: undefined,
      });
    }

    return suggestions;
  }

  /**
   * Generates search facets for filtering
   * @private
   */
  private async generateSearchFacets(
    query: AdvancedSearchProductsQuery,
    allProducts: readonly Product[]
  ): Promise<SearchFacet[]> {
    const facets: SearchFacet[] = [];

    if (query.facets?.includes('category')) {
      const categoryFacet = this.generateCategoryFacet(allProducts);
      facets.push(categoryFacet);
    }

    if (query.facets?.includes('status')) {
      const statusFacet = this.generateStatusFacet(allProducts);
      facets.push(statusFacet);
    }

    return facets;
  }

  /**
   * Generates category facet
   * @private
   */
  private generateCategoryFacet(products: readonly Product[]): SearchFacet {
    const categoryCounts: Record<string, number> = {};

    for (const product of products) {
      const category = product.category.toString();
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }

    const values = Object.entries(categoryCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    return {
      field: 'category',
      values,
    };
  }

  /**
   * Generates status facet
   * @private
   */
  private generateStatusFacet(products: readonly Product[]): SearchFacet {
    const statusCounts: Record<string, number> = {};

    for (const product of products) {
      const status = product.status.toString();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    const values = Object.entries(statusCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    return {
      field: 'status',
      values,
    };
  }

  /**
   * Summarizes applied filters for metadata
   * @private
   */
  private summarizeAppliedFilters(query: AdvancedSearchProductsQuery): Record<string, any> {
    const filters: Record<string, any> = {};

    if (query.categories) filters.categories = query.categories;
    if (query.statuses) filters.statuses = query.statuses;
    if (query.supplierIds) filters.supplierIds = query.supplierIds;
    if (query.tags) filters.tags = query.tags;
    if (query.priceRanges) filters.priceRanges = query.priceRanges;
    if (query.stockFilter) filters.stockFilter = query.stockFilter;
    if (query.dimensionFilter) filters.dimensionFilter = query.dimensionFilter;

    return filters;
  }

  /**
   * Builds search query summary for metadata
   * @private
   */
  private buildSearchQuerySummary(query: AdvancedSearchProductsQuery): string {
    const parts: string[] = [];

    if (query.globalSearch) {
      parts.push(`global:"${query.globalSearch}"`);
    }

    if (query.searchFields) {
      for (const field of query.searchFields) {
        parts.push(`${field.field}:${field.operator}:"${field.value}"`);
      }
    }

    return parts.join(' AND ');
  }
}

/**
 * Factory function to create AdvancedSearchProductsHandler
 * @param productRepository - Product repository implementation
 * @param userRepository - User repository implementation
 * @param scoringConfig - Optional scoring configuration
 * @returns AdvancedSearchProductsHandler instance
 */
export function createAdvancedSearchProductsHandler(
  productRepository: IProductRepository,
  userRepository: IUserRepository,
  scoringConfig?: SearchScoringConfig
): AdvancedSearchProductsHandler {
  return new AdvancedSearchProductsHandler(productRepository, userRepository, scoringConfig);
}
