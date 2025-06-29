/**
 * Role Value Object
 * Represents user roles for Role-Based Access Control (RBAC)
 * Following Domain-Driven Design principles
 */

/**
 * Available system roles - simplified to Super Admin and Agency Admin only
 */
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin', // Agency Admin
}

/**
 * Permission categories for fine-grained access control
 */
export enum Permission {
  // User management permissions
  CREATE_USER = 'user:create',
  READ_USER = 'user:read',
  UPDATE_USER = 'user:update',
  DELETE_USER = 'user:delete',

  // Agency management permissions
  CREATE_AGENCY = 'agency:create',
  READ_AGENCY = 'agency:read',
  UPDATE_AGENCY = 'agency:update',
  DELETE_AGENCY = 'agency:delete',
  ASSIGN_AGENCY = 'agency:assign',

  // Inventory permissions
  CREATE_PRODUCT = 'inventory:create',
  READ_PRODUCT = 'inventory:read',
  UPDATE_PRODUCT = 'inventory:update',
  DELETE_PRODUCT = 'inventory:delete',
  MANAGE_STOCK = 'inventory:manage_stock',

  // Order permissions
  CREATE_ORDER = 'order:create',
  READ_ORDER = 'order:read',
  UPDATE_ORDER = 'order:update',
  DELETE_ORDER = 'order:delete',
  PROCESS_ORDER = 'order:process',
  CANCEL_ORDER = 'order:cancel',

  // Customer permissions
  CREATE_CUSTOMER = 'customer:create',
  READ_CUSTOMER = 'customer:read',
  UPDATE_CUSTOMER = 'customer:update',
  DELETE_CUSTOMER = 'customer:delete',

  // Employee management permissions (for business flows)
  CREATE_EMPLOYEE = 'employee:create',
  READ_EMPLOYEE = 'employee:read',
  UPDATE_EMPLOYEE = 'employee:update',
  DELETE_EMPLOYEE = 'employee:delete',

  // Area management permissions
  CREATE_AREA = 'area:create',
  VIEW_AREA = 'area:view',
  UPDATE_AREA = 'area:update',
  DELETE_AREA = 'area:delete',

  // Report permissions
  VIEW_REPORTS = 'report:view',
  GENERATE_REPORTS = 'report:generate',
  EXPORT_REPORTS = 'report:export',

  // System permissions
  MANAGE_SETTINGS = 'system:manage_settings',
  VIEW_LOGS = 'system:view_logs',
  BACKUP_DATA = 'system:backup_data',
}

/**
 * Role validation error types
 */
export class InvalidRoleError extends Error {
  constructor(role: string, reason: string) {
    super(`Invalid role "${role}": ${reason}`);
    this.name = 'InvalidRoleError';
  }
}

/**
 * Role Value Object
 * Immutable value object representing a user role with permissions
 */
export class Role {
  private readonly _value: SystemRole;
  private readonly _permissions: ReadonlySet<Permission>;

  /**
   * Creates a new Role value object
   * @param value - The role value
   * @throws {InvalidRoleError} When role is invalid
   */
  constructor(value: SystemRole | string) {
    const normalizedValue = this.normalizeRole(value);
    this.validateRole(normalizedValue);
    this._value = normalizedValue;
    this._permissions = new Set(this.getPermissionsForRole(normalizedValue));

    // Make the object truly immutable at runtime
    Object.freeze(this);
    Object.freeze(this._permissions);
  }

  /**
   * Gets the role value
   * @returns The role value
   */
  public get value(): SystemRole {
    return this._value;
  }

  /**
   * Gets the role name (human-readable)
   * @returns The formatted role name
   */
  public get name(): string {
    return this.formatRoleName(this._value);
  }

  /**
   * Gets all permissions for this role
   * @returns Set of permissions
   */
  public get permissions(): ReadonlySet<Permission> {
    // Return a new frozen Set to ensure immutability
    const permissionsSet = new Set(this._permissions);
    Object.freeze(permissionsSet);
    return permissionsSet as ReadonlySet<Permission>;
  }

  /**
   * Checks if role has a specific permission
   * @param permission - Permission to check
   * @returns True if role has the permission
   */
  public hasPermission(permission: Permission): boolean {
    return this._permissions.has(permission);
  }

