import { contextBridge, ipcRenderer } from 'electron';
import { AddDownloadParams, AppSettings, DownloadTask } from '../src/types/download';

contextBridge.exposeInMainWorld('electronAPI', {
  probeUrl: (url: string, headers?: Record<string, string>) => ipcRenderer.invoke('probe-url', url, headers),
  addDownload: (params: AddDownloadParams) => ipcRenderer.invoke('add-download', params),
  batchAddDownloads: (urls: string[]) => ipcRenderer.invoke('batch-add-downloads', urls),
  pauseDownload: (id: string) => ipcRenderer.invoke('pause-download', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('resume-download', id),
  cancelDownload: (id: string, deleteFile?: boolean) => ipcRenderer.invoke('cancel-download', id, deleteFile),
  restartDownload: (id: string) => ipcRenderer.invoke('restart-download', id),
  pauseAll: () => ipcRenderer.invoke('pause-all'),
  resumeAll: () => ipcRenderer.invoke('resume-all'),
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('update-settings', settings),
  setTheme: (theme: 'dark' | 'light') => ipcRenderer.invoke('theme:set', theme),
  openFile: (savePath: string) => ipcRenderer.invoke('open-file', savePath),
  showInFolder: (savePath: string) => ipcRenderer.invoke('show-in-folder', savePath),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  calculateChecksum: (filePath: string, algorithm: 'md5' | 'sha256') => ipcRenderer.invoke('calculate-checksum', filePath, algorithm),
  checkVirusTotal: (taskId: string) => ipcRenderer.invoke('virustotal:check', taskId),
  testVirusTotalKey: (apiKey: string) => ipcRenderer.invoke('virustotal:test-key', apiKey),
  getExtensionPath: () => ipcRenderer.invoke('extension:get-path'),
  openExtensionFolder: () => ipcRenderer.invoke('extension:open-folder'),
  installBrowserExtension: (browserType: 'chrome' | 'edge' | 'brave' | 'firefox') => ipcRenderer.invoke('extension:install-browser', browserType),
  
  onDownloadUpdate: (callback: (task: DownloadTask) => void) => {
    const listener = (_event: any, task: DownloadTask) => callback(task);
    ipcRenderer.on('download-update', listener);
    return () => ipcRenderer.removeListener('download-update', listener);
  },

  onDownloadCompleted: (callback: (task: DownloadTask) => void) => {
    const listener = (_event: any, task: DownloadTask) => callback(task);
    ipcRenderer.on('download-completed', listener);
    return () => ipcRenderer.removeListener('download-completed', listener);
  },

  onClipboardUrlDetected: (callback: (url: string) => void) => {
    const listener = (_event: any, url: string) => callback(url);
    ipcRenderer.on('clipboard-url-detected', listener);
    return () => ipcRenderer.removeListener('clipboard-url-detected', listener);
  },

  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
});
