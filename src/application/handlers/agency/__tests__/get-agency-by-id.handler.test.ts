/**
 * Get Agency By ID Handler Tests
 *
 * Comprehensive test suite for GetAgencyByIdHandler following CQRS pattern.
 * Tests authorization, validation, business rules, and error handling.
 *
 * @domain Agency Management
 * @pattern Query Handler Testing
 * @architecture Hexagonal Architecture - Multi-tenant
 * @version 1.0.0
 */

import { GetAgencyByIdHandler } from '../get-agency-by-id.handler';
import { GetAgencyByIdQuery } from '../../../queries/agency/get-agency-by-id.query';
import { Agency, AgencyStatus } from '../../../../domain/entities/agency';
import { IAgencyRepository } from '../../../../domain/repositories/agency.repository';
import { IUserRepository } from '../../../../domain/repositories/user.repository';
import { Permission, SystemRole, Role } from '../../../../domain/value-objects/role';
import { Email } from '../../../../domain/value-objects/email';

describe('GetAgencyByIdHandler', () => {
  let handler: GetAgencyByIdHandler;
  let mockAgencyRepository: jest.Mocked<IAgencyRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  // Test data
  const validQuery: GetAgencyByIdQuery = {
    agencyId: '550e8400-e29b-41d4-a716-446655440001',
    requestedBy: '550e8400-e29b-41d4-a716-446655440000',
    includeSettings: false,
    includeStats: false,
  };

  const createMockUser = (role: string, permissions: Permission[] = []) => {
    const roleObj = new Role(role);
    // For ADMIN and SUPER_ADMIN roles, ensure they have MANAGE_SETTINGS permission
    const additionalPermissions =
      role === 'ADMIN' || role === 'SUPER_ADMIN' ? [Permission.MANAGE_SETTINGS, ...permissions] : permissions;
    const allPermissions = [...additionalPermissions, ...Array.from(roleObj.permissions)];

    return {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: new Email('test@example.com'),
      role: roleObj,
      hasPermission: jest.fn((permission: Permission) => allPermissions.includes(permission)),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
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
      databasePath: '/data/test-agency.db',
      isOperational: jest.fn(() => true),
      settings: {
        allowCreditSales: true,
        defaultCreditDays: 30,
        maxCreditLimit: 10000,
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
          newOrders: false,
        },
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      createdBy: '550e8400-e29b-41d4-a716-446655440000',
      ...overrides,
    } as any;
  };

  beforeEach(() => {
    // Setup mocks
    mockAgencyRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
      count: jest.fn(),
      exists: jest.fn(),
      findByName: jest.fn(),
      findByEmail: jest.fn(),
      findByContactPerson: jest.fn(),
      findByPhone: jest.fn(),
      findByStatus: jest.fn(),
      findByCreatedBy: jest.fn(),
      findByDateRange: jest.fn(),
      findByBusinessSettings: jest.fn(),
      findOperational: jest.fn(),
      findByDatabasePath: jest.fn(),
      findBySearchTerm: jest.fn(),
      findByCurrency: jest.fn(),
      findByTaxRate: jest.fn(),
      findByCreditSettings: jest.fn(),
      findByInventoryTracking: jest.fn(),
      findByBusinessHours: jest.fn(),
      findByNotificationSettings: jest.fn(),
      bulkCreate: jest.fn(),
      bulkUpdate: jest.fn(),
      bulkDelete: jest.fn(),
    } as jest.Mocked<IAgencyRepository>;

    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findByEmail: jest.fn(),
      exists: jest.fn(),
      count: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    handler = new GetAgencyByIdHandler(mockAgencyRepository, mockUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Operations', () => {
    it('should handle get agency by ID query successfully', async () => {
      // Arrange
      const mockUser = createMockUser('ADMIN');
      const mockAgency = createMockAgency();

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agency).toBeDefined();
      expect(result.agency?.id).toBe(mockAgency.id);
      expect(result.agency?.name).toBe(mockAgency.name);
      expect(result.agency?.email).toBe(mockAgency.email.value);
      expect(result.agency?.status).toBe(mockAgency.status);
      expect(result.agency?.isOperational).toBe(true);
      expect(result.error).toBeUndefined();

      expect(mockUserRepository.findById).toHaveBeenCalledWith(validQuery.requestedBy);
      expect(mockAgencyRepository.findById).toHaveBeenCalledWith(validQuery.agencyId);
    });

    it('should include settings when requested', async () => {
      // Arrange
      const queryWithSettings: GetAgencyByIdQuery = {
        ...validQuery,
        includeSettings: true,
      };
      const mockUser = createMockUser('ADMIN');
      const mockAgency = createMockAgency();

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);

      // Act
      const result = await handler.handle(queryWithSettings);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agency?.settings).toBeDefined();
      expect(result.agency?.settings?.allowCreditSales).toBe(mockAgency.settings.allowCreditSales);
      expect(result.agency?.settings?.currency).toBe(mockAgency.settings.currency);
      expect(result.agency?.settings?.businessHours).toBeDefined();
      expect(result.agency?.settings?.notifications).toBeDefined();
    });

    it('should include stats when requested', async () => {
      // Arrange
      const queryWithStats: GetAgencyByIdQuery = {
        ...validQuery,
        includeStats: true,
      };
      const mockUser = createMockUser('ADMIN');
      const mockAgency = createMockAgency();

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);

      // Act
      const result = await handler.handle(queryWithStats);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agency?.stats).toBeDefined();
      expect(result.agency?.stats?.totalCustomers).toBeDefined();
      expect(result.agency?.stats?.totalProducts).toBeDefined();
      expect(result.agency?.stats?.lastActivityDate).toBeDefined();
    });

    it('should include both settings and stats when requested', async () => {
      // Arrange
      const queryWithBoth: GetAgencyByIdQuery = {
        ...validQuery,
        includeSettings: true,
        includeStats: true,
      };
      const mockUser = createMockUser('ADMIN');
      const mockAgency = createMockAgency();

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);

      // Act
      const result = await handler.handle(queryWithBoth);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agency?.settings).toBeDefined();
      expect(result.agency?.stats).toBeDefined();
    });

    it('should allow super admin to access any agency', async () => {
      // Arrange
      const mockUser = createMockUser('SUPER_ADMIN');
      const mockAgency = createMockAgency();

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agency).toBeDefined();
    });
  });

  describe('Authorization', () => {
    it('should reject request when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.agency).toBeNull();
      expect(result.error).toBe('Requesting user not found');
    });

    it('should reject request when user lacks MANAGE_SETTINGS permission', async () => {
      // Arrange
      const mockUser = createMockUser('VIEWER'); // VIEWER doesn't have MANAGE_SETTINGS
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.agency).toBeNull();
      expect(result.error).toBe('Insufficient permissions to view agency details');
    });

    it('should allow admin users to access agencies', async () => {
      // Arrange
      const mockUser = createMockUser('ADMIN');
      const mockAgency = createMockAgency();

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agency).toBeDefined();
    });
  });

  describe('Agency Not Found', () => {
    it('should return success with null agency when agency not found', async () => {
      // Arrange
      const mockUser = createMockUser('ADMIN');
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAgencyRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agency).toBeNull();
      expect(result.error).toBe('Agency not found');
    });
  });

  describe('Validation', () => {
    it('should reject invalid agency ID format', async () => {
      // Arrange
      const invalidQuery = {
        ...validQuery,
        agencyId: 'invalid-uuid',
      };

      // Act
      const result = await handler.handle(invalidQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.agency).toBeNull();
      expect(result.error).toContain('validation failed');
    });

    it('should reject invalid requestedBy format', async () => {
      // Arrange
      const invalidQuery = {
        ...validQuery,
        requestedBy: 'invalid-uuid',
      };

      // Act
      const result = await handler.handle(invalidQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.agency).toBeNull();
      expect(result.error).toContain('validation failed');
    });

    it('should reject when agencyId equals requestedBy', async () => {
      // Arrange
      const invalidQuery = {
        ...validQuery,
        agencyId: validQuery.requestedBy, // Same as requestedBy
      };

      // Act
      const result = await handler.handle(invalidQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.agency).toBeNull();
      expect(result.error).toBe('Agency ID cannot be the same as requesting user ID');
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      const mockUser = createMockUser('ADMIN');
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAgencyRepository.findById.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.agency).toBeNull();
      expect(result.error).toBe('Database connection failed');
    });

    it('should handle user repository errors gracefully', async () => {
      // Arrange
      mockUserRepository.findById.mockRejectedValue(new Error('User service unavailable'));

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.agency).toBeNull();
      expect(result.error).toBe('User service unavailable');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const mockUser = createMockUser('ADMIN');
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAgencyRepository.findById.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(false);
      expect(result.agency).toBeNull();
      expect(result.error).toBe('Unexpected error');
    });
  });

  describe('Data Conversion', () => {
    it('should properly convert agency entity to details format', async () => {
      // Arrange
      const mockUser = createMockUser('ADMIN');
      const mockAgency = createMockAgency({
        contactPerson: null,
        phone: null,
        address: null,
        createdBy: null,
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agency?.contactPerson).toBeNull();
      expect(result.agency?.phone).toBeNull();
      expect(result.agency?.address).toBeNull();
      expect(result.agency?.createdBy).toBeNull();
      expect(result.agency?.email).toBe(mockAgency.email.value);
    });

    it('should handle agency with all optional fields populated', async () => {
      // Arrange
      const mockUser = createMockUser('ADMIN');
      const mockAgency = createMockAgency();

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAgencyRepository.findById.mockResolvedValue(mockAgency);

      // Act
      const result = await handler.handle(validQuery);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agency?.contactPerson).toBe(mockAgency.contactPerson);
      expect(result.agency?.phone).toBe(mockAgency.phone);
      expect(result.agency?.address).toBe(mockAgency.address);
      expect(result.agency?.createdBy).toBe(mockAgency.createdBy);
    });
  });
});
