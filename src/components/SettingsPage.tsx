import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Cpu, 
  Gauge, 
  Bell, 
  Trash2, 
  Globe, 
  Folder, 
  FolderOpen,
  CheckCircle2, 
  Save, 
  ShieldCheck,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Copy
} from 'lucide-react';
import { AppSettings } from '../types/download';

interface SettingsPageProps {
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<any>;
  onBackToDownloads: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSaveSettings,
  onBackToDownloads,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'storage' | 'engine' | 'speed' | 'security' | 'automation' | 'retention' | 'browser'>('storage');
  const [isSaved, setIsSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [extensionPath, setExtensionPath] = useState<string>('');
  const [copiedExtPath, setCopiedExtPath] = useState(false);
  const [browserNotice, setBrowserNotice] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI.getExtensionPath) {
      window.electronAPI.getExtensionPath().then((p) => {
        if (p) setExtensionPath(p);
      }).catch(() => {});
    }
  }, []);

  const handleAutoInstallBrowser = async (browser: 'chrome' | 'edge' | 'brave' | 'firefox') => {
    if (window.electronAPI?.installBrowserExtension) {
      const res = await window.electronAPI.installBrowserExtension(browser);
      if (res.path) {
        setExtensionPath(res.path);
      }
      setBrowserNotice(`Opened ${browser.toUpperCase()} & copied extension path to clipboard! Click "Load Unpacked" and paste the folder path.`);
      setTimeout(() => setBrowserNotice(null), 8000);
    }
  };

  const handleOpenExtensionFolder = async () => {
    if (window.electronAPI.openExtensionFolder) {
      const p = await window.electronAPI.openExtensionFolder();
      if (p) setExtensionPath(p);
    }
  };

  const handleCopyExtensionPath = () => {
    if (extensionPath) {
      navigator.clipboard.writeText(extensionPath);
      setCopiedExtPath(true);
      setTimeout(() => setCopiedExtPath(false), 2000);
    }
  };

  const handleBrowseDefault = async () => {
    try {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        setFormData({ ...formData, defaultDownloadDir: selected });
      }
    } catch {}
  };

  const handleBrowseCategory = async (catKey: keyof typeof formData.categoryFolders) => {
    try {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        setFormData({
          ...formData,
          categoryFolders: {
            ...formData.categoryFolders,
            [catKey]: selected,
          }
        });
      }
    } catch {}
  };

  const handleTestApiKey = async () => {
    const keyToTest = formData.virusTotalApiKey?.trim();
    if (!keyToTest) {
      setKeyTestStatus({ success: false, message: 'Please enter an API key first' });
      return;
    }

    setIsTestingKey(true);
    setKeyTestStatus(null);
    try {
      if (window.electronAPI.testVirusTotalKey) {
        const res = await window.electronAPI.testVirusTotalKey(keyToTest);
        if (res.success) {
          setKeyTestStatus({ success: true, message: `Connected as ${res.user || 'Verified Account'}` });
          const updated = { ...formData, virusTotalApiKey: keyToTest };
          setFormData(updated);
          await onSaveSettings(updated);
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2000);
        } else {
          setKeyTestStatus({ success: false, message: res.error || 'Authentication failed' });
        }
      }
    } catch (err: any) {
      setKeyTestStatus({ success: false, message: err.message || 'Connection failed' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const navTabs = [
    { id: 'storage', label: 'Storage & Folders', icon: HardDrive },
    { id: 'engine', label: 'Engine & Streams', icon: Cpu },
    { id: 'speed', label: 'Speed Limiter', icon: Gauge },
    { id: 'security', label: 'Security & VirusTotal', icon: ShieldCheck },
    { id: 'automation', label: 'Automation & Alerts', icon: Bell },
    { id: 'retention', label: 'Retention & Cleanup', icon: Trash2 },
    { id: 'browser', label: 'Browser Integration', icon: Globe },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-theme-main overflow-hidden text-xs select-none transition-colors duration-200">
      {/* Top Action Bar */}
      <div className="h-12 border-b border-theme-border bg-theme-surface px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-theme-text text-[13px]">Settings</span>
          <span className="text-theme-sub text-[11px]">• System configuration & preferences</span>
        </div>

        <button
          onClick={() => handleSave()}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-[#84ce19] hover:bg-[#73b814] active:scale-95 text-[#0a1f01] font-semibold transition cursor-pointer shadow-sm"
        >
          {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5 stroke-[2.5]" />}
          <span>{isSaved ? 'Settings Saved' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Main Settings Layout: Secondary Sidebar + Content Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Secondary Sub-Sidebar */}
        <aside className="w-52 border-r border-theme-border bg-theme-surface flex flex-col p-2 space-y-0.5 flex-shrink-0 overflow-y-auto">
          <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-theme-sub mb-1">
            Preferences
          </div>
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer text-left ${
                  isSelected
                    ? 'bg-theme-hover text-theme-text font-semibold border border-theme-border shadow-xs'
                    : 'text-theme-muted hover:text-theme-text hover:bg-theme-hover border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-brand' : 'opacity-70'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Right Settings Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="w-full space-y-6">

            {/* Storage & Folders */}
            {activeTab === 'storage' && (
              <div className="space-y-6">
                <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
                  <div className="px-5 py-4 border-b border-theme-border bg-theme-surface">
                    <h3 className="font-semibold text-theme-text text-xs">Default Storage Directory</h3>
                    <p className="text-[11px] text-theme-muted mt-0.5">Primary folder for general downloads</p>
                  </div>
                  <div className="p-5 bg-theme-card">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={formData.defaultDownloadDir}
                        onChange={(e) => setFormData({ ...formData, defaultDownloadDir: e.target.value })}
                        className="flex-1 bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono focus:outline-none focus:border-brand transition"
                      />
                      <button
                        type="button"
                        onClick={handleBrowseDefault}
                        className="px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-hover border border-theme-border text-theme-muted hover:text-theme-text transition cursor-pointer"
                        title="Browse Folder"
                      >
                        <Folder className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
                  <div className="px-5 py-4 border-b border-theme-border bg-theme-surface">
                    <h3 className="font-semibold text-theme-text text-xs">Category Automatic Routing</h3>
                    <p className="text-[11px] text-theme-muted mt-0.5">Custom destination folders per file category</p>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-theme-card">
                    {(['compressed', 'programs', 'video', 'audio', 'documents', 'images'] as const).map((cat) => (
                      <div key={cat}>
                        <label className="block text-[11px] font-medium text-theme-text mb-1.5 capitalize">
                          {cat}
                        </label>
                        <div className="flex space-x-1.5">
                          <input
                            type="text"
                            placeholder="Default Folder"
                            value={formData.categoryFolders[cat] || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              categoryFolders: { ...formData.categoryFolders, [cat]: e.target.value }
                            })}
                            className="flex-1 bg-theme-main border border-theme-border rounded-md px-2.5 py-1 text-xs text-theme-text font-mono placeholder-theme-sub focus:outline-none focus:border-brand transition"
                          />
                          <button
                            type="button"
                            onClick={() => handleBrowseCategory(cat)}
                            className="p-1.5 rounded-md bg-theme-surface hover:bg-theme-hover border border-theme-border text-theme-muted hover:text-theme-text transition cursor-pointer"
                          >
                            <Folder className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Engine & Streams */}
            {activeTab === 'engine' && (
              <div className="space-y-6">
                <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
                  <div className="px-5 py-4 border-b border-theme-border bg-theme-surface">
                    <h3 className="font-semibold text-theme-text text-xs">Multi-Stream Engine</h3>
                    <p className="text-[11px] text-theme-muted mt-0.5">Configure parallel byte-range acceleration and concurrent queues</p>
                  </div>
                  <div className="p-5 space-y-5 bg-theme-card">
                    <div>
                      <label className="block text-[11px] font-medium text-theme-text mb-2">
                        Default Segment Threads
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 4, 8, 16, 32].map((count) => {
                          const isSelected = formData.defaultSegments === count;
                          return (
                            <button
                              key={count}
                              type="button"
                              onClick={() => setFormData({ ...formData, defaultSegments: count })}
                              className={`py-2 px-2.5 rounded-md border text-center transition cursor-pointer ${
                                isSelected
                                  ? 'bg-theme-main border-brand text-brand font-semibold shadow-xs'
                                  : 'bg-theme-main border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-hover'
                              }`}
                            >
                              <span className="block font-mono text-xs font-bold">{count}</span>
                              <span className="block text-[10px] opacity-75">
                                {count === 1 ? 'Single' : count === 8 ? 'Default' : count === 32 ? 'Max' : 'Streams'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-theme-border">
                      <div>
                        <label className="block text-[11px] font-medium text-theme-text mb-1.5">
                          Max Simultaneous Active Downloads
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={formData.maxConcurrentDownloads}
                          onChange={(e) => setFormData({ ...formData, maxConcurrentDownloads: Number(e.target.value) })}
                          className="w-full bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono focus:outline-none focus:border-brand transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-theme-text mb-1.5">
                          Custom User-Agent Header
                        </label>
                        <input
                          type="text"
                          value={formData.customUserAgent}
                          onChange={(e) => setFormData({ ...formData, customUserAgent: e.target.value })}
                          className="w-full bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono focus:outline-none focus:border-brand transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Speed Limiter */}
            {activeTab === 'speed' && (
              <div className="space-y-6">
                <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
                  <div className="px-5 py-4 border-b border-theme-border bg-theme-surface">
                    <h3 className="font-semibold text-theme-text text-xs">Bandwidth Management</h3>
                    <p className="text-[11px] text-theme-muted mt-0.5">Throttle global transfer speeds to prevent network saturation</p>
                  </div>
                  <div className="p-5 space-y-4 bg-theme-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-theme-text block text-xs">Enable Global Speed Limiter</span>
                        <span className="text-[11px] text-theme-muted">Throttle overall download speeds</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, speedLimitEnabled: !formData.speedLimitEnabled })}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          formData.speedLimitEnabled ? 'bg-[#84ce19]' : 'bg-theme-hover border border-theme-border'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform block shadow-sm absolute top-0.5 ${
                            formData.speedLimitEnabled ? 'right-0.5 translate-x-0' : 'left-0.5 translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {formData.speedLimitEnabled && (
                      <div className="pt-3 border-t border-theme-border">
                        <label className="block text-[11px] font-medium text-theme-text mb-1.5">
                          Global Speed Cap (KB/s)
                        </label>
                        <input
                          type="number"
                          min={64}
                          step={128}
                          value={formData.globalSpeedLimit}
                          onChange={(e) => setFormData({ ...formData, globalSpeedLimit: Number(e.target.value) })}
                          className="w-full bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono focus:outline-none focus:border-brand transition"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Security & VirusTotal */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
                  <div className="px-5 py-4 border-b border-theme-border bg-theme-surface flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-theme-text text-xs">VirusTotal Cloud Antivirus API</h3>
                      <p className="text-[11px] text-theme-muted mt-0.5">Scan downloaded file hashes against 70+ leading antivirus engines</p>
                    </div>
                    <a
                      href="https://www.virustotal.com/gui/my-apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1 text-[11px] text-brand hover:underline font-medium"
                    >
                      <span>Get API Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="p-5 space-y-4 bg-theme-card">
                    {/* API Key Input */}
                    <div>
                      <label className="block text-[11px] font-medium text-theme-text mb-1.5">
                        VirusTotal Personal API Key
                      </label>
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <Key className="w-3.5 h-3.5 absolute left-3 top-2.5 text-theme-sub" />
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            placeholder="Paste your 64-character VirusTotal API Key..."
                            value={formData.virusTotalApiKey || ''}
                            onChange={(e) => {
                              setFormData({ ...formData, virusTotalApiKey: e.target.value });
                              setKeyTestStatus(null);
                            }}
                            className="w-full bg-theme-main border border-theme-border rounded-md pl-9 pr-9 py-1.5 text-xs text-theme-text font-mono placeholder-theme-sub focus:outline-none focus:border-brand transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-2.5 top-2 text-theme-sub hover:text-theme-text transition"
                            title={showApiKey ? 'Hide Key' : 'Show Key'}
                          >
                            {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleTestApiKey}
                          disabled={isTestingKey || !formData.virusTotalApiKey?.trim()}
                          className="px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-hover border border-theme-border text-theme-text font-medium transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                        >
                          {isTestingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" /> : <span>Verify Key</span>}
                        </button>
                      </div>

                      {/* Test Key Feedback Banner */}
                      {keyTestStatus && (
                        <div className={`mt-2 flex items-center space-x-2 p-2.5 rounded-md text-[11px] ${
                          keyTestStatus.success 
                            ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 font-medium' 
                            : 'bg-rose-500/10 border border-rose-500/25 text-rose-500'
                        }`}>
                          {keyTestStatus.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          <span>{keyTestStatus.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Auto Scan Toggle */}
                    <div className="pt-3 border-t border-theme-border flex items-center justify-between">
                      <div>
                        <span className="font-medium text-theme-text block text-xs">Automatic Antivirus Scan on Complete</span>
                        <span className="text-[11px] text-theme-muted">
                          Computes file SHA-256 hash upon completion and checks VirusTotal for instant threat detection
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, virusTotalAutoScan: !formData.virusTotalAutoScan })}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          formData.virusTotalAutoScan ? 'bg-[#84ce19]' : 'bg-theme-hover border border-theme-border'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform block shadow-sm absolute top-0.5 ${
                            formData.virusTotalAutoScan ? 'right-0.5 translate-x-0' : 'left-0.5 translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Automation & Alerts */}
            {activeTab === 'automation' && (
              <div className="space-y-6">
                <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
                  <div className="px-5 py-4 border-b border-theme-border bg-theme-surface">
                    <h3 className="font-semibold text-theme-text text-xs">Automation Triggers</h3>
                    <p className="text-[11px] text-theme-muted mt-0.5">Clipboard monitoring and background notifications</p>
                  </div>
                  <div className="divide-y divide-theme-border bg-theme-card">
                    <div className="p-5 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-theme-text block text-xs">Clipboard URL Monitoring</span>
                        <span className="text-[11px] text-theme-muted">Prompt to download when a downloadable link is copied</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, clipboardMonitoring: !formData.clipboardMonitoring })}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          formData.clipboardMonitoring ? 'bg-[#84ce19]' : 'bg-theme-hover border border-theme-border'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform block shadow-sm absolute top-0.5 ${
                            formData.clipboardMonitoring ? 'right-0.5 translate-x-0' : 'left-0.5 translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-5 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-theme-text block text-xs">Desktop Notifications</span>
                        <span className="text-[11px] text-theme-muted">Show Windows notification banner when a task completes</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, desktopNotifications: !formData.desktopNotifications })}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          formData.desktopNotifications ? 'bg-[#84ce19]' : 'bg-theme-hover border border-theme-border'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform block shadow-sm absolute top-0.5 ${
                            formData.desktopNotifications ? 'right-0.5 translate-x-0' : 'left-0.5 translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-5 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-theme-text block text-xs">Auto-Start Downloads</span>
                        <span className="text-[11px] text-theme-muted">Immediately start downloading when added</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, autoStartDownloads: !formData.autoStartDownloads })}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          formData.autoStartDownloads ? 'bg-[#84ce19]' : 'bg-theme-hover border border-theme-border'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform block shadow-sm absolute top-0.5 ${
                            formData.autoStartDownloads ? 'right-0.5 translate-x-0' : 'left-0.5 translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Retention & Cleanup */}
            {activeTab === 'retention' && (
              <div className="space-y-6">
                <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
                  <div className="px-5 py-4 border-b border-theme-border bg-theme-surface">
                    <h3 className="font-semibold text-theme-text text-xs">Automatic Cleanup Policy</h3>
                    <p className="text-[11px] text-theme-muted mt-0.5">Automatically prune finished downloads after retention window</p>
                  </div>
                  <div className="p-5 space-y-4 bg-theme-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-theme-text block text-xs">Auto-Delete Completed Downloads</span>
                        <span className="text-[11px] text-theme-muted">Purge completed entries automatically</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, autoDeleteCompletedEnabled: !formData.autoDeleteCompletedEnabled })}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          formData.autoDeleteCompletedEnabled ? 'bg-[#84ce19]' : 'bg-theme-hover border border-theme-border'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform block shadow-sm absolute top-0.5 ${
                            formData.autoDeleteCompletedEnabled ? 'right-0.5 translate-x-0' : 'left-0.5 translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {formData.autoDeleteCompletedEnabled && (
                      <div className="pt-3 border-t border-theme-border space-y-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-theme-muted">Retention Period:</span>
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={formData.autoDeleteCompletedValue ?? 7}
                            onChange={(e) => setFormData({ ...formData, autoDeleteCompletedValue: Math.max(1, Number(e.target.value)) })}
                            className="w-20 bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono text-center focus:outline-none focus:border-brand transition"
                          />
                          <select
                            value={formData.autoDeleteCompletedUnit ?? 'days'}
                            onChange={(e) => setFormData({ ...formData, autoDeleteCompletedUnit: e.target.value as 'hours' | 'days' })}
                            className="bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text focus:outline-none focus:border-brand cursor-pointer transition"
                          >
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-2 pt-2 border-t border-theme-border">
                          <input
                            type="checkbox"
                            id="autoDeletePhysical"
                            checked={formData.autoDeleteSourceFile ?? false}
                            onChange={(e) => setFormData({ ...formData, autoDeleteSourceFile: e.target.checked })}
                            className="w-3.5 h-3.5 rounded text-rose-500 focus:ring-0 cursor-pointer accent-[#f43f5e]"
                          />
                          <label htmlFor="autoDeletePhysical" className="text-xs text-theme-muted cursor-pointer">
                            Also delete downloaded physical files from hard drive
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Browser Integration */}
            {activeTab === 'browser' && (
              <div className="space-y-6">
                <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
                  <div className="px-5 py-4 border-b border-theme-border bg-theme-surface flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-theme-text text-xs">Browser Integration Gateway</h3>
                      <p className="text-[11px] text-theme-muted mt-0.5">Captures downloads and media streams from Chrome, Edge, Brave, and Firefox</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenExtensionFolder}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-brand text-[#0a1f01] font-semibold text-xs hover:bg-[#73b814] active:scale-95 transition cursor-pointer shadow-xs"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Open Extension Folder</span>
                    </button>
                  </div>

                  <div className="p-5 space-y-4 bg-theme-card">
                    {/* Server Status Pill */}
                    <div className="p-3 rounded-md bg-theme-main border border-theme-border flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-brand" />
                        <div>
                          <span className="font-semibold text-theme-text block text-xs">Local Gateway Server</span>
                          <span className="text-[11px] text-theme-muted font-mono">http://127.0.0.1:9666/download</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/25 font-semibold font-mono">
                        ONLINE
                      </span>
                    </div>

                    {/* Local Extension Folder Box */}
                    <div className="p-3 rounded-md bg-theme-main border border-theme-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-theme-text text-xs">Extension Files Directory:</span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={handleCopyExtensionPath}
                            className="flex items-center space-x-1 px-2 py-1 rounded bg-theme-surface hover:bg-theme-hover border border-theme-border text-theme-muted hover:text-theme-text text-[11px] transition cursor-pointer"
                          >
                            {copiedExtPath ? <CheckCircle2 className="w-3 h-3 text-brand" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedExtPath ? 'Copied' : 'Copy Path'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleOpenExtensionFolder}
                            className="flex items-center space-x-1 px-2 py-1 rounded bg-theme-surface hover:bg-theme-hover border border-theme-border text-theme-muted hover:text-theme-text text-[11px] transition cursor-pointer"
                          >
                            <FolderOpen className="w-3 h-3" />
                            <span>Open Folder</span>
                          </button>
                        </div>
                      </div>
                      <p className="font-mono text-[11px] text-theme-muted select-all bg-theme-surface p-2 rounded border border-theme-border break-all">
                        {extensionPath || 'Extracting local extension files...'}
                      </p>
                    </div>

                    {/* 1-Click Browser Launchers */}
                    <div className="space-y-2">
                      <span className="font-semibold text-theme-text text-xs">1-Click Auto-Setup by Browser:</span>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleAutoInstallBrowser('chrome')}
                          className="flex items-center justify-between p-2.5 rounded-md bg-theme-main border border-theme-border hover:border-brand/50 hover:bg-theme-surface transition cursor-pointer text-left group"
                        >
                          <div>
                            <div className="font-semibold text-xs text-theme-text group-hover:text-brand">Google Chrome</div>
                            <div className="text-[10px] text-theme-muted">Opens chrome://extensions</div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-brand/10 text-brand font-medium">Auto-Open →</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAutoInstallBrowser('edge')}
                          className="flex items-center justify-between p-2.5 rounded-md bg-theme-main border border-theme-border hover:border-brand/50 hover:bg-theme-surface transition cursor-pointer text-left group"
                        >
                          <div>
                            <div className="font-semibold text-xs text-theme-text group-hover:text-brand">Microsoft Edge</div>
                            <div className="text-[10px] text-theme-muted">Opens edge://extensions</div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-brand/10 text-brand font-medium">Auto-Open →</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAutoInstallBrowser('brave')}
                          className="flex items-center justify-between p-2.5 rounded-md bg-theme-main border border-theme-border hover:border-brand/50 hover:bg-theme-surface transition cursor-pointer text-left group"
                        >
                          <div>
                            <div className="font-semibold text-xs text-theme-text group-hover:text-brand">Brave Browser</div>
                            <div className="text-[10px] text-theme-muted">Opens brave://extensions</div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-brand/10 text-brand font-medium">Auto-Open →</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAutoInstallBrowser('firefox')}
                          className="flex items-center justify-between p-2.5 rounded-md bg-theme-main border border-theme-border hover:border-brand/50 hover:bg-theme-surface transition cursor-pointer text-left group"
                        >
                          <div>
                            <div className="font-semibold text-xs text-theme-text group-hover:text-brand">Mozilla Firefox</div>
                            <div className="text-[10px] text-theme-muted">Opens about:debugging</div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-brand/10 text-brand font-medium">Auto-Open →</span>
                        </button>
                      </div>

                      {browserNotice && (
                        <div className="p-2.5 rounded-md bg-brand/10 border border-brand/30 text-brand text-xs flex items-center space-x-2 animate-in fade-in">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>{browserNotice}</span>
                        </div>
                      )}
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="space-y-2 text-xs text-theme-muted leading-relaxed">
                      <p className="font-semibold text-theme-text">Manual Setup Instructions:</p>
                      <ol className="list-decimal pl-5 space-y-2 text-[11px]">
                        <li>
                          <strong className="text-theme-text">Chrome / Edge / Brave / Opera</strong>:
                          <div className="mt-1">
                            1. Click your browser button above or open <code className="font-mono text-brand bg-theme-main px-1.5 py-0.5 rounded border border-theme-border">chrome://extensions</code>.<br />
                            2. Toggle on <strong>Developer Mode</strong> (top right corner).<br />
                            3. Click <strong>Load Unpacked</strong> and paste the copied extension path!
                          </div>
                        </li>
                        <li>
                          <strong className="text-theme-text">Firefox</strong>:
                          <div className="mt-1">
                            1. Click the Firefox button above or open <code className="font-mono text-brand bg-theme-main px-1.5 py-0.5 rounded border border-theme-border">about:debugging#/runtime/this-firefox</code>.<br />
                            2. Click <strong>Load Temporary Add-on</strong> and choose <code className="font-mono text-brand">manifest.json</code> from the extension folder.
                          </div>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
