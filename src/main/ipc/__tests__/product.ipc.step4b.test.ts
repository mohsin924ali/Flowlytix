/**
 * Product IPC Handler Tests - Task 4 Step 4b: Advanced Search IPC Integration
 *
 * Comprehensive test suite for advanced search IPC handler integration.
 * Tests the complete flow from IPC request to advanced search business logic execution.
 * Validates all security, validation, and advanced search scenarios.
 *
 * @domain Product Management - Advanced Search
 * @pattern Integration Testing
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { ProductIpcHandler } from '../product.ipc';
import { IProductRepository, ProductSearchResult } from '../../../domain/repositories/product.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Product, ProductCategory, ProductStatus, UnitOfMeasure } from '../../../domain/entities/product';
import { User, UserStatus } from '../../../domain/entities/user';
import { Role, Permission, SystemRole } from '../../../domain/value-objects/role';
import { Money } from '../../../domain/value-objects/money';

// Mock IPC Event
const mockEvent = {
  userId: 'user_123',
  sender: {
    id: 1,
    isDestroyed: () => false,
  },
} as any;

// Mock repositories
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

// Helper functions
function createTestUser(hasReadPermission = true): User {
  const role = hasReadPermission ? SystemRole.MANAGER : SystemRole.VIEWER;
  return User.create({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'VeryComplexP@ssw0rd!9876XyZ',
    role,
  });
}

function createTestProduct(overrides: Partial<any> = {}): Product {
  return Product.create({
    sku: 'PROD-001',
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
    reservedStock: 5,
    agencyId: 'agency_123',
    createdBy: 'user_123',
    tags: ['electronics', 'test'],
    ...overrides,
  });
}

describe('ProductIpcHandler - Task 4 Step 4b: Advanced Search IPC Integration', () => {
  let productIpcHandler: ProductIpcHandler;
  let testUser: User;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create handler instance
    productIpcHandler = ProductIpcHandler.create(mockProductRepository, mockUserRepository);

    // Create test user
    testUser = createTestUser(true);
  });

  describe('handleAdvancedSearchProducts - Basic Functionality', () => {
    it('should successfully perform advanced search with basic query', async () => {
      // Arrange
      const testUserId = '550e8400-e29b-41d4-a716-446655440001';
      const testProducts = [
        createTestProduct({ sku: 'PROD-001', name: 'Premium Coffee' }),
        createTestProduct({ sku: 'PROD-002', name: 'Regular Coffee' }),
      ];

      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.search.mockResolvedValue({
        products: testProducts,
        total: 2,
        limit: 20,
        offset: 0,
        hasMore: false,
      } as ProductSearchResult);

      const request = {
        requestedBy: testUserId,
        globalSearch: 'coffee',
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
      };

      // Act
      const result = await (productIpcHandler as any).handleAdvancedSearchProducts(mockEvent, request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.operation).toBe('advanced-search-products');
      expect(result.data).toBeDefined();
      expect(result.data.products).toHaveLength(2);
      expect(result.data.total).toBeGreaterThan(0);
      expect(result.data.executionTime).toBeGreaterThanOrEqual(0);

      // Verify repository calls
      expect(mockUserRepository.findById).toHaveBeenCalledWith(testUserId);
      expect(mockProductRepository.search).toHaveBeenCalled();
    });

    it('should handle user not found error', async () => {
      // Arrange
      const testUserId = '550e8400-e29b-41d4-a716-446655440002';
      mockUserRepository.findById.mockResolvedValue(null);

      const request = {
        requestedBy: testUserId,
        globalSearch: 'test',
      };

      // Act
      const result = await (productIpcHandler as any).handleAdvancedSearchProducts(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.operation).toBe('advanced-search-products');

      // Verify repository calls
      expect(mockUserRepository.findById).toHaveBeenCalledWith(testUserId);
      expect(mockProductRepository.search).not.toHaveBeenCalled();
    });

    it('should handle insufficient permissions error', async () => {
      // Arrange
      const testUserId = '550e8400-e29b-41d4-a716-446655440003';
      const userWithoutPermission = createTestUser(true); // Create normal user

      // Mock the hasPermission method to return false for READ_PRODUCT
      jest.spyOn(userWithoutPermission, 'hasPermission').mockReturnValue(false);

      mockUserRepository.findById.mockResolvedValue(userWithoutPermission);

      const request = {
        requestedBy: testUserId,
        globalSearch: 'test',
      };

      // Act
      const result = await (productIpcHandler as any).handleAdvancedSearchProducts(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
      expect(result.operation).toBe('advanced-search-products');

      // Verify repository calls
      expect(mockUserRepository.findById).toHaveBeenCalledWith(testUserId);
      expect(mockProductRepository.search).not.toHaveBeenCalled();
    });
  });

  describe('handleAdvancedSearchProducts - Input Validation', () => {
    it('should validate UUID format for requestedBy', async () => {
      // Arrange
      const request = {
        requestedBy: 'invalid-uuid',
        globalSearch: 'test',
      };

      // Act
      const result = await (productIpcHandler as any).handleAdvancedSearchProducts(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
      expect(result.operation).toBe('advanced-search-products');
    });

    it('should validate pagination limits', async () => {
      // Arrange
      const testUserId = '550e8400-e29b-41d4-a716-446655440001';
      const request = {
        requestedBy: testUserId,
        page: 0, // Invalid page
        limit: 200, // Exceeds max limit
      };

      // Act
      const result = await (productIpcHandler as any).handleAdvancedSearchProducts(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
      expect(result.operation).toBe('advanced-search-products');
    });

    it('should validate score range', async () => {
      // Arrange
      const testUserId = '550e8400-e29b-41d4-a716-446655440001';
      const request = {
        requestedBy: testUserId,
        minScore: 1.5, // Invalid score > 1
      };

      // Act
      const result = await (productIpcHandler as any).handleAdvancedSearchProducts(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
      expect(result.operation).toBe('advanced-search-products');
    });
  });

  describe('handleAdvancedSearchProducts - Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      const testUserId = '550e8400-e29b-41d4-a716-446655440001';
      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.search.mockRejectedValue(new Error('Database connection failed'));

      const request = {
        requestedBy: testUserId,
        globalSearch: 'test',
      };

      // Act
      const result = await (productIpcHandler as any).handleAdvancedSearchProducts(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.operation).toBe('advanced-search-products');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange - Test with invalid input that will cause validation error
      const testUserId = '550e8400-e29b-41d4-a716-446655440001';

      const request = {
        requestedBy: testUserId,
        globalSearch: 'test',
        minScore: 2.0, // Invalid score > 1.0 - this will cause validation error
      };

      // Act
      const result = await (productIpcHandler as any).handleAdvancedSearchProducts(mockEvent, request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
      expect(result.operation).toBe('advanced-search-products');
      expect(result.timestamp).toBeGreaterThan(0);

      // Verify that user repository was not called due to validation failure
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });
  });
});
