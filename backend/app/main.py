import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import init_db
from app.config import APPS_DIR, FRONTEND_DIST
from app.routes import generate, apps, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    Path(APPS_DIR).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="CoCreate API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router)
app.include_router(apps.router)
app.include_router(chat.router)

# ── Serve generated app dist files ──────────────────────────────────────────
apps_dir = Path(APPS_DIR)


@app.get("/apps/{app_id}/dist/{rest_of_path:path}")
async def serve_generated_asset(app_id: str, rest_of_path: str):
    file_path = apps_dir / app_id / "dist" / rest_of_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    return FileResponse(str(apps_dir / app_id / "dist" / "index.html"))


@app.get("/apps/{app_id}/preview")
async def serve_generated_app(app_id: str):
    index = apps_dir / app_id / "dist" / "index.html"
    if index.exists():
        return FileResponse(str(index))
    raise HTTPException(status_code=404, detail="App not built yet")


@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Serve the CoCreate frontend (production) ─────────────────────────────────
# Mounts AFTER all API routes so /api/* is never shadowed.
if FRONTEND_DIST and Path(FRONTEND_DIST).is_dir():
    frontend_dist = Path(FRONTEND_DIST)

    # Serve static assets (JS/CSS/icons)
    app.mount(
        "/assets",
        StaticFiles(directory=str(frontend_dist / "assets")),
        name="frontend-assets",
    )

    # Serve favicon and any other root-level static files
    @app.get("/favicon.svg")
    async def favicon():
        return FileResponse(str(frontend_dist / "favicon.svg"))

    # SPA catch-all: every unmatched route returns index.html
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        index = frontend_dist / "index.html"
        if index.exists():
            return FileResponse(str(index))
        raise HTTPException(status_code=404, detail="Frontend not found")
