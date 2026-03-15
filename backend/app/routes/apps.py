import io
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import aiosqlite

from app.database import get_db
from app.services import app_service
from app.services.generator import delete_app_files, get_app_dist_dir, build_app

router = APIRouter(prefix="/api/apps", tags=["apps"])


@router.get("")
async def list_apps(db: aiosqlite.Connection = Depends(get_db)):
    apps = await app_service.list_apps(db)
    result = []
    for app in apps:
        active = await app_service.get_active_version(db, app["id"])
        result.append({
            **app,
            "has_build": get_app_dist_dir(app["id"]).exists(),
            "active_version": active["version_number"] if active else None,
        })
    return result


@router.get("/{app_id}")
async def get_app(app_id: str, db: aiosqlite.Connection = Depends(get_db)):
    app = await app_service.get_app(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    active = await app_service.get_active_version(db, app_id)
    return {
        **app,
        "has_build": get_app_dist_dir(app_id).exists(),
        "active_version": active["version_number"] if active else None,
        "active_code": active["code"] if active else None,
    }


@router.delete("/{app_id}")
async def delete_app(app_id: str, db: aiosqlite.Connection = Depends(get_db)):
    app = await app_service.get_app(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    await app_service.delete_app(db, app_id)
    delete_app_files(app_id)
    return {"ok": True}


@router.get("/{app_id}/versions")
async def list_versions(app_id: str, db: aiosqlite.Connection = Depends(get_db)):
    app = await app_service.get_app(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    return await app_service.list_versions(db, app_id)


@router.get("/{app_id}/export")
async def export_app(app_id: str, db: aiosqlite.Connection = Depends(get_db)):
    app = await app_service.get_app(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    dist_dir = get_app_dist_dir(app_id)
    if not dist_dir.exists():
        raise HTTPException(status_code=404, detail="App has not been built yet")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in Path(dist_dir).rglob("*"):
            if file.is_file():
                zf.write(file, file.relative_to(dist_dir))
    buf.seek(0)

    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in app["name"])
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.zip"'},
    )


class RestoreRequest(BaseModel):
    version_id: str


@router.post("/{app_id}/restore")
async def restore_version(
    app_id: str, req: RestoreRequest, db: aiosqlite.Connection = Depends(get_db)
):
    version = await app_service.get_version(db, req.version_id)
    if not version or version["app_id"] != app_id:
        raise HTTPException(status_code=404, detail="Version not found")

    # Rebuild from this version's code
    success, result = await build_app(app_id, req.version_id, version["code"])
    if not success:
        raise HTTPException(status_code=500, detail=f"Build failed: {result}")

    await app_service.set_active_version(db, app_id, req.version_id)
    await app_service.update_app_timestamp(db, app_id)
    return {"ok": True, "version_number": version["version_number"]}