  /**
   * Checks if role has all specified permissions
   * @param permissions - Array of permissions to check
   * @returns True if role has all permissions
   */
  public hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every((permission) => this._permissions.has(permission));
  }

  /**
   * Checks if role has any of the specified permissions
   * @param permissions - Array of permissions to check
   * @returns True if role has at least one permission
   */
  public hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some((permission) => this._permissions.has(permission));
  }

  /**
   * Checks if this role equals another role
   * @param other - Another Role value object
   * @returns True if roles are equal
   */
  public equals(other: Role): boolean {
    return this._value === other._value;
  }

  /**
   * Checks if this role is higher in hierarchy than another role
   * @param other - Another Role value object
   * @returns True if this role is higher
   */
  public isHigherThan(other: Role): boolean {
    const hierarchy = this.getRoleHierarchy();
    const thisLevel = hierarchy.indexOf(this._value);
    const otherLevel = hierarchy.indexOf(other._value);
    return thisLevel < otherLevel; // Lower index = higher role
  }

  /**
   * Checks if this role is lower in hierarchy than another role
   * @param other - Another Role value object
   * @returns True if this role is lower
   */
  public isLowerThan(other: Role): boolean {
    return other.isHigherThan(this);
  }

  /**
   * Checks if this role can manage another role
   * @param other - Another Role value object
   * @returns True if this role can manage the other
   */
  public canManage(other: Role): boolean {
    return this.isHigherThan(other) || this.equals(other);
  }

  /**
   * Returns string representation of the role
   * @returns The role value as string
   */
  public toString(): string {
    return this._value;
  }

  /**
   * Creates Role from string or SystemRole
   * @param value - Role string or SystemRole enum
   * @returns Role value object
   */
  public static create(value: SystemRole | string): Role {
    return new Role(value);
  }

  /**
   * Creates Role from string (alias for create)
   * @param value - Role string
   * @returns Role value object
   */
  public static fromString(value: string): Role {
    return new Role(value);
  }

  /**
   * Creates Role from SystemRole enum
   * @param value - SystemRole enum value
   * @returns Role value object
   */
  public static fromSystemRole(value: SystemRole): Role {
    return new Role(value);
  }

  /**
   * Gets all available roles
   * @returns Array of all system roles
   */
  public static getAllRoles(): SystemRole[] {
    return Object.values(SystemRole);
  }

  /**
   * Validates if a string is a valid role
   * @param value - String to validate
   * @returns True if valid role
   */
  public static isValid(value: string): boolean {
    try {
      new Role(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets permissions for a specific role
   * @param role - Role to get permissions for
   * @returns Array of permissions
   */
  private getPermissionsForRole(role: SystemRole): Permission[] {
    switch (role) {
      case SystemRole.SUPER_ADMIN:
        // Super Admin has all permissions
        return Object.values(Permission);

      case SystemRole.ADMIN:
        // Agency Admin has all permissions except super admin specific ones
        return [
          // User management - cannot create users (only super admin can create admins)
          Permission.READ_USER,
          Permission.UPDATE_USER,

          // Agency management - cannot create agencies (only their own agency)
          Permission.READ_AGENCY,
          Permission.UPDATE_AGENCY,

          // Full inventory access
          Permission.CREATE_PRODUCT,
          Permission.READ_PRODUCT,
          Permission.UPDATE_PRODUCT,
          Permission.DELETE_PRODUCT,
          Permission.MANAGE_STOCK,

          // Full order access
          Permission.CREATE_ORDER,
          Permission.READ_ORDER,
          Permission.UPDATE_ORDER,
          Permission.DELETE_ORDER,
          Permission.PROCESS_ORDER,
          Permission.CANCEL_ORDER,

          // Full customer access
          Permission.CREATE_CUSTOMER,
          Permission.READ_CUSTOMER,
          Permission.UPDATE_CUSTOMER,
          Permission.DELETE_CUSTOMER,

          // Employee management
          Permission.CREATE_EMPLOYEE,
          Permission.READ_EMPLOYEE,
          Permission.UPDATE_EMPLOYEE,
          Permission.DELETE_EMPLOYEE,

          // Area management
          Permission.CREATE_AREA,
          Permission.VIEW_AREA,
          Permission.UPDATE_AREA,
          Permission.DELETE_AREA,

          // Report access
          Permission.VIEW_REPORTS,
          Permission.GENERATE_REPORTS,
          Permission.EXPORT_REPORTS,

          // System access (limited to what they need)
          Permission.MANAGE_SETTINGS,
          Permission.VIEW_LOGS,
        ];

      default:
        return [];
    }
  }

  /**
   * Formats role name for display
   * @param role - Role to format
   * @returns Formatted role name
   */
  private formatRoleName(role: SystemRole): string {
    switch (role) {
      case SystemRole.SUPER_ADMIN:
        return 'Super Administrator';
      case SystemRole.ADMIN:
        return 'Agency Administrator';
    }
  }

  /**
   * Gets role hierarchy (highest to lowest)
   * @returns Array of roles in hierarchical order
   */
  private getRoleHierarchy(): SystemRole[] {
    return [SystemRole.SUPER_ADMIN, SystemRole.ADMIN];
  }

  /**
   * Validates role value
   * @param value - Role to validate
   * @throws {InvalidRoleError} When role is invalid
   */
  private validateRole(value: SystemRole): void {
    if (!Object.values(SystemRole).includes(value)) {
      throw new InvalidRoleError(value, 'Invalid role value');
    }
  }

  /**
   * Normalizes role value
   * @param value - Raw role value
   * @returns Normalized SystemRole
   */
  private normalizeRole(value: SystemRole | string): SystemRole {
    if (typeof value === 'string') {
      const normalizedString = value.toLowerCase().trim();

      // Handle common variations
      const roleMap: Record<string, SystemRole> = {
        superadmin: SystemRole.SUPER_ADMIN,
        'super admin': SystemRole.SUPER_ADMIN,
        super_admin: SystemRole.SUPER_ADMIN,
        admin: SystemRole.ADMIN,
        administrator: SystemRole.ADMIN,
        'agency admin': SystemRole.ADMIN,
        'agency administrator': SystemRole.ADMIN,
      };

      const mappedRole = roleMap[normalizedString];
      if (mappedRole) {
        return mappedRole;
      }

      // Check if it's a valid enum value
      if (Object.values(SystemRole).includes(normalizedString as SystemRole)) {
        return normalizedString as SystemRole;
      }

      throw new InvalidRoleError(value, 'Unknown role type. Only super_admin and admin are allowed.');
    }

    return value;
  }
}
