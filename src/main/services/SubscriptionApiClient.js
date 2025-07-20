'use strict';
/**
 * Subscription API Client
 * Handles communication with the subscription licensing server
 * Following Instructions standards for API integration
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.SubscriptionApiClient = void 0;
const electron_1 = require('electron');
// API Configuration
const SUBSCRIPTION_API_BASE_URL =
  process.env.SUBSCRIPTION_API_URL || 'https://flowlytix-subscription-backend-production.up.railway.app';
const API_TIMEOUT = 30000; // 30 seconds
class SubscriptionApiClient {
  static instance = null;
  constructor() {}
  static getInstance() {
    if (!SubscriptionApiClient.instance) {
      SubscriptionApiClient.instance = new SubscriptionApiClient();
    }
    return SubscriptionApiClient.instance;
  }
  /**
   * Step 1: First Install/Activation - Register device with licensing API
   */
  async activateDevice(request) {
    try {
      console.log('🔑 Activating device with licensing API...');
      const response = await this.makeRequest('/api/v1/licensing/activate', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      console.log('✅ Device activation response:', response.success);
      return response;
    } catch (error) {
      console.error('❌ Device activation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Activation failed',
      };
    }
  }
  /**
   * Validate license with server (for BackgroundSyncService)
   */
  async validateLicense(token, deviceId) {
    try {
      console.log('🔍 Validating license with server...');
      const request = {
        token,
        deviceId,
      };
      const response = await this.makeRequest('/api/v1/licensing/validate', {
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
  async syncSubscription(request) {
    try {
      console.log('🔄 Syncing subscription with licensing API...');
      console.log('🔄 API Client: Sync request:', JSON.stringify(request, null, 2));

      const response = await this.makeRequest('/api/v1/subscription/validate', {
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
  async validateToken(request) {
    try {
      console.log('🔍 Validating token with licensing API...');
      const response = await this.makeRequest('/api/v1/licensing/validate', {
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
  async healthCheck() {
    try {
      console.log('🏥 Checking API health...');
      const response = await this.makeRequest('/api/v1/health', {
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
  async testConnection() {
    try {
      // Simple connectivity test
      await this.makeRequest('/api/v1/ping', {
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
  async makeRequest(endpoint, options) {
    return new Promise((resolve, reject) => {
      const url = `${SUBSCRIPTION_API_BASE_URL}${endpoint}`;
      const request = electron_1.net.request({
        method: options.method,
        url,
      });
      // Set default headers
      request.setHeader('Content-Type', 'application/json');
      request.setHeader('User-Agent', `Flowlytix/${electron_1.app.getVersion()}`);
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
            if (response.statusCode >= 200 && response.statusCode < 300) {
              const parsedData = JSON.parse(data);
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
  getApiBaseUrl() {
    return SUBSCRIPTION_API_BASE_URL;
  }
  /**
   * Set API base URL (for testing or configuration)
   */
  setApiBaseUrl(_url) {
    // Implementation would need to update the module-level constant
    // For now, just log that the request was made
    console.log('API base URL change requested');
  }
}
exports.SubscriptionApiClient = SubscriptionApiClient;
