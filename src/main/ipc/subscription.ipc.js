"use strict";
/**
 * Subscription IPC Handlers
 * Handles communication between renderer and main process for subscription operations
 * Following Instructions standards for IPC communication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSubscriptionIpcHandlers = registerSubscriptionIpcHandlers;
const electron_1 = require("electron");
const SubscriptionService_1 = require("../services/SubscriptionService");
/**
 * Register all subscription-related IPC handlers
 */
function registerSubscriptionIpcHandlers() {
    const subscriptionService = SubscriptionService_1.SubscriptionService.getInstance();
    console.log('🔌 Registering subscription IPC handlers...');
    /**
     * Handle device activation
     */
    electron_1.ipcMain.handle('subscription:activate-device', async (_event, credentials) => {
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
            }
            else {
                return {
                    success: false,
                    error: result.error || 'Activation failed',
                };
            }
        }
        catch (error) {
            console.error('❌ IPC: Device activation error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });
    /**
     * Handle needs activation check
     */
    electron_1.ipcMain.handle('subscription:needs-activation', async () => {
        try {
            console.log('🔍 IPC: Checking if device needs activation...');
            const needsActivation = await subscriptionService.needsActivation();
            return {
                success: true,
                data: needsActivation,
            };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('subscription:get-current-state', async () => {
        try {
            console.log('📊 IPC: Getting current subscription state...');
            const state = await subscriptionService.getCurrentState();
            return {
                success: true,
                data: state,
            };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('subscription:validate-on-startup', async () => {
        try {
            console.log('🌐 IPC: Performing startup validation...');
            const state = await subscriptionService.validateOnStartup();
            return {
                success: true,
                data: state,
            };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('subscription:perform-sync', async () => {
        try {
            console.log('🔄 IPC: Performing periodic sync...');
            const result = await subscriptionService.performSync();
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            console.error('❌ IPC: Periodic sync error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });
    /**
     * Handle feature access check
     */
    electron_1.ipcMain.handle('subscription:check-feature-access', async (_event, featureId) => {
        try {
            console.log('🔑 IPC: Checking feature access for:', featureId);
            const result = await subscriptionService.checkFeatureAccess(featureId);
            return {
                hasAccess: result.hasAccess,
                isBlocked: result.isBlocked,
                ...(result.blockingReason && { blockingReason: result.blockingReason }),
            };
        }
        catch (error) {
            console.error('❌ IPC: Feature access check error:', error);
            return {
                hasAccess: false,
                isBlocked: true,
                blockingReason: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });
    /**
     * Handle expiry warning retrieval
     */
    electron_1.ipcMain.handle('subscription:get-expiry-warning', async () => {
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
        }
        catch (error) {
            console.error('❌ IPC: Get expiry warning error:', error);
            return null;
        }
    });
    /**
     * Handle subscription reset (for testing)
     */
    electron_1.ipcMain.handle('subscription:reset', async () => {
        try {
            console.log('🗑 IPC: Resetting subscription...');
            const success = await subscriptionService.resetSubscription();
            return {
                success,
                data: success,
            };
        }
        catch (error) {
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
    electron_1.ipcMain.handle('subscription:get-device-description', async () => {
        try {
            console.log('📱 IPC: Getting device description...');
            const description = await subscriptionService.getDeviceDescription();
            return {
                success: true,
                data: description,
            };
        }
        catch (error) {
            console.error('❌ IPC: Get device description error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });
    console.log('✅ Subscription IPC handlers registered successfully');
}
