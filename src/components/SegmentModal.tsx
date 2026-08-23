import React from 'react';
import { X, Layers, Activity, Cpu, HardDrive, RefreshCw } from 'lucide-react';
import { DownloadTask } from '../types/download';
import { formatBytes, formatSpeed, formatTime } from '../utils/format';

interface SegmentModalProps {
  task: DownloadTask | null;
  onClose: () => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

export const SegmentModal: React.FC<SegmentModalProps> = ({
  task,
  onClose,
  onPause,
  onResume,
}) => {
  if (!task) return null;

  const isDownloading = task.status === 'downloading';
  const isCompleted = task.status === 'completed';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none text-xs">
      <div className="w-full max-w-2xl bg-theme-surface border border-theme-border rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-theme-card border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-brand/15 text-brand flex items-center justify-center border border-brand/30">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-theme-text flex items-center space-x-2">
                <span>Parallel Stream Allocation</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-theme-main text-theme-muted font-mono border border-theme-border">
                  {task.segmentsCount} Streams
                </span>
              </h3>
              <p className="text-[11px] text-theme-muted truncate max-w-md">
                {task.filename}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-theme-hover text-theme-muted hover:text-theme-text transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* KPI Tiles */}
          <div className="grid grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-lg bg-theme-card border border-theme-border">
              <div className="flex items-center space-x-1.5 text-[11px] text-theme-muted mb-0.5">
                <Activity className="w-3 h-3 text-brand" />
                <span>Speed</span>
              </div>
              <div className="text-sm font-mono font-bold text-blue-500 dark:text-blue-400">
                {isDownloading ? formatSpeed(task.speed) : '--'}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-theme-card border border-theme-border">
              <div className="flex items-center space-x-1.5 text-[11px] text-theme-muted mb-0.5">
                <HardDrive className="w-3 h-3 text-brand" />
                <span>Transferred</span>
              </div>
              <div className="text-sm font-mono font-bold text-theme-text">
                {formatBytes(task.downloadedBytes)}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-theme-card border border-theme-border">
              <div className="flex items-center space-x-1.5 text-[11px] text-theme-muted mb-0.5">
                <Cpu className="w-3 h-3 text-brand" />
                <span>Progress</span>
              </div>
              <div className="text-sm font-mono font-bold text-brand">
                {task.progress}%
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-theme-card border border-theme-border">
              <div className="flex items-center space-x-1.5 text-[11px] text-theme-muted mb-0.5">
                <RefreshCw className="w-3 h-3 text-brand" />
                <span>Remaining ETA</span>
              </div>
              <div className="text-sm font-mono font-bold text-theme-text">
                {isDownloading && task.eta > 0 ? formatTime(task.eta) : isCompleted ? 'Done' : '--'}
              </div>
            </div>
          </div>

          {/* Segment Blocks Visualizer Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-theme-muted font-medium">
              <span>Overall Stream Partitioning</span>
              <span className="font-mono text-theme-text">{task.progress}% Complete</span>
            </div>
            <div className="h-4 bg-theme-main rounded-md overflow-hidden p-[2px] border border-theme-border flex gap-[2px]">
              {task.segments && task.segments.length > 0 ? (
                task.segments.map((seg, idx) => {
                  const threadColors = [
                    'bg-sky-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-amber-500',
                    'bg-rose-500', 'bg-cyan-400', 'bg-purple-500', 'bg-teal-400'
                  ];
                  const threadColor = threadColors[idx % threadColors.length];

                  return (
                    <div
                      key={idx}
                      className="h-full flex-1 bg-theme-card rounded-[2px] overflow-hidden relative"
                      title={`Stream #${idx + 1}: ${seg.progress}%`}
                    >
                      <div
                        style={{ width: `${seg.progress}%` }}
                        className={`h-full transition-all duration-150 ${
                          isCompleted ? 'bg-emerald-500' :
                          `${threadColor} ${isDownloading && seg.progress < 100 ? 'segment-active' : ''}`
                        }`}
                      />
                    </div>
                  );
                })
              ) : (
                <div
                  style={{ width: `${task.progress}%` }}
                  className="h-full bg-emerald-500 rounded-[2px] transition-all"
                />
              )}
            </div>
          </div>

          {/* Stream Threads Table */}
          <div className="border border-theme-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-theme-card border-b border-theme-border text-[11px] font-semibold text-theme-muted uppercase tracking-wider">
              <div className="col-span-2">Stream</div>
              <div className="col-span-3">Byte Range</div>
              <div className="col-span-2">Downloaded</div>
              <div className="col-span-3">Progress</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            <div className="divide-y divide-theme-borderSubtle max-h-56 overflow-y-auto bg-theme-surface">
              {task.segments && task.segments.length > 0 ? (
                task.segments.map((seg) => {
                  const threadColors = [
                    'text-sky-500', 'text-emerald-500', 'text-indigo-500', 'text-amber-500',
                    'text-rose-500', 'text-cyan-400', 'text-purple-500', 'text-teal-400'
                  ];
                  const threadColor = threadColors[seg.id % threadColors.length];

                  return (
                    <div
                      key={seg.id}
                      className="grid grid-cols-12 gap-2 px-3 py-2 items-center font-mono text-[11px] hover:bg-theme-card transition"
                    >
                      <div className="col-span-2 flex items-center space-x-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          seg.status === 'downloading' ? 'bg-blue-500 animate-pulse' :
                          seg.status === 'completed' ? 'bg-emerald-500' : 'bg-theme-sub'
                        }`} />
                        <span className={`font-semibold ${threadColor}`}>#{seg.id + 1}</span>
                      </div>

                      <div className="col-span-3 text-theme-muted truncate text-[10px]">
                        {formatBytes(seg.start)} - {formatBytes(seg.end)}
                      </div>

                      <div className="col-span-2 text-theme-text font-medium">
                        {formatBytes(seg.downloaded)}
                      </div>

                      <div className="col-span-3 pr-2">
                        <div className="flex justify-between text-[10px] text-theme-muted mb-0.5">
                          <span>{seg.progress}%</span>
                          {seg.speed > 0 && (
                            <span className="text-blue-500 dark:text-blue-400">{formatSpeed(seg.speed)}</span>
                          )}
                        </div>
                        <div className="w-full h-1.5 bg-theme-main rounded-full overflow-hidden">
                          <div
                            style={{ width: `${seg.progress}%` }}
                            className={`h-full rounded-full transition-all duration-150 ${
                              seg.status === 'completed' ? 'bg-emerald-500' :
                              'bg-blue-500'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="col-span-2 text-right text-[10px] capitalize">
                        <span className={`px-1.5 py-0.5 rounded font-sans ${
                          seg.status === 'downloading' ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20' :
                          seg.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          'bg-theme-main text-theme-muted border border-theme-border'
                        }`}>
                          {seg.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-theme-muted">
                  Single stream download
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-theme-card border-t border-theme-border flex items-center justify-between">
          <div className="text-[11px] text-theme-muted">
            MDM Multi-Thread Range Stream Engine
          </div>
          <div className="flex items-center space-x-2">
            {isDownloading ? (
              <button
                onClick={() => onPause(task.id)}
                className="px-3 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 font-medium transition cursor-pointer"
              >
                Pause Task
              </button>
            ) : !isCompleted ? (
              <button
                onClick={() => onResume(task.id)}
                className="px-3 py-1.5 rounded-md bg-[#84ce19] hover:bg-[#73b814] text-[#0a1f01] font-semibold transition cursor-pointer"
              >
                Resume Task
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-hover border border-theme-border text-theme-text font-medium transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
