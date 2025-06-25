/**
 * SQLite Lot/Batch Repository Implementation - Step 2: Core Repository Structure
 *
 * Concrete implementation of ILotBatchRepository interface for SQLite database.
 * Follows Repository pattern and provides data persistence for LotBatch entities.
 * Implements comprehensive lot tracking, FIFO selection, and quantity management.
 *
 * STEP 2 SCOPE:
 * - Basic constructor and database connection validation
 * - Core CRUD methods: save, update, findById, findByLotNumber
 * - Basic existence checks and validation
 * - Quantity management operations: reserve, release, consume
 * - Health check and comprehensive error handling
 *
 * ARCHITECTURE NOTES:
 * - Follows Hexagonal Architecture (Adapter pattern)
 * - Implements Repository Pattern for data access abstraction
 * - Uses flat database schema matching the business-schema.ts design
 * - Follows same patterns as AgencyRepository for consistency
 * - Supports multi-tenant architecture with agency-specific operations
 *
 * @domain Lot/Batch Management
 * @pattern Repository Pattern
 * @architecture Hexagonal Architecture (Adapter)
 * @version 1.0.0 - Step 2: Core Repository Structure
 */

import { Database } from 'better-sqlite3';
import { DatabaseConnection } from '../database/connection';
import {
  ILotBatchRepository,
  ILotBatchRepositoryTransaction,
  LotBatchRepositoryError,
  LotBatchNotFoundError,
  LotBatchAlreadyExistsError,
  LotBatchRepositoryConnectionError,
  InsufficientLotQuantityError,
  type LotBatchSearchCriteria,
  type LotBatchSearchResult,
  type LotBatchRepositoryStats,
  type FifoLotSelectionCriteria,
  type FifoLotSelectionResult,
  type LotQuantityAdjustment,
} from '../../domain/repositories/lot-batch.repository';
import { LotBatch, LotStatus, type LotBatchPersistence } from '../../domain/value-objects/lot-batch';

/**
 * Lot/Batch persistence data interface for database operations
 */
interface LotBatchDatabaseRow {
  id: string;
  lot_number: string;
  batch_number: string | null;
  product_id: string;
  agency_id: string;
  manufacturing_date: number; // Unix timestamp
  expiry_date: number | null; // Unix timestamp
  quantity: number;
  remaining_quantity: number;
  reserved_quantity: number;
  available_quantity: number; // Generated column
  status: string;
  supplier_id: string | null;
  supplier_lot_code: string | null;
  notes: string | null;
  created_by: string;
  created_at: number; // Unix timestamp
  updated_by: string | null;
  updated_at: number | null; // Unix timestamp
}

/**
 * SQLite Lot/Batch Repository Implementation
 *
 * Step 2 Implementation - Core operations:
 * - save, update, findById, findByLotNumber, findByLotAndBatchNumber
 * - existsByLotNumber, existsByLotAndBatchNumber, isHealthy
 * - reserveQuantity, releaseReservedQuantity, consumeQuantity
 * - Database mapping with proper type conversions and validation
 * - Comprehensive error handling following established patterns
 */
export class SqliteLotBatchRepository implements ILotBatchRepository {
  private readonly connection: DatabaseConnection;
  private readonly db: Database;

