import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FolderOpen,
  Calendar,
  Users,
  ExternalLink,
  GraduationCap,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Account, Course } from '../../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  accounts: Account[];
  courses: Course[];
  selectedCourseId: string | null;
  setSelectedCourseId: (id: string | null) => void;
  onOpenAccountsModal: () => void;
  isSyncing: boolean;
  onTriggerSync: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  accounts,
  courses,
  selectedCourseId,
  setSelectedCourseId,
  onOpenAccountsModal,
  isSyncing,
  onTriggerSync,
}) => {
  const navItems = [
    { id: 'today', label: "Today's Focus", icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks & Homework', icon: CheckSquare },
    { id: 'files', label: 'Course Files Hub', icon: FolderOpen },
    { id: 'timetable', label: 'Weekly Timetable', icon: Calendar },
    { id: 'accounts', label: 'Accounts & Sync', icon: Users },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-surface-1 border-r border-stroke flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-stroke flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-md bg-accent-indigo/20 border border-accent-indigo/30 flex items-center justify-center text-accent-indigo">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-headline font-semibold text-sm tracking-tight text-content-primary flex items-center gap-1.5">
              Nexus Academic
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/30">
                Hub
              </span>
            </h1>
            <p className="text-[11px] text-content-dim">Multi-Workspace Aggregator</p>
          </div>
        </div>
      </div>

      {/* Connected Accounts Quick Badges */}
      <div className="px-3 py-2.5 border-b border-stroke bg-canvas/40">
        <div className="flex items-center justify-between text-[11px] font-mono text-content-muted mb-1.5">
          <span>LINKED GOOGLE ACCOUNTS</span>
          <button
            onClick={onOpenAccountsModal}
            className="text-[10px] text-accent-indigo hover:underline cursor-pointer"
          >
            Manage
          </button>
        </div>
        <div className="space-y-1.5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between px-2 py-1.5 rounded-sm bg-surface-2/60 border border-stroke/70 text-xs"
            >
              <div className="flex items-center space-x-2 truncate">
                <span
                  className={`w-2 h-2 rounded-full ${
                    acc.account_type === 'edu' ? 'bg-accent-emerald' : 'bg-accent-violet'
                  }`}
                />
                <span className="truncate text-content-primary font-medium text-[11px]">
                  {acc.email}
                </span>
              </div>
              <span className="text-[9px] font-mono uppercase px-1 rounded bg-stroke text-content-muted border border-stroke">
                {acc.account_type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'accounts') {
                  onOpenAccountsModal();
                } else {
                  setCurrentTab(item.id);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-accent-indigo text-white shadow-subtle'
                  : 'text-content-muted hover:text-content-primary hover:bg-surface-2'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.id === 'tasks' && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-white/20 text-white' : 'bg-surface-2 text-content-dim'
                  }`}
                >
                  6
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Course Filter Rail */}
      <div className="mt-3 px-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between text-[11px] font-mono text-content-dim px-1 mb-2">
          <span>COURSES</span>
          {selectedCourseId && (
            <button
              onClick={() => setSelectedCourseId(null)}
              className="text-[10px] text-content-muted hover:text-white"
            >
              Show All
            </button>
          )}
        </div>
        <div className="space-y-1">
          <button
            onClick={() => setSelectedCourseId(null)}
            className={`w-full flex items-center px-2.5 py-1.5 rounded text-xs transition-colors text-left ${
              selectedCourseId === null
                ? 'bg-surface-2 text-content-primary border border-stroke'
                : 'text-content-muted hover:text-content-primary hover:bg-surface-2/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-content-dim mr-2.5" />
            <span className="truncate">All Enrolled Courses</span>
          </button>
          {courses.map((c) => {
            const isSelected = selectedCourseId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCourseId(c.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors text-left group ${
                  isSelected
                    ? 'bg-surface-2 text-content-primary border border-stroke'
                    : 'text-content-muted hover:text-content-primary hover:bg-surface-2/40'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.color_tag || '#6366F1' }}
                  />
                  <span className="truncate font-medium text-[12px]">{c.name}</span>
                </div>
                {c.alternate_link && (
                  <a
                    href={c.alternate_link}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 text-content-dim hover:text-content-primary ml-1"
                    title="Open in Google Classroom"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sync Footer Action */}
      <div className="p-3 border-t border-stroke bg-canvas/30">
        <button
          onClick={onTriggerSync}
          disabled={isSyncing}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-md bg-surface-2 hover:bg-surface-hover border border-stroke text-xs text-content-primary transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-accent-indigo ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing Feeds...' : 'Sync All Accounts'}</span>
        </button>
      </div>
    </aside>
  );
};
