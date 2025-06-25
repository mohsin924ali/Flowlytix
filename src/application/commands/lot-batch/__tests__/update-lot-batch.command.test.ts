/**
 * Update Lot/Batch Command Tests
 *
 * Comprehensive unit tests for update lot/batch command validation,
 * business rules, and status transitions.
 *
 * @domain Lot/Batch Management
 * @pattern Command Testing
 * @version 1.0.0
 */

import {
  UpdateLotBatchCommand,
  UpdateLotBatchCommandValidationError,
  validateUpdateLotBatchCommand,
  validateLotBatchUpdateBusinessRules,
  prepareLotBatchUpdateData,
} from '../update-lot-batch.command';
import { LotStatus } from '../../../../domain/value-objects/lot-batch';

describe('UpdateLotBatch Command', () => {
  // Test data
  const validCommand: UpdateLotBatchCommand = {
    lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
    expiryDate: new Date('2025-12-31'),
    status: LotStatus.ACTIVE,
    supplierId: '550e8400-e29b-41d4-a716-446655440001',
    supplierLotCode: 'UPDATED001',
    notes: 'Updated notes',
    reason: 'Testing update functionality',
    requestedBy: '550e8400-e29b-41d4-a716-446655440002',
  };

  const mockCurrentLot = {
    manufacturingDate: new Date('2024-01-01'),
    expiryDate: new Date('2025-01-01'),
    status: LotStatus.ACTIVE,
    remainingQuantity: 50,
    reservedQuantity: 10,
  };

  describe('Schema Validation', () => {
    it('should validate a valid command', () => {
      expect(() => validateUpdateLotBatchCommand(validCommand)).not.toThrow();
    });

    it('should require valid UUID for lot batch ID', () => {
      const invalidCommand = { ...validCommand, lotBatchId: 'invalid-uuid' };
      expect(() => validateUpdateLotBatchCommand(invalidCommand)).toThrow(UpdateLotBatchCommandValidationError);
    });

    it('should validate expiry date type', () => {
      const invalidCommand = { ...validCommand, expiryDate: 'invalid-date' as any };
      expect(() => validateUpdateLotBatchCommand(invalidCommand)).toThrow(UpdateLotBatchCommandValidationError);
    });

    it('should validate status enum', () => {
      const invalidCommand = { ...validCommand, status: 'INVALID_STATUS' as any };
      expect(() => validateUpdateLotBatchCommand(invalidCommand)).toThrow(UpdateLotBatchCommandValidationError);
    });

    it('should validate supplier ID format when provided', () => {
      const invalidCommand = { ...validCommand, supplierId: 'invalid-uuid' };
      expect(() => validateUpdateLotBatchCommand(invalidCommand)).toThrow(UpdateLotBatchCommandValidationError);
    });

    it('should validate supplier lot code length', () => {
      const invalidCommand = { ...validCommand, supplierLotCode: 'A'.repeat(101) };
      expect(() => validateUpdateLotBatchCommand(invalidCommand)).toThrow(UpdateLotBatchCommandValidationError);
    });

    it('should validate notes length', () => {
      const invalidCommand = { ...validCommand, notes: 'A'.repeat(1001) };
      expect(() => validateUpdateLotBatchCommand(invalidCommand)).toThrow(UpdateLotBatchCommandValidationError);
    });

    it('should require reason', () => {
      const invalidCommand = { ...validCommand, reason: '' };
      expect(() => validateUpdateLotBatchCommand(invalidCommand)).toThrow(UpdateLotBatchCommandValidationError);
    });

    it('should validate reason length', () => {
      const invalidCommand = { ...validCommand, reason: 'A'.repeat(501) };
      expect(() => validateUpdateLotBatchCommand(invalidCommand)).toThrow(UpdateLotBatchCommandValidationError);
    });

    it('should require at least one field to update', () => {
      const invalidCommand = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'Update reason',
        requestedBy: '550e8400-e29b-41d4-a716-446655440002',
      };

      expect(() => validateUpdateLotBatchCommand(invalidCommand)).toThrow(UpdateLotBatchCommandValidationError);
    });

    it('should accept command with only one field to update', () => {
      const validCommands = [
        {
          lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
          expiryDate: new Date('2025-12-31'),
          reason: 'Update expiry',
          requestedBy: '550e8400-e29b-41d4-a716-446655440002',
        },
        {
          lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
          status: LotStatus.QUARANTINE,
          reason: 'Quality check',
          requestedBy: '550e8400-e29b-41d4-a716-446655440002',
        },
        {
          lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
          notes: 'Updated notes',
          reason: 'Add notes',
          requestedBy: '550e8400-e29b-41d4-a716-446655440002',
        },
      ];

      validCommands.forEach((cmd) => {
        expect(() => validateUpdateLotBatchCommand(cmd)).not.toThrow();
      });
    });
  });

  describe('Business Rules Validation', () => {
    it('should reject expiry date in the past', () => {
      const command = { ...validCommand, expiryDate: new Date('2020-01-01') };
      expect(() => validateLotBatchUpdateBusinessRules(command, mockCurrentLot)).toThrow(
        'Cannot set expiry date in the past'
      );
    });

    it('should reject expiry date before manufacturing date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days in future
      const beforeManufacturingDate = new Date(mockCurrentLot.manufacturingDate);
      beforeManufacturingDate.setDate(beforeManufacturingDate.getDate() - 1); // Before manufacturing

      const command = { ...validCommand, expiryDate: beforeManufacturingDate };
      expect(() => validateLotBatchUpdateBusinessRules(command, mockCurrentLot)).toThrow(
        'Cannot set expiry date in the past'
      );
    });

    it('should reject shortening expiry date by more than 30 days', () => {
      const futureCurrentDate = new Date();
      futureCurrentDate.setFullYear(futureCurrentDate.getFullYear() + 1); // 1 year in future

      const shortenedDate = new Date(futureCurrentDate);
      shortenedDate.setDate(shortenedDate.getDate() - 31); // 31 days earlier

      const command = { ...validCommand, expiryDate: shortenedDate };
      const lotWithExpiry = { ...mockCurrentLot, expiryDate: futureCurrentDate };

      expect(() => validateLotBatchUpdateBusinessRules(command, lotWithExpiry)).toThrow(
        'Cannot shorten expiry date by more than 30 days'
      );
    });

    it('should allow shortening expiry date by less than 30 days', () => {
      const futureCurrentDate = new Date();
      futureCurrentDate.setFullYear(futureCurrentDate.getFullYear() + 1); // 1 year in future

      const shortenedDate = new Date(futureCurrentDate);
      shortenedDate.setDate(shortenedDate.getDate() - 17); // 17 days earlier

      const command = { ...validCommand, expiryDate: shortenedDate };
      const lotWithExpiry = { ...mockCurrentLot, expiryDate: futureCurrentDate };

      expect(() => validateLotBatchUpdateBusinessRules(command, lotWithExpiry)).not.toThrow();
    });

    it('should reject expiry dates too far in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 21);
      const command = { ...validCommand, expiryDate: futureDate };

      expect(() => validateLotBatchUpdateBusinessRules(command, mockCurrentLot)).toThrow(
        'Expiry date cannot be more than 20 years in the future'
      );
    });

    it('should reject empty supplier lot code', () => {
      const command = { ...validCommand, supplierLotCode: '   ' };
      expect(() => validateLotBatchUpdateBusinessRules(command, mockCurrentLot)).toThrow(
        'Supplier lot code cannot be empty if provided'
      );
    });

    it('should reject empty notes', () => {
      const command = { ...validCommand, notes: '   ' };
      expect(() => validateLotBatchUpdateBusinessRules(command, mockCurrentLot)).toThrow(
        'Notes cannot be empty if provided'
      );
    });

    it('should require reason with minimum length', () => {
      const command = { ...validCommand, reason: 'abc' };
      expect(() => validateLotBatchUpdateBusinessRules(command, mockCurrentLot)).toThrow(
        'Update reason must be at least 5 characters long'
      );
    });

    it('should accept valid business rules', () => {
      expect(() => validateLotBatchUpdateBusinessRules(validCommand, mockCurrentLot)).not.toThrow();
    });
  });

  describe('Status Transition Validation', () => {
    it('should allow valid status transitions from ACTIVE', () => {
      const validTransitions = [
        LotStatus.QUARANTINE,
        LotStatus.EXPIRED,
        LotStatus.RECALLED,
        LotStatus.DAMAGED,
        LotStatus.CONSUMED,
      ];

      validTransitions.forEach((status) => {
        const command = { ...validCommand, status };
        const currentLot = { ...mockCurrentLot, status: LotStatus.ACTIVE, remainingQuantity: 0 };
        expect(() => validateLotBatchUpdateBusinessRules(command, currentLot)).not.toThrow();
      });

      // Test RESERVED separately with available quantity
      const reservedCommand = { ...validCommand, status: LotStatus.RESERVED };
      const lotWithAvailable = {
        ...mockCurrentLot,
        status: LotStatus.ACTIVE,
        remainingQuantity: 50,
        reservedQuantity: 0,
      };
      expect(() => validateLotBatchUpdateBusinessRules(reservedCommand, lotWithAvailable)).not.toThrow();
    });

    it('should reject invalid status transitions', () => {
      const command = { ...validCommand, status: LotStatus.ACTIVE };
      const currentLot = { ...mockCurrentLot, status: LotStatus.CONSUMED };

      expect(() => validateLotBatchUpdateBusinessRules(command, currentLot)).toThrow('Invalid status transition');
    });

    it('should prevent marking as CONSUMED with remaining quantity', () => {
      const command = { ...validCommand, status: LotStatus.CONSUMED };
      const currentLot = { ...mockCurrentLot, remainingQuantity: 10 };

      expect(() => validateLotBatchUpdateBusinessRules(command, currentLot)).toThrow(
        'Cannot mark lot as consumed while quantity remains'
      );
    });

    it('should prevent reserving without available quantity', () => {
      const command = { ...validCommand, status: LotStatus.RESERVED };
      const currentLot = { ...mockCurrentLot, remainingQuantity: 10, reservedQuantity: 10 };

      expect(() => validateLotBatchUpdateBusinessRules(command, currentLot)).toThrow(
        'Cannot reserve lot without available quantity'
      );
    });

    it('should prevent reactivating expired lots', () => {
      const command = { ...validCommand, status: LotStatus.ACTIVE };
      const currentLot = { ...mockCurrentLot, status: LotStatus.EXPIRED };

      expect(() => validateLotBatchUpdateBusinessRules(command, currentLot)).toThrow(
        'Invalid status transition: cannot change from EXPIRED to ACTIVE'
      );
    });

    it('should prevent reactivating consumed lots', () => {
      const command = { ...validCommand, status: LotStatus.ACTIVE };
      const currentLot = { ...mockCurrentLot, status: LotStatus.CONSUMED };

      expect(() => validateLotBatchUpdateBusinessRules(command, currentLot)).toThrow(
        'Invalid status transition: cannot change from CONSUMED to ACTIVE'
      );
    });

    it('should allow same status transition (no change)', () => {
      const command = { ...validCommand, status: LotStatus.ACTIVE };
      const currentLot = { ...mockCurrentLot, status: LotStatus.ACTIVE };

      expect(() => validateLotBatchUpdateBusinessRules(command, currentLot)).not.toThrow();
    });
  });

  describe('Update Data Preparation', () => {
    it('should prepare update data with all fields', () => {
      const updateData = prepareLotBatchUpdateData(validCommand);

      expect(updateData).toEqual({
        updatedBy: validCommand.requestedBy,
        expiryDate: validCommand.expiryDate,
        status: validCommand.status,
        supplierId: validCommand.supplierId,
        supplierLotCode: 'UPDATED001',
        notes: 'Updated notes',
      });
    });

    it('should only include defined fields', () => {
      const partialCommand = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
        status: LotStatus.QUARANTINE,
        reason: 'Quality check',
        requestedBy: '550e8400-e29b-41d4-a716-446655440002',
      };

      const updateData = prepareLotBatchUpdateData(partialCommand);

      expect(updateData).toEqual({
        updatedBy: partialCommand.requestedBy,
        status: LotStatus.QUARANTINE,
      });

      expect(updateData.expiryDate).toBeUndefined();
      expect(updateData.supplierId).toBeUndefined();
    });

    it('should convert supplier lot code to uppercase', () => {
      const command = { ...validCommand, supplierLotCode: 'lowercase001' };
      const updateData = prepareLotBatchUpdateData(command);
      expect(updateData.supplierLotCode).toBe('LOWERCASE001');
    });

    it('should trim notes', () => {
      const command = { ...validCommand, notes: '  Trimmed notes  ' };
      const updateData = prepareLotBatchUpdateData(command);
      expect(updateData.notes).toBe('Trimmed notes');
    });

    it('should handle undefined optional fields', () => {
      const command = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
        expiryDate: undefined,
        supplierLotCode: undefined,
        notes: undefined,
        reason: 'Testing undefined fields',
        requestedBy: '550e8400-e29b-41d4-a716-446655440002',
      };

      const updateData = prepareLotBatchUpdateData(command);

      expect(updateData.expiryDate).toBeUndefined();
      expect(updateData.supplierLotCode).toBeUndefined();
      expect(updateData.notes).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle lot without current expiry date', () => {
      const command = { ...validCommand, expiryDate: new Date('2025-12-31') };
      const lotWithoutExpiry = { ...mockCurrentLot, expiryDate: null };

      expect(() => validateLotBatchUpdateBusinessRules(command, lotWithoutExpiry)).not.toThrow();
    });

    it('should handle maximum future expiry date', () => {
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 20);
      const command = { ...validCommand, expiryDate: maxFutureDate };

      expect(() => validateLotBatchUpdateBusinessRules(command, mockCurrentLot)).not.toThrow();
    });

    it('should handle CONSUMED status with zero quantity', () => {
      const command = { ...validCommand, status: LotStatus.CONSUMED };
      const currentLot = { ...mockCurrentLot, remainingQuantity: 0 };

      expect(() => validateLotBatchUpdateBusinessRules(command, currentLot)).not.toThrow();
    });

    it('should handle CONSUMED status with very small quantity', () => {
      const command = { ...validCommand, status: LotStatus.CONSUMED };
      const currentLot = { ...mockCurrentLot, remainingQuantity: 0.0001 };

      expect(() => validateLotBatchUpdateBusinessRules(command, currentLot)).not.toThrow();
    });

    it('should handle RESERVED status with sufficient available quantity', () => {
      const command = { ...validCommand, status: LotStatus.RESERVED };
      const currentLot = { ...mockCurrentLot, remainingQuantity: 100, reservedQuantity: 50 };

      expect(() => validateLotBatchUpdateBusinessRules(command, currentLot)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors properly', () => {
      const invalidCommand = {
        lotBatchId: 'invalid',
        reason: '',
      };

      try {
        validateUpdateLotBatchCommand(invalidCommand);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(UpdateLotBatchCommandValidationError);
        expect((error as UpdateLotBatchCommandValidationError).validationErrors).toBeDefined();
        expect(Object.keys((error as UpdateLotBatchCommandValidationError).validationErrors).length).toBeGreaterThan(0);
      }
    });

    it('should preserve error name and message', () => {
      try {
        validateUpdateLotBatchCommand({});
        fail('Should have thrown');
      } catch (error) {
        expect((error as Error).name).toBe('UpdateLotBatchCommandValidationError');
        expect((error as Error).message).toBe('Lot/batch update validation failed');
      }
    });
  });
});
