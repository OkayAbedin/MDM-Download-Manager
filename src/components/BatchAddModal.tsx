import React, { useState } from 'react';
import { X, Layers, Loader2, Plus } from 'lucide-react';

interface BatchAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchAdd: (urls: string[]) => Promise<any>;
}

export const BatchAddModal: React.FC<BatchAddModalProps> = ({
  isOpen,
  onClose,
  onBatchAdd,
}) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = text
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.startsWith('http://') || u.startsWith('https://'));

    if (urls.length === 0) return;

    setIsSubmitting(true);
    try {
      await onBatchAdd(urls);
      setText('');
      onClose();
    } catch {} finally {
      setIsSubmitting(false);
    }
  };

  const detectedUrlsCount = text
    .split('\n')
    .filter(u => u.trim().startsWith('http://') || u.trim().startsWith('https://')).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none text-xs">
      <div className="w-full max-w-md bg-theme-surface border border-theme-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-theme-card border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-brand/15 text-brand flex items-center justify-center border border-brand/30">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-theme-text">Batch Import</h3>
              <p className="text-[11px] text-theme-muted">Add multiple URLs at once</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-theme-hover text-theme-muted hover:text-theme-text transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-medium text-theme-text">
                URLs List (One per line)
              </label>
              {detectedUrlsCount > 0 && (
                <span className="text-[10px] font-mono text-brand font-semibold">
                  {detectedUrlsCount} valid link{detectedUrlsCount > 1 ? 's' : ''} detected
                </span>
              )}
            </div>
            <textarea
              rows={6}
              placeholder="https://example.com/file1.zip&#10;https://example.com/file2.zip"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-theme-card border border-theme-border rounded-md p-2.5 text-xs text-theme-text placeholder-theme-sub focus:outline-none focus:border-brand font-mono leading-relaxed"
              required
            />
          </div>

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
              disabled={isSubmitting || detectedUrlsCount === 0}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-[#84ce19] hover:bg-[#73b814] disabled:opacity-50 text-[#0a1f01] font-semibold transition cursor-pointer shadow-sm"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
              <span>Import {detectedUrlsCount > 0 ? `(${detectedUrlsCount})` : ''}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
