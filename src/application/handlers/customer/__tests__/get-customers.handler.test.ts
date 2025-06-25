/**
 * Get Customers Handler Tests
 *
 * Comprehensive test suite for GetCustomersHandler following established patterns.
 * Tests all business rules, error cases, and success scenarios.
 *
 * @domain Customer Management
 * @pattern Query Handler Tests
 * @version 1.0.0
 */

import { GetCustomersHandler } from '../get-customers.handler';
import {
  GetCustomersQuery,
  CustomerSummary,
  GetCustomersQueryResult,
} from '../../../queries/customer/get-customers.query';
import { Customer, CustomerType, CustomerStatus, PaymentTerms } from '../../../../domain/entities/customer';
import { ICustomerRepository, CustomerSearchResult } from '../../../../domain/repositories/customer.repository';
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

describe('GetCustomersHandler', () => {
  let handler: GetCustomersHandler;
  let mockUser: any;
  let mockCustomers: Customer[];
  let validQuery: GetCustomersQuery;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create handler
    handler = new GetCustomersHandler(mockCustomerRepository, mockUserRepository);

    // Create mock user with permissions
    mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: new Email('manager@agency.com'),
      role: {
        name: 'MANAGER',
        displayName: 'Manager',
        permissions: [Permission.READ_CUSTOMER],
      },
      hasPermission: jest.fn().mockReturnValue(true),
    };

    // Create mock customers
    mockCustomers = [
      createMockCustomer({
        id: '550e8400-e29b-41d4-a716-446655440000',
        customerCode: 'CUST001',
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'John Doe Enterprises',
        customerType: CustomerType.WHOLESALE,
        status: CustomerStatus.ACTIVE,
      }),
      createMockCustomer({
        id: '550e8400-e29b-41d4-a716-446655440002',
        customerCode: 'CUST002',
        firstName: 'Jane',
        lastName: 'Smith',
        companyName: 'Smith Corp',
        customerType: CustomerType.RETAIL,
        status: CustomerStatus.ACTIVE,
      }),
    ];

    // Create valid query
    validQuery = {
      limit: 50,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      requestedBy: '550e8400-e29b-41d4-a716-446655440001',
    };

    // Setup default mock returns
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockCustomerRepository.search.mockResolvedValue({
      customers: mockCustomers,
      total: mockCustomers.length,
      limit: 50,
      offset: 0,
      hasMore: false,
    });
  });

  describe('handle', () => {
    it('should retrieve customers successfully with valid query', async () => {
      const result = await handler.handle(validQuery);

      expect(result.success).toBe(true);
      expect(result.customers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
      expect(mockCustomerRepository.search).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should retrieve customers with pagination', async () => {
      const paginatedQuery = {
        ...validQuery,
        limit: 10,
        offset: 20,
      };

      mockCustomerRepository.search.mockResolvedValue({
        customers: mockCustomers,
        total: 100,
        limit: 10,
        offset: 20,
        hasMore: true,
      });

      const result = await handler.handle(paginatedQuery);

      expect(result.success).toBe(true);
      expect(result.customers).toHaveLength(2);
      expect(result.total).toBe(100);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
      expect(result.hasMore).toBe(true);
      expect(mockCustomerRepository.search).toHaveBeenCalledWith({
        limit: 10,
        offset: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should retrieve customers with sorting options', async () => {
      const sortedQuery = {
        ...validQuery,
        sortBy: 'customerCode' as const,
        sortOrder: 'asc' as const,
      };

      const result = await handler.handle(sortedQuery);

      expect(result.success).toBe(true);
      expect(mockCustomerRepository.search).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        sortBy: 'customerCode',
        sortOrder: 'asc',
      });
    });

    it('should retrieve customers with filters', async () => {
      const filteredQuery = {
        ...validQuery,
        customerType: CustomerType.WHOLESALE,
        status: CustomerStatus.ACTIVE,
        search: 'John',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
      };

      const result = await handler.handle(filteredQuery);

      expect(result.success).toBe(true);
      expect(mockCustomerRepository.search).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        customerType: CustomerType.WHOLESALE,
        status: CustomerStatus.ACTIVE,
        search: 'John',
        agencyId: '550e8400-e29b-41d4-a716-446655440003',
      });
    });

    it('should throw error when requesting user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(handler.handle(validQuery)).rejects.toThrow('Requesting user not found');
    });

    it('should throw error when user lacks READ_CUSTOMER permission', async () => {
      mockUser.hasPermission.mockReturnValue(false);

      await expect(handler.handle(validQuery)).rejects.toThrow('Insufficient permissions to view customers');
    });

    it('should handle empty search results', async () => {
      mockCustomerRepository.search.mockResolvedValue({
        customers: [],
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      });

      const result = await handler.handle(validQuery);

      expect(result.success).toBe(true);
      expect(result.customers).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle repository search errors', async () => {
      mockCustomerRepository.search.mockRejectedValue(new Error('Database connection failed'));

      await expect(handler.handle(validQuery)).rejects.toThrow('Database connection failed');
    });

    it('should validate query input', async () => {
      const invalidQuery = {
        ...validQuery,
        limit: -1, // Invalid limit
      };

      await expect(handler.handle(invalidQuery as any)).rejects.toThrow();
    });
  });

  describe('Customer Summary Conversion', () => {
    it('should convert customer entity to summary correctly', async () => {
      const result = await handler.handle(validQuery);

      const firstCustomer = result.customers[0];
      expect(firstCustomer).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        customerCode: 'CUST001',
        fullName: 'John Doe',
        companyName: 'John Doe Enterprises',
        customerType: CustomerType.WHOLESALE,
        status: CustomerStatus.ACTIVE,
        email: 'john@testcompany.com',
        creditLimit: '$50000.00',
        createdAt: expect.any(Date),
      });
    });

    it('should handle customers without company name', async () => {
      const customerWithoutCompany = createMockCustomer({
        id: '550e8400-e29b-41d4-a716-446655440004',
        customerCode: 'CUST004',
        firstName: 'Bob',
        lastName: 'Wilson',
        companyName: null,
        customerType: CustomerType.RETAIL,
        status: CustomerStatus.ACTIVE,
      });

      mockCustomerRepository.search.mockResolvedValue({
        customers: [customerWithoutCompany],
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false,
      });

      const result = await handler.handle(validQuery);

      expect(result.customers[0].companyName).toBeNull();
      expect(result.customers[0].fullName).toBe('Bob Wilson');
    });

    it('should handle different customer types', async () => {
      const customerTypes = [
        CustomerType.RETAIL,
        CustomerType.WHOLESALE,
        CustomerType.DISTRIBUTOR,
        CustomerType.CORPORATE,
        CustomerType.GOVERNMENT,
        CustomerType.ONLINE,
      ];

      for (const customerType of customerTypes) {
        const customer = createMockCustomer({
          id: `550e8400-e29b-41d4-a716-44665544000${customerTypes.indexOf(customerType)}`,
          customerCode: `CUST00${customerTypes.indexOf(customerType)}`,
          firstName: 'Test',
          lastName: 'Customer',
          customerType,
          status: CustomerStatus.ACTIVE,
        });

        mockCustomerRepository.search.mockResolvedValue({
          customers: [customer],
          total: 1,
          limit: 50,
          offset: 0,
          hasMore: false,
        });

        const result = await handler.handle(validQuery);
        expect(result.customers[0].customerType).toBe(customerType);
      }
    });

    it('should handle different customer statuses', async () => {
      const customerStatuses = [
        CustomerStatus.ACTIVE,
        CustomerStatus.INACTIVE,
        CustomerStatus.SUSPENDED,
        CustomerStatus.BLACKLISTED,
        CustomerStatus.PENDING_APPROVAL,
      ];

      for (const status of customerStatuses) {
        const customer = createMockCustomer({
          id: `550e8400-e29b-41d4-a716-44665544000${customerStatuses.indexOf(status)}`,
          customerCode: `CUST00${customerStatuses.indexOf(status)}`,
          firstName: 'Test',
          lastName: 'Customer',
          customerType: CustomerType.RETAIL,
          status,
        });

        mockCustomerRepository.search.mockResolvedValue({
          customers: [customer],
          total: 1,
          limit: 50,
          offset: 0,
          hasMore: false,
        });

        const result = await handler.handle(validQuery);
        expect(result.customers[0].status).toBe(status);
      }
    });
  });

  describe('Authorization Tests', () => {
    it('should allow admin to view customers', async () => {
      const adminUser = {
        ...mockUser,
        role: {
          name: 'ADMIN',
          displayName: 'Admin',
          permissions: [Permission.READ_CUSTOMER],
        },
      };
      mockUserRepository.findById.mockResolvedValue(adminUser);

      const result = await handler.handle(validQuery);

      expect(result.success).toBe(true);
      expect(result.customers).toHaveLength(2);
    });

    it('should allow manager to view customers', async () => {
      const managerUser = {
        ...mockUser,
        role: {
          name: 'MANAGER',
          displayName: 'Manager',
          permissions: [Permission.READ_CUSTOMER],
        },
      };
      mockUserRepository.findById.mockResolvedValue(managerUser);

      const result = await handler.handle(validQuery);

      expect(result.success).toBe(true);
      expect(result.customers).toHaveLength(2);
    });

    it('should allow employee to view customers', async () => {
      const employeeUser = {
        ...mockUser,
        role: {
          name: 'EMPLOYEE',
          displayName: 'Employee',
          permissions: [Permission.READ_CUSTOMER],
        },
      };
      mockUserRepository.findById.mockResolvedValue(employeeUser);

      const result = await handler.handle(validQuery);

      expect(result.success).toBe(true);
      expect(result.customers).toHaveLength(2);
    });

    it('should prevent user without READ_CUSTOMER permission', async () => {
      const limitedUser = {
        ...mockUser,
        role: {
          name: 'LIMITED',
          displayName: 'Limited User',
          permissions: [], // No READ_CUSTOMER permission
        },
        hasPermission: jest.fn().mockReturnValue(false),
      };
      mockUserRepository.findById.mockResolvedValue(limitedUser);

      await expect(handler.handle(validQuery)).rejects.toThrow('Insufficient permissions to view customers');
    });
  });

  describe('Search and Filtering', () => {
    it('should handle search queries', async () => {
      const searchQuery = {
        ...validQuery,
        search: 'John Doe',
      };

      const result = await handler.handle(searchQuery);

      expect(result.success).toBe(true);
      expect(mockCustomerRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'John Doe',
        })
      );
    });

    it('should handle customer type filtering', async () => {
      const typeQuery = {
        ...validQuery,
        customerType: CustomerType.WHOLESALE,
      };

      const result = await handler.handle(typeQuery);

      expect(result.success).toBe(true);
      expect(mockCustomerRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          customerType: CustomerType.WHOLESALE,
        })
      );
    });

    it('should handle status filtering', async () => {
      const statusQuery = {
        ...validQuery,
        status: CustomerStatus.ACTIVE,
      };

      const result = await handler.handle(statusQuery);

      expect(result.success).toBe(true);
      expect(mockCustomerRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CustomerStatus.ACTIVE,
        })
      );
    });

    it('should handle agency filtering', async () => {
      const agencyQuery = {
        ...validQuery,
        agencyId: '550e8400-e29b-41d4-a716-446655440005',
      };

      const result = await handler.handle(agencyQuery);

      expect(result.success).toBe(true);
      expect(mockCustomerRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          agencyId: '550e8400-e29b-41d4-a716-446655440005',
        })
      );
    });

    it('should handle combined filters', async () => {
      const combinedQuery = {
        ...validQuery,
        customerType: CustomerType.CORPORATE,
        status: CustomerStatus.ACTIVE,
        search: 'enterprise',
        agencyId: '550e8400-e29b-41d4-a716-446655440006',
      };

      const result = await handler.handle(combinedQuery);

      expect(result.success).toBe(true);
      expect(mockCustomerRepository.search).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        customerType: CustomerType.CORPORATE,
        status: CustomerStatus.ACTIVE,
        search: 'enterprise',
        agencyId: '550e8400-e29b-41d4-a716-446655440006',
      });
    });
  });

  describe('Pagination Edge Cases', () => {
    it('should handle large result sets', async () => {
      mockCustomerRepository.search.mockResolvedValue({
        customers: mockCustomers,
        total: 10000,
        limit: 50,
        offset: 0,
        hasMore: true,
      });

      const result = await handler.handle(validQuery);

      expect(result.success).toBe(true);
      expect(result.total).toBe(10000);
      expect(result.hasMore).toBe(true);
    });

    it('should handle last page correctly', async () => {
      const lastPageQuery = {
        ...validQuery,
        limit: 50,
        offset: 950,
      };

      mockCustomerRepository.search.mockResolvedValue({
        customers: mockCustomers,
        total: 1000,
        limit: 50,
        offset: 950,
        hasMore: false,
      });

      const result = await handler.handle(lastPageQuery);

      expect(result.success).toBe(true);
      expect(result.total).toBe(1000);
      expect(result.hasMore).toBe(false);
    });

    it('should handle maximum limit boundary', async () => {
      const maxLimitQuery = {
        ...validQuery,
        limit: 1000, // Maximum allowed
      };

      const result = await handler.handle(maxLimitQuery);

      expect(result.success).toBe(true);
      expect(mockCustomerRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 1000,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle user repository errors', async () => {
      mockUserRepository.findById.mockRejectedValue(new Error('User repository error'));

      await expect(handler.handle(validQuery)).rejects.toThrow('User repository error');
    });

    it('should handle customer repository errors', async () => {
      mockCustomerRepository.search.mockRejectedValue(new Error('Customer repository error'));

      await expect(handler.handle(validQuery)).rejects.toThrow('Customer repository error');
    });

    it('should handle malformed customer data gracefully', async () => {
      const malformedCustomer = {
        ...mockCustomers[0],
        getDisplayInfo: jest.fn().mockReturnValue({
          fullName: 'Test Customer',
        }),
      };

      mockCustomerRepository.search.mockResolvedValue({
        customers: [malformedCustomer],
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false,
      });

      const result = await handler.handle(validQuery);

      expect(result.success).toBe(true);
      expect(result.customers).toHaveLength(1);
    });
  });
});

// Helper function to create mock customers
function createMockCustomer(overrides: any = {}): Customer {
  const defaults = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    customerCode: 'CUST001',
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Test Company',
    customerType: CustomerType.WHOLESALE,
    status: CustomerStatus.ACTIVE,
    email: new Email('john@testcompany.com'),
    creditLimit: Money.fromDecimal(50000, 'USD'),
    createdAt: new Date(),
  };

  const merged = { ...defaults, ...overrides };

  return {
    ...merged,
    getDisplayInfo: jest.fn().mockReturnValue({
      fullName: `${merged.firstName} ${merged.lastName}`,
      email: merged.email.toString(),
    }),
    toString: jest.fn().mockReturnValue(merged.creditLimit.toString()),
  } as any;
}
