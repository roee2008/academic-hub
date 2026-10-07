import os
import io
import json
import logging

os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
from sqlmodel import Session, select

from app.config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    GOOGLE_SCOPES,
)
from app.models import Account, Course, Assignment, File, SyncLog
from app.security import encrypt_token, decrypt_token

logger = logging.getLogger("academic_dashboard.google")

import base64
import httpx

def is_google_configured() -> bool:
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)

def get_oauth_flow() -> Flow:
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_REDIRECT_URI],
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=GOOGLE_SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
    )
    flow.autogenerate_code_verifier = False
    return flow

def get_authorization_url(account_type: str = "personal") -> tuple[str, str]:
    flow = get_oauth_flow()
    flow.autogenerate_code_verifier = False
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=json.dumps({"account_type": account_type}),
    )
    return auth_url, flow.code_verifier or ""

def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    flow = get_oauth_flow()
    flow.autogenerate_code_verifier = False
    flow.fetch_token(code=code)
    creds = flow.credentials

    email = None
    display_name = None
    avatar_url = None

    # 1. Parse OpenID Connect ID token payload
    if hasattr(creds, "id_token") and creds.id_token:
        try:
            parts = creds.id_token.split(".")
            if len(parts) >= 2:
                payload = parts[1] + "=" * (-len(parts[1]) % 4)
                data = json.loads(base64.urlsafe_b64decode(payload.encode("utf-8")))
                email = data.get("email")
                display_name = data.get("name")
                avatar_url = data.get("picture")
        except Exception as e:
            logger.warning(f"Could not decode id_token: {e}")

    # 2. Query userinfo endpoint via direct HTTP request if email not yet found
    if not email and creds.token:
        try:
            with httpx.Client() as client:
                res = client.get(
                    "https://openidconnect.googleapis.com/v1/userinfo",
                    headers={"Authorization": f"Bearer {creds.token}"},
                    timeout=10,
                )
                if res.status_code == 200:
                    info = res.json()
                    email = info.get("email")
                    display_name = display_name or info.get("name")
                    avatar_url = avatar_url or info.get("picture")
        except Exception as e:
            logger.warning(f"Could not fetch OIDC userinfo: {e}")

    # 3. Fallback to oauth2 v2 API service
    if not email:
        try:
            oauth_service = build("oauth2", "v2", credentials=creds, cache_discovery=False)
            user_info = oauth_service.userinfo().get().execute()
            email = user_info.get("email")
            display_name = display_name or user_info.get("name")
            avatar_url = avatar_url or user_info.get("picture")
        except Exception as e:
            logger.warning(f"Could not fetch oauth2 userinfo: {e}")

    if not email:
        raise ValueError("Failed to retrieve user email from Google OAuth response")

    return {
        "email": email,
        "display_name": display_name or email.split("@")[0],
        "avatar_url": avatar_url,
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_expiry": creds.expiry,
    }

_FAILED_REFRESH_COOLDOWN: Dict[str, datetime] = {}

def get_credentials(account: Account, session: Session) -> Optional[Credentials]:
    if not account.refresh_token:
        return None

    now_utc = datetime.now(timezone.utc)
    last_fail = _FAILED_REFRESH_COOLDOWN.get(account.id)
    if last_fail and (now_utc - last_fail).total_seconds() < 120:
        return None

    decrypted_refresh = decrypt_token(account.refresh_token)
    decrypted_access = decrypt_token(account.access_token)

    creds = Credentials(
        token=decrypted_access,
        refresh_token=decrypted_refresh,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=None,
    )

    # Automatic token refresher: verify validity and refresh expired credentials on the fly
    token_exp = account.token_expiry
    if token_exp and token_exp.tzinfo is None:
        token_exp = token_exp.replace(tzinfo=timezone.utc)
    if creds.expired or (token_exp and token_exp <= now_utc + timedelta(minutes=2)):
        try:
            logger.info(f"Refreshing expired Google OAuth token for {account.email}...")
            creds.refresh(Request())
            account.access_token = encrypt_token(creds.token)
            if creds.expiry:
                account.token_expiry = creds.expiry
            session.add(account)
            session.commit()
            session.refresh(account)
            logger.info(f"Token refresh successful for {account.email}")
        except Exception as e:
            logger.error(f"Failed to refresh token for {account.email}: {e}")
            _FAILED_REFRESH_COOLDOWN[account.id] = now_utc
            return None

    return creds

