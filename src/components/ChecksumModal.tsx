import React, { useState } from 'react';
import { X, Hash, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { DownloadTask } from '../types/download';

interface ChecksumModalProps {
  task: DownloadTask | null;
  onClose: () => void;
}

export const ChecksumModal: React.FC<ChecksumModalProps> = ({ task, onClose }) => {
  const [algorithm, setAlgorithm] = useState<'md5' | 'sha256'>('sha256');
  const [checksum, setChecksum] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!task) return null;

  const handleCompute = async () => {
    setIsLoading(true);
    setChecksum(null);
    try {
      const hash = await window.electronAPI.calculateChecksum(task.savePath, algorithm);
      setChecksum(hash);
    } catch (err: any) {
      setChecksum(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (checksum) {
      navigator.clipboard.writeText(checksum);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none text-xs">
      <div className="w-full max-w-sm bg-theme-surface border border-theme-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-theme-card border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-brand/15 text-brand flex items-center justify-center border border-brand/30">
              <Hash className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-theme-text">Checksum Calculator</h3>
              <p className="text-[11px] text-theme-muted truncate max-w-[200px]">{task.filename}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-theme-hover text-theme-muted hover:text-theme-text transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setAlgorithm('sha256')}
              className={`flex-1 py-1.5 rounded-md font-mono font-medium transition cursor-pointer ${
                algorithm === 'sha256'
                  ? 'bg-brand/15 text-brand border border-brand/30'
                  : 'bg-theme-card text-theme-muted border border-theme-border hover:bg-theme-hover'
              }`}
            >
              SHA-256
            </button>
            <button
              onClick={() => setAlgorithm('md5')}
              className={`flex-1 py-1.5 rounded-md font-mono font-medium transition cursor-pointer ${
                algorithm === 'md5'
                  ? 'bg-brand/15 text-brand border border-brand/30'
                  : 'bg-theme-card text-theme-muted border border-theme-border hover:bg-theme-hover'
              }`}
            >
              MD5
            </button>
          </div>

          <button
            onClick={handleCompute}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-md bg-[#84ce19] hover:bg-[#73b814] disabled:opacity-50 text-[#0a1f01] font-semibold transition cursor-pointer shadow-sm"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hash className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>{isLoading ? 'Computing Hash...' : 'Compute Checksum'}</span>
          </button>

          {checksum && (
            <div className="p-2.5 rounded-md bg-theme-card border border-theme-border space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-theme-muted uppercase font-semibold">
                <span>{algorithm} Hash</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 text-brand hover:underline cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="font-mono text-[11px] text-theme-text break-all bg-theme-main p-2 rounded border border-theme-border select-all">
                {checksum}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 bg-theme-card border-t border-theme-border flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-hover border border-theme-border text-theme-text font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
