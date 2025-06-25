/**
 * SQLite Customer Repository Implementation - Step 1A: Core Methods
 *
 * Concrete implementation of ICustomerRepository interface for SQLite database.
 * Follows Repository pattern and provides data persistence for Customer entities.
 * Implements core CRUD operations with proper error handling.
 *
 * ARCHITECTURE NOTES:
 * - Follows Hexagonal Architecture (Adapter pattern)
 * - Implements Repository Pattern for data access abstraction
 * - Uses flat database schema (no JSON serialization)
 * - Follows same patterns as UserRepository for consistency
 *
 * @domain Customer Management
 * @pattern Repository Pattern
 * @architecture Hexagonal Architecture (Adapter)
 * @version 1.0.0 - Step 1A: Core Methods Only
 */

import {
  ICustomerRepository,
  ICustomerRepositoryTransaction,
  CustomerRepositoryError,
  CustomerNotFoundError,
  CustomerAlreadyExistsError,
  CustomerRepositoryConnectionError,
  type CustomerSearchCriteria,
  type CustomerSearchResult,
  type CustomerRepositoryStats,
} from '../../domain/repositories/customer.repository';
import { Customer, CustomerStatus, CustomerType, PaymentTerms } from '../../domain/entities/customer';
import { Email } from '../../domain/value-objects/email';
import { Money } from '../../domain/value-objects/money';
import { DatabaseConnection } from '../database/connection';
import Database from 'better-sqlite3';

/**
 * Customer persistence data structure for database operations
 * Maps directly to the existing customers table schema
 */
interface CustomerPersistenceData {
  id: string;
  agency_id: string;
  customer_code: string;
  customer_name: string;
  business_name: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  area_id: string | null;
  assigned_worker_id: string | null;
  credit_limit: number;
  current_balance: number;
  payment_terms: number;
  customer_type: string;
  priority_level: string;
  total_orders: number;
  total_revenue: number;
  last_order_date: number | null;
  status: string;
  created_at: number;
  updated_at: number;
  created_by: string | null;
}

/**
 * SQLite Customer Repository Implementation
 *
 * Provides persistent storage for Customer entities using SQLite database.
 * Implements core ICustomerRepository interface methods with proper error handling.
 * Uses flat database schema for simplicity and consistency with existing architecture.
 */
export class SqliteCustomerRepository implements ICustomerRepository {
  private readonly connection: DatabaseConnection;
  private readonly db: Database.Database;

