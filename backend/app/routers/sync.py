from typing import List
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import SyncLog
from app.sync_engine import sync_engine
from app.config import SYNC_INTERVAL_SECONDS

router = APIRouter(prefix="/api/sync", tags=["sync"])

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