def get_classroom_service(creds: Credentials):
    return build("classroom", "v1", credentials=creds, cache_discovery=False)

def get_drive_service(creds: Credentials):
    return build("drive", "v3", credentials=creds, cache_discovery=False)

def _save_file_record(
    file_id: str,
    title: str,
    link: Optional[str],
    course_id: str,
    account_id: str,
    session: Session,
    assignment_id: Optional[str] = None,
    mime_type: Optional[str] = None,
    size_bytes: Optional[int] = None,
    source: str = "CLASSROOM",
) -> bool:
    """Helper to upsert a file record found in Classroom or Drive."""
    if not file_id:
        return False

    if mime_type == "application/vnd.google-apps.folder":
        return False

    if not mime_type:
        lowered = title.lower()
        if ".pdf" in lowered:
            mime_type = "application/pdf"
        elif ".docx" in lowered or ".doc" in lowered:
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif ".xlsx" in lowered or ".xls" in lowered:
            mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif ".pptx" in lowered or ".ppt" in lowered:
            mime_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        elif ".jpg" in lowered or ".jpeg" in lowered:
            mime_type = "image/jpeg"
        elif ".png" in lowered:
            mime_type = "image/png"
        else:
            mime_type = "application/octet-stream"

    existing = session.exec(select(File).where(File.drive_file_id == file_id)).first()
    is_new = False
    if not existing:
        is_new = True
        new_file = File(
            id=f"file_{file_id}",
            account_id=account_id,
            course_id=course_id,
            assignment_id=assignment_id,
            title=title,
            mime_type=mime_type,
            drive_file_id=file_id,
            drive_preview_link=f"https://drive.google.com/file/d/{file_id}/preview",
            drive_web_view_link=link or f"https://drive.google.com/file/d/{file_id}/view",
            size_bytes=size_bytes,
            source=source,
            synced_at=datetime.now(timezone.utc),
        )
        session.add(new_file)
    else:
        existing.title = title
        if size_bytes is not None:
            existing.size_bytes = size_bytes
        if mime_type:
            existing.mime_type = mime_type
        if assignment_id and not existing.assignment_id:
            existing.assignment_id = assignment_id
        if link:
            existing.drive_web_view_link = link
        session.add(existing)
    session.commit()
    return is_new

