import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Plus } from 'lucide-react';
import { Course } from '../../types';

interface SlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  onCreateSlot: (slotData: {
    course_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room?: string;
  }) => Promise<void>;
}

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const SlotModal: React.FC<SlotModalProps> = ({
  isOpen,
  onClose,
  courses,
  onCreateSlot,
}) => {
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday default
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('11:00');
  const [room, setRoom] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    setIsSubmitting(true);
    try {
      await onCreateSlot({
        course_id: courseId,
        day_of_week: Number(dayOfWeek),
        start_time: startTime,
        end_time: endTime,
        room: room.trim() || undefined,
      });
      onClose();
      setRoom('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-1 border border-stroke rounded-lg shadow-modal overflow-hidden">
        <div className="px-5 py-4 border-b border-stroke flex items-center justify-between bg-surface-2/40">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-accent-indigo" />
            <h3 className="font-headline font-semibold text-sm text-content-primary">
              Add Recurring Class Period
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-content-dim hover:text-content-primary p-1 rounded hover:bg-surface-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Course */}
          <div>
            <label className="block text-[11px] font-mono text-content-muted uppercase mb-1">
              Course *
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

          {/* Day of Week */}
          <div>
            <label className="block text-[11px] font-mono text-content-muted uppercase mb-1">
              Day of Week *
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-xs text-content-primary focus-ring"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-content-muted uppercase mb-1">
                Start Time (HH:MM)
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-xs text-content-primary focus-ring"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-content-muted uppercase mb-1">
                End Time (HH:MM)
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-xs text-content-primary focus-ring"
              />
            </div>
          </div>

          {/* Room / Meeting Link */}
          <div>
            <label className="block text-[11px] font-mono text-content-muted uppercase mb-1">
              Room / Lecture Hall / Zoom Link
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Hewlett 200 or https://zoom.us/..."
              className="w-full px-3 py-2 rounded-md bg-canvas border border-stroke text-xs text-content-primary placeholder-content-dim focus-ring"
            />
          </div>

          <div className="pt-3 border-t border-stroke flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-surface-2 hover:bg-surface-hover border border-stroke text-xs text-content-muted hover:text-content-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-md bg-accent-indigo hover:bg-accent-indigo/90 text-xs font-medium text-white shadow-subtle disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Add Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
