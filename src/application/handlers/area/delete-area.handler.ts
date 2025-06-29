/**
 * Delete Area Handler
 *
 * Handler for DeleteArea command following CQRS pattern.
 * Implements business logic for area deletion with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with DELETE_AREA permission can delete areas
 * - Area must exist and be accessible by the user
 * - Deletion should be logged for compliance and audit trail
 * - Physical deletion is performed (not soft delete for now)
 *
 * @domain Area Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  DeleteAreaCommand,
  DeleteAreaCommandResult,
  validateDeleteAreaCommand,
  DeleteAreaCommandValidationError,
} from '../../commands/area/delete-area.command';
import { IAreaRepository } from '../../../domain/repositories/area.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission } from '../../../domain/value-objects/role';

/**
 * Handler for DeleteArea command
 * Implements business logic for area deletion with proper authorization
 */
export class DeleteAreaHandler {
  constructor(
    private readonly areaRepository: IAreaRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handle DeleteArea command
   * @param command - DeleteArea command
   * @returns Promise<DeleteAreaCommandResult> - Command result
   */
  async handle(command: DeleteAreaCommand): Promise<DeleteAreaCommandResult> {
    try {
      // Validate command
      validateDeleteAreaCommand(command);

      // Verify user exists and has permission
      const user = await this.userRepository.findById(command.deletedBy);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (!user.hasPermission(Permission.DELETE_AREA)) {
        return {
          success: false,
          error: 'Insufficient permissions to delete areas',
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

      // TODO: Add dependency checks when customer/order repositories are available
      // For now, allow deletion without dependency checks

      // Delete the area
      const deleted = await this.areaRepository.deleteById(command.id);

      if (!deleted) {
        return {
          success: false,
          error: 'Failed to delete area',
        };
      }

      // Log deletion for audit trail
      console.log('Area deleted:', {
        areaId: existingArea.id,
        areaCode: existingArea.areaCode,
        areaName: existingArea.areaName,
        agencyId: existingArea.agencyId,
        deletedBy: command.deletedBy,
        reason: command.reason,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        areaId: existingArea.id,
        areaCode: existingArea.areaCode,
        areaName: existingArea.areaName,
        agencyId: existingArea.agencyId,
      };
    } catch (error) {
      console.error('Delete area handler error:', {
        command: {
          id: command.id,
          deletedBy: command.deletedBy,
          reason: command.reason,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof DeleteAreaCommandValidationError) {
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
