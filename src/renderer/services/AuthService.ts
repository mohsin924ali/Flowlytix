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

      // Call the main process via IPC
      const result = await window.electronAPI.auth.authenticateUser({
        email: credentials.email,
        password: credentials.password,
      });

      console.log('📡 IPC Response received:', result);

      if (result.success && result.data?.user) {
        console.log('✅ Authentication successful, user:', result.data.user);
        return {
          success: true,
          user: {
            id: result.data.user.id,
            email: result.data.user.email,
            firstName: result.data.user.firstName,
            lastName: result.data.user.lastName,
            role: result.data.user.role,
            permissions: result.data.user.permissions || [],
          },
        };
      } else {
        console.log('❌ Authentication failed:', result.error);
        return {
          success: false,
          error: result.error || 'Authentication failed',
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
