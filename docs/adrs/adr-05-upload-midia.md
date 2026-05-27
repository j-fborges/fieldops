
# ADR 5: Estratégia de Upload de Mídia

## Contexto e problema

Os técnicos de campo anexam fotos (até 20 por visita, ~5 MB cada) que podem ser capturadas
offline. Essas fotos precisam ser enviadas ao servidor e armazenadas de forma segura,
escalável e em conformidade com a LGPD. O upload não pode comprometer a performance da API,
especialmente quando ocorrer em rajadas durante a sincronização pós‑offline. É necessário
decidir se as fotos serão transmitidas através da API ou enviadas diretamente ao object
storage.

## Opções consideradas

- **Upload via API (multipart/form‑data):** o backend recebe o arquivo, valida, processa
  (thumbnail, compressão) e armazena no disco ou no object storage. Simples de implementar
  e garante que todas as regras de negócio sejam aplicadas no ponto central. Porém,
  sobrecarrega a API com tráfego de grande volume e consome recursos de CPU/memória que
  poderiam ser usados para outras requisições. A latência de sincronização seria maior porque
  o PWA teria que esperar a API processar cada foto.

- **Upload direto para object storage com URL pré‑assinada:** o frontend solicita ao backend
  uma URL pré‑assinada (assinada com HMAC ou usando credenciais temporárias) e faz o upload
  diretamente para o MinIO/S3. Após o upload, notifica o backend com os metadados (URL,
  tamanho, tipo). O backend pode então acionar processamento assíncrono (worker). Isso
  desacopla a transferência de dados da lógica da API, reduzindo a carga e melhorando a
  experiência do usuário.

## Decisão tomada

**Upload direto para object storage com URL pré‑assinada.**

### Justificativas

- A API não é sobrecarregada com streams de 5 MB por foto; ela apenas gera URLs temporárias
  e registra metadados.

- O upload offline é impossível (sem rede). Mas quando a sincronização ocorrer, o PWA
  enviará as fotos em paralelo diretamente ao storage, tornando o processo mais rápido e
  resiliente.

- O MinIO (ou S3 em produção) escala horizontalmente para lidar com muitos uploads
  simultâneos, enquanto a API permanece leve.

- O processamento das fotos (redimensionamento, compressão) pode ser delegado a um worker
  que escuta eventos de upload (via webhook do MinIO ou notificação do backend), mantendo a
  API rápida.

- Alinhado com as melhores práticas de segurança e performance para aplicações que lidam com
  mídia.

## Consequências

### Positivas

- Redução significativa da carga na API, melhorando a latência de outras requisições.
- Uploads mais rápidos porque o cliente se conecta diretamente ao storage, que pode estar
  geograficamente mais próximo (em produção com CDN).
- Separação clara de responsabilidades: API gerencia metadados, storage gerencia arquivos.
- URLs pré‑assinadas podem ter TTL curto e escopo limitado, reduzindo riscos de segurança.

### Negativas

- Complexidade adicional: o fluxo de upload agora envolve duas chamadas (obter URL + upload)
  e possivelmente uma terceira (confirmação). O PWA precisa gerenciar essa orquestração,
  inclusive retentativas.

- O backend perde o controle direto sobre o conteúdo do arquivo no momento do upload.
  Validações como tamanho e tipo podem ser aplicadas no frontend e também no worker, mas o
  arquivo já estará no storage. Mitiga‑se com políticas de bucket (ex.: rejeitar arquivos
  > 5 MB) e validação assíncrona.

- Em ambientes de desenvolvimento (Docker Compose) é necessário incluir o MinIO, o que
  aumenta ligeiramente a complexidade do setup inicial.
