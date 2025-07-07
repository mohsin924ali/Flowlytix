/**
 * Unit Tests for Subscriptions API Service
 * Testing the subscriptions service with comprehensive coverage
 * Following Instructions file standards with thorough testing
 */

import { subscriptionService } from '../../../src/services/subscriptions';
import { SubscriptionStatus, SubscriptionTier } from '../../../src/types';
import { mockSubscriptions } from '../../utils/mockData';

// Mock the API module
jest.mock('../../../src/services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from '../../../src/services/api';

const mockApi = apiClient as jest.Mocked<typeof apiClient>;

describe('Subscriptions API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubscriptions', () => {
    test('calls API with correct parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: mockSubscriptions,
          totalCount: 3,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await subscriptionService.getSubscriptions();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/subscriptions?page=1&page_size=10');
    });

    test('handles filters correctly', async () => {
      const filters = {
        status: [SubscriptionStatus.ACTIVE],
        tier: [SubscriptionTier.PROFESSIONAL],
        search: 'test',
      };

      const mockResponse = {
        success: true,
        data: {
          data: [mockSubscriptions[0]],
          totalCount: 1,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await subscriptionService.getSubscriptions(filters);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/subscriptions?page=1&page_size=10&status=active&tier=professional&search=test')
      );
    });

    test('handles API errors gracefully', async () => {
      const mockError = new Error('Network error');
      mockApi.get.mockRejectedValue(mockError);

      await expect(subscriptionService.getSubscriptions()).rejects.toThrow('Network error');
    });
  });

  describe('getSubscription', () => {
    test('calls API with correct subscription ID', async () => {
      const subscriptionId = '1';
      const mockResponse = {
        success: true,
        data: mockSubscriptions[0],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await subscriptionService.getSubscription(subscriptionId);

      expect(mockApi.get).toHaveBeenCalledWith(`/api/v1/subscriptions/${subscriptionId}`);
    });

    test('handles subscription not found error', async () => {
      const subscriptionId = 'nonexistent';
      const mockError = new Error('Subscription not found');
      mockApi.get.mockRejectedValue(mockError);

      await expect(subscriptionService.getSubscription(subscriptionId)).rejects.toThrow('Subscription not found');
    });
  });

  describe('createSubscription', () => {
    test('calls API with subscription data', async () => {
      const subscriptionData = {
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        tier: SubscriptionTier.BASIC,
        features: ['basic'],
        maxDevices: 2,
        startsAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-12-31'),
        gracePeriodDays: 7,
      };

      const mockResponse = {
        success: true,
        data: {
          ...subscriptionData,
          id: '4',
          customerId: '4',
          licenseKey: 'FL-2024-004-TEST',
          status: SubscriptionStatus.ACTIVE,
          devicesConnected: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivity: new Date(),
          lastSyncAt: new Date(),
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      await subscriptionService.createSubscription(subscriptionData);

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/subscriptions', subscriptionData);
    });

    test('handles validation errors', async () => {
      const invalidData = {
        customerName: '',
        customerEmail: 'invalid-email',
        tier: 'invalid' as any,
        features: [],
        maxDevices: 0,
        startsAt: new Date(),
        expiresAt: new Date(),
        gracePeriodDays: 0,
      };

      const mockError = new Error('Validation failed');
      mockApi.post.mockRejectedValue(mockError);

      await expect(subscriptionService.createSubscription(invalidData)).rejects.toThrow('Validation failed');
    });
  });

  describe('updateSubscription', () => {
    test('calls API with update data', async () => {
      const subscriptionId = '1';
      const updateData = {
        tier: SubscriptionTier.PROFESSIONAL,
        maxDevices: 10,
      };

      const mockResponse = {
        success: true,
        data: {
          ...mockSubscriptions[0],
          ...updateData,
          updatedAt: new Date(),
        },
      };

      mockApi.patch.mockResolvedValue(mockResponse);

      await subscriptionService.updateSubscription(subscriptionId, updateData);

      expect(mockApi.patch).toHaveBeenCalledWith(`/api/v1/subscriptions/${subscriptionId}`, updateData);
    });

    test('handles update errors', async () => {
      const subscriptionId = 'nonexistent';
      const updateData = { tier: SubscriptionTier.PROFESSIONAL };
      const mockError = new Error('Subscription not found');

      mockApi.patch.mockRejectedValue(mockError);

      await expect(subscriptionService.updateSubscription(subscriptionId, updateData)).rejects.toThrow(
        'Subscription not found'
      );
    });
  });

  describe('deleteSubscription', () => {
    test('calls API with subscription ID', async () => {
      const subscriptionId = '1';
      const mockResponse = {
        success: true,
        data: undefined,
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      await subscriptionService.deleteSubscription(subscriptionId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/api/v1/subscriptions/${subscriptionId}`);
    });

    test('handles delete errors', async () => {
      const subscriptionId = 'nonexistent';
      const mockError = new Error('Subscription not found');

      mockApi.delete.mockRejectedValue(mockError);

      await expect(subscriptionService.deleteSubscription(subscriptionId)).rejects.toThrow('Subscription not found');
    });
  });

  describe('Subscription Actions', () => {
    test('suspends subscription with reason', async () => {
      const subscriptionId = '1';
      const reason = 'Payment overdue';
      const mockResponse = {
        success: true,
        data: {
          ...mockSubscriptions[0],
          status: SubscriptionStatus.SUSPENDED,
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      await subscriptionService.suspendSubscription(subscriptionId, reason);

      expect(mockApi.post).toHaveBeenCalledWith(`/api/v1/subscriptions/${subscriptionId}/suspend`, { reason });
    });

    test('resumes subscription', async () => {
      const subscriptionId = '1';
      const mockResponse = {
        success: true,
        data: {
          ...mockSubscriptions[0],
          status: SubscriptionStatus.ACTIVE,
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      await subscriptionService.resumeSubscription(subscriptionId);

      expect(mockApi.post).toHaveBeenCalledWith(`/api/v1/subscriptions/${subscriptionId}/resume`);
    });

    test('cancels subscription with reason', async () => {
      const subscriptionId = '1';
      const reason = 'Customer request';
      const mockResponse = {
        success: true,
        data: {
          ...mockSubscriptions[0],
          status: SubscriptionStatus.CANCELLED,
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      await subscriptionService.cancelSubscription(subscriptionId, reason);

      expect(mockApi.post).toHaveBeenCalledWith(`/api/v1/subscriptions/${subscriptionId}/cancel`, { reason });
    });

    test('renews subscription', async () => {
      const subscriptionId = '1';
      const expiresAt = new Date('2025-12-31');
      const mockResponse = {
        success: true,
        data: {
          ...mockSubscriptions[0],
          expiresAt,
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      await subscriptionService.renewSubscription(subscriptionId, expiresAt);

      expect(mockApi.post).toHaveBeenCalledWith(`/api/v1/subscriptions/${subscriptionId}/renew`, {
        expires_at: expiresAt.toISOString(),
      });
    });
  });

  describe('License Operations', () => {
    test('validates license key', async () => {
      const licenseKey = 'FL-2024-001-ABC123';
      const mockResponse = {
        success: true,
        data: {
          valid: true,
          message: 'License is valid',
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      await subscriptionService.validateLicenseKey(licenseKey);

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/licensing/validate-key', {
        license_key: licenseKey,
      });
    });

    test('generates new license key', async () => {
      const subscriptionId = '1';
      const mockResponse = {
        success: true,
        data: {
          licenseKey: 'FL-2024-001-NEW123',
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      await subscriptionService.generateLicenseKey(subscriptionId);

      expect(mockApi.post).toHaveBeenCalledWith(`/api/v1/subscriptions/${subscriptionId}/generate-key`);
    });

    test('handles invalid license validation', async () => {
      const invalidLicenseKey = 'INVALID-KEY';
      const mockResponse = {
        success: false,
        error: 'License key not found',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await subscriptionService.validateLicenseKey(invalidLicenseKey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('License key not found');
    });
  });

  describe('Analytics and Utilities', () => {
    test('gets subscription analytics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockResponse = {
        success: true,
        data: {
          totalSubscriptions: 150,
          activeSubscriptions: 120,
          revenue: 45000,
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await subscriptionService.getSubscriptionAnalytics(startDate, endDate);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/v1/subscriptions/analytics?start_date=' + encodeURIComponent(startDate.toISOString())
        )
      );
    });

    test('gets subscription usage', async () => {
      const subscriptionId = '1';
      const mockResponse = {
        success: true,
        data: {
          totalDevices: 5,
          activeDevices: 3,
          dataUsage: '1.2GB',
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await subscriptionService.getSubscriptionUsage(subscriptionId);

      expect(mockApi.get).toHaveBeenCalledWith(`/api/v1/subscriptions/${subscriptionId}/usage`);
    });

    test('exports subscriptions', async () => {
      const filters = {
        status: [SubscriptionStatus.ACTIVE],
        tier: [SubscriptionTier.PROFESSIONAL],
      };

      // Mock the downloadFile method
      mockApi.downloadFile = jest.fn().mockResolvedValue(undefined);

      await subscriptionService.exportSubscriptions(filters);

      expect(mockApi.downloadFile).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/subscriptions/export?status=active&tier=professional'),
        expect.stringContaining('subscriptions_')
      );
    });
  });
});
