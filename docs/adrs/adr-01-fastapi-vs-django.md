
# ADR 1: FastAPI vs. Django

## Contexto e problema

O backend da plataforma FieldOps precisa expor uma API REST para os frontends (admin e PWA),
processar uploads de mídia, gerenciar uma fila de sincronização offline e executar jobs
assíncronos (notificações, processamento de imagens). O sistema terá picos de I/O (uploads concorrentes,
envio de lotes de eventos) e a interface administrativa será construída como SPA React,
não utilizando o Django Admin.

## Opções consideradas

- **Django + Django REST Framework (DRF):** framework maduro, com ORM integrado, painel
  admin automático, vasto ecossistema de pacotes. Porém, é síncrono por padrão; o suporte assíncrono
  (ASGI) ainda é limitado e exige adaptações.

- **FastAPI:** framework moderno e assíncrono, com validação de dados via Pydantic,
  documentação automática OpenAPI, performance comparável a Node.js/Go em cargas I/O-bound.
  Exige escolha separada de ORM (SQLAlchemy) e não fornece admin automático.

## Decisão tomada

**FastAPI** será o framework principal do backend.

### Justificativas

- A carga de trabalho é predominantemente I/O-bound (uploads, sincronização, chamadas a
  serviços externos). FastAPI com async/await oferece melhor throughput e menor consumo
  de recursos, alinhando-se ao requisito de escala 10x em 18 meses.

- A interface administrativa será inteiramente construída em React, eliminando a principal
  vantagem do Django (admin automático).

- A validação com Pydantic e a geração automática de OpenAPI aceleram o desenvolvimento e
  facilitam a integração com o frontend.

- Ecossistema compatível com os requisitos: SQLAlchemy async para banco, Celery/RQ para
  filas, boto3 para S3, etc.

## Consequências

### Positivas

- Alta performance e concorrência sem necessidade de infraestrutura adicional (workers,
  threads).
- Tipagem forte e validação de dados automática reduzem erros em runtime.
- Documentação interativa (Swagger UI) disponível por padrão para todos os endpoints.
- Menor consumo de memória e CPU comparado a servidores WSGI tradicionais.

### Negativas

- A equipe pode ter menos familiaridade com FastAPI e padrões assíncronos, exigindo
  capacitação.
- O ecossistema de pacotes "batteries‑included" é menor; funcionalidades como autenticação,
  permissões e admin precisam ser integradas manualmente.
- O ORM (SQLAlchemy) requer mais configuração inicial e conhecimento comparado ao Django ORM.
