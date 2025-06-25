/**
 * Customer IPC Handler Tests - Step 5d
 *
 * Comprehensive test suite for customer IPC operations.
 * Tests all customer operations: get, create, update, delete.
 * Includes validation, authorization, error handling, and business logic tests.
 *
 * @domain Customer Management
 * @pattern Integration Testing
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

// Mock ipcMain first
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn(),
  },
}));

import { IpcMainInvokeEvent } from 'electron';
import { CustomerIpcHandler } from '../customer.ipc';
import { ICustomerRepository } from '../../../domain/repositories/customer.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { CustomerType, CustomerStatus, PaymentTerms } from '../../../domain/entities/customer';
import { Permission, Role } from '../../../domain/value-objects/role';
import { Money } from '../../../domain/value-objects/money';

// Get the mocked ipcMain
const mockIpcMain = require('electron').ipcMain;

// Mock implementations
class MockCustomerRepository implements Partial<ICustomerRepository> {
  private customers = new Map<string, any>();
  private customersByCode = new Map<string, any>();
  private customersByEmail = new Map<string, any>();

  async save(customer: any): Promise<any> {
    // Generate a new ID if not provided
    const savedCustomer = {
      ...customer,
      id: customer.id || 'customer-' + Date.now(),
    };

    this.customers.set(savedCustomer.id, savedCustomer);
    this.customersByCode.set(`${savedCustomer.customerCode}-${savedCustomer.agencyId}`, savedCustomer);
    this.customersByEmail.set(
      `${savedCustomer.email?.value || savedCustomer.email}-${savedCustomer.agencyId}`,
      savedCustomer
    );

    // Return the saved customer entity (not just the ID)
    return savedCustomer;
  }

  async update(customer: any): Promise<any> {
    this.customers.set(customer.id, customer);
    return customer;
  }

  async findById(id: string): Promise<any> {
    return this.customers.get(id) || null;
  }

  async findByCustomerCode(code: string, agencyId: string): Promise<any> {
    return this.customersByCode.get(`${code}-${agencyId}`) || null;
  }

  async findByEmail(email: any, agencyId: string): Promise<any> {
    return this.customersByEmail.get(`${email.value}-${agencyId}`) || null;
  }

  async search(criteria: any): Promise<any> {
    // Create mock customer entities that match what the handler expects
    const mockCustomers: any[] = [];

    // For testing purposes, create a sample customer entity with required methods
    if (criteria.limit > 0) {
      const mockCustomer = {
        id: 'customer-123',
        customerCode: 'CUST001',
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'Test Company',
        customerType: CustomerType.RETAIL,
        status: CustomerStatus.ACTIVE,
        createdAt: new Date('2024-01-01'),
        email: {
          toString: () => 'john.doe@example.com',
          value: 'john.doe@example.com',
        },
        creditLimit: {
          toString: () => '$5,000.00',
          amount: 5000,
          currency: 'USD',
        },
        // Add the getDisplayInfo method that the handler expects
        getDisplayInfo: () => ({
          fullName: 'John Doe',
          customerCode: 'CUST001',
          email: 'john.doe@example.com',
          companyName: 'Test Company',
        }),
        // Add other methods that might be called
        getTotalOrders: () => ({ amount: 1000, currency: 'USD' }),
        getDaysSinceLastOrder: () => 30,
        hasOverduePayments: () => false,
        getCreditUtilization: () => 0.2,
      };

      mockCustomers.push(mockCustomer);
    }

    return {
      customers: mockCustomers,
      total: mockCustomers.length,
      limit: criteria.limit || 50,
      offset: criteria.offset || 0,
      hasMore: false,
    };
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.customers.has(id);
    this.customers.delete(id);
    return existed;
  }
}

class MockUserRepository implements Partial<IUserRepository> {
  private users = new Map<string, any>();

  constructor() {
    // Pre-populate with test users using proper UUIDs
    const adminUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: { value: 'admin@example.com', toString: () => 'admin@example.com' },
      role: {
        name: 'ADMIN',
        value: 'ADMIN',
        permissions: new Set([
          Permission.READ_CUSTOMER,
          Permission.CREATE_CUSTOMER,
          Permission.UPDATE_CUSTOMER,
          Permission.DELETE_CUSTOMER,
        ]),
      },
      hasPermission: (permission: Permission) => {
        return [
          Permission.READ_CUSTOMER,
          Permission.CREATE_CUSTOMER,
          Permission.UPDATE_CUSTOMER,
          Permission.DELETE_CUSTOMER,
        ].includes(permission);
      },
    };

    const unauthorizedUser = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: { value: 'user@example.com', toString: () => 'user@example.com' },
      role: {
        name: 'VIEWER',
        value: 'VIEWER',
        permissions: new Set([]),
      },
      hasPermission: (permission: Permission) => {
        return false; // No permissions
      },
    };

    this.users.set('550e8400-e29b-41d4-a716-446655440000', adminUser);
    this.users.set('550e8400-e29b-41d4-a716-446655440001', unauthorizedUser);
  }

  async findById(id: string): Promise<any> {
    const user = this.users.get(id);
    console.log(`MockUserRepository.findById(${id}):`, user ? 'found' : 'not found');
    return user || null;
  }

  async findByEmail(email: any): Promise<any> {
    for (const user of this.users.values()) {
      if (user.email.value === email.value) {
        return user;
      }
    }
    return null;
  }

  async save(user: any): Promise<any> {
    this.users.set(user.id, user);
    return user;
  }
}

describe('CustomerIpcHandler - Step 5d', () => {
  let customerRepository: MockCustomerRepository;
  let userRepository: MockUserRepository;
  let customerIpcHandler: CustomerIpcHandler;
  let mockEvent: IpcMainInvokeEvent;

  beforeEach(() => {
    jest.clearAllMocks();
    customerRepository = new MockCustomerRepository();
    userRepository = new MockUserRepository();
    customerIpcHandler = CustomerIpcHandler.create(customerRepository as any, userRepository as any);
    mockEvent = {} as IpcMainInvokeEvent;
  });

  afterEach(() => {
    customerIpcHandler.unregisterHandlers();
  });

  describe('Handler Creation and Registration', () => {
    it('should create handler successfully', () => {
      expect(customerIpcHandler).toBeDefined();
      expect(customerIpcHandler.getStats().handlerCount).toBe(0);
    });

    it('should register handlers successfully', () => {
      customerIpcHandler.registerHandlers();

      expect(mockIpcMain.handle).toHaveBeenCalledTimes(4);
      expect(mockIpcMain.handle).toHaveBeenCalledWith('customer:get-customers', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('customer:create-customer', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('customer:update-customer', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('customer:delete-customer', expect.any(Function));

      const stats = customerIpcHandler.getStats();
      expect(stats.handlerCount).toBe(4);
      expect(stats.registeredChannels).toContain('customer:get-customers');
      expect(stats.registeredChannels).toContain('customer:create-customer');
      expect(stats.registeredChannels).toContain('customer:update-customer');
      expect(stats.registeredChannels).toContain('customer:delete-customer');
    });

    it('should throw error with invalid customer repository', () => {
      expect(() => CustomerIpcHandler.create(null as any, userRepository as any)).toThrow();
    });

    it('should throw error with invalid user repository', () => {
      expect(() => CustomerIpcHandler.create(customerRepository as any, null as any)).toThrow();
    });
  });

  describe('Get Customers Handler', () => {
    beforeEach(() => {
      customerIpcHandler.registerHandlers();
    });

    it('should handle valid get customers request', async () => {
      const request = {
        limit: 10,
        offset: 0,
        agencyId: '550e8400-e29b-41d4-a716-446655440002',
        requestedBy: '550e8400-e29b-41d4-a716-446655440000',
      };

      console.log('Testing get customers with request:', request);

      try {
        const response = await (customerIpcHandler as any).handleGetCustomers(mockEvent, request);
        console.log('Get customers response received:', {
          success: response.success,
          error: response.error,
          code: response.code,
          data: response.data ? 'data present' : 'no data',
        });

        // Debug the response
        if (!response.success) {
          console.error('Get customers failed with error:', response.error);
          console.error('Error code:', response.code);
          console.error('Full response:', JSON.stringify(response, null, 2));

          // Let's also test the mock user repository
          const testUser = await userRepository.findById('550e8400-e29b-41d4-a716-446655440000');
          console.log('Mock user found:', testUser);
          console.log(
            'Mock user has permission:',
            testUser?.hasPermission ? testUser.hasPermission(Permission.READ_CUSTOMER) : 'no hasPermission method'
          );
        }

        expect(response.success).toBe(true);
        if (response.data) {
          expect(response.data.customers).toBeDefined();
          expect(response.data.total).toBeDefined();
          expect(response.data.limit).toBe(10);
          expect(response.data.offset).toBe(0);
        }
      } catch (error) {
        console.error('Test threw exception:', error);
        console.error('Exception stack:', (error as Error).stack);
        throw error;
      }
    });

    it('should validate required requestedBy field', async () => {
      const request = {
        limit: 10,
        offset: 0,
        // missing requestedBy
      };

      const response = await (customerIpcHandler as any).handleGetCustomers(mockEvent, request);

      expect(response.success).toBe(false);
      expect(response.code).toBe('CUSTOMER_VALIDATION_ERROR');
    });
  });

  describe('Create Customer Handler', () => {
    beforeEach(() => {
      customerIpcHandler.registerHandlers();
    });

    it('should handle valid create customer request', async () => {
      const request = {
        customerCode: 'CUST001',
        firstName: 'John',
        lastName: 'Doe',
        customerType: CustomerType.RETAIL,
        email: 'john.doe@example.com',
        creditLimit: 5000,
        creditLimitCurrency: 'USD',
        paymentTerms: PaymentTerms.NET_30,
        addresses: [
          {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
            isDefault: true,
            addressType: 'BOTH' as const,
          },
        ],
        agencyId: '550e8400-e29b-41d4-a716-446655440002',
        requestedBy: '550e8400-e29b-41d4-a716-446655440000',
      };

      const response = await (customerIpcHandler as any).handleCreateCustomer(mockEvent, request);

      console.log('Create customer response:', JSON.stringify(response, null, 2));
      expect(response.success).toBe(true);
      if (response.data) {
        expect(response.data.customerId).toBeDefined();
        expect(response.data.customerCode).toBe('CUST001');
      }
    });

    it('should handle validation errors', async () => {
      const request = {
        // Missing required fields
        customerCode: '',
        requestedBy: '550e8400-e29b-41d4-a716-446655440000',
      };

      const response = await (customerIpcHandler as any).handleCreateCustomer(mockEvent, request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should handle authorization errors', async () => {
      const request = {
        customerCode: 'CUST001',
        firstName: 'John',
        lastName: 'Doe',
        customerType: CustomerType.RETAIL,
        email: 'john.doe@example.com',
        creditLimit: 5000,
        creditLimitCurrency: 'USD',
        paymentTerms: PaymentTerms.NET_30,
        addresses: [
          {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
            isDefault: true,
            addressType: 'BOTH' as const,
          },
        ],
        agencyId: '550e8400-e29b-41d4-a716-446655440002',
        requestedBy: '550e8400-e29b-41d4-a716-446655440001',
      };

      const response = await (customerIpcHandler as any).handleCreateCustomer(mockEvent, request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('Update Customer Handler', () => {
    beforeEach(() => {
      customerIpcHandler.registerHandlers();
    });

    it('should handle validation errors', async () => {
      const request = {
        // Missing required fields
        customerId: '',
        requestedBy: '550e8400-e29b-41d4-a716-446655440000',
      };

      const response = await (customerIpcHandler as any).handleUpdateCustomer(mockEvent, request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('Delete Customer Handler', () => {
    beforeEach(() => {
      customerIpcHandler.registerHandlers();
    });

    it('should handle validation errors', async () => {
      const request = {
        // Missing required fields
        customerId: '',
        reason: '',
        requestedBy: '550e8400-e29b-41d4-a716-446655440000',
      };

      const response = await (customerIpcHandler as any).handleDeleteCustomer(mockEvent, request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      customerIpcHandler.registerHandlers();
    });

    it('should handle invalid request format', async () => {
      const request = {
        invalidField: 'invalid',
      };

      const response = await (customerIpcHandler as any).handleGetCustomers(mockEvent, request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });
});
