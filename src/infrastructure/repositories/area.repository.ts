/**
 * SQLite Area Repository Implementation
 *
 * Infrastructure implementation of the Area repository interface.
 * Handles area persistence operations using SQLite database with proper
 * multi-tenant isolation, error handling, and transaction support.
 *
 * Features:
 * - CRUD operations for areas
 * - Agency-scoped area management
 * - Search and filtering with pagination
 * - Geographic data handling (coordinates and boundaries)
 * - Unique constraint validation
 * - Comprehensive error handling
 * - Transaction support
 *
 * @domain Area Management
 * @pattern Repository Implementation
 * @architecture Hexagonal Architecture (Adapter)
 * @version 1.0.0
 */

import Database from 'better-sqlite3';
import {
  IAreaRepository,
  AreaSearchCriteria,
  AreaSortOptions,
  PaginationOptions,
  PaginatedAreaResult,
  AreaRepositoryError,
  AreaNotFoundError,
  AreaAlreadyExistsError,
  AreaConstraintViolationError,
  AreaRepositoryStats,
  IAreaRepositoryTransaction,
} from '../../domain/repositories/area.repository';
import { Area, AreaStatus, AreaPersistence } from '../../domain/entities/area';

/**
 * SQLite Area Repository Implementation
 */
export class SqliteAreaRepository implements IAreaRepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Save a new area to the repository
   */
  async save(area: Area): Promise<Area> {
    try {
      const persistence = area.toPersistence();

      // Check for existing area with same code
      const existingByCode = await this.existsByAreaCode(persistence.areaCode, persistence.agencyId);
      if (existingByCode) {
        throw new AreaAlreadyExistsError(`area code: ${persistence.areaCode}`, 'save');
      }

      // Check for existing area with same name
      const existingByName = await this.existsByAreaName(persistence.areaName, persistence.agencyId);
      if (existingByName) {
        throw new AreaAlreadyExistsError(`area name: ${persistence.areaName}`, 'save');
      }

      // Insert area
      const stmt = this.db.prepare(`
        INSERT INTO areas (
          id, agency_id, area_code, area_name, description,
          latitude, longitude, boundaries, status,
          created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        persistence.id,
        persistence.agencyId,
        persistence.areaCode,
        persistence.areaName,
        persistence.description,
        persistence.latitude,
        persistence.longitude,
        persistence.boundaries,
        persistence.status,
        Math.floor(persistence.createdAt.getTime() / 1000),
        Math.floor(persistence.updatedAt.getTime() / 1000),
        persistence.createdBy
      );

      if (result.changes === 0) {
        throw new AreaRepositoryError('Failed to save area', 'save');
      }

      return area;
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        if (error.message.includes('areas_agency_code')) {
          throw new AreaAlreadyExistsError(`area code: ${area.areaCode}`, 'save');
        }
        if (error.message.includes('areas_agency_name')) {
          throw new AreaAlreadyExistsError(`area name: ${area.areaName}`, 'save');
        }
        throw new AreaConstraintViolationError('unique constraint', 'save');
      }

      throw new AreaRepositoryError(
        `Failed to save area: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'save',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update an existing area in the repository
   */
  async update(area: Area): Promise<Area> {
    try {
      const persistence = area.toPersistence();

      // Check if area exists
      const existing = await this.findById(persistence.id);
      if (!existing) {
        throw new AreaNotFoundError(persistence.id, 'update');
      }

      // Check for name conflicts (excluding current area)
      if (persistence.areaName !== existing.areaName) {
        const existingByName = await this.existsByAreaName(persistence.areaName, persistence.agencyId, persistence.id);
        if (existingByName) {
          throw new AreaAlreadyExistsError(`area name: ${persistence.areaName}`, 'update');
        }
      }

      // Update area
      const stmt = this.db.prepare(`
        UPDATE areas SET
          area_name = ?,
          description = ?,
          latitude = ?,
          longitude = ?,
          boundaries = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
      `);

      const result = stmt.run(
        persistence.areaName,
        persistence.description,
        persistence.latitude,
        persistence.longitude,
        persistence.boundaries,
        persistence.status,
        Math.floor(persistence.updatedAt.getTime() / 1000),
        persistence.id
      );

      if (result.changes === 0) {
        throw new AreaNotFoundError(persistence.id, 'update');
      }

      return area;
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        if (error.message.includes('areas_agency_name')) {
          throw new AreaAlreadyExistsError(`area name: ${area.areaName}`, 'update');
        }
        throw new AreaConstraintViolationError('unique constraint', 'update');
      }

      throw new AreaRepositoryError(
        `Failed to update area: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'update',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find area by unique identifier
   */
  async findById(id: string): Promise<Area | null> {
    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new AreaRepositoryError('Area ID is required', 'findById');
      }

      const stmt = this.db.prepare(`
        SELECT 
          id, agency_id, area_code, area_name, description,
          latitude, longitude, boundaries, status,
          created_at, updated_at, created_by
        FROM areas 
        WHERE id = ?
      `);

      const row = stmt.get(id.trim()) as any;

      if (!row) {
        return null;
      }

      return this.mapRowToArea(row);
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      throw new AreaRepositoryError(
        `Failed to find area by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findById',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find area by code within agency
   */
  async findByAreaCode(areaCode: string, agencyId: string): Promise<Area | null> {
    try {
      if (!areaCode || typeof areaCode !== 'string' || areaCode.trim().length === 0) {
        throw new AreaRepositoryError('Area code is required', 'findByAreaCode');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim().length === 0) {
        throw new AreaRepositoryError('Agency ID is required', 'findByAreaCode');
      }

      const stmt = this.db.prepare(`
        SELECT 
          id, agency_id, area_code, area_name, description,
          latitude, longitude, boundaries, status,
          created_at, updated_at, created_by
        FROM areas 
        WHERE area_code = ? AND agency_id = ?
      `);

      const row = stmt.get(areaCode.trim(), agencyId.trim()) as any;

      if (!row) {
        return null;
      }

      return this.mapRowToArea(row);
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      throw new AreaRepositoryError(
        `Failed to find area by code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByAreaCode',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find area by name within agency
   */
  async findByAreaName(areaName: string, agencyId: string): Promise<Area | null> {
    try {
      if (!areaName || typeof areaName !== 'string' || areaName.trim().length === 0) {
        throw new AreaRepositoryError('Area name is required', 'findByAreaName');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim().length === 0) {
        throw new AreaRepositoryError('Agency ID is required', 'findByAreaName');
      }

      const stmt = this.db.prepare(`
        SELECT 
          id, agency_id, area_code, area_name, description,
          latitude, longitude, boundaries, status,
          created_at, updated_at, created_by
        FROM areas 
        WHERE area_name = ? AND agency_id = ?
      `);

      const row = stmt.get(areaName.trim(), agencyId.trim()) as any;

      if (!row) {
        return null;
      }

      return this.mapRowToArea(row);
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      throw new AreaRepositoryError(
        `Failed to find area by name: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByAreaName',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if area exists by code within agency
   */
  async existsByAreaCode(areaCode: string, agencyId: string, excludeAreaId?: string): Promise<boolean> {
    try {
      if (!areaCode || typeof areaCode !== 'string' || areaCode.trim().length === 0) {
        throw new AreaRepositoryError('Area code is required', 'existsByAreaCode');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim().length === 0) {
        throw new AreaRepositoryError('Agency ID is required', 'existsByAreaCode');
      }

      let query = 'SELECT COUNT(*) as count FROM areas WHERE area_code = ? AND agency_id = ?';
      const params: any[] = [areaCode.trim(), agencyId.trim()];

      if (excludeAreaId) {
        query += ' AND id != ?';
        params.push(excludeAreaId);
      }

      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as any;

      return result.count > 0;
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      throw new AreaRepositoryError(
        `Failed to check area code existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsByAreaCode',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if area exists by name within agency
   */
  async existsByAreaName(areaName: string, agencyId: string, excludeAreaId?: string): Promise<boolean> {
    try {
      if (!areaName || typeof areaName !== 'string' || areaName.trim().length === 0) {
        throw new AreaRepositoryError('Area name is required', 'existsByAreaName');
      }

      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim().length === 0) {
        throw new AreaRepositoryError('Agency ID is required', 'existsByAreaName');
      }

      let query = 'SELECT COUNT(*) as count FROM areas WHERE area_name = ? AND agency_id = ?';
      const params: any[] = [areaName.trim(), agencyId.trim()];

      if (excludeAreaId) {
        query += ' AND id != ?';
        params.push(excludeAreaId);
      }

      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as any;

      return result.count > 0;
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      throw new AreaRepositoryError(
        `Failed to check area name existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsByAreaName',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete area by ID
   */
  async deleteById(id: string): Promise<boolean> {
    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new AreaRepositoryError('Area ID is required', 'deleteById');
      }

      const stmt = this.db.prepare('DELETE FROM areas WHERE id = ?');
      const result = stmt.run(id.trim());

      return result.changes > 0;
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      throw new AreaRepositoryError(
        `Failed to delete area: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'deleteById',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find all areas for an agency
   */
  async findByAgencyId(agencyId: string, includeInactive = false): Promise<Area[]> {
    try {
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim().length === 0) {
        throw new AreaRepositoryError('Agency ID is required', 'findByAgencyId');
      }

      let query = `
        SELECT 
          id, agency_id, area_code, area_name, description,
          latitude, longitude, boundaries, status,
          created_at, updated_at, created_by
        FROM areas 
        WHERE agency_id = ?
      `;

      const params: any[] = [agencyId.trim()];

      if (!includeInactive) {
        query += ' AND status = ?';
        params.push(AreaStatus.ACTIVE);
      }

      query += ' ORDER BY area_code ASC';

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map((row) => this.mapRowToArea(row));
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      throw new AreaRepositoryError(
        `Failed to find areas by agency ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByAgencyId',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Search areas with criteria
   */
  async search(
    criteria: AreaSearchCriteria,
    sort?: AreaSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedAreaResult> {
    try {
      if (!criteria.agencyId || typeof criteria.agencyId !== 'string' || criteria.agencyId.trim().length === 0) {
        throw new AreaRepositoryError('Agency ID is required in search criteria', 'search');
      }

      // Build WHERE conditions
      const conditions: string[] = ['agency_id = ?'];
      const params: any[] = [criteria.agencyId.trim()];

      if (criteria.status) {
        conditions.push('status = ?');
        params.push(criteria.status);
      }

      if (criteria.searchText) {
        conditions.push('(area_code LIKE ? OR area_name LIKE ? OR description LIKE ?)');
        const searchPattern = `%${criteria.searchText}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (criteria.hasCoordinates !== undefined) {
        if (criteria.hasCoordinates) {
          conditions.push('latitude IS NOT NULL AND longitude IS NOT NULL');
        } else {
          conditions.push('(latitude IS NULL OR longitude IS NULL)');
        }
      }

      if (criteria.hasBoundaries !== undefined) {
        if (criteria.hasBoundaries) {
          conditions.push('boundaries IS NOT NULL');
        } else {
          conditions.push('boundaries IS NULL');
        }
      }

      if (criteria.createdBy) {
        conditions.push('created_by = ?');
        params.push(criteria.createdBy);
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

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Count total results
      const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM areas ${whereClause}`);
      const countResult = countStmt.get(...params) as any;
      const totalCount = countResult.count;

      // Build ORDER BY clause
      let orderClause = 'ORDER BY area_code ASC';
      if (sort) {
        const direction = sort.direction.toUpperCase();
        switch (sort.field) {
          case 'areaCode':
            orderClause = `ORDER BY area_code ${direction}`;
            break;
          case 'areaName':
            orderClause = `ORDER BY area_name ${direction}`;
            break;
          case 'status':
            orderClause = `ORDER BY status ${direction}`;
            break;
          case 'createdAt':
            orderClause = `ORDER BY created_at ${direction}`;
            break;
          case 'updatedAt':
            orderClause = `ORDER BY updated_at ${direction}`;
            break;
          default:
            orderClause = 'ORDER BY area_code ASC';
        }
      }

      // Build LIMIT and OFFSET clause
      let limitClause = '';
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        limitClause = `LIMIT ${pagination.limit} OFFSET ${offset}`;
      }

      // Get areas
      const areasQuery = `
        SELECT 
          id, agency_id, area_code, area_name, description,
          latitude, longitude, boundaries, status,
          created_at, updated_at, created_by
        FROM areas 
        ${whereClause}
        ${orderClause}
        ${limitClause}
      `;

      const areasStmt = this.db.prepare(areasQuery);
      const rows = areasStmt.all(...params) as any[];
      const areas = rows.map((row) => this.mapRowToArea(row));

      // Calculate pagination info
      if (pagination) {
        const totalPages = Math.ceil(totalCount / pagination.limit);
        const currentPage = pagination.page;
        const hasNextPage = currentPage < totalPages;
        const hasPreviousPage = currentPage > 1;

        return {
          areas,
          totalCount,
          totalPages,
          currentPage,
          hasNextPage,
          hasPreviousPage,
        };
      }

      return {
        areas,
        totalCount,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      throw new AreaRepositoryError(
        `Failed to search areas: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'search',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Count areas by status within agency
   */
  async countByStatus(agencyId: string, status: AreaStatus): Promise<number> {
    try {
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim().length === 0) {
        throw new AreaRepositoryError('Agency ID is required', 'countByStatus');
      }

      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM areas 
        WHERE agency_id = ? AND status = ?
      `);

      const result = stmt.get(agencyId.trim(), status) as any;
      return result.count;
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      throw new AreaRepositoryError(
        `Failed to count areas by status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'countByStatus',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find areas with geographic coordinates
   */
  async findAreasWithCoordinates(agencyId: string): Promise<Area[]> {
    try {
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim().length === 0) {
        throw new AreaRepositoryError('Agency ID is required', 'findAreasWithCoordinates');
      }

      const stmt = this.db.prepare(`
        SELECT 
          id, agency_id, area_code, area_name, description,
          latitude, longitude, boundaries, status,
          created_at, updated_at, created_by
        FROM areas 
        WHERE agency_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY area_code ASC
      `);

      const rows = stmt.all(agencyId.trim()) as any[];
      return rows.map((row) => this.mapRowToArea(row));
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      throw new AreaRepositoryError(
        `Failed to find areas with coordinates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findAreasWithCoordinates',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find areas with defined boundaries
   */
  async findAreasWithBoundaries(agencyId: string): Promise<Area[]> {
    try {
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim().length === 0) {
        throw new AreaRepositoryError('Agency ID is required', 'findAreasWithBoundaries');
      }

      const stmt = this.db.prepare(`
        SELECT 
          id, agency_id, area_code, area_name, description,
          latitude, longitude, boundaries, status,
          created_at, updated_at, created_by
        FROM areas 
        WHERE agency_id = ? AND boundaries IS NOT NULL
        ORDER BY area_code ASC
      `);

      const rows = stmt.all(agencyId.trim()) as any[];
      return rows.map((row) => this.mapRowToArea(row));
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      throw new AreaRepositoryError(
        `Failed to find areas with boundaries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findAreasWithBoundaries',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get repository statistics for an agency
   */
  async getStats(agencyId: string): Promise<AreaRepositoryStats> {
    try {
      if (!agencyId || typeof agencyId !== 'string' || agencyId.trim().length === 0) {
        throw new AreaRepositoryError('Agency ID is required', 'getStats');
      }

      const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM areas WHERE agency_id = ?');
      const activeStmt = this.db.prepare('SELECT COUNT(*) as count FROM areas WHERE agency_id = ? AND status = ?');
      const inactiveStmt = this.db.prepare('SELECT COUNT(*) as count FROM areas WHERE agency_id = ? AND status = ?');
      const coordsStmt = this.db.prepare(
        'SELECT COUNT(*) as count FROM areas WHERE agency_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL'
      );
      const boundariesStmt = this.db.prepare(
        'SELECT COUNT(*) as count FROM areas WHERE agency_id = ? AND boundaries IS NOT NULL'
      );
      const lastCreatedStmt = this.db.prepare('SELECT MAX(created_at) as max_created FROM areas WHERE agency_id = ?');
      const lastUpdatedStmt = this.db.prepare('SELECT MAX(updated_at) as max_updated FROM areas WHERE agency_id = ?');

      const totalResult = totalStmt.get(agencyId) as any;
      const activeResult = activeStmt.get(agencyId, AreaStatus.ACTIVE) as any;
      const inactiveResult = inactiveStmt.get(agencyId, AreaStatus.INACTIVE) as any;
      const coordsResult = coordsStmt.get(agencyId) as any;
      const boundariesResult = boundariesStmt.get(agencyId) as any;
      const lastCreatedResult = lastCreatedStmt.get(agencyId) as any;
      const lastUpdatedResult = lastUpdatedStmt.get(agencyId) as any;

      return {
        totalAreas: totalResult.count,
        activeAreas: activeResult.count,
        inactiveAreas: inactiveResult.count,
        areasWithCoordinates: coordsResult.count,
        areasWithBoundaries: boundariesResult.count,
        lastCreated: lastCreatedResult.max_created ? new Date(lastCreatedResult.max_created * 1000) : null,
        lastUpdated: lastUpdatedResult.max_updated ? new Date(lastUpdatedResult.max_updated * 1000) : null,
      };
    } catch (error) {
      if (error instanceof AreaRepositoryError) {
        throw error;
      }

      throw new AreaRepositoryError(
        `Failed to get repository stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getStats',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check repository health and connectivity
   */
  async isHealthy(): Promise<boolean> {
    try {
      const stmt = this.db.prepare('SELECT 1 as test');
      const result = stmt.get() as any;
      return result.test === 1;
    } catch {
      return false;
    }
  }

  /**
   * Begin transaction for atomic operations
   */
  async beginTransaction(): Promise<IAreaRepositoryTransaction> {
    return new SqliteAreaRepositoryTransaction(this.db, this);
  }

  /**
   * Map database row to Area entity
   */
  private mapRowToArea(row: any): Area {
    const persistence: AreaPersistence = {
      id: row.id,
      agencyId: row.agency_id,
      areaCode: row.area_code,
      areaName: row.area_name,
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      boundaries: row.boundaries,
      status: row.status as AreaStatus,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
      createdBy: row.created_by,
    };

    return Area.fromPersistence(persistence);
  }
}

/**
 * SQLite Area Repository Transaction Implementation
 */
class SqliteAreaRepositoryTransaction implements IAreaRepositoryTransaction {
  private isTransactionActive = false;

  constructor(
    private readonly db: Database.Database,
    private readonly repository: SqliteAreaRepository
  ) {
    this.db.exec('BEGIN TRANSACTION');
    this.isTransactionActive = true;
  }

  async save(area: Area): Promise<Area> {
    if (!this.isTransactionActive) {
      throw new AreaRepositoryError('Transaction is not active', 'save');
    }
    return this.repository.save(area);
  }

  async update(area: Area): Promise<Area> {
    if (!this.isTransactionActive) {
      throw new AreaRepositoryError('Transaction is not active', 'update');
    }
    return this.repository.update(area);
  }

  async delete(id: string): Promise<boolean> {
    if (!this.isTransactionActive) {
      throw new AreaRepositoryError('Transaction is not active', 'delete');
    }
    return this.repository.deleteById(id);
  }

  async commit(): Promise<void> {
    if (!this.isTransactionActive) {
      throw new AreaRepositoryError('Transaction is not active', 'commit');
    }

    try {
      this.db.exec('COMMIT');
      this.isTransactionActive = false;
    } catch (error) {
      throw new AreaRepositoryError(
        `Failed to commit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'commit',
        error instanceof Error ? error : undefined
      );
    }
  }

  async rollback(): Promise<void> {
    if (!this.isTransactionActive) {
      throw new AreaRepositoryError('Transaction is not active', 'rollback');
    }

    try {
      this.db.exec('ROLLBACK');
      this.isTransactionActive = false;
    } catch (error) {
      throw new AreaRepositoryError(
        `Failed to rollback transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'rollback',
        error instanceof Error ? error : undefined
      );
    }
  }

  isActive(): boolean {
    return this.isTransactionActive;
  }
}
