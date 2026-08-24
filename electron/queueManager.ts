import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DownloadTask, AddDownloadParams, AppSettings, ProbeResult } from '../src/types/download';
import { DownloadEngine, detectCategory, isStreamingMediaUrl } from './downloadEngine';
import { PersistentStore } from './store';

export class QueueManager {
  private engine: DownloadEngine;
  private store: PersistentStore;
  private onTaskUpdateCallback: (task: DownloadTask) => void;
  private onTaskCompletedCallback: (task: DownloadTask) => void;
  private isProcessingQueue = false;

  constructor(
    store: PersistentStore,
    onTaskUpdate: (task: DownloadTask) => void,
    onTaskCompleted: (task: DownloadTask) => void
  ) {
    this.store = store;
    this.engine = new DownloadEngine();
    this.onTaskUpdateCallback = onTaskUpdate;
    this.onTaskCompletedCallback = onTaskCompleted;

    // Start auto-cleanup worker
    setInterval(() => {
      this.checkAutoCleanup();
    }, 60 * 1000);
    setTimeout(() => this.checkAutoCleanup(), 3000);
  }

  checkAutoCleanup(): void {
    try {
      const settings = this.store.getSettings();
      if (!settings.autoDeleteCompletedEnabled) return;

      const value = Number(settings.autoDeleteCompletedValue) || 7;
      const unit = settings.autoDeleteCompletedUnit || 'days';
      const ms = value * (unit === 'hours' ? 3600 * 1000 : 24 * 3600 * 1000);
      const cutoff = Date.now() - ms;

      const tasks = this.store.getTasks();
      for (const task of tasks) {
        if (task.status === 'completed' && task.completedAt && task.completedAt < cutoff) {
          this.cancelTask(task.id, settings.autoDeleteSourceFile ?? false);
        }
      }
    } catch (err) {
      console.error('[Auto-Cleanup] Error during check:', err);
    }
  }

  getEngine(): DownloadEngine {
    return this.engine;
  }

