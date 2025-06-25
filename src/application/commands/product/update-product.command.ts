/**
 * Update Product Command
 *
 * Command to update an existing product in the goods distribution system.
 * Follows CQRS pattern for write operations with comprehensive validation.
 *
 * @domain Product Management
 * @pattern Command Pattern (CQRS)
 * @version 1.0.0
 */

import { z } from 'zod';
import { ProductCategory, UnitOfMeasure, ProductStatus } from '../../../domain/entities/product';
import { CurrencyCode } from '../../../domain/value-objects/money';

/**
 * Product dimensions interface for update operations
 */
export interface UpdateProductDimensions {
  readonly length: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Command to update an existing product
 * Follows CQRS pattern for write operations
 */
export interface UpdateProductCommand {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly category?: string; // Will be validated as ProductCategory
  readonly unitOfMeasure?: string; // Will be validated as UnitOfMeasure
  readonly costPrice?: number;
  readonly costPriceCurrency?: string; // Will be validated as CurrencyCode
  readonly sellingPrice?: number;
  readonly sellingPriceCurrency?: string; // Will be validated as CurrencyCode
  readonly barcode?: string;
  readonly supplierId?: string;
  readonly supplierProductCode?: string;
  readonly minStockLevel?: number;
  readonly maxStockLevel?: number;
  readonly reorderLevel?: number;
  readonly weight?: number;
  readonly dimensions?: UpdateProductDimensions;
  readonly tags?: string[];
  readonly status?: string; // Will be validated as ProductStatus
  readonly updatedBy: string; // ID of user updating this product
}

/**
 * Result of update product operation
 */
export interface UpdateProductResult {
  readonly success: boolean;
  readonly productId?: string;
  readonly error?: string;
  readonly validationErrors?: string[];
}

// Zod Validation Schemas

/**
 * Product dimensions validation schema
 */
const UpdateProductDimensionsSchema = z.object({
  length: z.number().positive().min(0.01).max(10000),
  width: z.number().positive().min(0.01).max(10000),
  height: z.number().positive().min(0.01).max(10000),
});

/**
 * UpdateProductCommand validation schema
 */
export const UpdateProductCommandSchema = z.object({
  id: z.string().uuid('Product ID must be a valid UUID'),
  name: z.string().min(1, 'Product name is required').max(200, 'Product name cannot exceed 200 characters').optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  category: z
    .enum(
      [
        'FOOD_BEVERAGE',
        'HOUSEHOLD',
        'PERSONAL_CARE',
        'ELECTRONICS',
        'CLOTHING',
        'HEALTH_MEDICINE',
        'AUTOMOTIVE',
        'OFFICE_SUPPLIES',
        'TOYS_GAMES',
        'BOOKS_MEDIA',
        'HOME_GARDEN',
        'SPORTS_OUTDOORS',
        'OTHER',
      ] as const,
      {
        errorMap: () => ({ message: 'Invalid product category' }),
      }
    )
    .optional(),
  unitOfMeasure: z
    .enum(
      [
        'PIECE',
        'KILOGRAM',
        'GRAM',
        'LITER',
        'MILLILITER',
        'METER',
        'CENTIMETER',
        'PACK',
        'BOX',
        'DOZEN',
        'CASE',
      ] as const,
      {
        errorMap: () => ({ message: 'Invalid unit of measure' }),
      }
    )
    .optional(),
  costPrice: z.number().positive('Cost price must be positive').optional(),
  costPriceCurrency: z
    .enum(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] as const, {
      errorMap: () => ({ message: 'Invalid cost price currency' }),
    })
    .optional(),
  sellingPrice: z.number().positive('Selling price must be positive').optional(),
  sellingPriceCurrency: z
    .enum(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] as const, {
      errorMap: () => ({ message: 'Invalid selling price currency' }),
    })
    .optional(),
  barcode: z
    .string()
    .min(8, 'Barcode must be at least 8 characters')
    .max(20, 'Barcode cannot exceed 20 characters')
    .optional(),
  supplierId: z.string().uuid('Supplier ID must be a valid UUID').optional(),
  supplierProductCode: z.string().max(100, 'Supplier product code cannot exceed 100 characters').optional(),
  minStockLevel: z.number().int().min(0, 'Minimum stock level cannot be negative').optional(),
  maxStockLevel: z.number().int().min(0, 'Maximum stock level cannot be negative').optional(),
  reorderLevel: z.number().int().min(0, 'Reorder level cannot be negative').optional(),
  weight: z.number().positive('Weight must be positive').optional(),
  dimensions: UpdateProductDimensionsSchema.optional(),
  tags: z
    .array(z.string().min(1, 'Tag cannot be empty').max(50, 'Tag cannot exceed 50 characters'))
    .max(10, 'Cannot have more than 10 tags')
    .optional(),
  status: z
    .enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'PENDING_APPROVAL', 'OUT_OF_STOCK'] as const, {
      errorMap: () => ({ message: 'Invalid product status' }),
    })
    .optional(),
  updatedBy: z.string().uuid('Updated by must be a valid user ID'),
});

