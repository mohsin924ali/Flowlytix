/**
 * Background Sync Service
 * Handles periodic online validation with subscription server
 * Part of the 5-step subscription flow - Step 3: Periodic Sync (Online)
 */

import { ipcMain } from 'electron';
import { DeviceManager } from './DeviceManager.js';
import { SubscriptionApiClient } from './SubscriptionApiClient.js';
import { SecureStorage } from './SecureStorage.js';

export interface SyncResult {
  success: boolean;
  lastSyncAt: Date;
  nextSyncAt: Date;
  subscription?: any;
  error?: string;
}

export interface SyncSchedule {
  interval: number; // milliseconds
  retryInterval: number; // milliseconds for retries
  maxRetries: number;
  backoffMultiplier: number;
}

export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private deviceManager: DeviceManager;
  private apiClient: SubscriptionApiClient;
  private secureStorage: SecureStorage;

  // Sync scheduling
  private syncTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private currentRetries = 0;

  // Default sync schedule
  private defaultSchedule: SyncSchedule = {
    interval: 24 * 60 * 60 * 1000, // 24 hours
    retryInterval: 60 * 1000, // 1 minute
    maxRetries: 5,
    backoffMultiplier: 2,
  };

  private constructor() {
    this.deviceManager = DeviceManager.getInstance();
    this.apiClient = SubscriptionApiClient.getInstance();
    this.secureStorage = SecureStorage.getInstance();
    this.setupIpcHandlers();
  }

  public static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  /**
   * Start background sync service
   */
  public async startSyncService(schedule?: Partial<SyncSchedule>): Promise<void> {
    const config = { ...this.defaultSchedule, ...schedule };

    console.log('🔄 BackgroundSync: Starting sync service with schedule:', config);

    // Stop any existing timers
    this.stopSyncService();

    // Perform initial sync
    await this.performSync();

    // Schedule regular syncs
    this.scheduleSyncTimer(config.interval);
  }

  /**
   * Stop background sync service
   */
  public stopSyncService(): void {
    console.log('⏹️ BackgroundSync: Stopping sync service');

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.currentRetries = 0;
  }

  /**
   * Perform immediate sync with server
   */
  public async performSync(forceSync = false): Promise<SyncResult> {
    console.log('🌐 BackgroundSync: Starting sync operation...');

    try {
      // Check if subscription is activated
      const isActivated = await this.secureStorage.getSubscriptionData('isActivated');
      if (!isActivated && !forceSync) {
        console.log('⚠️ BackgroundSync: Subscription not activated, skipping sync');
        return {
          success: false,
          lastSyncAt: new Date(),
          nextSyncAt: this.getNextSyncTime(),
          error: 'Subscription not activated',
        };
      }

      // Get stored subscription token
      const subscriptionToken = await this.secureStorage.getSubscriptionData('subscriptionToken');
      if (!subscriptionToken && !forceSync) {
        console.log('⚠️ BackgroundSync: No subscription token found');
        return {
          success: false,
          lastSyncAt: new Date(),
          nextSyncAt: this.getNextSyncTime(),
          error: 'No subscription token',
        };
      }

      // Get device info
      const deviceInfo = await this.deviceManager.getDeviceInfo();

      // Call validation API
      const validationResult = await this.apiClient.validateLicense(subscriptionToken, deviceInfo.deviceId);

      if (validationResult.success && validationResult.data?.valid) {
        console.log('✅ BackgroundSync: License validation successful');

        // Update subscription data based on server response
        const serverData = validationResult.data;
        if (serverData.subscription_tier) {
          await this.secureStorage.setSubscriptionData('subscriptionTier', serverData.subscription_tier);
        }
        if (serverData.expires_at) {
          await this.secureStorage.setSubscriptionData('expiresAt', serverData.expires_at);
        }
        if (serverData.features) {
          await this.secureStorage.setSubscriptionData('features', serverData.features);
        }
        if (typeof serverData.days_remaining === 'number') {
          await this.secureStorage.setSubscriptionData('daysRemaining', serverData.days_remaining);
        }
        if (typeof serverData.is_in_grace_period === 'boolean') {
          await this.secureStorage.setSubscriptionData('isInGracePeriod', serverData.is_in_grace_period);
        }

        await this.secureStorage.setSubscriptionData('lastValidatedAt', new Date().toISOString());
        await this.secureStorage.setSubscriptionData('needsOnlineValidation', false);
      } else {
        console.log('❌ BackgroundSync: License validation failed');

        // Check if we're in grace period
        const daysRemaining = await this.secureStorage.getSubscriptionData('daysRemaining');
        const gracePeriodDays = await this.secureStorage.getSubscriptionData('gracePeriodDays');

        if (daysRemaining <= 0 && gracePeriodDays > 0) {
          // Enter grace period
          await this.secureStorage.setSubscriptionData('isInGracePeriod', true);
        } else if (daysRemaining <= -gracePeriodDays) {
          // Grace period expired
          await this.secureStorage.setSubscriptionData('isActivated', false);
        }

        // Clear subscription data if validation completely failed
        await this.secureStorage.clearSubscriptionData();
      }

      // Reset retry count on success
      this.currentRetries = 0;

      return {
        success: true,
        lastSyncAt: new Date(),
        nextSyncAt: this.getNextSyncTime(),
        subscription: validationResult.data,
      };
    } catch (error) {
      console.error('❌ BackgroundSync: Sync failed with error:', error);

      // Schedule retry if not at max retries
      await this.handleSyncError(error as Error);

      return {
        success: false,
        lastSyncAt: new Date(),
        nextSyncAt: this.getNextSyncTime(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle sync error and schedule retry if appropriate
   */
  private async handleSyncError(_error: Error): Promise<void> {
    this.currentRetries++;

    if (this.currentRetries <= this.defaultSchedule.maxRetries) {
      const retryDelay =
        this.defaultSchedule.retryInterval * Math.pow(this.defaultSchedule.backoffMultiplier, this.currentRetries - 1);

      console.log(
        `⏰ BackgroundSync: Scheduling retry ${this.currentRetries}/${this.defaultSchedule.maxRetries} in ${retryDelay}ms`
      );

      this.retryTimer = setTimeout(() => {
        this.performSync();
      }, retryDelay);
    } else {
      console.log('🚫 BackgroundSync: Max retries reached, marking as needing online validation');
      await this.secureStorage.setSubscriptionData('needsOnlineValidation', true);
      this.currentRetries = 0;
    }
  }

  /**
   * Schedule next sync timer
   */
  private scheduleSyncTimer(interval: number): void {
    this.syncTimer = setTimeout(() => {
      this.performSync().then(() => {
        // Schedule next sync after completion
        this.scheduleSyncTimer(interval);
      });
    }, interval);
  }

  /**
   * Get next scheduled sync time
   */
  private getNextSyncTime(): Date {
    return new Date(Date.now() + this.defaultSchedule.interval);
  }

  /**
   * Check if sync is needed based on last sync time
   */
  public async shouldSync(): Promise<boolean> {
    try {
      const lastValidatedAt = await this.secureStorage.getSubscriptionData('lastValidatedAt');
      const needsOnlineValidation = await this.secureStorage.getSubscriptionData('needsOnlineValidation');

      if (needsOnlineValidation) {
        return true;
      }

      if (!lastValidatedAt) {
        return true;
      }

      const lastSync = new Date(lastValidatedAt);
      const timeSinceLastSync = Date.now() - lastSync.getTime();

      // Sync if more than 24 hours since last sync
      return timeSinceLastSync > this.defaultSchedule.interval;
    } catch (error) {
      console.error('❌ BackgroundSync: Error checking if sync needed:', error);
      return true; // Default to needing sync
    }
  }

  /**
   * Get sync status information
   */
  public async getSyncStatus(): Promise<{
    isRunning: boolean;
    lastSyncAt: Date | null;
    nextSyncAt: Date | null;
    needsOnlineValidation: boolean;
    retryCount: number;
  }> {
    try {
      const lastValidatedAt = await this.secureStorage.getSubscriptionData('lastValidatedAt');
      const needsOnlineValidation = (await this.secureStorage.getSubscriptionData('needsOnlineValidation')) || false;

      return {
        isRunning: this.syncTimer !== null,
        lastSyncAt: lastValidatedAt ? new Date(lastValidatedAt) : null,
        nextSyncAt: this.syncTimer ? this.getNextSyncTime() : null,
        needsOnlineValidation,
        retryCount: this.currentRetries,
      };
    } catch (error) {
      console.error('❌ BackgroundSync: Error getting sync status:', error);
      return {
        isRunning: false,
        lastSyncAt: null,
        nextSyncAt: null,
        needsOnlineValidation: true,
        retryCount: 0,
      };
    }
  }

  /**
   * Setup IPC handlers for renderer communication
   */
  private setupIpcHandlers(): void {
    // Start sync service
    ipcMain.handle('subscription:start-sync', async () => {
      try {
        await this.startSyncService();
        return { success: true };
      } catch (error) {
        console.error('IPC Error starting sync service:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Stop sync service
    ipcMain.handle('subscription:stop-sync', async () => {
      try {
        this.stopSyncService();
        return { success: true };
      } catch (error) {
        console.error('IPC Error stopping sync service:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Perform immediate sync
    ipcMain.handle('subscription:perform-sync', async () => {
      try {
        const result = await this.performSync();
        return { success: true, data: result };
      } catch (error) {
        console.error('IPC Error performing sync:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Get sync status
    ipcMain.handle('subscription:get-sync-status', async () => {
      try {
        const status = await this.getSyncStatus();
        return { success: true, data: status };
      } catch (error) {
        console.error('IPC Error getting sync status:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }
}
