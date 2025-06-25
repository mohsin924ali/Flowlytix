/**
 * Update Agency Handler
 *
 * Handler for UpdateAgency command following CQRS pattern.
 * Implements business logic for agency updates with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with MANAGE_SETTINGS permission can update agencies
 * - Agency name must remain unique system-wide if changed
 * - Database path cannot be changed after creation
 * - Agency must exist and be accessible
 * - Settings must be coherent and valid
 * - Contact information validation
 * - Status changes follow business rules
 *
 * @domain Agency Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture - Multi-tenant
 * @version 1.0.0
 */

import {
  UpdateAgencyCommand,
  UpdateAgencyCommandResult,
  validateUpdateAgencyCommand,
  createUpdateAgencyDomainObjects,
  validateUpdateAgencyBusinessRules,
  UpdateAgencyCommandValidationError,
} from '../../commands/agency/update-agency.command';
import { Agency, AgencyStatus } from '../../../domain/entities/agency';
import { IAgencyRepository } from '../../../domain/repositories/agency.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission, SystemRole } from '../../../domain/value-objects/role';

/**
 * Result interface for UpdateAgency handler
 */
export interface UpdateAgencyResult extends UpdateAgencyCommandResult {
  readonly code?: string;
  readonly data?: any;
}

/**
 * Handler for UpdateAgency command
 * Implements business logic for agency updates with proper authorization
 */
