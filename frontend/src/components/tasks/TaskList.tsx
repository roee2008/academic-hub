import React, { useState, useMemo } from 'react';
import {
  Filter,
  CheckCircle2,
  ListTodo,
  Clock,
  Sparkles,
  Search,
  BookOpen,
} from 'lucide-react';
import { Assignment, TaskStatus, TaskPriority, TaskSource } from '../../types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Assignment[];
  onToggleStatus: (task: Assignment) => void;
  onSelectTask: (task: Assignment) => void;
  selectedTaskId: string | null;
  selectedCourseId: string | null;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleStatus,
  onSelectTask,
  selectedTaskId,
  selectedCourseId,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'course'>('deadline');

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Course filter from sidebar
      if (selectedCourseId && t.course_id !== selectedCourseId) return false;

      // Status filter
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

      // Source filter
      if (sourceFilter !== 'ALL' && t.source !== sourceFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesCourse = t.course_name?.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCourse && !matchesDesc) return false;
      }

      return true;
    });
  }, [tasks, selectedCourseId, statusFilter, sourceFilter, searchQuery]);

  const counts = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'TODO').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    return { all: tasks.length, todo, inProgress, done };
  }, [tasks]);

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas overflow-hidden">
      {/* Filters & Control Bar */}
      <div className="p-4 border-b border-stroke bg-surface-1/50 space-y-3">
        {/* Top Row: Search & Status Segments */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 p-1 bg-surface-2 rounded-md border border-stroke text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-accent-indigo text-white font-medium'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setStatusFilter('TODO')}
              className={`px-2.5 py-1 rounded transition-all ${
                statusFilter === 'TODO'
                  ? 'bg-accent-indigo text-white font-medium'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              To Do ({counts.todo})
            </button>
            <button
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-2.5 py-1 rounded transition-all ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-accent-indigo text-white font-medium'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              In Progress ({counts.inProgress})
            </button>
            <button
              onClick={() => setStatusFilter('DONE')}
              className={`px-2.5 py-1 rounded transition-all ${
                statusFilter === 'DONE'
                  ? 'bg-accent-indigo text-white font-medium'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              Done ({counts.done})
            </button>
          </div>

          {/* Source Segments */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-[11px] font-mono text-content-dim mr-1 hidden md:inline">
              SOURCE:
            </span>
            <button
              onClick={() => setSourceFilter('ALL')}
              className={`px-2 py-1 rounded text-xs border ${
                sourceFilter === 'ALL'
                  ? 'border-accent-indigo bg-accent-indigo/10 text-accent-indigo'
                  : 'border-stroke bg-surface-2 text-content-dim hover:text-content-primary'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSourceFilter('CLASSROOM')}
              className={`px-2 py-1 rounded text-xs border ${
                sourceFilter === 'CLASSROOM'
                  ? 'border-accent-indigo bg-accent-indigo/10 text-accent-indigo'
                  : 'border-stroke bg-surface-2 text-content-dim hover:text-content-primary'
              }`}
            >
              Classroom
            </button>
            <button
              onClick={() => setSourceFilter('MANUAL')}
              className={`px-2 py-1 rounded text-xs border ${
                sourceFilter === 'MANUAL'
                  ? 'border-accent-indigo bg-accent-indigo/10 text-accent-indigo'
                  : 'border-stroke bg-surface-2 text-content-dim hover:text-content-primary'
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {/* Search & Sort Input */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-content-dim absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks by keyword, course code..."
              className="w-full pl-9 pr-3 py-1.5 rounded-md bg-canvas border border-stroke text-xs text-content-primary placeholder-content-dim focus-ring"
            />
          </div>
        </div>
      </div>

      {/* Task List Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ListTodo className="w-10 h-10 text-content-dim mx-auto mb-3 stroke-[1.5]" />
            <h4 className="text-sm font-medium text-content-primary">No tasks found</h4>
            <p className="text-xs text-content-dim mt-1 max-w-sm mx-auto">
              No assignments match the selected filters or course criteria.
            </p>
          </div>
        ) : (
          filteredTasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              isSelected={selectedTaskId === t.id}
              onToggleStatus={onToggleStatus}
              onSelectTask={onSelectTask}
            />
          ))
        )}
      </div>
    </div>
  );
};
