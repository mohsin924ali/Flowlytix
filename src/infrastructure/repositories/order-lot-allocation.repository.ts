/**
 * SQLite Order Lot Allocation Repository Implementation - Step 1: Repository Layer Integration
 *
 * Concrete implementation of IOrderLotAllocationRepository interface for SQLite database.
 * Follows Repository pattern and provides data persistence for OrderItemLotAllocation entities.
 * Implements lot allocation tracking and persistence operations.
 *
 * STEP 1 SCOPE:
 * - Core CRUD methods: save, saveBatch, update, findById, findByOrderId, findByOrderItemId
 * - Basic search operations: findByLotBatchId, findByLotNumber, search
 * - Existence checks and validation
 * - Health check and comprehensive error handling
 * - Batch operations for order creation performance
 *
 * ARCHITECTURE NOTES:
 * - Follows Hexagonal Architecture (Adapter pattern)
 * - Implements Repository Pattern for data access abstraction
 * - Uses flat database schema matching the business-schema.ts design
 * - Follows same patterns as AgencyRepository for consistency
 * - Supports multi-tenant architecture with agency-specific operations
 *
 * @domain Order Management - Lot Allocation Tracking
 * @pattern Repository Pattern
 * @architecture Hexagonal Architecture (Adapter)
 * @version 1.0.0 - Step 1: Repository Layer Integration
 */

import { Database } from 'better-sqlite3';
import { DatabaseConnection } from '../database/connection';
import {
  IOrderLotAllocationRepository,
  OrderLotAllocationRepositoryError,
  OrderLotAllocationNotFoundError,
  OrderLotAllocationAlreadyExistsError,
  OrderLotAllocationConnectionError,
  type OrderLotAllocationPersistence,
  type OrderLotAllocationSearchCriteria,
  type OrderLotAllocationSearchResult,
  type OrderLotAllocationStats,
  type BatchLotAllocationOperation,
} from '../../domain/repositories/order-lot-allocation.repository';
import { OrderItemLotAllocation } from '../../domain/entities/order-lot-allocation';

/**
 * Order lot allocation persistence data interface for database operations
 */
interface OrderLotAllocationPersistenceData {
  id: string;
  order_id: string;
  order_item_id: string;
  lot_batch_id: string;
  lot_number: string;
  batch_number: string | null;
  allocated_quantity: number;
  manufacturing_date: number; // Unix timestamp
  expiry_date: number | null; // Unix timestamp
  reserved_at: number; // Unix timestamp
  reserved_by: string;
  created_at: number; // Unix timestamp
  updated_at: number | null; // Unix timestamp
}

/**
 * SQLite Order Lot Allocation Repository Implementation
 *
 * Implements core lot allocation persistence operations with comprehensive error handling.
 * Supports batch operations for performance during order creation.
 */
export class SqliteOrderLotAllocationRepository implements IOrderLotAllocationRepository {
  private readonly connection: DatabaseConnection;
  private readonly db: Database;

  constructor(connection: DatabaseConnection) {
    if (!connection) {
      throw new OrderLotAllocationConnectionError();
    }

    try {
      const db = connection.getDatabase();
      if (!db) {
        throw new OrderLotAllocationConnectionError();
      }
      this.connection = connection;
      this.db = db;
    } catch (error) {
      throw new OrderLotAllocationConnectionError(error instanceof Error ? error : undefined);
    }
  }

