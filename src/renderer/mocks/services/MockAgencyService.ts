/**
 * Mock Agency Service
 *
 * Mock implementation of the AgencyService for frontend-only operation.
 * Implements all the same interfaces and methods as the real service.
 *
 * @domain Agency Management
 * @pattern Service Layer - Mock Implementation
 * @architecture Clean Architecture - Mock Layer
 * @version 1.0.0
 */

import {
  Agency,
  CreateAgencyParams,
  UpdateAgencyParams,
  CreateAgencyResult,
  ListAgenciesParams,
  ListAgenciesResult,
} from '../../services/AgencyService';
import { mockAgencies } from '../data/agencies.mock';

/**
 * Mock Agency data with proper structure matching AgencyService interface
 */
const mockAgencyData: Agency[] = [
  {
    id: 'agency-1',
    name: 'Flowlytix Headquarters',
    databasePath: '/data/agencies/flowlytix-hq.db',
    contactPerson: 'John Admin',
    phone: '+1-555-0100',
    email: 'hq@flowlytix.com',
    address: '123 Business Center, Tech City, TC 12345',
    status: 'active',
    createdAt: '2023-01-01T00:00:00Z',
    settings: {
      allowCreditSales: true,
      defaultCreditDays: 30,
      maxCreditLimit: 100000,
      requireApprovalForOrders: false,
      enableInventoryTracking: true,
      taxRate: 0.15,
      currency: 'USD',
      businessHours: {
        start: '09:00',
        end: '18:00',
        timezone: 'America/New_York',
      },
      notifications: {
        lowStock: true,
        overduePayments: true,
        newOrders: true,
      },
    },
  },
  {
    id: 'agency-2',
    name: 'Metro Distribution Hub',
    databasePath: '/data/agencies/metro-dist.db',
    contactPerson: 'Sarah Manager',
    phone: '+1-555-0200',
    email: 'info@metrodist.com',
    address: '456 Distribution Way, Metro City, MC 23456',
    status: 'active',
    createdAt: '2023-03-15T00:00:00Z',
    settings: {
      allowCreditSales: true,
      defaultCreditDays: 45,
      maxCreditLimit: 75000,
      requireApprovalForOrders: true,
      enableInventoryTracking: true,
      taxRate: 0.12,
      currency: 'USD',
      businessHours: {
        start: '08:00',
        end: '17:00',
        timezone: 'America/New_York',
      },
      notifications: {
        lowStock: true,
        overduePayments: false,
        newOrders: true,
      },
    },
  },
  {
    id: 'agency-3',
    name: 'Regional Sales Network',
    databasePath: '/data/agencies/regional-sales.db',
    contactPerson: 'Mike Sales',
    phone: '+1-555-0300',
    email: 'sales@regionalsales.com',
    address: '789 Commerce Street, Sales City, SC 34567',
    status: 'active',
    createdAt: '2023-06-20T00:00:00Z',
    settings: {
      allowCreditSales: false,
      defaultCreditDays: 0,
      maxCreditLimit: 0,
      requireApprovalForOrders: false,
      enableInventoryTracking: true,
      taxRate: 0.1,
      currency: 'USD',
      businessHours: {
        start: '10:00',
        end: '19:00',
        timezone: 'America/New_York',
      },
      notifications: {
        lowStock: false,
        overduePayments: false,
        newOrders: true,
      },
    },
  },
  {
    id: 'agency-4',
    name: 'West Coast Operations',
    databasePath: '/data/agencies/west-coast.db',
    contactPerson: 'Lisa Operations',
    phone: '+1-555-0400',
    email: 'ops@westcoast.com',
    address: '321 Pacific Boulevard, West City, WC 45678',
    status: 'inactive',
    createdAt: '2023-08-10T00:00:00Z',
    settings: {
      allowCreditSales: true,
      defaultCreditDays: 60,
      maxCreditLimit: 50000,
      requireApprovalForOrders: true,
      enableInventoryTracking: false,
      taxRate: 0.08,
      currency: 'USD',
      businessHours: {
        start: '09:00',
        end: '18:00',
        timezone: 'America/Los_Angeles',
      },
      notifications: {
        lowStock: true,
        overduePayments: true,
        newOrders: false,
      },
    },
  },
  {
    id: 'agency-5',
    name: 'Suspended Agency Example',
    databasePath: '/data/agencies/suspended.db',
    contactPerson: 'Test Suspended',
    phone: '+1-555-0500',
    email: 'test@suspended.com',
    address: '999 Suspended Street, Test City, TS 99999',
    status: 'suspended',
    createdAt: '2023-09-01T00:00:00Z',
    settings: {
      allowCreditSales: false,
      defaultCreditDays: 0,
      maxCreditLimit: 0,
      requireApprovalForOrders: true,
      enableInventoryTracking: false,
      taxRate: 0.0,
      currency: 'USD',
      businessHours: {
        start: '00:00',
        end: '00:00',
        timezone: 'America/New_York',
      },
      notifications: {
        lowStock: false,
        overduePayments: false,
        newOrders: false,
      },
    },
  },
];

/**
 * Mock Agency Service Implementation
 * Provides same interface as real AgencyService but uses mock data
 */
export class MockAgencyService {
  /**
   * Simulated network delay for realistic testing
   */
  private static readonly MOCK_DELAY = 400;

