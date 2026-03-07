import uuid
from datetime import datetime, timezone

import aiosqlite


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def create_app(db: aiosqlite.Connection, name: str, description: str) -> dict:
    app_id = str(uuid.uuid4())
    now = _now()
    await db.execute(
        "INSERT INTO apps (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (app_id, name, description, now, now),
    )
    await db.commit()
    return {"id": app_id, "name": name, "description": description, "created_at": now, "updated_at": now}


async def get_app(db: aiosqlite.Connection, app_id: str) -> dict | None:
    async with db.execute("SELECT * FROM apps WHERE id = ?", (app_id,)) as cursor:
        row = await cursor.fetchone()
        return dict(row) if row else None


async def list_apps(db: aiosqlite.Connection) -> list[dict]:
    async with db.execute("SELECT * FROM apps ORDER BY updated_at DESC") as cursor:
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def delete_app(db: aiosqlite.Connection, app_id: str):
    await db.execute("DELETE FROM chat_messages WHERE app_id = ?", (app_id,))
    await db.execute("DELETE FROM app_versions WHERE app_id = ?", (app_id,))
    await db.execute("DELETE FROM apps WHERE id = ?", (app_id,))
    await db.commit()


async def update_app_timestamp(db: aiosqlite.Connection, app_id: str):
    await db.execute("UPDATE apps SET updated_at = ? WHERE id = ?", (_now(), app_id))
    await db.commit()


async def create_version(
    db: aiosqlite.Connection,
    app_id: str,
    code: str,
    prompt: str,
    version_number: int,
) -> dict:
    version_id = str(uuid.uuid4())
    now = _now()
    # Deactivate previous versions
    await db.execute(
        "UPDATE app_versions SET is_active = 0 WHERE app_id = ?", (app_id,)
    )
    await db.execute(
        "INSERT INTO app_versions (id, app_id, version_number, code, prompt, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
        (version_id, app_id, version_number, code, prompt, now),
    )
    await db.commit()
    return {
        "id": version_id,
        "app_id": app_id,
        "version_number": version_number,
        "code": code,
        "prompt": prompt,
        "created_at": now,
        "is_active": 1,
    }


async def get_active_version(db: aiosqlite.Connection, app_id: str) -> dict | None:
    async with db.execute(
        "SELECT * FROM app_versions WHERE app_id = ? AND is_active = 1 ORDER BY version_number DESC LIMIT 1",
        (app_id,),
    ) as cursor:
        row = await cursor.fetchone()
        return dict(row) if row else None


async def get_version(db: aiosqlite.Connection, version_id: str) -> dict | None:
    async with db.execute("SELECT * FROM app_versions WHERE id = ?", (version_id,)) as cursor:
        row = await cursor.fetchone()
        return dict(row) if row else None


async def list_versions(db: aiosqlite.Connection, app_id: str) -> list[dict]:
    async with db.execute(
        "SELECT id, app_id, version_number, prompt, created_at, is_active FROM app_versions WHERE app_id = ? ORDER BY version_number DESC",
        (app_id,),
    ) as cursor:
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def set_active_version(db: aiosqlite.Connection, app_id: str, version_id: str):
    await db.execute("UPDATE app_versions SET is_active = 0 WHERE app_id = ?", (app_id,))
    await db.execute("UPDATE app_versions SET is_active = 1 WHERE id = ?", (version_id,))
    await db.commit()


async def get_next_version_number(db: aiosqlite.Connection, app_id: str) -> int:
    async with db.execute(
        "SELECT MAX(version_number) as max_v FROM app_versions WHERE app_id = ?", (app_id,)
    ) as cursor:
        row = await cursor.fetchone()
        max_v = row["max_v"] if row and row["max_v"] is not None else 0
        return max_v + 1


async def add_chat_message(
    db: aiosqlite.Connection, app_id: str, role: str, content: str
) -> dict:
    msg_id = str(uuid.uuid4())
    now = _now()
    await db.execute(
        "INSERT INTO chat_messages (id, app_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        (msg_id, app_id, role, content, now),
    )
    await db.commit()
    return {"id": msg_id, "app_id": app_id, "role": role, "content": content, "created_at": now}


async def get_chat_history(db: aiosqlite.Connection, app_id: str) -> list[dict]:
    async with db.execute(
        "SELECT * FROM chat_messages WHERE app_id = ? ORDER BY created_at ASC",
        (app_id,),
    ) as cursor:
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
