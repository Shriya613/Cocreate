# CoCreate

> Describe an app in one sentence. Get a real, working app.

CoCreate turns natural language into fully functional React web apps. Generate a water tracker, a Solitaire game, a workout log, a tournament bracket — whatever you need. Then iterate conversationally: "make the accent color blue", "add a reset button", done. Every change is versioned so you can always roll back.

<img width="1423" height="752" alt="Screenshot 2026-03-08 at 3 27 27 PM" src="https://github.com/user-attachments/assets/0c8db37b-7c7a-4766-beb7-d0fbafc20e10" />

---

## How it works

1. You describe what you want (plain English)
2. **Mistral Large** generates a complete React + Tailwind app as a single `App.tsx`
3. **Vite** builds it inside Docker — if the build fails, Mistral reads the error and auto-fixes it (up to 3 retries)
4. The built app is served instantly in an in-browser preview
5. Iterate by chatting — each change creates a new version you can restore

---

## Tech stack

### Backend
| Technology | Role |
|---|---|
| **Python 3.12** | Runtime |
| **FastAPI** | REST API framework |
| **aiosqlite** | Async SQLite — stores apps, versions, chat history |
| **Mistral Large (`mistral-large-latest`)** | LLM — generates and iterates on app code |
| **Vite + Node.js 20** | Builds each generated React app inside the container |
| **uvicorn** | ASGI server |

### Frontend (CoCreate UI)
| Technology | Role |
|---|---|
| **React 18 + TypeScript** | UI framework |
| **Vite** | Dev server + bundler |
| **Tailwind CSS** | Styling |
| **React Router v7** | Client-side routing |
| **lucide-react** | Icons |

### Generated Apps
| Technology | Role |
|---|---|
| **React 18 + TypeScript** | App framework |
| **Tailwind CSS** | Styling (all generated apps use Tailwind) |
| **lucide-react** | Icons available to generated apps |
| **Vite** | Build tool |
| **localStorage** | Persistence (no backend needed for generated apps) |

### Infrastructure
| Technology | Role |
|---|---|
| **Docker** | Containerisation — single image runs Python + Node.js |
| **Docker Compose** | Local orchestration with persistent named volume |
| **SQLite** | Zero-config database persisted on a Docker volume |

---

## Features

- **Natural language generation** — describe any app and get working code in ~15s
- **In-browser preview** — iframe preview with browser chrome simulation
- **Chat iteration** — change anything conversationally; every message is a new versioned build
- **Version history** — every iteration is saved; restore any previous version with one click
- **Auto build-fix** — build errors are automatically diagnosed and fixed by the LLM (up to 3 retries)
- **PWA-ready** — generated apps include a web manifest
- **Persistent storage** — apps and history survive container restarts via Docker named volume

---

## Project structure

```
CoCreate/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + SPA static serving
│   │   ├── config.py            # Environment variable config
│   │   ├── database.py          # SQLite schema (apps, versions, messages)
│   │   ├── routes/
│   │   │   ├── generate.py      # POST /api/generate
│   │   │   ├── apps.py          # GET/DELETE /api/apps, versions, restore
│   │   │   └── chat.py          # POST /api/apps/:id/chat
│   │   ├── services/
│   │   │   ├── llm_client.py    # Mistral API calls (generate, iterate, fix)
│   │   │   ├── generator.py     # Build pipeline: template → inject → npm build
│   │   │   └── app_service.py   # Database CRUD
│   │   └── template/            # Vite project template (node_modules pre-installed)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── HomePage.tsx     # Landing page + app card grid
│       │   └── AppPage.tsx      # Preview iframe + chat + version history
│       ├── lib/api.ts           # Typed API client
│       └── types.ts
├── Dockerfile                   # Multi-stage: frontend build + Python + Node.js
├── docker-compose.yml           # Local dev with persistent volume
├── railway.toml                 # Railway deployment config
└── .env.example
```

---

## Running locally

### With Docker (recommended)

```bash
# 1. Clone and configure
git clone https://github.com/Shriya613/cocreate
cd cocreate
cp .env.example backend/.env
# Edit backend/.env and add your MISTRAL_API_KEY

# 2. Build and start
docker compose up -d --build

# 3. Open
open http://localhost:8001
```

### Without Docker

**Prerequisites:** Python 3.12+, Node.js 20+, a Mistral API key

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # add MISTRAL_API_KEY
cd app/template && npm install && cd ../..
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MISTRAL_API_KEY` | **Yes** | — | Your Mistral API key ([console.mistral.ai](https://console.mistral.ai)) |
| `MISTRAL_MODEL` | No | `mistral-large-latest` | Model to use for generation |
| `MAX_BUILD_RETRIES` | No | `3` | How many times to auto-fix a failing build |
| `APPS_DIR` | No | `./generated_apps` | Where built app dist folders are stored |
| `DB_PATH` | No | `./cocreate.db` | SQLite database file path |

---

## Deploying to Railway

1. Push to GitHub
2. New project on [railway.app](https://railway.app) → Deploy from GitHub repo
3. Add `MISTRAL_API_KEY` in the Variables tab
4. Settings → Networking → Generate Domain

The `railway.toml` and `Dockerfile` handle everything automatically.
