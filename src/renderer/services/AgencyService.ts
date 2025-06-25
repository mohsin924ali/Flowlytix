/**
 * Agency Service
 *
 * Service layer for agency management operations.
 * Handles communication with the main process through Electron IPC API.
 * Follows Clean Architecture principles with proper error handling and type safety.
 *
 * @domain Agency Management
 * @architecture Clean Architecture - Service Layer
 * @version 1.0.0
 */

// Agency interfaces
export interface Agency {
  id: string;
  name: string;
  databasePath: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  settings: {
    allowCreditSales: boolean;
    defaultCreditDays: number;
    maxCreditLimit: number;
    requireApprovalForOrders: boolean;
    enableInventoryTracking: boolean;
    taxRate: number;
    currency: string;
    businessHours: {
      start: string;
      end: string;
      timezone: string;
    };
    notifications: {
      lowStock: boolean;
      overduePayments: boolean;
      newOrders: boolean;
    };
  };
}

export interface CreateAgencyParams {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  allowCreditSales?: boolean;
  defaultCreditDays?: number;
  maxCreditLimit?: number;
  requireApprovalForOrders?: boolean;
  enableInventoryTracking?: boolean;
  taxRate?: number;
  currency?: string;
}

export interface CreateAgencyResult {
  agencyId: string;
  name: string;
  databasePath: string;
  isOperational: boolean;
  message: string;
}

export interface ListAgenciesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface ListAgenciesResult {
  agencies: Agency[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Agency Service Implementation
 *
 * Provides a clean interface for agency operations with proper error handling,
 * input validation, and type safety. Communicates with main process via IPC.
 */
export class AgencyService {
  /**
   * List all agencies with optional filtering and pagination
   * @param params - Filtering and pagination parameters
   * @returns Promise with agencies list and metadata
   */
  public static async listAgencies(params: ListAgenciesParams = {}): Promise<ListAgenciesResult> {
    try {
      // Validate parameters
      if (params.page !== undefined && params.page < 1) {
        throw new Error('Page number must be greater than 0');
      }
      if (params.pageSize !== undefined && (params.pageSize < 1 || params.pageSize > 100)) {
        throw new Error('Page size must be between 1 and 100');
      }

      // Call IPC API
      const response = await window.electronAPI.agency.getAgencies();

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch agencies');
      }

      return response.data;
    } catch (error) {
      console.error('AgencyService.listAgencies error:', error);
      throw new Error(error instanceof Error ? error.message : 'An unexpected error occurred while fetching agencies');
    }
  }

  /**
   * Create a new agency with dedicated database
   * @param params - Agency creation parameters
   * @returns Promise with created agency details
   */
  public static async createAgency(params: CreateAgencyParams): Promise<CreateAgencyResult> {
    try {
      // Validate required parameters
      if (!params.name || typeof params.name !== 'string') {
        throw new Error('Agency name is required');
      }

      if (params.name.trim().length < 2) {
        throw new Error('Agency name must be at least 2 characters long');
      }

      if (params.email && !this.isValidEmail(params.email)) {
        throw new Error('Invalid email format');
      }

      if (params.phone && !this.isValidPhone(params.phone)) {
        throw new Error('Invalid phone number format');
      }

      // Validate business settings
      if (params.defaultCreditDays !== undefined && (params.defaultCreditDays < 1 || params.defaultCreditDays > 365)) {
        throw new Error('Default credit days must be between 1 and 365');
      }

      if (params.maxCreditLimit !== undefined && params.maxCreditLimit < 0) {
        throw new Error('Maximum credit limit cannot be negative');
      }

      if (params.taxRate !== undefined && (params.taxRate < 0 || params.taxRate > 1)) {
        throw new Error('Tax rate must be between 0 and 1 (0% to 100%)');
      }

      // Call IPC API
      const response = await window.electronAPI.agency.createAgency(params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create agency');
      }

      return response.data;
    } catch (error) {
      console.error('AgencyService.createAgency error:', error);
      throw new Error(error instanceof Error ? error.message : 'An unexpected error occurred while creating agency');
    }
  }

  /**
   * Update an existing agency
   * @param agencyId - Agency ID to update
   * @param params - Update parameters
   * @returns Promise with update result
   */
  public static async updateAgency(
    agencyId: string,
    params: Partial<CreateAgencyParams>
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate parameters
      if (!agencyId || typeof agencyId !== 'string') {
        throw new Error('Agency ID is required');
      }

      if (params.email && !this.isValidEmail(params.email)) {
        throw new Error('Invalid email format');
      }

      if (params.phone && !this.isValidPhone(params.phone)) {
        throw new Error('Invalid phone number format');
      }

      // Call IPC API
      const response = await window.electronAPI.agency.updateAgency({ agencyId, ...params });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update agency');
      }

      return {
        success: true,
        message: 'Agency updated successfully',
      };
    } catch (error) {
      console.error('AgencyService.updateAgency error:', error);
      throw new Error(error instanceof Error ? error.message : 'An unexpected error occurred while updating agency');
    }
  }

  /**
   * Validate email format
   * @private
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   * @private
   */
  private static isValidPhone(phone: string): boolean {
    // Allow various phone formats: +1-555-123-4567, (555) 123-4567, 555.123.4567, etc.
    const phoneRegex = /^[\+]?[\d\s\(\)\-\.]{10,20}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Get agency status display text
   * @param status - Agency status
   * @returns Display text for status
   */
  public static getStatusDisplay(status: Agency['status']): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'suspended':
        return 'Suspended';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get agency status color for UI
   * @param status - Agency status
   * @returns Color code for status
   */
  public static getStatusColor(status: Agency['status']): 'success' | 'warning' | 'error' | 'default' {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  }
}
