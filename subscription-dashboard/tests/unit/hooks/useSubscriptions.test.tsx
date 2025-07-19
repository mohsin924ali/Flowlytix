/**
 * useSubscriptions Hook Tests
 * Comprehensive testing for subscriptions hook
 * Following Instructions file standards with thorough coverage
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { SubscriptionService } from '@/services/subscriptions';

// Mock the SubscriptionService
jest.mock('@/services/subscriptions', () => ({
  SubscriptionService: jest.fn().mockImplementation(() => ({
    getSubscriptions: jest.fn(),
    getSubscription: jest.fn(),
    createSubscription: jest.fn(),
    updateSubscription: jest.fn(),
    deleteSubscription: jest.fn(),
    suspendSubscription: jest.fn(),
    resumeSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    renewSubscription: jest.fn(),
    getSubscriptionDevices: jest.fn(),
    revokeDeviceAccess: jest.fn(),
    validateLicenseKey: jest.fn(),
    generateLicenseKey: jest.fn(),
    bulkUpdateSubscriptions: jest.fn(),
    exportSubscriptions: jest.fn(),
  })),
}));

const mockSubscriptionService = {
  getSubscriptions: jest.fn(),
  getSubscription: jest.fn(),
  createSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  deleteSubscription: jest.fn(),
  suspendSubscription: jest.fn(),
  resumeSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  renewSubscription: jest.fn(),
  getSubscriptionDevices: jest.fn(),
  revokeDeviceAccess: jest.fn(),
  validateLicenseKey: jest.fn(),
  generateLicenseKey: jest.fn(),
  bulkUpdateSubscriptions: jest.fn(),
  exportSubscriptions: jest.fn(),
};

describe('useSubscriptions Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SubscriptionService as jest.Mock).mockReturnValue(mockSubscriptionService);
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSubscriptions());

      expect(result.current.subscriptions).toEqual([]);
      expect(result.current.selectedSubscription).toBeNull();
      expect(result.current.totalCount).toBe(0);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.filters).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(false);
    });

    it('should accept initial filters', () => {
      const initialFilters = { status: ['active'], tier: ['premium'] };
      const { result } = renderHook(() => useSubscriptions(initialFilters));

      expect(result.current.filters).toEqual(initialFilters);
    });
  });

  describe('Fetch Subscriptions', () => {
    const mockSubscriptions = [
      {
        id: '1',
        name: 'Test Subscription 1',
        status: 'active',
        tier: 'basic',
        createdAt: new Date(),
      },
      {
        id: '2',
        name: 'Test Subscription 2',
        status: 'active',
        tier: 'premium',
        createdAt: new Date(),
      },
    ];

    const mockPaginatedResponse = {
      items: mockSubscriptions,
      total: 50,
      has_more: true,
    };

    it('should fetch subscriptions successfully', async () => {
      mockSubscriptionService.getSubscriptions.mockResolvedValueOnce({
        success: true,
        data: mockPaginatedResponse,
      });

      const { result } = renderHook(() => useSubscriptions());

      await act(async () => {
        await result.current.fetchSubscriptions();
      });

      expect(result.current.subscriptions).toEqual(mockSubscriptions);
      expect(result.current.totalCount).toBe(50);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockSubscriptionService.getSubscriptions).toHaveBeenCalledWith({}, 1, 10);
    });

    it('should handle fetch error', async () => {
      mockSubscriptionService.getSubscriptions.mockResolvedValueOnce({
        success: false,
        error: 'Failed to fetch subscriptions',
      });

      const { result } = renderHook(() => useSubscriptions());

      await act(async () => {
        await result.current.fetchSubscriptions();
      });

      expect(result.current.subscriptions).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch subscriptions');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle network error', async () => {
      mockSubscriptionService.getSubscriptions.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSubscriptions());

      await act(async () => {
        await result.current.fetchSubscriptions();
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Load More (Pagination)', () => {
    it('should load more subscriptions', async () => {
      const initialSubscriptions = [{ id: '1', name: 'Sub 1' }];
      const newSubscriptions = [{ id: '2', name: 'Sub 2' }];

      const { result } = renderHook(() => useSubscriptions());

      // Set initial state
      act(() => {
        result.current.setFilters({});
      });

      // Mock first page
      mockSubscriptionService.getSubscriptions.mockResolvedValueOnce({
        success: true,
        data: {
          items: initialSubscriptions,
          total: 20,
          has_more: true,
        },
      });

      await act(async () => {
        await result.current.fetchSubscriptions();
      });

      // Mock second page
      mockSubscriptionService.getSubscriptions.mockResolvedValueOnce({
        success: true,
        data: {
          items: newSubscriptions,
          total: 20,
          has_more: false,
        },
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.subscriptions).toEqual([...initialSubscriptions, ...newSubscriptions]);
      expect(result.current.currentPage).toBe(2);
      expect(result.current.hasMore).toBe(false);
    });

    it('should not load more if already fetching', async () => {
      const { result } = renderHook(() => useSubscriptions());

      // Set state to fetching
      act(() => {
        result.current.setFilters({});
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockSubscriptionService.getSubscriptions).not.toHaveBeenCalled();
    });
  });

  describe('CRUD Operations', () => {
    describe('Get Single Subscription', () => {
      it('should get subscription successfully', async () => {
        const mockSubscription = { id: '1', name: 'Test Subscription' };

        mockSubscriptionService.getSubscription.mockResolvedValueOnce({
          success: true,
          data: mockSubscription,
        });

        const { result } = renderHook(() => useSubscriptions());

        let getResult: any;
        await act(async () => {
          getResult = await result.current.getSubscription('1');
        });

        expect(getResult.success).toBe(true);
        expect(getResult.data).toEqual(mockSubscription);
        expect(mockSubscriptionService.getSubscription).toHaveBeenCalledWith('1');
      });
    });

    describe('Create Subscription', () => {
      it('should create subscription successfully', async () => {
        const newSubscription = { id: '3', name: 'New Subscription' };
        const createData = { name: 'New Subscription', tier: 'basic' };

        mockSubscriptionService.createSubscription.mockResolvedValueOnce({
          success: true,
          data: newSubscription,
        });

        const { result } = renderHook(() => useSubscriptions());

        let createResult: any;
        await act(async () => {
          createResult = await result.current.createSubscription(createData);
        });

        expect(createResult.success).toBe(true);
        expect(createResult.data).toEqual(newSubscription);
        expect(result.current.subscriptions[0]).toEqual(newSubscription);
        expect(result.current.totalCount).toBe(1);
        expect(result.current.isCreating).toBe(false);
      });

      it('should handle create error', async () => {
        const createData = { name: 'New Subscription', tier: 'basic' };

        mockSubscriptionService.createSubscription.mockResolvedValueOnce({
          success: false,
          error: 'Validation error',
        });

        const { result } = renderHook(() => useSubscriptions());

        let createResult: any;
        await act(async () => {
          createResult = await result.current.createSubscription(createData);
        });

        expect(createResult.success).toBe(false);
        expect(createResult.error).toBe('Validation error');
        expect(result.current.error).toBe('Validation error');
        expect(result.current.isCreating).toBe(false);
      });
    });

    describe('Update Subscription', () => {
      it('should update subscription successfully', async () => {
        const originalSubscription = { id: '1', name: 'Original Name' };
        const updatedSubscription = { id: '1', name: 'Updated Name' };

        // Set initial state with subscription
        const { result } = renderHook(() => useSubscriptions());

        act(() => {
          result.current.setSelectedSubscription(originalSubscription);
        });

        mockSubscriptionService.updateSubscription.mockResolvedValueOnce({
          success: true,
          data: updatedSubscription,
        });

        let updateResult: any;
        await act(async () => {
          updateResult = await result.current.updateSubscription('1', { name: 'Updated Name' });
        });

        expect(updateResult.success).toBe(true);
        expect(updateResult.data).toEqual(updatedSubscription);
        expect(result.current.selectedSubscription).toEqual(updatedSubscription);
        expect(result.current.isUpdating).toBe(false);
      });
    });

    describe('Delete Subscription', () => {
      it('should delete subscription successfully', async () => {
        const subscription = { id: '1', name: 'To Delete' };

        const { result } = renderHook(() => useSubscriptions());

        // Set initial state
        act(() => {
          result.current.setSelectedSubscription(subscription);
        });

        mockSubscriptionService.deleteSubscription.mockResolvedValueOnce({
          success: true,
        });

        let deleteResult: any;
        await act(async () => {
          deleteResult = await result.current.deleteSubscription('1');
        });

        expect(deleteResult.success).toBe(true);
        expect(result.current.selectedSubscription).toBeNull();
        expect(result.current.isDeleting).toBe(false);
      });
    });
  });

  describe('Subscription Actions', () => {
    describe('Suspend Subscription', () => {
      it('should suspend subscription successfully', async () => {
        const suspendedSubscription = { id: '1', status: 'suspended' };

        mockSubscriptionService.suspendSubscription.mockResolvedValueOnce({
          success: true,
          data: suspendedSubscription,
        });

        const { result } = renderHook(() => useSubscriptions());

        let suspendResult: any;
        await act(async () => {
          suspendResult = await result.current.suspendSubscription('1', 'Policy violation');
        });

        expect(suspendResult.success).toBe(true);
        expect(suspendResult.data).toEqual(suspendedSubscription);
        expect(mockSubscriptionService.suspendSubscription).toHaveBeenCalledWith('1', 'Policy violation');
      });
    });

    describe('Resume Subscription', () => {
      it('should resume subscription successfully', async () => {
        const resumedSubscription = { id: '1', status: 'active' };

        mockSubscriptionService.resumeSubscription.mockResolvedValueOnce({
          success: true,
          data: resumedSubscription,
        });

        const { result } = renderHook(() => useSubscriptions());

        let resumeResult: any;
        await act(async () => {
          resumeResult = await result.current.resumeSubscription('1');
        });

        expect(resumeResult.success).toBe(true);
        expect(resumeResult.data).toEqual(resumedSubscription);
      });
    });

    describe('Cancel Subscription', () => {
      it('should cancel subscription successfully', async () => {
        const cancelledSubscription = { id: '1', status: 'cancelled' };

        mockSubscriptionService.cancelSubscription.mockResolvedValueOnce({
          success: true,
          data: cancelledSubscription,
        });

        const { result } = renderHook(() => useSubscriptions());

        let cancelResult: any;
        await act(async () => {
          cancelResult = await result.current.cancelSubscription('1', 'User request');
        });

        expect(cancelResult.success).toBe(true);
        expect(cancelResult.data).toEqual(cancelledSubscription);
      });
    });
  });

  describe('Device Management', () => {
    it('should get subscription devices', async () => {
      const mockDevices = [
        { id: 'device1', name: 'Device 1' },
        { id: 'device2', name: 'Device 2' },
      ];

      mockSubscriptionService.getSubscriptionDevices.mockResolvedValueOnce({
        success: true,
        data: mockDevices,
      });

      const { result } = renderHook(() => useSubscriptions());

      let devicesResult: any;
      await act(async () => {
        devicesResult = await result.current.getSubscriptionDevices('1');
      });

      expect(devicesResult.success).toBe(true);
      expect(devicesResult.data).toEqual(mockDevices);
    });

    it('should revoke device access', async () => {
      mockSubscriptionService.revokeDeviceAccess.mockResolvedValueOnce({
        success: true,
      });

      const { result } = renderHook(() => useSubscriptions());

      let revokeResult: any;
      await act(async () => {
        revokeResult = await result.current.revokeDeviceAccess('1', 'device1');
      });

      expect(revokeResult.success).toBe(true);
      expect(mockSubscriptionService.revokeDeviceAccess).toHaveBeenCalledWith('1', 'device1');
    });
  });

  describe('License Operations', () => {
    it('should validate license key', async () => {
      const validationResult = { valid: true, message: 'Valid license' };

      mockSubscriptionService.validateLicenseKey.mockResolvedValueOnce({
        success: true,
        data: validationResult,
      });

      const { result } = renderHook(() => useSubscriptions());

      let validateResult: any;
      await act(async () => {
        validateResult = await result.current.validateLicenseKey('TEST-LICENSE-KEY');
      });

      expect(validateResult.success).toBe(true);
      expect(validateResult.data).toEqual(validationResult);
    });

    it('should generate license key', async () => {
      const licenseKeyResult = { licenseKey: 'NEW-LICENSE-KEY' };

      mockSubscriptionService.generateLicenseKey.mockResolvedValueOnce({
        success: true,
        data: licenseKeyResult,
      });

      const { result } = renderHook(() => useSubscriptions());

      let generateResult: any;
      await act(async () => {
        generateResult = await result.current.generateLicenseKey('1');
      });

      expect(generateResult.success).toBe(true);
      expect(generateResult.data).toEqual(licenseKeyResult);
    });
  });

  describe('Filters and State Management', () => {
    it('should set filters', () => {
      const { result } = renderHook(() => useSubscriptions());

      act(() => {
        result.current.setFilters({ status: ['active'], tier: ['premium'] });
      });

      expect(result.current.filters).toEqual({ status: ['active'], tier: ['premium'] });
      expect(result.current.currentPage).toBe(1);
    });

    it('should clear filters', () => {
      const { result } = renderHook(() => useSubscriptions({ status: ['active'] }));

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
      expect(result.current.currentPage).toBe(1);
    });

    it('should set selected subscription', () => {
      const subscription = { id: '1', name: 'Test Subscription' };
      const { result } = renderHook(() => useSubscriptions());

      act(() => {
        result.current.setSelectedSubscription(subscription);
      });

      expect(result.current.selectedSubscription).toEqual(subscription);
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useSubscriptions());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk update subscriptions', async () => {
      const bulkResult = { updated: 5, failed: 0 };

      mockSubscriptionService.bulkUpdateSubscriptions.mockResolvedValueOnce({
        success: true,
        data: bulkResult,
      });

      // Mock refetch
      mockSubscriptionService.getSubscriptions.mockResolvedValueOnce({
        success: true,
        data: { items: [], total: 0, has_more: false },
      });

      const { result } = renderHook(() => useSubscriptions());

      let bulkUpdateResult: any;
      await act(async () => {
        bulkUpdateResult = await result.current.bulkUpdateSubscriptions(['1', '2', '3'], { status: 'active' });
      });

      expect(bulkUpdateResult.success).toBe(true);
      expect(bulkUpdateResult.data).toEqual(bulkResult);
    });
  });

  describe('Export', () => {
    it('should export subscriptions', async () => {
      mockSubscriptionService.exportSubscriptions.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useSubscriptions());

      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportSubscriptions();
      });

      expect(exportResult.success).toBe(true);
      expect(mockSubscriptionService.exportSubscriptions).toHaveBeenCalledWith({});
    });
  });
});
