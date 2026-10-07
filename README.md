# Nexus Academic Hub — Unified Multi-Account Academic Dashboard

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/roee2008/academic-hub)

A full-stack academic dashboard that aggregates school data across multiple Google accounts (e.g. personal and institutional `.edu` Google Workspace accounts), consolidating Google Classroom assignments, Google Drive course folders, local task management, and weekly bell schedules into a single dark-mode workspace.

---

## Key Features

- **Multi-Account OAuth & Token Vault:** Connect 2 or more Google accounts simultaneously. Sensitive tokens are stored in SQLite encrypted at rest using Fernet symmetric encryption. Auto-refreshes expiring tokens on the fly.
- **Synchronization Engine (60s loop + Instant Refresh):**
  - Continuous delta sync worker protected by an `asyncio.Lock` execution mutex.
  - Classroom v1 delta querying with modification timestamps.
  - Google Drive Changes API (`drive.changes.list` with start page token) avoiding heavy recursive folder tree scans.
  - "Instant Refresh" button triggering immediate delta ingestion with real-time UI status updates.
- **Unified Course Resource Hub & In-App Viewer:**
  - Normalizes Classroom coursework materials (`courseWork.materials`) and course-assigned Google Drive folders into a unified file table.
  - In-app Google Drive preview iframe (`https://drive.google.com/file/d/{id}/preview`).
  - Authenticated backend streaming proxy (`/api/files/{id}/download`) for raw file downloads.
- **Custom Homework & Task Tracker:**
  - Merges native Google Classroom coursework with custom user-created items.
  - Local overrides: user status (`TODO`, `IN_PROGRESS`, `DONE`) and priority tags (`URGENT`, `HIGH`, `MED`, `LOW`) are preserved against remote updates.
  - Filtering by course, account, source, status, and nearest deadline sort.
- **Class Timetable & Bell Schedule:**
  - Weekly recurring timetable grid with course chromatic tags and room locations.
  - "Today's Schedule & Focus" dashboard view displaying today's classes side-by-side with homework due for those specific subjects.
- **Keyboard-First Omnibox (`Cmd+K` / `Ctrl+K`):** Instant search across all courses, assignments, and documents with keyboard navigation.
- **Pre-Seeded Demo Mode:** Comes with realistic Stanford `.edu` and Personal Google accounts pre-loaded for immediate testing and demonstration.

---

## Tech Stack

- **Backend:** Python 3.12 (FastAPI, SQLModel / SQLAlchemy, Pydantic, Cryptography Fernet, Google API Python Client).
- **Database:** SQLite in WAL mode (`PRAGMA journal_mode=WAL;`).
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide Icons + date-fns.
- **Design System:** Strictly built according to `DESIGN.md` (Base Canvas `#0B0F17`, Surface 1 `#111827`, Surface 2 `#1A2234`, Stroke `#243048`, and course chromatics).

---

## Quick Start

### 1. Backend Server
```powershell
# In root directory:
.\backend\venv\Scripts\uvicorn.exe main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 2. Frontend Application
```powershell
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Google Cloud OAuth 2.0 Setup (For Live Accounts)

To link your real personal and institutional Google accounts:

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable the following APIs in **APIs & Services > Library**:
   - **Google Classroom API**
   - **Google Drive API**
4. Configure the **OAuth Consent Screen** (External or Internal for Google Workspace) with scopes:
   - `https://www.googleapis.com/auth/classroom.courses.readonly`
   - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
   - `https://www.googleapis.com/auth/classroom.student-submissions.me.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.file`
   - `openid`, `email`, `profile`
5. Create **OAuth 2.0 Client ID (Web application)**:
   - Authorized redirect URIs: `http://localhost:8000/api/auth/google/callback`
6. Copy `backend/.env.example` to `backend/.env` and paste your credentials:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
   ```
7. In the app, click **Accounts & Sync > Connect .EDU Workspace** or **Connect Personal Account**.

---

## Running Tests

Run backend integration and unit tests:
```powershell
.\backend\venv\Scripts\pytest.exe backend/tests/ -v
```
Build frontend assets:
```powershell
cd frontend
npm run build
```
