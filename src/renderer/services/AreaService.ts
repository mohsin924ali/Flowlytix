/**
 * Area Service
 *
 * Frontend service for area management operations.
 * Handles communication with main process via IPC with proper
 * error handling, validation, and type safety.
 *
 * Features:
 * - Area CRUD operations
 * - Search and filtering with pagination
 * - Geographic data handling
 * - Multi-tenant support
 * - Comprehensive error handling
 * - Type-safe operations
 *
 * @domain Area Management
 * @pattern Service Layer
 * @architecture Frontend Service
 * @version 1.0.0
 */

/**
 * Area Data Types
 */
export interface Area {
  id: string;
  agencyId: string;
  areaCode: string;
  areaName: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  boundaries?: GeoJSONPolygon;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface AreaCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Area Request Types
 */
export interface CreateAreaRequest {
  agencyId: string;
  areaCode: string;
  areaName: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  boundaries?: GeoJSONPolygon;
  createdBy: string;
}

export interface UpdateAreaRequest {
  id: string;
  areaName?: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  boundaries?: GeoJSONPolygon | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface AreaSearchOptions {
  agencyId: string;
  includeInactive?: boolean;
  searchText?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  hasCoordinates?: boolean;
  hasBoundaries?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'areaCode' | 'areaName' | 'status' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Area Response Types
 */
export interface AreasListResponse {
  areas: Area[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AreaStats {
  totalAreas: number;
  activeAreas: number;
  inactiveAreas: number;
  areasWithCoordinates: number;
  areasWithBoundaries: number;
  lastCreated: string | null;
  lastUpdated: string | null;
}

/**
 * Service Response Types
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Area Service Error Types
 */
export class AreaServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AreaServiceError';
  }
}

export class AreaValidationError extends AreaServiceError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'AreaValidationError';
  }
}

export class AreaNotFoundError extends AreaServiceError {
  constructor(identifier: string) {
    super(`Area not found: ${identifier}`, 'AREA_NOT_FOUND');
    this.name = 'AreaNotFoundError';
  }
}

export class AreaAlreadyExistsError extends AreaServiceError {
  constructor(identifier: string) {
    super(`Area already exists: ${identifier}`, 'AREA_ALREADY_EXISTS');
    this.name = 'AreaAlreadyExistsError';
  }
}

/**
 * IPC Channel Constants
 */
const AREA_IPC_CHANNELS = {
  CREATE_AREA: 'area:create',
  UPDATE_AREA: 'area:update',
  DELETE_AREA: 'area:delete',
  GET_AREAS: 'area:get-all',
  GET_AREA_BY_ID: 'area:get-by-id',
  GET_AREA_BY_CODE: 'area:get-by-code',
  GET_AREA_STATS: 'area:get-stats',
  SEARCH_AREAS: 'area:search',
} as const;

/**
 * Area Service Implementation
 */
export class AreaService {
  /**
   * Create a new area
   */
  static async createArea(request: CreateAreaRequest): Promise<Area> {
    try {
      // Validate required fields
      if (!request.agencyId?.trim()) {
        throw new AreaValidationError('Agency ID is required');
      }
      if (!request.areaCode?.trim()) {
        throw new AreaValidationError('Area code is required');
      }
      if (!request.areaName?.trim()) {
        throw new AreaValidationError('Area name is required');
      }
      if (!request.createdBy?.trim()) {
        throw new AreaValidationError('Created by is required');
      }

      // Validate area code format
      if (!/^[A-Z0-9_-]{2,20}$/.test(request.areaCode.trim())) {
        throw new AreaValidationError(
          'Area code must be 2-20 characters, uppercase letters, numbers, underscore, or dash only'
        );
      }

      // Validate area name length
      if (request.areaName.trim().length < 2 || request.areaName.trim().length > 100) {
        throw new AreaValidationError('Area name must be between 2 and 100 characters');
      }

      // Validate coordinates if provided
      if (request.latitude !== undefined || request.longitude !== undefined) {
        if (request.latitude === undefined || request.longitude === undefined) {
          throw new AreaValidationError('Both latitude and longitude must be provided together');
        }
        if (request.latitude < -90 || request.latitude > 90) {
          throw new AreaValidationError('Latitude must be between -90 and 90');
        }
        if (request.longitude < -180 || request.longitude > 180) {
          throw new AreaValidationError('Longitude must be between -180 and 180');
        }
      }

      // Validate boundaries if provided
      if (request.boundaries) {
        this.validateGeoJSONPolygon(request.boundaries);
      }

      // Prepare IPC request
      const ipcRequest = {
        ...request,
        boundaries: request.boundaries ? JSON.stringify(request.boundaries) : undefined,
      };

      // Call main process
      const response: ServiceResponse<Area> = await (window.electronAPI as any).area.createArea(ipcRequest);

      if (!response.success) {
        throw new AreaServiceError(
          response.error?.message || 'Failed to create area',
          response.error?.code || 'UNKNOWN_ERROR',
          response.error?.details
        );
      }

      if (!response.data) {
        throw new AreaServiceError('No data returned from create operation', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      if (error instanceof AreaServiceError) {
        throw error;
      }
      throw new AreaServiceError(
        `Failed to create area: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Update an existing area
   */
  static async updateArea(request: UpdateAreaRequest): Promise<Area> {
    try {
      // Validate required fields
      if (!request.id?.trim()) {
        throw new AreaValidationError('Area ID is required');
      }

      // Validate area name if provided
      if (request.areaName !== undefined && request.areaName !== null) {
        if (request.areaName.trim().length < 2 || request.areaName.trim().length > 100) {
          throw new AreaValidationError('Area name must be between 2 and 100 characters');
        }
      }

      // Validate coordinates if provided
      if (request.latitude !== undefined || request.longitude !== undefined) {
        if (request.latitude === null || request.longitude === null) {
          // Allow clearing coordinates by setting both to null
          if (!(request.latitude === null && request.longitude === null)) {
            throw new AreaValidationError('Both latitude and longitude must be null to clear coordinates');
          }
        } else {
          // Validate coordinate values
          if (request.latitude === undefined || request.longitude === undefined) {
            throw new AreaValidationError('Both latitude and longitude must be provided together');
          }
          if (request.latitude < -90 || request.latitude > 90) {
            throw new AreaValidationError('Latitude must be between -90 and 90');
          }
          if (request.longitude < -180 || request.longitude > 180) {
            throw new AreaValidationError('Longitude must be between -180 and 180');
          }
        }
      }

      // Validate boundaries if provided
      if (request.boundaries !== undefined && request.boundaries !== null) {
        this.validateGeoJSONPolygon(request.boundaries);
      }

      // Prepare IPC request
      const ipcRequest = {
        ...request,
        boundaries:
          request.boundaries === null ? null : request.boundaries ? JSON.stringify(request.boundaries) : undefined,
      };

      // Call main process
      const response: ServiceResponse<Area> = await (window.electronAPI as any).area.updateArea(ipcRequest);

      if (!response.success) {
        throw new AreaServiceError(
          response.error?.message || 'Failed to update area',
          response.error?.code || 'UNKNOWN_ERROR',
          response.error?.details
        );
      }

      if (!response.data) {
        throw new AreaServiceError('No data returned from update operation', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      if (error instanceof AreaServiceError) {
        throw error;
      }
      throw new AreaServiceError(
        `Failed to update area: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Delete an area
   */
  static async deleteArea(id: string, reason?: string): Promise<boolean> {
    try {
      // Validate required fields
      if (!id?.trim()) {
        throw new AreaValidationError('Area ID is required');
      }

      // Call main process
      const response: ServiceResponse<boolean> = await (window.electronAPI as any).area.deleteArea({
        id: id.trim(),
        reason: reason?.trim(),
      });

      if (!response.success) {
        throw new AreaServiceError(
          response.error?.message || 'Failed to delete area',
          response.error?.code || 'UNKNOWN_ERROR',
          response.error?.details
        );
      }

      return response.data || false;
    } catch (error) {
      if (error instanceof AreaServiceError) {
        throw error;
      }
      throw new AreaServiceError(
        `Failed to delete area: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Get areas with search and pagination
   */
  static async getAreas(options: AreaSearchOptions): Promise<AreasListResponse> {
    try {
      // Validate required fields
      if (!options.agencyId?.trim()) {
        throw new AreaValidationError('Agency ID is required');
      }

      // Validate pagination if provided
      if (options.page !== undefined && options.page < 1) {
        throw new AreaValidationError('Page must be greater than 0');
      }
      if (options.limit !== undefined && (options.limit < 1 || options.limit > 1000)) {
        throw new AreaValidationError('Limit must be between 1 and 1000');
      }

      // Call main process
      const response: ServiceResponse<AreasListResponse> = await (window.electronAPI as any).area.getAreas(options);

      if (!response.success) {
        throw new AreaServiceError(
          response.error?.message || 'Failed to get areas',
          response.error?.code || 'UNKNOWN_ERROR',
          response.error?.details
        );
      }

      if (!response.data) {
        throw new AreaServiceError('No data returned from get areas operation', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      if (error instanceof AreaServiceError) {
        throw error;
      }
      throw new AreaServiceError(
        `Failed to get areas: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Get area by ID
   */
  static async getAreaById(id: string, userAgencyId: string): Promise<Area | null> {
    try {
      // Validate required fields
      if (!id?.trim()) {
        throw new AreaValidationError('Area ID is required');
      }
      if (!userAgencyId?.trim()) {
        throw new AreaValidationError('User agency ID is required');
      }

      // Call main process
      const response: ServiceResponse<Area | null> = await (window.electronAPI as any).area.getAreaById({
        id: id.trim(),
        userAgencyId: userAgencyId.trim(),
      });

      if (!response.success) {
        throw new AreaServiceError(
          response.error?.message || 'Failed to get area by ID',
          response.error?.code || 'UNKNOWN_ERROR',
          response.error?.details
        );
      }

      return response.data || null;
    } catch (error) {
      if (error instanceof AreaServiceError) {
        throw error;
      }
      throw new AreaServiceError(
        `Failed to get area by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Get area by code
   */
  static async getAreaByCode(areaCode: string, agencyId: string): Promise<Area | null> {
    try {
      // Validate required fields
      if (!areaCode?.trim()) {
        throw new AreaValidationError('Area code is required');
      }
      if (!agencyId?.trim()) {
        throw new AreaValidationError('Agency ID is required');
      }

      // Call main process
      const response: ServiceResponse<Area | null> = await (window.electronAPI as any).area.getAreaByCode({
        areaCode: areaCode.trim(),
        agencyId: agencyId.trim(),
      });

      if (!response.success) {
        throw new AreaServiceError(
          response.error?.message || 'Failed to get area by code',
          response.error?.code || 'UNKNOWN_ERROR',
          response.error?.details
        );
      }

      return response.data || null;
    } catch (error) {
      if (error instanceof AreaServiceError) {
        throw error;
      }
      throw new AreaServiceError(
        `Failed to get area by code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Get area statistics
   */
  static async getAreaStats(agencyId: string): Promise<AreaStats> {
    try {
      // Validate required fields
      if (!agencyId?.trim()) {
        throw new AreaValidationError('Agency ID is required');
      }

      // Call main process
      const response: ServiceResponse<AreaStats> = await (window.electronAPI as any).area.getAreaStats({
        agencyId: agencyId.trim(),
      });

      if (!response.success) {
        throw new AreaServiceError(
          response.error?.message || 'Failed to get area stats',
          response.error?.code || 'UNKNOWN_ERROR',
          response.error?.details
        );
      }

      if (!response.data) {
        throw new AreaServiceError('No data returned from get area stats operation', 'NO_DATA');
      }

      return response.data;
    } catch (error) {
      if (error instanceof AreaServiceError) {
        throw error;
      }
      throw new AreaServiceError(
        `Failed to get area stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Validate GeoJSON Polygon
   */
  private static validateGeoJSONPolygon(polygon: GeoJSONPolygon): void {
    if (!polygon || typeof polygon !== 'object') {
      throw new AreaValidationError('Invalid polygon: must be an object');
    }

    if (polygon.type !== 'Polygon') {
      throw new AreaValidationError('Invalid polygon: type must be "Polygon"');
    }

    if (!Array.isArray(polygon.coordinates) || polygon.coordinates.length === 0) {
      throw new AreaValidationError('Invalid polygon: coordinates must be a non-empty array');
    }

    // Validate each ring
    for (let i = 0; i < polygon.coordinates.length; i++) {
      const ring = polygon.coordinates[i];

      if (!Array.isArray(ring) || ring.length < 4) {
        throw new AreaValidationError(`Invalid polygon: ring ${i} must have at least 4 coordinates`);
      }

      // Validate each coordinate
      for (let j = 0; j < ring.length; j++) {
        const coord = ring[j];

        if (!Array.isArray(coord) || coord.length !== 2) {
          throw new AreaValidationError(`Invalid polygon: coordinate ${j} in ring ${i} must be [longitude, latitude]`);
        }

        const [longitude, latitude] = coord;

        if (typeof longitude !== 'number' || typeof latitude !== 'number') {
          throw new AreaValidationError(`Invalid polygon: coordinate ${j} in ring ${i} must be numbers`);
        }

        if (longitude < -180 || longitude > 180) {
          throw new AreaValidationError(
            `Invalid polygon: longitude ${longitude} in ring ${i} must be between -180 and 180`
          );
        }

        if (latitude < -90 || latitude > 90) {
          throw new AreaValidationError(
            `Invalid polygon: latitude ${latitude} in ring ${i} must be between -90 and 90`
          );
        }
      }

      // Check if ring is closed
      const firstCoord = ring[0];
      const lastCoord = ring[ring.length - 1];

      if (!firstCoord || !lastCoord) {
        throw new AreaValidationError(`Invalid polygon: ring ${i} missing coordinates`);
      }

      if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
        throw new AreaValidationError(
          `Invalid polygon: ring ${i} must be closed (first and last coordinates must be the same)`
        );
      }
    }
  }
}

export default AreaService;
