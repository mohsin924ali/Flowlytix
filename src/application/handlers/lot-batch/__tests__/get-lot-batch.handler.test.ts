/**
 * Get Lot/Batch Handler Tests
 *
 * Test suite for GetLotBatchHandler following established patterns.
 * Tests authorization, validation, retrieval logic, and error scenarios.
 *
 * @domain Lot/Batch Management
 * @pattern Handler Tests (CQRS)
 * @version 1.0.0
 */

import { GetLotBatchHandler } from '../get-lot-batch.handler';
import { GetLotBatchQuery } from '../../../queries/lot-batch/get-lot-batch.query';
import { Permission } from '../../../../domain/value-objects/role';
import { LotStatus } from '../../../../domain/value-objects/lot-batch';

// Mock repositories following the working pattern
const mockLotBatchRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
  list: jest.fn(),
  findByProductId: jest.fn(),
  selectFifoLots: jest.fn(),
  reserveQuantity: jest.fn(),
  releaseReservation: jest.fn(),
  consumeQuantity: jest.fn(),
  adjustQuantity: jest.fn(),
};

const mockUserRepository = {
  findById: jest.fn(),
};

// Mock user with permissions
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440004',
  hasPermission: jest.fn(),
};

// Mock lot/batch
const mockLotBatch = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  lotNumber: 'LOT001',
  batchNumber: 'BATCH001',
  manufacturingDate: new Date('2024-01-01'),
  expiryDate: new Date('2024-12-31'),
  quantity: 1000,
  remainingQuantity: 800,
  reservedQuantity: 100,
  availableQuantity: 700,
  status: LotStatus.ACTIVE,
  productId: '550e8400-e29b-41d4-a716-446655440002',
  agencyId: '550e8400-e29b-41d4-a716-446655440003',
  supplierId: '550e8400-e29b-41d4-a716-446655440005',
  supplierLotCode: 'SUP001',
  notes: 'Test lot batch',
  createdBy: '550e8400-e29b-41d4-a716-446655440004',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedBy: '550e8400-e29b-41d4-a716-446655440004',
  updatedAt: new Date('2024-01-02T10:00:00Z'),
  // Mock methods
  isExpired: jest.fn().mockReturnValue(false),
  isNearExpiry: jest.fn().mockReturnValue(false),
  getDaysUntilExpiry: jest.fn().mockReturnValue(300),
  isAvailable: jest.fn().mockReturnValue(true),
  isFullyConsumed: jest.fn().mockReturnValue(false),
};

describe('GetLotBatchHandler', () => {
  let handler: GetLotBatchHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new GetLotBatchHandler(mockLotBatchRepository as any, mockUserRepository as any);
  });

  describe('handle', () => {
    const validQuery: GetLotBatchQuery = {
      lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
      requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      includeHistory: false,
      includeRelated: false,
      nearExpiryDays: 30,
    };

    it('should get lot/batch successfully with valid query', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatch).toBeDefined();
      expect(result.lotBatch!.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.lotBatch!.lotNumber).toBe('LOT001');
      expect(result.lotBatch!.batchNumber).toBe('BATCH001');
      expect(mockLotBatchRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should return error when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Requesting user not found');
      expect(result.lotBatch).toBeNull();
      expect(mockLotBatchRepository.findById).not.toHaveBeenCalled();
    });

    it('should return error when user lacks permission', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(false);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to view lot/batch records');
      expect(result.lotBatch).toBeNull();
      expect(mockUser.hasPermission).toHaveBeenCalledWith(Permission.READ_PRODUCT);
      expect(mockLotBatchRepository.findById).not.toHaveBeenCalled();
    });

    it('should return error when lot/batch not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Lot/batch not found');
      expect(result.lotBatch).toBeNull();
      expect(mockLotBatchRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should include calculated fields in response', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatch!.isExpired).toBe(false);
      expect(result.lotBatch!.isNearExpiry).toBe(false);
      expect(result.lotBatch!.daysUntilExpiry).toBe(300);
      expect(result.lotBatch!.isAvailable).toBe(true);
      expect(result.lotBatch!.isFullyConsumed).toBe(false);
      expect(result.lotBatch!.utilizationPercentage).toBe(20); // (1000-800)/1000 * 100
    });

    it('should include display information', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatch!.displayInfo).toBeDefined();
      expect(result.lotBatch!.displayInfo.lotBatchCode).toBe('LOT001-BATCH001');
      expect(result.lotBatch!.displayInfo.quantityDisplay).toBe('800/1000 units');
    });

    it('should include empty history when includeHistory is true', async () => {
      // Arrange
      const queryWithHistory = { ...validQuery, includeHistory: true };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(queryWithHistory);

      // Assert
      expect(result.success).toBe(true);
      expect(result.quantityHistory).toBeDefined();
      expect(result.quantityHistory).toEqual([]);
      expect(result.metadata.includeHistory).toBe(true);
    });

    it('should include empty related lots when includeRelated is true', async () => {
      // Arrange
      const queryWithRelated = { ...validQuery, includeRelated: true };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(queryWithRelated);

      // Assert
      expect(result.success).toBe(true);
      expect(result.relatedLots).toBeDefined();
      expect(result.relatedLots).toEqual([]);
      expect(result.metadata.includeRelated).toBe(true);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(result.lotBatch).toBeNull();
    });

    it('should always include metadata in response', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.metadata).toBeDefined();
      expect(result.metadata.includeHistory).toBe(false);
      expect(result.metadata.includeRelated).toBe(false);
      expect(result.metadata.nearExpiryThreshold).toBe(30);
    });

    it('should handle custom nearExpiryDays threshold', async () => {
      // Arrange
      const queryWithCustomThreshold = { ...validQuery, nearExpiryDays: 60 };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(queryWithCustomThreshold);

      // Assert
      expect(result.success).toBe(true);
      expect(result.metadata.nearExpiryThreshold).toBe(60);
      expect(mockLotBatch.isNearExpiry).toHaveBeenCalledWith(60);
    });

    it('should handle lot/batch without batch number', async () => {
      // Arrange
      const lotWithoutBatch = { ...mockLotBatch, batchNumber: null };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(lotWithoutBatch);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatch!.batchNumber).toBeNull();
      expect(result.lotBatch!.displayInfo.lotBatchCode).toBe('LOT001'); // No batch number suffix
    });

    it('should handle expired lot/batch', async () => {
      // Arrange
      const expiredLot = {
        ...mockLotBatch,
        isExpired: jest.fn().mockReturnValue(true),
        getDaysUntilExpiry: jest.fn().mockReturnValue(-30),
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(expiredLot);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatch!.isExpired).toBe(true);
      expect(result.lotBatch!.daysUntilExpiry).toBe(-30);
    });
  });
});
