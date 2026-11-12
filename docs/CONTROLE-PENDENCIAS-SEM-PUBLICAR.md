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


## Autenticação — recuperação de senha — 12/11/2026

- Encontrado que a página `/forgot-password` chamava o método legado `base44.auth.resetPasswordRequest`, em vez da função de recuperação própria do sistema (`recoverPasswordFn`).
- A tela também ignorava qualquer falha e sempre mostrava a mensagem genérica de sucesso, mesmo sem SMTP configurado.
- Corrigido para usar `authSettingsFn` e `recoverPasswordFn`, os mesmos serviços de autenticação próprios.
- `authSettings()` agora informa apenas um sinalizador global `recoveryEmailConfigured`, derivado da configuração SMTP. Isso não revela se determinado endereço de e-mail está cadastrado.
- A tela bloqueia o envio quando SMTP está ausente/incompleto ou quando não consegue confirmar a configuração, e orienta o usuário a falar com o administrador. Com SMTP configurado, mantém a resposta genérica de privacidade ("se existir uma conta...") para evitar enumeração de contas.

Arquivos alterados:
- `src/lib/auth.server.js`
- `src/components/auth/ForgotPasswordPage.jsx`

**Limitação:** o SMTP continua sem credenciais reais no ambiente; a recuperação por e-mail só ficará operacional após configurar SMTP_HOST, SMTP_PORT, SMTP_FROM e, quando exigido pelo provedor, SMTP_USER/SMTP_PASS. Nenhuma credencial foi inventada ou alterada.
**Validação:** inspeção estática e confirmação dos commits no GitHub; nenhum e-mail foi enviado e nenhum teste/build/deploy foi executado.


## Loja — preço da vitrine — 12/11/2026

- Removido o preço fixo "Comprar por R$ 55,00" do destaque inicial de placas NFC.
- O catálogo de contingência não tem preço confirmado (valores zerados) e o preço real deve vir do cadastro atual do produto. O botão agora diz "Ver placas e preços" e leva à loja, evitando divulgar valor incorreto.
- Não foram alterados preços cadastrados, links de checkout ou valores de pagamentos.


## CRM — remoção do segmento Assistência Técnica — 12/11/2026

- Removida a opção **Assistência Técnica** da lista de segmentos exibida na busca de empresas do CRM para representantes.
- A alteração remove o segmento tanto do seletor quanto da relação visual de sequência, pois ambos são gerados pela mesma lista `segmentosRepresentante` em `src/components/crm/CrmLeads.jsx`.
- Os demais segmentos e o funcionamento da busca não foram alterados.

**Validação:** alteração estática confirmada no arquivo do GitHub. Nenhum teste, build ou deploy foi executado; a Vercel não foi acessada.


## Painel admin — estado de carregamento do detalhe do cliente — 12/11/2026

- Corrigido um estado de tela que podia ficar preso indefinidamente em “Carregando cliente...” quando a leitura de `Cliente.get(clientId)` falhava ou o registro não existia: o carregamento terminava, mas a tela tratava `form === null` como carregamento contínuo.
- A página agora apresenta uma mensagem clara e um caminho de retorno para a lista de clientes quando não consegue carregar o registro.
- O efeito limpa os dados anteriores ao trocar de ID e ignora respostas de uma requisição antiga após desmontagem/troca de cliente, evitando que uma resposta atrasada sobrescreva a tela atual.
- Nenhuma regra de permissão ou semântica global de `get()` foi alterada.

**Validação:** revisão estática e atualização confirmada no GitHub. Não houve teste, build ou deploy; a Vercel não foi acessada.


## Pagamentos — validação do ID numérico para estorno Mercado Pago — 12/11/2026

- Corrigida a expressão regular que valida `provedor_payment_id` antes de chamar o estorno oficial do Mercado Pago.
- A expressão anterior continha escape duplicado e não reconhecia corretamente IDs compostos por dígitos, podendo impedir o caminho automático de estorno mesmo com um ID válido.
- A validação agora exige um ou mais dígitos (`/^\\d+$/`), mantendo a restrição de que somente pagamentos do Mercado Pago com ID numérico podem seguir para a API oficial.
- Não foi ampliado o suporte de estorno para InfinitePay, não foi alterado o critério de confirmação e nenhum estorno real foi solicitado.

**Validação:** inspeção estática da expressão no código e confirmação da alteração no GitHub. Nenhuma chamada ao provedor, teste, build ou deploy foi executado.

## Sites de demonstração — apresentação, fotos Google e autorização — 12/11/2026

