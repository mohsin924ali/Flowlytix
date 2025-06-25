/**
 * Customer Repository Interface
 *
 * Domain repository contract for Customer entity operations.
 * Follows Repository pattern and Dependency Inversion principle.
 * Provides abstraction layer between domain and infrastructure.
 *
 * @domain Customer Management
 * @pattern Repository Pattern
 * @architecture Hexagonal Architecture (Port)
 * @version 1.0.0
 */

import { Customer, CustomerStatus, CustomerType, PaymentTerms } from '../entities/customer';
import { Email } from '../value-objects/email';
import { Money } from '../value-objects/money';

/**
 * Customer search criteria for filtering and querying
 */
export interface CustomerSearchCriteria {
  readonly agencyId?: string;
  readonly customerCode?: string;
  readonly companyName?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly fullName?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly mobile?: string;
  readonly customerType?: CustomerType;
  readonly status?: CustomerStatus;
  readonly paymentTerms?: PaymentTerms;
  readonly city?: string;
  readonly state?: string;
  readonly country?: string;
  readonly hasOutstandingBalance?: boolean;
  readonly hasOverduePayments?: boolean;
  readonly creditLimitMin?: number;
  readonly creditLimitMax?: number;
  readonly isHighValue?: boolean;
  readonly createdBy?: string;
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly lastOrderAfter?: Date;
  readonly lastOrderBefore?: Date;
  readonly search?: string; // Full text search
  readonly limit?: number;
  readonly offset?: number;
  readonly sortBy?:
    | 'customerCode'
    | 'fullName'
    | 'companyName'
    | 'createdAt'
    | 'lastOrderDate'
    | 'totalOrdersValue'
    | 'creditLimit';
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Customer repository search results with pagination
 */
export interface CustomerSearchResult {
  readonly customers: readonly Customer[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

/**
 * Customer repository statistics for monitoring and analytics
 */
export interface CustomerRepositoryStats {
  readonly totalCustomers: number;
  readonly activeCustomers: number;
  readonly suspendedCustomers: number;
  readonly blacklistedCustomers: number;
  readonly customersByType: Record<CustomerType, number>;
  readonly customersByStatus: Record<CustomerStatus, number>;
  readonly averageCreditLimit: number;
  readonly totalOutstandingBalance: number;
  readonly customersWithOverduePayments: number;
  readonly highValueCustomers: number;
  readonly recentRegistrations: number; // Last 7 days
  readonly lastActivity: Date | null;
}

/**
 * Repository error types for proper error handling
 */
export class CustomerRepositoryError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CustomerRepositoryError';
  }
}

export class CustomerNotFoundError extends CustomerRepositoryError {
  constructor(identifier: string, cause?: Error) {
    super(`Customer not found: ${identifier}`, 'find', cause);
    this.name = 'CustomerNotFoundError';
  }
}

export class CustomerAlreadyExistsError extends CustomerRepositoryError {
  constructor(customerCode: string, agencyId: string, cause?: Error) {
    super(`Customer already exists with code: ${customerCode} in agency: ${agencyId}`, 'create', cause);
    this.name = 'CustomerAlreadyExistsError';
  }
}

export class CustomerRepositoryConnectionError extends CustomerRepositoryError {
  constructor(message: string, operation: string, cause?: Error) {
    super(`Repository connection error: ${message}`, operation, cause);
    this.name = 'CustomerRepositoryConnectionError';
  }
}

/**
 * Customer Repository Interface
 *
 * Defines the contract for Customer entity persistence operations.
 * Implementation will be provided by infrastructure layer.
 *
 * @interface ICustomerRepository
 */
export interface ICustomerRepository {
  /**
   * Save a new customer to the repository
   * @param customer - Customer entity to save
   * @returns Promise<Customer> - Saved customer with updated metadata
   * @throws {CustomerAlreadyExistsError} When customer with code already exists in agency
   * @throws {CustomerRepositoryError} When save operation fails
   */
  save(customer: Customer): Promise<Customer>;

  /**
   * Update an existing customer in the repository
   * @param customer - Customer entity with updates
   * @returns Promise<Customer> - Updated customer entity
   * @throws {CustomerNotFoundError} When customer doesn't exist
   * @throws {CustomerRepositoryError} When update operation fails
   */
  update(customer: Customer): Promise<Customer>;

  /**
   * Find customer by unique identifier
   * @param id - Customer ID
   * @returns Promise<Customer | null> - Customer entity or null if not found
   * @throws {CustomerRepositoryError} When find operation fails
   */
  findById(id: string): Promise<Customer | null>;

  /**
   * Find customer by customer code within agency (unique constraint)
   * @param customerCode - Customer code
   * @param agencyId - Agency ID
   * @returns Promise<Customer | null> - Customer entity or null if not found
   * @throws {CustomerRepositoryError} When find operation fails
   */
  findByCustomerCode(customerCode: string, agencyId: string): Promise<Customer | null>;

  /**
   * Find customer by email address
   * @param email - Email value object
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @returns Promise<Customer | null> - Customer entity or null if not found
   * @throws {CustomerRepositoryError} When find operation fails
   */
  findByEmail(email: Email, agencyId?: string): Promise<Customer | null>;

  /**
   * Check if customer exists by customer code
   * @param customerCode - Customer code
   * @param agencyId - Agency ID
   * @returns Promise<boolean> - True if customer exists
   * @throws {CustomerRepositoryError} When check operation fails
   */
  existsByCustomerCode(customerCode: string, agencyId: string): Promise<boolean>;

