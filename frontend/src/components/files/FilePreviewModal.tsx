import React from 'react';
import { X, ExternalLink, Download, FileText, Info, ShieldCheck } from 'lucide-react';
import { CourseFile } from '../../types';

interface FilePreviewModalProps {
  file: CourseFile | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const previewUrl =
    file.drive_preview_link || `https://drive.google.com/file/d/${file.drive_file_id}/preview`;

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return 'Unknown size';
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl h-[85vh] bg-surface-1 border border-stroke rounded-lg shadow-modal flex flex-col overflow-hidden">
        {/* Modal Topbar */}
        <div className="px-5 py-3.5 border-b border-stroke flex items-center justify-between bg-surface-2/60">
          <div className="flex items-center space-x-3 truncate">
            <div className="p-1.5 rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-headline font-semibold text-sm text-content-primary truncate">
                {file.title}
              </h3>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-content-dim mt-0.5">
                <span
                  className="font-medium"
                  style={{ color: file.course_color || '#818CF8' }}
                >
                  {file.course_name}
                </span>
                <span>•</span>
                <span>{file.source}</span>
                <span>•</span>
                <span>{formatBytes(file.size_bytes)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {/* Authenticated proxy download */}
            <a
              href={`/api/files/${file.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-surface-2 hover:bg-surface-hover border border-stroke text-xs text-content-primary transition-all cursor-pointer"
              title="Stream download through authenticated backend session"
            >
              <Download className="w-3.5 h-3.5 text-accent-emerald" />
              <span className="hidden sm:inline">Proxy Download</span>
            </a>

            {/* Open directly in Drive */}
            {file.drive_web_view_link && (
              <a
                href={file.drive_web_view_link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-surface-2 hover:bg-surface-hover border border-stroke text-xs text-content-primary transition-all cursor-pointer"
                title="Open directly in Google Drive"
              >
                <ExternalLink className="w-3.5 h-3.5 text-accent-indigo" />
                <span className="hidden sm:inline">Drive Tab</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="text-content-dim hover:text-content-primary p-1.5 rounded hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* In-App Drive Preview Iframe */}
        <div className="flex-1 bg-canvas relative flex flex-col">
          <iframe
            src={previewUrl}
            title={file.title}
            className="w-full h-full border-0 bg-canvas"
            allow="autoplay"
          />

          {/* Fallback Notice Overlay */}
          <div className="p-2.5 bg-surface-1 border-t border-stroke flex items-center justify-between text-xs text-content-dim">
            <div className="flex items-center space-x-2">
              <Info className="w-3.5 h-3.5 text-accent-indigo" />
              <span>
                Embedded preview streamed via Google Drive API. If authentication prompt appears inside iframe, use "Drive Tab" or "Proxy Download".
              </span>
            </div>
            <span className="font-mono text-[10px] text-accent-emerald">
              SECURE OAUTH v3
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
