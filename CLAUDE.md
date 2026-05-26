
# FieldOps — Claude Code Context

## Project Overview
FieldOps is a field workforce management platform for solar energy companies.
It connects three actors: administrative operators (web admin), field technicians
(PWA with offline support), and end customers (public status page).

## Architecture at a Glance
- **Monorepo** with 3 packages: `backend/` (FastAPI), `admin/` (React SPA), `pwa/` (React PWA)
- **Backend**: Python FastAPI + SQLAlchemy + Celery + RabbitMQ + PostgreSQL + Redis + MinIO
- **Admin Frontend**: React + Vite + TypeScript + Tailwind CSS + Redux Toolkit + RTK Query
- **PWA Frontend**: React + Vite + TypeScript + Tailwind CSS + Dexie.js + Service Worker
- **Public page** (`/v/:token`) is served by the Admin frontend as a route
- **Offline sync**: event queue with idempotency keys, conflict detection, TicketResolucao

## Key Architectural Decisions (ADRs)
1. **FastAPI** over Django — async I/O, OpenAPI auto-generation, aligns with job requirements
2. **Event queue with idempotency** for offline sync (not CRDT, not Last-Write-Wins)
3. **Hybrid storage**: PostgreSQL (primary), Redis (cache/idempotency/light queues),
   RabbitMQ (async job broker), MinIO/S3 (media)
4. **Multi-tenant**: schema único + tenant_id + Row-Level Security no PostgreSQL
5. **Upload direto** para MinIO com URL pré-assinada
6. **JWT** access+refresh tokens + RBAC (admin, tecnico)
7. **Multi-channel notifications**: Web Push (technician), WebSocket+Email (operator),
   WhatsApp+SMS (customer) — V1+
8. **Redux Toolkit + RTK Query + Dexie.js** for unified state management
9. **REST + OpenAPI** for API contract, consumed by RTK Query

## Code Conventions
- **All code in English**: variables, functions, classes, comments, commit messages
- **Documentation in Portuguese**: README, NOTAS.md, architecture docs, ADRs
- **API endpoints**: `/api/visitas` (Portuguese domain terms for entities)
- **Database tables/columns**: Portuguese entity names (Empresa, Usuario, Visita, etc.)
- **Formatting**: Prettier (frontend), Black (backend), 2 spaces (frontend), 4 spaces (backend)
- **Linting**: ESLint (frontend), Flake8 + mypy (backend)

## Commit 1 — Monorepo Initialization (complete)
- Root `package.json`, `.gitignore`, `docker-compose.yml`, `README.md`, and empty package directories created.

## Current Phase — Commit 2: Backend Initialization

### What to do
- Create `packages/backend/pyproject.toml` with FastAPI + core dependencies
- Create `packages/backend/requirements.txt` with pinned dependencies
- Create `packages/backend/.env.example`
- Create `packages/backend/app/__init__.py`
- Create `packages/backend/app/main.py` (minimal health-check only)

### Dependencies
- fastapi, uvicorn[standard]
- sqlalchemy, alembic, asyncpg
- celery, kombu
- redis, python-dotenv
- pydantic, pydantic-settings
- httpx (dev/test)

### File Structure (after commit)
```
packages/backend/
├── pyproject.toml
├── requirements.txt
├── .env.example
└── app/
    ├── __init__.py
    └── main.py
```

### Rules
- Do NOT create database models yet
- Do NOT configure Celery workers yet
- Keep `main.py` minimal (health check endpoint only)
- Python 3.12+

## Next Steps (after commit)
- Commit 3: `chore(admin): init React+Vite SPA with Tailwind and dependencies`
- Commit 4: `chore(pwa): init React+Vite PWA with Tailwind and dependencies`
