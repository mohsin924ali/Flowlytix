/**
 * Delete Product Handler
 *
 * Handler for DeleteProduct command following CQRS pattern.
 * Implements business logic for product deletion with proper authorization.
 * Note: Products are soft-deleted by marking as DISCONTINUED status.
 *
 * @domain Product Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { DeleteProductCommand, validateDeleteProductCommand } from '../../commands/product/delete-product.command';
import { ProductStatus } from '../../../domain/entities/product';
import { IProductRepository } from '../../../domain/repositories/product.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission } from '../../../domain/value-objects/role';

/**
 * Handler for DeleteProduct command
 * Implements business logic for product deletion with proper authorization
 */
export class DeleteProductHandler {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles product deletion command
   * @param command - DeleteProduct command
   * @returns Promise<string> - ID of deleted product
   * @throws {Error} When validation fails, product not found, or unauthorized
   */
  async handle(command: DeleteProductCommand): Promise<string> {
    // Step 1: Validate command
    validateDeleteProductCommand(command);

    // Step 2: Get the user who is deleting this product (for authorization)
    const deletingUser = await this.userRepository.findById(command.deletedBy);
    if (!deletingUser) {
      throw new Error('Deleting user not found');
    }

    // Step 3: Check authorization - only users with DELETE_PRODUCT permission can delete products
    if (!deletingUser.hasPermission(Permission.DELETE_PRODUCT)) {
      throw new Error('Insufficient permissions to delete product');
    }

    // Step 4: Find the existing product
    const existingProduct = await this.productRepository.findById(command.id);
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Step 5: Business rule - Cannot delete already discontinued products
    if (existingProduct.status === ProductStatus.DISCONTINUED) {
      throw new Error('Product is already discontinued');
    }

    // Step 6: Soft delete by marking as discontinued
    // This preserves data integrity and allows for audit trails
    const discontinuedProduct = existingProduct.discontinue(command.deletedBy);

    // Step 7: Save the discontinued product
    await this.productRepository.update(discontinuedProduct);

    // Note: For hard delete, we would use: await this.productRepository.delete(command.id);
    // However, soft delete (discontinue) is preferred for business audit and data integrity

    return existingProduct.id;
  }
}

/**
 * Factory function to create DeleteProductHandler
 * @param productRepository - Product repository implementation
 * @param userRepository - User repository implementation
 * @returns DeleteProductHandler instance
 */
export function createDeleteProductHandler(
  productRepository: IProductRepository,
  userRepository: IUserRepository
): DeleteProductHandler {
  return new DeleteProductHandler(productRepository, userRepository);
}
