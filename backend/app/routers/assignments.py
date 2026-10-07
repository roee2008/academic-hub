import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from app.database import get_session
from app.models import (
    Assignment,
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentRead,
    Course,
    Account,
    File,
    FileRead,
)

router = APIRouter(prefix="/api/assignments", tags=["assignments"])

@router.get("", response_model=List[AssignmentRead])
def get_assignments(
    course_id: Optional[str] = None,
    account_id: Optional[str] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    priority: Optional[str] = None,
    include_hidden: bool = Query(False),
    session: Session = Depends(get_session),
):
    """List assignments with multi-dimensional filtering, sorted by nearest deadline."""
    query = select(Assignment)

    if course_id:
        query = query.where(Assignment.course_id == course_id)
    if account_id:
        query = query.where(Assignment.account_id == account_id)
    if status:
        query = query.where(Assignment.status == status)
    if source:
        query = query.where(Assignment.source == source)
    if priority:
        query = query.where(Assignment.priority == priority)

    assignments = session.exec(query).all()

    # Load course and account details
    results = []
    for asgn in assignments:
        if search:
            s_lower = search.lower()
            if s_lower not in asgn.title.lower() and (not asgn.description or s_lower not in asgn.description.lower()):
                continue

        course = session.exec(select(Course).where(Course.id == asgn.course_id)).first()
        if not include_hidden and course and course.is_hidden:
            continue
        account = session.exec(select(Account).where(Account.id == asgn.account_id)).first()
        files = session.exec(
            select(File).where(File.assignment_id == asgn.id, File.is_ignored == False)
        ).all()

        file_reads = [
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
            for f in files
        ]

        read_obj = AssignmentRead(
            id=asgn.id,
            course_id=asgn.course_id,
            account_id=asgn.account_id,
            title=asgn.title,
            description=asgn.description,
            due_datetime=asgn.due_datetime,
            source=asgn.source,
            status=asgn.status,
            priority=asgn.priority,
            google_submission_state=asgn.google_submission_state,
            web_link=asgn.web_link,
            local_override=asgn.local_override,
            updated_at=asgn.updated_at,
            course_name=course.name if course else "Unknown Course",
            course_color=course.color_tag if course else "#6366F1",
            account_email=account.email if account else None,
            account_type=account.account_type if account else None,
            files=file_reads,
        )
        results.append(read_obj)

    # Sort: active items with deadlines first, then items without deadline, then DONE items
    def sort_key(item: AssignmentRead):
        is_done = 1 if item.status == "DONE" else 0
        has_due = 0 if item.due_datetime else 1
        dt_val = item.due_datetime.timestamp() if item.due_datetime else float("inf")
        return (is_done, has_due, dt_val)

    results.sort(key=sort_key)
    return results

@router.post("", response_model=AssignmentRead)
def create_manual_assignment(data: AssignmentCreate, session: Session = Depends(get_session)):
    """Create a new manual task/homework item."""
    course = session.exec(select(Course).where(Course.id == data.course_id)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    new_id = f"asgn_manual_{uuid.uuid4().hex[:10]}"
    assignment = Assignment(
        id=new_id,
        course_id=data.course_id,
        account_id=course.account_id,
        title=data.title,
        description=data.description,
        due_datetime=data.due_datetime,
        source="MANUAL",
        status=data.status or "TODO",
        priority=data.priority or "MEDIUM",
        web_link=data.web_link,
        local_override=True,
        updated_at=datetime.now(timezone.utc),
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    account = session.exec(select(Account).where(Account.id == assignment.account_id)).first()

    return AssignmentRead(
        id=assignment.id,
        course_id=assignment.course_id,
        account_id=assignment.account_id,
        title=assignment.title,
        description=assignment.description,
        due_datetime=assignment.due_datetime,
        source=assignment.source,
        status=assignment.status,
        priority=assignment.priority,
        google_submission_state=assignment.google_submission_state,
        web_link=assignment.web_link,
        local_override=assignment.local_override,
        updated_at=assignment.updated_at,
        course_name=course.name,
        course_color=course.color_tag,
        account_email=account.email if account else None,
        account_type=account.account_type if account else None,
        files=[],
    )

@router.patch("/{assignment_id}", response_model=AssignmentRead)
def update_assignment(
    assignment_id: str,
    data: AssignmentUpdate,
    session: Session = Depends(get_session),
):
    """Update assignment status, priority, or details with local override enabled."""
    asgn = session.exec(select(Assignment).where(Assignment.id == assignment_id)).first()
    if not asgn:
        raise HTTPException(status_code=404, detail="Assignment not found")

    update_dict = data.model_dump(exclude_unset=True)
    if "status" in update_dict or "priority" in update_dict:
        asgn.local_override = True

    for key, value in update_dict.items():
        setattr(asgn, key, value)

    asgn.updated_at = datetime.now(timezone.utc)
    session.add(asgn)
    session.commit()
    session.refresh(asgn)

    course = session.exec(select(Course).where(Course.id == asgn.course_id)).first()
    account = session.exec(select(Account).where(Account.id == asgn.account_id)).first()
    files = session.exec(
        select(File).where(File.assignment_id == asgn.id, File.is_ignored == False)
    ).all()

    return AssignmentRead(
        id=asgn.id,
        course_id=asgn.course_id,
        account_id=asgn.account_id,
        title=asgn.title,
        description=asgn.description,
        due_datetime=asgn.due_datetime,
        source=asgn.source,
        status=asgn.status,
        priority=asgn.priority,
        google_submission_state=asgn.google_submission_state,
        web_link=asgn.web_link,
        local_override=asgn.local_override,
        updated_at=asgn.updated_at,
        course_name=course.name if course else None,
        course_color=course.color_tag if course else None,
        account_email=account.email if account else None,
        account_type=account.account_type if account else None,
        files=[
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
            for f in files
        ],
    )

@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: str, session: Session = Depends(get_session)):
    """Delete an assignment."""
    asgn = session.exec(select(Assignment).where(Assignment.id == assignment_id)).first()
    if not asgn:
        raise HTTPException(status_code=404, detail="Assignment not found")

    session.delete(asgn)
    session.commit()
    return {"status": "SUCCESS", "message": "Assignment removed."}
