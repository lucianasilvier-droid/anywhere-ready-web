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
