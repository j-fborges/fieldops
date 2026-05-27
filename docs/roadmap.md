
# Roadmap de Implementação — FieldOps

## Visão Geral

O roadmap foi construído a partir das decisões arquiteturais (ADRs 1–9), diagramas de alto
nível, User Stories e modelo de dados. Ele descreve como o FieldOps seria fatiado em fases
entregáveis, considerando as restrições típicas de uma startup B2B no setor de energia solar:
time-to-market agressivo, feedback do campo como principal insumo de evolução, e custos de
infraestrutura controlados.

| Fase | Duração | Objetivo | Entregável-chave |
|------|---------|----------|------------------|
| **MVP** | 4–6 semanas | Validar o fluxo ponta a ponta com um cliente piloto real | Plataforma funcional para 1 empresa, ~10 técnicos, 100 visitas/dia |
| **V1** | 2–3 meses | Escalar para 50 empresas, 5.000 técnicos e 30.000 visitas/dia | Sistema pronto para crescimento acelerado, multi-canal e observável |
| **V2** | 6–12 meses | Suportar 10x de crescimento e integrações enterprise | Plataforma multi-região com isolamento avançado e APIs B2B |

---

## MVP — Funcionalidades essenciais para o primeiro cliente piloto

**Objetivo:** Colocar um cliente real em produção controlada em até 6 semanas, validando o
fluxo de campo offline e colhendo feedback para priorização da V1. A arquitetura já adota as
decisões de escalabilidade, mas a implementação foca no indispensável para a operação diária.

### O que entra

**Infraestrutura e DevOps**
- Docker Compose com todos os serviços: backend FastAPI, PostgreSQL com extensão TimescaleDB
  e RLS (ADR 4), Redis (cache e idempotência), MinIO (object storage), RabbitMQ (message
  broker para Celery).
- Pipeline CI/CD mínimo: testes automatizados, build de containers, deploy em ambiente único.
- Seeds com dados de exemplo (1 empresa, 2 técnicos, 10 visitas).

**Backend (FastAPI — ADR 1)**
- API REST com OpenAPI automático (ADR 9).
- Autenticação JWT com access/refresh tokens e RBAC: papéis admin e técnico (ADR 6).
- CRUD completo de visitas com filtros por data, técnico e status (A02, A03, A05).
- Endpoint público `/v/<token>` com dados não sensíveis (C01, C02, C03).
- Geração de token público único (UUID v4) na criação da visita (A06).
- Upload de fotos: endpoint de URL pré-assinada (MinIO) + confirmação de metadados (ADR 5).
- Endpoint de sincronização `POST /api/sync` com idempotency-key (Redis), validação de estado,
  retorno 200/409 (ADR 2). Registro em TentativaSincronizacao.
- **TimescaleDB:** extensão habilitada desde o início. As tabelas `EventoVisita` e
  `TentativaSincronizacao` são criadas como hypertables, permitindo análise de séries
  temporais (duração de visitas, taxa de conflitos) já no piloto.
- Testes automatizados nos fluxos críticos.

**Web Admin (React — ADR 8)**
- Internacionalização i18n
  (primário) e `en` (secundário). Todos os textos da interface usam chaves de tradução desde
  o primeiro componente.
- Tela de login (A01).
- Listagem de visitas com filtros e paginação (A02, A03).
- Tela de detalhe: timeline de eventos, galeria de fotos via URLs pré-assinadas (A04).
- Formulário para criação de nova visita (A05), exibindo link público copiável (A06).
- Ação de cancelar visita (necessária para o cenário de conflito).
- Gerenciamento de estado com Redux Toolkit + RTK Query.

