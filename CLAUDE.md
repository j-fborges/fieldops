
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

### Tool Command Rule
When running lint/format/typecheck commands across packages, always prefix with the absolute path: `cd <absolute-package-path> && <command>`. Never rely on the shell's current working directory — it drifts between Bash invocations and causes silent failures (e.g., "No files matching the pattern").

### Dependency Versioning
Always pin to the latest stable versions for dependencies. Check `npm view <pkg> version` or `pip index versions <pkg>` before adding or bumping any dependency. Prefer caret ranges (`^`) for npm and minimum bounds (`>=`) for pip.

## Notes for Claude
- **Commit tracking, current phase, and next steps belong exclusively in `CLAUDE.local.md`.**
- Never add "Completed Commits", "Current Phase", or "Next Steps" sections to this file.
- `CLAUDE.local.md` is the working document for transient task tracking; this file is the stable project reference.
- **The user handles all git operations manually.** Never run `git add`, `git commit`, `git push`, or any other git command that modifies state. Just create/modify files and the user will stage, commit, and push themselves.
- **Report issues and workarounds immediately.** When a tool fails, a dependency is incompatible, a config doesn't work as documented, or a workaround is needed — stop and report it to the user. Include: what was attempted, what failed, why, and the proposed alternative. Never silently resolve or route around problems without user visibility. This includes CWD drift, missing peer deps, broken build backends, and tool incompatibilities.

## Documentation-Driven Development

### Documentation as Source of Truth
- All implementation decisions should preferably meet with the documentation in `./docs/`, or be flagged.
- Before writing any feature, Claude must read the relevant ADR, ERD, and diagram.
- If a proposed implementation contradicts the documentation, Claude must flag it
  explicitly: "⚠️ This diverges from ADR-X / ERD. Should I proceed or adjust the docs first?"
- Claude must never silently deviate from the documented architecture.

The `./docs/` folder contains architecture reference for this project.
Before generating any code that involves an architectural decision, Claude CAN:

1. **Check for relevant ADRs** in `./docs/adrs/` — if a decision touches a topic
   covered by an ADR, the ADR's conclusion is binding.
2. **Consult the ERD** in `./docs/erd.md` — all database models,
   relationships, indexes, and field names must match the ERD exactly.
3. **Reference the Offline Strategy** in `./docs/estrategia-offline.md`
   for any PWA, sync, or offline-related code.
4. **Check the High-Level Architecture diagram** in `./docs/alto-nivel.md`
   for component responsibilities and communication protocols.
5. **Consult the User Stories diagrams** in `./docs/user-stories/user-stories-*.md`
   for expected flows, UI states, and actor interactions.
6. Cross-check for inconsistencies between docs files.
7. Confirm with the user if any discrepancy is found before writing code.

### Documentation RAG (Local)
- Project documentation is indexed locally with `code-rag-mcp` (index name: `fieldops-docs`).
- When you need to consult architecture decisions, ERD, or diagrams, **call the `search_docs` tool first** before reading entire files.
- Only fall back to reading raw files if the RAG results are insufficient.
- The RAG index and server are external to the repository.

### Documentation Directory Structure
```
docs/
├── adrs/                              # Architecture Decision Records (9 ADRs)
│   ├── adr-01-fastapi-vs-django.md    # FastAPI chosen over Django
│   ├── adr-02-sincronizacao-offline.md # Event queue with idempotency
│   ├── adr-03-banco-hibrido.md        # PostgreSQL + Redis + RabbitMQ + MinIO
│   ├── adr-04-multi-tenant.md         # Shared schema + tenant_id + RLS
│   ├── adr-05-upload-midia.md         # Direct upload with pre-signed URL
│   ├── adr-06-autenticacao.md         # JWT + RBAC
│   ├── adr-07-notificacoes.md         # Multi-channel per actor
│   ├── adr-08-gerenciamento-estado.md  # Redux Toolkit + RTK Query + Dexie
│   └── adr-09-comunicacao-api.md      # REST + OpenAPI
├── user-stories/                      # User story sequence diagrams
│   ├── user-stories-admin.md          # 6 operator stories (A01-A06)
│   ├── user-stories-cliente.md        # 3 end-client stories (C01-C03)
│   └── user-stories-tecnico.md        # 9 field technician stories (T01-T09)
├── alto-nivel.md                      # C4 container diagram + 12 components
├── erd.md                             # 8 entities, indexes, hypertables, RLS
├── estrategia-offline.md              # Offline sync strategy (Dexie, queue, conflicts)
├── nao-funcionais.md                  # Performance, security, LGPD, observability, cost
└── roadmap.md                         # MVP → V1 → V2 phases
```

### Mapping Portuguese (Docs) to English (Code)
- All domain entities, attributes, and relationships are documented in Portuguese
  (e.g., `Empresa`, `Visita`, `observacao_interna`).
- When writing code, Claude must translate these to idiomatic English using
  industry-standard conventions (PascalCase for classes/models, camelCase for
  variables/functions, snake_case for Python attributes mirroring DB columns).
- If unsure about the best English translation for a concept, Claude must propose
  two options and let the user choose.
- API endpoints retain Portuguese domain terms for consistency with the
  documentation (e.g., `/api/visitas`).

### Project File Map
- `./docs/` — Architecture documentation, ADRs, diagrams, and reports.
- `./CLAUDE.md` — Stable project reference (this file).
- `./CLAUDE.local.md` — Transient working notes (gitignored).
- `./NOTAS.md` — Development diary and decision log (committed).

### NOTAS.md Update Rule
- After every commit, Claude must append a brief entry to `./NOTAS.md` summarizing
  what was accomplished in that commit, written in Portuguese, in narrative style.
- The entry must be added under a `## Commits Recentes` or `## Diário de Commits`
  section.
- Claude must determine the previous commit message (via `git log -1 --oneline`) to
  accurately describe the change.
- The update is staged automatically but never committed — the user commits manually.


