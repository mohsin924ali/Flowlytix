/**
 * Subscription API Client
 * Handles communication with the subscription licensing server
 * Following Instructions standards for API integration
 */

import { net, app } from 'electron';

// API Configuration
const SUBSCRIPTION_API_BASE_URL = process.env.SUBSCRIPTION_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30 seconds

// API Request/Response Types
export interface ActivationRequest {
  license_key: string;
  device_id: string;
  device_info?: {
    device_id: string;
    fingerprint: any;
    device_name?: string;
    device_type?: string;
    os_name?: string;
    os_version?: string;
    app_version?: string;
  };
}

export interface ActivationResponse {
  token?: string;
  subscription?: {
    id: string;
    customer_id: string;
    license_key: string;
    status: string;
    tier: string;
    features: any;
    starts_at: string;
    expires_at?: string;
    grace_period_days: number;
    max_devices: number;
    metadata: any;
    created_at: string;
    updated_at: string;
  };
  device?: {
    id: string;
    device_id: string;
    subscription_id: string;
    is_active: boolean;
    last_seen_at?: string;
    metadata: any;
    created_at: string;
    updated_at: string;
  };
  action?: string;
  message?: string;
  expires_at?: string;
  error?: string;
}

export interface SyncRequest {
  deviceId: string;
  tenantId: string;
  currentToken?: string;
}

export interface SyncResponse {
  success: boolean;
  subscriptionTier?: string;
  expiresAt?: string;
  signedToken?: string;
  gracePeriodDays?: number;
  features?: string[];
  status?: string;
  error?: string;
  message?: string;
  isNetworkError?: boolean; // CRITICAL FIX: Add network error indicator

  // CRITICAL FIX: Add validation response fields from server
  valid?: boolean; // Server returns this for license validation
  reason?: string; // Server returns validation failure reason
  subscription?: any; // Server returns subscription data or null
  device?: any; // Server returns device data or null
  in_grace_period?: boolean;
  days_until_expiry?: number;
  expires_at?: string; // Alternative naming from server
}

export interface ValidationRequest {
  deviceId: string;
  signedToken: string;
}

export interface ValidationResponse {
  success: boolean;
  valid: boolean;
  expiresAt?: string;
  error?: string;
}

export interface LicenseValidationRequest {
  token: string;
  deviceId: string;
}

export interface LicenseValidationResponse {
  success: boolean;
  data?: {
    valid: boolean;
    subscription_tier?: string;
    expires_at?: string;
    features?: string[];
    days_remaining?: number;
    is_in_grace_period?: boolean;
    reason?: string;
  };
  error?: string;
}

export class SubscriptionApiClient {
  private static instance: SubscriptionApiClient | null = null;

  private constructor() {}

  static getInstance(): SubscriptionApiClient {
    if (!SubscriptionApiClient.instance) {
      SubscriptionApiClient.instance = new SubscriptionApiClient();
    }
    return SubscriptionApiClient.instance;
  }

  /**
   * Step 1: First Install/Activation - Register device with licensing API
   */
  async activateDevice(request: ActivationRequest): Promise<ActivationResponse> {
    try {
      console.log('🔑 Activating device with licensing API...');

      const response = await this.makeRequest<ActivationResponse>('/api/v1/subscription/activate', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      console.log('✅ Device activation response:', response.token ? 'Success' : 'Failed');
      return response;
    } catch (error) {
      console.error('❌ Device activation failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Activation failed',
      };
    }
  }

  /**
   * Validate license with server (for BackgroundSyncService)
   */
  async validateLicense(token: string, deviceId: string): Promise<LicenseValidationResponse> {
    try {
      console.log('🔍 Validating license with server...');

      const request: LicenseValidationRequest = {
        token,
        deviceId,
      };

      const response = await this.makeRequest<LicenseValidationResponse>('/api/v1/subscription/validate', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      console.log('✅ License validation response:', response.success);
      return response;
    } catch (error) {
      console.error('❌ License validation failed:', error);
      return {
        success: false,
        data: {
          valid: false,
          reason: error instanceof Error ? error.message : 'Validation failed',
        },
      };
    }
  }

  /**
   * Step 3: Periodic Sync - Sync with licensing API
   */
  async syncSubscription(request: SyncRequest): Promise<SyncResponse> {
    try {
      console.log('🔄 Syncing subscription with licensing API...');
      console.log('🔄 API Client: Sync request:', JSON.stringify(request, null, 2));

      const response = await this.makeRequest<SyncResponse>('/api/v1/subscription/validate', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      console.log('✅ API Client: Subscription sync response:', JSON.stringify(response, null, 2));
      console.log('✅ API Client: Response success:', response.success);
      console.log('✅ API Client: Response status:', response.status);
      return response;
    } catch (error) {
      console.error('❌ Subscription sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  /**
   * Step 3: Token Validation - Validate token with licensing API
   */
  async validateToken(request: ValidationRequest): Promise<ValidationResponse> {
    try {
      console.log('🔍 Validating token with licensing API...');

      const response = await this.makeRequest<ValidationResponse>('/api/v1/subscription/validate', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      console.log('✅ Token validation response:', response.success && response.valid);
      return response;
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      return {
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Health check - Test API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      console.log('🏥 Checking API health...');

      const response = await this.makeRequest<{ status: string; version: string }>('/health', {
        method: 'GET',
      });

      const isHealthy = response.status === 'healthy';
      console.log(`🏥 API health check: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      return isHealthy;
    } catch (error) {
      console.error('❌ API health check failed:', error);
      return false;
    }
  }

  /**
   * Test internet connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      // Simple connectivity test
      await this.makeRequest<any>('/api/v1/ping', {
        method: 'GET',
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper: Make HTTP request using Electron's net module
   */
  private async makeRequest<T>(
    endpoint: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: string;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = `${SUBSCRIPTION_API_BASE_URL}${endpoint}`;
      console.log(`🌐 API Client: Making ${options.method} request to:`, url);
      console.log(`🌐 API Client: Request body:`, options.body || 'No body');

      const request = net.request({
        method: options.method,
        url,
      });

      // Set default headers
      request.setHeader('Content-Type', 'application/json');
      request.setHeader('User-Agent', `Flowlytix/${app.getVersion()}`);
      request.setHeader('Accept', 'application/json');

      // Set custom headers
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          request.setHeader(key, value);
        });
      }

      // Set timeout
      const timeout = setTimeout(() => {
        request.abort();
        reject(new Error('Request timeout'));
      }, API_TIMEOUT);

      // Handle response
      request.on('response', (response) => {
        clearTimeout(timeout);

        let data = '';
        response.on('data', (chunk) => {
          data += chunk.toString();
        });

        response.on('end', () => {
          try {
            console.log(`🌐 API Client: Response status:`, response.statusCode);
            console.log(`🌐 API Client: Raw response data:`, data);

            if (response.statusCode >= 200 && response.statusCode < 300) {
              const parsedData = JSON.parse(data);
              console.log(`🌐 API Client: Parsed response:`, JSON.stringify(parsedData, null, 2));
              resolve(parsedData);
            } else {
              reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            }
          } catch (parseError) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      // Handle errors
      request.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Send request body if provided
      if (options.body) {
        request.write(options.body);
      }

      request.end();
    });
  }

  /**
   * Get current API base URL
   */
  getApiBaseUrl(): string {
    return SUBSCRIPTION_API_BASE_URL;
  }

  /**
   * Set API base URL (for testing or configuration)
   */
  setApiBaseUrl(_url: string): void {
    // Implementation would need to update the module-level constant
    // For now, just log that the request was made
    console.log('API base URL change requested');
  }
}
