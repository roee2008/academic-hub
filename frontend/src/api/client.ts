import {
  Account,
  Course,
  Assignment,
  CourseFile,
  TimetableSlot,
  TodaySchedule,
  SyncStatus,
  SyncLog,
  TaskStatus,
  TaskPriority,
  ClassAnalysisResponse,
  NotebookLMExportRequest,
  ExportResultResponse,
} from '../types';

const API_BASE = '/api';

// Helper storage utilities for native phone offline storage
function getStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage limits
  }
}

// Default offline courses if empty
export const DEFAULT_OFFLINE_COURSES: Course[] = [
  {
    id: 'course_cs106b',
    account_id: 'acc_phone',
    name: 'Programming Abstractions',
    code: 'CS 106B',
    section: '01',
    color_tag: '#6366F1',
    is_hidden: false,
  },
  {
    id: 'course_math51',
    account_id: 'acc_phone',
    name: 'Linear Algebra & Calculus',
    code: 'MATH 51',
    section: '03',
    color_tag: '#F59E0B',
    is_hidden: false,
  },
  {
    id: 'course_bio81',
    account_id: 'acc_phone',
    name: 'Molecular Biology',
    code: 'BIO 81',
    section: 'A',
    color_tag: '#10B981',
    is_hidden: false,
  },
  {
    id: 'course_cs140',
    account_id: 'acc_phone',
    name: 'Operating Systems',
    code: 'CS 140',
    section: '01',
    color_tag: '#06B6D4',
    is_hidden: false,
  },
];

export const DEFAULT_OFFLINE_TIMETABLE: TimetableSlot[] = [
  { id: 'slot_1', course_id: 'course_cs106b', day_of_week: 1, start_time: '10:00', end_time: '11:20', room: 'Hewlett 200' },
  { id: 'slot_2', course_id: 'course_math51', day_of_week: 1, start_time: '13:30', end_time: '14:50', room: 'Bishop 102' },
  { id: 'slot_3', course_id: 'course_cs106b', day_of_week: 3, start_time: '10:00', end_time: '11:20', room: 'Hewlett 200' },
  { id: 'slot_4', course_id: 'course_bio81', day_of_week: 2, start_time: '11:00', end_time: '12:15', room: 'Gilbert 115' },
  { id: 'slot_5', course_id: 'course_cs140', day_of_week: 4, start_time: '14:00', end_time: '15:20', room: 'Gates B01' },
];

export async function fetchAccounts(): Promise<Account[]> {
  try {
    const res = await fetch(`${API_BASE}/auth/accounts`);
    if (res.ok) {
      const data = await res.json();
      setStored('nexus_cached_accounts', data);
      return data;
    }
  } catch (err) {
    // Offline mode
  }
  return getStored<Account[]>('nexus_cached_accounts', [
    {
      id: 'acc_phone',
      email: 'phone.user@local',
      account_type: 'personal',
      display_name: 'Device Local Mode',
      avatar_url: '',
      is_connected: true,
      needs_reconnect: false,
      created_at: new Date().toISOString(),
    } as any,
  ]);
}

export async function fetchAuthStatus(): Promise<{
  is_configured: boolean;
  client_id_prefix?: string;
  demo_mode_available: boolean;
}> {
  try {
    const res = await fetch(`${API_BASE}/auth/status`);
    if (res.ok) return res.json();
  } catch (e) {
    // Standalone
  }
  return {
    is_configured: true,
    client_id_prefix: 'native-offline',
    demo_mode_available: true,
  };
}

export async function startGoogleOAuth(accountType: 'personal' | 'edu'): Promise<{ auth_url: string }> {
  const res = await fetch(`${API_BASE}/auth/google/start?account_type=${accountType}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to start Google OAuth');
  }
  return res.json();
}

export async function disconnectAccount(accountId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/accounts/disconnect/${accountId}`, { method: 'POST' });
  } catch (e) {
    // Offline
  }
}

