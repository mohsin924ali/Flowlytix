/**
 * Subscription IPC Handlers
 * Handles communication between renderer and main process for subscription operations
 * Following Instructions standards for IPC communication
 */

import { ipcMain } from 'electron';
import { SubscriptionService, ActivationCredentials, ValidationResult } from '../services/SubscriptionService.js';

export interface ActivationResponse {
  success: boolean;
  subscription?: {
    tier: string;
    expiresAt: string;
    deviceId: string;
    gracePeriodDays: number;
  };
  error?: string;
}

export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FeatureAccessResponse {
  hasAccess: boolean;
  isBlocked: boolean;
  blockingReason?: string;
}

export interface ExpiryWarningResponse {
  shouldShow: boolean;
  type: 'approaching' | 'grace_period' | 'expired';
  daysRemaining: number;
  message: string;
}

/**
 * Register all subscription-related IPC handlers
 */
export function registerSubscriptionIpcHandlers(): void {
  const subscriptionService = SubscriptionService.getInstance();

  console.log('🔌 Registering subscription IPC handlers...');

  /**
   * Handle device activation
   */
  ipcMain.handle(
    'subscription:activate-device',
    async (_event, credentials: ActivationCredentials): Promise<ActivationResponse> => {
      try {
        console.log('🛠 IPC: Handling device activation...');

        const result = await subscriptionService.activateDevice(credentials);

        if (result.success && result.subscription) {
          return {
            success: true,
            subscription: {
              tier: result.subscription.tier.toString(),
              expiresAt: result.subscription.expiresAt.toISOString(),
              deviceId: result.subscription.deviceId,
              gracePeriodDays: result.subscription.gracePeriodDays,
            },
          };
        } else {
          return {
            success: false,
            error: result.error || 'Activation failed',
          };
        }
      } catch (error) {
        console.error('❌ IPC: Device activation error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  /**
   * Handle needs activation check
   */
  ipcMain.handle('subscription:needs-activation', async (): Promise<IpcResponse<boolean>> => {
    try {
      console.log('🔍 IPC: Checking if device needs activation...');

      const needsActivation = await subscriptionService.needsActivation();

      return {
        success: true,
        data: needsActivation,
      };
    } catch (error) {
      console.error('❌ IPC: Needs activation check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  /**
   * Handle current state retrieval
   */
  ipcMain.handle('subscription:get-current-state', async (): Promise<IpcResponse<ValidationResult>> => {
    try {
      console.log('📊 IPC: Getting current subscription state...');

      const state = await subscriptionService.getCurrentState();

      return {
        success: true,
        data: state,
      };
    } catch (error) {
      console.error('❌ IPC: Get current state error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  /**
   * Handle startup validation
   */
  ipcMain.handle('subscription:validate-on-startup', async (): Promise<IpcResponse<ValidationResult>> => {
    try {
      console.log('🌐 IPC: Performing startup validation...');

      const state = await subscriptionService.validateOnStartup();

      return {
        success: true,
        data: state,
      };
    } catch (error) {
      console.error('❌ IPC: Startup validation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  /**
   * Handle periodic sync
   */
  ipcMain.handle(
    'subscription:perform-sync',
    async (): Promise<IpcResponse<{ success: boolean; updated: boolean; error?: string }>> => {
      try {
        console.log('🔄 IPC: Performing periodic sync...');

        const result = await subscriptionService.performSync();

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error('❌ IPC: Periodic sync error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  /**
   * Handle feature access check
   */
  ipcMain.handle(
    'subscription:check-feature-access',
    async (_event, featureId: string): Promise<FeatureAccessResponse> => {
      try {
        console.log('🔑 IPC: Checking feature access for:', featureId);

        const result = await subscriptionService.checkFeatureAccess(featureId);

        return {
          hasAccess: result.hasAccess,
          isBlocked: result.isBlocked,
          ...(result.blockingReason && { blockingReason: result.blockingReason }),
        };
      } catch (error) {
        console.error('❌ IPC: Feature access check error:', error);
        return {
          hasAccess: false,
          isBlocked: true,
          blockingReason: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  /**
   * Handle expiry warning retrieval
   */
  ipcMain.handle('subscription:get-expiry-warning', async (): Promise<ExpiryWarningResponse | null> => {
    try {
      console.log('⚠️ IPC: Getting expiry warning...');

      const warning = await subscriptionService.getExpiryWarning();

      if (warning) {
        return {
          shouldShow: warning.shouldShow,
          type: warning.type,
          daysRemaining: warning.daysRemaining,
          message: warning.message,
        };
      }

      return null;
    } catch (error) {
      console.error('❌ IPC: Get expiry warning error:', error);
      return null;
    }
  });

  /**
   * Handle subscription reset (for testing)
   */
  ipcMain.handle('subscription:reset-subscription', async (): Promise<IpcResponse<boolean>> => {
    try {
      console.log('🗑 IPC: Resetting subscription...');

      const success = await subscriptionService.resetSubscription();

      return {
        success,
        data: success,
      };
    } catch (error) {
      console.error('❌ IPC: Reset subscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  /**
   * Handle device description retrieval
   */
  ipcMain.handle('subscription:get-device-description', async (): Promise<IpcResponse<string>> => {
    try {
      console.log('📱 IPC: Getting device description...');

      const description = await subscriptionService.getDeviceDescription();

      return {
        success: true,
        data: description,
      };
    } catch (error) {
      console.error('❌ IPC: Get device description error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  console.log('✅ Subscription IPC handlers registered successfully');
}
