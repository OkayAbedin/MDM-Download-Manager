import React, { useState } from 'react';
import { 
  Layers, 
  Folder, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  ClipboardPaste,
  Trash2,
  Globe,
  FileText
} from 'lucide-react';

interface BatchAddPageProps {
  onBatchAdd: (urls: string[], destinationDir?: string) => Promise<any>;
  onBackToDownloads: () => void;
}

export const BatchAddPage: React.FC<BatchAddPageProps> = ({
  onBatchAdd,
  onBackToDownloads,
}) => {
  const [urlText, setUrlText] = useState('');
  const [saveDir, setSaveDir] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract valid URLs line by line or via whitespace
  const detectedUrls = urlText
    .split(/[\r\n]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && /^https?:\/\//i.test(line));

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlText(prev => prev ? `${prev}\n${text}` : text);
      }
    } catch {}
  };

  const handleBrowseDir = async () => {
    try {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        setSaveDir(selected);
      }
    } catch {}
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (detectedUrls.length === 0) return;

    setIsSubmitting(true);
    try {
      await onBatchAdd(detectedUrls, saveDir || undefined);
      onBackToDownloads();
    } catch (err) {
      console.error('Batch download failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-theme-main overflow-hidden text-xs select-none transition-colors duration-200">
      {/* Supabase Style Top Action Bar */}
      <div className="h-12 border-b border-theme-border bg-theme-surface px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-theme-text text-[13px]">Batch Downloads</span>
          <span className="text-theme-sub text-[11px]">• Import multiple URLs simultaneously</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onBackToDownloads}
            className="px-3 py-1.5 rounded-md hover:bg-theme-hover text-theme-muted hover:text-theme-text transition cursor-pointer font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || detectedUrls.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-[#84ce19] hover:bg-[#73b814] active:scale-95 disabled:opacity-50 text-[#0a1f01] font-semibold transition cursor-pointer shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>{isSubmitting ? 'Queueing...' : `Queue ${detectedUrls.length > 0 ? `(${detectedUrls.length})` : 'Batch'}`}</span>
          </button>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-6 space-y-6">
          
          {/* Section 1: URL Text Area */}
          <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-theme-border bg-theme-surface flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-theme-text text-xs">URL List</h3>
                <p className="text-[11px] text-theme-muted mt-0.5">Paste links separated by newlines</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-medium bg-brand/10 text-brand border border-brand/25">
                  {detectedUrls.length} Valid Links
                </span>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-theme-card hover:bg-theme-hover border border-theme-border text-theme-muted hover:text-theme-text text-[11px] transition cursor-pointer"
                  title="Paste from clipboard"
                >
                  <ClipboardPaste className="w-3 h-3 text-brand" />
                  <span>Paste</span>
                </button>
              </div>
            </div>

            <div className="p-5 bg-theme-card">
              <textarea
                rows={8}
                placeholder="https://example.com/file1.zip&#10;https://example.com/file2.mp4&#10;https://example.com/file3.exe"
                value={urlText}
                onChange={(e) => setUrlText(e.target.value)}
                className="w-full bg-theme-main border border-theme-border rounded-md p-3 text-xs text-theme-text font-mono placeholder-theme-sub focus:outline-none focus:border-brand resize-none transition"
                autoFocus
              />
              <p className="text-[10px] text-theme-sub mt-2">
                Lines starting with <code className="font-mono text-brand">http://</code> or <code className="font-mono text-brand">https://</code> will be parsed and queued automatically.
              </p>
            </div>
          </div>

          {/* Section 2: Storage Destination */}
          <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-theme-border bg-theme-surface">
              <h3 className="font-semibold text-theme-text text-xs">Storage Folder</h3>
              <p className="text-[11px] text-theme-muted mt-0.5">Optional directory for the whole batch (defaults to category folders)</p>
            </div>

            <div className="p-5 bg-theme-card">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={saveDir}
                  onChange={(e) => setSaveDir(e.target.value)}
                  placeholder="Leave blank to use default category routing folders"
                  className="flex-1 bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono placeholder-theme-sub focus:outline-none focus:border-brand transition"
                />
                <button
                  type="button"
                  onClick={handleBrowseDir}
                  className="px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-hover border border-theme-border text-theme-muted hover:text-theme-text transition cursor-pointer"
                  title="Browse Directory"
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Live Queue Preview */}
          {detectedUrls.length > 0 && (
            <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 border-b border-theme-border bg-theme-surface flex items-center justify-between">
                <span className="font-semibold text-theme-text text-xs">Queue Preview ({detectedUrls.length})</span>
                <button
                  type="button"
                  onClick={() => setUrlText('')}
                  className="text-theme-muted hover:text-rose-500 text-[11px] transition cursor-pointer flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto divide-y divide-theme-border bg-theme-card">
                {detectedUrls.map((u, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-2.5 hover:bg-theme-hover transition text-xs font-mono">
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className="text-brand font-semibold w-5 text-right">{i + 1}.</span>
                      <Globe className="w-3.5 h-3.5 text-theme-sub flex-shrink-0" />
                      <span className="truncate text-theme-text">{u}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
