import uuid
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from app.database import get_session
from app.models import Course, CourseRead, CourseBase, Assignment, File, Account

router = APIRouter(prefix="/api/courses", tags=["courses"])

def extract_drive_folder_id(url_or_id: str) -> Optional[str]:
    """Extract folder ID from Google Drive URL or raw identifier."""
    cleaned = url_or_id.strip()
    if not cleaned:
        return None
    # Matches /folders/1A2B3C...
    m = re.search(r"folders/([a-zA-Z0-9_-]+)", cleaned)
    if m:
        return m.group(1)
    # Matches ?id=1A2B3C... or &id=1A2B3C...
    m = re.search(r"[?&]id=([a-zA-Z0-9_-]+)", cleaned)
    if m:
        return m.group(1)
    # If raw identifier
    if "/" not in cleaned and len(cleaned) >= 10:
        return cleaned
    return None

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    section: Optional[str] = None
    color_tag: Optional[str] = None
    drive_folder_id: Optional[str] = None
    drive_folder_name: Optional[str] = None
    is_hidden: Optional[bool] = None

class CourseCreate(BaseModel):
    account_id: str
    name: str
    code: Optional[str] = None
    section: Optional[str] = None
    alternate_link: Optional[str] = None
    color_tag: Optional[str] = "#6366F1"
    drive_folder_url: Optional[str] = None
    drive_folder_id: Optional[str] = None
    drive_folder_name: Optional[str] = None

def to_course_read(c: Course, session: Session) -> CourseRead:
    asgn_count = len(session.exec(select(Assignment).where(Assignment.course_id == c.id)).all())
    file_count = len(session.exec(select(File).where(File.course_id == c.id, File.is_ignored == False)).all())
    return CourseRead(
        id=c.id,
        account_id=c.account_id,
        name=c.name,
        code=c.code,
        section=c.section,
        alternate_link=c.alternate_link,
        color_tag=c.color_tag,
        drive_folder_id=c.drive_folder_id,
        drive_folder_name=c.drive_folder_name,
        is_hidden=c.is_hidden,
        assignment_count=asgn_count,
        file_count=file_count,
    )

@router.get("", response_model=List[CourseRead])
def get_courses(
    account_id: Optional[str] = None,
    include_hidden: bool = Query(False),
    session: Session = Depends(get_session)
):
    """List all imported courses with resource tallies. Filters out hidden courses by default."""
    query = select(Course)
    if not include_hidden:
        query = query.where(Course.is_hidden == False)
    if account_id:
        query = query.where(Course.account_id == account_id)
    courses = session.exec(query).all()
    return [to_course_read(c, session) for c in courses]

@router.get("/{course_id}", response_model=CourseRead)
def get_course(course_id: str, session: Session = Depends(get_session)):
    course = session.exec(select(Course).where(Course.id == course_id)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return to_course_read(course, session)

@router.post("", response_model=CourseRead)
def create_course(data: CourseCreate, session: Session = Depends(get_session)):
    acc = session.exec(select(Account).where(Account.id == data.account_id)).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    folder_id = data.drive_folder_id
    folder_name = data.drive_folder_name
    if data.drive_folder_url:
        extracted = extract_drive_folder_id(data.drive_folder_url)
        if extracted:
            folder_id = extracted

    if folder_id and not folder_name:
        folder_name = "Drive Course Folder"
        from app.google_service import get_drive_folder_metadata
        try:
            meta = get_drive_folder_metadata(folder_id, acc, session)
            if meta and meta.get("name"):
                folder_name = meta.get("name")
        except Exception:
            pass

    new_course = Course(
        id=f"course_{uuid.uuid4().hex[:8]}",
        account_id=data.account_id,
        name=data.name,
        code=data.code,
        section=data.section,
        alternate_link=data.alternate_link or (f"https://drive.google.com/drive/folders/{folder_id}" if folder_id else None),
        color_tag=data.color_tag or "#6366F1",
        drive_folder_id=folder_id,
        drive_folder_name=folder_name,
        is_hidden=False,
    )
    session.add(new_course)
    session.commit()
    session.refresh(new_course)

    if folder_id:
        from app.google_service import sync_course_drive_folder
        try:
            sync_course_drive_folder(new_course, session)
        except Exception:
            pass

    return to_course_read(new_course, session)

@router.patch("/{course_id}", response_model=CourseRead)
def update_course(
    course_id: str,
    data: CourseUpdate,
    session: Session = Depends(get_session),
):
    """Update course attributes like color, hidden state, or link an assigned Google Drive folder."""
    course = session.exec(select(Course).where(Course.id == course_id)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(course, k, v)

    session.add(course)
    session.commit()
    session.refresh(course)
    return to_course_read(course, session)

class ToggleHideRequest(BaseModel):
    hidden: Optional[bool] = None

@router.post("/{course_id}/toggle-hide", response_model=CourseRead)
def toggle_course_hide(
    course_id: str,
    data: Optional[ToggleHideRequest] = None,
    session: Session = Depends(get_session),
):
    """Permanently hide/unenroll or restore a course."""
    course = session.exec(select(Course).where(Course.id == course_id)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if data and data.hidden is not None:
        course.is_hidden = data.hidden
    else:
        course.is_hidden = not course.is_hidden

    session.add(course)
    session.commit()
    session.refresh(course)
    return to_course_read(course, session)

class LinkDriveFolderRequest(BaseModel):
    folder_url: str

@router.post("/{course_id}/link-drive", response_model=CourseRead)
def link_drive_folder(
    course_id: str,
    data: LinkDriveFolderRequest,
    session: Session = Depends(get_session),
):
    """Explicitly link a Google Drive folder to this course and sync its files."""
    course = session.exec(select(Course).where(Course.id == course_id)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    folder_id = extract_drive_folder_id(data.folder_url)
    if not folder_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid Google Drive folder link or ID. Please paste a valid folder link or ID."
        )

    account = session.exec(select(Account).where(Account.id == course.account_id)).first()
    folder_name = "Drive Course Folder"
    if account:
        from app.google_service import get_drive_folder_metadata
        meta = get_drive_folder_metadata(folder_id, account, session)
        if meta and meta.get("name"):
            folder_name = meta.get("name")

    course.drive_folder_id = folder_id
    course.drive_folder_name = folder_name
    session.add(course)
    session.commit()
    session.refresh(course)

    # Immediately sync folder contents
    from app.google_service import sync_course_drive_folder
    try:
        sync_course_drive_folder(course, session)
    except Exception:
        pass

    return to_course_read(course, session)

@router.post("/{course_id}/unlink-drive", response_model=CourseRead)
def unlink_drive_folder(
    course_id: str,
    session: Session = Depends(get_session),
):
    """Unlink Google Drive folder and purge synced Drive folder files for this course."""
    course = session.exec(select(Course).where(Course.id == course_id)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course.drive_folder_id = None
    course.drive_folder_name = None
    session.add(course)

    # Remove all drive folder files previously pulled for this course
    drive_files = session.exec(
        select(File).where(File.course_id == course.id, File.source == "DRIVE_FOLDER")
    ).all()
    for df in drive_files:
        session.delete(df)

    session.commit()
    session.refresh(course)
    return to_course_read(course, session)
