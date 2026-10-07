import io
import os
import uuid
import zipfile
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import Course, File, Assignment, TimetableSlot, Account
from app.google_service import download_file_stream, create_drive_folder_and_upload
from app.file_converter import (
    check_notebooklm_compatibility,
    convert_ppt_to_pptx,
    convert_ppt_to_pdf,
    convert_image_to_pdf,
    convert_code_or_text_to_compatible,
    generate_class_notebooklm_overview,
)

logger = logging.getLogger("academic_dashboard.export")

router = APIRouter(prefix="/api/export", tags=["export"])

# In-memory storage for prepared exports ready for client download
# Stores: export_id -> {"filename": str, "data": bytes, "timestamp": datetime}
PREPARED_EXPORTS: Dict[str, Dict[str, Any]] = {}

class NotebookLMExportRequest(BaseModel):
    course_id: str
    target_account_id: Optional[str] = None
    convert_unsupported: bool = True
    create_drive_folder: bool = True
    include_overview: bool = True

class FileAnalysisItem(BaseModel):
    id: str
    title: str
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    is_compatible: bool
    action: str
    suggested_title: str
    original_extension: str
    target_extension: str
    reason: str

class ClassAnalysisResponse(BaseModel):
    course_id: str
    course_name: str
    course_code: Optional[str] = None
    color_tag: Optional[str] = None
    account_id: str
    account_email: Optional[str] = None
    total_files: int
    compatible_count: int
    unsupported_count: int
    files: List[FileAnalysisItem]

class ExportResultResponse(BaseModel):
    status: str
    course_id: str
    course_name: str
    target_account_email: str
    drive_folder_url: Optional[str] = None
    drive_folder_id: Optional[str] = None
    download_url: str
    notebooklm_url: str = "https://notebooklm.google.com/"
    total_files: int
    converted_files: int
    log: List[str]

