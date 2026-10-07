import React, { useState } from 'react';
import { X, Plus, Calendar, Clock, Flag, Link, BookOpen } from 'lucide-react';
import { Course, TaskPriority, TaskStatus } from '../../types';
import { localDateTimeToUTCISO } from '../../utils/date';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  onCreate: (taskData: {
    title: string;
    course_id: string;
    description?: string;
    due_datetime?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    web_link?: string;
  }) => Promise<void>;
}

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  isOpen,
  onClose,
  courses,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [webLink, setWebLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId) return;

    let combinedDue: string | undefined = undefined;
    if (dueDate) {
      combinedDue = localDateTimeToUTCISO(dueDate, dueTime);
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        course_id: courseId,
        description: description.trim() || undefined,
        due_datetime: combinedDue,
        priority,
        status: 'TODO',
        web_link: webLink.trim() || undefined,
      });
      onClose();
      // Reset
      setTitle('');
      setDescription('');
      setDueDate('');
      setWebLink('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-surface-1 border border-stroke rounded-lg shadow-modal overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stroke flex items-center justify-between bg-surface-2/40">
          <div className="flex items-center space-x-2">
            <Plus className="w-4 h-4 text-accent-indigo" />
            <h3 className="font-headline font-semibold text-sm text-content-primary">
              Create Manual Assignment
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-content-dim hover:text-content-primary p-1 rounded hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-mono text-content-muted uppercase mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read Chapter 4 & Write Reflection"
              className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-xs text-content-primary placeholder-content-dim focus-ring"
            />
          </div>

          {/* Course & Priority Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-content-muted uppercase mb-1">
                Associated Course *
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-xs text-content-primary focus-ring"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code || 'Course'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-content-muted uppercase mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-xs text-content-primary focus-ring"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-content-muted uppercase mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-xs text-content-primary focus-ring"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-content-muted uppercase mb-1">
                Due Time
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-xs text-content-primary focus-ring"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono text-content-muted uppercase mb-1">
              Instructions & Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add deliverables, grading criteria, or study references..."
              className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-xs text-content-primary placeholder-content-dim focus-ring"
            />
          </div>

          {/* Web Reference Link */}
          <div>
            <label className="block text-[11px] font-mono text-content-muted uppercase mb-1">
              External Link (Optional)
            </label>
            <input
              type="url"
              value={webLink}
              onChange={(e) => setWebLink(e.target.value)}
              placeholder="https://gradescope.com/courses/..."
              className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-xs text-content-primary placeholder-content-dim focus-ring"
            />
          </div>

          {/* Submit Footer */}
          <div className="pt-3 border-t border-stroke flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-surface-2 hover:bg-surface-hover border border-stroke text-xs text-content-muted hover:text-content-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-1.5 rounded-md bg-accent-indigo hover:bg-accent-indigo/90 text-xs font-medium text-white shadow-subtle transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
