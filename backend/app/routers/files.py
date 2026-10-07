from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.database import get_session
from app.models import File, FileRead, Course, Account
from app.google_service import download_file_stream

router = APIRouter(prefix="/api/files", tags=["files"])

from pydantic import BaseModel

class BulkIgnoreRequest(BaseModel):
    file_ids: List[str]

@router.get("", response_model=List[FileRead])
def get_files(
    course_id: Optional[str] = None,
    assignment_id: Optional[str] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    account_id: Optional[str] = None,
    include_ignored: bool = Query(False),
    include_hidden: bool = Query(False),
    session: Session = Depends(get_session),
):
    """List normalized course files and attachments, filtering out ignored files by default."""
    query = select(File)
    if not include_ignored:
        query = query.where(File.is_ignored == False)
    if course_id:
        query = query.where(File.course_id == course_id)
    if assignment_id:
        query = query.where(File.assignment_id == assignment_id)
    if source:
        query = query.where(File.source == source)
    if account_id:
        query = query.where(File.account_id == account_id)

    files = session.exec(query).all()

    result = []
    for f in files:
        if search and search.lower() not in f.title.lower():
            continue
        course = session.exec(select(Course).where(Course.id == f.course_id)).first()
        if not include_hidden and course and course.is_hidden:
            continue
        result.append(
            FileRead(
                id=f.id,
                account_id=f.account_id,
                course_id=f.course_id,
                assignment_id=f.assignment_id,
                title=f.title,
                mime_type=f.mime_type,
                drive_file_id=f.drive_file_id,
                drive_preview_link=f.drive_preview_link,
                drive_web_view_link=f.drive_web_view_link,
                size_bytes=f.size_bytes,
                source=f.source,
                is_ignored=f.is_ignored,
                synced_at=f.synced_at,
                course_name=course.name if course else None,
                course_color=course.color_tag if course else None,
            )
        )

    # Sort files by title
    result.sort(key=lambda x: x.title.lower())
    return result

@router.get("/{file_id}", response_model=FileRead)
def get_file(file_id: str, session: Session = Depends(get_session)):
    f = session.exec(select(File).where(File.id == file_id)).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    course = session.exec(select(Course).where(Course.id == f.course_id)).first()
    return FileRead(
        id=f.id,
        account_id=f.account_id,
        course_id=f.course_id,
        assignment_id=f.assignment_id,
        title=f.title,
        mime_type=f.mime_type,
        drive_file_id=f.drive_file_id,
        drive_preview_link=f.drive_preview_link,
        drive_web_view_link=f.drive_web_view_link,
        size_bytes=f.size_bytes,
        source=f.source,
        is_ignored=f.is_ignored,
        synced_at=f.synced_at,
        course_name=course.name if course else None,
        course_color=course.color_tag if course else None,
    )

@router.post("/{file_id}/ignore", response_model=FileRead)
def ignore_file(file_id: str, session: Session = Depends(get_session)):
    """Mark a file as ignored so it will not appear in course resource feeds or task attachments."""
    f = session.exec(select(File).where(File.id == file_id)).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    f.is_ignored = True
    session.add(f)
    session.commit()
    session.refresh(f)
    course = session.exec(select(Course).where(Course.id == f.course_id)).first()
    return FileRead(
        id=f.id,
        account_id=f.account_id,
        course_id=f.course_id,
        assignment_id=f.assignment_id,
        title=f.title,
        mime_type=f.mime_type,
        drive_file_id=f.drive_file_id,
        drive_preview_link=f.drive_preview_link,
        drive_web_view_link=f.drive_web_view_link,
        size_bytes=f.size_bytes,
        source=f.source,
        is_ignored=f.is_ignored,
        synced_at=f.synced_at,
        course_name=course.name if course else None,
        course_color=course.color_tag if course else None,
    )

@router.post("/{file_id}/unignore", response_model=FileRead)
def unignore_file(file_id: str, session: Session = Depends(get_session)):
    """Restore an ignored file to active course resources."""
    f = session.exec(select(File).where(File.id == file_id)).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    f.is_ignored = False
    session.add(f)
    session.commit()
    session.refresh(f)
    course = session.exec(select(Course).where(Course.id == f.course_id)).first()
    return FileRead(
        id=f.id,
        account_id=f.account_id,
        course_id=f.course_id,
        assignment_id=f.assignment_id,
        title=f.title,
        mime_type=f.mime_type,
        drive_file_id=f.drive_file_id,
        drive_preview_link=f.drive_preview_link,
        drive_web_view_link=f.drive_web_view_link,
        size_bytes=f.size_bytes,
        source=f.source,
        is_ignored=f.is_ignored,
        synced_at=f.synced_at,
        course_name=course.name if course else None,
        course_color=course.color_tag if course else None,
    )

@router.post("/bulk-ignore")
def bulk_ignore_files(body: BulkIgnoreRequest, session: Session = Depends(get_session)):
    """Ignore multiple files at once."""
    updated = 0
    for fid in body.file_ids:
        f = session.exec(select(File).where(File.id == fid)).first()
        if f:
            f.is_ignored = True
            session.add(f)
            updated += 1
    session.commit()
    return {"status": "SUCCESS", "ignored_count": updated}

@router.get("/{file_id}/download")
def download_file(file_id: str, session: Session = Depends(get_session)):
    """Stream or proxy download raw file from Google Drive using account credentials."""
    f = session.exec(select(File).where(File.id == file_id)).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        stream, mime = download_file_stream(f, session)
        return StreamingResponse(
            stream,
            media_type=mime,
            headers={
                "Content-Disposition": f'attachment; filename="{f.title}"',
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")
