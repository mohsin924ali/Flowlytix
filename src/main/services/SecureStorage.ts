/**
 * Secure Storage Service
 * Handles secure storage of subscription tokens and sensitive data
 * Following Instructions standards with Electron's safeStorage API
 */

import { safeStorage, app } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  Subscription,
  SubscriptionData,
  SubscriptionStatus,
  SubscriptionTier,
  Platform,
} from '../shared/subscription.types.js';

export interface StoredSubscriptionData {
  subscription: SubscriptionData;
  encryptedToken: string | null;
  lastStoredAt: string;
}

export class SecureStorage {
  private static instance: SecureStorage | null = null;
  private readonly storageDir: string;
  private readonly subscriptionFile: string;

  private constructor() {
    this.storageDir = join(app.getPath('userData'), 'subscription');
    this.subscriptionFile = join(this.storageDir, 'subscription.json');
  }

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * Step 1: First Install/Activation - Store activation data
   */
  async storeSubscription(subscription: Subscription): Promise<void> {
    await this.ensureStorageDir();

    const encryptedToken = subscription.signedToken ? this.encryptToken(subscription.signedToken) : null;

    const subscriptionData = subscription.toData();

    // Convert complex objects to serializable format
    const serializableData = {
      ...subscriptionData,
      status: subscriptionData.status.toString(),
      tier: subscriptionData.tier.toString(),
      deviceInfo: {
        ...subscriptionData.deviceInfo,
        platform: subscriptionData.deviceInfo.platform.toString(),
      },
      signedToken: null, // Remove the plain text token before storing
    };

    // Convert Buffer to base64 string for JSON storage
    const encryptedTokenString = encryptedToken ? encryptedToken.toString('base64') : null;

    const storedData = {
      subscription: serializableData as any,
      encryptedToken: encryptedTokenString,
      lastStoredAt: new Date().toISOString(),
    };

    console.log('💾 SecureStorage: Storing subscription data:', {
      status: serializableData.status,
      tier: serializableData.tier,
      deviceId: serializableData.deviceId,
      hasEncryptedToken: !!encryptedTokenString,
    });

    await fs.writeFile(this.subscriptionFile, JSON.stringify(storedData, null, 2), 'utf8');
  }

