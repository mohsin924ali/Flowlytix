/**
 * Mock Authentication Service
 *
 * Mock implementation of AuthService for frontend-only operation.
 * Provides complete authentication functionality without backend dependencies.
 *
 * @domain Authentication
 * @pattern Service Layer - Mock Implementation
 * @architecture Clean Architecture - Mock Layer
 * @version 1.0.0
 */

import { AuthResult, LoginCredentials } from '../../services/AuthService';
import { mockUsers } from '../data/auth.mock';

/**
 * Mock Authentication Service Implementation
 * Provides same interface as real AuthService but uses mock data
 */
export class MockAuthService {
  /**
   * Simulated network delay for realistic testing
   */
  private static readonly MOCK_DELAY = 800;

  /**
   * Add artificial delay to simulate network calls
   */
  private static async delay(ms: number = MockAuthService.MOCK_DELAY): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Authenticate user credentials
   * @param credentials - User login credentials
   * @returns Promise<AuthResult> - Authentication result
   */
  static async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      console.log('🔑 MockAuthService.authenticate called with:');
      console.log('- Email:', credentials?.email);
      console.log('- Password length:', credentials?.password?.length);
      console.log('- Credentials type:', typeof credentials);
      console.log('- Credentials:', credentials);

      // Validate credentials object
      if (!credentials) {
        console.error('❌ MockAuthService: No credentials provided');
        return {
          success: false,
          error: 'No credentials provided',
        };
      }

      // Simulate network delay
      await this.delay();

      // Validate input
      if (!credentials.email || !credentials.password) {
        console.error('❌ MockAuthService: Email or password missing');
        return {
          success: false,
          error: 'Email and password are required',
        };
      }

      console.log('🔍 MockAuthService: Looking for user with email:', credentials.email);
      console.log(
        '🔍 MockAuthService: Available users:',
        mockUsers.map((u) => u.email)
      );

      // Find user by email
      const user = mockUsers.find((u) => u.email.toLowerCase() === credentials.email.toLowerCase());

      if (!user) {
        console.log('❌ MockAuthService: User not found');
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      console.log('🔍 MockAuthService: Found user:', { id: user.id, email: user.email, role: user.role });

      // Check password (in real app, this would be hashed)
      if (user.password !== credentials.password) {
        console.log('❌ MockAuthService: Invalid password');
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Successful authentication
      console.log('✅ MockAuthService: Authentication successful');

      console.log('🔍 MockAuthService: Building result object...');
      console.log('- User data:', user);
      console.log('- User agencyId:', user.agencyId);
      console.log('- User agency:', user.agency);

      const result = {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.permissions,
          ...(user.agencyId && { agencyId: user.agencyId }),
          ...(user.agency && { agency: user.agency }),
        },
      };

      console.log('✅ MockAuthService: Built result:', result);
      return result;
    } catch (error) {
      console.error('💥 MockAuthService: Authentication error:', error);
      console.error('💥 MockAuthService: Error stack:', error instanceof Error ? error.stack : 'No stack');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Get user permissions
   * @param userId - User ID to get permissions for
   * @returns Promise<string[]> - User permissions
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    try {
      console.log(`🔐 MockAuthService.getUserPermissions called for userId: ${userId}`);

      // Simulate network delay
      await this.delay(200);

      const user = mockUsers.find((u) => u.id === userId);

      if (!user) {
        console.log(`❌ MockAuthService: User not found: ${userId}`);
        return [];
      }

      console.log(`✅ MockAuthService: Permissions found for ${userId}:`, user.permissions);
      return user.permissions;
    } catch (error) {
      console.error('❌ MockAuthService: Get permissions error:', error);
      return [];
    }
  }

  /**
   * Validate session (check if user is still authenticated)
   * @returns Promise<boolean> - Whether session is valid
   */
  static async validateSession(): Promise<boolean> {
    try {
      // Simulate quick network check
      await this.delay(100);

      // Check if localStorage has user data
      const storedUser = localStorage.getItem('flowlytix_user');
      const authStore = localStorage.getItem('flowlytix-auth-store');

      const isValid = !!(storedUser || authStore);
      console.log('🔍 MockAuthService.validateSession:', isValid);

      return isValid;
    } catch (error) {
      console.error('❌ MockAuthService: Session validation error:', error);
      return false;
    }
  }

  /**
   * Create new user (admin functionality)
   * @param userData - User creation data
   * @returns Promise with creation result
   */
  static async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    agencyId?: string;
    createdBy: string;
  }): Promise<{ success: boolean; userId?: string; message?: string; error?: string }> {
    try {
      console.log('👤 MockAuthService.createUser called with:', userData);

      // Simulate network delay
      await this.delay();

      // Validate input
      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        return {
          success: false,
          error: 'All required fields must be provided',
        };
      }

      // Check if user already exists
      const existingUser = mockUsers.find((u) => u.email.toLowerCase() === userData.email.toLowerCase());
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
        };
      }

      // Generate new user ID
      const newUserId = `550e8400-e29b-41d4-a716-${Date.now()}`;

      console.log('✅ MockAuthService.createUser successful, new userId:', newUserId);

      return {
        success: true,
        userId: newUserId,
        message: 'User created successfully',
      };
    } catch (error) {
      console.error('❌ MockAuthService.createUser error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      };
    }
  }

  /**
   * Get all users (for admin functionality)
   * @returns Promise with users list
   */
  static async getAllUsers(): Promise<{
    success: boolean;
    users?: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      agencyId?: string;
      agency?: any;
    }>;
    error?: string;
  }> {
    try {
      console.log('👥 MockAuthService.getAllUsers called');

      // Simulate network delay
      await this.delay(300);

      const users = mockUsers.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        ...(user.agencyId && { agencyId: user.agencyId }),
        ...(user.agency && { agency: user.agency }),
      }));

      console.log('✅ MockAuthService.getAllUsers successful, count:', users.length);

      return {
        success: true,
        users,
      };
    } catch (error) {
      console.error('❌ MockAuthService.getAllUsers error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get users',
      };
    }
  }

  /**
   * Mock logout functionality
   * @returns Promise<boolean> - Logout success
   */
  static async logout(): Promise<boolean> {
    try {
      // Simulate brief network call
      await this.delay(200);

      // Clear any stored auth data
      localStorage.removeItem('flowlytix_user');
      localStorage.removeItem('flowlytix_auth_session');

      console.log('🚪 MockAuthService: Logout successful');
      return true;
    } catch (error) {
      console.error('❌ MockAuthService: Logout error:', error);
      return false;
    }
  }
}

/**
 * Mock Electron API for authentication
 * This replaces the real electronAPI.auth calls
 */
export const mockElectronAuthAPI = {
  authenticateUser: MockAuthService.authenticate,
  getUserPermissions: async (params: { userId: string }) => ({
    permissions: await MockAuthService.getUserPermissions(params.userId),
  }),
  createUser: async (params: any) => {
    console.log('🆕 Mock createUser called:', params);
    // Simulate success response
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, message: 'User created successfully' };
  },
};
