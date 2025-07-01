/**
 * Mock Area Service
 *
 * Mock implementation of AreaService for frontend-only operation.
 * Implements all the same interfaces and methods as the real service.
 *
 * @domain Area Management
 * @pattern Service Layer - Mock Implementation
 * @architecture Clean Architecture - Mock Layer
 * @version 1.0.0
 */

import {
  mockAreas,
  getAreasByAgency,
  getAreasByStatus,
  searchAreas,
  getAreaById,
  getAreaByCode,
} from '../data/areas.mock';

/**
 * Area interface matching AreaService
 */
export interface Area {
  readonly id: string;
  readonly areaCode: string;
  readonly areaName: string;
  readonly description?: string;
  readonly status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  readonly agencyId: string;
  readonly agencyName?: string;
  readonly parentAreaId?: string;
  readonly parentAreaCode?: string;
  readonly level: number;
  readonly sortOrder: number;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly boundaries?: any;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy?: string;
  readonly updatedAt?: Date;
}

/**
 * Create Area Request interface
 */
export interface CreateAreaRequest {
  readonly agencyId: string;
  readonly areaCode: string;
  readonly areaName: string;
  readonly description?: string;
  readonly parentAreaId?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly boundaries?: any;
  readonly createdBy: string;
}

/**
 * Update Area Request interface
 */
export interface UpdateAreaRequest {
  readonly areaId: string;
  readonly areaName?: string;
  readonly description?: string;
  readonly status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  readonly parentAreaId?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly boundaries?: any;
  readonly updatedBy: string;
}

/**
 * Get Areas Request interface
 */
export interface GetAreasRequest {
  readonly agencyId: string;
  readonly page?: number;
  readonly limit?: number;
  readonly searchText?: string;
  readonly status?: string;
  readonly parentAreaId?: string;
  readonly includeInactive?: boolean;
  readonly sortBy?: string;
  readonly sortDirection?: 'asc' | 'desc';
}

/**
 * Areas Response interface
 */
export interface AreasResponse {
  readonly areas: Area[];
  readonly totalCount: number;
  readonly page: number;
  readonly limit: number;
  readonly hasMore: boolean;
}

/**
 * Mock Area Service Implementation
 * Provides same interface as real AreaService but uses mock data
 */
export class MockAreaService {
  /**
   * Simulated network delay for realistic testing
   */
  private static readonly MOCK_DELAY = 400;

