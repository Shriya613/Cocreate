# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Install the Vite template node_modules ──────────────────────────
FROM node:20-slim AS template-builder

WORKDIR /build/template
COPY backend/app/template/package*.json ./
RUN npm ci


# ── Stage 3: Final image (Python + Node.js for runtime builds) ───────────────
FROM python:3.12-slim

# Node.js is required at runtime to build user-generated apps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get purge -y curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend source
COPY backend/ ./backend/

# Pre-built template node_modules (avoids npm install on every build)
COPY --from=template-builder /build/template/node_modules ./backend/app/template/node_modules

# Built frontend
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Runtime directories
RUN mkdir -p /app/generated_apps

ENV FRONTEND_DIST=/app/frontend/dist
ENV APPS_DIR=/app/generated_apps
ENV DB_PATH=/app/cocreate.db

WORKDIR /app/backend

EXPOSE 8000

CMD python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