### Melhorias implementadas na branch de trabalho
- A paleta automática foi refinada por ramo: floresta para pet/veterinária, terracota para beleza/moda, esmeralda para saúde, grafite para consultoria/tecnologia, vinho para alimentação e oceano como opção geral.
- O gerador usa o resumo, as oportunidades e as observações da análise comercial apenas como sinais internos para ajustar o tom e a chamada para ação; o texto interno da análise não é copiado para o site público. O conteúdo público permanece baseado em dados do estabelecimento e não inventa preços, resultados ou dados não confirmados.
- A busca Google Places agora solicita até cinco referências de fotos reais e seus créditos de autoria. Leads salvos pelo resultado da busca preservam esses metadados.
- A página pública do site exibe a primeira foto na área principal e as demais em uma galeria, mantendo os créditos fornecidos pelo Google.
- Os serviços e slogans automáticos também passaram a variar por segmento (alimentação, beleza, pet, saúde, automotivo e serviços profissionais), em vez de usar a mesma lista genérica para todos.
- Criado um endpoint servidor para buscar a mídia do Google Places sem expor a chave da API no navegador. O endpoint valida o nome do recurso e usa a chave salva nas integrações ou a variável de ambiente.
- A primeira mensagem de autorização agora inclui o link provisório do site quando disponível. A ordem é: link público do representante comercial e, logo abaixo, link da prévia do site. O texto orienta o cliente a abrir a demonstração e pedir SIM para receber mais informações das placas NFC.

### Cuidados e validação pendente
- A inclusão do campo `places.photos` e a recuperação sob demanda de fotos de leads antigos usam a Google Places API e podem consumir cota e/ou gerar cobrança conforme o projeto e o faturamento do Google Cloud. Nenhuma chamada de foto foi executada nesta rodada.
- Fotos só aparecem para leads cuja busca de origem Google Places retornou imagens; resultados do OpenStreetMap ou leads manuais sem referências de fotos permanecem sem galeria.
- Atribuições de autoria são exibidas quando fornecidas pelo Google.
- A alteração foi revisada estaticamente pelos arquivos de integração, geração do site, página pública, proxy de fotos e mensagem do CRM.
- Nenhum build, teste automatizado, teste na Vercel, deploy ou publicação foi executado. A branch `main` e a produção permanecem intocadas.


## Publicação solicitada — 12/11/2026 (bloqueada pelo limite da Vercel)

