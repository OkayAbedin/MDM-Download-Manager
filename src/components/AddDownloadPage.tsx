import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Folder, 
  Cpu, 
  Layers, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  ClipboardPaste,
  ShieldCheck,
  FileText,
  FolderArchive,
  AppWindow,
  Film,
  Music,
  Image as ImageIcon
} from 'lucide-react';
import { AddDownloadParams, DownloadCategory, ProbeResult } from '../types/download';
import { formatBytes, formatTime } from '../utils/format';

interface AddDownloadPageProps {
  initialUrl?: string;
  defaultSegments: number;
  onAdd: (params: AddDownloadParams) => Promise<any>;
  onBackToDownloads: () => void;
}

export const AddDownloadPage: React.FC<AddDownloadPageProps> = ({
  initialUrl = '',
  defaultSegments = 8,
  onAdd,
  onBackToDownloads,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [filename, setFilename] = useState('');
  const [saveDir, setSaveDir] = useState('');
  const [segmentsCount, setSegmentsCount] = useState(defaultSegments);
  const [category, setCategory] = useState<DownloadCategory>('others');
  const [autoStart, setAutoStart] = useState(true);
  
  // Streaming media format & quality selection
  const [mediaType, setMediaType] = useState<'video' | 'audio'>('video');
  const [mediaQuality, setMediaQuality] = useState<string>('best');
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'm4a' | 'flac' | 'wav' | 'opus'>('mp3');

  // Advanced Auth / Custom Headers
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customUserAgent, setCustomUserAgent] = useState('');
  const [customCookie, setCustomCookie] = useState('');
  const [customReferer, setCustomReferer] = useState('');

  // Probing State
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
      handleProbeUrl(initialUrl);
    }
  }, [initialUrl]);

  const handleProbeUrl = async (urlToProbe: string) => {
    const trimmed = urlToProbe.trim();
    if (!trimmed || !trimmed.startsWith('http')) return;

    setIsProbing(true);
    setProbeError(null);

    try {
      const headers: Record<string, string> = {};
      if (customUserAgent) headers['User-Agent'] = customUserAgent;
      if (customCookie) headers['Cookie'] = customCookie;
      if (customReferer) headers['Referer'] = customReferer;

      const result = await window.electronAPI.probeUrl(trimmed, headers);
      setProbeResult(result);
      if (result.filename) setFilename(result.filename);
      if (result.category) setCategory(result.category);
      if (result.suggestedSavePath) setSaveDir(result.suggestedSavePath);
      
      // Default to video mode if media is detected
      if (result.isStreamingMedia) {
        setMediaType('video');
        setMediaQuality('best');
      }
    } catch (err: any) {
      setProbeError(err.message || 'Failed to connect to server');
    } finally {
      setIsProbing(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().startsWith('http')) {
        setUrl(text.trim());
        handleProbeUrl(text.trim());
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
    if (!url.trim()) return;

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = {};
      if (customUserAgent) headers['User-Agent'] = customUserAgent;
      if (customCookie) headers['Cookie'] = customCookie;
      if (customReferer) headers['Referer'] = customReferer;

      const targetPath = saveDir ? `${saveDir}\\${filename}` : filename;

      await onAdd({
        url: url.trim(),
        filename: filename.trim() || 'download',
        savePath: targetPath,
        segmentsCount,
        category: mediaType === 'audio' && probeResult?.isStreamingMedia ? 'audio' : category,
        autoStart,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        mediaType: probeResult?.isStreamingMedia ? mediaType : undefined,
        mediaQuality: probeResult?.isStreamingMedia ? mediaQuality : undefined,
        audioFormat: probeResult?.isStreamingMedia && mediaType === 'audio' ? audioFormat : undefined,
      });

      onBackToDownloads();
    } catch (err) {
      console.error('Failed to create download:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories: { id: DownloadCategory; label: string; icon: any }[] = [
    { id: 'compressed', label: 'Compressed', icon: FolderArchive },
    { id: 'programs', label: 'Programs', icon: AppWindow },
    { id: 'video', label: 'Video', icon: Film },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'others', label: 'General', icon: Layers },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-theme-main overflow-hidden text-xs select-none transition-colors duration-200">
      {/* Top Action Bar */}
      <div className="h-12 border-b border-theme-border bg-theme-surface px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-theme-text text-[13px]">New Download</span>
          <span className="text-theme-sub text-[11px]">• Direct link or streaming media</span>
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
            disabled={isSubmitting || !url.trim()}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-[#84ce19] hover:bg-[#73b814] active:scale-95 disabled:opacity-50 text-[#0a1f01] font-semibold transition cursor-pointer shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>{isSubmitting ? 'Starting...' : 'Start Download'}</span>
          </button>
        </div>
      </div>

      {/* Main Settings/Form Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-6 space-y-6">
          
          {/* Section 1: Target URL */}
          <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-theme-border bg-theme-surface flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-theme-text text-xs">Target URL</h3>
                <p className="text-[11px] text-theme-muted mt-0.5">HTTP/HTTPS link, video stream URL, or direct media link</p>
              </div>
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

            <div className="p-5 space-y-3 bg-theme-card">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Globe className="w-3.5 h-3.5 absolute left-3 top-2.5 text-theme-sub" />
                  <input
                    type="text"
                    placeholder="https://example.com/file.zip or YouTube link..."
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setProbeResult(null);
                    }}
                    onBlur={() => handleProbeUrl(url)}
                    className="w-full bg-theme-main border border-theme-border rounded-md pl-9 pr-3 py-2 text-xs text-theme-text font-mono placeholder-theme-sub focus:outline-none focus:border-brand transition"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleProbeUrl(url)}
                  disabled={isProbing || !url.trim()}
                  className="px-3.5 py-2 rounded-md bg-theme-surface hover:bg-theme-hover border border-theme-border text-theme-text text-xs font-medium transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isProbing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" /> : <span>Inspect</span>}
                </button>
              </div>

              {/* Probe feedback banner */}
              {isProbing && (
                <div className="flex items-center space-x-2 p-2.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[11px]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Inspecting server capabilities, HTTP headers and media streams...</span>
                </div>
              )}

              {probeResult && !isProbing && (
                <div className="flex items-center justify-between p-3 rounded-md bg-theme-main border border-theme-border text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-2 h-2 rounded-full bg-brand" />
                    <span className="font-semibold text-theme-text">
                      {probeResult.fileSize > 0 ? formatBytes(probeResult.fileSize) : 'Dynamic Stream'}
                    </span>
                    <span className="text-theme-sub">•</span>
                    <span className="text-theme-muted font-mono">{probeResult.mimeType || 'octet-stream'}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-brand/10 text-brand border border-brand/25">
                    {probeResult.isStreamingMedia ? 'Media Stream (yt-dlp)' : probeResult.resumable ? 'Resumable Stream' : 'Single Stream'}
                  </span>
                </div>
              )}

              {probeError && !isProbing && (
                <div className="flex items-center space-x-2 p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{probeError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Streaming Media & Quality Selector */}
          {(probeResult?.isStreamingMedia || (probeResult?.availableFormats && probeResult.availableFormats.length > 0)) && (
            <div className="border border-brand/30 rounded-lg bg-theme-surface overflow-hidden shadow-xs animate-in fade-in duration-200">
              <div className="px-5 py-3.5 border-b border-theme-border bg-brand/5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Film className="w-4 h-4 text-brand" />
                  <div>
                    <h3 className="font-semibold text-theme-text text-xs">Streaming Media Options</h3>
                    <p className="text-[11px] text-theme-muted">Select audio vs video stream format and resolution quality</p>
                  </div>
                </div>
                {probeResult.mediaUploader && (
                  <span className="text-[11px] font-medium text-theme-sub bg-theme-main px-2.5 py-1 rounded border border-theme-border">
                    {probeResult.mediaUploader}
                  </span>
                )}
              </div>

              <div className="p-5 space-y-4 bg-theme-card">
                {/* Media Preview Card */}
                {probeResult.mediaThumbnail && (
                  <div className="flex items-center space-x-3.5 p-3 rounded-md bg-theme-main border border-theme-border">
                    <img 
                      src={probeResult.mediaThumbnail} 
                      alt="Thumbnail" 
                      className="w-24 h-14 object-cover rounded border border-theme-border flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-theme-text text-xs truncate" title={probeResult.mediaTitle || filename}>
                        {probeResult.mediaTitle || filename}
                      </h4>
                      <div className="flex items-center space-x-3 mt-1.5 text-[11px] text-theme-muted">
                        {probeResult.mediaDuration ? (
                          <span>⏱ {formatTime(probeResult.mediaDuration)}</span>
                        ) : null}
                        {probeResult.mediaUploader && (
                          <span>👤 {probeResult.mediaUploader}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Media Type Toggle: Video vs Audio */}
                <div>
                  <label className="block text-[11px] font-medium text-theme-text mb-2">
                    Download Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMediaType('video');
                        setCategory('video');
                        const base = filename.replace(/\.(mp3|m4a|flac|wav|opus|webm|mp4)$/i, '');
                        setFilename(`${base}.mp4`);
                      }}
                      className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-md border text-xs font-medium transition cursor-pointer ${
                        mediaType === 'video'
                          ? 'bg-theme-main border-brand text-brand font-semibold shadow-xs'
                          : 'bg-theme-main border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-hover'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
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
                      className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-md border text-xs font-medium transition cursor-pointer ${
                        mediaType === 'audio'
                          ? 'bg-theme-main border-brand text-brand font-semibold shadow-xs'
                          : 'bg-theme-main border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-hover'
                      }`}
                    >
                      <Music className="w-3.5 h-3.5" />
                      <span>Audio Only (MP3/M4A)</span>
                    </button>
                  </div>
                </div>

                {/* Quality Selector for Video */}
                {mediaType === 'video' && (
                  <div>
                    <label className="block text-[11px] font-medium text-theme-text mb-2">
                      Video Resolution & Quality
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {[
                        { id: 'best', label: 'Best (Original / Max)' },
                        { id: '2160p', label: '4K Ultra HD (2160p)' },
                        { id: '1440p', label: '2K Quad HD (1440p)' },
                        { id: '1080p', label: 'Full HD (1080p)' },
                        { id: '720p', label: 'HD (720p)' },
                        { id: '480p', label: 'Standard SD (480p)' },
                        { id: '360p', label: 'Low (360p)' },
                      ].map((fmt) => {
                        const isSelected = mediaQuality === fmt.id;
                        return (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => setMediaQuality(fmt.id)}
                            className={`py-2 px-2.5 rounded-md border text-center transition cursor-pointer ${
                              isSelected
                                ? 'bg-theme-main border-brand text-brand font-semibold shadow-xs'
                                : 'bg-theme-main border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-hover'
                            }`}
                          >
                            <span className="block text-xs font-medium">{fmt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Format Selector for Audio */}
                {mediaType === 'audio' && (
                  <div>
                    <label className="block text-[11px] font-medium text-theme-text mb-2">
                      Audio Extraction Format
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {[
                        { id: 'mp3', label: 'MP3 (320kbps High Quality)' },
                        { id: 'm4a', label: 'M4A / AAC (Original)' },
                        { id: 'flac', label: 'FLAC (Lossless)' },
                        { id: 'wav', label: 'WAV (Uncompressed)' },
                        { id: 'opus', label: 'Opus (High Efficiency)' },
                      ].map((fmt) => {
                        const isSelected = audioFormat === fmt.id;
                        return (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => {
                              const newFmt = fmt.id as any;
                              setAudioFormat(newFmt);
                              const base = filename.replace(/\.(mp3|m4a|flac|wav|opus|webm|mp4)$/i, '');
                              setFilename(`${base}.${newFmt}`);
                            }}
                            className={`py-2 px-2.5 rounded-md border text-center transition cursor-pointer ${
                              isSelected
                                ? 'bg-theme-main border-brand text-brand font-semibold shadow-xs'
                                : 'bg-theme-main border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-hover'
                            }`}
                          >
                            <span className="block text-xs font-medium">{fmt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: File & Storage */}
          <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-theme-border bg-theme-surface">
              <h3 className="font-semibold text-theme-text text-xs">File & Storage Destination</h3>
              <p className="text-[11px] text-theme-muted mt-0.5">Customize download file name, category auto-routing and local folder</p>
            </div>

            <div className="p-5 space-y-4 bg-theme-card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-theme-text mb-1.5">
                    File Name
                  </label>
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="filename.ext"
                    className="w-full bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono focus:outline-none focus:border-brand transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-theme-text mb-1.5">
                    Category Routing
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DownloadCategory)}
                    className="w-full bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text focus:outline-none focus:border-brand capitalize cursor-pointer transition"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-theme-text mb-1.5">
                  Save Directory
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={saveDir}
                    onChange={(e) => setSaveDir(e.target.value)}
                    placeholder="Default storage folder"
                    className="flex-1 bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono placeholder-theme-sub focus:outline-none focus:border-brand transition"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseDir}
                    className="px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-hover border border-theme-border text-theme-muted hover:text-theme-text transition cursor-pointer"
                    title="Browse Folder"
                  >
                    <Folder className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Acceleration & Engine */}
          <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-theme-border bg-theme-surface">
              <h3 className="font-semibold text-theme-text text-xs">Acceleration & Execution</h3>
              <p className="text-[11px] text-theme-muted mt-0.5">Control parallel connection threads and startup behavior</p>
            </div>

            <div className="p-5 space-y-4 bg-theme-card">
              <div>
                <label className="block text-[11px] font-medium text-theme-text mb-2">
                  Parallel Stream Segments
                </label>
                
                {/* Tactile Segmented Control Pills */}
                <div className="grid grid-cols-5 gap-2">
                  {[1, 4, 8, 16, 32].map((count) => {
                    const isSelected = segmentsCount === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSegmentsCount(count)}
                        className={`py-2 px-2.5 rounded-md border text-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-theme-main border-brand text-brand font-semibold shadow-xs'
                            : 'bg-theme-main border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-hover'
                        }`}
                      >
                        <span className="block font-mono text-xs font-bold">{count}</span>
                        <span className="block text-[10px] opacity-75">
                          {count === 1 ? 'Single' : count === 8 ? 'Default' : count === 32 ? 'Max' : 'Streams'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-theme-border flex items-center justify-between">
                <div>
                  <span className="font-medium text-theme-text block text-xs">Start Download Immediately</span>
                  <span className="text-[11px] text-theme-muted">Begin transferring byte streams right after creation</span>
                </div>
                
                {/* Modern Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoStart(!autoStart)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    autoStart ? 'bg-[#84ce19]' : 'bg-theme-hover border border-theme-border'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform block shadow-sm absolute top-0.5 ${
                      autoStart ? 'right-0.5 translate-x-0' : 'left-0.5 translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Advanced Headers Accordion */}
          <div className="border border-theme-border rounded-lg bg-theme-surface overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-theme-hover transition cursor-pointer text-left"
            >
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-theme-muted" />
                <span className="font-medium text-theme-text text-xs">Custom Headers & Authentication</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-theme-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-theme-muted" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-5 border-t border-theme-border space-y-3 bg-theme-card">
                <div>
                  <label className="block text-[11px] font-medium text-theme-text mb-1">
                    Custom User-Agent
                  </label>
                  <input
                    type="text"
                    placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
                    value={customUserAgent}
                    onChange={(e) => setCustomUserAgent(e.target.value)}
                    className="w-full bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono focus:outline-none focus:border-brand transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-theme-text mb-1">
                    Cookie Header
                  </label>
                  <input
                    type="text"
                    placeholder="session_id=...; auth_token=..."
                    value={customCookie}
                    onChange={(e) => setCustomCookie(e.target.value)}
                    className="w-full bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono focus:outline-none focus:border-brand transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-theme-text mb-1">
                    Referer Header
                  </label>
                  <input
                    type="text"
                    placeholder="https://source-site.com"
                    value={customReferer}
                    onChange={(e) => setCustomReferer(e.target.value)}
                    className="w-full bg-theme-main border border-theme-border rounded-md px-3 py-1.5 text-xs text-theme-text font-mono focus:outline-none focus:border-brand transition"
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
