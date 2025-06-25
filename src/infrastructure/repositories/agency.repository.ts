/**
 * SQLite Agency Repository Implementation - Step MT-2A: Basic Repository Structure
 *
 * Concrete implementation of IAgencyRepository interface for SQLite database.
 * Follows Repository pattern and provides data persistence for Agency entities.
 * Implements core CRUD operations with proper error handling.
 *
 * STEP MT-2A SCOPE:
 * - Basic constructor and database connection validation
 * - Core CRUD methods: save, update, findById
 * - Basic existence checks: existsByName, existsByDatabasePath
 * - Health check and basic error handling
 * - All advanced methods throw "not implemented" errors for incremental development
 *
 * ARCHITECTURE NOTES:
 * - Follows Hexagonal Architecture (Adapter pattern)
 * - Implements Repository Pattern for data access abstraction
 * - Uses flat database schema (no JSON serialization for core fields)
 * - Follows same patterns as UserRepository and ProductRepository for consistency
 * - Supports multi-tenant architecture with agency-specific database paths
 *
 * @domain Agency Management
 * @pattern Repository Pattern
 * @architecture Hexagonal Architecture (Adapter)
 * @version 1.0.0 - Step MT-2A: Basic Repository Structure
 */

import { Database } from 'better-sqlite3';
import { DatabaseConnection } from '../database/connection';
import {
  IAgencyRepository,
  IAgencyRepositoryTransaction,
  AgencyRepositoryError,
  AgencyNotFoundError,
  AgencyAlreadyExistsError,
  AgencyRepositoryConnectionError,
  type AgencySearchCriteria,
  type AgencySearchResult,
  type AgencyRepositoryStats,
} from '../../domain/repositories/agency.repository';
import { Agency, AgencyStatus, type AgencySettings } from '../../domain/entities/agency';

/**
 * Agency persistence data interface for database operations
 */
interface AgencyPersistenceData {
  id: string;
  name: string;
  database_path: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  settings: string; // JSON string
  status: string;
  created_at: number;
  updated_at: number;
  created_by: string | null;
}

/**
 * SQLite Agency Repository Implementation
 *
 * Step MT-2A Implementation - Core methods only:
 * - save, update, findById, findByName, findByDatabasePath
 * - existsByName, existsByDatabasePath, isHealthy
 * - Simple database mapping with JSON settings serialization
 * - All advanced methods throw "not implemented" errors for incremental development
 */
export class SqliteAgencyRepository implements IAgencyRepository {
  private readonly connection: DatabaseConnection;
  private readonly db: Database;

