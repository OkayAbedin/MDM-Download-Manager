import { clipboard } from 'electron';

export class ClipboardWatcher {
  private timer: NodeJS.Timeout | null = null;
  private lastUrl = '';
  private isEnabled = true;
  private onUrlDetected: (url: string) => void;

  private downloadExtensions = [
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.iso', '.exe', '.msi',
    '.dmg', '.pkg', '.apk', '.mp4', '.mkv', '.avi', '.mov', '.mp3', '.flac',
    '.wav', '.pdf', '.epub', '.docx', '.xlsx', '.pptx', '.bin', '.img', '.torrent'
  ];

  constructor(onUrlDetected: (url: string) => void) {
    this.onUrlDetected = onUrlDetected;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.checkClipboard(), 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  private checkClipboard(): void {
    if (!this.isEnabled) return;

    try {
      const text = clipboard.readText().trim();
      if (!text || text === this.lastUrl) return;

      if (text.startsWith('http://') || text.startsWith('https://')) {
        const urlLower = text.toLowerCase();
        const hasMatchingExt = this.downloadExtensions.some(ext => urlLower.includes(ext));
        const isLikelyDirectFile = hasMatchingExt || urlLower.includes('download') || urlLower.includes('/get/') || urlLower.includes('/file/');

        if (isLikelyDirectFile) {
          this.lastUrl = text;
          this.onUrlDetected(text);
        }
      }
    } catch {
      // Ignore clipboard errors
    }
  }
}
