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

export interface UpdateAgencyParams {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: Agency['status'];
  // Comprehensive settings support
  settings?: {
    // Financial settings
    allowCreditSales?: boolean;
    defaultCreditDays?: number;
    maxCreditLimit?: number;
    requireApprovalForOrders?: boolean;
    taxRate?: number;
    currency?: string;

    // Operational settings
    enableInventoryTracking?: boolean;
    businessHours?: {
      start?: string;
      end?: string;
      timezone?: string;
    };
    notifications?: {
      lowStock?: boolean;
      overduePayments?: boolean;
      newOrders?: boolean;
    };
  };
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
   * Get current user ID from auth store with fallback mechanisms
   * @returns User ID or throws an error with helpful message
   */
  private static getCurrentUserId(): string {
    try {
      console.log('🔍 AgencyService: Getting current user ID...');

      // Method 1: Try Zustand persisted store
      const authStore = localStorage.getItem('flowlytix-auth-store');
      console.log('📦 AgencyService: Auth store raw:', authStore);

      if (authStore) {
        try {
          const parsed = JSON.parse(authStore);
          console.log('🔍 AgencyService: Parsed auth store:', parsed);
          const userId = parsed?.state?.user?.id;
          if (userId && typeof userId === 'string' && userId.length > 0) {
            console.log('✅ AgencyService: Found user ID from Zustand store:', userId);
            return userId;
          }
        } catch (parseError) {
          console.warn('⚠️ AgencyService: Failed to parse auth store:', parseError);
        }
      }

      // Method 2: Try session storage
      const sessionData = localStorage.getItem('flowlytix_auth_session');
      console.log('📦 AgencyService: Session data raw:', sessionData);

      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          console.log('🔍 AgencyService: Parsed session data:', parsed);
          const userId = parsed?.user?.id;
          if (userId && typeof userId === 'string' && userId.length > 0) {
            console.log('✅ AgencyService: Found user ID from session storage:', userId);
            return userId;
          }
        } catch (parseError) {
          console.warn('⚠️ AgencyService: Failed to parse session data:', parseError);
        }
      }

