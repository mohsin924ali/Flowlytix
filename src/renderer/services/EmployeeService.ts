/**
 * Employee Service - Step 5: Frontend Integration
 *
 * Service layer for employee management operations.
 * Handles communication with the main process through Electron IPC API.
 * Follows Clean Architecture principles with proper error handling and type safety.
 *
 * @domain Employee Management
 * @architecture Clean Architecture - Service Layer
 * @version 1.0.0 - Step 5: Frontend Integration
 */

// Employee interfaces following domain model from Step 1
export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  department: EmployeeDepartment;
  position: string;
  hireDate: string; // ISO date string
  salary?: number;
  agencyId: string;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export enum EmployeeDepartment {
  SALES = 'sales',
  WAREHOUSE = 'warehouse',
  CUSTOMER_SERVICE = 'customer_service',
  ADMINISTRATION = 'administration',
  QUALITY_CONTROL = 'quality_control',
  SHIPPING = 'shipping',
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
  ON_LEAVE = 'on_leave',
}

export interface CreateEmployeeParams {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: EmployeeDepartment;
  position: string;
  agencyId: string;
  status?: EmployeeStatus;
  phoneNumber?: string;
  address?: string;
  hireDate?: string; // ISO date string
  salary?: number;
}

export interface CreateEmployeeResult {
  success: boolean;
  employeeId?: string;
  employeeNumber?: string;
  fullName?: string;
  agencyId?: string;
  error?: string;
  validationErrors?: string[];
}

export interface ListEmployeesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  department?: EmployeeDepartment;
  status?: EmployeeStatus;
  agencyId?: string;
}

