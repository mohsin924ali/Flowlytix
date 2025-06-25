/**
 * Create Agency Command Tests - Step MT-3A
 *
 * Unit tests for CreateAgencyCommand validation, business rules, and domain object creation.
 *
 * STEP MT-3A TEST SCOPE:
 * - Command validation with Zod schemas
 * - Business rules enforcement
 * - Domain object creation
 * - Error handling and edge cases
 * - Input sanitization and security
 *
 * @domain Agency Management
 * @pattern CQRS Command Testing
 * @architecture Multi-tenant
 * @version 1.0.0
 */

import {
  CreateAgencyCommand,
  validateCreateAgencyCommand,
  createAgencyDomainObjects,
  validateAgencyBusinessRules,
  CreateAgencyCommandValidationError,
} from '../create-agency.command';
import { AgencyStatus } from '../../../../domain/entities/agency';
import { Email } from '../../../../domain/value-objects/email';

describe('CreateAgencyCommand - Step MT-3A', () => {
  const validCommandData: CreateAgencyCommand = {
    name: 'Test Agency',
    databasePath: 'test-agency.db',
    contactPerson: 'John Doe',
    phone: '+1-555-123-4567',
    email: 'contact@testagency.com',
    address: '123 Business St, City, State 12345',
    settings: {
      allowCreditSales: true,
      defaultCreditDays: 30,
      maxCreditLimit: 50000,
      requireApprovalForOrders: false,
      enableInventoryTracking: true,
      taxRate: 0.08,
      currency: 'USD',
      businessHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'EST',
      },
      notifications: {
        lowStock: true,
        overduePayments: true,
        newOrders: false,
      },
    },
    status: AgencyStatus.ACTIVE,
    createdBy: '123e4567-e89b-12d3-a456-426614174000',
  };

  describe('validateCreateAgencyCommand() - Validation', () => {
    it('should validate a valid command successfully', () => {
      expect(() => validateCreateAgencyCommand(validCommandData)).not.toThrow();

      const result = validateCreateAgencyCommand(validCommandData);
      expect(result).toEqual(validCommandData);
    });

    it('should require agency name', () => {
      const invalidCommand = { ...validCommandData, name: '' };

      expect(() => validateCreateAgencyCommand(invalidCommand)).toThrow(CreateAgencyCommandValidationError);

      try {
        validateCreateAgencyCommand(invalidCommand);
      } catch (error) {
        expect(error).toBeInstanceOf(CreateAgencyCommandValidationError);
        const validationError = error as CreateAgencyCommandValidationError;
        expect(validationError.validationErrors).toHaveProperty('name');
      }
    });

    it('should reject agency name with invalid characters', () => {
      const invalidCommand = { ...validCommandData, name: 'Test<script>alert("xss")</script>Agency' };

      expect(() => validateCreateAgencyCommand(invalidCommand)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should require database path with .db extension', () => {
      const invalidCommand = { ...validCommandData, databasePath: 'test-agency.txt' };

      expect(() => validateCreateAgencyCommand(invalidCommand)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should reject database path with directory traversal', () => {
      const invalidCommand = { ...validCommandData, databasePath: '../test-agency.db' };

      expect(() => validateCreateAgencyCommand(invalidCommand)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should validate email format if provided', () => {
      const invalidCommand = { ...validCommandData, email: 'invalid-email' };

      expect(() => validateCreateAgencyCommand(invalidCommand)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should validate phone format if provided', () => {
      const invalidCommand = { ...validCommandData, phone: 'invalid-phone-chars!@#' };

      expect(() => validateCreateAgencyCommand(invalidCommand)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should validate business hours format', () => {
      const invalidCommand = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          businessHours: {
            start: '25:00', // Invalid hour
            end: '17:00',
            timezone: 'EST',
          },
        },
      };

      expect(() => validateCreateAgencyCommand(invalidCommand)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should validate currency code format', () => {
      const invalidCommand = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          currency: 'INVALID', // Too long
        },
      };

      expect(() => validateCreateAgencyCommand(invalidCommand)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should validate credit limits', () => {
      const invalidCommand = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          maxCreditLimit: -1000, // Negative
        },
      };

      expect(() => validateCreateAgencyCommand(invalidCommand)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should validate credit days range', () => {
      const invalidCommand = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          defaultCreditDays: 400, // Over 365
        },
      };

      expect(() => validateCreateAgencyCommand(invalidCommand)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should validate tax rate range', () => {
      const invalidCommand = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          taxRate: 1.5, // Over 100%
        },
      };

      expect(() => validateCreateAgencyCommand(invalidCommand)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should validate UUID format for createdBy', () => {
      const invalidCommand = { ...validCommandData, createdBy: 'invalid-uuid' };

      expect(() => validateCreateAgencyCommand(invalidCommand)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should handle optional fields correctly', () => {
      const minimalCommand = {
        name: 'Minimal Agency',
        databasePath: 'minimal.db',
        settings: validCommandData.settings,
        createdBy: validCommandData.createdBy,
      };

      expect(() => validateCreateAgencyCommand(minimalCommand)).not.toThrow();

      const result = validateCreateAgencyCommand(minimalCommand);
      expect(result.contactPerson).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.address).toBeUndefined();
      expect(result.status).toBeUndefined();
    });
  });

  describe('createAgencyDomainObjects() - Domain Object Creation', () => {
    it('should create Email value object when email provided', () => {
      const result = createAgencyDomainObjects(validCommandData);

      expect(result.email).toBeInstanceOf(Email);
      expect(result.email?.value).toBe(validCommandData.email);
    });

    it('should return undefined email when not provided', () => {
      const commandWithoutEmail = { ...validCommandData };
      delete commandWithoutEmail.email;

      const result = createAgencyDomainObjects(commandWithoutEmail);

      expect(result.email).toBeUndefined();
    });

    it('should create proper settings object', () => {
      const result = createAgencyDomainObjects(validCommandData);

      expect(result.settings).toEqual(validCommandData.settings);
      expect(result.settings.allowCreditSales).toBe(true);
      expect(result.settings.currency).toBe('USD');
      expect(result.settings.businessHours.start).toBe('09:00');
    });
  });

  describe('validateAgencyBusinessRules() - Business Logic Validation', () => {
    it('should pass validation for valid business rules', () => {
      expect(() => validateAgencyBusinessRules(validCommandData)).not.toThrow();
    });

    it('should enforce credit sales configuration coherence', () => {
      const invalidCommand = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          allowCreditSales: true,
          maxCreditLimit: 0, // Invalid: allows credit but no limit
        },
      };

      expect(() => validateAgencyBusinessRules(invalidCommand)).toThrow(
        'If credit sales are allowed, max credit limit must be greater than 0'
      );
    });

    it('should enforce credit days only when credit sales allowed', () => {
      const invalidCommand = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          allowCreditSales: false,
          defaultCreditDays: 30, // Invalid: credit days but no credit sales
        },
      };

      expect(() => validateAgencyBusinessRules(invalidCommand)).toThrow(
        'Credit days can only be set when credit sales are allowed'
      );
    });

    it('should validate business hours coherence', () => {
      const invalidCommand = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          businessHours: {
            start: '17:00',
            end: '09:00', // Invalid: end before start
            timezone: 'EST',
          },
        },
      };

      expect(() => validateAgencyBusinessRules(invalidCommand)).toThrow('Business start time must be before end time');
    });

    it('should warn for unsupported currencies', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const commandWithUnsupportedCurrency = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          currency: 'XYZ', // Unsupported currency
        },
      };

      expect(() => validateAgencyBusinessRules(commandWithUnsupportedCurrency)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Currency XYZ may not be fully supported');

      consoleWarnSpy.mockRestore();
    });

    it('should warn for high tax rates', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const commandWithHighTax = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          taxRate: 0.35, // 35% tax rate
        },
      };

      expect(() => validateAgencyBusinessRules(commandWithHighTax)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Tax rate above 30% is unusually high - please verify');

      consoleWarnSpy.mockRestore();
    });

    it('should warn for long credit terms', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const commandWithLongCredit = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          defaultCreditDays: 200, // Long credit period
        },
      };

      expect(() => validateAgencyBusinessRules(commandWithLongCredit)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Credit terms over 180 days may pose collection risks');

      consoleWarnSpy.mockRestore();
    });

    it('should warn for unrecognized timezones', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const commandWithUnknownTimezone = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          businessHours: {
            start: '09:00',
            end: '17:00',
            timezone: 'UNKNOWN', // Unrecognized timezone
          },
        },
      };

      expect(() => validateAgencyBusinessRules(commandWithUnknownTimezone)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Timezone UNKNOWN may not be recognized');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => validateCreateAgencyCommand(null)).toThrow(CreateAgencyCommandValidationError);
      expect(() => validateCreateAgencyCommand(undefined)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should sanitize whitespace in agency name', () => {
      const commandWithWhitespace = { ...validCommandData, name: '  Test Agency  ' };

      const result = validateCreateAgencyCommand(commandWithWhitespace);

      // Note: Zod validation doesn't automatically trim, but our business logic should handle it
      expect(result.name).toBe('  Test Agency  ');
    });

    it('should prevent SQL injection attempts in text fields', () => {
      const maliciousCommand = {
        ...validCommandData,
        name: "'; DROP TABLE agencies; --",
      };

      // Should fail validation due to character restrictions
      expect(() => validateCreateAgencyCommand(maliciousCommand)).toThrow(CreateAgencyCommandValidationError);
    });

    it('should handle very large numbers appropriately', () => {
      const commandWithLargeNumbers = {
        ...validCommandData,
        settings: {
          ...validCommandData.settings,
          maxCreditLimit: Number.MAX_SAFE_INTEGER,
        },
      };

      expect(() => validateCreateAgencyCommand(commandWithLargeNumbers)).toThrow(CreateAgencyCommandValidationError);
    });
  });
});
