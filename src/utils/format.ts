import { DownloadCategory, DownloadStatus } from '../types/download';

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

export function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function getCategoryLabel(cat: DownloadCategory): string {
  switch (cat) {
    case 'compressed': return 'Compressed / Archives';
    case 'programs': return 'Programs & Apps';
    case 'video': return 'Video';
    case 'audio': return 'Music & Audio';
    case 'documents': return 'Documents';
    case 'images': return 'Images';
    case 'others': return 'Other Files';
    default: return 'Downloads';
  }
}
