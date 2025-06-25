/**
 * Shipping Repository Tests - Step 3C.2
 *
 * Test suite for SQLite shipping repository implementation.
 * Covers basic infrastructure operations, database connectivity,
 * and repository pattern compliance.
 *
 * @domain Order Management - Shipping Operations
 * @version 1.0.0 - Step 3C: Infrastructure Layer
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DatabaseConnection } from '../../database/connection';
import { SqliteShippingRepository, createShippingRepository } from '../shipping.repository';
import type Database from 'better-sqlite3';

describe('Shipping Repository - Step 3C.2', () => {
  let mockConnection: jest.Mocked<DatabaseConnection>;
  let mockDb: jest.Mocked<Database.Database>;

  beforeEach(() => {
    // Create mock database instance
    mockDb = {
      prepare: jest.fn(),
      transaction: jest.fn(),
      close: jest.fn(),
      exec: jest.fn(),
    } as any;

    // Create mock connection
    mockConnection = {
      getDatabase: jest.fn().mockReturnValue(mockDb),
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
    } as any;
  });

  describe('Constructor', () => {
    it('should create repository with valid connection', () => {
      expect(() => new SqliteShippingRepository(mockConnection)).not.toThrow();
    });

    it('should throw error with null connection', () => {
      expect(() => new SqliteShippingRepository(null as any)).toThrow('Database connection is required');
    });

    it('should throw error with invalid database', () => {
      mockConnection.getDatabase.mockReturnValue(null as any);

      expect(() => new SqliteShippingRepository(mockConnection)).toThrow('Invalid database connection');
    });

    it('should handle database connection error', () => {
      mockConnection.getDatabase.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      expect(() => new SqliteShippingRepository(mockConnection)).toThrow(
        'Database connection validation failed: Database connection failed'
      );
    });
  });

  describe('Factory Function', () => {
    it('should create repository instance', () => {
      const repository = createShippingRepository(mockConnection);
      expect(repository).toBeInstanceOf(SqliteShippingRepository);
    });

    it('should return ShippingRepository interface', () => {
      const repository = createShippingRepository(mockConnection);

      // Check interface methods exist
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByTrackingNumber).toBe('function');
      expect(typeof repository.findByOrderId).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.update).toBe('function');
      expect(typeof repository.delete).toBe('function');
      expect(typeof repository.healthCheck).toBe('function');
    });
  });

  describe('Health Check', () => {
    let repository: SqliteShippingRepository;
    let mockPrepare: jest.Mock;
    let mockGet: jest.Mock;

    beforeEach(() => {
      repository = new SqliteShippingRepository(mockConnection);
      mockGet = jest.fn();
      mockPrepare = jest.fn().mockReturnValue({ get: mockGet });
      (mockDb.prepare as any) = mockPrepare;
    });

    it('should return true when database is healthy', async () => {
      mockGet.mockReturnValue({ health: 1 });

      const result = await repository.healthCheck();

      expect(result).toBe(true);
      expect(mockPrepare).toHaveBeenCalledWith('SELECT 1 as health');
      expect(mockGet).toHaveBeenCalled();
    });

    it('should return false when database query fails', async () => {
      mockPrepare.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await repository.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when health check returns wrong result', async () => {
      mockGet.mockReturnValue({ health: 0 });

      const result = await repository.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when health check returns null', async () => {
      mockGet.mockReturnValue(null);

      const result = await repository.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Database Row Conversion', () => {
    let repository: SqliteShippingRepository;

    beforeEach(() => {
      repository = new SqliteShippingRepository(mockConnection);
    });

    it('should handle rowToEntity conversion', () => {
      // Create a spy on the private method (for testing purposes)
      const rowToEntitySpy = jest.spyOn(repository as any, 'rowToEntity');

      const mockRow = {
        id: 'shipping-123',
        order_id: 'order-123',
        order_number: 'ORD-001',
        customer_id: 'customer-123',
        customer_name: 'Test Customer',
        tracking_number: 'UPS123456789',
        carrier: 'UPS',
        service_type: 'STANDARD',
        priority: 'NORMAL',
        status: 'PENDING',
        shipping_address: JSON.stringify({
          name: 'Test Customer',
          company: 'Test Company',
          street1: '123 Main St',
          street2: 'Suite 100',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
          phone: '555-1234',
          email: 'test@example.com',
          addressType: 'RESIDENTIAL',
          isValidated: true,
        }),
        return_address: JSON.stringify({
          name: 'Return Company',
          company: 'Return Company LLC',
          street1: '456 Return St',
          street2: '',
          city: 'Return City',
          state: 'Return State',
          zipCode: '54321',
          country: 'Return Country',
          phone: '555-5678',
          email: 'returns@company.com',
          addressType: 'COMMERCIAL',
          isValidated: true,
        }),
        package_length: 10,
        package_width: 8,
        package_height: 6,
        package_weight: 2.5,
        volumetric_weight: null,
        declared_value: 10000, // $100.00 in cents
        declared_value_currency: 'USD',
        shipping_cost: 1500, // $15.00 in cents
        shipping_cost_currency: 'USD',
        label_url: null,
        estimated_delivery_date: null,
        actual_delivery_date: null,
        requires_signature: 0,
        is_insured: 0,
        insurance_value: null,
        insurance_value_currency: null,
        special_instructions: null,
        delivery_attempts: '[]',
        tracking_events: '[]',
        audit_trail: '[]',
        agency_id: 'agency-123',
        created_by: 'user-123',
        created_at: Math.floor(Date.now() / 1000),
        updated_by: null,
        updated_at: null,
        picked_up_at: null,
        delivered_at: null,
      };

      // Test that the conversion method exists and doesn't throw
      expect(() => {
        (repository as any).rowToEntity(mockRow);
      }).not.toThrow();
    });

    it('should handle rowToEntity conversion error', () => {
      const invalidRow = {
        id: 'shipping-123',
        // Missing required fields will cause JSON.parse errors
        shipping_address: 'invalid-json',
        return_address: 'invalid-json',
      };

      expect(() => {
        (repository as any).rowToEntity(invalidRow);
      }).toThrow('Failed to convert database row to entity');
    });
  });

  describe('Error Handling', () => {
    it('should create ShippingRepositoryError with message', () => {
      const error = new (require('../shipping.repository').ShippingRepositoryError)('Test error', 'testOperation');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ShippingRepositoryError');
      expect(error.operation).toBe('testOperation');
    });

    it('should create ShippingRepositoryError with cause', () => {
      const cause = new Error('Original error');
      const error = new (require('../shipping.repository').ShippingRepositoryError)(
        'Test error',
        'testOperation',
        cause
      );

      expect(error.cause).toBe(cause);
    });

    it('should create ShippingNotFoundError', () => {
      const error = new (require('../shipping.repository').ShippingNotFoundError)('shipping-123', 'test context');

      expect(error.message).toBe('Shipping not found: shipping-123 (test context)');
      expect(error.name).toBe('ShippingNotFoundError');
    });

    it('should create ShippingNotFoundError without context', () => {
      const error = new (require('../shipping.repository').ShippingNotFoundError)('shipping-123');

      expect(error.message).toBe('Shipping not found: shipping-123');
    });
  });

  describe('Repository Interface Compliance', () => {
    let repository: SqliteShippingRepository;

    beforeEach(() => {
      repository = new SqliteShippingRepository(mockConnection);
    });

    it('should implement all required repository methods', () => {
      const requiredMethods = [
        'findById',
        'findByTrackingNumber',
        'findByOrderId',
        'findByOrderIds',
        'findByCustomerId',
        'search',
        'count',
        'findByStatus',
        'findByStatuses',
        'findByCarrier',
        'findByServiceType',
        'findPendingPickup',
        'findInTransit',
        'findOutForDelivery',
        'findOverdue',
        'findFailedDeliveries',
        'findRequiringAttention',
        'getTrackingSummary',
        'getStatistics',
        'getDailyVolume',
        'getCarrierPerformance',
        'save',
        'update',
        'delete',
        'bulkSave',
        'bulkUpdateStatus',
        'archive',
        'existsByTrackingNumber',
        'findByAgencyAndDateRange',
        'findNeedingStatusUpdate',
        'getStatusCounts',
        'findWithRecentTrackingEvents',
        'healthCheck',
      ];

      requiredMethods.forEach((method) => {
        expect(typeof (repository as any)[method]).toBe('function');
      });
    });

    it('should have proper method signatures', () => {
      // Test that methods exist and are functions
      expect(repository.findById).toBeInstanceOf(Function);
      expect(repository.findByTrackingNumber).toBeInstanceOf(Function);
      expect(repository.save).toBeInstanceOf(Function);
      expect(repository.healthCheck).toBeInstanceOf(Function);

      // Test async methods return promises
      expect(repository.healthCheck()).toBeInstanceOf(Promise);
    });
  });

  describe('Database Connection Management', () => {
    it('should properly store database connection', () => {
      const repository = new SqliteShippingRepository(mockConnection);

      expect(mockConnection.getDatabase).toHaveBeenCalled();
    });

    it('should handle connection establishment', () => {
      expect(() => {
        new SqliteShippingRepository(mockConnection);
      }).not.toThrow();

      expect(mockConnection.getDatabase).toHaveBeenCalledTimes(1);
    });
  });
});
