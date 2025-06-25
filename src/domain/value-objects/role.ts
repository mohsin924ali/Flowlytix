/**
 * Role Value Object
 * Represents user roles for Role-Based Access Control (RBAC)
 * Following Domain-Driven Design principles
 */

/**
 * Available system roles
 */
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
  VIEWER = 'viewer',
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
        manager: SystemRole.MANAGER,
        employee: SystemRole.EMPLOYEE,
        staff: SystemRole.EMPLOYEE,
        viewer: SystemRole.VIEWER,
        guest: SystemRole.VIEWER,
      };

      const mappedRole = roleMap[normalizedString];
      if (mappedRole) {
        return mappedRole;
      }

      // Check if it's a valid enum value
      if (Object.values(SystemRole).includes(normalizedString as SystemRole)) {
        return normalizedString as SystemRole;
      }

      throw new InvalidRoleError(value, 'Unknown role type');
    }

    return value;
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
   * Gets permissions for a specific role
   * @param role - Role to get permissions for
   * @returns Array of permissions
   */
  private getPermissionsForRole(role: SystemRole): Permission[] {
    switch (role) {
      case SystemRole.SUPER_ADMIN:
        return Object.values(Permission);

      case SystemRole.ADMIN:
        return [
          // User management (except super admin actions)
          Permission.CREATE_USER,
          Permission.READ_USER,
          Permission.UPDATE_USER,
          Permission.DELETE_USER,

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

          // Report access
          Permission.VIEW_REPORTS,
          Permission.GENERATE_REPORTS,
          Permission.EXPORT_REPORTS,

          // Limited system access
          Permission.VIEW_LOGS,
        ];

      case SystemRole.MANAGER:
        return [
          // Limited user management
          Permission.READ_USER,
          Permission.UPDATE_USER,

          // Inventory management
          Permission.CREATE_PRODUCT,
          Permission.READ_PRODUCT,
          Permission.UPDATE_PRODUCT,
          Permission.MANAGE_STOCK,

          // Order management
          Permission.CREATE_ORDER,
          Permission.READ_ORDER,
          Permission.UPDATE_ORDER,
          Permission.PROCESS_ORDER,
          Permission.CANCEL_ORDER,

          // Customer management
          Permission.CREATE_CUSTOMER,
          Permission.READ_CUSTOMER,
          Permission.UPDATE_CUSTOMER,

          // Report access
          Permission.VIEW_REPORTS,
          Permission.GENERATE_REPORTS,
          Permission.EXPORT_REPORTS,
        ];

      case SystemRole.EMPLOYEE:
        return [
          // Basic user read
          Permission.READ_USER,

          // Product read and stock management
          Permission.READ_PRODUCT,
          Permission.MANAGE_STOCK,

          // Order processing
          Permission.CREATE_ORDER,
          Permission.READ_ORDER,
          Permission.UPDATE_ORDER,
          Permission.PROCESS_ORDER,

          // Customer basic access
          Permission.READ_CUSTOMER,
          Permission.UPDATE_CUSTOMER,

          // Basic reporting
          Permission.VIEW_REPORTS,
        ];

      case SystemRole.VIEWER:
        return [
          // Read-only access
          Permission.READ_USER,
          Permission.READ_PRODUCT,
          Permission.READ_ORDER,
          Permission.READ_CUSTOMER,
          Permission.VIEW_REPORTS,
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
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Gets role hierarchy (highest to lowest)
   * @returns Array of roles in hierarchical order
   */
  private getRoleHierarchy(): SystemRole[] {
    return [SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER, SystemRole.EMPLOYEE, SystemRole.VIEWER];
  }
}
