/**
 * Product Queries Index
 *
 * Central export point for all product-related queries.
 * Follows CQRS pattern for read operations.
 *
 * @domain Product Management
 * @pattern Query Pattern (CQRS)
 * @version 1.0.0
 */

// Get Products Query
export * from './get-products.query';
export * from './advanced-search-products.query';

export { GetProductsQueryValidationError, validateGetProductsQuery } from './get-products.query';

// Future product queries will be exported here
// export type { GetProductByIdQuery, GetProductByIdResult } from './get-product-by-id.query';
// export type { GetProductBySkuQuery, GetProductBySkuResult } from './get-product-by-sku.query';
