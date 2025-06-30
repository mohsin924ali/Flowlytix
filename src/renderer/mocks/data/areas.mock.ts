/**
 * Areas Mock Data
 */

export interface MockArea {
  id: string;
  name: string;
  code: string;
  description?: string;
  agencyId: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export const mockAreas: MockArea[] = [
  {
    id: 'area-1',
    name: 'Downtown District',
    code: 'DD001',
    description: 'Main downtown business district',
    agencyId: 'agency-1',
    status: 'ACTIVE',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'area-2',
    name: 'Suburban Zone',
    code: 'SZ002',
    description: 'Residential suburban area',
    agencyId: 'agency-2',
    status: 'ACTIVE',
    createdAt: new Date('2023-03-20'),
    updatedAt: new Date('2023-12-15'),
  },
  {
    id: 'area-3',
    name: 'Industrial Park',
    code: 'IP003',
    description: 'Industrial and warehouse district',
    agencyId: 'agency-3',
    status: 'ACTIVE',
    createdAt: new Date('2023-06-10'),
    updatedAt: new Date('2023-11-20'),
  },
];

export const allMockAreas = mockAreas;
