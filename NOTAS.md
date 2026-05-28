# Registro de Decisões e Processo de Desenvolvimento

> Relatório de decisões de arquitetura, ferramentas e qualidade adotadas durante o desenvolvimento do teste prático. Cada escolha foi orientada pelos critérios de avaliação, simplicidade e alinhamento com as "dores" descritas nas user stories.

> [!NOTE]
> Para o desenvolvimento utilizarei inglês (código, comentários, mensagens de commit), mas estou usando português para os diagramas em `./docs/` e na documentação como forma de elaborar conceitualmente sobre a estrutura do projeto utilizando a mesma linguagem do enunciado do desafio. Da mesma forma, existem campos listados nos diagramas que, por decisões de escopo, podem não ser implementados no MVP ou estão marcados com `??` como dúvidas abertas.

> Optei por utilizar inglês como base do desenvolvimento seguindo o padrão da indústria e facilitando a aderência a convenções de arquitetura e boas práticas.


---

## 1. Pré‑desenvolvimento: Entendimento do Problema e Estruturação

### 1.1. User Stories como ponto de partida

Meu processo de pensamento é bastante visual e centrado no usuário. Por isso, comecei pelo levantamento das User Stories a partir do enunciado do teste, antes de qualquer linha de código. Esse exercício me deu clareza sobre os problemas reais de cada ator (operador administrativo, técnico de campo e cliente final), seus contextos de uso (desktop com boa conexão vs. mobile offline vs. acesso público sem login) e as expectativas de cada um.

Com as histórias em mãos, desenhei diagramas de sequência (`Mermaid`) para cada ator, detalhando as interações com o sistema. Esses diagramas me permitiram:

- Visualizar os fluxos completos, do login à conclusão de visitas e consulta pública.
- Identificar componentes de UI necessários e estados de tela (loading, erro, vazio).
- Cruzar informações entre atores para encontrar conflitos (ex.: admin cancela visita enquanto técnico conclui offline).
- Começar a modelar as entidades de domínio (Visita, EventoVisita, Anexo) e de utilidade (TicketResolucao, TentativaSincronizacao).

As marcações `??` nos diagramas representam dúvidas que mantive em aberto durante a fase de design — algumas serão resolvidas durante a implementação, outras são decisões de produto que fogem ao escopo técnico mas que registro para discussão com PM/Tech Lead.

### 1.2. Definição do Escopo e do Plano de Trabalho

Com os diagramas traçados, ficou mais claro o que seria indispensável para um fluxo ponta a ponta funcional. Estruturei um plano de desenvolvimento em fases (MVP, V1, V2) e um roadmap de implementação (`./docs/roadmap.md`). A decisão consciente de deixar itens para fases posteriores está registrada lá, mas os destaques são:

- **Notificações multicanal (Web Push, WhatsApp, e‑mail):** ficam para V1; no MVP, o link público é enviado manualmente e não há alertas em tempo real.
- **WebSocket para notificações in‑app (Admin):** também V1; o admin usará refresh manual/polling simples.
- **Internacionalização além de pt‑BR e en:** V1.
- **Observabilidade completa (Prometheus/Grafana):** apenas logs estruturados no MVP; dashboards e alertas entram na V1.
- **TimescaleDB e i18n básico (pt‑BR/en):** decidi trazê‑los para o MVP por entender que são diferenciais de arquitetura com baixo custo inicial e alto valor na demonstração.

### 1.3. Documentação como Base da Arquitetura

Antes de escrever código, organizei toda a documentação conceitual em `./docs/`: diagramas de alto nível, ADRs, ERD com índices e particionamento, estratégia offline detalhada, tipagens do PWA e roadmap. Essa documentação serviu como "contrato" para o desenvolvimento — qualquer decisão de código deveria estar respaldada por uma ADR ou pelo modelo de dados.

### 1.4. Dúvidas Abertas e Pontos de Atenção

