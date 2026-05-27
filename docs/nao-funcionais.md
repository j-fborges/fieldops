
# Requisitos Não-Funcionais — FieldOps

## Performance

### Orçamentos

| Métrica | Alvo | Contexto |
|---------|------|----------|
| **TTFB (Time to First Byte)** | < 200ms (p95) | Requisições à API (exceto upload de mídia e sync em lote) |
| **LCP (Largest Contentful Paint)** | < 2.5s | Admin SPA e PWA em 4G |
| **INP (Interaction to Next Paint)** | < 200ms | Todas as interações (cliques, toques, submissões de formulário) |
| **Sincronização (lote)** | < 5s para lote de 10 eventos | Resposta do POST /api/sync em condições normais |
| **Upload de foto** | < 10s por foto (5 MB) | Upload direto ao MinIO com URL pré-assinada |

### Como manter

- **TTFB:** queries com índices adequados (ERD), conexão pooling no SQLAlchemy, cache de
  leituras frequentes no Redis (ex.: lista de técnicos), e uso de async/await no FastAPI para
  não bloquear o event loop em operações I/O.
- **LCP:** code splitting por rota no Vite, Tailwind com purge de CSS não utilizado,
  imagens lazy-loaded, assets estáticos servidos com Cache-Control e compressão gzip/brotli.
- **INP:** evitar operações síncronas pesadas no thread principal; usar Web Workers para
  criptografia de tokens e processamento de blobs de foto; feedback imediato com optimistic
  updates no Redux.
- **Sincronização:** processamento de eventos em transação única no backend, verificação de
  idempotência no Redis (latência sub-ms), índices compostos em EventoVisita e Visita.
- **Upload:** upload direto ao MinIO sem passar pela API; paralelismo de múltiplas fotos no
  PWA; compressão de imagem no dispositivo antes do upload.

---

## Segurança

### Autenticação

- JWT com access token de curta duração (15 min) e refresh token de longa duração (7 dias).
- Access token mantido em memória JavaScript no Admin; refresh token em cookie httpOnly,
  Secure, SameSite=Strict.
- No PWA, tokens armazenados no IndexedDB com criptografia via Web Crypto API (AES-GCM).
- Refresh token rotation: a cada uso, o refresh token anterior é invalidado no Redis.
- Senhas hasheadas com bcrypt (cost factor >= 12).

### Autorização

- RBAC com papéis `admin` e `tecnico` como claims no JWT.
- Decoradores/fastapi.Depends verificam `require_role` em endpoints protegidos.
- Row-Level Security no PostgreSQL como camada adicional: mesmo que o backend cometa falha
  na filtragem, o banco garante isolamento por `empresa_id`.

### Transporte

- HTTPS entre todos os clientes e o load balancer (Nginx), com TLS 1.3.
- HTTP interno entre containers no Docker Compose (rede isolada, sem exposição externa).
- HSTS habilitado no Nginx (max-age=31536000, includeSubDomains, preload).

### Armazenamento de fotos

- Fotos são PII (Personally Identifiable Information) quando contêm rostos, placas, ou
  identificadores visuais.
- URLs pré-assinadas com TTL de 5 minutos e escopo limitado ao bucket e objeto específicos.
- Bucket MinIO com política de acesso privado (acessível apenas via URL pré-assinada ou
  credenciais de serviço).
- Metadados das fotos (tamanho, tipo, storage_key) armazenados no PostgreSQL, nunca a
  imagem em si.
- Processamento de thumbnails feito por worker Celery, que acessa o MinIO com credenciais
  de serviço (não expostas ao cliente).

### Link público do cliente final

- Token público na URL (`/v/<token>`) é um UUID v4 (entropia de 122 bits), resistente a
  enumeração.
- O endpoint não requer autenticação e retorna apenas dados públicos (`descricao_publica`,
  sem `observacao_interna`, sem URLs de fotos).
- Rate limiting por IP no Nginx para prevenir brute-force de tokens.
- Log de acessos ao endpoint público não armazena o token como query param em claro por
  mais tempo que o necessário (log estruturado com token mascarado ou omitido).

---

## LGPD

### Bases legais

- **Execução de contrato:** dados de técnicos e operadores são tratados para viabilizar a
  prestação de serviço de gestão de visitas (art. 7º, V da LGPD).
- **Consentimento:** fotos capturadas pelos técnicos em propriedades dos clientes exigem
  consentimento explícito do titular (cliente final), registrado via assinatura eletrônica
  no PWA (campo `assinatura_coletada` em EventoVisita).
- **Legítimo interesse:** token público para acompanhamento da visita (art. 7º, IX),
  limitado ao estritamente necessário para a finalidade.

### Retenção

- Dados de visitas e eventos: retenção padrão de 5 anos (prazo prescricional civil),
  configurável por tenant.
- Fotos e anexos: vinculados ao período de retenção da visita. Exclusão em cascata.
- Dados de TentativaSincronizacao: TTL de 90 dias para expurgo automático (particionamento
  por timestamp no TimescaleDB).
