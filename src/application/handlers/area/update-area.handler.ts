/**
 * Update Area Handler
 *
 * Handler for UpdateArea command following CQRS pattern.
 * Implements business logic for area updates with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with UPDATE_AREA permission can update areas
 * - Area must exist and be accessible by the user
 * - Area code cannot be changed once created
 * - Area name must be unique within agency scope (if changed)
 * - Geographic data validation for coordinates and boundaries
 *
 * @domain Area Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  UpdateAreaCommand,
  UpdateAreaCommandResult,
  validateUpdateAreaCommand,
  UpdateAreaCommandValidationError,
} from '../../commands/area/update-area.command';
import { Area } from '../../../domain/entities/area';
import { IAreaRepository } from '../../../domain/repositories/area.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission } from '../../../domain/value-objects/role';

/**
 * Handler for UpdateArea command
 * Implements business logic for area updates with proper authorization
 */
export class UpdateAreaHandler {
  constructor(
    private readonly areaRepository: IAreaRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handle UpdateArea command
   * @param command - UpdateArea command
   * @returns Promise<UpdateAreaCommandResult> - Command result
   */
  async handle(command: UpdateAreaCommand): Promise<UpdateAreaCommandResult> {
    try {
      // Validate command
      validateUpdateAreaCommand(command);

      // Verify user exists and has permission
      const user = await this.userRepository.findById(command.updatedBy);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (!user.hasPermission(Permission.UPDATE_AREA)) {
        return {
          success: false,
          error: 'Insufficient permissions to update areas',
        };
      }

      // Find existing area
      const existingArea = await this.areaRepository.findById(command.id);
      if (!existingArea) {
        return {
          success: false,
          error: 'Area not found',
        };
      }

      // Check if area name is being changed and if new name already exists
      if (command.areaName && command.areaName !== existingArea.areaName) {
        const existingAreaByName = await this.areaRepository.findByAreaName(command.areaName, existingArea.agencyId);
        if (existingAreaByName && existingAreaByName.id !== existingArea.id) {
          return {
            success: false,
            error: `Area with name '${command.areaName}' already exists in this agency`,
          };
        }
      }

      // Update the area entity
      const updateProps: any = {
        updatedBy: command.updatedBy,
      };

      if (command.areaName !== undefined) {
        updateProps.areaName = command.areaName;
      }
      if (command.description !== undefined) {
        updateProps.description = command.description;
      }
      if (command.coordinates !== undefined) {
        updateProps.coordinates = command.coordinates;
      }
      if (command.boundaries !== undefined) {
        updateProps.boundaries = command.boundaries;
      }
      if (command.status !== undefined) {
        updateProps.status = command.status;
      }

      const updatedArea = existingArea.update(updateProps);

      // Save to repository
      await this.areaRepository.update(updatedArea);

      return {
        success: true,
        areaId: updatedArea.id,
        areaCode: updatedArea.areaCode,
        areaName: updatedArea.areaName,
        agencyId: updatedArea.agencyId,
      };
    } catch (error) {
      console.error('Update area handler error:', {
        command: {
          id: command.id,
          areaName: command.areaName,
          updatedBy: command.updatedBy,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof UpdateAreaCommandValidationError) {
        return {
          success: false,
          error: 'Validation failed',
          validationErrors: error.validationErrors,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