Durante o levantamento de requisitos e a elaboração dos diagramas de User Stories, algumas questões ficaram propositalmente em aberto (marcadas com `??`). Elas representam decisões que dependem de contexto de produto ou que podem ser refinadas durante a implementação:

- **Admin — Primeira tela pós‑login:** `??(Primeira tela == tela de Visitas??)` — no MVP, assumi que o dashboard principal é a listagem de visitas, mas cabe validação com UX/PM.
- **Admin — Resolução de conflitos:** `??Resolução de conflitos com Sincronização do Técnico de Campo??` — a interface de resolução (modal Aceitar/Rejeitar) está desenhada, mas a interação exata (notificação ao técnico após resolução, prazos) ainda é aberta.
- **Admin — Detalhe da visita:** `??Possui Assinatura do Cliente (Booleano)??`, `??Imagem Assinatura do Cliente??` e `??Lista de Fotos do Evento??` — a coleta de assinatura está modelada (`assinatura_coletada`, tipo `assinatura` em Anexo), mas a UI exata para exibição dessas informações no admin permanece como dúvida de design.
- **Técnico — Assinatura na visita:** `??Assinatura Opcional do Cliente??` (em T03 e T04) — a decisão de implementar a coleta de assinatura no MVP está em aberto. O modelo de dados já suporta, então a adição posterior não quebra contratos.
- **Cliente — Exposição de assinatura na timeline pública:** `??Assinatura do Cliente Coletada? (Booleano)??` — se a assinatura for exibida como um indicador na página pública ou não, ainda é uma questão de produto/LGPD.
- **ERD vs User Stories — Janela de horário:** As user stories C02 e T02 mencionam "janela de horário prevista" para a visita, mas o ERD representa esse conceito com apenas uma coluna `data_agendada` (timestamp único). Esta é uma simplificação intencional para o MVP. Caso o feedback do piloto indique a necessidade de uma janela explícita (início/fim), uma coluna `data_prevista_fim` poderá ser adicionada na V1.

Além disso, itens como notificações push, WebSocket, painel de pendências completo e integrações B2B estão fora do MVP por decisão consciente de escopo, registrada no roadmap. Essas funcionalidades foram consideradas na arquitetura para evitar retrabalho futuro.

---

## 2. Decisões de Arquitetura (ADRs) e Justificativas

As 9 ADRs registradas em `./docs/adrs/` cobrem as escolhas centrais da plataforma. Abaixo, um resumo contextualizado:

- **ADR 1 — FastAPI:** a carga I/O-bound e a necessidade de alta concorrência para uploads e sincronização favorecem o modelo assíncrono. A interface administrativa em React elimina a vantagem do Django Admin. A geração automática de OpenAPI acelera a integração com o frontend.
- **ADR 2 — Sincronização offline com fila de eventos e idempotência:** mantém a lógica de negócio centralizada no backend (fonte da verdade). Conflitos são detectados deterministicamente e tratados via TicketResolucao.
- **ADR 3 — Híbrido PostgreSQL + Redis + RabbitMQ + MinIO:** cada ferramenta especializada em sua função. RabbitMQ como broker de tarefas assíncronas (processamento de fotos, notificações); Redis exclusivamente para cache e idempotência. TimescaleDB ativado desde o MVP para hypertables.
- **ADR 4 — Multi‑tenant com RLS:** schema único + `empresa_id` + Row‑Level Security garantem isolamento lógico com baixo custo operacional.
- **ADR 5 — Upload direto ao MinIO com URL pré‑assinada:** desacopla a API do tráfego pesado de mídia e permite processamento assíncrono.
- **ADR 6 — JWT + refresh tokens + RBAC:** simplicidade, stateless, compatível com offline (refresh token armazenado no IndexedDB e criptografado).
- **ADR 7 — Notificações multicanal (V1+):** arquitetura desenhada, mas implementação faseada para não atrasar o MVP.
- **ADR 8 — Redux Toolkit + RTK Query + Dexie.js:** stack unificada para Admin e PWA, com middleware para sincronização offline transparente.
- **ADR 9 — REST + OpenAPI:** contrato único entre front e back, geração automática de tipos TypeScript, semântica HTTP natural para o fluxo de sync.

