/**
 * Create Product Handler
 *
 * Handler for CreateProduct command following CQRS pattern.
 * Implements business logic for product creation with proper authorization.
 *
 * @domain Product Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { CreateProductCommand, validateCreateProductCommand } from '../../commands/product/create-product.command';
import { Product, ProductStatus } from '../../../domain/entities/product';
import { IProductRepository } from '../../../domain/repositories/product.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Money } from '../../../domain/value-objects/money';
import { Permission } from '../../../domain/value-objects/role';

/**
 * Handler for CreateProduct command
 * Implements business logic for product creation with proper authorization
 */
export class CreateProductHandler {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles product creation command
   * @param command - CreateProduct command
   * @returns Promise<string> - ID of created product
   * @throws {Error} When validation fails or unauthorized
   */
  async handle(command: CreateProductCommand): Promise<string> {
    // Validate command
    validateCreateProductCommand(command);

    // Get the user who is creating this product (for authorization)
    const creatingUser = await this.userRepository.findById(command.createdBy);
    if (!creatingUser) {
      throw new Error('Creating user not found');
    }

    // Check authorization - only users with CREATE_PRODUCT permission can create products
    if (!creatingUser.hasPermission(Permission.CREATE_PRODUCT)) {
      throw new Error('Insufficient permissions to create product');
    }

    // Check if product with same SKU already exists in the agency
    const existingProduct = await this.productRepository.findBySku(command.sku, command.agencyId);
    if (existingProduct) {
      throw new Error('Product with this SKU already exists in the agency');
    }

    // Create Money value objects for pricing
    const costPrice = Money.fromDecimal(command.costPrice, command.costPriceCurrency as any);
    const sellingPrice = Money.fromDecimal(command.sellingPrice, command.sellingPriceCurrency as any);

    // Business rule: Selling price should be greater than cost price (warning, not error)
    if (sellingPrice.compareTo(costPrice) <= 0) {
      // Log warning but don't throw error - some products might be sold at cost or loss
      console.warn(
        `Product ${command.sku}: Selling price (${sellingPrice.toString()}) is not greater than cost price (${costPrice.toString()})`
      );
    }

    // Create the product
    const productProps: any = {
      sku: command.sku,
      name: command.name,
      category: command.category as any,
      unitOfMeasure: command.unitOfMeasure as any,
      costPrice,
      sellingPrice,
      minStockLevel: command.minStockLevel,
      maxStockLevel: command.maxStockLevel,
      reorderLevel: command.reorderLevel,
      currentStock: command.currentStock,
      reservedStock: command.reservedStock || 0,
      agencyId: command.agencyId,
      createdBy: command.createdBy,
    };

    // Add optional properties only if they exist
    if (command.description !== undefined) {
      productProps.description = command.description;
    }
    if (command.barcode !== undefined) {
      productProps.barcode = command.barcode;
    }
    if (command.supplierId !== undefined) {
      productProps.supplierId = command.supplierId;
    }
    if (command.supplierProductCode !== undefined) {
      productProps.supplierProductCode = command.supplierProductCode;
    }
    if (command.weight !== undefined) {
      productProps.weight = command.weight;
    }
    if (command.dimensions !== undefined) {
      productProps.dimensions = command.dimensions;
    }
    if (command.tags !== undefined) {
      productProps.tags = command.tags;
    }

    const newProduct = Product.create(productProps);

    // Approve the product if created by authorized user (business rule)
    const approvedProduct = newProduct.approve(command.createdBy);

    // Save to repository
    await this.productRepository.save(approvedProduct);

    return newProduct.id;
  }
}

/**
 * Factory function to create CreateProductHandler
 * @param productRepository - Product repository implementation
 * @param userRepository - User repository implementation
 * @returns CreateProductHandler instance
 */
export function createProductHandler(
  productRepository: IProductRepository,
  userRepository: IUserRepository
): CreateProductHandler {
  return new CreateProductHandler(productRepository, userRepository);
}