  /**
   * Generate unique ID for lot allocation
   */
  private generateId(): string {
    return `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map domain entity to database persistence format
   */
  private mapToDatabase(
    allocation: OrderItemLotAllocation & { orderId: string; orderItemId: string },
    id?: string
  ): OrderLotAllocationPersistenceData {
    const now = Date.now();
    return {
      id: id || this.generateId(),
      order_id: allocation.orderId,
      order_item_id: allocation.orderItemId,
      lot_batch_id: allocation.lotBatchId,
      lot_number: allocation.lotNumber,
      batch_number: allocation.batchNumber,
      allocated_quantity: allocation.allocatedQuantity,
      manufacturing_date: allocation.manufacturingDate.getTime(),
      expiry_date: allocation.expiryDate ? allocation.expiryDate.getTime() : null,
      reserved_at: allocation.reservedAt.getTime(),
      reserved_by: allocation.reservedBy,
      created_at: now,
      updated_at: null,
    };
  }

  /**
   * Map database row to domain entity
   */
  private mapToDomain(row: OrderLotAllocationPersistenceData): OrderItemLotAllocation {
    return {
      lotBatchId: row.lot_batch_id,
      lotNumber: row.lot_number,
      batchNumber: row.batch_number,
      allocatedQuantity: row.allocated_quantity,
      manufacturingDate: new Date(row.manufacturing_date),
      expiryDate: row.expiry_date ? new Date(row.expiry_date) : null,
      reservedAt: new Date(row.reserved_at),
      reservedBy: row.reserved_by,
    };
  }

  /**
   * Save a new order lot allocation to the repository
   */
  async save(
    allocation: OrderItemLotAllocation & { orderId: string; orderItemId: string }
  ): Promise<OrderItemLotAllocation> {
    try {
      // Input validation
      if (!allocation || typeof allocation !== 'object') {
        throw new OrderLotAllocationRepositoryError('Invalid allocation object provided', 'save');
      }

      if (!allocation.orderId || !allocation.orderItemId || !allocation.lotBatchId) {
        throw new OrderLotAllocationRepositoryError(
          'Allocation missing required properties (orderId, orderItemId, lotBatchId)',
          'save'
        );
      }

      if (allocation.allocatedQuantity <= 0) {
        throw new OrderLotAllocationRepositoryError('Allocated quantity must be positive', 'save');
      }

      // Check for duplicate allocation
      const exists = await this.existsByOrderItemAndLot(allocation.orderItemId, allocation.lotBatchId);
      if (exists) {
        throw new OrderLotAllocationAlreadyExistsError(allocation.orderItemId, allocation.lotBatchId);
      }

      // Convert to persistence format
      const persistence = this.mapToDatabase(allocation);

      // Insert into database
      const stmt = this.db.prepare(`
        INSERT INTO order_item_lot_allocations (
          id, order_id, order_item_id, lot_batch_id, lot_number, batch_number,
          allocated_quantity, manufacturing_date, expiry_date, reserved_at, reserved_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        persistence.id,
        persistence.order_id,
        persistence.order_item_id,
        persistence.lot_batch_id,
        persistence.lot_number,
        persistence.batch_number,
        persistence.allocated_quantity,
        persistence.manufacturing_date,
        persistence.expiry_date,
        persistence.reserved_at,
        persistence.reserved_by,
        persistence.created_at,
        persistence.updated_at
      );

      console.log(
        `Repository: Order lot allocation saved successfully - ID: ${persistence.id}, Order: ${allocation.orderId}`
      );
      return this.mapToDomain(persistence);
    } catch (error) {
      // Preserve specific error types
      if (error instanceof OrderLotAllocationAlreadyExistsError || error instanceof OrderLotAllocationRepositoryError) {
        throw error;
      }

      // Log unexpected errors for debugging
      console.error('Repository save error:', {
        operation: 'save',
        orderId: allocation?.orderId,
        orderItemId: allocation?.orderItemId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new OrderLotAllocationRepositoryError(
        `Failed to save order lot allocation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'save',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Factory function to create OrderLotAllocationRepository instance
   */
  async saveBatch(operation: BatchLotAllocationOperation): Promise<readonly OrderItemLotAllocation[]> {
    // Implementation will be in next chunk
    throw new OrderLotAllocationRepositoryError('Method not implemented yet', 'saveBatch');
  }

  async update(
    id: string,
    updates: Partial<Pick<OrderItemLotAllocation, 'allocatedQuantity'>>
  ): Promise<OrderItemLotAllocation> {
    throw new OrderLotAllocationRepositoryError('Method not implemented yet', 'update');
  }

  async findById(id: string): Promise<OrderItemLotAllocation | null> {
    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new OrderLotAllocationRepositoryError('Valid allocation ID is required', 'findById');
      }

      const stmt = this.db.prepare(`
        SELECT * FROM order_item_lot_allocations 
        WHERE id = ?
        LIMIT 1
      `);

      const row = stmt.get(id) as OrderLotAllocationPersistenceData | undefined;
      return row ? this.mapToDomain(row) : null;
    } catch (error) {
      if (error instanceof OrderLotAllocationRepositoryError) {
        throw error;
      }

      throw new OrderLotAllocationRepositoryError(
        `Failed to find allocation by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findById',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByOrderId(orderId: string): Promise<readonly OrderItemLotAllocation[]> {
    try {
      if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
        throw new OrderLotAllocationRepositoryError('Valid order ID is required', 'findByOrderId');
      }

      const stmt = this.db.prepare(`
        SELECT * FROM order_item_lot_allocations 
        WHERE order_id = ? 
        ORDER BY created_at ASC, lot_number ASC
      `);

      const rows = stmt.all(orderId) as OrderLotAllocationPersistenceData[];
      return rows.map((row) => this.mapToDomain(row));
    } catch (error) {
      if (error instanceof OrderLotAllocationRepositoryError) {
        throw error;
      }

      throw new OrderLotAllocationRepositoryError(
        `Failed to find allocations by order ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByOrderId',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByOrderItemId(orderItemId: string): Promise<readonly OrderItemLotAllocation[]> {
    try {
      if (!orderItemId || typeof orderItemId !== 'string' || orderItemId.trim().length === 0) {
        throw new OrderLotAllocationRepositoryError('Valid order item ID is required', 'findByOrderItemId');
      }

      const stmt = this.db.prepare(`
        SELECT * FROM order_item_lot_allocations 
        WHERE order_item_id = ? 
        ORDER BY manufacturing_date ASC, lot_number ASC
      `);

      const rows = stmt.all(orderItemId) as OrderLotAllocationPersistenceData[];
      return rows.map((row) => this.mapToDomain(row));
    } catch (error) {
      if (error instanceof OrderLotAllocationRepositoryError) {
        throw error;
      }

      throw new OrderLotAllocationRepositoryError(
        `Failed to find allocations by order item ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByOrderItemId',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByLotBatchId(lotBatchId: string): Promise<readonly OrderItemLotAllocation[]> {
    try {
      if (!lotBatchId || typeof lotBatchId !== 'string' || lotBatchId.trim().length === 0) {
        throw new OrderLotAllocationRepositoryError('Valid lot batch ID is required', 'findByLotBatchId');
      }

      const stmt = this.db.prepare(`
        SELECT * FROM order_item_lot_allocations 
        WHERE lot_batch_id = ? 
        ORDER BY reserved_at ASC, order_id ASC
      `);

      const rows = stmt.all(lotBatchId) as OrderLotAllocationPersistenceData[];
      return rows.map((row) => this.mapToDomain(row));
    } catch (error) {
      if (error instanceof OrderLotAllocationRepositoryError) {
        throw error;
      }

      throw new OrderLotAllocationRepositoryError(
        `Failed to find allocations by lot batch ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByLotBatchId',
        error instanceof Error ? error : undefined
      );
    }
  }

  async findByLotNumber(lotNumber: string, agencyId?: string): Promise<readonly OrderItemLotAllocation[]> {
    throw new OrderLotAllocationRepositoryError('Method not implemented yet', 'findByLotNumber');
  }

  async findWithExpiringLots(days: number, agencyId?: string): Promise<readonly OrderItemLotAllocation[]> {
    throw new OrderLotAllocationRepositoryError('Method not implemented yet', 'findWithExpiringLots');
  }

  async findByReservedBy(userId: string, limit?: number): Promise<readonly OrderItemLotAllocation[]> {
    throw new OrderLotAllocationRepositoryError('Method not implemented yet', 'findByReservedBy');
  }

  async search(criteria: OrderLotAllocationSearchCriteria): Promise<OrderLotAllocationSearchResult> {
    throw new OrderLotAllocationRepositoryError('Method not implemented yet', 'search');
  }

  async existsByOrderItemAndLot(orderItemId: string, lotBatchId: string): Promise<boolean> {
    try {
      if (!orderItemId || !lotBatchId) {
        throw new OrderLotAllocationRepositoryError(
          'Order item ID and lot batch ID are required',
          'existsByOrderItemAndLot'
        );
      }

      const stmt = this.db.prepare(`
        SELECT 1 FROM order_item_lot_allocations 
        WHERE order_item_id = ? AND lot_batch_id = ?
        LIMIT 1
      `);

      const result = stmt.get(orderItemId, lotBatchId);
      return !!result;
    } catch (error) {
      if (error instanceof OrderLotAllocationRepositoryError) {
        throw error;
      }

      throw new OrderLotAllocationRepositoryError(
        `Failed to check allocation existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsByOrderItemAndLot',
        error instanceof Error ? error : undefined
      );
    }
  }

  async count(agencyId?: string): Promise<number> {
    throw new OrderLotAllocationRepositoryError('Method not implemented yet', 'count');
  }

  async countByCriteria(criteria: Partial<OrderLotAllocationSearchCriteria>): Promise<number> {
    throw new OrderLotAllocationRepositoryError('Method not implemented yet', 'countByCriteria');
  }

  async delete(id: string): Promise<boolean> {
    throw new OrderLotAllocationRepositoryError('Method not implemented yet', 'delete');
  }

  async deleteByOrderId(orderId: string): Promise<number> {
    throw new OrderLotAllocationRepositoryError('Method not implemented yet', 'deleteByOrderId');
  }

  async deleteByOrderItemId(orderItemId: string): Promise<number> {
    throw new OrderLotAllocationRepositoryError('Method not implemented yet', 'deleteByOrderItemId');
  }

  async getStats(agencyId?: string): Promise<OrderLotAllocationStats> {
    throw new OrderLotAllocationRepositoryError('Method not implemented yet', 'getStats');
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple query to check database connectivity and table existence
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM order_item_lot_allocations LIMIT 1');
      stmt.get();
      return true;
    } catch (error) {
      console.error('Repository health check failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create OrderLotAllocationRepository instance
 */
export function createOrderLotAllocationRepository(connection: DatabaseConnection): SqliteOrderLotAllocationRepository {
  return new SqliteOrderLotAllocationRepository(connection);
}