@router.post("/notebooklm/analyze", response_model=List[ClassAnalysisResponse])
def analyze_notebooklm_files(
    course_id: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """
    Analyzes course files for NotebookLM compatibility, grouped on a per-class basis.
    Highlights files like legacy .ppt that require automated transfer/conversion.
    """
    courses_query = select(Course)
    if course_id:
        courses_query = courses_query.where(Course.id == course_id)
    courses = session.exec(courses_query).all()

    results = []
    for c in courses:
        acc = session.exec(select(Account).where(Account.id == c.account_id)).first()
        files = session.exec(
            select(File)
            .where(File.course_id == c.id)
            .where(File.is_ignored == False)
        ).all()

        file_items = []
        compatible_count = 0
        unsupported_count = 0

        for f in sorted(files, key=lambda x: x.title.lower()):
            chk = check_notebooklm_compatibility(f.title, f.mime_type)
            if chk["is_compatible"]:
                compatible_count += 1
            else:
                unsupported_count += 1

            file_items.append(
                FileAnalysisItem(
                    id=f.id,
                    title=f.title,
                    mime_type=f.mime_type,
                    size_bytes=f.size_bytes,
                    is_compatible=chk["is_compatible"],
                    action=chk["action"],
                    suggested_title=chk["suggested_title"],
                    original_extension=chk["original_extension"],
                    target_extension=chk["target_extension"],
                    reason=chk["reason"],
                )
            )

        results.append(
            ClassAnalysisResponse(
                course_id=c.id,
                course_name=c.name,
                course_code=c.code,
                color_tag=c.color_tag,
                account_id=c.account_id,
                account_email=acc.email if acc else None,
                total_files=len(files),
                compatible_count=compatible_count,
                unsupported_count=unsupported_count,
                files=file_items,
            )
        )

    return results

@router.post("/notebooklm/export-class", response_model=ExportResultResponse)
def export_class_to_notebooklm(
    payload: NotebookLMExportRequest,
    session: Session = Depends(get_session),
):
    """
    Prepares a dedicated NotebookLM export for a SINGLE class,
    auto-transferring any unsupported files (e.g. .ppt -> .pptx / PDF),
    and saving the notebook folder to the user's CHOSEN target Google Account email.
    """
    course = session.exec(select(Course).where(Course.id == payload.course_id)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Resolve target Google Account from user's choice (or default to course's account)
    target_acc_id = payload.target_account_id or course.account_id
    target_account = session.exec(select(Account).where(Account.id == target_acc_id)).first()
    if not target_account:
        target_account = session.exec(select(Account).where(Account.id == course.account_id)).first()
    if not target_account:
        raise HTTPException(status_code=400, detail="Target Google Account could not be resolved")

    # Load active files, assignments, and timetable slots for this class
    files = session.exec(
        select(File)
        .where(File.course_id == course.id)
        .where(File.is_ignored == False)
    ).all()

    assignments = session.exec(
        select(Assignment).where(Assignment.course_id == course.id)
    ).all()

    timetable_slots = session.exec(
        select(TimetableSlot).where(TimetableSlot.course_id == course.id)
    ).all()

    zip_buffer = io.BytesIO()
    files_to_upload_to_drive = []
    log_messages = []
    converted_count = 0

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
        # 1. Generate master NotebookLM Knowledge Grounding Overview PDF
        if payload.include_overview:
            try:
                overview_pdf = generate_class_notebooklm_overview(
                    course=course,
                    assignments=assignments,
                    timetable_slots=timetable_slots,
                    files=files,
                )
                overview_filename = f"00_NotebookLM_{course.name.replace('/', '_')}_Overview.pdf"
                zipf.writestr(overview_filename, overview_pdf)
                files_to_upload_to_drive.append({
                    "name": overview_filename,
                    "data": overview_pdf,
                    "mime": "application/pdf",
                })
                log_messages.append(f"Generated master syllabus & overview: {overview_filename}")
            except Exception as e:
                logger.warning(f"Failed to generate course overview PDF: {e}")
                log_messages.append(f"Warning: Course overview generation skipped: {str(e)}")

        # 2. Process, convert, and package each course file
        for f in files:
            chk = check_notebooklm_compatibility(f.title, f.mime_type)

            # Download raw file stream
            try:
                raw_stream, detected_mime = download_file_stream(f, session)
                raw_bytes = raw_stream.getvalue()
            except Exception as e:
                logger.error(f"Failed to download {f.title}: {e}")
                log_messages.append(f"Failed to fetch {f.title}: {str(e)}")
                continue

            # Auto-transfer / convert unsupported formats
            if not chk["is_compatible"] and payload.convert_unsupported:
                if chk["action"] == "CONVERT_PPT":
                    # 1. Convert .ppt into .pptx
                    pptx_ok = False
                    pptx_name = chk["suggested_title"]
                    try:
                        pptx_data = convert_ppt_to_pptx(raw_bytes, f.title)
                        zipf.writestr(pptx_name, pptx_data)
                        files_to_upload_to_drive.append({
                            "name": pptx_name,
                            "data": pptx_data,
                            "mime": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        })
                        pptx_ok = True
                    except Exception as e_pptx:
                        logger.error(f"Error converting .ppt to .pptx for {f.title}: {e_pptx}")

                    # 2. Also generate companion PDF slide deck
                    pdf_ok = False
                    base_name = os.path.splitext(f.title)[0]
                    pdf_name = f"{base_name}_slides.pdf"
                    try:
                        pdf_data = convert_ppt_to_pdf(raw_bytes, f.title)
                        zipf.writestr(pdf_name, pdf_data)
                        files_to_upload_to_drive.append({
                            "name": pdf_name,
                            "data": pdf_data,
                            "mime": "application/pdf",
                        })
                        pdf_ok = True
                    except Exception as e_pdf:
                        logger.error(f"Error converting .ppt to .pdf for {f.title}: {e_pdf}")

                    if pptx_ok or pdf_ok:
                        converted_count += 1
                        conv_targets = []
                        if pptx_ok: conv_targets.append(pptx_name)
                        if pdf_ok: conv_targets.append(pdf_name)
                        log_messages.append(f"Auto-transferred legacy presentation: '{f.title}' ➔ {' & '.join(conv_targets)}")
                    else:
                        zipf.writestr(f.title, raw_bytes)
                        files_to_upload_to_drive.append({
                            "name": f.title,
                            "data": raw_bytes,
                            "mime": detected_mime or "application/octet-stream",
                        })
                        log_messages.append(f"Warning: Could not convert '{f.title}'. Included as original.")

                elif chk["action"] == "CONVERT_IMAGE":
                    try:
                        pdf_data = convert_image_to_pdf(raw_bytes, f.title)
                        pdf_name = chk["suggested_title"]
                        zipf.writestr(pdf_name, pdf_data)
                        files_to_upload_to_drive.append({
                            "name": pdf_name,
                            "data": pdf_data,
                            "mime": "application/pdf",
                        })
                        converted_count += 1
                        log_messages.append(f"Auto-transferred image into PDF: '{f.title}' ➔ '{pdf_name}'")
                    except Exception as e_img:
                        zipf.writestr(f.title, raw_bytes)
                        log_messages.append(f"Warning: Image conversion failed for '{f.title}': {str(e_img)}")

                elif chk["action"] in ("CONVERT_CODE", "CONVERT_TEXT"):
                    try:
                        txt_data, txt_name = convert_code_or_text_to_compatible(raw_bytes, f.title)
                        zipf.writestr(txt_name, txt_data)
                        files_to_upload_to_drive.append({
                            "name": txt_name,
                            "data": txt_data,
                            "mime": "text/plain",
                        })
                        converted_count += 1
                        log_messages.append(f"Auto-formatted code/text: '{f.title}' ➔ '{txt_name}'")
                    except Exception:
                        zipf.writestr(f.title, raw_bytes)

                else:
                    # Default: include original
                    zipf.writestr(f.title, raw_bytes)
                    files_to_upload_to_drive.append({
                        "name": f.title,
                        "data": raw_bytes,
                        "mime": detected_mime or "application/octet-stream",
                    })
            else:
                # File already native NotebookLM format (PDF, PPTX, DOCX, TXT)
                zipf.writestr(f.title, raw_bytes)
                files_to_upload_to_drive.append({
                    "name": f.title,
                    "data": raw_bytes,
                    "mime": detected_mime or "application/octet-stream",
                })
                log_messages.append(f"Included native NotebookLM file: '{f.title}'")

    zip_bytes = zip_buffer.getvalue()
    export_id = str(uuid.uuid4())
    zip_filename = f"NotebookLM - {course.name.replace('/', '_')}.zip"

    # Cache for download
    PREPARED_EXPORTS[export_id] = {
        "filename": zip_filename,
        "data": zip_bytes,
        "timestamp": datetime.now(timezone.utc),
    }

    # Clean old cache entries (> 30 mins)
    now_utc = datetime.now(timezone.utc)
    to_delete = [
        k for k, v in PREPARED_EXPORTS.items()
        if (now_utc - v["timestamp"]).total_seconds() > 1800
    ]
    for k in to_delete:
        PREPARED_EXPORTS.pop(k, None)

    # 3. If requested, sync directly to chosen Google Drive account
    drive_folder_url = None
    drive_folder_id = None
    if payload.create_drive_folder:
        folder_name = f"NotebookLM - {course.name}"
        try:
            drive_res = create_drive_folder_and_upload(
                account=target_account,
                folder_name=folder_name,
                files_to_upload=files_to_upload_to_drive,
                session=session,
            )
            drive_folder_url = drive_res.get("folder_url")
            drive_folder_id = drive_res.get("folder_id")
            if drive_folder_url:
                log_messages.append(f"Saved to Google Drive on {target_account.email} in folder '{folder_name}'")
            else:
                log_messages.append(f"Google Drive sync skipped for {target_account.email} ({drive_res.get('error', 'Token check')}). ZIP bundle ready to download.")
        except Exception as e_drive:
            logger.warning(f"Could not upload to target Drive {target_account.email}: {e_drive}")
            log_messages.append(f"Note: Google Drive folder upload error ({str(e_drive)}). ZIP bundle is ready to download.")

    return ExportResultResponse(
        status="SUCCESS",
        course_id=course.id,
        course_name=course.name,
        target_account_email=target_account.email,
        drive_folder_url=drive_folder_url,
        drive_folder_id=drive_folder_id,
        download_url=f"/api/export/notebooklm/{export_id}/download",
        notebooklm_url="https://notebooklm.google.com/",
        total_files=len(files),
        converted_files=converted_count,
        log=log_messages,
    )

@router.get("/notebooklm/{export_id}/download")
def download_prepared_export(export_id: str):
    """Download the prepared NotebookLM zip package for a class."""
    item = PREPARED_EXPORTS.get(export_id)
    if not item:
        raise HTTPException(status_code=404, detail="Export expired or not found. Please export again.")

    import urllib.parse
    raw_name = item.get("filename", "notebooklm_export.zip")
    ascii_name = "".join(c if 32 <= ord(c) < 127 and c not in '"\\;' else '_' for c in raw_name)
    if not ascii_name.lower().endswith(".zip"):
        ascii_name += ".zip"
    encoded_name = urllib.parse.quote(raw_name)

    return StreamingResponse(
        io.BytesIO(item["data"]),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded_name}',
        },
    )

@router.post("/notebooklm/direct-download")
def direct_download_class_zip(
    payload: NotebookLMExportRequest,
    session: Session = Depends(get_session),
):
    """
    Convenience endpoint: prepares and directly streams the ZIP file in a single request.
    """
    res = export_class_to_notebooklm(payload, session)
    export_id = res.download_url.split("/")[-2]
    return download_prepared_export(export_id)
