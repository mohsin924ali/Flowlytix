/**
 * Create Area Handler
 *
 * Handler for CreateArea command following CQRS pattern.
 * Implements business logic for area creation with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with CREATE_AREA permission can create areas
 * - Area code must be unique within agency scope
 * - Area name must be unique within agency scope
 * - Agency must exist and be operational
 * - Geographic data validation for coordinates and boundaries
 *
 * @domain Area Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  CreateAreaCommand,
  CreateAreaCommandResult,
  validateCreateAreaCommand,
  CreateAreaCommandValidationError,
} from '../../commands/area/create-area.command';
import { Area, AreaStatus } from '../../../domain/entities/area';
import { IAreaRepository } from '../../../domain/repositories/area.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { IAgencyRepository } from '../../../domain/repositories/agency.repository';
import { Permission } from '../../../domain/value-objects/role';

/**
 * Handler for CreateArea command
 * Implements business logic for area creation with proper authorization
 */
export class CreateAreaHandler {
  constructor(
    private readonly areaRepository: IAreaRepository,
    private readonly userRepository: IUserRepository,
    private readonly agencyRepository: IAgencyRepository
  ) {}

  /**
   * Handle CreateArea command
   * @param command - CreateArea command
   * @returns Promise<CreateAreaCommandResult> - Command result
   */
  async handle(command: CreateAreaCommand): Promise<CreateAreaCommandResult> {
    try {
      // Validate command
      validateCreateAreaCommand(command);

      // Verify user exists and has permission
      const user = await this.userRepository.findById(command.createdBy);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (!user.hasPermission(Permission.CREATE_AREA)) {
        return {
          success: false,
          error: 'Insufficient permissions to create areas',
        };
      }

      // Verify agency exists and is operational
      const agency = await this.agencyRepository.findById(command.agencyId);
      if (!agency) {
        return {
          success: false,
          error: 'Agency not found',
        };
      }

      if (!agency.isOperational()) {
        return {
          success: false,
          error: 'Agency is not operational',
        };
      }

      // Check if area code already exists within agency
      const existingAreaByCode = await this.areaRepository.findByAreaCode(command.areaCode, command.agencyId);
      if (existingAreaByCode) {
        return {
          success: false,
          error: `Area with code '${command.areaCode}' already exists in this agency`,
        };
      }

      // Check if area name already exists within agency
      const existingAreaByName = await this.areaRepository.findByAreaName(command.areaName, command.agencyId);
      if (existingAreaByName) {
        return {
          success: false,
          error: `Area with name '${command.areaName}' already exists in this agency`,
        };
      }

      // Create the area entity
      const areaProps: any = {
        areaCode: command.areaCode,
        areaName: command.areaName,
        agencyId: command.agencyId,
        createdBy: command.createdBy,
        status: command.status || AreaStatus.ACTIVE,
      };

      // Add optional properties only if they exist
      if (command.description !== undefined) {
        areaProps.description = command.description;
      }
      if (command.coordinates !== undefined) {
        areaProps.coordinates = command.coordinates;
      }
      if (command.boundaries !== undefined) {
        areaProps.boundaries = command.boundaries;
      }

      const newArea = Area.create(areaProps);

      // Save to repository
      await this.areaRepository.save(newArea);

      return {
        success: true,
        areaId: newArea.id,
        areaCode: newArea.areaCode,
        areaName: newArea.areaName,
        agencyId: newArea.agencyId,
      };
    } catch (error) {
      console.error('Create area handler error:', {
        command: {
          areaCode: command.areaCode,
          areaName: command.areaName,
          agencyId: command.agencyId,
          createdBy: command.createdBy,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof CreateAreaCommandValidationError) {
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
