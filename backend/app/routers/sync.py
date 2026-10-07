from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import SyncLog, Course, TimetableSlot, Assignment
from app.sync_engine import sync_engine
from app.config import SYNC_INTERVAL_SECONDS

router = APIRouter(prefix="/api/sync", tags=["sync"])

class DeviceSyncPayload(BaseModel):
    courses: List[dict]
    timetable_slots: List[dict]
    assignments: Optional[List[dict]] = None

@router.get("/status")
def get_sync_status():
    """Get current background synchronization engine status."""
    return {
        "is_syncing": sync_engine.is_syncing,
        "last_synced_at": sync_engine.last_synced_at,
        "last_error": sync_engine.last_error,
        "interval_seconds": SYNC_INTERVAL_SECONDS,
    }

@router.post("/trigger")
async def trigger_instant_sync():
    """Trigger on-demand synchronization immediately across all accounts."""
    result = await sync_engine.trigger_instant_sync()
    return result

@router.get("/logs", response_model=List[SyncLog])
def get_sync_logs(limit: int = 20, session: Session = Depends(get_session)):
    """Retrieve historical synchronization audit entries."""
    query = select(SyncLog).order_by(SyncLog.timestamp.desc()).limit(limit)
    logs = session.exec(query).all()
    return logs

@router.get("/device-export")
def export_device_data(session: Session = Depends(get_session)):
    """Export courses and timetable slots for synchronization to another device."""
    courses = session.exec(select(Course)).all()
    slots = session.exec(select(TimetableSlot)).all()
    return {
        "version": "1.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "courses": [c.model_dump() for c in courses],
        "timetable_slots": [s.model_dump() for s in slots],
    }

@router.post("/device-import")
def import_device_data(payload: DeviceSyncPayload, session: Session = Depends(get_session)):
    """Import and merge courses and timetable slots from another device."""
    try:
        existing_courses = {c.id: c for c in session.exec(select(Course)).all()}
        for c_data in payload.courses:
            c_id = c_data.get("id")
            if not c_id:
                continue
            if c_id in existing_courses:
                existing = existing_courses[c_id]
                existing.name = c_data.get("name", existing.name)
                existing.code = c_data.get("code", existing.code)
                existing.section = c_data.get("section", existing.section)
                existing.color_tag = c_data.get("color_tag", existing.color_tag)
                session.add(existing)
            else:
                new_c = Course(**c_data)
                session.add(new_c)
        session.commit()

        existing_slots = {s.id: s for s in session.exec(select(TimetableSlot)).all()}
        for s_data in payload.timetable_slots:
            s_id = s_data.get("id")
            if not s_id:
                continue
            if s_id in existing_slots:
                existing_s = existing_slots[s_id]
                existing_s.start_time = s_data.get("start_time", existing_s.start_time)
                existing_s.end_time = s_data.get("end_time", existing_s.end_time)
                existing_s.room = s_data.get("room", existing_s.room)
                existing_s.day_of_week = s_data.get("day_of_week", existing_s.day_of_week)
                session.add(existing_s)
            else:
                new_s = TimetableSlot(**s_data)
                session.add(new_s)
        session.commit()

        return {
            "status": "SUCCESS",
            "message": f"Successfully synced {len(payload.courses)} courses and {len(payload.timetable_slots)} timetable slots.",
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Sync import failed: {str(e)}")
