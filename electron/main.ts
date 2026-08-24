import { app, BrowserWindow, ipcMain, shell, dialog, Notification, Tray, Menu, nativeImage, powerSaveBlocker, nativeTheme } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { PersistentStore } from './store';
import { QueueManager } from './queueManager';
import { ClipboardWatcher } from './clipboardWatcher';
import { VirusTotalService } from './virusTotal';
import { AddDownloadParams, AppSettings, DownloadTask } from '../src/types/download';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let store: PersistentStore;
let queueManager: QueueManager;
let clipboardWatcher: ClipboardWatcher;
let powerSaveBlockerId: number | null = null;
let isQuitting = false;

// Prevent Chromium from throttling JavaScript, timers, and network when minimized or in background
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

// Single Instance Lock: Ensure only 1 instance runs and focuses when opened again
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

const TRAY_ICON_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAD0UlEQVRYhb2XW0gUYRTHP4OIUrCbuTNr5VO99VBBD70aVIIPVhBEED0WREVWWF53ZjUMhC5CBCklRQnZ/R69Brszs6aV6wVdtRR7KzVrZ+bEOXNx9qLNePvkgwW/Ob//d853zvcdxhjLqKhgSxhjTAxxu0TZ91CQfT8EmYP5nWjT1yrK3C5kmcwM/M1uhLctrQ7nNlz6wkNdlNfFyHzDOUCbaBsZyEImwXEIEtdQ3+fHRfGAxKnzv3tjom1kIEtQuAaCByO+3ahKkDlVkDh9oeD2NBgqMoOSbzeraeda6qI8qVtwuMMTyEQ2C0a4kSDG3OXuRdlP01P86Rs+wQvIRDYTFU5zayio5EGltBqqpDWJBmeE81AprYJqKQeEpG+QzdzD/VAezoaGLzvh2ucdLkTg/3ioDK+Cm18LoP7TFqiS1qaIYO7g6+FiaAW09B4FHVQYi4/C1Y7tZDC9CJ7cXhbKhDdD5YBjZKIDaiP5EJBzE0Qwt/AHvUdA1f+ANe50FUNFOBtEJfU8iEoewV8Pltnr/2oTcKV9a4po5gZ+v+cwqPok6PSnJQpIOpAIx29eDZbSOl1XTQHj3gQETfi9nkMQ134bxky4IWBfigcMeCa8GDhnwjWSjANtuBYQJHgm3O05SK5LhqcTgBmCgp/HztjrDbhHAaLiJ0PN3QfgjzaeFm4JwKwQ5TzbW09jp5Lg4E2AKPuhIrwSbncXw6T2y/wcYzi1E2s0d+2ntTXKRoI/7j/hWOeEa27PAA/V0jqoa9sEP/+OpNm5TjG1RlO0iDxQFs6CR/3H7V1bbp/61rUHeMrRWiUfhsfb6CMtwahlzjD8bqiKdv6k/wSd9ES4sd6QYWTB9/EIeWvGOiCSF3LIC43RQrgV3WvOPdDUVQRDY2FbRlyfhNGJr47aMOV+TY/D26FKqoC3OguhsbMQLrdtTluOWboqhqHA+FoT3VbykdknXDN3bAz0SOLOn8ZOQmloGZVhywbaTIZPm4boCevWw1mjbICyUBa8GDhr57czzs4C9Sx2mkKDmeG0Md29wdzfBcsdAoy4JsOfD5SY8DxXF5znyyhVwFRmvBw4T8XLC3wOArQE+KvBCwQXPcI9C0AX24fQ9AJet3jzGSXZ3SNlzmdANVMPawHB5dnBSYCbJxnGFUGtfcfsw/f+m0CZMRc4PcncPUrNKhnJhw/fa+FJ7KT5FuBnB7cepW3csKdneUDKpVBg/Xf7KP3/s1zy0pjwFI7ZnPZpGxNnayYonLrorRkzm9OAlHvdaE79C9ic+tM2p3Z7XiPzBQHJ17qY7fk/KACDC8EaT+cAAAAASUVORK5CYII=';