def sync_account_classroom(account: Account, session: Session) -> int:
    """Sync courses, courseWork, course materials, announcements, and submissions."""
    if account.id.startswith("acc_") and "demo" in account.id:
        # Demo mode simulated sync
        logger.info(f"Demo sync executed for {account.email}")
        account.last_synced_at = datetime.now(timezone.utc)
        session.add(account)
        session.commit()
        return 0

    creds = get_credentials(account, session)
    if not creds:
        logger.warning(f"Could not retrieve valid credentials for {account.email}")
        return 0

    classroom = get_classroom_service(creds)
    drive_service = None
    try:
        drive_service = get_drive_service(creds)
    except Exception:
        pass

    def _get_drive_file_meta(f_id: Optional[str]) -> tuple[Optional[int], Optional[str]]:
        if not drive_service or not f_id:
            return None, None
        try:
            res = drive_service.files().get(fileId=f_id, fields="size, mimeType").execute()
            s_val = res.get("size")
            return int(s_val) if s_val else None, res.get("mimeType")
        except Exception:
            return None, None

    items_updated = 0

    try:
        # 1. Fetch courses
        courses_res = classroom.courses().list(studentId="me", courseStates=["ACTIVE"]).execute()
        courses_list = courses_res.get("courses", [])

        colors = ["#6366F1", "#10B981", "#F59E0B", "#8B5CF6", "#06B6D4"]

        for idx, c_data in enumerate(courses_list):
            course_id = str(c_data.get("id"))
            existing_course = session.exec(select(Course).where(Course.id == course_id)).first()

            if not existing_course:
                existing_course = Course(
                    id=course_id,
                    account_id=account.id,
                    name=c_data.get("name", "Untitled Course"),
                    section=c_data.get("section"),
                    alternate_link=c_data.get("alternateLink"),
                    color_tag=colors[idx % len(colors)],
                    drive_folder_id=None,
                    drive_folder_name=None,
                )
                session.add(existing_course)
                items_updated += 1
            else:
                existing_course.name = c_data.get("name", existing_course.name)
                existing_course.section = c_data.get("section", existing_course.section)
                existing_course.alternate_link = c_data.get("alternateLink", existing_course.alternate_link)
                session.add(existing_course)
            session.commit()

            # If user permanently hid/unenrolled from this course, do not pull coursework/materials/announcements
            if existing_course.is_hidden:
                continue

            # 2. Delta fetch CourseWork (Assignments)
            try:
                coursework_res = classroom.courses().courseWork().list(
                    courseId=course_id,
                    courseWorkStates=["PUBLISHED"],
                    pageSize=50
                ).execute()
                coursework_items = coursework_res.get("courseWork", [])
            except Exception as e:
                logger.warning(f"Could not list courseWork for course {course_id}: {e}")
                coursework_items = []

            for cw in coursework_items:
                asgn_id = str(cw.get("id"))
                existing_asgn = session.exec(select(Assignment).where(Assignment.id == asgn_id)).first()

                # Calculate due datetime
                due_datetime = None
                due_date = cw.get("dueDate")
                due_time = cw.get("dueTime")
                if due_date:
                    year = due_date.get("year", datetime.now(timezone.utc).year)
                    month = due_date.get("month", 1)
                    day = due_date.get("day", 1)
                    hour = due_time.get("hours", 23) if due_time else 23
                    minute = due_time.get("minutes", 59) if due_time else 59
                    try:
                        due_datetime = datetime(year, month, day, hour, minute, tzinfo=timezone.utc)
                    except Exception:
                        due_datetime = None

                title = cw.get("title", "Untitled Assignment")
                desc = cw.get("description", "")
                link = cw.get("alternateLink")

                # Fetch student submission state and attachments
                sub_state = "NEW"
                subs = []
                try:
                    subs_res = classroom.courses().courseWork().studentSubmissions().list(
                        courseId=course_id,
                        courseWorkId=asgn_id,
                        userId="me"
                    ).execute()
                    subs = subs_res.get("studentSubmissions", [])
                    if subs:
                        sub_state = subs[0].get("state", "NEW")
                except Exception as ex:
                    logger.debug(f"Could not fetch student submission for {asgn_id}: {ex}")

                # Default mapped status
                calculated_status = "DONE" if sub_state in ["TURNED_IN", "RETURNED"] else "TODO"

                if not existing_asgn:
                    new_asgn = Assignment(
                        id=asgn_id,
                        course_id=course_id,
                        account_id=account.id,
                        title=title,
                        description=desc,
                        due_datetime=due_datetime,
                        source="CLASSROOM",
                        status=calculated_status,
                        priority="MEDIUM",
                        google_submission_state=sub_state,
                        web_link=link,
                        updated_at=datetime.now(timezone.utc),
                    )
                    session.add(new_asgn)
                    items_updated += 1
                else:
                    existing_asgn.title = title
                    existing_asgn.description = desc
                    existing_asgn.web_link = link
                    existing_asgn.due_datetime = due_datetime
                    existing_asgn.google_submission_state = sub_state
                    if not existing_asgn.local_override:
                        existing_asgn.status = calculated_status
                    session.add(existing_asgn)

                session.commit()

                # Materials on assignment
                materials = cw.get("materials", [])
                for mat in materials:
                    drive_file_data = mat.get("driveFile", {}).get("driveFile")
                    if drive_file_data:
                        f_id = drive_file_data.get("id")
                        f_size, f_mime = _get_drive_file_meta(f_id)
                        if _save_file_record(
                            file_id=f_id,
                            title=drive_file_data.get("title", "Untitled File"),
                            link=drive_file_data.get("alternateLink"),
                            course_id=course_id,
                            account_id=account.id,
                            session=session,
                            assignment_id=asgn_id,
                            mime_type=f_mime,
                            size_bytes=f_size,
                            source="CLASSROOM",
                        ):
                            items_updated += 1

                # Attachments in student submissions
                for sub in subs:
                    asgn_sub = sub.get("assignmentSubmission", {})
                    for att in asgn_sub.get("attachments", []):
                        df = att.get("driveFile")
                        if df:
                            f_id = df.get("id")
                            f_size, f_mime = _get_drive_file_meta(f_id)
                            if _save_file_record(
                                file_id=f_id,
                                title=df.get("title", "Submitted Attachment"),
                                link=df.get("alternateLink"),
                                course_id=course_id,
                                account_id=account.id,
                                session=session,
                                assignment_id=asgn_id,
                                mime_type=f_mime,
                                size_bytes=f_size,
                                source="CLASSROOM",
                            ):
                                items_updated += 1

            # 3. Fetch CourseWorkMaterials (lecture slides, notes, handouts)
            try:
                cwm_res = classroom.courses().courseWorkMaterials().list(
                    courseId=course_id,
                    courseWorkMaterialStates=["PUBLISHED"],
                    pageSize=50
                ).execute()
                for cwm in cwm_res.get("courseWorkMaterial", []):
                    cwm_title = cwm.get("title", "Course Material")
                    for mat in cwm.get("materials", []):
                        drive_file_data = mat.get("driveFile", {}).get("driveFile")
                        if drive_file_data:
                            f_id = drive_file_data.get("id")
                            f_size, f_mime = _get_drive_file_meta(f_id)
                            if _save_file_record(
                                file_id=f_id,
                                title=drive_file_data.get("title") or cwm_title,
                                link=drive_file_data.get("alternateLink"),
                                course_id=course_id,
                                account_id=account.id,
                                session=session,
                                assignment_id=None,
                                mime_type=f_mime,
                                size_bytes=f_size,
                                source="CLASSROOM",
                            ):
                                items_updated += 1
            except Exception as ex:
                err_text = str(ex)
                if "ACCESS_TOKEN_SCOPE_INSUFFICIENT" in err_text or "insufficient authentication scopes" in err_text:
                    logger.warning(
                        f"Insufficient scopes to fetch CourseWorkMaterials for account {account.email}. "
                        "Account needs to reconnect to grant classroom.courseworkmaterials.readonly."
                    )
                    account.needs_reconnect = True
                    session.add(account)
                    session.commit()
                else:
                    logger.debug(f"CourseWorkMaterials fetch error for course {course_id}: {ex}")

            # 4. Fetch Course Announcements (files shared in class announcements)
            try:
                ann_res = classroom.courses().announcements().list(
                    courseId=course_id,
                    announcementStates=["PUBLISHED"],
                    pageSize=30
                ).execute()
                for ann in ann_res.get("announcements", []):
                    for mat in ann.get("materials", []):
                        drive_file_data = mat.get("driveFile", {}).get("driveFile")
                        if drive_file_data:
                            f_id = drive_file_data.get("id")
                            f_size, f_mime = _get_drive_file_meta(f_id)
                            if _save_file_record(
                                file_id=f_id,
                                title=drive_file_data.get("title", "Announcement File"),
                                link=drive_file_data.get("alternateLink"),
                                course_id=course_id,
                                account_id=account.id,
                                session=session,
                                assignment_id=None,
                                mime_type=f_mime,
                                size_bytes=f_size,
                                source="CLASSROOM",
                            ):
                                items_updated += 1
            except Exception as ex:
                err_text = str(ex)
                if "ACCESS_TOKEN_SCOPE_INSUFFICIENT" in err_text or "insufficient authentication scopes" in err_text:
                    account.needs_reconnect = True
                    session.add(account)
                    session.commit()
                else:
                    logger.debug(f"Announcements fetch error for course {course_id}: {ex}")

    except Exception as e:
        logger.error(f"Error syncing Classroom for {account.email}: {e}")
        raise e

    return items_updated

