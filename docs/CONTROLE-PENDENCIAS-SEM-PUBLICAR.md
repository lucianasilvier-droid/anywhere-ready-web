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


## Segurança do webhook WhatsApp e URL comercial — 12/11/2026

### WhatsApp — assinatura de notificações
- Incluído `WHATSAPP_APP_SECRET` no mapeamento de credenciais do servidor e no cartão de integração do administrador.
- O endpoint POST agora lê o corpo bruto e valida `X-Hub-Signature-256` com HMAC-SHA256 e comparação em tempo constante antes de processar mensagens.
- Sem App Secret configurado, o webhook retorna 503; com assinatura inválida, retorna 401. Isso evita aceitar notificações forjadas.
- O status da integração passa a exigir Access Token, Phone Number ID e App Secret. O Verify Token continua separado para o handshake GET.
- O administrador precisa inserir o App Secret verdadeiro da aplicação Meta no painel antes de ativar o recebimento de notificações. Nenhum segredo foi criado ou presumido.

### Propostas comerciais
- Corrigido o domínio de fallback usado ao montar links de produtos nas propostas: agora usa `https://google-nfc-connect.vercel.app`, em vez de um endereço legado incorreto.
- O valor definido em `APP_URL` continua tendo prioridade.

**Validação:** revisão estática dos arquivos de integração, webhook, cartão de integração, função administrativa e gerador de propostas. Nenhum webhook foi chamado; nenhum teste, build ou deploy foi executado.


### Loja — configuração de checkout pelo painel
- O formulário de cadastro/edição de produtos não expunha os campos `checkout_url` e `checkout_label`, embora a página pública de detalhe dependesse deles para apresentar o link correto de compra/atendimento.
- Incluídos os dois campos no formulário administrativo, permitindo configurar o destino e o texto do botão por produto.
- **Status:** alteração de código registrada; ainda depende de inserir e conferir os links reais de cada produto no painel depois da publicação. Não foi feito teste de interface.


## Continuação da auditoria — CRM, SMTP e administração — 12/11/2026

### CRM — prevenção atômica de duplicidade
- A checagem anterior consultava place_id antes do INSERT, mas duas requisições simultâneas ainda podiam passar pela consulta e criar duplicados.
- Incluída uma trava consultiva transacional do PostgreSQL (pg_advisory_xact_lock) junto da verificação final e do INSERT, serializando cadastros com o mesmo place_id.
- A proteção cobre leads com place_id (Google Places / identificador OSM). Cadastro manual sem place_id continua sem uma chave de identidade confiável; não foi criada deduplicação aproximada por nome para evitar bloquear empresas diferentes.
- Não foi criada migration nem índice único, evitando risco com dados históricos duplicados.

### SMTP e convites
- smtpConfigured() agora só considera o SMTP disponível quando host, remetente, porta válida e par de autenticação consistente estão configurados. Relay sem autenticação continua permitido se houver remetente explícito.
- Removido o registro do corpo do e-mail nos logs quando SMTP não está configurado/incompleto. Isso evita que tokens de confirmação e recuperação de senha apareçam nos logs.
- O formulário Equipe e permissões agora diferencia convite entregue de usuário criado sem e-mail entregue. Quando SMTP não está pronto, mostra orientação das variáveis necessárias em vez de afirmar que o convite foi enviado.
- Nenhuma credencial SMTP foi criada ou alterada.

### Painel de integrações
- Reduzida a lista de integrações configuráveis no painel para as três integrações operacionais solicitadas: Google Maps / Places, API Roq e WhatsApp Business.
- As integrações internas Claude/OpenAI ainda podem ser resolvidas por variáveis de ambiente ou configurações já existentes no servidor; apenas deixam de ser expostas como cartões configuráveis nesta tela.

### Fotos de representantes
- Corrigida a ordem de substituição: a referência no banco é atualizada antes de remover a foto antiga. Se a gravação do registro falhar, a foto atual não é apagada.
- O armazenamento persistente em produção continua dependendo do Blob ou de um driver S3 externo. Não foi ativado nenhum serviço pago nem alterada a configuração de armazenamento.

**Validação:** revisão estática dos arquivos alterados e confirmação das alterações pela API do GitHub. Nenhum build, teste automatizado, chamada SMTP, chamada Meta, acesso a banco de produção ou deploy foi executado.


### CRM — ficha do lead e sincronização
- A ficha individual do lead agora limpa a mensagem de erro ao tentar carregar novamente e atualiza os dados quando o administrador/representante retorna à aba ou quando a página volta a ficar visível.
- O polling contínuo de 5 segundos das listas e do funil foi mantido; a ficha individual usa atualização por foco/visibilidade para evitar consultas constantes desnecessárias.

### Integrações — escopo do painel
- O painel administrativo de integrações agora exibe somente Google Maps / Places, API Roq e WhatsApp Business.
- As funções internas que dependem de Claude/OpenAI continuam podendo usar credenciais de ambiente ou configurações já existentes, mas esses provedores não aparecem como cartões de configuração nesta tela.


## Auditoria adicional — webhooks de pagamento — 12/11/2026

### Mercado Pago — segredo de assinatura obrigatório
- Identificado comportamento inseguro: quando o Webhook Secret não estava configurado, a função de validação aceitava a notificação como válida.
- Alterado para rejeitar a assinatura quando o segredo não está configurado. A integração continua exigindo Access Token para operações, mas o webhook só deve ser cadastrado/considerado pronto após incluir também o Webhook Secret no painel.
- O endpoint retorna 401 para assinatura ausente/inválida e registra o motivo sem aceitar a notificação.