---

## 3. Percurso de Desenvolvimento: Commits

Os commits seguem a convenção Conventional Commits em inglês. A sequência reflete a construção progressiva do monorepo, tooling de qualidade e início da implementação.

### Commit 1 — Monorepo Initialization

Criação da raiz do monorepo com `package.json` (workspaces), `.gitignore`, `docker-compose.yml` (esqueleto), `README.md` inicial e diretórios vazios para os pacotes `backend`, `admin` e `pwa`. Estrutura básica para começar a adicionar os scaffolds de cada parte.

### Commit 2 — Backend Initialization

Scaffold do backend FastAPI: `pyproject.toml` com dependências core (fastapi, sqlalchemy, alembic, celery, redis, kombu, etc.), `requirements.txt`, `.env.example` e `app/main.py` com health check mínimo (`GET /health`). Ambiente virtual Python 3.12+ configurado em `packages/backend/.venv/`. Criação da pasta `docs/` para a documentação.

### Commit 3 — Admin Frontend Initialization

Projeto Vite + React + TypeScript + Tailwind CSS em `packages/admin/`. Instalação de `react-router-dom`, `@reduxjs/toolkit`, `react-redux`. Placeholder para a rota pública `/v/:token` (`PublicStatusPage.tsx`). Proxy do Vite configurado para encaminhar `/api` e `/v` ao backend (`localhost:8000`).

### Commit 4 — PWA Frontend Initialization

Projeto Vite + React + TypeScript + Tailwind CSS + `vite-plugin-pwa` + Dexie.js em `packages/pwa/`. Manifesto PWA configurado (nome, cores, ícones placeholder). Placeholder para dashboard do técnico (`Dashboard.tsx`).

### Commit 5 — Upgrade Frontend Dependencies (Tailwind v4, latest Vite/TS)

Tailwind, Vite e TypeScript atualizados para as versões estáveis mais recentes. Ambos os pacotes (`admin` e `pwa`) foram atualizados simultaneamente para manter consistência.

### Commits 6,7,8 — Adds Documentation and Refactors

### Commit 9 — EditorConfig and Lint/Format Tooling

Estabelece uma baseline de qualidade de código em todo o monorepo antes que o código de aplicação comece a crescer. Foi criado um `.editorconfig` na raiz. Nos dois frontends (`admin` e `pwa`) Prettier e ESLint. No backend Black e isort. Scripts `format`, `lint` e `typecheck` foram adicionados aos três pacotes. Todos os arquivos existentes foram formatados e a baseline está limpa: zero erros de lint, zero erros de tipo, zero diferenças de formatação.

### Commit 10 — Test Setup for All Packages

Adiciona infraestrutura de testes nos três pacotes. Nos frontends (`admin` e `pwa`) foram instalados Vitest, React Testing Library, e smoke tests que renderizam o componente `App`. No backend, foi criado um smoke test com `pytest` que valida o endpoint `/health` retornando 200.

### Commit 11 — Root Scripts, Pre-commit Hooks, and CI Pipeline

Adicionado scripts de orquestração na raiz do monorepo (`format`, `lint`, `typecheck`, `test`, `check`) que executam as ferramentas em todos os pacotes. Foi adotado `Husky` + `lint-staged` para o **hook de pre-commit**, que verifica conflitos de merge, executa formatadores e linters nos arquivos staged, e em seguida roda typecheck e testes completos. O pipeline de CI (GitHub Actions) foi configurado. Adicionado servidor RAG de suporte (`rag-code-mcp`) para leitura otimizada da documentação pelo Claude Code.

---
