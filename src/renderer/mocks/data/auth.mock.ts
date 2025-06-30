/**
 * Authentication Mock Data
 * Sample users and authentication responses for testing
 */

import { AuthResult } from '../../services/AuthService';

export interface MockUser {
  id: string;
  email: string;
  password: string; // For mock testing only
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  agencyId?: string;
  agency?: {
    id: string;
    name: string;
    status: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
}

export const mockUsers: MockUser[] = [
  {
    id: 'user-1',
    email: 'admin@flowlytix.com',
    password: 'admin123',
    firstName: 'John',
    lastName: 'Admin',
    role: 'SUPER_ADMIN',
    permissions: ['SUPER_ADMIN', 'USER_MANAGEMENT', 'SYSTEM_CONFIG', 'ALL_AGENCIES'],
    agencyId: 'agency-1',
    agency: {
      id: 'agency-1',
      name: 'Flowlytix Headquarters',
      status: 'ACTIVE',
      contactPerson: 'John Admin',
      phone: '+1-555-0100',
      email: 'hq@flowlytix.com',
      address: '123 Business Center, Tech City, TC 12345',
    },
  },
  {
    id: 'user-2',
    email: 'manager@agency1.com',
    password: 'manager123',
    firstName: 'Sarah',
    lastName: 'Manager',
    role: 'AGENCY_MANAGER',
    permissions: ['CUSTOMER_MANAGEMENT', 'ORDER_MANAGEMENT', 'INVENTORY_VIEW', 'ANALYTICS_VIEW'],
    agencyId: 'agency-2',
    agency: {
      id: 'agency-2',
      name: 'Metro Distribution Hub',
      status: 'ACTIVE',
      contactPerson: 'Sarah Manager',
      phone: '+1-555-0200',
      email: 'info@metrodist.com',
      address: '456 Distribution Way, Metro City, MC 23456',
    },
  },
  {
    id: 'user-3',
    email: 'sales@agency2.com',
    password: 'sales123',
    firstName: 'Mike',
    lastName: 'Sales',
    role: 'SALES_REP',
    permissions: ['CUSTOMER_VIEW', 'ORDER_CREATE', 'ORDER_VIEW', 'PRODUCT_VIEW'],
    agencyId: 'agency-3',
    agency: {
      id: 'agency-3',
      name: 'Regional Sales Network',
      status: 'ACTIVE',
      contactPerson: 'Mike Sales',
      phone: '+1-555-0300',
      email: 'sales@regionalsales.com',
      address: '789 Commerce Street, Sales City, SC 34567',
    },
  },
  {
    id: 'user-4',
    email: 'demo@demo.com',
    password: 'demo',
    firstName: 'Demo',
    lastName: 'User',
    role: 'DEMO_USER',
    permissions: ['DEMO_ACCESS', 'VIEW_ONLY'],
    agencyId: 'agency-1',
    agency: {
      id: 'agency-1',
      name: 'Flowlytix Headquarters',
      status: 'ACTIVE',
      contactPerson: 'Demo User',
      phone: '+1-555-DEMO',
      email: 'demo@flowlytix.com',
      address: '123 Business Center, Tech City, TC 12345',
    },
  },
];

export const mockAuthSuccess = (user: MockUser): AuthResult => ({
  success: true,
  user: {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    permissions: user.permissions,
    ...(user.agencyId && { agencyId: user.agencyId }),
    ...(user.agency && { agency: user.agency }),
  },
});

export const mockAuthError = (message: string = 'Invalid credentials'): AuthResult => ({
  success: false,
  error: message,
});

/**
 * Find user by email and password for mock authentication
 */
export const findMockUser = (email: string, password: string): MockUser | null => {
  return (
    mockUsers.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password) || null
  );
};

/**
 * Get user permissions by user ID
 */
export const getMockUserPermissions = (userId: string): string[] => {
  const user = mockUsers.find((u) => u.id === userId);
  return user?.permissions || [];
};
