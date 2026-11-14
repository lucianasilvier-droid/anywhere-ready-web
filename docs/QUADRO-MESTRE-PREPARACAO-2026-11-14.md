# GOOGLE NFC CONNECT — Quadro mestre de preparação

**Atualizado:** 14/11/2026 (horário de Brasília)  
**Branch de preparação/teste:** `preparacao/atualizacoes-14-11-2026`  
**Base:** `main` no commit `9d750b16bf07410b91a094d66b2727e0886ec8b9`  
**Produção:** preservada; nenhuma publicação ou alteração na produção foi feita nesta rodada.

## 1. Feito e comprovado no GitHub

- [x] Criada branch isolada de preparação a partir da versão atual da `main`.
- [x] Atualizada a meta tag do Google Search Console para o token novo informado pelo usuário em `src/routes/__root.jsx`.
- [x] Corrigidas as instruções da análise comercial em `src/lib/admin-fns.js`: não oferecer criação de site quando o lead já tem URL cadastrada; não dizer que um perfil do Google não existe quando o lead foi localizado no Places; não tratar nota alta/volume alto de avaliações como problema por si só; não sugerir kits ou combos.
- [x] Corrigido o fallback local da análise comercial para respeitar site existente e recomendar somente oportunidades sustentadas pelos dados.
- [x] Adicionado `src/lib/sites-clientes.server.test.ts` para testar classificação de negócios de alimentação, ausência de cardápio/preços fictícios e uso de WhatsApp somente quando explicitamente cadastrado.
- [x] Mantida a base atual da `main`; nenhuma branch divergente foi mesclada em bloco.

## 2. Implementado, aguardando validação

- [ ] Executar testes unitários e build na branch de preparação.
- [ ] Conferir a meta tag no HTML servido pela prévia e concluir a verificação no Google Search Console.
- [ ] Testar análise comercial com lead que já possui site e lead sem site.
- [ ] Testar fallback local quando ROQ/Groq estiver indisponível.
- [ ] Testar geração de site de restaurante com cardápio real, sem cardápio e negócio de serviços.
- [ ] Revisar a experiência em celular e desktop.

## 3. Pendências de integração e operação

- [ ] CRM: testar duplicidade e limite diário com sessões simultâneas; auditar sincronização entre lista, funil e ficha do lead.
- [ ] Fotos: validar atribuição das fotos do Google, domínio/Place ID correto e persistência em ambiente serverless sem contratar serviço pago.
- [ ] WhatsApp Cloud API: revisar token, Phone Number ID, App Secret, Verify Token, assinatura do webhook, templates e autorização. A integração não deve ser declarada ativa até o usuário inserir credenciais Meta válidas e o teste real passar.
- [ ] Pagamentos: revisar InfinitePay e Mercado Pago, incluindo assinatura de webhook, vínculo pagamento/pedido e estados de estorno, sem executar cobrança real.
- [ ] SMTP/convites: verificar host, remetente, porta e autenticação; não inventar credenciais.
- [ ] Loja: conferir produtos, slugs, links de checkout e erros de produto não encontrado; oferta de placas deve continuar unitária, sem kits.
- [ ] Painel admin e representante: revisar login, recuperação de senha, convites, permissões e rotas.
- [ ] SEO, metadados, links públicos e acessibilidade.

## 4. Branches divergentes que não devem ser mescladas automaticamente

- `work/pendencias-sem-publicar-2026-11-12`: contém mudanças extensas em CRM, integrações, pagamentos, autenticação, loja e sites; requer seleção por área e revisão de segurança.
- `work/catalogo-unitario-e-pendencias`: contém alterações em catálogo, pagamentos, CRM, representantes e webhook; requer reconciliação com a `main`.
- `ajustes-pendentes-sem-publicar`: contém melhorias para sites de restaurantes, cardápios, reservas e representantes; branch divergente, precisa de validação e integração seletiva.
- `feat/claude-chatgpt-admin-integrations` e `feat/whatsapp-reply-notifications`: avaliar separadamente; não incorporar sem revisão de credenciais, permissões e comportamento do webhook.
- `fix/whatsapp-webhook-signature`: melhoria candidata de segurança; integrar somente após revisão do fluxo completo de configuração e validação GET/POST.

## 5. Critérios para liberar publicação oficial

- [ ] Testes e build aprovados na branch de preparação.
- [ ] Prévia isolada aberta e testada funcionalmente.
- [ ] Login, banco de dados, painel, CRM, loja e integrações prioritárias validados.
- [ ] Pendências que dependem de credenciais externas identificadas claramente, sem declarar integração ativa.
- [ ] Revisão final do quadro e aprovação expressa do usuário.
- [ ] Publicação oficial somente após aprovação expressa; produção permanece bloqueada até lá.

**Nota:** commit no GitHub comprova gravação do código, não comprova teste funcional, integração ativa ou publicação.
