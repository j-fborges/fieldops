
# ADR 2: Estratégia de Sincronização Offline no PWA

## Contexto e problema

Os técnicos de campo frequentemente trabalham em áreas sem conectividade. O PWA deve
permitir iniciar e concluir visitas offline, armazenando as ações localmente e sincronizando
quando a rede retornar. Conflitos podem ocorrer: por exemplo, o operador cancelar uma visita
enquanto o técnico a conclui offline. É necessário definir como as operações offline são
modeladas e como os conflitos são detectados e tratados.

## Opções consideradas

- **Last-Write-Wins (LWW):** simples, baseado em timestamp da última modificação.
  Desvantagem: pode sobrescrever cancelamentos administrativos sem aviso, violando regras
  de negócio.

- **CRDTs (Conflict-free Replicated Data Types):** estruturas de dados que convergem
  automaticamente sem conflitos. Extremamente robustas para colaboração simultânea, mas
  complexas de implementar e exageradas para um domínio onde conflitos precisam
  de resolução humana.

- **Fila de eventos com idempotência e detecção de conflitos no servidor:** as ações offline
  são enviadas como uma fila de eventos com chaves de idempotência. O servidor processa cada
  evento contra o estado atual e retorna sucesso ou conflito (HTTP 409) quando o estado
  atual é incompatível com a ação (ex.: visita já cancelada).

## Decisão tomada

**Fila de eventos com idempotência e validação de estado no servidor.**

### Justificativas

- Mantém a lógica de negócio centralizada no backend, que é a fonte de verdade.

- A chave de idempotência (UUID gerado localmente) evita duplicação de eventos.

- Conflitos são detectados pelo servidor de forma determinística e retornados ao PWA, que
  exibe uma interface clara de resolução (modal de conflito, ticket de resolução). Isso é
  aceitável porque a taxa de conflitos esperada é baixa.

- Mais simples que CRDTs, adequado ao esforço do Desafio Tecnico.

## Consequências

### Positivas

- Lógica de negócio simples e fácil de auditar.
- Conflitos são tratados explicitamente, não mascarados por resolução automática.
- Idempotência garante segurança mesmo com retentativas.
- Implementação direta com IndexedDB (fila) e um endpoint /api/sync.

### Negativas

- Em caso de conflito, o técnico não tem sua ação aplicada automaticamente; precisa de
  intervenção (entrar em contato, abrir ticket).
- A latência de sincronização depende de o usuário estar online; não há resolução offline
  de conflitos.
- Para cenários com alta taxa de conflitos (ex.: múltiplos técnicos na mesma visita), poderia
  se tornar inconveniente. Nesse caso, uma evolução futura poderia adotar CRDTs para campos
  específicos.
