/**
 * Electron Main Process
 *
 * This file serves as the entry point for the Electron application.
 * It manages the application lifecycle, creates browser windows, and handles system events.
 */

import { app, BrowserWindow, protocol } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerSubscriptionIpcHandlers } from './ipc/subscription.ipc.js';
import { BackgroundSyncService } from './services/BackgroundSyncService.js';
import { SecureStorage } from './services/SecureStorage.js';

// ES module equivalent of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register schemes before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'file',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
    },
  },
]);

class Main {
  private mainWindow: BrowserWindow | null = null;
  private isDev = !app.isPackaged;

  constructor() {
    this.isDev = !app.isPackaged;
    this.initialize();
  }

  private initialize(): void {
    // Quit when all windows are closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await this.createWindow();
      }
    });

    // App ready
    app.whenReady().then(async () => {
      await this.createWindow();
      this.setupSubscriptionSystem();
    });
  }

  private async createWindow(): Promise<void> {
    const preloadPath = join(__dirname, '../preload/preload.cjs');
    console.log('🔧 Main: Preload script path:', preloadPath);
    console.log('🔧 Main: __dirname:', __dirname);

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
      },
      show: false,
      autoHideMenuBar: !this.isDev,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    });

    // Load the app
    if (this.isDev) {
      // Try common Vite dev server ports
      const possiblePorts = [5173, 5174, 5175];
      let rendererUrl = process.env.ELECTRON_RENDERER_URL;

      if (!rendererUrl) {
        // If no explicit URL set, try to detect which port Vite is using
        for (const port of possiblePorts) {
          try {
            const testUrl = `http://localhost:${port}`;
            await new Promise((resolve, reject) => {
              const http = require('http');
              const req = http.get(testUrl, (res: any) => {
                req.destroy();
                resolve(res);
              });
              req.on('error', reject);
              req.setTimeout(1000, () => {
                req.destroy();
                reject(new Error('Timeout'));
              });
            });
            rendererUrl = testUrl;
            console.log(`🌐 Found Vite dev server at ${rendererUrl}`);
            break;
          } catch {
            // Port not available, try next
          }
        }

        if (!rendererUrl) {
          rendererUrl = 'http://localhost:5173'; // fallback
          console.log('⚠️ Could not detect Vite dev server, using fallback');
        }
      }

      this.mainWindow.loadURL(rendererUrl);
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // Add error handling for preload script
    this.mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
      console.error('❌ Main: Preload script error:', { preloadPath, error });
    });

    this.mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error('❌ Main: Failed to load page:', { errorCode, errorDescription });
    });

    // Listen for console messages from renderer
    this.mainWindow.webContents.on('console-message', (_event, level, message, _line, _sourceId) => {
      if (message.includes('Preload:') || message.includes('🔌') || message.includes('🚀') || message.includes('🎯')) {
        console.log(`📟 Renderer[${level}]: ${message}`);
      }
    });

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();

      // Initialize services after window is ready
      this.mainWindow?.webContents.once('did-finish-load', async () => {
        console.log('🚀 Main: Window loaded, initializing services...');

        // Check if electronAPI was properly exposed
        const result = await this.mainWindow?.webContents.executeJavaScript(`
                    console.log('🔍 Main: Checking electronAPI from main process...');
                    console.log('🔍 Main: window.electronAPI exists:', !!window.electronAPI);
                    if (window.electronAPI) {
                        console.log('🔍 Main: electronAPI keys:', Object.keys(window.electronAPI));
                        console.log('🔍 Main: subscription exists:', !!window.electronAPI.subscription);
                    }
                    return {
                        electronAPIExists: !!window.electronAPI,
                        hasSubscription: !!(window.electronAPI && window.electronAPI.subscription),
                        keys: window.electronAPI ? Object.keys(window.electronAPI) : []
                    };
                `);

        console.log('🔍 Main: electronAPI check result:', result);

        try {
          // Initialize subscription services
          const syncService = BackgroundSyncService.getInstance();

          // Start background sync if subscription is activated
          const secureStorage = SecureStorage.getInstance();
          const subscription = await secureStorage.getSubscription();

          if (subscription) {
            console.log('🔄 Main: Starting background sync service...');
            await syncService.startSyncService();
          }

          console.log('✅ Main: Services initialized successfully');
        } catch (error) {
          console.error('❌ Main: Error initializing services:', error);
        }
      });
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupSubscriptionSystem(): void {
    console.log('🔧 Main: Setting up subscription system...');

    try {
      // Initialize subscription IPC handlers
      registerSubscriptionIpcHandlers();

      console.log('✅ Main: Subscription system initialized');
    } catch (error) {
      console.error('❌ Main: Error setting up subscription system:', error);
    }
  }
}

// Initialize the main process
new Main();
