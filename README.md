# FieldOps

Plataforma de gestão de operações de campo para empresas de energia solar.

O FieldOps conecta três atores principais:

- **Operadores administrativos** — web admin para gestão de visitas, equipes e clientes
- **Técnicos de campo** — PWA com suporte offline para execução de ordens de serviço
- **Clientes finais** — página pública de acompanhamento de status

## Arquitetura

Monorepo com 3 pacotes:

| Pacote | Stack |
|---|---|
| `packages/backend` | Python + FastAPI + SQLAlchemy + Celery + PostgreSQL |
| `packages/admin` | React + Vite + TypeScript + Tailwind CSS + Redux Toolkit |
| `packages/pwa` | React + Vite + TypeScript + Tailwind CSS + Dexie.js + Service Worker |

Infraestrutura: PostgreSQL, Redis, RabbitMQ, MinIO (S3).

## Status

Em desenvolvimento inicial — Fase 1: inicialização do monorepo.
