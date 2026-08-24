import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  FolderOpen, 
  FileCheck, 
  Trash2, 
  Layers, 
  RotateCcw,
  Hash,
  Copy,
  AlertCircle,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Info,
  X
} from 'lucide-react';
import { DownloadTask } from '../types/download';
import { formatBytes, formatSpeed, formatTime } from '../utils/format';

interface DownloadTableProps {
  tasks: DownloadTask[];
  selectedId: string | null;
  selectedIds?: Set<string>;
  onSelectTask: (id: string | null) => void;
  onSelectionChange?: (ids: Set<string>) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRestart: (id: string) => void;
  onDeleteRequest: (task: DownloadTask) => void;
  onDeleteDirect: (id: string, deleteFile: boolean) => void;
  onBatchDelete?: (deleteFiles: boolean) => void;
  onBatchPause?: () => void;
  onBatchResume?: () => void;
  onOpenFile: (path: string) => void;
  onShowInFolder: (path: string) => void;
  onInspectSegments: (task: DownloadTask) => void;
  onCalculateChecksum: (task: DownloadTask) => void;
}

export const DownloadTable: React.FC<DownloadTableProps> = ({
  tasks,
  selectedId,
  selectedIds,
  onSelectTask,
  onSelectionChange,
  onPause,
  onResume,
  onRestart,
  onDeleteDirect,
  onBatchDelete,
  onBatchPause,
  onBatchResume,
  onOpenFile,
  onShowInFolder,
  onInspectSegments,
  onCalculateChecksum,
}) => {
  const [lastAnchorId, setLastAnchorId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    task: DownloadTask | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    task: null,
  });

  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);

  const activeSelected = selectedIds || (selectedId ? new Set([selectedId]) : new Set<string>());

  const handleRowClick = (e: React.MouseEvent, task: DownloadTask, index: number) => {
    if (e.shiftKey && lastAnchorId) {
      const anchorIdx = tasks.findIndex((t) => t.id === lastAnchorId);
      if (anchorIdx >= 0) {
        const start = Math.min(anchorIdx, index);
        const end = Math.max(anchorIdx, index);
        const newSet = e.ctrlKey || e.metaKey ? new Set(activeSelected) : new Set<string>();
        for (let i = start; i <= end; i++) {
          newSet.add(tasks[i].id);
        }
        if (onSelectionChange) onSelectionChange(newSet);
        else onSelectTask(task.id);
        return;
      }
    }

    if (e.ctrlKey || e.metaKey) {
      const next = new Set(activeSelected);
      if (next.has(task.id)) {
        next.delete(task.id);
      } else {
        next.add(task.id);
      }
      setLastAnchorId(task.id);
      if (onSelectionChange) onSelectionChange(next);
      else onSelectTask(next.size > 0 ? Array.from(next)[0] : null);
      return;
    }

    // Normal single click
    setLastAnchorId(task.id);
    if (onSelectionChange) onSelectionChange(new Set([task.id]));
    else onSelectTask(task.id);
  };

  const handleContextMenu = (e: React.MouseEvent, task: DownloadTask) => {
    e.preventDefault();
    if (!activeSelected.has(task.id)) {
      setLastAnchorId(task.id);
      if (onSelectionChange) onSelectionChange(new Set([task.id]));
      else onSelectTask(task.id);
    }
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      task,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, task: null });
  };

  const handleCheckVirusTotal = async (task: DownloadTask) => {
    if (window.electronAPI?.checkVirusTotal) {
      setToastMessage({ type: 'info', text: 'Scanning file hash with VirusTotal...' });
      try {
        const res = await window.electronAPI.checkVirusTotal(task.id);
        if (res && res.success) {
          if (res.stats?.status === 'clean') {
            setToastMessage({ type: 'success', text: `VirusTotal: Clean file (0/${res.stats?.total || 70} Detections)` });
          } else if (res.stats?.status === 'malicious') {
            setToastMessage({ type: 'error', text: `⚠️ Threat Detected! (${res.stats?.malicious} engines flagged)` });
          } else if (res.stats?.status === 'suspicious') {
            setToastMessage({ type: 'error', text: `⚠️ Suspicious file (${res.stats?.suspicious} detections)` });
          } else if (res.stats?.status === 'not_found') {
            setToastMessage({ type: 'info', text: 'File hash not yet in VirusTotal database (Uncataloged)' });
          } else {
            setToastMessage({ type: 'success', text: 'VirusTotal scan complete' });
          }
          setTimeout(() => setToastMessage(null), 4500);
        } else {
          setToastMessage({ type: 'error', text: res?.error || 'Failed to scan on VirusTotal' });
          setTimeout(() => setToastMessage(null), 4500);
        }
      } catch (err: any) {
        setToastMessage({ type: 'error', text: err.message || 'VirusTotal request failed' });
        setTimeout(() => setToastMessage(null), 4500);
      }
    }
  };

  return (
    <div
      className="flex-1 flex flex-col h-full bg-theme-main overflow-hidden text-xs select-none relative"
      onClick={closeContextMenu}
    >
      {/* Toast Notification Banner - Bottom Right Flat Style */}
      {toastMessage && (
        <div className="absolute bottom-4 right-4 z-50 px-3 py-2 rounded-md bg-theme-surface border border-theme-border text-theme-text flex items-center space-x-2.5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 shadow-none">
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
          ) : toastMessage.type === 'success' ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          ) : (
            <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          )}
          <span className="font-medium pr-1 text-theme-text">{toastMessage.text}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setToastMessage(null);
            }}
            className="p-0.5 rounded hover:bg-theme-hover text-theme-muted hover:text-theme-text transition cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table Header Bar */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-theme-surface border-b border-theme-border text-theme-muted font-medium text-[11px] select-none uppercase tracking-wider">
        <div className="col-span-4">File Name & Source</div>
        <div className="col-span-2">Size / Cat</div>
        <div className="col-span-3">Progress & Streams</div>
        <div className="col-span-1 text-right">Speed</div>
        <div className="col-span-1 text-right">ETA</div>
        <div className="col-span-1 text-center">Action</div>
      </div>

      {/* Task Rows List */}
      <div className="flex-1 overflow-y-auto divide-y divide-theme-border">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-theme-sub space-y-2">
            <Activity className="w-8 h-8 opacity-40 text-brand" />
            <p className="font-medium text-xs">No downloads in this queue</p>
            <p className="text-[11px]">Click "+ Add URL" to begin high-speed parallel downloads</p>
          </div>
        ) : (
          tasks.map((task, index) => {
            const isSelected = activeSelected.has(task.id);
            const isDownloading = task.status === 'downloading';
            const isCompleted = task.status === 'completed';
            const isPaused = task.status === 'paused' || task.status === 'idle';
            const isError = task.status === 'error';

            return (
              <div
                key={task.id}
                onClick={(e) => handleRowClick(e, task, index)}
                onContextMenu={(e) => handleContextMenu(e, task)}
                onDoubleClick={() => {
                  if (isCompleted) {
                    onOpenFile(task.savePath);
                  } else if (isPaused) {
                    onResume(task.id);
                  } else if (isDownloading) {
                    onPause(task.id);
                  }
                }}
                className={`grid grid-cols-12 gap-2 px-3 py-2.5 items-center transition cursor-pointer border-l-2 ${
                  isSelected
                    ? 'bg-theme-card border-l-brand'
                    : 'border-l-transparent hover:bg-theme-card/60'
                }`}
              >
                {/* File Name & URL & Security Badge */}
                <div className="col-span-4 min-w-0 pr-2">
                  <div className="flex items-center space-x-2">
                    {/* Blue dot for downloading, Green dot for completed */}
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isDownloading ? 'bg-blue-500 shadow-sm shadow-blue-500/50 animate-pulse' :
                      isCompleted ? 'bg-emerald-500' :
                      isPaused ? 'bg-amber-400' :
                      isError ? 'bg-rose-500' : 'bg-theme-sub'
                    }`} />
                    <span className="font-medium text-theme-text truncate" title={task.filename}>
                      {task.filename}
                    </span>
                    
                    {/* VirusTotal Security Badges */}
                    {task.virusTotalStatus === 'clean' && (
                      <a
                        href={task.virusTotalScore?.permalink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1 text-[9px] px-1.5 py-0.2 rounded font-mono font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 hover:underline flex-shrink-0"
                        title={`VirusTotal: Clean file (0/${task.virusTotalScore?.total || 70} detections)`}
                      >
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>Clean {task.virusTotalScore?.total ? `(0/${task.virusTotalScore.total})` : '(0/70+)'}</span>
                      </a>
                    )}

                    {task.virusTotalStatus === 'not_found' && (
                      <a
                        href={task.virusTotalScore?.permalink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1 text-[9px] px-1.5 py-0.2 rounded font-mono font-medium bg-theme-border text-theme-muted hover:underline flex-shrink-0"
                        title="VirusTotal: File hash uncataloged (clean/new file)"
                      >
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>Uncataloged</span>
                      </a>
                    )}

                    {(task.virusTotalStatus === 'malicious' || task.virusTotalStatus === 'suspicious') && (
                      <a
                        href={task.virusTotalScore?.permalink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:underline flex-shrink-0"
                        title={`⚠️ VirusTotal Alert: ${task.virusTotalScore?.malicious || 0} security engines flagged this file!`}
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                        <span>{task.virusTotalScore?.malicious || 1} Flags</span>
                      </a>
                    )}

                    {task.virusTotalStatus === 'scanning' && (
                      <span className="inline-flex items-center space-x-1 text-[9px] px-1.5 py-0.2 rounded font-mono bg-brand/10 text-brand border border-brand/20 flex-shrink-0">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        <span>Scanning...</span>
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-theme-muted font-mono truncate pl-4 mt-0.5" title={task.url}>
                    {task.url}
                  </div>
                </div>

                {/* Size / Category */}
                <div className="col-span-2 text-theme-muted font-mono text-[11px]">
                  <div>
                    {task.fileSize > 0
                      ? `${formatBytes(task.downloadedBytes)} / ${formatBytes(task.fileSize)}`
                      : formatBytes(task.downloadedBytes)}
                  </div>
                  <div className="text-[10px] text-theme-sub capitalize">{task.category}</div>
                </div>

                {/* Progress Bar & Streams */}
                <div className="col-span-3 pr-2">
                  <div className="flex items-center justify-between text-[10px] text-theme-muted mb-1 font-mono">
                    <span>
                      {task.status === 'completed' ? (
                        <span className="text-emerald-500 font-semibold">100%</span>
                      ) : task.status === 'error' ? (
                        <span className="text-rose-500">{task.errorMessage || 'Failed'}</span>
                      ) : (
                        `${task.progress.toFixed(1)}%`
                      )}
                    </span>
                    <span className="flex items-center space-x-1 text-[10px]">
                      <Layers className="w-2.5 h-2.5" />
                      <span>{task.segmentsCount || 1} streams</span>
                    </span>
                  </div>

                  {/* High Quality Flat Segmented Progress Bar */}
                  <div className="w-full bg-theme-surface h-1.5 rounded-full overflow-hidden border border-theme-border flex">
                    {task.segments && task.segments.length > 0 ? (
                      task.segments.map((seg, idx) => {
                        return (
                          <div
                            key={idx}
                            className="h-full flex-1 bg-theme-main relative border-r border-theme-border/40 last:border-r-0"
                          >
                            <div
                              style={{ width: `${seg.progress}%` }}
                              className={`h-full transition-all duration-200 ${
                                isCompleted
                                  ? 'bg-emerald-500'
                                  : isDownloading
                                  ? 'bg-brand'
                                  : isPaused
                                  ? 'bg-amber-400'
                                  : isError
                                  ? 'bg-rose-500'
                                  : 'bg-theme-sub'
                              }`}
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div
                        style={{ width: `${task.progress}%` }}
                        className={`h-full transition-all duration-200 ${
                          isCompleted
                            ? 'bg-emerald-500'
                            : isDownloading
                            ? 'bg-brand'
                            : isPaused
                            ? 'bg-amber-400'
                            : isError
                            ? 'bg-rose-500'
                            : 'bg-theme-sub'
                        }`}
                      />
                    )}
                  </div>
                </div>

                {/* Download Speed */}
                <div className="col-span-1 text-right font-mono text-[11px]">
                  {isDownloading && task.speed && task.speed > 0 ? (
                    <span className="text-brand font-medium">{formatSpeed(task.speed)}</span>
                  ) : (
                    <span className="text-theme-sub">--</span>
                  )}
                </div>

                {/* ETA */}
                <div className="col-span-1 text-right font-mono text-[11px] text-theme-muted">
                  {isDownloading && task.eta !== undefined && task.eta > 0 ? (
                    formatTime(task.eta)
                  ) : isCompleted ? (
                    <span className="text-emerald-500 font-medium">Done</span>
                  ) : (
                    '--'
                  )}
                </div>

                {/* Row Quick Action Buttons */}
                <div className="col-span-1 flex items-center justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  {isDownloading ? (
                    <button
                      onClick={() => onPause(task.id)}
                      className="p-1 rounded hover:bg-theme-surface text-theme-muted hover:text-amber-500 transition cursor-pointer"
                      title="Pause Download"
                    >
                      <Pause className="w-3 h-3" />
                    </button>
                  ) : isCompleted ? (
                    <button
                      onClick={() => onOpenFile(task.savePath)}
                      className="p-1 rounded hover:bg-theme-surface text-theme-muted hover:text-emerald-500 transition cursor-pointer"
                      title="Open File"
                    >
                      <FileCheck className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onResume(task.id)}
                      className="p-1 rounded hover:bg-theme-surface text-theme-muted hover:text-brand transition cursor-pointer"
                      title="Resume Download"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    onClick={() => onShowInFolder(task.savePath)}
                    className="p-1 rounded hover:bg-theme-surface text-theme-muted hover:text-theme-text transition cursor-pointer"
                    title="Show in Folder"
                  >
                    <FolderOpen className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Right-Click Context Menu */}
      {contextMenu.visible && contextMenu.task && (
        <div
          className="fixed bg-theme-surface border border-theme-border rounded-lg shadow-xl py-1 z-50 text-xs w-52 font-medium select-none"
          style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 220) }}
          onClick={(e) => e.stopPropagation()}
        >
          {activeSelected.size > 1 ? (
            <>
              <div className="px-3 py-1 text-[10px] text-theme-muted border-b border-theme-border font-semibold uppercase tracking-wider">
                {activeSelected.size} Items Selected
              </div>
              <button
                onClick={() => {
                  if (onBatchResume) onBatchResume();
                  else {
                    for (const id of activeSelected) onResume(id);
                  }
                  closeContextMenu();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-brand transition cursor-pointer"
              >
                <Play className="w-3 h-3 text-brand" />
                <span>Resume ({activeSelected.size} Selected)</span>
              </button>
              <button
                onClick={() => {
                  if (onBatchPause) onBatchPause();
                  else {
                    for (const id of activeSelected) onPause(id);
                  }
                  closeContextMenu();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-amber-500 transition cursor-pointer"
              >
                <Pause className="w-3 h-3 text-amber-500" />
                <span>Pause ({activeSelected.size} Selected)</span>
              </button>
              <button
                onClick={() => {
                  const selTasks = tasks.filter((t) => activeSelected.has(t.id));
                  const urls = selTasks.map((t) => t.url).join('\n');
                  navigator.clipboard.writeText(urls);
                  setToastMessage({ type: 'success', text: `Copied ${selTasks.length} URLs to clipboard` });
                  setTimeout(() => setToastMessage(null), 3000);
                  closeContextMenu();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-theme-text transition cursor-pointer"
              >
                <Copy className="w-3 h-3 text-theme-muted" />
                <span>Copy {activeSelected.size} URLs</span>
              </button>
              <div className="h-[1px] bg-theme-border my-1" />
              <button
                onClick={() => {
                  if (onBatchDelete) onBatchDelete(false);
                  closeContextMenu();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-theme-text transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-theme-muted" />
                <span>Remove ({activeSelected.size}) from List</span>
              </button>
              <button
                onClick={() => {
                  if (onBatchDelete) onBatchDelete(true);
                  closeContextMenu();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-rose-500/15 text-rose-500 transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-rose-500" />
                <span>Delete ({activeSelected.size}) Files from Disk</span>
              </button>
            </>
          ) : (
            <>
              {contextMenu.task.status === 'downloading' ? (
                <button
                  onClick={() => {
                    if (contextMenu.task) onPause(contextMenu.task.id);
                    closeContextMenu();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-theme-text transition cursor-pointer"
                >
                  <Pause className="w-3 h-3 text-amber-500" />
                  <span>Pause</span>
                </button>
              ) : contextMenu.task.status === 'completed' ? (
                <button
                  onClick={() => {
                    if (contextMenu.task) onRestart(contextMenu.task.id);
                    closeContextMenu();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-theme-text transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-theme-muted" />
                  <span>Redownload</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (contextMenu.task) onResume(contextMenu.task.id);
                    closeContextMenu();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-theme-text transition cursor-pointer"
                >
                  <Play className="w-3 h-3 text-brand" />
                  <span>Resume</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (contextMenu.task) onOpenFile(contextMenu.task.savePath);
                  closeContextMenu();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-theme-text transition cursor-pointer"
              >
                <FileCheck className="w-3 h-3 text-emerald-500" />
                <span>Open File</span>
              </button>

              <button
                onClick={() => {
                  if (contextMenu.task) onShowInFolder(contextMenu.task.savePath);
                  closeContextMenu();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-theme-text transition cursor-pointer"
              >
                <FolderOpen className="w-3 h-3 text-theme-muted" />
                <span>Show in Folder</span>
              </button>

              <button
                onClick={() => {
                  if (contextMenu.task) onInspectSegments(contextMenu.task);
                  closeContextMenu();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-theme-text transition cursor-pointer"
              >
                <Layers className="w-3 h-3 text-brand" />
                <span>Stream Inspector</span>
              </button>

              <button
                onClick={() => {
                  if (contextMenu.task) onCalculateChecksum(contextMenu.task);
                  closeContextMenu();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-theme-text transition cursor-pointer"
              >
                <Hash className="w-3 h-3 text-theme-muted" />
                <span>Verify Checksum</span>
              </button>

              {/* VirusTotal Check option */}
              {contextMenu.task.status === 'completed' && (
                <button
                  onClick={() => {
                    if (contextMenu.task) handleCheckVirusTotal(contextMenu.task);
                    closeContextMenu();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-theme-text transition cursor-pointer"
                >
                  <ShieldCheck className="w-3 h-3 text-brand" />
                  <span>Scan on VirusTotal</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (contextMenu.task) navigator.clipboard.writeText(contextMenu.task.url);
                  closeContextMenu();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-theme-text transition cursor-pointer"
              >
                <Copy className="w-3 h-3 text-theme-muted" />
                <span>Copy URL</span>
              </button>

              <div className="h-[1px] bg-theme-border my-1" />

              <button
                onClick={() => {
                  if (contextMenu.task) onDeleteDirect(contextMenu.task.id, false);
                  closeContextMenu();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-theme-hover text-theme-text transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-theme-muted" />
                <span>Remove from List</span>
              </button>

              <button
                onClick={() => {
                  if (contextMenu.task) onDeleteDirect(contextMenu.task.id, true);
                  closeContextMenu();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-rose-500/15 text-rose-500 transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-rose-500" />
                <span>Delete File from Disk</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
