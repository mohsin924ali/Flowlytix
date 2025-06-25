/**
 * Create Lot/Batch Command Tests
 *
 * Comprehensive unit tests for create lot/batch command validation,
 * business rules, and domain object creation.
 *
 * @domain Lot/Batch Management
 * @pattern Command Testing
 * @version 1.0.0
 */

import { z } from 'zod';
import {
  CreateLotBatchCommand,
  CreateLotBatchCommandValidationError,
  validateCreateLotBatchCommand,
  validateLotBatchBusinessRules,
  createLotBatchDomainObjects,
  CreateLotBatchCommandSchema,
} from '../create-lot-batch.command';

describe('CreateLotBatch Command', () => {
  // Test data
  const validCommand: CreateLotBatchCommand = {
    lotNumber: 'LOT001',
    batchNumber: 'BATCH001',
    manufacturingDate: new Date('2024-01-01'),
    expiryDate: new Date('2025-01-01'),
    quantity: 100,
    productId: '550e8400-e29b-41d4-a716-446655440000',
    agencyId: '550e8400-e29b-41d4-a716-446655440001',
    supplierId: '550e8400-e29b-41d4-a716-446655440002',
    supplierLotCode: 'SUPP001',
    notes: 'Test lot notes',
    requestedBy: '550e8400-e29b-41d4-a716-446655440003',
  };

  describe('Schema Validation', () => {
    it('should validate a valid command', () => {
      expect(() => validateCreateLotBatchCommand(validCommand)).not.toThrow();
    });

    it('should require lot number', () => {
      const invalidCommand = { ...validCommand, lotNumber: '' };
      expect(() => validateCreateLotBatchCommand(invalidCommand)).toThrow(CreateLotBatchCommandValidationError);
    });

    it('should validate lot number format', () => {
      const invalidCommands = [
        { ...validCommand, lotNumber: 'lot001' }, // lowercase
        { ...validCommand, lotNumber: 'LOT-001-' }, // trailing dash
        { ...validCommand, lotNumber: '-LOT001' }, // leading dash
        { ...validCommand, lotNumber: 'LOT@001' }, // invalid character
      ];

      invalidCommands.forEach((cmd) => {
        expect(() => validateCreateLotBatchCommand(cmd)).toThrow(CreateLotBatchCommandValidationError);
      });
    });

    it('should accept valid lot number formats', () => {
      const validCommands = [
        { ...validCommand, lotNumber: 'A' }, // single character
        { ...validCommand, lotNumber: 'LOT001' }, // alphanumeric
        { ...validCommand, lotNumber: 'LOT-001' }, // with dash
        { ...validCommand, lotNumber: 'LOT_001' }, // with underscore
        { ...validCommand, lotNumber: 'L1' }, // short valid
      ];

      validCommands.forEach((cmd) => {
        expect(() => validateCreateLotBatchCommand(cmd)).not.toThrow();
      });
    });

    it('should validate batch number format when provided', () => {
      const invalidCommand = { ...validCommand, batchNumber: 'batch@001' };
      expect(() => validateCreateLotBatchCommand(invalidCommand)).toThrow(CreateLotBatchCommandValidationError);
    });

    it('should allow undefined batch number', () => {
      const command = { ...validCommand };
      delete (command as any).batchNumber;
      expect(() => validateCreateLotBatchCommand(command)).not.toThrow();
    });

    it('should require manufacturing date', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).manufacturingDate;
      expect(() => validateCreateLotBatchCommand(invalidCommand)).toThrow(CreateLotBatchCommandValidationError);
    });

    it('should reject future manufacturing dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const invalidCommand = { ...validCommand, manufacturingDate: futureDate };

      expect(() => validateCreateLotBatchCommand(invalidCommand)).toThrow(CreateLotBatchCommandValidationError);
    });

    it('should validate expiry date after manufacturing date', () => {
      const invalidCommand = {
        ...validCommand,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2023-12-31'), // before manufacturing
      };

      expect(() => validateCreateLotBatchCommand(invalidCommand)).toThrow(CreateLotBatchCommandValidationError);
    });

    it('should require positive quantity', () => {
      const invalidCommands = [
        { ...validCommand, quantity: 0 },
        { ...validCommand, quantity: -1 },
        { ...validCommand, quantity: -100 },
      ];

      invalidCommands.forEach((cmd) => {
        expect(() => validateCreateLotBatchCommand(cmd)).toThrow(CreateLotBatchCommandValidationError);
      });
    });

    it('should reject excessively large quantities', () => {
      const invalidCommand = { ...validCommand, quantity: 1000001 };
      expect(() => validateCreateLotBatchCommand(invalidCommand)).toThrow(CreateLotBatchCommandValidationError);
    });

    it('should validate UUID formats', () => {
      const invalidCommands = [
        { ...validCommand, productId: 'invalid-uuid' },
        { ...validCommand, agencyId: 'not-a-uuid' },
        { ...validCommand, supplierId: '123' },
        { ...validCommand, requestedBy: 'user123' },
      ];

      invalidCommands.forEach((cmd) => {
        expect(() => validateCreateLotBatchCommand(cmd)).toThrow(CreateLotBatchCommandValidationError);
      });
    });

    it('should validate optional field lengths', () => {
      const invalidCommands = [
        { ...validCommand, supplierLotCode: 'A'.repeat(101) }, // too long
        { ...validCommand, notes: 'A'.repeat(1001) }, // too long
      ];

      invalidCommands.forEach((cmd) => {
        expect(() => validateCreateLotBatchCommand(cmd)).toThrow(CreateLotBatchCommandValidationError);
      });
    });

    it('should handle validation errors properly', () => {
      const invalidCommand = {
        lotNumber: '',
        quantity: -1,
        productId: 'invalid',
      };

      try {
        validateCreateLotBatchCommand(invalidCommand);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(CreateLotBatchCommandValidationError);
        expect((error as CreateLotBatchCommandValidationError).validationErrors).toBeDefined();
        expect(Object.keys((error as CreateLotBatchCommandValidationError).validationErrors).length).toBeGreaterThan(0);
      }
    });
  });

  describe('Business Rules Validation', () => {
    it('should validate minimum lot number length', () => {
      const command = { ...validCommand, lotNumber: 'AB' }; // 2 characters minimum
      expect(() => validateLotBatchBusinessRules(command)).not.toThrow();

      const invalidCommand = { ...validCommand, lotNumber: 'L' }; // Single character fails
      expect(() => validateLotBatchBusinessRules(invalidCommand)).toThrow(
        'Lot number must be at least 2 characters long'
      );
    });

    it('should validate minimum batch number length when provided', () => {
      const invalidCommand = { ...validCommand, batchNumber: 'B' };
      expect(() => validateLotBatchBusinessRules(invalidCommand)).toThrow(
        'Batch number must be at least 2 characters long'
      );
    });

    it('should reject manufacturing dates too far in the past', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 11); // 11 years ago
      const invalidCommand = { ...validCommand, manufacturingDate: oldDate };

      expect(() => validateLotBatchBusinessRules(invalidCommand)).toThrow(
        'Manufacturing date cannot be more than 10 years in the past'
      );
    });

    it('should reject expiry dates too far in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 21); // 21 years in future
      const invalidCommand = { ...validCommand, expiryDate: futureDate };

      expect(() => validateLotBatchBusinessRules(invalidCommand)).toThrow(
        'Expiry date cannot be more than 20 years in the future'
      );
    });

    it('should require minimum shelf life', () => {
      const manufacturingDate = new Date('2024-01-01');
      const expiryDate = new Date('2024-01-01'); // same day
      const invalidCommand = {
        ...validCommand,
        manufacturingDate,
        expiryDate,
      };

      expect(() => validateLotBatchBusinessRules(invalidCommand)).toThrow('Shelf life must be at least 1 day');
    });

    it('should warn about large quantities', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const command = { ...validCommand, quantity: 150000 };

      expect(() => validateLotBatchBusinessRules(command)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Large quantity detected'));

      consoleWarnSpy.mockRestore();
    });

    it('should reject empty supplier lot code', () => {
      const invalidCommand = { ...validCommand, supplierLotCode: '   ' };
      expect(() => validateLotBatchBusinessRules(invalidCommand)).toThrow(
        'Supplier lot code cannot be empty if provided'
      );
    });

    it('should reject empty notes', () => {
      const invalidCommand = { ...validCommand, notes: '   ' };
      expect(() => validateLotBatchBusinessRules(invalidCommand)).toThrow('Notes cannot be empty if provided');
    });

    it('should accept valid business rules', () => {
      expect(() => validateLotBatchBusinessRules(validCommand)).not.toThrow();
    });
  });

  describe('Domain Objects Creation', () => {
    it('should create domain objects with correct values', () => {
      const domainObjects = createLotBatchDomainObjects(validCommand);

      expect(domainObjects).toEqual({
        lotNumber: 'LOT001',
        batchNumber: 'BATCH001',
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-01-01'),
        quantity: 100,
        productId: '550e8400-e29b-41d4-a716-446655440000',
        agencyId: '550e8400-e29b-41d4-a716-446655440001',
        supplierId: '550e8400-e29b-41d4-a716-446655440002',
        supplierLotCode: 'SUPP001',
        notes: 'Test lot notes',
        createdBy: '550e8400-e29b-41d4-a716-446655440003',
      });
    });

    it('should convert lot number to uppercase', () => {
      const command = { ...validCommand, lotNumber: 'lot001' };
      const domainObjects = createLotBatchDomainObjects(command);
      expect(domainObjects.lotNumber).toBe('LOT001');
    });

    it('should convert batch number to uppercase', () => {
      const command = { ...validCommand, batchNumber: 'batch001' };
      const domainObjects = createLotBatchDomainObjects(command);
      expect(domainObjects.batchNumber).toBe('BATCH001');
    });

    it('should convert supplier lot code to uppercase', () => {
      const command = { ...validCommand, supplierLotCode: 'supp001' };
      const domainObjects = createLotBatchDomainObjects(command);
      expect(domainObjects.supplierLotCode).toBe('SUPP001');
    });

    it('should handle undefined optional fields', () => {
      const command = {
        ...validCommand,
        batchNumber: undefined,
        supplierLotCode: undefined,
        notes: undefined,
      };

      const domainObjects = createLotBatchDomainObjects(command);
      expect(domainObjects.batchNumber).toBeUndefined();
      expect(domainObjects.supplierLotCode).toBeUndefined();
      expect(domainObjects.notes).toBeUndefined();
    });

    it('should trim notes', () => {
      const command = { ...validCommand, notes: '  Test notes  ' };
      const domainObjects = createLotBatchDomainObjects(command);
      expect(domainObjects.notes).toBe('Test notes');
    });

    it('should handle undefined expiry date', () => {
      const command = { ...validCommand, expiryDate: undefined };
      const domainObjects = createLotBatchDomainObjects(command);
      expect(domainObjects.expiryDate).toBeUndefined();
    });

    it('should create proper Date objects', () => {
      const domainObjects = createLotBatchDomainObjects(validCommand);
      expect(domainObjects.manufacturingDate).toBeInstanceOf(Date);
      expect(domainObjects.expiryDate).toBeInstanceOf(Date);
    });
  });

  describe('Edge Cases', () => {
    it('should handle command with minimal required fields', () => {
      const minimalCommand = {
        lotNumber: 'L01', // Changed to meet 2-character minimum
        manufacturingDate: new Date('2024-01-01'),
        quantity: 1,
        productId: '550e8400-e29b-41d4-a716-446655440000',
        agencyId: '550e8400-e29b-41d4-a716-446655440001',
        requestedBy: '550e8400-e29b-41d4-a716-446655440003',
      };

      expect(() => validateCreateLotBatchCommand(minimalCommand)).not.toThrow();
      expect(() => validateLotBatchBusinessRules(minimalCommand)).not.toThrow();

      const domainObjects = createLotBatchDomainObjects(minimalCommand);
      expect(domainObjects.batchNumber).toBeUndefined();
      expect(domainObjects.expiryDate).toBeUndefined();
    });

    it('should handle today as manufacturing date', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day to avoid time precision issues
      today.setSeconds(0, 0); // Remove seconds and milliseconds
      const command = { ...validCommand, manufacturingDate: today };

      expect(() => validateCreateLotBatchCommand(command)).not.toThrow();
      expect(() => validateLotBatchBusinessRules(command)).not.toThrow();
    });

    it('should handle maximum allowed quantity', () => {
      const command = { ...validCommand, quantity: 1000000 };
      expect(() => validateCreateLotBatchCommand(command)).not.toThrow();
    });

    it('should handle maximum string lengths', () => {
      const command = {
        ...validCommand,
        lotNumber: 'A'.repeat(50),
        batchNumber: 'B'.repeat(50),
        supplierLotCode: 'S'.repeat(100),
        notes: 'N'.repeat(1000),
      };

      expect(() => validateCreateLotBatchCommand(command)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should preserve original error for non-zod errors', () => {
      const originalError = new Error('Custom error');
      const mockParse = jest.spyOn(CreateLotBatchCommandSchema, 'parse');
      mockParse.mockImplementation(() => {
        throw originalError;
      });

      expect(() => validateCreateLotBatchCommand(validCommand)).toThrow(originalError);
      mockParse.mockRestore();
    });

    it('should create proper validation error structure', () => {
      const invalidCommand = {
        lotNumber: '',
        quantity: 0,
        productId: 'invalid',
        manufacturingDate: 'invalid-date',
      };

      try {
        validateCreateLotBatchCommand(invalidCommand);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CreateLotBatchCommandValidationError);
        expect((error as Error).name).toBe('CreateLotBatchCommandValidationError');
        expect((error as Error).message).toBe('Lot/batch creation validation failed');
        expect((error as CreateLotBatchCommandValidationError).validationErrors).toBeDefined();
      }
    });
  });
});
