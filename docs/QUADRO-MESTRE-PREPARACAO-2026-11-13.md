# GOOGLE NFC CONNECT — Quadro mestre de preparação para publicação

**Atualizado em:** 13/11/2026  
**Branch de preparação:** `fix/analise-comercial-contextual`  
**Produção:** `main` — não alterada nesta rodada.  
**Regra:** não criar deployment de produção nem preview na Vercel sem autorização expressa. Preservar créditos.

## 1. Feito e comprovado

- [x] Conferido que o `main` ainda continha o token antigo do Google Search Console em `src/routes/__root.jsx`.
- [x] Gravada na branch de preparação a substituição pelo token novo fornecido pelo usuário: `lOe-akk9BgudktTFlKS-Z2oEZX4L7SPv5AdhlqszxJo`.
- [x] Conferido no GitHub que o token novo está no arquivo da branch e o token antigo não está mais nele.
- [x] Atualizada a lógica de análise comercial em `src/lib/admin-fns.js`: instrução explícita para nunca recomendar criação de site quando `lead.site` estiver preenchido; fallback local e resumo/proposta também respeitam essa regra.
- [x] Incorporadas seletivamente correções seguras da branch antiga: telefone público não vira WhatsApp automaticamente; classificação ampliada de negócios de alimentação; rótulo do campo de WhatsApp diferencia reservas de contato.
- [x] Adicionados testes para classificação de restaurantes, ausência de cardápio fictício, preservação dos dados cadastrados e WhatsApp confirmado.
- [x] Reexecutados testes e build após as correções seletivas; GitHub Actions aprovado: https://github.com/lucianasilvier-droid/anywhere-ready-web/actions/runs/43434501699.
- [x] Revisadas as branches antigas: catálogo de contingência descartado por conter preços zerados e checkout de kit; branch extensa de trabalho não integrada por misturar credenciais Claude no contexto de IA do CRM e alterações amplas em integrações, pagamentos e autenticação.
- [x] Comparação GitHub confirmou que a branch está à frente de `main`, sem commits atrás, com alterações somente em `src/routes/__root.jsx` e `src/lib/admin-fns.js`.
- [x] Conferido o histórico da Vercel: no momento da consulta, não havia deployment dos dois novos commits; produção continuava no commit anterior de `main`.

## 2. Implementado / preparado, mas ainda não verificado funcionalmente

