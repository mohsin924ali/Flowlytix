/**
 * SQLite Agency Repository Tests - Step MT-2C: Advanced Operations & Multi-tenant Features
 *
 * Unit tests for advanced agency repository functionality including counting operations,
 * status management, repository statistics, transactions, and multi-tenant operations.
 *
 * STEP MT-2C TEST SCOPE:
 * - count() and countByCriteria() operations
 * - delete(), suspend(), activate() status management
 * - getStats() repository statistics
 * - beginTransaction() and transaction interface
 * - Multi-tenant operations: initializeAgencyDatabase, backup, restore, getDatabaseSize
 * - Comprehensive error handling and edge cases
 * - Integration testing with domain entities
 *
 * @domain Agency Management
 * @pattern Repository Pattern Testing
 * @version 1.0.0 - Step MT-2C: Advanced Operations & Multi-tenant Features
 */

import { DatabaseConnection } from '../../database/connection';
import { SqliteAgencyRepository } from '../agency.repository';
import {
  AgencyRepositoryError,
  AgencyNotFoundError,
  AgencyAlreadyExistsError,
  AgencyRepositoryConnectionError,
  type AgencySearchCriteria,
  type AgencySearchResult,
  type AgencyRepositoryStats,
  type IAgencyRepositoryTransaction,
} from '../../../domain/repositories/agency.repository';
import { Agency, AgencyStatus, type CreateAgencyParams } from '../../../domain/entities/agency';

// Mock dependencies
jest.mock('../../database/connection');

