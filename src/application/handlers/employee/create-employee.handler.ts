/**
 * Create Employee Handler - Step 4: Application Layer Implementation
 *
 * Handler for CreateEmployee command following CQRS pattern.
 * Implements business logic for employee creation with proper authorization,
 * validation, and business rules enforcement.
 *
 * Business Rules:
 * - Only users with CREATE_EMPLOYEE permission can create employees
 * - Employee ID must be unique within agency
 * - Email must be unique within agency
 * - Valid department and position requirements
 * - Agency must exist and be operational
 * - Salary constraints based on user permissions
 *
 * @domain Employee Management
 * @pattern Command Handler (CQRS)
 * @architecture Hexagonal Architecture - Application Layer
 * @version 1.0.0 - Step 4: Application Layer Implementation
 */

import {
  CreateEmployeeCommand,
  validateCreateEmployeeCommand,
  CreateEmployeeCommandValidationError,
} from '../../commands/employee/create-employee.command';
import { Employee, EmployeeDepartment, EmployeeStatus } from '../../../domain/entities/employee';
import { IEmployeeRepository } from '../../../domain/repositories/employee.repository';
import { IUserRepository } from '../../../domain/repositories/user.repository';
import { IAgencyRepository } from '../../../domain/repositories/agency.repository';
import { Email } from '../../../domain/value-objects/email';
import { Permission, SystemRole } from '../../../domain/value-objects/role';

/**
 * Result interface for CreateEmployee handler
 * Following clear contract definition principles
 */
export interface CreateEmployeeResult {
  readonly success: boolean;
  readonly employeeId?: string;
  readonly employeeNumber?: string;
  readonly fullName?: string;
  readonly agencyId?: string;
  readonly error?: string;
  readonly validationErrors?: string[];
}

/**
 * Create Employee Handler Error Classes
 * Following domain-specific error hierarchy
 */
export class CreateEmployeeHandlerError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CreateEmployeeHandlerError';
  }
}

export class CreateEmployeeAuthorizationError extends CreateEmployeeHandlerError {
  constructor(userId: string, requiredPermission: string) {
    super(`User ${userId} lacks required permission: ${requiredPermission}`);
    this.name = 'CreateEmployeeAuthorizationError';
  }
}

export class CreateEmployeeDuplicateError extends CreateEmployeeHandlerError {
  constructor(field: string, value: string, agencyId: string) {
    super(`Employee with ${field} '${value}' already exists in agency ${agencyId}`);
    this.name = 'CreateEmployeeDuplicateError';
  }
}

/**
 * Handler for CreateEmployee command
 * Implements business logic for employee creation with proper authorization
 * Following SOLID principles and enterprise patterns
 */
export class CreateEmployeeHandler {
  constructor(
    private readonly employeeRepository: IEmployeeRepository,
    private readonly userRepository: IUserRepository,
    private readonly agencyRepository: IAgencyRepository
  ) {
    // Validate dependencies
    if (!employeeRepository) {
      throw new CreateEmployeeHandlerError('Employee repository is required');
    }
    if (!userRepository) {
      throw new CreateEmployeeHandlerError('User repository is required');
    }
    if (!agencyRepository) {
      throw new CreateEmployeeHandlerError('Agency repository is required');
    }
  }