/**
 * Business validation for UpdateProductCommand
 */
export function validateUpdateProductCommand(command: UpdateProductCommand): void {
  // Validate with Zod schema
  const result = UpdateProductCommandSchema.safeParse(command);
  if (!result.success) {
    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Update product command validation failed: ${errors.join(', ')}`);
  }

  // Business rule: At least one field must be provided for update
  const updateFields = [
    'name',
    'description',
    'category',
    'unitOfMeasure',
    'costPrice',
    'sellingPrice',
    'barcode',
    'supplierId',
    'supplierProductCode',
    'minStockLevel',
    'maxStockLevel',
    'reorderLevel',
    'weight',
    'dimensions',
    'tags',
    'status',
  ];

  const hasUpdateFields = updateFields.some((field) => command[field as keyof UpdateProductCommand] !== undefined);
  if (!hasUpdateFields) {
    throw new Error('At least one field must be provided for product update');
  }

  // Business rule: If both cost and selling price currencies are provided, they should match
  if (
    command.costPriceCurrency &&
    command.sellingPriceCurrency &&
    command.costPriceCurrency !== command.sellingPriceCurrency
  ) {
    throw new Error('Cost price and selling price currencies must match');
  }

  // Business rule: Stock levels validation
  if (command.minStockLevel !== undefined && command.maxStockLevel !== undefined) {
    if (command.minStockLevel > command.maxStockLevel) {
      throw new Error('Minimum stock level cannot be greater than maximum stock level');
    }
  }

  if (command.reorderLevel !== undefined) {
    if (command.minStockLevel !== undefined && command.reorderLevel < command.minStockLevel) {
      throw new Error('Reorder level cannot be less than minimum stock level');
    }
    if (command.maxStockLevel !== undefined && command.reorderLevel > command.maxStockLevel) {
      throw new Error('Reorder level cannot be greater than maximum stock level');
    }
  }

  // Business rule: Price validation
  if (command.costPrice !== undefined && command.sellingPrice !== undefined) {
    if (command.sellingPrice <= command.costPrice) {
      // This is a warning, not an error - some products might be sold at cost or loss
      console.warn(
        `Product ${command.id}: Selling price (${command.sellingPrice}) is not greater than cost price (${command.costPrice})`
      );
    }
  }
}

/**
 * Type guards for UpdateProductCommand
 */
export function isValidUpdateProductCommand(value: unknown): value is UpdateProductCommand {
  try {
    UpdateProductCommandSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts string values to proper enum types for domain layer
 */
export function convertUpdateProductCommandTypes(command: UpdateProductCommand): UpdateProductCommand {
  const converted = { ...command };

  // Convert category string to ProductCategory enum if provided
  if (converted.category) {
    converted.category = converted.category as ProductCategory;
  }

  // Convert unitOfMeasure string to UnitOfMeasure enum if provided
  if (converted.unitOfMeasure) {
    converted.unitOfMeasure = converted.unitOfMeasure as UnitOfMeasure;
  }

  // Convert currency strings to CurrencyCode enums if provided
  if (converted.costPriceCurrency) {
    converted.costPriceCurrency = converted.costPriceCurrency as CurrencyCode;
  }
  if (converted.sellingPriceCurrency) {
    converted.sellingPriceCurrency = converted.sellingPriceCurrency as CurrencyCode;
  }

  // Convert status string to ProductStatus enum if provided
  if (converted.status) {
    converted.status = converted.status as ProductStatus;
  }

  return converted;
}
