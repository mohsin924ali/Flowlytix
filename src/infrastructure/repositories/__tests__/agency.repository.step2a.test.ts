/**
 * SQLite Agency Repository Tests - Step MT-2A: Basic Repository Structure
 *
 * Unit tests for the basic Agency repository implementation.
 * Tests core CRUD operations, validation, error handling, and database interactions.
 *
 * STEP MT-2A TEST SCOPE:
 * - Constructor and database connection validation
 * - Core CRUD methods: save, update, findById, findByName, findByDatabasePath
 * - Existence checks: existsByName, existsByDatabasePath
 * - Health check and error handling
 * - Placeholder method verification (should throw "not implemented" errors)
 * - Database mapping and persistence operations
 *
 * @domain Agency Management
 * @pattern Repository Pattern Testing
 * @version 1.0.0 - Step MT-2A: Basic Repository Structure
 */

import { DatabaseConnection } from '../../database/connection';
import { SqliteAgencyRepository } from '../agency.repository';
import {
  AgencyRepositoryError,
  AgencyNotFoundError,
  AgencyAlreadyExistsError,
  AgencyRepositoryConnectionError,
} from '../../../domain/repositories/agency.repository';
import { Agency, AgencyStatus, type CreateAgencyParams } from '../../../domain/entities/agency';

// Mock dependencies
jest.mock('../../database/connection');