  /**
   * Handles employee creation command
   * @param command - CreateEmployee command
   * @returns Promise<CreateEmployeeResult> - Result with employee details and status
   * @throws {CreateEmployeeHandlerError} When business rules are violated
   */
  async handle(command: CreateEmployeeCommand): Promise<CreateEmployeeResult> {
    try {
      // Step 1: Validate command structure
      validateCreateEmployeeCommand(command);

      // Step 2: Authorization check
      await this.validateAuthorization(command.createdBy, command.agencyId);

      // Step 3: Validate business preconditions
      await this.validateBusinessPreconditions(command);

      // Step 4: Check for duplicates
      await this.validateUniqueness(command);

      // Step 5: Validate business rules
      await this.validateBusinessRules(command);

      // Step 6: Create employee entity
      const employee = await this.createEmployeeEntity(command);

      // Step 7: Save to repository
      await this.employeeRepository.save(employee);

      // Step 8: Return success result
      return {
        success: true,
        employeeId: employee.id,
        employeeNumber: employee.employeeId,
        fullName: employee.fullName,
        agencyId: employee.agencyId,
      };
    } catch (error) {
      // Log error for monitoring and debugging
      console.error('Create employee handler error:', {
        command: {
          employeeId: command.employeeId,
          email: command.email,
          agencyId: command.agencyId,
          createdBy: command.createdBy,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Return structured error response
      return this.createErrorResponse(error);
    }
  }

  /**
   * Validates user authorization for employee creation
   * @param userId - ID of user attempting to create employee
   * @param agencyId - Agency where employee will be created
   * @throws {CreateEmployeeAuthorizationError} When user lacks required permissions
   */
  private async validateAuthorization(userId: string, agencyId: string): Promise<void> {
    // Get the user who is creating this employee
    const creatingUser = await this.userRepository.findById(userId);
    if (!creatingUser) {
      throw new CreateEmployeeAuthorizationError(userId, 'User account must exist');
    }

    // Check if user has permission to create employees
    if (!creatingUser.hasPermission(Permission.CREATE_CUSTOMER)) {
      // Note: Using CREATE_CUSTOMER permission as proxy for employee creation
      // In future iterations, this should be a specific CREATE_EMPLOYEE permission
      throw new CreateEmployeeAuthorizationError(userId, 'CREATE_EMPLOYEE');
    }

    // Additional agency-specific authorization
    if (creatingUser.agencyId && creatingUser.agencyId !== agencyId) {
      // Agency admins can only create employees in their own agency
      if (creatingUser.role.value === SystemRole.ADMIN) {
        throw new CreateEmployeeAuthorizationError(
          userId,
          'Agency administrators can only create employees in their assigned agency'
        );
      }
    }

    // Super admins can create employees in any agency
    if (creatingUser.role.value !== SystemRole.SUPER_ADMIN && creatingUser.role.value !== SystemRole.ADMIN) {
      throw new CreateEmployeeAuthorizationError(userId, 'Administrator role required');
    }
  }

  /**
   * Validates business preconditions for employee creation
   * @param command - CreateEmployee command
   * @throws {CreateEmployeeHandlerError} When preconditions are not met
   */
  private async validateBusinessPreconditions(command: CreateEmployeeCommand): Promise<void> {
    // Validate agency exists and is operational
    const agency = await this.agencyRepository.findById(command.agencyId);
    if (!agency) {
      throw new CreateEmployeeHandlerError(`Agency ${command.agencyId} not found`);
    }

    if (!agency.isOperational()) {
      throw new CreateEmployeeHandlerError(`Agency ${command.agencyId} is not operational`);
    }

    // Validate department requirements based on agency settings
    await this.validateDepartmentRequirements(command, agency);
  }

  /**
   * Validates employee uniqueness within agency
   * @param command - CreateEmployee command
   * @throws {CreateEmployeeDuplicateError} When duplicate values are found
   */
  private async validateUniqueness(command: CreateEmployeeCommand): Promise<void> {
    // Check employee ID uniqueness within agency
    const existingByEmployeeId = await this.employeeRepository.existsByEmployeeId(command.employeeId);
    if (existingByEmployeeId) {
      throw new CreateEmployeeDuplicateError('employeeId', command.employeeId, command.agencyId);
    }

    // Check email uniqueness within agency
    const email = new Email(command.email);
    const existingByEmail = await this.employeeRepository.existsByEmail(email);
    if (existingByEmail) {
      throw new CreateEmployeeDuplicateError('email', command.email, command.agencyId);
    }
  }

  /**
   * Validates business rules for employee creation
   * @param command - CreateEmployee command
   * @throws {CreateEmployeeHandlerError} When business rules are violated
   */
  private async validateBusinessRules(command: CreateEmployeeCommand): Promise<void> {
    // Validate hire date is not in the future
    if (command.hireDate && command.hireDate > new Date()) {
      throw new CreateEmployeeHandlerError('Hire date cannot be in the future');
    }

    // Validate hire date is not too far in the past (reasonable business constraint)
    if (command.hireDate) {
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      if (command.hireDate < fiveYearsAgo) {
        throw new CreateEmployeeHandlerError('Hire date cannot be more than 5 years in the past');
      }
    }

    // Validate salary constraints based on department
    if (command.salary !== undefined) {
      await this.validateSalaryConstraints(command);
    }

    // Validate position requirements for department
    this.validatePositionRequirements(command);
  }

  /**
   * Validates department-specific requirements
   * @param command - CreateEmployee command
   * @param agency - Agency entity
   * @throws {CreateEmployeeHandlerError} When department requirements are not met
   */
  private async validateDepartmentRequirements(command: CreateEmployeeCommand, agency: any): Promise<void> {
    // Validate department-specific business rules
    switch (command.department) {
      case EmployeeDepartment.SALES:
        // Sales employees should have relevant positions
        if (!this.isValidSalesPosition(command.position)) {
          throw new CreateEmployeeHandlerError(
            'Invalid position for Sales department. Expected: Sales Representative, Account Manager, Sales Manager, etc.'
          );
        }
        break;

      case EmployeeDepartment.WAREHOUSE:
        // Warehouse employees should have relevant positions
        if (!this.isValidWarehousePosition(command.position)) {
          throw new CreateEmployeeHandlerError(
            'Invalid position for Warehouse department. Expected: Warehouse Associate, Forklift Operator, Inventory Clerk, etc.'
          );
        }
        break;

      case EmployeeDepartment.ADMINISTRATION:
        // Administration requires certain qualifications
        if (!this.isValidAdministrationPosition(command.position)) {
          throw new CreateEmployeeHandlerError(
            'Invalid position for Administration department. Expected: Administrator, HR Specialist, Accountant, etc.'
          );
        }
        break;

      // Add more department-specific validations as needed
    }
  }

  /**
   * Validates salary constraints based on department and agency settings
   * @param command - CreateEmployee command
   * @throws {CreateEmployeeHandlerError} When salary constraints are violated
   */
  private async validateSalaryConstraints(command: CreateEmployeeCommand): Promise<void> {
    const minSalary = this.getMinSalaryForDepartment(command.department);
    const maxSalary = this.getMaxSalaryForDepartment(command.department);

    if (command.salary! < minSalary) {
      throw new CreateEmployeeHandlerError(
        `Salary ${command.salary} is below minimum ${minSalary} for ${command.department} department`
      );
    }

    if (command.salary! > maxSalary) {
      throw new CreateEmployeeHandlerError(
        `Salary ${command.salary} exceeds maximum ${maxSalary} for ${command.department} department`
      );
    }
  }

  /**
   * Validates position requirements for department
   * @param command - CreateEmployee command
   * @throws {CreateEmployeeHandlerError} When position requirements are not met
   */
  private validatePositionRequirements(command: CreateEmployeeCommand): void {
    // Ensure position name follows business standards
    if (command.position.length < 2) {
      throw new CreateEmployeeHandlerError('Position name must be at least 2 characters');
    }

    if (command.position.length > 100) {
      throw new CreateEmployeeHandlerError('Position name cannot exceed 100 characters');
    }

    // Validate position naming conventions
    const positionPattern = /^[a-zA-Z0-9\s&'().,!?-]+$/;
    if (!positionPattern.test(command.position)) {
      throw new CreateEmployeeHandlerError('Position name contains invalid characters');
    }
  }

  /**
   * Creates employee entity from validated command
   * @param command - Validated CreateEmployee command
   * @returns Promise<Employee> - Created employee entity
   */
  private async createEmployeeEntity(command: CreateEmployeeCommand): Promise<Employee> {
    try {
      // Create employee parameters with proper optional handling
      const createParams: any = {
        employeeId: command.employeeId,
        firstName: command.firstName,
        lastName: command.lastName,
        email: command.email,
        department: command.department,
        position: command.position,
        agencyId: command.agencyId,
        status: command.status || EmployeeStatus.ACTIVE,
        hireDate: command.hireDate || new Date(),
      };

      // Add optional properties only if they are defined
      if (command.phoneNumber !== undefined) {
        createParams.phoneNumber = command.phoneNumber;
      }
      if (command.address !== undefined) {
        createParams.address = command.address;
      }
      if (command.salary !== undefined) {
        createParams.salary = command.salary;
      }

      // Create employee using domain factory method
      const employee = Employee.create(createParams, command.createdBy);

      return employee;
    } catch (error) {
      throw new CreateEmployeeHandlerError(
        `Failed to create employee entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Creates structured error response
   * @param error - Error that occurred
   * @returns CreateEmployeeResult - Error response
   */
  private createErrorResponse(error: unknown): CreateEmployeeResult {
    if (error instanceof CreateEmployeeCommandValidationError) {
      return {
        success: false,
        error: 'Validation error',
        validationErrors: [error.message],
      };
    }

    if (error instanceof CreateEmployeeAuthorizationError) {
      return {
        success: false,
        error: 'Authorization error: ' + error.message,
      };
    }

    if (error instanceof CreateEmployeeDuplicateError) {
      return {
        success: false,
        error: 'Duplicate error: ' + error.message,
      };
    }

    if (error instanceof CreateEmployeeHandlerError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Unknown error
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }

  // Helper methods for business rule validation

  private isValidSalesPosition(position: string): boolean {
    const validSalesPositions = [
      'sales representative',
      'account manager',
      'sales manager',
      'sales associate',
      'business development',
      'sales coordinator',
      'key account manager',
    ];
    return validSalesPositions.some((validPos) => position.toLowerCase().includes(validPos.toLowerCase()));
  }

  private isValidWarehousePosition(position: string): boolean {
    const validWarehousePositions = [
      'warehouse associate',
      'forklift operator',
      'inventory clerk',
      'warehouse supervisor',
      'shipping clerk',
      'receiving clerk',
      'warehouse manager',
    ];
    return validWarehousePositions.some((validPos) => position.toLowerCase().includes(validPos.toLowerCase()));
  }

  private isValidAdministrationPosition(position: string): boolean {
    const validAdminPositions = [
      'administrator',
      'hr specialist',
      'accountant',
      'office manager',
      'administrative assistant',
      'bookkeeper',
      'finance manager',
    ];
    return validAdminPositions.some((validPos) => position.toLowerCase().includes(validPos.toLowerCase()));
  }

  private getMinSalaryForDepartment(department: EmployeeDepartment): number {
    // Business rules for minimum salaries by department
    switch (department) {
      case EmployeeDepartment.ADMINISTRATION:
        return 35000;
      case EmployeeDepartment.SALES:
        return 30000;
      case EmployeeDepartment.WAREHOUSE:
        return 25000;
      case EmployeeDepartment.CUSTOMER_SERVICE:
        return 28000;
      case EmployeeDepartment.QUALITY_CONTROL:
        return 32000;
      case EmployeeDepartment.SHIPPING:
        return 26000;
      default:
        return 25000;
    }
  }

  private getMaxSalaryForDepartment(department: EmployeeDepartment): number {
    // Business rules for maximum salaries by department
    switch (department) {
      case EmployeeDepartment.ADMINISTRATION:
        return 150000;
      case EmployeeDepartment.SALES:
        return 120000;
      case EmployeeDepartment.WAREHOUSE:
        return 80000;
      case EmployeeDepartment.CUSTOMER_SERVICE:
        return 70000;
      case EmployeeDepartment.QUALITY_CONTROL:
        return 90000;
      case EmployeeDepartment.SHIPPING:
        return 75000;
      default:
        return 100000;
    }
  }
}

/**
 * Factory function to create CreateEmployee handler instance
 * Following established patterns from other handlers
 */
export function createEmployeeHandler(
  employeeRepository: IEmployeeRepository,
  userRepository: IUserRepository,
  agencyRepository: IAgencyRepository
): CreateEmployeeHandler {
  return new CreateEmployeeHandler(employeeRepository, userRepository, agencyRepository);
}
