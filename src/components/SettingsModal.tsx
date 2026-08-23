import React, { useState } from 'react';
import { X, Settings, Folder, CheckCircle2, HardDrive, Bell, Cpu, Gauge, Save, Trash2 } from 'lucide-react';
import { AppSettings } from '../types/download';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<any>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleBrowseDefault = async () => {
    try {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        setFormData({ ...formData, defaultDownloadDir: selected });
      }
    } catch {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none text-xs">
      <div className="w-full max-w-lg bg-theme-surface border border-theme-border rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-theme-card border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-brand/15 text-brand flex items-center justify-center border border-brand/30">
              <Settings className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-theme-text">Settings</h3>
              <p className="text-[11px] text-theme-muted">Application and engine configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-theme-hover text-theme-muted hover:text-theme-text transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <form onSubmit={handleSave} className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Default Download Path */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-wider text-theme-sub">
              <HardDrive className="w-3 h-3 text-theme-muted" />
              <span>Storage</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-theme-text mb-1">
                Default Download Directory
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.defaultDownloadDir}
                  onChange={(e) => setFormData({ ...formData, defaultDownloadDir: e.target.value })}
                  className="flex-1 bg-theme-card border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono text-[11px] focus:outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={handleBrowseDefault}
                  className="px-2.5 py-1.5 rounded-md bg-theme-card hover:bg-theme-hover border border-theme-border text-theme-muted hover:text-theme-text transition cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Engine Multi-threading */}
          <div className="space-y-2.5 pt-2 border-t border-theme-border">
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-wider text-theme-sub">
              <Cpu className="w-3 h-3 text-theme-muted" />
              <span>Acceleration & Performance</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-theme-text mb-1">
                  Parallel Stream Segments
                </label>
                <select
                  value={formData.defaultSegments}
                  onChange={(e) => setFormData({ ...formData, defaultSegments: Number(e.target.value) })}
                  className="w-full bg-theme-card border border-theme-border rounded-md px-2.5 py-1.5 text-xs text-theme-text focus:outline-none focus:border-brand font-mono cursor-pointer"
                >
                  <option value={1}>1 Segment (Single stream)</option>
                  <option value={4}>4 Segments</option>
                  <option value={8}>8 Segments (Recommended)</option>
                  <option value={16}>16 Segments</option>
                  <option value={32}>32 Segments (Max acceleration)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-theme-text mb-1">
                  Max Concurrent Downloads
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={formData.maxConcurrentDownloads}
                  onChange={(e) => setFormData({ ...formData, maxConcurrentDownloads: Number(e.target.value) })}
                  className="w-full bg-theme-card border border-theme-border rounded-md px-2.5 py-1.5 text-xs text-theme-text font-mono focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          {/* Speed Limiter */}
          <div className="space-y-2.5 pt-2 border-t border-theme-border">
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-wider text-theme-sub">
              <Gauge className="w-3 h-3 text-theme-muted" />
              <span>Speed Control</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="speedLimitEnabled"
                  checked={formData.speedLimitEnabled}
                  onChange={(e) => setFormData({ ...formData, speedLimitEnabled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded bg-theme-card border-theme-border text-brand focus:ring-0 cursor-pointer accent-[#84ce19]"
                />
                <label htmlFor="speedLimitEnabled" className="text-xs text-theme-text cursor-pointer">
                  Enable global bandwidth speed limiter
                </label>
              </div>

              {formData.speedLimitEnabled && (
                <div>
                  <label className="block text-[11px] font-medium text-theme-text mb-1">
                    Maximum Speed Limit (KB/s)
                  </label>
                  <input
                    type="number"
                    min={64}
                    step={64}
                    value={formData.globalSpeedLimit}
                    onChange={(e) => setFormData({ ...formData, globalSpeedLimit: Number(e.target.value) })}
                    className="w-full bg-theme-card border border-theme-border rounded-md px-2.5 py-1 text-xs text-theme-text font-mono focus:outline-none focus:border-brand"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Integration & Automation */}
          <div className="space-y-2.5 pt-2 border-t border-theme-border">
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-wider text-theme-sub">
              <Bell className="w-3 h-3 text-theme-muted" />
              <span>Automation & Integration</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="clipboardMonitoring"
                  checked={formData.clipboardMonitoring}
                  onChange={(e) => setFormData({ ...formData, clipboardMonitoring: e.target.checked })}
                  className="w-3.5 h-3.5 rounded bg-theme-card border-theme-border text-brand focus:ring-0 cursor-pointer accent-[#84ce19]"
                />
                <label htmlFor="clipboardMonitoring" className="text-xs text-theme-text cursor-pointer">
                  Monitor clipboard for downloadable URLs
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="desktopNotifications"
                  checked={formData.desktopNotifications}
                  onChange={(e) => setFormData({ ...formData, desktopNotifications: e.target.checked })}
                  className="w-3.5 h-3.5 rounded bg-theme-card border-theme-border text-brand focus:ring-0 cursor-pointer accent-[#84ce19]"
                />
                <label htmlFor="desktopNotifications" className="text-xs text-theme-text cursor-pointer">
                  Show desktop notification when downloads finish
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoStartDownloads"
                  checked={formData.autoStartDownloads}
                  onChange={(e) => setFormData({ ...formData, autoStartDownloads: e.target.checked })}
                  className="w-3.5 h-3.5 rounded bg-theme-card border-theme-border text-brand focus:ring-0 cursor-pointer accent-[#84ce19]"
                />
                <label htmlFor="autoStartDownloads" className="text-xs text-theme-text cursor-pointer">
                  Start downloads immediately when added
                </label>
              </div>
            </div>
          </div>

          {/* Automatic Cleanup & Retention Policy */}
          <div className="space-y-2.5 pt-2 border-t border-theme-border">
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-wider text-theme-sub">
              <Trash2 className="w-3 h-3 text-theme-muted" />
              <span>Automatic Cleanup & Retention</span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoDeleteCompletedEnabled"
                  checked={formData.autoDeleteCompletedEnabled ?? false}
                  onChange={(e) => setFormData({ ...formData, autoDeleteCompletedEnabled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded bg-theme-card border-theme-border text-brand focus:ring-0 cursor-pointer accent-[#84ce19]"
                />
                <label htmlFor="autoDeleteCompletedEnabled" className="text-xs text-theme-text cursor-pointer font-medium">
                  Auto-delete completed downloads after retention period
                </label>
              </div>

              {formData.autoDeleteCompletedEnabled && (
                <div className="pl-5 space-y-2 bg-theme-card/50 p-2.5 rounded-md border border-theme-border">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-theme-muted">Delete after:</span>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={formData.autoDeleteCompletedValue ?? 7}
                      onChange={(e) => setFormData({ ...formData, autoDeleteCompletedValue: Math.max(1, Number(e.target.value)) })}
                      className="w-16 bg-theme-card border border-theme-border rounded-md px-2 py-1 text-xs text-theme-text font-mono focus:outline-none focus:border-brand text-center"
                    />
                    <select
                      value={formData.autoDeleteCompletedUnit ?? 'days'}
                      onChange={(e) => setFormData({ ...formData, autoDeleteCompletedUnit: e.target.value as 'hours' | 'days' })}
                      className="bg-theme-card border border-theme-border rounded-md px-2 py-1 text-xs text-theme-text focus:outline-none focus:border-brand cursor-pointer"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 pt-1 border-t border-theme-border">
                    <input
                      type="checkbox"
                      id="autoDeleteSourceFile"
                      checked={formData.autoDeleteSourceFile ?? false}
                      onChange={(e) => setFormData({ ...formData, autoDeleteSourceFile: e.target.checked })}
                      className="w-3.5 h-3.5 rounded bg-theme-card border-theme-border text-rose-400 focus:ring-0 cursor-pointer accent-[#f43f5e]"
                    />
                    <label htmlFor="autoDeleteSourceFile" className="text-[11px] text-theme-muted cursor-pointer">
                      Also permanently delete downloaded physical files from disk
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User-Agent */}
          <div className="pt-2 border-t border-theme-border">
            <label className="block text-[11px] font-medium text-theme-text mb-1">
              Custom HTTP User-Agent
            </label>
            <input
              type="text"
              value={formData.customUserAgent}
              onChange={(e) => setFormData({ ...formData, customUserAgent: e.target.value })}
              className="w-full bg-theme-card border border-theme-border rounded-md px-2.5 py-1.5 text-xs text-theme-text font-mono text-[11px] focus:outline-none focus:border-brand"
            />
          </div>

          {/* Footer Save */}
          <div className="pt-2 border-t border-theme-border flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-theme-card hover:bg-theme-hover border border-theme-border text-theme-text font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#84ce19] hover:bg-[#73b814] text-[#0a1f01] font-semibold transition cursor-pointer shadow-sm"
            >
              {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaved ? 'Saved' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