def get_drive_folder_metadata(folder_id: str, account: Account, session: Session) -> Optional[dict]:
    """Retrieve metadata such as title/name for a given Google Drive folder."""
    if account.id.startswith("acc_") and "demo" in account.id:
        return {"id": folder_id, "name": "Demo Course Materials"}
    creds = get_credentials(account, session)
    if not creds:
        return None
    try:
        drive = get_drive_service(creds)
        res = drive.files().get(fileId=folder_id, fields="id, name, mimeType").execute()
        return res
    except Exception as e:
        logger.warning(f"Failed to get Drive folder metadata for {folder_id}: {e}")
        return None

def sync_course_drive_folder(course: Course, session: Session) -> int:
    """Recursively sync files inside a course's explicitly linked Google Drive folder."""
    if not course.drive_folder_id:
        return 0

    account = session.exec(select(Account).where(Account.id == course.account_id)).first()
    if not account:
        return 0

    if account.id.startswith("acc_") and "demo" in account.id:
        return 0

    creds = get_credentials(account, session)
    if not creds:
        return 0

    drive = get_drive_service(creds)

    def _sync_folder_recursive(folder_id: str, course_id: str, depth: int = 0) -> int:
        if depth > 3:
            return 0
        count = 0
        try:
            query = f"'{folder_id}' in parents and trashed = false"
            response = drive.files().list(
                q=query,
                pageSize=100,
                fields="files(id, name, mimeType, webViewLink, size)"
            ).execute()
            for d_file in response.get("files", []):
                if d_file.get("mimeType") == "application/vnd.google-apps.folder":
                    count += _sync_folder_recursive(d_file["id"], course_id, depth + 1)
                else:
                    if _save_file_record(
                        file_id=d_file.get("id"),
                        title=d_file.get("name", "Drive File"),
                        link=d_file.get("webViewLink"),
                        course_id=course_id,
                        account_id=account.id,
                        session=session,
                        assignment_id=None,
                        mime_type=d_file.get("mimeType"),
                        size_bytes=int(d_file.get("size", 0)) if d_file.get("size") else None,
                        source="DRIVE_FOLDER",
                    ):
                        count += 1
        except Exception as e_rf:
            logger.warning(f"Error recursively syncing Drive folder {folder_id} for course {course_id}: {e_rf}")
        return count

    logger.info(f"Syncing explicitly linked Drive folder '{course.drive_folder_name or course.drive_folder_id}' for course '{course.name}'")
    return _sync_folder_recursive(course.drive_folder_id, course.id)

