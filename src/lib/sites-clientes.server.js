// Sites de demonstração para empresas prospectadas no CRM. O conteúdo é preparado
// no Claude gratuito pelo navegador, validado no servidor e guardado em SiteCliente.
import { listar } from "@/lib/representantes.server";
import { slugify } from "@/lib/landing-representante.server";

export const TEMAS = ["esmeralda", "oceano", "terracota", "vinho", "grafite", "solar", "lavanda", "floresta"];
export const ICONES = [
  "estrela", "coracao", "tesoura", "dente", "carro", "comida", "cafe", "casa", "ferramenta",
  "saude", "beleza", "pet", "escudo", "relogio", "folha", "presente", "livro", "musica", "raio", "check",
];

export function erro(mensagem, status = 400) {
  return Object.assign(new Error(mensagem), { status });
}

const digitos = (v) => String(v || "").replace(/\D/g, "");

/** Número no formato do wa.me (com DDI 55). */
export function whatsappDe(telefone) {
  let n = digitos(telefone);
  if (!n) return "";
  if (n.length <= 11) n = `55${n}`;
  return n;
}

/** Prepara o pedido para o Claude gratuito no navegador. Não usa API, chave ou chamada paga. */
export function promptParaClaudeGratuito(lead, orientacoes = "") {
  const fotosDisponiveis = Array.isArray(lead.fotos_google) ? lead.fotos_google.length : 0;
  return `Você é diretor de criação digital, designer UX/UI e copywriter especializado em sites profissionais de alta conversão para pequenos negócios brasileiros.

Antes de escrever, aja como uma agência digital sênior: diretor de criação, estrategista de conversão, UX/UI designer e especialista em SEO local. Seu objetivo é criar uma demonstração que seja claramente superior ao site atual do negócio, quando existir, tanto em conteúdo quanto em estrutura comercial. Não entregue uma página genérica.

ETAPA 1 — PESQUISA E DIAGNÓSTICO:
- Se houver URL de site atual nos dados, abra e analise esse site antes de criar o conteúdo. Verifique serviços, preços, duração, profissionais, diferenciais, fotos, agendamento, localização, horários, navegação e pontos fracos.
- Se não houver URL, pesquise pelo nome exato da empresa e pela localização para tentar encontrar seus canais oficiais.
- Use somente informações confirmadas em fontes oficiais da própria empresa ou nos dados do CRM. Não trate suposições, diretórios de terceiros ou dados antigos como fatos.
- Identifique o que o site atual faz bem e o que pode ser melhorado. Não copie textos nem a identidade visual do concorrente.
- Se não conseguir acessar ou confirmar uma informação, omita-a ou sinalize que deve ser confirmada. Nunca invente.

ETAPA 2 — PROJETO DA NOVA EXPERIÊNCIA:
Crie uma proposta de conteúdo completa, específica para o ramo e com foco em transformar visitantes em contatos, reservas ou agendamentos. A página será renderizada por um sistema que aceita conteúdo estruturado, serviços com preços e duração, profissionais, diferenciais, perguntas frequentes e uma direção visual selecionada. Priorize a experiência do cliente no celular e uma chamada principal muito clara.

DADOS REAIS DA EMPRESA:
${briefing(lead, orientacoes)}

FOTOS REAIS DO GOOGLE DISPONÍVEIS: ${fotosDisponiveis}. O sistema exibirá automaticamente essas fotos na página. Não invente imagens nem descreva fotos que não viu.

DIRETRIZ DE COMPARAÇÃO:
- Quando existir site atual, a nova página deve cobrir as informações úteis que o cliente já oferece e melhorar clareza, hierarquia, apresentação dos serviços, prova de confiança e facilidade de contato.
- Não remova serviços, preços, durações, profissionais ou diferenciais confirmados que sejam importantes para o cliente.
- Não invente depoimentos, avaliações textuais, selos, prêmios, certificações ou números.
- A nota e a quantidade de avaliações do Google já fornecidas pelo CRM são a única prova quantitativa de reputação autorizada.

DIREÇÃO DE DESIGN E CONVERSÃO:
- O conteúdo precisa parecer feito sob medida para esta empresa, nunca um texto genérico.
- Use psicologia das cores: escolha a paleta que melhor combina com o ramo, o público e o posicionamento. Selecione somente um tema permitido.
- Crie um slogan memorável, título forte, subtítulo que mostre valor e chamadas para ação claras.
- Use linguagem brasileira natural, elegante, comercial e acolhedora.
- Valorize a localização, a reputação do Google e os diferenciais que realmente aparecem nos dados.
- Use a análise comercial para decidir quais serviços e benefícios merecem maior destaque, sem copiar notas internas literalmente.
- Não invente preços, promoções, horários, prêmios, certificações, anos de experiência, depoimentos, quantidade de clientes, nomes de funcionários ou resultados.
- Não invente telefone, endereço, e-mail, Instagram, links ou serviços específicos não confirmados.
- Se faltarem informações, use frases honestas que orientem o visitante a consultar a equipe.
- Não inclua observações internas, dados de prospecção ou instruções privadas no texto público.
- O cardápio, se houver dados cadastrados, será inserido pelo sistema; não invente pratos nem preços.

ESTRUTURA OBRIGATÓRIA DO JSON:
{
  "slogan": "frase de impacto curta",
  "titulo": "título principal específico",
  "subtitulo": "proposta de valor clara",
  "sobre": "apresentação da empresa em dois parágrafos curtos",
  "estilo_visual": "premium",
  "faixa_destaque": "frase curta de destaque, ou vazio",
  "servicos": [{"nome":"Serviço","descricao":"Descrição objetiva","icone":"check","preco":"Preço confirmado ou vazio","duracao":"Duração confirmada ou vazio","destaque":false}],
  "profissionais": [{"nome":"Nome confirmado","especialidade":"Especialidade confirmada","descricao":"Apresentação curta baseada em fonte oficial"}],
  "diferenciais": [{"titulo":"Diferencial","texto":"Explicação breve"}],
  "perguntas": [{"pergunta":"Pergunta frequente?","resposta":"Resposta objetiva"}],
  "chamada_agendamento": "Convite para contato pelo WhatsApp",
  "tema": "oceano",
  "seo_descricao": "Descrição local para mecanismos de busca"
}

REGRAS TÉCNICAS:
- Entregue de 3 a 8 serviços relevantes. Inclua preço e duração somente quando encontrados em fonte oficial; caso contrário, deixe esses campos vazios.
- Inclua de 0 a 8 profissionais somente se nomes e especialidades forem confirmados no site oficial ou nos dados fornecidos. Se não encontrar, use array vazio. Nunca invente pessoas.
- Entregue de 3 a 4 diferenciais e de 3 a 6 perguntas frequentes realmente úteis ao público.
- Escolha um estilo visual entre: premium, urbano, editorial, acolhedor ou tecnologico, conforme o ramo e o posicionamento.
- A faixa_destaque deve resumir um benefício real; se não houver um benefício comprovado, deixe vazia.
- Use exatamente um tema permitido: esmeralda, oceano, terracota, vinho, grafite, solar, lavanda, floresta.
- Use exatamente um ícone permitido por serviço: estrela, coracao, tesoura, dente, carro, comida, cafe, casa, ferramenta, saude, beleza, pet, escudo, relogio, folha, presente, livro, musica, raio, check.
- Limites: slogan 90; titulo 120; subtitulo 260; sobre 1400; faixa_destaque 120; nome de serviço 60; descrição 220; preço 40; duração 40; nome de profissional 80; especialidade 100; apresentação de profissional 220; chamada_agendamento 180; seo_descricao 160.
- Responda somente com JSON válido, sem Markdown, sem bloco de código e sem texto antes ou depois.
- Não use API, não solicite chave, não tente publicar nada e não execute ferramentas. Apenas gere o JSON para ser copiado de volta ao Google NFC Connect.`;
}

