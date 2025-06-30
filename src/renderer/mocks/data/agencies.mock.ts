/**
 * Agency Mock Data
 */

export interface MockAgency {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export const mockAgencies: MockAgency[] = [
  {
    id: 'agency-1',
    name: 'Flowlytix Headquarters',
    status: 'ACTIVE',
    contactPerson: 'John Admin',
    phone: '+1-555-0100',
    email: 'hq@flowlytix.com',
    address: '123 Business Center, Tech City, TC 12345',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'agency-2',
    name: 'Metro Distribution Hub',
    status: 'ACTIVE',
    contactPerson: 'Sarah Manager',
    phone: '+1-555-0200',
    email: 'info@metrodist.com',
    address: '456 Distribution Way, Metro City, MC 23456',
    createdAt: new Date('2023-03-15'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'agency-3',
    name: 'Regional Sales Network',
    status: 'ACTIVE',
    contactPerson: 'Mike Sales',
    phone: '+1-555-0300',
    email: 'sales@regionalsales.com',
    address: '789 Commerce Street, Sales City, SC 34567',
    createdAt: new Date('2023-06-20'),
    updatedAt: new Date('2023-12-15'),
  },
];

export const allMockAgencies = mockAgencies;
