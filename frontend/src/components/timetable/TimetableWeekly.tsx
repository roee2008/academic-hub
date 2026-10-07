import React, { useState, useMemo } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  BookOpen,
  LayoutGrid,
  Rows,
  Sparkles,
} from 'lucide-react';
import { TimetableSlot, Course } from '../../types';
import { SlotModal } from './SlotModal';

interface TimetableWeeklyProps {
  slots: TimetableSlot[];
  courses: Course[];
  onCreateSlot: (slotData: {
    course_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room?: string;
  }) => Promise<void>;
  onDeleteSlot: (slotId: string) => Promise<void>;
}

const BASE_DAYS_CONFIG = [
  { day: 0, name: 'Sunday', short: 'SUN' },
  { day: 1, name: 'Monday', short: 'MON' },
  { day: 2, name: 'Tuesday', short: 'TUE' },
  { day: 3, name: 'Wednesday', short: 'WED' },
  { day: 4, name: 'Thursday', short: 'THU' },
  { day: 5, name: 'Friday', short: 'FRI' },
];

const SATURDAY_CONFIG = { day: 6, name: 'Saturday', short: 'SAT' };

// Pixels per minute in time grid schedule (1.1px/min => 66px per hour)
const PIXELS_PER_MINUTE = 1.15;
const HOUR_HEIGHT = 60 * PIXELS_PER_MINUTE; // 69px

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatDuration(startMin: number, endMin: number): string {
  const diff = Math.max(0, endMin - startMin);
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export const TimetableWeekly: React.FC<TimetableWeeklyProps> = ({
  slots,
  courses,
  onCreateSlot,
  onDeleteSlot,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'grid';
  });
  const [showSaturday, setShowSaturday] = useState(false);

  const todayDay = new Date().getDay(); // 0 is Sun, 1 is Mon, etc.
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // If there are any slots on Saturday, automatically include Saturday
  const hasSaturdaySlots = useMemo(
    () => slots.some((s) => s.day_of_week === 6),
    [slots]
  );

  const daysConfig = useMemo(() => {
    if (showSaturday || hasSaturdaySlots) {
      return [...BASE_DAYS_CONFIG, SATURDAY_CONFIG];
    }
    return BASE_DAYS_CONFIG;
  }, [showSaturday, hasSaturdaySlots]);

  // Compute time range: dynamic start & end hour based on earliest/latest slots
  const { startHour, endHour, totalHours } = useMemo(() => {
    let minHour = 8;
    let maxHour = 20;

    slots.forEach((s) => {
      const sMin = parseTimeToMinutes(s.start_time);
      const eMin = parseTimeToMinutes(s.end_time);
      const sH = Math.floor(sMin / 60);
      const eH = Math.ceil(eMin / 60);
      if (sH < minHour) minHour = Math.max(6, sH);
      if (eH > maxHour) maxHour = Math.min(23, eH);
    });

    return {
      startHour: minHour,
      endHour: maxHour,
      totalHours: maxHour - minHour,
    };
  }, [slots]);

  const dayStartMinutes = startHour * 60;
  const gridTotalHeight = totalHours * HOUR_HEIGHT;

  const hoursList = useMemo(() => {
    const list: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      list.push(h);
    }
    return list;
  }, [startHour, endHour]);

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas overflow-hidden select-none">
      {/* Header Bar */}
      <div className="p-4 border-b border-stroke bg-surface-1/60 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-accent-indigo" />
            <h3 className="font-headline font-semibold text-sm text-content-primary">
              Weekly Class Bell Schedule
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/30">
              Proportional Duration
            </span>
          </div>
          <p className="text-xs text-content-dim mt-0.5">
            Lesson blocks scaled in direct relevancy to class duration • Synchronized schedule
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Saturday Toggle if no Saturday slots exist yet */}
          {!hasSaturdaySlots && (
            <button
              onClick={() => setShowSaturday(!showSaturday)}
              className={`px-2.5 py-1.5 rounded text-xs font-mono transition-all border cursor-pointer ${
                showSaturday
                  ? 'bg-surface-2 text-content-primary border-stroke-bright'
                  : 'bg-transparent text-content-dim border-stroke hover:text-content-muted'
              }`}
              title="Toggle Saturday column"
            >
              {showSaturday ? 'Hide Sat' : '+ Sat'}
            </button>
          )}

          {/* View Mode Toggle: Grid Schedule vs Stacked Cards */}
          <div className="flex items-center bg-surface-2 p-0.5 rounded-md border border-stroke">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-accent-indigo text-white shadow-subtle'
                  : 'text-content-muted hover:text-content-primary'
              }`}
              title="Time-Grid View (proportional height by length)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Schedule Grid</span>
            </button>

            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-accent-indigo text-white shadow-subtle'
                  : 'text-content-muted hover:text-content-primary'
              }`}
              title="Cards View"
            >
              <Rows className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-accent-indigo hover:bg-accent-indigo/90 text-white text-xs font-medium shadow-subtle transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Class Period</span>
          </button>
        </div>
      </div>

      {/* Main Schedule Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4">
        {viewMode === 'grid' ? (
          /* ============================================================ */
          /* PROPORTIONAL TIME GRID SCHEDULE VIEW                         */
          /* ============================================================ */
          <div className="min-w-[840px] flex flex-col bg-surface-1/60 rounded-xl border border-stroke overflow-hidden shadow-sm">
            {/* Days Header Row */}
            <div className="flex border-b border-stroke bg-surface-2/70 sticky top-0 z-20 backdrop-blur-md">
              {/* Left Gutter Header Placeholder */}
              <div className="w-16 flex-shrink-0 p-3 border-r border-stroke text-center">
                <Clock className="w-3.5 h-3.5 text-content-dim mx-auto" />
              </div>

              {/* Day Columns Header */}
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysConfig.length}, minmax(0, 1fr))` }}>
                {daysConfig.map(({ day, name, short }) => {
                  const isToday = todayDay === day;
                  return (
                    <div
                      key={day}
                      className={`p-3 border-r last:border-r-0 border-stroke flex items-center justify-between transition-colors ${
                        isToday ? 'bg-accent-indigo/15 text-accent-indigo font-bold' : 'text-content-muted'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="font-headline text-xs tracking-wider uppercase">
                          {name}
                        </span>
                        <span className="text-[10px] font-mono opacity-60">({short})</span>
                      </div>
                      {isToday && (
                        <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.2 rounded bg-accent-indigo text-white shadow-xs">
                          Today
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid Body: Time Scale Gutter + Day Columns */}
            <div className="flex relative" style={{ height: `${gridTotalHeight}px` }}>
              {/* Left Time Gutter */}
              <div className="w-16 flex-shrink-0 border-r border-stroke bg-surface-1/40 relative select-none">
                {hoursList.map((hour, idx) => {
                  const topPos = idx * HOUR_HEIGHT;
                  const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
                  return (
                    <div
                      key={hour}
                      className="absolute right-2.5 -translate-y-1/2 text-[10px] font-mono text-content-dim font-medium"
                      style={{ top: `${topPos}px` }}
                    >
                      {timeLabel}
                    </div>
                  );
                })}
              </div>

              {/* Grid Lines across all columns */}
              <div className="absolute inset-0 left-16 pointer-events-none z-0">
                {hoursList.map((hour, idx) => {
                  const topPos = idx * HOUR_HEIGHT;
                  return (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-stroke/40"
                      style={{ top: `${topPos}px` }}
                    />
                  );
                })}
              </div>

              {/* Day Columns Container */}
              <div
                className="flex-1 grid relative z-10"
                style={{ gridTemplateColumns: `repeat(${daysConfig.length}, minmax(0, 1fr))` }}
              >
                {daysConfig.map(({ day }) => {
                  const isToday = todayDay === day;
                  const daySlots = slots
                    .filter((s) => s.day_of_week === day)
                    .sort((a, b) => a.start_time.localeCompare(b.start_time));

                  // Current time line for today
                  const isNowWithinGrid =
                    isToday &&
                    currentMinutes >= dayStartMinutes &&
                    currentMinutes <= endHour * 60;
                  const nowTop = (currentMinutes - dayStartMinutes) * PIXELS_PER_MINUTE;

                  return (
                    <div
                      key={day}
                      className={`relative border-r last:border-r-0 border-stroke h-full transition-colors ${
                        isToday ? 'bg-accent-indigo/[0.02]' : ''
                      }`}
                    >
                      {/* Current Time Indicator Bar */}
                      {isNowWithinGrid && (
                        <div
                          className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                          style={{ top: `${nowTop}px` }}
                        >
                          <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm -ml-1 ring-2 ring-rose-500/30" />
                          <div className="flex-1 h-[2px] bg-rose-500/80 shadow-xs" />
                        </div>
                      )}

                      {/* Lesson Slots in this Day */}
                      {daySlots.map((slot) => {
                        const startMin = parseTimeToMinutes(slot.start_time);
                        const endMin = parseTimeToMinutes(slot.end_time);
                        const durationMin = Math.max(15, endMin - startMin);

                        // Position and height strictly proportional to minutes
                        const top = Math.max(0, (startMin - dayStartMinutes) * PIXELS_PER_MINUTE);
                        // Minimum height so text is always clear, leave 3px gap at bottom
                        const rawHeight = durationMin * PIXELS_PER_MINUTE - 3;
                        const height = Math.max(48, rawHeight);

                        const courseColor = slot.course_color || '#6366F1';
                        const isCompact = height < 70;
                        const isVeryCompact = height < 54;

                        return (
                          <div
                            key={slot.id}
                            className="group absolute left-1 right-1 rounded-md border transition-all hover:z-20 hover:shadow-lg overflow-hidden flex flex-col justify-between"
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              backgroundColor: 'rgba(26, 34, 52, 0.95)',
                              borderColor: `${courseColor}55`,
                              boxShadow: `inset 0 0 0 1px ${courseColor}22`,
                            }}
                          >
                            {/* Course Color Indicator Ribbon */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1.5"
                              style={{ backgroundColor: courseColor }}
                            />

                            <div className="pl-3 pr-2 py-1.5 flex flex-col justify-between h-full overflow-hidden">
                              {/* Top Bar: Code + Delete button */}
                              <div className="flex items-center justify-between gap-1 min-w-0">
                                <span
                                  className="text-[11px] font-bold font-headline truncate tracking-wide"
                                  style={{ color: courseColor }}
                                >
                                  {slot.course_code || slot.course_name}
                                </span>

                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  {/* Duration Badge */}
                                  <span className="text-[9px] font-mono px-1 rounded bg-surface-1 text-content-dim border border-stroke/80">
                                    {formatDuration(startMin, endMin)}
                                  </span>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteSlot(slot.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-content-dim hover:text-rose-400 p-0.5 rounded transition-all cursor-pointer hover:bg-surface-hover"
                                    title="Remove slot"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Course Name (for non-compact slots) */}
                              {!isCompact && (
                                <div className="text-[11px] font-medium text-content-primary truncate leading-tight mt-0.5">
                                  {slot.course_name}
                                </div>
                              )}

                              {/* Bottom Metadata: Time & Room */}
                              <div className="flex items-center justify-between gap-2 mt-auto text-[10px] font-mono text-content-dim pt-0.5 border-t border-stroke/40">
                                <div className="flex items-center space-x-1 truncate">
                                  <Clock className="w-2.5 h-2.5 text-accent-amber flex-shrink-0" />
                                  <span className="truncate">
                                    {slot.start_time} - {slot.end_time}
                                  </span>
                                </div>

                                {slot.room && !isVeryCompact && (
                                  <div className="flex items-center space-x-0.5 text-content-muted flex-shrink-0">
                                    <MapPin className="w-2.5 h-2.5 text-content-dim" />
                                    <span className="truncate max-w-[60px]">{slot.room}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* CARD LIST VIEW WITH DURATION-BASED HEIGHTS                   */
          /* ============================================================ */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
            {daysConfig.map(({ day, name, short }) => {
              const daySlots = slots
                .filter((s) => s.day_of_week === day)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));
              const isToday = todayDay === day;

              return (
                <div
                  key={day}
                  className={`flex flex-col rounded-lg border bg-surface-1/80 overflow-hidden ${
                    isToday ? 'border-accent-indigo ring-1 ring-accent-indigo/30' : 'border-stroke'
                  }`}
                >
                  {/* Day Header */}
                  <div
                    className={`p-3 border-b flex items-center justify-between ${
                      isToday
                        ? 'bg-accent-indigo/15 border-accent-indigo/30 text-accent-indigo'
                        : 'bg-surface-2/60 border-stroke text-content-muted'
                    }`}
                  >
                    <span className="font-headline font-semibold text-xs tracking-wide">
                      {name}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-mono font-semibold uppercase px-1 rounded bg-accent-indigo text-white">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Slots List for this day */}
                  <div className="flex-1 p-2 space-y-2.5 overflow-y-auto">
                    {daySlots.length === 0 ? (
                      <div className="h-full flex items-center justify-center p-4 text-center">
                        <span className="text-[11px] text-content-dim font-mono italic">
                          No scheduled classes
                        </span>
                      </div>
                    ) : (
                      daySlots.map((slot) => {
                        const startMin = parseTimeToMinutes(slot.start_time);
                        const endMin = parseTimeToMinutes(slot.end_time);
                        const durationMin = Math.max(15, endMin - startMin);

                        // Card height scales in direct relevancy to duration (min 72px, up to 170px)
                        const scaledMinHeight = Math.min(180, Math.max(72, Math.round(durationMin * 0.95)));

                        return (
                          <div
                            key={slot.id}
                            className="group relative p-2.5 rounded bg-surface-2 border border-stroke hover:border-stroke-bright transition-all flex flex-col justify-between"
                            style={{
                              minHeight: `${scaledMinHeight}px`,
                              borderColor: `${slot.course_color || '#6366F1'}40`,
                            }}
                          >
                            {/* Course Color Accent Ribbon */}
                            <div
                              className="absolute left-0 top-1 bottom-1 w-1 rounded-r"
                              style={{ backgroundColor: slot.course_color || '#6366F1' }}
                            />

                            <div className="ml-1 flex-1 flex flex-col justify-between space-y-1">
                              <div>
                                <div className="flex items-center justify-between">
                                  <span
                                    className="text-[11px] font-semibold truncate"
                                    style={{ color: slot.course_color || '#818CF8' }}
                                  >
                                    {slot.course_code || slot.course_name}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[9px] font-mono px-1 rounded bg-canvas text-content-dim border border-stroke">
                                      {formatDuration(startMin, endMin)}
                                    </span>
                                    <button
                                      onClick={() => onDeleteSlot(slot.id)}
                                      className="opacity-70 sm:opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 text-content-dim hover:text-rose-400 p-0.5 rounded transition-all cursor-pointer"
                                      title="Remove slot"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="text-[11px] text-content-primary font-medium line-clamp-2 mt-0.5">
                                  {slot.course_name}
                                </div>
                              </div>

                              <div className="pt-1 border-t border-stroke/40 flex items-center justify-between text-[10px] font-mono text-content-dim">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3 text-accent-amber flex-shrink-0" />
                                  <span>
                                    {slot.start_time} - {slot.end_time}
                                  </span>
                                </div>

                                {slot.room && (
                                  <div className="flex items-center space-x-0.5 text-content-muted">
                                    <MapPin className="w-2.5 h-2.5 text-content-dim" />
                                    <span className="truncate max-w-[60px]">{slot.room}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SlotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        courses={courses}
        onCreateSlot={onCreateSlot}
      />
    </div>
  );
};
