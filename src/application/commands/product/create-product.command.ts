/**
 * Create Product Command
 *
 * Command to create a new product in the goods distribution system.
 * Follows CQRS pattern for write operations with comprehensive validation.
 *
 * @domain Product Management
 * @pattern Command Pattern (CQRS)
 * @version 1.0.0
 */

import { ProductCategory, UnitOfMeasure } from '../../../domain/entities/product';
import { CurrencyCode } from '../../../domain/value-objects/money';

/**
 * Command to create a new product
 * Follows CQRS pattern for write operations
 */
export interface CreateProductCommand {
  readonly sku: string;
  readonly name: string;
  readonly description?: string;
  readonly category: string; // Will be validated as ProductCategory
  readonly unitOfMeasure: string; // Will be validated as UnitOfMeasure
  readonly costPrice: number;
  readonly costPriceCurrency: string; // Will be validated as CurrencyCode
  readonly sellingPrice: number;
  readonly sellingPriceCurrency: string; // Will be validated as CurrencyCode
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
  readonly createdBy: string; // ID of user creating this product
}

/**
 * Result of create product operation
 */
export interface CreateProductResult {
  readonly success: boolean;
  readonly productId?: string;
  readonly error?: string;
  readonly validationErrors?: string[];
}

/**
 * Validation errors for CreateProductCommand
 */
export class CreateProductCommandValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`CreateProduct validation error - ${field}: ${reason}`);
    this.name = 'CreateProductCommandValidationError';
  }
}

/**
 * Validates CreateProductCommand data
 * @param command - Command to validate
 * @throws {CreateProductCommandValidationError} When validation fails
 */
