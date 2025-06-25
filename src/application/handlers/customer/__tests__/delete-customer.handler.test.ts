/**
 * Delete Customer Handler Tests
 *
 * Comprehensive test suite for DeleteCustomerHandler following established patterns.
 * Tests all business rules, error cases, and success scenarios.
 *
 * @domain Customer Management
 * @pattern Command Handler Tests
 * @version 1.0.0
 */

import { DeleteCustomerHandler } from '../delete-customer.handler';
import {
  DeleteCustomerCommand,
  DeleteCustomerCommandValidationError,
} from '../../../commands/customer/delete-customer.command';
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

describe('DeleteCustomerHandler', () => {
  let handler: DeleteCustomerHandler;
  let mockUser: any;
  let mockCustomer: any;
  let validCommand: DeleteCustomerCommand;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create handler
    handler = new DeleteCustomerHandler(mockCustomerRepository, mockUserRepository);

    // Create mock user with permissions
    mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: new Email('admin@agency.com'),
      role: {
        name: 'MANAGER',
        displayName: 'Manager',
        permissions: [Permission.DELETE_CUSTOMER],
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
      outstandingBalance: Money.zero('USD'),
      reservedCredit: Money.zero('USD'),
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
      deactivate: jest.fn().mockReturnThis(),
    };

    // Create valid command
    validCommand = {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'Customer requested account closure',
      requestedBy: '550e8400-e29b-41d4-a716-446655440001',
    };

    // Setup default mock returns
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockCustomerRepository.findById.mockResolvedValue(mockCustomer);
    mockCustomerRepository.update.mockResolvedValue(mockCustomer);
  });

  describe('handle', () => {
    it('should delete customer successfully with valid command', async () => {
      const result = await handler.handle(validCommand);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(mockCustomer.deactivate).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockCustomerRepository.update).toHaveBeenCalledWith(mockCustomer);
    });

    it('should throw error when deleting user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(handler.handle(validCommand)).rejects.toThrow('Deleting user not found');
    });

    it('should throw error when user lacks DELETE_CUSTOMER permission', async () => {
      mockUser.hasPermission.mockReturnValue(false);

      await expect(handler.handle(validCommand)).rejects.toThrow('Insufficient permissions to delete customer');
    });

    it('should throw error when customer not found', async () => {
      mockCustomerRepository.findById.mockResolvedValue(null);

      await expect(handler.handle(validCommand)).rejects.toThrow('Customer not found');
    });

    it('should throw error when customer is already inactive', async () => {
      const inactiveCustomer = {
        ...mockCustomer,
        status: CustomerStatus.INACTIVE,
      };
      mockCustomerRepository.findById.mockResolvedValue(inactiveCustomer);

      await expect(handler.handle(validCommand)).rejects.toThrow('Customer is already inactive');
    });

    it('should throw error when customer is blacklisted', async () => {
      const blacklistedCustomer = {
        ...mockCustomer,
        status: CustomerStatus.BLACKLISTED,
      };
      mockCustomerRepository.findById.mockResolvedValue(blacklistedCustomer);

      await expect(handler.handle(validCommand)).rejects.toThrow(
        'Cannot delete blacklisted customers - contact administrator'
      );
    });

    it('should throw error when customer has outstanding balance', async () => {
      const customerWithBalance = {
        ...mockCustomer,
        outstandingBalance: Money.fromDecimal(1000, 'USD'),
      };
      mockCustomerRepository.findById.mockResolvedValue(customerWithBalance);

      await expect(handler.handle(validCommand)).rejects.toThrow('Cannot delete customer with outstanding balance');
    });

    it('should throw error when customer has reserved credit', async () => {
      const customerWithReservedCredit = {
        ...mockCustomer,
        reservedCredit: Money.fromDecimal(500, 'USD'),
      };
      mockCustomerRepository.findById.mockResolvedValue(customerWithReservedCredit);

      await expect(handler.handle(validCommand)).rejects.toThrow('Cannot delete customer with reserved credit');
    });

    it('should allow deletion of suspended customer', async () => {
      const suspendedCustomer = {
        ...mockCustomer,
        status: CustomerStatus.SUSPENDED,
      };
      mockCustomerRepository.findById.mockResolvedValue(suspendedCustomer);

      const result = await handler.handle(validCommand);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(suspendedCustomer.deactivate).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should allow deletion of pending approval customer', async () => {
      const pendingCustomer = {
        ...mockCustomer,
        status: CustomerStatus.PENDING_APPROVAL,
      };
      mockCustomerRepository.findById.mockResolvedValue(pendingCustomer);

      const result = await handler.handle(validCommand);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(pendingCustomer.deactivate).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should validate command input', async () => {
      const invalidCommand = {
        customerId: 'invalid-uuid',
        reason: '',
        requestedBy: 'invalid-uuid',
      };

      await expect(handler.handle(invalidCommand as any)).rejects.toThrow();
    });

    it('should handle repository errors gracefully', async () => {
      mockCustomerRepository.update.mockRejectedValue(new Error('Database connection failed'));

      await expect(handler.handle(validCommand)).rejects.toThrow('Database connection failed');
    });
  });

  describe('Business Rules Validation', () => {
    it('should allow deletion of different customer types', async () => {
      const customerTypes = [
        CustomerType.RETAIL,
        CustomerType.WHOLESALE,
        CustomerType.DISTRIBUTOR,
        CustomerType.CORPORATE,
        CustomerType.GOVERNMENT,
        CustomerType.ONLINE,
      ];

      for (const customerType of customerTypes) {
        const customer = {
          ...mockCustomer,
          customerType,
        };
        mockCustomerRepository.findById.mockResolvedValue(customer);

        const result = await handler.handle(validCommand);

        expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      }
    });

    it('should handle customers with zero balances correctly', async () => {
      const customerWithZeroBalance = {
        ...mockCustomer,
        outstandingBalance: Money.zero('USD'),
        reservedCredit: Money.zero('USD'),
      };
      mockCustomerRepository.findById.mockResolvedValue(customerWithZeroBalance);

      const result = await handler.handle(validCommand);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should handle customers with null balances correctly', async () => {
      const customerWithNullBalance = {
        ...mockCustomer,
        outstandingBalance: null,
        reservedCredit: null,
      };
      mockCustomerRepository.findById.mockResolvedValue(customerWithNullBalance);

      const result = await handler.handle(validCommand);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should handle customers with undefined balances correctly', async () => {
      const customerWithUndefinedBalance = {
        ...mockCustomer,
        outstandingBalance: undefined,
        reservedCredit: undefined,
      };
      mockCustomerRepository.findById.mockResolvedValue(customerWithUndefinedBalance);

      const result = await handler.handle(validCommand);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('Authorization Tests', () => {
    it('should allow admin to delete customers', async () => {
      const adminUser = {
        ...mockUser,
        role: {
          name: 'ADMIN',
          displayName: 'Admin',
          permissions: [Permission.DELETE_CUSTOMER],
        },
      };
      mockUserRepository.findById.mockResolvedValue(adminUser);

      const result = await handler.handle(validCommand);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should allow manager to delete customers', async () => {
      const managerUser = {
        ...mockUser,
        role: {
          name: 'MANAGER',
          displayName: 'Manager',
          permissions: [Permission.DELETE_CUSTOMER],
        },
      };
      mockUserRepository.findById.mockResolvedValue(managerUser);

      const result = await handler.handle(validCommand);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should prevent employee from deleting customers', async () => {
      const employeeUser = {
        ...mockUser,
        role: {
          name: 'EMPLOYEE',
          displayName: 'Employee',
          permissions: [], // No DELETE_CUSTOMER permission
        },
        hasPermission: jest.fn().mockReturnValue(false),
      };
      mockUserRepository.findById.mockResolvedValue(employeeUser);

      await expect(handler.handle(validCommand)).rejects.toThrow('Insufficient permissions to delete customer');
    });

    it('should prevent viewer from deleting customers', async () => {
      const viewerUser = {
        ...mockUser,
        role: {
          name: 'VIEWER',
          displayName: 'Viewer',
          permissions: [], // No DELETE_CUSTOMER permission
        },
        hasPermission: jest.fn().mockReturnValue(false),
      };
      mockUserRepository.findById.mockResolvedValue(viewerUser);

      await expect(handler.handle(validCommand)).rejects.toThrow('Insufficient permissions to delete customer');
    });
  });

  describe('Error Handling', () => {
    it('should handle user repository errors', async () => {
      mockUserRepository.findById.mockRejectedValue(new Error('User repository error'));

      await expect(handler.handle(validCommand)).rejects.toThrow('User repository error');
    });

    it('should handle customer repository findById errors', async () => {
      mockCustomerRepository.findById.mockRejectedValue(new Error('Customer repository error'));

      await expect(handler.handle(validCommand)).rejects.toThrow('Customer repository error');
    });

    it('should handle customer repository update errors', async () => {
      mockCustomerRepository.update.mockRejectedValue(new Error('Update failed'));

      await expect(handler.handle(validCommand)).rejects.toThrow('Update failed');
    });

    it('should handle customer deactivate method errors', async () => {
      mockCustomer.deactivate.mockImplementation(() => {
        throw new Error('Deactivation failed');
      });

      await expect(handler.handle(validCommand)).rejects.toThrow('Deactivation failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long deletion reasons', async () => {
      const commandWithLongReason = {
        ...validCommand,
        reason: 'A'.repeat(500), // Maximum allowed length
      };

      const result = await handler.handle(commandWithLongReason);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should handle customers with complex financial state', async () => {
      const complexCustomer = {
        ...mockCustomer,
        outstandingBalance: Money.zero('USD'),
        reservedCredit: Money.zero('USD'),
        creditLimit: Money.fromDecimal(100000, 'USD'),
        totalOrdersValue: Money.fromDecimal(50000, 'USD'),
      };
      mockCustomerRepository.findById.mockResolvedValue(complexCustomer);

      const result = await handler.handle(validCommand);

      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should handle concurrent deletion attempts', async () => {
      // Simulate concurrent deletion by making the first call succeed
      // and the second call find an already inactive customer
      let callCount = 0;
      mockCustomerRepository.findById.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(mockCustomer);
        } else {
          return Promise.resolve({
            ...mockCustomer,
            status: CustomerStatus.INACTIVE,
          });
        }
      });

      // First deletion should succeed
      const result1 = await handler.handle(validCommand);
      expect(result1).toBe('550e8400-e29b-41d4-a716-446655440000');

      // Second deletion should fail
      await expect(handler.handle(validCommand)).rejects.toThrow('Customer is already inactive');
    });
  });
});
