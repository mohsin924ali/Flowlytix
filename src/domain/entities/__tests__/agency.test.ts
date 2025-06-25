/**
 * Agency Entity Domain Tests
 * Comprehensive testing for agency business logic and validation
 * Following DDD principles and enterprise standards
 */

import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  Agency,
  AgencyStatus,
  AgencyDomainError,
  AgencyValidationError,
  AgencyBusinessError,
  type CreateAgencyParams,
  type AgencySettings,
} from '../agency';

describe('Agency Entity', () => {
  const validCreateParams: CreateAgencyParams = {
    name: 'Test Agency',
    databasePath: 'test-agency.db',
    contactPerson: 'John Doe',
    phone: '+1234567890',
    email: 'test@agency.com',
    address: '123 Business St, City, State 12345',
  };

  const validSettings: AgencySettings = {
    allowCreditSales: true,
    defaultCreditDays: 30,
    maxCreditLimit: 50000,
    requireApprovalForOrders: false,
    enableInventoryTracking: true,
    taxRate: 0.15,
    currency: 'USD',
    businessHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'UTC',
    },
    notifications: {
      lowStock: true,
      overduePayments: true,
      newOrders: true,
    },
  };

  describe('Agency Creation', () => {
    it('should create a valid agency with all fields', () => {
      const agency = Agency.create(validCreateParams);

      expect(agency).toBeInstanceOf(Agency);
      expect(agency.name).toBe('Test Agency');
      expect(agency.databasePath).toBe('test-agency.db');
      expect(agency.contactPerson).toBe('John Doe');
      expect(agency.phone).toBe('+1234567890');
      expect(agency.address).toBe('123 Business St, City, State 12345');
      expect(agency.status).toBe(AgencyStatus.ACTIVE);
      expect(agency.createdAt).toBeInstanceOf(Date);
      expect(agency.updatedAt).toBeInstanceOf(Date);
    });

    it('should create agency with minimal required fields', () => {
      const minimalParams: CreateAgencyParams = {
        name: 'Minimal Agency',
        databasePath: 'minimal.db',
      };

      const agency = Agency.create(minimalParams);

      expect(agency.name).toBe('Minimal Agency');
      expect(agency.databasePath).toBe('minimal.db');
      expect(agency.contactPerson).toBeUndefined();
      expect(agency.phone).toBeUndefined();
      expect(agency.address).toBeUndefined();
      expect(agency.status).toBe(AgencyStatus.ACTIVE);
    });

    it('should create agency with custom settings', () => {
      const customSettings: Partial<AgencySettings> = {
        allowCreditSales: false,
        defaultCreditDays: 15,
        maxCreditLimit: 25000,
        currency: 'EUR',
      };

      const agency = Agency.create({
        ...validCreateParams,
        settings: customSettings,
      });

      const settings = agency.settings;
      expect(settings.allowCreditSales).toBe(false);
      expect(settings.defaultCreditDays).toBe(15);
      expect(settings.maxCreditLimit).toBe(25000);
      expect(settings.currency).toBe('EUR');
      // Should merge with defaults
      expect(settings.enableInventoryTracking).toBe(true);
    });

    it('should create agency with specific status', () => {
      const agency = Agency.create({
        ...validCreateParams,
        status: AgencyStatus.INACTIVE,
      });

      expect(agency.status).toBe(AgencyStatus.INACTIVE);
    });

    it('should create agency with createdBy user', () => {
      const createdBy = 'user-123';
      const agency = Agency.create(validCreateParams, createdBy);

      expect(agency.createdBy).toBe(createdBy);
    });

    it('should generate unique IDs for multiple agencies', () => {
      const agency1 = Agency.create(validCreateParams);
      const agency2 = Agency.create(validCreateParams);

      expect(agency1.id).not.toBe(agency2.id);
      expect(agency1.id).toMatch(/^agency-\d+-[a-z0-9]{9}$/);
    });

    it('should trim whitespace from string fields', () => {
      const paramsWithWhitespace: CreateAgencyParams = {
        name: '  Test Agency  ',
        databasePath: '  test.db  ',
        contactPerson: '  John Doe  ',
        phone: '  +1234567890  ',
        address: '  123 Test St  ',
      };

      const agency = Agency.create(paramsWithWhitespace);

      expect(agency.name).toBe('Test Agency');
      expect(agency.databasePath).toBe('test.db');
      expect(agency.contactPerson).toBe('John Doe');
      expect(agency.phone).toBe('+1234567890');
      expect(agency.address).toBe('123 Test St');
    });
  });

  describe('Agency Validation', () => {
    describe('Name Validation', () => {
      it('should reject empty name', () => {
        expect(() => Agency.create({ ...validCreateParams, name: '' })).toThrow(AgencyValidationError);
      });

      it('should reject name with only whitespace', () => {
        expect(() => Agency.create({ ...validCreateParams, name: '   ' })).toThrow(AgencyValidationError);
      });

      it('should reject name too short', () => {
        expect(() => Agency.create({ ...validCreateParams, name: 'A' })).toThrow(AgencyValidationError);
      });

      it('should reject name too long', () => {
        const longName = 'A'.repeat(101);
        expect(() => Agency.create({ ...validCreateParams, name: longName })).toThrow(AgencyValidationError);
      });

      it('should accept name at minimum length', () => {
        const agency = Agency.create({ ...validCreateParams, name: 'AB' });
        expect(agency.name).toBe('AB');
      });

      it('should accept name at maximum length', () => {
        const maxName = 'A'.repeat(100);
        const agency = Agency.create({ ...validCreateParams, name: maxName });
        expect(agency.name).toBe(maxName);
      });
    });

    describe('Database Path Validation', () => {
      it('should reject empty database path', () => {
        expect(() => Agency.create({ ...validCreateParams, databasePath: '' })).toThrow(AgencyValidationError);
      });

      it('should reject database path without .db extension', () => {
        expect(() => Agency.create({ ...validCreateParams, databasePath: 'test' })).toThrow(AgencyValidationError);
      });

      it('should reject database path with path traversal', () => {
        expect(() => Agency.create({ ...validCreateParams, databasePath: '../test.db' })).toThrow(
          AgencyValidationError
        );
      });

      it('should reject database path with double slashes', () => {
        expect(() => Agency.create({ ...validCreateParams, databasePath: 'path//test.db' })).toThrow(
          AgencyValidationError
        );
      });

      it('should accept valid database path', () => {
        const agency = Agency.create({ ...validCreateParams, databasePath: 'valid-path.db' });
        expect(agency.databasePath).toBe('valid-path.db');
      });
    });

    describe('Optional Fields Validation', () => {
      it('should reject contact person name too long', () => {
        const longName = 'A'.repeat(101);
        expect(() => Agency.create({ ...validCreateParams, contactPerson: longName })).toThrow(AgencyValidationError);
      });

      it('should reject phone number too long', () => {
        const longPhone = '1'.repeat(21);
        expect(() => Agency.create({ ...validCreateParams, phone: longPhone })).toThrow(AgencyValidationError);
      });

      it('should reject address too long', () => {
        const longAddress = 'A'.repeat(501);
        expect(() => Agency.create({ ...validCreateParams, address: longAddress })).toThrow(AgencyValidationError);
      });

      it('should accept maximum length optional fields', () => {
        const maxContact = 'A'.repeat(100);
        const maxPhone = '1'.repeat(20);
        const maxAddress = 'A'.repeat(500);

        const agency = Agency.create({
          ...validCreateParams,
          contactPerson: maxContact,
          phone: maxPhone,
          address: maxAddress,
        });

        expect(agency.contactPerson).toBe(maxContact);
        expect(agency.phone).toBe(maxPhone);
        expect(agency.address).toBe(maxAddress);
      });
    });

    describe('Status Validation', () => {
      it('should reject invalid status', () => {
        expect(() =>
          Agency.create({
            ...validCreateParams,
            status: 'invalid' as AgencyStatus,
          })
        ).toThrow(AgencyValidationError);
      });

      it('should accept all valid statuses', () => {
        const activeAgency = Agency.create({ ...validCreateParams, status: AgencyStatus.ACTIVE });
        const inactiveAgency = Agency.create({ ...validCreateParams, status: AgencyStatus.INACTIVE });
        const suspendedAgency = Agency.create({ ...validCreateParams, status: AgencyStatus.SUSPENDED });

        expect(activeAgency.status).toBe(AgencyStatus.ACTIVE);
        expect(inactiveAgency.status).toBe(AgencyStatus.INACTIVE);
        expect(suspendedAgency.status).toBe(AgencyStatus.SUSPENDED);
      });
    });
  });

  describe('Settings Validation', () => {
    it('should reject invalid allowCreditSales type', () => {
      expect(() =>
        Agency.create({
          ...validCreateParams,
          settings: { ...validSettings, allowCreditSales: 'true' as any },
        })
      ).toThrow(AgencyValidationError);
    });

    it('should reject invalid defaultCreditDays range', () => {
      expect(() =>
        Agency.create({
          ...validCreateParams,
          settings: { ...validSettings, defaultCreditDays: 0 },
        })
      ).toThrow(AgencyValidationError);

      expect(() =>
        Agency.create({
          ...validCreateParams,
          settings: { ...validSettings, defaultCreditDays: 366 },
        })
      ).toThrow(AgencyValidationError);
    });

    it('should reject invalid maxCreditLimit range', () => {
      expect(() =>
        Agency.create({
          ...validCreateParams,
          settings: { ...validSettings, maxCreditLimit: -1 },
        })
      ).toThrow(AgencyValidationError);

      expect(() =>
        Agency.create({
          ...validCreateParams,
          settings: { ...validSettings, maxCreditLimit: 1000001 },
        })
      ).toThrow(AgencyValidationError);
    });

    it('should reject invalid taxRate range', () => {
      expect(() =>
        Agency.create({
          ...validCreateParams,
          settings: { ...validSettings, taxRate: -0.1 },
        })
      ).toThrow(AgencyValidationError);

      expect(() =>
        Agency.create({
          ...validCreateParams,
          settings: { ...validSettings, taxRate: 1.1 },
        })
      ).toThrow(AgencyValidationError);
    });

    it('should reject invalid currency format', () => {
      expect(() =>
        Agency.create({
          ...validCreateParams,
          settings: { ...validSettings, currency: 'US' },
        })
      ).toThrow(AgencyValidationError);

      expect(() =>
        Agency.create({
          ...validCreateParams,
          settings: { ...validSettings, currency: 'USDD' },
        })
      ).toThrow(AgencyValidationError);
    });

    it('should accept valid settings boundary values', () => {
      const boundarySettings: AgencySettings = {
        ...validSettings,
        defaultCreditDays: 1,
        maxCreditLimit: 0,
        taxRate: 0,
      };

      const agency = Agency.create({
        ...validCreateParams,
        settings: boundarySettings,
      });

      expect(agency.settings.defaultCreditDays).toBe(1);
      expect(agency.settings.maxCreditLimit).toBe(0);
      expect(agency.settings.taxRate).toBe(0);
    });
  });

  describe('Business Logic Methods', () => {
    let agency: Agency;

    beforeEach(() => {
      agency = Agency.create(validCreateParams);
    });

    describe('Status Management', () => {
      it('should activate inactive agency', () => {
        const inactiveAgency = Agency.create({ ...validCreateParams, status: AgencyStatus.INACTIVE });

        inactiveAgency.activate();

        expect(inactiveAgency.status).toBe(AgencyStatus.ACTIVE);
      });

      it('should throw error when activating already active agency', () => {
        expect(() => agency.activate()).toThrow(AgencyBusinessError);
      });

      it('should deactivate active agency', () => {
        agency.deactivate();

        expect(agency.status).toBe(AgencyStatus.INACTIVE);
      });

      it('should throw error when deactivating already inactive agency', () => {
        agency.deactivate();

        expect(() => agency.deactivate()).toThrow(AgencyBusinessError);
      });

      it('should not allow deactivation of suspended agency', () => {
        agency.suspend();

        expect(() => agency.deactivate()).toThrow(AgencyBusinessError);
      });

      it('should suspend active agency', () => {
        agency.suspend();

        expect(agency.status).toBe(AgencyStatus.SUSPENDED);
      });

      it('should throw error when suspending already suspended agency', () => {
        agency.suspend();

        expect(() => agency.suspend()).toThrow(AgencyBusinessError);
      });

      it('should unsuspend suspended agency', () => {
        agency.suspend();
        agency.unsuspend();

        expect(agency.status).toBe(AgencyStatus.ACTIVE);
      });

      it('should throw error when unsuspending non-suspended agency', () => {
        expect(() => agency.unsuspend()).toThrow(AgencyBusinessError);
      });
    });

    describe('Information Updates', () => {
      it('should update basic information', () => {
        const updates = {
          name: 'Updated Agency',
          contactPerson: 'Jane Smith',
          phone: '+9876543210',
          address: 'New Address',
        };

        agency.updateBasicInfo(updates);

        expect(agency.name).toBe('Updated Agency');
        expect(agency.contactPerson).toBe('Jane Smith');
        expect(agency.phone).toBe('+9876543210');
        expect(agency.address).toBe('New Address');
      });

      it('should update partial information', () => {
        const originalName = agency.name;

        agency.updateBasicInfo({ name: 'New Name Only' });

        expect(agency.name).toBe('New Name Only');
        expect(agency.contactPerson).toBe(validCreateParams.contactPerson);
      });

      it('should not allow updates to suspended agency', () => {
        agency.suspend();

        expect(() => agency.updateBasicInfo({ name: 'New Name' })).toThrow(AgencyBusinessError);
      });

      it('should validate updates during information update', () => {
        expect(() => agency.updateBasicInfo({ name: '' })).toThrow(AgencyValidationError);
      });

      it('should update settings', () => {
        const settingsUpdate = {
          allowCreditSales: false,
          defaultCreditDays: 15,
        };

        agency.updateSettings(settingsUpdate);

        expect(agency.settings.allowCreditSales).toBe(false);
        expect(agency.settings.defaultCreditDays).toBe(15);
        // Other settings should remain unchanged
        expect(agency.settings.enableInventoryTracking).toBe(true);
      });

      it('should not allow settings updates to suspended agency', () => {
        agency.suspend();

        expect(() => agency.updateSettings({ allowCreditSales: false })).toThrow(AgencyBusinessError);
      });

      it('should validate settings during update', () => {
        expect(() => agency.updateSettings({ taxRate: -0.1 })).toThrow(AgencyValidationError);
      });
    });

    describe('Business Query Methods', () => {
      it('should check if agency is operational', () => {
        expect(agency.isOperational()).toBe(true);

        agency.deactivate();
        expect(agency.isOperational()).toBe(false);

        agency.activate();
        agency.suspend();
        expect(agency.isOperational()).toBe(false);
      });

      it('should check if credit sales are allowed', () => {
        expect(agency.allowsCreditSales()).toBe(true);

        agency.updateSettings({ allowCreditSales: false });
        expect(agency.allowsCreditSales()).toBe(false);

        agency.updateSettings({ allowCreditSales: true });
        agency.suspend();
        expect(agency.allowsCreditSales()).toBe(false);
      });

      it('should get business settings values', () => {
        expect(agency.getMaxCreditLimit()).toBe(50000);
        expect(agency.getDefaultCreditDays()).toBe(30);
        expect(agency.hasInventoryTracking()).toBe(true);
        expect(agency.getTaxRate()).toBe(0.15);
      });
    });
  });

  describe('Data Export Methods', () => {
    let agency: Agency;

    beforeEach(() => {
      agency = Agency.create(validCreateParams);
    });

    describe('Display Information', () => {
      it('should provide safe display information', () => {
        const displayInfo = agency.getDisplayInfo();

        expect(displayInfo).toEqual({
          id: agency.id,
          name: 'Test Agency',
          contactPerson: 'John Doe',
          phone: '+1234567890',
          email: undefined, // Email value object not implemented yet
          address: '123 Business St, City, State 12345',
          status: AgencyStatus.ACTIVE,
          isOperational: true,
          allowsCreditSales: true,
          currency: 'USD',
          createdAt: agency.createdAt,
          updatedAt: agency.updatedAt,
        });
      });

      it('should handle undefined optional fields in display info', () => {
        const minimalAgency = Agency.create({
          name: 'Minimal Agency',
          databasePath: 'minimal.db',
        });

        const displayInfo = minimalAgency.getDisplayInfo();

        expect(displayInfo.contactPerson).toBeUndefined();
        expect(displayInfo.phone).toBeUndefined();
        expect(displayInfo.email).toBeUndefined();
        expect(displayInfo.address).toBeUndefined();
      });
    });

    describe('Persistence Data', () => {
      it('should provide persistence data with JSON settings', () => {
        const persistenceData = agency.toPersistence();

        expect(persistenceData.id).toBe(agency.id);
        expect(persistenceData.name).toBe('Test Agency');
        expect(persistenceData.databasePath).toBe('test-agency.db');
        expect(persistenceData.settings).toBe(JSON.stringify(agency.settings));
        expect(persistenceData.status).toBe(AgencyStatus.ACTIVE);
        expect(persistenceData.createdAt).toBeInstanceOf(Date);
        expect(persistenceData.updatedAt).toBeInstanceOf(Date);
      });

      it('should handle undefined optional fields in persistence', () => {
        const minimalAgency = Agency.create({
          name: 'Minimal Agency',
          databasePath: 'minimal.db',
        });

        const persistenceData = minimalAgency.toPersistence();

        expect(persistenceData.contactPerson).toBeUndefined();
        expect(persistenceData.phone).toBeUndefined();
        expect(persistenceData.email).toBeUndefined();
        expect(persistenceData.address).toBeUndefined();
        expect(persistenceData.createdBy).toBeUndefined();
      });
    });
  });

  describe('Persistence Reconstruction', () => {
    it('should reconstruct agency from persistence data', () => {
      const originalAgency = Agency.create(validCreateParams, 'user-123');
      const persistenceData = originalAgency.toPersistence();

      const reconstructedAgency = Agency.fromPersistence(persistenceData);

      expect(reconstructedAgency.id).toBe(originalAgency.id);
      expect(reconstructedAgency.name).toBe(originalAgency.name);
      expect(reconstructedAgency.databasePath).toBe(originalAgency.databasePath);
      expect(reconstructedAgency.contactPerson).toBe(originalAgency.contactPerson);
      expect(reconstructedAgency.status).toBe(originalAgency.status);
      expect(reconstructedAgency.createdBy).toBe(originalAgency.createdBy);
      expect(reconstructedAgency.settings).toEqual(originalAgency.settings);
    });

    it('should handle minimal persistence data', () => {
      const persistenceData = {
        id: 'agency-123',
        name: 'Test Agency',
        databasePath: 'test.db',
        contactPerson: undefined,
        phone: undefined,
        email: undefined,
        address: undefined,
        settings: JSON.stringify(validSettings),
        status: AgencyStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: undefined,
      };

      const agency = Agency.fromPersistence(persistenceData);

      expect(agency.id).toBe('agency-123');
      expect(agency.contactPerson).toBeUndefined();
      expect(agency.phone).toBeUndefined();
      expect(agency.address).toBeUndefined();
      expect(agency.createdBy).toBeUndefined();
    });

    it('should throw error for invalid JSON settings', () => {
      const persistenceData = {
        id: 'agency-123',
        name: 'Test Agency',
        databasePath: 'test.db',
        contactPerson: undefined,
        phone: undefined,
        email: undefined,
        address: undefined,
        settings: 'invalid-json',
        status: AgencyStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: undefined,
      };

      expect(() => Agency.fromPersistence(persistenceData)).toThrow(AgencyValidationError);
    });
  });

  describe('Entity Behavior', () => {
    it('should allow controlled mutation through business methods', () => {
      const agency = Agency.create(validCreateParams);

      // Direct property access should be possible but controlled through business methods
      agency.updateBasicInfo({ name: 'Updated Name' });
      expect(agency.name).toBe('Updated Name');
    });

    it('should return frozen settings object', () => {
      const agency = Agency.create(validCreateParams);
      const settings = agency.settings;

      expect(Object.isFrozen(settings)).toBe(true);
      expect(() => {
        (settings as any).allowCreditSales = false;
      }).toThrow();
    });

    it('should return new Date objects for timestamps', () => {
      const agency = Agency.create(validCreateParams);
      const createdAt1 = agency.createdAt;
      const createdAt2 = agency.createdAt;

      expect(createdAt1).not.toBe(createdAt2);
      expect(createdAt1.getTime()).toBe(createdAt2.getTime());
    });
  });

  describe('Error Handling', () => {
    it('should throw specific error types', () => {
      // Validation errors
      expect(() => Agency.create({ ...validCreateParams, name: '' })).toThrow(AgencyValidationError);

      // Business errors
      const agency = Agency.create(validCreateParams);
      expect(() => agency.activate()).toThrow(AgencyBusinessError);

      // Domain errors (base class)
      expect(() => Agency.create({ ...validCreateParams, name: '' })).toThrow(AgencyDomainError);
    });

    it('should provide detailed error messages', () => {
      try {
        Agency.create({ ...validCreateParams, name: '' });
      } catch (error) {
        expect(error).toBeInstanceOf(AgencyValidationError);
        expect((error as AgencyValidationError).message).toContain('name');
      }
    });
  });
});
