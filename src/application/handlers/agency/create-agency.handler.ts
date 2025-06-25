/**
 * Create Agency Handler
 *
 * Handler for CreateAgency command following CQRS pattern.
 * Implements business logic for agency creation with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with CREATE_AGENCY permission can create agencies
 * - Agency name must be unique system-wide
 * - Database path must be unique and valid
 * - Business settings must be coherent and valid
 * - Contact information validation
 * - Multi-tenant database initialization
 *
 * @domain Agency Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture - Multi-tenant
 * @version 1.0.0
 */

import {
  CreateAgencyCommand,
  validateCreateAgencyCommand,
  createAgencyDomainObjects,
  validateAgencyBusinessRules,
} from '../../commands/agency/create-agency.command';
import { Agency, AgencyStatus } from '../../../domain/entities/agency';
import { IAgencyRepository } from '../../../domain/repositories/agency.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission, SystemRole } from '../../../domain/value-objects/role';

/**
 * Result interface for CreateAgency handler
 */
export interface CreateAgencyResult {
  readonly success: boolean;
  readonly agencyId: string;
  readonly databasePath: string;
  readonly isOperational: boolean;
  readonly error?: string;
}

/**
 * Handler for CreateAgency command
 * Implements business logic for agency creation with proper authorization
 */
