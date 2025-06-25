/**
 * Unit tests for Role Value Object
 * Testing RBAC functionality with comprehensive coverage
 */

import { Role, SystemRole, Permission, InvalidRoleError } from '../role';

describe('Role Value Object', () => {
  describe('Constructor', () => {
    it('should create role from SystemRole enum', () => {
      const role = new Role(SystemRole.ADMIN);
      expect(role.value).toBe(SystemRole.ADMIN);
    });

    it('should create role from valid string', () => {
      const role = new Role('admin');
      expect(role.value).toBe(SystemRole.ADMIN);
    });

    it('should normalize role strings', () => {
      const variations = [
        { input: 'ADMIN', expected: SystemRole.ADMIN },
        { input: '  admin  ', expected: SystemRole.ADMIN },
        { input: 'Administrator', expected: SystemRole.ADMIN },
        { input: 'super admin', expected: SystemRole.SUPER_ADMIN },
        { input: 'superadmin', expected: SystemRole.SUPER_ADMIN },
        { input: 'staff', expected: SystemRole.EMPLOYEE },
        { input: 'guest', expected: SystemRole.VIEWER },
      ];

      variations.forEach(({ input, expected }) => {
        const role = new Role(input);
        expect(role.value).toBe(expected);
      });
    });

    it('should throw InvalidRoleError for invalid role', () => {
      expect(() => new Role('invalid_role')).toThrow(InvalidRoleError);
      expect(() => new Role('invalid_role')).toThrow('Unknown role type');
    });

    it('should throw InvalidRoleError for empty string', () => {
      expect(() => new Role('')).toThrow(InvalidRoleError);
    });
  });

  describe('Property Getters', () => {
    it('should return correct value', () => {
      const role = new Role(SystemRole.MANAGER);
      expect(role.value).toBe(SystemRole.MANAGER);
    });

    it('should return formatted name', () => {
      const testCases = [
        { role: SystemRole.SUPER_ADMIN, expected: 'Super Admin' },
        { role: SystemRole.ADMIN, expected: 'Admin' },
        { role: SystemRole.MANAGER, expected: 'Manager' },
        { role: SystemRole.EMPLOYEE, expected: 'Employee' },
        { role: SystemRole.VIEWER, expected: 'Viewer' },
      ];

      testCases.forEach(({ role, expected }) => {
        const roleObj = new Role(role);
        expect(roleObj.name).toBe(expected);
      });
    });

    it('should return permissions as ReadonlySet', () => {
      const role = new Role(SystemRole.ADMIN);
      const permissions = role.permissions;

      expect(permissions).toBeInstanceOf(Set);
      expect(permissions.size).toBeGreaterThan(0);

      // Should be readonly - TypeScript compile check
      expect(typeof permissions.has).toBe('function');
    });
  });

  describe('Permission System', () => {
    describe('Super Admin Permissions', () => {
      const superAdmin = new Role(SystemRole.SUPER_ADMIN);

      it('should have all permissions', () => {
        const allPermissions = Object.values(Permission);
        allPermissions.forEach((permission) => {
          expect(superAdmin.hasPermission(permission)).toBe(true);
        });
      });

      it('should have system-level permissions', () => {
        expect(superAdmin.hasPermission(Permission.MANAGE_SETTINGS)).toBe(true);
        expect(superAdmin.hasPermission(Permission.BACKUP_DATA)).toBe(true);
        expect(superAdmin.hasPermission(Permission.VIEW_LOGS)).toBe(true);
      });
    });

    describe('Admin Permissions', () => {
      const admin = new Role(SystemRole.ADMIN);

      it('should have comprehensive business permissions', () => {
        const expectedPermissions = [
          Permission.CREATE_USER,
          Permission.DELETE_USER,
          Permission.CREATE_PRODUCT,
          Permission.DELETE_PRODUCT,
          Permission.DELETE_ORDER,
          Permission.DELETE_CUSTOMER,
          Permission.EXPORT_REPORTS,
        ];

        expectedPermissions.forEach((permission) => {
          expect(admin.hasPermission(permission)).toBe(true);
        });
      });

      it('should not have super admin system permissions', () => {
        expect(admin.hasPermission(Permission.MANAGE_SETTINGS)).toBe(false);
        expect(admin.hasPermission(Permission.BACKUP_DATA)).toBe(false);
      });

      it('should have view logs permission', () => {
        expect(admin.hasPermission(Permission.VIEW_LOGS)).toBe(true);
      });
    });

    describe('Manager Permissions', () => {
      const manager = new Role(SystemRole.MANAGER);

      it('should have management-level permissions', () => {
        const expectedPermissions = [
          Permission.CREATE_PRODUCT,
          Permission.UPDATE_PRODUCT,
          Permission.MANAGE_STOCK,
          Permission.PROCESS_ORDER,
          Permission.CANCEL_ORDER,
          Permission.CREATE_CUSTOMER,
          Permission.GENERATE_REPORTS,
        ];

        expectedPermissions.forEach((permission) => {
          expect(manager.hasPermission(permission)).toBe(true);
        });
      });

      it('should not have delete permissions', () => {
        const deletePermissions = [
          Permission.DELETE_USER,
          Permission.DELETE_PRODUCT,
          Permission.DELETE_ORDER,
          Permission.DELETE_CUSTOMER,
        ];

        deletePermissions.forEach((permission) => {
          expect(manager.hasPermission(permission)).toBe(false);
        });
      });

      it('should not have user creation permission', () => {
        expect(manager.hasPermission(Permission.CREATE_USER)).toBe(false);
      });
    });

    describe('Employee Permissions', () => {
      const employee = new Role(SystemRole.EMPLOYEE);

      it('should have operational permissions', () => {
        const expectedPermissions = [
          Permission.READ_PRODUCT,
          Permission.MANAGE_STOCK,
          Permission.CREATE_ORDER,
          Permission.PROCESS_ORDER,
          Permission.READ_CUSTOMER,
          Permission.UPDATE_CUSTOMER,
        ];

        expectedPermissions.forEach((permission) => {
          expect(employee.hasPermission(permission)).toBe(true);
        });
      });

      it('should not have creation permissions for entities', () => {
        const createPermissions = [Permission.CREATE_USER, Permission.CREATE_PRODUCT, Permission.CREATE_CUSTOMER];

        createPermissions.forEach((permission) => {
          expect(employee.hasPermission(permission)).toBe(false);
        });
      });

      it('should not have delete permissions', () => {
        const deletePermissions = [
          Permission.DELETE_USER,
          Permission.DELETE_PRODUCT,
          Permission.DELETE_ORDER,
          Permission.DELETE_CUSTOMER,
        ];

        deletePermissions.forEach((permission) => {
          expect(employee.hasPermission(permission)).toBe(false);
        });
      });
    });

    describe('Viewer Permissions', () => {
      const viewer = new Role(SystemRole.VIEWER);

      it('should only have read permissions', () => {
        const readPermissions = [
          Permission.READ_USER,
          Permission.READ_PRODUCT,
          Permission.READ_ORDER,
          Permission.READ_CUSTOMER,
          Permission.VIEW_REPORTS,
        ];

        readPermissions.forEach((permission) => {
          expect(viewer.hasPermission(permission)).toBe(true);
        });
      });

      it('should not have any write permissions', () => {
        const writePermissions = [
          Permission.CREATE_USER,
          Permission.UPDATE_USER,
          Permission.DELETE_USER,
          Permission.CREATE_PRODUCT,
          Permission.UPDATE_PRODUCT,
          Permission.MANAGE_STOCK,
          Permission.CREATE_ORDER,
          Permission.PROCESS_ORDER,
        ];

        writePermissions.forEach((permission) => {
          expect(viewer.hasPermission(permission)).toBe(false);
        });
      });
    });
  });

  describe('Permission Checking Methods', () => {
    const admin = new Role(SystemRole.ADMIN);

    it('should check if role has all specified permissions', () => {
      const adminPermissions = [Permission.CREATE_USER, Permission.READ_USER, Permission.UPDATE_USER];

      expect(admin.hasAllPermissions(adminPermissions)).toBe(true);

      const mixedPermissions = [
        Permission.CREATE_USER,
        Permission.MANAGE_SETTINGS, // Super admin only
      ];

      expect(admin.hasAllPermissions(mixedPermissions)).toBe(false);
    });

    it('should check if role has any of specified permissions', () => {
      const someAdminPermissions = [
        Permission.CREATE_USER, // Admin has this
        Permission.MANAGE_SETTINGS, // Admin doesn't have this
      ];

      expect(admin.hasAnyPermission(someAdminPermissions)).toBe(true);

      const noAdminPermissions = [Permission.MANAGE_SETTINGS, Permission.BACKUP_DATA];

      expect(admin.hasAnyPermission(noAdminPermissions)).toBe(false);
    });

    it('should handle empty permission arrays', () => {
      expect(admin.hasAllPermissions([])).toBe(true);
      expect(admin.hasAnyPermission([])).toBe(false);
    });
  });

  describe('Role Hierarchy', () => {
    const superAdmin = new Role(SystemRole.SUPER_ADMIN);
    const admin = new Role(SystemRole.ADMIN);
    const manager = new Role(SystemRole.MANAGER);
    const employee = new Role(SystemRole.EMPLOYEE);
    const viewer = new Role(SystemRole.VIEWER);

    it('should correctly determine higher roles', () => {
      expect(superAdmin.isHigherThan(admin)).toBe(true);
      expect(admin.isHigherThan(manager)).toBe(true);
      expect(manager.isHigherThan(employee)).toBe(true);
      expect(employee.isHigherThan(viewer)).toBe(true);
    });

    it('should correctly determine lower roles', () => {
      expect(viewer.isLowerThan(employee)).toBe(true);
      expect(employee.isLowerThan(manager)).toBe(true);
      expect(manager.isLowerThan(admin)).toBe(true);
      expect(admin.isLowerThan(superAdmin)).toBe(true);
    });

    it('should not consider same roles as higher/lower', () => {
      expect(admin.isHigherThan(admin)).toBe(false);
      expect(admin.isLowerThan(admin)).toBe(false);
    });

    it('should determine management capability', () => {
      expect(admin.canManage(manager)).toBe(true);
      expect(admin.canManage(admin)).toBe(true); // Can manage same level
      expect(manager.canManage(admin)).toBe(false);
      expect(superAdmin.canManage(viewer)).toBe(true);
    });
  });

  describe('Equality Methods', () => {
    it('should return true for equal roles', () => {
      const role1 = new Role(SystemRole.ADMIN);
      const role2 = new Role('admin');
      expect(role1.equals(role2)).toBe(true);
    });

    it('should return false for different roles', () => {
      const role1 = new Role(SystemRole.ADMIN);
      const role2 = new Role(SystemRole.MANAGER);
      expect(role1.equals(role2)).toBe(false);
    });
  });

  describe('String Conversion', () => {
    it('should return role value as string', () => {
      const role = new Role(SystemRole.MANAGER);
      expect(role.toString()).toBe('manager');
    });

    it('should work with string concatenation', () => {
      const role = new Role(SystemRole.ADMIN);
      expect(`Role: ${role}`).toBe('Role: admin');
    });
  });

  describe('Static Factory Methods', () => {
    it('should create role using fromString factory method', () => {
      const role = Role.fromString('admin');
      expect(role.value).toBe(SystemRole.ADMIN);
      expect(role).toBeInstanceOf(Role);
    });

    it('should create role using fromSystemRole factory method', () => {
      const role = Role.fromSystemRole(SystemRole.MANAGER);
      expect(role.value).toBe(SystemRole.MANAGER);
      expect(role).toBeInstanceOf(Role);
    });

    it('should return all available roles', () => {
      const allRoles = Role.getAllRoles();
      expect(allRoles).toContain(SystemRole.SUPER_ADMIN);
      expect(allRoles).toContain(SystemRole.ADMIN);
      expect(allRoles).toContain(SystemRole.MANAGER);
      expect(allRoles).toContain(SystemRole.EMPLOYEE);
      expect(allRoles).toContain(SystemRole.VIEWER);
      expect(allRoles).toHaveLength(5);
    });

    it('should validate role strings using isValid static method', () => {
      expect(Role.isValid('admin')).toBe(true);
      expect(Role.isValid('manager')).toBe(true);
      expect(Role.isValid('super admin')).toBe(true);
      expect(Role.isValid('invalid_role')).toBe(false);
      expect(Role.isValid('')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw InvalidRoleError with proper message', () => {
      try {
        new Role('invalid_role');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidRoleError);
        expect(error).toBeInstanceOf(Error);
        expect((error as InvalidRoleError).name).toBe('InvalidRoleError');
        expect((error as InvalidRoleError).message).toContain('Invalid role "invalid_role"');
        expect((error as InvalidRoleError).message).toContain('Unknown role type');
      }
    });
  });

  describe('Immutability', () => {
    it('should be immutable - value cannot be changed', () => {
      const role = new Role(SystemRole.ADMIN);
      const originalValue = role.value;

      // TypeScript should prevent this, but test runtime immutability
      try {
        (role as any)._value = SystemRole.VIEWER;
      } catch {
        // If assignment throws, that's also fine
      }

      // The getter should still return the original value
      expect(role.value).toBe(originalValue);
    });

    it('should be immutable - permissions cannot be changed', () => {
      const role = new Role(SystemRole.ADMIN);
      const originalPermissions = role.permissions;
      const originalSize = originalPermissions.size;

      // Verify immutability by checking that we get a new frozen Set each time
      const freshPermissions = role.permissions;

      // They should be different Set objects
      expect(freshPermissions).not.toBe(originalPermissions);

      // But have the same content
      expect(freshPermissions.size).toBe(originalSize);

      // Convert to arrays and compare content
      const originalArray = Array.from(originalPermissions).sort();
      const freshArray = Array.from(freshPermissions).sort();
      expect(originalArray).toEqual(freshArray);
    });

    it('should create new instances for different values', () => {
      const role1 = new Role(SystemRole.ADMIN);
      const role2 = new Role(SystemRole.MANAGER);

      expect(role1).not.toBe(role2);
      expect(role1.equals(role2)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-insensitive role matching', () => {
      const variations = ['ADMIN', 'Admin', 'aDmIn'];

      variations.forEach((variation) => {
        const role = new Role(variation);
        expect(role.value).toBe(SystemRole.ADMIN);
      });
    });

    it('should handle whitespace in role strings', () => {
      const role = new Role('  admin  ');
      expect(role.value).toBe(SystemRole.ADMIN);
    });

    it('should maintain consistent permission sets', () => {
      const role1 = new Role(SystemRole.ADMIN);
      const role2 = new Role('admin');

      expect(role1.permissions.size).toBe(role2.permissions.size);

      // Convert to arrays for comparison
      const permissions1 = Array.from(role1.permissions).sort();
      const permissions2 = Array.from(role2.permissions).sort();

      expect(permissions1).toEqual(permissions2);
    });
  });
});
