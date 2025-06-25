/**
 * Tests for CreateAgencyHandler
 *
 * Test Coverage:
 * - Command validation and authorization
 * - Business rule enforcement
 * - Role-based authorization
 * - Database initialization
 * - Error handling and edge cases
 * - Success scenarios
 */

import { CreateAgencyHandler, CreateAgencyResult } from '../create-agency.handler';
import { CreateAgencyCommand } from '../../../commands/agency/create-agency.command';
import { Agency, AgencyStatus } from '../../../../domain/entities/agency';
import { IAgencyRepository } from '../../../../domain/repositories/agency.repository';
import { IUserRepository } from '../../../../domain/repositories/user.repository';
import { User } from '../../../../domain/entities/user';
import { Role, SystemRole, Permission } from '../../../../domain/value-objects/role';

describe('CreateAgencyHandler', () => {
  let handler: CreateAgencyHandler;
  let mockAgencyRepository: jest.Mocked<IAgencyRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  // Mock user data
  const createMockUser = (roleName: string, permissions: Permission[] = []): User => {
    const role = new Role(roleName as SystemRole);
    const mockUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      username: 'testuser',
      email: { value: 'test@example.com' },
      role,
      hasPermission: jest.fn(
        (permission: Permission) => permissions.includes(permission) || role.hasPermission(permission)
      ),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as User;

    return mockUser;
  };

  // Valid test command
  const validCommand: CreateAgencyCommand = {
    name: 'Test Agency',
    databasePath: 'test-agency.db',
    contactPerson: 'John Doe',
    phone: '+1-555-0123',
    email: 'contact@testagency.com',
    address: '123 Business St, City, State 12345',
    settings: {
      allowCreditSales: true,
      defaultCreditDays: 30,
      maxCreditLimit: 50000,
      requireApprovalForOrders: false,
      enableInventoryTracking: true,
      taxRate: 0.08,
      currency: 'USD',
      businessHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'EST',
      },
      notifications: {
        lowStock: true,
        overduePayments: true,
        newOrders: false,
      },
    },
    createdBy: '550e8400-e29b-41d4-a716-446655440000',
  };

  const mockAgency = Agency.create(
    {
      name: validCommand.name,
      databasePath: validCommand.databasePath,
    },
    validCommand.createdBy
  );

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

    handler = new CreateAgencyHandler(mockAgencyRepository, mockUserRepository);
  });

  describe('Successful agency creation', () => {
    it('should create agency successfully with admin user', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN', [Permission.MANAGE_SETTINGS, Permission.MANAGE_STOCK]);
      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.findByName.mockResolvedValue(null);
      mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);
      mockAgencyRepository.save.mockResolvedValue();
      mockAgencyRepository.initializeAgencyDatabase.mockResolvedValue(true);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agencyId).toBeDefined();
      expect(result.databasePath).toBe(validCommand.databasePath);
      expect(result.isOperational).toBe(true); // Admin auto-activates
      expect(result.error).toBeUndefined();

      expect(mockAgencyRepository.save).toHaveBeenCalledTimes(1);
      expect(mockAgencyRepository.initializeAgencyDatabase).toHaveBeenCalledTimes(1);
    });

    it('should create agency without auto-activation for non-admin user', async () => {
      // Arrange
      const managerUser = createMockUser('MANAGER', [Permission.MANAGE_SETTINGS, Permission.MANAGE_STOCK]);
      mockUserRepository.findById.mockResolvedValue(managerUser);
      mockAgencyRepository.findByName.mockResolvedValue(null);
      mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);
      mockAgencyRepository.save.mockResolvedValue();
      mockAgencyRepository.initializeAgencyDatabase.mockResolvedValue(true);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.isOperational).toBe(false); // Manager doesn't auto-activate
      expect(mockAgencyRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should handle minimal agency creation with only required fields', async () => {
      // Arrange
      const minimalCommand: CreateAgencyCommand = {
        name: 'Minimal Agency',
        databasePath: 'minimal.db',
        settings: {
          allowCreditSales: false,
          defaultCreditDays: 1,
          maxCreditLimit: 0,
          requireApprovalForOrders: true,
          enableInventoryTracking: false,
          taxRate: 0.05,
          currency: 'USD',
          businessHours: {
            start: '08:00',
            end: '18:00',
            timezone: 'UTC',
          },
          notifications: {
            lowStock: false,
            overduePayments: false,
            newOrders: false,
          },
        },
        createdBy: '550e8400-e29b-41d4-a716-446655440000',
      };

      const adminUser = createMockUser('ADMIN', [Permission.MANAGE_SETTINGS]);
      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.findByName.mockResolvedValue(null);
      mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);
      mockAgencyRepository.save.mockResolvedValue();
      mockAgencyRepository.initializeAgencyDatabase.mockResolvedValue(true);

      // Act
      const result = await handler.handle(minimalCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agencyId).toBeDefined();
      expect(mockAgencyRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authorization validation', () => {
    it('should reject when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Creating user not found');
      expect(mockAgencyRepository.save).not.toHaveBeenCalled();
    });

    it('should reject when user lacks MANAGE_SETTINGS permission', async () => {
      // Arrange
      const unauthorizedUser = createMockUser('EMPLOYEE', [Permission.READ_PRODUCT]);
      mockUserRepository.findById.mockResolvedValue(unauthorizedUser);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to create agency');
      expect(mockAgencyRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Uniqueness validation', () => {
    it('should reject when agency name already exists', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN', [Permission.MANAGE_SETTINGS]);
      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.findByName.mockResolvedValue(mockAgency);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Agency with this name already exists');
      expect(mockAgencyRepository.save).not.toHaveBeenCalled();
    });

    it('should reject when database path already exists', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN', [Permission.MANAGE_SETTINGS]);
      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.findByName.mockResolvedValue(null);
      mockAgencyRepository.findByDatabasePath.mockResolvedValue(mockAgency);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Agency with this database path already exists');
      expect(mockAgencyRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Role-based business rules', () => {
    describe('Credit limit validation', () => {
      it('should reject when credit limit exceeds user role limit', async () => {
        // Arrange
        const managerUser = createMockUser('MANAGER', [Permission.MANAGE_SETTINGS]);
        const commandWithHighCredit = {
          ...validCommand,
          settings: {
            ...validCommand.settings,
            allowCreditSales: true,
            maxCreditLimit: 5000000, // Exceeds manager limit of 1M
          },
        };

        mockUserRepository.findById.mockResolvedValue(managerUser);
        mockAgencyRepository.findByName.mockResolvedValue(null);
        mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);

        // Act
        const result = await handler.handle(commandWithHighCredit);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Maximum credit limit');
        expect(result.error).toContain('exceeds limit');
      });

      it('should reject when credit days exceed user role limit', async () => {
        // Arrange
        const managerUser = createMockUser('MANAGER', [Permission.MANAGE_SETTINGS]);
        const commandWithHighCreditDays = {
          ...validCommand,
          settings: {
            ...validCommand.settings,
            allowCreditSales: true,
            defaultCreditDays: 120, // Exceeds manager limit of 90
          },
        };

        mockUserRepository.findById.mockResolvedValue(managerUser);
        mockAgencyRepository.findByName.mockResolvedValue(null);
        mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);

        // Act
        const result = await handler.handle(commandWithHighCreditDays);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Default credit days');
        expect(result.error).toContain('exceeds limit');
      });
    });

    describe('Tax rate validation', () => {
      it('should reject high tax rates without MANAGE_SETTINGS permission', async () => {
        // Arrange
        const basicUser = createMockUser('EMPLOYEE', []); // No MANAGE_SETTINGS permission
        const commandWithHighTax = {
          ...validCommand,
          settings: {
            ...validCommand.settings,
            taxRate: 0.6, // 60% - exceeds 50% threshold
          },
        };

        mockUserRepository.findById.mockResolvedValue(basicUser);

        // Act
        const result = await handler.handle(commandWithHighTax);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Insufficient permissions to create agency');
      });

      it('should allow high tax rates with MANAGE_SETTINGS permission', async () => {
        // Arrange
        const adminUser = createMockUser('ADMIN', [Permission.MANAGE_SETTINGS]);
        const commandWithHighTax = {
          ...validCommand,
          settings: {
            ...validCommand.settings,
            taxRate: 0.6, // 60% - exceeds 50% threshold
          },
        };

        mockUserRepository.findById.mockResolvedValue(adminUser);
        mockAgencyRepository.findByName.mockResolvedValue(null);
        mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);
        mockAgencyRepository.save.mockResolvedValue();
        mockAgencyRepository.initializeAgencyDatabase.mockResolvedValue(true);

        // Act
        const result = await handler.handle(commandWithHighTax);

        // Assert
        expect(result.success).toBe(true);
      });
    });

    describe('Currency validation', () => {
      it('should reject non-standard currency for non-admin users', async () => {
        // Arrange
        const managerUser = createMockUser('MANAGER', [Permission.MANAGE_SETTINGS]);
        const commandWithExoticCurrency = {
          ...validCommand,
          settings: {
            ...validCommand.settings,
            currency: 'BTC', // Non-standard currency
          },
        };

        mockUserRepository.findById.mockResolvedValue(managerUser);
        mockAgencyRepository.findByName.mockResolvedValue(null);
        mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);

        // Act
        const result = await handler.handle(commandWithExoticCurrency);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Non-standard currencies require ADMIN role');
      });

      it('should allow non-standard currency for admin users', async () => {
        // Arrange
        const adminUser = createMockUser('ADMIN', [Permission.MANAGE_SETTINGS]);
        const commandWithExoticCurrency = {
          ...validCommand,
          settings: {
            ...validCommand.settings,
            currency: 'BTC', // Non-standard currency
          },
        };

        mockUserRepository.findById.mockResolvedValue(adminUser);
        mockAgencyRepository.findByName.mockResolvedValue(null);
        mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);
        mockAgencyRepository.save.mockResolvedValue();
        mockAgencyRepository.initializeAgencyDatabase.mockResolvedValue(true);

        // Act
        const result = await handler.handle(commandWithExoticCurrency);

        // Assert
        expect(result.success).toBe(true);
      });
    });

    describe('Inventory tracking validation', () => {
      it('should reject inventory tracking without MANAGE_STOCK permission', async () => {
        // Arrange
        const userWithoutStock = createMockUser('VIEWER', [Permission.MANAGE_SETTINGS]); // VIEWER doesn't have MANAGE_STOCK by default
        const commandWithInventory = {
          ...validCommand,
          settings: {
            ...validCommand.settings,
            enableInventoryTracking: true,
          },
        };

        mockUserRepository.findById.mockResolvedValue(userWithoutStock);
        mockAgencyRepository.findByName.mockResolvedValue(null);
        mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);

        // Act
        const result = await handler.handle(commandWithInventory);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Inventory tracking requires MANAGE_STOCK permission');
      });
    });
  });

  describe('Business hours validation', () => {
    it('should reject invalid business hours (start after end)', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN', [Permission.MANAGE_SETTINGS]);
      const commandWithInvalidHours = {
        ...validCommand,
        settings: {
          ...validCommand.settings,
          businessHours: {
            start: '18:00',
            end: '09:00', // End before start
            timezone: 'UTC',
          },
        },
      };

      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.findByName.mockResolvedValue(null);
      mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);

      // Act
      const result = await handler.handle(commandWithInvalidHours);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Business start time must be before end time');
    });
  });

  describe('Database initialization', () => {
    it('should handle database initialization failure and cleanup', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN', [Permission.MANAGE_SETTINGS]);
      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.findByName.mockResolvedValue(null);
      mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);
      mockAgencyRepository.save.mockResolvedValue();
      mockAgencyRepository.initializeAgencyDatabase.mockRejectedValue(new Error('Database init failed'));
      mockAgencyRepository.delete.mockResolvedValue();

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to initialize agency database');
      expect(mockAgencyRepository.save).toHaveBeenCalledTimes(1);
      expect(mockAgencyRepository.delete).toHaveBeenCalledTimes(1); // Cleanup called
    });

    it('should handle database initialization and cleanup failure', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN', [Permission.MANAGE_SETTINGS]);
      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.findByName.mockResolvedValue(null);
      mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);
      mockAgencyRepository.save.mockResolvedValue();
      mockAgencyRepository.initializeAgencyDatabase.mockRejectedValue(new Error('Database init failed'));
      mockAgencyRepository.delete.mockRejectedValue(new Error('Cleanup failed'));

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to initialize agency database');
      expect(mockAgencyRepository.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Command validation edge cases', () => {
    it('should handle command validation errors gracefully', async () => {
      // Arrange
      const invalidCommand = {
        ...validCommand,
        name: '', // Invalid empty name
      };

      // Act
      const result = await handler.handle(invalidCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle business rule validation errors gracefully', async () => {
      // Arrange
      const commandWithInvalidRules = {
        ...validCommand,
        settings: {
          ...validCommand.settings,
          allowCreditSales: true,
          maxCreditLimit: -1000, // Invalid negative credit limit
        },
      };

      // Act
      const result = await handler.handle(commandWithInvalidRules);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Repository error handling', () => {
    it('should handle repository save errors', async () => {
      // Arrange
      const adminUser = createMockUser('ADMIN', [Permission.MANAGE_SETTINGS]);
      mockUserRepository.findById.mockResolvedValue(adminUser);
      mockAgencyRepository.findByName.mockResolvedValue(null);
      mockAgencyRepository.findByDatabasePath.mockResolvedValue(null);
      mockAgencyRepository.save.mockRejectedValue(new Error('Database save failed'));

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database save failed');
      expect(mockAgencyRepository.initializeAgencyDatabase).not.toHaveBeenCalled();
    });

    it('should handle user repository errors', async () => {
      // Arrange
      mockUserRepository.findById.mockRejectedValue(new Error('User lookup failed'));

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User lookup failed');
      expect(mockAgencyRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Factory function', () => {
    it('should create handler instance correctly', () => {
      // Arrange & Act
      const { createAgencyHandler } = require('../create-agency.handler');
      const factoryHandler = createAgencyHandler(mockAgencyRepository, mockUserRepository);

      // Assert
      expect(factoryHandler).toBeInstanceOf(CreateAgencyHandler);
    });
  });
});
