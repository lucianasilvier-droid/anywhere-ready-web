// Sites de demonstração para empresas prospectadas no CRM. O conteúdo é gerado
// pela IA configurada no sistema, validado no servidor e guardado em SiteCliente.
import { listar } from "@/lib/representantes.server";
import { slugify } from "@/lib/landing-representante.server";
import { iaJSON } from "@/lib/integrations.server";

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

function briefing(lead, orientacoes) {
  return [
    `Nome da empresa: ${lead.empresa || "não informado"}`,
    `Ramo/categoria: ${lead.categoria || "não informado"}`,
    `Endereço: ${lead.endereco || "não informado"}`,
    `Cidade: ${lead.cidade || "não informada"}${lead.bairro ? `, bairro ${lead.bairro}` : ""}${lead.estado ? ` - ${lead.estado}` : ""}`,
    `Nota no Google: ${lead.nota_google ?? "sem dados"} (${lead.total_avaliacoes ?? 0} avaliações)`,
    lead.ai_resumo ? `Análise comercial já feita: ${lead.ai_resumo}` : "",
    lead.ai_oportunidades ? `Oportunidades identificadas: ${lead.ai_oportunidades}` : "",
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
    slogan: restaurante ? "Uma experiência para aproveitar" : beleza ? "Seu momento de cuidado começa aqui" : pet ? "Cuidado e carinho para seu pet" : saude ? "Cuidado e atenção em cada atendimento" : automotivo ? "Cuidado e confiança para seu veículo" : `Conheça ${nome}` ,
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
/**
 * Gera o conteúdo com a IA já configurada no sistema (API Roq/Groq; Claude como reserva).
 * Não faz chamada até o usuário solicitar a criação/atualização do site.
 */
export async function gerarConteudoSiteComIA(lead, orientacoes = "", credenciais = {}) {
  const base = gerarConteudoSiteAutomatico(lead, orientacoes);
  const fotosDisponiveis = Array.isArray(lead.fotos_google) ? lead.fotos_google.length : 0;
  const prompt = `Você é diretor de criação digital, UX writer e copywriter especializado em sites de alta conversão para pequenos negócios brasileiros.

Crie o conteúdo de uma página de site com aparência premium, moderna e profissional. O conteúdo será aplicado a um layout responsivo já existente, com hero, serviços, diferenciais, perguntas frequentes, contato, mapa e galeria de fotos reais do Google quando disponíveis.

OBJETIVOS:
- Fazer o site parecer feito sob medida para esta empresa, nunca um modelo genérico.
- Usar psicologia das cores: escolha uma paleta coerente com o ramo, o público e a sensação que a marca deve transmitir.
- Criar título e subtítulo fortes, benefício claro e chamadas para ação objetivas.
- Usar linguagem natural, convincente e acolhedora em português do Brasil.
- Valorizar localização, reputação e características reais do estabelecimento sem exagerar.
- Aproveitar a análise comercial como contexto para entender o negócio e destacar os serviços mais relevantes.
- O sistema exibirá automaticamente as fotos reais do Google que estiverem cadastradas; não invente descrições de imagens.

DADOS DO ESTABELECIMENTO:
${briefing(lead, orientacoes)}

FOTOS REAIS DO GOOGLE DISPONÍVEIS: ${fotosDisponiveis}. Elas serão exibidas automaticamente pelo sistema.

REGRAS DE CONFIABILIDADE:
- Não invente preços, promoções, horários, certificações, prêmios, anos de experiência, quantidade de clientes, depoimentos, nomes de funcionários ou resultados.
- Não afirme que a empresa oferece um serviço específico se isso não estiver confirmado. Quando faltarem detalhes, descreva opções típicas do ramo de forma cuidadosa e convide o visitante a confirmar com a equipe.
- Não copie a análise interna literalmente para o site público; use-a apenas para orientar a hierarquia e o foco do conteúdo.
- Não inclua instruções internas, observações privadas ou informações de prospecção no texto público.
- Não crie endereço, telefone, e-mail, redes sociais ou links. Esses dados são inseridos pelo sistema.
- Se houver cardápio cadastrado, o sistema o incluirá separadamente; não invente pratos nem preços.

FORMATO:
- slogan: frase de impacto curta.
- titulo: título principal específico para a empresa.
- subtitulo: proposta de valor clara, com referência local quando disponível.
- sobre: texto humano e confiável, em dois parágrafos curtos.
- servicos: de 3 a 6 itens relevantes, cada um com nome, descrição e ícone permitido.
- diferenciais: de 3 a 4 pontos objetivos, sem alegações não comprovadas.
- perguntas: de 3 a 5 perguntas frequentes úteis.
- chamada_agendamento: chamada para contato ou agendamento sem inventar disponibilidade.
- tema: escolha exatamente uma opção da lista.
- seo_descricao: descrição local natural, sem repetição artificial de palavras-chave.

Escolha de tema permitida: ${TEMAS.join(", ")}.
Ícones permitidos: ${ICONES.join(", ")}.

Entregue somente um JSON válido, sem Markdown, sem comentários e sem texto antes ou depois.`;
  const schemaHint = `{"slogan":"string","titulo":"string","subtitulo":"string","sobre":"string","servicos":[{"nome":"string","descricao":"string","icone":"string"}],"diferenciais":[{"titulo":"string","texto":"string"}],"perguntas":[{"pergunta":"string","resposta":"string"}],"chamada_agendamento":"string","tema":"string","seo_descricao":"string"}.`;
  const resposta = await iaJSON(prompt, schemaHint, credenciais);
  if (!resposta?.ok || !resposta?.data) {
    throw erro(
      resposta?.error || "A IA não conseguiu gerar o conteúdo do site. Confira as integrações de IA no painel e tente novamente.",
      502,
    );
  }
  const conteudo = validarConteudoSite({
    ...base,
    ...resposta.data,
    tipo_negocio: base.tipo_negocio,
    observacao_operador: base.observacao_operador,
    cardapio: base.cardapio,
  });
  return { conteudo, modelo: resposta.modelo || "ia" };
}

/** Valida e normaliza o conteúdo retornado pela IA antes de salvar. */
export function validarConteudoSite(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.servicos) || d.servicos.length < 3 || !String(d.titulo || "").trim()) {
    throw erro("O JSON retornado pelo Claude está incompleto. Confira o conteúdo e tente novamente.", 422);
  }
  const txt = (v, max) => String(v || "").trim().slice(0, max);
  return {
    slogan: txt(d.slogan, 90),
    titulo: txt(d.titulo, 120),
    subtitulo: txt(d.subtitulo, 260),
    sobre: txt(d.sobre, 1400),
    servicos: d.servicos.slice(0, 6).map((item) => ({
      nome: txt(item.nome, 60),
      descricao: txt(item.descricao, 220),
      icone: ICONES.includes(item.icone) ? item.icone : "check",
    })),
    diferenciais: (Array.isArray(d.diferenciais) ? d.diferenciais : []).slice(0, 4).map((item) => ({
      titulo: txt(item.titulo, 60), texto: txt(item.texto, 180),
    })),
    perguntas: (Array.isArray(d.perguntas) ? d.perguntas : []).slice(0, 5).map((item) => ({
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
    conteudo: site.conteudo || {},
  };
}
