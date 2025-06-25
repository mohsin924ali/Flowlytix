/**
 * Product IPC Handler Tests - Step 3d: Delete Product Handler Integration
 *
 * Integration tests for delete product IPC handler.
 * Tests the complete flow from IPC request to business logic execution.
 * Validates all security, validation, and business rule scenarios.
 *
 * @domain Product Management
 * @pattern Integration Testing
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { ProductIpcHandler } from '../product.ipc';
import { IProductRepository } from '../../../domain/repositories/product.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Product, ProductStatus, ProductCategory, UnitOfMeasure } from '../../../domain/entities/product';
import { User, UserStatus } from '../../../domain/entities/user';
import { Role, Permission, SystemRole } from '../../../domain/value-objects/role';
import { Money } from '../../../domain/value-objects/money';

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

describe('ProductIpcHandler - Step 3d: Delete Product Handler Integration', () => {
  let productIpcHandler: ProductIpcHandler;
  let mockEvent: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create handler instance
    productIpcHandler = ProductIpcHandler.create(mockProductRepository, mockUserRepository);

    // Mock IPC event
    mockEvent = {
      sender: { id: 1 },
      frameId: 1,
    };
  });

  describe('Successful Product Deletion', () => {
    it('should successfully delete a product with valid data and permissions', async () => {
      // Arrange
      const deleteRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format
        deletedBy: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID format
        reason: 'Product discontinued by management decision',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.ADMIN, // Admin has DELETE_PRODUCT permission
      });

      const mockProduct = Product.create({
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'Test product description',
        category: ProductCategory.ELECTRONICS,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(10.99, 'USD'),
        sellingPrice: Money.fromDecimal(19.99, 'USD'),
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        reservedStock: 0,
        agencyId: 'agency-789',
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
      });

      // Set the user's agency to match the product
      (mockUser as any)._agencyId = 'agency-789';

      const discontinuedProduct = mockProduct.discontinue('550e8400-e29b-41d4-a716-446655440001');

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue(discontinuedProduct);

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        productId: mockProduct.id,
        message: 'Product deleted successfully',
      });
      expect(result.operation).toBe('delete-product');
      expect(result.duration).toBeGreaterThan(0);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockProductRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockProductRepository.update).toHaveBeenCalled();
    });

    it('should successfully delete a product without optional reason', async () => {
      // Arrange
      const deleteRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        deletedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.ADMIN,
      });

      const mockProduct = Product.create({
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'Test product description',
        category: ProductCategory.ELECTRONICS,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(10.99, 'USD'),
        sellingPrice: Money.fromDecimal(19.99, 'USD'),
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        reservedStock: 0,
        agencyId: 'agency-789',
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
      });

      const discontinuedProduct = mockProduct.discontinue('550e8400-e29b-41d4-a716-446655440001');

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue(discontinuedProduct);

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.productId).toBe(mockProduct.id);
      expect(mockProductRepository.update).toHaveBeenCalled();
    });
  });

  describe('User Not Found', () => {
    it('should return error when deleting user is not found', async () => {
      // Arrange
      const deleteRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        deletedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Deleting user not found');
      expect(result.code).toBe('PRODUCT_USER_NOT_FOUND');
      expect(result.operation).toBe('delete-product');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Insufficient Permissions', () => {
    it('should return error when user lacks DELETE_PRODUCT permission', async () => {
      // Arrange
      const deleteRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        deletedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.VIEWER, // Viewer role doesn't have DELETE_PRODUCT permission
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to delete product');
      expect(result.code).toBe('PRODUCT_INSUFFICIENT_PERMISSIONS');
      expect(result.operation).toBe('delete-product');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Product Not Found', () => {
    it('should return error when product to delete is not found', async () => {
      // Arrange
      const deleteRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        deletedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.ADMIN,
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(null);

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
      expect(result.code).toBe('PRODUCT_NOT_FOUND');
      expect(result.operation).toBe('delete-product');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockProductRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('Product Already Discontinued', () => {
    it('should return error when product is already discontinued', async () => {
      // Arrange
      const deleteRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        deletedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.ADMIN,
      });

      const mockProduct = Product.create({
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'Test product description',
        category: ProductCategory.ELECTRONICS,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(10.99, 'USD'),
        sellingPrice: Money.fromDecimal(19.99, 'USD'),
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        reservedStock: 0,
        agencyId: 'agency-789',
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
      });

      // Discontinue the product first
      const discontinuedProduct = mockProduct.discontinue('550e8400-e29b-41d4-a716-446655440001');

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(discontinuedProduct);

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product is already discontinued');
      expect(result.code).toBe('PRODUCT_ALREADY_DISCONTINUED');
      expect(result.operation).toBe('delete-product');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockProductRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('Validation Errors', () => {
    it('should reject request with invalid product ID format', async () => {
      // Arrange
      const deleteRequest = {
        id: 'invalid-uuid',
        deletedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
      expect(result.code).toBe('PRODUCT_VALIDATION_ERROR');
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });

    it('should reject request with invalid deletedBy format', async () => {
      // Arrange
      const deleteRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        deletedBy: 'invalid-uuid',
      };

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
      expect(result.code).toBe('PRODUCT_VALIDATION_ERROR');
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });

    it('should reject request with missing required fields', async () => {
      // Arrange
      const deleteRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        // Missing deletedBy
      };

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
      expect(result.code).toBe('PRODUCT_VALIDATION_ERROR');
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });

    it('should reject request with reason exceeding maximum length', async () => {
      // Arrange
      const deleteRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        deletedBy: '550e8400-e29b-41d4-a716-446655440001',
        reason: 'a'.repeat(501), // Exceeds 500 character limit
      };

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
      expect(result.code).toBe('PRODUCT_VALIDATION_ERROR');
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Repository Error Handling', () => {
    it('should handle repository error gracefully', async () => {
      // Arrange
      const deleteRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        deletedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.ADMIN,
      });

      const mockProduct = Product.create({
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'Test product description',
        category: ProductCategory.ELECTRONICS,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(10.99, 'USD'),
        sellingPrice: Money.fromDecimal(19.99, 'USD'),
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        reservedStock: 0,
        agencyId: 'agency-789',
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
      expect(result.code).toBe('PRODUCT_UNKNOWN_ERROR');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Performance and Timing', () => {
    it('should have reliable timing calculation', async () => {
      // Arrange
      const deleteRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        deletedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.ADMIN,
      });

      const mockProduct = Product.create({
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'Test product description',
        category: ProductCategory.ELECTRONICS,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(10.99, 'USD'),
        sellingPrice: Money.fromDecimal(19.99, 'USD'),
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        reservedStock: 0,
        agencyId: 'agency-789',
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
      });

      const discontinuedProduct = mockProduct.discontinue('550e8400-e29b-41d4-a716-446655440001');

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue(discontinuedProduct);

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
      expect(typeof result.duration).toBe('number');
    });

    it('should ensure minimum duration even for fast operations', async () => {
      // Arrange
      const deleteRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        deletedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.ADMIN,
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(null); // Will fail fast

      // Act
      const result = await (productIpcHandler as any).handleDeleteProduct(mockEvent, deleteRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.duration).toBeGreaterThanOrEqual(1); // Minimum 1ms
    });
  });
});
