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

// Prevent Chromium from throttling JavaScript, timers, and network when minimized or in background
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function createWindow(): void {
  const appIconPath = path.join(__dirname, '../build/icon.ico');
  const appIcon = fs.existsSync(appIconPath) ? nativeImage.createFromPath(appIconPath) : undefined;

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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../build/icon.ico');
  const trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  
  try {
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'MDM - Download Manager', enabled: false },
      { type: 'separator' },
      { 
        label: 'Show MDM', 
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        } 
      },
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
          app.quit();
        } 
      },
    ]);

    tray.setToolTip('MDM - Download Manager');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
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
        res.end(JSON.stringify({ status: 'ok', app: 'MDM', version: '1.0.0' }));
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
    mainWindow?.close();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
