
# Diagrama de User Stories — Cliente Final

## Apresentação

Este diagrama de sequência detalha o fluxo de interação do **Cliente Final** com o sistema
FieldOps. O Cliente é o proprietário da planta solar (residencial, comercial ou industrial)
que recebe um link único por SMS ou WhatsApp. Não possui cadastro nem autenticação — acessa
uma página pública onde pode acompanhar o status da visita, saber qual técnico foi designado
e visualizar uma linha do tempo resumida dos eventos, sem exposição de dados sensíveis como
fotos internas ou observações técnicas.

O diagrama cobre o acesso via token público, a exibição segura de informações e o tratamento
de tokens inválidos.

## User Stories cobertas

| ID | História |
|----|----------|
| C01 | Como cliente, quero acessar um link único (URL) que recebi por SMS/e-mail, para acompanhar o status da minha visita sem precisar de login. |
| C02 | Como cliente, quero ver na página pública: status atual, nome do técnico designado, janela de horário prevista e uma linha do tempo resumida, para saber quando a equipe chegará e o que já foi feito. |
| C03 | Como cliente, quero que a página pública seja segura e não exponha dados sensíveis (fotos, observações internas), para proteger minha privacidade e dados do meu sistema solar. |

## Diagrama de Sequência

```mermaid
sequenceDiagram
    actor C as Cliente
    participant PV as Página Pública (React)
    participant API as FastAPI
    participant DB as PostgreSQL

    Note over C,DB: === INÍCIO C01 — Acesso ao Link Público ===

    C->>PV: Acessa link /v/<token> (via SMS/e-mail)
    Note over PV: **Tela de Carregamento**<br>Spinner ou esqueleto
    PV->>API: GET /v/<token>
    API->>DB: SELECT visita (status, técnico, janela)<br>e eventos públicos (descricao_publica, sem fotos/obs interna)
    DB-->>API: Dados (ou vazio)
    alt Token inválido ou visita inexistente
        API-->>PV: 404 Not Found
        Note over PV: **Tela de Erro**<br>"Visita não encontrada"<br>Verifique o link ou entre em contato
    else Token válido
        API-->>PV: 200 OK (dados públicos da visita)
        Note over PV: **Tela de Status da Visita**<br>Componentes:
        Note over PV: Indicador de Status da Visita Atual (badge):<br>Agendado/Em andamento/Concluído/Cancelado
        Note over PV: Nome do técnico designado
        Note over PV: Janela prevista para próximo evento:<br>• data e horário estimado,<br>• Descrição curta (baseada no Tipo de Evento),<br>• Tipo de evento
        Note over PV: Feed vertical - Linha do tempo de Eventos da Visita,<br>com campos:<br>• data/hora,<br>• Descrição pública do evento,<br>• Tipo de evento,<br>• ??Assinatura do Cliente Coletada? (Booleano)??
    end

    Note over C,DB: FIM C01 / INÍCIO C02 e C03 — Visualização e Segurança

    Note over PV: LGPD (Proteção de dados do Técnico e Cliente):<br>A tela já exibida contém apenas informações públicas.<br>Não há fotos, observações internas ou dados sensíveis.
    Note over PV: O cliente pode recarregar a página para atualizar o status.
    Note over C,DB: FIM C02/C03 — Fluxo do Cliente completo
```
