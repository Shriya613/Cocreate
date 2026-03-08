import asyncio
import shutil
import subprocess
import os
from pathlib import Path

from app.config import APPS_DIR, TEMPLATE_DIR, MAX_BUILD_RETRIES
from app.services.llm_client import fix_build_error

# Files/dirs in the template to copy per-build (everything except node_modules)
_TEMPLATE_SKIP = {"node_modules", "dist"}


async def build_app(app_id: str, version_id: str, code: str) -> tuple[bool, str]:
    """
    Set up a Vite build dir, inject the generated App.tsx, run npm build.
    node_modules are symlinked from the template to avoid copying gigabytes
    and to prevent tsc symlink resolution issues on Docker volumes.
    Returns (success, final_code) on success or (False, error_message) on failure.
    """
    build_dir = Path(APPS_DIR) / app_id / "build_tmp"
    dist_dir = Path(APPS_DIR) / app_id / "dist"

    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir(parents=True, exist_ok=True)

    # Copy template files (skip node_modules and dist)
    _copy_template(Path(TEMPLATE_DIR), build_dir)

    # Symlink node_modules from the pre-installed template — fast and avoids
    # filesystem issues that break tsc on Docker named volumes
    nm_link = build_dir / "node_modules"
    if not nm_link.exists():
        nm_link.symlink_to(Path(TEMPLATE_DIR) / "node_modules", target_is_directory=True)

    current_code = code

    for attempt in range(MAX_BUILD_RETRIES):
        (build_dir / "src" / "App.tsx").write_text(current_code, encoding="utf-8")

        success, error = await _run_build(build_dir)

        if success:
            if dist_dir.exists():
                shutil.rmtree(dist_dir)
            shutil.copytree(build_dir / "dist", dist_dir)
            shutil.rmtree(build_dir)
            _patch_index_html(dist_dir, app_id)
            return True, current_code

        if attempt < MAX_BUILD_RETRIES - 1:
            current_code = await fix_build_error(current_code, error)
        else:
            shutil.rmtree(build_dir, ignore_errors=True)
            return False, error

    shutil.rmtree(build_dir, ignore_errors=True)
    return False, "Max retries exceeded"


def _copy_template(src: Path, dst: Path):
    """Copy template files excluding node_modules and dist."""
    for item in src.iterdir():
        if item.name in _TEMPLATE_SKIP:
            continue
        dest = dst / item.name
        if item.is_dir():
            shutil.copytree(item, dest, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dest)


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
    """Rewrite asset paths so the app is served from /apps/{app_id}/dist/"""
    index = dist_dir / "index.html"
    if not index.exists():
        return
    html = index.read_text()
    html = html.replace('href="/', f'href="/apps/{app_id}/dist/')
    html = html.replace('src="/', f'src="/apps/{app_id}/dist/')
    index.write_text(html)


def get_app_dist_dir(app_id: str) -> Path:
    return Path(APPS_DIR) / app_id / "dist"


def delete_app_files(app_id: str):
    app_dir = Path(APPS_DIR) / app_id
    if app_dir.exists():
        shutil.rmtree(app_dir)
