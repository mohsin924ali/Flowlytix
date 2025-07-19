/**
 * Areas Mock Data
 *
 * Comprehensive mock dataset for area management system.
 * Follows the Area interface from AreaService.
 *
 * @domain Area Management
 * @pattern Mock Data
 * @architecture Clean Architecture - Mock Layer
 * @version 1.0.0
 */

/**
 * Mock Area Interface - matches Area from AreaService
 */
export interface MockArea {
  readonly id: string;
  readonly areaCode: string;
  readonly areaName: string;
  readonly description?: string;
  readonly status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  readonly agencyId: string;
  readonly agencyName?: string;
  readonly parentAreaId?: string;
  readonly parentAreaCode?: string;
  readonly level: number;
  readonly sortOrder: number;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly boundaries?: any; // GeoJSON polygon
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy?: string;
  readonly updatedAt?: Date;
}

/**
 * Mock Areas Dataset
 * Diverse dataset for testing different scenarios
 */
export const mockAreas: MockArea[] = [
  {
    id: 'area-001',
    areaCode: 'HQ-MAIN',
    areaName: 'Headquarters Main Area',
    description: 'Primary operational area for headquarters',
    status: 'ACTIVE',
    agencyId: 'agency-1',
    agencyName: 'Flowlytix Headquarters',
    level: 1,
    sortOrder: 1,
    latitude: 40.7128,
    longitude: -74.006,
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    createdAt: new Date('2023-01-15T00:00:00Z'),
    updatedBy: '550e8400-e29b-41d4-a716-446655440001',
    updatedAt: new Date('2024-01-10T00:00:00Z'),
  },
  {
    id: 'area-002',
    areaCode: 'HQ-NORTH',
    areaName: 'North Wing',
    description: 'Northern section of headquarters',
    status: 'ACTIVE',
    agencyId: 'agency-1',
    agencyName: 'Flowlytix Headquarters',
    parentAreaId: 'area-001',
    parentAreaCode: 'HQ-MAIN',
    level: 2,
    sortOrder: 1,
    latitude: 40.7138,
    longitude: -74.005,
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    createdAt: new Date('2023-01-20T00:00:00Z'),
  },
  {
    id: 'area-003',
    areaCode: 'HQ-SOUTH',
    areaName: 'South Wing',
    description: 'Southern section of headquarters',
    status: 'ACTIVE',
    agencyId: 'agency-1',
    agencyName: 'Flowlytix Headquarters',
    parentAreaId: 'area-001',
    parentAreaCode: 'HQ-MAIN',
    level: 2,
    sortOrder: 2,
    latitude: 40.7118,
    longitude: -74.007,
    createdBy: '550e8400-e29b-41d4-a716-446655440001',
    createdAt: new Date('2023-01-20T00:00:00Z'),
  },
  {
    id: 'area-004',
    areaCode: 'METRO-CENTRAL',
    areaName: 'Metro Central District',
    description: 'Central metropolitan distribution area',
    status: 'ACTIVE',
    agencyId: 'agency-2',
    agencyName: 'Metro Distribution Hub',
    level: 1,
    sortOrder: 1,
    latitude: 40.7589,
    longitude: -73.9851,
    createdBy: '550e8400-e29b-41d4-a716-446655440002',
    createdAt: new Date('2023-03-25T00:00:00Z'),
    updatedAt: new Date('2023-12-15T00:00:00Z'),
  },
  {
    id: 'area-005',
    areaCode: 'METRO-EAST',
    areaName: 'Metro East Zone',
    description: 'Eastern metropolitan zone',
    status: 'ACTIVE',
    agencyId: 'agency-2',
    agencyName: 'Metro Distribution Hub',
    parentAreaId: 'area-004',
    parentAreaCode: 'METRO-CENTRAL',
    level: 2,
    sortOrder: 1,
    latitude: 40.7614,
    longitude: -73.9776,
    createdBy: '550e8400-e29b-41d4-a716-446655440002',
    createdAt: new Date('2023-04-01T00:00:00Z'),
  },
  {
    id: 'area-006',
    areaCode: 'METRO-WEST',
    areaName: 'Metro West Zone',
    description: 'Western metropolitan zone',
    status: 'ACTIVE',
    agencyId: 'agency-2',
    agencyName: 'Metro Distribution Hub',
    parentAreaId: 'area-004',
    parentAreaCode: 'METRO-CENTRAL',
    level: 2,
    sortOrder: 2,
    latitude: 40.7505,
    longitude: -73.9934,
    createdBy: '550e8400-e29b-41d4-a716-446655440002',
    createdAt: new Date('2023-04-01T00:00:00Z'),
  },
  {
    id: 'area-007',
    areaCode: 'REGIONAL-ALPHA',
    areaName: 'Regional Alpha Territory',
    description: 'Primary regional sales territory',
    status: 'ACTIVE',
    agencyId: 'agency-3',
    agencyName: 'Regional Sales Network',
    level: 1,
    sortOrder: 1,
    latitude: 41.8781,
    longitude: -87.6298,
    createdBy: '550e8400-e29b-41d4-a716-446655440003',
    createdAt: new Date('2023-06-25T00:00:00Z'),
  },
  {
    id: 'area-008',
    areaCode: 'REGIONAL-BETA',
    areaName: 'Regional Beta Territory',
    description: 'Secondary regional sales territory',
    status: 'INACTIVE',
    agencyId: 'agency-3',
    agencyName: 'Regional Sales Network',
    level: 1,
    sortOrder: 2,
    latitude: 41.8401,
    longitude: -87.6519,
    createdBy: '550e8400-e29b-41d4-a716-446655440003',
    createdAt: new Date('2023-07-01T00:00:00Z'),
    updatedBy: '550e8400-e29b-41d4-a716-446655440003',
    updatedAt: new Date('2023-11-15T00:00:00Z'),
  },
  {
    id: 'area-009',
    areaCode: 'HQ-WAREHOUSE',
    areaName: 'Warehouse District',
    description: 'Main warehouse and storage area',
    status: 'ACTIVE',
    agencyId: 'agency-1',
    agencyName: 'Flowlytix Headquarters',
    level: 1,
    sortOrder: 2,
    latitude: 40.7089,
    longitude: -74.0012,
    createdBy: '550e8400-e29b-41d4-a716-446655440004',
    createdAt: new Date('2023-02-15T00:00:00Z'),
  },
  {
    id: 'area-010',
    areaCode: 'METRO-INACTIVE',
    areaName: 'Metro Inactive Zone',
    description: 'Temporarily inactive metropolitan zone',
    status: 'SUSPENDED',
    agencyId: 'agency-2',
    agencyName: 'Metro Distribution Hub',
    level: 1,
    sortOrder: 3,
    latitude: 40.7282,
    longitude: -73.7949,
    createdBy: '550e8400-e29b-41d4-a716-446655440005',
    createdAt: new Date('2023-05-10T00:00:00Z'),
    updatedBy: '550e8400-e29b-41d4-a716-446655440002',
    updatedAt: new Date('2023-10-20T00:00:00Z'),
  },
];

/**
 * Export for consumption by mock services
 */
export const allMockAreas = mockAreas;

/**
 * Helper functions for filtering mock data
 */
export const getAreasByAgency = (agencyId: string): MockArea[] =>
  mockAreas.filter((area) => area.agencyId === agencyId);

export const getAreasByStatus = (status: string): MockArea[] => mockAreas.filter((area) => area.status === status);

export const getAreasByParent = (parentAreaId: string): MockArea[] =>
  mockAreas.filter((area) => area.parentAreaId === parentAreaId);

export const searchAreas = (query: string): MockArea[] =>
  mockAreas.filter(
    (area) =>
      area.areaName.toLowerCase().includes(query.toLowerCase()) ||
      area.areaCode.toLowerCase().includes(query.toLowerCase()) ||
      (area.description && area.description.toLowerCase().includes(query.toLowerCase())) ||
      (area.agencyName && area.agencyName.toLowerCase().includes(query.toLowerCase()))
  );

export const getAreaById = (areaId: string): MockArea | undefined => mockAreas.find((area) => area.id === areaId);

export const getAreaByCode = (areaCode: string, agencyId?: string): MockArea | undefined =>
  mockAreas.find((area) => area.areaCode === areaCode && (!agencyId || area.agencyId === agencyId));
