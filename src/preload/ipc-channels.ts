/**
 * IPC Channel Constants for Preload
 * Used by preload process to communicate with main
 */

export const SUBSCRIPTION_IPC_CHANNELS = {
  ACTIVATE_DEVICE: 'subscription:activate-device',
  VALIDATE_STARTUP: 'subscription:validate-on-startup',
  PERFORM_SYNC: 'subscription:perform-sync',
  GET_CURRENT_STATE: 'subscription:get-current-state',
  CHECK_FEATURE_ACCESS: 'subscription:check-feature-access',
  GET_EXPIRY_WARNING: 'subscription:get-expiry-warning',
  NEEDS_ACTIVATION: 'subscription:needs-activation',
  RESET_SUBSCRIPTION: 'subscription:reset-subscription',
  GET_DEVICE_DESCRIPTION: 'subscription:get-device-description',
} as const;
