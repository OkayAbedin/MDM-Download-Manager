import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DownloadTable } from './components/DownloadTable';
import { SettingsPage } from './components/SettingsPage';
import { AddDownloadPage } from './components/AddDownloadPage';
import { BatchAddPage } from './components/BatchAddPage';
import { SegmentModal } from './components/SegmentModal';
import { ChecksumModal } from './components/ChecksumModal';
import { ClipboardPrompt } from './components/ClipboardPrompt';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SpeedGraph } from './components/SpeedGraph';
import { useDownloads } from './hooks/useDownloads';
import { DownloadCategory, DownloadTask } from './types/download';
import { formatSpeed } from './utils/format';
import { Activity, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const {
    tasks,
    settings,
    selectedId,
    setSelectedId,
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
  } = useDownloads();

  const [currentView, setCurrentView] = useState<'downloads' | 'add-url' | 'batch-add' | 'settings'>('downloads');
  const [currentCategory, setCurrentCategory] = useState<DownloadCategory | 'downloading' | 'completed' | 'queued' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addInitialUrl, setAddInitialUrl] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<DownloadTask | null>(null);

  // Theme Management (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('mdm_theme') as 'dark' | 'light') || settings.theme || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('mdm_theme', theme);
    window.electronAPI.setTheme?.(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    updateSettings({ theme: nextTheme });
  };

  // Keyboard shortcuts: Ctrl+K (search), Ctrl+N (new download), Delete (remove selected)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCurrentView('downloads');
        const searchInput = document.querySelector('input[placeholder="Search downloads..."]') as HTMLInputElement;
        searchInput?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setAddInitialUrl('');
        setCurrentView('add-url');
      } else if (e.key === 'Delete' && selectedId) {
        const task = tasks.find(t => t.id === selectedId);
        if (task) setTaskToDelete(task);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, tasks]);

  // Filter tasks based on category & search query
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Category / Status Filter
      if (currentCategory === 'downloading' && task.status !== 'downloading') return false;
      if (currentCategory === 'completed' && task.status !== 'completed') return false;
      if (currentCategory === 'queued' && task.status !== 'idle' && task.status !== 'paused') return false;
      if (currentCategory === 'error' && task.status !== 'error') return false;
      if (
        currentCategory !== 'all' && 
        currentCategory !== 'downloading' && 
        currentCategory !== 'completed' && 
        currentCategory !== 'queued' && 
        currentCategory !== 'error' &&
        task.category !== currentCategory
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          task.filename.toLowerCase().includes(q) ||
          task.url.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [tasks, currentCategory, searchQuery]);

  const activeDownloads = tasks.filter(t => t.status === 'downloading');

  const handleToggleSpeedLimit = () => {
    updateSettings({ speedLimitEnabled: !settings.speedLimitEnabled });
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    const task = tasks.find(t => t.id === selectedId);
    if (task) {
      setTaskToDelete(task);
    }
  };

  const handleConfirmDelete = (id: string, deleteFile: boolean) => {
    cancelDownload(id, deleteFile);
    if (selectedId === id) setSelectedId(null);
  };

  const handleOpenAddWithUrl = (url: string) => {
    setAddInitialUrl(url);
    setCurrentView('add-url');
    setClipboardUrl(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-theme-main text-theme-text overflow-hidden font-sans select-none transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        currentCategory={currentCategory}
        onNavigate={setCurrentView}
        onPauseAll={pauseAll}
        onResumeAll={resumeAll}
        selectedId={selectedId}
        onDeleteSelected={handleDeleteSelected}
        onPauseSelected={() => selectedId && pauseDownload(selectedId)}
        onResumeSelected={() => selectedId && resumeDownload(selectedId)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        speedLimitEnabled={settings.speedLimitEnabled}
        onToggleSpeedLimit={handleToggleSpeedLimit}
        activeDownloadsCount={activeDownloads.length}
        totalSpeed={totalSpeed}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Permanent Two-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Permanent on all views */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          currentCategory={currentCategory}
          onSelectCategory={(cat) => {
            setCurrentCategory(cat);
            setCurrentView('downloads');
          }}
          tasks={tasks}
          totalSpeed={totalSpeed}
        />

        {/* Right Content Pane - Switches smoothly */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-theme-main">
          {currentView === 'settings' ? (
            <SettingsPage
              settings={settings}
              onSaveSettings={updateSettings}
              onBackToDownloads={() => setCurrentView('downloads')}
            />
          ) : currentView === 'add-url' ? (
            <AddDownloadPage
              initialUrl={addInitialUrl}
              defaultSegments={settings.defaultSegments}
              onAdd={addDownload}
              onBackToDownloads={() => setCurrentView('downloads')}
            />
          ) : currentView === 'batch-add' ? (
            <BatchAddPage
              onBatchAdd={batchAddDownloads}
              onBackToDownloads={() => setCurrentView('downloads')}
            />
          ) : (
            <DownloadTable
              tasks={filteredTasks}
              selectedId={selectedId}
              onSelectTask={setSelectedId}
              onPause={pauseDownload}
              onResume={resumeDownload}
              onRestart={restartDownload}
              onDeleteRequest={(task) => setTaskToDelete(task)}
              onDeleteDirect={(id, deleteFile) => cancelDownload(id, deleteFile)}
              onOpenFile={openFile}
              onShowInFolder={showInFolder}
              onInspectSegments={(task) => setInspectingTask(task)}
              onCalculateChecksum={(task) => setChecksumTask(task)}
            />
          )}
        </main>
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-9 bg-theme-surface border-t border-theme-border px-3 flex items-center justify-between text-[11px] text-theme-muted select-none">
        {/* Left Status metrics */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${activeDownloads.length > 0 ? 'bg-blue-500 animate-pulse' : 'bg-theme-sub'}`} />
            <span className="text-theme-text font-medium">{activeDownloads.length} Active</span>
          </div>

          <div className="h-3 w-[1px] bg-theme-border" />

          <div className="flex items-center space-x-1 font-mono">
            <Activity className="w-3 h-3 text-brand" />
            <span className="text-brand font-medium">{formatSpeed(totalSpeed)}</span>
          </div>

          {settings.speedLimitEnabled && (
            <>
              <div className="h-3 w-[1px] bg-theme-border" />
              <div className="text-amber-500 font-mono text-[10px]">
                Limit: {settings.globalSpeedLimit} KB/s
              </div>
            </>
          )}
        </div>

        {/* Center Live Wave Graph */}
        <div className="w-56 hidden md:block">
          <SpeedGraph speedHistory={speedHistory} currentSpeed={totalSpeed} />
        </div>

        {/* Right Info */}
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="font-mono text-theme-sub">MDM v1.0</span>
          <div className="flex items-center space-x-1 text-brand">
            <ShieldCheck className="w-3 h-3" />
            <span>Ready</span>
          </div>
        </div>
      </footer>

      {/* Retained Floating Modals for Task-Specific Inspection and Deletion */}
      <SegmentModal
        task={inspectingTask}
        onClose={() => setInspectingTask(null)}
        onPause={pauseDownload}
        onResume={resumeDownload}
      />

      <ChecksumModal
        task={checksumTask}
        onClose={() => setChecksumTask(null)}
      />

      <DeleteConfirmModal
        task={taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <ClipboardPrompt
        url={clipboardUrl}
        onDownload={handleOpenAddWithUrl}
        onDismiss={() => setClipboardUrl(null)}
      />
    </div>
  );
};
