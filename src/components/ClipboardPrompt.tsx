import React from 'react';
import { Download, X, Link } from 'lucide-react';

interface ClipboardPromptProps {
  url: string | null;
  onDownload: (url: string) => void;
  onDismiss: () => void;
}

export const ClipboardPrompt: React.FC<ClipboardPromptProps> = ({
  url,
  onDownload,
  onDismiss,
}) => {
  if (!url) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-dark-card dark:bg-dark-card light:bg-light-card border border-dark-border dark:border-dark-border light:border-light-border rounded-lg shadow-xl p-3 text-xs">
      <div className="flex items-start space-x-2.5">
        <div className="p-1.5 rounded-md bg-brand/15 text-brand border border-brand/30 flex-shrink-0">
          <Link className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-dark-text dark:text-dark-text light:text-light-text">Link Detected</h4>
            <button
              onClick={onDismiss}
              className="text-dark-muted hover:text-dark-text p-0.5 rounded transition"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[10px] text-dark-muted dark:text-dark-muted light:text-light-muted truncate mt-0.5 font-mono">
            {url}
          </p>
          <div className="flex items-center space-x-2 mt-2.5">
            <button
              onClick={() => {
                onDownload(url);
                onDismiss();
              }}
              className="px-2.5 py-1 rounded-md bg-brand hover:bg-brand-hover text-[#052316] text-[11px] font-semibold transition flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Download</span>
            </button>
            <button
              onClick={onDismiss}
              className="px-2 py-1 rounded-md bg-dark-bg dark:bg-dark-bg light:bg-light-hover hover:bg-dark-hover dark:hover:bg-dark-hover border border-dark-border dark:border-dark-border light:border-light-border text-dark-muted text-[11px] transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
