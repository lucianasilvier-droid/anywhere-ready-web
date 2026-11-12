# GOOGLE NFC CONNECT — Controle de pendências

**Atualizado em:** 12/11/2026  
**Branch de trabalho:** `work/pendencias-sem-publicar-2026-11-12`  
**Branch de produção:** `main`  
**Regra desta rodada:** não publicar na Vercel, não criar preview deployment e não executar testes pela Vercel. Trabalhar somente no código e registrar as validações estáticas realizadas.

## Regras obrigatórias
- Não fazer deploy de produção ou preview sem autorização posterior explícita.
- Não consumir créditos da Vercel com testes.
- Não introduzir serviços pagos, planos pagos ou novas dependências que gerem cobrança.
- Preservar a branch de backup `backup/pre-implementation-2026-11-12`.
- Não marcar uma funcionalidade como concluída apenas porque foi alterado o código.
- Distinguir implementação, revisão estática, teste funcional e publicação.

## Alterações desta rodada — na branch de trabalho, ainda não publicadas

| Área | Alteração | Estado |
|---|---|---|
| CRM / busca de empresas | Busca consulta duplicidade no servidor com acesso privilegiado e devolve somente o sinalizador booleano `ja_cadastrado`, sem expor nome ou dados do representante responsável | Implementado no código; não testado funcionalmente |
| CRM / resultados | Resultados já cadastrados ficam identificados e são excluídos da ação “Adicionar todos” | Implementado no código; não testado funcionalmente |
| Proposta comercial | Catálogo de contingência passou a listar somente placas NFC individuais Google e Instagram; removido o item de kit | Implementado no código; não testado funcionalmente |
| Proposta comercial | Produtos cadastrados cujo nome contenha “kit”, “combo” ou “conjunto” são excluídos do catálogo enviado | Implementado no código; não testado funcionalmente |
| Proposta comercial | Ordem dos materiais ajustada para: site oficial, vídeo demonstrativo, prévia do site do estabelecimento e catálogo NFC | Implementado no código; não testado funcionalmente |

## Pendências conhecidas a trabalhar

### Prioridade alta
- [ ] Corrigir a experiência de duplicidade também no cadastro manual, com regras seguras para não criar falsos positivos.
- [ ] Rever concorrência: dois usuários podem tentar cadastrar a mesma empresa simultaneamente; manter a proteção de unicidade no servidor e tratar o conflito com mensagem clara.
- [ ] Auditar sincronização do CRM, funil e detalhe do lead em todas as telas e perfis.
- [ ] Corrigir persistência de fotos/arquivos no ambiente serverless sem contratar armazenamento pago.

### Integrações
- [ ] Google Places: revisar fluxo de credenciais, limites, tratamento de erro e retorno vazio.
- [ ] API Roq: revisar configuração, seleção de modelo e mensagens de falha sem expor segredos.
- [ ] WhatsApp Cloud API: revisar token, Phone Number ID, App Secret, Verify Token, templates e fluxo de autorização.
- [ ] E-mail/SMTP: revisar a tela de configuração e deixar claro quando host/senha não estão configurados; não inventar credenciais.

### Loja e produtos
- [ ] Localizar a origem dos quatro erros “Produto não encontrado”.
- [ ] Conferir identificadores, slugs, estado ativo, links de checkout e rotas de detalhe.
- [ ] Garantir que a comunicação comercial não anuncie kits/combos quando a oferta vigente for de placas individuais.

### Painéis e fluxos
- [ ] Auditar formulários e rotas do painel administrativo.
- [ ] Auditar painel do representante, cadastro, login, convite e recuperação de senha.
- [ ] Revisar criação de sites e botão “Criar site com Cloud AI”, sem integrar serviços pagos.
- [ ] Revisar funil, histórico de interações, status de autorização e registro de mensagens enviadas.
- [ ] Revisar SEO, páginas públicas, navegação e links quebrados.

## Histórico de publicação (não confundir com esta branch)
A última correção anteriormente publicada na produção foi o commit `bb2794505db5935c66ece3e568a8168c92c4e5dd`, deploy `dpl_3Gv86XRRihR8tjJLeKVm7RUJPA8a`, estado informado `READY`. Essa publicação não inclui as alterações desta branch de trabalho.