export async function resetDemoData(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/demo/reset`, { method: 'POST' });
  } catch (e) {
    // Offline reset
  }
  setStored('nexus_cached_courses', DEFAULT_OFFLINE_COURSES);
  setStored('nexus_cached_timetable', DEFAULT_OFFLINE_TIMETABLE);
}

export async function fetchCourses(accountId?: string, includeHidden = false): Promise<Course[]> {
  try {
    const params = new URLSearchParams();
    if (accountId) params.append('account_id', accountId);
    if (includeHidden) params.append('include_hidden', 'true');
    const qs = params.toString();
    const url = qs ? `${API_BASE}/courses?${qs}` : `${API_BASE}/courses`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setStored('nexus_cached_courses', data);
      return data;
    }
  } catch (err) {
    // Offline
  }
  const cached = getStored<Course[]>('nexus_cached_courses', DEFAULT_OFFLINE_COURSES);
  return includeHidden ? cached : cached.filter((c) => !c.is_hidden);
}

export async function toggleCourseHidden(courseId: string, isHidden?: boolean): Promise<Course> {
  try {
    const res = await fetch(`${API_BASE}/courses/${courseId}/toggle-hide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isHidden !== undefined ? { hidden: isHidden } : {}),
    });
    if (res.ok) return res.json();
  } catch (err) {
    // Offline
  }
  const courses = getStored<Course[]>('nexus_cached_courses', DEFAULT_OFFLINE_COURSES);
  const updated = courses.map((c) =>
    c.id === courseId ? { ...c, is_hidden: isHidden !== undefined ? isHidden : !c.is_hidden } : c
  );
  setStored('nexus_cached_courses', updated);
  return updated.find((c) => c.id === courseId)!;
}

export async function createCustomCourse(data: {
  account_id: string;
  name: string;
  code?: string;
  section?: string;
  color_tag?: string;
  drive_folder_url?: string;
}): Promise<Course> {
  try {
    const res = await fetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return res.json();
  } catch (err) {
    // Offline
  }
  const newCourse: Course = {
    id: `course_local_${Date.now()}`,
    is_hidden: false,
    ...data,
  };
  const courses = getStored<Course[]>('nexus_cached_courses', DEFAULT_OFFLINE_COURSES);
  setStored('nexus_cached_courses', [...courses, newCourse]);
  return newCourse;
}

export async function updateCourse(
  courseId: string,
  data: Partial<Pick<Course, 'name' | 'code' | 'section' | 'color_tag' | 'drive_folder_id' | 'drive_folder_name' | 'is_hidden'>>
): Promise<Course> {
  try {
    const res = await fetch(`${API_BASE}/courses/${courseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return res.json();
  } catch (err) {
    // Offline
  }
  const courses = getStored<Course[]>('nexus_cached_courses', DEFAULT_OFFLINE_COURSES);
  const updated = courses.map((c) => (c.id === courseId ? { ...c, ...data } : c));
  setStored('nexus_cached_courses', updated);
  return updated.find((c) => c.id === courseId)!;
}

export async function linkCourseDrive(courseId: string, folderUrl: string): Promise<Course> {
  try {
    const res = await fetch(`${API_BASE}/courses/${courseId}/link-drive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_url: folderUrl }),
    });
    if (res.ok) return res.json();
  } catch (err) {
    // Offline
  }
  return updateCourse(courseId, { drive_folder_id: 'local_drive_folder' });
}

export async function unlinkCourseDrive(courseId: string): Promise<Course> {
  try {
    const res = await fetch(`${API_BASE}/courses/${courseId}/unlink-drive`, {
      method: 'POST',
    });
    if (res.ok) return res.json();
  } catch (err) {
    // Offline
  }
  return updateCourse(courseId, { drive_folder_id: undefined, drive_folder_name: undefined });
}

