
# FieldOps — Claude Code Context

## Project Overview
FieldOps is a field workforce management platform for solar energy companies.
It connects three actors: administrative operators (web admin), field technicians
(PWA with offline support), and end customers (public status page).

## Architecture at a Glance
- **Monorepo** with 3 packages: `backend/` (FastAPI), `admin/` (React SPA), `pwa/` (React PWA)
- **Backend**: Python FastAPI + SQLAlchemy + Celery workers (RabbitMQ broker) + PostgreSQL + Redis (cache/idempotency/light queues) + MinIO/S3 (media)
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

## Development Environment
- Backend uses Python 3.12+ with a virtual environment at `packages/backend/.venv/`
- Activate with `source packages/backend/.venv/bin/activate` before running backend commands
- `.venv/` is gitignored and never committed

## Code Conventions
- **All code in English**: variables, functions, classes, comments, commit messages
- **Documentation in Portuguese**: README, NOTAS.md, architecture docs, ADRs
- **API endpoints**: `/api/visitas` (Portuguese domain terms for entities)
- **Database tables/columns**: Portuguese entity names (Empresa, Usuario, Visita, etc.)
- **Formatting**: Prettier (frontend), Black (backend), 2 spaces (frontend), 4 spaces (backend)
- **Linting**: ESLint (frontend), Flake8 + mypy (backend)

## Notes for Claude
- **Commit tracking, current phase, and next steps belong exclusively in `CLAUDE.local.md`.**
- Never add "Completed Commits", "Current Phase", or "Next Steps" sections to this file.
- `CLAUDE.local.md` is the working document for transient task tracking; this file is the stable project reference.
- **The user always commits manually.** Never run `git commit` or `git add` — just stage changes and let the user commit themselves.
