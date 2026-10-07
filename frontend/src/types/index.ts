export type AccountType = 'personal' | 'edu';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskSource = 'CLASSROOM' | 'MANUAL';

export interface Account {
  id: string;
  email: string;
  account_type: AccountType;
  display_name?: string;
  avatar_url?: string;
  token_expiry?: string;
  last_synced_at?: string;
  created_at: string;
  is_connected: boolean;
  needs_reconnect?: boolean;
}

export interface Course {
  id: string;
  account_id: string;
  name: string;
  code?: string;
  section?: string;
  alternate_link?: string;
  color_tag?: string;
  drive_folder_id?: string;
  drive_folder_name?: string;
  is_hidden?: boolean;
  assignment_count?: number;
  file_count?: number;
}

export interface CourseFile {
  id: string;
  account_id: string;
  course_id: string;
  assignment_id?: string;
  title: string;
  mime_type?: string;
  drive_file_id: string;
  drive_preview_link?: string;
  drive_web_view_link?: string;
  size_bytes?: number;
  source?: 'CLASSROOM' | 'DRIVE_FOLDER';
  is_ignored?: boolean;
  synced_at: string;
  course_name?: string;
  course_color?: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  account_id: string;
  title: string;
  description?: string;
  due_datetime?: string;
  source: TaskSource;
  status: TaskStatus;
  priority: TaskPriority;
  google_submission_state?: string;
  web_link?: string;
  local_override: boolean;
  updated_at: string;
  course_name?: string;
  course_color?: string;
  account_email?: string;
  account_type?: AccountType;
  files: CourseFile[];
}

export interface TimetableSlot {
  id: string;
  course_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
  room?: string;
  course_name?: string;
  course_code?: string;
  course_color?: string;
  account_id?: string;
  account_type?: AccountType;
}

export interface TodaySchedule {
  day_of_week: number;
  day_name: string;
  date_str: string;
  slots: TimetableSlot[];
  related_assignments: Assignment[];
}

export interface SyncStatus {
  is_syncing: boolean;
  last_synced_at?: string;
  last_error?: string;
  interval_seconds: number;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  account_id?: string;
  account_email?: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  items_count: number;
}

export interface FileAnalysisItem {
  id: string;
  title: string;
  mime_type?: string;
  size_bytes?: number;
  is_compatible: boolean;
  action: 'DIRECT' | 'CONVERT_PPT' | 'CONVERT_DOC' | 'CONVERT_IMAGE' | 'CONVERT_SHEET' | 'CONVERT_CODE' | 'CONVERT_TEXT';
  suggested_title: string;
  original_extension: string;
  target_extension: string;
  reason: string;
}

export interface ClassAnalysisResponse {
  course_id: string;
  course_name: string;
  course_code?: string;
  color_tag?: string;
  account_id: string;
  account_email?: string;
  total_files: number;
  compatible_count: number;
  unsupported_count: number;
  files: FileAnalysisItem[];
}

export interface NotebookLMExportRequest {
  course_id: string;
  target_account_id?: string;
  convert_unsupported?: boolean;
  create_drive_folder?: boolean;
  include_overview?: boolean;
}

export interface ExportResultResponse {
  status: string;
  course_id: string;
  course_name: string;
  target_account_email: string;
  drive_folder_url?: string;
  drive_folder_id?: string;
  download_url: string;
  notebooklm_url: string;
  total_files: number;
  converted_files: number;
  log: string[];
}
