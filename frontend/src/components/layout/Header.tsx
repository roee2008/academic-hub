import React from 'react';
import { Search, RefreshCw, Plus, ShieldCheck, Clock, Menu, Smartphone, ArrowLeftRight } from 'lucide-react';
import { SyncStatus } from '../../types';
import { formatLastSync } from '../../utils/date';

interface HeaderProps {
  currentTab: string;
  selectedCourseName?: string;
  syncStatus: SyncStatus | null;
  onTriggerSync: () => void;
  onOpenQuickAdd: () => void;
  onOpenOmnibox: () => void;
  onOpenAccountsModal: () => void;
  onToggleMobileMenu?: () => void;
  onInstallApp?: () => void;
  canInstall?: boolean;
  onOpenDeviceSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  selectedCourseName,
  syncStatus,
  onTriggerSync,
  onOpenQuickAdd,
  onOpenOmnibox,
  onOpenAccountsModal,
  onToggleMobileMenu,
  onInstallApp,
  canInstall,
  onOpenDeviceSync,
}) => {
  const getTabTitle = () => {
    switch (currentTab) {
      case 'today':
        return "Today's Focus";
      case 'tasks':
        return 'Tasks & Homework';
      case 'files':
        return 'Course Files';
      case 'timetable':
        return 'Class Timetable';
      default:
        return 'Academic Workspace';
    }
  };

  return (
    <header className="h-14 border-b border-stroke bg-surface-1/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-10 select-none">
      {/* Title & Context */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 -ml-1 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-2 cursor-pointer"
            title="Open courses & menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="font-headline font-semibold text-sm sm:text-base text-content-primary truncate">
          {getTabTitle()}
        </h2>
        {selectedCourseName && (
          <>
            <span className="text-content-dim hidden sm:inline">/</span>
            <span className="hidden sm:inline px-2 py-0.5 rounded text-xs bg-surface-2 border border-stroke text-accent-indigo font-medium truncate max-w-[120px]">
              {selectedCourseName}
            </span>
          </>
        )}
      </div>

      {/* Middle Search Omnibox Trigger */}
      <div className="flex-1 max-w-xs sm:max-w-md mx-2 sm:mx-6">
        <button
          onClick={onOpenOmnibox}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-md bg-canvas border border-stroke text-content-muted hover:border-stroke-bright hover:text-content-primary transition-all text-xs cursor-pointer shadow-subtle group"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-content-dim group-hover:text-accent-indigo" />
            <span>Search courses, tasks, or drive files...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-2 border border-stroke text-content-dim">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Action Cluster */}
      <div className="flex items-center space-x-3">
        {/* Sync Status Badge & Trigger */}
        <div className="flex items-center space-x-2">
          <div className="hidden lg:flex items-center space-x-1.5 text-[11px] font-mono text-content-dim">
            <Clock className="w-3 h-3" />
            <span>Synced {formatLastSync(syncStatus?.last_synced_at)}</span>
          </div>
          <button
            onClick={onTriggerSync}
            disabled={syncStatus?.is_syncing}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-surface-2 hover:bg-surface-hover border border-stroke text-xs text-content-primary transition-all cursor-pointer disabled:opacity-50"
            title="Instant Refresh: sync Google Classroom & Drive"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-accent-emerald ${
                syncStatus?.is_syncing ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden sm:inline">
              {syncStatus?.is_syncing ? 'Syncing...' : 'Instant Refresh'}
            </span>
          </button>
        </div>

        {/* Sync Devices Button */}
        {onOpenDeviceSync && (
          <button
            onClick={onOpenDeviceSync}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-surface-2 hover:bg-surface-hover border border-stroke text-xs text-content-primary transition-all cursor-pointer"
            title="Sync courses and timetable between devices"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-accent-indigo" />
            <span className="hidden sm:inline">Sync Devices</span>
          </button>
        )}

        {/* Install App Button on Mobile/PWA */}
        {canInstall && onInstallApp && (
          <button
            onClick={onInstallApp}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-accent-emerald/20 hover:bg-accent-emerald/30 border border-accent-emerald/40 text-accent-emerald text-xs font-medium transition-all cursor-pointer"
            title="Install Nexus Hub on your phone"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install</span>
          </button>
        )}

        {/* Quick Add Assignment */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-accent-indigo hover:bg-accent-indigo/90 text-white text-xs font-medium shadow-subtle transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Task</span>
        </button>
      </div>
    </header>
  );
};