export class UpdateAgencyHandler {
  constructor(
    private readonly agencyRepository: IAgencyRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles agency update command
   * @param command - UpdateAgency command
   * @returns Promise<UpdateAgencyResult> - Result with updated agency info
   * @throws {Error} When validation fails or unauthorized
   */
  async handle(command: UpdateAgencyCommand): Promise<UpdateAgencyResult> {
    try {
      // Validate command structure
      validateUpdateAgencyCommand(command);

      // Validate business rules
      validateUpdateAgencyBusinessRules(command);

      // Get the user who is updating this agency (for authorization)
      let updatingUser;
      try {
        updatingUser = await this.userRepository.findById(command.updatedBy);
        if (!updatingUser) {
          return {
            success: false,
            agencyId: command.agencyId,
            agencyName: '',
            isOperational: false,
            error: 'Updating user not found',
            code: 'USER_NOT_FOUND_ERROR',
          };
        }
      } catch (error) {
        return {
          success: false,
          agencyId: command.agencyId,
          agencyName: '',
          isOperational: false,
          error: 'Failed to validate updating user',
          code: 'USER_REPOSITORY_ERROR',
        };
      }

      // Check authorization - only users with MANAGE_SETTINGS permission can update agencies
      if (!updatingUser.hasPermission(Permission.MANAGE_SETTINGS)) {
        return {
          success: false,
          agencyId: command.agencyId,
          agencyName: '',
          isOperational: false,
          error: 'Insufficient permissions to update agency',
          code: 'PERMISSION_ERROR',
        };
      }

      // Get the existing agency
      let existingAgency;
      try {
        existingAgency = await this.agencyRepository.findById(command.agencyId);
        if (!existingAgency) {
          return {
            success: false,
            agencyId: command.agencyId,
            agencyName: '',
            isOperational: false,
            error: 'Agency not found',
            code: 'AGENCY_NOT_FOUND',
          };
        }
      } catch (error) {
        return {
          success: false,
          agencyId: command.agencyId,
          agencyName: '',
          isOperational: false,
          error: 'Failed to find agency',
          code: 'AGENCY_REPOSITORY_ERROR',
        };
      }

      // Check if user can access this agency
      if (!this.canUserUpdateAgency(updatingUser, existingAgency)) {
        return {
          success: false,
          agencyId: command.agencyId,
          agencyName: '',
          isOperational: false,
          error: 'Insufficient permissions to update this agency',
          code: 'PERMISSION_ERROR',
        };
      }

      // Check uniqueness constraints if name is being updated
      if (command.name && command.name !== existingAgency.name) {
        try {
          const existingAgencyByName = await this.agencyRepository.findByName(command.name);
          if (existingAgencyByName && existingAgencyByName.id !== command.agencyId) {
            return {
              success: false,
              agencyId: command.agencyId,
              agencyName: '',
              isOperational: false,
              error: 'Agency with this name already exists',
              code: 'DUPLICATE_NAME_ERROR',
            };
          }
        } catch (error) {
          return {
            success: false,
            agencyId: command.agencyId,
            agencyName: '',
            isOperational: false,
            error: 'Failed to validate agency name',
            code: 'NAME_VALIDATION_ERROR',
          };
        }
      }

      // Validate role-based business rules for updates
      try {
        this.validateRoleBasedUpdateRules(command, updatingUser, existingAgency);
      } catch (error) {
        return {
          success: false,
          agencyId: command.agencyId,
          agencyName: '',
          isOperational: false,
          error: error instanceof Error ? error.message : 'Role-based validation failed',
          code: 'ROLE_VALIDATION_ERROR',
        };
      }

      // Create domain value objects for update
      const { email, settings } = createUpdateAgencyDomainObjects(command);

      // Prepare update data
      const updateData: any = {};

      // Add fields that are being updated
      if (command.name !== undefined) {
        updateData.name = command.name;
      }
      if (command.contactPerson !== undefined) {
        updateData.contactPerson = command.contactPerson;
      }
      if (command.phone !== undefined) {
        updateData.phone = command.phone;
      }
      if (email !== undefined) {
        updateData.email = email ? email.value : null;
      }
      if (command.address !== undefined) {
        updateData.address = command.address;
      }
      if (settings !== undefined) {
        updateData.settings = settings;
      }
      if (command.status !== undefined) {
        updateData.status = command.status;
      }

      // Update the agency using domain methods
      if (updateData.name || updateData.contactPerson || updateData.phone || updateData.email || updateData.address) {
        existingAgency.updateBasicInfo(updateData);
      }

      if (updateData.settings) {
        existingAgency.updateSettings(updateData.settings);
      }

      if (updateData.status && updateData.status !== existingAgency.status) {
        this.updateAgencyStatus(existingAgency, updateData.status, updatingUser);
      }

      // Save updated agency to repository
      try {
        await this.agencyRepository.update(existingAgency);
      } catch (error) {
        return {
          success: false,
          agencyId: command.agencyId,
          agencyName: '',
          isOperational: false,
          error: 'Failed to update agency',
          code: 'AGENCY_UPDATE_ERROR',
        };
      }

      return {
        success: true,
        agencyId: existingAgency.id,
        agencyName: existingAgency.name,
        isOperational: existingAgency.isOperational(),
        data: {
          agencyId: existingAgency.id,
          agencyName: existingAgency.name,
          isOperational: existingAgency.isOperational(),
        },
      };
    } catch (error) {
      console.error('Update agency handler error:', {
        command: {
          agencyId: command.agencyId,
          updatedBy: command.updatedBy,
          reason: command.reason,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Handle validation errors specifically
      if (error instanceof UpdateAgencyCommandValidationError) {
        return {
          success: false,
          agencyId: command.agencyId,
          agencyName: '',
          isOperational: false,
          error: error.message,
          validationErrors: error.validationErrors,
          code: 'VALIDATION_ERROR',
        };
      }

      // Handle business rule violations
      if (error instanceof Error) {
        if (error.message.includes('Credit days should be 1 when credit sales are disabled')) {
          return {
            success: false,
            agencyId: command.agencyId,
            agencyName: '',
            isOperational: false,
            error: error.message,
            code: 'BUSINESS_RULE_VIOLATION',
          };
        }
        if (error.message.includes('At least one field must be provided for update')) {
          return {
            success: false,
            agencyId: command.agencyId,
            agencyName: '',
            isOperational: false,
            error: error.message,
            code: 'BUSINESS_RULE_VIOLATION',
          };
        }
      }

      return {
        success: false,
        agencyId: command.agencyId,
        agencyName: '',
        isOperational: false,
        error: 'An unexpected error occurred while updating agency',
        code: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Checks if user can update the specified agency
   * @param user - User attempting the update
   * @param agency - Agency being updated
   * @returns boolean indicating permission
   */
  private canUserUpdateAgency(user: any, agency: Agency): boolean {
    // Super admins can update any agency
    if (user.role.value === SystemRole.SUPER_ADMIN) {
      return true;
    }

    // Admins can update any agency
    if (user.role.value === SystemRole.ADMIN) {
      return true;
    }

    // Other users can only update their own agency (if they have permission)
    // This would require agency-user relationship which might be implemented later
    return true; // For now, allow if user has MANAGE_SETTINGS permission
  }

  /**
   * Validates role-based rules for agency updates
   * @param command - Update command
   * @param user - User performing update
   * @param agency - Existing agency
   * @throws {Error} When role-based rules are violated
   */
  private validateRoleBasedUpdateRules(command: UpdateAgencyCommand, user: any, agency: Agency): void {
    // Non-standard currency updates require admin role
    if (command.settings?.currency && command.settings.currency !== 'USD') {
      if (!user.hasPermission(Permission.MANAGE_SETTINGS) || user.role.value === SystemRole.VIEWER) {
        throw new Error('Insufficient permissions to set non-standard currency');
      }
    }

    // Status changes to suspended require admin role
    if (command.status === AgencyStatus.SUSPENDED) {
      if (user.role.value !== SystemRole.ADMIN && user.role.value !== SystemRole.SUPER_ADMIN) {
        throw new Error('Only administrators can suspend agencies');
      }
    }

    // Inventory tracking changes require specific permission
    if (command.settings?.enableInventoryTracking && !user.hasPermission(Permission.MANAGE_STOCK)) {
      throw new Error('Insufficient permissions to enable inventory tracking');
    }
  }

  /**
   * Updates agency status using appropriate domain methods
   * @param agency - Agency to update
   * @param newStatus - New status to set
   * @param user - User performing the update
   */
  private updateAgencyStatus(agency: Agency, newStatus: AgencyStatus, user: any): void {
    const currentStatus = agency.status;

    switch (newStatus) {
      case AgencyStatus.ACTIVE:
        if (currentStatus === AgencyStatus.INACTIVE) {
          agency.activate();
        } else if (currentStatus === AgencyStatus.SUSPENDED) {
          agency.unsuspend();
        }
        break;

      case AgencyStatus.INACTIVE:
        if (currentStatus === AgencyStatus.ACTIVE) {
          agency.deactivate();
        }
        break;

      case AgencyStatus.SUSPENDED:
        if (currentStatus === AgencyStatus.ACTIVE) {
          agency.suspend();
        }
        break;

      default:
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }
}

/**
 * Factory function to create UpdateAgencyHandler instance
 * @param agencyRepository - Agency repository
 * @param userRepository - User repository
 * @returns UpdateAgencyHandler instance
 */
export function createUpdateAgencyHandler(
  agencyRepository: IAgencyRepository,
  userRepository: IUserRepository
): UpdateAgencyHandler {
  return new UpdateAgencyHandler(agencyRepository, userRepository);
}
