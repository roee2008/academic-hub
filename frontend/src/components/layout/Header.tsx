import React from 'react';
import { Search, RefreshCw, Plus, ShieldCheck, Clock } from 'lucide-react';
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
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  selectedCourseName,
  syncStatus,
  onTriggerSync,
  onOpenQuickAdd,
  onOpenOmnibox,
  onOpenAccountsModal,
}) => {
  const getTabTitle = () => {
    switch (currentTab) {
      case 'today':
        return "Today's Academic Cockpit";
      case 'tasks':
        return 'Assignment & Deliverable Ledger';
      case 'files':
        return 'Course Vault & Drive Index';
      case 'timetable':
        return 'Weekly Class Bell Schedule';
      default:
        return 'Academic Workspace';
    }
  };

  return (
    <header className="h-14 border-b border-stroke bg-surface-1/90 backdrop-blur-md px-6 flex items-center justify-between z-10 select-none">
      {/* Title & Context */}
      <div className="flex items-center space-x-3">
        <h2 className="font-headline font-semibold text-base text-content-primary">
          {getTabTitle()}
        </h2>
        {selectedCourseName && (
          <>
            <span className="text-content-dim">/</span>
            <span className="px-2 py-0.5 rounded text-xs bg-surface-2 border border-stroke text-accent-indigo font-medium">
              {selectedCourseName}
            </span>
          </>
        )}
      </div>

      {/* Middle Search Omnibox Trigger */}
      <div className="flex-1 max-w-md mx-6">
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

        {/* Quick Add Assignment */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-accent-indigo hover:bg-accent-indigo/90 text-white text-xs font-medium shadow-subtle transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>
    </header>
  );
};
