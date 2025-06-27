/**
 * Employee Repository Interface
 * Domain layer port for employee data access
 * Following Domain-Driven Design (DDD) and Hexagonal Architecture principles
 *
 * This interface defines the contract for employee data operations
 * without exposing implementation details (Repository pattern)
 */

import type { Employee } from '../entities/employee';
import type { Email } from '../value-objects/email';
import type { EmployeeDepartment, EmployeeStatus } from '../entities/employee';

/**
 * Employee search criteria for filtering operations
 * Following composition over inheritance principle
 */
export interface EmployeeSearchCriteria {
  readonly agencyId?: string;
  readonly department?: EmployeeDepartment;
  readonly status?: EmployeeStatus;
  readonly searchTerm?: string; // Search across name, email, employeeId
  readonly hiredAfter?: Date;
  readonly hiredBefore?: Date;
  readonly isActive?: boolean;
}

/**
 * Employee sorting options
 * Following clear naming conventions
 */
export interface EmployeeSortOptions {
  readonly field: 'firstName' | 'lastName' | 'email' | 'department' | 'position' | 'hireDate' | 'createdAt';
  readonly direction: 'asc' | 'desc';
}

/**
 * Pagination parameters
 * Following single responsibility principle
 */
export interface PaginationParams {
  readonly limit: number;
  readonly offset: number;
}

/**
 * Paginated result wrapper
 * Generic type for reusability across the domain
 */
export interface PaginatedResult<TEntity> {
  readonly items: ReadonlyArray<TEntity>;
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

/**
 * Employee repository domain errors
 * Following error boundary principles
 */
export class EmployeeRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'EmployeeRepositoryError';
  }
}

export class EmployeeNotFoundError extends EmployeeRepositoryError {
  constructor(identifier: string, cause?: Error) {
    super(`Employee not found: ${identifier}`, cause);
    this.name = 'EmployeeNotFoundError';
  }
}

export class EmployeeAlreadyExistsError extends EmployeeRepositoryError {
  constructor(employeeId: string, cause?: Error) {
    super(`Employee already exists with ID: ${employeeId}`, cause);
    this.name = 'EmployeeAlreadyExistsError';
  }
}

export class EmployeeConstraintViolationError extends EmployeeRepositoryError {
  constructor(constraint: string, cause?: Error) {
    super(`Employee constraint violation: ${constraint}`, cause);
    this.name = 'EmployeeConstraintViolationError';
  }
}

/**
 * Employee Repository Interface
 * Port in Hexagonal Architecture - defines business operations
 *
 * Following SOLID principles:
 * - Single Responsibility: Only employee data operations
 * - Open/Closed: Extensible without modification
 * - Liskov Substitution: Any implementation must be substitutable
 * - Interface Segregation: Focused interface, no unnecessary methods
 * - Dependency Inversion: Depends on abstractions, not concretions
 */
export interface IEmployeeRepository {
  /**
   * Saves a new employee or updates existing one
   * @param employee - Employee entity to save
   * @returns Promise<void>
   * @throws {EmployeeAlreadyExistsError} When employee ID already exists (for new employees)
   * @throws {EmployeeConstraintViolationError} When data violates constraints
   * @throws {EmployeeRepositoryError} For other repository errors
   */
  save(employee: Employee): Promise<void>;

  /**
   * Finds employee by unique identifier
   * @param id - Employee unique identifier
   * @returns Promise<Employee | null> - Employee if found, null otherwise
   * @throws {EmployeeRepositoryError} For repository errors
   */
  findById(id: string): Promise<Employee | null>;

  /**
   * Finds employee by employee ID (business identifier)
   * @param employeeId - Employee business identifier
   * @returns Promise<Employee | null> - Employee if found, null otherwise
   * @throws {EmployeeRepositoryError} For repository errors
   */
  findByEmployeeId(employeeId: string): Promise<Employee | null>;

  /**
   * Finds employee by email address
   * @param email - Employee email address
   * @returns Promise<Employee | null> - Employee if found, null otherwise
   * @throws {EmployeeRepositoryError} For repository errors
   */
  findByEmail(email: Email): Promise<Employee | null>;

  /**
   * Finds all employees for a specific agency
   * @param agencyId - Agency identifier
   * @param pagination - Pagination parameters (optional)
   * @param sort - Sort options (optional)
   * @returns Promise<PaginatedResult<Employee>> - Paginated employee list
   * @throws {EmployeeRepositoryError} For repository errors
   */
  findByAgencyId(
    agencyId: string,
    pagination?: PaginationParams,
    sort?: EmployeeSortOptions
  ): Promise<PaginatedResult<Employee>>;

  /**
   * Searches employees with criteria
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters (optional)
   * @param sort - Sort options (optional)
   * @returns Promise<PaginatedResult<Employee>> - Paginated search results
   * @throws {EmployeeRepositoryError} For repository errors
   */
  search(
    criteria: EmployeeSearchCriteria,
    pagination?: PaginationParams,
    sort?: EmployeeSortOptions
  ): Promise<PaginatedResult<Employee>>;

  /**
   * Counts employees by criteria
   * @param criteria - Search criteria
   * @returns Promise<number> - Total count
   * @throws {EmployeeRepositoryError} For repository errors
   */
  count(criteria?: EmployeeSearchCriteria): Promise<number>;

  /**
   * Checks if employee exists by employee ID
   * @param employeeId - Employee business identifier
   * @returns Promise<boolean> - True if exists, false otherwise
   * @throws {EmployeeRepositoryError} For repository errors
   */
  existsByEmployeeId(employeeId: string): Promise<boolean>;

  /**
   * Checks if employee exists by email
   * @param email - Employee email address
   * @returns Promise<boolean> - True if exists, false otherwise
   * @throws {EmployeeRepositoryError} For repository errors
   */
  existsByEmail(email: Email): Promise<boolean>;

  /**
   * Deletes employee by ID
   * @param id - Employee unique identifier
   * @returns Promise<boolean> - True if deleted, false if not found
   * @throws {EmployeeConstraintViolationError} When deletion violates constraints
   * @throws {EmployeeRepositoryError} For other repository errors
   */
  delete(id: string): Promise<boolean>;

  /**
   * Gets employees by department within agency
   * @param agencyId - Agency identifier
   * @param department - Employee department
   * @param pagination - Pagination parameters (optional)
   * @param sort - Sort options (optional)
   * @returns Promise<PaginatedResult<Employee>> - Paginated employee list
   * @throws {EmployeeRepositoryError} For repository errors
   */
  findByAgencyAndDepartment(
    agencyId: string,
    department: EmployeeDepartment,
    pagination?: PaginationParams,
    sort?: EmployeeSortOptions
  ): Promise<PaginatedResult<Employee>>;

  /**
   * Gets active employees for agency
   * @param agencyId - Agency identifier
   * @param pagination - Pagination parameters (optional)
   * @param sort - Sort options (optional)
   * @returns Promise<PaginatedResult<Employee>> - Paginated active employee list
   * @throws {EmployeeRepositoryError} For repository errors
   */
  findActiveByAgencyId(
    agencyId: string,
    pagination?: PaginationParams,
    sort?: EmployeeSortOptions
  ): Promise<PaginatedResult<Employee>>;
}
