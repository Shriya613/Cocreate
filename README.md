# CoCreate

> Describe an app in one sentence. Get a real, working app.

CoCreate turns natural language into fully functional React web apps. Generate a water tracker, a workout log, a todo list — whatever you need, tailored to you. Then iterate conversationally: "make the accent color blue", "add a reset button", done.

## Live demo preview

![CoCreate UI](docs/preview.png)

## How it works

1. You describe what you want
2. **Gemini 2.0 Flash** generates a complete React + Tailwind app as a single `App.tsx`
3. **Vite** builds it — if the build fails, GPT-4o reads the error and fixes it automatically (up to 3 retries)
4. The app is served as a PWA you can preview instantly in the browser or open in a new tab
5. Iterate by chatting — each change creates a new version you can roll back to

## Stack

- **Backend**: FastAPI + aiosqlite (Python)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **LLM**: Google Gemini 2.0 Flash
- **Generated apps**: React + Tailwind CSS, built with Vite, served as PWAs

## Project structure

```
backend/
  app/
    main.py              # FastAPI app, routes, static serving
    config.py            # env vars
    database.py          # SQLite schema + init
    routes/
      generate.py        # POST /api/generate
      apps.py            # CRUD /api/apps
      chat.py            # POST /api/apps/:id/chat
    services/
      llm_client.py      # OpenAI GPT-4o calls
      generator.py       # build pipeline (copy template → inject code → npm build)
      app_service.py     # DB operations
    template/            # Vite project template (pre-installed node_modules)

frontend/
  src/
    pages/
      HomePage.tsx       # Landing + app grid
      AppPage.tsx        # Preview + chat + version history
    lib/api.ts           # API client
    types.ts
```

## Running locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- An OpenAI API key

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # then add your OPENAI_API_KEY
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Your Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Model to use |
| `MAX_BUILD_RETRIES` | No | `3` | Build retry attempts |
| `APPS_DIR` | No | `./generated_apps` | Where built apps are stored |

## Features

- **Text generation**: Describe any app and get working code
- **In-browser preview**: Iframe preview with simulated browser chrome
- **Chat iteration**: Change anything conversationally
- **Version history**: Every change is versioned; restore any previous version with one click
- **PWA-ready**: Generated apps include a web manifest and can be added to home screen
- **Auto-fix**: Build errors are automatically diagnosed and fixed by GPT-4o
