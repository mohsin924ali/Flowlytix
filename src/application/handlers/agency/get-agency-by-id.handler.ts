/**
 * Get Agency By ID Handler
 *
 * Handler for GetAgencyById query following CQRS pattern.
 * Implements business logic for single agency retrieval with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with MANAGE_SETTINGS permission can view agencies
 * - Super admins can view any agency
 * - Regular users can only view their own agency
 * - Agency must exist and be accessible
 * - Optional detailed settings and stats can be included
 *
 * @domain Agency Management
 * @pattern Query Handler (CQRS)
 * @architecture Hexagonal Architecture - Multi-tenant
 * @version 1.0.0
 */

import {
  GetAgencyByIdQuery,
  GetAgencyByIdQueryResult,
  validateGetAgencyByIdQuery,
  validateAgencyIdQueryBusinessRules,
  AgencyDetails,
} from '../../queries/agency/get-agency-by-id.query';
import { Agency } from '../../../domain/entities/agency';
import { IAgencyRepository } from '../../../domain/repositories/agency.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission, SystemRole } from '../../../domain/value-objects/role';

/**
 * Handler for GetAgencyById query
 * Implements business logic for single agency retrieval with proper authorization
 */
export class GetAgencyByIdHandler {
  constructor(
    private readonly agencyRepository: IAgencyRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles get agency by ID query with optional detailed information
   * @param query - GetAgencyById query with agency ID
   * @returns Promise<GetAgencyByIdQueryResult> - Single agency details
   * @throws {Error} When validation fails or unauthorized
   */
  async handle(query: GetAgencyByIdQuery): Promise<GetAgencyByIdQueryResult> {
    try {
      // Step 1: Validate query structure
      validateGetAgencyByIdQuery(query);

      // Step 2: Validate business rules
      validateAgencyIdQueryBusinessRules(query);

      // Step 3: Get the requesting user for authorization
      const requestingUser = await this.userRepository.findById(query.requestedBy);
      if (!requestingUser) {
        throw new Error('Requesting user not found');
      }

      // Step 4: Authorization check - user needs MANAGE_SETTINGS permission to view agencies
      if (!requestingUser.hasPermission(Permission.MANAGE_SETTINGS)) {
        throw new Error('Insufficient permissions to view agency details');
      }

      // Step 5: Retrieve the agency by ID
      const agency = await this.agencyRepository.findById(query.agencyId);
      if (!agency) {
        return {
          success: true,
          agency: null,
          error: 'Agency not found',
        };
      }

      // Step 6: Apply role-based access control
      if (!this.canUserAccessAgency(requestingUser, agency)) {
        throw new Error('Insufficient permissions to access this agency');
      }

      // Step 7: Convert agency to detailed representation
      const agencyDetails = await this.convertAgencyToDetails(agency, query.includeSettings, query.includeStats);

      return {
        success: true,
        agency: agencyDetails,
      };
    } catch (error) {
      console.error('Get agency by ID handler error:', {
        query: {
          agencyId: query.agencyId,
          requestedBy: query.requestedBy,
          includeSettings: query.includeSettings,
          includeStats: query.includeStats,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        agency: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Checks if user can access the specified agency
   * @param user - Requesting user
   * @param agency - Target agency
   * @returns boolean - True if user can access agency
   */
  private canUserAccessAgency(user: any, agency: Agency): boolean {
    // Super admins can access any agency
    if (user.role.value === SystemRole.SUPER_ADMIN) {
      return true;
    }

    // Agency admins can only access their assigned agency
    if (user.role.value === SystemRole.ADMIN) {
      // Check if user has an assigned agency and it matches the requested agency
      return user.agencyId === agency.id;
    }

    // All other users are denied access
    return false;
  }

  /**
   * Converts agency entity to detailed representation
   * @param agency - Agency entity
   * @param includeSettings - Whether to include business settings
   * @param includeStats - Whether to include operational statistics
   * @returns Promise<AgencyDetails> - Detailed agency information
   */
  private async convertAgencyToDetails(
    agency: Agency,
    includeSettings: boolean = false,
    includeStats: boolean = false
  ): Promise<AgencyDetails> {
    const baseDetails: AgencyDetails = {
      id: agency.id,
      name: agency.name,
      databasePath: agency.databasePath,
      contactPerson: agency.contactPerson || null,
      phone: agency.phone || null,
      email: agency.email ? agency.email.value : null,
      address: agency.address || null,
      status: agency.status,
      isOperational: agency.isOperational(),
      createdAt: agency.createdAt,
      updatedAt: agency.updatedAt,
      createdBy: agency.createdBy || null,
    };

    // Add detailed settings if requested
    if (includeSettings) {
      (baseDetails as any).settings = {
        allowCreditSales: agency.settings.allowCreditSales,
        defaultCreditDays: agency.settings.defaultCreditDays,
        maxCreditLimit: agency.settings.maxCreditLimit,
        requireApprovalForOrders: agency.settings.requireApprovalForOrders,
        enableInventoryTracking: agency.settings.enableInventoryTracking,
        taxRate: agency.settings.taxRate,
        currency: agency.settings.currency,
        businessHours: {
          start: agency.settings.businessHours.start,
          end: agency.settings.businessHours.end,
          timezone: agency.settings.businessHours.timezone,
        },
        notifications: {
          lowStock: agency.settings.notifications.lowStock,
          overduePayments: agency.settings.notifications.overduePayments,
          newOrders: agency.settings.notifications.newOrders,
        },
      };
    }

    // Add operational statistics if requested
    if (includeStats) {
      // Note: In a real implementation, these would be calculated from actual data
      // For now, we'll provide placeholder values
      (baseDetails as any).stats = {
        totalCustomers: 0, // Would be calculated from customer repository
        totalProducts: 0, // Would be calculated from product repository
        totalActiveOrders: 0, // Would be calculated from order repository
        lastActivityDate: agency.updatedAt,
        databaseSizeMB: 0, // Would be calculated from database metrics
      };
    }

    return baseDetails;
  }
}

/**
 * Factory function to create GetAgencyByIdHandler
 * @param agencyRepository - Agency repository implementation
 * @param userRepository - User repository implementation
 * @returns GetAgencyByIdHandler instance
 */
export function createGetAgencyByIdHandler(
  agencyRepository: IAgencyRepository,
  userRepository: IUserRepository
): GetAgencyByIdHandler {
  return new GetAgencyByIdHandler(agencyRepository, userRepository);
}
