import fs from 'fs';
import path from 'path';
import os from 'os';
import { AppSettings, DownloadTask } from '../src/types/download';

export interface StoreData {
  tasks: DownloadTask[];
  settings: AppSettings;
}

const defaultDownloadDir = path.join(os.homedir(), 'Downloads');

export const defaultSettings: AppSettings = {
  theme: 'dark',
  defaultDownloadDir: defaultDownloadDir,
  maxConcurrentDownloads: 3,
  defaultSegments: 8,
  speedLimitEnabled: false,
  globalSpeedLimit: 2048, // 2MB/s in KB/s
  clipboardMonitoring: true,
  soundNotifications: true,
  desktopNotifications: true,
  autoStartDownloads: true,
  autoDeleteCompletedEnabled: false,
  autoDeleteCompletedValue: 7,
  autoDeleteCompletedUnit: 'days',
  autoDeleteSourceFile: false,
  categoryFolders: {
    compressed: path.join(defaultDownloadDir, 'Compressed'),
    programs: path.join(defaultDownloadDir, 'Programs'),
    video: path.join(defaultDownloadDir, 'Video'),
    audio: path.join(defaultDownloadDir, 'Audio'),
    documents: path.join(defaultDownloadDir, 'Documents'),
    images: path.join(defaultDownloadDir, 'Images'),
    others: path.join(defaultDownloadDir, 'Others'),
  },
  customUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

export class PersistentStore {
  private filePath: string;
  private data: StoreData;

  constructor(customPath?: string) {
    const configDir = customPath || path.join(os.homedir(), '.mdm-downloader');
    if (!fs.existsSync(configDir)) {
      try {
        fs.mkdirSync(configDir, { recursive: true });
      } catch {
        // Fallback to current working dir
      }
    }
    this.filePath = path.join(configDir, 'store.json');
    this.data = this.load();
  }

  private load(): StoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          tasks: parsed.tasks || [],
          settings: { ...defaultSettings, ...(parsed.settings || {}) },
        };
      }
    } catch (e) {
      console.error('Error loading store:', e);
    }
    return {
      tasks: [],
      settings: defaultSettings,
    };
  }

  public save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving store:', e);
    }
  }

  public getTasks(): DownloadTask[] {
    return this.data.tasks;
  }

  public getTask(id: string): DownloadTask | undefined {
    return this.data.tasks.find(t => t.id === id);
  }

  public setTask(task: DownloadTask): void {
    const idx = this.data.tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) {
      this.data.tasks[idx] = task;
    } else {
      this.data.tasks.unshift(task);
    }
    this.save();
  }

  public updateTask(task: DownloadTask): void {
    this.setTask(task);
  }

  public removeTask(id: string): void {
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.save();
  }

  public getSettings(): AppSettings {
    return this.data.settings;
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...partial };
    this.save();
    return this.data.settings;
  }
}