def sync_account_drive(account: Account, session: Session) -> int:
    """Sync Google Drive files ONLY for courses with explicitly user-linked Drive folders."""
    if account.id.startswith("acc_") and "demo" in account.id:
        return 0

    creds = get_credentials(account, session)
    if not creds:
        return 0

    items_updated = 0

    try:
        # Strictly query only courses that have an explicitly assigned Google Drive folder ID
        courses_with_drive = session.exec(
            select(Course).where(
                Course.account_id == account.id,
                Course.drive_folder_id != None
            )
        ).all()

        for course in courses_with_drive:
            if course.is_hidden:
                continue
            if course.drive_folder_id:
                synced_count = sync_course_drive_folder(course, session)
                items_updated += synced_count

        # Update Drive startPageToken for Delta tracking if needed
        if not account.drive_start_page_token:
            try:
                drive = get_drive_service(creds)
                token_res = drive.changes().getStartPageToken().execute()
                account.drive_start_page_token = token_res.get("startPageToken")
                session.add(account)
                session.commit()
            except Exception:
                pass

    except Exception as e:
        error_str = str(e)
        if "accessNotConfigured" in error_str or "SERVICE_DISABLED" in error_str or "403" in error_str:
            logger.warning(
                f"Google Drive API is disabled or not permitted for {account.email}. "
                "Enable it at https://console.developers.google.com/apis/api/drive.googleapis.com/overview"
            )
            return items_updated
        logger.error(f"Error syncing Drive for {account.email}: {e}")
        raise e

    return items_updated

