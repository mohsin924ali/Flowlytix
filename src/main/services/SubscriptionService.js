'use strict';
/**
 * Subscription Service - Main Process
 * Coordinates subscription management across all components
 * Following Instructions standards for clean architecture
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.SubscriptionService = void 0;
const DeviceManager_1 = require('./DeviceManager');
const SubscriptionApiClient_1 = require('./SubscriptionApiClient');
const SecureStorage_1 = require('./SecureStorage');
const subscription_types_1 = require('../shared/subscription.types');
class SubscriptionService {
  static instance = null;
  deviceManager;
  apiClient;
  secureStorage;
  constructor() {
    this.deviceManager = DeviceManager_1.DeviceManager.getInstance();
    this.apiClient = SubscriptionApiClient_1.SubscriptionApiClient.getInstance();
    this.secureStorage = SecureStorage_1.SecureStorage.getInstance();
  }
  static getInstance() {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }
  /**
   * STEP 1: FIRST INSTALL/ACTIVATION FLOW
   * Complete device activation with license key or credentials
   */
  async activateDevice(credentials) {
    try {
      console.log('🛠 SubscriptionService: Starting device activation...');
      // Get device info
      let deviceInfo = await this.deviceManager.getDeviceInfo();
      console.log('🔧 Device info collected:', deviceInfo.deviceId);

      // CRITICAL FIX: Simplified activation request - device_info causes 500 error on server
      // The server works fine with just license_key and device_id
      const activationRequest = {
        license_key: credentials.licenseKey,
        device_id: deviceInfo.deviceId,
      };

      console.log('🔍 Activation request payload:', JSON.stringify(activationRequest, null, 2));

      // Call activation API
      let response = await this.apiClient.activateDevice(activationRequest);

      // CRITICAL FIX: Handle device ID conflict (HTTP 500 often means device already exists)
      if (response.error && response.error.includes('HTTP 500')) {
        console.log(
          '🔄 SubscriptionService: Device activation failed (possibly device ID conflict), retrying with new device ID...'
        );

        // Get fresh device info with unique ID
        const newDeviceInfo = await this.deviceManager.getUniqueDeviceInfo();
        console.log('🔧 New device info generated:', newDeviceInfo.deviceId);

        // Retry activation with new device ID
        const retryRequest = {
          license_key: credentials.licenseKey,
          device_id: newDeviceInfo.deviceId,
        };

        console.log('🔄 Retrying activation with new device ID...');
        response = await this.apiClient.activateDevice(retryRequest);

        // Update deviceInfo reference for the rest of the method
        if (response.token && response.subscription) {
          deviceInfo = newDeviceInfo;
        }
      }
      if (response.token && response.subscription) {
        console.log('✅ SubscriptionService: Activation successful');
        // Create subscription object from server response
        const subscription = subscription_types_1.Subscription.create({
          licenseKey: credentials.licenseKey || '',
          email: '', // Server doesn't use email for activation
          tier: subscription_types_1.SubscriptionTier.fromString(response.subscription.tier),
          status: subscription_types_1.SubscriptionStatus.fromString(response.subscription.status),
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
        console.log('💾 SubscriptionService: Storing subscription with status:', subscription.status.toString());
        await this.secureStorage.storeSubscription(subscription);

        // Verify storage worked
        const storedSubscription = await this.secureStorage.getSubscription();
        console.log('✅ SubscriptionService: Verified stored subscription:', {
          found: !!storedSubscription,
          status: storedSubscription?.status?.toString(),
          deviceId: storedSubscription?.deviceId,
        });

        // SUCCESS: Device activated successfully - skip immediate sync to avoid timing issues
        console.log('✅ SubscriptionService: Device activated successfully with server');
        console.log('🔄 SubscriptionService: Background sync will validate device later to avoid timing issues');

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
  async validateOnStartup() {
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
        subscriptionStatus: subscription.status.toString(), // CRITICAL FIX: Add missing subscriptionStatus field
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
  async performSync() {
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
      // Prepare sync request with correct field names for server
      const syncRequest = {
        license_key: subscription.licenseKey,
        device_id: subscription.deviceId,
        ...(subscription.signedToken && { token: subscription.signedToken }),
      };
      // Call sync API
      const response = await this.apiClient.syncSubscription(syncRequest);
      console.log('🔄 SubscriptionService: API response:', response);

      // CRITICAL FIX: Handle different server response formats
      // Server can return either:
      // 1. Success response: { success: true, subscriptionTier, expiresAt, ... }
      // 2. Validation response: { valid: true/false, reason, message, ... }

      // Check for successful sync with updated subscription data
      if (response.success && response.subscriptionTier && response.expiresAt) {
        console.log('✅ SubscriptionService: Sync successful - subscription updated');
        // Update subscription with new data
        const updatedData = subscription.toData();
        updatedData.tier = subscription_types_1.SubscriptionTier.fromString(response.subscriptionTier);
        updatedData.expiresAt = new Date(response.expiresAt);
        updatedData.features = response.features || updatedData.features;
        updatedData.gracePeriodDays = response.gracePeriodDays || updatedData.gracePeriodDays;

        if (response.status) {
          console.log('🔄 SubscriptionService: Updating subscription status from server:', response.status);
          updatedData.status = subscription_types_1.SubscriptionStatus.fromString(response.status);
        }

        if (response.signedToken) {
          updatedData.signedToken = response.signedToken;
        }

        const updatedSubscription = subscription_types_1.Subscription.fromData(updatedData);
        await this.secureStorage.storeSubscription(updatedSubscription);

        return {
          success: true,
          updated: true,
          subscription: updatedSubscription,
        };
      }

      // Check for validation response format
      else if (typeof response.valid === 'boolean') {
        if (response.valid === true) {
          console.log('✅ SubscriptionService: License validation successful - no updates needed');
          // License is valid but no updates provided - keep existing data
          return {
            success: true,
            updated: false,
            subscription,
          };
        } else {
          // CRITICAL FIX: Handle explicit validation failures
          const reason = response.reason || 'unknown';
          console.log('❌ SubscriptionService: License validation failed:', reason);

          if (reason === 'invalid_license' || reason === 'license_not_found') {
            // Server explicitly says license is invalid - clear local data
            console.log('🗑️ SubscriptionService: Invalid license detected - clearing local subscription data');
            await this.secureStorage.clearSubscriptionData();

            return {
              success: false,
              updated: false,
              error: `License validation failed: ${response.message || reason}`,
              shouldClearData: true, // Indicate data was cleared
            };
          } else if (
            reason === 'suspended' ||
            reason === 'cancelled' ||
            reason === 'expired' ||
            reason === 'inactive'
          ) {
            // CRITICAL FIX: For suspended/cancelled/expired/inactive licenses - update status but preserve data
            console.log(`🔄 SubscriptionService: License is ${reason} - updating local status but preserving data`);

            const updatedData = subscription.toData();
            // Map server reasons to our status enum
            if (reason === 'inactive') {
              updatedData.status = subscription_types_1.SubscriptionStatus.fromString('suspended'); // Treat inactive as suspended for user experience
            } else {
              updatedData.status = subscription_types_1.SubscriptionStatus.fromString(reason);
            }

            // Update other fields if provided by server response
            if (response.expires_at) {
              updatedData.expiresAt = new Date(response.expires_at);
            }
            if (response.days_until_expiry !== undefined) {
              // Calculate new expiry date if days provided
              const newExpiryDate = new Date();
              newExpiryDate.setDate(newExpiryDate.getDate() + response.days_until_expiry);
              updatedData.expiresAt = newExpiryDate;
            }

            const updatedSubscription = subscription_types_1.Subscription.fromData(updatedData);
            await this.secureStorage.storeSubscription(updatedSubscription);

            console.log(`✅ SubscriptionService: Successfully updated subscription status to ${reason}`);
            return {
              success: true, // CRITICAL: Return success so UI updates
              updated: true, // CRITICAL: Indicate data was updated
              subscription: updatedSubscription,
            };
          } else if (reason === 'device_not_activated') {
            // SPECIAL CASE: Device not activated on server - could be timing issue after activation
            console.log('⚠️ SubscriptionService: Device not activated on server - this may be a timing issue');
            return {
              success: false,
              updated: false,
              error: response.message || reason,
              isTemporary: true, // Indicate this might resolve with time
            };
          } else {
            // Other validation failures - preserve local data without updates
            console.log('⚠️ SubscriptionService: License validation failed but preserving local data:', reason);
            return {
              success: false,
              updated: false,
              error: response.message || reason,
            };
          }
        }
      }

      // Fallback for other response formats
      else {
        console.log('❌ SubscriptionService: Unexpected sync response format');
        return {
          success: false,
          updated: false,
          error: response.error || response.message || 'Sync failed',
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
  async checkFeatureAccess(featureId) {
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
  async getCurrentState() {
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
        subscriptionStatus: subscription.status.toString(), // CRITICAL FIX: Missing field was causing UI not to show suspension status
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
  async needsActivation() {
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
  async resetSubscription() {
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
  async getDeviceDescription() {
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
  async getExpiryWarning() {
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
exports.SubscriptionService = SubscriptionService;
