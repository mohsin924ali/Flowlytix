/**
 * Employee Entity
 * Domain entity for employee data used in business flows
 * Note: This is NOT a user type - employees are data entities only
 * Following Domain-Driven Design principles
 */

import { Email } from '../value-objects/email';

/**
 * Employee status enumeration
 */
export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
  ON_LEAVE = 'on_leave',
}

/**
 * Employee department enumeration
 */
export enum EmployeeDepartment {
  SALES = 'sales',
  WAREHOUSE = 'warehouse',
  CUSTOMER_SERVICE = 'customer_service',
  ADMINISTRATION = 'administration',
  QUALITY_CONTROL = 'quality_control',
  SHIPPING = 'shipping',
}

/**
 * Employee creation parameters
 */
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
  hireDate?: Date;
  salary?: number;
}

/**
 * Employee properties for entity construction
 */
export interface EmployeeProps {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: Email;
  department: EmployeeDepartment;
  position: string;
  agencyId: string;
  status: EmployeeStatus;
  phoneNumber: string | undefined;
  address: string | undefined;
  hireDate: Date;
  salary: number | undefined;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Employee entity domain errors
 */
export class EmployeeDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmployeeDomainError';
  }
}

export class EmployeeValidationError extends EmployeeDomainError {
  constructor(field: string, reason: string) {
    super(`Employee validation error in ${field}: ${reason}`);
    this.name = 'EmployeeValidationError';
  }
}

/**
 * Employee Entity
 * Represents employee data for business operations
 */
export class Employee {
  private readonly _id: string;
  private _employeeId: string;
  private _firstName: string;
  private _lastName: string;
  private _email: Email;
  private _department: EmployeeDepartment;
  private _position: string;
  private readonly _agencyId: string;
  private _status: EmployeeStatus;
  private _phoneNumber: string | undefined;
  private _address: string | undefined;
  private readonly _hireDate: Date;
  private _salary: number | undefined;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private readonly _createdBy: string;

  /**
   * Creates an Employee entity
   * @param props - Employee properties
   */
  constructor(props: EmployeeProps) {
    this.validateEmployeeProps(props);

    this._id = props.id;
    this._employeeId = props.employeeId;
    this._firstName = props.firstName;
    this._lastName = props.lastName;
    this._email = props.email;
    this._department = props.department;
    this._position = props.position;
    this._agencyId = props.agencyId;
    this._status = props.status;
    this._phoneNumber = props.phoneNumber;
    this._address = props.address;
    this._hireDate = props.hireDate;
    this._salary = props.salary;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._createdBy = props.createdBy;
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get employeeId(): string {
    return this._employeeId;
  }

  public get firstName(): string {
    return this._firstName;
  }

  public get lastName(): string {
    return this._lastName;
  }

  public get fullName(): string {
    return `${this._firstName} ${this._lastName}`.trim();
  }

  public get email(): Email {
    return this._email;
  }

  public get department(): EmployeeDepartment {
    return this._department;
  }

  public get position(): string {
    return this._position;
  }

  public get agencyId(): string {
    return this._agencyId;
  }

  public get status(): EmployeeStatus {
    return this._status;
  }

  public get phoneNumber(): string | undefined {
    return this._phoneNumber;
  }

  public get address(): string | undefined {
    return this._address;
  }

  public get hireDate(): Date {
    return new Date(this._hireDate);
  }

  public get salary(): number | undefined {
    return this._salary;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt);
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  public get createdBy(): string {
    return this._createdBy;
  }

  // Business Logic Methods

  /**
   * Updates employee profile information
   * @param firstName - New first name
   * @param lastName - New last name
   * @param phoneNumber - New phone number (optional)
   * @param address - New address (optional)
   */
  public updateProfile(firstName: string, lastName: string, phoneNumber?: string, address?: string): void {
    this.validateName(firstName, 'firstName');
    this.validateName(lastName, 'lastName');

    this._firstName = firstName.trim();
    this._lastName = lastName.trim();
    this._phoneNumber = phoneNumber?.trim();
    this._address = address?.trim();
    this.updateTimestamp();
  }

  /**
   * Updates employee email
   * @param newEmail - New email address
   */
  public updateEmail(newEmail: string): void {
    const email = Email.fromString(newEmail);
    this._email = email;
    this.updateTimestamp();
  }

  /**
   * Updates employee department and position
   * @param department - New department
   * @param position - New position
   */
  public updateDepartmentAndPosition(department: EmployeeDepartment, position: string): void {
    if (!position || position.trim().length === 0) {
      throw new EmployeeValidationError('position', 'Position cannot be empty');
    }

    this._department = department;
    this._position = position.trim();
    this.updateTimestamp();
  }

  /**
   * Updates employee salary
   * @param salary - New salary amount
   */
  public updateSalary(salary: number): void {
    if (salary < 0) {
      throw new EmployeeValidationError('salary', 'Salary cannot be negative');
    }

    this._salary = salary;
    this.updateTimestamp();
  }

  /**
   * Activates the employee
   */
  public activate(): void {
    this._status = EmployeeStatus.ACTIVE;
    this.updateTimestamp();
  }

  /**
   * Deactivates the employee
   */
  public deactivate(): void {
    this._status = EmployeeStatus.INACTIVE;
    this.updateTimestamp();
  }

  /**
   * Terminates the employee
   */
  public terminate(): void {
    this._status = EmployeeStatus.TERMINATED;
    this.updateTimestamp();
  }

  /**
   * Sets employee on leave
   */
  public setOnLeave(): void {
    this._status = EmployeeStatus.ON_LEAVE;
    this.updateTimestamp();
  }

  /**
   * Checks if employee is active
   * @returns True if employee is active
   */
  public isActive(): boolean {
    return this._status === EmployeeStatus.ACTIVE;
  }

  /**
   * Gets display information for UI
   */
  public getDisplayInfo(): {
    id: string;
    employeeId: string;
    fullName: string;
    email: string;
    department: string;
    position: string;
    status: EmployeeStatus;
    agencyId: string;
    hireDate: Date;
    isActive: boolean;
  } {
    return {
      id: this._id,
      employeeId: this._employeeId,
      fullName: this.fullName,
      email: this._email.value,
      department: this._department,
      position: this._position,
      status: this._status,
      agencyId: this._agencyId,
      hireDate: this.hireDate,
      isActive: this.isActive(),
    };
  }

  /**
   * Converts to persistence format
   */
  public toPersistence(): {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    department: EmployeeDepartment;
    position: string;
    agencyId: string;
    status: EmployeeStatus;
    phoneNumber: string | undefined;
    address: string | undefined;
    hireDate: Date;
    salary: number | undefined;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
  } {
    return {
      id: this._id,
      employeeId: this._employeeId,
      firstName: this._firstName,
      lastName: this._lastName,
      email: this._email.value,
      department: this._department,
      position: this._position,
      agencyId: this._agencyId,
      status: this._status,
      phoneNumber: this._phoneNumber,
      address: this._address,
      hireDate: this._hireDate,
      salary: this._salary,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      createdBy: this._createdBy,
    };
  }

  /**
   * Creates a new Employee entity
   * @param params - Employee creation parameters
   * @param createdBy - ID of user creating this employee
   * @returns New Employee instance
   */
  public static create(params: CreateEmployeeParams, createdBy: string): Employee {
    this.validateCreateParams(params);

    const id = this.generateId();
    const now = new Date();
    const email = Email.fromString(params.email);

    return new Employee({
      id,
      employeeId: params.employeeId,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      email,
      department: params.department,
      position: params.position.trim(),
      agencyId: params.agencyId,
      status: params.status || EmployeeStatus.ACTIVE,
      phoneNumber: params.phoneNumber?.trim(),
      address: params.address?.trim(),
      hireDate: params.hireDate || now,
      salary: params.salary,
      createdAt: now,
      updatedAt: now,
      createdBy,
    });
  }

  /**
   * Creates Employee from persistence data
   * @param persistenceData - Data from database
   * @returns Employee instance
   */
  public static fromPersistence(persistenceData: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    department: EmployeeDepartment;
    position: string;
    agencyId: string;
    status: EmployeeStatus;
    phoneNumber: string | undefined;
    address: string | undefined;
    hireDate: Date;
    salary: number | undefined;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
  }): Employee {
    const email = Email.fromString(persistenceData.email);

    return new Employee({
      ...persistenceData,
      email,
    });
  }

