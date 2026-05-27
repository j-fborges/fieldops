
# ADR 8: Gerenciamento de Estados Cliente, UI e Cache

## Contexto e problema

FieldOps possui duas interfaces React: um painel administrativo (SPA sempre online) e um PWA
para técnicos de campo (offline-first). Ambos precisam gerenciar três categorias de estado:

- **Estado de servidor:** dados vindos da API (visitas, eventos, anexos), que exigem cache,
  invalidação e atualização otimista.

- **Estado global:** autenticação, permissões, tema, status de conectividade, fila de
  sincronização.

- **Estado de UI:** modais, formulários, filtros, indicadores locais.

O PWA impõe desafios adicionais: cache offline persistente (IndexedDB), fila de operações
pendentes que sobrevive a fechamentos do app, e sincronização transparente ao reconectar. É
necessário definir uma stack de gerenciamento de estado que unifique as duas aplicações, reduza
duplicação de lógica e trate de forma consistente os cenários online e offline.

## Opções consideradas

- **Zustand + TanStack Query (React Query) + Context API:** Zustand para estado global (auth,
  UI) e TanStack Query para cache de dados do servidor. É uma stack moderna, com APIs
  minimalistas e boa performance. Entretanto, a integração entre as bibliotecas fica a cargo
  do desenvolvedor: a fila offline, a persistência seletiva no Dexie e a lógica de
  sincronização precisariam ser construídas como hooks customizados ou middlewares externos,
  sem um padrão unificado. A divisão de responsabilidades entre Zustand (síncrono) e TanStack
  Query (assíncrono).

- **Context API + useReducer + fetch manual:** abordagem nativa, sem dependências externas.
  Rapidamente se torna inviável para cenários complexos como cache offline com Dexie,
  deduplicação de requisições e middlewares de logging/efeitos colaterais. Descartada por não
  oferecer suporte adequado aos requisitos.

- **Redux Toolkit (RTK) + RTK Query + Dexie (apenas PWA):** Proposta de Stack unificada. RTK
  Query gerencia o estado do servidor com cache, invalidação e optimistic updates integrados
  ao Redux. Slices do Redux gerenciam estado global e a fila de sincronização. Middlewares
  como createListenerMiddleware permitem reagir a ações de forma previsível (ex.: persistir
  no Dexie quando uma visita é carregada, disparar sincronização quando a rede volta). A
  baseQuery do RTK Query é customizada para rotear leituras para Dexie quando offline,
  mantendo a mesma API de hooks (useQuery, useMutation) para os componentes.

## Decisão tomada

**Redux Toolkit + RTK Query para ambas as aplicações, com Dexie.js como cache e persistência
offline exclusivamente no PWA.**

### Justificativas

- Unificação da stack: o mesmo padrão de estado no Admin e no PWA reduz a carga cognitiva e
  permite compartilhar slices de autenticação, tipos de resposta e lógica comum. A equipe
  transita entre os projetos sem trocar de paradigma.

- Ecossistema integrado: RTK Query já é parte do Redux, eliminando a necessidade de integrar
  manualmente fetching (TanStack Query) com estado global (Zustand). Toda ação é rastreável
  no Redux DevTools, inclusive chamadas de API e atualizações de cache.

- Offline-first com middlewares previsíveis: em vez de tratar o offline como um caso especial
  externo, a lógica é tecida no fluxo Redux. Um middleware escuta ações de fetch fulfilled e
  sincroniza os dados com Dexie; a baseQuery consulta Dexie quando offline, mantendo
  componentes alheios à conectividade. A fila de operações pendentes é um slice Redux comum,
  persistida em Dexie para sobreviver a fechamentos do app.

- Escalabilidade da complexidade: o RTK lida nativamente com thunks assíncronos, efeitos
  colaterais (listeners) e extensibilidade (middlewares), padrões que seriam ad‑hoc com
  Zustand + TanStack Query. À medida que o produto cresce, a previsibilidade do Redux
  facilita a manutenção.

## Consequências

### Positivas

- Stack única, coesa e alinhada com o restante da arquitetura (FastAPI, REST, OpenAPI).
- Rastreabilidade completa com Redux DevTools, essencial para depurar fluxos offline
  complexos.
- Separação clara de responsabilidades: RTK Query para servidor, slices para UI/fila, Dexie
  como camada de persistência offline.
- A baseQuery customizada isola a complexidade da conectividade; componentes permanecem
  simples e testáveis.
- Menor número de dependências para gerenciar (RTK já inclui fetch, cache e gerenciamento de
  estado).

### Negativas

- Boilerplate inicial um pouco maior que Zustand + TanStack Query, embora createSlice e
  createApi tenham reduzido significativamente.
- A curva de aprendizado do RTK Query (endpoints, tags, invalidação) pode ser íngreme para
  quem nunca usou.
- A integração Dexie + Redux é customizada; não há plugin oficial, exigindo implementação
  própria de middlewares de sincronização.
- Em cenários mais simples, a stack poderia ser considerada "overengineering", mas para os
  requisitos offline do FieldOps, a complexidade adicional se justifica.
