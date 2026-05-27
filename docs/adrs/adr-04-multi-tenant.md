
# ADR 4: Estratégia Multi-Tenant

## Contexto e problema

A plataforma atenderá múltiplas empresas clientes (tenants), cada uma com seus próprios
técnicos, clientes e visitas. A LGPD exige isolamento rigoroso de dados pessoais. A escala
inicial é de 50 tenants, podendo chegar a 500+. É necessário escolher o nível de isolamento
que equilibre segurança, economia e simplicidade operacional.

## Opções consideradas

- **Schema único com tenant_id e Row-Level Security (RLS):** todas as tabelas possuem uma
  coluna empresa_id e políticas de RLS no PostgreSQL garantem que cada sessão enxergue apenas
  os dados do seu tenant.

- **Schema por tenant:** cada tenant possui um schema separado no mesmo banco. Isolamento
  lógico mais forte, backups por schema mais simples, mas complica migrations (executar em N
  schemas) e exige lógica de roteamento de conexão.

- **Banco por tenant:** cada tenant possui um banco de dados dedicado. Máximo isolamento
  físico, mas custo elevado, gerenciamento complexo e difícil de escalar para muitos tenants
  pequenos.

## Decisão tomada

**Schema único com tenant_id e Row-Level Security (RLS).**

### Justificativas

- A RLS aplicada no PostgreSQL garante que mesmo que uma query seja mal escrita, o banco automaticamente filtrará os registros do
  tenant correto. Isso é uma camada adicional de segurança que protege contra falhas humanas.

- Economia de custos: um único banco para gerenciar, com um único pool de conexões, backups
  e monitoramento.

- Facilidade de adição de novos tenants.

- Atende aos requisitos LGPD de isolamento lógico; a exclusão de dados de um titular pode
  ser garantida por políticas de RLS e procedimentos de deleção.

## Consequências

### Positivas

- Forte segurança no nível de banco de dados (defesa em profundidade).
- Operações simplificadas (um banco para fazer deploy, atualizar, monitorar).
- Baixo custo de infraestrutura.
- Adição instantânea de novos tenants.

### Negativas

- Menor isolamento de performance: uma consulta pesada de um tenant pode impactar outros.
  Mitigável com monitoramento e resource queues.
- Recuperação de dados de um único tenant em caso de desastre é mais complexa.
- Se um tenant exigir criptografia de chave separada ou hardware dedicado, não será atendido
  por essa arquitetura; nesse caso, migração para banco próprio seria necessária.
