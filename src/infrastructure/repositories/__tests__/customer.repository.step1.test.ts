/**
 * Customer Repository Implementation Tests - Step 1: Basic Structure
 *
 * Tests for SqliteCustomerRepository basic functionality including:
 * - Repository creation and initialization
 * - Basic CRUD operations (save, findById, findByCustomerCode)
 * - Existence checks
 * - Error handling
 * - Connection validation
 *
 * @domain Customer Management
 * @pattern Test-Driven Development
 * @architecture Hexagonal Architecture Testing
 * @version 1.0.0
 */

import { SqliteCustomerRepository, createCustomerRepository } from '../customer.repository';
import { DatabaseConnection, createDatabaseConnection } from '../../database/connection';
import { createMigrationManager } from '../../database/migration';
import {
  CustomerRepositoryError,
  CustomerAlreadyExistsError,
  CustomerNotFoundError,
} from '../../../domain/repositories/customer.repository';
import {
  Customer,
  CustomerType,
  CustomerStatus,
  PaymentTerms,
  type CustomerAddress,
  type CustomerContact,
} from '../../../domain/entities/customer';
import { Email } from '../../../domain/value-objects/email';
import { Money } from '../../../domain/value-objects/money';
import Database from 'better-sqlite3';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('SqliteCustomerRepository - Step 1: Basic Structure', () => {
  let connection: DatabaseConnection;
  let repository: SqliteCustomerRepository;
  let testDbPath: string;

  beforeEach(async () => {
    // Create test database
    testDbPath = join(__dirname, 'test-customer-repo.db');
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

    connection = createDatabaseConnection({
      filename: testDbPath,
      inMemory: false,
      readonly: false,
      fileMustExist: false,
      timeout: 5000,
      verbose: false,
    });

    await connection.connect();

    // Run database migrations to create tables
    const migrationManager = createMigrationManager(connection);
    await migrationManager.migrate();

    repository = createCustomerRepository(connection);
  });

  afterEach(async () => {
    await connection.close();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('Repository Creation and Initialization', () => {
    it('should create repository with valid connection', () => {
      expect(repository).toBeInstanceOf(SqliteCustomerRepository);
      expect(repository).toBeDefined();
    });

    it('should throw error with null connection', () => {
      expect(() => new SqliteCustomerRepository(null as any)).toThrow(CustomerRepositoryError);
    });

    it('should throw error with undefined connection', () => {
      expect(() => new SqliteCustomerRepository(undefined as any)).toThrow(CustomerRepositoryError);
    });

    it('should validate connection during construction', () => {
      const mockConnection = {
        getDatabase: () => null,
      } as any;

      expect(() => new SqliteCustomerRepository(mockConnection)).toThrow(CustomerRepositoryError);
    });
  });

  describe('Factory Function', () => {
    it('should create repository instance using factory function', () => {
      const factoryRepo = createCustomerRepository(connection);
      expect(factoryRepo).toBeInstanceOf(SqliteCustomerRepository);
    });

    it('should throw error when factory called with invalid connection', () => {
      expect(() => createCustomerRepository(null as any)).toThrow(CustomerRepositoryError);
    });
  });

  describe('Health Check', () => {
    it('should return true for healthy repository', async () => {
      const isHealthy = await repository.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it('should return false when database is not accessible', async () => {
      // Close the connection to simulate unhealthy state
      await connection.close();
      const isHealthy = await repository.isHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Customer Existence Checks', () => {
    const agencyId = 'test-agency-001';

    it('should return false for non-existent customer code', async () => {
      const exists = await repository.existsByCustomerCode('NON_EXISTENT', agencyId);
      expect(exists).toBe(false);
    });

    it('should return false for non-existent email', async () => {
      const email = Email.create('nonexistent@example.com');
      const exists = await repository.existsByEmail(email, agencyId);
      expect(exists).toBe(false);
    });

    it('should handle database errors gracefully in existence checks', async () => {
      // Close connection to force error
      await connection.close();

      await expect(repository.existsByCustomerCode('TEST', agencyId)).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.existsByEmail(Email.create('test@example.com'))).rejects.toThrow(CustomerRepositoryError);
    });
  });

  describe('Find Operations', () => {
    it('should return null for non-existent customer ID', async () => {
      const customer = await repository.findById('non-existent-id');
      expect(customer).toBeNull();
    });

    it('should return null for non-existent customer code', async () => {
      const customer = await repository.findByCustomerCode('NON_EXISTENT', 'test-agency');
      expect(customer).toBeNull();
    });

    it('should return null for non-existent email', async () => {
      const email = Email.create('nonexistent@example.com');
      const customer = await repository.findByEmail(email);
      expect(customer).toBeNull();
    });

    it('should handle database errors gracefully in find operations', async () => {
      // Close connection to force error
      await connection.close();

      await expect(repository.findById('test-id')).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.findByCustomerCode('TEST', 'agency')).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.findByEmail(Email.create('test@example.com'))).rejects.toThrow(CustomerRepositoryError);
    });
  });

  describe('Placeholder Methods', () => {
    it('should throw "not implemented" errors for placeholder methods', async () => {
      const customer = createTestCustomer();

      // Test all placeholder methods throw appropriate errors
      await expect(repository.update(customer)).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.search({})).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.findAll()).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.findByStatus(CustomerStatus.ACTIVE)).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.findByType(CustomerType.RETAIL)).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.findByPaymentTerms(PaymentTerms.NET_30)).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.findWithOutstandingBalance()).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.findWithOverduePayments()).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.findHighValueCustomers(Money.fromDecimal(1000, 'USD'))).rejects.toThrow(
        CustomerRepositoryError
      );
      await expect(repository.findByLocation({ city: 'Test' })).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.count()).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.countByCriteria({})).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.delete('test-id')).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.getStats()).rejects.toThrow(CustomerRepositoryError);
      await expect(repository.beginTransaction()).rejects.toThrow(CustomerRepositoryError);
    });

    it('should have consistent error messages for placeholder methods', async () => {
      try {
        await repository.update(createTestCustomer());
      } catch (error) {
        expect(error).toBeInstanceOf(CustomerRepositoryError);
        expect((error as CustomerRepositoryError).message).toContain('not yet implemented');
        expect((error as CustomerRepositoryError).operation).toBe('update');
      }
    });
  });

  describe('Error Handling and Logging', () => {
    it('should log errors with proper context information', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Force an error by closing connection
      await connection.close();

      try {
        await repository.findById('test-id');
      } catch (error) {
        // Error should be thrown
        expect(error).toBeInstanceOf(CustomerRepositoryError);
      }

      // Check that error was logged with context
      expect(consoleSpy).toHaveBeenCalledWith(
        'Repository findById error:',
        expect.objectContaining({
          operation: 'findById',
          customerId: 'test-id',
          error: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should preserve original error context in repository errors', async () => {
      await connection.close();

      try {
        await repository.findById('test-id');
      } catch (error) {
        expect(error).toBeInstanceOf(CustomerRepositoryError);
        expect((error as CustomerRepositoryError).operation).toBe('findById');
        expect((error as CustomerRepositoryError).message).toContain('Failed to find customer by ID');
      }
    });
  });

  describe('Architecture Compliance', () => {
    it('should implement ICustomerRepository interface', () => {
      // Verify repository implements all required methods
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.update).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByCustomerCode).toBe('function');
      expect(typeof repository.findByEmail).toBe('function');
      expect(typeof repository.existsByCustomerCode).toBe('function');
      expect(typeof repository.existsByEmail).toBe('function');
      expect(typeof repository.search).toBe('function');
      expect(typeof repository.isHealthy).toBe('function');
    });

    it('should follow dependency injection pattern', () => {
      // Repository should accept connection as dependency
      expect(() => createCustomerRepository(connection)).not.toThrow();
    });

    it('should follow single responsibility principle', () => {
      // Repository should only handle data persistence concerns
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(repository));
      const publicMethods = methods.filter(
        (method) =>
          !method.startsWith('_') && method !== 'constructor' && typeof (repository as any)[method] === 'function'
      );

      // Should have reasonable number of public methods (data access only)
      expect(publicMethods.length).toBeLessThanOrEqual(20);
    });
  });

  // Helper function to create test customer
  function createTestCustomer(): Customer {
    const addresses: CustomerAddress[] = [
      {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country',
        isDefault: true,
        addressType: 'BOTH',
      },
    ];

    const contacts: CustomerContact[] = [
      {
        name: 'John Doe',
        title: 'Manager',
        email: Email.create('john@example.com'),
        phone: '+1-555-0123',
        isPrimary: true,
      },
    ];

    return Customer.create({
      customerCode: 'TEST001',
      firstName: 'John',
      lastName: 'Doe',
      customerType: CustomerType.RETAIL,
      email: Email.create('customer@example.com'),
      addresses,
      contacts,
      creditLimit: Money.fromDecimal(5000, 'USD'),
      paymentTerms: PaymentTerms.NET_30,
      agencyId: 'test-agency-001',
      createdBy: 'test-user-001',
    });
  }
});
