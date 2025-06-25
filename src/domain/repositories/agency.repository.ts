/**
 * Agency Repository Interface - Domain Layer
 *
 * Defines the contract for Agency entity persistence operations in a multi-tenant environment.
 * Implementation will be provided by infrastructure layer.
 *
 * @domain Repository Interface
 * @pattern Repository Pattern
 * @version 1.0.0
 */

import type { Agency, AgencyStatus } from '../entities/agency';

/**
 * Agency repository specific errors
 */
export class AgencyRepositoryError extends Error {
  public readonly operation: string;
  public readonly cause: Error | undefined;

  constructor(message: string, operation: string, cause?: Error) {
    super(message);
    this.name = 'AgencyRepositoryError';
    this.operation = operation;
    this.cause = cause;
  }
}

export class AgencyNotFoundError extends AgencyRepositoryError {
  constructor(identifier: string, identifierType: string = 'id') {
    super(`Agency not found with ${identifierType}: ${identifier}`, 'find');
    this.name = 'AgencyNotFoundError';
  }
}

export class AgencyAlreadyExistsError extends AgencyRepositoryError {
  constructor(identifier: string, identifierType: string = 'name') {
    super(`Agency already exists with ${identifierType}: ${identifier}`, 'save');
    this.name = 'AgencyAlreadyExistsError';
  }
}

export class AgencyRepositoryConnectionError extends AgencyRepositoryError {
  constructor(message: string, cause?: Error) {
    super(message, 'connection', cause);
    this.name = 'AgencyRepositoryConnectionError';
  }
}

/**
 * Agency search criteria for filtering and pagination
 */
export interface AgencySearchCriteria {
  // Text search
  readonly searchTerm?: string; // Searches in name, contactPerson
  readonly name?: string; // Exact name match
  readonly contactPerson?: string; // Contact person filter

  // Status filtering
  readonly status?: AgencyStatus | AgencyStatus[];
  readonly isOperational?: boolean; // Active status only

  // Business settings filtering
  readonly allowsCreditSales?: boolean;
  readonly currency?: string;

  // Date range filtering
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly updatedAfter?: Date;
  readonly updatedBefore?: Date;

  // Pagination
  readonly limit?: number; // Default: 100, Max: 10000
  readonly offset?: number; // Default: 0

  // Sorting
  readonly sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'status';
  readonly sortOrder?: 'ASC' | 'DESC'; // Default: ASC
}

/**
 * Agency search result with pagination metadata
 */
