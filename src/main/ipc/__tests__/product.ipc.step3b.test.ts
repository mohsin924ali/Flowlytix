/**
 * Product IPC Handler Tests - Task 3 Step 3b: Get Products Handler Integration
 *
 * Tests the real implementation of handleGetProducts method with GetProductsHandler integration.
 * Follows incremental development approach with comprehensive test coverage.
 *
 * @domain Product Management
 * @pattern Integration Testing
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { ProductIpcHandler } from '../product.ipc';
import { IProductRepository, ProductSearchResult } from '../../../domain/repositories/product.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/entities/user';
import { Product, ProductCategory, ProductStatus, UnitOfMeasure } from '../../../domain/entities/product';
import { Permission, Role } from '../../../domain/value-objects/role';
import { Email } from '../../../domain/value-objects/email';
import { Money, CurrencyCode } from '../../../domain/value-objects/money';

// Mock IPC Event
const mockEvent = {
  userId: 'user_123',
  sender: {
    id: 1,
    isDestroyed: () => false,
  },
} as any;

// Mock Product Repository
const mockProductRepository: jest.Mocked<IProductRepository> = {
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
};

// Mock User Repository
const mockUserRepository: jest.Mocked<IUserRepository> = {
  save: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  existsByEmail: jest.fn(),
  search: jest.fn(),
  findAll: jest.fn(),
  findByRole: jest.fn(),
  findByStatus: jest.fn(),
  findLockedUsers: jest.fn(),
  count: jest.fn(),
  countByCriteria: jest.fn(),
  delete: jest.fn(),
  getStats: jest.fn(),
  isHealthy: jest.fn(),
  beginTransaction: jest.fn(),
};

// Test Data Factory
const createTestUser = (hasReadPermission: boolean = true): User => {
  // Use ADMIN role which has READ_PRODUCT permission by default
  // For testing insufficient permissions, we'll use VIEWER role
  const roleValue = hasReadPermission ? 'admin' : 'viewer';
  const role = Role.fromString(roleValue);
  return User.create({
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: role.value,
    password: 'UniqueTestPass2024#$%',
  });
};

const createTestProduct = (overrides: Partial<any> = {}): Product => {
  return Product.create({
    sku: 'TEST-001',
    name: 'Test Product',
    description: 'Test Description',
    category: ProductCategory.ELECTRONICS,
    unitOfMeasure: UnitOfMeasure.PIECE,
    costPrice: Money.fromDecimal(10.0, 'USD'),
    sellingPrice: Money.fromDecimal(15.0, 'USD'),
    minStockLevel: 10,
    maxStockLevel: 100,
    reorderLevel: 20,
    currentStock: 50,
    agencyId: 'agency_123',
    createdBy: 'user_123',
    ...overrides,
  });
};

describe('ProductIpcHandler - Task 3 Step 3b: Get Products Handler Integration', () => {
  let productIpcHandler: ProductIpcHandler;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create handler instance
    productIpcHandler = ProductIpcHandler.create(mockProductRepository, mockUserRepository);
  });

  describe('handleGetProducts - Real Implementation', () => {
    it('should successfully retrieve products with default filters', async () => {
      // Arrange
      const testUser = createTestUser(true);
      const testProducts = [
        createTestProduct({ sku: 'PROD-001', name: 'Product 1' }),
        createTestProduct({ sku: 'PROD-002', name: 'Product 2' }),
      ];

      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.search.mockResolvedValue({
        products: testProducts,
        total: 2,
        limit: 20,
        offset: 0,
        hasMore: false,
      } as ProductSearchResult);

      const filters = {
        page: 1,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await (productIpcHandler as any).handleGetProducts(mockEvent, filters);

      // Assert
      expect(result.success).toBe(true);
      expect(result.operation).toBe('get-products');
      expect(result.data).toBeDefined();
      expect(result.data.products).toHaveLength(2);
      expect(result.data.total).toBe(2);
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.totalPages).toBe(1);
      expect(result.data.hasNextPage).toBe(false);
      expect(result.data.hasPreviousPage).toBe(false);

      // Verify repository calls
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_123');
      expect(mockProductRepository.search).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      // Verify product data structure
      const firstProduct = result.data.products[0];
      expect(firstProduct).toMatchObject({
        id: expect.any(String),
        sku: 'PROD-001',
        name: 'Product 1',
        category: 'ELECTRONICS',
        unitOfMeasure: 'PIECE',
        status: 'PENDING_APPROVAL',
        costPrice: 1000,
        costPriceCurrency: 'USD',
        sellingPrice: 1500,
        sellingPriceCurrency: 'USD',
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        agencyId: 'agency_123',
        createdBy: 'user_123',
        needsReorder: false,
        isOutOfStock: false,
        isLowStock: false,
        profitMargin: expect.any(Number),
      });
    });

    it('should handle user not found error', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      const filters = {
        page: 1,
        limit: 20,
      };

      // Act
      const result = await (productIpcHandler as any).handleGetProducts(mockEvent, filters);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.code).toBe('PRODUCT_USER_NOT_FOUND');
      expect(result.operation).toBe('get-products');

      // Verify repository calls
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_123');
      expect(mockProductRepository.search).not.toHaveBeenCalled();
    });

    it('should handle insufficient permissions error', async () => {
      // Arrange - Create a user with INACTIVE status (no permissions)
      const testUser = createTestUser(true);
      // Make the user inactive so they have no permissions
      (testUser as any)._status = 'INACTIVE';
      mockUserRepository.findById.mockResolvedValue(testUser);

      const filters = {
        page: 1,
        limit: 20,
      };

      // Act
      const result = await (productIpcHandler as any).handleGetProducts(mockEvent, filters);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to view products');
      expect(result.code).toBe('PRODUCT_INSUFFICIENT_PERMISSIONS');
      expect(result.operation).toBe('get-products');

      // Verify repository calls
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_123');
      expect(mockProductRepository.search).not.toHaveBeenCalled();
    });

    it('should successfully filter products by category and status', async () => {
      // Arrange
      const testUser = createTestUser(true);
      const testProducts = [
        createTestProduct({
          sku: 'ELEC-001',
          name: 'Electronics Product',
          category: ProductCategory.ELECTRONICS,
          status: ProductStatus.ACTIVE,
        }),
      ];

      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.search.mockResolvedValue({
        products: testProducts,
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      } as ProductSearchResult);

      const filters = {
        category: 'ELECTRONICS',
        status: 'ACTIVE',
        page: 1,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await (productIpcHandler as any).handleGetProducts(mockEvent, filters);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.products).toHaveLength(1);
      expect(result.data.products[0].category).toBe('ELECTRONICS');
      expect(result.data.products[0].status).toBe('PENDING_APPROVAL');

      // Verify search criteria included filters
      expect(mockProductRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'ELECTRONICS',
          status: 'ACTIVE',
          limit: 20,
          offset: 0,
          sortBy: 'name',
          sortOrder: 'asc',
        })
      );
    });

    it('should handle validation errors for invalid input', async () => {
      // Arrange
      const invalidFilters = {
        page: -1, // Invalid page number
        limit: 1000, // Exceeds maximum limit
        sortBy: 'invalid_field', // Invalid sort field
      };

      // Act
      const result = await (productIpcHandler as any).handleGetProducts(mockEvent, invalidFilters);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
      expect(result.code).toBe('PRODUCT_VALIDATION_ERROR');
      expect(result.operation).toBe('get-products');

      // Verify no repository calls were made
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockProductRepository.search).not.toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const testUser = createTestUser(true);
      const testProducts = [
        createTestProduct({ sku: 'PROD-001', name: 'Product 1' }),
        createTestProduct({ sku: 'PROD-002', name: 'Product 2' }),
      ];

      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.search.mockResolvedValue({
        products: testProducts,
        total: 25, // Total items across all pages
        limit: 10,
        offset: 10,
        hasMore: true,
      } as ProductSearchResult);

      const filters = {
        page: 2,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      // Act
      const result = await (productIpcHandler as any).handleGetProducts(mockEvent, filters);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
      expect(result.data.total).toBe(25);
      expect(result.data.totalPages).toBe(3); // Math.ceil(25/10)
      expect(result.data.hasNextPage).toBe(true);
      expect(result.data.hasPreviousPage).toBe(true);

      // Verify correct offset calculation
      expect(mockProductRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 10, // (page-1) * limit = (2-1) * 10 = 10
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      const testUser = createTestUser(true);
      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.search.mockRejectedValue(new Error('Database connection failed'));

      const filters = {
        page: 1,
        limit: 20,
      };

      // Act
      const result = await (productIpcHandler as any).handleGetProducts(mockEvent, filters);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
      expect(result.code).toBe('PRODUCT_UNKNOWN_ERROR');
      expect(result.operation).toBe('get-products');
    });
  });

  describe('Performance and Timing', () => {
    it('should include timing information in response', async () => {
      // Arrange
      const testUser = createTestUser(true);
      const testProducts = [createTestProduct()];

      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.search.mockResolvedValue({
        products: testProducts,
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      } as ProductSearchResult);

      const filters = {
        page: 1,
        limit: 20,
      };

      // Act
      const result = await (productIpcHandler as any).handleGetProducts(mockEvent, filters);

      // Assert
      expect(result.success).toBe(true);
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
    });
  });
});
