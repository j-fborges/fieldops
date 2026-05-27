
# ADR 7: Estratégia de Notificações

## Contexto e problema

FieldOps precisa notificar diferentes atores sobre eventos do sistema:

- **Técnicos de campo:** devem ser alertados sobre novas visitas atribuídas, mudanças de
  agenda, ou resolução de conflitos. O PWA pode receber notificações push mesmo com o
  navegador fechado? (Push API).

- **Operadores administrativos:** podem receber alertas de SLA estourado ou conflitos que
  requerem ação. Isso pode ser por e‑mail ou notificações no próprio dashboard
  (WebSocket/polling).

- **Clientes finais:** link de acompanhamento enviado por SMS ou WhatsApp no momento do
  agendamento. Lembretes da visita próxima.

A escolha deve considerar a necessidade de alcançar o usuário em tempo real, offline, e por
canais variados.

## Opções consideradas

- **Apenas e‑mail:** universal, mas inadequado para alertas em tempo real (técnico em campo
  não verifica e‑mail constantemente). Atrasos e baixa taxa de abertura.

- **Push Web (Push API + Service Worker):** ideal para o PWA do técnico, pois permite
  notificações nativas no dispositivo mesmo com o app fechado (em Android). No iOS, o
  suporte a Web Push foi adicionado recentemente (2023), mas ainda tem limitações. Permite
  ações rápidas. Contudo, não serve para clientes finais que não instalam o PWA.

- **WhatsApp via terceiro (API Business):** excelente para alcançar clientes finais no
  Brasil, onde o WhatsApp é ubíquo. Permite envio de mensagens com link, lembretes e
  interações simples. Custo por mensagem, mas altamente eficaz.

- **SMS:** alternativa ao WhatsApp, maior alcance (não depende de app), mas mais caro e com
  menor engajamento.

- **Notificações in‑app (WebSocket/polling):** para o admin web, atualizações em tempo real
  na interface (ex.: toast de novo conflito) podem ser feitas via WebSocket. Complementa, não
  substitui, canais externos.

## Decisão tomada

**Abordagem multicanal com separação por ator:**

- **Técnico de campo:** Web Push como canal primário de notificações. Configuração do Service
  Worker para receber pushes e exibir notificações do sistema operacional. Mensagens sobre
  novas visitas, alterações de status e resolução de conflitos.

- **Operador administrativo:** Notificações in‑app via WebSocket (ex.: para atualizações de
  status e conflitos) combinadas com e‑mail para alertas críticos fora do horário de uso do
  painel (SLA estourado).

- **Cliente final:** WhatsApp (via API de terceiro) para envio do link de acompanhamento e
  lembretes. SMS como fallback caso o número não esteja associado ao WhatsApp.

A escolha de serviços de terceiros para WhatsApp/SMS será abstraída atrás de uma interface
única (NotificationGateway), permitindo trocar de provedor sem impactar a lógica de negócio.
Para o MVP, as notificações podem ser simuladas (log) ou implementadas com serviços gratuitos
de teste.

## Consequências

### Positivas

- Cada ator recebe notificações pelo canal mais adequado ao seu contexto, melhorando
  engajamento e eficiência.
- O Web Push mantém o técnico informado mesmo quando não está ativamente usando o PWA,
  crucial para mudanças de última hora.
- O WhatsApp é um canal de alto engajamento para o cliente final, comum em empresas no Brasil.
- A separação de responsabilidades (API enfileira eventos, workers enviam notificações)
  mantém o sistema desacoplado e resiliente.

### Negativas

- Maior complexidade: implementar e manter múltiplos canais exige integrações distintas e
  lida com diferentes modos de falha.
- Custo: WhatsApp Business API e SMS têm custo por mensagem. Requer monitoramento para evitar
  estouro de orçamento.
- O Web Push depende de o técnico ter concedido permissão. Se negada, a notificação não chega;
  é necessário um fallback (ex.: polling no PWA quando aberto).
- A entrega de e‑mails pode ser inconsistente (spam) e não é em tempo real, mas é aceitável
  para alertas não urgentes.
