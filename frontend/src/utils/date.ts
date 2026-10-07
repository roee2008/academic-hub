/**
 * Centralized Date & Time Utility for System Default Timezone formatting.
 * Ensures all UTC / ISO date strings from Google Classroom and backend APIs
 * are accurately parsed as UTC and formatted in the user's system default timezone.
 */

/**
 * Parses any date string from the server into a JavaScript Date object.
 * If the string lacks a timezone indicator ('Z' or offset), it normalizes it as UTC,
 * preventing browser engines from incorrectly parsing UTC strings as local time.
 */
export function parseServerDate(dateStr?: string | Date | null): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }

  let normalized = dateStr.trim();
  if (!normalized) return null;

  // If format is like '2026-09-08 20:59:00', replace space with 'T'
  if (normalized.includes(' ') && !normalized.includes('T')) {
    normalized = normalized.replace(' ', 'T');
  }

  // If no timezone offset (+/-HH:MM or Z) is present, append 'Z' so JS parses as UTC
  const hasTimezone = /[Zz]$|[+-]\d{2}(:\d{2})?$/.test(normalized);
  if (!hasTimezone) {
    normalized += 'Z';
  }

  const parsed = new Date(normalized);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a date into a localized time string using the user's system default timezone and locale.
 * Example: '14:30' or '2:30 PM'
 */
export function formatLocalTime(
  dateInput?: string | Date | null,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string {
  const date = parseServerDate(dateInput);
  if (!date) return '';
  return date.toLocaleTimeString([], options);
}

/**
 * Formats a date into a localized date string using the user's system default timezone and locale.
 * Example: 'Sep 8, 2026' or 'Tue, Sep 8'
 */
export function formatLocalDate(
  dateInput?: string | Date | null,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  const date = parseServerDate(dateInput);
  if (!date) return '';
  return date.toLocaleDateString([], options);
}

/**
 * Formats a date and time together using the user's system default timezone and locale.
 * Example: 'Tue, Sep 8, 2026 at 14:30'
 */
export function formatLocalDateTime(dateInput?: string | Date | null): string {
  const date = parseServerDate(dateInput);
  if (!date) return '';
  const datePart = date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} at ${timePart}`;
}

/**
 * Formats a last sync timestamp into relative or localized time.
 */
export function formatLastSync(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Just now';
  const date = parseServerDate(dateInput);
  if (!date) return 'Just now';
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export interface RelativeDueBadge {
  text: string;
  color: string;
  isOverdue: boolean;
  isToday: boolean;
}

/**
 * Calculates a relative due date badge compared against the user's local system clock.
 */
export function formatRelativeDue(dateInput?: string | Date | null): RelativeDueBadge | null {
  const due = parseServerDate(dateInput);
  if (!due) return null;

  const now = new Date();
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Check if calendar day is today in system default timezone
  const isSameDay =
    due.getDate() === now.getDate() &&
    due.getMonth() === now.getMonth() &&
    due.getFullYear() === now.getFullYear();

  if (diffHours < 0 && !isSameDay) {
    return {
      text: 'Overdue',
      color: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
      isOverdue: true,
      isToday: false,
    };
  }

  if (isSameDay) {
    return {
      text: 'Due Today',
      color: 'text-accent-amber bg-accent-amber/10 border-accent-amber/30',
      isOverdue: diffHours < 0,
      isToday: true,
    };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    due.getDate() === tomorrow.getDate() &&
    due.getMonth() === tomorrow.getMonth() &&
    due.getFullYear() === tomorrow.getFullYear();

  if (isTomorrow) {
    return {
      text: 'Tomorrow',
      color: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
      isOverdue: false,
      isToday: false,
    };
  }

  const days = Math.ceil(diffHours / 24);
  const formattedDate = due.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return {
    text: days > 0 ? `In ${days} days (${formattedDate})` : formattedDate,
    color: 'text-content-muted bg-surface-2 border-stroke',
    isOverdue: false,
    isToday: false,
  };
}

/**
 * Converts a date string (YYYY-MM-DD) and optional time string (HH:MM) selected
 * by the user in their local system clock into a UTC ISO string with 'Z'.
 */
export function localDateTimeToUTCISO(dateStr: string, timeStr?: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = (timeStr || '23:59').split(':').map(Number);
  // Construct in local system time
  const localDate = new Date(year, month - 1, day, hours, minutes, 0);
  return localDate.toISOString();
}