**PWA do Técnico (React + Service Worker — ADR 8)**
- Internacionalização i18n
- Manifesto e Service Worker (cache de assets estáticos via Cache API).
- Tela de login com armazenamento seguro do refresh token no IndexedDB (T01).
- Tela "Minhas visitas do dia" com cache offline no Dexie.js (T02).
- Ações offline: iniciar visita (T03) e concluir com observação e fotos (T04, T05).
- Fila de sincronização visível: badge, indicador por visita, contador de pendências (T06).
- Sincronização automática ao reconectar, com barra de progresso (T07).
- Tratamento de conflito: ao receber 409, operação marcada como "rejeitada", modal informando
  o cancelamento (T08). Criação de TicketResolucao para rastreabilidade.
- Renovação automática de token antes da sincronização; se expirado, redireciona ao login (T09).

**Página pública do cliente**
- Rota `/v/<token>` no Admin: exibe status, nome do técnico, janela prevista e timeline
  resumida com dados públicos (sem fotos, sem observações internas) (C01, C02, C03).

**Modelo de dados (ERD)**
- Entidades: Empresa, Usuario, Cliente, Visita, EventoVisita, Anexo, TentativaSincronizacao,
  TicketResolucao.
- `EventoVisita` e `TentativaSincronizacao` como hypertables TimescaleDB.
- Índices para filtros, lookup público, deduplicação e timeline.
- RLS com políticas por empresa_id (ADR 4).

### O que fica de fora (e por quê)

- **Notificações push/WhatsApp/e-mail:** substituídas por comunicação manual ou envio simples
  do link público no momento do agendamento. O stack multicanal (ADR 7) está desenhado, mas sua
  implementação é V1.
- **WebSocket para notificações in-app (Admin):** o admin utiliza refresh manual ou polling
  simples. WebSocket será adicionado na V1.
- **Painel de pendências completo (PWA):** a fila é visível como badge e status por visita. A
  tela dedicada com histórico de tentativas e botão "Tentar novamente" por item é refinada na
  V1.
- **Particionamento de tabelas:** as hypertables do TimescaleDB já oferecem particionamento
  automático por tempo. Particionamento adicional de outras tabelas (ex.: Visita) será
  aplicado na V1 se necessário.
- **IaC (Terraform):** infraestrutura via Docker Compose. IaC entra na V2.
- **Observabilidade completa (Prometheus/Grafana):** apenas logs estruturados e health checks.
  Dashboards e alertas entram na V1.

### Marco: primeira semana de produção real

Para o cliente piloto operar com segurança:

1. **Ambiente funcional:** Docker Compose subindo todos os serviços em máquina limpa.
2. **Dados iniciais:** 1 empresa, 2 técnicos, 10 visitas em estados variados.
3. **Fluxo completo validado:** criar visita → técnico visualiza offline → inicia/conclui com
   foto → sincronização automática → status atualiza no admin e na página pública.
4. **Cenário de conflito testado:** admin cancela visita com técnico offline → sincronização
   rejeita conclusão → PWA exibe modal de conflito → TicketResolucao é criado.
5. **Segurança básica ativa:** RLS, JWT com expiração curta, upload via URLs pré-assinadas,
   página pública sem dados sensíveis.
6. **Backup diário** do banco configurado e procedimento de restore documentado.
7. **i18n funcional:** interface em português (padrão) com capacidade de troca para inglês.
8. **TimescaleDB operacional:** hypertables criadas, queries de série temporal validadas.

O feedback do piloto alimenta diretamente a priorização da V1.

---

## V1 — Escala inicial e maturidade operacional

**Objetivo:** Acomodar 50 empresas, 5.000 técnicos ativos e 30.000 visitas/dia com experiência
mais rica, canais de notificação adequados e observabilidade profissional.

### O que entra (além do MVP)

- **Notificações multicanal (ADR 7):**
  - Técnicos: Web Push via Service Worker.
  - Operadores: notificações in-app via WebSocket + e-mail para alertas críticos.
  - Clientes: WhatsApp Business API (link e lembretes) com fallback SMS.
  - Abstração via NotificationGateway.
