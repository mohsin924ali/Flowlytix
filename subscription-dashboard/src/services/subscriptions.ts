/**
 * Subscription Service
 * Handles all subscription-related API operations
 * Following Instructions file standards with comprehensive CRUD operations
 */

import { apiClient } from './api';
import {
  Subscription,
  Customer,
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
  private readonly baseUrl = '/api/v1/subscription/subscriptions';

  /**
   * Transform backend subscription data to frontend format
   */
  private transformSubscription(item: any): Subscription {
    // Extract customer name from customer object or fallback to old format
    const customerName = item.customer?.name || item.customer_name || 'Unknown Customer';

    return {
      id: item.id,
      customerName: customerName,
      customerId: item.customer_id,
      customer: item.customer
        ? {
            id: item.customer.id,
            name: item.customer.name,
            email: item.customer.email,
            phone: item.customer.phone || undefined,
            company: item.customer.company || undefined,
            address: item.customer.address || undefined,
            createdAt: new Date(item.customer.created_at),
            updatedAt: new Date(item.customer.updated_at),
          }
        : undefined,
      licenseKey: item.license_key,
      tier: item.tier,
      status: item.status,
      features: item.features?.enabled_features || [],
      maxDevices: item.max_devices,
      devicesConnected: item.devices?.length || 0,
      startsAt: new Date(item.starts_at),
      expiresAt: new Date(item.expires_at),
      gracePeriodDays: item.grace_period_days || 0,
      lastActivity: new Date(item.updated_at),
      lastSyncAt: new Date(item.updated_at),
      notes: item.metadata?.notes || '',
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
    };
  }

  /**
   * Get all subscriptions with optional filtering and pagination
   */
  async getSubscriptions(
    filters?: SubscriptionFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Subscription>>> {
    const params = new URLSearchParams();

    // Backend uses offset/limit, frontend uses page/pageSize
    const offset = (page - 1) * pageSize;
    params.append('limit', pageSize.toString());
    params.append('offset', offset.toString());

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
    const response = await apiClient.get<any>(url);

    // Transform backend response to frontend format
    if (response.success && response.data) {
      const backendData = response.data;
      const totalPages = Math.ceil(backendData.total / pageSize);

      // Transform each subscription item
      const transformedSubscriptions = (backendData.items || []).map((item: any) => this.transformSubscription(item));

      return {
        success: true,
        data: {
          data: transformedSubscriptions,
          totalCount: backendData.total || 0,
          page,
          pageSize,
          totalPages,
        },
      };
    }

    return response;
  }

  /**
   * Get a single subscription by ID
   */
  async getSubscription(id: string): Promise<ApiResponse<Subscription>> {
    const response = await apiClient.get<any>(`${this.baseUrl}/${id}`);

    // Transform backend response to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: this.transformSubscription(response.data),
      };
    }

    return response;
  }

  /**
   * Create a new subscription
   */
  async createSubscription(data: CreateSubscriptionForm): Promise<ApiResponse<Subscription>> {
    const response = await apiClient.post<any>(this.baseUrl, data);

    // Transform backend response to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: this.transformSubscription(response.data),
      };
    }

    return response;
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(id: string, data: UpdateSubscriptionForm): Promise<ApiResponse<Subscription>> {
    try {
      // Use the general update endpoint for all updates
      const updateData: any = {};

      // Map frontend fields to backend fields
      if (data.tier !== undefined) updateData.tier = data.tier;
      if (data.features !== undefined) {
        // Convert features array to object or set to null if empty
        if (Array.isArray(data.features) && data.features.length === 0) {
          updateData.custom_features = {};
        } else if (Array.isArray(data.features)) {
          // Convert array of feature names to object with true values
          updateData.custom_features = data.features.reduce(
            (acc, feature) => {
              acc[feature] = true;
              return acc;
            },
            {} as Record<string, any>
          );
        } else {
          updateData.custom_features = data.features;
        }
      }
      if (data.maxDevices !== undefined) updateData.max_devices = data.maxDevices;
      if (data.expiresAt !== undefined) updateData.expires_at = data.expiresAt;
      if (data.gracePeriodDays !== undefined) updateData.grace_period_days = data.gracePeriodDays;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const response = await apiClient.put<any>(`${this.baseUrl}/${id}`, updateData);

      // Transform backend response to frontend format
      if (response.success && response.data) {
        return {
          success: true,
          data: this.transformSubscription(response.data),
        };
      }

      return response;
    } catch (error) {
      console.error('Update subscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      };
    }
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
    const response = await apiClient.put<any>(`${this.baseUrl}/${id}/suspend`, { reason });

    // Transform backend response to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: this.transformSubscription(response.data),
      };
    }

    return response;
  }

  /**
   * Resume a suspended subscription
   */
  async resumeSubscription(id: string): Promise<ApiResponse<Subscription>> {
    const response = await apiClient.put<any>(`${this.baseUrl}/${id}/resume`);

    // Transform backend response to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: this.transformSubscription(response.data),
      };
    }

    return response;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(id: string, reason?: string): Promise<ApiResponse<Subscription>> {
    const response = await apiClient.put<any>(`${this.baseUrl}/${id}/cancel`, { reason });

    // Transform backend response to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: this.transformSubscription(response.data),
      };
    }

    return response;
  }

  /**
   * Renew a subscription
   */
  async renewSubscription(id: string, expiresAt: Date): Promise<ApiResponse<Subscription>> {
    const response = await apiClient.post<any>(`${this.baseUrl}/${id}/renew`, {
      expires_at: expiresAt.toISOString(),
    });

    // Transform backend response to frontend format
    if (response.success && response.data) {
      return {
        success: true,
        data: this.transformSubscription(response.data),
      };
    }

    return response;
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
