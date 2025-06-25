/**
 * Update Lot/Batch Handler Tests
 *
 * Test suite for UpdateLotBatchHandler following established patterns.
 * Tests authorization, validation, business rules, and error scenarios.
 *
 * @domain Lot/Batch Management
 * @pattern Handler Tests (CQRS)
 * @version 1.0.0
 */

import { UpdateLotBatchHandler } from '../update-lot-batch.handler';
import { UpdateLotBatchCommand } from '../../../commands/lot-batch/update-lot-batch.command';
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
  updateStatus: jest.fn().mockReturnValue({
    id: '550e8400-e29b-41d4-a716-446655440001',
    status: LotStatus.QUARANTINE,
  }),
  activate: jest.fn(),
  reserve: jest.fn(),
  quarantine: jest.fn(),
  markAsDamaged: jest.fn(),
  markAsConsumed: jest.fn(),
  markAsExpired: jest.fn(),
};

describe('UpdateLotBatchHandler', () => {
  let handler: UpdateLotBatchHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new UpdateLotBatchHandler(mockLotBatchRepository as any, mockUserRepository as any);
  });

  describe('handle', () => {
    const validCommand: UpdateLotBatchCommand = {
      lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
      status: LotStatus.QUARANTINE,
      reason: 'Quality control quarantine for testing',
      requestedBy: '550e8400-e29b-41d4-a716-446655440004',
    };

    it('should update lot/batch successfully with valid command', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);

      const updatedLotBatch = { ...mockLotBatch, status: LotStatus.QUARANTINE };
      mockLotBatchRepository.update.mockResolvedValue(updatedLotBatch);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.updatedFields).toContain('status');
      expect(mockLotBatchRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockLotBatchRepository.update).toHaveBeenCalled();
    });

    it('should return error when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Updating user not found');
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
      expect(result.error).toBe('Insufficient permissions to update lot/batch records');
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
      expect(mockLotBatchRepository.update).not.toHaveBeenCalled();
    });

    it('should handle expiry date updates', async () => {
      // Arrange
      const commandWithExpiryDate = {
        ...validCommand,
        expiryDate: new Date('2025-12-31'),
        status: undefined,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);
      mockLotBatchRepository.update.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(commandWithExpiryDate);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should handle notes updates', async () => {
      // Arrange
      const commandWithNotes = {
        ...validCommand,
        notes: 'Updated notes for lot batch',
        status: undefined,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);
      mockLotBatchRepository.update.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(commandWithNotes);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should handle supplier updates', async () => {
      // Arrange
      const commandWithSupplier = {
        ...validCommand,
        supplierId: '550e8400-e29b-41d4-a716-446655440006',
        supplierLotCode: 'NEW_SUP_CODE',
        status: undefined,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);
      mockLotBatchRepository.update.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(commandWithSupplier);

      // Assert
      expect(result.success).toBe(true);
      expect(result.lotBatchId).toBe('550e8400-e29b-41d4-a716-446655440001');
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

    it('should handle business rule violations', async () => {
      // Arrange
      const commandWithPastExpiryDate = {
        ...validCommand,
        expiryDate: new Date('2020-01-01'), // Past date
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(commandWithPastExpiryDate);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot set expiry date in the past');
    });

    it('should require at least one field for update', async () => {
      // Arrange
      const commandWithNoUpdates = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440001',
        reason: 'Valid reason but no updates',
        requestedBy: '550e8400-e29b-41d4-a716-446655440004',
      };

      // Act
      const result = await handler.handle(commandWithNoUpdates as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });

    it('should validate reason length', async () => {
      // Arrange
      const commandWithShortReason = {
        ...validCommand,
        reason: 'Too',
      };

      // Act
      const result = await handler.handle(commandWithShortReason);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Update reason must be at least 5 characters long');
    });

    it('should handle multiple field updates', async () => {
      // Arrange
      const commandWithMultipleUpdates = {
        ...validCommand,
        status: LotStatus.QUARANTINE,
        notes: 'Updated notes',
        supplierLotCode: 'NEW_CODE',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);
      mockLotBatchRepository.update.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(commandWithMultipleUpdates);

      // Assert
      expect(result.success).toBe(true);
      expect(result.updatedFields).toContain('status');
      expect(result.updatedFields).toContain('notes');
      expect(result.updatedFields).toContain('supplierLotCode');
    });

    it('should handle update repository errors', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);
      mockLotBatchRepository.update.mockRejectedValue(new Error('Update failed'));

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should validate status transition rules', async () => {
      // Arrange
      const expiredLotBatch = { ...mockLotBatch, status: LotStatus.EXPIRED };
      const commandToActivateExpired = {
        ...validCommand,
        status: LotStatus.ACTIVE,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(expiredLotBatch);

      // Act
      const result = await handler.handle(commandToActivateExpired);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });

    it('should handle empty string values properly', async () => {
      // Arrange
      const commandWithEmptyStrings = {
        ...validCommand,
        notes: '   ', // Only whitespace
        supplierLotCode: '',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);

      // Act
      const result = await handler.handle(commandWithEmptyStrings);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUser.hasPermission.mockReturnValue(true);
      mockLotBatchRepository.findById.mockResolvedValue(mockLotBatch);
      mockLotBatchRepository.update.mockRejectedValue('Unknown error');

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });
});