- [x] Executar testes unitários e build de produção no GitHub Actions, sem consumir créditos da Vercel (execução aprovada: https://github.com/lucianasilvier-droid/anywhere-ready-web/actions/runs/43432483468).
- [x] Lint dos arquivos alterados aprovado (GitHub Actions: https://github.com/lucianasilvier-droid/anywhere-ready-web/actions/runs/43434501699).
- [ ] Lint global do repositório continua com uma falha preexistente em `src/hooks/usePainelRepresentante.js` (regra `react-hooks/exhaustive-deps` não encontrada) e centenas de alertas de formatação Prettier; não alterado por não fazer parte desta correção.
- [ ] Testar manualmente a análise com lead que tenha `site` preenchido: não pode sugerir criação de site em resumo, oportunidades ou proposta.
- [ ] Testar a análise com lead sem site: só então pode considerar criação de site.
- [ ] Testar o fallback local quando a API ROQ/Groq estiver indisponível.
- [ ] Confirmar no HTML servido pelo site publicado que a nova meta tag do Google aparece dentro de `<head>` depois da publicação.
- [ ] No Search Console, usar propriedade **Prefixo do URL** para `https://google-nfc-connect.vercel.app/`, selecionar **Tag HTML** e clicar em verificar. A confirmação do Google ainda não foi recebida.

## 3. Pendente para revisão, integração ou publicação

### Branches antigas — não integrar automaticamente
- `ajustes-pendentes-sem-publicar`: 17 commits à frente e 19 atrás de `main`. Contém trabalho de sites para restaurantes, cardápios, reserva/WhatsApp, representantes e testes. A branch está divergente e requer reconciliação e validação antes de qualquer integração.
- `work/pendencias-sem-publicar-2026-11-12`: 198 commits à frente e 17 atrás de `main`, com mudanças extensas em CRM, integrações, pagamentos, loja, autenticação, sites e webhook. Não mesclar em bloco; auditar por área e selecionar commits necessários.
- Branches de backup permanecem somente como referência; não publicar a partir delas.

### Pendências funcionais registradas
- [ ] Fotos reais do Google Maps com atribuições exigidas e alternativa honesta quando não houver fotos.
- [ ] Melhorar o conteúdo dos sites gerados com dados reais e oportunidades comerciais confirmadas.
- [ ] Revisar design responsivo dos sites gerados e experiência mobile/desktop.
- [ ] Auditar sincronização do CRM, funil e ficha do lead em perfis de administrador e representante.
- [ ] Testar deduplicação e limite diário com sessões simultâneas.
- [ ] Revisar persistência de fotos/arquivos em ambiente serverless sem ativar serviço pago.
- [ ] Validar WhatsApp Cloud API (token, Phone Number ID, App Secret, Verify Token, assinatura do webhook, templates e autorização) sem inventar credenciais.
- [ ] Auditar SMTP/convites e estado real de configuração.
- [ ] Conferir produtos, slugs, links de checkout e os erros de produto não encontrado.
- [ ] Revisar SEO, metadados, dados estruturados e links públicos.
- [ ] Revisar todos os formulários e rotas do painel administrativo e do representante.

### Critérios antes da publicação
- [ ] Revisão de código concluída e conflitos das branches antigas resolvidos.
- [ ] Lint, testes e build aprovados.
- [ ] Testes funcionais dos fluxos prioritários aprovados.
- [ ] Prévia revisada somente se houver crédito e autorização para criá-la.
- [ ] Usuário aprova expressamente a publicação.
- [ ] Após publicar, deployment Vercel em estado READY e teste real do site.
- [ ] Google Search Console confirma a propriedade.

**Importante:** commit no GitHub comprova que o código foi gravado; não comprova funcionamento, publicação ou verificação do Google.


### Auditoria adicional de integrações e pagamentos — 13/11/2026
- [x] Confirmado no fluxo do CRM que os resultados do Google Places são salvos com `...place`; o campo `websiteUri` é convertido em `site` no servidor. A ficha de análise recebe o registro salvo por `Lead.get`. O mapeamento do site está coerente no código; ainda falta teste funcional com lead real.
- [x] Confirmado que `iaJSON` na branch atual chama somente ROQ/Groq. Claude permanece como integração separada e não recebe os prompts/dados do CRM.
- [ ] A branch antiga contém uma proteção HMAC SHA-256 para validar a assinatura dos webhooks recebidos da Meta. A versão atual do webhook não faz essa validação e a configuração atual de credenciais WhatsApp não inclui App Secret. Não copiar isoladamente: precisa incluir o campo no painel, armazenamento seguro e teste de verificação GET/POST para evitar interromper o webhook.
- [ ] A branch antiga também torna obrigatória a assinatura do webhook do Mercado Pago e confere se a referência externa do pagamento corresponde ao pedido antes de liberar. A versão atual aceita a ausência do segredo de assinatura e não faz essa conferência adicional nesse ponto. É uma melhoria de segurança relevante, mas exige teste de pagamentos válidos, inválidos, repetidos e pedidos cancelados antes de integrar.
- [ ] A branch antiga altera a política de reembolso para não marcar como concluído sem confirmação do provedor. Revisar fluxo completo e estados do painel antes de integrar.
- [ ] Não foram copiadas mudanças de integrações, webhook ou pagamentos nesta rodada. A auditoria identificou melhorias candidatas, não uma implementação comprovada.


### Esclarecimento de requisitos confirmado pelo usuário — 13/11/2026
- [x] WhatsApp Cloud API ainda não está ativada. O painel administrativo deve permitir inserir e salvar as credenciais da Meta para concluir a ativação; não tratar a integração como ativa nem presumir credenciais já configuradas.
- [x] Pagamento atualmente utilizado: checkout/link da InfinitePay. Manter essa opção como fluxo atual.
- [x] Os provedores e credenciais de pagamento devem permanecer configuráveis pelo painel administrativo, permitindo ao usuário trocar o provedor quando desejar, sem alteração manual do código.
- [x] Manter integrações e opções de configuração centralizadas no painel administrativo, com acesso restrito. Qualquer troca deve preservar o provedor atualmente em uso até que a nova configuração seja testada e escolhida pelo usuário.
- [ ] Verificar se o painel atual expõe todos os campos necessários da Meta e as opções de pagamento descritas; validar a persistência das configurações e o fluxo InfinitePay antes de considerar concluído.
