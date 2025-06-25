/**
 * Advanced Search Products Handler Unit Tests - Step 4a
 */

import { AdvancedSearchProductsHandler } from '../advanced-search-products.handler-simple';
import { IProductRepository } from '../../../../domain/repositories/product.repository';
import { IUserRepository } from '../../../../domain/repositories/user.repository';
import { Product, ProductCategory, ProductStatus, UnitOfMeasure } from '../../../../domain/entities/product';
import { User } from '../../../../domain/entities/user';
import { SystemRole } from '../../../../domain/value-objects/role';
import { Money } from '../../../../domain/value-objects/money';
import { Email } from '../../../../domain/value-objects/email';
import { Password } from '../../../../domain/value-objects/password';

describe('AdvancedSearchProductsHandler - Step 4a', () => {
  let handler: AdvancedSearchProductsHandler;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let testUser: User;
  let testProducts: Product[];

  beforeEach(() => {
    // Create mock repositories
    mockProductRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      findByBarcode: jest.fn(),
      existsBySku: jest.fn(),
      existsByBarcode: jest.fn(),
      search: jest.fn(),
      findByAgency: jest.fn(),
      findByCategory: jest.fn(),
      findByStatus: jest.fn(),
      findBySupplier: jest.fn(),
      findOutOfStock: jest.fn(),
      findLowStock: jest.fn(),
      findNeedingReorder: jest.fn(),
      count: jest.fn(),
      countByCriteria: jest.fn(),
      delete: jest.fn(),
      getStats: jest.fn(),
      isHealthy: jest.fn(),
      beginTransaction: jest.fn(),
    } as jest.Mocked<IProductRepository>;

    mockUserRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      existsByEmail: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      countByCriteria: jest.fn(),
      isHealthy: jest.fn(),
      search: jest.fn(),
      findAll: jest.fn(),
      findByRole: jest.fn(),
      findByStatus: jest.fn(),
      beginTransaction: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    // Create test user with READ_PRODUCT permission
    testUser = User.create({
      firstName: 'Test',
      lastName: 'Manager',
      email: 'manager@example.com',
      password: 'VeryComplexP@ssw0rd!9876XyZ',
      role: SystemRole.MANAGER,
    });

    // Create test products
    testProducts = [
      Product.create({
        sku: 'COFFEE-001',
        name: 'Premium Arabica Coffee Beans',
        description: 'High-quality organic Arabica coffee beans',
        category: ProductCategory.FOOD_BEVERAGE,
        unitOfMeasure: UnitOfMeasure.KILOGRAM,
        costPrice: Money.fromDecimal(15.99, 'USD'),
        sellingPrice: Money.fromDecimal(24.99, 'USD'),
        barcode: '1234567890123',
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        reservedStock: 5,
        weight: 1.0,
        tags: ['premium', 'organic', 'coffee'],
        agencyId: '550e8400-e29b-41d4-a716-446655440000',
        createdBy: testUser.id,
      }),
      Product.create({
        sku: 'COFFEE-002',
        name: 'Regular Coffee Blend',
        description: 'Standard coffee blend',
        category: ProductCategory.FOOD_BEVERAGE,
        unitOfMeasure: UnitOfMeasure.KILOGRAM,
        costPrice: Money.fromDecimal(8.99, 'USD'),
        sellingPrice: Money.fromDecimal(12.99, 'USD'),
        minStockLevel: 20,
        maxStockLevel: 200,
        reorderLevel: 40,
        currentStock: 100,
        reservedStock: 10,
        tags: ['regular', 'coffee'],
        agencyId: '550e8400-e29b-41d4-a716-446655440000',
        createdBy: testUser.id,
      }),
    ];

    handler = new AdvancedSearchProductsHandler(mockProductRepository, mockUserRepository);
  });

  describe('Basic Functionality', () => {
    it('should handle valid search query', async () => {
      // Arrange
      const testUserId = '550e8400-e29b-41d4-a716-446655440001';
      const query = {
        requestedBy: testUserId,
        globalSearch: 'coffee',
        page: 1,
        limit: 10,
      };

      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.search.mockResolvedValue({
        products: testProducts,
        total: 2,
        limit: 10000,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.products).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.searchTime).toBeGreaterThan(0);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const query = {
        requestedBy: '550e8400-e29b-41d4-a716-446655440002',
        globalSearch: 'test',
      };

      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.handle(query)).rejects.toThrow('Requesting user not found');
    });
  });

  describe('Global Search', () => {
    it('should apply relevance scoring', async () => {
      // Arrange
      const testUserId = '550e8400-e29b-41d4-a716-446655440001';
      const query = {
        requestedBy: testUserId,
        globalSearch: 'premium',
        sortBy: 'relevance' as const,
      };

      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.search.mockResolvedValue({
        products: testProducts,
        total: 2,
        limit: 10000,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(query);

      // Assert
      const premiumProduct = result.products.find((p) => p.name.includes('Premium'));
      expect(premiumProduct).toBeDefined();
      expect(premiumProduct!.score).toBeDefined();
      expect(premiumProduct!.score!).toBeGreaterThan(0.5);
    });
  });

  describe('Advanced Filtering', () => {
    it('should filter by tags', async () => {
      // Arrange
      const testUserId = '550e8400-e29b-41d4-a716-446655440001';
      const query = {
        requestedBy: testUserId,
        tags: ['organic'],
      };

      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.search.mockResolvedValue({
        products: testProducts,
        total: 2,
        limit: 10000,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result.products).toHaveLength(1); // Only Premium Coffee has 'organic' tag
      expect(result.products[0].tags).toContain('organic');
    });

    it('should filter by price range', async () => {
      // Arrange
      const testUserId = '550e8400-e29b-41d4-a716-446655440001';
      const query = {
        requestedBy: testUserId,
        priceRanges: [
          {
            min: 10,
            max: 20,
            type: 'selling' as const,
          },
        ],
      };

      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.search.mockResolvedValue({
        products: testProducts,
        total: 2,
        limit: 10000,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result.products).toHaveLength(1); // Only Regular Coffee (12.99)
    });
  });

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      // Arrange
      const testUserId = '550e8400-e29b-41d4-a716-446655440001';
      const query = {
        requestedBy: testUserId,
        page: 1,
        limit: 1,
      };

      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.search.mockResolvedValue({
        products: testProducts,
        total: 2,
        limit: 10000,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(query);

      // Assert
      expect(result.products).toHaveLength(1);
      expect(result.totalPages).toBe(2);
      expect(result.hasNextPage).toBe(true);
    });
  });
});
