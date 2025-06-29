/**
 * Area Repository Interface
 *
 * Domain repository interface for area persistence operations.
 * Defines the contract for area data access following Repository pattern.
 *
 * Features:
 * - CRUD operations for areas
 * - Agency-scoped area management
 * - Area search and filtering capabilities
 * - Unique constraint validation
 * - Multi-tenant isolation
 * - Pagination and sorting support
 *
 * @domain Area Management
 * @pattern Repository
 * @version 1.0.0
 */

import { Area, AreaStatus } from '../entities/area';

/**
 * Area search and filter criteria
 */
export interface AreaSearchCriteria {
  readonly agencyId: string;
  readonly status?: AreaStatus;
  readonly searchText?: string; // Search in area code, name, description
  readonly hasCoordinates?: boolean;
  readonly hasBoundaries?: boolean;
  readonly createdBy?: string;
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly updatedAfter?: Date;
  readonly updatedBefore?: Date;
}

/**
 * Area sort options
 */
export interface AreaSortOptions {
  readonly field: 'areaCode' | 'areaName' | 'status' | 'createdAt' | 'updatedAt';
  readonly direction: 'asc' | 'desc';
}

/**
 * Pagination options for area queries
 */
export interface PaginationOptions {
  readonly page: number;
  readonly limit: number;
}

/**
 * Paginated area result
 */
export interface PaginatedAreaResult {
  readonly areas: Area[];
  readonly totalCount: number;
  readonly totalPages: number;
  readonly currentPage: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

/**
 * Area repository specific errors
 */
export class AreaRepositoryError extends Error {
  public readonly operation: string;
  public readonly cause: Error | undefined;

  constructor(message: string, operation: string, cause?: Error) {
    super(message);
    this.name = 'AreaRepositoryError';
    this.operation = operation;
    this.cause = cause;
  }
}

export class AreaNotFoundError extends AreaRepositoryError {
  constructor(identifier: string, operation: string) {
    super(`Area not found: ${identifier}`, operation);
    this.name = 'AreaNotFoundError';
  }
}

export class AreaAlreadyExistsError extends AreaRepositoryError {
  constructor(identifier: string, operation: string) {
    super(`Area already exists: ${identifier}`, operation);
    this.name = 'AreaAlreadyExistsError';
  }
}

export class AreaConstraintViolationError extends AreaRepositoryError {
  constructor(constraint: string, operation: string) {
    super(`Area constraint violation: ${constraint}`, operation);
    this.name = 'AreaConstraintViolationError';
  }
}

/**
 * Area repository statistics
 */
export interface AreaRepositoryStats {
  readonly totalAreas: number;
  readonly activeAreas: number;
  readonly inactiveAreas: number;
  readonly areasWithCoordinates: number;
  readonly areasWithBoundaries: number;
  readonly lastCreated: Date | null;
  readonly lastUpdated: Date | null;
}

/**
 * Area Repository Interface
 *
 * Defines the contract for Area entity persistence operations.
 * Implementation will be provided by infrastructure layer.
 *
 * @interface IAreaRepository
 */
export interface IAreaRepository {
  /**
   * Save a new area to the repository
   * @param area - Area entity to save
   * @returns Promise<Area> - Saved area with updated metadata
   * @throws {AreaAlreadyExistsError} When area with code/name already exists in agency
   * @throws {AreaRepositoryError} When save operation fails
   */
  save(area: Area): Promise<Area>;

  /**
   * Update an existing area in the repository
   * @param area - Area entity with updates
   * @returns Promise<Area> - Updated area entity
   * @throws {AreaNotFoundError} When area doesn't exist
   * @throws {AreaRepositoryError} When update operation fails
   */
  update(area: Area): Promise<Area>;

  /**
   * Find area by unique identifier
   * @param id - Area ID
   * @returns Promise<Area | null> - Area entity or null if not found
   * @throws {AreaRepositoryError} When find operation fails
   */
  findById(id: string): Promise<Area | null>;

  /**
   * Find area by code within agency (unique constraint)
   * @param areaCode - Area code
   * @param agencyId - Agency ID
   * @returns Promise<Area | null> - Area entity or null if not found
   * @throws {AreaRepositoryError} When find operation fails
   */
  findByAreaCode(areaCode: string, agencyId: string): Promise<Area | null>;

  /**
   * Find area by name within agency (unique constraint)
   * @param areaName - Area name
   * @param agencyId - Agency ID
   * @returns Promise<Area | null> - Area entity or null if not found
   * @throws {AreaRepositoryError} When find operation fails
   */
  findByAreaName(areaName: string, agencyId: string): Promise<Area | null>;

