/**
 * Agency Repository Interface Tests
 *
 * Unit tests for Agency repository domain interfaces and error types.
 * Tests repository contracts, error handling, and type definitions.
 *
 * @domain Repository Tests
 * @pattern Repository Pattern Testing
 * @version 1.0.0
 */

import {
  AgencyRepositoryError,
  AgencyNotFoundError,
  AgencyAlreadyExistsError,
  AgencyRepositoryConnectionError,
  type IAgencyRepository,
  type IAgencyRepositoryTransaction,
  type AgencySearchCriteria,
  type AgencySearchResult,
  type AgencyRepositoryStats,
} from '../agency.repository';

import { Agency, AgencyStatus, type CreateAgencyParams } from '../../entities/agency';

describe('Agency Repository Domain Interface Tests', () => {
  describe('AgencyRepositoryError', () => {
    it('should create error with message, operation, and optional cause', () => {
      const cause = new Error('Database connection failed');
      const error = new AgencyRepositoryError('Failed to save agency', 'save', cause);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AgencyRepositoryError);
      expect(error.name).toBe('AgencyRepositoryError');
      expect(error.message).toBe('Failed to save agency');
      expect(error.operation).toBe('save');
      expect(error.cause).toBe(cause);
    });

    it('should create error without cause', () => {
      const error = new AgencyRepositoryError('Validation failed', 'validate');

      expect(error.name).toBe('AgencyRepositoryError');
      expect(error.message).toBe('Validation failed');
      expect(error.operation).toBe('validate');
      expect(error.cause).toBeUndefined();
    });

    it('should have proper error inheritance chain', () => {
      const error = new AgencyRepositoryError('Test error', 'test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AgencyRepositoryError).toBe(true);
      expect(error.toString()).toContain('AgencyRepositoryError: Test error');
    });
  });

  describe('AgencyNotFoundError', () => {
    it('should create error with default identifier type', () => {
      const error = new AgencyNotFoundError('agency-123');

      expect(error).toBeInstanceOf(AgencyRepositoryError);
      expect(error.name).toBe('AgencyNotFoundError');
      expect(error.message).toBe('Agency not found with id: agency-123');
      expect(error.operation).toBe('find');
    });

    it('should create error with custom identifier type', () => {
      const error = new AgencyNotFoundError('test-agency', 'name');

      expect(error.name).toBe('AgencyNotFoundError');
      expect(error.message).toBe('Agency not found with name: test-agency');
      expect(error.operation).toBe('find');
    });
  });

  describe('AgencyAlreadyExistsError', () => {
    it('should create error with default identifier type', () => {
      const error = new AgencyAlreadyExistsError('Test Agency');

      expect(error).toBeInstanceOf(AgencyRepositoryError);
      expect(error.name).toBe('AgencyAlreadyExistsError');
      expect(error.message).toBe('Agency already exists with name: Test Agency');
      expect(error.operation).toBe('save');
    });

    it('should create error with custom identifier type', () => {
      const error = new AgencyAlreadyExistsError('/path/to/database.db', 'databasePath');

      expect(error.name).toBe('AgencyAlreadyExistsError');
      expect(error.message).toBe('Agency already exists with databasePath: /path/to/database.db');
      expect(error.operation).toBe('save');
    });
  });

  describe('AgencyRepositoryConnectionError', () => {
    it('should create connection error with cause', () => {
      const cause = new Error('Database locked');
      const error = new AgencyRepositoryConnectionError('Cannot connect to database', cause);

      expect(error).toBeInstanceOf(AgencyRepositoryError);
      expect(error.name).toBe('AgencyRepositoryConnectionError');
      expect(error.message).toBe('Cannot connect to database');
      expect(error.operation).toBe('connection');
      expect(error.cause).toBe(cause);
    });

    it('should create connection error without cause', () => {
      const error = new AgencyRepositoryConnectionError('Database unavailable');

      expect(error.name).toBe('AgencyRepositoryConnectionError');
      expect(error.message).toBe('Database unavailable');
      expect(error.operation).toBe('connection');
      expect(error.cause).toBeUndefined();
    });
  });

  describe('AgencySearchCriteria Type Validation', () => {
    it('should allow empty search criteria', () => {
      const criteria: AgencySearchCriteria = {};
      expect(criteria).toBeDefined();
    });

    it('should allow full search criteria with all optional fields', () => {
      const criteria: AgencySearchCriteria = {
        searchTerm: 'test',
        name: 'Test Agency',
        contactPerson: 'John Doe',
        status: AgencyStatus.ACTIVE,
        isOperational: true,
        allowsCreditSales: true,
        currency: 'USD',
        createdAfter: new Date('2023-01-01'),
        createdBefore: new Date('2023-12-31'),
        updatedAfter: new Date('2023-06-01'),
        updatedBefore: new Date('2023-06-30'),
        limit: 50,
        offset: 0,
        sortBy: 'name',
        sortOrder: 'ASC',
      };

      expect(criteria.searchTerm).toBe('test');
      expect(criteria.name).toBe('Test Agency');
      expect(criteria.contactPerson).toBe('John Doe');
      expect(criteria.status).toBe(AgencyStatus.ACTIVE);
      expect(criteria.isOperational).toBe(true);
      expect(criteria.allowsCreditSales).toBe(true);
      expect(criteria.currency).toBe('USD');
      expect(criteria.limit).toBe(50);
      expect(criteria.offset).toBe(0);
      expect(criteria.sortBy).toBe('name');
      expect(criteria.sortOrder).toBe('ASC');
    });

    it('should allow status as array', () => {
      const criteria: AgencySearchCriteria = {
        status: [AgencyStatus.ACTIVE, AgencyStatus.INACTIVE],
      };

      expect(Array.isArray(criteria.status)).toBe(true);
      expect(criteria.status).toContain(AgencyStatus.ACTIVE);
      expect(criteria.status).toContain(AgencyStatus.INACTIVE);
    });

    it('should validate sort options', () => {
      const validSortBy: Array<'name' | 'createdAt' | 'updatedAt' | 'status'> = [
        'name',
        'createdAt',
        'updatedAt',
        'status',
      ];

      const validSortOrder: Array<'ASC' | 'DESC'> = ['ASC', 'DESC'];

      validSortBy.forEach((sortBy) => {
        const criteria: AgencySearchCriteria = { sortBy };
        expect(criteria.sortBy).toBe(sortBy);
      });

      validSortOrder.forEach((sortOrder) => {
        const criteria: AgencySearchCriteria = { sortOrder };
        expect(criteria.sortOrder).toBe(sortOrder);
      });
    });
  });

  describe('AgencySearchResult Type Validation', () => {
    it('should have correct structure', () => {
      const mockAgency = Agency.create({
        name: 'Test Agency',
        databasePath: 'test.db',
      });

      const result: AgencySearchResult = {
        agencies: [mockAgency],
        total: 1,
        limit: 100,
        offset: 0,
        hasMore: false,
      };

      expect(result.agencies).toHaveLength(1);
      expect(result.agencies[0]).toBeInstanceOf(Agency);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should support readonly agencies array', () => {
      const mockAgency = Agency.create({
        name: 'Test Agency',
        databasePath: 'test.db',
      });

      const result: AgencySearchResult = {
        agencies: [mockAgency] as readonly Agency[],
        total: 1,
        limit: 100,
        offset: 0,
        hasMore: false,
      };

      expect(result.agencies).toHaveLength(1);
      // agencies array is readonly at compile-time (TypeScript), not runtime
      expect(result.agencies[0]).toBeInstanceOf(Agency);
    });
  });

  describe('AgencyRepositoryStats Type Validation', () => {
    it('should have correct statistics structure', () => {
      const stats: AgencyRepositoryStats = {
        totalAgencies: 100,
        activeAgencies: 80,
        inactiveAgencies: 15,
        suspendedAgencies: 5,
        averageAgenciesPerDay: 2.5,
        totalDatabaseSize: 1024000,
        oldestAgency: new Date('2023-01-01'),
        newestAgency: new Date('2023-12-31'),
      };

      expect(stats.totalAgencies).toBe(100);
      expect(stats.activeAgencies).toBe(80);
      expect(stats.inactiveAgencies).toBe(15);
      expect(stats.suspendedAgencies).toBe(5);
      expect(stats.averageAgenciesPerDay).toBe(2.5);
      expect(stats.totalDatabaseSize).toBe(1024000);
      expect(stats.oldestAgency).toBeInstanceOf(Date);
      expect(stats.newestAgency).toBeInstanceOf(Date);
    });

    it('should allow null dates for empty repositories', () => {
      const stats: AgencyRepositoryStats = {
        totalAgencies: 0,
        activeAgencies: 0,
        inactiveAgencies: 0,
        suspendedAgencies: 0,
        averageAgenciesPerDay: 0,
        totalDatabaseSize: 0,
        oldestAgency: null,
        newestAgency: null,
      };

      expect(stats.totalAgencies).toBe(0);
      expect(stats.oldestAgency).toBeNull();
      expect(stats.newestAgency).toBeNull();
    });
  });

  describe('IAgencyRepositoryTransaction Interface', () => {
    it('should define transaction contract', () => {
      // Mock implementation to test interface structure
      const mockTransaction: IAgencyRepositoryTransaction = {
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        isActive: jest.fn(),
      };

      expect(typeof mockTransaction.save).toBe('function');
      expect(typeof mockTransaction.update).toBe('function');
      expect(typeof mockTransaction.delete).toBe('function');
      expect(typeof mockTransaction.commit).toBe('function');
      expect(typeof mockTransaction.rollback).toBe('function');
      expect(typeof mockTransaction.isActive).toBe('function');
    });
  });

  describe('IAgencyRepository Interface Contract', () => {
    it('should define all required CRUD operations', () => {
      // Mock implementation to test interface structure
      const mockRepository: IAgencyRepository = {
        save: jest.fn(),
        update: jest.fn(),
        findById: jest.fn(),
        findByName: jest.fn(),
        findByDatabasePath: jest.fn(),
        existsByName: jest.fn(),
        existsByDatabasePath: jest.fn(),
        search: jest.fn(),
        findAll: jest.fn(),
        findByStatus: jest.fn(),
        findOperational: jest.fn(),
        count: jest.fn(),
        countByCriteria: jest.fn(),
        delete: jest.fn(),
        suspend: jest.fn(),
        activate: jest.fn(),
        getStats: jest.fn(),
        isHealthy: jest.fn(),
        beginTransaction: jest.fn(),
        initializeAgencyDatabase: jest.fn(),
        backupAgencyDatabase: jest.fn(),
        restoreAgencyDatabase: jest.fn(),
        getDatabaseSize: jest.fn(),
      };

      // Test core CRUD operations
      expect(typeof mockRepository.save).toBe('function');
      expect(typeof mockRepository.update).toBe('function');
      expect(typeof mockRepository.findById).toBe('function');
      expect(typeof mockRepository.delete).toBe('function');

      // Test search operations
      expect(typeof mockRepository.findByName).toBe('function');
      expect(typeof mockRepository.findByDatabasePath).toBe('function');
      expect(typeof mockRepository.search).toBe('function');
      expect(typeof mockRepository.findAll).toBe('function');
      expect(typeof mockRepository.findByStatus).toBe('function');
      expect(typeof mockRepository.findOperational).toBe('function');

      // Test existence checks
      expect(typeof mockRepository.existsByName).toBe('function');
      expect(typeof mockRepository.existsByDatabasePath).toBe('function');

      // Test counting operations
      expect(typeof mockRepository.count).toBe('function');
      expect(typeof mockRepository.countByCriteria).toBe('function');

      // Test status operations
      expect(typeof mockRepository.suspend).toBe('function');
      expect(typeof mockRepository.activate).toBe('function');

      // Test utility operations
      expect(typeof mockRepository.getStats).toBe('function');
      expect(typeof mockRepository.isHealthy).toBe('function');
      expect(typeof mockRepository.beginTransaction).toBe('function');

      // Test multi-tenant operations
      expect(typeof mockRepository.initializeAgencyDatabase).toBe('function');
      expect(typeof mockRepository.backupAgencyDatabase).toBe('function');
      expect(typeof mockRepository.restoreAgencyDatabase).toBe('function');
      expect(typeof mockRepository.getDatabaseSize).toBe('function');
    });

    it('should return correct types for operations', async () => {
      const mockAgency = Agency.create({
        name: 'Test Agency',
        databasePath: 'test.db',
      });

      const mockRepository: IAgencyRepository = {
        save: jest.fn().mockResolvedValue(mockAgency),
        update: jest.fn().mockResolvedValue(mockAgency),
        findById: jest.fn().mockResolvedValue(mockAgency),
        findByName: jest.fn().mockResolvedValue(mockAgency),
        findByDatabasePath: jest.fn().mockResolvedValue(mockAgency),
        existsByName: jest.fn().mockResolvedValue(true),
        existsByDatabasePath: jest.fn().mockResolvedValue(true),
        search: jest.fn().mockResolvedValue({
          agencies: [mockAgency],
          total: 1,
          limit: 100,
          offset: 0,
          hasMore: false,
        } as AgencySearchResult),
        findAll: jest.fn().mockResolvedValue([mockAgency]),
        findByStatus: jest.fn().mockResolvedValue([mockAgency]),
        findOperational: jest.fn().mockResolvedValue([mockAgency]),
        count: jest.fn().mockResolvedValue(1),
        countByCriteria: jest.fn().mockResolvedValue(1),
        delete: jest.fn().mockResolvedValue(true),
        suspend: jest.fn().mockResolvedValue(mockAgency),
        activate: jest.fn().mockResolvedValue(mockAgency),
        getStats: jest.fn().mockResolvedValue({
          totalAgencies: 1,
          activeAgencies: 1,
          inactiveAgencies: 0,
          suspendedAgencies: 0,
          averageAgenciesPerDay: 1,
          totalDatabaseSize: 1024,
          oldestAgency: new Date(),
          newestAgency: new Date(),
        } as AgencyRepositoryStats),
        isHealthy: jest.fn().mockResolvedValue(true),
        beginTransaction: jest.fn().mockResolvedValue({
          save: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          isActive: jest.fn().mockReturnValue(true),
        } as IAgencyRepositoryTransaction),
        initializeAgencyDatabase: jest.fn().mockResolvedValue(true),
        backupAgencyDatabase: jest.fn().mockResolvedValue('/path/to/backup.db'),
        restoreAgencyDatabase: jest.fn().mockResolvedValue(true),
        getDatabaseSize: jest.fn().mockResolvedValue(1024),
      };

      // Test return types
      const savedAgency = await mockRepository.save(mockAgency);
      expect(savedAgency).toBeInstanceOf(Agency);

      const foundAgency = await mockRepository.findById('agency-id');
      expect(foundAgency).toBeInstanceOf(Agency);

      const exists = await mockRepository.existsByName('test');
      expect(typeof exists).toBe('boolean');

      const searchResult = await mockRepository.search({});
      expect(searchResult).toHaveProperty('agencies');
      expect(searchResult).toHaveProperty('total');
      expect(searchResult).toHaveProperty('hasMore');

      const count = await mockRepository.count();
      expect(typeof count).toBe('number');

      const stats = await mockRepository.getStats();
      expect(stats).toHaveProperty('totalAgencies');
      expect(stats).toHaveProperty('activeAgencies');

      const isHealthy = await mockRepository.isHealthy();
      expect(typeof isHealthy).toBe('boolean');

      const transaction = await mockRepository.beginTransaction();
      expect(transaction).toHaveProperty('commit');
      expect(transaction).toHaveProperty('rollback');
      expect(transaction).toHaveProperty('isActive');

      const backupPath = await mockRepository.backupAgencyDatabase('agency-id');
      expect(typeof backupPath).toBe('string');

      const dbSize = await mockRepository.getDatabaseSize('agency-id');
      expect(typeof dbSize).toBe('number');
    });
  });

  describe('Error Type Hierarchy', () => {
    it('should maintain proper error inheritance', () => {
      const baseError = new AgencyRepositoryError('Base error', 'test');
      const notFoundError = new AgencyNotFoundError('agency-123');
      const alreadyExistsError = new AgencyAlreadyExistsError('Test Agency');
      const connectionError = new AgencyRepositoryConnectionError('Connection failed');

      // Check inheritance chain
      expect(baseError instanceof Error).toBe(true);
      expect(baseError instanceof AgencyRepositoryError).toBe(true);

      expect(notFoundError instanceof Error).toBe(true);
      expect(notFoundError instanceof AgencyRepositoryError).toBe(true);
      expect(notFoundError instanceof AgencyNotFoundError).toBe(true);

      expect(alreadyExistsError instanceof Error).toBe(true);
      expect(alreadyExistsError instanceof AgencyRepositoryError).toBe(true);
      expect(alreadyExistsError instanceof AgencyAlreadyExistsError).toBe(true);

      expect(connectionError instanceof Error).toBe(true);
      expect(connectionError instanceof AgencyRepositoryError).toBe(true);
      expect(connectionError instanceof AgencyRepositoryConnectionError).toBe(true);
    });

    it('should have unique error names for proper error handling', () => {
      const baseError = new AgencyRepositoryError('Base error', 'test');
      const notFoundError = new AgencyNotFoundError('agency-123');
      const alreadyExistsError = new AgencyAlreadyExistsError('Test Agency');
      const connectionError = new AgencyRepositoryConnectionError('Connection failed');

      expect(baseError.name).toBe('AgencyRepositoryError');
      expect(notFoundError.name).toBe('AgencyNotFoundError');
      expect(alreadyExistsError.name).toBe('AgencyAlreadyExistsError');
      expect(connectionError.name).toBe('AgencyRepositoryConnectionError');

      // Ensure names are unique
      const names = [baseError.name, notFoundError.name, alreadyExistsError.name, connectionError.name];
      const uniqueNames = [...new Set(names)];
      expect(names).toHaveLength(uniqueNames.length);
    });
  });
});
