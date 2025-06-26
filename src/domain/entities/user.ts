/**
 * User Entity
 * Central domain entity for user management in offline authentication system
 * Following Domain-Driven Design principles
 */

import type { Email } from '../value-objects/email';
import type { Role, SystemRole, Permission } from '../value-objects/role';
import type { Password, HashedPassword } from '../value-objects/password';

/**
 * User status enumeration
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

/**
 * User creation parameters
 */
export interface CreateUserParams {
  email: string;
  password: string;
  role: string | SystemRole;
  firstName: string;
  lastName: string;
  status?: UserStatus;
  agencyId?: string; // For agency admin assignment
}

/**
 * User properties for entity construction
 */
export interface UserProps {
  id: string;
  email: Email;
  password: Password;
  role: Role;
  firstName: string;
  lastName: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | undefined;
  loginAttempts: number;
  lockedUntil: Date | undefined;
  agencyId: string | undefined; // Agency assignment for agency admins
}

/**
 * User entity domain errors
 */
export class UserDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserDomainError';
  }
}

export class UserValidationError extends UserDomainError {
  constructor(field: string, reason: string) {
    super(`User validation error in ${field}: ${reason}`);
    this.name = 'UserValidationError';
  }
}

export class UserSecurityError extends UserDomainError {
  constructor(reason: string) {
    super(`User security error: ${reason}`);
    this.name = 'UserSecurityError';
  }
}

/**
 * User Entity
 * Aggregate root for user domain - designed for offline authentication
 */
export class User {
  private readonly _id: string;
  private _email: Email;
  private _password: Password;
  private _role: Role;
  private _firstName: string;
  private _lastName: string;
  private _status: UserStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _lastLoginAt: Date | undefined;
  private _loginAttempts: number;
  private _lockedUntil: Date | undefined;
  private _agencyId: string | undefined; // Agency assignment

  // Security constants for offline system
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MINUTES = 30;
  private static readonly PASSWORD_EXPIRY_DAYS = 90;

