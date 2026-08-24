import { useState, useEffect, useCallback } from 'react';
import { DownloadTask, AppSettings, DownloadCategory, AddDownloadParams, defaultSettings } from '../types/download';

export function useDownloads() {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inspectingTask, setInspectingTask] = useState<DownloadTask | null>(null);
  const [checksumTask, setChecksumTask] = useState<DownloadTask | null>(null);
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
  const [speedHistory, setSpeedHistory] = useState<number[]>(new Array(25).fill(0));

  // Fetch initial state
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getDownloads().then(setTasks).catch(console.error);
      window.electronAPI.getSettings().then(setSettings).catch(console.error);

      // Listen for download updates
      const unsubUpdate = window.electronAPI.onDownloadUpdate((updatedTask) => {
        setTasks((prev) => {
          const idx = prev.findIndex((t) => t.id === updatedTask.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updatedTask;
            return next;
          }
          return [updatedTask, ...prev];
        });

        // Update inspecting modal if currently open for this task
        setInspectingTask((prev) => (prev && prev.id === updatedTask.id ? updatedTask : prev));
      });

      // Listen for clipboard detected URLs
      const unsubClipboard = window.electronAPI.onClipboardUrlDetected((url) => {
        setClipboardUrl(url);
      });

      return () => {
        unsubUpdate();
        unsubClipboard();
      };
    }
  }, []);

  // Update total speed and speed history buffer every 1 second
  const totalSpeed = tasks
    .filter((t) => t.status === 'downloading')
    .reduce((sum, t) => sum + (t.speed || 0), 0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSpeedHistory((prev) => [...prev.slice(1), totalSpeed]);
    }, 1000);
    return () => clearInterval(interval);
  }, [totalSpeed]);

  const addDownload = useCallback(async (params: AddDownloadParams) => {
    if (window.electronAPI) {
      const task = await window.electronAPI.addDownload(params);
      setTasks((prev) => [task, ...prev.filter((t) => t.id !== task.id)]);
      return task;
    }
  }, []);

  const batchAddDownloads = useCallback(async (urls: string[]) => {
    if (window.electronAPI) {
      const newTasks = await window.electronAPI.batchAddDownloads(urls);
      setTasks((prev) => [...newTasks, ...prev]);
      return newTasks;
    }
  }, []);

  const pauseDownload = useCallback(async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.pauseDownload(id);
    }
  }, []);

  const resumeDownload = useCallback(async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.resumeDownload(id);
    }
  }, []);

  const restartDownload = useCallback(async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.restartDownload(id);
    }
  }, []);

  const cancelDownload = useCallback(async (id: string, deleteFile = false) => {
    if (window.electronAPI) {
      await window.electronAPI.cancelDownload(id, deleteFile);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (inspectingTask?.id === id) setInspectingTask(null);
    }
  }, [inspectingTask]);

  const pauseSelected = useCallback(async () => {
    for (const id of selectedIds) {
      await pauseDownload(id);
    }
  }, [selectedIds, pauseDownload]);

  const resumeSelected = useCallback(async () => {
    for (const id of selectedIds) {
      await resumeDownload(id);
    }
  }, [selectedIds, resumeDownload]);

  const deleteSelected = useCallback(async (deleteFile = false) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await cancelDownload(id, deleteFile);
    }
    setSelectedIds(new Set());
  }, [selectedIds, cancelDownload]);

  const pauseAll = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.pauseAll();
    }
  }, []);

  const resumeAll = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.resumeAll();
    }
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    if (window.electronAPI) {
      const updated = await window.electronAPI.updateSettings(partial);
      setSettings(updated);
      return updated;
    }
  }, []);

  const openFile = useCallback(async (savePath: string) => {
    if (window.electronAPI) {
      await window.electronAPI.openFile(savePath);
    }
  }, []);

  const showInFolder = useCallback(async (savePath: string) => {
    if (window.electronAPI) {
      await window.electronAPI.showInFolder(savePath);
    }
  }, []);

  const selectedId = Array.from(selectedIds)[0] || null;

  return {
    tasks,
    settings,
    selectedId,
    selectedIds,
    setSelectedIds,
    setSelectedId: (id: string | null) => setSelectedIds(id ? new Set([id]) : new Set()),
    pauseSelected,
    resumeSelected,
    deleteSelected,
    inspectingTask,
    setInspectingTask,
    checksumTask,
    setChecksumTask,
    clipboardUrl,
    setClipboardUrl,
    speedHistory,
    totalSpeed,
    addDownload,
    batchAddDownloads,
    pauseDownload,
    resumeDownload,
    restartDownload,
    cancelDownload,
    pauseAll,
    resumeAll,
    updateSettings,
    openFile,
    showInFolder,
  };
}
