/**
 * Get Area By ID Handler
 *
 * Handler for getting a single area by its ID.
 * Implements proper authorization and multi-tenant isolation.
 *
 * Business Rules:
 * - Only users with VIEW_AREA permission can view areas
 * - Users can only see areas from their accessible agencies
 * - Area must exist and be accessible
 *
 * @domain Area Management
 * @pattern Query Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import { IAreaRepository } from '../../../domain/repositories/area.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Area } from '../../../domain/entities/area';
import { Permission } from '../../../domain/value-objects/role';

/**
 * Get Area By ID Request Interface
 */
export interface GetAreaByIdRequest {
  readonly id: string;
  readonly requestedBy: string;
}

/**
 * Get Area By ID Result Interface
 */
export interface GetAreaByIdResult {
  readonly success: boolean;
  readonly area?: Area;
  readonly error?: string;
}

/**
 * Handler for getting area by ID
 */
export class GetAreaByIdHandler {
  constructor(
    private readonly areaRepository: IAreaRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handle GetAreaById request
   * @param request - GetAreaById request
   * @returns Promise<GetAreaByIdResult> - Query result
   */
  async handle(request: GetAreaByIdRequest): Promise<GetAreaByIdResult> {
    try {
      // Validate request
      if (!request.id || typeof request.id !== 'string' || request.id.trim().length === 0) {
        return {
          success: false,
          error: 'Area ID is required',
        };
      }

      if (!request.requestedBy || typeof request.requestedBy !== 'string' || request.requestedBy.trim().length === 0) {
        return {
          success: false,
          error: 'Requested by is required',
        };
      }

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

      // Find area
      const area = await this.areaRepository.findById(request.id);
      if (!area) {
        return {
          success: false,
          error: 'Area not found',
        };
      }

      return {
        success: true,
        area,
      };
    } catch (error) {
      console.error('Get area by ID handler error:', {
        request: {
          id: request.id,
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
