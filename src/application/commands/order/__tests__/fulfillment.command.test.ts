/**
 * Order Fulfillment Commands Tests
 *
 * Comprehensive test suite for order fulfillment command validation.
 * Tests command schemas, validation functions, error handling, and business rules.
 *
 * @domain Order Management - Fulfillment Workflow
 * @version 1.0.0 - Step 1B: Application Layer Enhancement
 */

import {
  StartPickingCommandSchema,
  CompletePickingCommandSchema,
  StartPackingCommandSchema,
  CompletePackingCommandSchema,
  ShipOrderCommandSchema,
  DeliverOrderCommandSchema,
  MarkPartialFulfillmentCommandSchema,
  RollbackFulfillmentCommandSchema,
  FulfillmentCommandValidationError,
  validateStartPickingCommand,
  validateCompletePickingCommand,
  validateStartPackingCommand,
  validateCompletePackingCommand,
  validateShipOrderCommand,
  validateDeliverOrderCommand,
  validateMarkPartialFulfillmentCommand,
  validateRollbackFulfillmentCommand,
  type StartPickingCommand,
  type CompletePickingCommand,
  type StartPackingCommand,
  type CompletePackingCommand,
  type ShipOrderCommand,
  type DeliverOrderCommand,
  type MarkPartialFulfillmentCommand,
  type RollbackFulfillmentCommand,
} from '../fulfillment.command';
import { OrderFulfillmentStatus } from '../../../../domain/entities/order';

