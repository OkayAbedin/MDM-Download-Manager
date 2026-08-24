import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { URL } from 'url';
import { spawn } from 'child_process';
import { app } from 'electron';
import ytdl from '@distube/ytdl-core';
import { DownloadTask, DownloadSegment, DownloadCategory, ProbeResult } from '../src/types/download';
import { RateLimiterStream } from './rateLimiter';

export interface EngineEvents {
  onProgress: (task: DownloadTask) => void;
  onCompleted: (task: DownloadTask) => void;
  onError: (task: DownloadTask, error: Error) => void;
}

export function getYtDlpPath(): string {
  // 1. Development path
  const devPath = path.join(process.cwd(), 'bin', 'yt-dlp.exe');
  if (fs.existsSync(devPath)) return devPath;

  // 2. ExtraResources path in production
  if (process.resourcesPath) {
    const resPath = path.join(process.resourcesPath, 'bin', 'yt-dlp.exe');
    if (fs.existsSync(resPath)) return resPath;
  }

  // 3. Next to executable
  try {
    const appDir = path.dirname(app.getPath('exe'));
    const resAppPath = path.join(appDir, 'resources', 'bin', 'yt-dlp.exe');
    if (fs.existsSync(resAppPath)) return resAppPath;
    const localBinPath = path.join(appDir, 'bin', 'yt-dlp.exe');
    if (fs.existsSync(localBinPath)) return localBinPath;
  } catch {}

  return 'yt-dlp';
}

export function isStreamingMediaUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return (
      host.includes('youtube.com') ||
      host.includes('youtu.be') ||
      host.includes('vimeo.com') ||
      host.includes('tiktok.com') ||
      host.includes('facebook.com') ||
      host.includes('fb.watch') ||
      host.includes('twitter.com') ||
      host.includes('x.com') ||
      host.includes('instagram.com') ||
      host.includes('twitch.tv') ||
      host.includes('dailymotion.com') ||
      host.includes('bilibili.com')
    );
  } catch {
    return false;
  }
}

export function detectCategory(filename: string, mimeType?: string): DownloadCategory {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  
  const compressedExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'tgz', 'z', 'cab'];
  const programExts = ['exe', 'msi', 'bat', 'cmd', 'ps1', 'vbs', 'apk', 'dmg', 'appimage', 'deb', 'rpm', 'jar'];
  const videoExts = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ts'];
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus', 'alac'];
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'epub', 'mobi'];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'psd', 'ai'];

  if (compressedExts.includes(ext) || mimeType?.includes('zip') || mimeType?.includes('compressed')) return 'compressed';
  if (programExts.includes(ext) || mimeType?.includes('executable') || mimeType?.includes('octet-stream')) return 'programs';
  if (videoExts.includes(ext) || mimeType?.includes('video')) return 'video';
  if (audioExts.includes(ext) || mimeType?.includes('audio')) return 'audio';
  if (docExts.includes(ext) || mimeType?.includes('pdf') || mimeType?.includes('text') || mimeType?.includes('document')) return 'documents';
  if (imageExts.includes(ext) || mimeType?.includes('image')) return 'images';

  return 'others';
}

function parseFilenameFromHeaders(headers: http.IncomingHttpHeaders, urlStr: string): string {
  const disposition = headers['content-disposition'];
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match && utf8Match[1]) {
      try {
        return decodeURIComponent(utf8Match[1].trim());
      } catch {}
    }
    const match = disposition.match(/filename="?([^";]+)"?/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const basename = path.basename(pathname);
    if (basename && basename !== '/' && basename.length > 0) {
      return decodeURIComponent(basename);
    }
  } catch {}

  return `download_${Date.now()}`;
}

