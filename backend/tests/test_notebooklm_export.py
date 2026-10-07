import io
import zipfile
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.database import engine, init_db
from app.models import Course, Account, File
from app.file_converter import (
    check_notebooklm_compatibility,
    convert_ppt_to_pptx,
    convert_ppt_to_pdf,
    generate_class_notebooklm_overview,
)
from main import app

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield

def test_notebooklm_compatibility_detection():
    """Verify format detection and that legacy .ppt is flagged for auto-transfer to .pptx."""
    # Native supported formats
    pdf_check = check_notebooklm_compatibility("Calculus_Syllabus.pdf", "application/pdf")
    assert pdf_check["is_compatible"] is True
    assert pdf_check["action"] == "DIRECT"

    pptx_check = check_notebooklm_compatibility("Lecture_01.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    assert pptx_check["is_compatible"] is True
    assert pptx_check["action"] == "DIRECT"

    docx_check = check_notebooklm_compatibility("Homework_1.docx")
    assert docx_check["is_compatible"] is True

    # Legacy PowerPoint (.ppt) - MUST require auto-transfer to .pptx
    ppt_check = check_notebooklm_compatibility("Lecture_Legacy.ppt", "application/vnd.ms-powerpoint")
    assert ppt_check["is_compatible"] is False
    assert ppt_check["action"] == "CONVERT_PPT"
    assert ppt_check["target_extension"] == ".pptx"
    assert ppt_check["suggested_title"] == "Lecture_Legacy.pptx"

    # Images require conversion to PDF
    img_check = check_notebooklm_compatibility("Diagram.png", "image/png")
    assert img_check["is_compatible"] is False
    assert img_check["action"] == "CONVERT_IMAGE"
    assert img_check["target_extension"] == ".pdf"

def test_ppt_to_pptx_and_pdf_conversion():
    """Verify legacy .ppt byte buffer converts into valid .pptx and .pdf."""
    mock_ppt_bytes = b"PowerPoint Document sample slide content with title and bullets for testing."
    
    # 1. Convert to PPTX
    pptx_bytes = convert_ppt_to_pptx(mock_ppt_bytes, "SampleLecture.ppt")
    assert len(pptx_bytes) > 0
    # PPTX is a zip archive with [Content_Types].xml
    with zipfile.ZipFile(io.BytesIO(pptx_bytes)) as z:
        names = z.namelist()
        assert "[Content_Types].xml" in names
        assert any("slide" in n for n in names)

    # 2. Convert to PDF
    pdf_bytes = convert_ppt_to_pdf(mock_ppt_bytes, "SampleLecture.ppt")
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF-")

def test_overview_pdf_generation():
    """Verify master NotebookLM Course Overview PDF is generated cleanly."""
    with Session(engine) as session:
        course = session.exec(select(Course)).first()
        files = session.exec(select(File).where(File.course_id == course.id)).all()

        pdf_bytes = generate_class_notebooklm_overview(
            course=course,
            assignments=[],
            timetable_slots=[],
            files=files,
        )
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b"%PDF-")

def test_export_analyze_api_per_class():
    """Verify /api/export/notebooklm/analyze groups files per individual class."""
    client = TestClient(app)
    res = client.post("/api/export/notebooklm/analyze")
    assert res.status_code == 200
    classes = res.json()
    assert len(classes) >= 1

    first_class = classes[0]
    assert "course_id" in first_class
    assert "course_name" in first_class
    assert "compatible_count" in first_class
    assert "unsupported_count" in first_class
    assert "files" in first_class

    # Test filtering by specific class course_id
    single_res = client.post(f"/api/export/notebooklm/analyze?course_id={first_class['course_id']}")
    assert single_res.status_code == 200
    single_data = single_res.json()
    assert len(single_data) == 1
    assert single_data[0]["course_id"] == first_class["course_id"]

def test_export_class_to_notebooklm_with_chosen_account():
    """
    Verify /api/export/notebooklm/export-class creates a single class notebook,
    respects the chosen target email account, and provides a valid downloadable ZIP.
    """
    client = TestClient(app)
    with Session(engine) as session:
        courses = session.exec(select(Course)).all()
        accounts = session.exec(select(Account)).all()
        assert len(courses) > 0
        assert len(accounts) > 0

        target_course = courses[0]
        chosen_account = accounts[-1]  # Pick chosen account (e.g. personal or edu)

    payload = {
        "course_id": target_course.id,
        "target_account_id": chosen_account.id,
        "convert_unsupported": True,
        "create_drive_folder": False,  # Local test without live Google Drive write call
        "include_overview": True,
    }

    res = client.post("/api/export/notebooklm/export-class", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "SUCCESS"
    assert data["course_id"] == target_course.id
    assert data["target_account_email"] == chosen_account.email
    assert "download_url" in data
    assert data["notebooklm_url"] == "https://notebooklm.google.com/"

    # Test downloading the prepared ZIP package
    dl_res = client.get(data["download_url"])
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/zip"

    # Verify contents of the ZIP package
    with zipfile.ZipFile(io.BytesIO(dl_res.content)) as z:
        names = z.namelist()
        # Must contain overview PDF
        assert any("Overview.pdf" in n for n in names)
