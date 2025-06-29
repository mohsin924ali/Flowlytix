/**
 * Get Agencies Handler
 *
 * Handler for GetAgencies query following CQRS pattern.
 * Implements business logic for agency listing with proper authorization,
 * filtering, pagination, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with VIEW_AGENCY or MANAGE_SETTINGS permission can view agencies
 * - Super admins can view all agencies
 * - Regular users can only view their own agency
 * - Pagination is enforced for performance
 * - Search filters are validated
 *
 * @domain Agency Management
 * @pattern Query Handler (CQRS)
 * @architecture Hexagonal Architecture - Multi-tenant
 * @version 1.0.0
 */

import {
  GetAgenciesQuery,
  GetAgenciesQueryResult,
  validateGetAgenciesQuery,
  validateAgenciesQueryBusinessRules,
  AgencySummary,
} from '../../queries/agency/get-agencies.query';
import { Agency } from '../../../domain/entities/agency';
import { IAgencyRepository, AgencySearchCriteria } from '../../../domain/repositories/agency.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { Permission, SystemRole } from '../../../domain/value-objects/role';

/**
 * Handler for GetAgencies query
 * Implements business logic for agency listing with proper authorization
 */
export class GetAgenciesHandler {
  constructor(
    private readonly agencyRepository: IAgencyRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles get agencies query with filtering and pagination
   * @param query - GetAgencies query with filters
   * @returns Promise<GetAgenciesQueryResult> - Paginated agency results
   * @throws {Error} When validation fails or unauthorized
   */
  async handle(query: GetAgenciesQuery): Promise<GetAgenciesQueryResult> {
    try {
      console.log('🏢 GetAgenciesHandler: Starting query handling with:', {
        requestedBy: query.requestedBy,
        limit: query.limit,
        offset: query.offset,
      });

      // Step 1: Validate query structure
      validateGetAgenciesQuery(query);
      console.log('✅ GetAgenciesHandler: Query validation passed');

      // Step 2: Validate business rules
      validateAgenciesQueryBusinessRules(query);
      console.log('✅ GetAgenciesHandler: Business rules validation passed');

      // Step 3: Get the requesting user for authorization
      const requestingUser = await this.userRepository.findById(query.requestedBy);
      if (!requestingUser) {
        console.error('❌ GetAgenciesHandler: Requesting user not found:', query.requestedBy);
        throw new Error('Requesting user not found');
      }

      console.log('✅ GetAgenciesHandler: Found requesting user:', {
        id: requestingUser.id,
        email: requestingUser.email?.value,
        role: requestingUser.role.value,
        permissions: Array.from(requestingUser.role.permissions),
      });

      // Step 4: Authorization check - user needs READ_AGENCY or MANAGE_SETTINGS permission to view agencies
      if (
        !requestingUser.hasPermission(Permission.READ_AGENCY) &&
        !requestingUser.hasPermission(Permission.MANAGE_SETTINGS)
      ) {
        console.error('❌ GetAgenciesHandler: Insufficient permissions:', {
          hasReadAgency: requestingUser.hasPermission(Permission.READ_AGENCY),
          hasManageSettings: requestingUser.hasPermission(Permission.MANAGE_SETTINGS),
          userPermissions: Array.from(requestingUser.role.permissions),
        });
        throw new Error('Insufficient permissions to view agencies');
      }

      console.log('✅ GetAgenciesHandler: Permission check passed');

      // Step 5: Apply role-based filtering
      const searchCriteria = this.buildSearchCriteria(query, requestingUser);
      console.log('🔍 GetAgenciesHandler: Built search criteria:', searchCriteria);

      // Step 6: Execute search through repository
      const searchResult = await this.agencyRepository.search(searchCriteria);
      console.log('🔍 GetAgenciesHandler: Repository search result:', {
        agencyCount: searchResult.agencies.length,
        total: searchResult.total,
        hasMore: searchResult.hasMore,
      });

      // Step 7: Apply role-based filtering for non-super-admin users
      let filteredAgencies = searchResult.agencies;
      let filteredTotal = searchResult.total;

      if (requestingUser.role.value !== SystemRole.SUPER_ADMIN) {
        console.log('🔍 GetAgenciesHandler: Applying role-based filtering for non-super-admin');
        // Agency admins can only see their assigned agency
        if (requestingUser.role.value === SystemRole.ADMIN && requestingUser.agencyId) {
          filteredAgencies = searchResult.agencies.filter((agency) => agency.id === requestingUser.agencyId);
          filteredTotal = filteredAgencies.length;
          console.log('🔍 GetAgenciesHandler: Filtered to user agency:', {
            userAgencyId: requestingUser.agencyId,
            filteredCount: filteredAgencies.length,
          });
        } else {
          // Users without agency assignment see no agencies
          filteredAgencies = [];
          filteredTotal = 0;
          console.log('🔍 GetAgenciesHandler: No agency assignment, clearing results');
        }
      } else {
        console.log('✅ GetAgenciesHandler: Super admin - no filtering applied');
      }

      // Step 8: Convert agencies to summary results
      const agencySummaries: AgencySummary[] = filteredAgencies.map((agency) => this.convertAgencyToSummary(agency));
      console.log('🔍 GetAgenciesHandler: Converted to summaries:', {
        summaryCount: agencySummaries.length,
        sampleSummary: agencySummaries[0] || null,
      });

      // Step 9: Calculate pagination metadata
      const hasMore = filteredTotal > query.offset + query.limit;

      const result = {
        success: true,
        agencies: agencySummaries,
        total: filteredTotal,
        limit: query.limit,
        offset: query.offset,
        hasMore,
        searchCriteria: this.sanitizeSearchCriteria(query),
      };

      console.log('✅ GetAgenciesHandler: Returning successful result:', {
        success: result.success,
        agencyCount: result.agencies.length,
        total: result.total,
      });

      return result;
    } catch (error) {
      console.error('Get agencies handler error:', {
        query: {
          requestedBy: query.requestedBy,
          limit: query.limit,
          offset: query.offset,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        agencies: [],
        total: 0,
        limit: query.limit,
        offset: query.offset,
        hasMore: false,
        searchCriteria: this.sanitizeSearchCriteria(query),
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Builds search criteria based on query and user permissions
   * @param query - Get agencies query
   * @param user - Requesting user
   * @returns AgencySearchCriteria for repository
   */
  private buildSearchCriteria(query: GetAgenciesQuery, user: any): AgencySearchCriteria {
    // Build criteria object with proper readonly properties
    const criteria: AgencySearchCriteria = {
      limit: query.limit,
      offset: query.offset,
      sortBy: query.sortBy === 'contactPerson' ? 'name' : query.sortBy, // Map contactPerson to name since it's not supported
      sortOrder: query.sortOrder.toUpperCase() as 'ASC' | 'DESC',

      // Apply filtering based on query parameters
      ...(query.status !== undefined && { status: query.status }),
      ...(query.search !== undefined && { searchTerm: query.search }),
      ...(query.contactPerson !== undefined && { contactPerson: query.contactPerson }),
      ...(query.currency !== undefined && { currency: query.currency }),

      // Date range filtering
      ...(query.createdAfter !== undefined && { createdAfter: new Date(query.createdAfter) }),
      ...(query.createdBefore !== undefined && { createdBefore: new Date(query.createdBefore) }),
      ...(query.updatedAfter !== undefined && { updatedAfter: new Date(query.updatedAfter) }),
      ...(query.updatedBefore !== undefined && { updatedBefore: new Date(query.updatedBefore) }),

      // Business settings filters
      ...(query.allowsCreditSales !== undefined && { allowsCreditSales: query.allowsCreditSales }),
      ...(query.enablesInventoryTracking !== undefined && { enablesInventoryTracking: query.enablesInventoryTracking }),
    };

    // Role-based access control - add additional criteria for non-super-admin users
    if (user.role.value !== SystemRole.SUPER_ADMIN) {
      // For non-super-admin users, we'll apply filtering at the application level
      // since the repository doesn't support agencyId or createdBy filtering
      // This is a simplified approach - in production, you might want to extend the repository
    }

    return criteria;
  }

  /**
   * Converts agency entity to complete representation with all settings for editing
   * @param agency - Agency entity
   * @returns AgencySummary with complete settings for API response
   */
  private convertAgencyToSummary(agency: Agency): AgencySummary {
    return {
      id: agency.id,
      name: agency.name,
      contactPerson: agency.contactPerson || null,
      phone: agency.phone || null,
      email: agency.email ? agency.email.value : null,
      status: agency.status,
      isOperational: agency.isOperational(),

      // Include ALL settings for editing - not just summary
      allowsCreditSales: agency.settings.allowCreditSales,
      currency: agency.settings.currency,

      // Include complete financial settings
      defaultCreditDays: agency.settings.defaultCreditDays,
      maxCreditLimit: agency.settings.maxCreditLimit,
      taxRate: agency.settings.taxRate,
      requireApprovalForOrders: agency.settings.requireApprovalForOrders,

      // Include operational settings
      enableInventoryTracking: agency.settings.enableInventoryTracking,

      // Include business hours
      businessHoursStart: agency.settings.businessHours.start,
      businessHoursEnd: agency.settings.businessHours.end,
      businessHoursTimezone: agency.settings.businessHours.timezone,

      // Include notification settings
      notificationsLowStock: agency.settings.notifications.lowStock,
      notificationsOverduePayments: agency.settings.notifications.overduePayments,
      notificationsNewOrders: agency.settings.notifications.newOrders,

      // Include standard fields
      databasePath: agency.databasePath,
      createdAt: agency.createdAt,
      updatedAt: agency.updatedAt,
    };
  }

  /**
   * Sanitizes search criteria for response (removes sensitive data)
   * @param query - Original query
   * @returns Sanitized criteria for response
   */
  private sanitizeSearchCriteria(query: GetAgenciesQuery): Partial<GetAgenciesQuery> {
    const { requestedBy, ...sanitized } = query;
    return sanitized;
  }
}

/**
 * Factory function to create GetAgenciesHandler
 * @param agencyRepository - Agency repository implementation
 * @param userRepository - User repository implementation
 * @returns GetAgenciesHandler instance
 */
export function createGetAgenciesHandler(
  agencyRepository: IAgencyRepository,
  userRepository: IUserRepository
): GetAgenciesHandler {
  return new GetAgenciesHandler(agencyRepository, userRepository);
}