function getAppIcon(): Electron.NativeImage {
  const candidatePaths = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../build/icon.png'),
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(process.resourcesPath, 'icon.png'),
    path.join(process.resourcesPath, 'build/icon.ico'),
    path.join(process.resourcesPath, 'build/icon.png'),
    path.join(app.getAppPath(), 'build/icon.ico'),
    path.join(app.getAppPath(), 'build/icon.png'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) return img;
      } catch {}
    }
  }
  return nativeImage.createFromDataURL(TRAY_ICON_BASE64);
}

function getTrayIcon(): Electron.NativeImage {
  const candidatePaths = [
    path.join(__dirname, '../build/tray-icon.png'),
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../build/icon.png'),
    path.join(process.resourcesPath, 'tray-icon.png'),
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(process.resourcesPath, 'icon.png'),
    path.join(process.resourcesPath, 'build/tray-icon.png'),
    path.join(process.resourcesPath, 'build/icon.ico'),
    path.join(app.getAppPath(), 'build/tray-icon.png'),
    path.join(app.getAppPath(), 'build/icon.ico'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) return img;
      } catch {}
    }
  }
  return nativeImage.createFromDataURL(TRAY_ICON_BASE64);
}

function createWindow(): void {
  const appIcon = getAppIcon();

  const currentTheme = store?.getSettings()?.theme || 'dark';
  nativeTheme.themeSource = currentTheme;

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    title: 'MDM - Download Manager',
    icon: appIcon,
    backgroundColor: currentTheme === 'dark' ? '#121212' : '#ffffff',
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false, // Critical: keeps timers and downloads running at 100% in background
    },
  });

  // Remove default menu for a clean modern app look
  Menu.setApplicationMenu(null);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const distIndexPath = path.join(__dirname, '../dist/index.html');

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else if (fs.existsSync(distIndexPath)) {
    mainWindow.loadFile(distIndexPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Intercept window close event to hide to System Tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  if (tray) return;

  const trayIcon = getTrayIcon();

  try {
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'MDM - Download Manager v1.1.2', enabled: false },
      { type: 'separator' },
      { 
        label: 'Open MDM', 
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        } 
      },
      { type: 'separator' },
      { 
        label: 'Pause All Downloads', 
        click: () => queueManager.pauseAll() 
      },
      { 
        label: 'Resume All Downloads', 
        click: () => queueManager.resumeAll() 
      },
      { type: 'separator' },
      { 
        label: 'Exit MDM', 
        click: () => {
          isQuitting = true;
          app.quit();
        } 
      },
    ]);

    tray.setToolTip('MDM - Download Manager (Running in background)');
    tray.setContextMenu(contextMenu);

    // Left click toggles or restores window
    tray.on('click', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
        mainWindow.hide();
      } else {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });

    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (e) {
    console.error('Tray creation failed:', e);
  }
}

