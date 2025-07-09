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

      console.log('🔗 Available electronAPI methods:', Object.keys(window.electronAPI));

      // Check if auth API is available in electronAPI
      if (window.electronAPI.auth) {
        console.log('🔗 Using electronAPI.auth');
        console.log('🔗 Available auth methods:', Object.keys(window.electronAPI.auth));

        const result = await window.electronAPI.auth.authenticateUser({
          email: credentials.email,
          password: credentials.password,
        });

        console.log('📡 IPC Response received:', result);

        if (result.success && result.user) {
          console.log('✅ Authentication successful, user:', result.user);
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
              agency: result.user.agency,
            },
          };
        } else {
          console.log('❌ Authentication failed:', result.message || result.error);
          return {
            success: false,
            error: result.message || result.error || 'Authentication failed',
          };
        }
      } else {
        // Fallback to mock authentication
        console.log('🔗 Electron auth API not available, using MockAuthService');

        // Import and use MockAuthService directly
        const { MockAuthService } = await import('../mocks/services/MockAuthService');
        const result = await MockAuthService.authenticate(credentials);

        console.log('📡 MockAuthService Response:', result);
        return result;
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
      lotBatch: {
        getLotBatches: (filters?: any) => Promise<any[]>;
        createLotBatch: (lotBatch: any) => Promise<any>;
        updateLotBatch: (id: string, updates: any) => Promise<any>;
      };
      subscription: {
        activateDevice: (credentials: any) => Promise<any>;
        validateStartup: () => Promise<any>;
        performSync: () => Promise<any>;
        getCurrentState: () => Promise<any>;
        checkFeatureAccess: (featureId: string) => Promise<any>;
        getExpiryWarning: () => Promise<any>;
        needsActivation: () => Promise<any>;
        resetSubscription: () => Promise<any>;
        getDeviceDescription: () => Promise<any>;
      };
    };
  }
}