export async function fetchAssignments(params?: {
  course_id?: string;
  account_id?: string;
  status?: string;
  source?: string;
  search?: string;
  priority?: string;
}): Promise<Assignment[]> {
  try {
    const query = new URLSearchParams();
    if (params?.course_id) query.append('course_id', params.course_id);
    if (params?.account_id) query.append('account_id', params.account_id);
    if (params?.status) query.append('status', params.status);
    if (params?.source) query.append('source', params.source);
    if (params?.search) query.append('search', params.search);
    if (params?.priority) query.append('priority', params.priority);

    const res = await fetch(`${API_BASE}/assignments?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setStored('nexus_cached_tasks', data);
      return data;
    }
  } catch (err) {
    // Offline
  }
  return getStored<Assignment[]>('nexus_cached_tasks', []);
}

export async function createAssignment(data: {
  title: string;
  course_id: string;
  description?: string;
  due_datetime?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  web_link?: string;
}): Promise<Assignment> {
  try {
    const res = await fetch(`${API_BASE}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return res.json();
  } catch (err) {
    // Offline
  }
  const newAssignment: Assignment = {
    id: `asgn_local_${Date.now()}`,
    source: 'MANUAL',
    account_id: 'acc_phone',
    status: data.status || 'TODO',
    priority: data.priority || 'MEDIUM',
    local_override: true,
    updated_at: new Date().toISOString(),
    files: [],
    ...data,
  };
  const tasks = getStored<Assignment[]>('nexus_cached_tasks', []);
  setStored('nexus_cached_tasks', [newAssignment, ...tasks]);
  return newAssignment;
}

export async function updateAssignment(
  id: string,
  data: Partial<Pick<Assignment, 'status' | 'priority' | 'title' | 'description' | 'due_datetime' | 'web_link' | 'course_id'>>
): Promise<Assignment> {
  try {
    const res = await fetch(`${API_BASE}/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return res.json();
  } catch (err) {
    // Offline
  }
  const tasks = getStored<Assignment[]>('nexus_cached_tasks', []);
  const updated = tasks.map((t) => (t.id === id ? { ...t, ...data } : t));
  setStored('nexus_cached_tasks', updated);
  return updated.find((t) => t.id === id)!;
}

export async function deleteAssignment(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/assignments/${id}`, { method: 'DELETE' });
  } catch (err) {
    // Offline
  }
  const tasks = getStored<Assignment[]>('nexus_cached_tasks', []);
  setStored('nexus_cached_tasks', tasks.filter((t) => t.id !== id));
}

export async function fetchFiles(params?: {
  course_id?: string;
  assignment_id?: string;
  source?: string;
  search?: string;
  account_id?: string;
  include_ignored?: boolean;
}): Promise<CourseFile[]> {
  try {
    const query = new URLSearchParams();
    if (params?.course_id) query.append('course_id', params.course_id);
    if (params?.assignment_id) query.append('assignment_id', params.assignment_id);
    if (params?.source) query.append('source', params.source);
    if (params?.search) query.append('search', params.search);
    if (params?.account_id) query.append('account_id', params.account_id);
    if (params?.include_ignored) query.append('include_ignored', 'true');

    const res = await fetch(`${API_BASE}/files?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setStored('nexus_cached_files', data);
      return data;
    }
  } catch (err) {
    // Offline
  }
  return getStored<CourseFile[]>('nexus_cached_files', []);
}

export async function ignoreFile(fileId: string): Promise<CourseFile> {
  const res = await fetch(`${API_BASE}/files/${fileId}/ignore`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to ignore file');
  return res.json();
}

export async function unignoreFile(fileId: string): Promise<CourseFile> {
  const res = await fetch(`${API_BASE}/files/${fileId}/unignore`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to restore file');
  return res.json();
}

export async function bulkIgnoreFiles(fileIds: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/files/bulk-ignore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_ids: fileIds }),
  });
  if (!res.ok) throw new Error('Failed to bulk ignore files');
}

export async function fetchTimetable(dayOfWeek?: number): Promise<TimetableSlot[]> {
  try {
    const url = dayOfWeek !== undefined ? `${API_BASE}/timetable?day_of_week=${dayOfWeek}` : `${API_BASE}/timetable`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setStored('nexus_cached_timetable', data);
      return data;
    }
  } catch (err) {
    // Offline
  }
  const slots = getStored<TimetableSlot[]>('nexus_cached_timetable', DEFAULT_OFFLINE_TIMETABLE);
  return dayOfWeek !== undefined ? slots.filter((s) => s.day_of_week === dayOfWeek) : slots;
}

export async function createTimetableSlot(data: {
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
}): Promise<TimetableSlot> {
  try {
    const res = await fetch(`${API_BASE}/timetable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return res.json();
  } catch (err) {
    // Offline
  }
  const newSlot: TimetableSlot = {
    id: `slot_local_${Date.now()}`,
    ...data,
  };
  const slots = getStored<TimetableSlot[]>('nexus_cached_timetable', DEFAULT_OFFLINE_TIMETABLE);
  setStored('nexus_cached_timetable', [...slots, newSlot]);
  return newSlot;
}

export async function updateTimetableSlot(
  slotId: string,
  data: Partial<Pick<TimetableSlot, 'day_of_week' | 'start_time' | 'end_time' | 'room' | 'course_id'>>
): Promise<TimetableSlot> {
  try {
    const res = await fetch(`${API_BASE}/timetable/${slotId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return res.json();
  } catch (err) {
    // Offline
  }
  const slots = getStored<TimetableSlot[]>('nexus_cached_timetable', DEFAULT_OFFLINE_TIMETABLE);
  const updated = slots.map((s) => (s.id === slotId ? { ...s, ...data } : s));
  setStored('nexus_cached_timetable', updated);
  return updated.find((s) => s.id === slotId)!;
}

export async function deleteTimetableSlot(slotId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/timetable/${slotId}`, { method: 'DELETE' });
  } catch (err) {
    // Offline
  }
  const slots = getStored<TimetableSlot[]>('nexus_cached_timetable', DEFAULT_OFFLINE_TIMETABLE);
  setStored('nexus_cached_timetable', slots.filter((s) => s.id !== slotId));
}

export async function fetchTodaySchedule(clientDay?: number): Promise<TodaySchedule> {
  const day = clientDay !== undefined ? clientDay : new Date().getDay();
  try {
    const res = await fetch(`${API_BASE}/timetable/today?client_day=${day}`);
    if (res.ok) return res.json();
  } catch (err) {
    // Offline fallback
  }
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const allSlots = getStored<TimetableSlot[]>('nexus_cached_timetable', DEFAULT_OFFLINE_TIMETABLE);
  const allCourses = getStored<Course[]>('nexus_cached_courses', DEFAULT_OFFLINE_COURSES);
  const coursesMap = new Map(allCourses.map((c) => [c.id, c]));

  const todaySlots = allSlots
    .filter((s) => s.day_of_week === day)
    .map((s) => ({ ...s, course: coursesMap.get(s.course_id) }));

  const tasks = getStored<Assignment[]>('nexus_cached_tasks', []);

  return {
    day_name: dayNames[day],
    day_of_week: day,
    date_str: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    slots: todaySlots,
    related_assignments: tasks.filter((t) => t.status !== 'DONE').slice(0, 5),
  };
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  try {
    const res = await fetch(`${API_BASE}/sync/status`);
    if (res.ok) return res.json();
  } catch (err) {
    // Offline
  }
  return {
    is_syncing: false,
    last_synced_at: new Date().toISOString(),
    last_error: undefined,
    interval_seconds: 60,
  };
}

export async function triggerInstantSync(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/sync/trigger`, { method: 'POST' });
    if (res.ok) return res.json();
  } catch (err) {
    // Offline
  }
  return { status: 'OFFLINE_SYNC_COMPLETE' };
}

export async function fetchSyncLogs(): Promise<SyncLog[]> {
  try {
    const res = await fetch(`${API_BASE}/sync/logs`);
    if (res.ok) return res.json();
  } catch (e) {
    // Offline
  }
  return [];
}

export async function analyzeNotebookLMExport(courseId?: string): Promise<ClassAnalysisResponse[]> {
  const url = courseId
    ? `${API_BASE}/export/notebooklm/analyze?course_id=${encodeURIComponent(courseId)}`
    : `${API_BASE}/export/notebooklm/analyze`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to analyze files for NotebookLM export');
  return res.json();
}

export async function exportClassToNotebookLM(data: NotebookLMExportRequest): Promise<ExportResultResponse> {
  const res = await fetch(`${API_BASE}/export/notebooklm/export-class`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to export class to NotebookLM');
  }
  return res.json();
}