app.whenReady().then(() => {
  store = new PersistentStore();

  const handleTaskUpdate = (task: DownloadTask) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-update', task);
    }
    updateTaskbarProgress();
  };

  const handleTaskCompleted = async (task: DownloadTask) => {
    // If image format conversion was requested, perform conversion using nativeImage
    if (task.convertFormat && task.convertFormat !== 'original' && fs.existsSync(task.savePath)) {
      try {
        const img = nativeImage.createFromPath(task.savePath);
        if (!img.isEmpty()) {
          let convertedBuffer: Buffer | null = null;
          let newExt = `.${task.convertFormat}`;
          if (task.convertFormat === 'png') {
            convertedBuffer = img.toPNG();
            newExt = '.png';
          } else if (task.convertFormat === 'jpg' || task.convertFormat === 'jpeg') {
            convertedBuffer = img.toJPEG(95);
            newExt = '.jpg';
          }

          if (convertedBuffer && convertedBuffer.length > 0) {
            const parsedPath = path.parse(task.savePath);
            const targetSavePath = path.join(parsedPath.dir, `${parsedPath.name}${newExt}`);
            fs.writeFileSync(targetSavePath, convertedBuffer);
            if (targetSavePath !== task.savePath) {
              try { fs.unlinkSync(task.savePath); } catch {}
              task.savePath = targetSavePath;
              task.filename = `${parsedPath.name}${newExt}`;
              task.fileSize = convertedBuffer.length;
              task.downloadedBytes = convertedBuffer.length;
              store.updateTask(task);
            }
          }
        }
      } catch (err) {
        console.warn('Image format conversion error:', err);
      }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-completed', task);
    }

    const settings = store.getSettings();
    if (settings.desktopNotifications && Notification.isSupported()) {
      const notification = new Notification({
        title: 'Download Complete',
        body: `${task.filename} finished downloading.`,
        silent: !settings.soundNotifications,
      });
      notification.on('click', () => {
        if (fs.existsSync(task.savePath)) {
          shell.showItemInFolder(task.savePath);
        }
      });
      notification.show();
    }

    updateTaskbarProgress();

    // Automatically check with VirusTotal if enabled
    if (settings.virusTotalAutoScan && settings.virusTotalApiKey && fs.existsSync(task.savePath)) {
      try {
        const sha256 = await queueManager.getEngine().calculateChecksum(task.savePath, 'sha256');
        task.virusTotalStatus = 'scanning';
        store.updateTask(task);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-update', task);
        }

        let vtStats = await VirusTotalService.checkFileByHash(settings.virusTotalApiKey.trim(), sha256);

        // If file hash is uncataloged, upload and scan directly
        if (vtStats.status === 'not_found') {
          vtStats = await VirusTotalService.uploadAndScanFile(
            settings.virusTotalApiKey.trim(),
            task.savePath,
            sha256
          );
        }

        task.virusTotalStatus = vtStats.status;
        task.virusTotalScore = {
          malicious: vtStats.malicious,
          suspicious: vtStats.suspicious,
          harmless: vtStats.harmless,
          undetected: vtStats.undetected,
          total: vtStats.total,
          permalink: vtStats.permalink,
          scanDate: vtStats.scanDate,
        };
        store.updateTask(task);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-update', task);
        }
      } catch (err) {
        console.warn('Auto VirusTotal scan skipped/failed:', err);
      }
    }
  };

  queueManager = new QueueManager(store, handleTaskUpdate, handleTaskCompleted);

  // Setup Clipboard Watcher
  clipboardWatcher = new ClipboardWatcher((url: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard-url-detected', url);
    }
  });

  if (store.getSettings().clipboardMonitoring) {
    clipboardWatcher.start();
  }

  createWindow();
  createTray();
  startLocalIntegrationServer();

  // Register IPC Handlers
  setupIpcHandlers();
});

function startLocalIntegrationServer(): void {
  try {
    const server = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const parsedUrl = new URL(req.url || '', `http://${req.headers.host}`);

      if (req.method === 'GET' && parsedUrl.pathname === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', app: 'MDM', version: '1.1.2' }));
        return;
      }

      if (req.method === 'POST' && parsedUrl.pathname === '/download') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            if (!data.url) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing url' }));
              return;
            }

            const task = await queueManager.addDownload({
              url: data.url,
              filename: data.filename,
              headers: data.headers,
              convertFormat: data.convertFormat,
              autoStart: data.autoStart !== false,
            });

            if (mainWindow) {
              if (mainWindow.isMinimized()) mainWindow.restore();
              mainWindow.show();
              mainWindow.focus();
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, task }));
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(9666, '127.0.0.1', () => {
      console.log('MDM Browser Integration Server listening on http://127.0.0.1:9666');
    });
  } catch (err) {
    console.error('Failed to start integration server:', err);
  }
}

