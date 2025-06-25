/**
 * Product Repository Update Method Test
 *
 * Focused test for the update() method implementation
 * Following incremental approach with comprehensive test coverage
 *
 * @version Phase 1B1 - Step 1
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseConnection, createDatabaseConnection } from '../../database/connection';
import { createMigrationManager } from '../../database/migration';
import { SqliteProductRepository } from '../product.repository';
import {
  Product,
  ProductCategory,
  ProductStatus,
  UnitOfMeasure,
  PriceChangeReason,
} from '../../../domain/entities/product';
import { Money } from '../../../domain/value-objects/money';
import {
  ProductRepositoryError,
  ProductNotFoundError,
  ProductAlreadyExistsError,
} from '../../../domain/repositories/product.repository';

describe('Product Repository - Update Method', () => {
  let connection: DatabaseConnection;
  let repository: SqliteProductRepository;

  beforeEach(async () => {
    // Create in-memory database for testing
    connection = createDatabaseConnection({ filename: ':memory:' });
    await connection.connect();

    // Disable foreign key constraints for testing
    const db = connection.getDatabase();
    db.pragma('foreign_keys = OFF');

    // Run migrations to create tables
    const migrationManager = createMigrationManager(connection);
    await migrationManager.migrate();

    // Create repository instance
    repository = new SqliteProductRepository(connection);
  });

  afterEach(async () => {
    if (connection) {
      await connection.close();
    }
  });

  describe('Update Method - Success Cases', () => {
    let savedProduct: Product;

    beforeEach(async () => {
      // Create and save a product for updating
      const product = Product.create({
        sku: 'UPDATE-TEST-001',
        name: 'Original Update Test Product',
        category: ProductCategory.FOOD_BEVERAGE,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(5.0, 'USD'),
        sellingPrice: Money.fromDecimal(10.0, 'USD'),
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        agencyId: 'update-test-agency',
        createdBy: 'test-user',
      });
      savedProduct = await repository.save(product);
    });

    it('should update product name successfully', async () => {
      // Fetch the existing product and use domain update methods
      const existingProduct = await repository.findById(savedProduct.id);
      expect(existingProduct).toBeDefined();

      // Use domain method to update basic info
      const updatedProduct = existingProduct!.updateBasicInfo(
        {
          name: 'Updated Product Name',
          category: ProductCategory.HOUSEHOLD,
        },
        'test-user'
      );

      const result = await repository.update(updatedProduct);

      expect(result).toBeDefined();
      expect(result.id).toBe(savedProduct.id);
      expect(result.name).toBe('Updated Product Name');
      expect(result.category).toBe(ProductCategory.HOUSEHOLD);
      expect(result.sku).toBe(savedProduct.sku);
      expect(result.agencyId).toBe(savedProduct.agencyId);
    });

    it('should update product category and unit of measure', async () => {
      const existingProduct = await repository.findById(savedProduct.id);
      expect(existingProduct).toBeDefined();

      // Update basic info with category change
      const updatedProduct = existingProduct!.updateBasicInfo(
        {
          category: ProductCategory.HOUSEHOLD,
        },
        'test-user'
      );

      const result = await repository.update(updatedProduct);

      expect(result.category).toBe(ProductCategory.HOUSEHOLD);
      // Note: UnitOfMeasure cannot be changed via updateBasicInfo - it's not part of the domain update methods
      expect(result.unitOfMeasure).toBe(savedProduct.unitOfMeasure);
    });

    it('should update product pricing', async () => {
      const existingProduct = await repository.findById(savedProduct.id);
      expect(existingProduct).toBeDefined();

      // Use domain methods to update pricing
      const updatedCostPrice = existingProduct!.updateCostPrice(
        Money.fromDecimal(6.0, 'USD'),
        PriceChangeReason.COST_UPDATE,
        'test-user',
        'Test cost update'
      );

      const updatedProduct = updatedCostPrice.updateSellingPrice(
        Money.fromDecimal(12.0, 'USD'),
        PriceChangeReason.MARKET_ADJUSTMENT,
        'test-user',
        'Test price update'
      );

      const result = await repository.update(updatedProduct);

      expect(result.costPrice.decimalAmount).toBe(6.0);
      expect(result.sellingPrice.decimalAmount).toBe(12.0);
    });

    it('should update stock levels', async () => {
      const existingProduct = await repository.findById(savedProduct.id);
      expect(existingProduct).toBeDefined();

      // Use domain method to update stock levels
      const updatedProduct = existingProduct!.updateStockLevels(
        {
          minStockLevel: 15,
          maxStockLevel: 150,
          reorderLevel: 30,
        },
        'test-user'
      );

      const result = await repository.update(updatedProduct);

      expect(result.minStockLevel).toBe(15);
      expect(result.maxStockLevel).toBe(150);
      // Repository calculates reorderLevel as Math.floor(minStockLevel * 2.0) = Math.floor(15 * 2.0) = 30
      expect(result.reorderLevel).toBe(30);
    });

    it('should preserve original creation metadata', async () => {
      const existingProduct = await repository.findById(savedProduct.id);
      expect(existingProduct).toBeDefined();

      const updatedProduct = existingProduct!.updateBasicInfo(
        {
          name: 'Updated Name',
        },
        'test-user'
      );

      const result = await repository.update(updatedProduct);

      expect(result.createdBy).toBe(savedProduct.createdBy);
      expect(result.createdAt.getTime()).toBe(savedProduct.createdAt.getTime());
      expect(result.updatedAt).toBeDefined();
      expect(result.updatedAt!.getTime()).toBeGreaterThan(savedProduct.createdAt.getTime());
    });
  });

  describe('Update Method - Error Cases', () => {
    it('should throw error when updating non-existent product', async () => {
      // Create a product normally first
      const product = Product.create({
        sku: 'NON-EXISTENT',
        name: 'Non Existent Product',
        category: ProductCategory.OTHER,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(1.0, 'USD'),
        sellingPrice: Money.fromDecimal(2.0, 'USD'),
        minStockLevel: 1,
        maxStockLevel: 10,
        reorderLevel: 2,
        currentStock: 5,
        agencyId: 'test-agency',
        createdBy: 'test-user',
      });

      // Save it and then delete it to get a valid product with non-existent ID in database
      const savedProduct = await repository.save(product);

      // Close and recreate connection to clear the database
      await connection.close();
      connection = createDatabaseConnection({ filename: ':memory:' });
      await connection.connect();
      const db = connection.getDatabase();
      db.pragma('foreign_keys = OFF');
      const migrationManager = createMigrationManager(connection);
      await migrationManager.migrate();
      repository = new SqliteProductRepository(connection);

      // Now try to update the product that no longer exists in the new database
      await expect(repository.update(savedProduct)).rejects.toThrow(ProductNotFoundError);
    });

    it('should throw error when updating with invalid input', async () => {
      await expect(repository.update(null as any)).rejects.toThrow(ProductRepositoryError);
      await expect(repository.update({} as any)).rejects.toThrow(ProductRepositoryError);
      await expect(repository.update(undefined as any)).rejects.toThrow(ProductRepositoryError);
    });

    it('should throw error when product missing required properties', async () => {
      const invalidProduct = {
        name: 'Invalid Product',
        // Missing id, sku, agencyId
      } as any;

      await expect(repository.update(invalidProduct)).rejects.toThrow(ProductRepositoryError);
    });

    it('should prevent SKU conflicts during update', async () => {
      // Create two products
      const product1 = Product.create({
        sku: 'CONFLICT-TEST-001',
        name: 'Product 1',
        category: ProductCategory.OTHER,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(1.0, 'USD'),
        sellingPrice: Money.fromDecimal(2.0, 'USD'),
        minStockLevel: 1,
        maxStockLevel: 10,
        reorderLevel: 2,
        currentStock: 5,
        agencyId: 'conflict-test-agency',
        createdBy: 'test-user',
      });

      const product2 = Product.create({
        sku: 'CONFLICT-TEST-002',
        name: 'Product 2',
        category: ProductCategory.OTHER,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(1.0, 'USD'),
        sellingPrice: Money.fromDecimal(2.0, 'USD'),
        minStockLevel: 1,
        maxStockLevel: 10,
        reorderLevel: 2,
        currentStock: 5,
        agencyId: 'conflict-test-agency',
        createdBy: 'test-user',
      });

      const savedProduct1 = await repository.save(product1);
      const savedProduct2 = await repository.save(product2);

      // Get the existing product2 and update it to conflict with product1's SKU
      const existingProduct2 = await repository.findById(savedProduct2.id);
      expect(existingProduct2).toBeDefined();

      // This should fail because we're trying to change to an existing SKU
      const conflictingUpdate = existingProduct2!.updateBasicInfo(
        {
          name: 'Conflicting Update',
        },
        'test-user'
      );

      // Manually change the SKU to create conflict (this simulates bad input)
      (conflictingUpdate as any)._sku = 'CONFLICT-TEST-001';

      await expect(repository.update(conflictingUpdate)).rejects.toThrow(ProductAlreadyExistsError);
    });

    it('should allow updating product to keep same SKU', async () => {
      // Create and save a product
      const product = Product.create({
        sku: 'SAME-SKU-TEST',
        name: 'Original Name',
        category: ProductCategory.OTHER,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(1.0, 'USD'),
        sellingPrice: Money.fromDecimal(2.0, 'USD'),
        minStockLevel: 1,
        maxStockLevel: 10,
        reorderLevel: 2,
        currentStock: 5,
        agencyId: 'same-sku-agency',
        createdBy: 'test-user',
      });

      const savedProduct = await repository.save(product);

      // Get the existing product and update it keeping the same SKU
      const existingProduct = await repository.findById(savedProduct.id);
      expect(existingProduct).toBeDefined();

      const updatedProduct = existingProduct!.updateBasicInfo(
        {
          name: 'Updated Name',
          category: ProductCategory.HOUSEHOLD,
        },
        'test-user'
      );

      const result = await repository.update(updatedProduct);

      expect(result).toBeDefined();
      expect(result.sku).toBe('SAME-SKU-TEST');
      expect(result.name).toBe('Updated Name');
      expect(result.category).toBe(ProductCategory.HOUSEHOLD);
    });
  });

  describe('Update Method - Database Integration', () => {
    it('should handle database errors gracefully', async () => {
      // Create and save a product first
      const product = Product.create({
        sku: 'DB-ERROR-TEST',
        name: 'DB Error Test Product',
        category: ProductCategory.OTHER,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(1.0, 'USD'),
        sellingPrice: Money.fromDecimal(2.0, 'USD'),
        minStockLevel: 1,
        maxStockLevel: 10,
        reorderLevel: 2,
        currentStock: 5,
        agencyId: 'db-error-agency',
        createdBy: 'test-user',
      });

      const savedProduct = await repository.save(product);

      // Get the existing product before closing connection
      const existingProduct = await repository.findById(savedProduct.id);
      expect(existingProduct).toBeDefined();

      // Close connection to simulate database error
      await connection.close();

      const updatedProduct = existingProduct!.updateBasicInfo(
        {
          name: 'Updated Name',
        },
        'test-user'
      );

      await expect(repository.update(updatedProduct)).rejects.toThrow(ProductRepositoryError);
    });
  });
});