export interface ListEmployeesResult {
  employees: Employee[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface UpdateEmployeeParams {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  department?: EmployeeDepartment;
  position?: string;
  salary?: number;
  status?: EmployeeStatus;
}

export interface UpdateEmployeeResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Employee Service Implementation
 *
 * Provides a clean interface for employee operations with proper error handling,
 * input validation, and type safety. Communicates with main process via IPC.
 * Following established patterns from AgencyService.
 */
export class EmployeeService {
  /**
   * List all employees with optional filtering and pagination
   * @param params - Filtering and pagination parameters
   * @returns Promise with employees list and metadata
   */
  public static async listEmployees(params: ListEmployeesParams = {}): Promise<ListEmployeesResult> {
    try {
      // Validate parameters
      if (params.page !== undefined && params.page < 1) {
        throw new Error('Page number must be greater than 0');
      }
      if (params.pageSize !== undefined && (params.pageSize < 1 || params.pageSize > 100)) {
        throw new Error('Page size must be between 1 and 100');
      }
      if (params.agencyId && typeof params.agencyId !== 'string') {
        throw new Error('Agency ID must be a valid string');
      }

      // Call IPC API (placeholder - will be implemented in future step)
      // TODO: Implement IPC API for employee operations
      const response = await this.getEmployeesPlaceholder(params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch employees');
      }

      return response.data;
    } catch (error) {
      console.error('EmployeeService.listEmployees error:', error);
      throw new Error(error instanceof Error ? error.message : 'An unexpected error occurred while fetching employees');
    }
  }

  /**
   * Create a new employee with validation
   * @param params - Employee creation parameters
   * @returns Promise with created employee details
   */
  public static async createEmployee(params: CreateEmployeeParams): Promise<CreateEmployeeResult> {
    try {
      // Validate required parameters
      if (!params.employeeId || typeof params.employeeId !== 'string') {
        throw new Error('Employee ID is required');
      }

      if (params.employeeId.trim().length < 2) {
        throw new Error('Employee ID must be at least 2 characters long');
      }

      if (!params.firstName || typeof params.firstName !== 'string') {
        throw new Error('First name is required');
      }

      if (params.firstName.trim().length < 1) {
        throw new Error('First name cannot be empty');
      }

      if (!params.lastName || typeof params.lastName !== 'string') {
        throw new Error('Last name is required');
      }

      if (params.lastName.trim().length < 1) {
        throw new Error('Last name cannot be empty');
      }

      if (!params.email || !this.isValidEmail(params.email)) {
        throw new Error('Valid email address is required');
      }

      if (!params.department || !Object.values(EmployeeDepartment).includes(params.department)) {
        throw new Error('Valid department is required');
      }

      if (!params.position || typeof params.position !== 'string') {
        throw new Error('Position is required');
      }

      if (params.position.trim().length < 2) {
        throw new Error('Position must be at least 2 characters long');
      }

      if (!params.agencyId || typeof params.agencyId !== 'string') {
        throw new Error('Agency ID is required');
      }

      // Validate optional parameters
      if (params.phoneNumber && !this.isValidPhone(params.phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      if (params.salary !== undefined && (params.salary < 0 || params.salary > 1000000)) {
        throw new Error('Salary must be between 0 and 1,000,000');
      }

      if (params.hireDate && !this.isValidDate(params.hireDate)) {
        throw new Error('Invalid hire date format (use YYYY-MM-DD)');
      }

      if (params.status && !Object.values(EmployeeStatus).includes(params.status)) {
        throw new Error('Invalid employee status');
      }

      // Validate business rules
      this.validateBusinessRules(params);

      // Call IPC API (placeholder - will be implemented in future step)
      // TODO: Implement IPC API for employee operations
      const response = await this.createEmployeePlaceholder(params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create employee');
      }

      return response;
    } catch (error) {
      console.error('EmployeeService.createEmployee error:', error);
      throw new Error(error instanceof Error ? error.message : 'An unexpected error occurred while creating employee');
    }
  }

  /**
   * Update an existing employee
   * @param employeeId - Employee ID to update
   * @param params - Update parameters
   * @returns Promise with update result
   */
  public static async updateEmployee(employeeId: string, params: UpdateEmployeeParams): Promise<UpdateEmployeeResult> {
    try {
      // Validate parameters
      if (!employeeId || typeof employeeId !== 'string') {
        throw new Error('Employee ID is required');
      }

      if (params.email && !this.isValidEmail(params.email)) {
        throw new Error('Invalid email format');
      }

      if (params.phoneNumber && !this.isValidPhone(params.phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      if (params.salary !== undefined && (params.salary < 0 || params.salary > 1000000)) {
        throw new Error('Salary must be between 0 and 1,000,000');
      }

      if (params.department && !Object.values(EmployeeDepartment).includes(params.department)) {
        throw new Error('Invalid department');
      }

      if (params.status && !Object.values(EmployeeStatus).includes(params.status)) {
        throw new Error('Invalid employee status');
      }

      // Call IPC API (placeholder - will be implemented in future step)
      // TODO: Implement IPC API for employee operations
      const response = await this.updateEmployeePlaceholder(employeeId, params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update employee');
      }

      return {
        success: true,
        message: response.message || 'Employee updated successfully',
      };
    } catch (error) {
      console.error('EmployeeService.updateEmployee error:', error);
      throw new Error(error instanceof Error ? error.message : 'An unexpected error occurred while updating employee');
    }
  }

  /**
   * Delete an employee
   * @param employeeId - Employee ID to delete
   * @returns Promise with deletion result
   */
  public static async deleteEmployee(employeeId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!employeeId || typeof employeeId !== 'string') {
        throw new Error('Employee ID is required');
      }

      // Call IPC API (placeholder - will be implemented in future step)
      // TODO: Implement IPC API for employee operations
      const response = await this.deleteEmployeePlaceholder(employeeId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete employee');
      }

      return {
        success: true,
        message: response.message || 'Employee deleted successfully',
      };
    } catch (error) {
      console.error('EmployeeService.deleteEmployee error:', error);
      throw new Error(error instanceof Error ? error.message : 'An unexpected error occurred while deleting employee');
    }
  }

  /**
   * Get employee by ID
   * @param employeeId - Employee ID to fetch
   * @returns Promise with employee details
   */
  public static async getEmployeeById(employeeId: string): Promise<Employee> {
    try {
      if (!employeeId || typeof employeeId !== 'string') {
        throw new Error('Employee ID is required');
      }

      // Call IPC API (placeholder - will be implemented in future step)
      // TODO: Implement IPC API for employee operations
      const response = await this.getEmployeeByIdPlaceholder(employeeId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch employee');
      }

      return response.data;
    } catch (error) {
      console.error('EmployeeService.getEmployeeById error:', error);
      throw new Error(error instanceof Error ? error.message : 'An unexpected error occurred while fetching employee');
    }
  }

  // Helper methods for validation

  /**
   * Validate email format
   * @param email - Email to validate
   * @returns True if valid
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  /**
   * Validate phone number format
   * @param phone - Phone number to validate
   * @returns True if valid
   */
  private static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s()+.-]{10,20}$/;
    return phoneRegex.test(phone.trim());
  }

  /**
   * Validate date format (YYYY-MM-DD)
   * @param date - Date string to validate
   * @returns True if valid
   */
  private static isValidDate(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return false;
    }
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
  }

  /**
   * Validate business rules for employee creation
   * @param params - Employee parameters to validate
   * @throws Error if business rules are violated
   */
  private static validateBusinessRules(params: CreateEmployeeParams): void {
    // Hire date cannot be in the future
    if (params.hireDate) {
      const hireDate = new Date(params.hireDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      if (hireDate > today) {
        throw new Error('Hire date cannot be in the future');
      }

      // Hire date cannot be more than 5 years in the past
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      if (hireDate < fiveYearsAgo) {
        throw new Error('Hire date cannot be more than 5 years in the past');
      }
    }

    // Department-specific position validation
    this.validatePositionForDepartment(params.department, params.position);

    // Salary range validation by department
    if (params.salary !== undefined) {
      this.validateSalaryForDepartment(params.department, params.salary);
    }
  }

  /**
   * Validate position is appropriate for department
   * @param department - Employee department
   * @param position - Employee position
   * @throws Error if position is not appropriate for department
   */
  private static validatePositionForDepartment(department: EmployeeDepartment, position: string): void {
    const positionLower = position.toLowerCase();

    switch (department) {
      case EmployeeDepartment.SALES:
        const salesPositions = ['sales', 'account', 'business development', 'key account'];
        if (!salesPositions.some((pos) => positionLower.includes(pos))) {
          throw new Error('Position should be sales-related for Sales department');
        }
        break;

      case EmployeeDepartment.WAREHOUSE:
        const warehousePositions = ['warehouse', 'forklift', 'inventory', 'shipping', 'receiving'];
        if (!warehousePositions.some((pos) => positionLower.includes(pos))) {
          throw new Error('Position should be warehouse-related for Warehouse department');
        }
        break;

      case EmployeeDepartment.ADMINISTRATION:
        const adminPositions = ['administrator', 'hr', 'accountant', 'office', 'administrative', 'finance'];
        if (!adminPositions.some((pos) => positionLower.includes(pos))) {
          throw new Error('Position should be administrative for Administration department');
        }
        break;

      // Other departments are more flexible
    }
  }

  /**
   * Validate salary is within reasonable range for department
   * @param department - Employee department
   * @param salary - Employee salary
   * @throws Error if salary is outside reasonable range
   */
  private static validateSalaryForDepartment(department: EmployeeDepartment, salary: number): void {
    const salaryRanges = {
      [EmployeeDepartment.ADMINISTRATION]: { min: 35000, max: 150000 },
      [EmployeeDepartment.SALES]: { min: 30000, max: 120000 },
      [EmployeeDepartment.WAREHOUSE]: { min: 25000, max: 80000 },
      [EmployeeDepartment.CUSTOMER_SERVICE]: { min: 28000, max: 70000 },
      [EmployeeDepartment.QUALITY_CONTROL]: { min: 32000, max: 90000 },
      [EmployeeDepartment.SHIPPING]: { min: 26000, max: 75000 },
    };

    const range = salaryRanges[department];
    if (salary < range.min || salary > range.max) {
      throw new Error(
        `Salary should be between $${range.min.toLocaleString()} and $${range.max.toLocaleString()} for ${department} department`
      );
    }
  }

  // Display helpers

  /**
   * Get display-friendly department name
   * @param department - Employee department
   * @returns Display name
   */
  public static getDepartmentDisplay(department: EmployeeDepartment): string {
    switch (department) {
      case EmployeeDepartment.SALES:
        return 'Sales';
      case EmployeeDepartment.WAREHOUSE:
        return 'Warehouse';
      case EmployeeDepartment.CUSTOMER_SERVICE:
        return 'Customer Service';
      case EmployeeDepartment.ADMINISTRATION:
        return 'Administration';
      case EmployeeDepartment.QUALITY_CONTROL:
        return 'Quality Control';
      case EmployeeDepartment.SHIPPING:
        return 'Shipping';
      default:
        return department;
    }
  }

  /**
   * Get display-friendly status name
   * @param status - Employee status
   * @returns Display name
   */
  public static getStatusDisplay(status: EmployeeStatus): string {
    switch (status) {
      case EmployeeStatus.ACTIVE:
        return 'Active';
      case EmployeeStatus.INACTIVE:
        return 'Inactive';
      case EmployeeStatus.TERMINATED:
        return 'Terminated';
      case EmployeeStatus.ON_LEAVE:
        return 'On Leave';
      default:
        return status;
    }
  }

  /**
   * Get status color for UI components
   * @param status - Employee status
   * @returns Material-UI color
   */
  public static getStatusColor(status: EmployeeStatus): 'success' | 'warning' | 'error' | 'default' {
    switch (status) {
      case EmployeeStatus.ACTIVE:
        return 'success';
      case EmployeeStatus.INACTIVE:
        return 'warning';
      case EmployeeStatus.TERMINATED:
        return 'error';
      case EmployeeStatus.ON_LEAVE:
        return 'default';
      default:
        return 'default';
    }
  }

  /**
   * Format salary for display
   * @param salary - Salary amount
   * @returns Formatted salary string
   */
  public static formatSalary(salary?: number): string {
    if (salary === undefined || salary === null) {
      return 'Not specified';
    }
    return `$${salary.toLocaleString()}`;
  }

  // Placeholder methods - Will be replaced with actual IPC calls in future step
  // These provide mock data for frontend development

  /**
   * Placeholder for listing employees - Mock implementation
   * @param params - List parameters
   * @returns Mock response
   */
  private static async getEmployeesPlaceholder(params: ListEmployeesParams): Promise<{
    success: boolean;
    data: ListEmployeesResult;
    error?: string;
  }> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock data for development
    const mockEmployees: Employee[] = [
      {
        id: '1',
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        email: 'john.doe@company.com',
        phoneNumber: '(555) 123-4567',
        address: '123 Main St, City, State',
        department: EmployeeDepartment.SALES,
        position: 'Sales Representative',
        hireDate: '2023-01-15',
        salary: 55000,
        agencyId: 'agency-1',
        status: EmployeeStatus.ACTIVE,
        createdAt: '2023-01-15T09:00:00Z',
        updatedAt: '2023-01-15T09:00:00Z',
        createdBy: 'admin',
      },
      {
        id: '2',
        employeeId: 'EMP002',
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith',
        email: 'jane.smith@company.com',
        phoneNumber: '(555) 987-6543',
        address: '456 Oak Ave, City, State',
        department: EmployeeDepartment.WAREHOUSE,
        position: 'Warehouse Supervisor',
        hireDate: '2022-06-01',
        salary: 48000,
        agencyId: 'agency-1',
        status: EmployeeStatus.ACTIVE,
        createdAt: '2022-06-01T09:00:00Z',
        updatedAt: '2022-06-01T09:00:00Z',
        createdBy: 'admin',
      },
    ];

    return {
      success: true,
      data: {
        employees: mockEmployees,
        totalCount: mockEmployees.length,
        page: params.page || 1,
        pageSize: params.pageSize || 25,
      },
    };
  }

  /**
   * Placeholder for creating employee - Mock implementation
   * @param params - Create parameters
   * @returns Mock response
   */
  private static async createEmployeePlaceholder(params: CreateEmployeeParams): Promise<CreateEmployeeResult> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      success: true,
      employeeId: `emp-${Date.now()}`,
      employeeNumber: params.employeeId,
      fullName: `${params.firstName} ${params.lastName}`,
      agencyId: params.agencyId,
    };
  }

  /**
   * Placeholder for updating employee - Mock implementation
   * @param employeeId - Employee ID
   * @param params - Update parameters
   * @returns Mock response
   */
  private static async updateEmployeePlaceholder(
    employeeId: string,
    params: UpdateEmployeeParams
  ): Promise<{ success: boolean; message: string; error?: string }> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    return {
      success: true,
      message: 'Employee updated successfully',
    };
  }

  /**
   * Placeholder for deleting employee - Mock implementation
   * @param employeeId - Employee ID
   * @returns Mock response
   */
  private static async deleteEmployeePlaceholder(employeeId: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    return {
      success: true,
      message: 'Employee deleted successfully',
    };
  }

  /**
   * Placeholder for getting employee by ID - Mock implementation
   * @param employeeId - Employee ID
   * @returns Mock response
   */
  private static async getEmployeeByIdPlaceholder(employeeId: string): Promise<{
    success: boolean;
    data: Employee;
    error?: string;
  }> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Mock employee data
    const mockEmployee: Employee = {
      id: employeeId,
      employeeId: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      email: 'john.doe@company.com',
      phoneNumber: '(555) 123-4567',
      address: '123 Main St, City, State',
      department: EmployeeDepartment.SALES,
      position: 'Sales Representative',
      hireDate: '2023-01-15',
      salary: 55000,
      agencyId: 'agency-1',
      status: EmployeeStatus.ACTIVE,
      createdAt: '2023-01-15T09:00:00Z',
      updatedAt: '2023-01-15T09:00:00Z',
      createdBy: 'admin',
    };

    return {
      success: true,
      data: mockEmployee,
    };
  }
}