  constructor(connection: DatabaseConnection) {
    if (!connection) {
      throw new CustomerRepositoryError('Database connection is required', 'constructor');
    }

    try {
      const db = connection.getDatabase();
      if (!db) {
        throw new CustomerRepositoryError('Invalid database connection', 'constructor');
      }
      this.connection = connection;
      this.db = db;
    } catch (error) {
      throw new CustomerRepositoryError(
        `Database connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'constructor',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Save a new customer to the database
   */
  async save(customer: Customer): Promise<Customer> {
    try {
      // Check if customer already exists by customer code
      const existing = await this.existsByCustomerCode(customer.customerCode, customer.agencyId);
      if (existing) {
        throw new CustomerAlreadyExistsError(customer.customerCode, customer.agencyId);
      }

      // Check if email already exists (if provided)
      if (customer.email) {
        const emailExists = await this.existsByEmail(customer.email, customer.agencyId);
        if (emailExists) {
          throw new CustomerAlreadyExistsError(customer.customerCode, customer.agencyId);
        }
      }

      const insertQuery = `
        INSERT INTO customers (
          id, agency_id, customer_code, customer_name, business_name, contact_person,
          phone, email, address, city, postal_code, area_id, assigned_worker_id,
          credit_limit, current_balance, payment_terms, customer_type, priority_level,
          total_orders, total_revenue, last_order_date, status,
          created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const stmt = this.db.prepare(insertQuery);

      // Map Customer entity to database fields
      const defaultAddress = customer.addresses.length > 0 ? customer.addresses[0] : null;
      const primaryContact = customer.contacts && customer.contacts.length > 0 ? customer.contacts[0] : null;

      stmt.run(
        customer.id,
        customer.agencyId,
        customer.customerCode,
        customer.fullName,
        customer.companyName,
        primaryContact?.name || null,
        customer.phone,
        customer.email?.value || null,
        defaultAddress ? `${defaultAddress.street}, ${defaultAddress.state}` : null,
        defaultAddress?.city || null,
        defaultAddress?.zipCode || null,
        null, // area_id - not used in current domain model
        null, // assigned_worker_id - not used in current domain model
        customer.creditLimit.amount,
        customer.outstandingBalance.amount,
        this.mapPaymentTermsToDays(customer.paymentTerms),
        customer.customerType.toLowerCase(),
        'normal', // priority_level - default value
        customer.totalOrdersCount,
        customer.totalOrdersValue.amount,
        customer.lastOrderDate?.getTime() || null,
        customer.status.toLowerCase(),
        customer.createdAt.getTime(),
        customer.updatedAt?.getTime() || customer.createdAt.getTime(),
        customer.createdBy
      );

      return customer;
    } catch (error) {
      if (error instanceof CustomerAlreadyExistsError) {
        throw error;
      }
      // Log the actual error for debugging
      console.error('Repository save error:', error);
      throw new CustomerRepositoryError(
        `Failed to save customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'save',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find customer by ID
   */
  async findById(id: string): Promise<Customer | null> {
    try {
      const query = 'SELECT * FROM customers WHERE id = ?';
      const stmt = this.db.prepare(query);
      const row = stmt.get(id) as CustomerPersistenceData | undefined;

      return row ? this.mapToCustomer(row) : null;
    } catch (error) {
      throw new CustomerRepositoryError(
        `Failed to find customer by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findById',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find customer by customer code
   */
  async findByCustomerCode(customerCode: string, agencyId: string): Promise<Customer | null> {
    try {
      const query = 'SELECT * FROM customers WHERE customer_code = ? AND agency_id = ?';
      const stmt = this.db.prepare(query);
      const row = stmt.get(customerCode, agencyId) as CustomerPersistenceData | undefined;

      return row ? this.mapToCustomer(row) : null;
    } catch (error) {
      throw new CustomerRepositoryError(
        `Failed to find customer by code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByCustomerCode',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if customer exists by customer code
   */
  async existsByCustomerCode(customerCode: string, agencyId: string): Promise<boolean> {
    try {
      const query = 'SELECT 1 FROM customers WHERE customer_code = ? AND agency_id = ? LIMIT 1';
      const stmt = this.db.prepare(query);
      const row = stmt.get(customerCode, agencyId);
      return row !== undefined;
    } catch (error) {
      throw new CustomerRepositoryError(
        `Failed to check customer existence by code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsByCustomerCode',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find customer by email
   */
  async findByEmail(email: Email, agencyId?: string): Promise<Customer | null> {
    try {
      const baseQuery = 'SELECT * FROM customers WHERE email = ?';
      const query = agencyId ? `${baseQuery} AND agency_id = ?` : baseQuery;
      const stmt = this.db.prepare(query);
      const params = agencyId ? [email.value, agencyId] : [email.value];
      const row = stmt.get(...params) as CustomerPersistenceData | undefined;

      return row ? this.mapToCustomer(row) : null;
    } catch (error) {
      throw new CustomerRepositoryError(
        `Failed to find customer by email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findByEmail',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if customer exists by email
   */
  async existsByEmail(email: Email, agencyId?: string): Promise<boolean> {
    try {
      const baseQuery = 'SELECT 1 FROM customers WHERE email = ?';
      const query = agencyId ? `${baseQuery} AND agency_id = ? LIMIT 1` : `${baseQuery} LIMIT 1`;
      const stmt = this.db.prepare(query);
      const params = agencyId ? [email.value, agencyId] : [email.value];
      const row = stmt.get(...params);
      return row !== undefined;
    } catch (error) {
      throw new CustomerRepositoryError(
        `Failed to check customer existence by email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'existsByEmail',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check repository health
   */
  async isHealthy(): Promise<boolean> {
    try {
      const query = 'SELECT 1 FROM customers LIMIT 1';
      const stmt = this.db.prepare(query);
      stmt.get();
      return true;
    } catch (error) {
      console.error('Customer repository health check failed:', error);
      return false;
    }
  }

  /**
   * Search customers with filtering and pagination
   */
  async search(criteria: CustomerSearchCriteria): Promise<CustomerSearchResult> {
    try {
      const startTime = Date.now();

      // Build the SQL query with filters
      let query = `
        SELECT 
          id,
          agency_id,
          customer_code,
          customer_name,
          business_name,
          contact_person,
          phone,
          email,
          address,
          city,
          state,
          country,
          zip_code,
          credit_limit,
          current_balance,
          payment_terms,
          customer_type,
          status,
          tax_number,
          website,
          created_by,
          created_at,
          updated_by,
          updated_at
        FROM customers
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      // Add filters
      if (criteria.agencyId) {
        query += ` AND agency_id = $${paramIndex++}`;
        params.push(criteria.agencyId);
      }

      if (criteria.customerCode) {
        query += ` AND customer_code = $${paramIndex++}`;
        params.push(criteria.customerCode);
      }

      if (criteria.customerType) {
        query += ` AND customer_type = $${paramIndex++}`;
        params.push(criteria.customerType);
      }

      if (criteria.status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(criteria.status);
      }

      if (criteria.city) {
        query += ` AND city = $${paramIndex++}`;
        params.push(criteria.city);
      }

      if (criteria.state) {
        query += ` AND state = $${paramIndex++}`;
        params.push(criteria.state);
      }

      if (criteria.country) {
        query += ` AND country = $${paramIndex++}`;
        params.push(criteria.country);
      }

      // Full text search across multiple fields
      if (criteria.search) {
        query += ` AND (
          customer_code LIKE $${paramIndex} OR
          customer_name LIKE $${paramIndex} OR
          business_name LIKE $${paramIndex} OR
          email LIKE $${paramIndex}
        )`;
        params.push(`%${criteria.search}%`);
        paramIndex++;
      }

      // Get total count for pagination
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as count FROM');
      const countResult = this.db.prepare(countQuery).get(...params) as { count: number };
      const total = countResult.count;

      // Add sorting
      const sortBy = criteria.sortBy || 'customerCode';
      const sortOrder = criteria.sortOrder || 'asc';

      const sortMapping: Record<string, string> = {
        customerCode: 'customer_code',
        fullName: 'customer_name',
        companyName: 'business_name',
        createdAt: 'created_at',
      };

      const dbSortField = sortMapping[sortBy] || 'customer_code';
      query += ` ORDER BY ${dbSortField} ${sortOrder.toUpperCase()}`;

      // Add pagination
      const limit = Math.min(criteria.limit || 10, 100); // Cap at 100
      const offset = criteria.offset || 0;

      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      // Execute query
      const rows = this.db.prepare(query).all(...params) as any[];

      // Convert rows to Customer entities
      const customers: Customer[] = [];
      for (const row of rows) {
        try {
          const customer = this.mapToCustomer(row);
          customers.push(customer);
        } catch (error) {
          console.warn('Failed to map customer row:', row.id, error);
          // Continue with other customers
        }
      }

      const hasMore = total > offset + limit;
      const duration = Date.now() - startTime;

      console.log(`Customer search completed: ${customers.length}/${total} customers in ${duration}ms`);

      return {
        customers,
        total,
        limit,
        offset,
        hasMore,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Repository search error:', {
        criteria,
        error: errorMessage,
        operation: 'search',
      });

      throw new CustomerRepositoryError(
        `Failed to search customers: ${errorMessage}`,
        'search',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find all customers with optional filtering
   */
  async findAll(agencyId?: string, limit: number = 1000): Promise<readonly Customer[]> {
    try {
      let query = 'SELECT * FROM customers';
      const params: any[] = [];

      if (agencyId) {
        query += ' WHERE agency_id = ?';
        params.push(agencyId);
      }

      query += ' ORDER BY customer_name ASC LIMIT ?';
      params.push(limit);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as CustomerPersistenceData[];

      return rows.map((row) => this.mapToCustomer(row));
    } catch (error) {
      throw new CustomerRepositoryError(
        `Failed to find all customers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'findAll',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update an existing customer
   */
  async update(customer: Customer): Promise<Customer> {
    try {
      // Check if customer exists
      const existing = await this.findById(customer.id);
      if (!existing) {
        throw new CustomerRepositoryError(`Customer with ID ${customer.id} not found`, 'update');
      }

      // Check if customer code already exists for different customer
      const codeExists = await this.findByCustomerCode(customer.customerCode, customer.agencyId);
      if (codeExists && codeExists.id !== customer.id) {
        throw new CustomerAlreadyExistsError(customer.customerCode, customer.agencyId);
      }

      // Check if email already exists for different customer (if provided)
      if (customer.email) {
        const emailExists = await this.findByEmail(customer.email, customer.agencyId);
        if (emailExists && emailExists.id !== customer.id) {
          throw new CustomerAlreadyExistsError(customer.customerCode, customer.agencyId);
        }
      }

      const updateQuery = `
        UPDATE customers SET
          customer_code = ?,
          customer_name = ?,
          business_name = ?,
          contact_person = ?,
          phone = ?,
          email = ?,
          address = ?,
          city = ?,
          postal_code = ?,
          credit_limit = ?,
          current_balance = ?,
          payment_terms = ?,
          customer_type = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
      `;

      const stmt = this.db.prepare(updateQuery);

      // Map Customer entity to database fields
      const defaultAddress = customer.addresses.length > 0 ? customer.addresses[0] : null;
      const primaryContact = customer.contacts && customer.contacts.length > 0 ? customer.contacts[0] : null;

      stmt.run(
        customer.customerCode,
        customer.fullName,
        customer.companyName,
        primaryContact?.name || null,
        customer.phone,
        customer.email?.value || null,
        defaultAddress ? `${defaultAddress.street}, ${defaultAddress.state}` : null,
        defaultAddress?.city || null,
        defaultAddress?.zipCode || null,
        customer.creditLimit.amount,
        customer.outstandingBalance.amount,
        this.mapPaymentTermsToDays(customer.paymentTerms),
        customer.customerType.toLowerCase(),
        customer.status.toLowerCase(),
        customer.updatedAt?.getTime() || Date.now(),
        customer.id
      );

      return customer;
    } catch (error) {
      if (error instanceof CustomerAlreadyExistsError) {
        throw error;
      }
      throw new CustomerRepositoryError(
        `Failed to update customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'update',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete (soft delete) a customer by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Check if customer exists
      const existing = await this.findById(id);
      if (!existing) {
        return false;
      }

      // Soft delete by updating status to inactive
      const deleteQuery = `
        UPDATE customers SET 
          status = 'inactive',
          updated_at = ?
        WHERE id = ?
      `;

      const stmt = this.db.prepare(deleteQuery);
      const result = stmt.run(Date.now(), id);

      return result.changes > 0;
    } catch (error) {
      throw new CustomerRepositoryError(
        `Failed to delete customer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  // =============================================================================
  // PLACEHOLDER METHODS - Step 1A: Not Yet Implemented
  // These will be implemented in subsequent steps
  // =============================================================================

  async findByLocation(
    location: { city?: string; state?: string; country?: string },
    agencyId?: string,
    limit: number = 100
  ): Promise<readonly Customer[]> {
    throw new CustomerRepositoryError('FindByLocation method not yet implemented', 'findByLocation');
  }

  async findByStatus(status: CustomerStatus, agencyId?: string, limit: number = 100): Promise<readonly Customer[]> {
    throw new CustomerRepositoryError('FindByStatus method not yet implemented', 'findByStatus');
  }

  async findByType(customerType: CustomerType, agencyId?: string, limit: number = 100): Promise<readonly Customer[]> {
    throw new CustomerRepositoryError('FindByType method not yet implemented', 'findByType');
  }

  async findByPaymentTerms(terms: PaymentTerms, agencyId?: string, limit: number = 100): Promise<readonly Customer[]> {
    throw new CustomerRepositoryError('FindByPaymentTerms method not yet implemented', 'findByPaymentTerms');
  }

  async findByCreditRange(minCredit: Money, maxCredit: Money, limit: number = 100): Promise<readonly Customer[]> {
    throw new CustomerRepositoryError('FindByCreditRange method not yet implemented', 'findByCreditRange');
  }

  async findOverdueCustomers(limit: number = 100): Promise<readonly Customer[]> {
    throw new CustomerRepositoryError('FindOverdueCustomers method not yet implemented', 'findOverdueCustomers');
  }

  async findWithOutstandingBalance(agencyId?: string, limit: number = 100): Promise<readonly Customer[]> {
    throw new CustomerRepositoryError(
      'FindWithOutstandingBalance method not yet implemented',
      'findWithOutstandingBalance'
    );
  }

  async findWithOverduePayments(agencyId?: string, limit: number = 100): Promise<readonly Customer[]> {
    throw new CustomerRepositoryError('FindWithOverduePayments method not yet implemented', 'findWithOverduePayments');
  }

  async findHighValueCustomers(threshold: Money, agencyId?: string, limit: number = 100): Promise<readonly Customer[]> {
    throw new CustomerRepositoryError('FindHighValueCustomers method not yet implemented', 'findHighValueCustomers');
  }

  async count(agencyId?: string): Promise<number> {
    throw new CustomerRepositoryError('Count method not yet implemented', 'count');
  }

  async countByCriteria(criteria: Partial<CustomerSearchCriteria>): Promise<number> {
    throw new CustomerRepositoryError('CountByCriteria method not yet implemented', 'countByCriteria');
  }

  async getStats(agencyId?: string): Promise<CustomerRepositoryStats> {
    throw new CustomerRepositoryError('GetStats method not yet implemented', 'getStats');
  }

  async beginTransaction(): Promise<ICustomerRepositoryTransaction> {
    throw new CustomerRepositoryError('BeginTransaction method not yet implemented', 'beginTransaction');
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Map database row to Customer entity
   */
  private mapToCustomer(row: CustomerPersistenceData): Customer {
    try {
      // Create simplified CustomerPersistence object that matches current domain expectations
      const persistence = {
        id: row.id,
        customerCode: row.customer_code,
        companyName: row.business_name,
        firstName: this.extractFirstName(row.customer_name),
        lastName: this.extractLastName(row.customer_name),
        fullName: row.customer_name,
        customerType: this.mapDatabaseToCustomerType(row.customer_type),
        status: this.mapDatabaseToCustomerStatus(row.status),
        email: row.email || 'placeholder@example.com',
        phone: row.phone,
        mobile: null, // Not in current database schema
        addresses: this.mapDatabaseToAddresses(row),
        contacts: this.mapDatabaseToContacts(row),
        creditLimit: row.credit_limit,
        creditLimitCurrency: 'USD' as const,
        outstandingBalance: row.current_balance,
        outstandingBalanceCurrency: 'USD' as const,
        availableCredit: Math.max(0, row.credit_limit - row.current_balance),
        paymentTerms: this.mapDaysToPaymentTerms(row.payment_terms),
        taxNumber: null, // Not in current database schema
        website: null, // Not in current database schema
        notes: null, // Not in current database schema
        lastOrderDate: row.last_order_date ? new Date(row.last_order_date) : null,
        totalOrdersCount: row.total_orders,
        totalOrdersValue: row.total_revenue,
        averageOrderValue: row.total_orders > 0 ? row.total_revenue / row.total_orders : 0,
        agencyId: row.agency_id,
        createdBy: row.created_by || '',
        createdAt: new Date(row.created_at),
        updatedBy: null, // Not in current database schema
        updatedAt: new Date(row.updated_at),
        purchaseHistory: [], // Not stored in simple schema
        creditLimitHistory: [], // Not stored in simple schema
      };

      return Customer.fromPersistence(persistence);
    } catch (error) {
      throw new CustomerRepositoryError(
        `Failed to map database row to Customer entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'mapToCustomer',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extract first name from full name
   */
  private extractFirstName(fullName: string): string {
    const parts = fullName.trim().split(' ');
    return parts[0] || '';
  }

  /**
   * Extract last name from full name
   */
  private extractLastName(fullName: string): string {
    const parts = fullName.trim().split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  /**
   * Map database customer type to domain enum
   */
  private mapDatabaseToCustomerType(dbType: string): CustomerType {
    const typeMap: Record<string, CustomerType> = {
      regular: CustomerType.RETAIL,
      wholesale: CustomerType.WHOLESALE,
      retail: CustomerType.RETAIL,
      distributor: CustomerType.DISTRIBUTOR,
    };
    return typeMap[dbType.toLowerCase()] || CustomerType.RETAIL;
  }

  /**
   * Map database status to domain enum
   */
  private mapDatabaseToCustomerStatus(dbStatus: string): CustomerStatus {
    const statusMap: Record<string, CustomerStatus> = {
      active: CustomerStatus.ACTIVE,
      inactive: CustomerStatus.INACTIVE,
      suspended: CustomerStatus.SUSPENDED,
      blacklisted: CustomerStatus.BLACKLISTED,
    };
    return statusMap[dbStatus.toLowerCase()] || CustomerStatus.PENDING_APPROVAL;
  }

  /**
   * Map database fields to addresses array
   */
  private mapDatabaseToAddresses(row: CustomerPersistenceData): any[] {
    if (!row.address || !row.city) {
      return [];
    }

    return [
      {
        street: row.address,
        city: row.city,
        state: '', // Not separately stored in current schema
        zipCode: row.postal_code || '',
        country: 'USA', // Default assumption
        isDefault: true,
        addressType: 'BOTH' as const,
      },
    ];
  }

  /**
   * Map database fields to contacts array
   */
  private mapDatabaseToContacts(row: CustomerPersistenceData): any[] {
    if (!row.contact_person) {
      return [];
    }

    return [
      {
        name: row.contact_person,
        title: undefined,
        email: row.email ? Email.create(row.email) : undefined,
        phone: row.phone,
        mobile: undefined,
        isPrimary: true,
      },
    ];
  }

  /**
   * Map payment terms enum to days
   */
  private mapPaymentTermsToDays(terms: PaymentTerms): number {
    const termsMap: Record<PaymentTerms, number> = {
      [PaymentTerms.CASH_ON_DELIVERY]: 0,
      [PaymentTerms.NET_7]: 7,
      [PaymentTerms.NET_15]: 15,
      [PaymentTerms.NET_30]: 30,
      [PaymentTerms.NET_45]: 45,
      [PaymentTerms.NET_60]: 60,
      [PaymentTerms.ADVANCE_PAYMENT]: 0,
      [PaymentTerms.LETTER_OF_CREDIT]: 30,
    };
    return termsMap[terms] || 30;
  }

  /**
   * Map days to payment terms enum
   */
  private mapDaysToPaymentTerms(days: number): PaymentTerms {
    const daysMap: Record<number, PaymentTerms> = {
      0: PaymentTerms.CASH_ON_DELIVERY,
      7: PaymentTerms.NET_7,
      15: PaymentTerms.NET_15,
      30: PaymentTerms.NET_30,
      45: PaymentTerms.NET_45,
      60: PaymentTerms.NET_60,
    };
    return daysMap[days] || PaymentTerms.NET_30;
  }
}

/**
 * Factory function to create SqliteCustomerRepository
 */
export function createCustomerRepository(connection: DatabaseConnection): ICustomerRepository {
  if (!connection) {
    throw new CustomerRepositoryConnectionError('Database connection is required', 'constructor');
  }
  return new SqliteCustomerRepository(connection);
}
