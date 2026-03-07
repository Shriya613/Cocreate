from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import aiosqlite

from app.database import get_db
from app.services import app_service, llm_client
from app.services.generator import build_app

router = APIRouter(prefix="/api/apps", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    message_id: str
    app_id: str
    version_id: str | None = None
    version_number: int | None = None
    success: bool
    reply: str


@router.get("/{app_id}/chat")
async def get_chat(app_id: str, db: aiosqlite.Connection = Depends(get_db)):
    app = await app_service.get_app(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    return await app_service.get_chat_history(db, app_id)


@router.post("/{app_id}/chat", response_model=ChatResponse)
async def send_message(
    app_id: str, req: ChatRequest, db: aiosqlite.Connection = Depends(get_db)
):
    app = await app_service.get_app(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    active_version = await app_service.get_active_version(db, app_id)
    if not active_version:
        raise HTTPException(status_code=400, detail="No active version found")

    # Save user message
    user_msg = await app_service.add_chat_message(db, app_id, "user", req.message)

    # Get history for context
    history = await app_service.get_chat_history(db, app_id)
    history_dicts = [{"role": m["role"], "content": m["content"]} for m in history]

    # Generate updated code
    new_code = await llm_client.iterate_app_code(
        active_version["code"], req.message, history_dicts
    )

    # Build the updated app
    success, result = await build_app(app_id, "", new_code)

    if not success:
        reply = f"I tried to apply your change but the build failed: {result[:200]}. Please try rephrasing."
        await app_service.add_chat_message(db, app_id, "assistant", reply)
        return ChatResponse(
            message_id=user_msg["id"],
            app_id=app_id,
            success=False,
            reply=reply,
        )

    # Save new version
    next_v = await app_service.get_next_version_number(db, app_id)
    version = await app_service.create_version(db, app_id, new_code, req.message, next_v)
    await app_service.update_app_timestamp(db, app_id)

    reply = f"Done! I've applied your change (v{next_v})."
    await app_service.add_chat_message(db, app_id, "assistant", reply)

    return ChatResponse(
        message_id=user_msg["id"],
        app_id=app_id,
        version_id=version["id"],
        version_number=next_v,
        success=True,
        reply=reply,
    )
