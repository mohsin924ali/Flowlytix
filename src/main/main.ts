import { app, BrowserWindow, Menu, shell, dialog } from 'electron';
import { join } from 'node:path';
import { isDev } from './utils/environment';
import { registerIpcHandlers } from './ipc/ipcHandlers';

class ElectronApp {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.initializeApp();
  }

  private initializeApp(): void {
    // Set app user model ID for Windows
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.flowlytix.distribution-system');
    }

    // Security: Disable node integration globally
    app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');

    // Handle certificate errors
    app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
      if (isDev()) {
        // In development, ignore certificate errors for localhost
        event.preventDefault();
        callback(true);
      } else {
        // In production, use default behavior
        callback(false);
      }
    });

    // Handle app events
    this.setupAppEventHandlers();

    // Register IPC handlers
    registerIpcHandlers();
  }

  private setupAppEventHandlers(): void {
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupApplicationMenu();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    app.on('web-contents-created', (_, contents) => {
      // Security: Prevent navigation to external URLs
      contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);

        if (parsedUrl.origin !== 'http://localhost:3000' && !isDev()) {
          event.preventDefault();
        }
      });

      // Security: Prevent opening external links
      contents.setWindowOpenHandler(({ url }) => {
        void shell.openExternal(url);
        return { action: 'deny' };
      });
    });
  }

  private createMainWindow(): void {
    // Create the browser window with security settings
    const preloadPath = isDev()
      ? join(__dirname, '../preload/preload.js') // Development path
      : join(__dirname, '../preload/preload.js'); // Production path - going from main/ to preload/

    console.log('Preload script path:', preloadPath);
    console.log('Preload script exists:', require('fs').existsSync(preloadPath));

    const windowOptions: Electron.BrowserWindowConstructorOptions = {
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 768,
      show: false,
      titleBarStyle: 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        allowRunningInsecureContent: false,
        webSecurity: true,
        sandbox: false, // Required for preload script
        preload: preloadPath,
        spellcheck: true,
        devTools: isDev(),
      },
    };

    const iconPath = this.getAppIcon();
    if (iconPath) {
      windowOptions.icon = iconPath;
    }

    this.mainWindow = new BrowserWindow(windowOptions);

    // Load the renderer
    if (isDev()) {
      void this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      // Fixed path - going from dist/main/src/main/ to dist/renderer/
      const htmlPath = join(__dirname, '../../../renderer/index.html');
      console.log('Loading HTML file from:', htmlPath);
      console.log('HTML file exists:', require('fs').existsSync(htmlPath));
      void this.mainWindow.loadFile(htmlPath);
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      console.log('Main window is ready to show');
      this.mainWindow?.show();

      if (isDev()) {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Add error handling for debugging
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load:', validatedURL, 'Error:', errorDescription);
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('Renderer process loaded successfully');
    });

    // Security: Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  private setupApplicationMenu(): void {
    // Create a simple menu
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit(),
          },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About',
            click: () => this.showAboutDialog(),
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private getAppIcon(): string | undefined {
    if (process.platform === 'win32') {
      return join(__dirname, '../../assets/icon.ico');
    } else if (process.platform === 'darwin') {
      return join(__dirname, '../../assets/icon.icns');
    } else {
      return join(__dirname, '../../assets/icon.png');
    }
  }

  private showAboutDialog(): void {
    void dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'About Flowlytix Distribution System',
      message: 'Flowlytix Distribution System',
      detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}`,
      buttons: ['OK'],
    });
  }
}

// Initialize the app
new ElectronApp();