export function validateCreateProductCommand(command: CreateProductCommand): void {
  // Required string fields
  if (!command.sku || typeof command.sku !== 'string') {
    throw new CreateProductCommandValidationError('sku', 'SKU is required and must be a string');
  }

  if (!command.name || typeof command.name !== 'string') {
    throw new CreateProductCommandValidationError('name', 'Name is required and must be a string');
  }

  if (!command.category || typeof command.category !== 'string') {
    throw new CreateProductCommandValidationError('category', 'Category is required and must be a string');
  }

  if (!command.unitOfMeasure || typeof command.unitOfMeasure !== 'string') {
    throw new CreateProductCommandValidationError('unitOfMeasure', 'Unit of measure is required and must be a string');
  }

  if (!command.agencyId || typeof command.agencyId !== 'string') {
    throw new CreateProductCommandValidationError('agencyId', 'Agency ID is required and must be a string');
  }

  if (!command.createdBy || typeof command.createdBy !== 'string') {
    throw new CreateProductCommandValidationError('createdBy', 'CreatedBy is required and must be a string');
  }

  // Currency fields
  if (!command.costPriceCurrency || typeof command.costPriceCurrency !== 'string') {
    throw new CreateProductCommandValidationError(
      'costPriceCurrency',
      'Cost price currency is required and must be a string'
    );
  }

  if (!command.sellingPriceCurrency || typeof command.sellingPriceCurrency !== 'string') {
    throw new CreateProductCommandValidationError(
      'sellingPriceCurrency',
      'Selling price currency is required and must be a string'
    );
  }

  // Numeric fields
  if (typeof command.costPrice !== 'number' || command.costPrice < 0) {
    throw new CreateProductCommandValidationError('costPrice', 'Cost price must be a non-negative number');
  }

  if (typeof command.sellingPrice !== 'number' || command.sellingPrice < 0) {
    throw new CreateProductCommandValidationError('sellingPrice', 'Selling price must be a non-negative number');
  }

  if (typeof command.minStockLevel !== 'number' || command.minStockLevel < 0) {
    throw new CreateProductCommandValidationError('minStockLevel', 'Min stock level must be a non-negative number');
  }

  if (typeof command.maxStockLevel !== 'number' || command.maxStockLevel < 0) {
    throw new CreateProductCommandValidationError('maxStockLevel', 'Max stock level must be a non-negative number');
  }

  if (typeof command.reorderLevel !== 'number' || command.reorderLevel < 0) {
    throw new CreateProductCommandValidationError('reorderLevel', 'Reorder level must be a non-negative number');
  }

  if (typeof command.currentStock !== 'number' || command.currentStock < 0) {
    throw new CreateProductCommandValidationError('currentStock', 'Current stock must be a non-negative number');
  }

  // Optional numeric fields
  if (command.reservedStock !== undefined && (typeof command.reservedStock !== 'number' || command.reservedStock < 0)) {
    throw new CreateProductCommandValidationError('reservedStock', 'Reserved stock must be a non-negative number');
  }

  if (command.weight !== undefined && (typeof command.weight !== 'number' || command.weight <= 0)) {
    throw new CreateProductCommandValidationError('weight', 'Weight must be a positive number');
  }

  // Optional string fields
  if (command.description !== undefined && typeof command.description !== 'string') {
    throw new CreateProductCommandValidationError('description', 'Description must be a string');
  }

  if (command.barcode !== undefined && typeof command.barcode !== 'string') {
    throw new CreateProductCommandValidationError('barcode', 'Barcode must be a string');
  }

  if (command.supplierId !== undefined && typeof command.supplierId !== 'string') {
    throw new CreateProductCommandValidationError('supplierId', 'Supplier ID must be a string');
  }

  if (command.supplierProductCode !== undefined && typeof command.supplierProductCode !== 'string') {
    throw new CreateProductCommandValidationError('supplierProductCode', 'Supplier product code must be a string');
  }

  // Validate dimensions if provided
  if (command.dimensions) {
    if (typeof command.dimensions !== 'object') {
      throw new CreateProductCommandValidationError('dimensions', 'Dimensions must be an object');
    }

    if (typeof command.dimensions.length !== 'number' || command.dimensions.length <= 0) {
      throw new CreateProductCommandValidationError('dimensions.length', 'Length must be a positive number');
    }

    if (typeof command.dimensions.width !== 'number' || command.dimensions.width <= 0) {
      throw new CreateProductCommandValidationError('dimensions.width', 'Width must be a positive number');
    }

    if (typeof command.dimensions.height !== 'number' || command.dimensions.height <= 0) {
      throw new CreateProductCommandValidationError('dimensions.height', 'Height must be a positive number');
    }
  }

  // Validate tags if provided
  if (command.tags !== undefined) {
    if (!Array.isArray(command.tags)) {
      throw new CreateProductCommandValidationError('tags', 'Tags must be an array');
    }

    if (command.tags.length > 10) {
      throw new CreateProductCommandValidationError('tags', 'Maximum 10 tags allowed');
    }

    for (let i = 0; i < command.tags.length; i++) {
      if (typeof command.tags[i] !== 'string' || command.tags[i].trim().length === 0) {
        throw new CreateProductCommandValidationError(`tags[${i}]`, 'Tag must be a non-empty string');
      }

      if (command.tags[i].length > 50) {
        throw new CreateProductCommandValidationError(`tags[${i}]`, 'Tag must be 50 characters or less');
      }
    }
  }

  // Business rule validations
  if (command.minStockLevel > command.maxStockLevel) {
    throw new CreateProductCommandValidationError(
      'stockLevels',
      'Min stock level cannot be greater than max stock level'
    );
  }

  if (command.reorderLevel > command.maxStockLevel) {
    throw new CreateProductCommandValidationError(
      'stockLevels',
      'Reorder level cannot be greater than max stock level'
    );
  }

  const reservedStock = command.reservedStock || 0;
  if (reservedStock > command.currentStock) {
    throw new CreateProductCommandValidationError('stockLevels', 'Reserved stock cannot be greater than current stock');
  }

  // Validate enum values
  if (!Object.values(ProductCategory).includes(command.category as ProductCategory)) {
    throw new CreateProductCommandValidationError(
      'category',
      `Invalid category. Must be one of: ${Object.values(ProductCategory).join(', ')}`
    );
  }

  if (!Object.values(UnitOfMeasure).includes(command.unitOfMeasure as UnitOfMeasure)) {
    throw new CreateProductCommandValidationError(
      'unitOfMeasure',
      `Invalid unit of measure. Must be one of: ${Object.values(UnitOfMeasure).join(', ')}`
    );
  }

  // Validate currency codes (basic validation, Money class will do deeper validation)
  const validCurrencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
  if (!validCurrencies.includes(command.costPriceCurrency as CurrencyCode)) {
    throw new CreateProductCommandValidationError(
      'costPriceCurrency',
      `Invalid currency. Must be one of: ${validCurrencies.join(', ')}`
    );
  }

  if (!validCurrencies.includes(command.sellingPriceCurrency as CurrencyCode)) {
    throw new CreateProductCommandValidationError(
      'sellingPriceCurrency',
      `Invalid currency. Must be one of: ${validCurrencies.join(', ')}`
    );
  }
}
