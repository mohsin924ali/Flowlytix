// IMMEDIATE LOG - This should appear if preload script runs at all
console.log('🎯 PRELOAD SCRIPT EXECUTING - BEFORE IMPORTS');

/**
 * Electron Preload Script
 *
 * This script runs in the renderer process before the web page is loaded.
 * It safely exposes Electron APIs to the renderer process through the contextBridge.
 */

console.log('🚀 Preload script starting...');

import { contextBridge, ipcRenderer } from 'electron';

// Inline IPC channel constants to avoid import issues
const SUBSCRIPTION_IPC_CHANNELS = {
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

console.log('🔌 Preload: Importing dependencies completed');
console.log('🔌 Preload: SUBSCRIPTION_IPC_CHANNELS:', SUBSCRIPTION_IPC_CHANNELS);

// Define the API that will be available in the renderer process
const electronAPI = {
  // App information
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getName: () => ipcRenderer.invoke('app:getName'),
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),

  // Dialog APIs
  showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options),

  // Shell APIs
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Platform information
  platform: process.platform,

  // Development utilities
  isDevelopment: process.env.NODE_ENV === 'development',

  // Subscription Management API
  subscription: {
    // Step 1: Device Activation
    activateDevice: (credentials: any) => ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.ACTIVATE_DEVICE, credentials),

    // Step 2: Startup Validation
    validateStartup: () => ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.VALIDATE_STARTUP),

    // Step 3: Periodic Sync
    performSync: () => ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.PERFORM_SYNC),

    // Get current subscription state
    getCurrentState: () => ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.GET_CURRENT_STATE),

    // Step 5: Feature Access Control
    checkFeatureAccess: (featureId: string) =>
      ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.CHECK_FEATURE_ACCESS, featureId),

    // Step 4: Expiry Warnings
    getExpiryWarning: () => ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.GET_EXPIRY_WARNING),

    // Utility methods
    needsActivation: () => ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.NEEDS_ACTIVATION),

    resetSubscription: () => ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.RESET_SUBSCRIPTION),

    getDeviceDescription: () => ipcRenderer.invoke(SUBSCRIPTION_IPC_CHANNELS.GET_DEVICE_DESCRIPTION),
  },
};

console.log('🔌 Preload: electronAPI object created');
console.log('🔌 Preload: electronAPI.subscription exists:', !!electronAPI.subscription);
console.log(
  '🔌 Preload: electronAPI.subscription methods:',
  electronAPI.subscription ? Object.keys(electronAPI.subscription) : 'N/A'
);

// Type definitions for the exposed API
export type ElectronAPI = typeof electronAPI;

// Safely expose the API to the renderer process
console.log('🔌 Preload: About to expose electronAPI to main world');
console.log('🔌 Preload: process.contextIsolated:', process.contextIsolated);

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    console.log('✅ Preload: electronAPI exposed successfully');
    console.log('🔌 Preload: Available APIs:', Object.keys(electronAPI));
    console.log('🔌 Preload: Subscription API available:', !!electronAPI.subscription);
    console.log(
      '🔌 Preload: Subscription methods:',
      electronAPI.subscription ? Object.keys(electronAPI.subscription) : 'N/A'
    );

    // Test subscription API availability immediately
    setTimeout(() => {
      const windowElectronAPI = (window as any).electronAPI;
      console.log('🔍 Preload: Testing window.electronAPI availability...');
      console.log('🔍 Preload: window.electronAPI exists:', !!windowElectronAPI);
      console.log('🔍 Preload: window.electronAPI.subscription exists:', !!windowElectronAPI?.subscription);
      if (windowElectronAPI?.subscription) {
        console.log(
          '🔍 Preload: window.electronAPI.subscription methods:',
          Object.keys(windowElectronAPI.subscription)
        );
      }
    }, 100);
  } catch (error) {
    console.error('Failed to expose electronAPI:', error);
  }
} else {
  // Fallback for non-context-isolated environments (not recommended)
  (window as any).electronAPI = electronAPI;
  console.log('✅ Preload: electronAPI set on window (fallback mode)');
}

// Add type declarations for global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
