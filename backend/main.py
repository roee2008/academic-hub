import os
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.sync_engine import sync_engine
from app.routers import (
    auth,
    assignments,
    courses,
    files,
    timetable,
    sync,
    export,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("academic_dashboard")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing SQLite database with WAL mode...")
    init_db()
    logger.info("Starting background synchronization engine...")
    await sync_engine.start()
    yield
    # Shutdown
    logger.info("Stopping background synchronization engine...")
    await sync_engine.stop()

app = FastAPI(
    title="Unified Academic Dashboard API",
    description="Multi-account Google Classroom, Google Drive, Homework & Timetable aggregator",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for local development and frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(assignments.router)
app.include_router(courses.router)
app.include_router(files.router)
app.include_router(timetable.router)
app.include_router(sync.router)
app.include_router(export.router)

from fastapi.staticfiles import StaticFiles

dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.isdir(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")
else:
    @app.get("/")
    def read_root():
        return {
            "service": "Unified Academic Dashboard API",
            "status": "ONLINE",
            "docs": "/docs",
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