  constructor(connection: DatabaseConnection) {
    if (!connection) {
      throw new LotBatchRepositoryConnectionError('Database connection is required');
    }

    try {
      const db = connection.getDatabase();
      if (!db) {
        throw new LotBatchRepositoryConnectionError('Invalid database connection');
      }
      this.connection = connection;
      this.db = db;
    } catch (error) {
      throw new LotBatchRepositoryConnectionError(
        `Database connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Map domain status to database status
   */
  private mapStatusToDatabase(domainStatus: LotStatus): string {
    return domainStatus.toString();
  }

  /**
   * Map database status to domain status
   */
  private mapStatusToDomain(databaseStatus: string): LotStatus {
    switch (databaseStatus.toUpperCase()) {
      case 'ACTIVE':
        return LotStatus.ACTIVE;
      case 'QUARANTINE':
        return LotStatus.QUARANTINE;
      case 'EXPIRED':
        return LotStatus.EXPIRED;
      case 'RECALLED':
        return LotStatus.RECALLED;
      case 'DAMAGED':
        return LotStatus.DAMAGED;
      case 'RESERVED':
        return LotStatus.RESERVED;
      case 'CONSUMED':
        return LotStatus.CONSUMED;
      default:
        return LotStatus.ACTIVE; // Default fallback
    }
  }

  /**
   * Map database row to LotBatch entity
   */
  private mapToLotBatch(row: LotBatchDatabaseRow): LotBatch {
    try {
      const persistence: LotBatchPersistence = {
        id: row.id,
        lotNumber: row.lot_number,
        batchNumber: row.batch_number,
        manufacturingDate: new Date(row.manufacturing_date * 1000),
        expiryDate: row.expiry_date ? new Date(row.expiry_date * 1000) : null,
        quantity: row.quantity,
        remainingQuantity: row.remaining_quantity,
        reservedQuantity: row.reserved_quantity,
        availableQuantity: row.available_quantity,
        status: this.mapStatusToDomain(row.status),
        productId: row.product_id,
        agencyId: row.agency_id,
        supplierId: row.supplier_id,
        supplierLotCode: row.supplier_lot_code,
        notes: row.notes,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at * 1000),
        updatedBy: row.updated_by,
        updatedAt: row.updated_at ? new Date(row.updated_at * 1000) : null,
      };

      return LotBatch.fromPersistence(persistence);
    } catch (error) {
      throw new LotBatchRepositoryError(
        `Failed to map database row to LotBatch entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'mapping',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Save a new lot/batch to the database
   */
  async save(lotBatch: LotBatch): Promise<LotBatch> {
    try {
      // Input validation
      if (!lotBatch || typeof lotBatch !== 'object') {
        throw new LotBatchRepositoryError('Invalid lot/batch object provided', 'save');
      }

      if (!lotBatch.id || !lotBatch.lotNumber || !lotBatch.productId || !lotBatch.agencyId) {
        throw new LotBatchRepositoryError(
          'Lot/batch missing required properties (id, lotNumber, productId, agencyId)',
          'save'
        );
      }

      // Check for duplicate lot number within product and agency
      const existingByLot = await this.existsByLotNumber(lotBatch.lotNumber, lotBatch.productId, lotBatch.agencyId);
      if (existingByLot) {
        throw new LotBatchAlreadyExistsError(`${lotBatch.lotNumber} for product ${lotBatch.productId}`, 'lotNumber');
      }

      // If batch number exists, check for duplicate lot+batch combination
      if (lotBatch.batchNumber) {
        const existingByLotAndBatch = await this.existsByLotAndBatchNumber(
          lotBatch.lotNumber,
          lotBatch.batchNumber,
          lotBatch.productId,
          lotBatch.agencyId
        );
        if (existingByLotAndBatch) {
          throw new LotBatchAlreadyExistsError(
            `${lotBatch.lotNumber}/${lotBatch.batchNumber} for product ${lotBatch.productId}`,
            'lotAndBatchNumber'
          );
        }
      }

      // Convert to persistence format
      const persistence = lotBatch.toPersistence();

      // Insert into database
      const stmt = this.db.prepare(`
        INSERT INTO lot_batches (
          id, lot_number, batch_number, product_id, agency_id,
          manufacturing_date, expiry_date, quantity, remaining_quantity, reserved_quantity,
          status, supplier_id, supplier_lot_code, notes,
          created_by, created_at, updated_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        persistence.id,
        persistence.lotNumber,
        persistence.batchNumber,
        persistence.productId,
        persistence.agencyId,
        Math.floor(persistence.manufacturingDate.getTime() / 1000),
        persistence.expiryDate ? Math.floor(persistence.expiryDate.getTime() / 1000) : null,
        persistence.quantity,
        persistence.remainingQuantity,
        persistence.reservedQuantity,
        this.mapStatusToDatabase(persistence.status),
        persistence.supplierId,
        persistence.supplierLotCode,
        persistence.notes,
        persistence.createdBy,
        Math.floor(persistence.createdAt.getTime() / 1000),
        persistence.updatedBy,
        persistence.updatedAt ? Math.floor(persistence.updatedAt.getTime() / 1000) : null
      );

      console.log(`Repository: Lot/Batch saved successfully - ID: ${lotBatch.id}, Lot: ${lotBatch.lotNumber}`);
      return lotBatch;
    } catch (error) {
      // Preserve specific error types
      if (error instanceof LotBatchAlreadyExistsError || error instanceof LotBatchRepositoryError) {
        throw error;
      }

      // Log unexpected errors for debugging
      console.error('Repository save error:', {
        operation: 'save',
        lotBatchId: lotBatch?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to save lot/batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'save',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update an existing lot/batch in the database
   */
  async update(lotBatch: LotBatch): Promise<LotBatch> {
    try {
      // Input validation
      if (!lotBatch || typeof lotBatch !== 'object') {
        throw new LotBatchRepositoryError('Invalid lot/batch object provided', 'update');
      }

      if (!lotBatch.id) {
        throw new LotBatchRepositoryError('Lot/batch ID is required for update', 'update');
      }

      // Check if lot/batch exists
      const existing = await this.findById(lotBatch.id);
      if (!existing) {
        throw new LotBatchNotFoundError(lotBatch.id, 'id');
      }

      // Convert to persistence format
      const persistence = lotBatch.toPersistence();

      // Update in database
      const stmt = this.db.prepare(`
        UPDATE lot_batches SET
          lot_number = ?, batch_number = ?, product_id = ?, agency_id = ?,
          manufacturing_date = ?, expiry_date = ?, quantity = ?, remaining_quantity = ?, reserved_quantity = ?,
          status = ?, supplier_id = ?, supplier_lot_code = ?, notes = ?,
          updated_by = ?, updated_at = ?
        WHERE id = ?
      `);

      const result = stmt.run(
        persistence.lotNumber,
        persistence.batchNumber,
        persistence.productId,
        persistence.agencyId,
        Math.floor(persistence.manufacturingDate.getTime() / 1000),
        persistence.expiryDate ? Math.floor(persistence.expiryDate.getTime() / 1000) : null,
        persistence.quantity,
        persistence.remainingQuantity,
        persistence.reservedQuantity,
        this.mapStatusToDatabase(persistence.status),
        persistence.supplierId,
        persistence.supplierLotCode,
        persistence.notes,
        persistence.updatedBy,
        persistence.updatedAt ? Math.floor(persistence.updatedAt.getTime() / 1000) : null,
        persistence.id
      );

      if (result.changes === 0) {
        throw new LotBatchNotFoundError(lotBatch.id, 'id');
      }

      console.log(`Repository: Lot/Batch updated successfully - ID: ${lotBatch.id}, Lot: ${lotBatch.lotNumber}`);
      return lotBatch;
    } catch (error) {
      // Preserve specific error types
      if (error instanceof LotBatchNotFoundError || error instanceof LotBatchRepositoryError) {
        throw error;
      }

      // Log unexpected errors for debugging
      console.error('Repository update error:', {
        operation: 'update',
        lotBatchId: lotBatch?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to update lot/batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'update',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find lot/batch by unique identifier
   */
  async findById(id: string): Promise<LotBatch | null> {
    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new LotBatchRepositoryError('Valid lot/batch ID is required', 'findById');
      }

      const stmt = this.db.prepare('SELECT * FROM lot_batches WHERE id = ?');
      const row = stmt.get(id) as LotBatchDatabaseRow | undefined;

      if (!row) {
        return null;
      }

      return this.mapToLotBatch(row);
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository findById error:', {
        operation: 'findById',
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to find lot/batch by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findById',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find lot/batch by lot number within product and agency
   */
  async findByLotNumber(lotNumber: string, productId: string, agencyId: string): Promise<LotBatch | null> {
    try {
      if (!lotNumber || !productId || !agencyId) {
        throw new LotBatchRepositoryError('Lot number, product ID, and agency ID are required', 'findByLotNumber');
      }

      const stmt = this.db.prepare(`
        SELECT * FROM lot_batches 
        WHERE lot_number = ? AND product_id = ? AND agency_id = ?
        ORDER BY manufacturing_date ASC
        LIMIT 1
      `);

      const row = stmt.get(lotNumber, productId, agencyId) as LotBatchDatabaseRow | undefined;

      if (!row) {
        return null;
      }

      return this.mapToLotBatch(row);
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository findByLotNumber error:', {
        operation: 'findByLotNumber',
        lotNumber,
        productId,
        agencyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to find lot/batch by lot number: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByLotNumber',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find lot/batch by lot and batch number within product and agency
   */
  async findByLotAndBatchNumber(
    lotNumber: string,
    batchNumber: string,
    productId: string,
    agencyId: string
  ): Promise<LotBatch | null> {
    try {
      if (!lotNumber || !batchNumber || !productId || !agencyId) {
        throw new LotBatchRepositoryError(
          'Lot number, batch number, product ID, and agency ID are required',
          'findByLotAndBatchNumber'
        );
      }

      const stmt = this.db.prepare(`
        SELECT * FROM lot_batches 
        WHERE lot_number = ? AND batch_number = ? AND product_id = ? AND agency_id = ?
        LIMIT 1
      `);

      const row = stmt.get(lotNumber, batchNumber, productId, agencyId) as LotBatchDatabaseRow | undefined;

      if (!row) {
        return null;
      }

      return this.mapToLotBatch(row);
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository findByLotAndBatchNumber error:', {
        operation: 'findByLotAndBatchNumber',
        lotNumber,
        batchNumber,
        productId,
        agencyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to find lot/batch by lot and batch number: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByLotAndBatchNumber',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if lot/batch exists by lot number
   */
  async existsByLotNumber(lotNumber: string, productId: string, agencyId: string): Promise<boolean> {
    try {
      if (!lotNumber || !productId || !agencyId) {
        throw new LotBatchRepositoryError('Lot number, product ID, and agency ID are required', 'existsByLotNumber');
      }

      const stmt = this.db.prepare(`
        SELECT 1 FROM lot_batches 
        WHERE lot_number = ? AND product_id = ? AND agency_id = ?
        LIMIT 1
      `);

      const row = stmt.get(lotNumber, productId, agencyId);
      return row !== undefined;
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository existsByLotNumber error:', {
        operation: 'existsByLotNumber',
        lotNumber,
        productId,
        agencyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to check lot/batch existence by lot number: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsByLotNumber',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if lot/batch exists by lot and batch number
   */
  async existsByLotAndBatchNumber(
    lotNumber: string,
    batchNumber: string,
    productId: string,
    agencyId: string
  ): Promise<boolean> {
    try {
      if (!lotNumber || !batchNumber || !productId || !agencyId) {
        throw new LotBatchRepositoryError(
          'Lot number, batch number, product ID, and agency ID are required',
          'existsByLotAndBatchNumber'
        );
      }

      const stmt = this.db.prepare(`
        SELECT 1 FROM lot_batches 
        WHERE lot_number = ? AND batch_number = ? AND product_id = ? AND agency_id = ?
        LIMIT 1
      `);

      const row = stmt.get(lotNumber, batchNumber, productId, agencyId);
      return row !== undefined;
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository existsByLotAndBatchNumber error:', {
        operation: 'existsByLotAndBatchNumber',
        lotNumber,
        batchNumber,
        productId,
        agencyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to check lot/batch existence by lot and batch number: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsByLotAndBatchNumber',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check repository health and connectivity
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Test database connectivity with a simple query
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM lot_batches LIMIT 1');
      stmt.get();
      return true;
    } catch (error) {
      console.error('Repository health check failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  // Step 3A: Search and Query Operations Implementation

  /**
   * Search lot/batches with filtering and pagination
   */
  async search(criteria: LotBatchSearchCriteria): Promise<LotBatchSearchResult> {
    try {
      const { whereClause, params, orderClause } = this.buildSearchQuery(criteria);
      const limit = criteria.limit || 100;
      const offset = criteria.offset || 0;

      // Validate limits
      if (limit > 10000) {
        throw new LotBatchRepositoryError('Search limit cannot exceed 10000 records', 'search');
      }

      // Build count query
      const countQuery = `SELECT COUNT(*) as total FROM lot_batches ${whereClause}`;
      const countStmt = this.db.prepare(countQuery);
      const countResult = countStmt.get(...params) as { total: number };
      const total = countResult.total;

      // Build main query with pagination
      const mainQuery = `
        SELECT * FROM lot_batches 
        ${whereClause} 
        ${orderClause} 
        LIMIT ? OFFSET ?
      `;
      const mainStmt = this.db.prepare(mainQuery);
      const rows = mainStmt.all(...params, limit, offset) as LotBatchDatabaseRow[];

      // Map results
      const lotBatches = rows.map((row) => this.mapToLotBatch(row));

      return {
        lotBatches,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository search error:', {
        operation: 'search',
        criteria,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to search lot/batches: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'search',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find all lot/batches for a product
   */
  async findByProduct(productId: string, agencyId: string, limit?: number): Promise<readonly LotBatch[]> {
    try {
      if (!productId || !agencyId) {
        throw new LotBatchRepositoryError('Product ID and agency ID are required', 'findByProduct');
      }

      const limitValue = limit || 1000;
      if (limitValue > 10000) {
        throw new LotBatchRepositoryError('Limit cannot exceed 10000 records', 'findByProduct');
      }

      const stmt = this.db.prepare(`
        SELECT * FROM lot_batches 
        WHERE product_id = ? AND agency_id = ?
        ORDER BY manufacturing_date ASC, lot_number ASC
        LIMIT ?
      `);

      const rows = stmt.all(productId, agencyId, limitValue) as LotBatchDatabaseRow[];
      return rows.map((row) => this.mapToLotBatch(row));
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository findByProduct error:', {
        operation: 'findByProduct',
        productId,
        agencyId,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to find lot/batches by product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByProduct',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find all lot/batches for an agency
   */
  async findByAgency(agencyId: string, limit?: number): Promise<readonly LotBatch[]> {
    try {
      if (!agencyId) {
        throw new LotBatchRepositoryError('Agency ID is required', 'findByAgency');
      }

      const limitValue = limit || 1000;
      if (limitValue > 10000) {
        throw new LotBatchRepositoryError('Limit cannot exceed 10000 records', 'findByAgency');
      }

      const stmt = this.db.prepare(`
        SELECT * FROM lot_batches 
        WHERE agency_id = ?
        ORDER BY created_at DESC, lot_number ASC
        LIMIT ?
      `);

      const rows = stmt.all(agencyId, limitValue) as LotBatchDatabaseRow[];
      return rows.map((row) => this.mapToLotBatch(row));
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository findByAgency error:', {
        operation: 'findByAgency',
        agencyId,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to find lot/batches by agency: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByAgency',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find lot/batches by status
   */
  async findByStatus(status: LotStatus, agencyId?: string, limit?: number): Promise<readonly LotBatch[]> {
    try {
      if (!status) {
        throw new LotBatchRepositoryError('Status is required', 'findByStatus');
      }

      const limitValue = limit || 1000;
      if (limitValue > 10000) {
        throw new LotBatchRepositoryError('Limit cannot exceed 10000 records', 'findByStatus');
      }

      let query = 'SELECT * FROM lot_batches WHERE status = ?';
      const params: any[] = [this.mapStatusToDatabase(status)];

      if (agencyId) {
        query += ' AND agency_id = ?';
        params.push(agencyId);
      }

      query += ' ORDER BY manufacturing_date ASC, lot_number ASC LIMIT ?';
      params.push(limitValue);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as LotBatchDatabaseRow[];
      return rows.map((row) => this.mapToLotBatch(row));
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository findByStatus error:', {
        operation: 'findByStatus',
        status,
        agencyId,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to find lot/batches by status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByStatus',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find active lot/batches (available for sale)
   */
  async findActive(agencyId?: string, limit?: number): Promise<readonly LotBatch[]> {
    try {
      const limitValue = limit || 1000;
      if (limitValue > 10000) {
        throw new LotBatchRepositoryError('Limit cannot exceed 10000 records', 'findActive');
      }

      let query = `
        SELECT * FROM lot_batches 
        WHERE status = ? AND available_quantity > 0
      `;
      const params: any[] = [this.mapStatusToDatabase(LotStatus.ACTIVE)];

      if (agencyId) {
        query += ' AND agency_id = ?';
        params.push(agencyId);
      }

      query += ' ORDER BY expiry_date ASC, manufacturing_date ASC, lot_number ASC LIMIT ?';
      params.push(limitValue);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as LotBatchDatabaseRow[];
      return rows.map((row) => this.mapToLotBatch(row));
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository findActive error:', {
        operation: 'findActive',
        agencyId,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to find active lot/batches: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findActive',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find expired lot/batches
   */
  async findExpired(agencyId?: string, limit?: number): Promise<readonly LotBatch[]> {
    try {
      const limitValue = limit || 1000;
      if (limitValue > 10000) {
        throw new LotBatchRepositoryError('Limit cannot exceed 10000 records', 'findExpired');
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);

      let query = `
        SELECT * FROM lot_batches 
        WHERE (status = ? OR (expiry_date IS NOT NULL AND expiry_date < ?))
      `;
      const params: any[] = [this.mapStatusToDatabase(LotStatus.EXPIRED), currentTimestamp];

      if (agencyId) {
        query += ' AND agency_id = ?';
        params.push(agencyId);
      }

      query += ' ORDER BY expiry_date ASC, lot_number ASC LIMIT ?';
      params.push(limitValue);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as LotBatchDatabaseRow[];
      return rows.map((row) => this.mapToLotBatch(row));
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository findExpired error:', {
        operation: 'findExpired',
        agencyId,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to find expired lot/batches: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findExpired',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find lot/batches expiring within specified days
   */
  async findExpiringWithinDays(days: number, agencyId?: string, limit?: number): Promise<readonly LotBatch[]> {
    try {
      if (days < 0) {
        throw new LotBatchRepositoryError('Days must be a non-negative number', 'findExpiringWithinDays');
      }

      const limitValue = limit || 1000;
      if (limitValue > 10000) {
        throw new LotBatchRepositoryError('Limit cannot exceed 10000 records', 'findExpiringWithinDays');
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const futureTimestamp = currentTimestamp + days * 24 * 60 * 60;

      let query = `
        SELECT * FROM lot_batches 
        WHERE expiry_date IS NOT NULL 
        AND expiry_date BETWEEN ? AND ?
        AND status IN (?, ?)
      `;
      const params: any[] = [
        currentTimestamp,
        futureTimestamp,
        this.mapStatusToDatabase(LotStatus.ACTIVE),
        this.mapStatusToDatabase(LotStatus.QUARANTINE),
      ];

      if (agencyId) {
        query += ' AND agency_id = ?';
        params.push(agencyId);
      }

      query += ' ORDER BY expiry_date ASC, lot_number ASC LIMIT ?';
      params.push(limitValue);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as LotBatchDatabaseRow[];
      return rows.map((row) => this.mapToLotBatch(row));
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository findExpiringWithinDays error:', {
        operation: 'findExpiringWithinDays',
        days,
        agencyId,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to find lot/batches expiring within days: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findExpiringWithinDays',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Count total number of lot/batches
   */
  async count(agencyId?: string): Promise<number> {
    try {
      let query = 'SELECT COUNT(*) as count FROM lot_batches';
      const params: any[] = [];

      if (agencyId) {
        query += ' WHERE agency_id = ?';
        params.push(agencyId);
      }

      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as { count: number };
      return result.count;
    } catch (error) {
      console.error('Repository count error:', {
        operation: 'count',
        agencyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to count lot/batches: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'count',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Count lot/batches by specific criteria
   */
  async countByCriteria(criteria: Partial<LotBatchSearchCriteria>): Promise<number> {
    try {
      const { whereClause, params } = this.buildSearchQuery(criteria);
      const query = `SELECT COUNT(*) as count FROM lot_batches ${whereClause}`;

      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as { count: number };
      return result.count;
    } catch (error) {
      console.error('Repository countByCriteria error:', {
        operation: 'countByCriteria',
        criteria,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to count lot/batches by criteria: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'countByCriteria',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Build search query from criteria
   */
  private buildSearchQuery(criteria: Partial<LotBatchSearchCriteria>): {
    whereClause: string;
    params: any[];
    orderClause: string;
  } {
    const conditions: string[] = [];
    const params: any[] = [];

    // Text search
    if (criteria.searchTerm) {
      conditions.push(`(
        lot_number LIKE ? OR 
        batch_number LIKE ? OR 
        supplier_lot_code LIKE ? OR
        notes LIKE ?
      )`);
      const searchPattern = `%${criteria.searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Exact matches
    if (criteria.lotNumber) {
      conditions.push('lot_number = ?');
      params.push(criteria.lotNumber);
    }

    if (criteria.batchNumber) {
      conditions.push('batch_number = ?');
      params.push(criteria.batchNumber);
    }

    if (criteria.supplierLotCode) {
      conditions.push('supplier_lot_code = ?');
      params.push(criteria.supplierLotCode);
    }

    // Association filtering
    if (criteria.productId) {
      if (Array.isArray(criteria.productId)) {
        const placeholders = criteria.productId.map(() => '?').join(',');
        conditions.push(`product_id IN (${placeholders})`);
        params.push(...criteria.productId);
      } else {
        conditions.push('product_id = ?');
        params.push(criteria.productId);
      }
    }

    if (criteria.agencyId) {
      if (Array.isArray(criteria.agencyId)) {
        const placeholders = criteria.agencyId.map(() => '?').join(',');
        conditions.push(`agency_id IN (${placeholders})`);
        params.push(...criteria.agencyId);
      } else {
        conditions.push('agency_id = ?');
        params.push(criteria.agencyId);
      }
    }

    if (criteria.supplierId) {
      if (Array.isArray(criteria.supplierId)) {
        const placeholders = criteria.supplierId.map(() => '?').join(',');
        conditions.push(`supplier_id IN (${placeholders})`);
        params.push(...criteria.supplierId);
      } else {
        conditions.push('supplier_id = ?');
        params.push(criteria.supplierId);
      }
    }

    if (criteria.createdBy) {
      if (Array.isArray(criteria.createdBy)) {
        const placeholders = criteria.createdBy.map(() => '?').join(',');
        conditions.push(`created_by IN (${placeholders})`);
        params.push(...criteria.createdBy);
      } else {
        conditions.push('created_by = ?');
        params.push(criteria.createdBy);
      }
    }

    // Status filtering
    if (criteria.status) {
      if (Array.isArray(criteria.status)) {
        const placeholders = criteria.status.map(() => '?').join(',');
        conditions.push(`status IN (${placeholders})`);
        params.push(...criteria.status.map((s) => this.mapStatusToDatabase(s)));
      } else {
        conditions.push('status = ?');
        params.push(this.mapStatusToDatabase(criteria.status));
      }
    }

    if (criteria.isActive) {
      conditions.push('status = ? AND available_quantity > 0');
      params.push(this.mapStatusToDatabase(LotStatus.ACTIVE));
    }

    if (criteria.isExpired) {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      conditions.push('(status = ? OR (expiry_date IS NOT NULL AND expiry_date < ?))');
      params.push(this.mapStatusToDatabase(LotStatus.EXPIRED), currentTimestamp);
    }

    if (criteria.isAvailable) {
      conditions.push('status = ? AND available_quantity > 0');
      params.push(this.mapStatusToDatabase(LotStatus.ACTIVE));
    }

    // Quantity filtering
    if (criteria.hasQuantity) {
      conditions.push('remaining_quantity > 0');
    }

    if (criteria.minQuantity !== undefined) {
      conditions.push('remaining_quantity >= ?');
      params.push(criteria.minQuantity);
    }

    if (criteria.maxQuantity !== undefined) {
      conditions.push('remaining_quantity <= ?');
      params.push(criteria.maxQuantity);
    }

    if (criteria.hasReservedQuantity) {
      conditions.push('reserved_quantity > 0');
    }

    // Date range filtering
    if (criteria.manufacturingDateAfter) {
      conditions.push('manufacturing_date >= ?');
      params.push(Math.floor(criteria.manufacturingDateAfter.getTime() / 1000));
    }

    if (criteria.manufacturingDateBefore) {
      conditions.push('manufacturing_date <= ?');
      params.push(Math.floor(criteria.manufacturingDateBefore.getTime() / 1000));
    }

    if (criteria.expiryDateAfter) {
      conditions.push('expiry_date >= ?');
      params.push(Math.floor(criteria.expiryDateAfter.getTime() / 1000));
    }

    if (criteria.expiryDateBefore) {
      conditions.push('expiry_date <= ?');
      params.push(Math.floor(criteria.expiryDateBefore.getTime() / 1000));
    }

    if (criteria.createdAfter) {
      conditions.push('created_at >= ?');
      params.push(Math.floor(criteria.createdAfter.getTime() / 1000));
    }

    if (criteria.createdBefore) {
      conditions.push('created_at <= ?');
      params.push(Math.floor(criteria.createdBefore.getTime() / 1000));
    }

    if (criteria.updatedAfter) {
      conditions.push('updated_at >= ?');
      params.push(Math.floor(criteria.updatedAfter.getTime() / 1000));
    }

    if (criteria.updatedBefore) {
      conditions.push('updated_at <= ?');
      params.push(Math.floor(criteria.updatedBefore.getTime() / 1000));
    }

    // Expiry filtering
    if (criteria.expiringWithinDays !== undefined) {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const futureTimestamp = currentTimestamp + criteria.expiringWithinDays * 24 * 60 * 60;
      conditions.push('expiry_date IS NOT NULL AND expiry_date BETWEEN ? AND ?');
      params.push(currentTimestamp, futureTimestamp);
    }

    if (criteria.nearExpiryDays !== undefined) {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const nearExpiryTimestamp = currentTimestamp + criteria.nearExpiryDays * 24 * 60 * 60;
      conditions.push('expiry_date IS NOT NULL AND expiry_date <= ?');
      params.push(nearExpiryTimestamp);
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER clause
    let orderClause = 'ORDER BY ';
    if (criteria.fifoOrder) {
      orderClause += 'manufacturing_date ASC, lot_number ASC';
    } else if (criteria.sortBy) {
      const sortField = this.mapSortFieldToDatabase(criteria.sortBy);
      const sortOrder = criteria.sortOrder || 'ASC';
      orderClause += `${sortField} ${sortOrder}`;
    } else {
      orderClause += 'created_at DESC, lot_number ASC';
    }

    return { whereClause, params, orderClause };
  }

  /**
   * Map sort field to database column
   */
  private mapSortFieldToDatabase(sortBy: string): string {
    switch (sortBy) {
      case 'lotNumber':
        return 'lot_number';
      case 'batchNumber':
        return 'batch_number';
      case 'manufacturingDate':
        return 'manufacturing_date';
      case 'expiryDate':
        return 'expiry_date';
      case 'status':
        return 'status';
      case 'remainingQuantity':
        return 'remaining_quantity';
      case 'createdAt':
        return 'created_at';
      case 'updatedAt':
        return 'updated_at';
      default:
        return 'created_at';
    }
  }

  /**
   * Find lot/batches in FIFO order (First In, First Out)
   */
  async findFifoOrder(productId: string, agencyId: string, limit?: number): Promise<readonly LotBatch[]> {
    try {
      if (!productId || !agencyId) {
        throw new LotBatchRepositoryError('Product ID and agency ID are required', 'findFifoOrder');
      }

      const limitValue = limit || 1000;
      if (limitValue > 10000) {
        throw new LotBatchRepositoryError('Limit cannot exceed 10000 records', 'findFifoOrder');
      }

      const stmt = this.db.prepare(`
        SELECT * FROM lot_batches 
        WHERE product_id = ? AND agency_id = ? 
        AND status = ? AND available_quantity > 0
        ORDER BY manufacturing_date ASC, lot_number ASC
        LIMIT ?
      `);

      const rows = stmt.all(
        productId,
        agencyId,
        this.mapStatusToDatabase(LotStatus.ACTIVE),
        limitValue
      ) as LotBatchDatabaseRow[];

      return rows.map((row) => this.mapToLotBatch(row));
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository findFifoOrder error:', {
        operation: 'findFifoOrder',
        productId,
        agencyId,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to find lot/batches in FIFO order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findFifoOrder',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Select lots in FIFO order for a specific quantity requirement
   */
  async selectFifoLots(criteria: FifoLotSelectionCriteria): Promise<FifoLotSelectionResult> {
    try {
      if (!criteria.productId || !criteria.agencyId) {
        throw new LotBatchRepositoryError('Product ID and agency ID are required', 'selectFifoLots');
      }

      if (!criteria.requestedQuantity || criteria.requestedQuantity <= 0) {
        throw new LotBatchRepositoryError('Requested quantity must be greater than 0', 'selectFifoLots');
      }

      // Find available lots in FIFO order - include lots with 0 available quantity for comprehensive selection
      const stmt = this.db.prepare(`
        SELECT * FROM lot_batches 
        WHERE product_id = ? AND agency_id = ? 
        AND status = ? AND available_quantity >= 0
        ORDER BY manufacturing_date ASC, lot_number ASC
      `);

      const rows = stmt.all(
        criteria.productId,
        criteria.agencyId,
        this.mapStatusToDatabase(LotStatus.ACTIVE)
      ) as LotBatchDatabaseRow[];

      const selectedLots: { lotBatch: LotBatch; allocatedQuantity: number }[] = [];
      let remainingQuantity = criteria.requestedQuantity;

      // Select lots in FIFO order
      for (const row of rows) {
        if (remainingQuantity <= 0) break;

        // Skip lots with no available quantity
        if (row.available_quantity <= 0) continue;

        const lotBatch = this.mapToLotBatch(row);
        const availableInThisLot = lotBatch.availableQuantity;
        const allocatedQuantity = Math.min(remainingQuantity, availableInThisLot);

        selectedLots.push({
          lotBatch,
          allocatedQuantity,
        });

        remainingQuantity -= allocatedQuantity;
      }

      const hasFullAllocation = remainingQuantity <= 0;
      const totalAllocatedQuantity = criteria.requestedQuantity - remainingQuantity;

      return {
        selectedLots,
        hasFullAllocation,
        totalAllocatedQuantity,
        remainingQuantity: remainingQuantity > 0 ? remainingQuantity : 0,
      };
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository selectFifoLots error:', {
        operation: 'selectFifoLots',
        criteria,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to select FIFO lots: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'selectFifoLots',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Reserve quantity from a specific lot/batch
   */
  async reserveQuantity(lotBatchId: string, quantity: number, userId: string): Promise<LotBatch> {
    try {
      if (!lotBatchId || !userId) {
        throw new LotBatchRepositoryError('Lot/batch ID and user ID are required', 'reserveQuantity');
      }

      if (quantity <= 0) {
        throw new LotBatchRepositoryError('Quantity must be greater than 0', 'reserveQuantity');
      }

      // Get current lot/batch
      const currentLot = await this.findById(lotBatchId);
      if (!currentLot) {
        throw new LotBatchNotFoundError(lotBatchId, 'reserveQuantity');
      }

      // Check if enough quantity is available
      if (currentLot.availableQuantity < quantity) {
        throw new InsufficientLotQuantityError(lotBatchId, quantity, currentLot.availableQuantity);
      }

      // Check if lot is active
      if (currentLot.status !== LotStatus.ACTIVE) {
        throw new LotBatchRepositoryError(
          `Cannot reserve quantity from lot with status: ${currentLot.status}`,
          'reserveQuantity'
        );
      }

      // Update reserved quantity
      const newReservedQuantity = currentLot.reservedQuantity + quantity;
      const timestamp = Math.floor(Date.now() / 1000);

      const stmt = this.db.prepare(`
        UPDATE lot_batches 
        SET reserved_quantity = ?, updated_by = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(newReservedQuantity, userId, timestamp, lotBatchId);

      // Return updated lot/batch
      const updatedLot = await this.findById(lotBatchId);
      if (!updatedLot) {
        throw new LotBatchRepositoryError('Failed to retrieve updated lot/batch after reservation', 'reserveQuantity');
      }

      return updatedLot;
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository reserveQuantity error:', {
        operation: 'reserveQuantity',
        lotBatchId,
        quantity,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to reserve quantity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'reserveQuantity',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Release reserved quantity from a specific lot/batch
   */
  async releaseReservedQuantity(lotBatchId: string, quantity: number, userId: string): Promise<LotBatch> {
    try {
      if (!lotBatchId || !userId) {
        throw new LotBatchRepositoryError('Lot/batch ID and user ID are required', 'releaseReservedQuantity');
      }

      if (quantity <= 0) {
        throw new LotBatchRepositoryError('Quantity must be greater than 0', 'releaseReservedQuantity');
      }

      // Get current lot/batch
      const currentLot = await this.findById(lotBatchId);
      if (!currentLot) {
        throw new LotBatchNotFoundError(lotBatchId, 'releaseReservedQuantity');
      }

      // Check if enough reserved quantity exists
      if (currentLot.reservedQuantity < quantity) {
        throw new LotBatchRepositoryError(
          `Cannot release ${quantity} units. Only ${currentLot.reservedQuantity} units are reserved`,
          'releaseReservedQuantity'
        );
      }

      // Update reserved quantity
      const newReservedQuantity = currentLot.reservedQuantity - quantity;
      const timestamp = Math.floor(Date.now() / 1000);

      const stmt = this.db.prepare(`
        UPDATE lot_batches 
        SET reserved_quantity = ?, updated_by = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(newReservedQuantity, userId, timestamp, lotBatchId);

      // Return updated lot/batch
      const updatedLot = await this.findById(lotBatchId);
      if (!updatedLot) {
        throw new LotBatchRepositoryError(
          'Failed to retrieve updated lot/batch after release',
          'releaseReservedQuantity'
        );
      }

      return updatedLot;
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository releaseReservedQuantity error:', {
        operation: 'releaseReservedQuantity',
        lotBatchId,
        quantity,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to release reserved quantity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'releaseReservedQuantity',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Consume quantity from a specific lot/batch (reduce remaining quantity)
   */
  async consumeQuantity(lotBatchId: string, quantity: number, userId: string): Promise<LotBatch> {
    try {
      if (!lotBatchId || !userId) {
        throw new LotBatchRepositoryError('Lot/batch ID and user ID are required', 'consumeQuantity');
      }

      if (quantity <= 0) {
        throw new LotBatchRepositoryError('Quantity must be greater than 0', 'consumeQuantity');
      }

      // Get current lot/batch
      const currentLot = await this.findById(lotBatchId);
      if (!currentLot) {
        throw new LotBatchNotFoundError(lotBatchId, 'consumeQuantity');
      }

      // Check if enough quantity is available (including reserved quantity)
      if (currentLot.remainingQuantity < quantity) {
        throw new InsufficientLotQuantityError(lotBatchId, quantity, currentLot.remainingQuantity);
      }

      // Check if lot is active
      if (currentLot.status !== LotStatus.ACTIVE) {
        throw new LotBatchRepositoryError(
          `Cannot consume quantity from lot with status: ${currentLot.status}`,
          'consumeQuantity'
        );
      }

      // Calculate new quantities
      const newRemainingQuantity = currentLot.remainingQuantity - quantity;

      // If consuming from reserved quantity, reduce reserved quantity as well
      const quantityFromReserved = Math.min(quantity, currentLot.reservedQuantity);
      const newReservedQuantity = currentLot.reservedQuantity - quantityFromReserved;

      const timestamp = Math.floor(Date.now() / 1000);

      const stmt = this.db.prepare(`
        UPDATE lot_batches 
        SET remaining_quantity = ?, reserved_quantity = ?, updated_by = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(newRemainingQuantity, newReservedQuantity, userId, timestamp, lotBatchId);

      // Return updated lot/batch
      const updatedLot = await this.findById(lotBatchId);
      if (!updatedLot) {
        throw new LotBatchRepositoryError('Failed to retrieve updated lot/batch after consumption', 'consumeQuantity');
      }

      return updatedLot;
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository consumeQuantity error:', {
        operation: 'consumeQuantity',
        lotBatchId,
        quantity,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to consume quantity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'consumeQuantity',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Adjust lot/batch quantities (can increase or decrease)
   */
  async adjustQuantity(adjustment: LotQuantityAdjustment): Promise<LotBatch> {
    try {
      if (!adjustment.lotBatchId || !adjustment.adjustedBy) {
        throw new LotBatchRepositoryError('Lot/batch ID and adjustedBy user ID are required', 'adjustQuantity');
      }

      if (adjustment.quantityChange === 0) {
        throw new LotBatchRepositoryError('Quantity change cannot be zero', 'adjustQuantity');
      }

      // Get current lot/batch
      const currentLot = await this.findById(adjustment.lotBatchId);
      if (!currentLot) {
        throw new LotBatchNotFoundError(adjustment.lotBatchId, 'adjustQuantity');
      }

      // Calculate new quantities
      const newQuantity = currentLot.quantity + adjustment.quantityChange;
      const newRemainingQuantity = currentLot.remainingQuantity + adjustment.quantityChange;

      // Validate new quantities
      if (newQuantity < 0) {
        throw new LotBatchRepositoryError('Adjusted quantity cannot be negative', 'adjustQuantity');
      }

      if (newRemainingQuantity < currentLot.reservedQuantity) {
        throw new LotBatchRepositoryError(
          'Adjusted remaining quantity cannot be less than reserved quantity',
          'adjustQuantity'
        );
      }

      const timestamp = Math.floor(Date.now() / 1000);

      const stmt = this.db.prepare(`
        UPDATE lot_batches 
        SET quantity = ?, remaining_quantity = ?, updated_by = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(newQuantity, newRemainingQuantity, adjustment.adjustedBy, timestamp, adjustment.lotBatchId);

      // Return updated lot/batch
      const updatedLot = await this.findById(adjustment.lotBatchId);
      if (!updatedLot) {
        throw new LotBatchRepositoryError('Failed to retrieve updated lot/batch after adjustment', 'adjustQuantity');
      }

      return updatedLot;
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository adjustQuantity error:', {
        operation: 'adjustQuantity',
        adjustment,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to adjust quantity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'adjustQuantity',
        error instanceof Error ? error : undefined
      );
    }
  }

  // Step 3C: Advanced Operations Implementation

  /**
   * Update lot/batch status with business rules validation
   */
  async updateStatus(lotBatchId: string, status: LotStatus, userId: string, reason?: string): Promise<LotBatch> {
    try {
      if (!lotBatchId || !userId) {
        throw new LotBatchRepositoryError('Lot/batch ID and user ID are required', 'updateStatus');
      }

      if (!status) {
        throw new LotBatchRepositoryError('Status is required', 'updateStatus');
      }

      // Get current lot/batch
      const currentLot = await this.findById(lotBatchId);
      if (!currentLot) {
        throw new LotBatchNotFoundError(lotBatchId, 'updateStatus');
      }

      // Validate status transition
      this.validateStatusTransition(currentLot.status, status);

      // Check business rules for status changes
      if (status === LotStatus.CONSUMED && currentLot.remainingQuantity > 0) {
        throw new LotBatchRepositoryError(
          `Cannot mark lot as CONSUMED while remaining quantity is ${currentLot.remainingQuantity}`,
          'updateStatus'
        );
      }

      if (status === LotStatus.ACTIVE && currentLot.isExpired()) {
        throw new LotBatchRepositoryError('Cannot mark expired lot as ACTIVE', 'updateStatus');
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const statusValue = this.mapStatusToDatabase(status);

      const stmt = this.db.prepare(`
        UPDATE lot_batches 
        SET status = ?, updated_by = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(statusValue, userId, timestamp, lotBatchId);

      // Return updated lot/batch
      const updatedLot = await this.findById(lotBatchId);
      if (!updatedLot) {
        throw new LotBatchRepositoryError('Failed to retrieve updated lot/batch after status update', 'updateStatus');
      }

      return updatedLot;
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository updateStatus error:', {
        operation: 'updateStatus',
        lotBatchId,
        status,
        userId,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to update lot/batch status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'updateStatus',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Hard delete lot/batch (WARNING: Destructive operation)
   */
  async delete(id: string): Promise<boolean> {
    try {
      if (!id) {
        throw new LotBatchRepositoryError('Lot/batch ID is required', 'delete');
      }

      // Check if lot/batch exists
      const existingLot = await this.findById(id);
      if (!existingLot) {
        throw new LotBatchNotFoundError(id, 'delete');
      }

      // Business rule: Don't allow deletion of lots with reserved quantity
      if (existingLot.reservedQuantity > 0) {
        throw new LotBatchRepositoryError(
          `Cannot delete lot/batch with reserved quantity: ${existingLot.reservedQuantity}`,
          'delete'
        );
      }

      // Business rule: Don't allow deletion of active lots with remaining quantity
      if (existingLot.status === LotStatus.ACTIVE && existingLot.remainingQuantity > 0) {
        throw new LotBatchRepositoryError(
          `Cannot delete active lot/batch with remaining quantity: ${existingLot.remainingQuantity}`,
          'delete'
        );
      }

      const stmt = this.db.prepare('DELETE FROM lot_batches WHERE id = ?');
      const result = stmt.run(id);

      return result.changes > 0;
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository delete error:', {
        operation: 'delete',
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to delete lot/batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get repository statistics for monitoring
   */
  async getStats(agencyId?: string): Promise<LotBatchRepositoryStats> {
    try {
      let whereClause = '';
      let params: any[] = [];

      if (agencyId) {
        whereClause = 'WHERE agency_id = ?';
        params = [agencyId];
      }

      // Get basic counts
      const countStmt = this.db.prepare(`
        SELECT 
          COUNT(*) as totalLots,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as activeLots,
          COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END) as expiredLots,
          COUNT(CASE WHEN status = 'QUARANTINE' THEN 1 END) as quarantineLots,
          COUNT(CASE WHEN status = 'CONSUMED' THEN 1 END) as consumedLots,
          SUM(quantity) as totalQuantity,
          SUM(available_quantity) as availableQuantity,
          SUM(reserved_quantity) as reservedQuantity,
          MIN(manufacturing_date) as oldestLotTimestamp,
          MAX(manufacturing_date) as newestLotTimestamp
        FROM lot_batches ${whereClause}
      `);

      const basicStats = countStmt.get(...params) as {
        totalLots: number;
        activeLots: number;
        expiredLots: number;
        quarantineLots: number;
        consumedLots: number;
        totalQuantity: number;
        availableQuantity: number;
        reservedQuantity: number;
        oldestLotTimestamp: number | null;
        newestLotTimestamp: number | null;
      };

      // Get near expiry count (30 days)
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const nearExpiryTimestamp = currentTimestamp + 30 * 24 * 60 * 60;

      let nearExpiryQuery = `
        SELECT COUNT(*) as nearExpiryLots 
        FROM lot_batches 
        WHERE expiry_date IS NOT NULL 
        AND expiry_date BETWEEN ? AND ? 
        AND status IN ('ACTIVE', 'QUARANTINE')
      `;
      const nearExpiryParams: any[] = [currentTimestamp, nearExpiryTimestamp];

      if (agencyId) {
        nearExpiryQuery += ' AND agency_id = ?';
        nearExpiryParams.push(agencyId);
      }

      const nearExpiryStmt = this.db.prepare(nearExpiryQuery);
      const nearExpiryResult = nearExpiryStmt.get(...nearExpiryParams) as { nearExpiryLots: number };

      // Calculate average lots per product
      let avgLotsQuery = `
        SELECT COUNT(DISTINCT product_id) as productCount 
        FROM lot_batches ${whereClause}
      `;
      const avgLotsStmt = this.db.prepare(avgLotsQuery);
      const avgLotsResult = avgLotsStmt.get(...params) as { productCount: number };

      const averageLotsPerProduct =
        avgLotsResult.productCount > 0 ? basicStats.totalLots / avgLotsResult.productCount : 0;

      return {
        totalLots: basicStats.totalLots || 0,
        activeLots: basicStats.activeLots || 0,
        expiredLots: basicStats.expiredLots || 0,
        quarantineLots: basicStats.quarantineLots || 0,
        consumedLots: basicStats.consumedLots || 0,
        totalQuantity: basicStats.totalQuantity || 0,
        availableQuantity: basicStats.availableQuantity || 0,
        reservedQuantity: basicStats.reservedQuantity || 0,
        nearExpiryLots: nearExpiryResult.nearExpiryLots || 0,
        averageLotsPerProduct,
        oldestLot: basicStats.oldestLotTimestamp ? new Date(basicStats.oldestLotTimestamp * 1000) : null,
        newestLot: basicStats.newestLotTimestamp ? new Date(basicStats.newestLotTimestamp * 1000) : null,
      };
    } catch (error) {
      console.error('Repository getStats error:', {
        operation: 'getStats',
        agencyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to get repository statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getStats',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Expire lot/batches that have passed their expiry date
   */
  async expireOverdueLots(agencyId?: string, userId?: string): Promise<number> {
    try {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const expiredStatus = this.mapStatusToDatabase(LotStatus.EXPIRED);
      const activeStatus = this.mapStatusToDatabase(LotStatus.ACTIVE);
      const quarantineStatus = this.mapStatusToDatabase(LotStatus.QUARANTINE);
      const updateUserId = userId || 'SYSTEM';

      let query = `
        UPDATE lot_batches 
        SET status = ?, updated_by = ?, updated_at = ?
        WHERE expiry_date IS NOT NULL 
        AND expiry_date < ? 
        AND status IN (?, ?)
      `;
      const params = [expiredStatus, updateUserId, currentTimestamp, currentTimestamp, activeStatus, quarantineStatus];

      if (agencyId) {
        query += ' AND agency_id = ?';
        params.push(agencyId);
      }

      const stmt = this.db.prepare(query);
      const result = stmt.run(...params);

      return result.changes;
    } catch (error) {
      console.error('Repository expireOverdueLots error:', {
        operation: 'expireOverdueLots',
        agencyId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to expire overdue lots: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'expireOverdueLots',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get total available quantity for a product across all lots
   */
  async getAvailableQuantityForProduct(productId: string, agencyId: string): Promise<number> {
    try {
      if (!productId || !agencyId) {
        throw new LotBatchRepositoryError('Product ID and agency ID are required', 'getAvailableQuantityForProduct');
      }

      const stmt = this.db.prepare(`
        SELECT COALESCE(SUM(available_quantity), 0) as totalAvailable
        FROM lot_batches 
        WHERE product_id = ? AND agency_id = ? AND status = ?
      `);

      const result = stmt.get(productId, agencyId, this.mapStatusToDatabase(LotStatus.ACTIVE)) as {
        totalAvailable: number;
      };

      return result.totalAvailable;
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository getAvailableQuantityForProduct error:', {
        operation: 'getAvailableQuantityForProduct',
        productId,
        agencyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to get available quantity for product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getAvailableQuantityForProduct',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get total reserved quantity for a product across all lots
   */
  async getReservedQuantityForProduct(productId: string, agencyId: string): Promise<number> {
    try {
      if (!productId || !agencyId) {
        throw new LotBatchRepositoryError('Product ID and agency ID are required', 'getReservedQuantityForProduct');
      }

      const stmt = this.db.prepare(`
        SELECT COALESCE(SUM(reserved_quantity), 0) as totalReserved
        FROM lot_batches 
        WHERE product_id = ? AND agency_id = ? AND status = ?
      `);

      const result = stmt.get(productId, agencyId, this.mapStatusToDatabase(LotStatus.ACTIVE)) as {
        totalReserved: number;
      };

      return result.totalReserved;
    } catch (error) {
      if (error instanceof LotBatchRepositoryError) {
        throw error;
      }

      console.error('Repository getReservedQuantityForProduct error:', {
        operation: 'getReservedQuantityForProduct',
        productId,
        agencyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to get reserved quantity for product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getReservedQuantityForProduct',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate status transition rules
   */
  private validateStatusTransition(currentStatus: LotStatus, newStatus: LotStatus): void {
    // Define allowed transitions
    const allowedTransitions: Record<LotStatus, LotStatus[]> = {
      [LotStatus.ACTIVE]: [
        LotStatus.QUARANTINE,
        LotStatus.EXPIRED,
        LotStatus.RECALLED,
        LotStatus.DAMAGED,
        LotStatus.CONSUMED,
      ],
      [LotStatus.QUARANTINE]: [LotStatus.ACTIVE, LotStatus.EXPIRED, LotStatus.RECALLED, LotStatus.DAMAGED],
      [LotStatus.EXPIRED]: [LotStatus.CONSUMED], // Only allow consuming expired lots
      [LotStatus.RECALLED]: [LotStatus.CONSUMED], // Only allow consuming recalled lots
      [LotStatus.DAMAGED]: [LotStatus.CONSUMED], // Only allow consuming damaged lots
      [LotStatus.RESERVED]: [LotStatus.ACTIVE, LotStatus.QUARANTINE, LotStatus.EXPIRED],
      [LotStatus.CONSUMED]: [], // Terminal state - no transitions allowed
    };

    const allowedNewStatuses = allowedTransitions[currentStatus] || [];

    if (!allowedNewStatuses.includes(newStatus)) {
      throw new LotBatchRepositoryError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        'updateStatus'
      );
    }
  }

  // Step 4: Transaction Support Implementation

  /**
   * Begin transaction for atomic operations
   */
  async beginTransaction(): Promise<ILotBatchRepositoryTransaction> {
    try {
      // SQLite transaction implementation
      this.db.prepare('BEGIN TRANSACTION').run();

      // Return transaction object implementing the interface
      return new SqliteLotBatchRepositoryTransaction(this.db, this);
    } catch (error) {
      console.error('Repository beginTransaction error:', {
        operation: 'beginTransaction',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new LotBatchRepositoryError(
        `Failed to begin transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'beginTransaction',
        error instanceof Error ? error : undefined
      );
    }
  }
}

/**
 * SQLite implementation of Lot/Batch Repository Transaction
 * Provides atomic operations for lot/batch management with proper rollback capabilities
 */
class SqliteLotBatchRepositoryTransaction implements ILotBatchRepositoryTransaction {
  private db: Database;
  private repository: SqliteLotBatchRepository;
  private active: boolean = true;

  constructor(db: Database, repository: SqliteLotBatchRepository) {
    this.db = db;
    this.repository = repository;
  }

  /**
   * Save lot/batch within transaction
   */
  async save(lotBatch: LotBatch): Promise<LotBatch> {
    if (!this.active) {
      throw new LotBatchRepositoryError('Transaction is not active', 'transaction.save');
    }

    return await this.repository.save(lotBatch);
  }

  /**
   * Update lot/batch within transaction
   */
  async update(lotBatch: LotBatch): Promise<LotBatch> {
    if (!this.active) {
      throw new LotBatchRepositoryError('Transaction is not active', 'transaction.update');
    }

    return await this.repository.update(lotBatch);
  }

  /**
   * Delete lot/batch within transaction
   */
  async delete(id: string): Promise<boolean> {
    if (!this.active) {
      throw new LotBatchRepositoryError('Transaction is not active', 'transaction.delete');
    }

    return await this.repository.delete(id);
  }

  /**
   * Reserve quantity within transaction
   */
  async reserveQuantity(lotBatchId: string, quantity: number, userId: string): Promise<LotBatch> {
    if (!this.active) {
      throw new LotBatchRepositoryError('Transaction is not active', 'transaction.reserveQuantity');
    }

    return await this.repository.reserveQuantity(lotBatchId, quantity, userId);
  }

  /**
   * Release reserved quantity within transaction
   */
  async releaseReservedQuantity(lotBatchId: string, quantity: number, userId: string): Promise<LotBatch> {
    if (!this.active) {
      throw new LotBatchRepositoryError('Transaction is not active', 'transaction.releaseReservedQuantity');
    }

    return await this.repository.releaseReservedQuantity(lotBatchId, quantity, userId);
  }

  /**
   * Consume quantity within transaction
   */
  async consumeQuantity(lotBatchId: string, quantity: number, userId: string): Promise<LotBatch> {
    if (!this.active) {
      throw new LotBatchRepositoryError('Transaction is not active', 'transaction.consumeQuantity');
    }

    return await this.repository.consumeQuantity(lotBatchId, quantity, userId);
  }

  /**
   * Commit transaction
   */
  async commit(): Promise<void> {
    if (!this.active) {
      throw new LotBatchRepositoryError('Transaction is not active', 'transaction.commit');
    }

    try {
      this.db.prepare('COMMIT').run();
      this.active = false;
    } catch (error) {
      throw new LotBatchRepositoryError(
        `Failed to commit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'transaction.commit',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Rollback transaction
   */
  async rollback(): Promise<void> {
    if (!this.active) {
      return; // Already rolled back or committed
    }

    try {
      this.db.prepare('ROLLBACK').run();
      this.active = false;
    } catch (error) {
      throw new LotBatchRepositoryError(
        `Failed to rollback transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'transaction.rollback',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if transaction is active
   */
  isActive(): boolean {
    return this.active;
  }
}

/**
 * Factory function to create SQLite Lot/Batch Repository
 */
export function createLotBatchRepository(connection: DatabaseConnection): SqliteLotBatchRepository {
  return new SqliteLotBatchRepository(connection);
}