  /**
   * Check if customer exists by email
   * @param email - Email value object
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @returns Promise<boolean> - True if customer exists
   * @throws {CustomerRepositoryError} When check operation fails
   */
  existsByEmail(email: Email, agencyId?: string): Promise<boolean>;

  /**
   * Search customers with filtering and pagination
   * @param criteria - Search criteria and pagination options
   * @returns Promise<CustomerSearchResult> - Paginated search results
   * @throws {CustomerRepositoryError} When search operation fails
   */
  search(criteria: CustomerSearchCriteria): Promise<CustomerSearchResult>;

  /**
   * Find all customers (with optional limit for safety)
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @param limit - Maximum number of customers to return (default: 1000)
   * @returns Promise<readonly Customer[]> - Array of all customers
   * @throws {CustomerRepositoryError} When find operation fails
   */
  findAll(agencyId?: string, limit?: number): Promise<readonly Customer[]>;

  /**
   * Find customers by status
   * @param status - Customer status
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @param limit - Maximum number of customers to return
   * @returns Promise<readonly Customer[]> - Array of customers with specified status
   * @throws {CustomerRepositoryError} When find operation fails
   */
  findByStatus(status: CustomerStatus, agencyId?: string, limit?: number): Promise<readonly Customer[]>;

  /**
   * Find customers by type
   * @param customerType - Customer type
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @param limit - Maximum number of customers to return
   * @returns Promise<readonly Customer[]> - Array of customers with specified type
   * @throws {CustomerRepositoryError} When find operation fails
   */
  findByType(customerType: CustomerType, agencyId?: string, limit?: number): Promise<readonly Customer[]>;

  /**
   * Find customers with overdue payments
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @param limit - Maximum number of customers to return
   * @returns Promise<readonly Customer[]> - Array of customers with overdue payments
   * @throws {CustomerRepositoryError} When find operation fails
   */
  findWithOverduePayments(agencyId?: string, limit?: number): Promise<readonly Customer[]>;

  /**
   * Find high-value customers (above threshold)
   * @param threshold - Minimum total orders value
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @param limit - Maximum number of customers to return
   * @returns Promise<readonly Customer[]> - Array of high-value customers
   * @throws {CustomerRepositoryError} When find operation fails
   */
  findHighValueCustomers(threshold: Money, agencyId?: string, limit?: number): Promise<readonly Customer[]>;

  /**
   * Find customers by location (city, state, country)
   * @param location - Location criteria
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @param limit - Maximum number of customers to return
   * @returns Promise<readonly Customer[]> - Array of customers in specified location
   * @throws {CustomerRepositoryError} When find operation fails
   */
  findByLocation(
    location: { city?: string; state?: string; country?: string },
    agencyId?: string,
    limit?: number
  ): Promise<readonly Customer[]>;

  /**
   * Count total number of customers
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @returns Promise<number> - Total customer count
   * @throws {CustomerRepositoryError} When count operation fails
   */
  count(agencyId?: string): Promise<number>;

  /**
   * Count customers by specific criteria
   * @param criteria - Count criteria
   * @returns Promise<number> - Count of matching customers
   * @throws {CustomerRepositoryError} When count operation fails
   */
  countByCriteria(criteria: Partial<CustomerSearchCriteria>): Promise<number>;

  /**
   * Delete customer by ID (soft delete recommended)
   * @param id - Customer ID
   * @returns Promise<boolean> - True if customer was deleted
   * @throws {CustomerNotFoundError} When customer doesn't exist
   * @throws {CustomerRepositoryError} When delete operation fails
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get repository statistics for monitoring
   * @param agencyId - Agency ID (optional, for multi-tenant filtering)
   * @returns Promise<CustomerRepositoryStats> - Repository statistics
   * @throws {CustomerRepositoryError} When stats operation fails
   */
  getStats(agencyId?: string): Promise<CustomerRepositoryStats>;

  /**
   * Check repository health and connectivity
   * @returns Promise<boolean> - True if repository is healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Begin transaction for atomic operations
   * @returns Promise<ICustomerRepositoryTransaction> - Transaction context
   * @throws {CustomerRepositoryError} When transaction start fails
   */
  beginTransaction(): Promise<ICustomerRepositoryTransaction>;
}

/**
 * Customer Repository Transaction Interface
 *
 * Provides transactional operations for customer repository
 */
export interface ICustomerRepositoryTransaction {
  /**
   * Save customer within transaction
   * @param customer - Customer entity to save
   * @returns Promise<Customer> - Saved customer
   */
  save(customer: Customer): Promise<Customer>;

  /**
   * Update customer within transaction
   * @param customer - Customer entity to update
   * @returns Promise<Customer> - Updated customer
   */
  update(customer: Customer): Promise<Customer>;

  /**
   * Delete customer within transaction
   * @param id - Customer ID to delete
   * @returns Promise<boolean> - Success status
   */
  delete(id: string): Promise<boolean>;

  /**
   * Commit transaction changes
   * @returns Promise<void>
   * @throws {CustomerRepositoryError} When commit fails
   */
  commit(): Promise<void>;

  /**
   * Rollback transaction changes
   * @returns Promise<void>
   * @throws {CustomerRepositoryError} When rollback fails
   */
  rollback(): Promise<void>;

  /**
   * Check if transaction is active
   * @returns boolean - True if transaction is active
   */
  isActive(): boolean;
}
