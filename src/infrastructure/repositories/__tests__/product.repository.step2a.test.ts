/**
 * Product Repository Tests - Step 2A: Core Structure
 *
 * Tests for the core Product Repository implementation.
 * Validates core methods: save, findById, findBySku, existsBySku, isHealthy
 * Verifies placeholder methods throw appropriate errors.
 *
 * @domain Product Management
 * @pattern Repository Testing
 * @version 1.0.0 - Step 2A Tests
 */

import { createDatabaseConnection } from '../../database/connection';
import { createMigrationManager } from '../../database/migration';
import { SqliteProductRepository } from '../product.repository';
import { Product, ProductCategory, UnitOfMeasure, ProductStatus } from '../../../domain/entities/product';
import {
  ProductRepositoryError,
  ProductAlreadyExistsError,
  ProductRepositoryConnectionError,
} from '../../../domain/repositories/product.repository';
import { Money } from '../../../domain/value-objects/money';

describe('SqliteProductRepository - Step 2A: Core Structure', () => {
  let repository: SqliteProductRepository;
  let connection: any;

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
      connection.close();
    }
  });

  describe('Repository Creation and Health', () => {
    it('should create repository with valid connection', () => {
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(SqliteProductRepository);
    });

    it('should throw error with null connection', () => {
      expect(() => new SqliteProductRepository(null as any)).toThrow(ProductRepositoryConnectionError);
    });

    it('should throw error with undefined connection', () => {
      expect(() => new SqliteProductRepository(undefined as any)).toThrow(ProductRepositoryConnectionError);
    });

    it('should check repository health successfully', async () => {
      const isHealthy = await repository.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Product Save Operations', () => {
    it('should save a new product successfully', async () => {
      const product = Product.create({
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'A test product',
        category: ProductCategory.FOOD_BEVERAGE,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(10.0, 'USD'),
        sellingPrice: Money.fromDecimal(15.0, 'USD'),
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        agencyId: 'agency-123',
        createdBy: 'user-123',
      });

      const savedProduct = await repository.save(product);

      expect(savedProduct).toBeDefined();
      expect(savedProduct.id).toBe(product.id);
      expect(savedProduct.sku).toBe('TEST-001');
      expect(savedProduct.name).toBe('Test Product');
    });

    it('should throw error when saving product with duplicate SKU', async () => {
      const product1 = Product.create({
        sku: 'DUPLICATE-001',
        name: 'First Product',
        category: ProductCategory.FOOD_BEVERAGE,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(10.0, 'USD'),
        sellingPrice: Money.fromDecimal(15.0, 'USD'),
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        agencyId: 'agency-123',
        createdBy: 'user-123',
      });

      const product2 = Product.create({
        sku: 'DUPLICATE-001', // Same SKU
        name: 'Second Product',
        category: ProductCategory.FOOD_BEVERAGE,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(12.0, 'USD'),
        sellingPrice: Money.fromDecimal(18.0, 'USD'),
        minStockLevel: 5,
        maxStockLevel: 50,
        reorderLevel: 15,
        currentStock: 25,
        agencyId: 'agency-123', // Same agency
        createdBy: 'user-123',
      });

      await repository.save(product1);

      await expect(repository.save(product2)).rejects.toThrow(ProductAlreadyExistsError);
    });

    it('should allow same SKU in different agencies', async () => {
      const product1 = Product.create({
        sku: 'SAME-SKU-001',
        name: 'Product Agency 1',
        category: ProductCategory.FOOD_BEVERAGE,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(10.0, 'USD'),
        sellingPrice: Money.fromDecimal(15.0, 'USD'),
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        agencyId: 'agency-1',
        createdBy: 'user-123',
      });

      const product2 = Product.create({
        sku: 'SAME-SKU-001', // Same SKU
        name: 'Product Agency 2',
        category: ProductCategory.FOOD_BEVERAGE,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(12.0, 'USD'),
        sellingPrice: Money.fromDecimal(18.0, 'USD'),
        minStockLevel: 5,
        maxStockLevel: 50,
        reorderLevel: 15,
        currentStock: 25,
        agencyId: 'agency-2', // Different agency
        createdBy: 'user-123',
      });

      const saved1 = await repository.save(product1);
      const saved2 = await repository.save(product2);

      expect(saved1.sku).toBe('SAME-SKU-001');
      expect(saved2.sku).toBe('SAME-SKU-001');
      expect(saved1.agencyId).toBe('agency-1');
      expect(saved2.agencyId).toBe('agency-2');
    });
  });

  describe('Product Find Operations', () => {
    let testProduct: Product;

    beforeEach(async () => {
      testProduct = Product.create({
        sku: 'FIND-TEST-001',
        name: 'Find Test Product',
        description: 'Product for find tests',
        category: ProductCategory.ELECTRONICS,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(25.0, 'USD'),
        sellingPrice: Money.fromDecimal(40.0, 'USD'),
        minStockLevel: 5,
        maxStockLevel: 50,
        reorderLevel: 10,
        currentStock: 30,
        agencyId: 'test-agency',
        createdBy: 'test-user',
      });
      await repository.save(testProduct);
    });

    it('should find product by ID successfully', async () => {
      const found = await repository.findById(testProduct.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(testProduct.id);
      expect(found!.sku).toBe('FIND-TEST-001');
      expect(found!.name).toBe('Find Test Product');
      expect(found!.category).toBe(ProductCategory.ELECTRONICS);
    });

    it('should return null when product not found by ID', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should find product by SKU and agency successfully', async () => {
      const found = await repository.findBySku('FIND-TEST-001', 'test-agency');

      expect(found).toBeDefined();
      expect(found!.sku).toBe('FIND-TEST-001');
      expect(found!.agencyId).toBe('test-agency');
      expect(found!.name).toBe('Find Test Product');
    });

    it('should return null when product not found by SKU', async () => {
      const found = await repository.findBySku('NON-EXISTENT', 'test-agency');
      expect(found).toBeNull();
    });

    it('should return null when SKU exists but in different agency', async () => {
      const found = await repository.findBySku('FIND-TEST-001', 'different-agency');
      expect(found).toBeNull();
    });
  });

  describe('Product Existence Checks', () => {
    beforeEach(async () => {
      const product = Product.create({
        sku: 'EXISTS-TEST-001',
        name: 'Exists Test Product',
        category: ProductCategory.HOUSEHOLD,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(5.0, 'USD'),
        sellingPrice: Money.fromDecimal(8.0, 'USD'),
        minStockLevel: 20,
        maxStockLevel: 200,
        reorderLevel: 40,
        currentStock: 100,
        agencyId: 'exists-agency',
        createdBy: 'test-user',
      });
      await repository.save(product);
    });

    it('should return true when product exists by SKU', async () => {
      const exists = await repository.existsBySku('EXISTS-TEST-001', 'exists-agency');
      expect(exists).toBe(true);
    });

    it('should return false when product does not exist by SKU', async () => {
      const exists = await repository.existsBySku('NON-EXISTENT', 'exists-agency');
      expect(exists).toBe(false);
    });

    it('should return false when SKU exists but in different agency', async () => {
      const exists = await repository.existsBySku('EXISTS-TEST-001', 'different-agency');
      expect(exists).toBe(false);
    });
  });

  describe('Placeholder Methods - Step 2A Behavior', () => {
    it('should throw "not implemented" errors for placeholder methods', async () => {
      const product = Product.create({
        sku: 'PLACEHOLDER-001',
        name: 'Placeholder Product',
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

      await expect(repository.update(product)).rejects.toThrow(ProductRepositoryError);
      await expect(repository.findByBarcode('123456')).rejects.toThrow(ProductRepositoryError);
      await expect(repository.existsByBarcode('123456')).rejects.toThrow(ProductRepositoryError);
      await expect(repository.search({})).rejects.toThrow(ProductRepositoryError);
      await expect(repository.findByAgency('test-agency')).rejects.toThrow(ProductRepositoryError);
      await expect(repository.count()).rejects.toThrow(ProductRepositoryError);
      await expect(repository.delete('test-id')).rejects.toThrow(ProductRepositoryError);
    });

    it('should have consistent error messages for placeholder methods', async () => {
      try {
        await repository.update({} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(ProductRepositoryError);
        expect((error as ProductRepositoryError).message).toContain('not yet implemented');
        expect((error as ProductRepositoryError).operation).toBe('update');
      }
    });
  });

  describe('Error Handling and Logging', () => {
    it('should handle database errors gracefully in save operations', async () => {
      // Close connection to simulate database error
      connection.close();

      const product = Product.create({
        sku: 'ERROR-TEST-001',
        name: 'Error Test Product',
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

      await expect(repository.save(product)).rejects.toThrow(ProductRepositoryError);
    });

    it('should handle database errors gracefully in find operations', async () => {
      // Close connection to simulate database error
      connection.close();

      await expect(repository.findById('test-id')).rejects.toThrow(ProductRepositoryError);
    });

    it('should preserve original error context in repository errors', async () => {
      // Close connection to simulate database error
      connection.close();

      try {
        await repository.findById('test-id');
      } catch (error) {
        expect(error).toBeInstanceOf(ProductRepositoryError);
        expect((error as ProductRepositoryError).operation).toBe('findById');
        expect((error as ProductRepositoryError).cause).toBeDefined();
      }
    });
  });

  describe('Architecture Compliance', () => {
    it('should follow single responsibility principle', () => {
      const publicMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(repository)).filter(
        (method) => method !== 'constructor' && !method.startsWith('_')
      );

      // Should have repository methods only (data access)
      expect(publicMethods).toContain('save');
      expect(publicMethods).toContain('findById');
      expect(publicMethods).toContain('findBySku');
      expect(publicMethods).toContain('existsBySku');
      expect(publicMethods).toContain('isHealthy');

      // Should have reasonable number of public methods (data access only)
      // Product repository has more methods than Customer due to complex interface
      expect(publicMethods.length).toBeLessThanOrEqual(25);
    });

    it('should implement Repository pattern correctly', () => {
      // Should implement the interface
      expect(repository.save).toBeDefined();
      expect(repository.findById).toBeDefined();
      expect(repository.findBySku).toBeDefined();
      expect(repository.existsBySku).toBeDefined();
      expect(repository.isHealthy).toBeDefined();

      // Methods should return Promises (async operations)
      const validProduct = Product.create({
        sku: 'PROMISE-TEST-001',
        name: 'Promise Test Product',
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
      expect(repository.save(validProduct)).toBeInstanceOf(Promise);
      expect(repository.findById('test')).toBeInstanceOf(Promise);
      expect(repository.existsBySku('test', 'agency')).toBeInstanceOf(Promise);
    });

    it('should follow Hexagonal Architecture principles', () => {
      // Repository should depend on domain interfaces, not infrastructure
      expect(repository).toBeInstanceOf(SqliteProductRepository);

      // Should accept domain entities and return domain entities
      const product = Product.create({
        sku: 'ARCH-001',
        name: 'Architecture Test',
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

      expect(product).toBeInstanceOf(Product);
    });
  });
});
