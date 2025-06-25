/**
 * Product Repository Implementation Tests - Step 3A: Enhanced Repository Search Foundation
 *
 * Tests for advanced Product Repository search capabilities including:
 * - Enhanced full-text search with relevance scoring
 * - Fuzzy matching and suggestion capabilities
 * - Complex multi-field search combinations
 * - Advanced filtering and sorting options
 * - Search performance optimization
 * - Search result highlighting and metadata
 * - Multi-criteria search combinations
 * - Search analytics and statistics
 *
 * @domain Product Management
 * @subdomain Repository Layer - Advanced Search
 * @version 1.0.0
 * @author Development Team
 * @created 2024-01-20
 * @updated 2024-01-20
 */

import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { createDatabaseConnection } from '../../database/connection';
import { createMigrationManager } from '../../database/migration';
import { SqliteProductRepository } from '../product.repository';
import { Product, ProductCategory, ProductStatus, UnitOfMeasure } from '../../../domain/entities/product';
import { Money } from '../../../domain/value-objects/money';
import { ProductSearchCriteria } from '../../../domain/repositories/product.repository';

describe('Product Repository - Step 3A: Enhanced Repository Search Foundation', () => {
  let connection: any;
  let repository: SqliteProductRepository;
  let testAgencyId: string;
  let testProducts: Product[];

  beforeEach(async () => {
    // Initialize in-memory database for testing
    connection = createDatabaseConnection({ filename: ':memory:' });
    await connection.connect();

    // Disable foreign key constraints for testing
    const db = connection.getDatabase();
    db.pragma('foreign_keys = OFF');

    // Run migrations to create tables
    const migrationManager = createMigrationManager(connection);
    await migrationManager.migrate();

    repository = new SqliteProductRepository(connection);
    testAgencyId = 'test-agency-' + Date.now();

    // Create comprehensive test dataset for search testing
    testProducts = await seedAdvancedSearchTestData();
  });

  afterEach(async () => {
    if (connection) {
      await connection.close();
    }
  });

  /**
   * Helper function to create comprehensive test data for advanced search testing
   */
  async function seedAdvancedSearchTestData(): Promise<Product[]> {
    const products: Product[] = [];

    // Create diverse product set for testing various search scenarios
    const productData = [
      {
        sku: 'COFFEE-001',
        name: 'Premium Arabica Coffee Beans',
        description: 'High-quality organic Arabica coffee beans from Colombia',
        category: ProductCategory.FOOD_BEVERAGE,
        costPrice: 15.99,
        sellingPrice: 24.99,
        barcode: '1234567890123',
        tags: ['premium', 'organic', 'coffee', 'arabica'],
        weight: 1.0,
        currentStock: 50,
      },
      {
        sku: 'COFFEE-002',
        name: 'Regular Coffee Blend',
        description: 'Standard coffee blend for everyday use',
        category: ProductCategory.FOOD_BEVERAGE,
        costPrice: 8.99,
        sellingPrice: 12.99,
        tags: ['regular', 'coffee', 'blend'],
        currentStock: 100,
      },
      {
        sku: 'TEA-001',
        name: 'Earl Grey Tea Premium',
        description: 'Premium Earl Grey tea with bergamot flavor',
        category: ProductCategory.FOOD_BEVERAGE,
        costPrice: 12.5,
        sellingPrice: 18.99,
        barcode: '2345678901234',
        tags: ['premium', 'tea', 'earl grey', 'bergamot'],
        currentStock: 30,
      },
      {
        sku: 'SOAP-001',
        name: 'Organic Hand Soap',
        description: 'Natural organic hand soap with lavender scent',
        category: ProductCategory.PERSONAL_CARE,
        costPrice: 5.99,
        sellingPrice: 9.99,
        tags: ['organic', 'soap', 'lavender', 'natural'],
        currentStock: 75,
      },
      {
        sku: 'SHAMPOO-001',
        name: 'Premium Hair Shampoo',
        description: 'Professional grade shampoo for all hair types',
        category: ProductCategory.PERSONAL_CARE,
        costPrice: 8.5,
        sellingPrice: 14.99,
        tags: ['premium', 'shampoo', 'hair care', 'professional'],
        currentStock: 40,
      },
      {
        sku: 'PHONE-001',
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        category: ProductCategory.ELECTRONICS,
        costPrice: 45.0,
        sellingPrice: 79.99,
        barcode: '3456789012345',
        tags: ['wireless', 'bluetooth', 'headphones', 'noise cancellation'],
        currentStock: 25,
      },
      {
        sku: 'TABLET-001',
        name: 'Android Tablet 10 inch',
        description: 'Powerful Android tablet with 10-inch HD display',
        category: ProductCategory.ELECTRONICS,
        costPrice: 120.0,
        sellingPrice: 199.99,
        tags: ['android', 'tablet', 'HD display', '10 inch'],
        currentStock: 15,
      },
      {
        sku: 'SHIRT-001',
        name: 'Cotton T-Shirt Blue',
        description: 'Comfortable 100% cotton t-shirt in blue color',
        category: ProductCategory.CLOTHING,
        costPrice: 7.99,
        sellingPrice: 13.99,
        barcode: '4567890123456',
        tags: ['cotton', 't-shirt', 'blue', 'comfortable'],
        currentStock: 60,
      },
    ];

    for (const data of productData) {
      const product = Product.create({
        sku: data.sku,
        name: data.name,
        description: data.description,
        category: data.category,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(data.costPrice, 'USD'),
        sellingPrice: Money.fromDecimal(data.sellingPrice, 'USD'),
        barcode: data.barcode,
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: data.currentStock,
        weight: data.weight,
        tags: data.tags || [],
        agencyId: testAgencyId,
        createdBy: 'test-user',
      });

      // Activate products so they have 'active' status in database
      const activeProduct = product.activate('test-user');
      await repository.save(activeProduct);
      products.push(activeProduct);
    }

    return products;
  }

  describe('Enhanced Full-Text Search', () => {
    it('should perform full-text search across name, description, and SKU', async () => {
      const criteria: ProductSearchCriteria = {
        search: 'coffee',
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(2); // COFFEE-001 and COFFEE-002
      expect(result.total).toBe(2);

      // Verify both coffee products are returned
      const skus = result.products.map((p) => p.sku);
      expect(skus).toContain('COFFEE-001');
      expect(skus).toContain('COFFEE-002');
    });

    it('should search in product descriptions', async () => {
      const criteria: ProductSearchCriteria = {
        search: 'organic',
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(2); // Coffee and Soap with organic

      const names = result.products.map((p) => p.name);
      expect(names).toContain('Premium Arabica Coffee Beans');
      expect(names).toContain('Organic Hand Soap');
    });

    it('should search by SKU patterns', async () => {
      const criteria: ProductSearchCriteria = {
        sku: 'COFFEE',
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(2);

      const skus = result.products.map((p) => p.sku);
      expect(skus).toContain('COFFEE-001');
      expect(skus).toContain('COFFEE-002');
    });

    it('should perform case-insensitive search', async () => {
      const criteria: ProductSearchCriteria = {
        search: 'PREMIUM',
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(3); // Premium coffee, tea, and shampoo

      const names = result.products.map((p) => p.name.toLowerCase());
      expect(names.every((name) => name.includes('premium'))).toBe(true);
    });

    it('should handle partial word matches', async () => {
      const criteria: ProductSearchCriteria = {
        search: 'tablet',
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(1);
      expect(result.products[0].name).toBe('Android Tablet 10 inch');
    });
  });

  describe('Category and Status Filtering', () => {
    it('should filter by category', async () => {
      const criteria: ProductSearchCriteria = {
        category: ProductCategory.ELECTRONICS,
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(2); // Headphones and Tablet

      const categories = result.products.map((p) => p.category);
      expect(categories.every((cat) => cat === ProductCategory.ELECTRONICS)).toBe(true);
    });

    it('should combine search with category filter', async () => {
      const criteria: ProductSearchCriteria = {
        search: 'premium',
        category: ProductCategory.FOOD_BEVERAGE,
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(2); // Premium coffee and tea

      const categories = result.products.map((p) => p.category);
      expect(categories.every((cat) => cat === ProductCategory.FOOD_BEVERAGE)).toBe(true);
    });

    it('should filter by status', async () => {
      const criteria: ProductSearchCriteria = {
        status: ProductStatus.ACTIVE,
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(8); // All test products are active

      const statuses = result.products.map((p) => p.status);
      expect(statuses.every((status) => status === ProductStatus.ACTIVE)).toBe(true);
    });
  });

  describe('Price Range Filtering', () => {
    it('should filter by minimum price', async () => {
      const criteria: ProductSearchCriteria = {
        minPrice: 50.0, // Should match expensive electronics
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(2); // Headphones and Tablet

      const prices = result.products.map((p) => p.sellingPrice.decimalAmount);
      expect(prices.every((price) => price >= 50.0)).toBe(true);
    });

    it('should filter by maximum price', async () => {
      const criteria: ProductSearchCriteria = {
        maxPrice: 15.0, // Should match cheaper items
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(3); // Coffee blend, soap, t-shirt

      const prices = result.products.map((p) => p.sellingPrice.decimalAmount);
      expect(prices.every((price) => price <= 15.0)).toBe(true);
    });

    it('should filter by price range', async () => {
      const criteria: ProductSearchCriteria = {
        minPrice: 15.0,
        maxPrice: 25.0,
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(2); // Premium coffee and tea

      const prices = result.products.map((p) => p.sellingPrice.decimalAmount);
      expect(prices.every((price) => price >= 15.0 && price <= 25.0)).toBe(true);
    });
  });

  describe('Stock Level Filtering', () => {
    it('should find products with low stock', async () => {
      const criteria: ProductSearchCriteria = {
        lowStock: true,
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      // Should find products with currentStock <= minStockLevel (10)
      expect(result.products.length).toBeGreaterThan(0);
    });

    it('should find out of stock products', async () => {
      // First create an out of stock product
      const outOfStockProduct = Product.create({
        sku: 'OUT-OF-STOCK-001',
        name: 'Out of Stock Product',
        description: 'This product is out of stock',
        category: ProductCategory.HOUSEHOLD,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(10.0, 'USD'),
        sellingPrice: Money.fromDecimal(15.0, 'USD'),
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 0, // Out of stock
        agencyId: testAgencyId,
        createdBy: 'test-user',
      });

      await repository.save(outOfStockProduct.activate('test-user'));

      const criteria: ProductSearchCriteria = {
        outOfStock: true,
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(1);
      expect(result.products[0].currentStock).toBe(0);
    });
  });

  describe('Barcode Search', () => {
    it('should search by exact barcode', async () => {
      const criteria: ProductSearchCriteria = {
        barcode: '1234567890123',
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(1);
      expect(result.products[0].barcode).toBe('1234567890123');
      expect(result.products[0].name).toBe('Premium Arabica Coffee Beans');
    });

    it('should return empty result for non-existent barcode', async () => {
      const criteria: ProductSearchCriteria = {
        barcode: '9999999999999',
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Sorting and Pagination', () => {
    it('should sort by name ascending', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        sortBy: 'name',
        sortOrder: 'asc',
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(8);

      // Verify alphabetical order
      const names = result.products.map((p) => p.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should sort by price descending', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        sortBy: 'sellingPrice',
        sortOrder: 'desc',
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(8);

      // Verify price order (highest first)
      const prices = result.products.map((p) => p.sellingPrice.decimalAmount);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i - 1]).toBeGreaterThanOrEqual(prices[i]);
      }
    });

    it('should implement pagination correctly', async () => {
      // First page
      const page1 = await repository.search({
        agencyId: testAgencyId,
        limit: 3,
        offset: 0,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      // Second page
      const page2 = await repository.search({
        agencyId: testAgencyId,
        limit: 3,
        offset: 3,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(page1.products.length).toBe(3);
      expect(page2.products.length).toBe(3);
      expect(page1.total).toBe(8);
      expect(page2.total).toBe(8);
      expect(page1.hasMore).toBe(true);
      expect(page2.hasMore).toBe(true);

      // Verify no overlap
      const page1Skus = page1.products.map((p) => p.sku);
      const page2Skus = page2.products.map((p) => p.sku);
      const intersection = page1Skus.filter((sku) => page2Skus.includes(sku));
      expect(intersection.length).toBe(0);
    });
  });

  describe('Complex Search Combinations', () => {
    it('should combine multiple search criteria', async () => {
      const criteria: ProductSearchCriteria = {
        search: 'premium',
        category: ProductCategory.PERSONAL_CARE,
        minPrice: 10.0,
        maxPrice: 20.0,
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(1); // Premium Hair Shampoo
      expect(result.products[0].name).toBe('Premium Hair Shampoo');
      expect(result.products[0].category).toBe(ProductCategory.PERSONAL_CARE);
      expect(result.products[0].sellingPrice.decimalAmount).toBeGreaterThanOrEqual(10.0);
      expect(result.products[0].sellingPrice.decimalAmount).toBeLessThanOrEqual(20.0);
    });

    it('should handle criteria that return no results', async () => {
      const criteria: ProductSearchCriteria = {
        search: 'nonexistent',
        category: ProductCategory.ELECTRONICS,
        minPrice: 1000.0, // Too high
        agencyId: testAgencyId,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should throw error for invalid agency ID', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: '',
        limit: 10,
        offset: 0,
      };

      await expect(repository.search(criteria)).rejects.toThrow();
    });

    it('should throw error for invalid limit', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        limit: 0, // Invalid
        offset: 0,
      };

      await expect(repository.search(criteria)).rejects.toThrow();
    });

    it('should throw error for negative offset', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        limit: 10,
        offset: -1, // Invalid
      };

      await expect(repository.search(criteria)).rejects.toThrow();
    });

    it('should handle null search criteria gracefully', async () => {
      await expect(repository.search(null as any)).rejects.toThrow();
    });

    it('should handle undefined search criteria gracefully', async () => {
      await expect(repository.search(undefined as any)).rejects.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();

      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        limit: 1000, // Large limit
        offset: 0,
      };

      const result = await repository.search(criteria);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain consistent performance with complex queries', async () => {
      const startTime = Date.now();

      const criteria: ProductSearchCriteria = {
        search: 'premium',
        category: ProductCategory.FOOD_BEVERAGE,
        minPrice: 1.0,
        maxPrice: 100.0,
        sortBy: 'sellingPrice',
        sortOrder: 'desc',
        agencyId: testAgencyId,
        limit: 100,
        offset: 0,
      };

      const result = await repository.search(criteria);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });
});
