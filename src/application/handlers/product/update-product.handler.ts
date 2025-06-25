/**
 * Update Product Handler
 *
 * Handler for UpdateProduct command following CQRS pattern.
 * Implements business logic for product updates with proper authorization.
 *
 * @domain Product Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  UpdateProductCommand,
  validateUpdateProductCommand,
  convertUpdateProductCommandTypes,
} from '../../commands/product/update-product.command';
import { Product, ProductCategory, UnitOfMeasure, ProductStatus } from '../../../domain/entities/product';
import { IProductRepository } from '../../../domain/repositories/product.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Money } from '../../../domain/value-objects/money';
import { Permission } from '../../../domain/value-objects/role';

/**
 * Handler for UpdateProduct command
 * Implements business logic for product updates with proper authorization
 */
export class UpdateProductHandler {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles product update command
   * @param command - UpdateProduct command
   * @returns Promise<string> - ID of updated product
   * @throws {Error} When validation fails, product not found, or unauthorized
   */
  async handle(command: UpdateProductCommand): Promise<string> {
    // Step 1: Validate command
    validateUpdateProductCommand(command);

    // Step 2: Convert string enums to proper types
    const typedCommand = convertUpdateProductCommandTypes(command);

    // Step 3: Get the user who is updating this product (for authorization)
    const updatingUser = await this.userRepository.findById(command.updatedBy);
    if (!updatingUser) {
      throw new Error('Updating user not found');
    }

    // Step 4: Check authorization - only users with UPDATE_PRODUCT permission can update products
    if (!updatingUser.hasPermission(Permission.UPDATE_PRODUCT)) {
      throw new Error('Insufficient permissions to update product');
    }

    // Step 5: Find the existing product
    const existingProduct = await this.productRepository.findById(command.id);
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Step 6: Product found - proceed with updates
    // Note: Agency-level authorization is handled at the application/UI level

    // Step 7: Apply updates to the product
    let updatedProduct = existingProduct;

    // Update basic information (name, description, category, weight, dimensions, tags)
    const basicUpdates: any = {};
    let hasBasicUpdates = false;

    if (typedCommand.name !== undefined) {
      basicUpdates.name = typedCommand.name;
      hasBasicUpdates = true;
    }
    if (typedCommand.description !== undefined) {
      basicUpdates.description = typedCommand.description;
      hasBasicUpdates = true;
    }
    if (typedCommand.category !== undefined) {
      basicUpdates.category = typedCommand.category as ProductCategory;
      hasBasicUpdates = true;
    }
    if (typedCommand.weight !== undefined) {
      basicUpdates.weight = typedCommand.weight;
      hasBasicUpdates = true;
    }
    if (typedCommand.dimensions !== undefined) {
      basicUpdates.dimensions = typedCommand.dimensions;
      hasBasicUpdates = true;
    }
    if (typedCommand.tags !== undefined) {
      basicUpdates.tags = typedCommand.tags;
      hasBasicUpdates = true;
    }

    if (hasBasicUpdates) {
      updatedProduct = updatedProduct.updateBasicInfo(basicUpdates, command.updatedBy);
    }

    // Handle unitOfMeasure separately - note: may not be updatable based on business rules
    if (typedCommand.unitOfMeasure !== undefined) {
      // Log that this feature is not implemented yet
      console.warn(`Unit of measure update not implemented for product ${updatedProduct.sku}`);
    }

    // Update pricing (cost and selling prices)
    if (typedCommand.costPrice !== undefined) {
      const newCostPrice = Money.fromDecimal(
        typedCommand.costPrice,
        (typedCommand.costPriceCurrency as any) || updatedProduct.costPrice.currency
      );

      // Business rule: Selling price should be greater than cost price (warning, not error)
      if (updatedProduct.sellingPrice.compareTo(newCostPrice) <= 0) {
        console.warn(
          `Product ${updatedProduct.sku}: Current selling price (${updatedProduct.sellingPrice.toString()}) is not greater than new cost price (${newCostPrice.toString()})`
        );
      }

      updatedProduct = updatedProduct.updateCostPrice(newCostPrice, 'MANUAL_OVERRIDE' as any, command.updatedBy);
    }

    if (typedCommand.sellingPrice !== undefined) {
      const newSellingPrice = Money.fromDecimal(
        typedCommand.sellingPrice,
        (typedCommand.sellingPriceCurrency as any) || updatedProduct.sellingPrice.currency
      );

      // Business rule: Selling price should be greater than cost price (warning, not error)
      if (newSellingPrice.compareTo(updatedProduct.costPrice) <= 0) {
        console.warn(
          `Product ${updatedProduct.sku}: New selling price (${newSellingPrice.toString()}) is not greater than cost price (${updatedProduct.costPrice.toString()})`
        );
      }

      updatedProduct = updatedProduct.updateSellingPrice(newSellingPrice, 'MANUAL_OVERRIDE' as any, command.updatedBy);
    }

    // Update supplier information
    if (typedCommand.supplierId !== undefined || typedCommand.supplierProductCode !== undefined) {
      const supplierUpdates: any = {};

      if (typedCommand.supplierId !== undefined) {
        supplierUpdates.supplierId = typedCommand.supplierId;
      }

      if (typedCommand.supplierProductCode !== undefined) {
        supplierUpdates.supplierProductCode = typedCommand.supplierProductCode;
      }

      updatedProduct = updatedProduct.updateSupplierInfo(supplierUpdates, command.updatedBy);
    }

    // Update barcode separately (not available in updateSupplierInfo)
    if (typedCommand.barcode !== undefined && typedCommand.barcode !== updatedProduct.barcode) {
      // Check if barcode is unique
      const existingProductWithBarcode = await this.productRepository.findByBarcode(typedCommand.barcode);
      if (existingProductWithBarcode && existingProductWithBarcode.id !== updatedProduct.id) {
        throw new Error('Product with this barcode already exists');
      }
      // Note: Barcode update would need to be added to Product entity
      // For now, we'll log this limitation
      console.warn(`Barcode update not yet implemented for product ${updatedProduct.sku}`);
    }

    // Update stock levels
    if (
      typedCommand.minStockLevel !== undefined ||
      typedCommand.maxStockLevel !== undefined ||
      typedCommand.reorderLevel !== undefined
    ) {
      updatedProduct = updatedProduct.updateStockLevels(
        {
          minStockLevel:
            typedCommand.minStockLevel !== undefined ? typedCommand.minStockLevel : updatedProduct.minStockLevel,
          maxStockLevel:
            typedCommand.maxStockLevel !== undefined ? typedCommand.maxStockLevel : updatedProduct.maxStockLevel,
          reorderLevel:
            typedCommand.reorderLevel !== undefined ? typedCommand.reorderLevel : updatedProduct.reorderLevel,
        },
        command.updatedBy
      );
    }

    // Note: Physical properties (weight, dimensions) and tags are handled in updateBasicInfo above

    // Update status
    if (typedCommand.status !== undefined) {
      const newStatus = typedCommand.status as ProductStatus;

      // Business rule: Only certain status transitions are allowed
      if (!this.isValidStatusTransition(updatedProduct.status, newStatus)) {
        throw new Error(`Invalid status transition from ${updatedProduct.status} to ${newStatus}`);
      }

      // Apply status change based on the target status
      switch (newStatus) {
        case ProductStatus.ACTIVE:
          updatedProduct = updatedProduct.activate(command.updatedBy);
          break;
        case ProductStatus.INACTIVE:
          updatedProduct = updatedProduct.deactivate(command.updatedBy);
          break;
        case ProductStatus.DISCONTINUED:
          updatedProduct = updatedProduct.discontinue(command.updatedBy);
          break;
        case ProductStatus.PENDING_APPROVAL:
          // This might require special handling based on business rules
          if (updatedProduct.status !== ProductStatus.PENDING_APPROVAL) {
            throw new Error('Cannot manually set product to pending approval status');
          }
          break;
        case ProductStatus.OUT_OF_STOCK:
          // This is typically managed automatically based on stock levels
          if (!updatedProduct.isOutOfStock()) {
            throw new Error('Cannot set product to out of stock when stock is available');
          }
          break;
      }
    }

    // Step 8: Save the updated product
    const savedProduct = await this.productRepository.update(updatedProduct);

    return savedProduct.id;
  }