export class CreateAgencyHandler {
  constructor(
    private readonly agencyRepository: IAgencyRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles agency creation command
   * @param command - CreateAgency command
   * @returns Promise<CreateAgencyResult> - Result with agency ID and status
   * @throws {Error} When validation fails or unauthorized
   */
  async handle(command: CreateAgencyCommand): Promise<CreateAgencyResult> {
    try {
      // Validate command structure
      validateCreateAgencyCommand(command);

      // Validate business rules
      validateAgencyBusinessRules(command);

      // Get the user who is creating this agency (for authorization)
      const creatingUser = await this.userRepository.findById(command.createdBy);
      if (!creatingUser) {
        throw new Error('Creating user not found');
      }

      // Check authorization - only users with MANAGE_SETTINGS permission can create agencies
      if (!creatingUser.hasPermission(Permission.MANAGE_SETTINGS)) {
        throw new Error('Insufficient permissions to create agency');
      }

      // Check if agency with same name already exists (system-wide uniqueness)
      const existingAgencyByName = await this.agencyRepository.findByName(command.name);
      if (existingAgencyByName) {
        throw new Error('Agency with this name already exists');
      }

      // Check if agency with same database path already exists
      const existingAgencyByPath = await this.agencyRepository.findByDatabasePath(command.databasePath);
      if (existingAgencyByPath) {
        throw new Error('Agency with this database path already exists');
      }

      // Validate role-based business rules
      this.validateRoleBasedRules(command, creatingUser);

      // Create domain value objects
      const { email, settings } = createAgencyDomainObjects(command);

      // Create the agency entity with appropriate initial status
      const agencyProps: any = {
        name: command.name,
        databasePath: command.databasePath,
        settings,
        createdBy: command.createdBy,
        // Set initial status based on user role - only auto-activate for admin users
        status: this.shouldAutoActivateAgency(creatingUser) ? AgencyStatus.ACTIVE : AgencyStatus.INACTIVE,
      };

      // Add optional properties only if they exist
      if (command.contactPerson !== undefined) {
        agencyProps.contactPerson = command.contactPerson;
      }
      if (command.phone !== undefined) {
        agencyProps.phone = command.phone;
      }
      if (email !== undefined) {
        agencyProps.email = email.value;
      }
      if (command.address !== undefined) {
        agencyProps.address = command.address;
      }

      const newAgency = Agency.create(agencyProps, command.createdBy);

      // Save to repository
      await this.agencyRepository.save(newAgency);

      // Initialize agency database (multi-tenant setup)
      await this.initializeAgencyDatabase(newAgency);

      return {
        success: true,
        agencyId: newAgency.id,
        databasePath: newAgency.databasePath,
        isOperational: newAgency.isOperational(),
      };
    } catch (error) {
      console.error('Create agency handler error:', {
        command: {
          name: command.name,
          databasePath: command.databasePath,
          createdBy: command.createdBy,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        agencyId: '',
        databasePath: '',
        isOperational: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Validates role-based business rules for agency creation
   * @param command - Create agency command
   * @param creatingUser - User creating the agency
   * @throws {Error} When business rules are violated
   */
  private validateRoleBasedRules(command: CreateAgencyCommand, creatingUser: any): void {
    // Credit sales authorization based on user role
    if (command.settings.allowCreditSales) {
      const maxCreditLimit = this.getMaxCreditLimitForUser(creatingUser);

      if (command.settings.maxCreditLimit > maxCreditLimit) {
        throw new Error(
          `Maximum credit limit ${command.settings.maxCreditLimit} exceeds limit ${maxCreditLimit} for your role`
        );
      }

      // Validate credit days based on role
      const maxCreditDays = this.getMaxCreditDaysForUser(creatingUser);
      if (command.settings.defaultCreditDays > maxCreditDays) {
        throw new Error(
          `Default credit days ${command.settings.defaultCreditDays} exceeds limit ${maxCreditDays} for your role`
        );
      }
    }

    // Tax rate validation based on user permissions
    if (command.settings.taxRate > 0.5) {
      // 50% maximum tax rate
      if (!creatingUser.hasPermission(Permission.MANAGE_SETTINGS)) {
        throw new Error('High tax rates require MANAGE_SETTINGS permission');
      }
    }

    // Currency validation - only ADMIN can create agencies with non-standard currencies
    const standardCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    if (!standardCurrencies.includes(command.settings.currency)) {
      if (creatingUser.role.value !== SystemRole.ADMIN && creatingUser.role.value !== SystemRole.SUPER_ADMIN) {
        throw new Error('Non-standard currencies require ADMIN role');
      }
    }

    // Inventory tracking requires specific permissions
    if (command.settings.enableInventoryTracking) {
      if (!creatingUser.hasPermission(Permission.MANAGE_STOCK)) {
        throw new Error('Inventory tracking requires MANAGE_STOCK permission');
      }
    }

    // Validate business hours (must be coherent)
    this.validateBusinessHours(command.settings.businessHours);
  }

  /**
   * Gets maximum credit limit allowed for user role
   * @param user - Creating user
   * @returns Maximum credit limit in base currency
   */
  private getMaxCreditLimitForUser(user: any): number {
    // Business rule: Credit limit authorization based on user role
    switch (user.role.value) {
      case SystemRole.SUPER_ADMIN:
        return 10000000; // $10M for super admin
      case SystemRole.ADMIN:
        return 5000000; // $5M for admin
      case SystemRole.MANAGER:
        return 1000000; // $1M for manager
      default:
        return 100000; // $100K default
    }
  }

  /**
   * Gets maximum credit days allowed for user role
   * @param user - Creating user
   * @returns Maximum credit days
   */
  private getMaxCreditDaysForUser(user: any): number {
    // Business rule: Credit days authorization based on user role
    switch (user.role.value) {
      case SystemRole.SUPER_ADMIN:
      case SystemRole.ADMIN:
        return 180; // 6 months for admin
      case SystemRole.MANAGER:
        return 90; // 3 months for manager
      default:
        return 30; // 30 days default
    }
  }

  /**
   * Validates business hours for coherence
   * @param businessHours - Business hours configuration
   * @throws {Error} When business hours are invalid
   */
  private validateBusinessHours(businessHours: any): void {
    const start = new Date(`1970-01-01T${businessHours.start}:00`);
    const end = new Date(`1970-01-01T${businessHours.end}:00`);

    if (start >= end) {
      throw new Error('Business hours start time must be before end time');
    }

    // Warn for unusual business hours
    const startHour = start.getHours();
    const endHour = end.getHours();

    if (startHour < 6 || startHour > 12) {
      console.warn('Unusual business start time - most businesses open between 6 AM and 12 PM');
    }

    if (endHour < 14 || endHour > 23) {
      console.warn('Unusual business end time - most businesses close between 2 PM and 11 PM');
    }

    // Check for very long business days
    const businessDayHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (businessDayHours > 16) {
      console.warn('Very long business day - consider splitting into multiple shifts');
    }
  }

  /**
   * Determines if agency should be auto-activated based on user role
   * @param user - Creating user
   * @returns True if agency should be auto-activated
   */
  private shouldAutoActivateAgency(user: any): boolean {
    // Business rule: Auto-activation based on user role
    // Use the SystemRole enum values, not formatted names
    const autoActivateRoles = [SystemRole.SUPER_ADMIN, SystemRole.ADMIN];
    return autoActivateRoles.includes(user.role.value);
  }

  /**
   * Initializes the agency database for multi-tenant operations
   * @param agency - Created agency
   * @throws {Error} When database initialization fails
   */
  private async initializeAgencyDatabase(agency: Agency): Promise<void> {
    try {
      // Initialize agency-specific database
      await this.agencyRepository.initializeAgencyDatabase(agency);

      console.log('Agency database initialized successfully:', {
        agencyId: agency.id,
        databasePath: agency.databasePath,
        name: agency.name,
      });
    } catch (error) {
      console.error('Failed to initialize agency database:', {
        agencyId: agency.id,
        databasePath: agency.databasePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Clean up the agency record if database initialization fails
      try {
        await this.agencyRepository.delete(agency.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup agency after database initialization failure:', cleanupError);
      }

      throw new Error(
        `Failed to initialize agency database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Factory function to create CreateAgencyHandler
 * @param agencyRepository - Agency repository implementation
 * @param userRepository - User repository implementation
 * @returns CreateAgencyHandler instance
 */
export function createAgencyHandler(
  agencyRepository: IAgencyRepository,
  userRepository: IUserRepository
): CreateAgencyHandler {
  return new CreateAgencyHandler(agencyRepository, userRepository);
}