function updateTaskbarProgress(): void {
  const tasks = store.getTasks();
  const downloading = tasks.filter(t => t.status === 'downloading');

  // Keep system active and prevent app/network suspension when downloads are running
  if (downloading.length > 0) {
    if (powerSaveBlockerId === null) {
      try {
        powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
      } catch {}
    }
  } else {
    if (powerSaveBlockerId !== null) {
      try {
        powerSaveBlocker.stop(powerSaveBlockerId);
      } catch {}
      powerSaveBlockerId = null;
    }
  }

  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (downloading.length === 0) {
    mainWindow.setProgressBar(-1);
    return;
  }

  const totalBytes = downloading.reduce((sum, t) => sum + (t.fileSize || 0), 0);
  const downloadedBytes = downloading.reduce((sum, t) => sum + t.downloadedBytes, 0);

  if (totalBytes > 0) {
    const progress = Math.min(1, Math.max(0, downloadedBytes / totalBytes));
    mainWindow.setProgressBar(progress);
  } else {
    mainWindow.setProgressBar(2); // Indeterminate
  }
}

function getOrExtractExtensionDir(): string {
  const targetDir = path.join(app.getPath('userData'), 'browser-extension');
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const candidates = [
      path.join(process.resourcesPath, 'extension'),
      path.join(app.getAppPath(), 'extension'),
      path.join(process.cwd(), 'extension'),
    ];

    const sourceDir = candidates.find(c => fs.existsSync(path.join(c, 'manifest.json')));

    if (sourceDir && fs.existsSync(sourceDir)) {
      const files = fs.readdirSync(sourceDir);
      for (const file of files) {
        const srcFile = path.join(sourceDir, file);
        const destFile = path.join(targetDir, file);
        if (fs.statSync(srcFile).isFile()) {
          fs.copyFileSync(srcFile, destFile);
        }
      }
    }
  } catch (err) {
    console.warn('Error extracting extension folder:', err);
  }
  return targetDir;
}