  /**
   * Validates if a status transition is allowed
   * @private
   */
  private isValidStatusTransition(currentStatus: ProductStatus, newStatus: ProductStatus): boolean {
    // Define allowed transitions
    const allowedTransitions: Record<ProductStatus, ProductStatus[]> = {
      [ProductStatus.PENDING_APPROVAL]: [ProductStatus.ACTIVE, ProductStatus.INACTIVE],
      [ProductStatus.ACTIVE]: [ProductStatus.INACTIVE, ProductStatus.DISCONTINUED, ProductStatus.OUT_OF_STOCK],
      [ProductStatus.INACTIVE]: [ProductStatus.ACTIVE, ProductStatus.DISCONTINUED],
      [ProductStatus.OUT_OF_STOCK]: [ProductStatus.ACTIVE, ProductStatus.INACTIVE, ProductStatus.DISCONTINUED],
      [ProductStatus.DISCONTINUED]: [], // Discontinued products cannot be changed to other statuses
    };

    return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
  }
}

/**
 * Factory function to create UpdateProductHandler
 * @param productRepository - Product repository implementation
 * @param userRepository - User repository implementation
 * @returns UpdateProductHandler instance
 */
export function createUpdateProductHandler(
  productRepository: IProductRepository,
  userRepository: IUserRepository
): UpdateProductHandler {
  return new UpdateProductHandler(productRepository, userRepository);
}