- O usuário autorizou expressamente publicar as correções e implementações na produção.
- Verificação do GitHub: a branch `work/pendencias-sem-publicar-2026-11-12` está 73 commits à frente e 0 atrás da `main`, com HEAD `b17583576f950b04e81ba7115c29b7b1cb2dad15`. A `main` permanece em `bb2794505db5935c66ece3e568a8168c92c4e5dd`.
- Verificação da Vercel: o projeto `google-nfc-connect` aponta para o deploy de produção `dpl_3Gv86XRRihR8tjJLeKVm7RUJPA8a`, estado READY, criado a partir do commit atual da `main`.
- O histórico do GitHub contém notificações do Vercel Bot de 11/11/2026 informando bloqueio por limite gratuito: `api-deployments-free-per-day`, mais de 100 implantações no período de 24 horas, com orientação para tentar novamente após 24 horas.
- Por esse motivo, nenhuma mesclagem na `main`, criação de deploy, promoção ou alteração de domínio foi executada nesta rodada. Evitou-se disparar mais uma tentativa automática de build/deploy enquanto o limite está ativo.
- A branch de trabalho foi preservada. A produção continua servindo o deploy anterior.
- Existe uma PR separada (#13), `fix/sync-analise-mensagens-personalizadas`, ainda em rascunho e fora da branch de trabalho. A revisão do diff encontrou trechos suspeitos com sequências literais `\\n` inseridas em código JavaScript, portanto ela não deve ser mesclada sem correção e revisão independente.
- Não houve teste, build ou deploy nesta rodada. A inspeção de GitHub e Vercel foi somente leitura.

### Próxima tentativa de publicação
1. Aguardar o fim da janela de bloqueio da Vercel (a notificação indicou 24 horas a partir das tentativas de 11/11).
2. Antes de publicar, revisar novamente o diff completo da branch e confirmar que a `main` não avançou.
3. Integrar somente a branch de trabalho revisada; manter a PR #13 separada até corrigir seus trechos suspeitos e decidir se as mudanças são necessárias.
4. Realizar uma única publicação de produção, sem deploys de preview repetidos.
5. Confirmar o estado READY, commit implantado e domínio de produção; depois registrar a lista final de pendências.

### Pendências operacionais após esta verificação
- [ ] Aguardar liberação do limite de implantações da Vercel e repetir a conferência de disponibilidade.
- [ ] Fazer revisão final de código antes de integrar os 73 commits da branch de trabalho.
- [ ] Corrigir/revisar separadamente a PR #13 ou fechá-la se suas alterações já estiverem cobertas por outra solução.
- [ ] Após publicação, validar com o usuário o criador de sites, fotos Google, links de autorização, CRM/funil, loja, pagamentos e integrações, sem fazer operações financeiras reais.
- [ ] Configurar credenciais reais e não fornecidas: SMTP, WhatsApp Cloud API e segredos de webhook do Mercado Pago.
- [ ] Resolver armazenamento persistente de fotos de representantes sem assumir custos de Blob/S3.
- [ ] Investigar erros 404 restantes em rotas e registros reais; distinguir IDs inexistentes de restrições de acesso.
- [ ] Conferir dados reais da loja, slugs, preços e links de checkout.
- [ ] Executar fluxo CRM com duas contas e conferir permissões do representante.
- [ ] Revisar checkout de convidados e autenticação/autorização de pedidos.
- [ ] Implementar/validar tratamento administrativo de estornos manuais e definir fluxo para estorno parcial.
- [ ] Validar a coleta de fotos Google em ambiente controlado, observando cota e cobrança do Places API.
- [ ] Revisar SEO, links públicos, formulários e painel do representante após a publicação.


## Pagamentos — parar consultas repetidas para código inexistente — 12/11/2026

- Na revisão estática da página pública de acompanhamento, identifiquei que `PaymentPanel` continuava agendando uma consulta a cada seis segundos mesmo quando `getPaymentFn` retornava `ok: false` para um código inexistente.
- Corrigido em `src/components/store/PaymentPanel.jsx`: quando o servidor informa que o código não corresponde a um pagamento, o polling é interrompido. Falhas transitórias de rede continuam podendo ser consultadas novamente.
- A mensagem amigável de pagamento não encontrado já existia e foi mantida.
- **Status:** correção implementada na branch de trabalho; não houve teste, build, consulta a provedor ou deploy.


### Conferência adicional do limite de implantação — 12/11/2026
- Consulta somente de leitura ao histórico da equipe Vercel, com janela móvel de 24 horas, retornou 100 registros (limite máximo solicitado pela consulta): 68 associados a `anywhere-ready-web-s71m` e 32 a `google-nfc-connect`.
- O registro mais recente retornado foi de 12/11/2026 15:15 UTC; o mais antigo, 11/11/2026 15:48 UTC. Como a consulta atingiu o teto de 100 resultados e já existe erro explícito `api-deployments-free-per-day`, o bloqueio deve ser tratado como ativo.
- Branch de trabalho atualizada após a correção do polling: `26d3adeb1552014f6349bae74e7eadadfabcac27`. A `main` permaneceu em `bb2794505db5935c66ece3e568a8168c92c4e5dd`.

## CRM — limite diário individual por representante — revisão de 12/11/2026

- O limite foi incluído no formulário de edição/cadastro do representante (limite_leads_dia), com validação inteira entre 1 e 10.000 e padrão 20.
- O servidor persiste o valor no registro Representante e limiteLeadsHoje() consulta esse cadastro, usando 20 apenas como fallback para registros antigos sem valor válido.
- A consulta exibida ao representante usa a mesma resolução do registro pelo e-mail de login e respeita o status ativo (mantendo compatibilidade com cadastros antigos sem status explícito).
- A tela de configurações gerais não deve voltar a oferecer um limite global: a configuração é individual por representante.
- A validação do limite no servidor continua sendo a proteção efetiva; o bloqueio visual e o recorte da ação em lote no navegador são apenas conveniência de interface.
- Limitação conhecida: a contagem é consultada antes da gravação; em duas requisições simultâneas, ainda existe uma pequena janela de concorrência que pode permitir ultrapassar o limite. Não declarar proteção atômica até implementar e validar uma reserva transacional apropriada.

Arquivos alterados nesta revisão: src/components/admin/representantes/RepForm.jsx, src/lib/representantes-fns.js, src/lib/entities.server.js.

Status: implementação de código na branch de trabalho e revisão estática dos trechos alterados. Nenhum build, teste automatizado, teste funcional, chamada externa ou deploy foi executado.
## Sites — Claude gratuito no navegador — revisão de 12/11/2026

- A orientação correta do usuário é gerar sites com o Claude gratuito pelo navegador, sem chave Anthropic, sem API paga e sem cobrança da Anthropic.
- Fluxo obrigatório: o representante/administrador clica em preparar; o sistema abre claude.ai e copia/prepara o prompt; o usuário cola no Claude e solicita o JSON; retorna ao CRM, cola o JSON, valida e salva; depois abre o site salvo.
- O prompt usa os dados reais do CRM, resumo, oportunidades, abordagem e proposta da análise comercial, localização, reputação Google, fotos reais disponíveis e orientações do operador.
- O prompt exige conteúdo personalizado, moderno e persuasivo, escolha de paleta por psicologia das cores e proíbe inventar preços, horários, certificações, depoimentos ou resultados.
- As fotos reais do Google continuam sendo salvas no SiteCliente e exibidas na página pública. Leads antigos sem fotos podem acionar uma busca sob demanda no Google Places quando o site for salvo.
- O endpoint de geração valida o JSON retornado pelo Claude no servidor e só então salva/atualiza SiteCliente. O fluxo deve ser verificado tanto no painel administrativo quanto no painel do representante.
- Não usar API Roq/Groq ou Anthropic API para criar o site. A geração de conteúdo do site não deve depender de chaves de IA.

Arquivos principais: src/lib/sites-clientes.server.js, src/lib/sites-clientes-fns.js, src/components/admin/SiteDoLead.jsx e src/components/crm/SiteDoLeadRepresentante.jsx.

**Validação atual:** revisão estática do fluxo de preparação, clipboard, campo JSON, validação e persistência. Não foi aberto o Claude, não foi gerado JSON real, não foi salvo um site de teste, não foi feito build, teste automatizado, teste funcional ou deploy. A conclusão depende da verificação real do fluxo em ambiente de teste, nos dois perfis.

## CRM — remoção de “Registrar resposta recebida” — 12/11/2026

- Removido do detalhe do lead no painel do representante o bloco inteiro “Registrar resposta recebida”, incluindo texto explicativo, seletor de resposta, campo de mensagem e botão “Registrar resposta e notificar administrador”.
- Removidos também o handler e os estados exclusivos dessa funcionalidade; não ficou apenas escondido na interface.
- Mantidos os controles de autorização existentes e o histórico de interações que não dependem desse formulário.
- Revisão estática confirmou que o título, handler e estados removidos não aparecem mais em CrmLeadDetalhe.jsx. Sem build, testes ou publicação.
## CRM — somente empresas com contato válido — revisão de 12/11/2026

- Regra permanente: só exibir e aceitar leads que tenham pelo menos um contato em formato válido: WhatsApp/telefone ou e-mail. Sem ambos, a empresa é descartada antes de aparecer e não pode ser salva no CRM.
- A busca do Google Places é enriquecida: quando não há telefone válido, o servidor tenta localizar um e-mail no site oficial e em links/páginas de contato do mesmo domínio.
- A busca reserva do OpenStreetMap também considera tags de telefone, e-mail e site; os resultados passam pelo mesmo filtro.
- A consulta de leads no banco filtra registros sem contato válido, de modo que leads antigos sem telefone/e-mail não apareçam nas listas e relatórios que usam a entidade Lead.
- A camada de gravação bloqueia criação e atualização que deixem um lead sem telefone/WhatsApp ou e-mail válido; o formulário manual também valida antes de enviar.
- A tela de busca exibe o e-mail encontrado e o telefone disponível; a tela de detalhe já oferece a ação Abrir e-mail quando há endereço cadastrado.
- A validação do telefone verifica o formato e a quantidade de dígitos; ela não confirma se o número está efetivamente registrado no WhatsApp. A confirmação de conta WhatsApp exigiria uma verificação externa autorizada.
- A leitura de sites usa HTTPS/HTTP público, sem credenciais, validação de host/IP, redirecionamentos restritos ao mesmo domínio, timeout e limite de conteúdo. Se o site bloquear a leitura ou não expuser e-mail, a empresa é descartada se também não houver telefone válido.

Arquivos alterados: src/lib/integrations.server.js, src/lib/entities.server.js e src/components/crm/CrmLeads.jsx.

**Validação:** revisão estática das regras de busca, enriquecimento, leitura do banco, gravação e interface. Não foram executadas buscas reais, consultas a sites, testes, build ou deploy.