export function mergeCookies(existingCookie = '', setCookieHeader?: string | string[]): string {
  if (!setCookieHeader) return existingCookie;
  const setCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const cookieMap = new Map<string, string>();

  if (existingCookie) {
    existingCookie.split(';').forEach((pair) => {
      const [k, ...v] = pair.trim().split('=');
      if (k) cookieMap.set(k.trim(), v.join('='));
    });
  }

  for (const sc of setCookies) {
    const firstPart = sc.split(';')[0];
    if (firstPart) {
      const [k, ...v] = firstPart.trim().split('=');
      if (k) cookieMap.set(k.trim(), v.join('='));
    }
  }

  return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

export function extractGoogleDriveConfirmation(html: string, currentUrl: string): string | null {
  if (!html || typeof html !== 'string') return null;

  // Pattern 1: Form with action and hidden inputs (confirm, id, uuid, at)
  const formMatch = html.match(/<form[^>]*id=["']download-form["'][^>]*action=["']([^"']+)["'][^>]*>([\s\S]*?)<\/form>/i) ||
                    html.match(/<form[^>]*action=["']([^"']*drive\.usercontent\.google\.com\/download[^"']*)["'][^>]*>([\s\S]*?)<\/form>/i) ||
                    html.match(/<form[^>]*action=["']([^"']+)["'][^>]*>([\s\S]*?name=["']confirm["'][\s\S]*?)<\/form>/i);

  if (formMatch) {
    const action = formMatch[1];
    const formBody = formMatch[2];
    const inputMatches = Array.from(formBody.matchAll(/<input[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["']/gi));
    try {
      const targetUrl = new URL(action, currentUrl);
      for (const match of inputMatches) {
        if (match[1] && match[2] !== undefined) {
          targetUrl.searchParams.set(match[1], match[2]);
        }
      }
      return targetUrl.toString();
    } catch {}
  }

  // Pattern 2: Download link button (uc-download-link or export=download with confirm parameter)
  const linkMatch = html.match(/<a[^>]*id=["']uc-download-link["'][^>]*href=["']([^"']+)["']/i) ||
                    html.match(/<a[^>]*href=["']([^"']*export=download[^"']*confirm=[^"']*)["']/i) ||
                    html.match(/<a[^>]*href=["']([^"']*drive\.usercontent\.google\.com\/download[^"']*)["']/i);

  if (linkMatch && linkMatch[1]) {
    try {
      const decoded = linkMatch[1].replace(/&amp;/g, '&');
      return new URL(decoded, currentUrl).toString();
    } catch {}
  }

  return null;
}

export class DownloadEngine {
  private activeStreams: Map<string, { abort: () => void; rateLimiter?: RateLimiterStream }> = new Map();
  private speedHistories: Map<string, Array<{ time: number; bytes: number }>> = new Map();
  private segmentSpeedHistories: Map<string, Map<number, Array<{ time: number; bytes: number }>>> = new Map();

  private httpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 64,
    maxFreeSockets: 32,
    timeout: 30000,
  });

  private httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 64,
    maxFreeSockets: 32,
    timeout: 30000,
  });

  private segmentColors = [
    '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
    '#6366f1', '#84cc16', '#eab308', '#0ea5e9'
  ];

  /**
   * Probes URL to get Content-Length, Resumability, and Filename
   */
  async probeUrl(urlStr: string, customHeaders: Record<string, string> = {}): Promise<ProbeResult> {
    if (isStreamingMediaUrl(urlStr)) {
      const ytDlp = getYtDlpPath();
      if (fs.existsSync(ytDlp)) {
        try {
          const probeResult = await new Promise<ProbeResult>((resolve, reject) => {
            const child = spawn(ytDlp, ['--dump-json', '--no-playlist', urlStr]);
            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (d) => { stdout += d.toString(); });
            child.stderr.on('data', (d) => { stderr += d.toString(); });

            child.on('close', (code) => {
              if (code === 0 && stdout) {
                try {
                  const meta = JSON.parse(stdout);
                  const cleanTitle = `${(meta.title || 'video').replace(/[\\/:*?"<>|]/g, '_').trim()}.mp4`;
                  const fileSize = meta.filesize || meta.filesize_approx || 0;

                  // Parse available video and audio format qualities
                  const availableFormats: any[] = [];
                  const seenHeights = new Set<number>();

                  if (Array.isArray(meta.formats)) {
                    meta.formats.forEach((f: any) => {
                      if (f.height && typeof f.height === 'number' && f.height >= 144 && !seenHeights.has(f.height)) {
                        seenHeights.add(f.height);
                      }
                    });
                  }

                  const standardHeights = [2160, 1440, 1080, 720, 480, 360];
                  const sortedHeights = seenHeights.size > 0 
                    ? Array.from(seenHeights).sort((a, b) => b - a)
                    : standardHeights;

                  availableFormats.push({
                    id: 'best',
                    label: 'Best Video Quality (Original / Max)',
                    type: 'video',
                    ext: 'mp4',
                    resolution: 'Max'
                  });

                  sortedHeights.forEach((h) => {
                    const label = h >= 2160 ? '4K Ultra HD (2160p)'
                      : h >= 1440 ? '2K Quad HD (1440p)'
                      : h >= 1080 ? 'Full HD (1080p)'
                      : h >= 720 ? 'HD (720p)'
                      : h >= 480 ? 'Standard SD (480p)'
                      : `${h}p`;
                    availableFormats.push({
                      id: `${h}p`,
                      label,
                      type: 'video',
                      ext: 'mp4',
                      resolution: `${h}p`
                    });
                  });

                  availableFormats.push({
                    id: 'mp3',
                    label: 'MP3 Audio (High Quality 320kbps)',
                    type: 'audio',
                    ext: 'mp3'
                  });
                  availableFormats.push({
                    id: 'm4a',
                    label: 'M4A / AAC (Original Audio Stream)',
                    type: 'audio',
                    ext: 'm4a'
                  });
                  availableFormats.push({
                    id: 'flac',
                    label: 'FLAC (Lossless Audio)',
                    type: 'audio',
                    ext: 'flac'
                  });
                  availableFormats.push({
                    id: 'wav',
                    label: 'WAV (Uncompressed PCM)',
                    type: 'audio',
                    ext: 'wav'
                  });
                  availableFormats.push({
                    id: 'opus',
                    label: 'Opus (Modern High-Efficiency Audio)',
                    type: 'audio',
                    ext: 'opus'
                  });

                  resolve({
                    url: urlStr,
                    filename: cleanTitle,
                    fileSize,
                    resumable: true,
                    mimeType: 'video/mp4',
                    category: 'video',
                    suggestedSavePath: '',
                    isStreamingMedia: true,
                    mediaTitle: meta.title || '',
                    mediaThumbnail: meta.thumbnail || '',
                    mediaDuration: meta.duration || 0,
                    mediaUploader: meta.uploader || meta.channel || '',
                    availableFormats
                  });
                } catch (e) {
                  reject(e);
                }
              } else {
                reject(new Error(stderr || 'yt-dlp probe failed'));
              }
            });

            child.on('error', (err) => reject(err));
          });

          return probeResult;
        } catch (err: any) {
          console.warn('yt-dlp probing fallback:', err.message);
        }
      }
    }

    return new Promise((resolve, reject) => {
      let redirectCount = 0;
      const maxRedirects = 10;
      let currentCookie = customHeaders['Cookie'] || '';

      const attempt = (currentUrl: string, refererUrl = '') => {
        try {
          const parsed = new URL(currentUrl);
          const isHttps = parsed.protocol === 'https:';
          const client = isHttps ? https : http;
          const agent = isHttps ? this.httpsAgent : this.httpAgent;

          const reqHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            ...customHeaders,
          };
          if (currentCookie) reqHeaders['Cookie'] = currentCookie;
          if (refererUrl) reqHeaders['Referer'] = refererUrl;

          const req = client.request(
            currentUrl,
            {
              method: 'HEAD',
              agent,
              headers: reqHeaders,
              timeout: 15000,
            },
            (res) => {
              if (res.headers['set-cookie']) {
                currentCookie = mergeCookies(currentCookie, res.headers['set-cookie']);
              }

              if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
                redirectCount++;
                if (redirectCount > maxRedirects) {
                  return reject(new Error('Too many redirects'));
                }
                const redirectUrl = new URL(res.headers.location, currentUrl).toString();
                return attempt(redirectUrl, currentUrl);
              }

              if (res.statusCode && res.statusCode >= 400) {
                return attemptGet(currentUrl, refererUrl);
              }

              const contentLength = parseInt(res.headers['content-length'] || '0', 10);
              const acceptRanges = res.headers['accept-ranges'];
              const resumable = acceptRanges === 'bytes' || contentLength > 0;
              const mimeType = res.headers['content-type'];
              const filename = parseFilenameFromHeaders(res.headers, currentUrl);
              const category = detectCategory(filename, mimeType);

              resolve({
                url: currentUrl,
                filename,
                fileSize: isNaN(contentLength) ? 0 : contentLength,
                resumable,
                mimeType,
                category,
                suggestedSavePath: '',
              });
            }
          );

          req.on('error', () => {
            attemptGet(currentUrl, refererUrl);
          });
          req.on('timeout', () => {
            req.destroy();
            attemptGet(currentUrl, refererUrl);
          });
          req.end();
        } catch (err) {
          reject(err);
        }
      };

      const attemptGet = (currentUrl: string, refererUrl = '', withRange = true) => {
        try {
          const parsed = new URL(currentUrl);
          const isHttps = parsed.protocol === 'https:';
          const client = isHttps ? https : http;
          const agent = isHttps ? this.httpsAgent : this.httpAgent;

          const reqHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            ...customHeaders,
          };
          if (withRange) {
            reqHeaders['Range'] = 'bytes=0-0';
          }
          if (currentCookie) reqHeaders['Cookie'] = currentCookie;
          if (refererUrl) reqHeaders['Referer'] = refererUrl;

          const req = client.request(
            currentUrl,
            {
              method: 'GET',
              agent,
              headers: reqHeaders,
              timeout: 15000,
            },
            (res) => {
              if (res.headers['set-cookie']) {
                currentCookie = mergeCookies(currentCookie, res.headers['set-cookie']);
              }

              if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
                redirectCount++;
                if (redirectCount > maxRedirects) {
                  return reject(new Error('Too many redirects'));
                }
                const redirectUrl = new URL(res.headers.location, currentUrl).toString();
                return attemptGet(redirectUrl, currentUrl, withRange);
              }

              // If Range request was rejected with 400 or 416, retry without Range header
              if (withRange && (res.statusCode === 400 || res.statusCode === 416)) {
                req.destroy();
                return attemptGet(currentUrl, refererUrl, false);
              }

              let contentLength = 0;
              const contentRange = res.headers['content-range'];
              if (contentRange) {
                const totalMatch = contentRange.match(/\/(\d+)/);
                if (totalMatch && totalMatch[1]) {
                  contentLength = parseInt(totalMatch[1], 10);
                }
              }

              if (!contentLength && res.headers['content-length']) {
                contentLength = parseInt(res.headers['content-length'] || '0', 10);
              }

              const resumable = res.statusCode === 206 || res.headers['accept-ranges'] === 'bytes';
              const mimeType = res.headers['content-type'];
              let filename = parseFilenameFromHeaders(res.headers, currentUrl);

              // If response is HTML, check for Google Drive confirmation page
              if (mimeType?.includes('text/html')) {
                let htmlBody = '';
                res.on('data', (d: Buffer) => {
                  if (htmlBody.length < 50000) htmlBody += d.toString('utf-8');
                });
                res.on('end', () => {
                  const confirmedUrl = extractGoogleDriveConfirmation(htmlBody, currentUrl);
                  if (confirmedUrl && confirmedUrl !== currentUrl && redirectCount < maxRedirects) {
                    redirectCount++;
                    return attemptGet(confirmedUrl, currentUrl, withRange);
                  }
                  resolve({
                    url: currentUrl,
                    filename,
                    fileSize: isNaN(contentLength) ? 0 : contentLength,
                    resumable,
                    mimeType,
                    category: detectCategory(filename, mimeType),
                    suggestedSavePath: '',
                  });
                });
                return;
              }

              req.destroy();

              resolve({
                url: currentUrl,
                filename,
                fileSize: isNaN(contentLength) ? 0 : contentLength,
                resumable,
                mimeType,
                category: detectCategory(filename, mimeType),
                suggestedSavePath: '',
              });
            }
          );

          req.on('error', (err) => {
            if (withRange) {
              return attemptGet(currentUrl, refererUrl, false);
            }
            reject(err);
          });
          req.on('timeout', () => {
            req.destroy();
            if (withRange) {
              return attemptGet(currentUrl, refererUrl, false);
            }
            reject(new Error('Connection timed out while probing URL'));
          });
          req.end();
        } catch (err) {
          reject(err);
        }
      };

      attempt(urlStr);
    });
  }

  /**
   * Starts or Resumes a download task
   */
  async startDownload(task: DownloadTask, events: EngineEvents): Promise<void> {
    // Ensure task.savePath is a file path and not a directory
    try {
      if (fs.existsSync(task.savePath) && fs.statSync(task.savePath).isDirectory()) {
        task.savePath = path.join(task.savePath, task.filename);
      } else if (!task.savePath.endsWith(task.filename)) {
        task.savePath = path.join(task.savePath, task.filename);
      }
    } catch {}

    const targetDir = path.dirname(task.savePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Initialize segments if not present or single segment
    if (!task.segments || task.segments.length === 0) {
      if (task.resumable && task.fileSize > 0 && task.segmentsCount > 1) {
        task.segments = this.createSegments(task.fileSize, task.segmentsCount);
      } else {
        task.segmentsCount = 1;
        task.segments = [{
          id: 0,
          start: 0,
          end: task.fileSize > 0 ? task.fileSize - 1 : 0,
          downloaded: 0,
          total: task.fileSize,
          progress: 0,
          speed: 0,
          status: 'pending',
          color: this.segmentColors[0],
        }];
      }
    }

    task.status = 'downloading';
    this.speedHistories.set(task.id, [{ time: Date.now(), bytes: 0 }]);
    this.segmentSpeedHistories.set(task.id, new Map());

    if (isStreamingMediaUrl(task.url)) {
      return this.downloadStreamingMedia(task, events);
    } else if (task.segments.length === 1 && !task.resumable) {
      return this.downloadSingleStream(task, events);
    } else {
      return this.downloadMultiSegment(task, events);
    }
  }

  private createSegments(fileSize: number, count: number): DownloadSegment[] {
    const segments: DownloadSegment[] = [];
    const chunkSize = Math.floor(fileSize / count);

    for (let i = 0; i < count; i++) {
      const start = i * chunkSize;
      const end = i === count - 1 ? fileSize - 1 : (i + 1) * chunkSize - 1;
      const total = end - start + 1;

      segments.push({
        id: i,
        start,
        end,
        downloaded: 0,
        total,
        progress: 0,
        speed: 0,
        status: 'pending',
        color: this.segmentColors[i % this.segmentColors.length],
      });
    }

    return segments;
  }

  private async downloadMultiSegment(task: DownloadTask, events: EngineEvents): Promise<void> {
    const metaPath = `${task.savePath}.mdm.json`;
    let fileFd: number;

    try {
      if (fs.existsSync(task.savePath)) {
        fileFd = fs.openSync(task.savePath, 'r+');
      } else {
        fileFd = fs.openSync(task.savePath, 'w');
        if (task.fileSize > 0) {
          try {
            fs.ftruncateSync(fileFd, task.fileSize);
          } catch {}
        }
      }
    } catch (err: any) {
      task.status = 'error';
      task.errorMessage = `Failed to open destination file: ${err.message}`;
      events.onError(task, err);
      return;
    }

    let isAborted = false;
    const activeRequests: http.ClientRequest[] = [];
    let pendingWrites = 0;

    const abortHandler = () => {
      isAborted = true;
      activeRequests.forEach(req => {
        try { req.destroy(); } catch {}
      });
      setTimeout(() => {
        try { fs.closeSync(fileFd); } catch {}
      }, 200);
      this.saveMeta(metaPath, task);
    };

    this.activeStreams.set(task.id, { abort: abortHandler });

    const progressInterval = setInterval(() => {
      if (task.status !== 'downloading' || isAborted) {
        clearInterval(progressInterval);
        return;
      }
      this.updateSpeedsAndProgress(task);
      events.onProgress(task);
    }, 250);

    const segmentPromises = task.segments.map((seg) => {
      return new Promise<void>((resolve, reject) => {
        if (seg.downloaded >= seg.total && seg.total > 0) {
          seg.status = 'completed';
          seg.progress = 100;
          return resolve();
        }

        seg.status = 'downloading';
        const currentStart = seg.start + seg.downloaded;
        const currentEnd = seg.end;

        if (currentStart > currentEnd) {
          seg.status = 'completed';
          return resolve();
        }

        const requestSegment = (currentUrl: string, refererUrl = '', redirectCount = 0) => {
          if (isAborted) return;
          try {
            const parsedUrl = new URL(currentUrl);
            const isHttps = parsedUrl.protocol === 'https:';
            const client = isHttps ? https : http;
            const agent = isHttps ? this.httpsAgent : this.httpAgent;

            const reqHeaders: Record<string, string> = {
              Range: `bytes=${currentStart}-${currentEnd}`,
              'User-Agent': task.headers?.['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
              ...task.headers,
            };
            if (task.headers?.['Cookie']) reqHeaders['Cookie'] = task.headers['Cookie'];
            if (refererUrl) reqHeaders['Referer'] = refererUrl;

            const req = client.request(
              currentUrl,
              {
                method: 'GET',
                agent,
                headers: reqHeaders,
              },
              (res) => {
                if (res.headers['set-cookie'] && task.headers) {
                  task.headers['Cookie'] = mergeCookies(task.headers['Cookie'] || '', res.headers['set-cookie']);
                }

                if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
                  if (redirectCount > 8) {
                    seg.status = 'error';
                    return reject(new Error('Too many redirects in chunk stream'));
                  }
                  const redirectUrl = new URL(res.headers.location, currentUrl).toString();
                  return requestSegment(redirectUrl, currentUrl, redirectCount + 1);
                }

                // If server returned HTTP 200 to a non-zero range, it does not support Range requests!
                if (res.statusCode === 200 && currentStart > 0) {
                  seg.status = 'error';
                  return reject(new Error('Server does not support multi-segment Range requests (returned HTTP 200)'));
                }

                if (res.statusCode !== 200 && res.statusCode !== 206) {
                  seg.status = 'error';
                  return reject(new Error(`Server returned HTTP ${res.statusCode}`));
                }

                let writeOffset = currentStart;

                res.on('data', (chunk: Buffer) => {
                  if (isAborted) return;

                  const chunkSize = chunk.length;
                  const targetOffset = writeOffset;
                  writeOffset += chunkSize;

                  task.downloadedBytes += chunkSize;
                  seg.downloaded += chunkSize;
                  seg.progress = seg.total > 0 ? Math.min(100, Math.round((seg.downloaded / seg.total) * 100)) : 0;

                  const now = Date.now();
                  const history = this.speedHistories.get(task.id);
                  if (history) {
                    history.push({ time: now, bytes: chunkSize });
                  }

                  const segHistMap = this.segmentSpeedHistories.get(task.id);
                  if (segHistMap) {
                    let segHist = segHistMap.get(seg.id);
                    if (!segHist) {
                      segHist = [];
                      segHistMap.set(seg.id, segHist);
                    }
                    segHist.push({ time: now, bytes: chunkSize });
                  }

                  pendingWrites++;
                  fs.write(fileFd, chunk, 0, chunkSize, targetOffset, (writeErr) => {
                    pendingWrites--;
                    if (writeErr && !isAborted) {
                      req.destroy();
                      seg.status = 'error';
                      reject(writeErr);
                    }
                  });
                });

                res.on('end', () => {
                  if (isAborted) return;
                  seg.status = 'completed';
                  seg.progress = 100;
                  seg.speed = 0;
                  resolve();
                });

                res.on('error', (err) => {
                  if (!isAborted) {
                    seg.status = 'error';
                    reject(err);
                  }
                });
              }
            );

            activeRequests.push(req);

            req.on('error', (err) => {
              if (!isAborted) {
                seg.status = 'error';
                reject(err);
              }
            });

            req.end();
          } catch (err: any) {
            reject(err);
          }
        };

        requestSegment(task.url);
      });
    });

    try {
      await Promise.all(segmentPromises);

      const waitForWrites = async () => {
        while (pendingWrites > 0) {
          await new Promise((r) => setTimeout(r, 50));
        }
      };
      await waitForWrites();

      clearInterval(progressInterval);
      try {
        fs.closeSync(fileFd);
      } catch {}

      if (!isAborted) {
        task.status = 'completed';
        task.progress = 100;
        task.speed = 0;
        task.completedAt = Date.now();
        task.downloadedBytes = task.fileSize > 0 ? task.fileSize : task.downloadedBytes;
        
        if (fs.existsSync(metaPath)) {
          try { fs.unlinkSync(metaPath); } catch {}
        }

        this.activeStreams.delete(task.id);
        this.speedHistories.delete(task.id);
        this.segmentSpeedHistories.delete(task.id);
        events.onCompleted(task);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      try {
        fs.closeSync(fileFd);
      } catch {}

      // If multi-segment failed due to Range rejection (HTTP 200), automatically fallback to Single Stream!
      if (!isAborted && err.message?.includes('does not support multi-segment')) {
        console.log('Falling back from multi-segment to single stream download for:', task.url);
        task.resumable = false;
        task.segmentsCount = 1;
        task.segments = [{
          id: 0,
          start: 0,
          end: task.fileSize > 0 ? task.fileSize - 1 : 0,
          downloaded: 0,
          total: task.fileSize,
          progress: 0,
          speed: 0,
          status: 'pending',
          color: this.segmentColors[0],
        }];
        task.downloadedBytes = 0;
        return this.downloadSingleStream(task, events);
      }

      if (!isAborted) {
        task.status = 'error';
        task.errorMessage = err.message || 'Download failed';
        task.speed = 0;
        this.saveMeta(metaPath, task);
        this.activeStreams.delete(task.id);
        events.onError(task, err);
      }
    }
  }

  private async downloadSingleStream(task: DownloadTask, events: EngineEvents): Promise<void> {
    let isAborted = false;
    let fileStream: fs.WriteStream | null = null;
    let currentCookie = task.headers?.['Cookie'] || '';

    const startSingleStreamRequest = (currentUrl: string, refererUrl = '', redirectCount = 0) => {
      if (isAborted) return;
      try {
        const parsedUrl = new URL(currentUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;
        const agent = isHttps ? this.httpsAgent : this.httpAgent;

        const reqHeaders: Record<string, string> = {
          'User-Agent': task.headers?.['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          ...task.headers,
        };

        if (currentCookie) reqHeaders['Cookie'] = currentCookie;
        if (refererUrl) reqHeaders['Referer'] = refererUrl;

        if (task.resumable && task.downloadedBytes > 0) {
          reqHeaders['Range'] = `bytes=${task.downloadedBytes}-`;
        }

        const req = client.request(currentUrl, { method: 'GET', agent, headers: reqHeaders }, (res) => {
          if (res.headers['set-cookie']) {
            currentCookie = mergeCookies(currentCookie, res.headers['set-cookie']);
            if (task.headers) task.headers['Cookie'] = currentCookie;
          }

          if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
            if (redirectCount > 10) {
              task.status = 'error';
              task.errorMessage = 'Too many redirects';
              events.onError(task, new Error(task.errorMessage));
              return;
            }
            const redirectUrl = new URL(res.headers.location, currentUrl).toString();
            return startSingleStreamRequest(redirectUrl, currentUrl, redirectCount + 1);
          }

          if ((res.statusCode === 400 || res.statusCode === 416) && reqHeaders['Range']) {
            delete reqHeaders['Range'];
            task.resumable = false;
            task.downloadedBytes = 0;
            return startSingleStreamRequest(currentUrl, refererUrl, redirectCount);
          }

          if (res.statusCode !== 200 && res.statusCode !== 206) {
            task.status = 'error';
            task.errorMessage = `Server returned HTTP ${res.statusCode}`;
            events.onError(task, new Error(task.errorMessage));
            return;
          }

          if (!task.fileSize && res.headers['content-length']) {
            task.fileSize = parseInt(res.headers['content-length'], 10);
          }

          const contentType = (res.headers['content-type'] || '').toLowerCase();
          const ext = path.extname(task.filename).toLowerCase();
          const isBinaryExt = ['.zip', '.rar', '.7z', '.iso', '.exe', '.msi', '.tar', '.gz', '.mp4', '.mkv', '.mp3', '.pdf'].includes(ext);

          // Check for HTML response when expecting a binary file (e.g. Google Drive virus warning or login page)
          if (contentType.includes('text/html') && isBinaryExt) {
            let htmlBuffer = '';
            res.on('data', (chunk: Buffer) => {
              if (htmlBuffer.length < 100000) {
                htmlBuffer += chunk.toString('utf-8');
              }
            });
            res.on('end', () => {
              if (isAborted) return;
              const confirmedUrl = extractGoogleDriveConfirmation(htmlBuffer, currentUrl);
              if (confirmedUrl && confirmedUrl !== currentUrl && redirectCount < 10) {
                task.url = confirmedUrl;
                return startSingleStreamRequest(confirmedUrl, currentUrl, redirectCount + 1);
              }
              task.status = 'error';
              task.errorMessage = 'The server returned an HTML webpage (login required or session expired) instead of the file. Please trigger download from your browser with MDM.';
              events.onError(task, new Error(task.errorMessage));
            });
            return;
          }

          try {
            fileStream = fs.createWriteStream(task.savePath, { flags: task.downloadedBytes > 0 ? 'a' : 'w' });
          } catch (err: any) {
            task.status = 'error';
            task.errorMessage = err.message;
            events.onError(task, err);
            return;
          }

          const progressInterval = setInterval(() => {
            if (task.status !== 'downloading') {
              clearInterval(progressInterval);
              return;
            }
            this.updateSpeedsAndProgress(task);
            events.onProgress(task);
          }, 250);

          res.on('data', (chunk: Buffer) => {
            if (isAborted) return;
            const chunkSize = chunk.length;
            task.downloadedBytes += chunkSize;
            if (task.segments && task.segments[0]) {
              task.segments[0].downloaded = task.downloadedBytes;
            }

            const now = Date.now();
            const history = this.speedHistories.get(task.id);
            if (history) {
              history.push({ time: now, bytes: chunkSize });
            }

            if (fileStream) {
              fileStream.write(chunk);
            }
          });

          res.on('end', () => {
            clearInterval(progressInterval);
            if (fileStream) {
              fileStream.end(() => {
                if (isAborted) return;

                // Validate completion
                if (task.fileSize > 0 && task.downloadedBytes < task.fileSize) {
                  task.status = 'error';
                  task.errorMessage = `Download incomplete: received ${task.downloadedBytes} of ${task.fileSize} bytes.`;
                  this.activeStreams.delete(task.id);
                  this.speedHistories.delete(task.id);
                  events.onError(task, new Error(task.errorMessage));
                  return;
                }

                // If file size was unknown/chunked but downloadedBytes is negligible (< 100 bytes) for binary archives
                if (isBinaryExt && task.downloadedBytes < 100) {
                  task.status = 'error';
                  task.errorMessage = `Download terminated prematurely by server (received ${task.downloadedBytes} bytes). Please re-initiate download from browser.`;
                  try { fs.unlinkSync(task.savePath); } catch {}
                  this.activeStreams.delete(task.id);
                  this.speedHistories.delete(task.id);
                  events.onError(task, new Error(task.errorMessage));
                  return;
                }

                task.status = 'completed';
                task.progress = 100;
                task.speed = 0;
                task.completedAt = Date.now();
                this.activeStreams.delete(task.id);
                this.speedHistories.delete(task.id);
                events.onCompleted(task);
              });
            }
          });

          res.on('error', (err) => {
            clearInterval(progressInterval);
            if (!isAborted) {
              task.status = 'error';
              task.errorMessage = err.message;
              task.speed = 0;
              this.activeStreams.delete(task.id);
              events.onError(task, err);
            }
          });
        });

        this.activeStreams.set(task.id, {
          abort: () => {
            isAborted = true;
            try { req.destroy(); } catch {}
            try { if (fileStream) fileStream.close(); } catch {}
          }
        });

        req.on('error', (err) => {
          if (!isAborted) {
            task.status = 'error';
            task.errorMessage = err.message;
            task.speed = 0;
            this.activeStreams.delete(task.id);
            events.onError(task, err);
          }
        });

        req.end();
      } catch (err: any) {
        task.status = 'error';
        task.errorMessage = err.message;
        events.onError(task, err);
      }
    };

    startSingleStreamRequest(task.url);
  }

  private async downloadStreamingMedia(task: DownloadTask, events: EngineEvents): Promise<void> {
    let isAborted = false;
    const ytDlp = getYtDlpPath();

    // Ensure save directory exists
    const saveDir = path.dirname(task.savePath);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    // Set up 8 segment threads for interactive visual block progress
    task.segmentsCount = 8;
    task.segments = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      start: 0,
      end: 0,
      downloaded: 0,
      total: 0,
      progress: 0,
      speed: 0,
      status: 'pending',
      color: this.segmentColors[i % this.segmentColors.length],
    }));

    // Check if task is requested as Audio or Video
    const isAudio = 
      task.mediaType === 'audio' || 
      task.category === 'audio' ||
      task.savePath.toLowerCase().endsWith('.mp3') ||
      task.savePath.toLowerCase().endsWith('.m4a') ||
      task.savePath.toLowerCase().endsWith('.flac') ||
      task.savePath.toLowerCase().endsWith('.wav') ||
      task.savePath.toLowerCase().endsWith('.opus');

    const args = [
      task.url,
      '-o', task.savePath,
      '--no-playlist',
      '--newline',
      '--progress-template', 'MDMPROGRESS:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress.downloaded_bytes)s|%(progress.total_bytes,progress.total_bytes_estimate)s'
    ];

    if (isAudio) {
      const ext = path.extname(task.savePath).replace('.', '').toLowerCase();
      const audioFormat = task.audioFormat || (['mp3', 'm4a', 'flac', 'wav', 'opus'].includes(ext) ? ext : 'mp3');
      args.push(
        '-x',
        '--audio-format', audioFormat,
        '--audio-quality', '0',
        '--format', 'bestaudio/best'
      );
    } else {
      const quality = task.mediaQuality || 'best';
      let formatArg = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best';
      if (quality !== 'best' && quality.endsWith('p')) {
        const h = quality.replace('p', '');
        formatArg = `bestvideo[height<=${h}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${h}]+bestaudio/best[height<=${h}]/best`;
      }
      args.push(
        '--format', formatArg,
        '--merge-output-format', 'mp4'
      );
    }

    const child = spawn(ytDlp, args);

    this.activeStreams.set(task.id, {
      abort: () => {
        isAborted = true;
        try { child.kill('SIGTERM'); } catch {}
      }
    });

    child.stdout.on('data', (data: Buffer) => {
      if (isAborted) return;
      const lines = data.toString().split('\n');

      for (const line of lines) {
        if (line.includes('MDMPROGRESS:')) {
          const parts = line.split('MDMPROGRESS:')[1]?.split('|');
          if (parts && parts.length >= 5) {
            const rawPercent = parseFloat(parts[0].replace('%', '').trim()) || 0;
            const speedStr = parts[1].trim();
            const downloadedBytes = parseInt(parts[3].trim(), 10) || 0;
            const totalBytes = parseInt(parts[4].trim(), 10) || 0;

            task.progress = Math.min(99, Math.round(rawPercent));
            if (downloadedBytes > 0) task.downloadedBytes = downloadedBytes;
            if (totalBytes > 0 && !task.fileSize) task.fileSize = totalBytes;

            if (speedStr.includes('MiB/s')) {
              task.speed = Math.round(parseFloat(speedStr) * 1024 * 1024);
            } else if (speedStr.includes('KiB/s')) {
              task.speed = Math.round(parseFloat(speedStr) * 1024);
            } else if (speedStr.includes('GiB/s')) {
              task.speed = Math.round(parseFloat(speedStr) * 1024 * 1024 * 1024);
            }

            // Distribute progress across visual segment blocks
            const activeBlock = Math.min(7, Math.floor((rawPercent / 100) * 8));
            task.segments?.forEach((seg, idx) => {
              if (idx < activeBlock) {
                seg.progress = 100;
                seg.status = 'completed';
              } else if (idx === activeBlock) {
                seg.progress = Math.min(100, Math.round(((rawPercent % 12.5) / 12.5) * 100));
                seg.status = 'downloading';
                seg.speed = task.speed;
              } else {
                seg.progress = 0;
                seg.status = 'pending';
              }
            });

            events.onProgress(task);
          }
        }
      }
    });

    let stderrOutput = '';
    child.stderr.on('data', (d) => {
      stderrOutput += d.toString();
    });

    child.on('close', (code) => {
      this.activeStreams.delete(task.id);
      if (isAborted) return;

      if (code === 0) {
        task.status = 'completed';
        task.progress = 100;
        task.speed = 0;
        task.completedAt = Date.now();
        if (task.segments) {
          task.segments.forEach(s => { s.progress = 100; s.status = 'completed'; });
        }
        events.onCompleted(task);
      } else {
        task.status = 'error';
        task.errorMessage = stderrOutput.split('\n').filter(Boolean).pop() || `Video download exited with code ${code}`;
        task.speed = 0;
        events.onError(task, new Error(task.errorMessage));
      }
    });

    child.on('error', (err) => {
      this.activeStreams.delete(task.id);
      if (!isAborted) {
        task.status = 'error';
        task.errorMessage = err.message;
        task.speed = 0;
        events.onError(task, err);
      }
    });
  }

  /**
   * Silky smooth rolling speed calculation using 1.2s window
   */
  private updateSpeedsAndProgress(task: DownloadTask): void {
    const now = Date.now();
    const windowMs = 1200; // 1.2 second rolling window
    const cutoff = now - windowMs;

    // Calculate overall speed
    const history = this.speedHistories.get(task.id);
    if (history) {
      // Remove old entries
      while (history.length > 0 && history[0].time < cutoff) {
        history.shift();
      }

      if (history.length > 0) {
        const totalBytesInWindow = history.reduce((sum, h) => sum + h.bytes, 0);
        const oldestTime = history[0].time;
        const durationSec = Math.max(0.3, (now - oldestTime) / 1000);
        task.speed = Math.round(totalBytesInWindow / durationSec);
      } else {
        task.speed = 0;
      }
    }

    // Calculate individual segment speeds
    const segHistMap = this.segmentSpeedHistories.get(task.id);
    if (segHistMap && task.segments) {
      task.segments.forEach((seg) => {
        const segHist = segHistMap.get(seg.id);
        if (segHist) {
          while (segHist.length > 0 && segHist[0].time < cutoff) {
            segHist.shift();
          }
          if (segHist.length > 0 && seg.status === 'downloading') {
            const bytesInWindow = segHist.reduce((sum, h) => sum + h.bytes, 0);
            const oldestTime = segHist[0].time;
            const durationSec = Math.max(0.3, (now - oldestTime) / 1000);
            seg.speed = Math.round(bytesInWindow / durationSec);
          } else {
            seg.speed = 0;
          }
        }
      });
    }

    // Calculate ETA
    if (task.fileSize > 0 && task.speed > 0) {
      const remainingBytes = Math.max(0, task.fileSize - task.downloadedBytes);
      task.eta = Math.max(0, Math.round(remainingBytes / task.speed));
    } else {
      task.eta = 0;
    }

    if (task.fileSize > 0) {
      task.progress = Math.min(100, parseFloat(((task.downloadedBytes / task.fileSize) * 100).toFixed(1)));
    }
  }

  private saveMeta(metaPath: string, task: DownloadTask): void {
    try {
      fs.writeFileSync(metaPath, JSON.stringify({
        id: task.id,
        segments: task.segments,
        downloadedBytes: task.downloadedBytes,
        fileSize: task.fileSize,
      }), 'utf-8');
    } catch {}
  }

  pauseDownload(task: DownloadTask): boolean {
    const active = this.activeStreams.get(task.id);
    if (active) {
      active.abort();
      this.activeStreams.delete(task.id);
      task.status = 'paused';
      task.speed = 0;
      return true;
    }
    return false;
  }

  cancelDownload(task: DownloadTask, deleteFile: boolean = false): boolean {
    const active = this.activeStreams.get(task.id);
    if (active) {
      active.abort();
      this.activeStreams.delete(task.id);
    }
    task.status = 'cancelled';
    task.speed = 0;

    if (deleteFile) {
      try {
        if (fs.existsSync(task.savePath)) {
          fs.unlinkSync(task.savePath);
        }
        const metaPath = `${task.savePath}.mdm.json`;
        if (fs.existsSync(metaPath)) {
          fs.unlinkSync(metaPath);
        }
      } catch {}
    }

    return true;
  }

  async calculateChecksum(filePath: string, algorithm: 'md5' | 'sha256' = 'sha256'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        return reject(new Error('File does not exist'));
      }
      try {
        if (fs.statSync(filePath).isDirectory()) {
          return reject(new Error('Cannot compute checksum on a directory'));
        }
      } catch (e: any) {
        return reject(e);
      }

      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }
}
