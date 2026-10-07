import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  FolderOpen,
  FolderPlus,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Unlink,
  Search,
  BookOpen,
} from 'lucide-react';
import { Account, SyncLog, Course } from '../../types';
import { formatLocalDateTime, formatLocalTime } from '../../utils/date';
import {
  fetchAuthStatus,
  startGoogleOAuth,
  disconnectAccount,
  resetDemoData,
  fetchSyncLogs,
  fetchCourses,
  toggleCourseHidden,
  createCustomCourse,
  linkCourseDrive,
  unlinkCourseDrive,
} from '../../api/client';

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onRefreshData: () => Promise<void>;
}

const COLOR_PRESETS = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#EF4444', // Rose
];

export const AccountsModal: React.FC<AccountsModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onRefreshData,
}) => {
  const [authStatus, setAuthStatus] = useState<{
    is_configured: boolean;
    client_id_prefix?: string;
  } | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<'accounts' | 'classes' | 'logs'>('accounts');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Classes tab filters & creation state
  const [classFilter, setClassFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [courseSearch, setCourseSearch] = useState('');
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [newClassAccountId, setNewClassAccountId] = useState('');
  const [newClassColor, setNewClassColor] = useState(COLOR_PRESETS[0]);
  const [newClassDriveUrl, setNewClassDriveUrl] = useState('');

  // Inline linking state for existing course
  const [linkingCourseId, setLinkingCourseId] = useState<string | null>(null);
  const [inlineDriveUrl, setInlineDriveUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadStatusAndLogs();
      loadAllCourses();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (accounts.length > 0 && !newClassAccountId) {
      setNewClassAccountId(accounts[0].id);
    }
  }, [accounts, newClassAccountId]);

  const loadStatusAndLogs = async () => {
    try {
      const status = await fetchAuthStatus();
      setAuthStatus(status);
      const logs = await fetchSyncLogs();
      setSyncLogs(logs);
    } catch (err) {
      console.error('Failed to load auth status or logs:', err);
    }
  };

  const loadAllCourses = async () => {
    try {
      const allCourses = await fetchCourses(undefined, true);
      setCourses(allCourses);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  if (!isOpen) return null;

  const handleConnectGoogle = async (accountType: 'personal' | 'edu') => {
    setLoadingAction(accountType);
    setErrorMsg(null);
    try {
      const res = await startGoogleOAuth(accountType);
      if (res.auth_url) {
        window.location.href = res.auth_url;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start Google OAuth flow');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDisconnect = async (accId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;
    try {
      await disconnectAccount(accId);
      await onRefreshData();
      await loadStatusAndLogs();
      await loadAllCourses();
      setSuccessMsg('Account disconnected successfully.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('Reset local database back to pre-seeded multi-account demo data?')) return;
    try {
      await resetDemoData();
      await onRefreshData();
      await loadStatusAndLogs();
      await loadAllCourses();
      setSuccessMsg('Database reset to demo mode.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleHideCourse = async (courseId: string, currentHidden: boolean) => {
    const action = currentHidden ? 'restore' : 'hide';
    setLoadingAction(`toggle-${courseId}`);
    setErrorMsg(null);
    try {
      await toggleCourseHidden(courseId, !currentHidden);
      await onRefreshData();
      await loadAllCourses();
      setSuccessMsg(
        currentHidden
          ? 'Class restored to active workspace.'
          : 'Class permanently hidden/unenrolled from active workspace.'
      );
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to ${action} course`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreateCustomClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      setErrorMsg('Class name is required.');
      return;
    }
    if (!newClassAccountId) {
      setErrorMsg('Please select a connected Google account.');
      return;
    }

    setLoadingAction('create-class');
    setErrorMsg(null);
    try {
      await createCustomCourse({
        name: newClassName.trim(),
        code: newClassCode.trim() || undefined,
        account_id: newClassAccountId,
        color_tag: newClassColor,
        drive_folder_url: newClassDriveUrl.trim() || undefined,
      });

      // Reset form
      setNewClassName('');
      setNewClassCode('');
      setNewClassDriveUrl('');
      setIsAddClassOpen(false);

      await onRefreshData();
      await loadAllCourses();
      setSuccessMsg('New class created and linked successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create class');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInlineLinkDrive = async (courseId: string) => {
    if (!inlineDriveUrl.trim()) return;
    setLoadingAction(`link-${courseId}`);
    setErrorMsg(null);
    try {
      await linkCourseDrive(courseId, inlineDriveUrl.trim());
      setInlineDriveUrl('');
      setLinkingCourseId(null);
      await onRefreshData();
      await loadAllCourses();
      setSuccessMsg('Google Drive folder linked and synced successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to link Google Drive folder');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInlineUnlinkDrive = async (courseId: string) => {
    if (!confirm('Unlink this Google Drive folder and remove synced files for this class?')) return;
    setLoadingAction(`unlink-${courseId}`);
    setErrorMsg(null);
    try {
      await unlinkCourseDrive(courseId);
      await onRefreshData();
      await loadAllCourses();
      setSuccessMsg('Google Drive folder unlinked.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to unlink Google Drive folder');
    } finally {
      setLoadingAction(null);
    }
  };

  // Filtered courses
  const filteredCourses = courses.filter((c) => {
    if (classFilter === 'active' && c.is_hidden) return false;
    if (classFilter === 'hidden' && !c.is_hidden) return false;
    if (courseSearch.trim()) {
      const q = courseSearch.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchCode = c.code?.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    return true;
  });

  const hiddenCoursesCount = courses.filter((c) => c.is_hidden).length;
  const activeCoursesCount = courses.filter((c) => !c.is_hidden).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-surface-1 border border-stroke rounded-lg shadow-modal flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stroke flex items-center justify-between bg-surface-2/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/30">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-headline font-semibold text-sm text-content-primary">
                Workspace & Account Settings
              </h3>
              <p className="text-[11px] text-content-dim">
                Multi-Account Google Classroom, Drive folders, and Enrolled Classes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-content-dim hover:text-content-primary p-1 rounded hover:bg-surface-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-stroke flex space-x-4 text-xs">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-2.5 font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'accounts'
                ? 'border-accent-indigo text-content-primary'
                : 'border-transparent text-content-dim hover:text-content-muted'
            }`}
          >
            Connected Accounts ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`pb-2.5 font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'classes'
                ? 'border-accent-indigo text-content-primary'
                : 'border-transparent text-content-dim hover:text-content-muted'
            }`}
          >
            <span>Enrolled Classes & Drive</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surface-2 text-content-muted border border-stroke">
              {courses.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'border-accent-indigo text-content-primary'
                : 'border-transparent text-content-dim hover:text-content-muted'
            }`}
          >
            Sync Audit Logs ({syncLogs.length})
          </button>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mx-5 mt-4 p-3 rounded-md bg-accent-emerald/15 border border-accent-emerald/30 text-accent-emerald text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)} className="text-accent-emerald hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'accounts' && (
            <>
              {/* Account Cards */}
              <div className="space-y-3">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-lg bg-surface-2 border border-stroke flex items-center justify-between hover:border-stroke-bright transition-all"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      {acc.avatar_url ? (
                        <img
                          src={acc.avatar_url}
                          alt={acc.email}
                          className="w-9 h-9 rounded-full object-cover border border-stroke flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {acc.email.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-semibold text-content-primary truncate">
                            {acc.display_name || acc.email}
                          </h4>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${
                              acc.account_type === 'edu'
                                ? 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30'
                                : 'bg-accent-violet/15 text-accent-violet border-accent-violet/30'
                            }`}
                          >
                            {acc.account_type === 'edu' ? 'Institutional .edu' : 'Personal Google'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-content-dim mt-0.5">
                          {acc.email}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-content-dim mt-1">
                          {acc.needs_reconnect ? (
                            <span className="flex items-center text-amber-400 gap-1 font-medium">
                              <AlertCircle className="w-3 h-3 text-amber-400" />
                              Permissions update needed for Classwork materials
                            </span>
                          ) : (
                            <span className="flex items-center text-accent-emerald gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Token Active
                            </span>
                          )}
                          <span>•</span>
                          <span>Fernet Encrypted</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0 ml-3">
                      <button
                        onClick={() => handleConnectGoogle(acc.account_type)}
                        disabled={loadingAction === acc.account_type}
                        className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                          acc.needs_reconnect
                            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                            : 'bg-surface-1 hover:bg-surface-hover text-content-primary border border-stroke'
                        }`}
                        title="Re-authorize Google account to refresh and update Classroom & Drive permissions"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingAction === acc.account_type ? 'animate-spin' : ''}`} />
                        <span>{acc.needs_reconnect ? 'Update Scopes' : 'Reconnect'}</span>
                      </button>
                      <button
                        onClick={() => handleDisconnect(acc.id)}
                        className="p-1.5 rounded text-content-dim hover:text-rose-400 hover:bg-surface-1 transition-colors cursor-pointer"
                        title="Disconnect Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Connect Google Account Action */}
              <div className="p-4 rounded-lg bg-canvas border border-stroke space-y-3">
                <h4 className="text-xs font-semibold text-content-primary font-headline flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-accent-indigo" />
                  <span>Connect Another Google Account</span>
                </h4>
                <p className="text-[11px] text-content-dim">
                  Authorize Google Classroom and Drive scopes to stream assignments and handouts into your dashboard.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={() => handleConnectGoogle('edu')}
                    disabled={loadingAction === 'edu'}
                    className="flex items-center justify-center space-x-2 py-2 px-3 rounded-md bg-accent-emerald/15 hover:bg-accent-emerald/25 border border-accent-emerald/30 text-accent-emerald text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Connect .EDU Workspace</span>
                  </button>
                  <button
                    onClick={() => handleConnectGoogle('personal')}
                    disabled={loadingAction === 'personal'}
                    className="flex items-center justify-center space-x-2 py-2 px-3 rounded-md bg-accent-indigo/15 hover:bg-accent-indigo/25 border border-accent-indigo/30 text-accent-indigo text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Connect Personal Account</span>
                  </button>
                </div>

                {!authStatus?.is_configured && (
                  <div className="mt-2 p-2.5 rounded bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300">
                    <span className="font-semibold">Live Google OAuth:</span> Provide <code className="font-mono bg-black/30 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="font-mono bg-black/30 px-1 rounded">GOOGLE_CLIENT_SECRET</code> in <code className="font-mono bg-black/30 px-1 rounded">backend/.env</code>.
                  </div>
                )}
              </div>

              {/* Demo Mode Action */}
              <div className="flex items-center justify-between p-3 rounded-md bg-surface-2/60 border border-stroke text-xs">
                <div>
                  <span className="font-medium text-content-primary block">
                    Pre-seeded Academic Demo Mode
                  </span>
                  <span className="text-[11px] text-content-dim">
                    Populated with multi-account coursework, handouts, and timetable
                  </span>
                </div>
                <button
                  onClick={handleResetDemo}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded bg-surface-1 hover:bg-surface-hover border border-stroke text-xs text-content-primary transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-accent-amber" />
                  <span>Reset Demo Data</span>
                </button>
              </div>
            </>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-4">
              {/* Top Action & Info Bar */}
              <div className="p-3.5 rounded-lg bg-surface-2/70 border border-stroke flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-content-primary flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-accent-indigo" />
                    <span>Manage Classes & Google Drive Links</span>
                  </h4>
                  <p className="text-[11px] text-content-dim mt-0.5">
                    Hide classes you dropped or unenrolled from. Add custom subjects linked directly to a Google Drive folder.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddClassOpen(!isAddClassOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent-indigo hover:bg-accent-indigo/90 text-white text-xs font-medium transition-all shadow-subtle cursor-pointer self-start sm:self-auto flex-shrink-0"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{isAddClassOpen ? 'Close Form' : '+ Add Class Linked to Drive'}</span>
                </button>
              </div>

              {/* Add Custom Class Form */}
              {isAddClassOpen && (
                <form
                  onSubmit={handleCreateCustomClass}
                  className="p-4 rounded-lg bg-canvas border border-accent-indigo/40 space-y-3.5 animate-fadeIn"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stroke">
                    <h5 className="text-xs font-semibold text-content-primary flex items-center gap-1.5">
                      <FolderPlus className="w-3.5 h-3.5 text-accent-indigo" />
                      <span>New Class & Google Drive Connection</span>
                    </h5>
                    <span className="text-[10px] text-content-dim font-mono">Custom Course</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-content-muted mb-1">
                        Class Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Physics Research, Operating Systems..."
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded bg-surface-2 border border-stroke text-content-primary placeholder-content-dim focus:outline-none focus:border-accent-indigo"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-content-muted mb-1">
                        Class Code / Section (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. PHY-301, Lab B"
                        value={newClassCode}
                        onChange={(e) => setNewClassCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded bg-surface-2 border border-stroke text-content-primary placeholder-content-dim focus:outline-none focus:border-accent-indigo"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-content-muted mb-1">
                        Associated Account <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={newClassAccountId}
                        onChange={(e) => setNewClassAccountId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded bg-surface-2 border border-stroke text-content-primary focus:outline-none focus:border-accent-indigo"
                        required
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.email} ({acc.account_type.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-content-muted mb-1">
                        Accent Color
                      </label>
                      <div className="flex items-center space-x-1.5 pt-0.5">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            type="button"
                            key={color}
                            onClick={() => setNewClassColor(color)}
                            className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                              newClassColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-content-muted mb-1">
                      Google Drive Folder Link or ID (Optional)
                    </label>
                    <div className="relative">
                      <FolderOpen className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-content-dim" />
                      <input
                        type="text"
                        placeholder="https://drive.google.com/drive/folders/1aBcDeFg... or raw folder ID"
                        value={newClassDriveUrl}
                        onChange={(e) => setNewClassDriveUrl(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded bg-surface-2 border border-stroke text-content-primary placeholder-content-dim focus:outline-none focus:border-accent-indigo font-mono text-[11px]"
                      />
                    </div>
                    <p className="text-[10px] text-content-dim mt-1">
                      Files inside this Drive folder will be automatically scanned and displayed in the Course Files Hub.
                    </p>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stroke">
                    <button
                      type="button"
                      onClick={() => setIsAddClassOpen(false)}
                      className="px-3 py-1.5 rounded text-xs text-content-muted hover:text-content-primary hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loadingAction === 'create-class'}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-accent-indigo hover:bg-accent-indigo/90 text-white text-xs font-medium transition-all shadow-subtle cursor-pointer disabled:opacity-50"
                    >
                      {loadingAction === 'create-class' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Create Class & Sync Drive</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center space-x-1.5 text-xs w-full sm:w-auto">
                  <button
                    onClick={() => setClassFilter('all')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      classFilter === 'all'
                        ? 'bg-surface-2 text-content-primary border border-stroke font-medium'
                        : 'text-content-dim hover:text-content-muted'
                    }`}
                  >
                    All ({courses.length})
                  </button>
                  <button
                    onClick={() => setClassFilter('active')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      classFilter === 'active'
                        ? 'bg-surface-2 text-content-primary border border-stroke font-medium'
                        : 'text-content-dim hover:text-content-muted'
                    }`}
                  >
                    Active ({activeCoursesCount})
                  </button>
                  <button
                    onClick={() => setClassFilter('hidden')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      classFilter === 'hidden'
                        ? 'bg-surface-2 text-amber-300 border border-amber-500/30 font-medium'
                        : 'text-content-dim hover:text-content-muted'
                    }`}
                  >
                    Hidden / Unenrolled ({hiddenCoursesCount})
                  </button>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-content-dim" />
                  <input
                    type="text"
                    placeholder="Search classes..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full pl-8 pr-2 py-1 text-xs rounded bg-surface-2 border border-stroke text-content-primary placeholder-content-dim focus:outline-none focus:border-accent-indigo"
                  />
                </div>
              </div>

              {/* Course Cards List */}
              <div className="space-y-2.5">
                {filteredCourses.length === 0 ? (
                  <div className="p-8 text-center rounded-lg bg-surface-2/40 border border-stroke">
                    <p className="text-xs text-content-dim">No classes match your current filter.</p>
                  </div>
                ) : (
                  filteredCourses.map((c) => {
                    const acc = accounts.find((a) => a.id === c.account_id);
                    const isHidden = !!c.is_hidden;
                    const isLinkingThis = linkingCourseId === c.id;

                    return (
                      <div
                        key={c.id}
                        className={`p-3.5 rounded-lg border transition-all ${
                          isHidden
                            ? 'bg-surface-1/60 border-dashed border-stroke opacity-75 hover:opacity-100'
                            : 'bg-surface-2 border-stroke hover:border-stroke-bright'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Course Title & Badges */}
                          <div className="flex items-start space-x-3 min-w-0 flex-1">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                              style={{ backgroundColor: c.color_tag || '#6366F1' }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <h4
                                  className={`text-xs font-semibold truncate ${
                                    isHidden
                                      ? 'line-through text-content-dim'
                                      : 'text-content-primary'
                                  }`}
                                >
                                  {c.name}
                                </h4>
                                {c.code && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-1 text-content-dim border border-stroke">
                                    {c.code}
                                  </span>
                                )}
                                {isHidden ? (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase font-bold">
                                    Unenrolled / Hidden
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30 uppercase font-bold">
                                    Active
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-3 text-[11px] text-content-dim mt-1.5 flex-wrap gap-y-1">
                                <span className="flex items-center gap-1 font-mono">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      acc?.account_type === 'edu' ? 'bg-accent-emerald' : 'bg-accent-violet'
                                    }`}
                                  />
                                  {acc?.email || c.account_id}
                                </span>
                                <span>•</span>
                                <span>{c.assignment_count || 0} tasks</span>
                                <span>•</span>
                                <span>{c.file_count || 0} files</span>
                              </div>

                              {/* Google Drive Status Bar */}
                              <div className="mt-2.5 pt-2 border-t border-stroke/60 flex items-center justify-between text-[11px]">
                                {c.drive_folder_id ? (
                                  <div className="flex items-center space-x-2 text-content-muted">
                                    <FolderOpen className="w-3.5 h-3.5 text-accent-amber flex-shrink-0" />
                                    <span className="truncate max-w-[240px] text-content-primary font-medium">
                                      {c.drive_folder_name || 'Linked Drive Folder'}
                                    </span>
                                    <a
                                      href={`https://drive.google.com/drive/folders/${c.drive_folder_id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-content-dim hover:text-accent-indigo"
                                      title="Open folder in Google Drive"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                    <button
                                      onClick={() => handleInlineUnlinkDrive(c.id)}
                                      disabled={loadingAction === `unlink-${c.id}`}
                                      className="text-[10px] text-rose-400 hover:underline cursor-pointer ml-1"
                                      title="Unlink Drive folder"
                                    >
                                      Unlink
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-[11px] text-content-dim">No Drive folder linked</span>
                                    {!isLinkingThis && (
                                      <button
                                        onClick={() => {
                                          setLinkingCourseId(c.id);
                                          setInlineDriveUrl('');
                                        }}
                                        className="text-[10px] text-accent-indigo hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <LinkIcon className="w-3 h-3" />
                                        <span>Link Drive Folder</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Inline Drive Link Form */}
                              {isLinkingThis && (
                                <div className="mt-2 flex items-center space-x-2 animate-fadeIn">
                                  <input
                                    type="text"
                                    placeholder="Paste Google Drive folder URL or ID..."
                                    value={inlineDriveUrl}
                                    onChange={(e) => setInlineDriveUrl(e.target.value)}
                                    className="flex-1 px-2 py-1 text-xs rounded bg-surface-1 border border-stroke text-content-primary font-mono text-[11px] focus:outline-none focus:border-accent-indigo"
                                  />
                                  <button
                                    onClick={() => handleInlineLinkDrive(c.id)}
                                    disabled={loadingAction === `link-${c.id}` || !inlineDriveUrl.trim()}
                                    className="px-2.5 py-1 rounded bg-accent-indigo hover:bg-accent-indigo/90 text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    {loadingAction === `link-${c.id}` ? 'Linking...' : 'Link & Sync'}
                                  </button>
                                  <button
                                    onClick={() => setLinkingCourseId(null)}
                                    className="px-2 py-1 text-xs text-content-dim hover:text-content-primary cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Button: Perma Hide / Restore */}
                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            {isHidden ? (
                              <button
                                onClick={() => handleToggleHideCourse(c.id, true)}
                                disabled={loadingAction === `toggle-${c.id}`}
                                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-accent-emerald/15 hover:bg-accent-emerald/25 border border-accent-emerald/30 text-accent-emerald text-xs font-medium transition-all cursor-pointer"
                                title="Restore this class back to active workspace"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore / Enroll</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleHideCourse(c.id, false)}
                                disabled={loadingAction === `toggle-${c.id}`}
                                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-surface-1 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 border border-stroke text-content-muted text-xs font-medium transition-all cursor-pointer"
                                title="Permanently hide this class like you dropped or unenrolled from it"
                              >
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Hide / Unenroll</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-2">
              {syncLogs.length === 0 ? (
                <p className="text-xs text-content-dim text-center py-8">No sync history logs yet.</p>
              ) : (
                syncLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded bg-surface-2 border border-stroke text-xs flex items-start justify-between"
                  >
                    <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            log.status === 'SUCCESS' ? 'bg-accent-emerald' : 'bg-rose-400'
                          }`}
                        />
                        <span className="font-mono text-[11px] text-content-dim">
                          {formatLocalDateTime(log.timestamp)}
                        </span>
                        <span className="text-[11px] font-medium text-content-primary">
                          {log.account_email || 'System'}
                        </span>
                      </div>
                      <p className="text-[11px] text-content-muted font-mono">{log.message}</p>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-canvas text-content-dim border border-stroke">
                      +{log.items_count} items
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