describe('SqliteAgencyRepository - Step MT-2C: Advanced Operations & Multi-tenant Features', () => {
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

  const mockAgencyRow = {
    id: 'agency-123',
    name: 'Test Agency',
    database_path: 'test-agency.db',
    contact_person: 'John Doe',
    phone: '+1234567890',
    email: 'john@testagency.com',
    address: '123 Test Street, Test City',
    settings: JSON.stringify(validAgencyParams.settings),
    status: 'active',
    created_at: Date.now(),
    updated_at: Date.now(),
    created_by: 'user-123',
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

    repository = new SqliteAgencyRepository(mockConnection);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('count() - Step MT-2C', () => {
    it('should count total agencies successfully', async () => {
      const mockStmt = { get: jest.fn().mockReturnValue({ total: 42 }) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.count();

      expect(result).toBe(42);
      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT COUNT(*) as total FROM agencies');
      expect(mockStmt.get).toHaveBeenCalledWith();
    });

    it('should handle empty database (zero count)', async () => {
      const mockStmt = { get: jest.fn().mockReturnValue({ total: 0 }) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.count();

      expect(result).toBe(0);
    });

    it('should handle database errors', async () => {
      const mockStmt = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Database connection failed');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await expect(repository.count()).rejects.toThrow(AgencyRepositoryError);
    });

    it('should log errors with proper context', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockStmt = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Database timeout');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      try {
        await repository.count();
      } catch (error) {
        // Expected error
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Repository count error:',
        expect.objectContaining({
          operation: 'count',
          error: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('countByCriteria() - Step MT-2C', () => {
    it('should count agencies with name criteria', async () => {
      const criteria: Partial<AgencySearchCriteria> = { name: 'Test' };
      const mockStmt = { get: jest.fn().mockReturnValue({ total: 5 }) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.countByCriteria(criteria);

      expect(result).toBe(5);
      expect(mockStmt.get).toHaveBeenCalledWith('%Test%');
    });

    it('should count agencies with status criteria', async () => {
      const criteria: Partial<AgencySearchCriteria> = { status: AgencyStatus.ACTIVE };
      const mockStmt = { get: jest.fn().mockReturnValue({ total: 10 }) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.countByCriteria(criteria);

      expect(result).toBe(10);
      expect(mockStmt.get).toHaveBeenCalledWith('active');
    });

    it('should count agencies with multiple status criteria', async () => {
      const criteria: Partial<AgencySearchCriteria> = {
        status: [AgencyStatus.ACTIVE, AgencyStatus.INACTIVE],
      };
      const mockStmt = { get: jest.fn().mockReturnValue({ total: 15 }) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.countByCriteria(criteria);

      expect(result).toBe(15);
      expect(mockStmt.get).toHaveBeenCalledWith('active', 'inactive');
    });

    it('should count agencies with search term criteria', async () => {
      const criteria: Partial<AgencySearchCriteria> = { searchTerm: 'Test' };
      const mockStmt = { get: jest.fn().mockReturnValue({ total: 3 }) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.countByCriteria(criteria);

      expect(result).toBe(3);
      expect(mockStmt.get).toHaveBeenCalledWith('%Test%', '%Test%');
    });

    it('should count agencies with date range criteria', async () => {
      const createdAfter = new Date('2024-01-01');
      const createdBefore = new Date('2024-12-31');
      const criteria: Partial<AgencySearchCriteria> = { createdAfter, createdBefore };

      const mockStmt = { get: jest.fn().mockReturnValue({ total: 8 }) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.countByCriteria(criteria);

      expect(result).toBe(8);
      expect(mockStmt.get).toHaveBeenCalledWith(createdAfter.getTime(), createdBefore.getTime());
    });

    it('should count agencies with business settings criteria', async () => {
      const criteria: Partial<AgencySearchCriteria> = {
        allowsCreditSales: true,
        currency: 'USD',
      };
      const mockStmt = { get: jest.fn().mockReturnValue({ total: 12 }) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.countByCriteria(criteria);

      expect(result).toBe(12);
      expect(mockStmt.get).toHaveBeenCalledWith('%"currency":"USD"%', '%"allowCreditSales":true%');
    });

    it('should handle empty criteria (count all)', async () => {
      const criteria: Partial<AgencySearchCriteria> = {};
      const mockStmt = { get: jest.fn().mockReturnValue({ total: 20 }) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.countByCriteria(criteria);

      expect(result).toBe(20);
      expect(mockStmt.get).toHaveBeenCalledWith();
    });

    it('should validate criteria parameter', async () => {
      await expect(repository.countByCriteria(null as any)).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.countByCriteria(undefined as any)).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.countByCriteria('invalid' as any)).rejects.toThrow(AgencyRepositoryError);
    });

    it('should handle database errors', async () => {
      const criteria: Partial<AgencySearchCriteria> = { name: 'Test' };
      const mockStmt = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Database query failed');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await expect(repository.countByCriteria(criteria)).rejects.toThrow(AgencyRepositoryError);
    });
  });

  describe('delete() - Step MT-2C', () => {
    it('should delete existing agency successfully', async () => {
      // Mock findById to return existing agency
      const mockFindStmt = { get: jest.fn().mockReturnValue(mockAgencyRow) };
      // Mock delete statement
      const mockDeleteStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

      mockDb.prepare
        .mockReturnValueOnce(mockFindStmt) // findById call
        .mockReturnValueOnce(mockDeleteStmt); // delete call

      const result = await repository.delete('agency-123');

      expect(result).toBe(true);
      expect(mockDeleteStmt.run).toHaveBeenCalledWith('agency-123');
    });

    it('should return false when no agency was deleted', async () => {
      // Mock findById to return existing agency
      const mockFindStmt = { get: jest.fn().mockReturnValue(mockAgencyRow) };
      // Mock delete statement with no changes
      const mockDeleteStmt = { run: jest.fn().mockReturnValue({ changes: 0 }) };

      mockDb.prepare.mockReturnValueOnce(mockFindStmt).mockReturnValueOnce(mockDeleteStmt);

      const result = await repository.delete('agency-123');

      expect(result).toBe(false);
    });

    it('should throw AgencyNotFoundError when agency does not exist', async () => {
      // Mock findById to return null
      const mockFindStmt = { get: jest.fn().mockReturnValue(null) };
      mockDb.prepare.mockReturnValue(mockFindStmt);

      await expect(repository.delete('non-existent')).rejects.toThrow(AgencyNotFoundError);
    });

    it('should validate agency ID parameter', async () => {
      await expect(repository.delete('')).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.delete('   ')).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.delete(null as any)).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.delete(undefined as any)).rejects.toThrow(AgencyRepositoryError);
    });

    it('should handle database errors', async () => {
      const mockFindStmt = { get: jest.fn().mockReturnValue(mockAgencyRow) };
      const mockDeleteStmt = {
        run: jest.fn().mockImplementation(() => {
          throw new Error('Database delete failed');
        }),
      };

      mockDb.prepare.mockReturnValueOnce(mockFindStmt).mockReturnValueOnce(mockDeleteStmt);

      await expect(repository.delete('agency-123')).rejects.toThrow(AgencyRepositoryError);
    });

    it('should log errors with proper context', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockFindStmt = { get: jest.fn().mockReturnValue(mockAgencyRow) };
      const mockDeleteStmt = {
        run: jest.fn().mockImplementation(() => {
          throw new Error('Connection lost');
        }),
      };

      mockDb.prepare.mockReturnValueOnce(mockFindStmt).mockReturnValueOnce(mockDeleteStmt);

      try {
        await repository.delete('agency-123');
      } catch (error) {
        // Expected error
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Repository delete error:',
        expect.objectContaining({
          operation: 'delete',
          agencyId: 'agency-123',
          error: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('suspend() - Step MT-2C', () => {
    it('should suspend agency successfully', async () => {
      // Mock findById - return agency to be mapped
      const mockFindStmt = { get: jest.fn().mockReturnValue(mockAgencyRow) };

      // Mock update operation (update() method doesn't call existsByName, just direct UPDATE)
      const mockUpdateStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

      // Set up database mocks in order of calls:
      // 1. findById call
      // 2. update call (direct UPDATE SQL)
      mockDb.prepare
        .mockReturnValueOnce(mockFindStmt) // findById
        .mockReturnValueOnce(mockUpdateStmt); // update

      const result = await repository.suspend('agency-123', 'Policy violation');

      expect(result).toBeInstanceOf(Agency);
      expect(result.status).toBe(AgencyStatus.SUSPENDED);
      expect(mockFindStmt.get).toHaveBeenCalledWith('agency-123');
      expect(mockUpdateStmt.run).toHaveBeenCalled();
    });

    it('should suspend agency without reason', async () => {
      // Mock findById - return agency to be mapped
      const mockFindStmt = { get: jest.fn().mockReturnValue(mockAgencyRow) };

      // Mock update operation
      const mockUpdateStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

      mockDb.prepare
        .mockReturnValueOnce(mockFindStmt) // findById
        .mockReturnValueOnce(mockUpdateStmt); // update

      const result = await repository.suspend('agency-123');

      expect(result).toBeInstanceOf(Agency);
      expect(result.status).toBe(AgencyStatus.SUSPENDED);
    });

    it('should throw AgencyNotFoundError when agency does not exist', async () => {
      const mockFindStmt = { get: jest.fn().mockReturnValue(null) };
      mockDb.prepare.mockReturnValue(mockFindStmt);

      await expect(repository.suspend('non-existent')).rejects.toThrow(AgencyNotFoundError);
    });

    it('should validate agency ID parameter', async () => {
      await expect(repository.suspend('')).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.suspend('   ')).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.suspend(null as any)).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.suspend(undefined as any)).rejects.toThrow(AgencyRepositoryError);
    });

    it('should handle database errors', async () => {
      const mockFindStmt = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Database error');
        }),
      };
      mockDb.prepare.mockReturnValue(mockFindStmt);

      await expect(repository.suspend('agency-123')).rejects.toThrow(AgencyRepositoryError);
    });
  });

  describe('activate() - Step MT-2C', () => {
    it('should activate agency successfully', async () => {
      // Mock agency row with suspended status
      const suspendedAgencyRow = { ...mockAgencyRow, status: 'suspended' };
      const mockFindStmt = { get: jest.fn().mockReturnValue(suspendedAgencyRow) };

      // Mock update operation
      const mockUpdateStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

      mockDb.prepare
        .mockReturnValueOnce(mockFindStmt) // findById
        .mockReturnValueOnce(mockUpdateStmt); // update

      const result = await repository.activate('agency-123');

      expect(result).toBeInstanceOf(Agency);
      expect(result.status).toBe(AgencyStatus.ACTIVE);
    });

    it('should throw AgencyNotFoundError when agency does not exist', async () => {
      const mockFindStmt = { get: jest.fn().mockReturnValue(null) };
      mockDb.prepare.mockReturnValue(mockFindStmt);

      await expect(repository.activate('non-existent')).rejects.toThrow(AgencyNotFoundError);
    });

    it('should validate agency ID parameter', async () => {
      await expect(repository.activate('')).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.activate('   ')).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.activate(null as any)).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.activate(undefined as any)).rejects.toThrow(AgencyRepositoryError);
    });

    it('should handle database errors', async () => {
      const mockFindStmt = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Database error');
        }),
      };
      mockDb.prepare.mockReturnValue(mockFindStmt);

      await expect(repository.activate('agency-123')).rejects.toThrow(AgencyRepositoryError);
    });
  });

  describe('getStats() - Step MT-2C', () => {
    it('should return comprehensive repository statistics', async () => {
      // Mock total count
      const mockTotalStmt = { get: jest.fn().mockReturnValue({ total: 100 }) };

      // Mock status counts
      const mockStatusStmt = {
        all: jest.fn().mockReturnValue([
          { status: 'active', count: 70 },
          { status: 'inactive', count: 20 },
          { status: 'suspended', count: 10 },
        ]),
      };

      // Mock date range
      const oldestDate = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
      const newestDate = Date.now();
      const mockDateStmt = {
        get: jest.fn().mockReturnValue({
          oldest: oldestDate,
          newest: newestDate,
          total: 100,
        }),
      };

      mockDb.prepare
        .mockReturnValueOnce(mockTotalStmt) // total query
        .mockReturnValueOnce(mockStatusStmt) // status query
        .mockReturnValueOnce(mockDateStmt); // date query

      const result = await repository.getStats();

      expect(result).toEqual({
        totalAgencies: 100,
        activeAgencies: 70,
        inactiveAgencies: 20,
        suspendedAgencies: 10,
        averageAgenciesPerDay: expect.any(Number),
        totalDatabaseSize: 102400, // 100 * 1024
        oldestAgency: new Date(oldestDate),
        newestAgency: new Date(newestDate),
      });

      expect(result.averageAgenciesPerDay).toBeGreaterThan(0);
    });

    it('should handle empty database', async () => {
      const mockTotalStmt = { get: jest.fn().mockReturnValue({ total: 0 }) };
      const mockStatusStmt = { all: jest.fn().mockReturnValue([]) };
      const mockDateStmt = {
        get: jest.fn().mockReturnValue({
          oldest: null,
          newest: null,
          total: 0,
        }),
      };

      mockDb.prepare
        .mockReturnValueOnce(mockTotalStmt)
        .mockReturnValueOnce(mockStatusStmt)
        .mockReturnValueOnce(mockDateStmt);

      const result = await repository.getStats();

      expect(result).toEqual({
        totalAgencies: 0,
        activeAgencies: 0,
        inactiveAgencies: 0,
        suspendedAgencies: 0,
        averageAgenciesPerDay: 0,
        totalDatabaseSize: 0,
        oldestAgency: null,
        newestAgency: null,
      });
    });

    it('should handle single agency case', async () => {
      const singleDate = Date.now();
      const mockTotalStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
      const mockStatusStmt = {
        all: jest.fn().mockReturnValue([{ status: 'active', count: 1 }]),
      };
      const mockDateStmt = {
        get: jest.fn().mockReturnValue({
          oldest: singleDate,
          newest: singleDate,
          total: 1,
        }),
      };

      mockDb.prepare
        .mockReturnValueOnce(mockTotalStmt)
        .mockReturnValueOnce(mockStatusStmt)
        .mockReturnValueOnce(mockDateStmt);

      const result = await repository.getStats();

      expect(result.totalAgencies).toBe(1);
      expect(result.activeAgencies).toBe(1);
      expect(result.averageAgenciesPerDay).toBe(1); // Single day
    });

    it('should handle database errors', async () => {
      const mockTotalStmt = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Database stats error');
        }),
      };
      mockDb.prepare.mockReturnValue(mockTotalStmt);

      await expect(repository.getStats()).rejects.toThrow(AgencyRepositoryError);
    });
  });

  describe('beginTransaction() - Step MT-2C', () => {
    it('should begin transaction successfully', async () => {
      const mockTransactionStmt = { run: jest.fn() };
      mockDb.prepare.mockReturnValue(mockTransactionStmt);

      const transaction = await repository.beginTransaction();

      expect(transaction).toBeDefined();
      expect(transaction.isActive()).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockTransactionStmt.run).toHaveBeenCalled();
    });

    it('should handle transaction begin errors', async () => {
      const mockTransactionStmt = {
        run: jest.fn().mockImplementation(() => {
          throw new Error('Transaction begin failed');
        }),
      };
      mockDb.prepare.mockReturnValue(mockTransactionStmt);

      await expect(repository.beginTransaction()).rejects.toThrow(AgencyRepositoryError);
    });

    describe('Transaction Interface', () => {
      let transaction: IAgencyRepositoryTransaction;

      beforeEach(async () => {
        const mockTransactionStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockTransactionStmt);
        transaction = await repository.beginTransaction();
        jest.clearAllMocks();
      });

      it('should save agency within transaction', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock existsByName (returns false = no conflict)
        const mockExistsStmt = { get: jest.fn().mockReturnValue({ count: 0 }) };

        // Mock existsByDatabasePath (returns false = no conflict)
        const mockExistsPathStmt = { get: jest.fn().mockReturnValue({ count: 0 }) };

        // Mock save operation
        const mockSaveStmt = { run: jest.fn().mockReturnValue({ lastInsertRowid: 'agency-123' }) };

        // Set up mocks in order:
        // 1. existsByName check
        // 2. existsByDatabasePath check
        // 3. actual save insert
        mockDb.prepare
          .mockReturnValueOnce(mockExistsStmt) // existsByName
          .mockReturnValueOnce(mockExistsPathStmt) // existsByDatabasePath
          .mockReturnValueOnce(mockSaveStmt); // save insert

        const result = await transaction.save(agency);

        expect(result).toBeInstanceOf(Agency);
        expect(transaction.isActive()).toBe(true);
        expect(mockSaveStmt.run).toHaveBeenCalled();
      });

      it('should update agency within transaction', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock update operation (update() method does direct UPDATE, no existsByName call)
        const mockUpdateStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

        mockDb.prepare.mockReturnValue(mockUpdateStmt); // direct update

        const result = await transaction.update(agency);

        expect(result).toBeInstanceOf(Agency);
        expect(transaction.isActive()).toBe(true);
        expect(mockUpdateStmt.run).toHaveBeenCalled();
      });

      it('should delete agency within transaction', async () => {
        // Mock findById to return existing agency
        const mockFindStmt = { get: jest.fn().mockReturnValue(mockAgencyRow) };

        // Mock delete operation
        const mockDeleteStmt = { run: jest.fn().mockReturnValue({ changes: 1 }) };

        mockDb.prepare
          .mockReturnValueOnce(mockFindStmt) // findById
          .mockReturnValueOnce(mockDeleteStmt); // delete

        const result = await transaction.delete('agency-123');

        expect(result).toBe(true);
        expect(transaction.isActive()).toBe(true);
        expect(mockDeleteStmt.run).toHaveBeenCalledWith('agency-123');
      });

      it('should commit transaction successfully', async () => {
        const mockCommitStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockCommitStmt);

        await transaction.commit();

        expect(transaction.isActive()).toBe(false);
        expect(mockDb.prepare).toHaveBeenCalledWith('COMMIT');
        expect(mockCommitStmt.run).toHaveBeenCalled();
      });

      it('should rollback transaction successfully', async () => {
        const mockRollbackStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockRollbackStmt);

        await transaction.rollback();

        expect(transaction.isActive()).toBe(false);
        expect(mockDb.prepare).toHaveBeenCalledWith('ROLLBACK');
        expect(mockRollbackStmt.run).toHaveBeenCalled();
      });

      it('should prevent operations on inactive transaction', async () => {
        // Deactivate transaction
        const mockCommitStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockCommitStmt);
        await transaction.commit();

        const agency = Agency.create(validAgencyParams, 'user-123');

        await expect(transaction.save(agency)).rejects.toThrow(AgencyRepositoryError);
        await expect(transaction.update(agency)).rejects.toThrow(AgencyRepositoryError);
        await expect(transaction.delete('agency-123')).rejects.toThrow(AgencyRepositoryError);
        await expect(transaction.commit()).rejects.toThrow(AgencyRepositoryError);
      });

      it('should handle commit errors', async () => {
        const mockCommitStmt = {
          run: jest.fn().mockImplementation(() => {
            throw new Error('Commit failed');
          }),
        };
        mockDb.prepare.mockReturnValue(mockCommitStmt);

        await expect(transaction.commit()).rejects.toThrow(AgencyRepositoryError);
      });

      it('should handle rollback errors', async () => {
        const mockRollbackStmt = {
          run: jest.fn().mockImplementation(() => {
            throw new Error('Rollback failed');
          }),
        };
        mockDb.prepare.mockReturnValue(mockRollbackStmt);

        await expect(transaction.rollback()).rejects.toThrow(AgencyRepositoryError);
      });

      it('should allow multiple rollback calls safely', async () => {
        const mockRollbackStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockRollbackStmt);

        await transaction.rollback();
        await transaction.rollback(); // Should not throw

        expect(transaction.isActive()).toBe(false);
        expect(mockRollbackStmt.run).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Multi-tenant Operations - Step MT-2C', () => {
    describe('initializeAgencyDatabase()', () => {
      it('should initialize agency database successfully', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        // Mock findById to return existing agency
        const mockFindStmt = { get: jest.fn().mockReturnValue(mockAgencyRow) };
        mockDb.prepare.mockReturnValue(mockFindStmt);

        const result = await repository.initializeAgencyDatabase(agency);

        expect(result).toBe(true);
      });

      it('should throw AgencyNotFoundError when agency does not exist', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        const mockFindStmt = { get: jest.fn().mockReturnValue(null) };
        mockDb.prepare.mockReturnValue(mockFindStmt);

        await expect(repository.initializeAgencyDatabase(agency)).rejects.toThrow(AgencyNotFoundError);
      });

      it('should validate agency parameter', async () => {
        await expect(repository.initializeAgencyDatabase(null as any)).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.initializeAgencyDatabase(undefined as any)).rejects.toThrow(AgencyRepositoryError);
      });

      it('should handle database errors', async () => {
        const agency = Agency.create(validAgencyParams, 'user-123');

        const mockFindStmt = {
          get: jest.fn().mockImplementation(() => {
            throw new Error('Database error');
          }),
        };
        mockDb.prepare.mockReturnValue(mockFindStmt);

        await expect(repository.initializeAgencyDatabase(agency)).rejects.toThrow(AgencyRepositoryError);
      });
    });

    describe('backupAgencyDatabase()', () => {
      it('should backup agency database successfully', async () => {
        // Mock findById to return existing agency
        const mockFindStmt = { get: jest.fn().mockReturnValue(mockAgencyRow) };
        mockDb.prepare.mockReturnValue(mockFindStmt);

        const result = await repository.backupAgencyDatabase('agency-123');

        expect(result).toEqual(expect.stringContaining('test-agency.db.backup.'));
        expect(result).toMatch(/\.backup\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      });

      it('should use custom backup path when provided', async () => {
        const mockFindStmt = { get: jest.fn().mockReturnValue(mockAgencyRow) };
        mockDb.prepare.mockReturnValue(mockFindStmt);

        const customPath = '/custom/backup/path.db';
        const result = await repository.backupAgencyDatabase('agency-123', customPath);

        expect(result).toBe(customPath);
      });

      it('should throw AgencyNotFoundError when agency does not exist', async () => {
        const mockFindStmt = { get: jest.fn().mockReturnValue(null) };
        mockDb.prepare.mockReturnValue(mockFindStmt);

        await expect(repository.backupAgencyDatabase('non-existent')).rejects.toThrow(AgencyNotFoundError);
      });

      it('should validate agency ID parameter', async () => {
        await expect(repository.backupAgencyDatabase('')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.backupAgencyDatabase('   ')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.backupAgencyDatabase(null as any)).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.backupAgencyDatabase(undefined as any)).rejects.toThrow(AgencyRepositoryError);
      });
    });

    describe('restoreAgencyDatabase()', () => {
      it('should restore agency database successfully', async () => {
        const mockFindStmt = { get: jest.fn().mockReturnValue(mockAgencyRow) };
        mockDb.prepare.mockReturnValue(mockFindStmt);

        const result = await repository.restoreAgencyDatabase('agency-123', '/backup/path.db');

        expect(result).toBe(true);
      });

      it('should throw AgencyNotFoundError when agency does not exist', async () => {
        const mockFindStmt = { get: jest.fn().mockReturnValue(null) };
        mockDb.prepare.mockReturnValue(mockFindStmt);

        await expect(repository.restoreAgencyDatabase('non-existent', '/backup/path.db')).rejects.toThrow(
          AgencyNotFoundError
        );
      });

      it('should validate parameters', async () => {
        await expect(repository.restoreAgencyDatabase('', '/backup/path.db')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.restoreAgencyDatabase('agency-123', '')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.restoreAgencyDatabase('agency-123', '   ')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.restoreAgencyDatabase(null as any, '/backup/path.db')).rejects.toThrow(
          AgencyRepositoryError
        );
        await expect(repository.restoreAgencyDatabase('agency-123', null as any)).rejects.toThrow(
          AgencyRepositoryError
        );
      });
    });

    describe('getDatabaseSize()', () => {
      it('should get database size successfully', async () => {
        const mockFindStmt = { get: jest.fn().mockReturnValue(mockAgencyRow) };
        mockDb.prepare.mockReturnValue(mockFindStmt);

        const result = await repository.getDatabaseSize('agency-123');

        expect(result).toBe(1048576); // 1MB
        expect(typeof result).toBe('number');
      });

      it('should throw AgencyNotFoundError when agency does not exist', async () => {
        const mockFindStmt = { get: jest.fn().mockReturnValue(null) };
        mockDb.prepare.mockReturnValue(mockFindStmt);

        await expect(repository.getDatabaseSize('non-existent')).rejects.toThrow(AgencyNotFoundError);
      });

      it('should validate agency ID parameter', async () => {
        await expect(repository.getDatabaseSize('')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.getDatabaseSize('   ')).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.getDatabaseSize(null as any)).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.getDatabaseSize(undefined as any)).rejects.toThrow(AgencyRepositoryError);
      });
    });
  });

  describe('Integration Tests - Step MT-2C', () => {
    it('should perform complex repository operations', async () => {
      const agency = Agency.create(validAgencyParams, 'user-123');

      // Test count
      const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
      mockDb.prepare.mockReturnValue(mockCountStmt);

      const count = await repository.count();
      expect(count).toBe(1);

      // Test with criteria
      const criteria: Partial<AgencySearchCriteria> = { status: AgencyStatus.ACTIVE };
      const mockCriteriaStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
      mockDb.prepare.mockReturnValue(mockCriteriaStmt);

      const criteriaCount = await repository.countByCriteria(criteria);
      expect(criteriaCount).toBe(1);
    });

    it('should maintain data consistency across operations', async () => {
      // Test transaction flow
      const mockTransactionStmt = { run: jest.fn() };
      mockDb.prepare.mockReturnValue(mockTransactionStmt);

      const transaction = await repository.beginTransaction();
      expect(transaction.isActive()).toBe(true);

      // Commit transaction
      const mockCommitStmt = { run: jest.fn() };
      mockDb.prepare.mockReturnValue(mockCommitStmt);

      await transaction.commit();
      expect(transaction.isActive()).toBe(false);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test error propagation
      const mockErrorStmt = {
        get: jest.fn().mockImplementation(() => {
          throw new Error('Database connection lost');
        }),
      };
      mockDb.prepare.mockReturnValue(mockErrorStmt);

      // All operations should properly catch and transform errors
      await expect(repository.count()).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.getStats()).rejects.toThrow(AgencyRepositoryError);
    });
  });
});
