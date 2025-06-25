/**
 * Product IPC Handler - Step 3a Tests: Create Product Handler Integration
 *
 * Tests for ProductIpcHandler with real CreateProductHandler integration.
 * Focuses on product creation, validation, authorization, and error handling.
 *
 * @domain Product Management
 * @pattern Test-Driven Development
 * @architecture Hexagonal Architecture Testing
 * @version 1.0.0
 */

import { ProductIpcHandler, createProductIpcHandler } from '../product.ipc';
import { IProductRepository } from '../../../domain/repositories/product.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { User, UserStatus } from '../../../domain/entities/user';
import { Product } from '../../../domain/entities/product';
import { Permission } from '../../../domain/value-objects/role';

// Mock electron module
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn(),
  },
}));

// Mock repositories
const mockProductRepository: jest.Mocked<IProductRepository> = {
  save: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  findBySku: jest.fn(),
  findByBarcode: jest.fn(),
  findByAgency: jest.fn(),
  findByCategory: jest.fn(),
  findByStatus: jest.fn(),
  findBySupplier: jest.fn(),
  findOutOfStock: jest.fn(),
  findLowStock: jest.fn(),
  findNeedingReorder: jest.fn(),
  search: jest.fn(),
  count: jest.fn(),
  countByCriteria: jest.fn(),
  delete: jest.fn(),
  existsBySku: jest.fn(),
  existsByBarcode: jest.fn(),
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

const validCreateProductRequest = {
  sku: 'TEST-PROD-001',
  name: 'Test Product',
  description: 'A test product',
  category: 'ELECTRONICS',
  unitOfMeasure: 'PIECE',
  costPrice: 10.5,
  costPriceCurrency: 'USD',
  sellingPrice: 15.75,
  sellingPriceCurrency: 'USD',
  minStockLevel: 10,
  maxStockLevel: 100,
  reorderLevel: 20,
  currentStock: 50,
  agencyId: '550e8400-e29b-41d4-a716-446655440001',
  createdBy: '550e8400-e29b-41d4-a716-446655440002',
};

describe('ProductIpcHandler - Step 3a: Create Product Handler Integration', () => {
  let handler: ProductIpcHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = createProductIpcHandler(mockProductRepository, mockUserRepository);
  });

  describe('Create Product Handler - Real Implementation', () => {
    it('should create product successfully with valid request', async () => {
      // Arrange
      const testUser = User.create(
        {
          email: 'test@example.com',
          password: 'Xp9#mK2$vL8!qR4@',
          firstName: 'Test',
          lastName: 'User',
          role: 'admin',
          status: UserStatus.ACTIVE,
        },
        { id: 'admin-id', hasPermission: () => true, role: { canManage: () => true } } as any
      );

      const mockProduct = {
        id: 'product-123',
        sku: validCreateProductRequest.sku,
        approve: jest.fn().mockReturnValue({ id: 'product-123' }),
      };

      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.findBySku.mockResolvedValue(null);
      mockProductRepository.save.mockResolvedValue(mockProduct as any);
      jest.spyOn(Product, 'create').mockReturnValue(mockProduct as any);

      // Act
      const result = await (handler as any).handleCreateProduct({}, validCreateProductRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.productId).toBe('product-123');
      expect(result.data.message).toBe('Product created successfully');
      expect(result.operation).toBe('create-product');
    });

    it('should handle user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await (handler as any).handleCreateProduct({}, validCreateProductRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.code).toBe('PRODUCT_USER_NOT_FOUND');
    });

    it('should handle insufficient permissions', async () => {
      // Arrange
      const testUser = User.create(
        {
          email: 'test@example.com',
          password: 'Xp9#mK2$vL8!qR4@',
          firstName: 'Test',
          lastName: 'User',
          role: 'viewer', // No CREATE_PRODUCT permission
          status: UserStatus.ACTIVE,
        },
        { id: 'admin-id', hasPermission: () => true, role: { canManage: () => true } } as any
      );

      mockUserRepository.findById.mockResolvedValue(testUser);

      // Act
      const result = await (handler as any).handleCreateProduct({}, validCreateProductRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to create product');
      expect(result.code).toBe('PRODUCT_INSUFFICIENT_PERMISSIONS');
    });

    it('should handle product already exists', async () => {
      // Arrange
      const testUser = User.create(
        {
          email: 'test@example.com',
          password: 'Xp9#mK2$vL8!qR4@',
          firstName: 'Test',
          lastName: 'User',
          role: 'admin',
          status: UserStatus.ACTIVE,
        },
        { id: 'admin-id', hasPermission: () => true, role: { canManage: () => true } } as any
      );

      mockUserRepository.findById.mockResolvedValue(testUser);
      mockProductRepository.findBySku.mockResolvedValue({ id: 'existing' } as any);

      // Act
      const result = await (handler as any).handleCreateProduct({}, validCreateProductRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product with this SKU already exists');
      expect(result.code).toBe('PRODUCT_ALREADY_EXISTS');
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidRequest = { sku: '', name: '' }; // Invalid data

      // Act
      const result = await (handler as any).handleCreateProduct({}, invalidRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
      expect(result.code).toBe('PRODUCT_VALIDATION_ERROR');
    });
  });
});