describe('SqliteAgencyRepository - Step MT-2A: Basic Repository Structure', () => {
  let repository: SqliteAgencyRepository;
  let mockConnection: jest.Mocked<DatabaseConnection>;
  let mockDb: any;

  // Test data
  const validAgencyParams: CreateAgencyParams = {
    name: 'Test Agency',
    databasePath: 'test-agency.db',
    contactPerson: 'John Doe',
    phone: '+1234567890',
    email: 'john@testagency.com',
    address: '123 Test Street, Test City',
    settings: {
      allowCreditSales: true,
      defaultCreditDays: 30,
      maxCreditLimit: 50000,
      requireApprovalForOrders: false,
      enableInventoryTracking: true,
      taxRate: 0.1,
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
  };

  beforeEach(() => {
    // Setup database mock
    mockDb = {
      prepare: jest.fn(),
      exec: jest.fn(),
    };

    // Setup connection mock
    mockConnection = {
      getDatabase: jest.fn().mockReturnValue(mockDb),
      isConnected: jest.fn().mockReturnValue(true),
    } as any;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create repository with valid connection', () => {
      expect(() => {
        repository = new SqliteAgencyRepository(mockConnection);
      }).not.toThrow();

      expect(mockConnection.getDatabase).toHaveBeenCalledTimes(1);
    });

    it('should throw error when connection is null', () => {
      expect(() => {
        new SqliteAgencyRepository(null as any);
      }).toThrow(AgencyRepositoryConnectionError);
    });

    it('should throw error when connection is undefined', () => {
      expect(() => {
        new SqliteAgencyRepository(undefined as any);
      }).toThrow(AgencyRepositoryConnectionError);
    });

    it('should throw error when database is null', () => {
      mockConnection.getDatabase.mockReturnValue(null as any);

      expect(() => {
        new SqliteAgencyRepository(mockConnection);
      }).toThrow(AgencyRepositoryConnectionError);
    });

    it('should handle database connection validation errors', () => {
      mockConnection.getDatabase.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      expect(() => {
        new SqliteAgencyRepository(mockConnection);
      }).toThrow(AgencyRepositoryConnectionError);
    });
  });

  describe('Core CRUD Operations - Step MT-2A', () => {
    beforeEach(() => {
      repository = new SqliteAgencyRepository(mockConnection);
    });

    describe('save()', () => {
      it('should save new agency successfully', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock database operations
        const mockExistsStmt = { get: jest.fn().mockReturnValue({ count: 0 }) };
        const mockInsertStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

        mockDb.prepare
          .mockReturnValueOnce(mockExistsStmt) // existsByName check
          .mockReturnValueOnce(mockExistsStmt) // existsByDatabasePath check
          .mockReturnValueOnce(mockInsertStmt); // insert statement

        const result = await repository.save(agency);

        expect(result).toBe(agency);
        expect(mockDb.prepare).toHaveBeenCalledTimes(3);
        expect(mockInsertStmt.run).toHaveBeenCalledWith(
          agency.id,
          agency.name,
          agency.databasePath,
          agency.contactPerson,
          agency.phone,
          agency.email,
          agency.address,
          expect.any(String), // settings JSON
          'active', // mapped status
          expect.any(Number), // created_at
          expect.any(Number), // updated_at
          expect.any(String) // created_by
        );
      });

      it('should throw error for invalid agency object', async () => {
        await expect(repository.save(null as any)).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.save(undefined as any)).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.save('invalid' as any)).rejects.toThrow(AgencyRepositoryError);
      });

      it('should throw error for agency with missing required properties', async () => {
        const invalidAgency = { name: 'Test' } as any;
        await expect(repository.save(invalidAgency)).rejects.toThrow(AgencyRepositoryError);
      });

      it('should throw AlreadyExistsError when agency name exists', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock existing name check to return count > 0
        const mockExistsStmt = { get: jest.fn().mockReturnValue({ count: 1 }) };
        mockDb.prepare.mockReturnValue(mockExistsStmt);

        await expect(repository.save(agency)).rejects.toThrow(AgencyAlreadyExistsError);
      });

      it('should throw AlreadyExistsError when database path exists', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock name check to pass, database path check to fail
        const mockExistsStmt1 = { get: jest.fn().mockReturnValue({ count: 0 }) };
        const mockExistsStmt2 = { get: jest.fn().mockReturnValue({ count: 1 }) };

        mockDb.prepare
          .mockReturnValueOnce(mockExistsStmt1) // existsByName check (passes)
          .mockReturnValueOnce(mockExistsStmt2); // existsByDatabasePath check (fails)

        await expect(repository.save(agency)).rejects.toThrow(AgencyAlreadyExistsError);
      });

      it('should handle database save errors gracefully', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock existence checks to pass
        const mockExistsStmt = { get: jest.fn().mockReturnValue({ count: 0 }) };
        const mockInsertStmt = {
          run: jest.fn().mockImplementation(() => {
            throw new Error('Database constraint violation');
          }),
        };

        mockDb.prepare
          .mockReturnValueOnce(mockExistsStmt)
          .mockReturnValueOnce(mockExistsStmt)
          .mockReturnValueOnce(mockInsertStmt);

        await expect(repository.save(agency)).rejects.toThrow(AgencyRepositoryError);
      });
    });

    describe('update()', () => {
      it('should update existing agency successfully', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock successful update
        const mockUpdateStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };
        mockDb.prepare.mockReturnValue(mockUpdateStmt);

        const result = await repository.update(agency);

        expect(result).toBe(agency);
        expect(mockUpdateStmt.run).toHaveBeenCalledWith(
          agency.name,
          agency.databasePath,
          agency.contactPerson,
          agency.phone,
          agency.email,
          agency.address,
          expect.any(String), // settings JSON
          'active', // mapped status
          expect.any(Number), // updated_at
          agency.id
        );
      });

      it('should throw error for invalid agency object', async () => {
        await expect(repository.update(null as any)).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.update(undefined as any)).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.update('invalid' as any)).rejects.toThrow(AgencyRepositoryError);
      });

      it('should throw error for agency without ID', async () => {
        const invalidAgency = { name: 'Test' } as any;
        await expect(repository.update(invalidAgency)).rejects.toThrow(AgencyRepositoryError);
      });

      it('should throw NotFoundError when agency does not exist', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock update returning 0 changes (agency not found)
        const mockUpdateStmt = { run: jest.fn().mockReturnValue({ changes: 0 }) };
        mockDb.prepare.mockReturnValue(mockUpdateStmt);

        await expect(repository.update(agency)).rejects.toThrow(AgencyNotFoundError);
      });

      it('should handle database update errors gracefully', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock database error
        const mockUpdateStmt = {
          run: jest.fn().mockImplementation(() => {
            throw new Error('Database update failed');
          }),
        };
        mockDb.prepare.mockReturnValue(mockUpdateStmt);

        await expect(repository.update(agency)).rejects.toThrow(AgencyRepositoryError);
      });
    });

    describe('findById()', () => {
      it('should find agency by ID successfully', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock database row with proper settings format
        const mockRow = {
          id: agency.id,
          name: agency.name,
          database_path: agency.databasePath,
          contact_person: agency.contactPerson,
          phone: agency.phone,
          email: agency.email,
          address: agency.address,
          settings: JSON.stringify(validAgencyParams.settings), // Use proper settings format
          status: 'active',
          created_at: agency.createdAt.getTime(),
          updated_at: agency.updatedAt.getTime(),
          created_by: 'user-123',
        };

        const mockStmt = { get: jest.fn().mockReturnValue(mockRow) };
        mockDb.prepare.mockReturnValue(mockStmt);

        const result = await repository.findById(agency.id);

        expect(result).toBeInstanceOf(Agency);
        expect(result?.id).toBe(agency.id);
        expect(result?.name).toBe(agency.name);
        expect(mockStmt.get).toHaveBeenCalledWith(agency.id);
      });

      it('should return null when agency not found', async () => {
        const mockStmt = { get: jest.fn().mockReturnValue(undefined) };
        mockDb.prepare.mockReturnValue(mockStmt);

        const result = await repository.findById('non-existent-id');

        expect(result).toBeNull();
      });

      it('should validate ID parameter', async () => {
        await expect(repository.findById('')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.findById('   ')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.findById(null as any)).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.findById(undefined as any)).rejects.toThrow(AgencyRepositoryError);
      });

      it('should handle database query errors gracefully', async () => {
        const mockStmt = {
          get: jest.fn().mockImplementation(() => {
            throw new Error('Database query failed');
          }),
        };
        mockDb.prepare.mockReturnValue(mockStmt);

        await expect(repository.findById('test-id')).rejects.toThrow(AgencyRepositoryError);
      });
    });

    describe('findByName()', () => {
      it('should find agency by name successfully', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock database row with proper settings format
        const mockRow = {
          id: agency.id,
          name: agency.name,
          database_path: agency.databasePath,
          contact_person: agency.contactPerson,
          phone: agency.phone,
          email: agency.email,
          address: agency.address,
          settings: JSON.stringify(validAgencyParams.settings), // Use proper settings format
          status: 'active',
          created_at: agency.createdAt.getTime(),
          updated_at: agency.updatedAt.getTime(),
          created_by: 'user-123',
        };

        const mockStmt = { get: jest.fn().mockReturnValue(mockRow) };
        mockDb.prepare.mockReturnValue(mockStmt);

        const result = await repository.findByName(agency.name);

        expect(result).toBeInstanceOf(Agency);
        expect(result?.name).toBe(agency.name);
        expect(mockStmt.get).toHaveBeenCalledWith(agency.name);
      });

      it('should return null when agency not found', async () => {
        const mockStmt = { get: jest.fn().mockReturnValue(undefined) };
        mockDb.prepare.mockReturnValue(mockStmt);

        const result = await repository.findByName('non-existent-name');

        expect(result).toBeNull();
      });

      it('should validate name parameter', async () => {
        await expect(repository.findByName('')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.findByName('   ')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.findByName(null as any)).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.findByName(undefined as any)).rejects.toThrow(AgencyRepositoryError);
      });
    });

    describe('findByDatabasePath()', () => {
      it('should find agency by database path successfully', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock database row with proper settings format
        const mockRow = {
          id: agency.id,
          name: agency.name,
          database_path: agency.databasePath,
          contact_person: agency.contactPerson,
          phone: agency.phone,
          email: agency.email,
          address: agency.address,
          settings: JSON.stringify(validAgencyParams.settings), // Use proper settings format
          status: 'active',
          created_at: agency.createdAt.getTime(),
          updated_at: agency.updatedAt.getTime(),
          created_by: 'user-123',
        };

        const mockStmt = { get: jest.fn().mockReturnValue(mockRow) };
        mockDb.prepare.mockReturnValue(mockStmt);

        const result = await repository.findByDatabasePath(agency.databasePath);

        expect(result).toBeInstanceOf(Agency);
        expect(result?.databasePath).toBe(agency.databasePath);
        expect(mockStmt.get).toHaveBeenCalledWith(agency.databasePath);
      });

      it('should return null when agency not found', async () => {
        const mockStmt = { get: jest.fn().mockReturnValue(undefined) };
        mockDb.prepare.mockReturnValue(mockStmt);

        const result = await repository.findByDatabasePath('non-existent-path.db');

        expect(result).toBeNull();
      });

      it('should validate database path parameter', async () => {
        await expect(repository.findByDatabasePath('')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.findByDatabasePath('   ')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.findByDatabasePath(null as any)).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.findByDatabasePath(undefined as any)).rejects.toThrow(AgencyRepositoryError);
      });
    });

    describe('existsByName()', () => {
      it('should return true when agency exists', async () => {
        const mockStmt = { get: jest.fn().mockReturnValue({ count: 1 }) };
        mockDb.prepare.mockReturnValue(mockStmt);

        const result = await repository.existsByName('Test Agency');

        expect(result).toBe(true);
        expect(mockStmt.get).toHaveBeenCalledWith('Test Agency');
      });

      it('should return false when agency does not exist', async () => {
        const mockStmt = { get: jest.fn().mockReturnValue({ count: 0 }) };
        mockDb.prepare.mockReturnValue(mockStmt);

        const result = await repository.existsByName('Non-existent Agency');

        expect(result).toBe(false);
      });

      it('should return false for invalid input', async () => {
        const result1 = await repository.existsByName('');
        const result2 = await repository.existsByName('   ');
        const result3 = await repository.existsByName(null as any);
        const result4 = await repository.existsByName(undefined as any);

        expect(result1).toBe(false);
        expect(result2).toBe(false);
        expect(result3).toBe(false);
        expect(result4).toBe(false);
      });

      it('should handle database query errors', async () => {
        const mockStmt = {
          get: jest.fn().mockImplementation(() => {
            throw new Error('Database query failed');
          }),
        };
        mockDb.prepare.mockReturnValue(mockStmt);

        await expect(repository.existsByName('Test Agency')).rejects.toThrow(AgencyRepositoryError);
      });
    });

    describe('existsByDatabasePath()', () => {
      it('should return true when database path exists', async () => {
        const mockStmt = { get: jest.fn().mockReturnValue({ count: 1 }) };
        mockDb.prepare.mockReturnValue(mockStmt);

        const result = await repository.existsByDatabasePath('test.db');

        expect(result).toBe(true);
        expect(mockStmt.get).toHaveBeenCalledWith('test.db');
      });

      it('should return false when database path does not exist', async () => {
        const mockStmt = { get: jest.fn().mockReturnValue({ count: 0 }) };
        mockDb.prepare.mockReturnValue(mockStmt);

        const result = await repository.existsByDatabasePath('non-existent.db');

        expect(result).toBe(false);
      });

      it('should return false for invalid input', async () => {
        const result1 = await repository.existsByDatabasePath('');
        const result2 = await repository.existsByDatabasePath('   ');
        const result3 = await repository.existsByDatabasePath(null as any);
        const result4 = await repository.existsByDatabasePath(undefined as any);

        expect(result1).toBe(false);
        expect(result2).toBe(false);
        expect(result3).toBe(false);
        expect(result4).toBe(false);
      });
    });

    describe('isHealthy()', () => {
      it('should return true when database is healthy', async () => {
        const mockStmt = { get: jest.fn().mockReturnValue({ count: 0 }) };
        mockDb.prepare.mockReturnValue(mockStmt);

        const result = await repository.isHealthy();

        expect(result).toBe(true);
      });

      it('should return false when database has errors', async () => {
        const mockStmt = {
          get: jest.fn().mockImplementation(() => {
            throw new Error('Database connection lost');
          }),
        };
        mockDb.prepare.mockReturnValue(mockStmt);

        const result = await repository.isHealthy();

        expect(result).toBe(false);
      });
    });
  });

  describe('Placeholder Methods - Step MT-2A Behavior', () => {
    beforeEach(() => {
      repository = new SqliteAgencyRepository(mockConnection);
    });

    it('should throw "not implemented" errors for placeholder methods', async () => {
      // Search and query methods
      await expect(repository.search({})).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.findAll()).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.findByStatus(AgencyStatus.ACTIVE)).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.findOperational()).rejects.toThrow(AgencyRepositoryError);

      // Counting methods
      await expect(repository.count()).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.countByCriteria({})).rejects.toThrow(AgencyRepositoryError);

      // Management methods
      await expect(repository.delete('test-id')).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.suspend('test-id')).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.activate('test-id')).rejects.toThrow(AgencyRepositoryError);

      // Utility methods
      await expect(repository.getStats()).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.beginTransaction()).rejects.toThrow(AgencyRepositoryError);

      // Multi-tenant methods
      const mockAgency = Agency.create(validAgencyParams);
      await expect(repository.initializeAgencyDatabase(mockAgency)).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.backupAgencyDatabase('test-id')).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.restoreAgencyDatabase('test-id', 'backup.db')).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.getDatabaseSize('test-id')).rejects.toThrow(AgencyRepositoryError);
    });

    it('should have consistent error messages for placeholder methods', async () => {
      try {
        await repository.search({});
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AgencyRepositoryError);
        expect((error as AgencyRepositoryError).message).toContain('not yet implemented');
        expect((error as AgencyRepositoryError).operation).toBe('search');
      }
    });
  });

  describe('Error Handling and Logging', () => {
    beforeEach(() => {
      repository = new SqliteAgencyRepository(mockConnection);
    });

    it('should preserve original error context in repository errors', async () => {
      const mockStmt = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Original database error');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      try {
        await repository.findById('test-id');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AgencyRepositoryError);
        expect((error as AgencyRepositoryError).operation).toBe('findById');
        expect((error as AgencyRepositoryError).cause).toBeDefined();
      }
    });

    it('should log errors with proper context information', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockStmt = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Database connection timeout');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      try {
        await repository.findById('test-id');
      } catch (error) {
        // Error should be thrown
      }

      // Check that error was logged with context
      expect(consoleSpy).toHaveBeenCalledWith(
        'Repository findById error:',
        expect.objectContaining({
          operation: 'findById',
          agencyId: 'test-id',
          error: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Status Mapping', () => {
    beforeEach(() => {
      repository = new SqliteAgencyRepository(mockConnection);
    });

    it('should map domain status to database status correctly', () => {
      // Access private method through type assertion for testing
      const repo = repository as any;

      expect(repo.mapStatusToDatabase(AgencyStatus.ACTIVE)).toBe('active');
      expect(repo.mapStatusToDatabase(AgencyStatus.INACTIVE)).toBe('inactive');
      expect(repo.mapStatusToDatabase(AgencyStatus.SUSPENDED)).toBe('suspended');
    });

    it('should map database status to domain status correctly', () => {
      // Access private method through type assertion for testing
      const repo = repository as any;

      expect(repo.mapStatusToDomain('active')).toBe(AgencyStatus.ACTIVE);
      expect(repo.mapStatusToDomain('inactive')).toBe(AgencyStatus.INACTIVE);
      expect(repo.mapStatusToDomain('suspended')).toBe(AgencyStatus.SUSPENDED);
      expect(repo.mapStatusToDomain('unknown')).toBe(AgencyStatus.ACTIVE); // fallback
    });
  });

  describe('Database Mapping', () => {
    beforeEach(() => {
      repository = new SqliteAgencyRepository(mockConnection);
    });

    it('should map database row to Agency entity correctly', () => {
      const mockRow = {
        id: 'agency-123',
        name: 'Test Agency',
        database_path: 'test.db',
        contact_person: 'John Doe',
        phone: '+1234567890',
        email: 'john@test.com',
        address: '123 Test St',
        settings: JSON.stringify({
          allowCreditSales: true,
          defaultCreditDays: 30,
          maxCreditLimit: 50000,
          requireApprovalForOrders: false,
          enableInventoryTracking: true,
          taxRate: 0.1,
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
        }),
        status: 'active',
        created_at: Date.now(),
        updated_at: Date.now(),
        created_by: 'user-123',
      };

      const repo = repository as any;
      const agency = repo.mapToAgency(mockRow);

      expect(agency).toBeInstanceOf(Agency);
      expect(agency.id).toBe(mockRow.id);
      expect(agency.name).toBe(mockRow.name);
      expect(agency.databasePath).toBe(mockRow.database_path);
      expect(agency.status).toBe(AgencyStatus.ACTIVE);
    });

    it('should handle mapping errors gracefully', () => {
      const invalidRow = {
        id: 'agency-123',
        name: 'Test Agency',
        // Missing required fields
        settings: 'invalid-json',
      } as any;

      const repo = repository as any;

      expect(() => {
        repo.mapToAgency(invalidRow);
      }).toThrow(AgencyRepositoryError);
    });
  });

  describe('Architecture Compliance', () => {
    beforeEach(() => {
      repository = new SqliteAgencyRepository(mockConnection);
    });

    it('should follow single responsibility principle', () => {
      // Repository should only handle data persistence
      const publicMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(repository)).filter(
        (method) => method !== 'constructor' && !method.startsWith('_')
      );

      // Should have reasonable number of public methods (data access only)
      expect(publicMethods.length).toBeLessThanOrEqual(26);
    });

    it('should implement all IAgencyRepository interface methods', () => {
      // Check that all interface methods exist
      const requiredMethods = [
        'save',
        'update',
        'findById',
        'findByName',
        'findByDatabasePath',
        'existsByName',
        'existsByDatabasePath',
        'search',
        'findAll',
        'findByStatus',
        'findOperational',
        'count',
        'countByCriteria',
        'delete',
        'suspend',
        'activate',
        'getStats',
        'isHealthy',
        'beginTransaction',
        'initializeAgencyDatabase',
        'backupAgencyDatabase',
        'restoreAgencyDatabase',
        'getDatabaseSize',
      ];

      requiredMethods.forEach((method) => {
        expect(typeof (repository as any)[method]).toBe('function');
      });
    });

    it('should use proper error types for different scenarios', async () => {
      // Connection errors
      expect(() => new SqliteAgencyRepository(null as any)).toThrow(AgencyRepositoryConnectionError);

      // Not found errors
      const mockStmt = { run: jest.fn().mockReturnValue({ changes: 0 }) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const agency = Agency.create(validAgencyParams);
      await expect(repository.update(agency)).rejects.toThrow(AgencyNotFoundError);

      // Already exists errors are tested in the save method tests
    });
  });

  describe('Factory Function', () => {
    it('should create repository instance', () => {
      const { createAgencyRepository } = require('../agency.repository');
      const repo = createAgencyRepository(mockConnection);

      expect(repo).toBeInstanceOf(SqliteAgencyRepository);
    });
  });
});
