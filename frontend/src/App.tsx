import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FolderOpen,
  Calendar,
  Users,
} from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { TaskList } from './components/tasks/TaskList';
import { TaskDetailPane } from './components/tasks/TaskDetailPane';
import { TaskCreateModal } from './components/tasks/TaskCreateModal';
import { TimetableWeekly } from './components/timetable/TimetableWeekly';
import { TodayScheduleCard } from './components/dashboard/TodayScheduleCard';
import { FileHub } from './components/files/FileHub';
import { FilePreviewModal } from './components/files/FilePreviewModal';
import { AccountsModal } from './components/accounts/AccountsModal';
import { OmniboxModal } from './components/search/OmniboxModal';
import { DeviceSyncModal } from './components/sync/DeviceSyncModal';

import {
  Account,
  Course,
  Assignment,
  CourseFile,
  TimetableSlot,
  TodaySchedule,
  SyncStatus,
  TaskStatus,
  TaskPriority,
} from './types';

import {
  fetchAccounts,
  fetchCourses,
  fetchAssignments,
  fetchFiles,
  fetchTimetable,
  fetchTodaySchedule,
  fetchSyncStatus,
  triggerInstantSync,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  createTimetableSlot,
  deleteTimetableSlot,
  ignoreFile,
  unignoreFile,
  linkCourseDrive,
  unlinkCourseDrive,
} from './api/client';

