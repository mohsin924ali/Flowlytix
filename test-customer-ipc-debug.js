// Simple debug script to test customer IPC handler
const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');

// Mock the IPC event
const mockEvent = {
  sender: {
    send: jest.fn(),
  },
};

// Test the customer IPC handler
async function testCustomerIpcHandler() {
  try {
    console.log('Testing customer IPC handler...');

    // Import after setting up mocks
    const { CustomerIpcHandler } = require('./src/main/ipc/customer.ipc.ts');
    const { CustomerType, CustomerStatus } = require('./src/domain/entities/customer.ts');
    const { Permission } = require('./src/domain/value-objects/role.ts');

    // Create mock repositories
    const mockCustomerRepository = {
      async search(criteria) {
        console.log('Mock customer repository search called with:', criteria);
        return {
          customers: [],
          total: 0,
          limit: criteria.limit || 50,
          offset: criteria.offset || 0,
          hasMore: false,
        };
      },
    };

    const mockUserRepository = {
      async findById(id) {
        console.log('Mock user repository findById called with:', id);
        if (id === 'admin-user-id') {
          return {
            id: 'admin-user-id',
            email: { value: 'admin@example.com', toString: () => 'admin@example.com' },
            role: {
              name: 'ADMIN',
              value: 'ADMIN',
              permissions: new Set([Permission.READ_CUSTOMER]),
            },
            hasPermission: (permission) => {
              console.log('Checking permission:', permission);
              return permission === Permission.READ_CUSTOMER;
            },
          };
        }
        return null;
      },
    };

    // Create handler
    const handler = new CustomerIpcHandler(mockCustomerRepository, mockUserRepository);

    // Test get customers
    const request = {
      limit: 10,
      offset: 0,
      agencyId: 'test-agency-id',
      requestedBy: 'admin-user-id',
    };

    console.log('Calling handleGetCustomers with request:', request);
    const response = await handler.handleGetCustomers(mockEvent, request);

    console.log('Response:', JSON.stringify(response, null, 2));

    if (!response.success) {
      console.error('Error:', response.error);
      console.error('Code:', response.code);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testCustomerIpcHandler();
