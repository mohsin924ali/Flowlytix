/**
 * Subscription Service - Main Process
 * Coordinates subscription management across all components
 * Following Instructions standards for clean architecture
 */

import { DeviceManager } from './DeviceManager.js';
import { SubscriptionApiClient, ActivationRequest, SyncRequest } from './SubscriptionApiClient.js';
import { SecureStorage } from './SecureStorage.js';
import { Subscription, SubscriptionStatus, SubscriptionTier } from '../shared/subscription.types.js';

export interface ActivationCredentials {
  licenseKey?: string;
  email?: string;
  password?: string;
}

export interface ActivationResult {
  success: boolean;
  subscription?: Subscription;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  updated: boolean;
  subscription?: Subscription;
  error?: string;
}

export interface ValidationResult {
  isActivated: boolean;
  subscriptionTier?: string;
  expiresAt?: Date;
  deviceId?: string;
  gracePeriodDays?: number;
  isInGracePeriod?: boolean;
  daysRemaining?: number;
  lastValidatedAt?: Date;
  needsOnlineValidation?: boolean;
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  isBlocked: boolean;
  blockingReason?: string;
}

export class SubscriptionService {
  private static instance: SubscriptionService | null = null;
  private deviceManager: DeviceManager;
  private apiClient: SubscriptionApiClient;
  private secureStorage: SecureStorage;

  private constructor() {
    this.deviceManager = DeviceManager.getInstance();
    this.apiClient = SubscriptionApiClient.getInstance();
    this.secureStorage = SecureStorage.getInstance();
  }

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * STEP 1: FIRST INSTALL/ACTIVATION FLOW
   * Complete device activation with license key or credentials
   */
  async activateDevice(credentials: ActivationCredentials): Promise<ActivationResult> {
    try {
      console.log('🛠 SubscriptionService: Starting device activation...');

      // Get device info
      const deviceInfo = await this.deviceManager.getDeviceInfo();
      console.log('🔧 Device info collected:', deviceInfo.deviceId);

      // Prepare activation request - match server API expectations
      if (!credentials.licenseKey) {
        throw new Error('License key is required for activation');
      }

      const activationRequest: ActivationRequest = {
        license_key: credentials.licenseKey,
        device_id: deviceInfo.deviceId,
        device_info: {
          device_id: deviceInfo.deviceId,
          fingerprint: deviceInfo.fingerprint,
          device_name: deviceInfo.platform,
          device_type: 'desktop',
          os_name: deviceInfo.platform,
          os_version: deviceInfo.platform,
          app_version: '1.0.0',
        },
      };

      console.log('🔍 Activation request payload:', JSON.stringify(activationRequest, null, 2));

      // Call activation API
      const response = await this.apiClient.activateDevice(activationRequest);

      if (response.success && response.subscription && response.token) {
        console.log('✅ SubscriptionService: Activation successful');

        // Create subscription object from server response
        const subscription = Subscription.create({
          licenseKey: credentials.licenseKey || '',
          email: '', // Server doesn't use email for activation
          tier: SubscriptionTier.fromString(response.subscription.tier),
          status: SubscriptionStatus.ACTIVE,
          features: response.subscription.features || [],
          maxDevices: response.subscription.max_devices || 1,
          deviceId: deviceInfo.deviceId,
          deviceInfo: {
            deviceId: deviceInfo.deviceId,
            platform: deviceInfo.platform,
            fingerprint: deviceInfo.fingerprint,
            registeredAt: deviceInfo.registeredAt,
          },
          tenantId: response.subscription.customer_id || '',
          startsAt: new Date(response.subscription.starts_at),
          expiresAt: response.subscription.expires_at ? new Date(response.subscription.expires_at) : new Date(),
          gracePeriodDays: response.subscription.grace_period_days || 7,
          lastValidatedAt: null,
          signedToken: response.token,
        });

        // Store subscription securely
        await this.secureStorage.storeSubscription(subscription);

        return {
          success: true,
          subscription,
        };
      } else {
        console.log('❌ SubscriptionService: Activation failed:', response.error);
        return {
          success: false,
          error: response.error || 'Activation failed',
        };
      }
    } catch (error) {
      console.error('❌ SubscriptionService: Activation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Activation failed',
      };
    }
  }

