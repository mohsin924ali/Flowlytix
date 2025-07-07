/**
 * Subscription Service
 * Handles all subscription-related API operations
 * Following Instructions file standards with comprehensive CRUD operations
 */

import { apiClient } from './api';
import {
  Subscription,
  SubscriptionFilters,
  PaginatedResponse,
  CreateSubscriptionForm,
  UpdateSubscriptionForm,
  ApiResponse,
} from '@/types';

/**
 * Subscription Service Class
 * Provides methods for managing subscriptions
 */
class SubscriptionService {
  private readonly baseUrl = '/api/v1/subscriptions';

  /**
   * Get all subscriptions with optional filtering and pagination
   */
  async getSubscriptions(
    filters?: SubscriptionFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Subscription>>> {
    const params = new URLSearchParams();

    // Add pagination
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());

    // Add filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach((status) => params.append('status', status));
      }
      if (filters.tier && filters.tier.length > 0) {
        filters.tier.forEach((tier) => params.append('tier', tier));
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.customerId) {
        params.append('customer_id', filters.customerId);
      }
      if (filters.startDate) {
        params.append('start_date', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.append('end_date', filters.endDate.toISOString());
      }
    }

    const url = `${this.baseUrl}?${params.toString()}`;
    return apiClient.get<PaginatedResponse<Subscription>>(url);
  }

  /**
   * Get a single subscription by ID
   */
  async getSubscription(id: string): Promise<ApiResponse<Subscription>> {
    return apiClient.get<Subscription>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new subscription
   */
  async createSubscription(data: CreateSubscriptionForm): Promise<ApiResponse<Subscription>> {
    return apiClient.post<Subscription>(this.baseUrl, data);
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(id: string, data: UpdateSubscriptionForm): Promise<ApiResponse<Subscription>> {
    return apiClient.patch<Subscription>(`${this.baseUrl}/${id}`, data);
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Suspend a subscription
   */
  async suspendSubscription(id: string, reason?: string): Promise<ApiResponse<Subscription>> {
    return apiClient.post<Subscription>(`${this.baseUrl}/${id}/suspend`, { reason });
  }

  /**
   * Resume a suspended subscription
   */
  async resumeSubscription(id: string): Promise<ApiResponse<Subscription>> {
    return apiClient.post<Subscription>(`${this.baseUrl}/${id}/resume`);
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(id: string, reason?: string): Promise<ApiResponse<Subscription>> {
    return apiClient.post<Subscription>(`${this.baseUrl}/${id}/cancel`, { reason });
  }

  /**
   * Renew a subscription
   */
  async renewSubscription(id: string, expiresAt: Date): Promise<ApiResponse<Subscription>> {
    return apiClient.post<Subscription>(`${this.baseUrl}/${id}/renew`, {
      expires_at: expiresAt.toISOString(),
    });
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics(startDate?: Date, endDate?: Date): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();

    if (startDate) {
      params.append('start_date', startDate.toISOString());
    }
    if (endDate) {
      params.append('end_date', endDate.toISOString());
    }

    const url = `${this.baseUrl}/analytics?${params.toString()}`;
    return apiClient.get<any>(url);
  }

  /**
   * Get subscription usage statistics
   */
  async getSubscriptionUsage(id: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.baseUrl}/${id}/usage`);
  }

  /**
   * Get subscription devices
   */
  async getSubscriptionDevices(id: string): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`${this.baseUrl}/${id}/devices`);
  }

  /**
   * Revoke device access from subscription
   */
  async revokeDeviceAccess(subscriptionId: string, deviceId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.baseUrl}/${subscriptionId}/devices/${deviceId}`);
  }

  /**
   * Export subscriptions to CSV
   */
  async exportSubscriptions(filters?: SubscriptionFilters): Promise<void> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach((status) => params.append('status', status));
      }
      if (filters.tier && filters.tier.length > 0) {
        filters.tier.forEach((tier) => params.append('tier', tier));
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.customerId) {
        params.append('customer_id', filters.customerId);
      }
      if (filters.startDate) {
        params.append('start_date', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.append('end_date', filters.endDate.toISOString());
      }
    }

    const url = `${this.baseUrl}/export?${params.toString()}`;
    const filename = `subscriptions_${new Date().toISOString().split('T')[0]}.csv`;

    await apiClient.downloadFile(url, filename);
  }

  /**
   * Validate license key
   */
  async validateLicenseKey(licenseKey: string): Promise<ApiResponse<{ valid: boolean; message: string }>> {
    return apiClient.post<{ valid: boolean; message: string }>('/api/v1/licensing/validate-key', {
      license_key: licenseKey,
    });
  }

  /**
   * Generate new license key
   */
  async generateLicenseKey(subscriptionId: string): Promise<ApiResponse<{ licenseKey: string }>> {
    return apiClient.post<{ licenseKey: string }>(`${this.baseUrl}/${subscriptionId}/generate-key`);
  }

  /**
   * Get subscription activity log
   */
  async getSubscriptionActivity(
    id: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<ApiResponse<PaginatedResponse<any>>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());

    const url = `${this.baseUrl}/${id}/activity?${params.toString()}`;
    return apiClient.get<PaginatedResponse<any>>(url);
  }

  /**
   * Bulk update subscriptions
   */
  async bulkUpdateSubscriptions(
    subscriptionIds: string[],
    updates: Partial<UpdateSubscriptionForm>
  ): Promise<ApiResponse<{ updated: number; failed: number }>> {
    return apiClient.post<{ updated: number; failed: number }>(`${this.baseUrl}/bulk-update`, {
      subscription_ids: subscriptionIds,
      updates,
    });
  }

  /**
   * Get subscription health check
   */
  async getHealthCheck(): Promise<ApiResponse<{ healthy: boolean; message: string }>> {
    return apiClient.get<{ healthy: boolean; message: string }>('/api/v1/health');
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();

// Export class for testing
export { SubscriptionService };
export default subscriptionService;
