import React from 'react';
import { 
  FolderArchive, 
  AppWindow, 
  Film, 
  Music, 
  FileText, 
  Image as ImageIcon, 
  Folder, 
  Download, 
  CheckCircle2, 
  Clock, 
  ListFilter,
  AlertCircle,
  Plus,
  Layers,
  Settings as SettingsIcon,
  HardDrive
} from 'lucide-react';
import { DownloadCategory, DownloadTask } from '../types/download';
import { formatBytes, formatSpeed } from '../utils/format';

interface SidebarProps {
  currentView: 'downloads' | 'add-url' | 'batch-add' | 'settings';
  onNavigate: (view: 'downloads' | 'add-url' | 'batch-add' | 'settings') => void;
  currentCategory: DownloadCategory | 'downloading' | 'completed' | 'queued' | 'error';
  onSelectCategory: (cat: DownloadCategory | 'downloading' | 'completed' | 'queued' | 'error') => void;
  tasks: DownloadTask[];
  totalSpeed: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  currentCategory,
  onSelectCategory,
  tasks,
  totalSpeed,
}) => {
  const getCount = (filter: string) => {
    if (filter === 'all') return tasks.length;
    if (filter === 'downloading') return tasks.filter(t => t.status === 'downloading').length;
    if (filter === 'completed') return tasks.filter(t => t.status === 'completed').length;
    if (filter === 'queued') return tasks.filter(t => t.status === 'idle' || t.status === 'paused').length;
    if (filter === 'error') return tasks.filter(t => t.status === 'error').length;
    return tasks.filter(t => t.category === filter).length;
  };

  const statusItems = [
    { id: 'all', label: 'Downloads', icon: ListFilter, count: getCount('all'), dotColor: 'bg-slate-400 dark:bg-slate-500' },
    { id: 'downloading', label: 'Downloading', icon: Download, count: getCount('downloading'), dotColor: 'bg-blue-500' },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, count: getCount('completed'), dotColor: 'bg-emerald-500' },
    { id: 'queued', label: 'Paused / Queued', icon: Clock, count: getCount('queued'), dotColor: 'bg-amber-400' },
    { id: 'error', label: 'Errors / Failed', icon: AlertCircle, count: getCount('error'), dotColor: 'bg-rose-500' },
  ];

  const categoryItems = [
    { id: 'compressed', label: 'Compressed', icon: FolderArchive, count: getCount('compressed') },
    { id: 'programs', label: 'Programs', icon: AppWindow, count: getCount('programs') },
    { id: 'video', label: 'Video', icon: Film, count: getCount('video') },
    { id: 'audio', label: 'Audio', icon: Music, count: getCount('audio') },
    { id: 'documents', label: 'Documents', icon: FileText, count: getCount('documents') },
    { id: 'images', label: 'Images', icon: ImageIcon, count: getCount('images') },
    { id: 'others', label: 'Others', icon: Folder, count: getCount('others') },
  ];

  const totalDownloaded = tasks.reduce((sum, t) => sum + (t.downloadedBytes || 0), 0);

  return (
    <aside className="w-56 bg-theme-surface border-r border-theme-border flex flex-col justify-between select-none h-full text-xs transition-colors duration-200">
      {/* Navigation Sections */}
      <div className="p-2.5 space-y-4 overflow-y-auto">
        {/* Status Group */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-theme-sub px-2 mb-1">
            Status
          </div>
          <div className="space-y-0.5">
            {statusItems.map((item) => {
              const Icon = item.icon;
              const isSelected = currentView === 'downloads' && currentCategory === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate('downloads');
                    onSelectCategory(item.id as any);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? 'bg-theme-card text-theme-text border border-theme-border shadow-xs'
                      : 'text-theme-muted hover:bg-theme-hover hover:text-theme-text border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {item.dotColor ? (
                      <span className={`w-1.5 h-1.5 rounded-full ${item.dotColor} ${item.id === 'downloading' && item.count > 0 ? 'animate-pulse' : ''}`} />
                    ) : (
                      <Icon className="w-3.5 h-3.5 opacity-70" />
                    )}
                    <span>{item.label}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${item.id === 'error' && item.count > 0 ? 'bg-rose-500/15 text-rose-500 font-semibold' : 'text-theme-muted'}`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories Group */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-theme-sub px-2 mb-1">
            Categories
          </div>
          <div className="space-y-0.5">
            {categoryItems.map((item) => {
              const Icon = item.icon;
              const isSelected = currentView === 'downloads' && currentCategory === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate('downloads');
                    onSelectCategory(item.id as any);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? 'bg-theme-card text-theme-text border border-theme-border shadow-xs'
                      : 'text-theme-muted hover:bg-theme-hover hover:text-theme-text border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-3.5 h-3.5 opacity-70" />
                    <span>{item.label}</span>
                  </div>
                  {item.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono text-theme-muted">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
