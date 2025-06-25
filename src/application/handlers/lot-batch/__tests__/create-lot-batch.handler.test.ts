/**
 * Create Lot/Batch Handler Tests
 *
 * Comprehensive test suite for CreateLotBatchHandler following established patterns.
 * Tests authorization, validation, business rules, and error scenarios.
 *
 * @domain Lot/Batch Management
 * @pattern Handler Tests (CQRS)
 * @version 1.0.0
 */

import { CreateLotBatchHandler } from '../create-lot-batch.handler';
import { CreateLotBatchCommand } from '../../../commands/lot-batch/create-lot-batch.command';
import { LotBatch, LotStatus } from '../../../../domain/value-objects/lot-batch';
import { Permission } from '../../../../domain/value-objects/role';
import { ProductStatus } from '../../../../domain/entities/product';

// Mock repositories
const mockLotBatchRepository = {
  save: jest.fn(),
  findByLotNumber: jest.fn(),
  findByLotAndBatchNumber: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
};

const mockUserRepository = {
  findById: jest.fn(),
};

const mockProductRepository = {
  findById: jest.fn(),
};

const mockAgencyRepository = {
  findById: jest.fn(),
};

// Mock user with permissions
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440004',
  hasPermission: jest.fn(),
};

// Mock product
const mockProduct = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  status: ProductStatus.ACTIVE,
};

// Mock agency
const mockAgency = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  isOperational: jest.fn().mockReturnValue(true),
};

describe('CreateLotBatchHandler', () => {
  let handler: CreateLotBatchHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new CreateLotBatchHandler(
      mockLotBatchRepository as any,
      mockUserRepository as any,
      mockProductRepository as any,
      mockAgencyRepository as any
    );
  });

  describe('handle', () => {
    const validCommand: CreateLotBatchCommand = {
      lotNumber: 'LOT001',
      batchNumber: 'BATCH001',
      manufacturingDate: new Date('2024-01-01'),
      expiryDate: new Date('2025-01-01'),
      quantity: 1000,
      productId: '550e8400-e29b-41d4-a716-446655440001',
      agencyId: '550e8400-e29b-41d4-a716-446655440002',
      supplierId: '550e8400-e29b-41d4-a716-446655440003',
      supplierLotCode: 'SUPP001',
      notes: 'Test lot batch',
      requestedBy: '550e8400-e29b-41d4-a716-446655440004',
    };

    it('should create lot/batch successfully with valid command', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);
      mockLotBatchRepository.findByLotNumber.mockResolvedValue(null);
      mockLotBatchRepository.findByLotAndBatchNumber.mockResolvedValue(null);

      const savedLotBatch = {
        id: '550e8400-e29b-41d4-a716-446655440005',
        lotNumber: 'LOT001',
        batchNumber: 'BATCH001',
      };
      mockLotBatchRepository.save.mockResolvedValue(savedLotBatch);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440005');
      expect(result.lotNumber).toBe('LOT001');
      expect(result.batchNumber).toBe('BATCH001');
      expect(mockLotBatchRepository.save).toHaveBeenCalledWith(expect.any(LotBatch));
    });

    it('should return error when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Creating user not found');
      expect(mockLotBatchRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when user lacks permission', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(false);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to create lot/batch records');
      expect(mockUser.hasPermission).toHaveBeenCalledWith(Permission.CREATE_PRODUCT);
      expect(mockLotBatchRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when product not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
      expect(mockLotBatchRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when product is inactive', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      const inactiveProduct = { ...mockProduct, status: ProductStatus.INACTIVE };
      mockProductRepository.findById.mockResolvedValue(inactiveProduct);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot create lot/batch for inactive product');
      expect(mockLotBatchRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when agency not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockAgencyRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Agency not found');
      expect(mockLotBatchRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when agency is not operational', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      const nonOperationalAgency = { ...mockAgency, isOperational: jest.fn().mockReturnValue(false) };
      mockAgencyRepository.findById.mockResolvedValue(nonOperationalAgency);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot create lot/batch for non-operational agency');
      expect(mockLotBatchRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when lot number already exists', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);
      mockLotBatchRepository.findByLotNumber.mockResolvedValue({ id: 'existing-lot' });

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Lot number 'LOT001' already exists for this product");
      expect(mockLotBatchRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when batch number already exists', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);
      mockLotBatchRepository.findByLotNumber.mockResolvedValue(null);
      mockLotBatchRepository.findByLotAndBatchNumber.mockResolvedValue({ id: 'existing-batch' });

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Batch number 'BATCH001' already exists for lot 'LOT001'");
      expect(mockLotBatchRepository.save).not.toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      // Arrange
      const invalidCommand = {
        ...validCommand,
        quantity: -100, // Invalid quantity
      };

      // Act
      const result = await handler.handle(invalidCommand as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
      expect(mockLotBatchRepository.save).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);
      mockLotBatchRepository.findByLotNumber.mockResolvedValue(null);
      mockLotBatchRepository.findByLotAndBatchNumber.mockResolvedValue(null);
      mockLotBatchRepository.save.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should create lot without batch number', async () => {
      // Arrange
      const commandWithoutBatch = {
        ...validCommand,
        batchNumber: undefined,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);
      mockLotBatchRepository.findByLotNumber.mockResolvedValue(null);

      const savedLotBatch = {
        id: '550e8400-e29b-41d4-a716-446655440005',
        lotNumber: 'LOT001',
        batchNumber: null,
      };
      mockLotBatchRepository.save.mockResolvedValue(savedLotBatch);

      // Act
      const result = await handler.handle(commandWithoutBatch);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440005');
      expect(result.batchNumber).toBeUndefined();
      expect(mockLotBatchRepository.findByLotAndBatchNumber).not.toHaveBeenCalled();
    });
  });
});
