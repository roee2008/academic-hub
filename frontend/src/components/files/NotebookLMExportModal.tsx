import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookOpen,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  HardDrive,
  Mail,
  FileText,
  FileCode,
  Layers,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import {
  Course,
  Account,
  ClassAnalysisResponse,
  FileAnalysisItem,
  ExportResultResponse,
} from '../../types';
import { analyzeNotebookLMExport, exportClassToNotebookLM } from '../../api/client';

interface NotebookLMExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  accounts: Account[];
  initialCourseId?: string | null;
}

export const NotebookLMExportModal: React.FC<NotebookLMExportModalProps> = ({
  isOpen,
  onClose,
  courses,
  accounts,
  initialCourseId,
}) => {
  // Selection States
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || (courses[0]?.id ?? '')
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id ?? ''
  );

  // Options
  const [convertUnsupported, setConvertUnsupported] = useState(true);
  const [includeOverview, setIncludeOverview] = useState(true);
  const [syncToDrive, setSyncToDrive] = useState(true);

  // Analysis & Export Process States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<ClassAnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportStep, setExportStep] = useState<string>('');
  const [exportResult, setExportResult] = useState<ExportResultResponse | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  // Sync course selection with initial prop
  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    } else if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [initialCourseId, courses]);

  // Set default account based on selected course or first account
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      const course = courses.find((c) => c.id === selectedCourseId);
      if (course && course.account_id) {
        setSelectedAccountId(course.account_id);
      } else {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [selectedCourseId, courses, accounts, selectedAccountId]);

  // Run compatibility analysis whenever selected course changes
  useEffect(() => {
    if (!isOpen || !selectedCourseId) return;

    let isMounted = true;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setExportResult(null);
    setExportError(null);

    analyzeNotebookLMExport(selectedCourseId)
      .then((res) => {
        if (isMounted) {
          const match = res.find((r) => r.course_id === selectedCourseId) || res[0] || null;
          setAnalysisData(match);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setAnalysisError(err?.message || 'Failed to inspect class files');
        }
      })
      .finally(() => {
        if (isMounted) setIsAnalyzing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedCourseId]);

  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null;
  }, [accounts, selectedAccountId]);

  const handleExport = async () => {
    if (!selectedCourseId) return;

    setIsExporting(true);
    setExportError(null);
    setExportStep('Initializing class export...');

    try {
      setExportStep('Auto-transferring unsupported files (.ppt ➔ .pptx / PDF)...');
      
      const res = await exportClassToNotebookLM({
        course_id: selectedCourseId,
        target_account_id: selectedAccountId,
        convert_unsupported: convertUnsupported,
        create_drive_folder: syncToDrive,
        include_overview: includeOverview,
      });

      setExportResult(res);
      setExportStep('Export completed successfully!');
    } catch (err: any) {
      setExportError(err?.message || 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetForAnother = () => {
    setExportResult(null);
    setExportError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-1 border border-stroke w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-stroke flex items-center justify-between bg-surface-2/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-indigo/30 to-purple-600/30 border border-accent-indigo/40 flex items-center justify-center text-accent-indigo">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-headline font-semibold text-content-primary">
                  Export to Google NotebookLM
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/30">
                  1 Notebook per Class
                </span>
              </div>
              <p className="text-xs text-content-dim">
                Auto-transfers unsupported files like .ppt ➔ .pptx and saves to your chosen Google account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-content-dim hover:text-content-primary hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Success State Screen */}
          {exportResult ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-accent-emerald/10 border border-accent-emerald/30 flex items-start space-x-3.5">
                <CheckCircle2 className="w-6 h-6 text-accent-emerald flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-content-primary">
                    Class Notebook Ready for NotebookLM!
                  </h4>
                  <p className="text-xs text-content-dim">
                    Successfully prepared <b>{exportResult.total_files} files</b> for{' '}
                    <span className="text-content-primary font-medium">{exportResult.course_name}</span>.
                    {exportResult.converted_files > 0 && (
                      <span>
                        {' '}(Auto-transferred <b>{exportResult.converted_files}</b> legacy files into modern PPTX & PDF formats).
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-accent-cyan font-mono pt-1">
                    Saved to account: {exportResult.target_account_email}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <a
                  href={exportResult.download_url}
                  className="p-3.5 rounded-xl bg-accent-indigo hover:bg-accent-indigo/90 text-white font-medium text-xs flex items-center justify-center space-x-2 shadow-lg shadow-accent-indigo/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Converted Bundle (.zip)</span>
                </a>

                <a
                  href={exportResult.notebooklm_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-xl bg-surface-2 hover:bg-surface-hover border border-stroke text-content-primary font-medium text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-accent-indigo" />
                  <span>Launch Google NotebookLM</span>
                  <ExternalLink className="w-3.5 h-3.5 text-content-dim" />
                </a>
              </div>

              {exportResult.drive_folder_url && (
                <div className="p-3 rounded-xl bg-surface-2/60 border border-stroke flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-content-primary">
                    <HardDrive className="w-4 h-4 text-accent-cyan" />
                    <span>Google Drive Folder created on {exportResult.target_account_email}</span>
                  </div>
                  <a
                    href={exportResult.drive_folder_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-accent-cyan hover:underline flex items-center space-x-1"
                  >
                    <span>Open Drive Folder</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* 3-Step Guide */}
              <div className="p-4 rounded-xl bg-surface-2/40 border border-stroke space-y-2.5 text-xs text-content-dim">
                <div className="font-semibold text-content-primary flex items-center space-x-1.5">
                  <BookOpen className="w-4 h-4 text-accent-indigo" />
                  <span>How to use with NotebookLM:</span>
                </div>
                <ol className="space-y-1.5 list-decimal list-inside pl-1 text-xs">
                  <li>
                    Click <b className="text-content-primary">Launch Google NotebookLM</b> above and click <b className="text-content-primary">+ New Notebook</b>.
                  </li>
                  <li>
                    In NotebookLM's source dialog, click <b className="text-content-primary">Google Drive</b> and select the files from your folder, or drag & drop the downloaded files.
                  </li>
                  <li>
                    Ask questions, create flashcards, or generate a 2-host audio podcast overview grounded in your class!
                  </li>
                </ol>
              </div>

              {/* Activity Log Dropdown */}
              {exportResult.log && exportResult.log.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={() => setShowLog(!showLog)}
                    className="text-[11px] text-content-dim hover:text-content-primary underline cursor-pointer"
                  >
                    {showLog ? 'Hide detailed conversion log' : 'Show detailed conversion log'}
                  </button>
                  {showLog && (
                    <div className="p-3 rounded-lg bg-black/40 border border-stroke max-h-36 overflow-y-auto font-mono text-[11px] text-content-dim space-y-1">
                      {exportResult.log.map((line, idx) => (
                        <div key={idx} className="leading-tight">
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleResetForAnother}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-content-dim hover:text-content-primary hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  Export Another Class
                </button>
              </div>
            </div>
          ) : (
            /* Configure Export Screen */
            <>
              {/* Class & Account Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Class Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-content-dim flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-accent-indigo" />
                    <span>Select Class (1 Notebook per Class)</span>
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-stroke text-content-primary text-xs focus:outline-none focus:border-accent-indigo transition-colors"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Target Google Account Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-content-dim flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Save to Google Account (Target Email)</span>
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-stroke text-content-primary text-xs focus:outline-none focus:border-accent-indigo transition-colors"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.email} ({a.account_type === 'edu' ? 'School .EDU' : 'Personal'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class Summary Bar */}
              {selectedCourse && (
                <div className="p-3 rounded-xl bg-surface-2/40 border border-stroke flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: selectedCourse.color_tag || '#6366F1' }}
                    />
                    <span className="font-semibold text-content-primary">
                      {selectedCourse.name}
                    </span>
                    <span className="text-content-dim">|</span>
                    <span className="text-content-dim">
                      {analysisData ? `${analysisData.total_files} class files` : 'Loading files...'}
                    </span>
                  </div>

                  {selectedAccount && (
                    <span className="text-[11px] text-accent-cyan font-mono">
                      Target: {selectedAccount.email}
                    </span>
                  )}
                </div>
              )}

              {/* File Inspection & Auto-Transfer Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-content-primary flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-accent-indigo" />
                    <span>File Compatibility Inspection</span>
                  </span>
                  {analysisData && (
                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="text-accent-emerald">
                        ● {analysisData.compatible_count} Native
                      </span>
                      {analysisData.unsupported_count > 0 && (
                        <span className="text-accent-amber font-medium">
                          ● {analysisData.unsupported_count} Auto-Transfers (.ppt)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-stroke bg-surface-2/20 max-h-48 overflow-y-auto divide-y divide-stroke/50">
                  {isAnalyzing ? (
                    <div className="p-6 text-center text-xs text-content-dim flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-accent-indigo" />
                      <span>Analyzing file formats for NotebookLM...</span>
                    </div>
                  ) : analysisData && analysisData.files.length > 0 ? (
                    analysisData.files.map((file) => (
                      <div
                        key={file.id}
                        className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-surface-2/40 transition-colors"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 pr-3">
                          <FileText className="w-3.5 h-3.5 text-content-dim flex-shrink-0" />
                          <span className="text-content-primary truncate font-medium">
                            {file.title}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {file.is_compatible ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30">
                              NotebookLM Ready
                            </span>
                          ) : (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent-amber/15 text-accent-amber border border-accent-amber/30 flex items-center space-x-1"
                              title={file.reason}
                            >
                              <span>Auto-Transfers</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                              <span>{file.target_extension}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-content-dim">
                      No active files found for this class.
                    </div>
                  )}
                </div>
              </div>

              {/* Conversion & Sync Options Toggles */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-center space-x-2.5 text-xs text-content-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={convertUnsupported}
                    onChange={(e) => setConvertUnsupported(e.target.checked)}
                    className="rounded border-stroke bg-surface-2 text-accent-indigo focus:ring-accent-indigo"
                  />
                  <span>
                    Auto-transfer unsupported files (e.g. convert <b>.ppt ➔ .pptx & .pdf</b> so NotebookLM can read them)
                  </span>
                </label>

                <label className="flex items-center space-x-2.5 text-xs text-content-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeOverview}
                    onChange={(e) => setIncludeOverview(e.target.checked)}
                    className="rounded border-stroke bg-surface-2 text-accent-indigo focus:ring-accent-indigo"
                  />
                  <span>
                    Include AI Knowledge Grounding Overview (Syllabus, homework deadlines & timetable index)
                  </span>
                </label>

                <label className="flex items-center space-x-2.5 text-xs text-content-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncToDrive}
                    onChange={(e) => setSyncToDrive(e.target.checked)}
                    className="rounded border-stroke bg-surface-2 text-accent-indigo focus:ring-accent-indigo"
                  />
                  <span>
                    Sync directly to Google Drive on <b>{selectedAccount?.email}</b>
                  </span>
                </label>
              </div>

              {/* Error Banner */}
              {exportError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{exportError}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!exportResult && (
          <div className="p-4 border-t border-stroke flex items-center justify-between bg-surface-2/30">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-content-dim hover:text-content-primary hover:bg-surface-2 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleExport}
              disabled={isExporting || isAnalyzing || !selectedCourseId}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-indigo to-purple-600 hover:opacity-95 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-accent-indigo/25 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{exportStep || 'Exporting Class...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Export Class Notebook</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