  async addDownload(params: AddDownloadParams): Promise<DownloadTask> {
    const settings = this.store.getSettings();
    const isStreaming = isStreamingMediaUrl(params.url);
    
    let probe: Partial<ProbeResult> = {};
    if (isStreaming || !params.filename) {
      try {
        probe = await this.engine.probeUrl(params.url, params.headers);
      } catch (err) {
        console.warn('URL probe skipped or failed, proceeding directly to download:', err);
      }
    }

    // Sanitize filename to ensure it is basename only and has no invalid Windows path characters
    let rawFilename = params.filename ? path.basename(params.filename) : (probe.filename || `download_${Date.now()}`);
    
    // If audio is requested, ensure filename has appropriate audio extension
    const isAudio = params.mediaType === 'audio' || (params.category === 'audio' && probe.isStreamingMedia);
    if (isAudio) {
      const audioExt = params.audioFormat || 'mp3';
      const parsedExt = path.extname(rawFilename);
      if (!parsedExt || parsedExt.toLowerCase() === '.mp4' || parsedExt.toLowerCase() === '.webm') {
        rawFilename = `${path.basename(rawFilename, parsedExt)}.${audioExt}`;
      }
    }

    let cleanFilename = rawFilename.replace(/[\\/:*?"<>|]/g, '_').trim();
    if (!cleanFilename) cleanFilename = `download_${Date.now()}`;

    const filename = cleanFilename;
    const category = isAudio ? 'audio' : (params.category || probe.category || detectCategory(filename));

    const categoryFolder = (category !== 'all' ? settings.categoryFolders[category as keyof typeof settings.categoryFolders] : undefined) || settings.defaultDownloadDir;
    let savePath = params.savePath?.trim() || '';

    if (!savePath) {
      savePath = path.join(categoryFolder, filename);
    } else {
      let isDir = false;
      try {
        if (fs.existsSync(savePath) && fs.statSync(savePath).isDirectory()) {
          isDir = true;
        }
      } catch {}
      if (isDir || !savePath.endsWith(filename)) {
        savePath = path.join(savePath, filename);
      }
    }

    const task: DownloadTask = {
      id: crypto.randomUUID(),
      url: probe.url || params.url,
      filename,
      savePath,
      fileSize: probe.fileSize || 0,
      downloadedBytes: 0,
      progress: 0,
      speed: 0,
      avgSpeed: 0,
      eta: 0,
      elapsedTime: 0,
      status: 'idle',
      resumable: probe.resumable ?? false,
      segmentsCount: params.segmentsCount || settings.defaultSegments,
      segments: [],
      category,
      mimeType: isAudio ? `audio/${params.audioFormat || 'mpeg'}` : probe.mimeType,
      createdAt: Date.now(),
      headers: params.headers,
      speedLimit: params.speedLimit,
      mediaType: isAudio ? 'audio' : (params.mediaType || 'video'),
      mediaQuality: params.mediaQuality || 'best',
      audioFormat: params.audioFormat || 'mp3',
      convertFormat: params.convertFormat,
      mediaThumbnail: probe.mediaThumbnail,
      mediaDuration: probe.mediaDuration,
      mediaUploader: probe.mediaUploader,
    };

    this.store.setTask(task);
    this.onTaskUpdateCallback(task);

    if (params.autoStart !== false && settings.autoStartDownloads) {
      this.startTask(task.id);
    }

    return task;
  }

  async batchAdd(urls: string[]): Promise<DownloadTask[]> {
    const tasks: DownloadTask[] = [];
    for (const url of urls) {
      const trimmed = url.trim();
      if (!trimmed || !trimmed.startsWith('http')) continue;
      try {
        const task = await this.addDownload({ url: trimmed });
        tasks.push(task);
      } catch (e) {
        console.error(`Failed to add batch url ${trimmed}:`, e);
      }
    }
    return tasks;
  }

  async startTask(id: string): Promise<boolean> {
    const tasks = this.store.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return false;

    // Ensure savePath is a file path and not a directory
    try {
      if (fs.existsSync(task.savePath) && fs.statSync(task.savePath).isDirectory()) {
        task.savePath = path.join(task.savePath, task.filename);
      } else if (!task.savePath.endsWith(task.filename)) {
        task.savePath = path.join(task.savePath, task.filename);
      }
    } catch {}

    // Check concurrency limit
    const settings = this.store.getSettings();
    const activeCount = tasks.filter(t => t.status === 'downloading').length;

    if (activeCount >= settings.maxConcurrentDownloads) {
      task.status = 'idle';
      this.store.setTask(task);
      this.onTaskUpdateCallback(task);
      return true;
    }

    this.engine.startDownload(task, {
      onProgress: (updatedTask) => {
        this.store.setTask(updatedTask);
        this.onTaskUpdateCallback(updatedTask);
      },
      onCompleted: (completedTask) => {
        this.store.setTask(completedTask);
        this.onTaskUpdateCallback(completedTask);
        this.onTaskCompletedCallback(completedTask);
        this.processNextInQueue();
      },
      onError: (failedTask, error) => {
        this.store.setTask(failedTask);
        this.onTaskUpdateCallback(failedTask);
        this.processNextInQueue();
      },
    });

    this.store.setTask(task);
    this.onTaskUpdateCallback(task);
    return true;
  }

  async pauseTask(id: string): Promise<boolean> {
    const tasks = this.store.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return false;

    const paused = this.engine.pauseDownload(task);
    if (paused) {
      task.status = 'paused';
      this.store.setTask(task);
      this.onTaskUpdateCallback(task);
      this.processNextInQueue();
      return true;
    }
    return false;
  }

  async resumeTask(id: string): Promise<boolean> {
    return this.startTask(id);
  }

  async restartTask(id: string): Promise<boolean> {
    const tasks = this.store.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return false;

    this.engine.cancelDownload(task, true);
    task.downloadedBytes = 0;
    task.progress = 0;
    task.speed = 0;
    task.status = 'idle';
    task.segments = [];

    this.store.setTask(task);
    this.onTaskUpdateCallback(task);
    return this.startTask(id);
  }

  async cancelTask(id: string, deleteFile: boolean = false): Promise<boolean> {
    const tasks = this.store.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return false;

    this.engine.cancelDownload(task, deleteFile);
    this.store.removeTask(id);
    this.onTaskUpdateCallback({ ...task, status: 'cancelled' });
    this.processNextInQueue();
    return true;
  }

  async pauseAll(): Promise<void> {
    const tasks = this.store.getTasks();
    for (const task of tasks) {
      if (task.status === 'downloading') {
        this.pauseTask(task.id);
      }
    }
  }

  async resumeAll(): Promise<void> {
    const tasks = this.store.getTasks();
    for (const task of tasks) {
      if (task.status === 'paused' || task.status === 'idle') {
        await this.startTask(task.id);
      }
    }
  }

  private processNextInQueue(): void {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      const settings = this.store.getSettings();
      const tasks = this.store.getTasks();
      const activeCount = tasks.filter(t => t.status === 'downloading').length;

      if (activeCount < settings.maxConcurrentDownloads) {
        const nextTask = tasks.find(t => t.status === 'idle');
        if (nextTask) {
          this.startTask(nextTask.id);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }
}