  /**
   * STEP 2: NORMAL DAILY USE (OFFLINE-FIRST)
   * Validate subscription on app startup without requiring internet
   */
  async validateOnStartup(): Promise<ValidationResult> {
    try {
      console.log('🌐 SubscriptionService: Starting startup validation...');

      const subscription = await this.secureStorage.getSubscription();

      if (!subscription) {
        console.log('⚠️ SubscriptionService: No subscription found');
        return {
          isActivated: false,
          needsOnlineValidation: true,
        };
      }

      console.log('✅ SubscriptionService: Subscription found, validating...');

      // Mark as validated (offline validation)
      await this.secureStorage.markAsValidated(subscription.deviceId);
      const updatedSubscription = await this.secureStorage.getSubscription();

      return {
        isActivated: true,
        subscriptionTier: subscription.tier.toString(),
        expiresAt: subscription.expiresAt,
        deviceId: subscription.deviceId,
        gracePeriodDays: subscription.gracePeriodDays,
        isInGracePeriod: subscription.isInGracePeriod(),
        daysRemaining: subscription.getDaysRemaining(),
        ...(updatedSubscription?.lastValidatedAt && { lastValidatedAt: updatedSubscription.lastValidatedAt }),
        needsOnlineValidation: subscription.needsValidation(),
      };
    } catch (error) {
      console.error('❌ SubscriptionService: Startup validation error:', error);
      return {
        isActivated: false,
        needsOnlineValidation: true,
      };
    }
  }