  /**
   * Step 2: Normal Daily Use - Retrieve stored subscription
   */
  async getSubscription(): Promise<Subscription | null> {
    try {
      const data = await fs.readFile(this.subscriptionFile, 'utf8');
      const storedData: StoredSubscriptionData = JSON.parse(data);

      // Decrypt the token if it exists
      let decryptedToken: string | null = null;
      if (storedData.encryptedToken) {
        // Convert base64 string back to Buffer
        const encryptedTokenBuffer = Buffer.from(storedData.encryptedToken, 'base64');
        decryptedToken = this.decryptToken(encryptedTokenBuffer);
      }

      // Restore the token to the subscription data
      const subscriptionData = {
        ...storedData.subscription,
        signedToken: decryptedToken,
      };

      // Convert dates back to Date objects
      subscriptionData.startsAt = new Date(subscriptionData.startsAt);
      subscriptionData.expiresAt = new Date(subscriptionData.expiresAt);
      subscriptionData.createdAt = new Date(subscriptionData.createdAt);
      subscriptionData.updatedAt = subscriptionData.updatedAt ? new Date(subscriptionData.updatedAt) : null;
      subscriptionData.lastValidatedAt = subscriptionData.lastValidatedAt
        ? new Date(subscriptionData.lastValidatedAt)
        : null;

      // Reconstruct complex objects from serialized strings
      subscriptionData.status = SubscriptionStatus.fromString(subscriptionData.status as any);
      subscriptionData.tier = SubscriptionTier.fromString(subscriptionData.tier as any);
      subscriptionData.deviceInfo = {
        ...subscriptionData.deviceInfo,
        platform: subscriptionData.deviceInfo.platform as Platform,
        registeredAt: new Date(subscriptionData.deviceInfo.registeredAt),
      };

      console.log('🔍 SecureStorage: Retrieved subscription data:', {
        status: subscriptionData.status?.toString(),
        tier: subscriptionData.tier?.toString(),
        deviceId: subscriptionData.deviceId,
      });

      return Subscription.fromData(subscriptionData);
    } catch (error) {
      // Handle missing file case gracefully (expected when not activated)
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.log('🔍 SecureStorage: No subscription file found (device not activated)');
      } else {
        console.error('❌ SecureStorage: Failed to retrieve subscription:', error);
      }
      // File doesn't exist or is corrupted
      return null;
    }
  }

  /**
   * Step 3: Token Refresh - Update stored token
   */
  async updateToken(deviceId: string, newToken: string): Promise<void> {
    const subscription = await this.getSubscription();
    if (!subscription || subscription.deviceId !== deviceId) {
      throw new Error('Subscription not found for device');
    }

    const updatedSubscription = subscription.updateToken(newToken);
    await this.storeSubscription(updatedSubscription);
  }

  /**
   * Step 3: Periodic Sync - Mark as validated
   */
  async markAsValidated(deviceId: string): Promise<void> {
    const subscription = await this.getSubscription();
    if (!subscription || subscription.deviceId !== deviceId) {
      throw new Error('Subscription not found for device');
    }

    const updatedSubscription = subscription.markAsValidated();
    await this.storeSubscription(updatedSubscription);
  }

  /**
   * Check if subscription exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.subscriptionFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove stored subscription (for testing/cleanup)
   */
  async removeSubscription(): Promise<void> {
    try {
      await fs.unlink(this.subscriptionFile);
    } catch {
      // File doesn't exist, ignore
    }
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<{ exists: boolean; lastStoredAt: string | null }> {
    try {
      const data = await fs.readFile(this.subscriptionFile, 'utf8');
      const storedData: StoredSubscriptionData = JSON.parse(data);
      return {
        exists: true,
        lastStoredAt: storedData.lastStoredAt,
      };
    } catch {
      return {
        exists: false,
        lastStoredAt: null,
      };
    }
  }

  /**
   * Get specific subscription data field
   */
  async getSubscriptionData(field: string): Promise<any> {
    const subscription = await this.getSubscription();
    if (!subscription) {
      return null;
    }

    const data = subscription.toData();
    switch (field) {
      case 'isActivated':
        return true; // If subscription exists, it's activated
      case 'subscriptionTier':
        return data.tier;
      case 'expiresAt':
        return data.expiresAt.toISOString();
      case 'features':
        return data.features;
      case 'daysRemaining':
        return subscription.getDaysRemaining();
      case 'isInGracePeriod':
        return subscription.isInGracePeriod();
      case 'lastValidatedAt':
        return data.lastValidatedAt ? data.lastValidatedAt.toISOString() : null;
      case 'needsOnlineValidation':
        return subscription.needsValidation();
      case 'subscriptionToken':
        return data.signedToken;
      case 'deviceId':
        return data.deviceId;
      case 'gracePeriodDays':
        return data.gracePeriodDays;
      default:
        return (data as any)[field];
    }
  }

  /**
   * Set specific subscription data field
   */
  async setSubscriptionData(field: string, value: any): Promise<void> {
    const subscription = await this.getSubscription();
    if (!subscription) {
      throw new Error('No subscription found to update');
    }

    const data = subscription.toData();

    // Update the field
    switch (field) {
      case 'subscriptionTier':
        data.tier = value;
        break;
      case 'expiresAt':
        data.expiresAt = new Date(value);
        break;
      case 'features':
        data.features = value;
        break;
      case 'lastValidatedAt':
        data.lastValidatedAt = value ? new Date(value) : null;
        break;
      case 'subscriptionToken':
        data.signedToken = value;
        break;
      case 'isActivated':
        // For deactivation, we remove the subscription
        if (!value) {
          await this.removeSubscription();
          return;
        }
        break;
      case 'isInGracePeriod':
        // This is computed, can't be set directly
        break;
      case 'needsOnlineValidation':
        // This is computed, can't be set directly
        break;
      default:
        (data as any)[field] = value;
    }

    // Create updated subscription and store it
    const updatedSubscription = Subscription.fromData(data);
    await this.storeSubscription(updatedSubscription);
  }

  /**
   * Clear all subscription data
   */
  async clearSubscriptionData(): Promise<void> {
    await this.removeSubscription();
  }

  /**
   * Helper: Encrypt token using Electron's safeStorage
   */
  private encryptToken(token: string): Buffer {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }
    return safeStorage.encryptString(token);
  }

  /**
   * Helper: Decrypt token using Electron's safeStorage
   */
  private decryptToken(encryptedToken: Buffer): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }
    return safeStorage.decryptString(encryptedToken);
  }

  /**
   * Helper: Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore
    }
  }

  /**
   * Check if encryption is available
   */
  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }
}
