import React, { useState, useMemo } from 'react';
import {
  Search,
  FolderOpen,
  FileText,
  Eye,
  EyeOff,
  Download,
  ExternalLink,
  RotateCcw,
  Plus,
  Trash2,
  HardDrive,
  Link2,
  Unlink,
  X,
  AlertCircle,
  FolderPlus,
  Sparkles,
} from 'lucide-react';
import { CourseFile, Course, Account } from '../../types';
import { FilePreviewModal } from './FilePreviewModal';
import { NotebookLMExportModal } from './NotebookLMExportModal';

interface FileHubProps {
  files: CourseFile[];
  courses: Course[];
  accounts?: Account[];
  selectedCourseId: string | null;
  onPreviewFile: (file: CourseFile) => void;
  onIgnoreFile?: (fileId: string) => Promise<void>;
  onUnignoreFile?: (fileId: string) => Promise<void>;
  onLinkCourseDrive?: (courseId: string, folderUrl: string) => Promise<void>;
  onUnlinkCourseDrive?: (courseId: string) => Promise<void>;
  hasScopeWarning?: boolean;
  onOpenAccounts?: () => void;
}

export const FileHub: React.FC<FileHubProps> = ({
  files,
  courses,
  accounts = [],
  selectedCourseId,
  onPreviewFile,
  onIgnoreFile,
  onUnignoreFile,
  onLinkCourseDrive,
  onUnlinkCourseDrive,
  hasScopeWarning,
  onOpenAccounts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'CLASSROOM' | 'DRIVE_FOLDER'>('ALL');
  const [viewIgnored, setViewIgnored] = useState(false);
  const [previewingFile, setPreviewingFile] = useState<CourseFile | null>(null);

  // NotebookLM Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalCourseId, setExportModalCourseId] = useState<string | null>(selectedCourseId);

  // Drive Folder Linking Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [modalCourseId, setModalCourseId] = useState<string>(selectedCourseId || (courses[0]?.id ?? ''));
  const [folderUrlInput, setFolderUrlInput] = useState('');
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  // Counts
  const activeCount = useMemo(() => files.filter((f) => !f.is_ignored).length, [files]);
  const ignoredCount = useMemo(() => files.filter((f) => f.is_ignored).length, [files]);

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      // Ignored view filter
      if (viewIgnored) {
        if (!f.is_ignored) return false;
      } else {
        if (f.is_ignored) return false;
      }

      if (selectedCourseId && f.course_id !== selectedCourseId) return false;
      if (sourceFilter !== 'ALL' && f.source !== sourceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = f.title.toLowerCase().includes(q);
        const matchesCourse = f.course_name?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCourse) return false;
      }
      return true;
    });
  }, [files, selectedCourseId, sourceFilter, searchQuery, viewIgnored]);

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '—';
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleOpenLinkModal = (courseId?: string) => {
    setModalCourseId(courseId || selectedCourseId || courses[0]?.id || '');
    setFolderUrlInput('');
    setLinkError(null);
    setIsLinkModalOpen(true);
  };

  const handleSubmitLinkDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderUrlInput.trim() || !modalCourseId) return;

    setIsSubmittingLink(true);
    setLinkError(null);
    try {
      if (onLinkCourseDrive) {
        await onLinkCourseDrive(modalCourseId, folderUrlInput.trim());
      }
      setIsLinkModalOpen(false);
      setFolderUrlInput('');
      setActionNotice('Google Drive folder linked successfully and files synced.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setLinkError(err?.message || 'Failed to link Google Drive folder');
    } finally {
      setIsSubmittingLink(false);
    }
  };

  const handleUnlink = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to unlink this Google Drive folder? Synced Drive files for this course will be removed from view.')) {
      return;
    }
    try {
      if (onUnlinkCourseDrive) {
        await onUnlinkCourseDrive(courseId);
      }
      setActionNotice('Google Drive folder unlinked.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleIgnore = async (fileId: string) => {
    try {
      if (onIgnoreFile) {
        await onIgnoreFile(fileId);
      }
      setActionNotice('File ignored. It will no longer appear in your active course view or task attachments.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleUnignore = async (fileId: string) => {
    try {
      if (onUnignoreFile) {
        await onUnignoreFile(fileId);
      }
      setActionNotice('File restored to active course resources.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas overflow-hidden">
      {/* Header & Filter Bar */}
      <div className="p-4 border-b border-stroke bg-surface-1/50 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="font-headline font-semibold text-sm text-content-primary">
              Unified Course Resource Hub
            </h3>
            <p className="text-xs text-content-dim">
              Synchronized Google Classroom materials & explicitly mapped Google Drive course folders
            </p>
          </div>

          {/* Action Tabs: Active vs Ignored */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-surface-2 border border-stroke text-xs">
              <button
                onClick={() => setViewIgnored(false)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  !viewIgnored
                    ? 'bg-accent-indigo text-white shadow-subtle'
                    : 'text-content-dim hover:text-content-primary'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setViewIgnored(true)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewIgnored
                    ? 'bg-accent-indigo text-white shadow-subtle'
                    : 'text-content-dim hover:text-content-primary'
                }`}
              >
                <EyeOff className="w-3 h-3" />
                <span>Ignored ({ignoredCount})</span>
              </button>
            </div>

            {courses.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setExportModalCourseId(selectedCourseId || courses[0]?.id || null);
                    setIsExportModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-md bg-gradient-to-r from-accent-indigo/20 to-purple-600/20 hover:from-accent-indigo/30 hover:to-purple-600/30 border border-accent-indigo/40 text-accent-indigo text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-subtle"
                  title="Export class files into Google NotebookLM (auto-converts .ppt to .pptx)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-accent-indigo" />
                  <span>Export to NotebookLM</span>
                </button>

                <button
                  onClick={() => handleOpenLinkModal()}
                  className="px-2.5 py-1 rounded-md bg-surface-2 hover:bg-surface-hover border border-stroke text-accent-cyan text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Connect a Google Drive folder link to a course"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Link Drive Folder</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Notice alert */}
        {actionNotice && (
          <div className="p-2 px-3 rounded-md bg-accent-indigo/15 border border-accent-indigo/30 text-accent-indigo text-xs flex items-center justify-between animate-fadeIn">
            <span>{actionNotice}</span>
            <button
              onClick={() => setActionNotice(null)}
              className="text-accent-indigo hover:text-white ml-2 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Selected Course Drive Folder Status Card */}
        {selectedCourse && (
          <div className="p-3 rounded-lg bg-surface-1 border border-stroke flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedCourse.color_tag || '#6366F1' }}
              />
              <span className="font-semibold text-content-primary truncate">
                {selectedCourse.name}
              </span>
              <span className="text-content-dim">|</span>

              {selectedCourse.drive_folder_id ? (
                <div className="flex items-center space-x-1.5 text-accent-emerald font-mono truncate">
                  <HardDrive className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">
                    Folder: {selectedCourse.drive_folder_name || selectedCourse.drive_folder_id}
                  </span>
                </div>
              ) : (
                <span className="text-content-dim italic flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-accent-amber flex-shrink-0" />
                  No Google Drive folder linked (only Classroom files appear)
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
              <button
                onClick={() => {
                  setExportModalCourseId(selectedCourse.id);
                  setIsExportModalOpen(true);
                }}
                className="px-2.5 py-1 rounded bg-gradient-to-r from-accent-indigo/15 to-purple-600/15 hover:from-accent-indigo/25 hover:to-purple-600/25 border border-accent-indigo/35 text-accent-indigo flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                title="Export this class to Google NotebookLM"
              >
                <Sparkles className="w-3 h-3 text-accent-indigo" />
                <span>Export to NotebookLM</span>
              </button>

              {selectedCourse.drive_folder_id ? (
                <>
                  <a
                    href={`https://drive.google.com/drive/folders/${selectedCourse.drive_folder_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 rounded bg-surface-2 hover:bg-surface-hover border border-stroke text-content-primary flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Drive</span>
                  </a>
                  <button
                    onClick={() => handleUnlink(selectedCourse.id)}
                    className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Unlink folder and clear its Drive files from this course"
                  >
                    <Unlink className="w-3 h-3" />
                    <span>Unlink</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleOpenLinkModal(selectedCourse.id)}
                  className="px-2.5 py-1 rounded bg-accent-indigo/15 hover:bg-accent-indigo/25 border border-accent-indigo/35 text-accent-indigo flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <Link2 className="w-3 h-3" />
                  <span>+ Link Drive Folder</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Source Segments & Search Input */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-content-dim absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files by document name, course code, or type..."
              className="w-full pl-9 pr-3 py-1.5 rounded-md bg-canvas border border-stroke text-xs text-content-primary placeholder-content-dim focus-ring"
            />
          </div>

          <div className="flex items-center space-x-1 text-xs self-start sm:self-auto">
            <span className="text-[11px] font-mono text-content-dim mr-1 hidden md:inline">
              SOURCE:
            </span>
            <button
              onClick={() => setSourceFilter('ALL')}
              className={`px-2.5 py-1 rounded text-xs border ${
                sourceFilter === 'ALL'
                  ? 'border-accent-indigo bg-accent-indigo/10 text-accent-indigo font-medium'
                  : 'border-stroke bg-surface-2 text-content-dim hover:text-content-primary'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSourceFilter('CLASSROOM')}
              className={`px-2.5 py-1 rounded text-xs border ${
                sourceFilter === 'CLASSROOM'
                  ? 'border-accent-indigo bg-accent-indigo/10 text-accent-indigo font-medium'
                  : 'border-stroke bg-surface-2 text-content-dim hover:text-content-primary'
              }`}
            >
              Classroom Materials
            </button>
            <button
              onClick={() => setSourceFilter('DRIVE_FOLDER')}
              className={`px-2.5 py-1 rounded text-xs border ${
                sourceFilter === 'DRIVE_FOLDER'
                  ? 'border-accent-indigo bg-accent-indigo/10 text-accent-indigo font-medium'
                  : 'border-stroke bg-surface-2 text-content-dim hover:text-content-primary'
              }`}
            >
              Drive Folders
            </button>
          </div>
        </div>
      </div>

      {/* Files Table / List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {hasScopeWarning && (
          <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-fadeIn">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Classwork permissions needed:</strong> Google Classroom lecture slides, handouts, and announcements require an updated permission grant.
              </span>
            </div>
            {onOpenAccounts && (
              <button
                onClick={onOpenAccounts}
                className="px-2.5 py-1 rounded bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/50 text-amber-200 font-medium text-xs transition-colors flex-shrink-0 cursor-pointer"
              >
                Update Scopes in Accounts
              </button>
            )}
          </div>
        )}

        {filteredFiles.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FolderOpen className="w-10 h-10 text-content-dim mx-auto mb-3 stroke-[1.5]" />
            <h4 className="text-sm font-medium text-content-primary">
              {viewIgnored ? 'No ignored files' : 'No resources found'}
            </h4>
            <p className="text-xs text-content-dim mt-1 max-w-sm mx-auto">
              {viewIgnored
                ? 'Files you mark as ignored will be listed here, where you can restore them at any time.'
                : 'By default, this list contains Google Classroom Classwork files. If your course uses an external Google Drive folder, click "+ Link Drive Folder" above to add it manually.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-2.5">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 rounded-lg bg-surface-1 border border-stroke space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-accent-cyan flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-medium text-content-primary leading-tight break-words">
                          {file.title}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                            style={{
                              backgroundColor: `${file.course_color}18`,
                              borderColor: `${file.course_color}35`,
                              color: file.course_color || '#818CF8',
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full mr-1"
                              style={{ backgroundColor: file.course_color || '#6366F1' }}
                            />
                            {file.course_name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-content-dim border border-stroke">
                            {file.source === 'CLASSROOM' ? 'Classroom' : 'Drive Folder'}
                          </span>
                          <span className="text-content-dim font-mono text-[10px]">
                            {formatBytes(file.size_bytes)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-stroke/60">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPreviewingFile(file)}
                        className="px-2.5 py-1 rounded bg-surface-2 hover:bg-surface-hover border border-stroke text-content-primary text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-accent-indigo" />
                        <span>Preview</span>
                      </button>

                      <a
                        href={`/api/files/${file.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-surface-2 hover:bg-surface-hover border border-stroke text-content-primary text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3 text-accent-emerald" />
                        <span>Download</span>
                      </a>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {file.drive_web_view_link && (
                        <a
                          href={file.drive_web_view_link}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded text-content-dim hover:text-content-primary hover:bg-surface-2 transition-colors"
                          title="Open in Google Drive tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {viewIgnored ? (
                        <button
                          onClick={() => handleUnignore(file.id)}
                          className="p-1 rounded text-accent-indigo hover:text-white hover:bg-accent-indigo/20 border border-accent-indigo/30 transition-colors cursor-pointer flex items-center gap-1 text-[11px] px-2"
                          title="Restore this file"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleIgnore(file.id)}
                          className="p-1.5 rounded text-content-dim hover:text-rose-400 hover:bg-surface-2 transition-colors cursor-pointer"
                          title="Ignore / hide this file"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-lg border border-stroke overflow-x-auto bg-surface-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2/70 border-b border-stroke text-[11px] font-mono text-content-dim select-none">
                  <tr>
                    <th className="py-2.5 px-4 font-normal">DOCUMENT TITLE</th>
                    <th className="py-2.5 px-4 font-normal">COURSE</th>
                    <th className="py-2.5 px-4 font-normal">SOURCE ORIGIN</th>
                    <th className="py-2.5 px-4 font-normal">FILE SIZE</th>
                    <th className="py-2.5 px-4 font-normal text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke/60">
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-surface-2/40 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <FileText className="w-4 h-4 text-accent-cyan flex-shrink-0" />
                          <span className="font-medium text-content-primary truncate max-w-xs sm:max-w-md">
                            {file.title}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                          style={{
                            backgroundColor: `${file.course_color}18`,
                            borderColor: `${file.course_color}35`,
                            color: file.course_color || '#818CF8',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full mr-1"
                            style={{ backgroundColor: file.course_color || '#6366F1' }}
                          />
                          {file.course_name}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-content-dim border border-stroke">
                          {file.source === 'CLASSROOM' ? 'Classroom' : 'Drive Folder'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-content-dim font-mono text-[11px]">
                        {formatBytes(file.size_bytes)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setPreviewingFile(file)}
                            className="px-2 py-1 rounded bg-surface-2 hover:bg-surface-hover border border-stroke text-content-primary text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                            title="Preview in app modal"
                          >
                            <Eye className="w-3 h-3 text-accent-indigo" />
                            <span>Preview</span>
                          </button>

                          <a
                            href={`/api/files/${file.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded text-content-dim hover:text-accent-emerald hover:bg-surface-2 transition-colors"
                            title="Download via authenticated stream proxy"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {file.drive_web_view_link && (
                            <a
                              href={file.drive_web_view_link}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded text-content-dim hover:text-content-primary hover:bg-surface-2 transition-colors"
                              title="Open in Google Drive tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Ignore / Restore Action */}
                          {viewIgnored ? (
                            <button
                              onClick={() => handleUnignore(file.id)}
                              className="p-1 rounded text-accent-indigo hover:text-white hover:bg-accent-indigo/20 border border-accent-indigo/30 transition-colors cursor-pointer flex items-center gap-1 text-[11px] px-2"
                              title="Restore this file to active course view"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleIgnore(file.id)}
                              className="p-1 rounded text-content-dim hover:text-rose-400 hover:bg-surface-2 transition-colors cursor-pointer"
                              title="Ignore / hide this file"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Link Google Drive Folder Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-xl bg-surface-1 border border-stroke p-6 shadow-elevation space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stroke">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-5 h-5 text-accent-indigo" />
                <h3 className="font-headline font-semibold text-sm text-content-primary">
                  Link Google Drive Folder
                </h3>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="text-content-dim hover:text-content-primary p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitLinkDrive} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-content-dim uppercase mb-1">
                  Select Target Course
                </label>
                <select
                  value={modalCourseId}
                  onChange={(e) => setModalCourseId(e.target.value)}
                  className="w-full p-2 rounded-md bg-canvas border border-stroke text-content-primary text-xs focus-ring"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-content-dim uppercase mb-1">
                  Google Drive Folder Link or ID
                </label>
                <input
                  type="text"
                  value={folderUrlInput}
                  onChange={(e) => setFolderUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/1a2b3c... or folder ID"
                  className="w-full p-2 rounded-md bg-canvas border border-stroke text-content-primary text-xs placeholder-content-dim focus-ring"
                  required
                />
                <p className="text-[11px] text-content-dim mt-1.5 leading-normal">
                  Paste the full Google Drive folder link or folder ID. Only documents in this specific folder will be synchronized for this course. Personal files outside of this folder will never be scanned.
                </p>
              </div>

              {linkError && (
                <div className="p-2.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {linkError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stroke">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-surface-2 hover:bg-surface-hover border border-stroke text-content-dim hover:text-content-primary cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLink || !folderUrlInput.trim()}
                  className="px-4 py-1.5 rounded-md bg-accent-indigo hover:bg-accent-indigo/90 text-white font-medium shadow-subtle disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingLink ? (
                    <span>Linking & Syncing...</span>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Link & Sync</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <FilePreviewModal
        file={previewingFile}
        onClose={() => setPreviewingFile(null)}
      />

      {/* NotebookLM Class Export Modal */}
      <NotebookLMExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        courses={courses}
        accounts={accounts}
        initialCourseId={exportModalCourseId || selectedCourseId}
      />
    </div>
  );
};