  /**
   * Add artificial delay to simulate network calls
   */
  private static async delay(ms: number = MockAreaService.MOCK_DELAY): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get areas with filtering and pagination
   * @param request - Get areas request parameters
   * @returns Promise<AreasResponse> - Areas list with pagination
   */
  static async getAreas(request: GetAreasRequest): Promise<AreasResponse> {
    try {
      console.log('🗺️ MockAreaService.getAreas called with:', request);

      // Simulate network delay
      await this.delay();

      // Start with all areas for the agency
      let filteredAreas = getAreasByAgency(request.agencyId);

      // Apply search filter
      if (request.searchText && request.searchText.trim().length > 0) {
        const searchResults = searchAreas(request.searchText.trim());
        filteredAreas = filteredAreas.filter((area) => searchResults.some((result) => result.id === area.id));
        console.log(`🔍 Applied search filter "${request.searchText}", found ${filteredAreas.length} areas`);
      }

      // Apply status filter
      if (request.status && request.status.trim().length > 0) {
        filteredAreas = filteredAreas.filter((area) => area.status === request.status);
        console.log(`📊 Applied status filter "${request.status}", found ${filteredAreas.length} areas`);
      }

      // Apply parent area filter
      if (request.parentAreaId && request.parentAreaId.trim().length > 0) {
        filteredAreas = filteredAreas.filter((area) => area.parentAreaId === request.parentAreaId);
        console.log(`🏗️ Applied parent area filter "${request.parentAreaId}", found ${filteredAreas.length} areas`);
      }

      // Filter inactive areas if not explicitly included
      if (!request.includeInactive) {
        filteredAreas = filteredAreas.filter((area) => area.status === 'ACTIVE');
        console.log(`✅ Filtered to active areas only, found ${filteredAreas.length} areas`);
      }

      // Apply sorting
      const sortBy = request.sortBy || 'areaCode';
      const sortDirection = request.sortDirection || 'asc';

      filteredAreas.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
          case 'areaCode':
            aValue = a.areaCode.toLowerCase();
            bValue = b.areaCode.toLowerCase();
            break;
          case 'areaName':
            aValue = a.areaName.toLowerCase();
            bValue = b.areaName.toLowerCase();
            break;
          case 'status':
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case 'createdAt':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          case 'level':
            aValue = a.level;
            bValue = b.level;
            break;
          case 'sortOrder':
            aValue = a.sortOrder;
            bValue = b.sortOrder;
            break;
          default:
            aValue = a.areaCode.toLowerCase();
            bValue = b.areaCode.toLowerCase();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      console.log(`🔄 Applied sorting by ${sortBy} ${sortDirection}`);

      // Apply pagination
      const page = request.page || 1;
      const limit = request.limit || 25;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const totalCount = filteredAreas.length;
      const paginatedAreas = filteredAreas.slice(startIndex, endIndex);
      const hasMore = endIndex < totalCount;

      console.log(`📄 Applied pagination: page=${page}, limit=${limit}, total=${totalCount}, hasMore=${hasMore}`);
      console.log(`✅ MockAreaService.getAreas successful, returning ${paginatedAreas.length} areas`);

      return {
        areas: paginatedAreas,
        totalCount,
        page,
        limit,
        hasMore,
      };
    } catch (error) {
      console.error('❌ MockAreaService.getAreas error:', error);
      return {
        areas: [],
        totalCount: 0,
        page: request.page || 1,
        limit: request.limit || 25,
        hasMore: false,
      };
    }
  }

  /**
   * Create a new area
   * @param request - Area creation parameters
   * @returns Promise<Area> - Created area
   */
  static async createArea(request: CreateAreaRequest): Promise<Area> {
    try {
      console.log('🗺️ MockAreaService.createArea called with:', request);

      // Simulate network delay
      await this.delay();

      // Validate required fields
      if (!request.areaCode || !request.areaName || !request.agencyId) {
        throw new Error('Area code, name, and agency ID are required');
      }

      // Check if area code already exists in agency
      const existingArea = getAreaByCode(request.areaCode, request.agencyId);
      if (existingArea) {
        throw new Error('Area code already exists in this agency');
      }

      // Generate new area ID
      const newAreaId = `area-${Date.now()}`;

      // Create new area object
      const newArea: Area = {
        id: newAreaId,
        areaCode: request.areaCode,
        areaName: request.areaName,
        status: 'ACTIVE' as const,
        agencyId: request.agencyId,
        level: request.parentAreaId ? 2 : 1, // Simple level calculation
        sortOrder: 1, // Default sort order
        createdBy: request.createdBy,
        createdAt: new Date(),
        ...(request.description && { description: request.description }),
        ...(request.parentAreaId && { parentAreaId: request.parentAreaId }),
        ...(request.latitude !== undefined && { latitude: request.latitude }),
        ...(request.longitude !== undefined && { longitude: request.longitude }),
        ...(request.boundaries && { boundaries: request.boundaries }),
      };

      console.log(`✅ MockAreaService.createArea successful, created area: ${newAreaId}`);
      return newArea;
    } catch (error) {
      console.error('❌ MockAreaService.createArea error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create area');
    }
  }

