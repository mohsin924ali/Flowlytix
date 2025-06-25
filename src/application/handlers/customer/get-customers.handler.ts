/**
 * Get Customers Handler
 *
 * Handler for GetCustomers query following CQRS pattern.
 * Implements business logic for customer retrieval with proper authorization,
 * filtering, pagination, and search capabilities.
 *
 * Business Rules:
 * - Only users with READ_CUSTOMER permission can view customers
 * - Results are paginated and sorted according to query parameters
 * - Search functionality across customer names, codes, and company names
 * - Filtering by customer type, status, and other criteria
 *
 * @domain Customer Management
 * @pattern Query Handler (CQRS)
 * @architecture Hexagonal Architecture
 * @version 1.0.0
 */

import {
  GetCustomersQuery,
  CustomerSummary,
  GetCustomersQueryResult,
  validateGetCustomersQuery,
} from '../../queries/customer/get-customers.query';
import { Customer } from '../../../domain/entities/customer';
import { Permission } from '../../../domain/value-objects/role';
import { ICustomerRepository, CustomerSearchCriteria } from '../../../domain/repositories/customer.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';

/**
 * Handler for GetCustomers query
 * Implements secure customer retrieval with authorization checks and filtering
 */
export class GetCustomersHandler {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Handles get customers query with filtering and pagination
   * @param query - GetCustomers query with filters
   * @returns Promise<GetCustomersQueryResult> - Paginated customer results
   * @throws Error when user not found or insufficient permissions
   */
  async handle(query: GetCustomersQuery): Promise<GetCustomersQueryResult> {
    // Step 1: Validate query
    validateGetCustomersQuery(query);

    // Step 2: Get the requesting user for authorization
    const requestingUser = await this.userRepository.findById(query.requestedBy);
    if (!requestingUser) {
      throw new Error('Requesting user not found');
    }

    // Step 3: Authorization check - user needs READ_CUSTOMER permission
    if (!requestingUser.hasPermission(Permission.READ_CUSTOMER)) {
      throw new Error('Insufficient permissions to view customers');
    }

    // Step 4: Build search criteria from query
    const searchCriteria: CustomerSearchCriteria = {
      limit: query.limit,
      offset: query.offset,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      ...(query.agencyId && { agencyId: query.agencyId }),
      ...(query.customerType !== undefined && { customerType: query.customerType }),
      ...(query.status !== undefined && { status: query.status }),
      ...(query.search !== undefined && { search: query.search }),
    };

    // Step 5: Execute search through repository
    const searchResult = await this.customerRepository.search(searchCriteria);

    // Step 6: Convert customers to summary results
    const customerSummaries: CustomerSummary[] = searchResult.customers.map((customer) =>
      this.convertCustomerToSummary(customer)
    );

    // Step 7: Calculate pagination metadata
    const hasMore = searchResult.total > query.offset + query.limit;

    return {
      success: true,
      customers: customerSummaries,
      total: searchResult.total,
      limit: query.limit,
      offset: query.offset,
      hasMore,
    };
  }

  /**
   * Converts Customer entity to CustomerSummary
   * @private
   */
  private convertCustomerToSummary(customer: Customer): CustomerSummary {
    const displayInfo = customer.getDisplayInfo();

    return {
      id: customer.id,
      customerCode: customer.customerCode,
      fullName: displayInfo.fullName,
      companyName: customer.companyName || null,
      customerType: customer.customerType,
      status: customer.status,
      email: customer.email.toString(),
      creditLimit: customer.creditLimit.toString(),
      createdAt: customer.createdAt,
    };
  }
}

/**
 * Factory function to create GetCustomersHandler
 * @param customerRepository - Customer repository implementation
 * @param userRepository - User repository implementation
 * @returns GetCustomersHandler instance
 */
export function createGetCustomersHandler(
  customerRepository: ICustomerRepository,
  userRepository: IUserRepository
): GetCustomersHandler {
  return new GetCustomersHandler(customerRepository, userRepository);
}