  /**
   * STEP 3: PERIODIC SYNC (ONLINE)
   * Sync subscription status with licensing server when internet is available
   */
  async performSync(): Promise<SyncResult> {
    try {
      console.log('🔄 SubscriptionService: Starting periodic sync...');

      const subscription = await this.secureStorage.getSubscription();
      if (!subscription) {
        console.log('⚠️ SubscriptionService: No subscription found for sync');
        return {
          success: false,
          updated: false,
          error: 'No subscription found',
        };
      }

      // Prepare sync request
      const syncRequest: SyncRequest = {
        deviceId: subscription.deviceId,
        tenantId: subscription.tenantId,
        ...(subscription.signedToken && { currentToken: subscription.signedToken }),
      };

      // Call sync API
      const response = await this.apiClient.syncSubscription(syncRequest);

      if (response.success && response.subscriptionTier && response.expiresAt) {
        console.log('✅ SubscriptionService: Sync successful');

        // Update subscription with new data
        const updatedData = subscription.toData();
        updatedData.tier = SubscriptionTier.fromString(response.subscriptionTier);
        updatedData.expiresAt = new Date(response.expiresAt);
        updatedData.features = response.features || updatedData.features;
        updatedData.gracePeriodDays = response.gracePeriodDays || updatedData.gracePeriodDays;

        if (response.signedToken) {
          updatedData.signedToken = response.signedToken;
        }

        const updatedSubscription = Subscription.fromData(updatedData);
        await this.secureStorage.storeSubscription(updatedSubscription);

        return {
          success: true,
          updated: true,
          subscription: updatedSubscription,
        };
      } else {
        console.log('❌ SubscriptionService: Sync failed:', response.error);
        return {
          success: false,
          updated: false,
          error: response.error || 'Sync failed',
        };
      }
    } catch (error) {
      console.error('❌ SubscriptionService: Sync error:', error);
      return {
        success: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  /**
   * STEP 5: AFTER EXPIRY/GRACE PERIOD
   * Check feature access with subscription tier validation
   */
  async checkFeatureAccess(featureId: string): Promise<FeatureAccessResult> {
    try {
      const subscription = await this.secureStorage.getSubscription();

      if (!subscription) {
        return {
          hasAccess: false,
          isBlocked: true,
          blockingReason: 'No active subscription',
        };
      }

      // Check if subscription allows feature access
      const hasFeatureAccess = subscription.hasFeature(featureId);

      return {
        hasAccess: hasFeatureAccess,
        isBlocked: !hasFeatureAccess,
        ...(!hasFeatureAccess && {
          blockingReason: `Feature '${featureId}' not available in ${subscription.tier} tier`,
        }),
      };
    } catch (error) {
      console.error('❌ SubscriptionService: Feature access check error:', error);
      return {
        hasAccess: false,
        isBlocked: true,
        blockingReason: 'Error checking feature access',
      };
    }
  }

  /**
   * Get current subscription state
   */
  async getCurrentState(): Promise<ValidationResult> {
    try {
      const subscription = await this.secureStorage.getSubscription();

      if (!subscription) {
        return {
          isActivated: false,
          needsOnlineValidation: true,
        };
      }

      // Check expiry status
      const daysRemaining = subscription.getDaysRemaining();
      const isInGracePeriod = subscription.isInGracePeriod();

      return {
        isActivated: true,
        subscriptionTier: subscription.tier.toString(),
        expiresAt: subscription.expiresAt,
        deviceId: subscription.deviceId,
        gracePeriodDays: subscription.gracePeriodDays,
        isInGracePeriod,
        daysRemaining,
        ...(subscription.lastValidatedAt && { lastValidatedAt: subscription.lastValidatedAt }),
        needsOnlineValidation: subscription.needsValidation(),
      };
    } catch (error) {
      console.error('❌ SubscriptionService: Get current state error:', error);
      return {
        isActivated: false,
        needsOnlineValidation: true,
      };
    }
  }

  /**
   * Check if device needs activation
   */
  async needsActivation(): Promise<boolean> {
    try {
      const subscription = await this.secureStorage.getSubscription();
      return subscription === null;
    } catch (error) {
      console.error('❌ SubscriptionService: Needs activation check error:', error);
      return true;
    }
  }

  /**
   * Reset subscription (for testing/development)
   */
  async resetSubscription(): Promise<boolean> {
    try {
      await this.secureStorage.removeSubscription();
      console.log('✅ SubscriptionService: Subscription reset successfully');
      return true;
    } catch (error) {
      console.error('❌ SubscriptionService: Reset subscription error:', error);
      return false;
    }
  }

  /**
   * Get device description for display
   */
  async getDeviceDescription(): Promise<string> {
    try {
      const deviceInfo = await this.deviceManager.getDeviceInfo();
      return `${deviceInfo.platform} - ${deviceInfo.deviceId}`;
    } catch (error) {
      console.error('❌ SubscriptionService: Get device description error:', error);
      return 'Unknown Device';
    }
  }

  /**
   * Get expiry warning information
   */
  async getExpiryWarning(): Promise<{
    shouldShow: boolean;
    type: 'approaching' | 'grace_period' | 'expired';
    daysRemaining: number;
    message: string;
  } | null> {
    try {
      const subscription = await this.secureStorage.getSubscription();

      if (!subscription) {
        return null;
      }

      const daysRemaining = subscription.getDaysRemaining();
      const isInGracePeriod = subscription.isInGracePeriod();

      if (subscription.isCompletelyExpired()) {
        return {
          shouldShow: true,
          type: 'expired',
          daysRemaining: 0,
          message: 'Your subscription has expired. Please renew to continue using Flowlytix.',
        };
      }

      if (isInGracePeriod) {
        return {
          shouldShow: true,
          type: 'grace_period',
          daysRemaining,
          message: `Your subscription has expired but you have ${daysRemaining} days remaining in the grace period.`,
        };
      }

      if (daysRemaining <= 14) {
        return {
          shouldShow: true,
          type: 'approaching',
          daysRemaining,
          message: `Your subscription expires in ${daysRemaining} days. Please renew to avoid interruption.`,
        };
      }

      return null;
    } catch (error) {
      console.error('❌ SubscriptionService: Get expiry warning error:', error);
      return null;
    }
  }
}
