/**
 * Authentication Service
 * Handles user authentication via IPC calls to the main process
 */

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
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
  };
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Authenticate user credentials
   */
  static async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      console.log('🔑 AuthService.authenticate called with:');
      console.log('- Email:', credentials.email);
      console.log('- Password length:', credentials.password.length);

      // Check if electron API is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      console.log('🔗 Calling electronAPI.auth.authenticateUser...');
      console.log('🔗 Available electronAPI methods:', Object.keys(window.electronAPI));
      console.log('🔗 Available auth methods:', Object.keys(window.electronAPI.auth));

      // Call the main process via IPC
      const result = await window.electronAPI.auth.authenticateUser({
        email: credentials.email,
        password: credentials.password,
      });

      console.log('📡 IPC Response received:', result);
      console.log('📡 IPC Response type:', typeof result);
      console.log('📡 IPC Response keys:', Object.keys(result || {}));

      if (result.success && result.user) {
        console.log('✅ Authentication successful, user:', result.user);

        // Use the user data from the IPC response (including agency info)
        return {
          success: true,
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            permissions: result.user.permissions || [],
            agencyId: result.user.agencyId,
            agency: result.user.agency, // Pass through complete agency information
          },
        };
      } else {
        console.log('❌ Authentication failed:', result.message || result.error);
        return {
          success: false,
          error: result.message || result.error || 'Authentication failed',
        };
      }
    } catch (error) {
      console.error('💥 Authentication service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Get user permissions
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.auth.getUserPermissions({ userId });
      return result.permissions || [];
    } catch (error) {
      console.error('Get permissions error:', error);
      return [];
    }
  }

  /**
   * Validate session (check if user is still authenticated)
   */
  static async validateSession(): Promise<boolean> {
    try {
      // For now, just check if localStorage has user data
      // In a real app, this would validate with the backend
      const storedUser = localStorage.getItem('flowlytix_user');
      return !!storedUser;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
}

/**
 * Type declarations for Electron API
 */
declare global {
  interface Window {
    electronAPI: {
      auth: {
        authenticateUser: (credentials: LoginCredentials) => Promise<any>;
        createUser: (params: any) => Promise<any>;
        getUserPermissions: (params: { userId: string }) => Promise<any>;
      };
      agency: {
        createAgency: (data: any) => Promise<any>;
        getAgencies: () => Promise<any>;
        updateAgency: (data: any) => Promise<any>;
      };
      database: {
        query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
        execute: (sql: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowid: number }>;
        transaction: (operations: any[]) => Promise<unknown[]>;
      };
      analytics: {
        salesSummary: (params: any) => Promise<any>;
        salesTrends: (params: any) => Promise<any>;
        customerSegmentation: (params: any) => Promise<any>;
        productPerformance: (params: any) => Promise<any>;
        revenueForecast: (params: any) => Promise<any>;
        marketBasket: (params: any) => Promise<any>;
        customerLTV: (params: any) => Promise<any>;
        territoryPerformance: (params: any) => Promise<any>;
      };
      inventory: {
        getProducts: (filters?: any) => Promise<any[]>;
        createProduct: (product: any) => Promise<any>;
        updateProduct: (id: string, updates: any) => Promise<any>;
        deleteProduct: (id: string) => Promise<void>;
      };
      orders: {
        getOrders: (filters?: any) => Promise<any[]>;
        createOrder: (order: any) => Promise<any>;
        updateOrder: (id: string, updates: any) => Promise<any>;
        cancelOrder: (id: string, reason: string) => Promise<void>;
      };
      customers: {
        getCustomers: (filters?: any) => Promise<any[]>;
        createCustomer: (customer: any) => Promise<any>;
        updateCustomer: (id: string, updates: any) => Promise<any>;
        deleteCustomer: (id: string) => Promise<void>;
      };
      shipping: {
        getShipments: (filters?: any) => Promise<any[]>;
        createShipment: (shipment: any) => Promise<any>;
        trackShipment: (trackingNumber: string) => Promise<any>;
      };
      lotBatch: {
        getLotBatches: (filters?: any) => Promise<any[]>;
        createLotBatch: (lotBatch: any) => Promise<any>;
        updateLotBatch: (id: string, updates: any) => Promise<any>;
      };
    };
  }
}