- Refresh tokens revogados: removidos do Redis após expiração ou uso.

### Requisições de titular

- **Exclusão:** endpoint admin para deleção de dados de um titular (cliente final). Remove
  registros em Cliente, Visita, EventoVisita, Anexo (cascata). Fotos no MinIO são excluídas
  via worker assíncrono. Registro de exclusão mantido por 5 anos para compliance (sem dados
  pessoais, apenas ID da operação e timestamp).
- **Portabilidade:** endpoint para exportação de dados do titular em formato JSON
  estruturado, incluindo metadados de visitas e eventos. Fotos são fornecidas como URLs
  pré-assinadas com TTL estendido (24h) para download.

### Tratamento de fotos

- Fotos são armazenadas no MinIO com criptografia server-side (SSE-S3).
- Thumbnails gerados não contêm metadados EXIF originais (stripped no processamento).
- Acesso às fotos é registrado em log de auditoria (quem, quando, qual storage_key).
- Consentimento registrado no campo `assinatura_coletada`; fotos sem consentimento não
  podem ser processadas ou visualizadas por terceiros.

---

## Observabilidade

### Logs

- **Formato:** JSON estruturado (campos: timestamp, level, service, trace_id, message,
  context).
- **Coleta:** stdout/stderr dos containers, agregados pelo Docker logging driver ou
  Fluentd em produção.
- **Níveis:** DEBUG (desenvolvimento), INFO (produção — operações normais), WARNING
  (retentativas, conflitos), ERROR (falhas de sync, upload, auth).

### Métricas

- **Aplicação (FastAPI):** contadores de requisições por endpoint e status code,
  histogramas de latência, gauges de operações pendentes de sync.
- **Worker (Celery):** contadores de tarefas processadas/sucesso/falha, tempo de execução.
- **Infra:** CPU, memória, conexões de banco, filas RabbitMQ (mensagens pendentes,
  consumidores ativos).
- **Coleta:** Prometheus scrape nos endpoints `/metrics` de cada serviço.

### Traces

- **Trace ID:** propagado via header `X-Trace-Id` entre API e workers.
- **Instrumentação:** OpenTelemetry SDK no FastAPI e Celery.
- **Export:** OTLP para um collector (ex.: Jaeger ou Grafana Tempo na V1).

### Alertas

- **Críticos (P1):** taxa de erro 5xx > 1%, fila RabbitMQ > 1000 mensagens acumuladas,
  latency p95 > 1s.
- **Atenção (P2):** taxa de conflitos de sync > 5%, uso de CPU > 80%, conexões PostgreSQL
  próximas do limite.
- **Negócio (P3):** volume de visitas criadas abaixo da média semanal (possível falha de
  integração), taxa de sincronização offline abaixo de 90%.

### O que olhar primeiro quando algo dá errado

1. **Dashboard de erros 5xx:** por endpoint e por serviço.
2. **Logs recentes:** filtrar por `level=ERROR` nos últimos 5 minutos.
3. **Fila RabbitMQ:** mensagens acumuladas ou consumidores inativos.
4. **Conexões PostgreSQL:** pool saturation ou queries lentas (pg_stat_statements).
5. **Redis:** latência e hit rate do cache de idempotência.

---

## Custo

### Pontos onde o custo pode escalar mal

- **Armazenamento de fotos (MinIO/S3):** 20 fotos × 5 MB por visita × 30.000 visitas/dia =
  3 TB/dia (pior caso). Em produção com S3, o custo de armazenamento e transferência pode
  crescer exponencialmente.
- **Transferência de dados:** upload direto ao S3 evita custo de transferência pela API,
  mas o download de fotos pelo Admin gera tráfego de saída.
- **TimescaleDB:** hypertables com particionamento diário geram muitas partições ao longo
  de meses; políticas de retenção e compressão nativa do TimescaleDB controlam isso.
- **RabbitMQ:** filas com mensagens não consumidas (ex.: worker offline) acumulam e
  consomem memória.

### Como controlar

- **Compressão de fotos:** reduzir resolução e tamanho no PWA antes do upload (target
  < 2 MB por foto sem perda significativa de qualidade).
- **Política de retenção de mídia:** expurgar fotos de visitas com mais de 5 anos.
- **Tiering de armazenamento:** mover fotos antigas para cold storage (ex.: S3 Glacier)
  após 12 meses.
- **CDN para leitura:** cache de fotos em CDN para reduzir tráfego de saída direto do S3
  (V2).
- **Limites por tenant:** quota de armazenamento por empresa, com alertas e bloqueio de
  novos uploads ao atingir o limite.
- **Monitoramento de custo:** dashboards de custo por serviço (S3, RDS, ElastiCache) com
  alertas de orçamento.
- **RabbitMQ:** TTL em filas e dead-letter queues para mensagens não processadas,
  evitando acúmulo indefinido.