function briefing(lead, orientacoes) {
  return [
    `Nome da empresa: ${lead.empresa || "não informado"}`,
    `Ramo/categoria: ${lead.categoria || "não informado"}`,
    `Site atual / referência oficial para análise: ${lead.site || "não informado"}`,
    `Endereço: ${lead.endereco || "não informado"}`,
    `Cidade: ${lead.cidade || "não informada"}${lead.bairro ? `, bairro ${lead.bairro}` : ""}${lead.estado ? ` - ${lead.estado}` : ""}`,
    `Nota no Google: ${lead.nota_google ?? "sem dados"} (${lead.total_avaliacoes ?? 0} avaliações)`,
    lead.ai_resumo ? `Análise comercial já feita: ${lead.ai_resumo}` : "",
    lead.ai_oportunidades ? `Oportunidades identificadas: ${lead.ai_oportunidades}` : "",
    lead.ai_abordagem ? `Abordagem recomendada: ${lead.ai_abordagem}` : "",
    lead.ai_proposta ? `Direção de proposta: ${lead.ai_proposta}` : "",
    lead.observacoes ? `Observações do CRM: ${lead.observacoes}` : "",
    orientacoes ? `Pedidos do operador para este site: ${orientacoes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const textoSeguro = (valor, limite = 220) => String(valor ?? "").trim().slice(0, limite);

/** Gera conteúdo local a partir dos dados já cadastrados. Não chama IA externa nem inventa dados comerciais. */
export function gerarConteudoSiteAutomatico(lead, orientacoes = "") {
  const nome = textoSeguro(lead.empresa || "Nossa empresa", 120);
  const categoria = textoSeguro(lead.categoria || "", 100);
  const observacaoOperador = textoSeguro(orientacoes, 600);
  // A análise comercial orienta o tom e a estrutura, mas nunca é exposta literalmente no site público.
  const analiseEstrategica = `${lead.ai_resumo || ""} ${lead.ai_oportunidades || ""} ${lead.observacoes || ""}`.toLowerCase();
  const focoAgendamento = /agend|reserva|consulta|hor[aá]rio/.test(analiseEstrategica);
  const local = [lead.bairro, lead.cidade, lead.estado].filter(Boolean).join(", ");
  const ramo = `${categoria} ${nome}`.toLowerCase();
  const restaurante = /restaurante|bar\b|lanchonete|pizzaria|hamburgueria|cafeteria|café|padaria|doceria|sorveteria|churrascaria|pastelaria/.test(ramo);
  const beleza = /beleza|barbearia|sal[aã]o|est[eé]tica|moda|unha/.test(ramo);
  const pet = /pet|veterin/.test(ramo);
  const saude = /sa[uú]de|cl[ií]nica|dent|odonto|terapia|fisioter/.test(ramo);
  const automotivo = /auto|carro|mec[aâ]nic|oficina|pneu/.test(ramo);
  const tema = /pet|veterin/.test(ramo) ? "floresta"
    : /beleza|barbearia|sal[aã]o|est[eé]tica|moda|unha/.test(ramo) ? "terracota"
    : /sa[uú]de|cl[ií]nica|dent|odonto|terapia|fisioter/.test(ramo) ? "esmeralda"
    : /advoc|cont[aá]bil|consult|tecnolog|inform[aá]tica/.test(ramo) ? "grafite"
    : restaurante ? "vinho" : "oceano";
  const servicos = restaurante
    ? [
        { nome: "Cardápio e opções", descricao: "Conheça as opções disponíveis e consulte a equipe sobre os itens do dia.", icone: "comida" },
        { nome: "Atendimento", descricao: "Tire dúvidas sobre produtos, horários e formas de atendimento.", icone: "check" },
        { nome: "Reservas", descricao: "Consulte a disponibilidade e fale com a equipe para organizar sua visita.", icone: "relogio" },
      ]
    : beleza
      ? [
          { nome: "Cuidados e serviços", descricao: "Conheça as opções de cuidado e beleza oferecidas pelo estabelecimento.", icone: "beleza" },
          { nome: "Atendimento personalizado", descricao: "Converse com a equipe para encontrar o serviço mais adequado ao que procura.", icone: "coracao" },
          { nome: "Agendamento", descricao: "Consulte horários e agende seu atendimento diretamente.", icone: "relogio" },
        ]
      : pet
        ? [
            { nome: "Cuidados para seu pet", descricao: "Consulte os serviços disponíveis para o cuidado e bem-estar do seu companheiro.", icone: "pet" },
            { nome: "Orientação da equipe", descricao: "Fale com os profissionais para esclarecer dúvidas sobre os atendimentos.", icone: "coracao" },
            { nome: "Agendamento", descricao: "Consulte a disponibilidade e organize o atendimento do seu pet.", icone: "relogio" },
          ]
        : saude
          ? [
              { nome: "Atendimento especializado", descricao: "Consulte as áreas de atendimento e os serviços disponíveis na unidade.", icone: "saude" },
              { nome: "Orientações", descricao: "Entre em contato para esclarecer dúvidas e receber informações sobre o atendimento.", icone: "check" },
              { nome: "Agendamento", descricao: "Consulte horários e informações para agendar uma consulta.", icone: "relogio" },
            ]
          : automotivo
            ? [
                { nome: "Serviços automotivos", descricao: "Consulte os serviços disponíveis para seu veículo.", icone: "carro" },
                { nome: "Orçamento e informações", descricao: "Fale com a equipe para explicar sua necessidade e confirmar as opções.", icone: "ferramenta" },
                { nome: "Atendimento", descricao: "Consulte disponibilidade e horários diretamente com o estabelecimento.", icone: "check" },
              ]
            : [
                { nome: `Atendimento em ${categoria || "nossos serviços"}`, descricao: `Entre em contato com ${nome} para conhecer as opções de atendimento disponíveis.`, icone: "check" },
                { nome: "Informações e orientações", descricao: "Consulte informações sobre os serviços e esclareça suas dúvidas diretamente com a equipe.", icone: "estrela" },
                { nome: "Contato direto", descricao: "Use os canais de contato e a localização desta página para falar com a empresa.", icone: "coracao" },
              ];
  const itensCardapio = Array.isArray(lead.cardapio) ? lead.cardapio : Array.isArray(lead.menu) ? lead.menu : [];
  const cardapio = itensCardapio.slice(0, 80).map((item) => ({
    categoria: textoSeguro(item?.categoria || "", 60),
    nome: textoSeguro(item?.nome || item?.name || item?.produto || "", 100),
    descricao: textoSeguro(item?.descricao || item?.description || "", 240),
    preco: textoSeguro(item?.preco || item?.price || "", 40),
    imagem_url: /^https:\/\//i.test(String(item?.imagem_url || item?.image || "")) ? String(item.imagem_url || item.image) : "",
  })).filter((item) => item.nome);
  return {
    slogan: restaurante ? "Uma experiência para aproveitar" : beleza ? "Seu momento de cuidado começa aqui" : pet ? "Cuidado e carinho para seu pet" : saude ? "Cuidado e atenção em cada atendimento" : automotivo ? "Cuidado e confiança para seu veículo" : `Conheça ${nome}`,
    estilo_visual: beleza ? "premium" : restaurante ? "acolhedor" : automotivo ? "urbano" : saude ? "editorial" : "tecnologico",
    faixa_destaque: "",
    profissionais: [],
    titulo: nome,
    subtitulo: [categoria, local].filter(Boolean).join(" · ") || "Conheça a empresa e fale diretamente com a equipe.",
    sobre: `${nome}${categoria ? ` atua no segmento de ${categoria}` : ""}${local ? ` e está localizada em ${local}` : ""}. Esta página apresenta as informações disponíveis sobre o estabelecimento e facilita o contato com a equipe.\n\nPara confirmar serviços, disponibilidade, valores e horários, fale diretamente com a equipe pelos canais informados nesta página.`,
    servicos,
    diferenciais: [
      { titulo: "Atendimento próximo", texto: "Entre em contato diretamente com a equipe para receber orientação sobre a melhor opção para sua necessidade." },
      { titulo: "Presença local", texto: local ? `Encontre a empresa em ${local} e consulte a rota para chegar com facilidade.` : "Consulte a localização e as formas de contato disponíveis." },
      { titulo: "Informações claras", texto: "Consulte os dados disponíveis e confirme os detalhes diretamente com a equipe." },
    ],
    perguntas: [
      { pergunta: "Como posso entrar em contato?", resposta: "Use o botão de WhatsApp ou os dados de contato apresentados nesta página." },
      { pergunta: "Quais serviços ou opções estão disponíveis?", resposta: "Fale diretamente com a equipe para confirmar as opções disponíveis." },
      { pergunta: "Como confirmar valores e horários?", resposta: "Valores, disponibilidade e horários devem ser confirmados diretamente com a empresa." },
    ],
    chamada_agendamento: restaurante ? "Faça sua reserva ou consulte a disponibilidade diretamente pelo WhatsApp." : focoAgendamento ? "Consulte os horários disponíveis e fale com a equipe para agendar seu atendimento." : "Entre em contato para saber mais e consultar as opções disponíveis.",
    tema,
    seo_descricao: `${nome}${categoria ? ` em ${categoria}` : ""}${local ? ` em ${local}` : ""}. Consulte informações e entre em contato diretamente com a empresa.`.slice(0, 160),
    tipo_negocio: restaurante ? "restaurante" : "servicos",
    observacao_operador: observacaoOperador,
    cardapio,
  };
}
/** Valida e normaliza o JSON retornado pelo Claude gratuito antes de salvar. */
export function validarConteudoSite(d) {
  const servicos = Array.isArray(d?.servicos) ? d.servicos.filter((item) => String(item?.nome || "").trim()) : [];
  const diferenciais = Array.isArray(d?.diferenciais) ? d.diferenciais.filter((item) => String(item?.titulo || "").trim()) : [];
  const perguntas = Array.isArray(d?.perguntas) ? d.perguntas.filter((item) => String(item?.pergunta || "").trim()) : [];
  if (
    !d || typeof d !== "object" ||
    !String(d.titulo || "").trim() ||
    !String(d.sobre || "").trim() ||
    servicos.length < 3 ||
    diferenciais.length < 3 ||
    perguntas.length < 3
  ) {
    throw erro("O JSON do Claude está incompleto. Ele precisa conter título, apresentação, pelo menos 3 serviços, 3 diferenciais e 3 perguntas frequentes.", 422);
  }
  const txt = (v, max) => String(v || "").trim().slice(0, max);
  return {
    slogan: txt(d.slogan, 90),
    estilo_visual: ["premium", "urbano", "editorial", "acolhedor", "tecnologico"].includes(d.estilo_visual) ? d.estilo_visual : "premium",
    faixa_destaque: txt(d.faixa_destaque, 120),
    profissionais: (Array.isArray(d.profissionais) ? d.profissionais : []).slice(0, 8).map((item) => ({
      nome: txt(item.nome, 80),
      especialidade: txt(item.especialidade, 100),
      descricao: txt(item.descricao, 220),
    })).filter((item) => item.nome),
    titulo: txt(d.titulo, 120),
    subtitulo: txt(d.subtitulo, 260),
    sobre: txt(d.sobre, 1400),
    servicos: servicos.slice(0, 6).map((item) => ({
      nome: txt(item.nome, 60),
      descricao: txt(item.descricao, 220),
      preco: txt(item.preco, 40),
      duracao: txt(item.duracao, 40),
      destaque: item.destaque === true,
      icone: ICONES.includes(item.icone) ? item.icone : "check",
    })),
    diferenciais: diferenciais.slice(0, 4).map((item) => ({
      titulo: txt(item.titulo, 60), texto: txt(item.texto, 180),
    })),
    perguntas: perguntas.slice(0, 5).map((item) => ({
      pergunta: txt(item.pergunta, 140), resposta: txt(item.resposta, 320),
    })),
    chamada_agendamento: txt(d.chamada_agendamento, 180),
    tema: TEMAS.includes(d.tema) ? d.tema : "oceano",
    seo_descricao: txt(d.seo_descricao, 160),
    tipo_negocio: d.tipo_negocio === "restaurante" ? "restaurante" : "servicos",
    observacao_operador: txt(d.observacao_operador, 600),
    cardapio: (Array.isArray(d.cardapio) ? d.cardapio : []).slice(0, 80).map((item) => ({
      categoria: txt(item.categoria, 60), nome: txt(item.nome, 100), descricao: txt(item.descricao, 240),
      preco: txt(item.preco, 40), imagem_url: /^https:\/\//i.test(String(item.imagem_url || "")) ? String(item.imagem_url) : "",
    })).filter((item) => item.nome),
  };
}

const RESERVADOS = new Set(["admin", "api", "login", "site", "loja", "conta"]);

/** Endereço único para o site (ex.: "barbearia-do-ze-centro"). */
export async function slugUnico(base44, desejado, siteId) {
  let base = slugify(desejado) || "site";
  if (base.length < 3 || RESERVADOS.has(base)) base = `${base}-site`;
  for (let i = 0; i < 20; i += 1) {
    const candidato = i === 0 ? base : `${base}-${i + 1}`;
    const [existente] = await listar(base44, "SiteCliente", { slug: candidato }, 1);
    if (!existente || existente.id === siteId) return candidato;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function sitePorLead(base44, leadId) {
  const [site] = await listar(base44, "SiteCliente", { lead_id: leadId }, 1);
  return site || null;
}

/** Somente o que pode aparecer na página pública. */
export function sitePublico(site) {
  const { observacao_operador: _observacaoInterna, ...conteudoPublico } = site.conteudo || {};
  return {
    slug: site.slug,
    status: site.status,
    empresa: site.empresa,
    categoria: site.categoria || "",
    endereco: site.endereco || "",
    cidade: site.cidade || "",
    bairro: site.bairro || "",
    estado: site.estado || "",
    place_id: site.place_id || "",
    nota_google: site.nota_google ?? null,
    total_avaliacoes: site.total_avaliacoes ?? null,
    fotos_google: (Array.isArray(site.fotos_google) ? site.fotos_google : []).slice(0, 5).filter((foto) => /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_=-]+$/.test(String(foto?.name || ""))).map((foto) => ({ name: foto.name, autor: String(foto.autor || ""), autor_uri: String(foto.autor_uri || "") })),
    whatsapp: whatsappDe(site.whatsapp),
    telefone: site.telefone || "",
    instagram: site.instagram || "",
    horario: site.horario || "",
    conteudo: conteudoPublico,
  };
}
