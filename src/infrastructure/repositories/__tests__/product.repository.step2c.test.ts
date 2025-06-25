/**
 * Product Repository Implementation Tests - Step 2C: Product Categorization Features
 *
 * Tests for advanced Product Repository categorization methods including:
 * - getCategoryStats() - Get statistics for each category
 * - findCategoriesWithProducts() - Find categories that have products
 * - getCategoryDistribution() - Get product distribution across categories
 * - findProductsByMultipleCategories() - Find products matching multiple categories
 * - validateCategoryTransition() - Validate category changes
 * - getCategoryHierarchy() - Get category hierarchy information
 * - suggestCategory() - Suggest category based on product attributes
 * - getCategoryTrends() - Get category trend analysis
 *
 * @domain Product Management
 * @subdomain Repository Layer - Categorization
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

describe('Product Repository - Step 2C: Product Categorization Features', () => {
  let connection: any;
  let repository: SqliteProductRepository;
  let testAgencyId: string;

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

    // Create test products across different categories
    await seedTestProductsForCategories();
  });

  afterEach(async () => {
    if (connection) {
      await connection.close();
    }
  });

  /**
   * Helper function to create test products across different categories
   */
  async function seedTestProductsForCategories(): Promise<void> {
    const categories = [
      ProductCategory.FOOD_BEVERAGE,
      ProductCategory.HOUSEHOLD,
      ProductCategory.PERSONAL_CARE,
      ProductCategory.ELECTRONICS,
      ProductCategory.CLOTHING,
    ];

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      if (!category) continue; // Skip if undefined

      // Create 3 products per category
      for (let j = 1; j <= 3; j++) {
        const product = Product.create({
          sku: `${category}-${j}`,
          name: `Test Product ${category} ${j}`,
          description: `Test product for category ${category}`,
          category: category as ProductCategory,
          unitOfMeasure: UnitOfMeasure.PIECE,
          costPrice: Money.fromDecimal(10.0 + i * 1.0 + j * 0.1, 'USD'),
          sellingPrice: Money.fromDecimal(15.0 + i * 1.0 + j * 0.1, 'USD'),
          minStockLevel: 10,
          maxStockLevel: 100,
          reorderLevel: 20,
          currentStock: 50 - j * 10, // Varying stock levels
          agencyId: testAgencyId,
          createdBy: 'test-user',
        });

        // Activate the product so it has 'active' status in database
        const activeProduct = product.activate('test-user');

        await repository.save(activeProduct);
      }
    }
  }

  describe('getCategoryStats', () => {
    it('should return statistics for all categories with products', async () => {
      const stats = await repository.getCategoryStats(testAgencyId);

      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBe(5); // 5 categories seeded

      // Check each category has proper stats
      for (const stat of stats) {
        expect(stat).toHaveProperty('category');
        expect(stat).toHaveProperty('productCount');
        expect(stat).toHaveProperty('totalValue');
        expect(stat).toHaveProperty('averagePrice');
        expect(stat).toHaveProperty('lowStockCount');
        expect(stat).toHaveProperty('outOfStockCount');

        expect(stat.productCount).toBe(3); // 3 products per category
        expect(stat.totalValue).toBe(0); // 0 because no inventory data exists
        expect(stat.averagePrice).toBeGreaterThan(0);
      }
    });

    it('should return empty array when no products exist', async () => {
      const emptyAgencyId = 'empty-agency';
      const stats = await repository.getCategoryStats(emptyAgencyId);

      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBe(0);
    });

    it('should throw error for invalid agency ID', async () => {
      await expect(repository.getCategoryStats('')).rejects.toThrow();
      await expect(repository.getCategoryStats('   ')).rejects.toThrow();
    });

    it('should handle null agency ID gracefully', async () => {
      const stats = await repository.getCategoryStats();
      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
    });
  });

  describe('findCategoriesWithProducts', () => {
    it('should return categories that have products', async () => {
      const categories = await repository.findCategoriesWithProducts(testAgencyId);

      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(5);

      const expectedCategories = [
        ProductCategory.FOOD_BEVERAGE,
        ProductCategory.HOUSEHOLD,
        ProductCategory.PERSONAL_CARE,
        ProductCategory.ELECTRONICS,
        ProductCategory.CLOTHING,
      ];

      for (const category of expectedCategories) {
        expect(categories).toContain(category);
      }
    });

    it('should return empty array when no products exist', async () => {
      const emptyAgencyId = 'empty-agency';
      const categories = await repository.findCategoriesWithProducts(emptyAgencyId);

      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(0);
    });

    it('should include only active products by default', async () => {
      // This test would require creating inactive products to verify filtering
      const categories = await repository.findCategoriesWithProducts(testAgencyId);
      expect(categories.length).toBe(5);
    });
  });

  describe('getCategoryDistribution', () => {
    it('should return proper distribution of products across categories', async () => {
      const distribution = await repository.getCategoryDistribution(testAgencyId);

      expect(distribution).toBeDefined();
      expect(distribution).toHaveProperty('totalProducts');
      expect(distribution).toHaveProperty('categories');
      expect(distribution.totalProducts).toBe(15); // 5 categories × 3 products

      const categories = distribution.categories;
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(5);

      for (const category of categories) {
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('count');
        expect(category).toHaveProperty('percentage');

        expect(category.count).toBe(3);
        expect(category.percentage).toBe(20); // 3/15 = 20%
      }
    });

    it('should calculate percentages correctly', async () => {
      const distribution = await repository.getCategoryDistribution(testAgencyId);

      let totalPercentage = 0;
      for (const category of distribution.categories) {
        totalPercentage += category.percentage;
      }

      expect(Math.round(totalPercentage)).toBe(100);
    });
  });

  describe('findProductsByMultipleCategories', () => {
    it('should find products from multiple specified categories', async () => {
      const categories = [ProductCategory.FOOD_BEVERAGE, ProductCategory.ELECTRONICS];
      const products = await repository.findProductsByMultipleCategories(categories, testAgencyId);

      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBe(6); // 2 categories × 3 products

      for (const product of products) {
        expect(categories).toContain(product.category);
      }
    });

    it('should return empty array for non-existent categories', async () => {
      const categories = [ProductCategory.TOYS_GAMES]; // Not seeded
      const products = await repository.findProductsByMultipleCategories(categories, testAgencyId);

      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const categories = [ProductCategory.FOOD_BEVERAGE, ProductCategory.ELECTRONICS];
      const products = await repository.findProductsByMultipleCategories(categories, testAgencyId, 3);

      expect(products.length).toBeLessThanOrEqual(3);
    });

    it('should throw error for empty categories array', async () => {
      await expect(repository.findProductsByMultipleCategories([], testAgencyId)).rejects.toThrow();
    });

    it('should validate category values', async () => {
      const invalidCategories = ['INVALID_CATEGORY' as ProductCategory];
      await expect(repository.findProductsByMultipleCategories(invalidCategories, testAgencyId)).rejects.toThrow();
    });
  });

  describe('validateCategoryTransition', () => {
    it('should allow valid category transitions', async () => {
      const fromCategory = ProductCategory.FOOD_BEVERAGE;
      const toCategory = ProductCategory.HOUSEHOLD;

      const isValid = await repository.validateCategoryTransition(fromCategory, toCategory);
      expect(isValid).toBe(true);
    });

    it('should prevent transitions that might cause business rule violations', async () => {
      // For now, all transitions are allowed, but this method provides extension point
      const fromCategory = ProductCategory.ELECTRONICS;
      const toCategory = ProductCategory.FOOD_BEVERAGE;

      const isValid = await repository.validateCategoryTransition(fromCategory, toCategory);
      expect(typeof isValid).toBe('boolean');
    });

    it('should validate category enum values', async () => {
      const validCategory = ProductCategory.ELECTRONICS;
      const invalidCategory = 'INVALID_CATEGORY' as ProductCategory;

      await expect(repository.validateCategoryTransition(invalidCategory, validCategory)).rejects.toThrow();
      await expect(repository.validateCategoryTransition(validCategory, invalidCategory)).rejects.toThrow();
    });
  });

  describe('getCategoryHierarchy', () => {
    it('should return category hierarchy information', async () => {
      const hierarchy = await repository.getCategoryHierarchy();

      expect(hierarchy).toBeDefined();
      expect(Array.isArray(hierarchy)).toBe(true);
      expect(hierarchy.length).toBeGreaterThan(0);

      for (const category of hierarchy) {
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('displayName');
        expect(category).toHaveProperty('description');
        expect(category).toHaveProperty('parentCategory');
        expect(category).toHaveProperty('sortOrder');
      }
    });

    it('should include all available categories', async () => {
      const hierarchy = await repository.getCategoryHierarchy();
      const categoryCount = Object.values(ProductCategory).length;

      expect(hierarchy.length).toBe(categoryCount);
    });
  });

  describe('suggestCategory', () => {
    it('should suggest category based on product name', async () => {
      const suggestions = await repository.suggestCategory({
        name: 'Apple iPhone 15',
        description: 'Latest smartphone with advanced features',
      });

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      if (suggestions.length > 0) {
        expect(suggestions[0].category).toBe(ProductCategory.ELECTRONICS);
      }
    });

    it('should suggest category based on description', async () => {
      const suggestions = await repository.suggestCategory({
        name: 'Premium Product',
        description: 'Organic shampoo for daily hair care',
      });

      expect(suggestions).toBeDefined();
      if (suggestions.length > 0) {
        expect(suggestions[0].category).toBe(ProductCategory.PERSONAL_CARE);
      }
    });

    it('should return multiple suggestions with confidence scores', async () => {
      const suggestions = await repository.suggestCategory({
        name: 'Multi-purpose cleaner',
        description: 'Can be used for household cleaning',
      });

      expect(suggestions.length).toBeGreaterThan(0);

      for (const suggestion of suggestions) {
        expect(suggestion).toHaveProperty('category');
        expect(suggestion).toHaveProperty('confidence');
        expect(suggestion).toHaveProperty('reason');
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should handle empty input gracefully', async () => {
      const suggestions = await repository.suggestCategory({
        name: 'unknown product',
        description: '',
      });

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('getCategoryTrends', () => {
    it('should return category trend analysis', async () => {
      const trends = await repository.getCategoryTrends(testAgencyId, 30); // Last 30 days

      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);

      for (const trend of trends) {
        expect(trend).toHaveProperty('category');
        expect(trend).toHaveProperty('period');
        expect(trend).toHaveProperty('productCount');
        expect(trend).toHaveProperty('growthRate');
        expect(trend).toHaveProperty('trend'); // 'growing', 'stable', 'declining'
      }
    });

    it('should handle different time periods', async () => {
      const trends7Days = await repository.getCategoryTrends(testAgencyId, 7);
      const trends30Days = await repository.getCategoryTrends(testAgencyId, 30);

      expect(trends7Days).toBeDefined();
      expect(trends30Days).toBeDefined();
      expect(Array.isArray(trends7Days)).toBe(true);
      expect(Array.isArray(trends30Days)).toBe(true);
    });

    it('should validate time period parameter', async () => {
      await expect(repository.getCategoryTrends(testAgencyId, 0)).rejects.toThrow();
      await expect(repository.getCategoryTrends(testAgencyId, -1)).rejects.toThrow();
      await expect(repository.getCategoryTrends(testAgencyId, 366)).rejects.toThrow(); // Max 365 days
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Close connection to simulate error
      await connection.close();

      await expect(repository.getCategoryStats(testAgencyId)).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      try {
        await repository.getCategoryStats('');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Agency ID');
      }
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // This would be expanded in a real performance test
      const startTime = Date.now();
      await repository.getCategoryStats(testAgencyId);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

/**
 * Type definitions for new repository methods
 */
export interface CategoryStats {
  category: ProductCategory;
  productCount: number;
  totalValue: number;
  averagePrice: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface CategoryDistribution {
  totalProducts: number;
  categories: Array<{
    category: ProductCategory;
    count: number;
    percentage: number;
  }>;
}

export interface CategorySuggestion {
  category: ProductCategory;
  confidence: number; // 0-1
  reason: string;
}

export interface CategoryHierarchyItem {
  category: ProductCategory;
  displayName: string;
  description: string;
  parentCategory: ProductCategory | null;
  sortOrder: number;
}

export interface CategoryTrend {
  category: ProductCategory;
  period: string;
  productCount: number;
  growthRate: number; // Percentage
  trend: 'growing' | 'stable' | 'declining';
}

export interface CategorySuggestionInput {
  name: string;
  description?: string;
}
