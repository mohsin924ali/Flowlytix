/**
 * Lot/Batch Repository Tests - Step 4: Transaction Support and Movement Tracking
 *
 * Tests transaction support functionality including:
 * - Transaction creation and management
 * - Transaction state management
 * - Commit and rollback operations
 * - Error handling and edge cases
 *
 * Following established patterns from Agency repository transaction tests
 */

import type {
  ILotBatchRepository,
  ILotBatchRepositoryTransaction,
} from '../../../domain/repositories/lot-batch.repository';
import {
  LotBatchRepositoryError,
  LotBatchNotFoundError,
  InsufficientLotQuantityError,
  LotBatchAlreadyExistsError,
} from '../../../domain/repositories/lot-batch.repository';
import { LotBatch, LotStatus } from '../../../domain/value-objects/lot-batch';
import { SqliteLotBatchRepository } from '../lot-batch.repository';
import type { DatabaseConnection } from '../../database/connection';

// Mock Database Connection
const mockDb = {
  prepare: jest.fn(),
  close: jest.fn(),
  transaction: jest.fn(),
  inTransaction: false,
};

const mockConnection = {
  getDatabase: jest.fn(() => mockDb),
  isDbConnected: jest.fn(() => true),
  healthCheck: jest.fn(() => Promise.resolve(true)),
} as unknown as DatabaseConnection;

