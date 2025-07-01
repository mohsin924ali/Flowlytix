/**
 * Electron Main Process
 *
 * This file serves as the entry point for the Electron application.
 * It manages the application lifecycle, creates browser windows, and handles system events.
 */

import { app, BrowserWindow, shell, ipcMain, Menu, dialog } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDevelopment = process.env.NODE_ENV === 'development';

// Disable security warnings in development
if (isDevelopment) {
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}

class FlowlytixApp {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.initializeApp();
  }

  private initializeApp(): void {
    // App event listeners
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupAppMenu();
      this.setupIpcHandlers();

      app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      // On macOS it is common for applications and their menu bar
      // to stay active until the user quits explicitly with Cmd + Q
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        const parsedUrl = new URL(url);

        if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'app://') {
          shell.openExternal(url);
          return { action: 'deny' };
        }

        return { action: 'allow' };
      });
    });
  }

  private createMainWindow(): void {
    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      show: false,
      autoHideMenuBar: true,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      icon: join(__dirname, '../../public/logo-main.svg'),
      webPreferences: {
        preload: join(__dirname, '../preload/preload.cjs'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    // Show window when ready to prevent visual flash
    this.mainWindow.on('ready-to-show', () => {
      if (this.mainWindow) {
        this.mainWindow.show();

        if (isDevelopment) {
          this.mainWindow.webContents.openDevTools();
        }
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Make all links open with the browser, not with the application
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Load the renderer
    if (isDevelopment && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }

  private setupAppMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              // Handle new file/document
            },
          },
          {
            label: 'Open',
            accelerator: 'CmdOrCtrl+O',
            click: async () => {
              if (!this.mainWindow) return;

              const result = await dialog.showOpenDialog(this.mainWindow, {
                properties: ['openFile'],
                filters: [{ name: 'All Files', extensions: ['*'] }],
              });

              if (!result.canceled) {
                // Handle file opening
              }
            },
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [{ role: 'minimize' }, { role: 'close' }],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Flowlytix',
            click: () => {
              if (!this.mainWindow) return;

              dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'About Flowlytix',
                message: 'Flowlytix Distribution System',
                detail: 'Version 1.0.0\nA modern distribution management system.',
              });
            },
          },
          {
            label: 'Learn More',
            click: () => {
              shell.openExternal('https://flowlytix.com');
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIpcHandlers(): void {
    // Example IPC handlers for communication between main and renderer processes
    ipcMain.handle('app:getVersion', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:getName', () => {
      return app.getName();
    });

    ipcMain.handle(
      'app:getPath',
      (
        _,
        name:
          | 'home'
          | 'appData'
          | 'userData'
          | 'sessionData'
          | 'temp'
          | 'exe'
          | 'module'
          | 'desktop'
          | 'documents'
          | 'downloads'
          | 'music'
          | 'pictures'
          | 'videos'
          | 'recent'
          | 'logs'
          | 'crashDumps'
      ) => {
        return app.getPath(name);
      }
    );

    ipcMain.handle('dialog:showOpenDialog', async (_, options) => {
      if (!this.mainWindow) return;
      const result = await dialog.showOpenDialog(this.mainWindow, options);
      return result;
    });

    ipcMain.handle('dialog:showSaveDialog', async (_, options) => {
      if (!this.mainWindow) return;
      const result = await dialog.showSaveDialog(this.mainWindow, options);
      return result;
    });

    ipcMain.handle('shell:openExternal', async (_, url: string) => {
      await shell.openExternal(url);
    });
  }
}

// Initialize the application
new FlowlytixApp();

// Graceful shutdown
process.on('SIGTERM', () => {
  app.quit();
});

process.on('SIGINT', () => {
  app.quit();
});