export interface AgencySearchResult {
  readonly agencies: readonly Agency[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

/**
 * Agency repository statistics for monitoring
 */
export interface AgencyRepositoryStats {
  readonly totalAgencies: number;
  readonly activeAgencies: number;
  readonly inactiveAgencies: number;
  readonly suspendedAgencies: number;
  readonly averageAgenciesPerDay: number;
  readonly totalDatabaseSize: number; // in bytes
  readonly oldestAgency: Date | null;
  readonly newestAgency: Date | null;
}

/**
 * Agency repository transaction interface for atomic operations
 */
export interface IAgencyRepositoryTransaction {
  /**
   * Save agency within transaction
   */
  save(agency: Agency): Promise<Agency>;

  /**
   * Update agency within transaction
   */
  update(agency: Agency): Promise<Agency>;

  /**
   * Delete agency within transaction
   */
  delete(id: string): Promise<boolean>;

  /**
   * Commit transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback transaction
   */
  rollback(): Promise<void>;

  /**
   * Check if transaction is active
   */
  isActive(): boolean;
}

/**
 * Agency Repository Interface
 *
 * Defines the contract for Agency entity persistence operations.
 * Supports multi-tenant architecture with isolated agency data.
 *
 * @interface IAgencyRepository
 */
export interface IAgencyRepository {
  /**
   * Save a new agency to the repository
   * @param agency - Agency entity to save
   * @returns Promise<Agency> - Saved agency with updated metadata
   * @throws {AgencyAlreadyExistsError} When agency with name already exists
   * @throws {AgencyRepositoryError} When save operation fails
   */
  save(agency: Agency): Promise<Agency>;

  /**
   * Update an existing agency in the repository
   * @param agency - Agency entity with updates
   * @returns Promise<Agency> - Updated agency entity
   * @throws {AgencyNotFoundError} When agency doesn't exist
   * @throws {AgencyRepositoryError} When update operation fails
   */
  update(agency: Agency): Promise<Agency>;

  /**
   * Find agency by unique identifier
   * @param id - Agency ID
   * @returns Promise<Agency | null> - Agency entity or null if not found
   * @throws {AgencyRepositoryError} When find operation fails
   */
  findById(id: string): Promise<Agency | null>;

  /**
   * Find agency by name (unique constraint)
   * @param name - Agency name
   * @returns Promise<Agency | null> - Agency entity or null if not found
   * @throws {AgencyRepositoryError} When find operation fails
   */
  findByName(name: string): Promise<Agency | null>;

  /**
   * Find agency by database path (unique constraint)
   * @param databasePath - Database file path
   * @returns Promise<Agency | null> - Agency entity or null if not found
   * @throws {AgencyRepositoryError} When find operation fails
   */
  findByDatabasePath(databasePath: string): Promise<Agency | null>;

  /**
   * Check if agency exists by name
   * @param name - Agency name
   * @returns Promise<boolean> - True if agency exists
   * @throws {AgencyRepositoryError} When check operation fails
   */
  existsByName(name: string): Promise<boolean>;

  /**
   * Check if agency exists by database path
   * @param databasePath - Database file path
   * @returns Promise<boolean> - True if agency exists
   * @throws {AgencyRepositoryError} When check operation fails
   */
  existsByDatabasePath(databasePath: string): Promise<boolean>;

  /**
   * Search agencies with filtering and pagination
   * @param criteria - Search criteria and pagination options
   * @returns Promise<AgencySearchResult> - Paginated search results
   * @throws {AgencyRepositoryError} When search operation fails
   */
  search(criteria: AgencySearchCriteria): Promise<AgencySearchResult>;

  /**
   * Find all agencies (with optional limit for safety)
   * @param limit - Maximum number of agencies to return (default: 1000)
   * @returns Promise<readonly Agency[]> - Array of all agencies
   * @throws {AgencyRepositoryError} When find operation fails
   */
  findAll(limit?: number): Promise<readonly Agency[]>;

  /**
   * Find agencies by status
   * @param status - Agency status
   * @param limit - Maximum number of agencies to return
   * @returns Promise<readonly Agency[]> - Array of agencies with specified status
   * @throws {AgencyRepositoryError} When find operation fails
   */
  findByStatus(status: AgencyStatus, limit?: number): Promise<readonly Agency[]>;

  /**
   * Find all operational agencies (active status)
   * @param limit - Maximum number of agencies to return
   * @returns Promise<readonly Agency[]> - Array of operational agencies
   * @throws {AgencyRepositoryError} When find operation fails
   */
  findOperational(limit?: number): Promise<readonly Agency[]>;

  /**
   * Count total number of agencies
   * @returns Promise<number> - Total agency count
   * @throws {AgencyRepositoryError} When count operation fails
   */
  count(): Promise<number>;

  /**
   * Count agencies by specific criteria
   * @param criteria - Count criteria
   * @returns Promise<number> - Count of matching agencies
   * @throws {AgencyRepositoryError} When count operation fails
   */
  countByCriteria(criteria: Partial<AgencySearchCriteria>): Promise<number>;

  /**
   * Delete agency by ID (hard delete - removes agency and all related data)
   * WARNING: This is destructive and will remove all agency data
   * @param id - Agency ID
   * @returns Promise<boolean> - True if agency was deleted
   * @throws {AgencyNotFoundError} When agency doesn't exist
   * @throws {AgencyRepositoryError} When delete operation fails
   */
  delete(id: string): Promise<boolean>;

  /**
   * Suspend agency (changes status to suspended)
   * @param id - Agency ID
   * @param reason - Suspension reason for audit
   * @returns Promise<Agency> - Updated agency entity
   * @throws {AgencyNotFoundError} When agency doesn't exist
   * @throws {AgencyRepositoryError} When suspend operation fails
   */
  suspend(id: string, reason?: string): Promise<Agency>;

  /**
   * Activate agency (changes status to active)
   * @param id - Agency ID
   * @returns Promise<Agency> - Updated agency entity
   * @throws {AgencyNotFoundError} When agency doesn't exist
   * @throws {AgencyRepositoryError} When activate operation fails
   */
  activate(id: string): Promise<Agency>;

  /**
   * Get repository statistics for monitoring
   * @returns Promise<AgencyRepositoryStats> - Repository statistics
   * @throws {AgencyRepositoryError} When stats operation fails
   */
  getStats(): Promise<AgencyRepositoryStats>;

  /**
   * Check repository health and connectivity
   * @returns Promise<boolean> - True if repository is healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Begin transaction for atomic operations
   * @returns Promise<IAgencyRepositoryTransaction> - Transaction context
   * @throws {AgencyRepositoryError} When transaction start fails
   */
  beginTransaction(): Promise<IAgencyRepositoryTransaction>;

  /**
   * Initialize agency database (creates agency-specific database file)
   * @param agency - Agency entity
   * @returns Promise<boolean> - True if database was successfully initialized
   * @throws {AgencyRepositoryError} When database initialization fails
   */
  initializeAgencyDatabase(agency: Agency): Promise<boolean>;

  /**
   * Backup agency database
   * @param agencyId - Agency ID
   * @param backupPath - Path for backup file
   * @returns Promise<string> - Path to created backup file
   * @throws {AgencyNotFoundError} When agency doesn't exist
   * @throws {AgencyRepositoryError} When backup operation fails
   */
  backupAgencyDatabase(agencyId: string, backupPath?: string): Promise<string>;

  /**
   * Restore agency database from backup
   * @param agencyId - Agency ID
   * @param backupPath - Path to backup file
   * @returns Promise<boolean> - True if restore was successful
   * @throws {AgencyNotFoundError} When agency doesn't exist
   * @throws {AgencyRepositoryError} When restore operation fails
   */
  restoreAgencyDatabase(agencyId: string, backupPath: string): Promise<boolean>;

  /**
   * Get database file size for an agency
   * @param agencyId - Agency ID
   * @returns Promise<number> - Database file size in bytes
   * @throws {AgencyNotFoundError} When agency doesn't exist
   * @throws {AgencyRepositoryError} When size calculation fails
   */
  getDatabaseSize(agencyId: string): Promise<number>;
}