function setupIpcHandlers(): void {
  ipcMain.handle('probe-url', async (_event, url: string, headers?: Record<string, string>) => {
    return await queueManager.getEngine().probeUrl(url, headers);
  });

  ipcMain.handle('add-download', async (_event, params: AddDownloadParams) => {
    return await queueManager.addDownload(params);
  });

  ipcMain.handle('batch-add-downloads', async (_event, urls: string[]) => {
    return await queueManager.batchAdd(urls);
  });

  ipcMain.handle('pause-download', async (_event, id: string) => {
    return await queueManager.pauseTask(id);
  });

  ipcMain.handle('resume-download', async (_event, id: string) => {
    return await queueManager.resumeTask(id);
  });

  ipcMain.handle('cancel-download', async (_event, id: string, deleteFile?: boolean) => {
    return await queueManager.cancelTask(id, deleteFile);
  });

  ipcMain.handle('restart-download', async (_event, id: string) => {
    return await queueManager.restartTask(id);
  });

  ipcMain.handle('pause-all', async () => {
    return await queueManager.pauseAll();
  });

  ipcMain.handle('resume-all', async () => {
    return await queueManager.resumeAll();
  });

  ipcMain.handle('get-downloads', async () => {
    return store.getTasks();
  });

  ipcMain.handle('get-settings', async () => {
    return store.getSettings();
  });

  ipcMain.handle('update-settings', async (_event, partial: Partial<AppSettings>) => {
    const updated = store.updateSettings(partial);
    if (partial.theme) {
      nativeTheme.themeSource = partial.theme;
      if (mainWindow) {
        mainWindow.setBackgroundColor(partial.theme === 'dark' ? '#121212' : '#ffffff');
      }
    }
    if (typeof partial.clipboardMonitoring === 'boolean') {
      clipboardWatcher.setEnabled(partial.clipboardMonitoring);
      if (partial.clipboardMonitoring) {
        clipboardWatcher.start();
      } else {
        clipboardWatcher.stop();
      }
    }
    return updated;
  });

  ipcMain.handle('theme:set', async (_event, themeMode: 'dark' | 'light') => {
    nativeTheme.themeSource = themeMode;
    if (mainWindow) {
      mainWindow.setBackgroundColor(themeMode === 'dark' ? '#121212' : '#ffffff');
    }
    return true;
  });

  ipcMain.handle('open-file', async (_event, savePath: string) => {
    if (fs.existsSync(savePath)) {
      const res = await shell.openPath(savePath);
      return res === '';
    }
    return false;
  });

  ipcMain.handle('show-in-folder', async (_event, savePath: string) => {
    if (fs.existsSync(savePath)) {
      shell.showItemInFolder(savePath);
      return true;
    }
    return false;
  });

  ipcMain.handle('select-directory', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('calculate-checksum', async (_event, filePath: string, algorithm: 'md5' | 'sha256') => {
    return await queueManager.getEngine().calculateChecksum(filePath, algorithm);
  });

  ipcMain.handle('virustotal:test-key', async (_event, apiKey: string) => {
    return await VirusTotalService.testApiKey(apiKey);
  });

  ipcMain.handle('virustotal:check', async (_event, taskId: string) => {
    const task = store.getTask(taskId);
    if (!task) {
      return { success: false, error: 'Task not found in download queue' };
    }
    const settings = store.getSettings();
    if (!settings.virusTotalApiKey || !settings.virusTotalApiKey.trim()) {
      return { success: false, error: 'VirusTotal API Key is not configured. Please set your key in Settings > Security & VirusTotal.' };
    }
    if (!fs.existsSync(task.savePath)) {
      return { success: false, error: 'Downloaded file does not exist on disk' };
    }

    task.virusTotalStatus = 'scanning';
    store.updateTask(task);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-update', task);
    }

    try {
      const sha256 = await queueManager.getEngine().calculateChecksum(task.savePath, 'sha256');
      let vtStats = await VirusTotalService.checkFileByHash(settings.virusTotalApiKey.trim(), sha256);

      // If hash is not cataloged in VirusTotal, upload the file directly and poll for results
      if (vtStats.status === 'not_found') {
        vtStats = await VirusTotalService.uploadAndScanFile(
          settings.virusTotalApiKey.trim(),
          task.savePath,
          sha256
        );
      }

      task.virusTotalStatus = vtStats.status;
      task.virusTotalScore = {
        malicious: vtStats.malicious,
        suspicious: vtStats.suspicious,
        harmless: vtStats.harmless,
        undetected: vtStats.undetected,
        total: vtStats.total,
        permalink: vtStats.permalink,
        scanDate: vtStats.scanDate,
      };
      store.updateTask(task);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-update', task);
      }
      return { success: true, stats: vtStats };
    } catch (err: any) {
      console.error('VirusTotal check error:', err);
      task.virusTotalStatus = 'error';
      store.updateTask(task);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-update', task);
      }
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('extension:get-path', async () => {
    return getOrExtractExtensionDir();
  });

  ipcMain.handle('extension:open-folder', async () => {
    const dir = getOrExtractExtensionDir();
    if (fs.existsSync(dir)) {
      shell.openPath(dir);
      return dir;
    }
    return '';
  });

  ipcMain.handle('extension:install-browser', async (_event, browserType: 'chrome' | 'edge' | 'brave' | 'firefox') => {
    const dir = getOrExtractExtensionDir();
    const { exec } = await import('child_process');
    const { clipboard } = await import('electron');

    if (dir) {
      clipboard.writeText(dir);
    }

    try {
      if (browserType === 'chrome') {
        exec(`start chrome "chrome://extensions"`);
      } else if (browserType === 'edge') {
        exec(`start msedge "edge://extensions"`);
      } else if (browserType === 'brave') {
        exec(`start brave "brave://extensions"`);
      } else if (browserType === 'firefox') {
        exec(`start firefox "about:debugging#/runtime/this-firefox"`);
      }
      return { success: true, path: dir };
    } catch (err: any) {
      return { success: false, error: err.message, path: dir };
    }
  });

  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    if (!isQuitting && mainWindow) {
      mainWindow.hide();
    } else {
      mainWindow?.close();
    }
  });
}

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (isQuitting) {
    app.quit();
  }
});
