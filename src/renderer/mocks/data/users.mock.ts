/**
 * Users Mock Data
 *
 * Comprehensive mock dataset for user management system.
 * Follows the UserListItem interface from UsersService.
 *
 * @domain User Management
 * @pattern Mock Data
 * @architecture Clean Architecture - Mock Layer
 * @version 1.0.0
 */

/**
 * Mock User Interface - matches UserListItem from UsersService
 */
export interface MockUser {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly role: string;
  readonly roleName: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly lastLoginAt?: Date;
  readonly isAccountLocked: boolean;
  readonly loginAttempts: number;
  readonly agencyId?: string;
  readonly agencyName?: string;
}

/**
 * Mock Users Dataset
 * Diverse dataset for testing different scenarios
 */
export const mockUsers: MockUser[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'super.admin@flowlytix.com',
    firstName: 'Super',
    lastName: 'Administrator',
    fullName: 'Super Administrator',
    role: 'super_admin',
    roleName: 'Super Administrator',
    status: 'active',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    lastLoginAt: new Date('2024-01-15T10:30:00Z'),
    isAccountLocked: false,
    loginAttempts: 0,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin.hq@flowlytix.com',
    firstName: 'John',
    lastName: 'Admin',
    fullName: 'John Admin',
    role: 'admin',
    roleName: 'Agency Administrator',
    status: 'active',
    createdAt: new Date('2023-01-15T00:00:00Z'),
    lastLoginAt: new Date('2024-01-14T16:45:00Z'),
    isAccountLocked: false,
    loginAttempts: 0,
    agencyId: 'agency-1',
    agencyName: 'Flowlytix Headquarters',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'sarah.manager@metrodist.com',
    firstName: 'Sarah',
    lastName: 'Manager',
    fullName: 'Sarah Manager',
    role: 'admin',
    roleName: 'Agency Administrator',
    status: 'active',
    createdAt: new Date('2023-03-20T00:00:00Z'),
    lastLoginAt: new Date('2024-01-13T09:20:00Z'),
    isAccountLocked: false,
    loginAttempts: 0,
    agencyId: 'agency-2',
    agencyName: 'Metro Distribution Hub',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'mike.sales@regionalsales.com',
    firstName: 'Mike',
    lastName: 'Sales',
    fullName: 'Mike Sales',
    role: 'admin',
    roleName: 'Agency Administrator',
    status: 'active',
    createdAt: new Date('2023-06-25T00:00:00Z'),
    lastLoginAt: new Date('2024-01-12T14:15:00Z'),
    isAccountLocked: false,
    loginAttempts: 1,
    agencyId: 'agency-3',
    agencyName: 'Regional Sales Network',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    email: 'alice.coordinator@flowlytix.com',
    firstName: 'Alice',
    lastName: 'Coordinator',
    fullName: 'Alice Coordinator',
    role: 'admin',
    roleName: 'Agency Administrator',
    status: 'active',
    createdAt: new Date('2023-02-10T00:00:00Z'),
    lastLoginAt: new Date('2024-01-11T11:30:00Z'),
    isAccountLocked: false,
    loginAttempts: 0,
    agencyId: 'agency-1',
    agencyName: 'Flowlytix Headquarters',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    email: 'bob.operations@metrodist.com',
    firstName: 'Bob',
    lastName: 'Operations',
    fullName: 'Bob Operations',
    role: 'admin',
    roleName: 'Agency Administrator',
    status: 'inactive',
    createdAt: new Date('2023-04-05T00:00:00Z'),
    lastLoginAt: new Date('2023-12-20T08:45:00Z'),
    isAccountLocked: false,
    loginAttempts: 0,
    agencyId: 'agency-2',
    agencyName: 'Metro Distribution Hub',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    email: 'carol.support@regionalsales.com',
    firstName: 'Carol',
    lastName: 'Support',
    fullName: 'Carol Support',
    role: 'admin',
    roleName: 'Agency Administrator',
    status: 'active',
    createdAt: new Date('2023-07-12T00:00:00Z'),
    lastLoginAt: new Date('2024-01-10T13:20:00Z'),
    isAccountLocked: false,
    loginAttempts: 0,
    agencyId: 'agency-3',
    agencyName: 'Regional Sales Network',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    email: 'david.locked@example.com',
    firstName: 'David',
    lastName: 'Locked',
    fullName: 'David Locked',
    role: 'admin',
    roleName: 'Agency Administrator',
    status: 'active',
    createdAt: new Date('2023-08-18T00:00:00Z'),
    lastLoginAt: new Date('2023-11-15T07:30:00Z'),
    isAccountLocked: true,
    loginAttempts: 5,
    agencyId: 'agency-1',
    agencyName: 'Flowlytix Headquarters',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    email: 'emma.suspended@example.com',
    firstName: 'Emma',
    lastName: 'Suspended',
    fullName: 'Emma Suspended',
    role: 'admin',
    roleName: 'Agency Administrator',
    status: 'suspended',
    createdAt: new Date('2023-09-22T00:00:00Z'),
    lastLoginAt: new Date('2023-10-05T15:45:00Z'),
    isAccountLocked: false,
    loginAttempts: 2,
    agencyId: 'agency-2',
    agencyName: 'Metro Distribution Hub',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009',
    email: 'frank.test@flowlytix.com',
    firstName: 'Frank',
    lastName: 'Test',
    fullName: 'Frank Test',
    role: 'admin',
    roleName: 'Agency Administrator',
    status: 'active',
    createdAt: new Date('2023-10-30T00:00:00Z'),
    lastLoginAt: new Date('2024-01-09T12:00:00Z'),
    isAccountLocked: false,
    loginAttempts: 0,
    agencyId: 'agency-3',
    agencyName: 'Regional Sales Network',
  },
];

/**
 * Export for consumption by mock services
 */
export const allMockUsers = mockUsers;

/**
 * Helper functions for filtering mock data
 */
export const getUsersByRole = (role: string): MockUser[] => mockUsers.filter((user) => user.role === role);

export const getUsersByStatus = (status: string): MockUser[] => mockUsers.filter((user) => user.status === status);

export const getUsersByAgency = (agencyId: string): MockUser[] =>
  mockUsers.filter((user) => user.agencyId === agencyId);

export const searchUsers = (query: string): MockUser[] =>
  mockUsers.filter(
    (user) =>
      user.fullName.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      user.roleName.toLowerCase().includes(query.toLowerCase()) ||
      (user.agencyName && user.agencyName.toLowerCase().includes(query.toLowerCase()))
  );
