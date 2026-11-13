# GOOGLE NFC CONNECT — Quadro mestre de publicação

**Atualizado em:** 12/11/2026 (horário de Brasília)  
**Meta:** deixar a versão tecnicamente pronta para revisão em 13/11/2026.  
**Branch de trabalho:** `ajustes-pendentes-sem-publicar`  
**Produção:** não alterar nem publicar sem autorização expressa.

## Regras de controle

- Toda investigação, alteração, experiência e teste deve ser registrada neste quadro antes de começar.
- Após cada alteração, atualizar este quadro e informar o resultado.
- Código gravado no GitHub não significa teste funcional aprovado.
- Só marcar como concluído depois de evidência verificável.
- Não usar preço zero nem inventar preços, produtos, horários, fotos ou dados comerciais.
- Preservar os créditos da conta principal; não iniciar publicação de produção sem autorização.

## 1. Código registrado no GitHub — aguardando validação funcional

- [x] Correção do fluxo de aprovação de representantes e exibição do link do perfil público.
- [x] Persistência do link do perfil do representante na lista.
- [x] Impedir que o telefone público do Google seja copiado automaticamente como WhatsApp do site.
- [x] Ampliar a identificação automática de bares, botecos, choperias, cervejarias e outros negócios de alimentação.
- [x] Em sites de alimentação, priorizar a seção de cardápio e ocultar a grade genérica de serviços.
- [x] Exibir aviso claro quando o cardápio ainda não foi cadastrado, sem criar pratos ou preços fictícios.
- [x] Usar textos de reserva em vez de agendamento nas chamadas principais de restaurantes.
- [x] Diferenciar no CRM o campo de WhatsApp para reservas e orientar a cadastrar somente número confirmado.
- [x] Impedir que a exportação ZIP use o telefone público como WhatsApp automaticamente.
- [x] Criar testes unitários para classificação de segmento, cardápio sem dados, preservação de preços informados e WhatsApp explícito.

**Último commit da branch:** `f23514cdc6c264a8290ce693eef337d00a00fe17`.

## 2. Em teste / validação pendente

- [ ] Executar `bun run test` na branch.
- [ ] Executar `bun run build` na branch.
- [ ] Corrigir qualquer falha de teste, lint ou build.
- [ ] Testar site de restaurante com cardápio preenchido.
- [ ] Testar restaurante sem cardápio e confirmar aviso, sem itens fictícios.
- [ ] Testar restaurante com WhatsApp configurado e sem WhatsApp configurado.
- [ ] Testar negócio de serviços para garantir que o agendamento antigo continua funcionando.
- [ ] Testar exportação ZIP e confirmar que telefone não vira WhatsApp.
- [ ] Testar em celular e desktop.
- [ ] Testar o fluxo de aprovação de representante e link público após recarregar.

## 3. Pendente de implementação

### Fotos reais do Google Maps
- [ ] Investigar o uso de Places API (New) para obter fotos reais do estabelecimento.
- [ ] Recuperar fachada, ambiente e produtos quando houver fotos disponíveis.
- [ ] Exibir atribuições exigidas pelo Google quando aplicável.
- [ ] Não mostrar imagens genéricas como se fossem fotos do cliente.
- [ ] Definir alternativa honesta quando não houver fotos disponíveis.

### Inteligência comercial do CRM
- [ ] Integrar a análise comercial já existente no CRM ao conteúdo do site.
- [ ] Aproveitar especialidades, diferenciais e recomendações registradas.
- [ ] Não publicar análises internas nem transformar sugestões em fatos sem confirmação.

### Design premium do criador de sites
- [ ] Redesenhar hero, hierarquia visual, seções, tipografia, cores e espaçamento.
- [ ] Adaptar identidade visual ao segmento de cada estabelecimento.
- [ ] Melhorar experiência mobile e desktop.
- [ ] Elevar a apresentação visual ao padrão comercial pretendido para sites de R$ 1.000.

### Conteúdo e operação
- [ ] Conferir a origem dos dados de cardápio, descrições, preços e imagens.
- [ ] Garantir que CTAs de reserva apontem para canal realmente configurado.
- [ ] Revisar exportação ZIP para acompanhar o mesmo comportamento da página pública.
- [ ] Revisar metadados SEO e dados estruturados por segmento.
- [ ] Verificar preços e impedir exibição de valor ausente como R$ 0,00.

## 4. Pronto para publicação — somente após comprovação

- [ ] Todos os testes unitários aprovados.
- [ ] Build de produção aprovado.
- [ ] Prévia isolada revisada, sem publicar na produção.
- [ ] Testes funcionais de ponta a ponta aprovados.
- [ ] Revisão visual em celular e computador.
- [ ] Conferência de preços, imagens, cardápios, contatos e links.
- [ ] Revisão final do quadro e aprovação expressa do responsável.

## 5. Publicação

- [ ] Aguardar autorização expressa.
- [ ] Publicar somente a versão aprovada.
- [ ] Confirmar deployment READY e validar o site publicado.
