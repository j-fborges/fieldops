
# ADR 3: Banco Relacional vs. Híbrido e Escolha de SGBD

## Contexto e problema

O sistema precisa armazenar dados estruturados (empresas, técnicos, visitas, eventos) com
consultas complexas e relacionais, além de dar suporte a cache, filas, armazenamento de mídia
e possíveis dados semiestruturados (logs, metadados de fotos). A escala projetada é de 30.000
visitas/dia inicialmente, com crescimento para 300.000/dia. É necessário decidir se
utilizaremos apenas um banco relacional ou uma combinação de tecnologias.

## Opções consideradas

- **Apenas PostgreSQL (relacional puro):** simplicidade operacional, transações ACID, índices
  avançados, extensões (TimescaleDB para séries temporais). Mas não é ideal para cache de
  baixa latência ou filas robustas.

- **Híbrido: PostgreSQL + Redis + MinIO/S3:** PostgreSQL para dados transacionais, Redis para
  cache de sessões, filas pub/sub e chaves de idempotência, MinIO/S3 para mídia. MongoDB
  poderia ser adicionado para logs ou dados semiestruturados, mas não no MVP.

- **Apenas MongoDB (documental):** flexibilidade de esquema, mas fraco em joins e restrições
  de integridade, não recomendado para dados fortemente relacionais como visitas com múltiplos
  eventos e anexos.

## Decisão tomada

**Arquitetura híbrida com PostgreSQL como banco primário, RabbitMQ como message broker para
tarefas assíncronas, Redis como cache e chaves de idempotência, e MinIO/S3 para armazenamento
de mídia.**

### Justificativas

- PostgreSQL atende os requisitos relacionais com performance, possui suporte a
  particionamento e, com a extensão TimescaleDB, lida eficientemente com séries temporais
  (eventos de visita, métricas de SLA).

- RabbitMQ oferece garantias de entrega, tolerância a falhas e roteamento avançado para
  tarefas assíncronas de longa duração (processamento de fotos, notificações).

- Redis resolve baixíssima latência para verificação de idempotência, cache de tokens e
  sessões, além de filas pub/sub leves.

- MinIO/S3 é a prática recomendada para armazenamento de arquivos, desacoplando a API do
  disco e permitindo escalabilidade independente.

- MongoDB não é adotado inicialmente, mas sua inclusão futura seria natural para logs de
  auditoria ou metadados de fotos que variam por tipo de serviço.

## Consequências

### Positivas

- Cada camada utiliza a ferramenta especializada, maximizando performance e custo-benefício.
- PostgreSQL garante integridade transacional e consultas complexas (filtros, relatórios).
- RabbitMQ garante entrega confiável de tarefas assíncronas.
- Redis reduz carga no banco principal e viabiliza operações de baixa latência.
- A separação da mídia em object storage simplifica backups e conformidade LGPD.

### Negativas

- Complexidade operacional: quatro serviços para gerenciar, monitorar e manter.
- Necessidade de conhecimento da equipe em múltiplas tecnologias.
- Risco de inconsistência em caso de falha entre PostgreSQL e Redis (mitigado por padrões
  como cache-aside e uso de transações).
