import React from 'react';
import {
  X,
  ExternalLink,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Trash2,
  Eye,
  EyeOff,
  Download,
  ShieldAlert,
} from 'lucide-react';
import { Assignment, CourseFile, TaskPriority, TaskStatus } from '../../types';
import { formatLocalDate, formatLocalTime } from '../../utils/date';

interface TaskDetailPaneProps {
  task: Assignment | null;
  onClose: () => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdatePriority: (taskId: string, priority: TaskPriority) => void;
  onDeleteTask: (taskId: string) => void;
  onPreviewFile: (file: CourseFile) => void;
  onIgnoreFile?: (fileId: string) => void;
}

export const TaskDetailPane: React.FC<TaskDetailPaneProps> = ({
  task,
  onClose,
  onUpdateStatus,
  onUpdatePriority,
  onDeleteTask,
  onPreviewFile,
  onIgnoreFile,
}) => {
  if (!task) {
    return (
      <div className="w-80 lg:w-96 flex-shrink-0 bg-surface-1 border-l border-stroke flex flex-col items-center justify-center p-6 text-center select-none">
        <FileText className="w-10 h-10 text-content-dim mb-3 stroke-[1.5]" />
        <h4 className="text-xs font-semibold text-content-primary font-headline">
          Task Focus Inspector
        </h4>
        <p className="text-[11px] text-content-dim mt-1 max-w-xs">
          Select an assignment or coursework item from the list to inspect attachments, submit state, and update status.
        </p>
      </div>
    );
  }

  return (
    <aside className="w-80 lg:w-96 flex-shrink-0 bg-surface-1 border-l border-stroke flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-stroke flex items-start justify-between bg-surface-2/30">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border"
              style={{
                backgroundColor: `${task.course_color}18`,
                borderColor: `${task.course_color}40`,
                color: task.course_color || '#818CF8',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: task.course_color || '#6366F1' }}
              />
              {task.course_name}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-stroke text-content-dim">
              {task.source}
            </span>
          </div>
          <h3 className="font-headline font-semibold text-sm text-content-primary leading-snug">
            {task.title}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-content-dim hover:text-content-primary p-1 rounded hover:bg-surface-2 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="p-4 space-y-5 flex-1">
        {/* Status Switcher Row */}
        <div>
          <label className="block text-[10px] font-mono text-content-dim uppercase mb-1.5">
            Progress State
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-md bg-surface-2 border border-stroke text-xs">
            {(['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => onUpdateStatus(task.id, s)}
                className={`py-1 rounded text-center font-medium transition-all ${
                  task.status === s
                    ? 'bg-accent-indigo text-white shadow-subtle'
                    : 'text-content-muted hover:text-content-primary'
                }`}
              >
                {s === 'IN_PROGRESS' ? 'Progress' : s}
              </button>
            ))}
          </div>
          {task.local_override && (
            <p className="text-[10px] text-accent-indigo font-mono mt-1.5 flex items-center gap-1">
              <span>● Local override active (preserved during auto-sync)</span>
            </p>
          )}
        </div>

        {/* Priority & Submission State Meta */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-canvas border border-stroke text-xs">
          <div>
            <span className="text-[10px] font-mono text-content-dim block">PRIORITY</span>
            <select
              value={task.priority}
              onChange={(e) => onUpdatePriority(task.id, e.target.value as TaskPriority)}
              className="mt-1 bg-transparent text-content-primary font-medium focus:outline-none cursor-pointer"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <span className="text-[10px] font-mono text-content-dim block">GOOGLE STATE</span>
            <span className="mt-1 inline-block font-mono text-xs text-accent-emerald">
              {task.google_submission_state || 'N/A'}
            </span>
          </div>
        </div>

        {/* Due Date Details */}
        {task.due_datetime && (
          <div className="p-3 rounded-md bg-canvas border border-stroke flex items-center space-x-2.5">
            <Clock className="w-4 h-4 text-accent-amber flex-shrink-0" />
            <div className="text-xs">
              <div className="font-medium text-content-primary">
                {formatLocalDate(task.due_datetime, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="text-[11px] font-mono text-content-dim">
                Due at {formatLocalTime(task.due_datetime)}
              </div>
            </div>
          </div>
        )}

        {/* Description / Instructions */}
        <div>
          <label className="block text-[10px] font-mono text-content-dim uppercase mb-1.5">
            Assignment Description
          </label>
          <div className="p-3 rounded-md bg-canvas border border-stroke text-xs text-content-muted leading-relaxed whitespace-pre-wrap min-h-[4rem]">
            {task.description || 'No instructions provided.'}
          </div>
        </div>

        {/* Attached Files & Drive Materials */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-mono text-content-dim uppercase">
              Attached Materials ({task.files?.length || 0})
            </label>
          </div>
          {task.files && task.files.length > 0 ? (
            <div className="space-y-1.5">
              {task.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 rounded bg-canvas border border-stroke text-xs hover:border-stroke-bright transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate flex-1 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />
                    <span className="truncate text-content-primary text-[11px]">
                      {file.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => onPreviewFile(file)}
                      className="p-1 rounded text-content-dim hover:text-accent-indigo hover:bg-surface-2 transition-colors cursor-pointer"
                      title="Preview in App"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={`/api/files/${file.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded text-content-dim hover:text-accent-emerald hover:bg-surface-2 transition-colors"
                      title="Download raw file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    {onIgnoreFile && (
                      <button
                        onClick={() => onIgnoreFile(file.id)}
                        className="p-1 rounded text-content-dim hover:text-rose-400 hover:bg-surface-2 transition-colors cursor-pointer"
                        title="Ignore / Hide this file"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-content-dim italic bg-canvas/40 p-2.5 rounded border border-stroke">
              No Google Drive or Classroom files attached.
            </p>
          )}
        </div>

        {/* Action Links */}
        <div className="space-y-2 pt-2">
          {task.web_link && (
            <a
              href={task.web_link}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-md bg-surface-2 hover:bg-surface-hover border border-stroke text-xs text-content-primary transition-all font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5 text-accent-indigo" />
              <span>Open in Google Classroom</span>
            </a>
          )}

          {task.source === 'MANUAL' && (
            <button
              onClick={() => onDeleteTask(task.id)}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs text-rose-400 transition-all font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Manual Task</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