### InfinitePay — eventos de estorno/cancelamento
- A InfinitePay não assina as notificações. O fluxo já consultava payment_check para confirmar pagamento, mas também aceitava os textos de evento refunded/canceled como prova suficiente para alterar o status.
- Removida essa confiança: eventos sem confirmação verificável não mudam um pagamento para reembolsado/cancelado. A confirmação de pagamento continua dependendo do payment_check.
- Estorno/cancelamento precisa ser reconciliado por consulta/ação administrativa segura; não pode ser declarado apenas pelo conteúdo do webhook.

**Validação:** inspeção estática e confirmação dos commits no GitHub. Nenhuma API de pagamento foi chamada, nenhum pagamento foi criado/alterado, nenhum teste/build/deploy foi executado.


### Mercado Pago — vínculo entre pagamento e pedido
- Identificado que a confirmação conferia o valor, mas não validava a referência externa do pagamento contra o número do pedido.
- Incluída validação obrigatória de external_reference antes de aplicar qualquer status do Mercado Pago. Uma transação válida de outro pedido, mesmo com o mesmo valor, não pode ser reaproveitada para aprovar este pedido.
- Se a referência estiver ausente ou divergente, a transação permanece sem aprovação e o motivo é registrado no pagamento.


## Auditoria de pagamentos — continuidade — 12/11/2026

- Mercado Pago: validação HMAC não aceita mais webhook sem Webhook Secret configurado.
- Mercado Pago: a confirmação agora exige que external_reference recebido da API corresponda exatamente ao número do pedido associado ao registro de pagamento, além da conferência de valor já existente.
- InfinitePay: eventos refunded/canceled sem assinatura não alteram mais o status final. O endpoint continua consultando payment_check antes de aceitar aprovação.
- O webhook InfinitePay não usa mais import da rotina de atualização de status removida.
- Nenhuma credencial, pagamento ou configuração externa foi alterada.

**Limitação ainda pendente:** revisar a autorização do início do checkout para pedidos de clientes autenticados e convidados. A função de criação recebe pedido_id e usa acesso privilegiado ao registro; a estratégia de token público/identidade do cliente deve ser confirmada no fluxo completo antes de restringir ou modificar, para não quebrar checkout de convidados. Também permanece a conferência de erros 404 nos registros reais.


## Financeiro — segurança do estorno — 12/11/2026

- Encontrado risco no fluxo administrativo: após clicar em concluir estorno, o sistema podia marcar como reembolsado mesmo quando não havia chamada de estorno ao provedor (InfinitePay e checkout Mercado Pago baseado em preferência).
- Corrigido em `src/lib/payments-fns.js`: a conclusão automática agora só é permitida para pagamento Mercado Pago com ID numérico, após resposta bem-sucedida da API oficial de estorno.
- InfinitePay e pagamentos sem ID numérico de transação ficam em `reembolso_solicitado`; a interface recebe orientação para concluir no provedor e só registrar como concluído após confirmação real. Nenhuma baixa financeira falsa é feita pelo fluxo automático.
- A solicitação de reembolso continua sendo uma etapa separada e registrada.

**Limitação:** o registro administrativo de conclusão manual precisa ser tratado com cuidado, exigindo confirmação humana documentada. O estorno parcial também não está implementado; a API atual solicita estorno total.

**Validação:** alteração estática confirmada no GitHub. Nenhum pagamento ou estorno real foi executado; nenhum build, teste ou deploy foi executado.


### Checkout — bloqueio de cobranças indevidas
- A criação de cobrança agora recusa pedidos com status cancelado/reembolsado e pedidos cujo total não seja numérico, finito e maior que zero.
- Pedido já pago continua retornando o estado já pago sem criar nova cobrança.
- Não foi alterado o fluxo de pedidos aguardando pagamento nem a modalidade de checkout de convidados.


## CRM — link do perfil do representante na solicitação de autorização — 12/11/2026

- Ao gerar a mensagem pelo botão **Pedir autorização**, o servidor consulta o representante vinculado ao lead.
- Quando o representante está ativo, tem página pública ativada e possui slug, acrescenta ao final da mensagem o link absoluto `APP_URL/r/<pagina_slug>`, com uma frase curta apresentando o perfil comercial.
- O link é acrescentado deterministicamente pelo servidor após a geração por IA; portanto não depende da IA inventar ou escolher o endereço.
- A primeira mensagem continua sem preços, catálogo ou vídeo. A única exceção de link é o perfil público do representante responsável.
- Se o lead estiver sem representante ou a página do representante não estiver ativa/configurada, a mensagem continua sendo gerada e o painel apresenta um aviso em vez de inserir um link quebrado.
- O link é incluído no texto usado tanto para copiar quanto para abrir/enviar pelo WhatsApp, pois ambas as ações usam o mesmo campo de mensagem.

Arquivos alterados:
- `src/lib/admin-fns.js`
- `src/components/crm/CrmLeadDetalhe.jsx`

**Validação:** inspeção estática dos arquivos e confirmação dos commits no GitHub. Não foi gerada mensagem real com IA, não foi enviado WhatsApp e não houve build, teste ou deploy.