  // Private helper methods

  private updateTimestamp(): void {
    this._updatedAt = new Date();
  }

  private validateEmployeeProps(props: EmployeeProps): void {
    if (!props.id || props.id.trim().length === 0) {
      throw new EmployeeValidationError('id', 'ID is required');
    }

    if (!props.employeeId || props.employeeId.trim().length === 0) {
      throw new EmployeeValidationError('employeeId', 'Employee ID is required');
    }

    this.validateName(props.firstName, 'firstName');
    this.validateName(props.lastName, 'lastName');

    if (!props.position || props.position.trim().length === 0) {
      throw new EmployeeValidationError('position', 'Position is required');
    }

    if (!props.agencyId || props.agencyId.trim().length === 0) {
      throw new EmployeeValidationError('agencyId', 'Agency ID is required');
    }

    if (!props.createdBy || props.createdBy.trim().length === 0) {
      throw new EmployeeValidationError('createdBy', 'CreatedBy is required');
    }
  }

  private validateName(name: string, field: string): void {
    if (!name || name.trim().length === 0) {
      throw new EmployeeValidationError(field, 'Name cannot be empty');
    }

    if (name.trim().length < 2) {
      throw new EmployeeValidationError(field, 'Name must be at least 2 characters long');
    }

    if (name.trim().length > 50) {
      throw new EmployeeValidationError(field, 'Name cannot exceed 50 characters');
    }

    if (!/^[a-zA-Z\s\-'\.]+$/.test(name.trim())) {
      throw new EmployeeValidationError(field, 'Name contains invalid characters');
    }
  }

  private static validateCreateParams(params: CreateEmployeeParams): void {
    if (!params.employeeId || params.employeeId.trim().length === 0) {
      throw new EmployeeValidationError('employeeId', 'Employee ID is required');
    }

    if (!params.firstName || params.firstName.trim().length === 0) {
      throw new EmployeeValidationError('firstName', 'First name is required');
    }

    if (!params.lastName || params.lastName.trim().length === 0) {
      throw new EmployeeValidationError('lastName', 'Last name is required');
    }

    if (!params.email || params.email.trim().length === 0) {
      throw new EmployeeValidationError('email', 'Email is required');
    }

    if (!params.position || params.position.trim().length === 0) {
      throw new EmployeeValidationError('position', 'Position is required');
    }

    if (!params.agencyId || params.agencyId.trim().length === 0) {
      throw new EmployeeValidationError('agencyId', 'Agency ID is required');
    }

    if (!Object.values(EmployeeDepartment).includes(params.department)) {
      throw new EmployeeValidationError('department', 'Invalid department');
    }
  }

  private static generateId(): string {
    return `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
