/**
 * Employee Mock Data
 */

export interface MockEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  agencyId: string;
  status: 'ACTIVE' | 'INACTIVE';
  hireDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const mockEmployees: MockEmployee[] = [
  {
    id: 'emp-1',
    firstName: 'John',
    lastName: 'Admin',
    email: 'admin@flowlytix.com',
    phone: '+1-555-0100',
    role: 'SUPER_ADMIN',
    department: 'Administration',
    agencyId: 'agency-1',
    status: 'ACTIVE',
    hireDate: new Date('2023-01-01'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'emp-2',
    firstName: 'Sarah',
    lastName: 'Manager',
    email: 'manager@agency1.com',
    phone: '+1-555-0200',
    role: 'AGENCY_MANAGER',
    department: 'Operations',
    agencyId: 'agency-2',
    status: 'ACTIVE',
    hireDate: new Date('2023-03-15'),
    createdAt: new Date('2023-03-15'),
    updatedAt: new Date('2024-01-10'),
  },
];

export const allMockEmployees = mockEmployees;
