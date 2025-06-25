/**
 * Create Customer Handler Tests
 *
 * Comprehensive test suite for CreateCustomerHandler covering:
 * - Command validation and business rules
 * - Authorization and permissions
 * - Repository interactions and error handling
 * - Domain entity creation and persistence
 * - Edge cases and error scenarios
 *
 * @domain Customer Management
 * @pattern Unit Testing
 * @version 1.0.0
 */

import { CreateCustomerHandler } from '../create-customer.handler';
import { CreateCustomerCommand } from '../../../commands/customer/create-customer.command';
import { Customer, CustomerType, PaymentTerms } from '../../../../domain/entities/customer';
import { ICustomerRepository } from '../../../../domain/repositories/customer.repository';
import { IUserRepository } from '../../../../domain/repositories/user.repository';
import { Permission } from '../../../../domain/value-objects/role';
import { Email } from '../../../../domain/value-objects/email';

// Mock repositories with essential methods only
const mockCustomerRepository: Partial<ICustomerRepository> = {
  findByCustomerCode: jest.fn(),
  findByEmail: jest.fn(),
  save: jest.fn(),
};

const mockUserRepository: Partial<IUserRepository> = {
  findById: jest.fn(),
};

// Mock user with different roles
const createMockUser = (roleName: string, permissions: Permission[] = []) => ({
  id: '123e4567-e89b-12d3-a456-426614174001',
  email: new Email('test@example.com'),
  role: {
    name: roleName,
    permissions,
  },
  hasPermission: jest.fn((permission: Permission) => permissions.includes(permission)),
});

// Valid create customer command with proper UUIDs
const validCreateCustomerCommand: CreateCustomerCommand = {
  customerCode: 'CUST001',
  companyName: 'Test Company Ltd',
  firstName: 'John',
  lastName: 'Doe',
  customerType: CustomerType.CORPORATE,
  email: 'john.doe@testcompany.com',
  phone: '+1-555-0123',
  mobile: '+1-555-0124',
  addresses: [
    {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      isDefault: true,
      addressType: 'BOTH',
    },
  ],
  contacts: [
    {
      name: 'John Doe',
      title: 'CEO',
      email: 'john.doe@testcompany.com',
      phone: '+1-555-0123',
      isPrimary: true,
    },
  ],
  creditLimit: 50000,
  creditLimitCurrency: 'USD',
  paymentTerms: PaymentTerms.NET_30,
  taxNumber: 'TAX123456789',
  website: 'https://testcompany.com',
  notes: 'Important corporate customer',
  agencyId: '123e4567-e89b-12d3-a456-426614174000',
  requestedBy: '123e4567-e89b-12d3-a456-426614174001',
};