def download_file_stream(file_obj: File, session: Session) -> tuple[io.BytesIO, str]:
    """Download/Stream raw media from Google Drive using the authenticated credentials."""
    account = session.exec(select(Account).where(Account.id == file_obj.account_id)).first()
    if not account:
        raise ValueError("Account not found for file")

    if account.id.startswith("acc_") and "demo" in account.id:
        # Mock file buffer for demo mode
        sample_text = f"Sample file content for {file_obj.title}\nCourse ID: {file_obj.course_id}\nDrive File ID: {file_obj.drive_file_id}"
        buf = io.BytesIO(sample_text.encode("utf-8"))
        return buf, file_obj.mime_type or "text/plain"

    creds = get_credentials(account, session)
    if not creds:
        logger.warning(f"Could not obtain credentials for {account.email}; using fallback buffer.")
        buf = io.BytesIO(f"Academic resource content for {file_obj.title}\nCourse ID: {file_obj.course_id}".encode("utf-8"))
        return buf, file_obj.mime_type or "text/plain"

    try:
        drive = get_drive_service(creds)
        request = drive.files().get_media(fileId=file_obj.drive_file_id)
        file_stream = io.BytesIO()
        downloader = MediaIoBaseDownload(file_stream, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        file_stream.seek(0)
        return file_stream, file_obj.mime_type or "application/octet-stream"
    except Exception as e:
        logger.warning(f"Failed to download {file_obj.title} via Drive: {e}. Using fallback buffer.")
        buf = io.BytesIO(f"Resource content for {file_obj.title}\nCourse ID: {file_obj.course_id}".encode("utf-8"))
        return buf, file_obj.mime_type or "text/plain"

def create_drive_folder_and_upload(
    account: Account,
    folder_name: str,
    files_to_upload: List[Dict[str, Any]],
    session: Session,
) -> Dict[str, Any]:
    """
    Creates a dedicated folder in the target Google Account's Drive and uploads
    the specified files (with converted names, bytes, and MIME types).
    """
    if account.id.startswith("acc_") and "demo" in account.id:
        # Mock Google Drive folder creation for demo mode
        mock_folder_id = f"demo_folder_{folder_name.lower().replace(' ', '_')[:30]}"
        return {
            "folder_id": mock_folder_id,
            "folder_url": f"https://drive.google.com/drive/folders/{mock_folder_id}",
            "uploaded_count": len(files_to_upload),
            "is_demo": True,
        }

    creds = get_credentials(account, session)
    if not creds:
        return {
            "folder_id": None,
            "folder_url": None,
            "uploaded_count": 0,
            "error": f"Valid Google credentials could not be obtained for {account.email}",
        }

    drive = get_drive_service(creds)

    # 1. Look for existing folder or create new one
    folder_id = None
    folder_url = None
    try:
        query = f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        res = drive.files().list(q=query, spaces='drive', fields='files(id, webViewLink)').execute()
        files = res.get('files', [])
        if files:
            folder_id = files[0]['id']
            folder_url = files[0].get('webViewLink')
    except Exception as e:
        logger.warning(f"Error checking existing folder '{folder_name}': {e}")

    if not folder_id:
        try:
            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder',
            }
            new_folder = drive.files().create(body=folder_metadata, fields='id, webViewLink').execute()
            folder_id = new_folder['id']
            folder_url = new_folder.get('webViewLink')
        except Exception as e:
            logger.error(f"Failed to create Google Drive folder '{folder_name}' on account {account.email}: {e}")
            raise e

    # 2. Upload files into the folder
    uploaded_count = 0
    for item in files_to_upload:
        fname = item['name']
        fdata = item['data']
        fmime = item.get('mime', 'application/octet-stream')

        try:
            media = MediaIoBaseUpload(io.BytesIO(fdata), mimetype=fmime, resumable=False)
            file_metadata = {
                'name': fname,
                'parents': [folder_id],
            }
            drive.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, webViewLink',
            ).execute()
            uploaded_count += 1
        except Exception as e:
            logger.warning(f"Error uploading '{fname}' to Drive folder '{folder_name}': {e}")

    return {
        "folder_id": folder_id,
        "folder_url": folder_url or f"https://drive.google.com/drive/folders/{folder_id}",
        "uploaded_count": uploaded_count,
        "is_demo": False,
    }

