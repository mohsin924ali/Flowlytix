/**
 * Update Agency Command Tests
 *
 * Comprehensive test suite for UpdateAgencyCommand validation and business rules.
 * Tests cover all validation scenarios, business rules, and edge cases.
 *
 * @domain Agency Management
 * @pattern CQRS Command Testing
 * @architecture Multi-tenant
 * @version 1.0.0
 */

import {
  UpdateAgencyCommand,
  UpdateAgencyCommandSchema,
  validateUpdateAgencyCommand,
  createUpdateAgencyDomainObjects,
  validateUpdateAgencyBusinessRules,
  UpdateAgencyCommandValidationError,
} from '../update-agency.command';
import { AgencyStatus } from '../../../../domain/entities/agency';

describe('UpdateAgencyCommand - Step MT-5A', () => {
  // Valid test data
  const validCommand: UpdateAgencyCommand = {
    agencyId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Updated Test Agency',
    contactPerson: 'Jane Doe',
    phone: '+1-555-0123',
    email: 'jane@testagency.com',
    address: '456 Updated St, Test City, TC 12345',
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
        timezone: 'America/New_York',
      },
      notifications: {
        lowStock: true,
        overduePayments: true,
        newOrders: false,
      },
    },
    status: AgencyStatus.ACTIVE,
    updatedBy: '550e8400-e29b-41d4-a716-446655440001',
    reason: 'Updating agency information',
  };

  describe('validateUpdateAgencyCommand() - Schema Validation', () => {
    describe('Valid Commands', () => {
      it('should validate a complete valid command', () => {
        expect(() => validateUpdateAgencyCommand(validCommand)).not.toThrow();
      });

      it('should validate minimal update command (only required fields)', () => {
        const minimalCommand = {
          agencyId: '550e8400-e29b-41d4-a716-446655440000',
          updatedBy: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Updated Name',
        };

        expect(() => validateUpdateAgencyCommand(minimalCommand)).not.toThrow();
      });

      it('should validate partial settings update', () => {
        const partialCommand = {
          agencyId: '550e8400-e29b-41d4-a716-446655440000',
          updatedBy: '550e8400-e29b-41d4-a716-446655440001',
          settings: {
            allowCreditSales: false,
            defaultCreditDays: 1,
            maxCreditLimit: 0,
            requireApprovalForOrders: true,
            enableInventoryTracking: false,
            taxRate: 0.05,
            currency: 'USD',
            businessHours: {
              start: '08:00',
              end: '18:00',
              timezone: 'UTC',
            },
            notifications: {
              lowStock: false,
              overduePayments: false,
              newOrders: false,
            },
          },
        };

        expect(() => validateUpdateAgencyCommand(partialCommand)).not.toThrow();
      });

      it('should validate status-only update', () => {
        const statusCommand = {
          agencyId: '550e8400-e29b-41d4-a716-446655440000',
          updatedBy: '550e8400-e29b-41d4-a716-446655440001',
          status: AgencyStatus.INACTIVE,
        };

        expect(() => validateUpdateAgencyCommand(statusCommand)).not.toThrow();
      });

      it('should validate nullable fields', () => {
        const nullableCommand = {
          agencyId: '550e8400-e29b-41d4-a716-446655440000',
          updatedBy: '550e8400-e29b-41d4-a716-446655440001',
          contactPerson: null,
          phone: null,
          email: null,
          address: null,
        };

        expect(() => validateUpdateAgencyCommand(nullableCommand)).not.toThrow();
      });
    });

    describe('Required Fields Validation', () => {
      it('should require agencyId', () => {
        const invalidCommand = { ...validCommand };
        delete (invalidCommand as any).agencyId;

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should require updatedBy', () => {
        const invalidCommand = { ...validCommand };
        delete (invalidCommand as any).updatedBy;

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });
    });

    describe('UUID Format Validation', () => {
      it('should reject invalid agencyId format', () => {
        const invalidCommand = {
          ...validCommand,
          agencyId: 'invalid-uuid',
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should reject invalid updatedBy format', () => {
        const invalidCommand = {
          ...validCommand,
          updatedBy: 'invalid-uuid',
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should accept valid UUID formats', () => {
        const validUuids = [
          '550e8400-e29b-41d4-a716-446655440000',
          'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        ];

        validUuids.forEach((uuid) => {
          const command = {
            ...validCommand,
            agencyId: uuid,
            updatedBy: uuid,
          };

          expect(() => validateUpdateAgencyCommand(command)).not.toThrow();
        });
      });
    });

    describe('Name Validation', () => {
      it('should reject name too short', () => {
        const invalidCommand = {
          ...validCommand,
          name: 'A',
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should reject name too long', () => {
        const invalidCommand = {
          ...validCommand,
          name: 'A'.repeat(101),
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should reject name with invalid characters', () => {
        const invalidCommand = {
          ...validCommand,
          name: 'Test Agency <script>',
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should accept valid name lengths', () => {
        const validNames = ['AB', 'A'.repeat(100)];

        validNames.forEach((name) => {
          const command = { ...validCommand, name };
          expect(() => validateUpdateAgencyCommand(command)).not.toThrow();
        });
      });
    });

    describe('Contact Information Validation', () => {
      it('should reject contact person name too long', () => {
        const invalidCommand = {
          ...validCommand,
          contactPerson: 'A'.repeat(101),
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should reject phone number too long', () => {
        const invalidCommand = {
          ...validCommand,
          phone: '1'.repeat(21),
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should reject invalid email format', () => {
        const invalidCommand = {
          ...validCommand,
          email: 'invalid-email',
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should reject address too long', () => {
        const invalidCommand = {
          ...validCommand,
          address: 'A'.repeat(501),
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should accept valid contact information', () => {
        const testCommand = {
          ...validCommand,
          contactPerson: 'John Doe-Smith',
          phone: '+1 (555) 123-4567',
          email: 'john@example.com',
          address: '123 Main St, Suite 100, City, State 12345',
        };

        expect(() => validateUpdateAgencyCommand(testCommand)).not.toThrow();
      });
    });

    describe('Settings Validation', () => {
      it('should reject invalid credit days range', () => {
        const invalidCommand = {
          ...validCommand,
          settings: {
            ...validCommand.settings!,
            defaultCreditDays: 0,
          },
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should reject invalid tax rate range', () => {
        const invalidCommand = {
          ...validCommand,
          settings: {
            ...validCommand.settings!,
            taxRate: 1.5,
          },
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should reject invalid currency format', () => {
        const invalidCommand = {
          ...validCommand,
          settings: {
            ...validCommand.settings!,
            currency: 'usd',
          },
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should reject invalid business hours format', () => {
        const invalidCommand = {
          ...validCommand,
          settings: {
            ...validCommand.settings!,
            businessHours: {
              start: '25:00',
              end: '17:00',
              timezone: 'UTC',
            },
          },
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should accept valid settings boundary values', () => {
        const validSettings = {
          allowCreditSales: false,
          defaultCreditDays: 1,
          maxCreditLimit: 0,
          requireApprovalForOrders: true,
          enableInventoryTracking: false,
          taxRate: 0,
          currency: 'EUR',
          businessHours: {
            start: '00:00',
            end: '23:59',
            timezone: 'UTC',
          },
          notifications: {
            lowStock: false,
            overduePayments: false,
            newOrders: false,
          },
        };

        const command = { ...validCommand, settings: validSettings };
        expect(() => validateUpdateAgencyCommand(command)).not.toThrow();
      });
    });

    describe('Status Validation', () => {
      it('should reject invalid status', () => {
        const invalidCommand = {
          ...validCommand,
          status: 'invalid-status' as any,
        };

        expect(() => validateUpdateAgencyCommand(invalidCommand)).toThrow(UpdateAgencyCommandValidationError);
      });

      it('should accept all valid statuses', () => {
        const validStatuses = [AgencyStatus.ACTIVE, AgencyStatus.INACTIVE, AgencyStatus.SUSPENDED];

        validStatuses.forEach((status) => {
          const command = { ...validCommand, status };
          expect(() => validateUpdateAgencyCommand(command)).not.toThrow();
        });
      });
    });
  });

  describe('validateUpdateAgencyBusinessRules() - Business Logic Validation', () => {
    describe('Business Hours Validation', () => {
      it('should enforce start time before end time', () => {
        const invalidCommand = {
          ...validCommand,
          settings: {
            ...validCommand.settings!,
            businessHours: {
              start: '18:00',
              end: '09:00',
              timezone: 'UTC',
            },
          },
        };

        expect(() => validateUpdateAgencyBusinessRules(invalidCommand)).toThrow(
          'Business start time must be before end time'
        );
      });

      it('should allow valid business hours', () => {
        const testCommand = {
          ...validCommand,
          settings: {
            ...validCommand.settings!,
            businessHours: {
              start: '08:00',
              end: '18:00',
              timezone: 'UTC',
            },
          },
        };

        expect(() => validateUpdateAgencyBusinessRules(testCommand)).not.toThrow();
      });
    });

    describe('Credit Sales Business Rules', () => {
      it('should enforce credit days consistency when credit sales disabled', () => {
        const invalidCommand = {
          ...validCommand,
          settings: {
            ...validCommand.settings!,
            allowCreditSales: false,
            defaultCreditDays: 30,
          },
        };

        expect(() => validateUpdateAgencyBusinessRules(invalidCommand)).toThrow(
          'Credit days should be 1 when credit sales are disabled'
        );
      });

      it('should allow credit days > 1 when credit sales enabled', () => {
        const testCommand = {
          ...validCommand,
          settings: {
            ...validCommand.settings!,
            allowCreditSales: true,
            defaultCreditDays: 30,
          },
        };

        expect(() => validateUpdateAgencyBusinessRules(testCommand)).not.toThrow();
      });
    });

    describe('Update Requirements', () => {
      it('should require at least one field for update', () => {
        const emptyCommand = {
          agencyId: '550e8400-e29b-41d4-a716-446655440000',
          updatedBy: '550e8400-e29b-41d4-a716-446655440001',
        };

        expect(() => validateUpdateAgencyBusinessRules(emptyCommand)).toThrow(
          'At least one field must be provided for update'
        );
      });

      it('should allow updates with any single field', () => {
        const updateFields = [
          { name: 'Updated Name' },
          { contactPerson: 'New Contact' },
          { phone: '+1-555-9999' },
          { email: 'new@email.com' },
          { address: 'New Address' },
          { status: AgencyStatus.INACTIVE },
        ];

        updateFields.forEach((field) => {
          const command = {
            agencyId: '550e8400-e29b-41d4-a716-446655440000',
            updatedBy: '550e8400-e29b-41d4-a716-446655440001',
            ...field,
          };

          expect(() => validateUpdateAgencyBusinessRules(command)).not.toThrow();
        });
      });
    });
  });

  describe('createUpdateAgencyDomainObjects() - Domain Object Creation', () => {
    it('should create Email value object when email provided', () => {
      const command = {
        ...validCommand,
        email: 'test@example.com',
      };

      const { email } = createUpdateAgencyDomainObjects(command);

      expect(email).toBeDefined();
      expect(email?.value).toBe('test@example.com');
    });

    it('should handle null email', () => {
      const command = {
        ...validCommand,
        email: null,
      };

      const { email } = createUpdateAgencyDomainObjects(command);

      expect(email).toBeNull();
    });

    it('should handle undefined email', () => {
      const command = { ...validCommand };
      delete (command as any).email;

      const { email } = createUpdateAgencyDomainObjects(command);

      expect(email).toBeUndefined();
    });

    it('should create settings object when provided', () => {
      const { settings } = createUpdateAgencyDomainObjects(validCommand);

      expect(settings).toBeDefined();
      expect(settings?.allowCreditSales).toBe(true);
      expect(settings?.currency).toBe('USD');
    });

    it('should handle undefined settings', () => {
      const command = { ...validCommand };
      delete (command as any).settings;

      const { settings } = createUpdateAgencyDomainObjects(command);

      expect(settings).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed validation errors', () => {
      const invalidCommand = {
        agencyId: 'invalid',
        updatedBy: 'invalid',
        name: 'A',
        email: 'invalid-email',
      };

      try {
        validateUpdateAgencyCommand(invalidCommand);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(UpdateAgencyCommandValidationError);
        const validationError = error as UpdateAgencyCommandValidationError;
        expect(validationError.validationErrors).toBeDefined();
        expect(Object.keys(validationError.validationErrors).length).toBeGreaterThan(0);
      }
    });

    it('should have proper error inheritance', () => {
      const error = new UpdateAgencyCommandValidationError('Test error', {});

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(UpdateAgencyCommandValidationError);
      expect(error.name).toBe('UpdateAgencyCommandValidationError');
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should enforce correct command structure', () => {
      // This test verifies TypeScript compilation
      const command: UpdateAgencyCommand = {
        agencyId: '550e8400-e29b-41d4-a716-446655440000',
        updatedBy: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Agency',
      };

      expect(command.agencyId).toBeDefined();
      expect(command.updatedBy).toBeDefined();
    });

    it('should support optional fields', () => {
      // This test verifies TypeScript compilation for optional fields
      const minimalCommand: UpdateAgencyCommand = {
        agencyId: '550e8400-e29b-41d4-a716-446655440000',
        updatedBy: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test',
      };

      const fullCommand: UpdateAgencyCommand = {
        ...minimalCommand,
        contactPerson: 'John Doe',
        phone: '+1-555-0123',
        email: 'john@example.com',
        address: '123 Main St',
        settings: validCommand.settings!,
        status: AgencyStatus.ACTIVE,
        reason: 'Update reason',
      };

      expect(minimalCommand).toBeDefined();
      expect(fullCommand).toBeDefined();
    });
  });
});
