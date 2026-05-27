classDiagram
    direction LR

    %% Entidades de domínio (espelho do backend, cache Dexie e respostas API) %%
    class Empresa {
        +string id
        +string nome
    }

    class Usuario {
        +string id
        +string empresa_id
        +string email
        +string nome
        +string role
    }

    class Cliente {
        +string id
        +string empresa_id
        +string nome
        +string telefone
        +string email
        +string endereco
    }

    class Visita {
        +string id
        +string empresa_id
        +string tecnico_id
        +string cliente_id
        +string data_agendada
        +string tipo
        +string status
        +string token_publico
        +string created_at
        +string updated_at
        +boolean possuiConflitosPendentes()
    }

    class EventoVisita {
        +string id
        +string visita_id
        +string tipo
        +string status_sincronizacao
        +string timestamp
        +string observacao_interna
        +string descricao_publica
        +boolean assinatura_coletada
        +string origem
        +string idempotency_key
        +string created_at
    }

    class Anexo {
        +string id
        +string evento_id
        +string tipo
        +string storage_key
        +number tamanho_bytes
        +string mime_type
        +string created_at
    }

    class TicketResolucao {
        +string id
        +string visita_id
        +string evento_conflitante_id
        +string status
        +string observacao_tecnico
        +string resolucao_operador
        +string created_at
        +string resolvido_at
    }

    class TentativaSincronizacao {
        +string id
        +string evento_id
        +string timestamp
        +string resultado
        +string detalhes
        +string idempotency_key
    }

    %% Modelos específicos do PWA (Dexie e fila) %%
    class PendingOperation {
        +string id
        +string type
        +string visitaId
        +object payload
        +string status
        +string createdAt
        +string lastAttemptAt
        +string errorMessage
        +string ticketId
    }

    class SyncQueueItem {
        +string id
        +string operationId
        +string visitaId
        +string type
        +string status
        +string createdAt
    }

    %% Estado Redux %%
    class AuthState {
        +string accessToken
        +string refreshToken
        +Usuario user
        +boolean isAuthenticated
    }

    class ConnectivityState {
        +boolean isOnline
        +string lastOnlineAt
    }

    class SyncState {
        +SyncQueueItem[] queue
        +boolean isSyncing
        +number progress
        +string error
    }

    %% Relacionamentos %%
    Visita "1" -- "0..*" EventoVisita : possui
    Visita "1" -- "0..*" TicketResolucao : gera
    EventoVisita "1" -- "0..*" Anexo : contem
    EventoVisita "1" -- "0..*" TentativaSincronizacao : registra
    EventoVisita "1" -- "0..1" TicketResolucao : referencia

    Visita "1" -- "1" Cliente : pertence a
    Visita "1" -- "1" Usuario : designada a
    Visita "1" -- "1" Empresa : pertence a

    PendingOperation "1" -- "1" Visita : associada a
    SyncQueueItem "1" -- "1" PendingOperation : representa

    AuthState "1" -- "1" Usuario : contém
    SyncState "1" -- "0..*" SyncQueueItem : gerencia