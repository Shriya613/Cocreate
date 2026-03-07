import asyncio
import shutil
import subprocess
import os
import json
from pathlib import Path

from app.config import APPS_DIR, TEMPLATE_DIR, MAX_BUILD_RETRIES
from app.services.llm_client import fix_build_error


async def build_app(app_id: str, version_id: str, code: str) -> tuple[bool, str]:
    """
    Copy the Vite template, inject the generated App.tsx, run npm build.
    Returns (success, error_message).
    """
    build_dir = Path(APPS_DIR) / app_id / "build_tmp"
    dist_dir = Path(APPS_DIR) / app_id / "dist"

    # Clean up any previous build attempt
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir(parents=True, exist_ok=True)

    # Copy template
    shutil.copytree(TEMPLATE_DIR, build_dir, dirs_exist_ok=True)

    current_code = code

    for attempt in range(MAX_BUILD_RETRIES):
        # Write App.tsx
        app_tsx = build_dir / "src" / "App.tsx"
        app_tsx.write_text(current_code, encoding="utf-8")

        # Run build
        success, error = await _run_build(build_dir)

        if success:
            # Copy dist to final location
            if dist_dir.exists():
                shutil.rmtree(dist_dir)
            shutil.copytree(build_dir / "dist", dist_dir)
            shutil.rmtree(build_dir)
            _patch_index_html(dist_dir, app_id)
            return True, current_code

        if attempt < MAX_BUILD_RETRIES - 1:
            # Ask LLM to fix the error
            current_code = await fix_build_error(current_code, error)
        else:
            # Give up
            shutil.rmtree(build_dir, ignore_errors=True)
            return False, error

    shutil.rmtree(build_dir, ignore_errors=True)
    return False, "Max retries exceeded"


async def _run_build(build_dir: Path) -> tuple[bool, str]:
    loop = asyncio.get_event_loop()

    def _build():
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(build_dir),
            capture_output=True,
            text=True,
            timeout=120,
        )
        return result

    try:
        result = await loop.run_in_executor(None, _build)
        if result.returncode == 0:
            return True, ""
        return False, (result.stdout + "\n" + result.stderr)[-3000:]
    except subprocess.TimeoutExpired:
        return False, "Build timed out after 120 seconds"
    except Exception as e:
        return False, str(e)


def _patch_index_html(dist_dir: Path, app_id: str):
    """Rewrite asset paths so the app is served from /apps/{app_id}/"""
    index = dist_dir / "index.html"
    if not index.exists():
        return
    html = index.read_text()
    # Vite uses absolute paths; rewrite to relative
    html = html.replace('href="/', f'href="/apps/{app_id}/dist/')
    html = html.replace('src="/', f'src="/apps/{app_id}/dist/')
    index.write_text(html)


def get_app_dist_dir(app_id: str) -> Path:
    return Path(APPS_DIR) / app_id / "dist"


def delete_app_files(app_id: str):
    app_dir = Path(APPS_DIR) / app_id
    if app_dir.exists():
        shutil.rmtree(app_dir)