describe('CreateCustomerHandler', () => {
  let handler: CreateCustomerHandler;

  beforeEach(() => {
    handler = new CreateCustomerHandler(
      mockCustomerRepository as ICustomerRepository,
      mockUserRepository as IUserRepository
    );
    jest.clearAllMocks();
  });

  describe('Successful Customer Creation', () => {
    it('should create customer successfully with valid data', async () => {
      // Arrange
      const mockUser = createMockUser('MANAGER', [Permission.CREATE_CUSTOMER]);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockCustomerRepository.findByCustomerCode as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepository.save as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await handler.handle(validCreateCustomerCommand);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001');
      expect(mockCustomerRepository.findByCustomerCode).toHaveBeenCalledWith(
        'CUST001',
        '123e4567-e89b-12d3-a456-426614174000'
      );
      expect(mockCustomerRepository.findByEmail).toHaveBeenCalled();
      expect(mockCustomerRepository.save).toHaveBeenCalled();
    });

    it('should create retail customer with cash on delivery', async () => {
      // Arrange
      const mockUser = createMockUser('SALES_REP', [Permission.CREATE_CUSTOMER]);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockCustomerRepository.findByCustomerCode as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepository.save as jest.Mock).mockResolvedValue(undefined);

      const retailCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        customerType: CustomerType.RETAIL,
        paymentTerms: PaymentTerms.CASH_ON_DELIVERY,
        companyName: undefined,
        creditLimit: 5000,
      };

      // Act
      const result = await handler.handle(retailCommand);

      // Assert
      expect(result).toBeDefined();
      expect(mockCustomerRepository.save).toHaveBeenCalled();
    });

    it('should create government customer with tax number', async () => {
      // Arrange
      const mockUser = createMockUser('ADMIN', [Permission.CREATE_CUSTOMER]);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockCustomerRepository.findByCustomerCode as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepository.save as jest.Mock).mockResolvedValue(undefined);

      const govCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        customerType: CustomerType.GOVERNMENT,
        paymentTerms: PaymentTerms.NET_45,
        taxNumber: 'GOV123456789',
      };

      // Act
      const result = await handler.handle(govCommand);

      // Assert
      expect(result).toBeDefined();
      expect(mockCustomerRepository.save).toHaveBeenCalled();
    });
  });

  describe('Authorization Tests', () => {
    it('should throw error when user not found', async () => {
      // Arrange
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(handler.handle(validCreateCustomerCommand)).rejects.toThrow('Creating user not found');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001');
    });

    it('should throw error when user lacks CREATE_CUSTOMER permission', async () => {
      // Arrange
      const mockUser = createMockUser('VIEWER', []); // No permissions
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      // Act & Assert
      await expect(handler.handle(validCreateCustomerCommand)).rejects.toThrow(
        'Insufficient permissions to create customer'
      );
    });

    it('should enforce credit limit based on user role', async () => {
      // Arrange
      const mockUser = createMockUser('CLERK', [Permission.CREATE_CUSTOMER]);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockCustomerRepository.findByCustomerCode as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      const highCreditCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        creditLimit: 50000, // Exceeds clerk limit of $10K
      };

      // Act & Assert
      await expect(handler.handle(highCreditCommand)).rejects.toThrow(
        'Credit limit $50000.00 exceeds maximum allowed $10000.00 for your role'
      );
    });
  });

  describe('Business Rules Validation', () => {
    beforeEach(() => {
      const mockUser = createMockUser('MANAGER', [Permission.CREATE_CUSTOMER]);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockCustomerRepository.findByCustomerCode as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    });

    it('should throw error when customer code already exists', async () => {
      // Arrange
      const existingCustomer = {} as Customer;
      (mockCustomerRepository.findByCustomerCode as jest.Mock).mockResolvedValue(existingCustomer);

      // Act & Assert
      await expect(handler.handle(validCreateCustomerCommand)).rejects.toThrow(
        'Customer with this code already exists in the agency'
      );
    });

    it('should throw error when email already exists', async () => {
      // Arrange
      const existingCustomer = {} as Customer;
      (mockCustomerRepository.findByEmail as jest.Mock).mockResolvedValue(existingCustomer);

      // Act & Assert
      await expect(handler.handle(validCreateCustomerCommand)).rejects.toThrow(
        'Customer with this email already exists in the agency'
      );
    });

    it('should throw error when corporate customer lacks company name', async () => {
      // Arrange
      const corporateCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        customerType: CustomerType.CORPORATE,
        companyName: undefined,
      };

      // Act & Assert
      await expect(handler.handle(corporateCommand)).rejects.toThrow('Corporate customers must have a company name');
    });

    it('should throw error when government customer lacks tax number', async () => {
      // Arrange
      const govCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        customerType: CustomerType.GOVERNMENT,
        taxNumber: undefined,
      };

      // Act & Assert
      await expect(handler.handle(govCommand)).rejects.toThrow('Government customers must have a tax number');
    });

    it('should throw error when retail customer has invalid payment terms', async () => {
      // Arrange
      const retailCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        customerType: CustomerType.RETAIL,
        paymentTerms: PaymentTerms.NET_30, // Invalid for retail
      };

      // Act & Assert
      await expect(handler.handle(retailCommand)).rejects.toThrow(
        'Retail customers can only have CASH_ON_DELIVERY or ADVANCE_PAYMENT terms'
      );
    });

    it('should throw error when government customer has cash on delivery', async () => {
      // Arrange
      const govCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        customerType: CustomerType.GOVERNMENT,
        paymentTerms: PaymentTerms.CASH_ON_DELIVERY,
        taxNumber: 'GOV123456789',
      };

      // Act & Assert
      await expect(handler.handle(govCommand)).rejects.toThrow(
        'Government customers cannot have CASH_ON_DELIVERY payment terms'
      );
    });

    it('should throw error when online customer has invalid payment terms', async () => {
      // Arrange
      const onlineCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        customerType: CustomerType.ONLINE,
        paymentTerms: PaymentTerms.NET_30, // Invalid for online
      };

      // Act & Assert
      await expect(handler.handle(onlineCommand)).rejects.toThrow(
        'Online customers can only have ADVANCE_PAYMENT or CASH_ON_DELIVERY terms'
      );
    });
  });

  describe('Address Validation', () => {
    beforeEach(() => {
      const mockUser = createMockUser('MANAGER', [Permission.CREATE_CUSTOMER]);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockCustomerRepository.findByCustomerCode as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    });

    it('should throw error when no default address is marked', async () => {
      // Arrange
      const noDefaultCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        addresses: [
          {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
            isDefault: false,
            addressType: 'BOTH',
          },
        ],
      };

      // Act & Assert
      await expect(handler.handle(noDefaultCommand)).rejects.toThrow('At least one address must be marked as default');
    });

    it('should throw error when multiple default addresses exist', async () => {
      // Arrange
      const multipleDefaultCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        addresses: [
          {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
            isDefault: true,
            addressType: 'BOTH',
          },
          {
            street: '456 Oak Ave',
            city: 'Boston',
            state: 'MA',
            zipCode: '02101',
            country: 'USA',
            isDefault: true,
            addressType: 'SHIPPING',
          },
        ],
      };

      // Act & Assert
      await expect(handler.handle(multipleDefaultCommand)).rejects.toThrow('Only one address can be marked as default');
    });

    it('should throw error when no billing address exists', async () => {
      // Arrange
      const noBillingCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        addresses: [
          {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
            isDefault: true,
            addressType: 'SHIPPING',
          },
        ],
      };

      // Act & Assert
      await expect(handler.handle(noBillingCommand)).rejects.toThrow('At least one billing address is required');
    });

    it('should throw error when no shipping address exists', async () => {
      // Arrange
      const noShippingCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        addresses: [
          {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
            isDefault: true,
            addressType: 'BILLING',
          },
        ],
      };

      // Act & Assert
      await expect(handler.handle(noShippingCommand)).rejects.toThrow('At least one shipping address is required');
    });
  });

  describe('Credit Limit Authorization by Role', () => {
    beforeEach(() => {
      (mockCustomerRepository.findByCustomerCode as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    });

    it('should allow admin to set high credit limits', async () => {
      // Arrange
      const mockUser = createMockUser('ADMIN', [Permission.CREATE_CUSTOMER]);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockCustomerRepository.save as jest.Mock).mockResolvedValue(undefined);

      const highCreditCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        creditLimit: 500000, // $500K
      };

      // Act
      const result = await handler.handle(highCreditCommand);

      // Assert
      expect(result).toBeDefined();
      expect(mockCustomerRepository.save).toHaveBeenCalled();
    });

    it('should allow manager to set high credit limits', async () => {
      // Arrange
      const mockUser = createMockUser('MANAGER', [Permission.CREATE_CUSTOMER]);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockCustomerRepository.save as jest.Mock).mockResolvedValue(undefined);

      const highCreditCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        creditLimit: 800000, // $800K
      };

      // Act
      const result = await handler.handle(highCreditCommand);

      // Assert
      expect(result).toBeDefined();
      expect(mockCustomerRepository.save).toHaveBeenCalled();
    });

    it('should limit sales rep credit authorization', async () => {
      // Arrange
      const mockUser = createMockUser('SALES_REP', [Permission.CREATE_CUSTOMER]);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const highCreditCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        creditLimit: 150000, // Exceeds $100K limit
      };

      // Act & Assert
      await expect(handler.handle(highCreditCommand)).rejects.toThrow(
        'Credit limit $150000.00 exceeds maximum allowed $100000.00 for your role'
      );
    });

    it('should limit clerk credit authorization', async () => {
      // Arrange
      const mockUser = createMockUser('CLERK', [Permission.CREATE_CUSTOMER]);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const highCreditCommand: CreateCustomerCommand = {
        ...validCreateCustomerCommand,
        creditLimit: 15000, // Exceeds $10K limit
      };

      // Act & Assert
      await expect(handler.handle(highCreditCommand)).rejects.toThrow(
        'Credit limit $15000.00 exceeds maximum allowed $10000.00 for your role'
      );
    });
  });

  describe('Repository Error Handling', () => {
    beforeEach(() => {
      const mockUser = createMockUser('MANAGER', [Permission.CREATE_CUSTOMER]);
      (mockUserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (mockCustomerRepository.findByCustomerCode as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    });

    it('should handle repository save errors', async () => {
      // Arrange
      (mockCustomerRepository.save as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(handler.handle(validCreateCustomerCommand)).rejects.toThrow('Database connection failed');
    });

    it('should handle user repository errors', async () => {
      // Arrange
      (mockUserRepository.findById as jest.Mock).mockRejectedValue(new Error('User service unavailable'));

      // Act & Assert
      await expect(handler.handle(validCreateCustomerCommand)).rejects.toThrow('User service unavailable');
    });

    it('should handle customer lookup errors', async () => {
      // Arrange
      (mockCustomerRepository.findByCustomerCode as jest.Mock).mockRejectedValue(new Error('Database query failed'));

      // Act & Assert
      await expect(handler.handle(validCreateCustomerCommand)).rejects.toThrow('Database query failed');
    });
  });
});
