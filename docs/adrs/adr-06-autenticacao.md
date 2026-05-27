
# ADR 6: Autenticação e Autorização

## Contexto e problema

O sistema FieldOps possui três atores distintos (operador administrativo, técnico de campo,
cliente final) com necessidades de autenticação diferentes. Operadores e técnicos acessam
recursos protegidos; o cliente final acessa uma página pública apenas com um token. O PWA
precisa funcionar offline, o que impõe restrições adicionais: o técnico pode ficar sem
conexão por horas e seu token de acesso pode expirar. É necessário definir o mecanismo de
autenticação e autorização que equilibre segurança, usabilidade e a capacidade de renovar
credenciais em cenários offline.

## Opções consideradas

- **Sessão tradicional (cookies):** mantida pelo servidor, simples de implementar. Porém,
  inadequada para APIs que podem ser consumidas por múltiplos clientes (incluindo integrações
  B2B). Também dificulta a autenticação offline, pois a renovação depende de um round‑trip ao
  servidor que pode estar indisponível.

- **JWT (JSON Web Tokens) com access e refresh tokens:** access token de curta duração
  (15 min), refresh token de longa duração (7 dias) armazenado de forma segura. O access
  token é enviado em cada requisição. O PWA pode tentar renovar o access token assim que a
  rede voltar, usando o refresh token. Compatível com APIs REST e fácil de escalar
  horizontalmente sem estado compartilhado. Requer cuidado no armazenamento do refresh token
  (HttpOnly, Secure, SameSite para web, ou IndexedDB criptografada para PWA).

- **OAuth2/OIDC (ex.: Keycloak, Auth0):** solução completa e padronizada, com suporte a
  múltiplos provedores de identidade, escopos, e fluxos como PKCE para aplicações mobile.
  Seria a escolha mais robusta para um produto real, especialmente com integrações B2B. No
  entanto, adiciona complexidade de infraestrutura (um servidor de autorização separado)
  fora do escopo do desafio prático.

## Decisão tomada

**JWT com access + refresh tokens, associado a um modelo de autorização baseado em papéis
(RBAC).**

### Justificativas

- Simplicidade de implementação com FastAPI (bibliotecas como python-jose e fastapi-jwt-auth)
  e fácil de testar.

- Atende ao requisito offline: o PWA pode armazenar o refresh token criptografado na
  IndexedDB. Ao detectar conectividade, o service worker ou a lógica de sincronização tenta
  renovar o access token automaticamente antes de enviar o lote de eventos. Se o refresh
  também expirar, o técnico é notificado para fazer login novamente.

- Autorização por papel (admin, tecnico) é implementada como claims no token JWT. Endpoints
  podem ser protegidos com decoradores que verificam o papel.

- O cliente final não usa JWT; o endpoint público /v/<token> é autenticado apenas pelo token
  único da visita, que funciona como um segredo compartilhado. Isso simplifica e evita criar
  contas para clientes.

- Para integrações B2B futuras, o JWT pode evoluir para OAuth2 usando o mesmo formato de
  token, sem reescrever toda a lógica de autorização.

## Consequências

### Positivas

- Stateless: a API não precisa consultar um banco de dados para validar cada requisição
  (apenas verifica a assinatura do JWT). Isso melhora a performance e a disponibilidade.
- Renovação transparente melhora a experiência do técnico que trabalha offline.
- RBAC simples e direto, suficiente para os dois papéis atuais.
- O uso de refresh tokens permite revogar o acesso de um técnico (invalidando o refresh no
  banco) sem depender exclusivamente da expiração do access token.

### Negativas

- Armazenar tokens no lado cliente sempre envolve riscos. O refresh token, se roubado,
  permite acesso prolongado. Medidas de mitigação: armazenar em IndexedDB com criptografia
  (usando a Web Crypto API), rotacionar refresh tokens a cada uso (refresh token rotation) e
  revogar em caso de suspeita.

- A complexidade de implementar corretamente o refresh token rotation e a proteção contra
  ataques (XSS, CSRF) é alta e propensa a erros se feita manualmente.

- A falta de um servidor de autorização dedicado pode ser um limitador quando houver muitos
  clientes ou integrações. Para o estágio inicial, é uma troca aceitável.
