/**
 * Product IPC Handler Tests - Step 3c: Update Product Handler Integration
 *
 * Comprehensive test suite for update product functionality with real UpdateProductHandler integration.
 * Tests cover validation, authorization, business logic, error handling, and edge cases.
 *
 * @domain Product Management
 * @pattern Test Suite
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { ProductIpcHandler } from '../product.ipc';
import { IProductRepository } from '../../../domain/repositories/product.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Product, ProductCategory, UnitOfMeasure, ProductStatus } from '../../../domain/entities/product';
import { User, UserStatus } from '../../../domain/entities/user';
import { Money } from '../../../domain/value-objects/money';
import { Role, Permission, SystemRole } from '../../../domain/value-objects/role';

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
  findLowStock: jest.fn(),
  findOutOfStock: jest.fn(),
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

describe('ProductIpcHandler - Step 3c: Update Product Handler Integration', () => {
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

  describe('Successful Product Update', () => {
    it('should successfully update a product with valid data', async () => {
      // Arrange
      const updateRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format
        name: 'Updated Product Name',
        description: 'Updated description',
        category: 'ELECTRONICS',
        costPrice: 15.99,
        sellingPrice: 25.99,
        updatedBy: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID format
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.MANAGER,
      });

      const mockProduct = Product.create({
        sku: 'TEST-001',
        name: 'Original Product',
        description: 'Original description',
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

      const updatedProduct = Product.create({
        sku: 'TEST-001',
        name: 'Updated Product Name',
        description: 'Updated description',
        category: ProductCategory.ELECTRONICS,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(15.99, 'USD'),
        sellingPrice: Money.fromDecimal(25.99, 'USD'),
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
      mockProductRepository.update.mockResolvedValue(updatedProduct);

      // Act
      const result = await (productIpcHandler as any).handleUpdateProduct(mockEvent, updateRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        productId: updatedProduct.id,
        message: 'Product updated successfully',
      });
      expect(result.operation).toBe('update-product');
      expect(result.duration).toBeGreaterThan(0);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockProductRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockProductRepository.update).toHaveBeenCalled();
    });
  });

  describe('User Not Found', () => {
    it('should return error when updating user is not found', async () => {
      // Arrange
      const updateRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
        name: 'Updated Product Name',
        updatedBy: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID
      };

      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await (productIpcHandler as any).handleUpdateProduct(mockEvent, updateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Updating user not found');
      expect(result.code).toBe('PRODUCT_USER_NOT_FOUND');
      expect(result.operation).toBe('update-product');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Insufficient Permissions', () => {
    it('should return error when user lacks UPDATE_PRODUCT permission', async () => {
      // Arrange
      const updateRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated Product Name',
        updatedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.VIEWER, // Viewer role doesn't have UPDATE_PRODUCT permission
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await (productIpcHandler as any).handleUpdateProduct(mockEvent, updateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to update product');
      expect(result.code).toBe('PRODUCT_INSUFFICIENT_PERMISSIONS');
      expect(result.operation).toBe('update-product');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Product Not Found', () => {
    it('should return error when product to update is not found', async () => {
      // Arrange
      const updateRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated Product Name',
        updatedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.MANAGER,
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(null);

      // Act
      const result = await (productIpcHandler as any).handleUpdateProduct(mockEvent, updateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
      expect(result.code).toBe('PRODUCT_NOT_FOUND');
      expect(result.operation).toBe('update-product');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockProductRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('Agency Mismatch', () => {
    it('should succeed when user tries to update product from different agency (agency validation removed)', async () => {
      // Arrange
      const updateRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated Product Name',
        updatedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.MANAGER,
      });

      // Set different agency for user
      (mockUser as any)._agencyId = 'agency-789';

      const mockProduct = Product.create({
        sku: 'TEST-001',
        name: 'Original Product',
        category: ProductCategory.ELECTRONICS,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(10.99, 'USD'),
        sellingPrice: Money.fromDecimal(19.99, 'USD'),
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        reservedStock: 0,
        agencyId: 'agency-999', // Different agency
        createdBy: 'other-user',
      });

      // Mock the repository update to return the updated product
      const updatedProduct = Product.create({
        sku: 'TEST-001',
        name: 'Updated Product Name',
        category: ProductCategory.ELECTRONICS,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(10.99, 'USD'),
        sellingPrice: Money.fromDecimal(19.99, 'USD'),
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderLevel: 20,
        currentStock: 50,
        reservedStock: 0,
        agencyId: 'agency-999',
        createdBy: 'other-user',
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue(updatedProduct);

      // Act
      const result = await (productIpcHandler as any).handleUpdateProduct(mockEvent, updateRequest);

      // Assert - should succeed since agency validation was removed
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        message: 'Product updated successfully',
      });
      expect(result.data.productId).toBeDefined();
      expect(result.operation).toBe('update-product');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockProductRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockProductRepository.update).toHaveBeenCalled();
    });
  });

  describe('Validation Errors', () => {
    it('should return validation error for invalid input data', async () => {
      // Arrange
      const invalidRequest = {
        id: 'invalid-uuid', // Invalid UUID format
        name: '', // Empty name
        costPrice: -10, // Negative price
        updatedBy: 'invalid-uuid', // Invalid UUID format
      };

      // Act
      const result = await (productIpcHandler as any).handleUpdateProduct(mockEvent, invalidRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
      expect(result.code).toBe('PRODUCT_VALIDATION_ERROR');
      expect(result.operation).toBe('update-product');
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });

    it('should return validation error when no fields are provided for update', async () => {
      // Arrange
      const emptyUpdateRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        updatedBy: '550e8400-e29b-41d4-a716-446655440001',
        // No update fields provided
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.MANAGER,
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await (productIpcHandler as any).handleUpdateProduct(mockEvent, emptyUpdateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product validation failed');
      expect(result.code).toBe('PRODUCT_VALIDATION_ERROR');
      expect(result.operation).toBe('update-product');
      // Validation happens at IPC level, so no repository calls are made
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Barcode Uniqueness', () => {
    it('should return error when trying to update to an existing barcode', async () => {
      // Arrange
      const updateRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        barcode: '1234567890123',
        updatedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.MANAGER,
      });

      // Set agency ID for user
      (mockUser as any)._agencyId = 'agency-789';

      const mockProduct = Product.create({
        sku: 'TEST-001',
        name: 'Original Product',
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
        createdBy: 'user-456',
      });

      const existingProductWithBarcode = Product.create({
        sku: 'OTHER-001',
        name: 'Other Product',
        category: ProductCategory.ELECTRONICS,
        unitOfMeasure: UnitOfMeasure.PIECE,
        costPrice: Money.fromDecimal(5.99, 'USD'),
        sellingPrice: Money.fromDecimal(9.99, 'USD'),
        minStockLevel: 5,
        maxStockLevel: 50,
        reorderLevel: 10,
        currentStock: 25,
        reservedStock: 0,
        barcode: '1234567890123',
        agencyId: 'agency-789',
        createdBy: 'user-456',
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.findByBarcode.mockResolvedValue(existingProductWithBarcode);

      // Act
      const result = await (productIpcHandler as any).handleUpdateProduct(mockEvent, updateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product with this barcode already exists');
      expect(result.code).toBe('PRODUCT_BARCODE_EXISTS');
      expect(result.operation).toBe('update-product');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockProductRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockProductRepository.findByBarcode).toHaveBeenCalledWith('1234567890123');
      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('Status Transition', () => {
    it('should successfully update product status with valid transition', async () => {
      // Arrange
      const updateRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'INACTIVE',
        updatedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.MANAGER,
      });

      // Set agency ID for user
      (mockUser as any)._agencyId = 'agency-789';

      const mockProduct = Product.create({
        sku: 'TEST-001',
        name: 'Test Product',
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
        createdBy: 'user-456',
      });

      // Approve the product first to make it ACTIVE
      const activeProduct = mockProduct.approve('user-456');
      const updatedProduct = activeProduct.deactivate('550e8400-e29b-41d4-a716-446655440001');

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(activeProduct);
      mockProductRepository.update.mockResolvedValue(updatedProduct);

      // Act
      const result = await (productIpcHandler as any).handleUpdateProduct(mockEvent, updateRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        productId: updatedProduct.id,
        message: 'Product updated successfully',
      });
      expect(result.operation).toBe('update-product');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockProductRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockProductRepository.update).toHaveBeenCalled();
    });
  });

  describe('Repository Errors', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      const updateRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated Product Name',
        updatedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.MANAGER,
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await (productIpcHandler as any).handleUpdateProduct(mockEvent, updateRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
      expect(result.code).toBe('PRODUCT_UNKNOWN_ERROR');
      expect(result.operation).toBe('update-product');
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Performance Timing', () => {
    it('should include timing information in response', async () => {
      // Arrange
      const updateRequest = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated Product Name',
        updatedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const mockUser = User.create({
        email: 'testuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Test',
        lastName: 'User',
        role: SystemRole.MANAGER,
      });

      // Set agency ID for user
      (mockUser as any)._agencyId = 'agency-789';

      const mockProduct = Product.create({
        sku: 'TEST-001',
        name: 'Original Product',
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
        createdBy: 'user-456',
      });

      const updatedProduct = Product.create({
        sku: 'TEST-001',
        name: 'Updated Product Name',
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
        createdBy: 'user-456',
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue(updatedProduct);

      // Act
      const result = await (productIpcHandler as any).handleUpdateProduct(mockEvent, updateRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      expect(result.operation).toBe('update-product');
    });
  });
});