## Critérios para encerrar cada item
1. Código alterado na branch de trabalho.
2. Revisão estática e análise de permissões/efeitos colaterais registradas.
3. Teste local ou por revisão de código, sem Vercel, quando possível.
4. Teste funcional real somente quando houver ambiente apropriado e sem consumir créditos da Vercel.
5. Publicação permanece bloqueada até autorização expressa do usuário.


## Auditoria estática adicional — 12/11/2026

### Armazenamento de fotos
- `src/lib/storage.server.js` oferece somente os drivers `local` e `s3`.
- O driver local grava em disco (`STORAGE_DIR` ou `./storage`), o que não garante persistência entre execuções/instâncias serverless.
- O driver S3 exige bucket, access key e secret próprios. Não foi configurada nem aprovada uma alternativa gratuita persistente nesta rodada.
- **Decisão segura:** não migrar automaticamente para Blob/S3 nem armazenar fotos em JSONB sem avaliar limites, custo, tamanho e impacto no banco. Item continua pendente de solução aprovada.

### WhatsApp Cloud API
- `sendWhatsappText` usa apenas Access Token e Phone Number ID para envio de texto.
- O mapa atual `CREDENTIAL_KEYS.whatsapp` contempla Access Token, Phone Number ID e Verify Token; não contempla App Secret nem prefixo de templates.
- O envio atual é de mensagem de texto livre; não há, neste método, seleção/envio de template aprovado.
- Portanto, os campos App Secret e prefixo de template pedidos anteriormente ainda não estão conectados ao fluxo de envio. Webhook também precisa ser auditado separadamente antes de declarar a integração completa.

### SMTP / e-mail
- O módulo de integrações auditado não apresenta driver SMTP nem leitura de `SMTP_HOST` / `SMTP_PASS`. A configuração de e-mail deve ser rastreada no módulo próprio antes de qualquer correção; credenciais não serão inventadas.

### IA / rótulo API Roq
- O nome de interface “API Roq” é apenas o rótulo comercial; a implementação chama a API Groq e lê `GROQ_API_KEY`.
- A implementação usa `openai/gpt-oss-120b` como modelo principal e `openai/gpt-oss-20b` como reserva.
- A tela e o status de integração ainda precisam ser revisados para garantir que o usuário veja somente as integrações solicitadas (Google Places, API Roq e WhatsApp), sem campos redundantes de provedores não utilizados.

### CRM — risco remanescente
- A verificação de duplicidade na busca automática usa acesso privilegiado e retorna apenas booleano, como planejado.
- O cadastro manual não tem `place_id` obrigatório e, por isso, não se beneficia da mesma chave de deduplicação.
- A proteção de duplicidade do representante consulta antes do INSERT, mas não é uma garantia atômica contra duas criações simultâneas. Não foi alterada a estrutura da tabela nem criado índice único porque isso exige auditoria de duplicados históricos e migração segura.
- O teste funcional com duas contas continua pendente e não será executado na Vercel.

**Validação desta auditoria:** leitura estática dos arquivos `src/lib/storage.server.js`, `src/lib/integrations.server.js`, `src/lib/admin-fns.js` e `src/lib/entities.server.js`. Nenhum teste, build ou deploy foi executado.


## Correção da loja — catálogo de contingência (12/11/2026)

**Causa identificada por leitura do código:** a página da loja exibia um catálogo estático de contingência quando a consulta ao banco retornava vazio ou falhava, mas a página de detalhe consultava somente o banco. Assim, o card podia aparecer na vitrine e, ao abrir, mostrar “Produto não encontrado”.

**Implementado na branch de trabalho:**
- Criado `src/lib/catalogo-inicial.js` para compartilhar o catálogo de contingência entre vitrine e detalhe.
- A página de detalhe agora procura no catálogo de contingência depois de tentar localizar o registro no banco.
- Produtos explicitamente desativados continuam sem acesso público pelo link direto.
- Removido do catálogo de contingência o item combinado “Placa Google + Instagram” e seu checkout com identificação de kit. As placas Google e Instagram permanecem como itens individuais.

**Arquivos alterados:** `src/lib/catalogo-inicial.js`, `src/routes/_site/loja.index.jsx`, `src/routes/_site/loja.$slug.jsx`.

**Status:** correção de código registrada; não foi executado build, teste, acesso à Vercel ou validação em produção. Os quatro produtos do banco ainda precisam ser conferidos com os registros reais, pois esta correção resolve o caminho do catálogo de contingência, não corrige automaticamente slugs ou registros ausentes na base.
