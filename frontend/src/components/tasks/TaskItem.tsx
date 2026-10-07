import React from 'react';
import {
  Calendar,
  ExternalLink,
  FileText,
  AlertCircle,
  Clock,
  Check,
  Tag,
} from 'lucide-react';
import { Assignment, TaskStatus } from '../../types';
import { formatRelativeDue } from '../../utils/date';

interface TaskItemProps {
  task: Assignment;
  onToggleStatus: (task: Assignment) => void;
  onSelectTask: (task: Assignment) => void;
  isSelected?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleStatus,
  onSelectTask,
  isSelected,
}) => {
  const isDone = task.status === 'DONE';
  const dueBadge = formatRelativeDue(task.due_datetime);

  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'URGENT':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">URGENT</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30">MED</span>;
      case 'LOW':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-500/15 text-content-dim border border-slate-700">LOW</span>;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={() => onSelectTask(task)}
      className={`group relative flex items-center justify-between px-3.5 py-3 rounded-md bg-surface-1 border transition-all cursor-pointer ${
        isSelected
          ? 'border-accent-indigo bg-surface-2/90 shadow-subtle'
          : 'border-stroke hover:border-stroke-bright hover:bg-surface-2/50'
      } ${isDone ? 'opacity-65' : ''}`}
    >
      {/* Dynamic left color indicator */}
      <div
        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r"
        style={{ backgroundColor: task.course_color || '#6366F1' }}
      />

      <div className="flex items-center space-x-3 flex-1 min-w-0 ml-1.5">
        {/* Custom Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(task);
          }}
          className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
            isDone
              ? 'bg-accent-indigo border-accent-indigo text-white'
              : 'border-stroke hover:border-accent-indigo bg-canvas'
          }`}
          title={isDone ? 'Mark TODO' : 'Mark DONE'}
        >
          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
        </button>

        {/* Course Chip & Title */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
              style={{
                backgroundColor: `${task.course_color}18` || 'rgba(99, 102, 241, 0.12)',
                borderColor: `${task.course_color}40` || 'rgba(99, 102, 241, 0.25)',
                color: task.course_color || '#818CF8',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full mr-1"
                style={{ backgroundColor: task.course_color || '#6366F1' }}
              />
              {task.course_name}
            </span>

            <span className="text-[10px] font-mono px-1 rounded bg-surface-2 text-content-dim border border-stroke">
              {task.source}
            </span>

            {task.google_submission_state && task.google_submission_state !== 'NEW' && (
              <span className="text-[10px] font-mono px-1 rounded bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/30">
                {task.google_submission_state}
              </span>
            )}
          </div>

          <h3
            className={`text-xs font-medium mt-1 truncate ${
              isDone ? 'line-through text-content-dim' : 'text-content-primary'
            }`}
          >
            {task.title}
          </h3>
        </div>
      </div>

      {/* Badges and Actions */}
      <div className="flex items-center space-x-2.5 ml-4 flex-shrink-0">
        {/* Priority Badge */}
        {getPriorityBadge()}

        {/* Due Date Countdown */}
        {dueBadge && (
          <span
            className={`hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono border ${dueBadge.color}`}
          >
            <Clock className="w-3 h-3" />
            <span>{dueBadge.text}</span>
          </span>
        )}

        {/* Attached Files Counter */}
        {task.files && task.files.length > 0 && (
          <span
            className="flex items-center space-x-1 text-[11px] font-mono text-content-muted bg-surface-2 px-1.5 py-0.5 rounded border border-stroke"
            title={`${task.files.length} attached Google Drive / Classroom files`}
          >
            <FileText className="w-3 h-3 text-accent-cyan" />
            <span>{task.files.length}</span>
          </span>
        )}

        {/* External Web Link */}
        {task.web_link && (
          <a
            href={task.web_link}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-content-dim hover:text-content-primary p-1 rounded hover:bg-surface-2 transition-colors"
            title="Open in Google Classroom / Web"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};
