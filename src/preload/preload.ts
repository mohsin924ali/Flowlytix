/**
 * Electron Preload Script
 *
 * This script runs in the renderer process before the web page is loaded.
 * It safely exposes Electron APIs to the renderer process through the contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

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
};

// Type definitions for the exposed API
export type ElectronAPI = typeof electronAPI;

// Safely expose the API to the renderer process
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  } catch (error) {
    console.error('Failed to expose electronAPI:', error);
  }
} else {
  // Fallback for non-context-isolated environments (not recommended)
  (window as any).electronAPI = electronAPI;
}

// Add type declarations for global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
