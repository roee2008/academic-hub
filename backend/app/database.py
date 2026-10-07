import uuid
from datetime import datetime, timedelta
from typing import Generator
from sqlmodel import SQLModel, create_engine, Session, select
from sqlalchemy import event
from sqlalchemy.engine import Engine
from app.config import DATABASE_URL
from app.models import Account, Course, Assignment, File, TimetableSlot, SyncLog
from app.security import encrypt_token

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

# Enable SQLite WAL mode and foreign key enforcement for high performance and integrity
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
    except Exception:
        pass
    finally:
        cursor.close()

def init_db():
    SQLModel.metadata.create_all(engine)
    # Ensure is_ignored column exists in files table
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE files ADD COLUMN is_ignored BOOLEAN DEFAULT 0"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE accounts ADD COLUMN needs_reconnect BOOLEAN DEFAULT 0"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE courses ADD COLUMN is_hidden BOOLEAN DEFAULT 0"))
            conn.commit()
        except Exception:
            pass

    # Check if empty, seed demo data if so
    with Session(engine) as session:
        existing_accounts = session.exec(select(Account)).all()
        if not existing_accounts:
            seed_demo_data(session)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

def seed_demo_data(session: Session):
    now = datetime.utcnow()
    
    # 1. Accounts
    acc_personal = Account(
        id="acc_personal_demo",
        email="alex.rivest@gmail.com",
        account_type="personal",
        display_name="Alex Rivest",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        refresh_token=encrypt_token("demo_refresh_token_personal"),
        access_token=encrypt_token("demo_access_token_personal"),
        token_expiry=now + timedelta(hours=24),
        drive_start_page_token="demo_token_1",
        last_synced_at=now - timedelta(minutes=3),
        created_at=now - timedelta(days=30),
    )
    acc_edu = Account(
        id="acc_edu_demo",
        email="alex.r@stanford.edu",
        account_type="edu",
        display_name="Alex Rivest (Stanford Workspace)",
        avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
        refresh_token=encrypt_token("demo_refresh_token_edu"),
        access_token=encrypt_token("demo_access_token_edu"),
        token_expiry=now + timedelta(hours=24),
        drive_start_page_token="demo_token_2",
        last_synced_at=now - timedelta(minutes=1),
        created_at=now - timedelta(days=45),
    )
    session.add(acc_personal)
    session.add(acc_edu)
    session.commit()

    # 2. Courses
    courses_data = [
        Course(
            id="course_cs106b",
            account_id="acc_edu_demo",
            name="Programming Abstractions",
            code="CS 106B",
            section="01 (Autumn)",
            alternate_link="https://classroom.google.com",
            color_tag="#6366F1",  # Electric Indigo
            drive_folder_id="demo_folder_cs106b",
            drive_folder_name="CS106B Shared Handouts",
        ),
        Course(
            id="course_math51",
            account_id="acc_edu_demo",
            name="Linear Algebra & Multivariable Calculus",
            code="MATH 51",
            section="03",
            alternate_link="https://classroom.google.com",
            color_tag="#F59E0B",  # Warm Amber
            drive_folder_id="demo_folder_math51",
            drive_folder_name="Math 51 P-Sets & Solutions",
        ),
        Course(
            id="course_bio81",
            account_id="acc_edu_demo",
            name="Principles of Molecular Biology",
            code="BIO 81",
            section="Lecture A",
            alternate_link="https://classroom.google.com",
            color_tag="#10B981",  # Emerald Green
            drive_folder_id="demo_folder_bio81",
            drive_folder_name="BIO81 Lab Protocols",
        ),
        Course(
            id="course_cs140",
            account_id="acc_edu_demo",
            name="Operating Systems & Architecture",
            code="CS 140",
            section="01",
            alternate_link="https://classroom.google.com",
            color_tag="#06B6D4",  # Vibrant Cyan
            drive_folder_id="demo_folder_cs140",
            drive_folder_name="CS140 Pintos Project Drive",
        ),
        Course(
            id="course_art160",
            account_id="acc_personal_demo",
            name="Digital Media & Interactive Shaders",
            code="ART 160",
            section="Studio 2",
            alternate_link="https://classroom.google.com",
            color_tag="#8B5CF6",  # Deep Violet
            drive_folder_id="demo_folder_art160",
            drive_folder_name="Art 160 Asset Bucket",
        ),
    ]
    for c in courses_data:
        session.add(c)
    session.commit()

    # 3. Assignments
    assignments_data = [
        Assignment(
            id="asgn_cs106b_hw4",
            course_id="course_cs106b",
            account_id="acc_edu_demo",
            title="Homework 4: Priority Queues & Huffman Coding",
            description="Implement binary heap priority queue and tree-based Huffman decompression algorithm. Pass all unit tests in pqueue-tests.cpp.",
            due_datetime=now + timedelta(days=2, hours=14),
            source="CLASSROOM",
            status="IN_PROGRESS",
            priority="HIGH",
            google_submission_state="CREATED",
            web_link="https://classroom.google.com/c/demo_cs106b/a/hw4",
            updated_at=now,
        ),
        Assignment(
            id="asgn_math51_pset3",
            course_id="course_math51",
            account_id="acc_edu_demo",
            title="Problem Set 3: Eigenvalues & Gradient Vector Fields",
            description="Problems 1-12 from Chapter 3. Verify conservative vector fields and compute path integrals. Submit PDF via Gradescope.",
            due_datetime=now + timedelta(days=1, hours=8),
            source="CLASSROOM",
            status="TODO",
            priority="URGENT",
            google_submission_state="NEW",
            web_link="https://classroom.google.com/c/demo_math51/a/pset3",
            updated_at=now,
        ),
        Assignment(
            id="asgn_bio81_lab",
            course_id="course_bio81",
            account_id="acc_edu_demo",
            title="Lab Report: Gel Electrophoresis & PCR Yield",
            description="Analyze band intensity ratios from Figure 2. Write 3-page discussion comparing standard primers vs mutagenic primers.",
            due_datetime=now + timedelta(days=4, hours=18),
            source="CLASSROOM",
            status="TODO",
            priority="MEDIUM",
            google_submission_state="NEW",
            web_link="https://classroom.google.com/c/demo_bio81/a/lab",
            updated_at=now,
        ),
        Assignment(
            id="asgn_cs140_p2",
            course_id="course_cs140",
            account_id="acc_edu_demo",
            title="Project 2: User-Level Thread Scheduler (Pintos)",
            description="Implement priority donation, MLFQS scheduling, and alarm clock timer without busy waiting.",
            due_datetime=now + timedelta(days=6, hours=23),
            source="CLASSROOM",
            status="TODO",
            priority="URGENT",
            google_submission_state="NEW",
            web_link="https://classroom.google.com/c/demo_cs140/a/p2",
            updated_at=now,
        ),
        Assignment(
            id="asgn_cs140_reading",
            course_id="course_cs140",
            account_id="acc_edu_demo",
            title="Read Chapter 4: Virtual Memory & Page Tables",
            description="Prepare 3 discussion questions regarding multi-level page table caching and TLB shootdown mechanisms.",
            due_datetime=now - timedelta(days=1),
            source="MANUAL",
            status="DONE",
            priority="LOW",
            web_link="",
            updated_at=now,
        ),
        Assignment(
            id="asgn_art160_portfolio",
            course_id="course_art160",
            account_id="acc_personal_demo",
            title="Midterm Creative Project: GLSL Raymarching Scene",
            description="Build a real-time reactive WebGL shader exploring SDF boolean operations and chromatic aberration.",
            due_datetime=now + timedelta(days=5, hours=12),
            source="MANUAL",
            status="IN_PROGRESS",
            priority="MEDIUM",
            web_link="https://shadertoy.com",
            updated_at=now,
        ),
    ]
    for a in assignments_data:
        session.add(a)
    session.commit()

    # 4. Files
    files_data = [
        File(
            id="file_huffman_spec",
            account_id="acc_edu_demo",
            course_id="course_cs106b",
            assignment_id="asgn_cs106b_hw4",
            title="HW4-Specification-Huffman.pdf",
            mime_type="application/pdf",
            drive_file_id="1aB2c3D4e5F6g7H8_huffman_spec",
            drive_preview_link="https://drive.google.com/file/d/1aB2c3D4e5F6g7H8_huffman_spec/preview",
            drive_web_view_link="https://drive.google.com/file/d/1aB2c3D4e5F6g7H8_huffman_spec/view",
            size_bytes=1420500,
            source="CLASSROOM",
            synced_at=now,
        ),
        File(
            id="file_pqueue_starter",
            account_id="acc_edu_demo",
            course_id="course_cs106b",
            assignment_id="asgn_cs106b_hw4",
            title="pqueue-starter.zip",
            mime_type="application/zip",
            drive_file_id="2bC3d4E5f6G7h8I9_pqueue_zip",
            drive_preview_link="https://drive.google.com/file/d/2bC3d4E5f6G7h8I9_pqueue_zip/preview",
            drive_web_view_link="https://drive.google.com/file/d/2bC3d4E5f6G7h8I9_pqueue_zip/view",
            size_bytes=384020,
            source="CLASSROOM",
            synced_at=now,
        ),
        File(
            id="file_math51_pset",
            account_id="acc_edu_demo",
            course_id="course_math51",
            assignment_id="asgn_math51_pset3",
            title="Math51-Autumn-ProblemSet3.pdf",
            mime_type="application/pdf",
            drive_file_id="3cD4e5F6g7H8i9J0_math51_pset",
            drive_preview_link="https://drive.google.com/file/d/3cD4e5F6g7H8i9J0_math51_pset/preview",
            drive_web_view_link="https://drive.google.com/file/d/3cD4e5F6g7H8i9J0_math51_pset/view",
            size_bytes=894320,
            source="CLASSROOM",
            synced_at=now,
        ),
        File(
            id="file_math51_notes",
            account_id="acc_edu_demo",
            course_id="course_math51",
            assignment_id=None,
            title="Lecture-12-Spectral-Theorem-Decomposition.pdf",
            mime_type="application/pdf",
            drive_file_id="4dE5f6G7h8I9j0K1_math_spectral",
            drive_preview_link="https://drive.google.com/file/d/4dE5f6G7h8I9j0K1_math_spectral/preview",
            drive_web_view_link="https://drive.google.com/file/d/4dE5f6G7h8I9j0K1_math_spectral/view",
            size_bytes=2450880,
            source="DRIVE_FOLDER",
            synced_at=now,
        ),
        File(
            id="file_bio81_protocol",
            account_id="acc_edu_demo",
            course_id="course_bio81",
            assignment_id="asgn_bio81_lab",
            title="Bio81-Lab-Manual-v3-PCR.pdf",
            mime_type="application/pdf",
            drive_file_id="5eF6g7H8i9J0k1L2_bio_protocol",
            drive_preview_link="https://drive.google.com/file/d/5eF6g7H8i9J0k1L2_bio_protocol/preview",
            drive_web_view_link="https://drive.google.com/file/d/5eF6g7H8i9J0k1L2_bio_protocol/view",
            size_bytes=4210340,
            source="DRIVE_FOLDER",
            synced_at=now,
        ),
        File(
            id="file_pintos_starter",
            account_id="acc_edu_demo",
            course_id="course_cs140",
            assignment_id="asgn_cs140_p2",
            title="pintos-threads-handout.pdf",
            mime_type="application/pdf",
            drive_file_id="6fG7h8I9j0K1l2M3_pintos_handout",
            drive_preview_link="https://drive.google.com/file/d/6fG7h8I9j0K1l2M3_pintos_handout/preview",
            drive_web_view_link="https://drive.google.com/file/d/6fG7h8I9j0K1l2M3_pintos_handout/view",
            size_bytes=1840220,
            source="CLASSROOM",
            synced_at=now,
        ),
        File(
            id="file_art160_syllabus",
            account_id="acc_personal_demo",
            course_id="course_art160",
            assignment_id=None,
            title="Art160-Raymarching-Reference-Guide.pdf",
            mime_type="application/pdf",
            drive_file_id="7gH8i9J0k1L2m3N4_shader_guide",
            drive_preview_link="https://drive.google.com/file/d/7gH8i9J0k1L2m3N4_shader_guide/preview",
            drive_web_view_link="https://drive.google.com/file/d/7gH8i9J0k1L2m3N4_shader_guide/view",
            size_bytes=3120000,
            source="DRIVE_FOLDER",
            synced_at=now,
        ),
    ]
    for f in files_data:
        session.add(f)
    session.commit()

    # 5. Timetable Slots
    slots_data = [
        # Monday (day_of_week=1)
        TimetableSlot(
            id=str(uuid.uuid4()),
            course_id="course_cs106b",
            day_of_week=1,
            start_time="09:30",
            end_time="11:00",
            room="Hewlett 200",
        ),
        TimetableSlot(
            id=str(uuid.uuid4()),
            course_id="course_math51",
            day_of_week=1,
            start_time="11:30",
            end_time="13:00",
            room="Skilling 190",
        ),
        TimetableSlot(
            id=str(uuid.uuid4()),
            course_id="course_cs140",
            day_of_week=1,
            start_time="14:15",
            end_time="16:00",
            room="Gates B01",
        ),
        # Tuesday (day_of_week=2)
        TimetableSlot(
            id=str(uuid.uuid4()),
            course_id="course_bio81",
            day_of_week=2,
            start_time="10:00",
            end_time="11:30",
            room="Gilbert 115",
        ),
        TimetableSlot(
            id=str(uuid.uuid4()),
            course_id="course_art160",
            day_of_week=2,
            start_time="13:00",
            end_time="15:30",
            room="Art Building 102",
        ),
        # Wednesday (day_of_week=3)
        TimetableSlot(
            id=str(uuid.uuid4()),
            course_id="course_cs106b",
            day_of_week=3,
            start_time="09:30",
            end_time="11:00",
            room="Hewlett 200",
        ),
        TimetableSlot(
            id=str(uuid.uuid4()),
            course_id="course_math51",
            day_of_week=3,
            start_time="11:30",
            end_time="13:00",
            room="Skilling 190",
        ),
        # Thursday (day_of_week=4)
        TimetableSlot(
            id=str(uuid.uuid4()),
            course_id="course_bio81",
            day_of_week=4,
            start_time="10:00",
            end_time="11:30",
            room="Gilbert 115",
        ),
        TimetableSlot(
            id=str(uuid.uuid4()),
            course_id="course_cs140",
            day_of_week=4,
            start_time="14:15",
            end_time="16:00",
            room="Gates B01",
        ),
        # Friday (day_of_week=5)
        TimetableSlot(
            id=str(uuid.uuid4()),
            course_id="course_math51",
            day_of_week=5,
            start_time="11:00",
            end_time="12:00",
            room="Skilling 190 (Recitation)",
        ),
        TimetableSlot(
            id=str(uuid.uuid4()),
            course_id="course_cs106b",
            day_of_week=5,
            start_time="13:30",
            end_time="14:45",
            room="Old Union 212 (Section)",
        ),
    ]
    for s in slots_data:
        session.add(s)
    session.commit()

    # 6. Initial Sync Log
    log = SyncLog(
        id=str(uuid.uuid4()),
        timestamp=now - timedelta(minutes=1),
        account_id="acc_edu_demo",
        account_email="alex.r@stanford.edu",
        status="SUCCESS",
        message="Initial synchronization completed. 5 courses, 6 assignments, 7 files indexed.",
        items_count=18,
    )
    session.add(log)
    session.commit()
