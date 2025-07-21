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

    // Disable hardware acceleration on Windows if needed
    if (process.platform === 'win32') {
      console.log('🔧 Main: Windows detected - disabling hardware acceleration for compatibility');
      app.disableHardwareAcceleration();
    }

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
    try {
      const preloadPath = join(__dirname, '../preload/preload.cjs');
      console.log('🔧 Main: Preload script path:', preloadPath);
      console.log('🔧 Main: __dirname:', __dirname);
      console.log('🔧 Main: Platform:', process.platform);

      // Simplified window options for better compatibility
      const windowOptions = {
        width: 1200,
        height: 800,
        x: 100,
        y: 100,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: preloadPath,
          webSecurity: false,
          allowRunningInsecureContent: true,
          sandbox: false,
        },
        show: false, // Start hidden, then force show
        center: true,
        backgroundColor: '#667eea',
        autoHideMenuBar: true,
        frame: true,
        ...(process.platform === 'win32' && {
          // Windows-specific options
          skipTaskbar: false,
          minimizable: true,
          maximizable: true,
          resizable: true,
        }),
      };

      console.log('🔧 Main: Creating window with options:', JSON.stringify(windowOptions, null, 2));

      this.mainWindow = new BrowserWindow(windowOptions);

      console.log('🔧 Main: Window created successfully');
      console.log('🔧 Main: Window bounds:', this.mainWindow.getBounds());
      console.log('🔧 Main: Window visible:', this.mainWindow.isVisible());
      console.log('🔧 Main: Window minimized:', this.mainWindow.isMinimized());
      console.log('🔧 Main: Window maximized:', this.mainWindow.isMaximized());
    } catch (error) {
      console.error('❌ Main: Error creating window:', error);
      throw error;
    }

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
      const htmlPath = join(__dirname, '../index.html');
      console.log('🔧 Main: Loading HTML file from:', htmlPath);
      console.log('🔧 Main: __dirname is:', __dirname);
      console.log('🔧 Main: Checking if HTML file exists...');

      // Add file existence check
      const fs = require('fs');
      const path = require('path');

      if (fs.existsSync(htmlPath)) {
        console.log('✅ Main: HTML file exists at:', htmlPath);
        console.log('🔧 Main: File size:', fs.statSync(htmlPath).size, 'bytes');
      } else {
        console.error('❌ Main: HTML file NOT found at:', htmlPath);
        console.log('🔧 Main: Available files in parent dir:', fs.readdirSync(path.dirname(htmlPath)));
      }

      this.mainWindow.loadFile(htmlPath).catch((error) => {
        console.error('❌ Main: Failed to load HTML file:', error);
        // Create a simple fallback HTML
        this.createFallbackContent();
      });
    }

    // Add comprehensive error handling
    this.mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
      console.error('❌ Main: Preload script error:', { preloadPath, error });
    });

    this.mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error('❌ Main: Failed to load page:', { errorCode, errorDescription, validatedURL });
      this.createFallbackContent();
    });

    this.mainWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error('❌ Main: Renderer process gone:', details);
    });

    this.mainWindow.on('unresponsive', () => {
      console.error('❌ Main: Window became unresponsive');
    });

    this.mainWindow.webContents.on('dom-ready', () => {
      console.log('✅ Main: DOM is ready');
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('✅ Main: Page finished loading');
    });

    this.mainWindow.webContents.on('did-start-loading', () => {
      console.log('🔄 Main: Page started loading');
    });

    this.mainWindow.webContents.on('did-stop-loading', () => {
      console.log('🔄 Main: Page stopped loading');
    });

    // Listen for console messages from renderer
    this.mainWindow.webContents.on('console-message', (_event, level, message, _line, _sourceId) => {
      if (message.includes('Preload:') || message.includes('🔌') || message.includes('🚀') || message.includes('🎯')) {
        console.log(`📟 Renderer[${level}]: ${message}`);
      }
    });

    // Force window to show immediately and set up fallbacks
    this.mainWindow.show();
    this.mainWindow.focus();
    this.mainWindow.moveTop();

    console.log('🔧 Main: Forced window to show and focus');

    // Additional fallback - show window after 2 seconds regardless
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        console.log('🔧 Main: 2-second fallback - forcing window visible');
        this.mainWindow.show();
        this.mainWindow.focus();
        this.mainWindow.center();
        console.log('🔧 Main: Window state after fallback:', {
          visible: this.mainWindow.isVisible(),
          minimized: this.mainWindow.isMinimized(),
          bounds: this.mainWindow.getBounds(),
        });
      }
    }, 2000);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      console.log('🔧 Main: ready-to-show event fired');
      this.mainWindow?.show();
      this.mainWindow?.focus();

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

  private createFallbackContent(): void {
    if (!this.mainWindow) return;

    console.log('🔧 Main: Creating fallback content');
    const fallbackHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Flowlytix - Loading Issue</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .container {
            text-align: center;
            max-width: 600px;
          }
          h1 { font-size: 2em; margin-bottom: 20px; }
          p { font-size: 1.2em; line-height: 1.6; margin: 10px 0; }
          .error { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 20px 0; }
          button {
            background: white;
            color: #667eea;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 1em;
            cursor: pointer;
            margin: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Flowlytix Distribution System</h1>
          <div class="error">
            <p><strong>Loading Issue Detected</strong></p>
            <p>The application encountered an issue loading the main interface.</p>
            <p>This is typically a temporary issue that can be resolved by:</p>
            <ul style="text-align: left;">
              <li>Restarting the application</li>
              <li>Running as administrator (if on Windows)</li>
              <li>Checking firewall/antivirus settings</li>
            </ul>
          </div>
          <button onclick="location.reload()">Reload Application</button>
          <button onclick="require('electron').remote.app.quit()">Exit</button>
        </div>
      </body>
      </html>
    `;

    this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHTML)}`);
  }
}

// Initialize the main process
new Main();
