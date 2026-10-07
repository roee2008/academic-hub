import os
import asyncio
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.database import engine, init_db, seed_demo_data
from app.models import Account, Course, Assignment, File, TimetableSlot
from app.security import encrypt_token, decrypt_token
from app.sync_engine import sync_engine
from main import app

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield

def test_token_encryption_roundtrip():
    """Verify sensitive OAuth tokens are encrypted at rest and decrypt cleanly."""
    original_token = "ya29.a0AfH6SMD-demo-long-secret-oauth-refresh-token-12345"
    encrypted = encrypt_token(original_token)
    assert encrypted != original_token
    assert len(encrypted) > len(original_token)

    decrypted = decrypt_token(encrypted)
    assert decrypted == original_token

def test_demo_or_live_accounts_exist():
    """Verify accounts exist and are mapped in the database."""
    with Session(engine) as session:
        accounts = session.exec(select(Account)).all()
        assert len(accounts) >= 1
        for acc in accounts:
            assert acc.email is not None
            assert acc.account_type in ("personal", "edu")

def test_assignment_crud_and_local_override():
    """Verify assignment creation and that local override flag sets when user toggles status."""
    client = TestClient(app)

    # 1. Fetch courses to get valid course_id
    courses_res = client.get("/api/courses")
    assert courses_res.status_code == 200
    courses = courses_res.json()
    assert len(courses) > 0
    course_id = courses[0]["id"]

    # 2. Create manual task
    payload = {
        "title": "Study for CS 106B Midterm Exam",
        "description": "Review recurrence relations and binary tree traversals",
        "course_id": course_id,
        "priority": "HIGH",
        "status": "TODO"
    }
    create_res = client.post("/api/assignments", json=payload)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["title"] == payload["title"]
    assert created["source"] == "MANUAL"
    assert created["local_override"] is True
    task_id = created["id"]

    # 3. Patch status to IN_PROGRESS
    patch_res = client.patch(f"/api/assignments/{task_id}", json={"status": "IN_PROGRESS", "priority": "URGENT"})
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["status"] == "IN_PROGRESS"
    assert updated["priority"] == "URGENT"
    assert updated["local_override"] is True

    # 4. Clean up
    del_res = client.delete(f"/api/assignments/{task_id}")
    assert del_res.status_code == 200

def test_timetable_and_today_schedule():
    """Verify timetable slots and today's schedule mapping."""
    client = TestClient(app)
    courses_res = client.get("/api/courses")
    assert courses_res.status_code == 200
    courses = courses_res.json()
    course_id = courses[0]["id"]

    # Create a test slot
    slot_payload = {
        "course_id": course_id,
        "day_of_week": datetime.now().weekday(),
        "start_time": "10:00",
        "end_time": "11:30",
        "room": "Room 101"
    }
    create_slot = client.post("/api/timetable", json=slot_payload)
    assert create_slot.status_code == 200
    created_slot = create_slot.json()
    slot_id = created_slot["id"]

    timetable_res = client.get("/api/timetable")
    assert timetable_res.status_code == 200
    slots = timetable_res.json()
    assert len(slots) > 0

    today_res = client.get("/api/timetable/today")
    assert today_res.status_code == 200
    today_data = today_res.json()
    assert "day_of_week" in today_data
    assert "day_name" in today_data
    assert "slots" in today_data
    assert "related_assignments" in today_data

    # Clean up slot
    client.delete(f"/api/timetable/{slot_id}")

@pytest.mark.asyncio
async def test_sync_engine_mutex_concurrency():
    """Verify that multiple simultaneous sync triggers do not cause race conditions."""
    res1, res2 = await asyncio.gather(
        sync_engine.trigger_instant_sync(),
        sync_engine.trigger_instant_sync(),
    )
    statuses = [res1.get("status"), res2.get("status")]
    assert "SUCCESS" in statuses or "SKIPPED" in statuses

def test_file_ignore_and_drive_link():
    """Verify file ignore/unignore flow and course Drive link/unlink flow."""
    import uuid
    client = TestClient(app)
    test_id = f"test_file_{uuid.uuid4().hex[:8]}"

    # 1. Create a test file
    with Session(engine) as session:
        courses = session.exec(select(Course)).all()
        course = courses[0]
        course_id = course.id
        test_f = File(
            id=test_id,
            account_id=course.account_id,
            course_id=course.id,
            title="Syllabus 2026.pdf",
            drive_file_id=f"drive_{test_id}",
            source="CLASSROOM",
            is_ignored=False,
            synced_at=datetime.utcnow()
        )
        session.add(test_f)
        session.commit()

    # 2. Verify file appears in /api/files
    files = client.get(f"/api/files?course_id={course_id}").json()
    assert any(f["id"] == test_id for f in files)

    # 3. Ignore the file
    ignore_res = client.post(f"/api/files/{test_id}/ignore")
    assert ignore_res.status_code == 200
    assert ignore_res.json()["is_ignored"] is True

    # 4. Active files list excludes it
    active_files = client.get(f"/api/files?course_id={course_id}").json()
    assert not any(f["id"] == test_id for f in active_files)

    # 5. Ignored files list includes it
    all_files = client.get(f"/api/files?course_id={course_id}&include_ignored=true").json()
    assert any(f["id"] == test_id for f in all_files)

    # 6. Unignore file
    unignore_res = client.post(f"/api/files/{test_id}/unignore")
    assert unignore_res.status_code == 200
    assert unignore_res.json()["is_ignored"] is False

    # 7. Clean up test file
    with Session(engine) as session:
        f_to_del = session.exec(select(File).where(File.id == test_id)).first()
        if f_to_del:
            session.delete(f_to_del)
            session.commit()

    # 8. Test Course Drive link & unlink
    link_res = client.post(
        f"/api/courses/{course_id}/link-drive",
        json={"folder_url": "https://drive.google.com/drive/folders/1ABC_xyz-test12345?usp=sharing"}
    )
    assert link_res.status_code == 200
    linked_course = link_res.json()
    assert linked_course["drive_folder_id"] == "1ABC_xyz-test12345"

    unlink_res = client.post(f"/api/courses/{course_id}/unlink-drive")
    assert unlink_res.status_code == 200
    unlinked_course = unlink_res.json()
    assert unlinked_course["drive_folder_id"] is None
