/**
 * Get Agencies Handler Tests
 *
 * Comprehensive test suite for GetAgenciesHandler following CQRS pattern.
 * Tests authorization, validation, business rules, and error handling.
 *
 * @domain Agency Management
 * @pattern Command Handler Testing
 * @architecture Hexagonal Architecture - Multi-tenant
 * @version 1.0.0
 */

import { GetAgenciesHandler } from '../get-agencies.handler';
import { GetAgenciesQuery } from '../../../queries/agency/get-agencies.query';
import { Agency, AgencyStatus } from '../../../../domain/entities/agency';
import { IAgencyRepository } from '../../../../domain/repositories/agency.repository';
import { IUserRepository } from '../../../../domain/repositories/user.repository';
import { Permission, SystemRole, Role } from '../../../../domain/value-objects/role';
import { User } from '../../../../domain/entities/user';
import { Email } from '../../../../domain/value-objects/email';

describe('GetAgenciesHandler', () => {
  let handler: GetAgenciesHandler;
  let mockAgencyRepository: jest.Mocked<IAgencyRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  // Test data
  const validQuery: GetAgenciesQuery = {
    limit: 10,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    requestedBy: '550e8400-e29b-41d4-a716-446655440000',
  };

  const createMockUser = (role: string, permissions: Permission[] = []) => {
    const roleObj = new Role(role);
    // For ADMIN and SUPER_ADMIN roles, ensure they have MANAGE_SETTINGS permission
    const additionalPermissions =
      role === 'ADMIN' || role === 'SUPER_ADMIN' ? [Permission.MANAGE_SETTINGS, ...permissions] : permissions;
    const allPermissions = [...additionalPermissions, ...Array.from(roleObj.permissions)];

    return {
      id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID v4 format
      email: new Email('test@example.com'),
      role: roleObj,
      hasPermission: jest.fn((permission: Permission) => allPermissions.includes(permission)),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any; // Type assertion to bypass strict type checking for mocks
  };

  const createMockAgency = (overrides: Partial<any> = {}) => {
    return {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Test Agency',
      contactPerson: 'John Doe',
      email: new Email('contact@testagency.com'),
      phone: '+1234567890',
      address: '123 Test Street',
      status: AgencyStatus.ACTIVE,
      isOperational: jest.fn().mockReturnValue(true),
      databasePath: 'test-agency.db',
      settings: {
        currency: 'USD',
        allowCreditSales: true,
        enableInventoryTracking: true,
        taxRate: 0.1,
        defaultCreditDays: 30,
        maxCreditLimit: 10000,
        requireApprovalForOrders: false,
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
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      createdBy: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID v4 format
      ...overrides,
    } as any; // Type assertion to bypass strict type checking for mocks
  };

  beforeEach(() => {
    // Mock agency repository
    mockAgencyRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findByDatabasePath: jest.fn(),
      existsByName: jest.fn(),
      existsByDatabasePath: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
      findByStatus: jest.fn(),
      findOperational: jest.fn(),
      count: jest.fn(),
      countByCriteria: jest.fn(),
      suspend: jest.fn(),
      activate: jest.fn(),
      getStats: jest.fn(),
      initializeAgencyDatabase: jest.fn(),
      backupAgencyDatabase: jest.fn(),
      restoreAgencyDatabase: jest.fn(),
      getDatabaseSize: jest.fn(),
      beginTransaction: jest.fn(),
      isHealthy: jest.fn(),
    };

    // Mock user repository
    mockUserRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      existsByEmail: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
      findByRole: jest.fn(),
      findByStatus: jest.fn(),
      findLockedUsers: jest.fn(),
      count: jest.fn(),
      countByCriteria: jest.fn(),
      getStats: jest.fn(),
      beginTransaction: jest.fn(),
      isHealthy: jest.fn(),
    };

    handler = new GetAgenciesHandler(mockAgencyRepository, mockUserRepository);
  });

  describe('Successful Operations', () => {
    it('should handle get agencies query successfully', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN');
      const mockAgency = createMockAgency();

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.search.mockResolvedValue({
        agencies: [mockAgency],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agencies).toHaveLength(1);
      expect(result.agencies[0]).toEqual({
        id: mockAgency.id,
        name: mockAgency.name,
        contactPerson: mockAgency.contactPerson,
        email: mockAgency.email.value,
        phone: mockAgency.phone,
        status: mockAgency.status,
        isOperational: true,
        allowsCreditSales: mockAgency.settings.allowCreditSales,
        currency: mockAgency.settings.currency,
        databasePath: mockAgency.databasePath,
        createdAt: mockAgency.createdAt,
        updatedAt: mockAgency.updatedAt,
      });
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should handle empty results', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN');

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.search.mockResolvedValue({
        agencies: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agencies).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN');
      const queryWithPagination = {
        ...validQuery,
        limit: 5,
        offset: 10,
      };

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.search.mockResolvedValue({
        agencies: [createMockAgency()],
        total: 25,
        limit: 5,
        offset: 10,
        hasMore: true,
      });

      // Act
      const result = await handler.handle(queryWithPagination);

      // Assert
      expect(result.success).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.offset).toBe(10);
      expect(result.total).toBe(25);
      expect(result.hasMore).toBe(true);
    });

    it('should handle agencies with optional fields as null', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN');
      const mockAgency = createMockAgency({
        contactPerson: undefined,
        email: undefined,
        phone: undefined,
      });

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.search.mockResolvedValue({
        agencies: [mockAgency],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agencies[0].contactPerson).toBe(null);
      expect(result.agencies[0].email).toBe(null);
      expect(result.agencies[0].phone).toBe(null);
    });

    it('should apply search filters correctly', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN');
      const queryWithFilters = {
        ...validQuery,
        search: 'Test Agency',
        status: AgencyStatus.ACTIVE,
        currency: 'USD',
        allowsCreditSales: true,
      };

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.search.mockResolvedValue({
        agencies: [createMockAgency()],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(queryWithFilters);

      // Assert
      expect(result.success).toBe(true);
      expect(mockAgencyRepository.search).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        searchTerm: 'Test Agency',
        status: AgencyStatus.ACTIVE,
        currency: 'USD',
        allowsCreditSales: true,
      });
    });

    it('should handle date range filters', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN');
      const queryWithDateFilters = {
        ...validQuery,
        createdAfter: '2024-01-01T00:00:00.000Z',
        createdBefore: '2024-12-31T23:59:59.999Z',
      };

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.search.mockResolvedValue({
        agencies: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(queryWithDateFilters);

      // Assert
      expect(result.success).toBe(true);
      expect(mockAgencyRepository.search).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        createdAfter: new Date('2024-01-01T00:00:00.000Z'),
        createdBefore: new Date('2024-12-31T23:59:59.999Z'),
      });
    });
  });

  describe('Authorization', () => {
    it('should reject user without MANAGE_SETTINGS permission', async () => {
      // Arrange
      const userWithoutPermission = createMockUser('VIEWER', [Permission.READ_CUSTOMER]);

      mockUserRepository.findById.mockResolvedValue(userWithoutPermission);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to view agencies');
      expect(result.agencies).toHaveLength(0);
    });

    it('should allow user with MANAGE_SETTINGS permission', async () => {
      // Arrange
      const userWithPermission = createMockUser('ADMIN'); // ADMIN has MANAGE_SETTINGS by default

      mockUserRepository.findById.mockResolvedValue(userWithPermission);
      mockAgencyRepository.search.mockResolvedValue({
        agencies: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle non-existent user', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Requesting user not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN');
      const repositoryError = new Error('Database connection failed');

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.search.mockRejectedValue(repositoryError);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(result.agencies).toHaveLength(0);
    });

    it('should handle user repository errors', async () => {
      // Arrange
      const userRepositoryError = new Error('User service unavailable');

      mockUserRepository.findById.mockRejectedValue(userRepositoryError);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User service unavailable');
    });

    it('should handle invalid query validation', async () => {
      // Arrange
      const invalidQuery = {
        ...validQuery,
        limit: -1, // Invalid limit
      };

      // Act
      const result = await handler.handle(invalidQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });
  });

  describe('Business Rules', () => {
    it('should map contactPerson sort to name sort', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN');
      const queryWithContactPersonSort = {
        ...validQuery,
        sortBy: 'contactPerson' as any, // This should be mapped to 'name'
      };

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.search.mockResolvedValue({
        agencies: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(queryWithContactPersonSort);

      // Assert
      expect(result.success).toBe(true);
      expect(mockAgencyRepository.search).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        sortBy: 'name', // Should be mapped from contactPerson
        sortOrder: 'DESC',
      });
    });

    it('should sanitize search criteria in response', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN');

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.search.mockResolvedValue({
        agencies: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.searchCriteria).not.toHaveProperty('requestedBy');
      expect(result.searchCriteria).toHaveProperty('limit');
      expect(result.searchCriteria).toHaveProperty('offset');
    });
  });

  describe('Factory Function', () => {
    it('should create handler instance correctly', () => {
      // Act
      const { createGetAgenciesHandler } = require('../get-agencies.handler');
      const factoryHandler = createGetAgenciesHandler(mockAgencyRepository, mockUserRepository);

      // Assert
      expect(factoryHandler).toBeInstanceOf(GetAgenciesHandler);
    });
  });
});