- **Observabilidade completa:** Prometheus + Grafana com dashboards de negócio e infra.
  Alertas para SLIs (erro 5xx, latência p95, fila acumulada).
- **CI/CD robusto:** build → teste → staging com smoke tests → deploy canário em produção.
  Rollback automatizado de código e banco.
- **Painel de pendências completo (PWA):** tela dedicada com histórico de tentativas e
  retentativa por item.
- **Renovação de token avançada (T09):** modal de reinserção de credenciais sem
  redirecionamento.
- **Testes de carga e performance:** garantia dos orçamentos não-funcionais (TTFB < 200ms,
  LCP < 2.5s, sincronização de lote < 5s).
- **Documentação de API pública** para parceiros B2B (portal OpenAPI/Swagger).
- **Internacionalização expandida:** adição de `es` (espanhol) para expansão latino-americana.

### O que fica de fora

- **Multi-região e CDN:** operação em região única.
- **Isolamento físico de tenants:** schema único + RLS permanece.
- **Integrações B2B (webhooks, ERP):** arquitetura preparada, implementação na V2.

---

## V2 — Escala 10x e plataforma enterprise

**Objetivo:** Suportar 500+ empresas, 50.000 técnicos, 300.000 visitas/dia com alta
disponibilidade multi-região, isolamento avançado e APIs de integração.

### O que entra (visão)

- **Multi-região e CDN:** deploy em duas ou mais regiões, replicação PostgreSQL, Redis cluster,
  MinIO federado, CDN para fotos e assets.
- **Isolamento de tenants premium:** schema ou banco dedicado por tenant, conforme exigências
  contratuais (ADR 4).
- **Integrações B2B:** webhooks para ERP, API pública versionada com OAuth2/OIDC, portal de
  desenvolvedores.
- **Otimizações de performance:** uso de Rust para processamento de imagens e deduplicação de
  eventos.
- **IaC completo:** Terraform, Kubernetes, Helm charts.
- **Compliance LGPD:** auditoria completa, relatórios de impacto, processo de exclusão de
  dados de titulares.
- **Inteligência de rotas:** algoritmos de otimização para sugestão de horários de visita.

---

## Aderência às ADRs

Cada fase respeita e estende as decisões arquiteturais registradas:

- **ADR 1 (FastAPI):** o backend assíncrono suporta o crescimento sem mudança de framework.
- **ADR 2 (Sincronização offline):** a fila com idempotência escala com workers adicionais.
- **ADR 3 (Híbrido PostgreSQL + Redis + MinIO):** PostgreSQL com TimescaleDB desde o MVP.
- **ADR 4 (Multi-tenant com RLS):** suporta crescimento com caminho para isolamento físico na
  V2.
- **ADR 5 (Upload direto):** fluxo mantido; CDN na V2 acelera entrega global.
- **ADR 6 (JWT + RBAC):** evolução natural para OAuth2 na V2.
- **ADR 7 (Notificações multicanal):** implementação progressiva: básico no MVP, completo na
  V1.
- **ADR 8 (Redux Toolkit + RTK Query + Dexie):** stack unificada facilita evolução sem
  reescrita.
- **ADR 9 (REST + OpenAPI):** contrato estável para todos os consumidores atuais e futuros.

---

## Contextualização com cenários reais

- **Time-to-market:** O MVP em 4–6 semanas permite entrar em produção com capacidade analítica
  (TimescaleDB) e base para expansão geográfica (i18n) desde o início, sem retrabalho futuro.
- **Feedback do campo:** A V1 é fortemente influenciada pelo uso real. O painel de pendências
  completo e a renovação de token aprimorada respondem a dores reais dos técnicos.
- **Custo de infraestrutura:** MVP em servidor único (Docker Compose). V1 migra para cloud
  gerenciada com custo variável. V2 justifica multi-região pela receita.
- **LGPD e segurança:** RLS e separação de dados públicos/privados ativos desde o MVP.
