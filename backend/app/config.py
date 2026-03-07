import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./cocreate.db")
DB_PATH = os.getenv("DB_PATH", "./cocreate.db")

APPS_DIR = os.getenv("APPS_DIR", "./generated_apps")
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "template")

MAX_BUILD_RETRIES = int(os.getenv("MAX_BUILD_RETRIES", "3"))

FRONTEND_DIST = os.getenv("FRONTEND_DIST", "")
