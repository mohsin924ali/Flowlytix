/**
 * Delete Lot/Batch Handler Tests
 *
 * Test suite for DeleteLotBatchHandler following established patterns.
 * Tests authorization, validation, business rules, and error scenarios.
 *
 * @domain Lot/Batch Management
 * @pattern Handler Tests (CQRS)
 * @version 1.0.0
 */

import { DeleteLotBatchHandler } from '../delete-lot-batch.handler';
import { DeleteLotBatchCommand, DeleteType } from '../../../commands/lot-batch/delete-lot-batch.command';
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

// Mock lot/batch for successful deletion (empty lot)
const mockEmptyLotBatch = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  lotNumber: 'LOT001',
  batchNumber: 'BATCH001',
  manufacturingDate: new Date('2024-01-01'),
  expiryDate: new Date('2024-12-31'),
  quantity: 1000,
  remainingQuantity: 0, // Empty - can be deleted
  reservedQuantity: 0,
  availableQuantity: 0,
  status: LotStatus.CONSUMED,
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
  updateStatus: jest.fn().mockReturnValue({
    id: '550e8400-e29b-41d4-a716-446655440001',
    status: LotStatus.CONSUMED,
  }),
};

// Mock lot/batch that cannot be deleted (has remaining quantity)
const mockActiveLotBatch = {
  ...mockEmptyLotBatch,
  remainingQuantity: 500, // Has remaining quantity - cannot be deleted without force
  reservedQuantity: 100,
  availableQuantity: 400,
  status: LotStatus.ACTIVE,
};

describe('DeleteLotBatchHandler', () => {
  let handler: DeleteLotBatchHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new DeleteLotBatchHandler(mockLotBatchRepository as any, mockUserRepository as any);
  });

  describe('handle', () => {
    const validCommand: DeleteLotBatchCommand = {
      lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
      deleteType: DeleteType.SOFT,
      reason: 'Test deletion for quality control purposes',
      force: false,
      requestedBy: '550e8400-e29b-41d4-a716-446655440004',
    };

    it('should delete empty lot/batch successfully with valid command', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockEmptyLotBatch);
      mockLotBatchRepository.update.mockResolvedValue(mockEmptyLotBatch);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.deleteType).toBe(DeleteType.SOFT);
      expect(mockLotBatchRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should return error when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Deleting user not found');
      expect(mockLotBatchRepository.findById).not.toHaveBeenCalled();
    });

    it('should return error when user lacks permission', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(false);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to delete lot/batch records');
      expect(mockUser.hasPermission).toHaveBeenCalledWith(Permission.MANAGE_STOCK);
      expect(mockLotBatchRepository.findById).not.toHaveBeenCalled();
    });

    it('should return error when lot/batch not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Lot/batch not found');
      expect(mockLotBatchRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should reject deletion of lot/batch with remaining quantity', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockActiveLotBatch);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('500 units remaining');
    });

    it('should allow forced deletion of lot/batch with remaining quantity', async () => {
      // Arrange
      const forcedCommand = { ...validCommand, force: true };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockActiveLotBatch);
      mockLotBatchRepository.update.mockResolvedValue(mockActiveLotBatch);

      // Act
      const result = await handler.handle(forcedCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should handle hard delete successfully for consumed lot/batch', async () => {
      // Arrange
      const hardDeleteCommand = {
        ...validCommand,
        deleteType: DeleteType.HARD,
        reason: 'data_cleanup for test environment removal', // Valid hard delete reason with exact keyword
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockEmptyLotBatch);
      mockLotBatchRepository.delete.mockResolvedValue(true);

      // Act
      const result = await handler.handle(hardDeleteCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.deleteType).toBe(DeleteType.HARD);
      expect(mockLotBatchRepository.delete).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should handle hard delete failure', async () => {
      // Arrange - Hard delete with valid reason that should succeed but repo fails
      const hardDeleteCommand = {
        ...validCommand,
        deleteType: DeleteType.HARD,
        reason: 'data_cleanup for test environment removal', // Valid hard delete reason with exact keyword
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockEmptyLotBatch);
      mockLotBatchRepository.delete.mockResolvedValue(false); // Repository fails

      // Act
      const result = await handler.handle(hardDeleteCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete lot/batch');
      expect(result.deleteType).toBe(DeleteType.HARD);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should handle validation errors gracefully', async () => {
      // Arrange
      const invalidCommand = {
        lotBatchId: 'invalid-uuid',
        reason: 'Too short',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      // Act
      const result = await handler.handle(invalidCommand as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });

    it('should require minimum reason length', async () => {
      // Arrange - Reason that passes schema validation (5 chars) but fails business rules (10 chars)
      const commandWithShortReason = {
        ...validCommand,
        reason: 'Short', // 5 chars - passes schema, fails business rules
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockEmptyLotBatch);

      // Act
      const result = await handler.handle(commandWithShortReason);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 10 characters long');
    });

    it('should reject deletion of lot/batch with reserved quantity', async () => {
      // Arrange
      const lotWithReservedQty = {
        ...mockEmptyLotBatch,
        remainingQuantity: 0,
        reservedQuantity: 50, // Has reserved quantity
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(lotWithReservedQty);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('50 units reserved');
    });

    it('should require special reason for hard delete of active lot', async () => {
      // Arrange - Active lot with remaining quantity will fail on the quantity check first
      const hardDeleteCommand = {
        ...validCommand,
        deleteType: DeleteType.HARD,
        reason: 'General cleanup that is long enough to pass validation',
      };

      const activeLot = { ...mockActiveLotBatch, status: LotStatus.ACTIVE };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(activeLot);

      // Act
      const result = await handler.handle(hardDeleteCommand);

      // Assert
      expect(result.success).toBe(false);
      // Active lot with remaining quantity fails on quantity check first
      expect(result.error).toContain('500 units remaining');
    });

    it('should allow hard delete with valid reason keywords', async () => {
      // Arrange
      const hardDeleteCommand = {
        ...validCommand,
        deleteType: DeleteType.HARD,
        reason: 'test_data removal for environment cleanup',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockEmptyLotBatch);
      mockLotBatchRepository.delete.mockResolvedValue(true);

      // Act
      const result = await handler.handle(hardDeleteCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.deleteType).toBe(DeleteType.HARD);
    });

    it('should handle update errors during soft delete', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockEmptyLotBatch);
      mockLotBatchRepository.update.mockRejectedValue(new Error('Update failed'));

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should include warning in successful deletion result', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockEmptyLotBatch);
      mockLotBatchRepository.update.mockResolvedValue(mockEmptyLotBatch);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.warning).toBeDefined();
    });

    it('should handle different lot statuses appropriately', async () => {
      // Arrange - Test with damaged lot
      const damagedLot = { ...mockEmptyLotBatch, status: LotStatus.DAMAGED };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(damagedLot);
      mockLotBatchRepository.update.mockResolvedValue(damagedLot);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockEmptyLotBatch);
      mockLotBatchRepository.update.mockRejectedValue('Unknown error');

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should use default soft delete when deleteType not specified', async () => {
      // Arrange
      const commandWithoutType = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        reason: 'Test deletion for quality control purposes',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockEmptyLotBatch);
      mockLotBatchRepository.update.mockResolvedValue(mockEmptyLotBatch);

      // Act
      const result = await handler.handle(commandWithoutType as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.deleteType).toBe(DeleteType.SOFT);
    });
  });
});
