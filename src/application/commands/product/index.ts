/**
 * Product Commands Index
 *
 * Central export point for all product-related commands.
 * Follows CQRS pattern for write operations.
 *
 * @domain Product Management
 * @pattern Command Pattern (CQRS)
 * @version 1.0.0
 */

// Create Product Command
export type { CreateProductCommand, CreateProductResult } from './create-product.command';
export { validateCreateProductCommand, CreateProductCommandValidationError } from './create-product.command';

// Update Product Command
export type { UpdateProductCommand, UpdateProductResult, UpdateProductDimensions } from './update-product.command';
export {
  validateUpdateProductCommand,
  isValidUpdateProductCommand,
  convertUpdateProductCommandTypes,
  UpdateProductCommandSchema,
} from './update-product.command';

// Delete Product Command
export type { DeleteProductCommand, DeleteProductResult } from './delete-product.command';
export { validateDeleteProductCommand, DeleteProductCommandValidationError } from './delete-product.command';
