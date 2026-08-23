import React, { useState } from 'react';
import { X, Trash2, FileText } from 'lucide-react';
import { DownloadTask } from '../types/download';
import { formatBytes } from '../utils/format';

interface DeleteConfirmModalProps {
  task: DownloadTask | null;
  onClose: () => void;
  onConfirm: (id: string, deleteFile: boolean) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  task,
  onClose,
  onConfirm,
}) => {
  const [deleteFile, setDeleteFile] = useState(false);

  if (!task) return null;

  const handleConfirm = () => {
    onConfirm(task.id, deleteFile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none text-xs">
      <div className="w-full max-w-sm bg-theme-surface border border-theme-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-theme-card border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-rose-500/15 text-rose-500 flex items-center justify-center border border-rose-500/30">
              <Trash2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-theme-text">Delete Download</h3>
              <p className="text-[11px] text-theme-muted">Confirm task removal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-theme-hover text-theme-muted hover:text-theme-text transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5">
          <div className="p-2.5 rounded-md bg-theme-card border border-theme-border space-y-1">
            <div className="flex items-center space-x-2">
              <FileText className="w-3.5 h-3.5 text-theme-muted flex-shrink-0" />
              <span className="font-medium text-theme-text truncate max-w-[240px]" title={task.filename}>
                {task.filename}
              </span>
            </div>
            <div className="text-[10px] text-theme-muted pl-5 font-mono truncate">
              {formatBytes(task.downloadedBytes)} • {task.savePath}
            </div>
          </div>

          <div className="space-y-2 p-3 rounded-md bg-theme-card border border-theme-border">
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="deleteFileCheck"
                checked={deleteFile}
                onChange={(e) => setDeleteFile(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 rounded bg-theme-surface border-theme-border text-rose-500 focus:ring-0 cursor-pointer accent-[#f43f5e]"
              />
              <label htmlFor="deleteFileCheck" className="text-xs text-theme-text cursor-pointer">
                <span className="font-semibold text-rose-500">Also delete file from disk</span>
                <p className="text-[11px] text-theme-muted mt-0.5">
                  Permanently deletes the downloaded file from your storage drive.
                </p>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-2.5 bg-theme-card border-t border-theme-border flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-hover border border-theme-border text-theme-text font-medium transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-rose-500 hover:bg-rose-600 text-white font-semibold transition cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{deleteFile ? 'Delete File & Task' : 'Remove from List'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
