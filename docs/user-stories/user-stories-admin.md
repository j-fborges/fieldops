
# Diagrama de User Stories — Operador Administrativo (Admin)

## Apresentação

Este diagrama de sequência detalha o fluxo completo de interações do **Operador
Administrativo** com o sistema FieldOps. O Admin utiliza o sistema via navegador desktop em
ambiente de escritório com conexão estável. Suas principais responsabilidades são agendar
visitas técnicas a plantas solares, acompanhar o status da operação em tempo real, visualizar
detalhes de atendimentos (incluindo fotos anexadas pelos técnicos) e gerenciar conflitos de
sincronização quando ações offline dos técnicos colidem com operações realizadas no painel.

O diagrama cobre desde o login até a criação de visitas, passando pela listagem com filtros,
visualização de detalhes com timeline e galeria de fotos, e a geração automática de um token
público para o cliente final acompanhar a visita sem autenticação.

## User Stories cobertas

| ID | História |
|----|----------|
| A01 | Como operador administrativo, quero fazer login no sistema, para acessar as funcionalidades restritas de gestão de visitas. |
| A02 | Como operador, quero visualizar uma lista de todas as visitas agendadas, para acompanhar o status da operação em tempo real. |
| A03 | Como operador, quero filtrar a lista de visitas por data, técnico responsável e status, para localizar rapidamente determinadas ordens de serviço. |
| A04 | Como operador, quero visualizar o detalhe de uma visita, com sua timeline de eventos e fotos anexadas, para ter uma visão completa do atendimento sem precisar contatar o técnico. |
| A05 | Como operador, quero agendar uma nova visita, selecionando o cliente, o técnico, a data/hora e o tipo de serviço (instalação, manutenção, vistoria), para designar corretamente a equipe de campo. |
| A06 | Como operador, quero que o sistema atribua um token único público a cada visita, para que o cliente possa acompanhar o status sem login. |

## Diagrama de Sequência

```mermaid
sequenceDiagram
    actor A as Operador Administrativo
    participant W as Web Admin UI
    participant API as FastAPI
    participant DB as PostgreSQL
    participant Redis as Redis
    participant S3 as MinIO (S3)

    Note over A,S3: === INÍCIO A01 — Login ===

    A->>W: Acessa tela de login
    Note over W: **Renderiza formulário**<br>Campos: Email/Usuário e Senha
    A->>W: Insere credenciais e submete
    W->>API: POST /auth/login (email, senha)
    opt Operador não faz login (erro)
        API->>DB: Valida credenciais
        DB-->>API: Inválidas
        API-->>W: 401 ERROR (error code + message)
        Note over W: Toast de Erro<br>Feedback de erro (sub-campo)
    end
    opt Operador faz login
        API->>DB: Valida credenciais
        DB-->>API: Dados do usuário e perfil
        API-->>W: 200 OK (access token + refresh token)
        Note over W: Toast de Sucesso
        Note over W: Armazena refresh token em cookie<br>httpOnly, Secure, SameSite<br>Access token em memória JavaScript
        Note over W: Redirecionamento
        W-->>A: Redireciona para dashboard
    end

    Note over A,S3: FIM A01 / INÍCIO A02 e A03 — Listar e Filtrar Visitas
    Note over A,W: ??(Primeira tela == tela de Visitas??)
    A->>W: Acessa tela "Visitas"
    W->>API: GET /api/visitas (com token)
    API->>DB: SELECT visitas (todas, paginado)
    DB-->>API: Dados
    API-->>W: JSON com lista de visitas
    Note over W: Tabela de visitas com campos:<br>• ID da Visita,<br>• Tipo de Visita,<br>• Cliente,<br>• Técnico de Campo,<br>• Data da Visita,<br>• Status<br>• Badge "Possui Conflitos Pendentes"<br>(quando há TicketResolucao aberto)
    Note over W: Paginação, Loading e Error fallback.
    A->>W: Seleciona filtros (data, técnico, status)
    Note over W: Barra de filtros - campos:<br>• input de ID,<br>• data inicial/final,<br>• dropdown de Tipo de Visita,<br>• dropdown de Cliente,<br>• dropdown de Técnico,<br>• dropdown de status
    W->>API: GET /api/visitas?tecnico=3&status=agendado&data=...
    API->>DB: SELECT com filtros
    DB-->>API: Resultados filtrados
    API-->>W: JSON atualizado
    Note over W: Atualiza tabela com filtros aplicados
    A->>W: Seleciona Visita

    Note over A,S3: FIM A02/A03 / INÍCIO A04 — Ver Detalhes da Visita

    A->>W: Clica em uma visita específica
    W->>API: GET /api/visitas/123
    API->>DB: SELECT visita + eventos + anexos (storage_key)
    DB-->>API: Dados completos
    API-->>W: JSON com timeline e URLs pré-assinadas das fotos
    W-->>A: Exibe detalhes: timeline, galeria de fotos
    Note over W: Tela de detalhe com:<br>
    Note over W: Cabeçalho de Visita - dados:<br>• ID da Visita,<br>• Tipo de Visita,<br>• Cliente,<br>• Técnico de Campo,<br>• Data da Visita,<br>• Status
    opt ??Resolução de conflitos com Sincronização do Técnico de Campo??
        W->>W: Exibe lista de Tickets de Resolução pendentes
        Note over W: Lista de eventos conflitantes:<br>• Observação do Técnico<br>• Dados do evento<br>• Botão Resolver
        A->>W: Clica Botão Resolver
        Note over W: Modal: Aceitar/Rejeitar mudanças do técnico
        W->>API: PATCH /api/tickets/{id} (resolucao_operador)
        API-->>W: 200 OK (ticket atualizado)
    end
    Note over W: Feed de eventos da Visita:<br>• ID de Evento,<br>• Tipo de Evento,<br>• Data do Evento,<br>• Descrição pública (se aplicável),<br>• Observação interna (apenas admin),<br>• ??Possui Assinatura do Cliente (Booleano)??,<br>• ??Imagem Assinatura do Cliente??,<br>• ??Lista de Fotos do Evento??
    Note over W: Galeria de fotos da Visita (thumbnails clicáveis)
    Note over W: Botão Voltar (para Visitas)
    W->>S3: Requisita imagens (URLs pré-assinadas)
    S3-->>W: Imagens
    Note over W: Lightbox da Galeria

    Note over A,S3: FIM A04 / INÍCIO A05 e A06 — Criar Visita e Token Público

    Note over W,A: Tela Visitas
    A->>W: Acessa "Nova Visita"
    Note over W,A: Tela Nova Visita
    Note over W: Renderiza formulário com campos select:<br>• Tipo de Visita,<br>• Cliente,<br>• Técnico de Campo,<br>• Data da Visita
    A->>W: Preenche dados (cliente, técnico, data, tipo)
    Note over W: Botão "Agendar"
    A->>W: Submete formulário
    W->>API: POST /api/visitas (payload)
    API->>DB: BEGIN TRANSACTION
    API->>API: Gera UUID v4 para token público
    API->>DB: INSERT Visita (com token público) + INSERT Evento ("agendado")
    API->>DB: COMMIT
    API-->>W: 201 Created (dados da visita + token público)
    Note over W: Toast de Sucesso
    Note over W: Exibe confirmação e link público copiável (/v/<token>)

    Note over A,S3: FIM A05/A06 — Fluxo do Admin completo
```
