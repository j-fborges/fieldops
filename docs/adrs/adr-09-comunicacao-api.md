
# ADR 9: Comunicação/Integração com API do Backend

## Contexto e problema

O backend (FastAPI) expõe uma API REST documentada automaticamente via OpenAPI. O frontend
precisa consumir endpoints para CRUD de visitas, upload de mídia, sincronização offline e
consulta pública. Existem diferentes consumidores (admin SPA, PWA, futuros parceiros B2B) com
necessidades distintas de flexibilidade de consulta. É preciso definir o estilo de API que
guiará a comunicação, considerando implicações na performance, na manutenção do código e na
capacidade de evoluir o sistema de forma coesa.

## Opções consideradas

- **GraphQL:** permite que o cliente especifique exatamente os campos e relacionamentos
  necessários em uma única requisição, reduzindo overfetching e underfetching. Brilha quando
  múltiplos clientes precisam de visões diferentes dos mesmos dados. Entretanto, introduz
  complexidade significativa no backend (schema GraphQL, resolvers, N+1, DataLoaders) e no
  frontend (cliente Apollo/Relay, cache normalizado, atualizações otimistas manuais). O fluxo
  de sincronização offline precisaria ser adaptado para operações GraphQL, perdendo o
  alinhamento natural com semântica REST. Para o número inicial de clientes e
  a stack Python/React, a complexidade adicional não se justifica.

- **tRPC/gRPC:** oferecem contratos fortemente tipados e chamadas eficientes, mas são mais
  adequados para comunicação serviço‑a‑serviço ou quando front e back compartilham o mesmo
  repositório TypeScript. Como o backend é Python, seria uma "tRPC adaptada" via OpenAPI(FastAPI).
  gRPC exigiria um proxy/gateway para a web, adicionando complexidade e indo contra a stack definida.

- **REST com OpenAPI:** a API é descrita por um contrato OpenAPI gerado automaticamente pelo
  FastAPI. O cliente pode gerar tipagens TypeScript e hooks (ex.: openapi-typescript +
  openapi-react-query-codegen) a partir desse schema, garantindo segurança de tipos ponta a
  ponta. REST é simples de entender, depurar e cachear (HTTP caching, CDN). Os endpoints de
  sincronização (POST /api/sync com Idempotency-Key) se beneficiam diretamente da semântica
  HTTP. Para o cliente público (/v/<token>), um GET resolve.

## Decisão tomada

**API REST documentada via OpenAPI, consumida pelo RTK Query no frontend.**

### Justificativas

- O FastAPI gera automaticamente o schema OpenAPI, que serve como contrato único entre front
  e back. Com ferramentas de geração de código, os tipos TypeScript e hooks do RTK Query são
  gerados automaticamente, eliminando erros de digitação e acelerando o desenvolvimento.

- REST alinha-se perfeitamente com os padrões de cache e invalidação do RTK Query (tags por
  endpoint/entidade).

- A semântica REST é um encaixe natural para o fluxo offline: POST /api/sync com header
  Idempotency-Key, respostas 200/409 para conflitos, GET público sem autenticação.

- A simplicidade do REST facilita a integração de parceiros B2B futuros, que não precisam
  aprender uma query language proprietária.

- Menor esforço de manutenção no backend: não é necessário manter schema GraphQL, resolvers e
  DataLoaders; o SQLAlchemy com consultas otimizadas (e TimescaleDB) entrega os dados de
  forma eficiente para endpoints REST.

- O upload direto para S3 com URL pré-assinada é um fluxo essencialmente REST (PUT para o
  storage, POST para confirmar metadados).

## Consequências

### Positivas

- Alinhamento total com a stack FastAPI + RTK Query, com geração automática de tipos e
  documentação sempre atualizada.
- Simplicidade de depuração: cada recurso tem um endpoint previsível; as requisições podem
  ser inspecionadas com ferramentas padrão (Postman, DevTools).
- O cache do RTK Query funciona "out of the box" com REST; invalidação por tags é intuitiva
  (ex.: "criou visita, invalidar lista").
- A sincronização offline se integra sem adaptações: a fila persiste ações que serão
  executadas como chamadas REST quando a rede voltar.
- Adequado para a escala prevista; se no futuro houver necessidade de consultas mais flexíveis
  para parceiros, é possível expor um endpoint GraphQL complementar sem substituir o REST.

### Negativas

- Possibilidade de overfetching em algumas telas do admin, onde uma visão pode precisar de
  dados de múltiplos recursos. Mitigável com endpoints compostos (ex.:
  /api/visitas/{id}/detalhes que já retorna timeline e URLs de anexo) e uso de sparse
  fieldsets se necessário.

- Para o PWA, a granularidade do cache REST pode ser menos eficiente que o cache normalizado
  do Apollo Client. Contudo, a combinação RTK Query + Dexie resolve isso com cache local
  espelhado e estratégias de atualização.

- Mudanças no schema da API exigem coordenação cuidadosa para não quebrar o contrato; a
  geração de tipos a partir do OpenAPI mitiga esse risco, mas requer disciplina no
  versionamento.
