/**
 * Update Customer Handler Tests
 *
 * Comprehensive test suite for UpdateCustomerHandler following established patterns.
 * Tests all business rules, error cases, and success scenarios.
 *
 * @domain Customer Management
 * @pattern Command Handler Tests
 * @version 1.0.0
 */

import { UpdateCustomerHandler } from '../update-customer.handler';
import {
  UpdateCustomerCommand,
  UpdateCustomerCommandValidationError,
} from '../../../commands/customer/update-customer.command';
import { Customer, CustomerType, CustomerStatus, PaymentTerms } from '../../../../domain/entities/customer';
import { ICustomerRepository } from '../../../../domain/repositories/customer.repository';
import { IUserRepository } from '../../../../domain/repositories/user.repository';
import { Permission, Role } from '../../../../domain/value-objects/role';
import { Money } from '../../../../domain/value-objects/money';
import { Email } from '../../../../domain/value-objects/email';

// Mock repositories
const mockCustomerRepository: jest.Mocked<ICustomerRepository> = {
  save: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  findByCustomerCode: jest.fn(),
  findByEmail: jest.fn(),
  existsByCustomerCode: jest.fn(),
  existsByEmail: jest.fn(),
  search: jest.fn(),
  findAll: jest.fn(),
  findByStatus: jest.fn(),
  findByType: jest.fn(),
  findWithOverduePayments: jest.fn(),
  findHighValueCustomers: jest.fn(),
  findByLocation: jest.fn(),
  count: jest.fn(),
  countByCriteria: jest.fn(),
  delete: jest.fn(),
  getStats: jest.fn(),
  isHealthy: jest.fn(),
  beginTransaction: jest.fn(),
};

const mockUserRepository: jest.Mocked<IUserRepository> = {
  save: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  existsByEmail: jest.fn(),
  search: jest.fn(),
  findAll: jest.fn(),
  findByRole: jest.fn(),
  findByStatus: jest.fn(),
  findLockedUsers: jest.fn(),
  count: jest.fn(),
  countByCriteria: jest.fn(),
  delete: jest.fn(),
  getStats: jest.fn(),
  isHealthy: jest.fn(),
  beginTransaction: jest.fn(),
};

