"use strict";
/**
 * Shared IPC Channel Constants
 * Used by both main and preload processes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBSCRIPTION_IPC_CHANNELS = void 0;
exports.SUBSCRIPTION_IPC_CHANNELS = {
    ACTIVATE_DEVICE: 'subscription:activate-device',
    VALIDATE_STARTUP: 'subscription:validate-startup',
    PERFORM_SYNC: 'subscription:perform-sync',
    GET_CURRENT_STATE: 'subscription:get-current-state',
    CHECK_FEATURE_ACCESS: 'subscription:check-feature-access',
    GET_EXPIRY_WARNING: 'subscription:get-expiry-warning',
    NEEDS_ACTIVATION: 'subscription:needs-activation',
    RESET_SUBSCRIPTION: 'subscription:reset-subscription',
    GET_DEVICE_DESCRIPTION: 'subscription:get-device-description',
};