describe('Order Fulfillment Commands', () => {
  // Test data
  const validOrderId = '12345678-1234-1234-1234-123456789abc';
  const validUserId = 'user-123';
  const validNotes = 'Test fulfillment notes';
  const validAssignedWorker = 'John Doe';
  const validTrackingNumber = 'TRK123456789';
  const validCarrier = 'UPS';
  const validRecipientName = 'Jane Smith';
  const validReason = 'Stock shortage issue';
  const validAffectedItems = ['item-1', 'item-2'];

  describe('Start Picking Command', () => {
    const validCommand: StartPickingCommand = {
      orderId: validOrderId,
      userId: validUserId,
      notes: validNotes,
      assignedWorker: validAssignedWorker,
    };

    describe('Schema Validation', () => {
      it('should validate valid start picking command', () => {
        const result = StartPickingCommandSchema.parse(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should validate minimal start picking command', () => {
        const minimalCommand = {
          orderId: validOrderId,
          userId: validUserId,
        };
        const result = StartPickingCommandSchema.parse(minimalCommand);
        expect(result.orderId).toBe(validOrderId);
        expect(result.userId).toBe(validUserId);
        expect(result.notes).toBeUndefined();
        expect(result.assignedWorker).toBeUndefined();
      });

      it('should reject command with missing orderId', () => {
        const invalidCommand = { ...validCommand, orderId: '' };
        expect(() => StartPickingCommandSchema.parse(invalidCommand)).toThrow();
      });

      it('should reject command with missing userId', () => {
        const invalidCommand = { ...validCommand, userId: '' };
        expect(() => StartPickingCommandSchema.parse(invalidCommand)).toThrow();
      });

      it('should reject command with notes too long', () => {
        const invalidCommand = { ...validCommand, notes: 'a'.repeat(1001) };
        expect(() => StartPickingCommandSchema.parse(invalidCommand)).toThrow();
      });

      it('should reject command with assigned worker name too long', () => {
        const invalidCommand = { ...validCommand, assignedWorker: 'a'.repeat(201) };
        expect(() => StartPickingCommandSchema.parse(invalidCommand)).toThrow();
      });
    });

    describe('Validation Function', () => {
      it('should validate valid command successfully', () => {
        const result = validateStartPickingCommand(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should throw FulfillmentCommandValidationError for invalid command', () => {
        const invalidCommand = { orderId: '', userId: validUserId };
        expect(() => validateStartPickingCommand(invalidCommand)).toThrow(FulfillmentCommandValidationError);
      });

      it('should include validation errors in thrown error', () => {
        const invalidCommand = { orderId: '', userId: '' };
        try {
          validateStartPickingCommand(invalidCommand);
          fail('Should have thrown validation error');
        } catch (error) {
          expect(error).toBeInstanceOf(FulfillmentCommandValidationError);
          const validationError = error as FulfillmentCommandValidationError;
          expect(validationError.validationErrors).toBeDefined();
          expect(validationError.validationErrors['orderId']).toContain('Order ID is required');
          expect(validationError.validationErrors['userId']).toContain('User ID is required');
        }
      });
    });
  });

  describe('Complete Picking Command', () => {
    const validCommand: CompletePickingCommand = {
      orderId: validOrderId,
      userId: validUserId,
      notes: validNotes,
    };

    describe('Schema Validation', () => {
      it('should validate valid complete picking command', () => {
        const result = CompletePickingCommandSchema.parse(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should validate minimal complete picking command', () => {
        const minimalCommand = {
          orderId: validOrderId,
          userId: validUserId,
        };
        const result = CompletePickingCommandSchema.parse(minimalCommand);
        expect(result.orderId).toBe(validOrderId);
        expect(result.userId).toBe(validUserId);
      });
    });

    describe('Validation Function', () => {
      it('should validate valid command successfully', () => {
        const result = validateCompletePickingCommand(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should throw FulfillmentCommandValidationError for invalid command', () => {
        const invalidCommand = { orderId: '', userId: validUserId };
        expect(() => validateCompletePickingCommand(invalidCommand)).toThrow(FulfillmentCommandValidationError);
      });
    });
  });

  describe('Start Packing Command', () => {
    const validCommand: StartPackingCommand = {
      orderId: validOrderId,
      userId: validUserId,
      notes: validNotes,
      assignedWorker: validAssignedWorker,
    };

    describe('Schema Validation', () => {
      it('should validate valid start packing command', () => {
        const result = StartPackingCommandSchema.parse(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should validate minimal start packing command', () => {
        const minimalCommand = {
          orderId: validOrderId,
          userId: validUserId,
        };
        const result = StartPackingCommandSchema.parse(minimalCommand);
        expect(result.orderId).toBe(validOrderId);
        expect(result.userId).toBe(validUserId);
      });
    });

    describe('Validation Function', () => {
      it('should validate valid command successfully', () => {
        const result = validateStartPackingCommand(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should throw FulfillmentCommandValidationError for invalid command', () => {
        const invalidCommand = { orderId: '', userId: validUserId };
        expect(() => validateStartPackingCommand(invalidCommand)).toThrow(FulfillmentCommandValidationError);
      });
    });
  });

  describe('Complete Packing Command', () => {
    const validCommand: CompletePackingCommand = {
      orderId: validOrderId,
      userId: validUserId,
      notes: validNotes,
    };

    describe('Schema Validation', () => {
      it('should validate valid complete packing command', () => {
        const result = CompletePackingCommandSchema.parse(validCommand);
        expect(result).toEqual(validCommand);
      });
    });

    describe('Validation Function', () => {
      it('should validate valid command successfully', () => {
        const result = validateCompletePackingCommand(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should throw FulfillmentCommandValidationError for invalid command', () => {
        const invalidCommand = { orderId: '', userId: validUserId };
        expect(() => validateCompletePackingCommand(invalidCommand)).toThrow(FulfillmentCommandValidationError);
      });
    });
  });

  describe('Ship Order Command', () => {
    const validCommand: ShipOrderCommand = {
      orderId: validOrderId,
      userId: validUserId,
      notes: validNotes,
      trackingNumber: validTrackingNumber,
      carrier: validCarrier,
    };

    describe('Schema Validation', () => {
      it('should validate valid ship order command', () => {
        const result = ShipOrderCommandSchema.parse(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should validate minimal ship order command', () => {
        const minimalCommand = {
          orderId: validOrderId,
          userId: validUserId,
        };
        const result = ShipOrderCommandSchema.parse(minimalCommand);
        expect(result.orderId).toBe(validOrderId);
        expect(result.userId).toBe(validUserId);
      });

      it('should reject command with tracking number too long', () => {
        const invalidCommand = { ...validCommand, trackingNumber: 'a'.repeat(101) };
        expect(() => ShipOrderCommandSchema.parse(invalidCommand)).toThrow();
      });

      it('should reject command with carrier name too long', () => {
        const invalidCommand = { ...validCommand, carrier: 'a'.repeat(101) };
        expect(() => ShipOrderCommandSchema.parse(invalidCommand)).toThrow();
      });
    });

    describe('Validation Function', () => {
      it('should validate valid command successfully', () => {
        const result = validateShipOrderCommand(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should throw FulfillmentCommandValidationError for invalid command', () => {
        const invalidCommand = { orderId: '', userId: validUserId };
        expect(() => validateShipOrderCommand(invalidCommand)).toThrow(FulfillmentCommandValidationError);
      });
    });
  });

  describe('Deliver Order Command', () => {
    const validCommand: DeliverOrderCommand = {
      orderId: validOrderId,
      userId: validUserId,
      notes: validNotes,
      deliveredAt: new Date('2024-01-15T10:00:00Z'),
      recipientName: validRecipientName,
    };

    describe('Schema Validation', () => {
      it('should validate valid deliver order command', () => {
        const result = DeliverOrderCommandSchema.parse(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should validate minimal deliver order command', () => {
        const minimalCommand = {
          orderId: validOrderId,
          userId: validUserId,
        };
        const result = DeliverOrderCommandSchema.parse(minimalCommand);
        expect(result.orderId).toBe(validOrderId);
        expect(result.userId).toBe(validUserId);
      });

      it('should coerce string date to Date object', () => {
        const commandWithStringDate = {
          ...validCommand,
          deliveredAt: '2024-01-15T10:00:00Z',
        };
        const result = DeliverOrderCommandSchema.parse(commandWithStringDate);
        expect(result.deliveredAt).toBeInstanceOf(Date);
      });

      it('should reject command with recipient name too long', () => {
        const invalidCommand = { ...validCommand, recipientName: 'a'.repeat(201) };
        expect(() => DeliverOrderCommandSchema.parse(invalidCommand)).toThrow();
      });

      it('should reject command with invalid delivery date', () => {
        const invalidCommand = { ...validCommand, deliveredAt: 'invalid-date' };
        expect(() => DeliverOrderCommandSchema.parse(invalidCommand)).toThrow();
      });
    });

    describe('Validation Function', () => {
      it('should validate valid command successfully', () => {
        const result = validateDeliverOrderCommand(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should throw FulfillmentCommandValidationError for invalid command', () => {
        const invalidCommand = { orderId: '', userId: validUserId };
        expect(() => validateDeliverOrderCommand(invalidCommand)).toThrow(FulfillmentCommandValidationError);
      });
    });
  });

  describe('Mark Partial Fulfillment Command', () => {
    const validCommand: MarkPartialFulfillmentCommand = {
      orderId: validOrderId,
      userId: validUserId,
      notes: validNotes,
      reason: validReason,
      affectedItems: validAffectedItems,
    };

    describe('Schema Validation', () => {
      it('should validate valid mark partial fulfillment command', () => {
        const result = MarkPartialFulfillmentCommandSchema.parse(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should validate command without affected items', () => {
        const commandWithoutItems = {
          orderId: validOrderId,
          userId: validUserId,
          reason: validReason,
        };
        const result = MarkPartialFulfillmentCommandSchema.parse(commandWithoutItems);
        expect(result.reason).toBe(validReason);
        expect(result.affectedItems).toBeUndefined();
      });

      it('should reject command with missing reason', () => {
        const invalidCommand = { ...validCommand, reason: '' };
        expect(() => MarkPartialFulfillmentCommandSchema.parse(invalidCommand)).toThrow();
      });

      it('should reject command with reason too long', () => {
        const invalidCommand = { ...validCommand, reason: 'a'.repeat(501) };
        expect(() => MarkPartialFulfillmentCommandSchema.parse(invalidCommand)).toThrow();
      });

      it('should reject command with too many affected items', () => {
        const invalidCommand = { ...validCommand, affectedItems: Array(101).fill('item') };
        expect(() => MarkPartialFulfillmentCommandSchema.parse(invalidCommand)).toThrow();
      });
    });

    describe('Validation Function', () => {
      it('should validate valid command successfully', () => {
        const result = validateMarkPartialFulfillmentCommand(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should throw FulfillmentCommandValidationError for invalid command', () => {
        const invalidCommand = { orderId: validOrderId, userId: validUserId, reason: '' };
        expect(() => validateMarkPartialFulfillmentCommand(invalidCommand)).toThrow(FulfillmentCommandValidationError);
      });
    });
  });

  describe('Rollback Fulfillment Command', () => {
    const validCommand: RollbackFulfillmentCommand = {
      orderId: validOrderId,
      userId: validUserId,
      notes: validNotes,
      targetStatus: OrderFulfillmentStatus.PENDING,
      reason: validReason,
    };

    describe('Schema Validation', () => {
      it('should validate valid rollback fulfillment command', () => {
        const result = RollbackFulfillmentCommandSchema.parse(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should validate command with different target status', () => {
        const commandWithDifferentStatus = {
          ...validCommand,
          targetStatus: OrderFulfillmentStatus.PICKING,
        };
        const result = RollbackFulfillmentCommandSchema.parse(commandWithDifferentStatus);
        expect(result.targetStatus).toBe(OrderFulfillmentStatus.PICKING);
      });

      it('should reject command with invalid target status', () => {
        const invalidCommand = { ...validCommand, targetStatus: 'INVALID_STATUS' };
        expect(() => RollbackFulfillmentCommandSchema.parse(invalidCommand)).toThrow();
      });

      it('should reject command with missing reason', () => {
        const invalidCommand = { ...validCommand, reason: '' };
        expect(() => RollbackFulfillmentCommandSchema.parse(invalidCommand)).toThrow();
      });

      it('should reject command with reason too long', () => {
        const invalidCommand = { ...validCommand, reason: 'a'.repeat(501) };
        expect(() => RollbackFulfillmentCommandSchema.parse(invalidCommand)).toThrow();
      });
    });

    describe('Validation Function', () => {
      it('should validate valid command successfully', () => {
        const result = validateRollbackFulfillmentCommand(validCommand);
        expect(result).toEqual(validCommand);
      });

      it('should throw FulfillmentCommandValidationError for invalid command', () => {
        const invalidCommand = {
          orderId: validOrderId,
          userId: validUserId,
          targetStatus: 'INVALID',
          reason: validReason,
        };
        expect(() => validateRollbackFulfillmentCommand(invalidCommand)).toThrow(FulfillmentCommandValidationError);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined commands gracefully', () => {
      expect(() => validateStartPickingCommand(null)).toThrow(FulfillmentCommandValidationError);
      expect(() => validateStartPickingCommand(undefined)).toThrow(FulfillmentCommandValidationError);
    });

    it('should handle non-object commands gracefully', () => {
      expect(() => validateStartPickingCommand('invalid')).toThrow(FulfillmentCommandValidationError);
      expect(() => validateStartPickingCommand(123)).toThrow(FulfillmentCommandValidationError);
    });

    it('should preserve validation error structure', () => {
      const invalidCommand = { orderId: '', userId: '', notes: 'a'.repeat(1001) };
      try {
        validateStartPickingCommand(invalidCommand);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(FulfillmentCommandValidationError);
        const validationError = error as FulfillmentCommandValidationError;
        expect(validationError.name).toBe('FulfillmentCommandValidationError');
        expect(validationError.message).toContain('Start picking command validation failed');
        expect(Object.keys(validationError.validationErrors)).toHaveLength(3); // orderId, userId, notes
      }
    });

    it('should handle empty objects', () => {
      expect(() => validateStartPickingCommand({})).toThrow(FulfillmentCommandValidationError);
    });

    it('should handle arrays as input', () => {
      expect(() => validateStartPickingCommand([])).toThrow(FulfillmentCommandValidationError);
    });
  });

  describe('Type Safety', () => {
    it('should maintain proper TypeScript types', () => {
      const command: StartPickingCommand = {
        orderId: validOrderId,
        userId: validUserId,
        notes: validNotes,
        assignedWorker: validAssignedWorker,
      };

      // TypeScript should enforce these types at compile time
      expect(typeof command.orderId).toBe('string');
      expect(typeof command.userId).toBe('string');
      expect(typeof command.notes).toBe('string');
      expect(typeof command.assignedWorker).toBe('string');
    });

    it('should handle optional fields correctly', () => {
      const minimalCommand: StartPickingCommand = {
        orderId: validOrderId,
        userId: validUserId,
      };

      expect(minimalCommand.notes).toBeUndefined();
      expect(minimalCommand.assignedWorker).toBeUndefined();
    });
  });
});