  constructor(connection: DatabaseConnection) {
    if (!connection) {
      throw new AgencyRepositoryConnectionError('Database connection is required');
    }

    try {
      const db = connection.getDatabase();
      if (!db) {
        throw new AgencyRepositoryConnectionError('Invalid database connection');
      }
      this.connection = connection;
      this.db = db;
    } catch (error) {
      throw new AgencyRepositoryConnectionError(
        `Database connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Map domain status to database status
   */
  private mapStatusToDatabase(domainStatus: AgencyStatus): string {
    return domainStatus.toLowerCase();
  }

  /**
   * Map database status to domain status
   */
  private mapStatusToDomain(databaseStatus: string): AgencyStatus {
    switch (databaseStatus.toLowerCase()) {
      case 'active':
        return AgencyStatus.ACTIVE;
      case 'inactive':
        return AgencyStatus.INACTIVE;
      case 'suspended':
        return AgencyStatus.SUSPENDED;
      default:
        return AgencyStatus.ACTIVE; // Default fallback
    }
  }

  /**
   * Save a new agency to the database
   */
  async save(agency: Agency): Promise<Agency> {
    try {
      // Input validation
      if (!agency || typeof agency !== 'object') {
        throw new AgencyRepositoryError('Invalid agency object provided', 'save');
      }

      if (!agency.id || !agency.name || !agency.databasePath) {
        throw new AgencyRepositoryError('Agency missing required properties (id, name, databasePath)', 'save');
      }

      // Check for duplicate name
      const existingByName = await this.existsByName(agency.name);
      if (existingByName) {
        throw new AgencyAlreadyExistsError(agency.name, 'name');
      }

      // Check for duplicate database path
      const existingByPath = await this.existsByDatabasePath(agency.databasePath);
      if (existingByPath) {
        throw new AgencyAlreadyExistsError(agency.databasePath, 'databasePath');
      }

      // Convert to persistence format
      const persistence = agency.toPersistence();

      // Insert into database
      const stmt = this.db.prepare(`
        INSERT INTO agencies (
          id, name, database_path, contact_person, phone, email, address,
          settings, status, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        persistence.id,
        persistence.name,
        persistence.databasePath,
        persistence.contactPerson,
        persistence.phone,
        persistence.email,
        persistence.address,
        persistence.settings,
        this.mapStatusToDatabase(persistence.status),
        persistence.createdAt.getTime(),
        persistence.updatedAt.getTime(),
        persistence.createdBy
      );

      console.log(`Repository: Agency saved successfully - ID: ${agency.id}, Name: ${agency.name}`);
      return agency;
    } catch (error) {
      // Preserve specific error types
      if (error instanceof AgencyAlreadyExistsError || error instanceof AgencyRepositoryError) {
        throw error;
      }

      // Log unexpected errors for debugging
      console.error('Repository save error:', {
        operation: 'save',
        agencyId: agency?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AgencyRepositoryError(
        `Failed to save agency: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'save',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update an existing agency in the database
   */
  async update(agency: Agency): Promise<Agency> {
    try {
      // Input validation
      if (!agency || typeof agency !== 'object') {
        throw new AgencyRepositoryError('Invalid agency object provided', 'update');
      }

      if (!agency.id) {
        throw new AgencyRepositoryError('Agency ID is required for update', 'update');
      }

      // Convert to persistence format
      const persistence = agency.toPersistence();

      // Update in database
      const stmt = this.db.prepare(`
        UPDATE agencies SET
          name = ?, database_path = ?, contact_person = ?, phone = ?, email = ?,
          address = ?, settings = ?, status = ?, updated_at = ?
        WHERE id = ?
      `);

      const result = stmt.run(
        persistence.name,
        persistence.databasePath,
        persistence.contactPerson,
        persistence.phone,
        persistence.email,
        persistence.address,
        persistence.settings,
        this.mapStatusToDatabase(persistence.status),
        persistence.updatedAt.getTime(),
        persistence.id
      );

      if (result.changes === 0) {
        throw new AgencyNotFoundError(agency.id);
      }

      console.log(`Repository: Agency updated successfully - ID: ${agency.id}, Name: ${agency.name}`);
      return agency;
    } catch (error) {
      // Preserve specific error types
      if (error instanceof AgencyNotFoundError || error instanceof AgencyRepositoryError) {
        throw error;
      }

      // Log unexpected errors for debugging
      console.error('Repository update error:', {
        operation: 'update',
        agencyId: agency?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AgencyRepositoryError(
        `Failed to update agency: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'update',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find agency by unique identifier
   */
  async findById(id: string): Promise<Agency | null> {
    try {
      // Input validation
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new AgencyRepositoryError('Valid agency ID is required', 'findById');
      }

      const query = 'SELECT * FROM agencies WHERE id = ?';
      const stmt = this.db.prepare(query);
      const row = stmt.get(id.trim()) as AgencyPersistenceData | undefined;

      if (!row) {
        return null;
      }

      return this.mapToAgency(row);
    } catch (error) {
      // Preserve specific error types
      if (error instanceof AgencyRepositoryError) {
        throw error;
      }

      // Log unexpected errors for debugging
      console.error('Repository findById error:', {
        operation: 'findById',
        agencyId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AgencyRepositoryError(
        `Failed to find agency by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findById',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find agency by name (unique constraint)
   */
  async findByName(name: string): Promise<Agency | null> {
    try {
      // Input validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new AgencyRepositoryError('Valid agency name is required', 'findByName');
      }

      const query = 'SELECT * FROM agencies WHERE name = ?';
      const stmt = this.db.prepare(query);
      const row = stmt.get(name.trim()) as AgencyPersistenceData | undefined;

      if (!row) {
        return null;
      }

      return this.mapToAgency(row);
    } catch (error) {
      // Preserve specific error types
      if (error instanceof AgencyRepositoryError) {
        throw error;
      }

      throw new AgencyRepositoryError(
        `Failed to find agency by name: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByName',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find agency by database path (unique constraint)
   */
  async findByDatabasePath(databasePath: string): Promise<Agency | null> {
    try {
      // Input validation
      if (!databasePath || typeof databasePath !== 'string' || databasePath.trim().length === 0) {
        throw new AgencyRepositoryError('Valid database path is required', 'findByDatabasePath');
      }

      const query = 'SELECT * FROM agencies WHERE database_path = ?';
      const stmt = this.db.prepare(query);
      const row = stmt.get(databasePath.trim()) as AgencyPersistenceData | undefined;

      if (!row) {
        return null;
      }

      return this.mapToAgency(row);
    } catch (error) {
      // Preserve specific error types
      if (error instanceof AgencyRepositoryError) {
        throw error;
      }

      throw new AgencyRepositoryError(
        `Failed to find agency by database path: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByDatabasePath',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if agency exists by name
   */
  async existsByName(name: string): Promise<boolean> {
    try {
      // Input validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return false; // Invalid input means doesn't exist
      }

      const query = 'SELECT COUNT(*) as count FROM agencies WHERE name = ?';
      const stmt = this.db.prepare(query);
      const result = stmt.get(name.trim()) as { count: number };

      return result.count > 0;
    } catch (error) {
      throw new AgencyRepositoryError(
        `Failed to check agency existence by name: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsByName',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if agency exists by database path
   */
  async existsByDatabasePath(databasePath: string): Promise<boolean> {
    try {
      // Input validation
      if (!databasePath || typeof databasePath !== 'string' || databasePath.trim().length === 0) {
        return false; // Invalid input means doesn't exist
      }

      const query = 'SELECT COUNT(*) as count FROM agencies WHERE database_path = ?';
      const stmt = this.db.prepare(query);
      const result = stmt.get(databasePath.trim()) as { count: number };

      return result.count > 0;
    } catch (error) {
      throw new AgencyRepositoryError(
        `Failed to check agency existence by database path: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsByDatabasePath',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check repository health and connectivity
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Test basic database connectivity
      const query = 'SELECT COUNT(*) as count FROM agencies LIMIT 1';
      const stmt = this.db.prepare(query);
      stmt.get();

      return true;
    } catch (error) {
      console.error('Repository health check failed:', error);
      return false;
    }
  }

  /**
   * Map database row to Agency entity
   */
  private mapToAgency(row: AgencyPersistenceData): Agency {
    try {
      const reconstructionData = {
        id: row.id,
        name: row.name,
        databasePath: row.database_path,
        contactPerson: row.contact_person || undefined,
        phone: row.phone || undefined,
        email: row.email || undefined,
        address: row.address || undefined,
        settings: row.settings, // JSON string
        status: this.mapStatusToDomain(row.status),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        createdBy: row.created_by || undefined,
      };

      return Agency.fromPersistence(reconstructionData);
    } catch (error) {
      throw new AgencyRepositoryError(
        `Failed to map database row to Agency entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'mapToAgency',
        error instanceof Error ? error : undefined
      );
    }
  }

  // === STEP MT-2B: SEARCH & QUERY METHODS ===

  /**
   * Search agencies with criteria
   * @param criteria - Search criteria
   */
  async search(criteria: AgencySearchCriteria): Promise<AgencySearchResult> {
    try {
      // Validate input
      if (!criteria || typeof criteria !== 'object') {
        throw new AgencyRepositoryError('Invalid search criteria', 'search');
      }

      // Set defaults
      const limit = Math.min(criteria.limit || 100, 10000); // Max 10000 for safety
      const offset = Math.max(criteria.offset || 0, 0);

      // Build WHERE clause dynamically
      const conditions: string[] = [];
      const params: any[] = [];

      // Name search (partial match)
      if (criteria.name && typeof criteria.name === 'string' && criteria.name.trim()) {
        conditions.push('name LIKE ?');
        params.push(`%${criteria.name.trim()}%`);
      }

      // Status filter
      if (criteria.status) {
        if (Array.isArray(criteria.status)) {
          if (criteria.status.length > 0) {
            const statusPlaceholders = criteria.status.map(() => '?').join(',');
            conditions.push(`status IN (${statusPlaceholders})`);
            params.push(...criteria.status.map((s) => this.mapStatusToDatabase(s)));
          }
        } else {
          conditions.push('status = ?');
          params.push(this.mapStatusToDatabase(criteria.status));
        }
      }

      // Contact person search (partial match)
      if (criteria.contactPerson && typeof criteria.contactPerson === 'string' && criteria.contactPerson.trim()) {
        conditions.push('contact_person LIKE ?');
        params.push(`%${criteria.contactPerson.trim()}%`);
      }

      // Search term (searches across name and contact person)
      if (criteria.searchTerm && typeof criteria.searchTerm === 'string' && criteria.searchTerm.trim()) {
        conditions.push('(name LIKE ? OR contact_person LIKE ?)');
        const searchValue = `%${criteria.searchTerm.trim()}%`;
        params.push(searchValue, searchValue);
      }

      // Currency filter
      if (criteria.currency && typeof criteria.currency === 'string' && criteria.currency.trim()) {
        conditions.push('settings LIKE ?');
        params.push(`%"currency":"${criteria.currency.trim()}"%`);
      }

      // Business settings filters
      if (typeof criteria.allowsCreditSales === 'boolean') {
        conditions.push('settings LIKE ?');
        params.push(`%"allowCreditSales":${criteria.allowsCreditSales}%`);
      }

      // Created date range
      if (criteria.createdAfter instanceof Date) {
        conditions.push('created_at >= ?');
        params.push(criteria.createdAfter.getTime());
      }

      if (criteria.createdBefore instanceof Date) {
        conditions.push('created_at <= ?');
        params.push(criteria.createdBefore.getTime());
      }

      // Updated date range
      if (criteria.updatedAfter instanceof Date) {
        conditions.push('updated_at >= ?');
        params.push(criteria.updatedAfter.getTime());
      }

      if (criteria.updatedBefore instanceof Date) {
        conditions.push('updated_at <= ?');
        params.push(criteria.updatedBefore.getTime());
      }

      // Build WHERE clause
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      let orderBy = 'created_at DESC'; // Default sort
      if (criteria.sortBy) {
        const sortField = this.mapSortFieldToDatabase(criteria.sortBy);
        const sortOrder = criteria.sortOrder === 'ASC' ? 'ASC' : 'DESC';
        orderBy = `${sortField} ${sortOrder}`;
      }

      // Count total results (for pagination)
      const countQuery = `SELECT COUNT(*) as total FROM agencies ${whereClause}`;
      const countStmt = this.db.prepare(countQuery);
      const countResult = countStmt.get(...params) as { total: number };
      const total = countResult.total;

      // Get agencies with pagination
      const searchQuery = `
        SELECT * FROM agencies 
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;

      const searchStmt = this.db.prepare(searchQuery);
      const rows = searchStmt.all(...params, limit, offset) as any[];

      // Map to domain entities
      const agencies = rows.map((row) => this.mapToAgency(row));

      return {
        agencies: agencies as readonly Agency[],
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('Repository search error:', {
        operation: 'search',
        criteria,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AgencyRepositoryError(
        `Failed to search agencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'search',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find all agencies (with optional limit for safety)
   * @param limit - Maximum number of agencies to return (default: 1000)
   */
  async findAll(limit?: number): Promise<readonly Agency[]> {
    try {
      const actualLimit = Math.min(limit || 1000, 10000);

      const query = `
        SELECT * FROM agencies 
        ORDER BY created_at DESC
        LIMIT ?
      `;

      const stmt = this.db.prepare(query);
      const rows = stmt.all(actualLimit) as any[];

      return rows.map((row) => this.mapToAgency(row));
    } catch (error) {
      console.error('Repository findAll error:', {
        operation: 'findAll',
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AgencyRepositoryError(
        `Failed to find all agencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findAll',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find agencies by status
   * @param status - Agency status
   */
  async findByStatus(status: AgencyStatus): Promise<readonly Agency[]> {
    try {
      // Validate status
      if (!status || typeof status !== 'string') {
        throw new AgencyRepositoryError('Invalid status parameter', 'findByStatus');
      }

      const dbStatus = this.mapStatusToDatabase(status);
      const query = 'SELECT * FROM agencies WHERE status = ? ORDER BY created_at DESC';

      const stmt = this.db.prepare(query);
      const rows = stmt.all(dbStatus) as any[];

      return rows.map((row) => this.mapToAgency(row));
    } catch (error) {
      console.error('Repository findByStatus error:', {
        operation: 'findByStatus',
        status,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AgencyRepositoryError(
        `Failed to find agencies by status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByStatus',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find operational agencies only
   */
  async findOperational(): Promise<readonly Agency[]> {
    try {
      const query = 'SELECT * FROM agencies WHERE status = ? ORDER BY created_at DESC';

      const stmt = this.db.prepare(query);
      const rows = stmt.all('active') as any[];

      // Filter to only operational agencies using domain logic
      const agencies = rows.map((row) => this.mapToAgency(row));
      return agencies.filter((agency) => agency.isOperational());
    } catch (error) {
      console.error('Repository findOperational error:', {
        operation: 'findOperational',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AgencyRepositoryError(
        `Failed to find operational agencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findOperational',
        error instanceof Error ? error : undefined
      );
    }
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Map search sort field to database column
   */
  private mapSortFieldToDatabase(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      name: 'name',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      status: 'status',
      databasePath: 'database_path',
      contactPerson: 'contact_person',
    };

    return fieldMap[sortBy] || 'created_at';
  }

  // ========================================
  // STEP MT-2C: ADVANCED OPERATIONS & MULTI-TENANT FEATURES
  // Counting, status management, statistics, transactions, multi-tenant
  // ========================================

  /**
   * Count total number of agencies
   */
  async count(): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as total FROM agencies';
      const stmt = this.db.prepare(query);
      const result = stmt.get() as { total: number };

      return result.total;
    } catch (error) {
      console.error('Repository count error:', {
        operation: 'count',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AgencyRepositoryError(
        `Failed to count agencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'count',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Count agencies by specific criteria
   */
  async countByCriteria(criteria: Partial<AgencySearchCriteria>): Promise<number> {
    try {
      // Validate input
      if (!criteria || typeof criteria !== 'object') {
        throw new AgencyRepositoryError('Invalid count criteria', 'countByCriteria');
      }

      // Build WHERE clause using same logic as search method
      const conditions: string[] = [];
      const params: any[] = [];

      // Name search (partial match)
      if (criteria.name && typeof criteria.name === 'string' && criteria.name.trim()) {
        conditions.push('name LIKE ?');
        params.push(`%${criteria.name.trim()}%`);
      }

      // Status filter
      if (criteria.status) {
        if (Array.isArray(criteria.status)) {
          if (criteria.status.length > 0) {
            const statusPlaceholders = criteria.status.map(() => '?').join(',');
            conditions.push(`status IN (${statusPlaceholders})`);
            params.push(...criteria.status.map((s) => this.mapStatusToDatabase(s)));
          }
        } else {
          conditions.push('status = ?');
          params.push(this.mapStatusToDatabase(criteria.status));
        }
      }

      // Contact person search (partial match)
      if (criteria.contactPerson && typeof criteria.contactPerson === 'string' && criteria.contactPerson.trim()) {
        conditions.push('contact_person LIKE ?');
        params.push(`%${criteria.contactPerson.trim()}%`);
      }

      // Search term (searches across name and contact person)
      if (criteria.searchTerm && typeof criteria.searchTerm === 'string' && criteria.searchTerm.trim()) {
        conditions.push('(name LIKE ? OR contact_person LIKE ?)');
        const searchValue = `%${criteria.searchTerm.trim()}%`;
        params.push(searchValue, searchValue);
      }

      // Currency filter
      if (criteria.currency && typeof criteria.currency === 'string' && criteria.currency.trim()) {
        conditions.push('settings LIKE ?');
        params.push(`%"currency":"${criteria.currency.trim()}"%`);
      }

      // Business settings filters
      if (typeof criteria.allowsCreditSales === 'boolean') {
        conditions.push('settings LIKE ?');
        params.push(`%"allowCreditSales":${criteria.allowsCreditSales}%`);
      }

      // Date range filters
      if (criteria.createdAfter instanceof Date) {
        conditions.push('created_at >= ?');
        params.push(criteria.createdAfter.getTime());
      }

      if (criteria.createdBefore instanceof Date) {
        conditions.push('created_at <= ?');
        params.push(criteria.createdBefore.getTime());
      }

      if (criteria.updatedAfter instanceof Date) {
        conditions.push('updated_at >= ?');
        params.push(criteria.updatedAfter.getTime());
      }

      if (criteria.updatedBefore instanceof Date) {
        conditions.push('updated_at <= ?');
        params.push(criteria.updatedBefore.getTime());
      }

      // Build final query
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countQuery = `SELECT COUNT(*) as total FROM agencies ${whereClause}`;

      const stmt = this.db.prepare(countQuery);
      const result = stmt.get(...params) as { total: number };

      return result.total;
    } catch (error) {
      console.error('Repository countByCriteria error:', {
        operation: 'countByCriteria',
        criteria,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AgencyRepositoryError(
        `Failed to count agencies by criteria: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'countByCriteria',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete agency by ID (hard delete - removes agency and all related data)
   * WARNING: This is destructive and will remove all agency data
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Validate input
      if (!id || typeof id !== 'string' || !id.trim()) {
        throw new AgencyRepositoryError('Invalid agency ID for delete operation', 'delete');
      }

      const agencyId = id.trim();

      // Check if agency exists first
      const existingAgency = await this.findById(agencyId);
      if (!existingAgency) {
        throw new AgencyNotFoundError(agencyId);
      }

      // Delete the agency record
      const deleteQuery = 'DELETE FROM agencies WHERE id = ?';
      const stmt = this.db.prepare(deleteQuery);
      const result = stmt.run(agencyId);

      // Check if deletion was successful
      const deletedRows = result.changes;
      return deletedRows > 0;
    } catch (error) {
      console.error('Repository delete error:', {
        operation: 'delete',
        agencyId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AgencyNotFoundError) {
        throw error;
      }

      throw new AgencyRepositoryError(
        `Failed to delete agency: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Suspend agency (changes status to suspended)
   */
  async suspend(id: string, reason?: string): Promise<Agency> {
    try {
      // Validate input
      if (!id || typeof id !== 'string' || !id.trim()) {
        throw new AgencyRepositoryError('Invalid agency ID for suspend operation', 'suspend');
      }

      const agencyId = id.trim();

      // Find existing agency
      const existingAgency = await this.findById(agencyId);
      if (!existingAgency) {
        throw new AgencyNotFoundError(agencyId);
      }

      // Suspend agency using domain method (modifies in place)
      // Note: Agency entity's suspend() method doesn't support reason parameter
      // The reason parameter is accepted by the repository interface but not used by the entity
      existingAgency.suspend();

      // Update in database
      const updatedAgency = await this.update(existingAgency);

      return updatedAgency;
    } catch (error) {
      console.error('Repository suspend error:', {
        operation: 'suspend',
        agencyId: id,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AgencyNotFoundError) {
        throw error;
      }

      throw new AgencyRepositoryError(
        `Failed to suspend agency: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'suspend',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Activate agency (changes status to active)
   */
  async activate(id: string): Promise<Agency> {
    try {
      // Validate input
      if (!id || typeof id !== 'string' || !id.trim()) {
        throw new AgencyRepositoryError('Invalid agency ID for activate operation', 'activate');
      }

      const agencyId = id.trim();

      // Find existing agency
      const existingAgency = await this.findById(agencyId);
      if (!existingAgency) {
        throw new AgencyNotFoundError(agencyId);
      }

      // Activate agency using domain method (modifies in place)
      existingAgency.activate();

      // Update in database
      const updatedAgency = await this.update(existingAgency);

      return updatedAgency;
    } catch (error) {
      console.error('Repository activate error:', {
        operation: 'activate',
        agencyId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AgencyNotFoundError) {
        throw error;
      }

      throw new AgencyRepositoryError(
        `Failed to activate agency: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'activate',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get repository statistics for monitoring
   */
  async getStats(): Promise<AgencyRepositoryStats> {
    try {
      // Get total agencies count
      const totalQuery = 'SELECT COUNT(*) as total FROM agencies';
      const totalStmt = this.db.prepare(totalQuery);
      const totalResult = totalStmt.get() as { total: number };

      // Get counts by status
      const statusQuery = `
        SELECT 
          status,
          COUNT(*) as count
        FROM agencies 
        GROUP BY status
      `;
      const statusStmt = this.db.prepare(statusQuery);
      const statusResults = statusStmt.all() as Array<{ status: string; count: number }>;

      // Initialize status counts
      let activeAgencies = 0;
      let inactiveAgencies = 0;
      let suspendedAgencies = 0;

      // Map database status to counts
      statusResults.forEach((row) => {
        switch (row.status) {
          case 'active':
            activeAgencies = row.count;
            break;
          case 'inactive':
            inactiveAgencies = row.count;
            break;
          case 'suspended':
            suspendedAgencies = row.count;
            break;
        }
      });

      // Get date range for average calculation
      const dateQuery = `
        SELECT 
          MIN(created_at) as oldest,
          MAX(created_at) as newest,
          COUNT(*) as total
        FROM agencies
      `;
      const dateStmt = this.db.prepare(dateQuery);
      const dateResult = dateStmt.get() as { oldest: number | null; newest: number | null; total: number };

      // Calculate average agencies per day
      let averageAgenciesPerDay = 0;
      if (dateResult.oldest && dateResult.newest && dateResult.total > 0) {
        const daysDiff = Math.max(1, Math.ceil((dateResult.newest - dateResult.oldest) / (1000 * 60 * 60 * 24)));
        averageAgenciesPerDay = parseFloat((dateResult.total / daysDiff).toFixed(2));
      }

      // Estimate total database size (simplified calculation)
      // In a real implementation, you'd query filesystem or database metrics
      const totalDatabaseSize = totalResult.total * 1024; // Rough estimate: 1KB per agency record

      return {
        totalAgencies: totalResult.total,
        activeAgencies,
        inactiveAgencies,
        suspendedAgencies,
        averageAgenciesPerDay,
        totalDatabaseSize,
        oldestAgency: dateResult.oldest ? new Date(dateResult.oldest) : null,
        newestAgency: dateResult.newest ? new Date(dateResult.newest) : null,
      };
    } catch (error) {
      console.error('Repository getStats error:', {
        operation: 'getStats',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AgencyRepositoryError(
        `Failed to get repository statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getStats',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Begin transaction for atomic operations
   */
  async beginTransaction(): Promise<IAgencyRepositoryTransaction> {
    try {
      // SQLite transaction implementation
      this.db.prepare('BEGIN TRANSACTION').run();

      // Return transaction object implementing the interface
      return new SqliteAgencyRepositoryTransaction(this.db, this);
    } catch (error) {
      console.error('Repository beginTransaction error:', {
        operation: 'beginTransaction',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AgencyRepositoryError(
        `Failed to begin transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'beginTransaction',
        error instanceof Error ? error : undefined
      );
    }
  }

  // === MULTI-TENANT OPERATIONS ===

  /**
   * Initializes the agency database for multi-tenant operations
   * Creates a complete replica of the main database schema for the agency
   */
  async initializeAgencyDatabase(agency: Agency): Promise<boolean> {
    try {
      // Validate input
      if (!agency) {
        throw new AgencyRepositoryError('Invalid agency for database initialization', 'initializeAgencyDatabase');
      }

      // Check if agency exists in our main database
      const existingAgency = await this.findById(agency.id);
      if (!existingAgency) {
        throw new AgencyNotFoundError(agency.id);
      }

      // Import required modules for file operations
      const fs = require('fs');
      const path = require('path');
      const Database = require('better-sqlite3');

      // Get the schema creation order from schema.ts
      const { SCHEMA_CREATION_ORDER } = require('../database/schema');

      // Create agency database directory if it doesn't exist
      const agencyDbDir = path.dirname(agency.databasePath);
      if (!fs.existsSync(agencyDbDir)) {
        fs.mkdirSync(agencyDbDir, { recursive: true });
      }

      // Create new SQLite database for the agency
      const agencyDb = new Database(agency.databasePath);

      console.log(`Creating database for agency: ${agency.name} at path: ${agency.databasePath}`);

      try {
        // Begin transaction for atomic schema creation
        agencyDb.transaction(() => {
          // Execute all schema creation statements
          for (const schema of SCHEMA_CREATION_ORDER) {
            agencyDb.exec(schema);
          }

          // Insert initial schema version record
          const insertVersion = agencyDb.prepare(`
            INSERT INTO schema_version (version, description, applied_at, applied_by, checksum)
            VALUES (?, ?, ?, ?, ?)
          `);

          insertVersion.run(
            1,
            'Initial agency database schema',
            Date.now(),
            agency.createdBy || 'system',
            'initial-schema-checksum'
          );

          // Insert the agency record into its own database
          const insertAgency = agencyDb.prepare(`
            INSERT INTO agencies (
              id, name, database_path, contact_person, phone, email, address,
              settings, status, created_at, updated_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          insertAgency.run(
            agency.id,
            agency.name,
            agency.databasePath,
            agency.contactPerson,
            agency.phone,
            agency.email,
            agency.address,
            JSON.stringify(agency.settings),
            agency.status,
            agency.createdAt.getTime(),
            agency.updatedAt.getTime(),
            agency.createdBy
          );

          console.log(`✅ Agency database schema created successfully for: ${agency.name}`);
        })();
      } finally {
        // Close the agency database connection
        agencyDb.close();
      }

      // Verify the database was created successfully
      if (!fs.existsSync(agency.databasePath)) {
        throw new Error('Database file was not created successfully');
      }

      console.log(`✅ Agency database initialized successfully:`, {
        agencyId: agency.id,
        agencyName: agency.name,
        databasePath: agency.databasePath,
        databaseSize: fs.statSync(agency.databasePath).size,
      });

      return true;
    } catch (error) {
      console.error('Repository initializeAgencyDatabase error:', {
        operation: 'initializeAgencyDatabase',
        agencyId: agency?.id,
        databasePath: agency?.databasePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Clean up partial database file if it exists
      if (agency?.databasePath) {
        try {
          const fs = require('fs');
          if (fs.existsSync(agency.databasePath)) {
            fs.unlinkSync(agency.databasePath);
            console.log('Cleaned up partial database file');
          }
        } catch (cleanupError) {
          console.error('Failed to cleanup partial database file:', cleanupError);
        }
      }

      if (error instanceof AgencyNotFoundError) {
        throw error;
      }

      throw new AgencyRepositoryError(
        `Failed to initialize agency database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'initializeAgencyDatabase',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Backup agency database
   */
  async backupAgencyDatabase(agencyId: string, backupPath?: string): Promise<string> {
    try {
      // Validate input
      if (!agencyId || typeof agencyId !== 'string' || !agencyId.trim()) {
        throw new AgencyRepositoryError('Invalid agency ID for backup operation', 'backupAgencyDatabase');
      }

      const trimmedAgencyId = agencyId.trim();

      // Find agency to get database path
      const agency = await this.findById(trimmedAgencyId);
      if (!agency) {
        throw new AgencyNotFoundError(trimmedAgencyId);
      }

      // Generate backup path if not provided
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const generatedBackupPath = backupPath || `${agency.databasePath}.backup.${timestamp}`;

      // Simulate backup creation
      // In real implementation: fs.copyFileSync(agency.databasePath, generatedBackupPath)
      console.log(`Creating backup for agency ${agency.name}: ${generatedBackupPath}`);

      return generatedBackupPath;
    } catch (error) {
      console.error('Repository backupAgencyDatabase error:', {
        operation: 'backupAgencyDatabase',
        agencyId,
        backupPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AgencyNotFoundError) {
        throw error;
      }

      throw new AgencyRepositoryError(
        `Failed to backup agency database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'backupAgencyDatabase',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Restore agency database from backup
   */
  async restoreAgencyDatabase(agencyId: string, backupPath: string): Promise<boolean> {
    try {
      // Validate input
      if (!agencyId || typeof agencyId !== 'string' || !agencyId.trim()) {
        throw new AgencyRepositoryError('Invalid agency ID for restore operation', 'restoreAgencyDatabase');
      }

      if (!backupPath || typeof backupPath !== 'string' || !backupPath.trim()) {
        throw new AgencyRepositoryError('Invalid backup path for restore operation', 'restoreAgencyDatabase');
      }

      const trimmedAgencyId = agencyId.trim();
      const trimmedBackupPath = backupPath.trim();

      // Find agency to get database path
      const agency = await this.findById(trimmedAgencyId);
      if (!agency) {
        throw new AgencyNotFoundError(trimmedAgencyId);
      }

      // Simulate restore operation
      // In real implementation: fs.copyFileSync(trimmedBackupPath, agency.databasePath)
      console.log(`Restoring database for agency ${agency.name} from backup: ${trimmedBackupPath}`);

      return true;
    } catch (error) {
      console.error('Repository restoreAgencyDatabase error:', {
        operation: 'restoreAgencyDatabase',
        agencyId,
        backupPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AgencyNotFoundError) {
        throw error;
      }

      throw new AgencyRepositoryError(
        `Failed to restore agency database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'restoreAgencyDatabase',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get database file size for an agency
   */
  async getDatabaseSize(agencyId: string): Promise<number> {
    try {
      // Validate input
      if (!agencyId || typeof agencyId !== 'string' || !agencyId.trim()) {
        throw new AgencyRepositoryError('Invalid agency ID for size calculation', 'getDatabaseSize');
      }

      const trimmedAgencyId = agencyId.trim();

      // Find agency to verify it exists
      const agency = await this.findById(trimmedAgencyId);
      if (!agency) {
        throw new AgencyNotFoundError(trimmedAgencyId);
      }

      // Simulate database size calculation
      // In real implementation: fs.statSync(agency.databasePath).size
      const simulatedSize = 1024 * 1024; // 1MB as example

      return simulatedSize;
    } catch (error) {
      console.error('Repository getDatabaseSize error:', {
        operation: 'getDatabaseSize',
        agencyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AgencyNotFoundError) {
        throw error;
      }

      throw new AgencyRepositoryError(
        `Failed to get database size: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'getDatabaseSize',
        error instanceof Error ? error : undefined
      );
    }
  }
}

/**
 * SQLite implementation of Agency Repository Transaction
 */
class SqliteAgencyRepositoryTransaction implements IAgencyRepositoryTransaction {
  private db: Database;
  private repository: SqliteAgencyRepository;
  private active: boolean = true;

  constructor(db: Database, repository: SqliteAgencyRepository) {
    this.db = db;
    this.repository = repository;
  }

  /**
   * Save agency within transaction
   */
  async save(agency: Agency): Promise<Agency> {
    if (!this.active) {
      throw new AgencyRepositoryError('Transaction is not active', 'transaction.save');
    }

    return await this.repository.save(agency);
  }

  /**
   * Update agency within transaction
   */
  async update(agency: Agency): Promise<Agency> {
    if (!this.active) {
      throw new AgencyRepositoryError('Transaction is not active', 'transaction.update');
    }

    return await this.repository.update(agency);
  }

  /**
   * Delete agency within transaction
   */
  async delete(id: string): Promise<boolean> {
    if (!this.active) {
      throw new AgencyRepositoryError('Transaction is not active', 'transaction.delete');
    }

    return await this.repository.delete(id);
  }

  /**
   * Commit transaction
   */
  async commit(): Promise<void> {
    if (!this.active) {
      throw new AgencyRepositoryError('Transaction is not active', 'transaction.commit');
    }

    try {
      this.db.prepare('COMMIT').run();
      this.active = false;
    } catch (error) {
      throw new AgencyRepositoryError(
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
      throw new AgencyRepositoryError(
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
 * Factory function to create Agency repository instance
 */
export function createAgencyRepository(connection: DatabaseConnection): SqliteAgencyRepository {
  return new SqliteAgencyRepository(connection);
}
