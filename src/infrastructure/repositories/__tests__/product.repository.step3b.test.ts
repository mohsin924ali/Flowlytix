/**
 * Product Repository Implementation Tests - Step 3B: Advanced Search Features
 *
 * Tests for basic advanced Product Repository search capabilities including:
 * - Advanced search operators (starts_with, ends_with, wildcard, phrase)
 * - Multi-field search combinations
 * - Search metadata (basic)
 * - Field-specific searching
 *
 * @domain Product Management
 * @subdomain Repository Layer - Advanced Search Features
 * @version 1.0.0
 * @author Development Team
 * @created 2024-01-20
 * @updated 2024-01-20
 *
 * @requires Step 3A: Enhanced Repository Search Foundation (COMPLETED)
 * @implements Basic advanced search features defined in ProductSearchCriteria
 * @integrates With existing search infrastructure
 *
 * Test Categories:
 * 1. Advanced Search Operators
 * 2. Multi-Field Search Combinations
 * 3. Search Metadata (Basic)
 * 4. Error Handling and Edge Cases
 */

import { beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import { createDatabaseConnection } from '../../database/connection';
import { createMigrationManager } from '../../database/migration';
import { SqliteProductRepository } from '../product.repository';
import { Product, ProductCategory, ProductStatus, UnitOfMeasure } from '../../../domain/entities/product';
import { Money } from '../../../domain/value-objects/money';
import {
  ProductRepositoryError,
  ProductSearchCriteria,
  SearchOperator,
} from '../../../domain/repositories/product.repository';

describe('Product Repository - Step 3B: Advanced Search Features', () => {
  let repository: SqliteProductRepository;
  let connection: any;
  let testAgencyId: string;

  // Test data for advanced search features
  const testProducts = [
    {
      sku: 'COFFEE-001',
      name: 'Premium Arabica Coffee Beans',
      description: 'High-quality organic Arabica coffee beans from Colombia with rich flavor profile',
      category: ProductCategory.FOOD_BEVERAGE,
      costPrice: 15.99,
      sellingPrice: 24.99,
      barcode: '1234567890123',
      tags: ['organic', 'arabica', 'colombia', 'premium', 'coffee'],
      currentStock: 45,
      weight: 1.0,
    },
    {
      sku: 'COFFEE-002',
      name: 'Regular Coffee Blend',
      description: 'Standard coffee blend for everyday use with balanced taste',
      category: ProductCategory.FOOD_BEVERAGE,
      costPrice: 8.99,
      sellingPrice: 12.99,
      barcode: '2345678901234',
      tags: ['coffee', 'blend', 'everyday', 'standard'],
      currentStock: 100,
    },
    {
      sku: 'TEA-001',
      name: 'Earl Grey Tea Premium',
      description: 'Premium Earl Grey tea with bergamot flavor and natural ingredients',
      category: ProductCategory.FOOD_BEVERAGE,
      costPrice: 12.5,
      sellingPrice: 18.99,
      barcode: '3456789012345',
      tags: ['tea', 'earl-grey', 'bergamot', 'premium'],
      currentStock: 25,
    },
    {
      sku: 'PHONE-001',
      name: 'Wireless Bluetooth Headphones',
      description: 'High-quality wireless headphones with noise cancellation and premium sound',
      category: ProductCategory.ELECTRONICS,
      costPrice: 45.0,
      sellingPrice: 79.99,
      barcode: '4567890123456',
      tags: ['wireless', 'bluetooth', 'headphones', 'noise-cancellation'],
      currentStock: 15,
    },
  ];

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

    // Create test products
    for (const productData of testProducts) {
      const product = Product.create({
        sku: productData.sku,
        name: productData.name,
        description: productData.description,
        category: productData.category,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(productData.costPrice, 'USD'),
        sellingPrice: Money.fromDecimal(productData.sellingPrice, 'USD'),
        barcode: productData.barcode,
        tags: productData.tags,
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: productData.currentStock,
        weight: productData.weight || 0,
        agencyId: testAgencyId,
        createdBy: 'test-user',
      });

      // Activate products so they have 'active' status in database
      const activeProduct = product.activate('test-user');
      await repository.save(activeProduct);
    }
  });

  afterEach(async () => {
    if (connection) {
      await connection.close();
    }
  });

  describe('Advanced Search Operators', () => {
    it('should support starts_with operator', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        searchFields: [
          {
            field: 'name',
            value: 'Premium',
            operator: SearchOperator.STARTS_WITH,
          },
        ],
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(1); // Premium Arabica Coffee Beans

      result.products.forEach((product) => {
        expect(product.name.startsWith('Premium')).toBe(true);
      });
    });

    it('should support ends_with operator', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        searchFields: [
          {
            field: 'name',
            value: 'Premium',
            operator: SearchOperator.ENDS_WITH,
          },
        ],
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(1); // Earl Grey Tea Premium

      expect(result.products[0].name.endsWith('Premium')).toBe(true);
    });

    it('should support wildcard operator', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        searchFields: [
          {
            field: 'sku',
            value: 'CO*-001',
            operator: SearchOperator.WILDCARD,
          },
        ],
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(1); // COFFEE-001
      expect(result.products[0].sku).toBe('COFFEE-001');
    });

    it('should support phrase operator for exact phrase matching', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        searchFields: [
          {
            field: 'description',
            value: 'noise cancellation',
            operator: SearchOperator.PHRASE,
          },
        ],
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(1); // Wireless Bluetooth Headphones
      expect(result.products[0].description).toContain('noise cancellation');
    });

    it('should support equals operator for exact matching', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        searchFields: [
          {
            field: 'sku',
            value: 'COFFEE-001',
            operator: SearchOperator.EQUALS,
          },
        ],
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(1);
      expect(result.products[0].sku).toBe('COFFEE-001');
    });
  });

  describe('Multi-Field Search Combinations', () => {
    it('should combine multiple search fields with AND logic', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        searchFields: [
          {
            field: 'name',
            value: 'Premium',
            operator: SearchOperator.CONTAINS,
          },
          {
            field: 'description',
            value: 'coffee',
            operator: SearchOperator.CONTAINS,
          },
        ],
        searchMode: 'all', // AND logic
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(1); // Premium Arabica Coffee Beans
      expect(result.products[0].name).toContain('Premium');
      expect(result.products[0].description).toContain('coffee');
    });

    it('should combine multiple search fields with OR logic', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        searchFields: [
          {
            field: 'name',
            value: 'Premium',
            operator: SearchOperator.CONTAINS,
          },
          {
            field: 'sku',
            value: 'PHONE-001',
            operator: SearchOperator.EQUALS,
          },
        ],
        searchMode: 'any', // OR logic
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBe(3); // Premium products + PHONE-001

      // Verify that products match either condition
      result.products.forEach((product) => {
        const matchesPremium = product.name.includes('Premium');
        const matchesPhone = product.sku === 'PHONE-001';
        expect(matchesPremium || matchesPhone).toBe(true);
      });
    });
  });

  describe('Search Metadata (Basic)', () => {
    it('should include search execution time when requested', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        search: 'coffee',
        includeSearchMetadata: true,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.searchMetadata?.executionTime).toBeDefined();
      expect(result.searchMetadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should track search query normalization', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        search: '  COFFEE   beans  ',
        includeSearchMetadata: true,
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.searchMetadata?.normalizedQuery).toBe('coffee beans');
      expect(result.searchMetadata?.originalQuery).toBe('  COFFEE   beans  ');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid search operators gracefully', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        searchFields: [
          {
            field: 'name',
            value: 'coffee',
            operator: 'invalid_operator' as any,
          },
        ],
        limit: 10,
        offset: 0,
      };

      // Should fall back to default behavior or throw appropriate error
      await expect(repository.search(criteria)).rejects.toThrow(ProductRepositoryError);
    });

    it('should handle empty search fields array', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        searchFields: [],
        limit: 10,
        offset: 0,
      };

      const result = await repository.search(criteria);

      expect(result).toBeDefined();
      expect(result.products.length).toBeGreaterThan(0); // Should return all products
    });

    it('should validate field names in search fields', async () => {
      const criteria: ProductSearchCriteria = {
        agencyId: testAgencyId,
        searchFields: [
          {
            field: 'invalid_field' as any,
            value: 'test',
            operator: SearchOperator.CONTAINS,
          },
        ],
        limit: 10,
        offset: 0,
      };

      await expect(repository.search(criteria)).rejects.toThrow(ProductRepositoryError);
    });
  });
});
