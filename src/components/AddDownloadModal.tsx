import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Folder, 
  Sliders, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Film,
  Music
} from 'lucide-react';
import { AddDownloadParams, DownloadCategory, ProbeResult } from '../types/download';
import { formatBytes, formatTime } from '../utils/format';

interface AddDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (params: AddDownloadParams) => Promise<any>;
  initialUrl?: string;
  defaultSegments: number;
}

export const AddDownloadModal: React.FC<AddDownloadModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  initialUrl = '',
  defaultSegments,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [filename, setFilename] = useState('');
  const [savePath, setSavePath] = useState('');
  const [category, setCategory] = useState<DownloadCategory>('others');
  const [segmentsCount, setSegmentsCount] = useState(defaultSegments || 8);
  const [autoStart, setAutoStart] = useState(true);

  // Streaming Media format & quality selection
  const [mediaType, setMediaType] = useState<'video' | 'audio'>('video');
  const [mediaQuality, setMediaQuality] = useState<string>('best');
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'm4a' | 'flac' | 'wav' | 'opus'>('mp3');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customUserAgent, setCustomUserAgent] = useState('');
  const [customReferer, setCustomReferer] = useState('');
  const [customCookie, setCustomCookie] = useState('');

  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl || '');
      if (initialUrl && initialUrl.startsWith('http')) {
        handleProbe(initialUrl);
      }
    } else {
      setProbeResult(null);
      setProbeError(null);
      setFilename('');
      setSavePath('');
    }
  }, [isOpen, initialUrl]);

  const handleProbe = async (urlToProbe: string) => {
    if (!urlToProbe || !urlToProbe.startsWith('http')) return;
    setIsProbing(true);
    setProbeError(null);

    try {
      const headers: Record<string, string> = {};
      if (customUserAgent) headers['User-Agent'] = customUserAgent;
      if (customReferer) headers['Referer'] = customReferer;
      if (customCookie) headers['Cookie'] = customCookie;

      const result = await window.electronAPI.probeUrl(urlToProbe.trim(), headers);
      setProbeResult(result);
      if (result.filename && !filename) {
        setFilename(result.filename);
      }
      if (result.category) {
        setCategory(result.category);
      }
      if (result.isStreamingMedia) {
        setMediaType('video');
        setMediaQuality('best');
      }
    } catch (err: any) {
      setProbeError(err.message || 'Unable to probe URL info');
    } finally {
      setIsProbing(false);
    }
  };

  const handleBrowseFolder = async () => {
    try {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        setSavePath(selected);
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = {};
      if (customUserAgent) headers['User-Agent'] = customUserAgent;
      if (customReferer) headers['Referer'] = customReferer;
      if (customCookie) headers['Cookie'] = customCookie;

      await onAdd({
        url: url.trim(),
        filename: filename.trim() || undefined,
        savePath: savePath.trim() || undefined,
        category: mediaType === 'audio' && probeResult?.isStreamingMedia ? 'audio' : category,
        segmentsCount,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        autoStart,
        mediaType: probeResult?.isStreamingMedia ? mediaType : undefined,
        mediaQuality: probeResult?.isStreamingMedia ? mediaQuality : undefined,
        audioFormat: probeResult?.isStreamingMedia && mediaType === 'audio' ? audioFormat : undefined,
      });

      onClose();
    } catch (err: any) {
      setProbeError(err.message || 'Failed to create download');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none text-xs">
      <div className="w-full max-w-lg bg-theme-surface border border-theme-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-theme-card border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-brand/15 text-brand flex items-center justify-center border border-brand/30">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-theme-text">New Download</h3>
              <p className="text-[11px] text-theme-muted">Configure URL and media properties</p>
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
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto max-h-[78vh]">
          {/* URL Input */}
          <div>
            <label className="block text-[11px] font-medium text-theme-text mb-1">
              URL <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="https://example.com/file.zip or YouTube link..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => handleProbe(url)}
                className="w-full bg-theme-card border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text placeholder-theme-sub focus:outline-none focus:border-brand transition font-mono pr-16"
                required
              />
              <button
                type="button"
                onClick={() => handleProbe(url)}
                disabled={isProbing || !url}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-theme-hover text-theme-muted hover:text-theme-text text-[10px] font-medium border border-theme-border transition disabled:opacity-50"
              >
                {isProbing ? <Loader2 className="w-2.5 h-2.5 animate-spin text-brand" /> : 'Inspect'}
              </button>
            </div>
          </div>

          {/* Probe Status Tile */}
          {probeResult && (
            <div className="p-2.5 rounded-md bg-theme-card border border-theme-border text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-theme-text truncate max-w-xs">{probeResult.filename}</span>
                <span className="font-mono text-brand font-semibold">
                  {probeResult.fileSize > 0 ? formatBytes(probeResult.fileSize) : 'Dynamic Stream'}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-theme-muted">
                <CheckCircle2 className={`w-3 h-3 ${probeResult.resumable ? 'text-brand' : 'text-amber-400'}`} />
                <span>{probeResult.isStreamingMedia ? 'Media Stream (yt-dlp)' : probeResult.resumable ? 'Resumable (Range Supported)' : 'Single Stream'}</span>
              </div>
            </div>
          )}

          {probeError && (
            <div className="p-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" />
              <span>{probeError}</span>
            </div>
          )}

          {/* Streaming Media & Quality Options */}
          {(probeResult?.isStreamingMedia || (probeResult?.availableFormats && probeResult.availableFormats.length > 0)) && (
            <div className="p-3 rounded-md bg-theme-card border border-brand/30 space-y-3">
              {probeResult.mediaThumbnail && (
                <div className="flex items-center space-x-2.5 p-2 rounded bg-theme-surface border border-theme-border">
                  <img src={probeResult.mediaThumbnail} alt="Thumbnail" className="w-16 h-10 object-cover rounded border border-theme-border flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-theme-text text-[11px] truncate">{probeResult.mediaTitle || filename}</h4>
                    <div className="flex items-center space-x-2 text-[10px] text-theme-muted mt-0.5">
                      {probeResult.mediaDuration ? <span>⏱ {formatTime(probeResult.mediaDuration)}</span> : null}
                      {probeResult.mediaUploader && <span>👤 {probeResult.mediaUploader}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode Switch: Video vs Audio */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMediaType('video');
                    setCategory('video');
                    const base = filename.replace(/\.(mp3|m4a|flac|wav|opus|webm|mp4)$/i, '');
                    setFilename(`${base}.mp4`);
                  }}
                  className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded border text-xs font-medium transition cursor-pointer ${
                    mediaType === 'video'
                      ? 'bg-theme-surface border-brand text-brand font-semibold shadow-xs'
                      : 'bg-theme-surface border-theme-border text-theme-muted hover:text-theme-text'
                  }`}
                >
                  <Film className="w-3 h-3" />
                  <span>Video (+ Audio)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaType('audio');
                    setCategory('audio');
                    const base = filename.replace(/\.(mp3|m4a|flac|wav|opus|webm|mp4)$/i, '');
                    setFilename(`${base}.${audioFormat}`);
                  }}
                  className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded border text-xs font-medium transition cursor-pointer ${
                    mediaType === 'audio'
                      ? 'bg-theme-surface border-brand text-brand font-semibold shadow-xs'
                      : 'bg-theme-surface border-theme-border text-theme-muted hover:text-theme-text'
                  }`}
                >
                  <Music className="w-3 h-3" />
                  <span>Audio Only</span>
                </button>
              </div>

              {/* Video Quality Options */}
              {mediaType === 'video' && (
                <div>
                  <label className="block text-[10px] font-medium text-theme-text mb-1">Quality</label>
                  <select
                    value={mediaQuality}
                    onChange={(e) => setMediaQuality(e.target.value)}
                    className="w-full bg-theme-surface border border-theme-border rounded px-2.5 py-1.5 text-xs text-theme-text focus:outline-none focus:border-brand cursor-pointer"
                  >
                    <option value="best">Best (Original / Max)</option>
                    <option value="2160p">4K Ultra HD (2160p)</option>
                    <option value="1440p">2K Quad HD (1440p)</option>
                    <option value="1080p">Full HD (1080p)</option>
                    <option value="720p">HD (720p)</option>
                    <option value="480p">Standard SD (480p)</option>
                    <option value="360p">Low (360p)</option>
                  </select>
                </div>
              )}

              {/* Audio Format Options */}
              {mediaType === 'audio' && (
                <div>
                  <label className="block text-[10px] font-medium text-theme-text mb-1">Audio Format</label>
                  <select
                    value={audioFormat}
                    onChange={(e) => {
                      const newFmt = e.target.value as any;
                      setAudioFormat(newFmt);
                      const base = filename.replace(/\.(mp3|m4a|flac|wav|opus|webm|mp4)$/i, '');
                      setFilename(`${base}.${newFmt}`);
                    }}
                    className="w-full bg-theme-surface border border-theme-border rounded px-2.5 py-1.5 text-xs text-theme-text focus:outline-none focus:border-brand cursor-pointer"
                  >
                    <option value="mp3">MP3 (320kbps High Quality)</option>
                    <option value="m4a">M4A / AAC (Original Audio)</option>
                    <option value="flac">FLAC (Lossless)</option>
                    <option value="wav">WAV (Uncompressed PCM)</option>
                    <option value="opus">Opus (Modern High-Efficiency)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Filename */}
          <div>
            <label className="block text-[11px] font-medium text-theme-text mb-1">
              File Name
            </label>
            <input
              type="text"
              placeholder="e.g. document.pdf"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full bg-theme-card border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text focus:outline-none focus:border-brand transition"
            />
          </div>

          {/* Save Directory */}
          <div>
            <label className="block text-[11px] font-medium text-theme-text mb-1">
              Save Directory
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Default Category Folder"
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                className="flex-1 bg-theme-card border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono text-[11px] focus:outline-none focus:border-brand transition"
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="px-2.5 py-1.5 rounded-md bg-theme-card hover:bg-theme-hover border border-theme-border text-theme-muted hover:text-theme-text transition cursor-pointer"
              >
                <Folder className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Category & Stream Segments */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-theme-text mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DownloadCategory)}
                className="w-full bg-theme-card border border-theme-border rounded-md px-2.5 py-1.5 text-xs text-theme-text focus:outline-none focus:border-brand cursor-pointer"
              >
                <option value="compressed">Compressed</option>
                <option value="programs">Programs</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="documents">Documents</option>
                <option value="images">Images</option>
                <option value="others">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-theme-text mb-1">
                Stream Threads
              </label>
              <select
                value={segmentsCount}
                onChange={(e) => setSegmentsCount(Number(e.target.value))}
                className="w-full bg-theme-card border border-theme-border rounded-md px-2.5 py-1.5 text-xs text-theme-text focus:outline-none focus:border-brand font-mono cursor-pointer"
              >
                <option value={1}>1 Stream</option>
                <option value={4}>4 Streams</option>
                <option value={8}>8 Streams (Default)</option>
                <option value={16}>16 Streams</option>
                <option value={32}>32 Streams</option>
              </select>
            </div>
          </div>

          {/* Advanced Headers Accordion */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-1.5 text-[11px] text-theme-muted hover:text-theme-text transition cursor-pointer"
            >
              <Sliders className="w-3 h-3 text-brand" />
              <span>{showAdvanced ? 'Hide Advanced Options' : 'Custom Headers (Auth / Cookies)'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-2.5 space-y-2 p-3 rounded-md bg-theme-card/50 border border-theme-border">
                <div>
                  <label className="block text-[10px] font-medium text-theme-muted mb-0.5">
                    User-Agent Header
                  </label>
                  <input
                    type="text"
                    placeholder="Mozilla/5.0..."
                    value={customUserAgent}
                    onChange={(e) => setCustomUserAgent(e.target.value)}
                    className="w-full bg-theme-card border border-theme-border rounded px-2 py-1 text-[11px] text-theme-text font-mono focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-theme-muted mb-0.5">
                    Referer Header
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={customReferer}
                    onChange={(e) => setCustomReferer(e.target.value)}
                    className="w-full bg-theme-card border border-theme-border rounded px-2 py-1 text-[11px] text-theme-text font-mono focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-theme-muted mb-0.5">
                    Cookie Header
                  </label>
                  <input
                    type="text"
                    placeholder="session_id=...; auth=..."
                    value={customCookie}
                    onChange={(e) => setCustomCookie(e.target.value)}
                    className="w-full bg-theme-card border border-theme-border rounded px-2 py-1 text-[11px] text-theme-text font-mono focus:outline-none focus:border-brand"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Auto-start checkbox */}
          <div className="flex items-center space-x-2 pt-1 border-t border-theme-border">
            <input
              type="checkbox"
              id="autoStart"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-theme-card border-theme-border text-brand focus:ring-0 cursor-pointer accent-[#84ce19]"
            />
            <label htmlFor="autoStart" className="text-xs text-theme-text cursor-pointer">
              Start download immediately
            </label>
          </div>

          {/* Submit Actions */}
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
              disabled={isSubmitting || !url.trim()}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-[#84ce19] hover:bg-[#73b814] disabled:opacity-50 text-[#0a1f01] font-semibold transition cursor-pointer shadow-sm"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 stroke-[2.5]" />}
              <span>{isSubmitting ? 'Creating...' : 'Download Now'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
