import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from app.database import get_session
from app.models import (
    TimetableSlot,
    TimetableSlotRead,
    TimetableSlotCreate,
    Course,
    Account,
    Assignment,
    AssignmentRead,
    File,
    FileRead,
)

router = APIRouter(prefix="/api/timetable", tags=["timetable"])

class TimetableSlotUpdate(BaseModel):
    course_id: Optional[str] = None
    day_of_week: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None

class TodayScheduleResponse(BaseModel):
    day_of_week: int
    day_name: str
    date_str: str
    slots: List[TimetableSlotRead]
    related_assignments: List[AssignmentRead]

DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

@router.get("", response_model=List[TimetableSlotRead])
def get_timetable(
    day_of_week: Optional[int] = None,
    include_hidden: bool = Query(False),
    session: Session = Depends(get_session)
):
    """List all recurring weekly timetable periods."""
    query = select(TimetableSlot)
    if day_of_week is not None:
        query = query.where(TimetableSlot.day_of_week == day_of_week)

    slots = session.exec(query).all()
    result = []
    for s in slots:
        course = session.exec(select(Course).where(Course.id == s.course_id)).first()
        if not include_hidden and course and course.is_hidden:
            continue
        account = session.exec(select(Account).where(Account.id == course.account_id)).first() if course else None
        result.append(
            TimetableSlotRead(
                id=s.id,
                course_id=s.course_id,
                day_of_week=s.day_of_week,
                start_time=s.start_time,
                end_time=s.end_time,
                room=s.room,
                course_name=course.name if course else "Unknown",
                course_code=course.code if course else None,
                course_color=course.color_tag if course else "#6366F1",
                account_id=course.account_id if course else None,
                account_type=account.account_type if account else None,
            )
        )

    # Sort slots by day_of_week then start_time
    result.sort(key=lambda x: (x.day_of_week, x.start_time))
    return result

@router.post("", response_model=TimetableSlotRead)
def create_slot(data: TimetableSlotCreate, session: Session = Depends(get_session)):
    course = session.exec(select(Course).where(Course.id == data.course_id)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    new_slot = TimetableSlot(
        id=f"slot_{uuid.uuid4().hex[:8]}",
        course_id=data.course_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        room=data.room,
    )
    session.add(new_slot)
    session.commit()
    session.refresh(new_slot)

    account = session.exec(select(Account).where(Account.id == course.account_id)).first()
    return TimetableSlotRead(
        id=new_slot.id,
        course_id=new_slot.course_id,
        day_of_week=new_slot.day_of_week,
        start_time=new_slot.start_time,
        end_time=new_slot.end_time,
        room=new_slot.room,
        course_name=course.name,
        course_code=course.code,
        course_color=course.color_tag,
        account_id=course.account_id,
        account_type=account.account_type if account else None,
    )

@router.put("/{slot_id}", response_model=TimetableSlotRead)
def update_slot(slot_id: str, data: TimetableSlotUpdate, session: Session = Depends(get_session)):
    slot = session.exec(select(TimetableSlot).where(TimetableSlot.id == slot_id)).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(slot, k, v)

    session.add(slot)
    session.commit()
    session.refresh(slot)

    course = session.exec(select(Course).where(Course.id == slot.course_id)).first()
    account = session.exec(select(Account).where(Account.id == course.account_id)).first() if course else None

    return TimetableSlotRead(
        id=slot.id,
        course_id=slot.course_id,
        day_of_week=slot.day_of_week,
        start_time=slot.start_time,
        end_time=slot.end_time,
        room=slot.room,
        course_name=course.name if course else None,
        course_code=course.code if course else None,
        course_color=course.color_tag if course else None,
        account_id=course.account_id if course else None,
        account_type=account.account_type if account else None,
    )

@router.delete("/{slot_id}")
def delete_slot(slot_id: str, session: Session = Depends(get_session)):
    slot = session.exec(select(TimetableSlot).where(TimetableSlot.id == slot_id)).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    session.delete(slot)
    session.commit()
    return {"status": "SUCCESS", "message": "Timetable slot deleted."}

@router.get("/today", response_model=TodayScheduleResponse)
def get_today_schedule(client_day: Optional[int] = None, session: Session = Depends(get_session)):
    """Return today's classes matched with assignments due for those specific subjects."""
    now = datetime.now()
    if client_day is not None and 0 <= client_day <= 6:
        day_of_week = client_day
    else:
        # Python weekday(): Monday is 0, Sunday is 6.
        # Our schema: 0 is Sunday, 1 is Monday, ..., 6 is Saturday
        py_weekday = now.weekday()
        # Convert py_weekday (0=Mon, 6=Sun) to our 0=Sun, 1=Mon:
        day_of_week = (py_weekday + 1) % 7

    slots = session.exec(select(TimetableSlot).where(TimetableSlot.day_of_week == day_of_week)).all()
    slot_reads = []
    course_ids = set()

    for s in slots:
        course = session.exec(select(Course).where(Course.id == s.course_id)).first()
        if course and course.is_hidden:
            continue
        account = session.exec(select(Account).where(Account.id == course.account_id)).first() if course else None
        course_ids.add(s.course_id)
        slot_reads.append(
            TimetableSlotRead(
                id=s.id,
                course_id=s.course_id,
                day_of_week=s.day_of_week,
                start_time=s.start_time,
                end_time=s.end_time,
                room=s.room,
                course_name=course.name if course else "Unknown",
                course_code=course.code if course else None,
                course_color=course.color_tag if course else "#6366F1",
                account_id=course.account_id if course else None,
                account_type=account.account_type if account else None,
            )
        )
    slot_reads.sort(key=lambda x: x.start_time)

    # Find assignments due for today's courses or due today
    assignments = session.exec(select(Assignment)).all()
    related = []
    for a in assignments:
        if a.course_id in course_ids or (a.due_datetime and a.due_datetime.date() == now.date()):
            course = session.exec(select(Course).where(Course.id == a.course_id)).first()
            if course and course.is_hidden:
                continue
            account = session.exec(select(Account).where(Account.id == a.account_id)).first()
            files = session.exec(select(File).where(File.assignment_id == a.id)).all()
            related.append(
                AssignmentRead(
                    id=a.id,
                    course_id=a.course_id,
                    account_id=a.account_id,
                    title=a.title,
                    description=a.description,
                    due_datetime=a.due_datetime,
                    source=a.source,
                    status=a.status,
                    priority=a.priority,
                    google_submission_state=a.google_submission_state,
                    web_link=a.web_link,
                    local_override=a.local_override,
                    updated_at=a.updated_at,
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
                            synced_at=f.synced_at,
                        )
                        for f in files
                    ],
                )
            )

    return TodayScheduleResponse(
        day_of_week=day_of_week,
        day_name=DAYS[day_of_week],
        date_str=now.strftime("%B %d, %Y"),
        slots=slot_reads,
        related_assignments=related,
    )
