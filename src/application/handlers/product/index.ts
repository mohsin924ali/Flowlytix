/**
 * Product Handlers Index
 *
 * Central export point for all product-related handlers.
 * Follows CQRS pattern for command and query handlers.
 *
 * @domain Product Management
 * @pattern Command/Query Handler Pattern (CQRS)
 * @version 1.0.0
 */

// Command Handlers
export { CreateProductHandler, createProductHandler } from './create-product.handler';
export { UpdateProductHandler, createUpdateProductHandler } from './update-product.handler';
export { DeleteProductHandler, createDeleteProductHandler } from './delete-product.handler';

// Query Handlers
export { GetProductsHandler, createGetProductsHandler } from './get-products.handler';
export {
  AdvancedSearchProductsHandler,
  createAdvancedSearchProductsHandler,
} from './advanced-search-products.handler-simple';

// Future handlers will be exported here
// export { GetProductByIdHandler } from './get-product-by-id.handler';
// export { GetProductBySkuHandler } from './get-product-by-sku.handler';
