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

export async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch(`${API_BASE}/auth/accounts`);
  if (!res.ok) throw new Error('Failed to fetch accounts');
  return res.json();
}

export async function fetchAuthStatus(): Promise<{
  is_configured: boolean;
  client_id_prefix?: string;
  demo_mode_available: boolean;
}> {
  const res = await fetch(`${API_BASE}/auth/status`);
  if (!res.ok) throw new Error('Failed to fetch auth status');
  return res.json();
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
  const res = await fetch(`${API_BASE}/auth/accounts/disconnect/${accountId}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to disconnect account');
}

export async function resetDemoData(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/demo/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo data');
}

export async function fetchCourses(accountId?: string, includeHidden = false): Promise<Course[]> {
  const params = new URLSearchParams();
  if (accountId) params.append('account_id', accountId);
  if (includeHidden) params.append('include_hidden', 'true');
  const qs = params.toString();
  const url = qs ? `${API_BASE}/courses?${qs}` : `${API_BASE}/courses`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch courses');
  return res.json();
}

export async function toggleCourseHidden(courseId: string, isHidden?: boolean): Promise<Course> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/toggle-hide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(isHidden !== undefined ? { hidden: isHidden } : {}),
  });
  if (!res.ok) throw new Error('Failed to toggle course visibility');
  return res.json();
}

export async function createCustomCourse(data: {
  account_id: string;
  name: string;
  code?: string;
  section?: string;
  color_tag?: string;
  drive_folder_url?: string;
}): Promise<Course> {
  const res = await fetch(`${API_BASE}/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create course');
  }
  return res.json();
}

export async function updateCourse(
  courseId: string,
  data: Partial<Pick<Course, 'name' | 'code' | 'section' | 'color_tag' | 'drive_folder_id' | 'drive_folder_name' | 'is_hidden'>>
): Promise<Course> {
  const res = await fetch(`${API_BASE}/courses/${courseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update course');
  return res.json();
}

export async function linkCourseDrive(courseId: string, folderUrl: string): Promise<Course> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/link-drive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder_url: folderUrl }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to link Google Drive folder');
  }
  return res.json();
}

export async function unlinkCourseDrive(courseId: string): Promise<Course> {
  const res = await fetch(`${API_BASE}/courses/${courseId}/unlink-drive`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to unlink Google Drive folder');
  return res.json();
}

export async function fetchAssignments(params?: {
  course_id?: string;
  account_id?: string;
  status?: string;
  source?: string;
  search?: string;
  priority?: string;
}): Promise<Assignment[]> {
  const query = new URLSearchParams();
  if (params?.course_id) query.append('course_id', params.course_id);
  if (params?.account_id) query.append('account_id', params.account_id);
  if (params?.status) query.append('status', params.status);
  if (params?.source) query.append('source', params.source);
  if (params?.search) query.append('search', params.search);
  if (params?.priority) query.append('priority', params.priority);

  const res = await fetch(`${API_BASE}/assignments?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch assignments');
  return res.json();
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
  const res = await fetch(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create assignment');
  return res.json();
}

export async function updateAssignment(
  id: string,
  data: Partial<Pick<Assignment, 'status' | 'priority' | 'title' | 'description' | 'due_datetime' | 'web_link' | 'course_id'>>
): Promise<Assignment> {
  const res = await fetch(`${API_BASE}/assignments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update assignment');
  return res.json();
}

export async function deleteAssignment(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/assignments/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete assignment');
}

export async function fetchFiles(params?: {
  course_id?: string;
  assignment_id?: string;
  source?: string;
  search?: string;
  account_id?: string;
  include_ignored?: boolean;
}): Promise<CourseFile[]> {
  const query = new URLSearchParams();
  if (params?.course_id) query.append('course_id', params.course_id);
  if (params?.assignment_id) query.append('assignment_id', params.assignment_id);
  if (params?.source) query.append('source', params.source);
  if (params?.search) query.append('search', params.search);
  if (params?.account_id) query.append('account_id', params.account_id);
  if (params?.include_ignored) query.append('include_ignored', 'true');

  const res = await fetch(`${API_BASE}/files?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch files');
  return res.json();
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
  const url = dayOfWeek !== undefined ? `${API_BASE}/timetable?day_of_week=${dayOfWeek}` : `${API_BASE}/timetable`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch timetable');
  return res.json();
}

export async function createTimetableSlot(data: {
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
}): Promise<TimetableSlot> {
  const res = await fetch(`${API_BASE}/timetable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create timetable slot');
  return res.json();
}

export async function updateTimetableSlot(
  slotId: string,
  data: Partial<Pick<TimetableSlot, 'day_of_week' | 'start_time' | 'end_time' | 'room' | 'course_id'>>
): Promise<TimetableSlot> {
  const res = await fetch(`${API_BASE}/timetable/${slotId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update timetable slot');
  return res.json();
}

export async function deleteTimetableSlot(slotId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/timetable/${slotId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete timetable slot');
}

export async function fetchTodaySchedule(clientDay?: number): Promise<TodaySchedule> {
  const day = clientDay !== undefined ? clientDay : new Date().getDay();
  const res = await fetch(`${API_BASE}/timetable/today?client_day=${day}`);
  if (!res.ok) throw new Error('Failed to fetch today schedule');
  return res.json();
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  const res = await fetch(`${API_BASE}/sync/status`);
  if (!res.ok) throw new Error('Failed to fetch sync status');
  return res.json();
}

export async function triggerInstantSync(): Promise<any> {
  const res = await fetch(`${API_BASE}/sync/trigger`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger sync');
  return res.json();
}

export async function fetchSyncLogs(): Promise<SyncLog[]> {
  const res = await fetch(`${API_BASE}/sync/logs`);
  if (!res.ok) throw new Error('Failed to fetch sync logs');
  return res.json();
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
