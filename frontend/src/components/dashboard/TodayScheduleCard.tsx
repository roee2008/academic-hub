import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { TodaySchedule, Assignment, TaskStatus } from '../../types';
import { formatLocalDate } from '../../utils/date';

interface TodayScheduleCardProps {
  schedule: TodaySchedule | null;
  onToggleTaskStatus: (task: Assignment) => void;
  onSelectTask: (task: Assignment) => void;
  onNavigateToTasks: () => void;
  onNavigateToTimetable: () => void;
}

export const TodayScheduleCard: React.FC<TodayScheduleCardProps> = ({
  schedule,
  onToggleTaskStatus,
  onSelectTask,
  onNavigateToTasks,
  onNavigateToTimetable,
}) => {
  if (!schedule) {
    return (
      <div className="p-6 text-center text-content-dim font-mono text-xs">
        Loading schedule telemetry...
      </div>
    );
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const getSlotState = (startTime: string, endTime: string) => {
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;

    if (currentMinutes >= startMins && currentMinutes <= endMins) {
      return { text: 'In Session', color: 'bg-emerald-500/15 text-accent-emerald border-emerald-500/30' };
    }
    if (currentMinutes < startMins && startMins - currentMinutes <= 60) {
      return { text: 'Starts Soon', color: 'bg-amber-500/15 text-accent-amber border-amber-500/30' };
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-canvas">
      {/* Date & Hero Banner */}
      <div className="p-5 rounded-lg bg-surface-1 border border-stroke flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-accent-indigo">
            <Calendar className="w-3.5 h-3.5" />
            <span className="uppercase font-semibold tracking-wider">
              {schedule.day_name} • {schedule.date_str}
            </span>
          </div>
          <h2 className="font-headline font-bold text-xl text-content-primary mt-1">
            Academic Focus & Schedule
          </h2>
          <p className="text-xs text-content-dim mt-0.5">
            {schedule.slots.length} classes scheduled today • {schedule.related_assignments.length} assignments connected to these subjects
          </p>
        </div>

        <button
          onClick={onNavigateToTimetable}
          className="flex items-center space-x-1 px-3 py-1.5 rounded bg-surface-2 hover:bg-surface-hover border border-stroke text-xs text-content-primary transition-all font-medium cursor-pointer"
        >
          <span>Full Timetable</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid: Left Column (Today's Classes), Right Column (Subject Assignments) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Classes List */}
        <div className="rounded-lg bg-surface-1 border border-stroke p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stroke pb-3">
            <h3 className="font-headline font-semibold text-sm text-content-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-indigo" />
              <span>Today's Class Schedule</span>
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-2 text-content-dim border border-stroke">
              {schedule.slots.length} Lectures
            </span>
          </div>

          <div className="space-y-2.5">
            {schedule.slots.length === 0 ? (
              <p className="text-xs text-content-dim italic py-8 text-center">
                No classes scheduled for today! Use the free time for project deep work.
              </p>
            ) : (
              schedule.slots.map((slot) => {
                const sessionState = getSlotState(slot.start_time, slot.end_time);
                return (
                  <div
                    key={slot.id}
                    className="relative p-3 rounded-md bg-surface-2 border border-stroke hover:border-stroke-bright transition-all"
                  >
                    <div
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r"
                      style={{ backgroundColor: slot.course_color || '#6366F1' }}
                    />
                    <div className="ml-1.5 flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className="text-xs font-semibold"
                            style={{ color: slot.course_color || '#818CF8' }}
                          >
                            {slot.course_code || slot.course_name}
                          </span>
                          {sessionState && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${sessionState.color}`}
                            >
                              {sessionState.text}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-medium text-content-primary">
                          {slot.course_name}
                        </h4>
                        {slot.room && (
                          <div className="flex items-center space-x-1 text-[11px] text-content-muted pt-0.5">
                            <MapPin className="w-3 h-3 text-content-dim" />
                            <span>{slot.room}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-medium text-content-primary">
                          {slot.start_time} - {slot.end_time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Due For Today's Subjects */}
        <div className="rounded-lg bg-surface-1 border border-stroke p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stroke pb-3">
            <h3 className="font-headline font-semibold text-sm text-content-primary flex items-center gap-2">
              <Flame className="w-4 h-4 text-accent-amber" />
              <span>Due for Today's Subjects</span>
            </h3>
            <button
              onClick={onNavigateToTasks}
              className="text-xs text-accent-indigo hover:underline cursor-pointer"
            >
              All Tasks ({schedule.related_assignments.length})
            </button>
          </div>

          <div className="space-y-2.5">
            {schedule.related_assignments.length === 0 ? (
              <p className="text-xs text-content-dim italic py-8 text-center">
                All caught up! No pending homework or projects for today's subjects.
              </p>
            ) : (
              schedule.related_assignments.slice(0, 5).map((asgn) => {
                const isDone = asgn.status === 'DONE';
                return (
                  <div
                    key={asgn.id}
                    onClick={() => onSelectTask(asgn)}
                    className={`p-3 rounded-md bg-surface-2 border border-stroke hover:border-stroke-bright transition-all cursor-pointer flex items-center justify-between ${
                      isDone ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate flex-1 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTaskStatus(asgn);
                        }}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0 ${
                          isDone
                            ? 'bg-accent-indigo border-accent-indigo text-white'
                            : 'border-stroke bg-canvas hover:border-accent-indigo'
                        }`}
                      >
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <span
                          className="text-[10px] font-medium block truncate"
                          style={{ color: asgn.course_color || '#818CF8' }}
                        >
                          {asgn.course_name}
                        </span>
                        <h4
                          className={`text-xs font-medium truncate ${
                            isDone ? 'line-through text-content-dim' : 'text-content-primary'
                          }`}
                        >
                          {asgn.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                      {asgn.priority === 'URGENT' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          URGENT
                        </span>
                      )}
                      {asgn.due_datetime && (
                        <span className="text-[10px] font-mono text-content-dim">
                          Due {formatLocalDate(asgn.due_datetime, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