  /**
   * Add artificial delay to simulate network calls
   */
  private static async delay(ms: number = MockAgencyService.MOCK_DELAY): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * List agencies with optional filtering and pagination
   * @param params - List parameters (page, pageSize, search, status)
   * @returns Promise with agencies list and pagination info
   */
  static async listAgencies(params: ListAgenciesParams = {}): Promise<ListAgenciesResult> {
    try {
      console.log('🏢 MockAgencyService.listAgencies called with:', params);

      // Simulate network delay
      await this.delay();

      // Start with all agencies
      let filteredAgencies = [...mockAgencyData];

      // Apply search filter
      if (params.search && params.search.trim().length > 0) {
        const searchTerm = params.search.trim().toLowerCase();
        filteredAgencies = filteredAgencies.filter(
          (agency) =>
            agency.name.toLowerCase().includes(searchTerm) ||
            agency.contactPerson?.toLowerCase().includes(searchTerm) ||
            agency.email?.toLowerCase().includes(searchTerm) ||
            agency.address?.toLowerCase().includes(searchTerm)
        );
        console.log(`🔍 Applied search filter "${params.search}", found ${filteredAgencies.length} agencies`);
      }

      // Apply status filter
      if (params.status && params.status.trim().length > 0) {
        filteredAgencies = filteredAgencies.filter((agency) => agency.status === params.status);
        console.log(`📊 Applied status filter "${params.status}", found ${filteredAgencies.length} agencies`);
      }

      // Sort by creation date (newest first)
      filteredAgencies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply pagination
      const page = params.page || 1;
      const pageSize = params.pageSize || 25;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const totalCount = filteredAgencies.length;
      const paginatedAgencies = filteredAgencies.slice(startIndex, endIndex);

      console.log(`📄 Applied pagination: page=${page}, pageSize=${pageSize}, total=${totalCount}`);
      console.log(`✅ MockAgencyService.listAgencies successful, returning ${paginatedAgencies.length} agencies`);

      return {
        agencies: paginatedAgencies,
        totalCount,
        page,
        pageSize,
      };
    } catch (error) {
      console.error('❌ MockAgencyService.listAgencies error:', error);
      return {
        agencies: [],
        totalCount: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 25,
      };
    }
  }

  /**
   * Create a new agency
   * @param params - Agency creation parameters
   * @returns Promise with creation result
   */
  static async createAgency(params: CreateAgencyParams): Promise<CreateAgencyResult> {
    try {
      console.log('🏢 MockAgencyService.createAgency called with:', params);

      // Simulate network delay
      await this.delay();

      // Generate new agency ID
      const newAgencyId = `agency-${Date.now()}`;
      const databasePath = `/data/agencies/${params.name.toLowerCase().replace(/\s+/g, '-')}.db`;

      console.log(`✅ MockAgencyService.createAgency successful, created agency: ${newAgencyId}`);

      return {
        agencyId: newAgencyId,
        name: params.name,
        databasePath,
        isOperational: true,
        message: 'Agency created successfully',
      };
    } catch (error) {
      console.error('❌ MockAgencyService.createAgency error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create agency');
    }
  }

  /**
   * Update an existing agency
   * @param agencyId - ID of agency to update
   * @param params - Update parameters
   * @returns Promise with update result
   */
  static async updateAgency(
    agencyId: string,
    params: UpdateAgencyParams
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🏢 MockAgencyService.updateAgency called for ${agencyId} with:`, params);

      // Simulate network delay
      await this.delay();

      const agency = mockAgencyData.find((a) => a.id === agencyId);

      if (!agency) {
        return {
          success: false,
          message: 'Agency not found',
        };
      }

      // In a real implementation, we would update the agency in the database
      // For mock purposes, we'll just simulate success
      console.log(`✅ MockAgencyService.updateAgency successful for ${agencyId}`);

      return {
        success: true,
        message: 'Agency updated successfully',
      };
    } catch (error) {
      console.error('❌ MockAgencyService.updateAgency error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update agency',
      };
    }
  }

  /**
   * Get agency by ID
   * @param agencyId - ID of agency to retrieve
   * @returns Promise with agency data or null if not found
   */
  static async getAgencyById(agencyId: string): Promise<Agency | null> {
    try {
      console.log(`🏢 MockAgencyService.getAgencyById called for: ${agencyId}`);

      // Simulate network delay
      await this.delay(200);

      const agency = mockAgencyData.find((a) => a.id === agencyId);

      if (!agency) {
        console.log(`❌ Agency not found: ${agencyId}`);
        return null;
      }

      console.log(`✅ MockAgencyService.getAgencyById successful for ${agencyId}`);
      return agency;
    } catch (error) {
      console.error('❌ MockAgencyService.getAgencyById error:', error);
      return null;
    }
  }

  /**
   * Get agency statistics for dashboard
   * @returns Promise with agency statistics
   */
  static async getAgencyStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  }> {
    try {
      await this.delay(100); // Shorter delay for stats

      const stats = {
        total: mockAgencyData.length,
        active: mockAgencyData.filter((a) => a.status === 'active').length,
        inactive: mockAgencyData.filter((a) => a.status === 'inactive').length,
        suspended: mockAgencyData.filter((a) => a.status === 'suspended').length,
      };

      console.log('📊 MockAgencyService.getAgencyStats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ MockAgencyService.getAgencyStats error:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
      };
    }
  }
}
