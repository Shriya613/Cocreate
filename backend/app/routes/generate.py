from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import aiosqlite

from app.database import get_db
from app.services import app_service, llm_client
from app.services.generator import build_app

router = APIRouter(prefix="/api/generate", tags=["generate"])


class GenerateRequest(BaseModel):
    description: str
    name: str = ""


class GenerateResponse(BaseModel):
    app_id: str
    version_id: str
    name: str
    success: bool
    error: str | None = None


@router.post("", response_model=GenerateResponse)
async def generate_app(req: GenerateRequest, db: aiosqlite.Connection = Depends(get_db)):
    description = req.description.strip()
    if not description:
        raise HTTPException(status_code=400, detail="Description cannot be empty")

    name = req.name.strip() or _derive_name(description)

    # 1. Create app record
    app = await app_service.create_app(db, name, description)
    app_id = app["id"]

    # 2. Generate code via LLM
    code = await llm_client.generate_app_code(description)

    # 3. Build the app
    success, result = await build_app(app_id, "", code)

    if not success:
        # Store version even on failure so user can retry
        await app_service.create_version(db, app_id, code, description, 1)
        return GenerateResponse(app_id=app_id, version_id="", name=name, success=False, error=result)

    # 4. Save version
    version = await app_service.create_version(db, app_id, result if isinstance(result, str) else code, description, 1)

    return GenerateResponse(app_id=app_id, version_id=version["id"], name=name, success=True)


def _derive_name(description: str) -> str:
    words = description.split()
    return " ".join(words[:4]).title()