  /**
   * Check if area exists by code within agency
   * @param areaCode - Area code
   * @param agencyId - Agency ID
   * @param excludeAreaId - Area ID to exclude from check (for updates)
   * @returns Promise<boolean> - True if area exists
   * @throws {AreaRepositoryError} When check operation fails
   */
  existsByAreaCode(areaCode: string, agencyId: string, excludeAreaId?: string): Promise<boolean>;

  /**
   * Check if area exists by name within agency
   * @param areaName - Area name
   * @param agencyId - Agency ID
   * @param excludeAreaId - Area ID to exclude from check (for updates)
   * @returns Promise<boolean> - True if area exists
   * @throws {AreaRepositoryError} When check operation fails
   */
  existsByAreaName(areaName: string, agencyId: string, excludeAreaId?: string): Promise<boolean>;

  /**
   * Delete area by ID
   * @param id - Area ID
   * @returns Promise<boolean> - True if area was deleted
   * @throws {AreaNotFoundError} When area doesn't exist
   * @throws {AreaRepositoryError} When delete operation fails
   */
  deleteById(id: string): Promise<boolean>;

  /**
   * Find all areas for an agency
   * @param agencyId - Agency ID
   * @param includeInactive - Whether to include inactive areas
   * @returns Promise<Area[]> - Array of agency areas
   * @throws {AreaRepositoryError} When find operation fails
   */
  findByAgencyId(agencyId: string, includeInactive?: boolean): Promise<Area[]>;

  /**
   * Search areas with criteria
   * @param criteria - Search criteria
   * @param sort - Sort options
   * @param pagination - Pagination options
   * @returns Promise<PaginatedAreaResult> - Paginated area results
   * @throws {AreaRepositoryError} When search fails
   */
  search(
    criteria: AreaSearchCriteria,
    sort?: AreaSortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedAreaResult>;

  /**
   * Count areas by status within agency
   * @param agencyId - Agency ID
   * @param status - Area status
   * @returns Promise<number> - Count of areas with status
   * @throws {AreaRepositoryError} When count operation fails
   */
  countByStatus(agencyId: string, status: AreaStatus): Promise<number>;

  /**
   * Find areas with geographic coordinates
   * @param agencyId - Agency ID
   * @returns Promise<Area[]> - Areas with coordinates
   * @throws {AreaRepositoryError} When find operation fails
   */
  findAreasWithCoordinates(agencyId: string): Promise<Area[]>;

  /**
   * Find areas with defined boundaries
   * @param agencyId - Agency ID
   * @returns Promise<Area[]> - Areas with boundaries
   * @throws {AreaRepositoryError} When find operation fails
   */
  findAreasWithBoundaries(agencyId: string): Promise<Area[]>;

  /**
   * Get repository statistics for an agency
   * @param agencyId - Agency ID
   * @returns Promise<AreaRepositoryStats> - Repository statistics
   * @throws {AreaRepositoryError} When stats operation fails
   */
  getStats(agencyId: string): Promise<AreaRepositoryStats>;

  /**
   * Check repository health and connectivity
   * @returns Promise<boolean> - True if repository is healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Begin transaction for atomic operations
   * @returns Promise<IAreaRepositoryTransaction> - Transaction context
   * @throws {AreaRepositoryError} When transaction start fails
   */
  beginTransaction(): Promise<IAreaRepositoryTransaction>;
}

/**
 * Area Repository Transaction Interface
 *
 * Provides transactional operations for atomic area management.
 * Ensures data consistency across multiple operations.
 */
export interface IAreaRepositoryTransaction {
  /**
   * Save area within transaction
   * @param area - Area entity to save
   * @returns Promise<Area> - Saved area
   */
  save(area: Area): Promise<Area>;

  /**
   * Update area within transaction
   * @param area - Area entity to update
   * @returns Promise<Area> - Updated area
   */
  update(area: Area): Promise<Area>;

  /**
   * Delete area within transaction
   * @param id - Area ID to delete
   * @returns Promise<boolean> - Success status
   */
  delete(id: string): Promise<boolean>;

  /**
   * Commit transaction changes
   * @returns Promise<void>
   * @throws {AreaRepositoryError} When commit fails
   */
  commit(): Promise<void>;

  /**
   * Rollback transaction changes
   * @returns Promise<void>
   * @throws {AreaRepositoryError} When rollback fails
   */
  rollback(): Promise<void>;

  /**
   * Check if transaction is active
   * @returns boolean - True if transaction is active
   */
  isActive(): boolean;
}
