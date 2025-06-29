/**
 * Get Areas Handler
 *
 * Handler for getting areas with search and filtering capabilities.
 * Implements proper authorization and multi-tenant isolation.
 *
 * Business Rules:
 * - Only users with VIEW_AREA permission can view areas
 * - Users can only see areas from their accessible agencies
 * - Supports filtering by status, search text, and geographic data
 * - Supports pagination and sorting
 *
 * @domain Area Management
 * @pattern Query Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  IAreaRepository,
  AreaSearchCriteria,
  AreaSortOptions,
  PaginationOptions,
  PaginatedAreaResult,
} from '../../../domain/repositories/area.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission } from '../../../domain/value-objects/role';
import { AreaStatus } from '../../../domain/entities/area';

/**
 * Get Areas Request Interface
 */
export interface GetAreasRequest {
  readonly agencyId: string;
  readonly status?: AreaStatus;
  readonly searchText?: string;
  readonly hasCoordinates?: boolean;
  readonly hasBoundaries?: boolean;
  readonly includeInactive?: boolean;
  readonly sort?: {
    readonly field: 'areaCode' | 'areaName' | 'status' | 'createdAt' | 'updatedAt';
    readonly direction: 'asc' | 'desc';
  };
  readonly pagination?: {
    readonly page: number;
    readonly limit: number;
  };
  readonly requestedBy: string;
}

/**
 * Get Areas Result Interface
 */
export interface GetAreasResult {
  readonly success: boolean;
  readonly areas?: PaginatedAreaResult;
  readonly error?: string;
}

/**
 * Handler for getting areas
 */
export class GetAreasHandler {
  constructor(
    private readonly areaRepository: IAreaRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handle GetAreas request
   * @param request - GetAreas request
   * @returns Promise<GetAreasResult> - Query result
   */
  async handle(request: GetAreasRequest): Promise<GetAreasResult> {
    try {
      // Verify user exists and has permission
      const user = await this.userRepository.findById(request.requestedBy);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (!user.hasPermission(Permission.VIEW_AREA)) {
        return {
          success: false,
          error: 'Insufficient permissions to view areas',
        };
      }

      // Build search criteria
      const criteria: AreaSearchCriteria = {
        agencyId: request.agencyId,
        ...(request.status && { status: request.status }),
        ...(request.searchText && { searchText: request.searchText }),
        ...(request.hasCoordinates !== undefined && { hasCoordinates: request.hasCoordinates }),
        ...(request.hasBoundaries !== undefined && { hasBoundaries: request.hasBoundaries }),
      };

      // Build sort options
      const sort: AreaSortOptions | undefined = request.sort
        ? {
            field: request.sort.field,
            direction: request.sort.direction,
          }
        : undefined;

      // Build pagination options
      const pagination: PaginationOptions | undefined = request.pagination
        ? {
            page: request.pagination.page,
            limit: request.pagination.limit,
          }
        : undefined;

      // Search areas
      const areas = await this.areaRepository.search(criteria, sort, pagination);

      return {
        success: true,
        areas,
      };
    } catch (error) {
      console.error('Get areas handler error:', {
        request: {
          agencyId: request.agencyId,
          requestedBy: request.requestedBy,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
