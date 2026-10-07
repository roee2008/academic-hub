from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from pydantic import field_serializer

def serialize_dt(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")

class AccountBase(SQLModel):
    email: str = Field(index=True, unique=True)
    account_type: str = Field(default="personal")  # 'personal' or 'edu'
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

class Account(AccountBase, table=True):
    __tablename__ = "accounts"
    
    id: str = Field(primary_key=True)
    refresh_token: Optional[str] = None  # Fernet encrypted
    access_token: Optional[str] = None   # Fernet encrypted
    token_expiry: Optional[datetime] = None
    drive_start_page_token: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    needs_reconnect: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    courses: List["Course"] = Relationship(back_populates="account", cascade_delete=True)
    assignments: List["Assignment"] = Relationship(back_populates="account", cascade_delete=True)
    files: List["File"] = Relationship(back_populates="account", cascade_delete=True)

class AccountRead(AccountBase):
    id: str
    token_expiry: Optional[datetime] = None
    last_synced_at: Optional[datetime] = None
    needs_reconnect: bool = False
    created_at: datetime
    is_connected: bool = True

    @field_serializer("token_expiry", "last_synced_at", "created_at", when_used="always", check_fields=False)
    def serialize_account_dates(self, dt: Optional[datetime]):
        return serialize_dt(dt)

class CourseBase(SQLModel):
    name: str
    code: Optional[str] = None
    section: Optional[str] = None
    alternate_link: Optional[str] = None
    color_tag: Optional[str] = None  # hex color matching DESIGN.md accents
    drive_folder_id: Optional[str] = None
    drive_folder_name: Optional[str] = None
    is_hidden: bool = Field(default=False)

class Course(CourseBase, table=True):
    __tablename__ = "courses"
    
    id: str = Field(primary_key=True)
    account_id: str = Field(foreign_key="accounts.id", index=True)

    account: Optional[Account] = Relationship(back_populates="courses")
    assignments: List["Assignment"] = Relationship(back_populates="course", cascade_delete=True)
    files: List["File"] = Relationship(back_populates="course", cascade_delete=True)
    timetable_slots: List["TimetableSlot"] = Relationship(back_populates="course", cascade_delete=True)

class CourseRead(CourseBase):
    id: str
    account_id: str
    assignment_count: Optional[int] = 0
    file_count: Optional[int] = 0

class AssignmentBase(SQLModel):
    title: str
    description: Optional[str] = None
    due_datetime: Optional[datetime] = None
    source: str = Field(default="MANUAL")  # 'CLASSROOM' or 'MANUAL'
    status: str = Field(default="TODO")    # 'TODO', 'IN_PROGRESS', 'DONE'
    priority: str = Field(default="MEDIUM")  # 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    google_submission_state: Optional[str] = None  # 'NEW', 'CREATED', 'TURNED_IN', 'RETURNED'
    web_link: Optional[str] = None
    local_override: bool = Field(default=False)

class Assignment(AssignmentBase, table=True):
    __tablename__ = "assignments"
    
    id: str = Field(primary_key=True)
    course_id: str = Field(foreign_key="courses.id", index=True)
    account_id: str = Field(foreign_key="accounts.id", index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    course: Optional[Course] = Relationship(back_populates="assignments")
    account: Optional[Account] = Relationship(back_populates="assignments")
    files: List["File"] = Relationship(back_populates="assignment")

class AssignmentCreate(SQLModel):
    title: str
    course_id: str
    description: Optional[str] = None
    due_datetime: Optional[datetime] = None
    priority: Optional[str] = "MEDIUM"
    status: Optional[str] = "TODO"
    web_link: Optional[str] = None

class AssignmentUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_datetime: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    web_link: Optional[str] = None
    course_id: Optional[str] = None

class AssignmentRead(AssignmentBase):
    id: str
    course_id: str
    account_id: str
    updated_at: datetime
    course_name: Optional[str] = None
    course_color: Optional[str] = None
    account_email: Optional[str] = None
    account_type: Optional[str] = None
    files: List["FileRead"] = []

    @field_serializer("due_datetime", "updated_at", when_used="always", check_fields=False)
    def serialize_assignment_dates(self, dt: Optional[datetime]):
        return serialize_dt(dt)

class FileBase(SQLModel):
    title: str
    mime_type: Optional[str] = None
    drive_file_id: str
    drive_preview_link: Optional[str] = None
    drive_web_view_link: Optional[str] = None
    size_bytes: Optional[int] = None
    source: Optional[str] = "CLASSROOM"  # 'CLASSROOM' or 'DRIVE_FOLDER'
    is_ignored: bool = Field(default=False)

class File(FileBase, table=True):
    __tablename__ = "files"
    
    id: str = Field(primary_key=True)
    account_id: str = Field(foreign_key="accounts.id", index=True)
    course_id: str = Field(foreign_key="courses.id", index=True)
    assignment_id: Optional[str] = Field(default=None, foreign_key="assignments.id", index=True)
    synced_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    account: Optional[Account] = Relationship(back_populates="files")
    course: Optional[Course] = Relationship(back_populates="files")
    assignment: Optional[Assignment] = Relationship(back_populates="files")

class FileRead(FileBase):
    id: str
    account_id: str
    course_id: str
    assignment_id: Optional[str] = None
    synced_at: datetime
    course_name: Optional[str] = None
    course_color: Optional[str] = None
    is_ignored: bool = False

    @field_serializer("synced_at", when_used="always", check_fields=False)
    def serialize_file_dates(self, dt: Optional[datetime]):
        return serialize_dt(dt)

class TimetableSlotBase(SQLModel):
    course_id: str = Field(foreign_key="courses.id", index=True)
    day_of_week: int = Field(ge=0, le=6)  # 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time: str  # "HH:MM" 24h format
    end_time: str    # "HH:MM" 24h format
    room: Optional[str] = None

class TimetableSlot(TimetableSlotBase, table=True):
    __tablename__ = "timetable_slots"
    
    id: str = Field(primary_key=True)

    course: Optional[Course] = Relationship(back_populates="timetable_slots")

class TimetableSlotCreate(TimetableSlotBase):
    pass

class TimetableSlotRead(TimetableSlotBase):
    id: str
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    course_color: Optional[str] = None
    account_id: Optional[str] = None
    account_type: Optional[str] = None

class SyncLog(SQLModel, table=True):
    __tablename__ = "sync_logs"
    
    id: str = Field(primary_key=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    account_id: Optional[str] = None
    account_email: Optional[str] = None
    status: str = "SUCCESS"  # 'SUCCESS', 'WARNING', 'ERROR'
    message: str
    items_count: int = 0

    @field_serializer("timestamp", when_used="always", check_fields=False)
    def serialize_sync_log_dates(self, dt: Optional[datetime]):
        return serialize_dt(dt)