export const App: React.FC = () => {
  // Navigation & View State
  const [currentTab, setCurrentTab] = useState<string>('today');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Data Store
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Assignment[]>([]);
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Inspector & Modal States
  const [selectedTask, setSelectedTask] = useState<Assignment | null>(null);
  const [previewingFile, setPreviewingFile] = useState<CourseFile | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDeviceSyncOpen, setIsDeviceSyncOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [authBanner, setAuthBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Listen for PWA install event on Android
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Load all initial data
  const loadDashboardData = useCallback(async () => {
    try {
      const [accs, crss, tsks, fls, ttable, today, sync] = await Promise.all([
        fetchAccounts(),
        fetchCourses(),
        fetchAssignments(),
        fetchFiles({ include_ignored: true }),
        fetchTimetable(),
        fetchTodaySchedule(),
        fetchSyncStatus(),
      ]);

      setAccounts(accs);
      setCourses(crss);
      setTasks(tsks);
      setFiles(fls);
      setTimetableSlots(ttable);
      setTodaySchedule(today);
      setSyncStatus(sync);

      // Keep selected task in sync if open
      if (selectedTask) {
        const fresh = tsks.find((t) => t.id === selectedTask.id);
        if (fresh) setSelectedTask(fresh);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, [selectedTask]);

  useEffect(() => {
    loadDashboardData();

    // Check for Google OAuth callback status params
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth_success');
    const authError = params.get('auth_error');

    if (authSuccess) {
      setAuthBanner({
        type: 'success',
        message: 'Google Account successfully connected! Classroom coursework and Drive folders are now synced.',
      });
      loadDashboardData();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authError) {
      setAuthBanner({
        type: 'error',
        message: `Google Authentication error: ${decodeURIComponent(authError)}`,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loadDashboardData]);

  // Periodic polling for sync status & background worker
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await fetchSyncStatus();
        setSyncStatus(status);
        if (!status.is_syncing && syncStatus?.is_syncing) {
          // Sync just completed; reload fresh data
          loadDashboardData();
        }
      } catch (err) {
        // Ignore polling error
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [syncStatus?.is_syncing, loadDashboardData]);

  // Instant Sync Action
  const handleTriggerSync = async () => {
    setSyncStatus((prev) => (prev ? { ...prev, is_syncing: true } : { is_syncing: true, interval_seconds: 60 }));
    try {
      await triggerInstantSync();
      await loadDashboardData();
    } catch (err) {
      console.error('Error triggering sync:', err);
    } finally {
      const freshStatus = await fetchSyncStatus().catch(() => null);
      if (freshStatus) setSyncStatus(freshStatus);
    }
  };

  // Toggle Task Status (with local override)
  const handleToggleTaskStatus = async (task: Assignment) => {
    const nextStatus: TaskStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus, local_override: true } : t))
    );
    if (selectedTask?.id === task.id) {
      setSelectedTask((prev) => (prev ? { ...prev, status: nextStatus, local_override: true } : null));
    }

    try {
      const updated = await updateAssignment(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTask?.id === updated.id) {
        setSelectedTask(updated);
      }
      // Refresh today schedule view if changed
      const freshToday = await fetchTodaySchedule();
      setTodaySchedule(freshToday);
    } catch (err) {
      console.error('Failed to update task status:', err);
      loadDashboardData();
    }
  };

  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const updated = await updateAssignment(taskId, { status });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTask(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePriority = async (taskId: string, priority: TaskPriority) => {
    try {
      const updated = await updateAssignment(taskId, { priority });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTask(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteAssignment(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
      const freshToday = await fetchTodaySchedule();
      setTodaySchedule(freshToday);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (taskData: any) => {
    const created = await createAssignment(taskData);
    setTasks((prev) => [created, ...prev]);
    setSelectedTask(created);
    const freshToday = await fetchTodaySchedule();
    setTodaySchedule(freshToday);
  };

  const handleCreateSlot = async (slotData: any) => {
    const created = await createTimetableSlot(slotData);
    setTimetableSlots((prev) => [...prev, created]);
    const freshToday = await fetchTodaySchedule();
    setTodaySchedule(freshToday);
  };

  const handleDeleteSlot = async (slotId: string) => {
    await deleteTimetableSlot(slotId);
    setTimetableSlots((prev) => prev.filter((s) => s.id !== slotId));
    const freshToday = await fetchTodaySchedule();
    setTodaySchedule(freshToday);
  };

  const handleIgnoreFile = async (fileId: string) => {
    try {
      await ignoreFile(fileId);
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, is_ignored: true } : f)));
      if (selectedTask?.files?.some((f) => f.id === fileId)) {
        setSelectedTask((prev) =>
          prev ? { ...prev, files: prev.files.filter((f) => f.id !== fileId) } : null
        );
      }
      fetchCourses().then(setCourses).catch(console.error);
    } catch (err) {
      console.error('Failed to ignore file:', err);
    }
  };

  const handleUnignoreFile = async (fileId: string) => {
    try {
      await unignoreFile(fileId);
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, is_ignored: false } : f)));
      fetchCourses().then(setCourses).catch(console.error);
      fetchAssignments().then(setTasks).catch(console.error);
    } catch (err) {
      console.error('Failed to restore file:', err);
    }
  };

  const handleLinkCourseDrive = async (courseId: string, folderUrl: string) => {
    await linkCourseDrive(courseId, folderUrl);
    await loadDashboardData();
  };

  const handleUnlinkCourseDrive = async (courseId: string) => {
    await unlinkCourseDrive(courseId);
    await loadDashboardData();
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="flex h-screen h-[100dvh] w-screen overflow-hidden bg-canvas text-content-primary">
      {/* 1. Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        accounts={accounts}
        courses={courses}
        selectedCourseId={selectedCourseId}
        setSelectedCourseId={setSelectedCourseId}
        onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
        isSyncing={Boolean(syncStatus?.is_syncing)}
        onTriggerSync={handleTriggerSync}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          selectedCourseName={selectedCourse?.name}
          syncStatus={syncStatus}
          onTriggerSync={handleTriggerSync}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onOpenOmnibox={() => setIsOmniboxOpen(true)}
          onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          canInstall={Boolean(installPrompt)}
          onInstallApp={handleInstallApp}
          onOpenDeviceSync={() => setIsDeviceSyncOpen(true)}
        />

        {/* Auth Banner Alert */}
        {authBanner && (
          <div
            className={`px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs border-b ${
              authBanner.type === 'success'
                ? 'bg-accent-emerald/15 border-accent-emerald/30 text-accent-emerald'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2 truncate">
              <span className="font-semibold uppercase tracking-wider text-[10px] font-mono flex-shrink-0">
                {authBanner.type === 'success' ? 'CONNECTED' : 'AUTH ERROR'}
              </span>
              <span className="truncate">{authBanner.message}</span>
            </div>
            <button
              onClick={() => setAuthBanner(null)}
              className="text-content-dim hover:text-content-primary p-0.5 rounded cursor-pointer font-bold ml-4 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Permissions Update Banner */}
        {!authBanner && accounts.some((a) => a.needs_reconnect) && (
          <div className="px-4 sm:px-6 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2 truncate">
              <span className="font-semibold uppercase tracking-wider text-[10px] font-mono text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                ACTION REQUIRED
              </span>
              <span className="truncate">
                Google Classroom permissions must be updated to sync non-assignment Classwork materials.
              </span>
            </div>
            <button
              onClick={() => setIsAccountsModalOpen(true)}
              className="px-2.5 py-1 rounded bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/40 text-amber-100 font-medium text-xs transition-colors cursor-pointer flex-shrink-0 ml-4"
            >
              Update
            </button>
          </div>
        )}

        {/* Center + Right 3-Pane Body */}
        <main className="flex-1 flex min-w-0 min-h-0 overflow-hidden relative">
          {/* Main View Switcher */}
          {currentTab === 'today' && (
            <TodayScheduleCard
              schedule={todaySchedule}
              onToggleTaskStatus={handleToggleTaskStatus}
              onSelectTask={(task) => {
                setSelectedTask(task);
                setCurrentTab('tasks');
              }}
              onNavigateToTasks={() => setCurrentTab('tasks')}
              onNavigateToTimetable={() => setCurrentTab('timetable')}
            />
          )}

          {currentTab === 'tasks' && (
            <div className="flex-1 flex min-w-0 h-full">
              <TaskList
                tasks={tasks}
                onToggleStatus={handleToggleTaskStatus}
                onSelectTask={setSelectedTask}
                selectedTaskId={selectedTask?.id || null}
                selectedCourseId={selectedCourseId}
              />
              <TaskDetailPane
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                onUpdateStatus={handleUpdateStatus}
                onUpdatePriority={handleUpdatePriority}
                onDeleteTask={handleDeleteTask}
                onPreviewFile={(f) => setPreviewingFile(f)}
                onIgnoreFile={handleIgnoreFile}
              />
            </div>
          )}

          {currentTab === 'files' && (
            <FileHub
              files={files}
              courses={courses}
              accounts={accounts}
              selectedCourseId={selectedCourseId}
              onPreviewFile={(f) => setPreviewingFile(f)}
              onIgnoreFile={handleIgnoreFile}
              onUnignoreFile={handleUnignoreFile}
              onLinkCourseDrive={handleLinkCourseDrive}
              onUnlinkCourseDrive={handleUnlinkCourseDrive}
              hasScopeWarning={accounts.some((a) => a.needs_reconnect)}
              onOpenAccounts={() => setIsAccountsModalOpen(true)}
            />
          )}

          {currentTab === 'timetable' && (
            <TimetableWeekly
              slots={timetableSlots}
              courses={courses}
              onCreateSlot={handleCreateSlot}
              onDeleteSlot={handleDeleteSlot}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden flex items-center justify-around bg-surface-1 border-t border-stroke py-2 px-1 z-20 flex-shrink-0 select-none">
          <button
            onClick={() => setCurrentTab('today')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              currentTab === 'today' ? 'text-accent-indigo' : 'text-content-muted'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Today</span>
          </button>
          <button
            onClick={() => setCurrentTab('tasks')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              currentTab === 'tasks' ? 'text-accent-indigo' : 'text-content-muted'
            }`}
          >
            <CheckSquare className="w-5 h-5 mb-0.5" />
            <span>Tasks</span>
          </button>
          <button
            onClick={() => setCurrentTab('files')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              currentTab === 'files' ? 'text-accent-indigo' : 'text-content-muted'
            }`}
          >
            <FolderOpen className="w-5 h-5 mb-0.5" />
            <span>Files</span>
          </button>
          <button
            onClick={() => setCurrentTab('timetable')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              currentTab === 'timetable' ? 'text-accent-indigo' : 'text-content-muted'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span>Schedule</span>
          </button>
          <button
            onClick={() => setIsAccountsModalOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-3 rounded text-[11px] font-medium text-content-muted hover:text-content-primary cursor-pointer"
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Accounts</span>
          </button>
        </nav>
      </div>

      {/* Global Modals */}
      <TaskCreateModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        courses={courses}
        onCreate={handleCreateTask}
      />

      <AccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        accounts={accounts}
        onRefreshData={loadDashboardData}
      />

      <FilePreviewModal
        file={previewingFile}
        onClose={() => setPreviewingFile(null)}
      />

      <OmniboxModal
        isOpen={isOmniboxOpen}
        onClose={() => setIsOmniboxOpen(false)}
        tasks={tasks}
        courses={courses}
        files={files}
        onSelectTask={(task) => {
          setSelectedTask(task);
          setCurrentTab('tasks');
        }}
        onSelectCourse={(cId) => {
          setSelectedCourseId(cId);
          setCurrentTab('tasks');
        }}
        onPreviewFile={(f) => setPreviewingFile(f)}
        onNavigateTab={(tab) => setCurrentTab(tab)}
      />

      <DeviceSyncModal
        isOpen={isDeviceSyncOpen}
        onClose={() => setIsDeviceSyncOpen(false)}
        courses={courses}
        timetableSlots={timetableSlots}
        onRefreshData={loadDashboardData}
      />
    </div>
  );
};
export default App;
