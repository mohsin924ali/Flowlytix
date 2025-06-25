/**
 * Update Agency Handler Tests
 *
 * Comprehensive test suite for UpdateAgencyHandler following CQRS pattern.
 * Tests cover all business scenarios, authorization, validation, and error handling.
 *
 * @domain Agency Management
 * @pattern CQRS Handler Testing
 * @architecture Multi-tenant
 * @version 1.0.0
 */

import { UpdateAgencyHandler, createUpdateAgencyHandler } from '../update-agency.handler';
import { UpdateAgencyCommand } from '../../../commands/agency/update-agency.command';
import { IAgencyRepository } from '../../../../domain/repositories/agency.repository';
import { IUserRepository } from '../../../../domain/repositories/user.repository';
import { Agency, AgencyStatus } from '../../../../domain/entities/agency';
import { User } from '../../../../domain/entities/user';
import { Role, Permission, SystemRole } from '../../../../domain/value-objects/role';

describe('UpdateAgencyHandler - Step MT-5B', () => {
  let handler: UpdateAgencyHandler;
  let mockAgencyRepository: jest.Mocked<IAgencyRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  // Test data
  const existingAgencyId = '550e8400-e29b-41d4-a716-446655440000';
  const updatedBy = '550e8400-e29b-41d4-a716-446655440001';

  const validCommand: UpdateAgencyCommand = {
    agencyId: existingAgencyId,
    name: 'Updated Test Agency',
    contactPerson: 'Jane Doe',
    phone: '+1-555-0123',
    email: 'jane@testagency.com',
    address: '456 Updated St, Test City, TC 12345',
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
        timezone: 'America/New_York',
      },
      notifications: {
        lowStock: true,
        overduePayments: true,
        newOrders: false,
      },
    },
    status: AgencyStatus.ACTIVE,
    updatedBy,
    reason: 'Updating agency information',
  };

  const mockAdminUser = User.create({
    id: updatedBy,
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: SystemRole.ADMIN,
    password: 'SecureTestPass123!',
  });

  const mockExistingAgency = Agency.create({
    name: 'Original Test Agency',
    databasePath: './data/agencies/original-test-agency.db',
    contactPerson: 'John Smith',
    phone: '+1-555-9999',
    email: 'john@originalagency.com',
    address: '123 Original St, Original City, OC 54321',
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
    status: AgencyStatus.ACTIVE,
  });

  beforeEach(() => {
    // Create mock repositories
    mockAgencyRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      existsByName: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      findAll: jest.fn(),
      findByStatus: jest.fn(),
      findOperational: jest.fn(),
      count: jest.fn(),
      existsByEmail: jest.fn(),
      findByEmail: jest.fn(),
      findByContactPerson: jest.fn(),
      findByCurrency: jest.fn(),
      findByCreatedDateRange: jest.fn(),
      findByUpdatedDateRange: jest.fn(),
      findWithCreditSales: jest.fn(),
      findWithInventoryTracking: jest.fn(),
      findByTaxRateRange: jest.fn(),
      bulkUpdate: jest.fn(),
      bulkDelete: jest.fn(),
      findRecentlyCreated: jest.fn(),
      findRecentlyUpdated: jest.fn(),
      findByDatabasePath: jest.fn(),
    };

    mockUserRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      search: jest.fn(),
      findAll: jest.fn(),
      findByRole: jest.fn(),
      findByStatus: jest.fn(),
      findByCreatedDateRange: jest.fn(),
      findByUpdatedDateRange: jest.fn(),
      existsByEmail: jest.fn(),
      count: jest.fn(),
      countByRole: jest.fn(),
      countByStatus: jest.fn(),
      delete: jest.fn(),
      beginTransaction: jest.fn(),
    };

    // Create handler instance
    handler = new UpdateAgencyHandler(mockAgencyRepository, mockUserRepository);
  });

  describe('Successful Operations', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
      mockAgencyRepository.findById.mockResolvedValue(mockExistingAgency);
      mockAgencyRepository.existsByName.mockResolvedValue(false);
      mockAgencyRepository.update.mockResolvedValue(mockExistingAgency);
    });

    it('should update agency successfully with all fields', async () => {
      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agencyId).toBe(existingAgencyId);
      expect(result.agencyName).toBeDefined();
      expect(result.isOperational).toBe(true);

      // Verify repository calls
      expect(mockUserRepository.findById).toHaveBeenCalledWith(updatedBy);
      expect(mockAgencyRepository.findById).toHaveBeenCalledWith(existingAgencyId);
      expect(mockAgencyRepository.update).toHaveBeenCalledWith(mockExistingAgency);
    });

    it('should update agency with partial fields', async () => {
      const partialCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        name: 'New Name Only',
      };

      // Act
      const result = await handler.handle(partialCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agencyId).toBe(existingAgencyId);

      // Verify only name validation was called
      expect(mockAgencyRepository.existsByName).toHaveBeenCalledWith('New Name Only');
    });

    it('should update agency settings only', async () => {
      const settingsCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        settings: {
          allowCreditSales: true,
          defaultCreditDays: 15,
          maxCreditLimit: 25000,
          requireApprovalForOrders: false,
          enableInventoryTracking: true,
          taxRate: 0.1,
          currency: 'EUR',
          businessHours: {
            start: '10:00',
            end: '16:00',
            timezone: 'Europe/London',
          },
          notifications: {
            lowStock: true,
            overduePayments: true,
            newOrders: true,
          },
        },
      };

      // Act
      const result = await handler.handle(settingsCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.agencyId).toBe(existingAgencyId);

      // Name validation should not be called for settings-only update
      expect(mockAgencyRepository.existsByName).not.toHaveBeenCalled();
    });

    it('should update agency status', async () => {
      const statusCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        status: AgencyStatus.INACTIVE,
      };

      // Act
      const result = await handler.handle(statusCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.agencyId).toBe(existingAgencyId);
    });

    it('should handle null values for optional fields', async () => {
      const nullCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        contactPerson: null,
        phone: null,
        email: null,
        address: null,
      };

      // Act
      const result = await handler.handle(nullCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.agencyId).toBe(existingAgencyId);
    });

    it('should allow super admin to update any agency', async () => {
      const superAdminUser = User.create({
        id: updatedBy,
        email: 'superadmin@test.com',
        firstName: 'Super',
        lastName: 'Admin',
        role: SystemRole.SUPER_ADMIN,
        password: 'SecureTestPass123!',
      });

      mockUserRepository.findById.mockResolvedValue(superAdminUser);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Authorization', () => {
    beforeEach(() => {
      mockAgencyRepository.findById.mockResolvedValue(mockExistingAgency);
      mockAgencyRepository.existsByName.mockResolvedValue(false);
    });

    it('should reject request when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Updating user not found');
    });

    it('should reject request when user lacks MANAGE_SETTINGS permission', async () => {
      const viewerUser = User.create({
        id: updatedBy,
        email: 'viewer@test.com',
        firstName: 'Viewer',
        lastName: 'User',
        role: SystemRole.VIEWER,
      });

      mockUserRepository.findById.mockResolvedValue(viewerUser);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to update agency');
    });

    it('should allow manager users to update agencies', async () => {
      const managerUser = User.create({
        id: updatedBy,
        email: 'manager@test.com',
        firstName: 'Manager',
        lastName: 'User',
        role: SystemRole.MANAGER,
      });

      mockUserRepository.findById.mockResolvedValue(managerUser);
      mockAgencyRepository.update.mockResolvedValue(mockExistingAgency);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Agency Not Found', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
    });

    it('should return error when agency not found', async () => {
      mockAgencyRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Agency not found');
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
      mockAgencyRepository.findById.mockResolvedValue(mockExistingAgency);
    });

    it('should reject invalid command structure', async () => {
      const invalidCommand = {
        agencyId: 'invalid-uuid',
        updatedBy: 'invalid-uuid',
        name: 'A',
      } as UpdateAgencyCommand;

      // Act
      const result = await handler.handle(invalidCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Agency update validation failed');
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.validationErrors).toBeDefined();
    });

    it('should reject business rule violations', async () => {
      const invalidBusinessCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        settings: {
          allowCreditSales: false,
          defaultCreditDays: 30, // Invalid: credit days > 1 when credit sales disabled
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
      };

      // Act
      const result = await handler.handle(invalidBusinessCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Credit days should be 1 when credit sales are disabled');
      expect(result.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('should reject duplicate agency name', async () => {
      mockAgencyRepository.existsByName.mockResolvedValue(true);
      mockAgencyRepository.findByName.mockResolvedValue(mockExistingAgency);

      const duplicateNameCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        name: 'Existing Agency Name',
      };

      // Act
      const result = await handler.handle(duplicateNameCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Agency with this name already exists');
    });

    it('should allow keeping the same name', async () => {
      // Mock existing agency with the same name we're trying to update to
      const sameNameAgency = { ...mockExistingAgency };
      Object.defineProperty(sameNameAgency, 'name', { value: 'Same Name', writable: false });

      mockAgencyRepository.findById.mockResolvedValue(sameNameAgency);
      mockAgencyRepository.existsByName.mockResolvedValue(true); // Name exists but it's the same agency
      mockAgencyRepository.update.mockResolvedValue(sameNameAgency);

      const sameNameCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        name: 'Same Name', // Same as current name
      };

      // Act
      const result = await handler.handle(sameNameCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject empty update command', async () => {
      const emptyCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
      };

      // Act
      const result = await handler.handle(emptyCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('At least one field must be provided for update');
      expect(result.code).toBe('BUSINESS_RULE_VIOLATION');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
      mockAgencyRepository.findById.mockResolvedValue(mockExistingAgency);
      mockAgencyRepository.existsByName.mockResolvedValue(false);
    });

    it('should handle user repository errors gracefully', async () => {
      mockUserRepository.findById.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to validate updating user');
      expect(result.code).toBe('USER_REPOSITORY_ERROR');
    });

    it('should handle agency repository findById errors gracefully', async () => {
      mockAgencyRepository.findById.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to find agency');
      expect(result.code).toBe('AGENCY_REPOSITORY_ERROR');
    });

    it('should handle agency repository update errors gracefully', async () => {
      mockAgencyRepository.update.mockRejectedValue(new Error('Update failed'));

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update agency');
      expect(result.code).toBe('AGENCY_UPDATE_ERROR');
    });

    it('should handle name validation errors gracefully', async () => {
      mockAgencyRepository.existsByName.mockRejectedValue(new Error('Name check failed'));

      const nameCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        name: 'New Name',
      };

      // Act
      const result = await handler.handle(nameCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to validate agency name');
      expect(result.code).toBe('NAME_VALIDATION_ERROR');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock an unexpected error during domain operations
      mockAgencyRepository.update.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      const result = await handler.handle(validCommand);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while updating agency');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('Status Transitions', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
      mockAgencyRepository.findById.mockResolvedValue(mockExistingAgency);
      mockAgencyRepository.existsByName.mockResolvedValue(false);
      mockAgencyRepository.update.mockResolvedValue(mockExistingAgency);
    });

    it('should handle ACTIVE to INACTIVE transition', async () => {
      const statusCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        status: AgencyStatus.INACTIVE,
      };

      // Act
      const result = await handler.handle(statusCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle ACTIVE to SUSPENDED transition', async () => {
      const statusCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        status: AgencyStatus.SUSPENDED,
      };

      // Act
      const result = await handler.handle(statusCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle INACTIVE to ACTIVE transition', async () => {
      const inactiveAgency = { ...mockExistingAgency };
      Object.defineProperty(inactiveAgency, 'status', { value: AgencyStatus.INACTIVE, writable: false });
      mockAgencyRepository.findById.mockResolvedValue(inactiveAgency);

      const statusCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        status: AgencyStatus.ACTIVE,
      };

      // Act
      const result = await handler.handle(statusCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Factory Function', () => {
    it('should create handler instance with repositories', () => {
      // Act
      const factoryHandler = createUpdateAgencyHandler(mockAgencyRepository, mockUserRepository);

      // Assert
      expect(factoryHandler).toBeInstanceOf(UpdateAgencyHandler);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
      mockAgencyRepository.findById.mockResolvedValue(mockExistingAgency);
      mockAgencyRepository.existsByName.mockResolvedValue(false);
      mockAgencyRepository.update.mockResolvedValue(mockExistingAgency);
    });

    it('should handle very long field values within limits', async () => {
      const longCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        name: 'A'.repeat(100), // Max length
        contactPerson: 'B'.repeat(100), // Max length
        phone: '1'.repeat(20), // Max length
        address: 'C'.repeat(500), // Max length
      };

      // Act
      const result = await handler.handle(longCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle special characters in text fields', async () => {
      const specialCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        name: 'Agency & Co. Ltd.',
        contactPerson: 'José María',
        phone: '+1 (555) 123-4567 ext. 890',
        address: '123 Main St., Suite #456, City, State 12345-6789',
      };

      // Act
      const result = await handler.handle(specialCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle boundary values for numeric settings', async () => {
      const boundaryCommand: UpdateAgencyCommand = {
        agencyId: existingAgencyId,
        updatedBy,
        settings: {
          allowCreditSales: true,
          defaultCreditDays: 365, // Max value
          maxCreditLimit: 999999999, // Large value
          requireApprovalForOrders: false,
          enableInventoryTracking: true,
          taxRate: 1.0, // Max rate (100%)
          currency: 'EUR',
          businessHours: {
            start: '00:00',
            end: '23:59',
            timezone: 'UTC',
          },
          notifications: {
            lowStock: true,
            overduePayments: true,
            newOrders: true,
          },
        },
      };

      // Act
      const result = await handler.handle(boundaryCommand);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});