  /**
   * Creates a User entity
   * @param props - User properties
   */
  constructor(props: UserProps) {
    this.validateUserProps(props);

    this._id = props.id;
    this._email = props.email;
    this._password = props.password;
    this._role = props.role;
    this._firstName = props.firstName;
    this._lastName = props.lastName;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._lastLoginAt = props.lastLoginAt;
    this._loginAttempts = props.loginAttempts;
    this._lockedUntil = props.lockedUntil;
    this._agencyId = props.agencyId;
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get email(): Email {
    return this._email;
  }

  public get role(): Role {
    return this._role;
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

  public get status(): UserStatus {
    return this._status;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt);
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  public get lastLoginAt(): Date | undefined {
    return this._lastLoginAt ? new Date(this._lastLoginAt) : undefined;
  }

  public get loginAttempts(): number {
    return this._loginAttempts;
  }

  public get lockedUntil(): Date | undefined {
    return this._lockedUntil ? new Date(this._lockedUntil) : undefined;
  }

  public get agencyId(): string | undefined {
    return this._agencyId;
  }

  /**
   * Gets the hashed password data for persistence
   * @returns Hashed password object
   */
  public getHashedPassword(): Readonly<HashedPassword> {
    return this._password.hashedPassword;
  }

  // Business Logic Methods for Offline Authentication

  /**
   * Authenticates user with password (offline verification)
   * @param plainTextPassword - Password to verify
   * @returns True if authentication successful
   * @throws {UserSecurityError} When user is locked or suspended
   */
  public authenticate(plainTextPassword: string): boolean {
    // Check if user is currently locked
    if (this.isAccountLocked()) {
      throw new UserSecurityError('Account is currently locked due to too many failed login attempts');
    }

    // Check if user is suspended
    if (this._status === UserStatus.SUSPENDED) {
      throw new UserSecurityError('Account is suspended');
    }

    // Check if user is inactive
    if (this._status === UserStatus.INACTIVE) {
      throw new UserSecurityError('Account is inactive');
    }

    // Verify password using local hashing
    const isValid = this._password.verify(plainTextPassword);

    if (isValid) {
      this.onSuccessfulLogin();
      return true;
    } else {
      this.onFailedLogin();
      return false;
    }
  }

  /**
   * Changes user password (offline operation)
   * @param currentPassword - Current password for verification
   * @param newPassword - New password
   * @returns True if password changed successfully
   * @throws {UserSecurityError} When current password is invalid
   */
  public changePassword(currentPassword: string, newPassword: string): boolean {
    // Verify current password locally
    if (!this._password.verify(currentPassword)) {
      throw new UserSecurityError('Current password is invalid');
    }

    // Import Password class dynamically to avoid circular imports
    const { Password } = require('../value-objects/password');
    const newPasswordObj = Password.fromPlainText(newPassword);

    // Don't allow same password - compare the plaintext since hashes will be different
    if (this._password.verify(newPassword)) {
      throw new UserSecurityError('New password must be different from current password');
    }

    this._password = newPasswordObj;
    this.updateTimestamp();

    return true;
  }

  /**
   * Updates user email
   * @param newEmail - New email address
   * @throws {UserValidationError} When email is invalid
   */
  public updateEmail(newEmail: string): void {
    const { Email } = require('../value-objects/email');
    const emailObj = Email.fromString(newEmail);

    if (this._email.equals(emailObj)) {
      throw new UserValidationError('email', 'New email must be different from current email');
    }

    this._email = emailObj;
    this.updateTimestamp();
  }

  /**
   * Updates user role (with authorization check)
   * @param newRole - New role
   * @param updatedBy - User performing the update (for authorization)
   * @throws {UserSecurityError} When unauthorized
   */
  public updateRole(newRole: string | SystemRole, updatedBy: User): void {
    const { Role } = require('../value-objects/role');
    const roleObj = Role.fromString(newRole.toString());

    // Authorization check - only higher roles can change roles
    if (!updatedBy.role.canManage(this._role)) {
      throw new UserSecurityError('Insufficient permissions to update user role');
    }

    // Cannot assign a role higher than the updater's role
    if (roleObj.isHigherThan(updatedBy.role)) {
      throw new UserSecurityError('Cannot assign a role higher than your own');
    }

    this._role = roleObj;
    this.updateTimestamp();
  }

  /**
   * Updates user profile information
   * @param firstName - New first name
   * @param lastName - New last name
   */
  public updateProfile(firstName: string, lastName: string): void {
    this.validateName(firstName, 'firstName');
    this.validateName(lastName, 'lastName');

    this._firstName = firstName.trim();
    this._lastName = lastName.trim();
    this.updateTimestamp();
  }

  /**
   * Activates user account
   * @param activatedBy - User performing the activation
   * @throws {UserSecurityError} When unauthorized
   */
  public activate(activatedBy: User): void {
    const { Permission } = require('../value-objects/role');
    if (!activatedBy.hasPermission(Permission.UPDATE_USER)) {
      throw new UserSecurityError('Insufficient permissions to activate user');
    }

    this._status = UserStatus.ACTIVE;
    this._loginAttempts = 0;
    this._lockedUntil = undefined;
    this.updateTimestamp();
  }

  /**
   * Suspends user account
   * @param suspendedBy - User performing the suspension
   * @throws {UserSecurityError} When unauthorized
   */
  public suspend(suspendedBy: User): void {
    const { Permission } = require('../value-objects/role');

    // Cannot suspend users with higher or equal roles
    if (!suspendedBy.role.isHigherThan(this._role)) {
      throw new UserSecurityError('Cannot suspend users with equal or higher roles');
    }

    if (!suspendedBy.hasPermission(Permission.UPDATE_USER)) {
      throw new UserSecurityError('Insufficient permissions to suspend user');
    }

    this._status = UserStatus.SUSPENDED;
    this.updateTimestamp();
  }

  /**
   * Unlocks user account manually
   * @param unlockedBy - User performing the unlock
   * @throws {UserSecurityError} When unauthorized
   */
  public unlock(unlockedBy: User): void {
    const { Permission } = require('../value-objects/role');
    if (!unlockedBy.hasPermission(Permission.UPDATE_USER)) {
      throw new UserSecurityError('Insufficient permissions to unlock user');
    }

    this._loginAttempts = 0;
    this._lockedUntil = undefined;
    this.updateTimestamp();
  }

  // Query Methods

  /**
   * Checks if user has a specific permission
   * @param permission - Permission to check
   * @returns True if user has permission
   */
  public hasPermission(permission: Permission): boolean {
    if (this._status !== UserStatus.ACTIVE) {
      return false;
    }

    return this._role.hasPermission(permission);
  }

  /**
   * Checks if user has all specified permissions
   * @param permissions - Array of permissions to check
   * @returns True if user has all permissions
   */
  public hasAllPermissions(permissions: Permission[]): boolean {
    if (this._status !== UserStatus.ACTIVE) {
      return false;
    }

    return this._role.hasAllPermissions(permissions);
  }

  /**
   * Checks if user account is currently locked
   * @returns True if account is locked
   */
  public isAccountLocked(): boolean {
    if (!this._lockedUntil) {
      return false;
    }

    // Check if lock has expired
    if (Date.now() > this._lockedUntil.getTime()) {
      // Auto-unlock expired locks
      this._lockedUntil = undefined;
      this._loginAttempts = 0;
      return false;
    }

    return true;
  }

  /**
   * Checks if password needs to be changed (offline policy)
   * @returns True if password is expired
   */
  public isPasswordExpired(): boolean {
    return this._password.isOlderThan(User.PASSWORD_EXPIRY_DAYS);
  }

  /**
   * Checks if user can manage another user
   * @param targetUser - User to check management capability for
   * @returns True if this user can manage the target user
   */
  public canManageUser(targetUser: User): boolean {
    const { Permission } = require('../value-objects/role');
    if (!this.hasPermission(Permission.UPDATE_USER)) {
      return false;
    }

    return this._role.canManage(targetUser._role);
  }

  /**
   * Gets user's display information (safe for UI)
   * @returns User display object
   */
  public getDisplayInfo(): {
    id: string;
    email: string;
    fullName: string;
    role: string;
    roleName: string;
    status: UserStatus;
    lastLoginAt: Date | undefined;
    isLocked: boolean;
    isPasswordExpired: boolean;
    agencyId: string | undefined;
  } {
    return {
      id: this._id,
      email: this._email.value,
      fullName: this.fullName,
      role: this._role.value,
      roleName: this._role.name,
      status: this._status,
      lastLoginAt: this._lastLoginAt,
      isLocked: this.isAccountLocked(),
      isPasswordExpired: this.isPasswordExpired(),
      agencyId: this._agencyId,
    };
  }

  /**
   * Gets user data for offline storage/persistence
   * @returns User persistence object
   */
  public toPersistence(): {
    id: string;
    email: string;
    password: HashedPassword;
    role: string;
    firstName: string;
    lastName: string;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | undefined;
    loginAttempts: number;
    lockedUntil: Date | undefined;
    agencyId: string | undefined;
  } {
    return {
      id: this._id,
      email: this._email.value,
      password: this._password.hashedPassword,
      role: this._role.value,
      firstName: this._firstName,
      lastName: this._lastName,
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      lastLoginAt: this._lastLoginAt,
      loginAttempts: this._loginAttempts,
      lockedUntil: this._lockedUntil,
      agencyId: this._agencyId,
    };
  }

  // Factory Methods

  /**
   * Creates a new User entity (offline user creation)
   * @param params - User creation parameters
   * @param createdBy - User creating this user (for authorization)
   * @returns New User entity
   * @throws {UserSecurityError} When unauthorized
   */
  public static create(params: CreateUserParams, createdBy?: User): User {
    // Authorization check for user creation
    if (createdBy) {
      const { Permission } = require('../value-objects/role');
      if (!createdBy.hasPermission(Permission.CREATE_USER)) {
        throw new UserSecurityError('Insufficient permissions to create user');
      }
    }

    // Validate parameters
    User.validateCreateParams(params);

    // Create value objects
    const { Email } = require('../value-objects/email');
    const { Password } = require('../value-objects/password');
    const { Role } = require('../value-objects/role');

    const email = Email.fromString(params.email);
    const password = Password.fromPlainText(params.password);
    const role = Role.fromString(params.role.toString());

    // Authorization check - cannot create users with higher roles
    if (createdBy && role.isHigherThan(createdBy.role)) {
      throw new UserSecurityError('Cannot create users with roles higher than your own');
    }

    // Generate unique ID for offline system
    const id = User.generateId();

    const now = new Date();

    const userProps: UserProps = {
      id,
      email,
      password,
      role,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      status: params.status || UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      loginAttempts: 0,
      agencyId: params.agencyId,
    };

    return new User(userProps);
  }

  /**
   * Reconstructs User from offline storage data
   * @param persistenceData - Data from offline storage
   * @returns User entity
   */
  public static fromPersistence(persistenceData: {
    id: string;
    email: string;
    password: HashedPassword;
    role: string;
    firstName: string;
    lastName: string;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | undefined;
    loginAttempts: number;
    lockedUntil: Date | undefined;
    agencyId: string | undefined;
  }): User {
    // Reconstruct value objects
    const { Email } = require('../value-objects/email');
    const { Password } = require('../value-objects/password');
    const { Role } = require('../value-objects/role');

    const email = Email.fromString(persistenceData.email);
    const password = Password.fromHash(persistenceData.password);
    const role = Role.fromString(persistenceData.role);

    const userProps: UserProps = {
      id: persistenceData.id,
      email,
      password,
      role,
      firstName: persistenceData.firstName,
      lastName: persistenceData.lastName,
      status: persistenceData.status,
      createdAt: persistenceData.createdAt,
      updatedAt: persistenceData.updatedAt,
      lastLoginAt: persistenceData.lastLoginAt,
      loginAttempts: persistenceData.loginAttempts,
      lockedUntil: persistenceData.lockedUntil,
      agencyId: persistenceData.agencyId,
    };

    return new User(userProps);
  }

  // Private Methods

  /**
   * Handles successful login for offline tracking
   */
  private onSuccessfulLogin(): void {
    this._lastLoginAt = new Date();
    this._loginAttempts = 0;
    this._lockedUntil = undefined;
    this.updateTimestamp();
  }

  /**
   * Handles failed login attempt for offline security
   */
  private onFailedLogin(): void {
    this._loginAttempts += 1;

    if (this._loginAttempts >= User.MAX_LOGIN_ATTEMPTS) {
      const lockoutDuration = User.LOCKOUT_DURATION_MINUTES * 60 * 1000;
      this._lockedUntil = new Date(Date.now() + lockoutDuration);
    }

    this.updateTimestamp();
  }

  /**
   * Updates the updatedAt timestamp
   */
  private updateTimestamp(): void {
    this._updatedAt = new Date();
  }

  /**
   * Validates user properties
   * @param props - User properties to validate
   * @throws {UserValidationError} When validation fails
   */
  private validateUserProps(props: UserProps): void {
    if (!props.id || typeof props.id !== 'string' || props.id.trim().length === 0) {
      throw new UserValidationError('id', 'ID is required and must be a non-empty string');
    }

    this.validateName(props.firstName, 'firstName');
    this.validateName(props.lastName, 'lastName');

    if (props.loginAttempts < 0) {
      throw new UserValidationError('loginAttempts', 'Login attempts cannot be negative');
    }
  }

  /**
   * Validates name fields
   * @param name - Name to validate
   * @param field - Field name for error reporting
   * @throws {UserValidationError} When validation fails
   */
  private validateName(name: string, field: string): void {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new UserValidationError(field, `${field} is required and must be a non-empty string`);
    }

    if (name.trim().length < 2) {
      throw new UserValidationError(field, `${field} must be at least 2 characters long`);
    }

    if (name.trim().length > 50) {
      throw new UserValidationError(field, `${field} must not exceed 50 characters`);
    }

    // Basic name validation (letters, spaces, hyphens, apostrophes)
    if (!/^[a-zA-Z\s\-']+$/.test(name.trim())) {
      throw new UserValidationError(field, `${field} contains invalid characters`);
    }
  }

  /**
   * Validates user creation parameters
   * @param params - Creation parameters to validate
   * @throws {UserValidationError} When validation fails
   */
  private static validateCreateParams(params: CreateUserParams): void {
    if (!params.email || typeof params.email !== 'string') {
      throw new UserValidationError('email', 'Email is required');
    }

    if (!params.password || typeof params.password !== 'string') {
      throw new UserValidationError('password', 'Password is required');
    }

    if (!params.role) {
      throw new UserValidationError('role', 'Role is required');
    }

    if (!params.firstName || typeof params.firstName !== 'string') {
      throw new UserValidationError('firstName', 'First name is required');
    }

    if (!params.lastName || typeof params.lastName !== 'string') {
      throw new UserValidationError('lastName', 'Last name is required');
    }
  }

  /**
   * Generates a unique user ID for offline system
   * @returns Unique ID string
   */
  private static generateId(): string {
    // Offline-friendly ID generation
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `user_${timestamp}_${randomPart}`;
  }

  /**
   * Assigns agency to user (for agency admins)
   * @param agencyId - Agency ID to assign
   * @param updatedBy - User performing the update (for authorization)
   * @throws {UserSecurityError} When unauthorized
   */
  public assignAgency(agencyId: string, updatedBy: User): void {
    // Only super admins can assign agencies
    if (updatedBy.role.value !== SystemRole.SUPER_ADMIN) {
      throw new UserSecurityError('Only super administrators can assign agencies');
    }

    // Only agency admins can be assigned to agencies
    if (this._role.value !== SystemRole.ADMIN) {
      throw new UserSecurityError('Only agency administrators can be assigned to agencies');
    }

    this._agencyId = agencyId;
    this.updateTimestamp();
  }

  /**
   * Removes agency assignment
   * @param updatedBy - User performing the update (for authorization)
   * @throws {UserSecurityError} When unauthorized
   */
  public removeAgencyAssignment(updatedBy: User): void {
    // Only super admins can remove agency assignments
    if (updatedBy.role.value !== SystemRole.SUPER_ADMIN) {
      throw new UserSecurityError('Only super administrators can remove agency assignments');
    }

    this._agencyId = undefined;
    this.updateTimestamp();
  }
}
