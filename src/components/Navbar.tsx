import React from 'react';
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Settings as SettingsIcon, 
  Gauge, 
  Layers,
  Search,
  Sun,
  Moon,
  ArrowLeft
} from 'lucide-react';
import { DownloadCategory } from '../types/download';

interface NavbarProps {
  currentView: 'downloads' | 'add-url' | 'batch-add' | 'settings';
  currentCategory: DownloadCategory | 'downloading' | 'completed' | 'queued' | 'error';
  onNavigate: (view: 'downloads' | 'add-url' | 'batch-add' | 'settings') => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
  selectedId: string | null;
  selectedCount?: number;
  onDeleteSelected: () => void;
  onPauseSelected: () => void;
  onResumeSelected: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  speedLimitEnabled: boolean;
  onToggleSpeedLimit: () => void;
  activeDownloadsCount: number;
  totalSpeed: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  currentCategory,
  onNavigate,
  onPauseAll,
  onResumeAll,
  selectedId,
  selectedCount = 0,
  onDeleteSelected,
  onPauseSelected,
  onResumeSelected,
  searchQuery,
  onSearchChange,
  speedLimitEnabled,
  onToggleSpeedLimit,
  activeDownloadsCount,
  theme,
  onToggleTheme,
}) => {
  const getSubTitle = () => {
    if (currentView === 'add-url') return 'Add URL';
    if (currentView === 'batch-add') return 'Batch Add';
    if (currentView === 'settings') return 'Settings';

    switch (currentCategory) {
      case 'downloading':
        return 'Downloading';
      case 'completed':
        return 'Completed';
      case 'queued':
        return 'Paused';
      case 'error':
        return 'Errors';
      case 'compressed':
        return 'Compressed';
      case 'programs':
        return 'Programs';
      case 'video':
        return 'Video';
      case 'audio':
        return 'Audio';
      case 'documents':
        return 'Documents';
      case 'images':
        return 'Images';
      case 'others':
        return 'Others';
      default:
        return 'Downloads';
    }
  };

  return (
    <header className="h-12 border-b border-theme-border bg-theme-surface flex items-center justify-between select-none text-xs transition-colors duration-200">
      {/* Left Group */}
      <div className="flex items-center h-full">
        {/* Left Breadcrumb Section - EXACT match to Sidebar width (w-56) with border-r */}
        <div className="w-56 h-full border-r border-theme-border flex items-center justify-between px-3 flex-shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <button
              onClick={() => onNavigate('downloads')}
              className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0 shadow-sm flex items-center justify-center cursor-pointer hover:opacity-90 transition"
              title="MDM - Download Manager"
            >
              <svg viewBox="0 0 322.95 322.95" className="w-full h-full">
                <rect fill="#84ce19" width="322.95" height="322.95" rx="65.71" ry="65.71" />
                <path fill="#ffffff" d="M156.33,173.36h0c-7.08,0-12.81-5.74-12.81-12.81v-69.14c0-11.46-13.9-17.16-21.94-8.99l-68.04,69.14c-7.97,8.1-2.23,21.8,9.13,21.8h41.67c7.08,0,12.81,5.74,12.81,12.81v69.14c0,11.46,13.9,17.16,21.94,8.99l85.73-87.12c2.41-2.45,5.7-3.83,9.13-3.83h26.37c7.08,0,12.81-5.74,12.81-12.81v-69.14c0-11.46-13.9-17.16-21.94-8.99l-85.73,87.12c-2.41,2.45-5.7,3.83-9.13,3.83Z" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-1.5 text-xs truncate">
              <button
                onClick={() => onNavigate('downloads')}
                className="font-bold text-theme-text hover:text-brand transition cursor-pointer tracking-tight text-[13px]"
                title="MDM - Download Manager"
              >
                MDM
              </button>
              <span className="text-theme-muted">/</span>
              <span className="text-theme-muted font-medium truncate">{getSubTitle()}</span>
            </div>
          </div>

          {currentView === 'downloads' && activeDownloadsCount > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/30 font-mono font-semibold flex-shrink-0">
              {activeDownloadsCount}
            </span>
          )}
        </div>

        {/* Toolbar Buttons - Statically Anchored right after sidebar border */}
        <div className="px-3 flex items-center space-x-1.5">
          {currentView === 'downloads' ? (
            <>
              <button
                onClick={() => onNavigate('add-url')}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#84ce19] hover:bg-[#73b814] active:scale-95 text-[#0a1f01] font-semibold transition cursor-pointer shadow-sm"
                title="Add URL (Ctrl+N)"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add URL</span>
              </button>

              <button
                onClick={() => onNavigate('batch-add')}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-theme-card hover:bg-theme-hover border border-theme-border text-theme-text transition cursor-pointer font-medium"
                title="Add Batch URLs"
              >
                <Layers className="w-3.5 h-3.5 text-brand" />
                <span>Batch Add</span>
              </button>

              <div className="h-4 w-[1px] bg-theme-border mx-1" />

              <button
                onClick={onResumeAll}
                className="p-1.5 rounded-md hover:bg-theme-hover text-theme-muted hover:text-brand transition cursor-pointer border border-transparent hover:border-theme-border"
                title="Resume All Downloads"
              >
                <Play className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onPauseAll}
                className="p-1.5 rounded-md hover:bg-theme-hover text-theme-muted hover:text-amber-500 transition cursor-pointer border border-transparent hover:border-theme-border"
                title="Pause All Downloads"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>

              {(selectedId || selectedCount > 0) && (
                <>
                  <div className="h-4 w-[1px] bg-theme-border mx-1" />
                  <button
                    onClick={onResumeSelected}
                    className="flex items-center space-x-1 px-2 py-1 rounded-md bg-theme-card hover:bg-theme-hover text-brand transition cursor-pointer border border-theme-border text-xs"
                    title={selectedCount > 1 ? `Resume ${selectedCount} Selected` : "Resume Selected"}
                  >
                    <Play className="w-3.5 h-3.5" />
                    {selectedCount > 1 && <span className="font-mono text-[10px]">{selectedCount}</span>}
                  </button>
                  <button
                    onClick={onPauseSelected}
                    className="flex items-center space-x-1 px-2 py-1 rounded-md bg-theme-card hover:bg-theme-hover text-amber-500 transition cursor-pointer border border-theme-border text-xs"
                    title={selectedCount > 1 ? `Pause ${selectedCount} Selected` : "Pause Selected"}
                  >
                    <Pause className="w-3.5 h-3.5" />
                    {selectedCount > 1 && <span className="font-mono text-[10px]">{selectedCount}</span>}
                  </button>
                  <button
                    onClick={onDeleteSelected}
                    className="flex items-center space-x-1 px-2 py-1 rounded-md bg-theme-card hover:bg-rose-500/15 text-rose-500 transition cursor-pointer border border-theme-border text-xs"
                    title={selectedCount > 1 ? `Delete ${selectedCount} Selected` : "Delete Selected"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {selectedCount > 1 && <span className="font-mono text-[10px]">{selectedCount}</span>}
                  </button>
                </>
              )}

              <div className="h-4 w-[1px] bg-theme-border mx-1" />

              <button
                onClick={onToggleSpeedLimit}
                className={`flex items-center space-x-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer ${
                  speedLimitEnabled 
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 dark:text-amber-400' 
                    : 'border-transparent text-theme-muted hover:text-theme-text hover:border-theme-border'
                }`}
                title="Toggle Speed Limiter"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>Speed Limit</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigate('downloads')}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-theme-card hover:bg-theme-hover border border-theme-border text-theme-text transition cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Downloads</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Search & Utilities */}
      <div className="px-3 flex items-center space-x-2">
        {/* Search Bar (in Downloads view) */}
        {currentView === 'downloads' && (
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-theme-sub" />
            <input
              type="text"
              placeholder="Search downloads..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-64 md:w-80 bg-theme-card border border-theme-border rounded-md pl-8 pr-16 py-1.5 text-xs text-theme-text placeholder-theme-sub focus:outline-none focus:border-brand transition shadow-xs"
            />
            <kbd className="absolute right-2 text-[10px] px-1.5 py-0.5 rounded bg-theme-main border border-theme-border text-theme-sub font-mono pointer-events-none">
              Ctrl K
            </kbd>
          </div>
        )}

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md border border-theme-border bg-theme-card hover:bg-theme-hover text-theme-muted hover:text-theme-text transition cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
          )}
        </button>

        {/* Settings Toggle */}
        <button
          onClick={() => onNavigate(currentView === 'settings' ? 'downloads' : 'settings')}
          className={`p-1.5 rounded-md border transition cursor-pointer ${
            currentView === 'settings'
              ? 'bg-theme-hover border-theme-border text-theme-text shadow-xs'
              : 'border-theme-border bg-theme-card hover:bg-theme-hover text-theme-muted hover:text-theme-text'
          }`}
          title={currentView === 'settings' ? 'Back to Downloads' : 'Settings'}
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