describe('UpdateCustomerHandler', () => {
  let handler: UpdateCustomerHandler;
  let mockUser: any;
  let mockCustomer: any;
  let validCommand: UpdateCustomerCommand;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create handler
    handler = new UpdateCustomerHandler(mockCustomerRepository, mockUserRepository);

    // Create mock user with permissions
    mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: new Email('admin@agency.com'),
      role: {
        name: 'MANAGER',
        displayName: 'Manager',
        permissions: [Permission.UPDATE_CUSTOMER],
      },
      agencyId: '550e8400-e29b-41d4-a716-446655440002',
      hasPermission: jest.fn().mockReturnValue(true),
    };

    // Create mock customer
    mockCustomer = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      customerCode: 'CUST001',
      customerType: CustomerType.WHOLESALE,
      status: CustomerStatus.ACTIVE,
      companyName: 'Test Company',
      firstName: 'John',
      lastName: 'Doe',
      email: new Email('john@testcompany.com'),
      phone: '+1-555-0123',
      mobile: '+1-555-0124',
      agencyId: '550e8400-e29b-41d4-a716-446655440002',
      creditLimit: Money.fromDecimal(50000, 'USD'),
      paymentTerms: PaymentTerms.NET_30,
      taxNumber: 'TAX123456',
      website: 'https://testcompany.com',
      notes: 'Test customer',
      addresses: [
        {
          street: '123 Main St',
          city: 'Anytown',
          state: 'ST',
          zipCode: '12345',
          country: 'USA',
          isDefault: true,
          addressType: 'BOTH' as const,
        },
      ],
      contacts: [
        {
          name: 'John Doe',
          email: new Email('john@testcompany.com'),
          phone: '+1-555-0123',
          isPrimary: true,
        },
      ],
      updateBasicInfo: jest.fn().mockReturnThis(),
      updateEmail: jest.fn().mockReturnThis(),
      updatePaymentTerms: jest.fn().mockReturnThis(),
      updateAddresses: jest.fn().mockReturnThis(),
      updateContacts: jest.fn().mockReturnThis(),
      updateCreditLimit: jest.fn().mockReturnThis(),
      activate: jest.fn().mockReturnThis(),
      deactivate: jest.fn().mockReturnThis(),
      suspend: jest.fn().mockReturnThis(),
      blacklist: jest.fn().mockReturnThis(),
    };

    // Create valid command
    validCommand = {
      customerId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
      companyName: 'Updated Company',
      requestedBy: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID
    };

    // Setup default mock returns
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
    mockCustomerRepository.update.mockResolvedValue(mockCustomer);
  });

  describe('handle', () => {
    it('should update customer successfully with basic information', async () => {
      const result = await handler.handle(validCommand);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockCustomer.updateBasicInfo).toHaveBeenCalledWith(
        { companyName: 'Updated Company' },
        '550e8400-e29b-41d4-a716-446655440001'
      );
      expect(mockCustomerRepository.update).toHaveBeenCalledWith(mockCustomer);
    });

    it('should update customer with all optional fields', async () => {
      const comprehensiveCommand: UpdateCustomerCommand = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        companyName: 'New Company Name',
        firstName: 'Jane',
        lastName: 'Smith',
        customerType: CustomerType.CORPORATE,
        email: 'jane@newcompany.com',
        phone: '+1-555-9999',
        mobile: '+1-555-8888',
        addresses: [
          {
            street: '456 New St',
            city: 'New City',
            state: 'NS',
            zipCode: '54321',
            country: 'USA',
            isDefault: true,
            addressType: 'BOTH' as const,
          },
        ],
        contacts: [
          {
            name: 'Jane Smith',
            email: 'jane@newcompany.com',
            phone: '+1-555-9999',
            isPrimary: true,
          },
        ],
        creditLimit: 75000,
        creditLimitCurrency: 'USD',
        creditLimitChangeReason: 'Business expansion',
        paymentTerms: PaymentTerms.NET_45,
        taxNumber: 'NEWTAX789',
        website: 'https://newcompany.com',
        notes: 'Updated customer information',
        status: CustomerStatus.ACTIVE,
        requestedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      mockCustomerRepository.findByEmail.mockResolvedValue(null);

      const result = await handler.handle(comprehensiveCommand);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(mockCustomer.updateBasicInfo).toHaveBeenCalled();
      expect(mockCustomer.updateEmail).toHaveBeenCalledWith(
        new Email('jane@newcompany.com'),
        '550e8400-e29b-41d4-a716-446655440001'
      );
      expect(mockCustomer.updatePaymentTerms).toHaveBeenCalledWith(
        PaymentTerms.NET_45,
        '550e8400-e29b-41d4-a716-446655440001'
      );
      expect(mockCustomer.updateAddresses).toHaveBeenCalled();
      expect(mockCustomer.updateContacts).toHaveBeenCalled();
      expect(mockCustomer.updateCreditLimit).toHaveBeenCalledWith(
        Money.fromDecimal(75000, 'USD'),
        'Business expansion',
        '550e8400-e29b-41d4-a716-446655440001'
      );
    });

    it('should throw error when updating user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(handler.handle(validCommand)).rejects.toThrow('Updating user not found');
    });

    it('should throw error when user lacks UPDATE_CUSTOMER permission', async () => {
      mockUser.hasPermission.mockReturnValue(false);

      await expect(handler.handle(validCommand)).rejects.toThrow('Insufficient permissions to update customer');
    });

    it('should throw error when customer not found', async () => {
      mockCustomerRepository.findById.mockResolvedValue(null);

      await expect(handler.handle(validCommand)).rejects.toThrow('Customer not found');
    });

    it('should throw error when email already exists for another customer', async () => {
      const commandWithEmail = {
        ...validCommand,
        email: 'existing@email.com',
      };

      const existingCustomer = {
        ...mockCustomer,
        id: '550e8400-e29b-41d4-a716-446655440003', // Different customer ID
      };
      mockCustomerRepository.findByEmail.mockResolvedValue(existingCustomer);

      await expect(handler.handle(commandWithEmail)).rejects.toThrow(
        'Customer with this email already exists in the agency'
      );
    });

    it('should allow email update when same customer', async () => {
      const commandWithEmail = {
        ...validCommand,
        email: 'newemail@company.com',
      };

      mockCustomerRepository.findByEmail.mockResolvedValue(mockCustomer);

      const result = await handler.handle(commandWithEmail);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(mockCustomer.updateEmail).toHaveBeenCalledWith(
        new Email('newemail@company.com'),
        '550e8400-e29b-41d4-a716-446655440001'
      );
    });

    it('should throw error when changing from GOVERNMENT to RETAIL customer type', async () => {
      // Create a new mock customer with GOVERNMENT type
      const govCustomer = {
        ...mockCustomer,
        customerType: CustomerType.GOVERNMENT,
      };
      mockCustomerRepository.findById.mockResolvedValue(govCustomer);

      const commandWithTypeChange = {
        ...validCommand,
        customerType: CustomerType.RETAIL,
      };

      await expect(handler.handle(commandWithTypeChange)).rejects.toThrow(
        'Cannot change customer type from GOVERNMENT to RETAIL'
      );
    });

    it('should throw error when CORPORATE customer missing company name', async () => {
      const commandWithCorporateType = {
        ...validCommand,
        customerType: CustomerType.CORPORATE,
        companyName: '',
      };

      await expect(handler.handle(commandWithCorporateType)).rejects.toThrow(
        'Corporate customers must have a company name'
      );
    });

    it('should throw error when GOVERNMENT customer missing tax number', async () => {
      const commandWithGovType = {
        ...validCommand,
        customerType: CustomerType.GOVERNMENT,
        taxNumber: '',
      };

      await expect(handler.handle(commandWithGovType)).rejects.toThrow('Government customers must have a tax number');
    });

    it('should throw error when RETAIL customer has invalid payment terms', async () => {
      const commandWithInvalidTerms = {
        ...validCommand,
        customerType: CustomerType.RETAIL,
        paymentTerms: PaymentTerms.NET_30,
      };

      await expect(handler.handle(commandWithInvalidTerms)).rejects.toThrow(
        'Retail customers can only have CASH_ON_DELIVERY or ADVANCE_PAYMENT terms'
      );
    });

    it('should throw error when credit limit change lacks reason', async () => {
      const commandWithCreditLimit = {
        ...validCommand,
        creditLimit: 100000,
      };

      await expect(handler.handle(commandWithCreditLimit)).rejects.toThrow(
        'Credit limit change reason is required when updating credit limit'
      );
    });

    it('should throw error when credit limit exceeds user authorization', async () => {
      // Create user with CLERK role
      const clerkUser = {
        ...mockUser,
        role: {
          name: 'CLERK',
          displayName: 'Clerk',
          permissions: [Permission.UPDATE_CUSTOMER],
        },
      };
      mockUserRepository.findById.mockResolvedValue(clerkUser);

      const commandWithHighCreditLimit = {
        ...validCommand,
        creditLimit: 50000, // Above $10K limit for CLERK
        creditLimitChangeReason: 'Business growth',
      };

      await expect(handler.handle(commandWithHighCreditLimit)).rejects.toThrow(
        'Credit limit $50000.00 exceeds maximum allowed $10000.00 for your role'
      );
    });

    it('should validate address requirements when updating addresses', async () => {
      const commandWithInvalidAddresses = {
        ...validCommand,
        addresses: [], // Empty addresses array
      };

      await expect(handler.handle(commandWithInvalidAddresses)).rejects.toThrow('Customer update validation failed');
    });

    it('should require default address when updating addresses', async () => {
      const commandWithNoDefaultAddress = {
        ...validCommand,
        addresses: [
          {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'USA',
            isDefault: false,
            addressType: 'BILLING' as const,
          },
        ],
      };

      await expect(handler.handle(commandWithNoDefaultAddress)).rejects.toThrow(
        'At least one address must be marked as default'
      );
    });

    it('should require billing and shipping addresses', async () => {
      const commandWithOnlyBillingAddress = {
        ...validCommand,
        addresses: [
          {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'USA',
            isDefault: true,
            addressType: 'BILLING' as const,
          },
        ],
      };

      await expect(handler.handle(commandWithOnlyBillingAddress)).rejects.toThrow(
        'At least one shipping address is required'
      );
    });

    it('should handle status updates correctly', async () => {
      const commandWithStatusUpdate = {
        ...validCommand,
        status: CustomerStatus.INACTIVE,
      };

      const result = await handler.handle(commandWithStatusUpdate);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(mockCustomer.deactivate).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should throw error for invalid status transition', async () => {
      // Mock customer with ACTIVE status trying to go to PENDING_APPROVAL
      const activeCustomer = {
        ...mockCustomer,
        status: CustomerStatus.ACTIVE,
      };
      mockCustomerRepository.findById.mockResolvedValue(activeCustomer);

      const commandWithInvalidStatus = {
        ...validCommand,
        status: CustomerStatus.PENDING_APPROVAL,
      };

      await expect(handler.handle(commandWithInvalidStatus)).rejects.toThrow(
        'Can only set to pending approval from inactive status'
      );
    });

    it('should validate command input', async () => {
      const invalidCommand = {
        customerId: 'invalid-uuid',
        requestedBy: 'invalid-uuid',
      };

      await expect(handler.handle(invalidCommand as any)).rejects.toThrow();
    });
  });

  describe('Business Rules Validation', () => {
    it('should allow valid customer type changes', async () => {
      // Mock customer with WHOLESALE type
      const wholesaleCustomer = {
        ...mockCustomer,
        customerType: CustomerType.WHOLESALE,
      };
      mockCustomerRepository.findById.mockResolvedValue(wholesaleCustomer);

      const commandWithValidTypeChange = {
        ...validCommand,
        customerType: CustomerType.DISTRIBUTOR,
      };

      const result = await handler.handle(commandWithValidTypeChange);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should validate payment terms for different customer types', async () => {
      const commandWithOnlineCustomer = {
        ...validCommand,
        customerType: CustomerType.ONLINE,
        paymentTerms: PaymentTerms.ADVANCE_PAYMENT,
      };

      const result = await handler.handle(commandWithOnlineCustomer);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(mockCustomer.updatePaymentTerms).toHaveBeenCalledWith(
        PaymentTerms.ADVANCE_PAYMENT,
        '550e8400-e29b-41d4-a716-446655440001'
      );
    });

    it('should handle credit limit authorization for different user roles', async () => {
      // Create user with ADMIN role
      const adminUser = {
        ...mockUser,
        role: {
          name: 'ADMIN',
          displayName: 'Admin',
          permissions: [Permission.UPDATE_CUSTOMER],
        },
      };
      mockUserRepository.findById.mockResolvedValue(adminUser);

      const commandWithHighCreditLimit = {
        ...validCommand,
        creditLimit: 500000, // Within $1M limit for ADMIN
        creditLimitChangeReason: 'Major account',
      };

      const result = await handler.handle(commandWithHighCreditLimit);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(mockCustomer.updateCreditLimit).toHaveBeenCalled();
    });
  });
});
