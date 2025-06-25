/**
 * SQLite Agency Repository Tests - Step MT-2B: Search & Query Methods
 *
 * Unit tests for search and query functionality in the Agency repository.
 * Tests complex search criteria, pagination, filtering, and query operations.
 *
 * STEP MT-2B TEST SCOPE:
 * - search() method with various criteria combinations
 * - findAll() method with pagination
 * - findByStatus() method with status filtering
 * - findOperational() method for operational agencies
 * - Comprehensive error handling and edge cases
 * - Performance and pagination validation
 *
 * @domain Agency Management
 * @pattern Repository Pattern Testing
 * @version 1.0.0 - Step MT-2B: Search & Query Methods
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
} from '../../../domain/repositories/agency.repository';
import { Agency, AgencyStatus, type CreateAgencyParams } from '../../../domain/entities/agency';

// Mock dependencies
jest.mock('../../database/connection');

describe('SqliteAgencyRepository - Step MT-2B: Search & Query Methods', () => {
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

  describe('search() - Step MT-2B', () => {
    describe('Basic Search Functionality', () => {
      it('should search with empty criteria and return all agencies', async () => {
        const criteria: AgencySearchCriteria = {};

        // Mock count query
        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 2 }) };
        // Mock search query
        const mockSearchStmt = {
          all: jest.fn().mockReturnValue([mockAgencyRow, { ...mockAgencyRow, id: 'agency-456' }]),
        };

        mockDb.prepare
          .mockReturnValueOnce(mockCountStmt) // count query
          .mockReturnValueOnce(mockSearchStmt); // search query

        const result = await repository.search(criteria);

        expect(result).toEqual({
          agencies: expect.any(Array),
          total: 2,
          limit: 100,
          offset: 0,
          hasMore: false,
        });
        expect(result.agencies).toHaveLength(2);
        expect(mockCountStmt.get).toHaveBeenCalledWith();
        expect(mockSearchStmt.all).toHaveBeenCalledWith(100, 0);
      });

      it('should search by name with partial match', async () => {
        const criteria: AgencySearchCriteria = { name: 'Test' };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(1);
        expect(result.agencies).toHaveLength(1);
        expect(mockCountStmt.get).toHaveBeenCalledWith('%Test%');
        expect(mockSearchStmt.all).toHaveBeenCalledWith('%Test%', 100, 0);
      });

      it('should search by contact person', async () => {
        const criteria: AgencySearchCriteria = { contactPerson: 'John' };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(1);
        expect(mockCountStmt.get).toHaveBeenCalledWith('%John%');
        expect(mockSearchStmt.all).toHaveBeenCalledWith('%John%', 100, 0);
      });

      it('should search with searchTerm across multiple fields', async () => {
        const criteria: AgencySearchCriteria = { searchTerm: 'Test' };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(1);
        expect(mockCountStmt.get).toHaveBeenCalledWith('%Test%', '%Test%');
        expect(mockSearchStmt.all).toHaveBeenCalledWith('%Test%', '%Test%', 100, 0);
      });
    });

    describe('Status Filtering', () => {
      it('should filter by single status', async () => {
        const criteria: AgencySearchCriteria = { status: AgencyStatus.ACTIVE };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(1);
        expect(mockCountStmt.get).toHaveBeenCalledWith('active');
        expect(mockSearchStmt.all).toHaveBeenCalledWith('active', 100, 0);
      });

      it('should filter by multiple statuses', async () => {
        const criteria: AgencySearchCriteria = {
          status: [AgencyStatus.ACTIVE, AgencyStatus.INACTIVE],
        };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 2 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(2);
        expect(mockCountStmt.get).toHaveBeenCalledWith('active', 'inactive');
        expect(mockSearchStmt.all).toHaveBeenCalledWith('active', 'inactive', 100, 0);
      });

      it('should handle empty status array', async () => {
        const criteria: AgencySearchCriteria = { status: [] };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 0 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(0);
        expect(result.agencies).toHaveLength(0);
      });
    });

    describe('Business Settings Filtering', () => {
      it('should filter by currency', async () => {
        const criteria: AgencySearchCriteria = { currency: 'USD' };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(1);
        expect(mockCountStmt.get).toHaveBeenCalledWith('%"currency":"USD"%');
        expect(mockSearchStmt.all).toHaveBeenCalledWith('%"currency":"USD"%', 100, 0);
      });

      it('should filter by allowsCreditSales true', async () => {
        const criteria: AgencySearchCriteria = { allowsCreditSales: true };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(1);
        expect(mockCountStmt.get).toHaveBeenCalledWith('%"allowCreditSales":true%');
        expect(mockSearchStmt.all).toHaveBeenCalledWith('%"allowCreditSales":true%', 100, 0);
      });

      it('should filter by allowsCreditSales false', async () => {
        const criteria: AgencySearchCriteria = { allowsCreditSales: false };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 0 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(0);
        expect(mockCountStmt.get).toHaveBeenCalledWith('%"allowCreditSales":false%');
        expect(mockSearchStmt.all).toHaveBeenCalledWith('%"allowCreditSales":false%', 100, 0);
      });
    });

    describe('Date Range Filtering', () => {
      it('should filter by created date range', async () => {
        const createdAfter = new Date('2024-01-01');
        const createdBefore = new Date('2024-12-31');
        const criteria: AgencySearchCriteria = { createdAfter, createdBefore };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(1);
        expect(mockCountStmt.get).toHaveBeenCalledWith(createdAfter.getTime(), createdBefore.getTime());
      });

      it('should filter by updated date range', async () => {
        const updatedAfter = new Date('2024-01-01');
        const updatedBefore = new Date('2024-12-31');
        const criteria: AgencySearchCriteria = { updatedAfter, updatedBefore };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(1);
        expect(mockCountStmt.get).toHaveBeenCalledWith(updatedAfter.getTime(), updatedBefore.getTime());
      });
    });

    describe('Pagination', () => {
      it('should handle custom limit and offset', async () => {
        const criteria: AgencySearchCriteria = { limit: 50, offset: 25 };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 100 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.limit).toBe(50);
        expect(result.offset).toBe(25);
        expect(result.hasMore).toBe(true);
        expect(mockSearchStmt.all).toHaveBeenCalledWith(50, 25);
      });

      it('should enforce maximum limit for safety', async () => {
        const criteria: AgencySearchCriteria = { limit: 20000 }; // Exceeds max of 10000

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.limit).toBe(10000); // Should be capped
        expect(mockSearchStmt.all).toHaveBeenCalledWith(10000, 0);
      });

      it('should handle negative offset', async () => {
        const criteria: AgencySearchCriteria = { offset: -10 };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.offset).toBe(0); // Should be corrected to 0
        expect(mockSearchStmt.all).toHaveBeenCalledWith(100, 0);
      });

      it('should calculate hasMore correctly', async () => {
        const criteria: AgencySearchCriteria = { limit: 10, offset: 5 };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 20 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.hasMore).toBe(true); // (5 + 10) < 20
      });
    });

    describe('Sorting', () => {
      it('should sort by name ascending', async () => {
        const criteria: AgencySearchCriteria = {
          sortBy: 'name',
          sortOrder: 'ASC',
        };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        await repository.search(criteria);

        // Verify the query includes ORDER BY name ASC
        const searchQuery = mockDb.prepare.mock.calls[1][0];
        expect(searchQuery).toContain('ORDER BY name ASC');
      });

      it('should sort by createdAt descending (default)', async () => {
        const criteria: AgencySearchCriteria = {
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        await repository.search(criteria);

        const searchQuery = mockDb.prepare.mock.calls[1][0];
        expect(searchQuery).toContain('ORDER BY created_at DESC');
      });

      it('should use default sort when no sortBy specified', async () => {
        const criteria: AgencySearchCriteria = {};

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        await repository.search(criteria);

        const searchQuery = mockDb.prepare.mock.calls[1][0];
        expect(searchQuery).toContain('ORDER BY created_at DESC');
      });
    });

    describe('Complex Search Scenarios', () => {
      it('should combine multiple search criteria', async () => {
        const criteria: AgencySearchCriteria = {
          name: 'Test',
          status: AgencyStatus.ACTIVE,
          currency: 'USD',
          allowsCreditSales: true,
          limit: 25,
          offset: 0,
          sortBy: 'name',
          sortOrder: 'ASC',
        };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(1);
        expect(result.limit).toBe(25);

        // Should call with all parameters
        expect(mockCountStmt.get).toHaveBeenCalledWith(
          '%Test%',
          'active',
          '%"currency":"USD"%',
          '%"allowCreditSales":true%'
        );
      });

      it('should handle empty search results', async () => {
        const criteria: AgencySearchCriteria = { name: 'NonExistent' };

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 0 }) };
        const mockSearchStmt = { all: jest.fn().mockReturnValue([]) };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        const result = await repository.search(criteria);

        expect(result.total).toBe(0);
        expect(result.agencies).toHaveLength(0);
        expect(result.hasMore).toBe(false);
      });
    });

    describe('Error Handling', () => {
      it('should validate search criteria', async () => {
        await expect(repository.search(null as any)).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.search(undefined as any)).rejects.toThrow(AgencyRepositoryError);
        await expect(repository.search('invalid' as any)).rejects.toThrow(AgencyRepositoryError);
      });

      it('should handle database count errors', async () => {
        const criteria: AgencySearchCriteria = {};

        const mockCountStmt = {
          get: jest.fn().mockImplementation(() => {
            throw new Error('Database count error');
          }),
        };

        mockDb.prepare.mockReturnValue(mockCountStmt);

        await expect(repository.search(criteria)).rejects.toThrow(AgencyRepositoryError);
      });

      it('should handle database search errors', async () => {
        const criteria: AgencySearchCriteria = {};

        const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
        const mockSearchStmt = {
          all: jest.fn().mockImplementation(() => {
            throw new Error('Database search error');
          }),
        };

        mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

        await expect(repository.search(criteria)).rejects.toThrow(AgencyRepositoryError);
      });

      it('should log search errors with context', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const criteria: AgencySearchCriteria = { name: 'Test' };

        const mockCountStmt = {
          get: jest.fn().mockImplementation(() => {
            throw new Error('Database connection lost');
          }),
        };

        mockDb.prepare.mockReturnValue(mockCountStmt);

        try {
          await repository.search(criteria);
        } catch (error) {
          // Expected error
        }

        expect(consoleSpy).toHaveBeenCalledWith(
          'Repository search error:',
          expect.objectContaining({
            operation: 'search',
            criteria,
            error: expect.any(String),
          })
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('findAll() - Step MT-2B', () => {
    it('should find all agencies with default limit', async () => {
      const mockStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Agency);
      expect(mockStmt.all).toHaveBeenCalledWith(1000); // Default limit
    });

    it('should find all agencies with custom limit', async () => {
      const mockStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.findAll(50);

      expect(result).toHaveLength(1);
      expect(mockStmt.all).toHaveBeenCalledWith(50);
    });

    it('should enforce maximum limit for safety', async () => {
      const mockStmt = { all: jest.fn().mockReturnValue([]) };
      mockDb.prepare.mockReturnValue(mockStmt);

      await repository.findAll(20000); // Exceeds max of 10000

      expect(mockStmt.all).toHaveBeenCalledWith(10000); // Should be capped
    });

    it('should handle empty results', async () => {
      const mockStmt = { all: jest.fn().mockReturnValue([]) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.findAll();

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle database errors', async () => {
      const mockStmt = {
        all: jest.fn().mockImplementation(() => {
          throw new Error('Database query failed');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await expect(repository.findAll()).rejects.toThrow(AgencyRepositoryError);
    });
  });

  describe('findByStatus() - Step MT-2B', () => {
    it('should find agencies by active status', async () => {
      const mockStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.findByStatus(AgencyStatus.ACTIVE);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Agency);
      expect(mockStmt.all).toHaveBeenCalledWith('active');
    });

    it('should find agencies by inactive status', async () => {
      const inactiveRow = { ...mockAgencyRow, status: 'inactive' };
      const mockStmt = { all: jest.fn().mockReturnValue([inactiveRow]) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.findByStatus(AgencyStatus.INACTIVE);

      expect(result).toHaveLength(1);
      expect(mockStmt.all).toHaveBeenCalledWith('inactive');
    });

    it('should find agencies by suspended status', async () => {
      const suspendedRow = { ...mockAgencyRow, status: 'suspended' };
      const mockStmt = { all: jest.fn().mockReturnValue([suspendedRow]) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.findByStatus(AgencyStatus.SUSPENDED);

      expect(result).toHaveLength(1);
      expect(mockStmt.all).toHaveBeenCalledWith('suspended');
    });

    it('should return empty array when no agencies found', async () => {
      const mockStmt = { all: jest.fn().mockReturnValue([]) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.findByStatus(AgencyStatus.ACTIVE);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should validate status parameter', async () => {
      await expect(repository.findByStatus('' as any)).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.findByStatus(null as any)).rejects.toThrow(AgencyRepositoryError);
      await expect(repository.findByStatus(undefined as any)).rejects.toThrow(AgencyRepositoryError);
    });

    it('should handle database errors', async () => {
      const mockStmt = {
        all: jest.fn().mockImplementation(() => {
          throw new Error('Database query failed');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await expect(repository.findByStatus(AgencyStatus.ACTIVE)).rejects.toThrow(AgencyRepositoryError);
    });
  });

  describe('findOperational() - Step MT-2B', () => {
    it('should find operational agencies', async () => {
      const mockStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.findOperational();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Agency);
      expect(mockStmt.all).toHaveBeenCalledWith('active');
    });

    it('should filter out non-operational agencies using domain logic', async () => {
      // Create a mock agency that would be filtered out by domain logic
      const nonOperationalRow = {
        ...mockAgencyRow,
        // This would make the agency non-operational through domain logic
        settings: JSON.stringify({
          ...validAgencyParams.settings,
          // Some setting that might make it non-operational
        }),
      };

      const mockStmt = { all: jest.fn().mockReturnValue([mockAgencyRow, nonOperationalRow]) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.findOperational();

      // Should return agencies that pass the domain's isOperational() check
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((agency) => agency.isOperational())).toBe(true);
    });

    it('should return empty array when no operational agencies found', async () => {
      const mockStmt = { all: jest.fn().mockReturnValue([]) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.findOperational();

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle database errors', async () => {
      const mockStmt = {
        all: jest.fn().mockImplementation(() => {
          throw new Error('Database query failed');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      await expect(repository.findOperational()).rejects.toThrow(AgencyRepositoryError);
    });

    it('should log errors with proper context', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockStmt = {
        all: jest.fn().mockImplementation(() => {
          throw new Error('Database connection timeout');
        }),
      };
      mockDb.prepare.mockReturnValue(mockStmt);

      try {
        await repository.findOperational();
      } catch (error) {
        // Expected error
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Repository findOperational error:',
        expect.objectContaining({
          operation: 'findOperational',
          error: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Helper Methods - Step MT-2B', () => {
    describe('mapSortFieldToDatabase()', () => {
      it('should map sort fields correctly', () => {
        const repo = repository as any;

        expect(repo.mapSortFieldToDatabase('name')).toBe('name');
        expect(repo.mapSortFieldToDatabase('createdAt')).toBe('created_at');
        expect(repo.mapSortFieldToDatabase('updatedAt')).toBe('updated_at');
        expect(repo.mapSortFieldToDatabase('status')).toBe('status');
        expect(repo.mapSortFieldToDatabase('contactPerson')).toBe('contact_person');
      });

      it('should default to created_at for unknown fields', () => {
        const repo = repository as any;

        expect(repo.mapSortFieldToDatabase('unknownField')).toBe('created_at');
        expect(repo.mapSortFieldToDatabase('')).toBe('created_at');
        expect(repo.mapSortFieldToDatabase(null)).toBe('created_at');
      });
    });
  });

  describe('Integration Tests - Step MT-2B', () => {
    it('should work with real Agency entities', async () => {
      const agency = Agency.create(validAgencyParams, 'user-123');
      const agencyRow = {
        ...mockAgencyRow,
        id: agency.id,
        name: agency.name,
        settings: JSON.stringify(agency.settings),
      };

      const mockStmt = { all: jest.fn().mockReturnValue([agencyRow]) };
      mockDb.prepare.mockReturnValue(mockStmt);

      const result = await repository.findAll(10);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Agency);
      expect(result[0].id).toBe(agency.id);
      expect(result[0].name).toBe(agency.name);
    });

    it('should maintain data integrity across search operations', async () => {
      const criteria: AgencySearchCriteria = {
        name: 'Test',
        status: AgencyStatus.ACTIVE,
        limit: 10,
      };

      const mockCountStmt = { get: jest.fn().mockReturnValue({ total: 1 }) };
      const mockSearchStmt = { all: jest.fn().mockReturnValue([mockAgencyRow]) };

      mockDb.prepare.mockReturnValueOnce(mockCountStmt).mockReturnValueOnce(mockSearchStmt);

      const result = await repository.search(criteria);

      expect(result.agencies).toHaveLength(1);
      expect(result.agencies[0]).toBeInstanceOf(Agency);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });
});
