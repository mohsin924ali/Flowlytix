/**
 * Create Customer Command Tests
 *
 * Comprehensive test suite for customer creation command validation,
 * business rules enforcement, and domain object creation.
 * Ensures 90%+ test coverage following TDD principles.
 *
 * @domain Customer Management
 * @pattern CQRS Command Testing
 * @version 1.0.0
 */

import {
  CreateCustomerCommand,
  CreateCustomerCommandSchema,
  CreateCustomerCommandValidationError,
  validateCreateCustomerCommand,
  createCustomerDomainObjects,
  validateCustomerBusinessRules,
} from '../create-customer.command';
import { CustomerType, PaymentTerms } from '../../../../domain/entities/customer';
import { CurrencyCode } from '../../../../domain/value-objects/money';

describe('CreateCustomerCommand', () => {
  const validCommand: CreateCustomerCommand = {
    customerCode: 'CUST001',
    firstName: 'John',
    lastName: 'Doe',
    customerType: CustomerType.RETAIL,
    email: 'john.doe@example.com',
    addresses: [
      {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        isDefault: true,
      },
    ],
    creditLimit: 5000,
    creditLimitCurrency: 'USD' as const,
    paymentTerms: PaymentTerms.NET_30,
    agencyId: '550e8400-e29b-41d4-a716-446655440000',
    requestedBy: '550e8400-e29b-41d4-a716-446655440001',
  };

  it('should validate a complete valid command', () => {
    const result = validateCreateCustomerCommand(validCommand);
    expect(result).toEqual(validCommand);
  });

  it('should validate command with optional fields', () => {
    const commandWithOptionals: CreateCustomerCommand = {
      ...validCommand,
      companyName: 'Acme Corp',
      phone: '+1-555-0123',
      mobile: '+1-555-0124',
      contacts: [
        {
          name: 'Jane Smith',
          title: 'Manager',
          email: 'jane@acme.com',
          phone: '+1-555-0125',
          isPrimary: true,
        },
      ],
      taxNumber: 'TAX123456',
      website: 'https://acme.com',
      notes: 'Important customer',
    };

    const result = validateCreateCustomerCommand(commandWithOptionals);
    expect(result).toEqual(commandWithOptionals);
  });

  describe('Required Field Validation', () => {
    it('should reject command without customer code', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).customerCode;

      expect(() => validateCreateCustomerCommand(invalidCommand)).toThrow(CreateCustomerCommandValidationError);
    });

    it('should reject command without first name', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).firstName;

      expect(() => validateCreateCustomerCommand(invalidCommand)).toThrow(CreateCustomerCommandValidationError);
    });

    it('should reject command without last name', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).lastName;

      expect(() => validateCreateCustomerCommand(invalidCommand)).toThrow(CreateCustomerCommandValidationError);
    });

    it('should reject command without email', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).email;

      expect(() => validateCreateCustomerCommand(invalidCommand)).toThrow(CreateCustomerCommandValidationError);
    });

    it('should reject command without addresses', () => {
      const invalidCommand = { ...validCommand };
      delete (invalidCommand as any).addresses;

      expect(() => validateCreateCustomerCommand(invalidCommand)).toThrow(CreateCustomerCommandValidationError);
    });

    it('should reject command with empty addresses array', () => {
      const invalidCommand = { ...validCommand, addresses: [] };

      expect(() => validateCreateCustomerCommand(invalidCommand)).toThrow(CreateCustomerCommandValidationError);
    });
  });

  describe('Customer Code Validation', () => {
    it('should accept valid customer codes', () => {
      const validCodes = ['A', 'CUST001', 'ABC-123', 'CUSTOMER_001', 'C1'];

      validCodes.forEach((code) => {
        const command = { ...validCommand, customerCode: code };
        expect(() => validateCreateCustomerCommand(command)).not.toThrow();
      });
    });

    it('should reject invalid customer codes', () => {
      const invalidCodes = [
        '', // Empty
        'a', // Lowercase
        'CUST-', // Ends with hyphen
        '-CUST', // Starts with hyphen
        'CUST 001', // Contains space
        'CUST@001', // Contains special character
      ];

      invalidCodes.forEach((code) => {
        const command = { ...validCommand, customerCode: code };
        expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
      });
    });

    it('should reject customer code that is too long', () => {
      const longCode = 'A'.repeat(51);
      const command = { ...validCommand, customerCode: longCode };

      expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
    });
  });

  describe('Name Validation', () => {
    it('should accept valid names with special characters', () => {
      const validNames = ["O'Connor", 'Jean-Pierre', 'Mary Jane', 'José'];

      validNames.forEach((name) => {
        const command = { ...validCommand, firstName: name, lastName: name };
        expect(() => validateCreateCustomerCommand(command)).not.toThrow();
      });
    });

    it('should reject names with invalid characters', () => {
      const invalidNames = ['John123', 'Jane@Doe', 'Test#Name'];

      invalidNames.forEach((name) => {
        const command = { ...validCommand, firstName: name };
        expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
      });
    });

    it('should reject names that are too long', () => {
      const longName = 'A'.repeat(101);
      const command = { ...validCommand, firstName: longName };

      expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email formats', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'test+tag@example.org'];

      validEmails.forEach((email) => {
        const command = { ...validCommand, email };
        expect(() => validateCreateCustomerCommand(command)).not.toThrow();
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = ['invalid-email', '@example.com', 'test@', 'test..test@example.com'];

      invalidEmails.forEach((email) => {
        const command = { ...validCommand, email };
        expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
      });
    });
  });

  describe('Phone Number Validation', () => {
    it('should accept valid phone formats', () => {
      const validPhones = ['+1-555-0123', '(555) 123-4567', '555.123.4567', '+44 20 7946 0958'];

      validPhones.forEach((phone) => {
        const command = { ...validCommand, phone };
        expect(() => validateCreateCustomerCommand(command)).not.toThrow();
      });
    });

    it('should reject phone numbers with invalid characters', () => {
      const invalidPhones = ['555-ABC-1234', 'phone#123', '555@123.4567'];

      invalidPhones.forEach((phone) => {
        const command = { ...validCommand, phone };
        expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
      });
    });
  });

  describe('Credit Limit Validation', () => {
    it('should accept valid credit limits', () => {
      const validLimits = [0, 1000, 5000.5, 999999];

      validLimits.forEach((creditLimit) => {
        const command = { ...validCommand, creditLimit };
        expect(() => validateCreateCustomerCommand(command)).not.toThrow();
      });
    });

    it('should reject negative credit limits', () => {
      const command = { ...validCommand, creditLimit: -100 };

      expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
    });

    it('should reject credit limits that are too high', () => {
      const command = { ...validCommand, creditLimit: 10000001 };

      expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
    });

    it('should reject infinite credit limits', () => {
      const command = { ...validCommand, creditLimit: Infinity };

      expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
    });
  });

  describe('Address Validation', () => {
    it('should validate complete address', () => {
      const validAddress = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        isDefault: true,
        addressType: 'BILLING' as const,
      };

      const command = { ...validCommand, addresses: [validAddress] };
      expect(() => validateCreateCustomerCommand(command)).not.toThrow();
    });

    it('should reject address with missing required fields', () => {
      const invalidAddress = {
        street: '123 Main St',
        city: 'New York',
        // Missing state, zipCode, country
      };

      const command = { ...validCommand, addresses: [invalidAddress as any] };
      expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
    });

    it('should reject too many addresses', () => {
      const manyAddresses = Array(11).fill(validCommand.addresses[0]);
      const command = { ...validCommand, addresses: manyAddresses };

      expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
    });
  });

  describe('UUID Validation', () => {
    it('should reject invalid agency ID format', () => {
      const command = { ...validCommand, agencyId: 'invalid-uuid' };

      expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
    });

    it('should reject invalid requestedBy ID format', () => {
      const command = { ...validCommand, requestedBy: 'invalid-uuid' };

      expect(() => validateCreateCustomerCommand(command)).toThrow(CreateCustomerCommandValidationError);
    });
  });

  it('should create domain objects from valid command', () => {
    const result = createCustomerDomainObjects(validCommand);
    expect(result.email.value).toBe('john.doe@example.com');
    expect(result.creditLimit.decimalAmount).toBe(5000);
  });

  it('should validate business rules', () => {
    expect(() => validateCustomerBusinessRules(validCommand)).not.toThrow();
  });

  describe('Error Handling', () => {
    it('should provide detailed validation errors', () => {
      const invalidCommand = {
        customerCode: '',
        firstName: '',
        lastName: '',
        email: 'invalid-email',
        creditLimit: -100,
      };

      try {
        validateCreateCustomerCommand(invalidCommand);
        fail('Expected validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(CreateCustomerCommandValidationError);
        const validationError = error as CreateCustomerCommandValidationError;
        expect(Object.keys(validationError.validationErrors)).toContain('customerCode');
        expect(Object.keys(validationError.validationErrors)).toContain('firstName');
        expect(Object.keys(validationError.validationErrors)).toContain('email');
        expect(Object.keys(validationError.validationErrors)).toContain('creditLimit');
      }
    });

    it('should handle unexpected validation errors', () => {
      const invalidInput = null;

      expect(() => validateCreateCustomerCommand(invalidInput)).toThrow();
    });
  });
});