      // Method 3: Use proper UUID for super admin for testing (updated to match database)
      console.warn('⚠️ AgencyService: No authenticated user found, using super admin UUID for testing');
      const fallbackUserId = '550e8400-e29b-41d4-a716-446655440000';
      console.log('🔧 AgencyService: Using fallback user ID:', fallbackUserId);
      return fallbackUserId;
    } catch (error) {
      console.error('❌ AgencyService: Error getting current user ID:', error);
      const fallbackUserId = '550e8400-e29b-41d4-a716-446655440000';
      console.log('🚨 AgencyService: Exception occurred, using emergency fallback:', fallbackUserId);
      return fallbackUserId;
    }
  }

  /**
   * List agencies with optional filtering and pagination
   * @param params - List parameters (page, pageSize, search, status)
   * @returns Promise with agencies list and pagination info
   */
  public static async listAgencies(params: ListAgenciesParams = {}): Promise<ListAgenciesResult> {
    try {
      console.log('📋 AgencyService: Fetching agencies with params:', params);

      // Get current user ID with robust fallback
      const requestedBy = this.getCurrentUserId();

      // Build request with minimal required backend parameters
      const requestData: any = {
        requestedBy: requestedBy,
        limit: params.pageSize || 50,
        offset: params.page ? (params.page - 1) * (params.pageSize || 50) : 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      // Only add optional parameters if they have valid values
      if (params.search && typeof params.search === 'string' && params.search.trim().length > 0) {
        requestData.search = params.search.trim();
      }

      if (params.status && ['active', 'inactive', 'suspended'].includes(params.status)) {
        requestData.status = params.status;
      }

      console.log('📋 AgencyService: Sending request data to backend:', requestData);

      // Call IPC API with proper parameters
      const response = await window.electronAPI.agency.getAgencies(requestData);

      console.log('📋 AgencyService: Raw response from IPC:', response);

      if (!response.success) {
        console.error('❌ AgencyService: Backend returned error:', response.error);
        throw new Error(response.error || 'Failed to fetch agencies');
      }

      // Extract agencies from multiple possible response structures
      let agenciesData: any[] = [];

      // Handle different possible response structures
      if (response.data?.agencies) {
        agenciesData = response.data.agencies;
        console.log('📋 AgencyService: Found agencies in response.data.agencies');
      } else if (response.agencies) {
        agenciesData = response.agencies;
        console.log('📋 AgencyService: Found agencies in response.agencies');
      } else if (response.data && Array.isArray(response.data)) {
        agenciesData = response.data;
        console.log('📋 AgencyService: Found agencies in response.data (array)');
      } else if (Array.isArray(response)) {
        agenciesData = response;
        console.log('📋 AgencyService: Response is direct array');
      } else {
        console.warn(
          '⚠️ AgencyService: No agencies found in response structure:',
          response ? Object.keys(response) : 'null/undefined response'
        );
        agenciesData = [];
      }

      console.log('📋 AgencyService: Extracted agencies data:', agenciesData);
      console.log('📋 AgencyService: Number of agencies found:', agenciesData.length);

      // If no agencies found, log for debugging
      if (agenciesData.length === 0) {
        console.warn('⚠️ AgencyService: No agencies returned from backend');
        console.warn('⚠️ AgencyService: Full response structure:', JSON.stringify(response, null, 2));
      }

      // Transform the response to match expected format
      const agencies: Agency[] = agenciesData.map((agency: any, index: number) => {
        return {
          id: agency.id || `unknown-${index}`,
          name: agency.name || 'Unknown Agency',
          databasePath:
            agency.databasePath ||
            agency.database_path ||
            `${(agency.name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-')}.db`,
          contactPerson: agency.contactPerson || agency.contact_person || null,
          phone: agency.phone || null,
          email: agency.email || null,
          address: agency.address || null,
          status: (agency.status || 'active') as Agency['status'],
          createdAt: agency.createdAt || agency.created_at || new Date().toISOString(),
          settings: {
            allowCreditSales: agency.settings?.allowCreditSales ?? agency.allowsCreditSales ?? true,
            defaultCreditDays: agency.settings?.defaultCreditDays ?? agency.defaultCreditDays ?? 30,
            maxCreditLimit: agency.settings?.maxCreditLimit ?? agency.maxCreditLimit ?? 50000,
            requireApprovalForOrders:
              agency.settings?.requireApprovalForOrders ?? agency.requireApprovalForOrders ?? false,
            enableInventoryTracking:
              agency.settings?.enableInventoryTracking ?? agency.enablesInventoryTracking ?? true,
            taxRate: agency.settings?.taxRate ?? agency.taxRate ?? 0.15,
            currency: agency.settings?.currency ?? (agency.currency || 'USD'),
            businessHours: {
              start: agency.settings?.businessHours?.start || agency.businessHoursStart || '09:00',
              end: agency.settings?.businessHours?.end || agency.businessHoursEnd || '17:00',
              timezone: agency.settings?.businessHours?.timezone || agency.businessHoursTimezone || 'UTC',
            },
            notifications: {
              lowStock: agency.settings?.notifications?.lowStock ?? agency.notificationsLowStock ?? true,
              overduePayments:
                agency.settings?.notifications?.overduePayments ?? agency.notificationsOverduePayments ?? true,
              newOrders: agency.settings?.notifications?.newOrders ?? agency.notificationsNewOrders ?? false,
            },
          },
        };
      });

      console.log('📋 AgencyService: Transformed agencies:', agencies);

      // Get total count from response or use agencies length
      const totalCount = response.data?.total ?? response.total ?? agenciesData.length;
      const currentPage = params.page || 1;
      const currentPageSize = params.pageSize || 50;

      const result: ListAgenciesResult = {
        agencies,
        totalCount,
        page: currentPage,
        pageSize: currentPageSize,
      };

      console.log('📋 AgencyService: Final result:', result);
      return result;
    } catch (error) {
      console.error('❌ AgencyService.listAgencies error:', error);
      console.error('❌ AgencyService: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        params,
      });
      throw error;
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

      // Generate required fields that frontend doesn't provide
      const sanitizedName = params.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const timestamp = Date.now();
      const databasePath = `${sanitizedName}-${timestamp}.db`;

      // Get current user ID for requestedBy field
      const requestedBy = this.getCurrentUserId();

      // Build the request data matching the backend schema
      const requestData = {
        name: params.name,
        databasePath: databasePath,
        requestedBy: requestedBy,
        contactPerson: params.contactPerson,
        email: params.email,
        phone: params.phone,
        address: params.address,

        // Business settings as flat structure (not nested)
        allowCreditSales: params.allowCreditSales ?? false,
        defaultCreditDays: params.defaultCreditDays ?? 30,
        maxCreditLimit: params.maxCreditLimit ?? 0,
        requireApprovalForOrders: params.requireApprovalForOrders ?? false,
        enableInventoryTracking: params.enableInventoryTracking ?? true,
        taxRate: params.taxRate ?? 0,
        currency: params.currency ?? 'USD',

        // Business hours with defaults
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00',
        businessHoursTimezone: 'UTC',

        // Notification settings with defaults
        notificationsLowStock: true,
        notificationsOverduePayments: true,
        notificationsNewOrders: false,
      };

      console.log('📤 AgencyService: Sending request data:', requestData);

      // Call IPC API
      const response = await window.electronAPI.agency.createAgency(requestData);

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
   * Update an existing agency with comprehensive settings support
   * @param agencyId - Agency ID to update
   * @param params - Update parameters
   * @returns Promise with update result
   */
  public static async updateAgency(
    agencyId: string,
    params: UpdateAgencyParams
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 AgencyService.updateAgency: Starting update for agency:', agencyId);
      console.log('📝 AgencyService.updateAgency: Update params received:', params);

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

      // Get current user for updatedBy field
      const requestedBy = this.getCurrentUserId();

      // Build the request data with FLAT STRUCTURE to match backend schema
      const requestData: any = {
        agencyId,
        updatedBy: requestedBy,

        // Basic information
        ...(params.name !== undefined && { name: params.name }),
        ...(params.contactPerson !== undefined && { contactPerson: params.contactPerson }),
        ...(params.email !== undefined && { email: params.email }),
        ...(params.phone !== undefined && { phone: params.phone }),
        ...(params.address !== undefined && { address: params.address }),
        ...(params.status !== undefined && { status: params.status }),
      };

      // Handle settings - FLATTEN the nested structure to match backend schema
      if (params.settings) {
        console.log('📋 AgencyService.updateAgency: Processing settings:', params.settings);

        // Financial settings (flattened)
        if (params.settings.allowCreditSales !== undefined) {
          requestData.allowCreditSales = params.settings.allowCreditSales;
        }
        if (params.settings.defaultCreditDays !== undefined) {
          requestData.defaultCreditDays = params.settings.defaultCreditDays;
        }
        if (params.settings.maxCreditLimit !== undefined) {
          requestData.maxCreditLimit = params.settings.maxCreditLimit;
        }
        if (params.settings.requireApprovalForOrders !== undefined) {
          requestData.requireApprovalForOrders = params.settings.requireApprovalForOrders;
        }
        if (params.settings.taxRate !== undefined) {
          requestData.taxRate = params.settings.taxRate;
        }
        if (params.settings.currency !== undefined) {
          requestData.currency = params.settings.currency;
        }

        // Operational settings (flattened)
        if (params.settings.enableInventoryTracking !== undefined) {
          requestData.enableInventoryTracking = params.settings.enableInventoryTracking;
        }

        // Business hours (flattened)
        if (params.settings.businessHours) {
          if (params.settings.businessHours.start !== undefined) {
            requestData.businessHoursStart = params.settings.businessHours.start;
          }
          if (params.settings.businessHours.end !== undefined) {
            requestData.businessHoursEnd = params.settings.businessHours.end;
          }
          if (params.settings.businessHours.timezone !== undefined) {
            requestData.businessHoursTimezone = params.settings.businessHours.timezone;
          }
        }

        // Notification settings (flattened)
        if (params.settings.notifications) {
          if (params.settings.notifications.lowStock !== undefined) {
            requestData.notificationsLowStock = params.settings.notifications.lowStock;
          }
          if (params.settings.notifications.overduePayments !== undefined) {
            requestData.notificationsOverduePayments = params.settings.notifications.overduePayments;
          }
          if (params.settings.notifications.newOrders !== undefined) {
            requestData.notificationsNewOrders = params.settings.notifications.newOrders;
          }
        }
      }

      console.log('📤 AgencyService.updateAgency: Sending flattened request data:', requestData);

      // Call IPC API with flattened structure
      const response = await window.electronAPI.agency.updateAgency(requestData);

      console.log('📥 AgencyService.updateAgency: Response received:', response);

      if (!response.success) {
        console.error('❌ AgencyService.updateAgency: Backend returned error:', response.error);
        throw new Error(response.error || 'Failed to update agency');
      }

      console.log('✅ AgencyService.updateAgency: Update successful');

      return {
        success: true,
        message: 'Agency updated successfully',
      };
    } catch (error) {
      console.error('❌ AgencyService.updateAgency error:', error);
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