describe('LotBatchRepository - Step 4: Transaction Support', () => {
  let repository: ILotBatchRepository;
  let testLotBatch: LotBatch;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create repository
    repository = new SqliteLotBatchRepository(mockConnection);

    // Create test lot/batch entity
    testLotBatch = LotBatch.create({
      lotNumber: 'LOT-001',
      batchNumber: 'BATCH-001',
      productId: 'product-123',
      agencyId: 'agency-123',
      manufacturingDate: new Date('2024-01-01'),
      expiryDate: new Date('2024-12-31'),
      quantity: 100,
      supplierId: 'supplier-123',
      supplierLotCode: 'SUP-001',
      createdBy: 'user-123',
    });
  });

  describe('beginTransaction()', () => {
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
        run: jest.fn(() => {
          throw new Error('Transaction begin failed');
        }),
      };
      mockDb.prepare.mockReturnValue(mockTransactionStmt);

      await expect(repository.beginTransaction()).rejects.toThrow(LotBatchRepositoryError);
      expect(mockDb.prepare).toHaveBeenCalledWith('BEGIN TRANSACTION');
    });

    it('should throw LotBatchRepositoryError with proper error chain on database error', async () => {
      const mockTransactionStmt = {
        run: jest.fn(() => {
          throw new Error('SQLite database locked');
        }),
      };
      mockDb.prepare.mockReturnValue(mockTransactionStmt);

      try {
        await repository.beginTransaction();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LotBatchRepositoryError);
        expect((error as LotBatchRepositoryError).message).toContain('Failed to begin transaction');
        expect((error as LotBatchRepositoryError).operation).toBe('beginTransaction');
        expect((error as LotBatchRepositoryError).cause).toBeDefined();
        expect((error as LotBatchRepositoryError).cause?.message).toBe('SQLite database locked');
      }
    });
  });

  describe('Transaction Interface - Core Behavior', () => {
    let transaction: ILotBatchRepositoryTransaction;

    beforeEach(async () => {
      const mockTransactionStmt = { run: jest.fn() };
      mockDb.prepare.mockReturnValue(mockTransactionStmt);
      transaction = await repository.beginTransaction();
    });

    describe('isActive()', () => {
      it('should return true for new transaction', () => {
        expect(transaction.isActive()).toBe(true);
      });

      it('should return false after commit', async () => {
        const mockCommitStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockCommitStmt);

        await transaction.commit();
        expect(transaction.isActive()).toBe(false);
      });

      it('should return false after rollback', async () => {
        const mockRollbackStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockRollbackStmt);

        await transaction.rollback();
        expect(transaction.isActive()).toBe(false);
      });
    });

    describe('commit()', () => {
      it('should commit transaction successfully', async () => {
        const mockCommitStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockCommitStmt);

        await transaction.commit();

        expect(mockDb.prepare).toHaveBeenCalledWith('COMMIT');
        expect(mockCommitStmt.run).toHaveBeenCalled();
        expect(transaction.isActive()).toBe(false);
      });

      it('should throw error when committing inactive transaction', async () => {
        // Commit first time
        const mockCommitStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockCommitStmt);
        await transaction.commit();

        // Try to commit again
        await expect(transaction.commit()).rejects.toThrow(LotBatchRepositoryError);
      });

      it('should handle commit errors', async () => {
        const mockCommitStmt = {
          run: jest.fn(() => {
            throw new Error('Commit failed');
          }),
        };
        mockDb.prepare.mockReturnValue(mockCommitStmt);

        await expect(transaction.commit()).rejects.toThrow(LotBatchRepositoryError);
      });
    });

    describe('rollback()', () => {
      it('should rollback transaction successfully', async () => {
        const mockRollbackStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockRollbackStmt);

        await transaction.rollback();

        expect(mockDb.prepare).toHaveBeenCalledWith('ROLLBACK');
        expect(mockRollbackStmt.run).toHaveBeenCalled();
        expect(transaction.isActive()).toBe(false);
      });

      it('should handle rollback on inactive transaction gracefully', async () => {
        // Commit to deactivate
        const mockCommitStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockCommitStmt);
        await transaction.commit();

        // Rollback should not throw
        await transaction.rollback();
        expect(transaction.isActive()).toBe(false);
      });

      it('should handle rollback errors', async () => {
        const mockRollbackStmt = {
          run: jest.fn(() => {
            throw new Error('Rollback failed');
          }),
        };
        mockDb.prepare.mockReturnValue(mockRollbackStmt);

        await expect(transaction.rollback()).rejects.toThrow(LotBatchRepositoryError);
      });

      it('should allow multiple rollback calls', async () => {
        const mockRollbackStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockRollbackStmt);

        await transaction.rollback();
        await transaction.rollback(); // Should not throw

        expect(transaction.isActive()).toBe(false);
      });
    });

    describe('Operation State Validation', () => {
      it('should prevent save operation on inactive transaction', async () => {
        // Deactivate transaction
        const mockCommitStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockCommitStmt);
        await transaction.commit();

        // Save operation should fail
        await expect(transaction.save(testLotBatch)).rejects.toThrow(LotBatchRepositoryError);
        expect((await transaction.save(testLotBatch).catch((e) => e)).message).toContain('Transaction is not active');
      });

      it('should prevent update operation on inactive transaction', async () => {
        // Deactivate transaction
        const mockCommitStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockCommitStmt);
        await transaction.commit();

        // Update operation should fail
        await expect(transaction.update(testLotBatch)).rejects.toThrow(LotBatchRepositoryError);
        expect((await transaction.update(testLotBatch).catch((e) => e)).message).toContain('Transaction is not active');
      });

      it('should prevent delete operation on inactive transaction', async () => {
        // Deactivate transaction
        const mockCommitStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockCommitStmt);
        await transaction.commit();

        // Delete operation should fail
        await expect(transaction.delete('lot-123')).rejects.toThrow(LotBatchRepositoryError);
        expect((await transaction.delete('lot-123').catch((e) => e)).message).toContain('Transaction is not active');
      });

      it('should prevent reserveQuantity operation on inactive transaction', async () => {
        // Deactivate transaction
        const mockCommitStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockCommitStmt);
        await transaction.commit();

        // Reserve operation should fail
        await expect(transaction.reserveQuantity('lot-123', 10, 'user-123')).rejects.toThrow(LotBatchRepositoryError);
        expect((await transaction.reserveQuantity('lot-123', 10, 'user-123').catch((e) => e)).message).toContain(
          'Transaction is not active'
        );
      });

      it('should prevent releaseReservedQuantity operation on inactive transaction', async () => {
        // Deactivate transaction
        const mockCommitStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockCommitStmt);
        await transaction.commit();

        // Release operation should fail
        await expect(transaction.releaseReservedQuantity('lot-123', 5, 'user-123')).rejects.toThrow(
          LotBatchRepositoryError
        );
        expect((await transaction.releaseReservedQuantity('lot-123', 5, 'user-123').catch((e) => e)).message).toContain(
          'Transaction is not active'
        );
      });

      it('should prevent consumeQuantity operation on inactive transaction', async () => {
        // Deactivate transaction
        const mockCommitStmt = { run: jest.fn() };
        mockDb.prepare.mockReturnValue(mockCommitStmt);
        await transaction.commit();

        // Consume operation should fail
        await expect(transaction.consumeQuantity('lot-123', 20, 'user-123')).rejects.toThrow(LotBatchRepositoryError);
        expect((await transaction.consumeQuantity('lot-123', 20, 'user-123').catch((e) => e)).message).toContain(
          'Transaction is not active'
        );
      });
    });
  });

  describe('Transaction Error Handling', () => {
    it('should handle database connection errors during transaction begin', async () => {
      const connectionError = new Error('Database connection lost');
      mockDb.prepare.mockImplementation(() => {
        throw connectionError;
      });

      try {
        await repository.beginTransaction();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LotBatchRepositoryError);
        expect((error as LotBatchRepositoryError).message).toContain('Failed to begin transaction');
        expect((error as LotBatchRepositoryError).operation).toBe('beginTransaction');
        expect((error as LotBatchRepositoryError).cause).toBe(connectionError);
      }
    });

    it('should preserve error chains in transaction operations', async () => {
      const mockTransactionStmt = { run: jest.fn() };
      mockDb.prepare.mockReturnValue(mockTransactionStmt);
      const transaction = await repository.beginTransaction();

      const dbError = new Error('Database locked');
      const mockCommitStmt = {
        run: jest.fn(() => {
          throw dbError;
        }),
      };
      mockDb.prepare.mockReturnValue(mockCommitStmt);

      try {
        await transaction.commit();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LotBatchRepositoryError);
        expect((error as LotBatchRepositoryError).operation).toBe('transaction.commit');
        expect((error as LotBatchRepositoryError).cause).toBe(dbError);
      }
    });
  });

  describe('Transaction Interface Completeness', () => {
    let transaction: ILotBatchRepositoryTransaction;

    beforeEach(async () => {
      const mockTransactionStmt = { run: jest.fn() };
      mockDb.prepare.mockReturnValue(mockTransactionStmt);
      transaction = await repository.beginTransaction();
    });

    it('should implement all required transaction methods', () => {
      // Verify all methods exist and are functions
      expect(typeof transaction.save).toBe('function');
      expect(typeof transaction.update).toBe('function');
      expect(typeof transaction.delete).toBe('function');
      expect(typeof transaction.reserveQuantity).toBe('function');
      expect(typeof transaction.releaseReservedQuantity).toBe('function');
      expect(typeof transaction.consumeQuantity).toBe('function');
      expect(typeof transaction.commit).toBe('function');
      expect(typeof transaction.rollback).toBe('function');
      expect(typeof transaction.isActive).toBe('function');
    });

    it('should have correct method signatures', () => {
      // Verify methods accept correct number of parameters
      expect(transaction.save.length).toBe(1); // lotBatch
      expect(transaction.update.length).toBe(1); // lotBatch
      expect(transaction.delete.length).toBe(1); // id
      expect(transaction.reserveQuantity.length).toBe(3); // lotBatchId, quantity, userId
      expect(transaction.releaseReservedQuantity.length).toBe(3); // lotBatchId, quantity, userId
      expect(transaction.consumeQuantity.length).toBe(3); // lotBatchId, quantity, userId
      expect(transaction.commit.length).toBe(0); // no parameters
      expect(transaction.rollback.length).toBe(0); // no parameters
      expect(transaction.isActive.length).toBe(0); // no parameters
    });
  });

  describe('Transaction Lifecycle', () => {
    it('should complete full transaction lifecycle successfully', async () => {
      // Begin transaction
      const mockTransactionStmt = { run: jest.fn() };
      mockDb.prepare.mockReturnValue(mockTransactionStmt);
      const transaction = await repository.beginTransaction();

      expect(transaction.isActive()).toBe(true);

      // Commit transaction
      const mockCommitStmt = { run: jest.fn() };
      mockDb.prepare.mockReturnValue(mockCommitStmt);
      await transaction.commit();

      expect(transaction.isActive()).toBe(false);
      expect(mockDb.prepare).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.prepare).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle transaction rollback lifecycle', async () => {
      // Begin transaction
      const mockTransactionStmt = { run: jest.fn() };
      mockDb.prepare.mockReturnValue(mockTransactionStmt);
      const transaction = await repository.beginTransaction();

      expect(transaction.isActive()).toBe(true);

      // Rollback transaction
      const mockRollbackStmt = { run: jest.fn() };
      mockDb.prepare.mockReturnValue(mockRollbackStmt);
      await transaction.rollback();

      expect(transaction.isActive()).toBe(false);
      expect(mockDb.prepare).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.prepare).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
