/**
 * Mock Authentication Service
 * Replaces IPC calls with mock data for testing
 */

import { AuthResult, LoginCredentials } from '../../services/AuthService';
import { findMockUser, mockAuthSuccess, mockAuthError, getMockUserPermissions } from '../data/auth.mock';

export class MockAuthService {
  /**
   * Mock authentication - simulates IPC call
   */
  static async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    console.log('🔑 MockAuthService.authenticate called with:', credentials.email);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const user = findMockUser(credentials.email, credentials.password);

    if (user) {
      console.log('✅ Mock authentication successful for:', user.email);
      return mockAuthSuccess(user);
    } else {
      console.log('❌ Mock authentication failed for:', credentials.email);
      return mockAuthError('Invalid email or password');
    }
  }

  /**
   * Mock get user permissions
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    console.log('🔐 MockAuthService.getUserPermissions called for:', userId);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return getMockUserPermissions(userId);
  }

  /**
   * Mock session validation
   */
  static async validateSession(): Promise<boolean> {
    console.log('🔍 MockAuthService.validateSession called');

    // Check localStorage for mock session
    const storedUser = localStorage.getItem('flowlytix_user');
    return !!storedUser;
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