  /**
   * Update an existing area
   * @param request - Area update parameters
   * @returns Promise<Area> - Updated area
   */
  static async updateArea(request: UpdateAreaRequest): Promise<Area> {
    try {
      console.log(`🗺️ MockAreaService.updateArea called for ${request.areaId} with:`, request);

      // Simulate network delay
      await this.delay();

      const area = getAreaById(request.areaId);

      if (!area) {
        throw new Error('Area not found');
      }

      // Create updated area (in real implementation, this would update the database)
      const updatedArea: Area = {
        ...area,
        ...(request.areaName && { areaName: request.areaName }),
        ...(request.description !== undefined && { description: request.description }),
        ...(request.status && { status: request.status }),
        ...(request.parentAreaId !== undefined && { parentAreaId: request.parentAreaId }),
        ...(request.latitude !== undefined && { latitude: request.latitude }),
        ...(request.longitude !== undefined && { longitude: request.longitude }),
        ...(request.boundaries !== undefined && { boundaries: request.boundaries }),
        updatedBy: request.updatedBy,
        updatedAt: new Date(),
      };

      console.log(`✅ MockAreaService.updateArea successful for ${request.areaId}`);
      return updatedArea;
    } catch (error) {
      console.error('❌ MockAreaService.updateArea error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update area');
    }
  }

  /**
   * Get area by ID
   * @param areaId - Area ID to retrieve
   * @returns Promise<Area | null> - Area details or null if not found
   */
  static async getAreaById(areaId: string): Promise<Area | null> {
    try {
      console.log(`🗺️ MockAreaService.getAreaById called for: ${areaId}`);

      // Simulate network delay
      await this.delay(200);

      const area = getAreaById(areaId);

      if (!area) {
        console.log(`❌ Area not found: ${areaId}`);
        return null;
      }

      console.log(`✅ MockAreaService.getAreaById successful for ${areaId}`);
      return area;
    } catch (error) {
      console.error('❌ MockAreaService.getAreaById error:', error);
      return null;
    }
  }

  /**
   * Get area by code
   * @param areaCode - Area code to search for
   * @param agencyId - Agency ID to search within
   * @returns Promise<Area | null> - Area details or null if not found
   */
  static async getAreaByCode(areaCode: string, agencyId: string): Promise<Area | null> {
    try {
      console.log(`🗺️ MockAreaService.getAreaByCode called for code: ${areaCode}, agency: ${agencyId}`);

      // Simulate network delay
      await this.delay(200);

      const area = getAreaByCode(areaCode, agencyId);

      if (!area) {
        console.log(`❌ Area not found: ${areaCode} in agency ${agencyId}`);
        return null;
      }

      console.log(`✅ MockAreaService.getAreaByCode successful for ${areaCode}`);
      return area;
    } catch (error) {
      console.error('❌ MockAreaService.getAreaByCode error:', error);
      return null;
    }
  }

  /**
   * Delete area
   * @param areaId - Area ID to delete
   * @param deletedBy - ID of user performing deletion
   * @returns Promise<boolean> - Deletion success
   */
  static async deleteArea(areaId: string, deletedBy: string): Promise<boolean> {
    try {
      console.log(`🗺️ MockAreaService.deleteArea called for ${areaId} by ${deletedBy}`);

      // Simulate network delay
      await this.delay();

      const area = getAreaById(areaId);

      if (!area) {
        throw new Error('Area not found');
      }

      // Check if area has child areas (business rule)
      const childAreas = mockAreas.filter((a) => a.parentAreaId === areaId);
      if (childAreas.length > 0) {
        throw new Error('Cannot delete area with child areas');
      }

      // In real implementation, this would perform soft delete
      console.log(`✅ MockAreaService.deleteArea successful for ${areaId}`);
      return true;
    } catch (error) {
      console.error('❌ MockAreaService.deleteArea error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete area');
    }
  }

  /**
   * Get area statistics for dashboard
   * @param agencyId - Agency ID to get stats for
   * @returns Promise with area statistics
   */
  static async getAreaStats(agencyId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    topLevel: number;
  }> {
    try {
      await this.delay(100); // Shorter delay for stats

      const agencyAreas = getAreasByAgency(agencyId);

      const stats = {
        total: agencyAreas.length,
        active: agencyAreas.filter((a) => a.status === 'ACTIVE').length,
        inactive: agencyAreas.filter((a) => a.status === 'INACTIVE').length,
        suspended: agencyAreas.filter((a) => a.status === 'SUSPENDED').length,
        topLevel: agencyAreas.filter((a) => a.level === 1).length,
      };

      console.log('📊 MockAreaService.getAreaStats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ MockAreaService.getAreaStats error:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
        topLevel: 0,
      };
    }
  }
}
