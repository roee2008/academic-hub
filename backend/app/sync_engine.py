import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlmodel import Session, select
from app.config import SYNC_INTERVAL_SECONDS
from app.database import engine
from app.models import Account, SyncLog
from app.google_service import sync_account_classroom, sync_account_drive

logger = logging.getLogger("academic_dashboard.sync_engine")

class SyncEngine:
    def __init__(self):
        self._mutex = asyncio.Lock()
        self._is_running = False
        self._background_task: Optional[asyncio.Task] = None
        self._last_sync_time: Optional[datetime] = None
        self._is_currently_syncing = False
        self._last_error: Optional[str] = None

    @property
    def is_syncing(self) -> bool:
        return self._is_currently_syncing

    @property
    def last_synced_at(self) -> Optional[datetime]:
        return self._last_sync_time

    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    async def start(self):
        """Start the periodic background worker."""
        if self._is_running:
            return
        self._is_running = True
        self._background_task = asyncio.create_task(self._periodic_loop())
        logger.info("SyncEngine periodic background worker started.")

    async def stop(self):
        """Stop the background worker."""
        self._is_running = False
        if self._background_task:
            self._background_task.cancel()
            try:
                await self._background_task
            except asyncio.CancelledError:
                pass
        logger.info("SyncEngine stopped.")

    async def _periodic_loop(self):
        while self._is_running:
            try:
                await self.sync_all_accounts(trigger_source="BACKGROUND_TIMER")
            except Exception as e:
                logger.error(f"Unexpected error during periodic sync: {e}", exc_info=True)
            await asyncio.sleep(SYNC_INTERVAL_SECONDS)

    async def trigger_instant_sync(self) -> Dict[str, Any]:
        """Manual sync trigger for UI instant refresh button."""
        return await self.sync_all_accounts(trigger_source="MANUAL_REFRESH")

    async def sync_all_accounts(self, trigger_source: str = "SCHEDULED") -> Dict[str, Any]:
        """Execute delta sync across all linked Google accounts protected by mutex."""
        if self._mutex.locked():
            logger.warning("Sync already in progress; skipping overlapping trigger.")
            return {
                "status": "SKIPPED",
                "message": "Sync is already in progress.",
                "is_syncing": True,
                "last_synced_at": self._last_sync_time,
            }

        async with self._mutex:
            self._is_currently_syncing = True
            self._last_error = None
            start_time = datetime.now(timezone.utc)
            total_items = 0
            results = []

            try:
                # Offload DB & API sync loop to thread to avoid blocking asyncio event loop
                results, total_items = await asyncio.to_thread(self._sync_all_blocking, trigger_source)
                self._last_sync_time = datetime.now(timezone.utc)

                # Surface any errors or warnings from individual accounts
                errors = [r for r in results if r.get("status") in ["ERROR", "PARTIAL"]]
                if errors:
                    self._last_error = errors[0].get("message")

                return {
                    "status": "PARTIAL" if errors else "SUCCESS",
                    "trigger_source": trigger_source,
                    "started_at": start_time.isoformat(),
                    "completed_at": self._last_sync_time.isoformat(),
                    "duration_seconds": round((self._last_sync_time - start_time).total_seconds(), 2),
                    "items_synced": total_items,
                    "accounts_synced": len(results),
                    "details": results,
                }
            except Exception as ex:
                self._last_error = str(ex)
                logger.error(f"Error during account sync: {ex}", exc_info=True)
                return {
                    "status": "ERROR",
                    "trigger_source": trigger_source,
                    "error": str(ex),
                    "last_synced_at": self._last_sync_time,
                }
            finally:
                self._is_currently_syncing = False

    def _sync_all_blocking(self, trigger_source: str) -> tuple[list[dict], int]:
        results = []
        total_items = 0

        with Session(engine) as session:
            accounts = session.exec(select(Account)).all()
            for acc in accounts:
                acc_items = 0
                cls_items = 0
                drv_items = 0
                cls_err = None
                drv_err = None

                # 1. Sync Classroom (Courses, Assignments, Course Materials, Announcements)
                try:
                    cls_items = sync_account_classroom(acc, session)
                    acc_items += cls_items
                except Exception as e:
                    cls_err = str(e)
                    logger.error(f"Classroom sync error for {acc.email}: {e}")

                # 2. Sync Google Drive (Course folders & Drive changes)
                try:
                    drv_items = sync_account_drive(acc, session)
                    acc_items += drv_items
                except Exception as e:
                    drv_err = str(e)
                    logger.error(f"Drive sync error for {acc.email}: {e}")

                acc.last_synced_at = datetime.now(timezone.utc)
                session.add(acc)
                session.commit()
                total_items += acc_items

                if cls_err and drv_err:
                    log_status = "ERROR"
                    log_msg = f"Failed sync for {acc.email}: Classroom ({cls_err[:100]}) | Drive ({drv_err[:100]})"
                elif cls_err:
                    log_status = "PARTIAL"
                    log_msg = f"Classroom error for {acc.email}: {cls_err[:120]} (Drive synced: {drv_items})"
                elif drv_err:
                    log_status = "PARTIAL"
                    log_msg = f"Classroom synced ({cls_items} items) for {acc.email}, but Drive had issues: {drv_err[:120]}"
                else:
                    log_status = "SUCCESS"
                    log_msg = f"Synced {acc.account_type.upper()} account ({acc.email}). Classroom: {cls_items}, Drive: {drv_items}."

                # Persist audit log
                sync_log = SyncLog(
                    id=str(uuid.uuid4()),
                    timestamp=datetime.now(timezone.utc),
                    account_id=acc.id,
                    account_email=acc.email,
                    status=log_status,
                    message=f"[{trigger_source}] {log_msg}",
                    items_count=acc_items,
                )
                session.add(sync_log)
                session.commit()

                results.append({
                    "account_id": acc.id,
                    "email": acc.email,
                    "status": log_status,
                    "message": log_msg,
                    "items_updated": acc_items,
                })

        return results, total_items

# Global singleton engine instance
sync_engine = SyncEngine()
