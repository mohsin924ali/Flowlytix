/**
 * Delete Lot/Batch Command Tests
 *
 * Comprehensive unit tests for delete lot/batch command validation,
 * business rules, and deletion strategies.
 *
 * @domain Lot/Batch Management
 * @pattern Command Testing
 * @version 1.0.0
 */

import {
  DeleteLotBatchCommand,
  DeleteLotBatchCommandValidationError,
  DeleteType,
  validateDeleteLotBatchCommand,
  validateLotBatchDeletionBusinessRules,
  determineDeletionStrategy,
  prepareLotBatchDeletionData,
} from '../delete-lot-batch.command';
import { LotStatus } from '../../../../domain/value-objects/lot-batch';

describe('DeleteLotBatch Command', () => {
  // Test data
  const validCommand: DeleteLotBatchCommand = {
    lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
    deleteType: DeleteType.SOFT,
    reason: 'Test deletion for unit testing purposes',
    force: false,
    requestedBy: '550e8400-e29b-41d4-a716-446655440001',
  };

  const mockCurrentLot = {
    lotNumber: 'LOT001',
    batchNumber: 'BATCH001',
    status: LotStatus.CONSUMED,
    quantity: 100,
    remainingQuantity: 0,
    reservedQuantity: 0,
    productId: '550e8400-e29b-41d4-a716-446655440002',
    agencyId: '550e8400-e29b-41d4-a716-446655440003',
  };

  describe('Schema Validation', () => {
    it('should validate a valid command', () => {
      expect(() => validateDeleteLotBatchCommand(validCommand)).not.toThrow();
    });

    it('should require valid UUID for lot batch ID', () => {
      const invalidCommand = { ...validCommand, lotBatchId: 'invalid-uuid' };
      expect(() => validateDeleteLotBatchCommand(invalidCommand)).toThrow(DeleteLotBatchCommandValidationError);
    });

    it('should validate delete type enum', () => {
      const invalidCommand = { ...validCommand, deleteType: 'INVALID' as any };
      expect(() => validateDeleteLotBatchCommand(invalidCommand)).toThrow(DeleteLotBatchCommandValidationError);
    });

    it('should default to SOFT delete type', () => {
      const commandWithoutType = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'Test deletion',
        requestedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const validated = validateDeleteLotBatchCommand(commandWithoutType);
      expect(validated.deleteType).toBe(DeleteType.SOFT);
    });

    it('should require minimum reason length', () => {
      const invalidCommand = { ...validCommand, reason: 'abc' };
      expect(() => validateDeleteLotBatchCommand(invalidCommand)).toThrow(DeleteLotBatchCommandValidationError);
    });

    it('should validate maximum reason length', () => {
      const invalidCommand = { ...validCommand, reason: 'A'.repeat(501) };
      expect(() => validateDeleteLotBatchCommand(invalidCommand)).toThrow(DeleteLotBatchCommandValidationError);
    });

    it('should default force to false', () => {
      const commandWithoutForce = {
        lotBatchId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'Test deletion',
        requestedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const validated = validateDeleteLotBatchCommand(commandWithoutForce);
      expect(validated.force).toBe(false);
    });

    it('should require valid UUID for requested by', () => {
      const invalidCommand = { ...validCommand, requestedBy: 'invalid-uuid' };
      expect(() => validateDeleteLotBatchCommand(invalidCommand)).toThrow(DeleteLotBatchCommandValidationError);
    });
  });

  describe('Business Rules Validation', () => {
    it('should reject deletion with remaining quantity without force', () => {
      const lotWithRemaining = { ...mockCurrentLot, remainingQuantity: 50 };

      expect(() => validateLotBatchDeletionBusinessRules(validCommand, lotWithRemaining)).toThrow(
        'Cannot delete lot LOT001: 50 units remaining'
      );
    });

    it('should reject deletion with reserved quantity without force', () => {
      const lotWithReserved = { ...mockCurrentLot, reservedQuantity: 20 };

      expect(() => validateLotBatchDeletionBusinessRules(validCommand, lotWithReserved)).toThrow(
        'Cannot delete lot LOT001: 20 units reserved'
      );
    });

    it('should reject deletion of active lot with remaining quantity without force', () => {
      const activeLotWithRemaining = {
        ...mockCurrentLot,
        status: LotStatus.ACTIVE,
        remainingQuantity: 30,
      };

      expect(() => validateLotBatchDeletionBusinessRules(validCommand, activeLotWithRemaining)).toThrow(
        'Cannot delete lot LOT001: 30 units remaining'
      );
    });

    it('should allow forced deletion with remaining quantity', () => {
      const forcedCommand = { ...validCommand, force: true };
      const lotWithRemaining = { ...mockCurrentLot, remainingQuantity: 50 };

      expect(() => validateLotBatchDeletionBusinessRules(forcedCommand, lotWithRemaining)).not.toThrow();
    });

    it('should require longer reason for non-forced deletion', () => {
      const command = { ...validCommand, reason: 'short' };

      expect(() => validateLotBatchDeletionBusinessRules(command, mockCurrentLot)).toThrow(
        'Deletion reason must be at least 10 characters long'
      );
    });

    it('should allow short reason with force', () => {
      const forcedCommand = { ...validCommand, reason: 'short', force: true };

      expect(() => validateLotBatchDeletionBusinessRules(forcedCommand, mockCurrentLot)).not.toThrow();
    });

    it('should reject hard delete without proper status', () => {
      const hardDeleteCommand = { ...validCommand, deleteType: DeleteType.HARD };
      const activeLot = { ...mockCurrentLot, status: LotStatus.ACTIVE };

      expect(() => validateLotBatchDeletionBusinessRules(hardDeleteCommand, activeLot)).toThrow(
        'Hard delete requires lot to be CONSUMED or DAMAGED status'
      );
    });

    it('should allow hard delete with CONSUMED status', () => {
      const hardDeleteCommand = {
        ...validCommand,
        deleteType: DeleteType.HARD,
        reason: 'data_cleanup required for system maintenance',
      };
      const consumedLot = { ...mockCurrentLot, status: LotStatus.CONSUMED };

      expect(() => validateLotBatchDeletionBusinessRules(hardDeleteCommand, consumedLot)).not.toThrow();
    });

    it('should allow hard delete with DAMAGED status', () => {
      const hardDeleteCommand = {
        ...validCommand,
        deleteType: DeleteType.HARD,
        reason: 'duplicate_entry found in database',
      };
      const damagedLot = { ...mockCurrentLot, status: LotStatus.DAMAGED };

      expect(() => validateLotBatchDeletionBusinessRules(hardDeleteCommand, damagedLot)).not.toThrow();
    });

    it('should require specific reason keywords for hard delete', () => {
      const hardDeleteCommand = {
        ...validCommand,
        deleteType: DeleteType.HARD,
        reason: 'Just want to delete this record',
      };

      expect(() => validateLotBatchDeletionBusinessRules(hardDeleteCommand, mockCurrentLot)).toThrow(
        'Hard delete requires specific reason keywords'
      );
    });

    it('should accept valid hard delete reason keywords', () => {
      const validReasons = [
        'data_cleanup required for compliance',
        'test_data that needs removal',
        'duplicate_entry found in system',
        'system_error caused invalid record',
        'compliance_requirement for audit',
      ];

      validReasons.forEach((reason) => {
        const hardDeleteCommand = {
          ...validCommand,
          deleteType: DeleteType.HARD,
          reason,
        };

        expect(() => validateLotBatchDeletionBusinessRules(hardDeleteCommand, mockCurrentLot)).not.toThrow();
      });
    });

    it('should warn about large quantity deletion', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const largeLot = { ...mockCurrentLot, quantity: 15000 };

      expect(() => validateLotBatchDeletionBusinessRules(validCommand, largeLot)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Deleting large quantity lot'));

      consoleWarnSpy.mockRestore();
    });

    it('should warn about recalled lot deletion', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const recalledLot = { ...mockCurrentLot, status: LotStatus.RECALLED };

      expect(() => validateLotBatchDeletionBusinessRules(validCommand, recalledLot)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Deleting recalled lot'));

      consoleWarnSpy.mockRestore();
    });

    it('should accept valid deletion', () => {
      expect(() => validateLotBatchDeletionBusinessRules(validCommand, mockCurrentLot)).not.toThrow();
    });
  });

  describe('Deletion Strategy Determination', () => {
    it('should recommend hard delete for eligible lots', () => {
      const hardDeleteCommand = { ...validCommand, deleteType: DeleteType.HARD };
      const eligibleLot = {
        status: LotStatus.CONSUMED,
        remainingQuantity: 0,
        reservedQuantity: 0,
      };

      const strategy = determineDeletionStrategy(hardDeleteCommand, eligibleLot);
      expect(strategy.strategy).toBe('hard_delete');
      expect(strategy.reason).toBe('Eligible for permanent deletion');
    });

    it('should recommend mark_consumed for lots with remaining quantity', () => {
      const lotWithRemaining = {
        status: LotStatus.ACTIVE,
        remainingQuantity: 50,
        reservedQuantity: 0,
      };

      const strategy = determineDeletionStrategy(validCommand, lotWithRemaining);
      expect(strategy.strategy).toBe('mark_consumed');
      expect(strategy.reason).toBe('Lot has remaining/reserved quantity - marking as consumed');
    });

    it('should recommend mark_consumed for lots with reserved quantity', () => {
      const lotWithReserved = {
        status: LotStatus.ACTIVE,
        remainingQuantity: 0,
        reservedQuantity: 20,
      };

      const strategy = determineDeletionStrategy(validCommand, lotWithReserved);
      expect(strategy.strategy).toBe('mark_consumed');
      expect(strategy.reason).toBe('Lot has remaining/reserved quantity - marking as consumed');
    });

    it('should recommend soft_delete as default', () => {
      const emptyLot = {
        status: LotStatus.ACTIVE,
        remainingQuantity: 0,
        reservedQuantity: 0,
      };

      const strategy = determineDeletionStrategy(validCommand, emptyLot);
      expect(strategy.strategy).toBe('soft_delete');
      expect(strategy.reason).toBe('Safe soft deletion approach');
    });

    it('should not recommend hard delete for ineligible status', () => {
      const hardDeleteCommand = { ...validCommand, deleteType: DeleteType.HARD };
      const activeLot = {
        status: LotStatus.ACTIVE,
        remainingQuantity: 0,
        reservedQuantity: 0,
      };

      const strategy = determineDeletionStrategy(hardDeleteCommand, activeLot);
      expect(strategy.strategy).toBe('soft_delete');
    });
  });

  describe('Deletion Data Preparation', () => {
    it('should prepare deletion data with all fields', () => {
      const deletionData = prepareLotBatchDeletionData(validCommand);

      expect(deletionData).toEqual({
        lotBatchId: validCommand.lotBatchId,
        deleteType: validCommand.deleteType,
        reason: validCommand.reason,
        force: validCommand.force,
        deletedBy: validCommand.requestedBy,
        deletedAt: expect.any(Date),
      });
    });

    it('should trim reason text', () => {
      const commandWithSpaces = { ...validCommand, reason: '  Spaced reason  ' };
      const deletionData = prepareLotBatchDeletionData(commandWithSpaces);
      expect(deletionData.reason).toBe('Spaced reason');
    });

    it('should include current timestamp', () => {
      const deletionData = prepareLotBatchDeletionData(validCommand);
      expect(deletionData.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('Edge Cases', () => {
    it('should handle lot without batch number', () => {
      const lotWithoutBatch = { ...mockCurrentLot, batchNumber: null };
      expect(() => validateLotBatchDeletionBusinessRules(validCommand, lotWithoutBatch)).not.toThrow();
    });

    it('should handle minimum valid reason length', () => {
      const command = { ...validCommand, reason: 'Valid' };
      expect(() => validateDeleteLotBatchCommand(command)).not.toThrow();
    });

    it('should handle maximum reason length', () => {
      const command = { ...validCommand, reason: 'V'.repeat(500) };
      expect(() => validateDeleteLotBatchCommand(command)).not.toThrow();
    });

    it('should handle both delete types', () => {
      const softCommand = { ...validCommand, deleteType: DeleteType.SOFT };
      const hardCommand = { ...validCommand, deleteType: DeleteType.HARD };

      expect(() => validateDeleteLotBatchCommand(softCommand)).not.toThrow();
      expect(() => validateDeleteLotBatchCommand(hardCommand)).not.toThrow();
    });

    it('should handle all lot statuses', () => {
      const statuses = Object.values(LotStatus);

      statuses.forEach((status) => {
        const lot = { ...mockCurrentLot, status };
        // Should not throw for status alone - other rules may apply
        expect(() => validateLotBatchDeletionBusinessRules(validCommand, lot)).not.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors properly', () => {
      const invalidCommand = {
        lotBatchId: 'invalid',
        reason: '',
        requestedBy: 'invalid',
      };

      try {
        validateDeleteLotBatchCommand(invalidCommand);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(DeleteLotBatchCommandValidationError);
        expect((error as DeleteLotBatchCommandValidationError).validationErrors).toBeDefined();
        expect(Object.keys((error as DeleteLotBatchCommandValidationError).validationErrors).length).toBeGreaterThan(0);
      }
    });

    it('should preserve error name and message', () => {
      try {
        validateDeleteLotBatchCommand({});
        fail('Should have thrown');
      } catch (error) {
        expect((error as Error).name).toBe('DeleteLotBatchCommandValidationError');
        expect((error as Error).message).toBe('Lot/batch deletion validation failed');
      }
    });

    it('should create validation error with proper structure', () => {
      const invalidCommand = { reason: 'ab' }; // Too short

      try {
        validateDeleteLotBatchCommand(invalidCommand);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DeleteLotBatchCommandValidationError);
        expect((error as DeleteLotBatchCommandValidationError).validationErrors).toBeDefined();
        expect(typeof (error as DeleteLotBatchCommandValidationError).validationErrors).toBe('object');
      }
    });
  });
});
