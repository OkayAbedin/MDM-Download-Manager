export type DownloadStatus = 
  | 'idle'
  | 'probing'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled';

export type DownloadCategory = 
  | 'all'
  | 'compressed'
  | 'programs'
  | 'video'
  | 'audio'
  | 'documents'
  | 'images'
  | 'others';

export interface DownloadSegment {
  id: number;
  start: number;
  end: number;
  downloaded: number;
  total: number;
  progress: number;
  speed: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  color?: string;
}

export interface DownloadTask {
  id: string;
  url: string;
  filename: string;
  savePath: string;
  tempPath?: string;
  fileSize: number;
  downloadedBytes: number;
  progress: number;
  speed: number;
  avgSpeed: number;
  eta: number;
  elapsedTime: number;
  status: DownloadStatus;
  resumable: boolean;
  segmentsCount: number;
  segments: DownloadSegment[];
  category: DownloadCategory;
  mimeType?: string;
  createdAt: number;
  completedAt?: number;
  errorMessage?: string;
  headers?: Record<string, string>;
  speedLimit?: number;
  mediaType?: 'video' | 'audio';
  mediaQuality?: string;
  audioFormat?: 'mp3' | 'm4a' | 'flac' | 'wav' | 'opus';
  convertFormat?: 'png' | 'jpg' | 'jpeg' | 'webp' | 'original';
  mediaThumbnail?: string;
  mediaDuration?: number;
  mediaUploader?: string;
  virusTotalStatus?: 'clean' | 'suspicious' | 'malicious' | 'scanning' | 'unscanned' | 'error' | 'not_found';
  virusTotalScore?: {
    malicious: number;
    suspicious: number;
    harmless: number;
    undetected: number;
    total: number;
    permalink?: string;
    scanDate?: number;
  };
}

export interface SpeedHistoryPoint {
  timestamp: number;
  speed: number;
}

export interface AppSettings {
  theme?: 'dark' | 'light';
  defaultDownloadDir: string;
  maxConcurrentDownloads: number;
  defaultSegments: number;
  speedLimitEnabled: boolean;
  globalSpeedLimit: number;
  clipboardMonitoring: boolean;
  soundNotifications: boolean;
  desktopNotifications: boolean;
  autoStartDownloads: boolean;
  autoDeleteCompletedEnabled: boolean;
  autoDeleteCompletedValue: number;
  autoDeleteCompletedUnit: 'hours' | 'days';
  autoDeleteSourceFile: boolean;
  virusTotalApiKey?: string;
  virusTotalAutoScan?: boolean;
  categoryFolders: {
    compressed: string;
    programs: string;
    video: string;
    audio: string;
    documents: string;
    images: string;
    others: string;
  };
  customUserAgent: string;
  proxyUrl?: string;
}

export const defaultSettings: AppSettings = {
  theme: 'dark',
  defaultDownloadDir: '',
  maxConcurrentDownloads: 3,
  defaultSegments: 8,
  speedLimitEnabled: false,
  globalSpeedLimit: 2048,
  clipboardMonitoring: true,
  soundNotifications: true,
  desktopNotifications: true,
  autoStartDownloads: true,
  autoDeleteCompletedEnabled: false,
  autoDeleteCompletedValue: 7,
  autoDeleteCompletedUnit: 'days',
  autoDeleteSourceFile: false,
  virusTotalApiKey: '',
  virusTotalAutoScan: false,
  categoryFolders: {
    compressed: '',
    programs: '',
    video: '',
    audio: '',
    documents: '',
    images: '',
    others: '',
  },
  customUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

export interface MediaFormatOption {
  id: string;
  label: string;
  type: 'video' | 'audio';
  ext: string;
  resolution?: string;
  filesize?: number;
}

export interface AddDownloadParams {
  url: string;
  filename?: string;
  savePath?: string;
  category?: DownloadCategory;
  segmentsCount?: number;
  headers?: Record<string, string>;
  speedLimit?: number;
  autoStart?: boolean;
  mediaType?: 'video' | 'audio';
  mediaQuality?: string;
  audioFormat?: 'mp3' | 'm4a' | 'flac' | 'wav' | 'opus';
  convertFormat?: 'png' | 'jpg' | 'jpeg' | 'webp' | 'original';
}

export interface ProbeResult {
  url: string;
  filename: string;
  fileSize: number;
  resumable: boolean;
  mimeType?: string;
  category: DownloadCategory;
  suggestedSavePath: string;
  isStreamingMedia?: boolean;
  mediaTitle?: string;
  mediaThumbnail?: string;
  mediaDuration?: number;
  mediaUploader?: string;
  availableFormats?: MediaFormatOption[];
}

export interface ElectronAPI {
  probeUrl: (url: string, headers?: Record<string, string>) => Promise<ProbeResult>;
  addDownload: (params: AddDownloadParams) => Promise<DownloadTask>;
  batchAddDownloads: (urls: string[]) => Promise<DownloadTask[]>;
  pauseDownload: (id: string) => Promise<boolean>;
  resumeDownload: (id: string) => Promise<boolean>;
  cancelDownload: (id: string, deleteFile?: boolean) => Promise<boolean>;
  restartDownload: (id: string) => Promise<boolean>;
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  getDownloads: () => Promise<DownloadTask[]>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  setTheme?: (theme: 'dark' | 'light') => Promise<boolean>;
  openFile: (savePath: string) => Promise<boolean>;
  showInFolder: (savePath: string) => Promise<boolean>;
  selectDirectory: () => Promise<string | null>;
  calculateChecksum: (filePath: string, algorithm: 'md5' | 'sha256') => Promise<string>;
  checkVirusTotal?: (taskId: string) => Promise<{ success: boolean; stats?: any; result?: any; error?: string }>;
  testVirusTotalKey?: (apiKey: string) => Promise<{ success: boolean; user?: string; error?: string }>;
  getExtensionPath?: () => Promise<string>;
  openExtensionFolder?: () => Promise<string>;
  installBrowserExtension?: (browserType: 'chrome' | 'edge' | 'brave' | 'firefox') => Promise<{ success: boolean; path?: string; error?: string }>;
  onDownloadUpdate: (callback: (task: DownloadTask) => void) => () => void;
  onDownloadCompleted: (callback: (task: DownloadTask) => void) => () => void;
  onClipboardUrlDetected: (callback: (url: string) => void) => () => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
