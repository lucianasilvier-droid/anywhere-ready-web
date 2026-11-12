export const WHATSAPP_NUMBER = "5511913290911";

export const WHATSAPP_DISPLAY = "+55 11 91329-0911";

export const BRAND_NAME = "GOOGLE NFC CONNECT";

export const SERVICE_IMAGE_URL =
  "/images/site/servico-google-maps.webp";

export const PLATE_IMAGE_URL =
  "/images/site/placa-nfc-avaliacao-google.webp";

export const INSTAGRAM_PLATE_IMAGE_URL =
  "/images/site/display-instagram-acrilico-neon.webp";

export function whatsappLink(message) {
  const text = encodeURIComponent(
    message || "Olá! Quero saber mais sobre os serviços do Google NFC Connect."
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

export const SERVICES = [
  {
    slug: "/servicos/perfil-google",
    number: "01",
    title: "Criação de Perfil no Google Maps",
    short: "Colocamos sua empresa no mapa, com endereço, fotos, horários e contatos.",
    color: "#4285F4",
    icon: "map",
    features: [
      "Cadastro completo dos dados da empresa",
      "Categoria, descrição e horários",
      "Fotos, logotipo e redes sociais",
      "Acompanhamento de cada etapa",
    ],
  },
  {
    slug: "/servicos/gestao-perfil",
    number: "02",
    title: "Gestão e Administração do Perfil",
    short: "Cuidamos do seu perfil todos os meses: fotos, postagens, avaliações e relatórios.",
    color: "#34A853",
    icon: "shield",
    features: [
      "Atualização contínua de informações",
      "Acompanhamento de avaliações",
      "Sugestões de resposta com IA",
      "Relatórios mensais de acompanhamento",
    ],
  },
  {
    slug: "/servicos/placa-nfc",
    number: "03",
    title: "Placa NFC de Avaliação",
    short: "Placas NFC individuais para avaliação no Google ou acesso ao Instagram, vendidas separadamente.",
    color: "#FBBC05",
    icon: "nfc",
    features: [
      "Aproxime o celular e abra a avaliação",
      "Chip NFC programado com o seu link",
      "Opções individuais: link do Google ou do Instagram",
      "Personalização com a sua marca",
    ],
  },
  {
    slug: "/servicos/criacao-site",
    number: "04",
    title: "Criação de Site com Agendamento",
    short: "Site profissional com mapa do Google Maps e agendamento direto pelo WhatsApp.",
    color: "#EA4335",
    icon: "globe",
    features: [
      "Site de uma página, rápido e no celular",
      "Mapa do Google Maps e botão de rota",
      "Agendamento pelo WhatsApp",
      "Demonstração pronta antes de contratar",
    ],
  },
];

export const NFC_BENEFITS = [
  {
    title: "VISIBILIDADE",
    text: "Seu material em evidência no balcão, na mesa ou na recepção.",
    color: "#4285F4",
    icon: "eye",
  },
  {
    title: "TECNOLOGIA NFC",
    text: "Rápido, seguro e sem complicação: é só aproximar o celular.",
    color: "#34A853",
    icon: "check",
  },
  {
    title: "MAIS AVALIAÇÕES",
    text: "Facilita o acesso ao canal oficial e fortalece sua reputação.",
    color: "#EA4335",
    icon: "star",
  },
  {
    title: "ATRAI MAIS CLIENTES",
    text: "Mais confiança e mais descoberta da sua empresa na região.",
    color: "#FBBC05",
    icon: "trend",
  },
];

export const NFC_STEPS = [
  {
    title: "Criação do Perfil no Google Maps ou WebSite",
    text: "Cadastramos o Perfil no Google Maps ou WebSite e configuramos os links do seu negócio.",
  },
  {
    title: "Você recebe a placa",
    text: "Placa física já ativada, pronta para usar.",
  },
  {
    title: "O cliente aproxima",
    text: "O cliente encosta o celular na placa e o link abre na hora, sem digitar nada.",
  },
  {
    title: "A avaliação é espontânea",
    text: "Nenhuma avaliação é criada automaticamente: o cliente escreve o que quiser.",
  },
];

export const FUNIL_STAGES = [
  { key: "novo_lead", label: "Novo lead", color: "#64748b" },
  { key: "empresa_analisada", label: "Empresa analisada", color: "#4285F4" },
  { key: "aguardando_autorizacao", label: "Aguardando autorização", color: "#FBBC05" },
  { key: "autorizacao_recebida", label: "Autorização recebida", color: "#34A853" },
  { key: "recusou_contato", label: "Recusou contato", color: "#f97316" },
  { key: "contato_autorizado", label: "Contato comercial autorizado", color: "#22c55e" },
  { key: "material_enviado", label: "Material enviado", color: "#06b6d4" },
  { key: "em_negociacao", label: "Em negociação", color: "#a855f7" },
  { key: "proposta_enviada", label: "Proposta enviada", color: "#eab308" },
  { key: "cliente_convertido", label: "Cliente convertido", color: "#16a34a" },
  { key: "venda_perdida", label: "Venda perdida", color: "#ef4444" },
  { key: "bloqueado", label: "Bloqueado para contato", color: "#7f1d1d" },
];

export const PLANO_LABEL = {
  essencial: "Essencial",
  profissional: "Profissional",
  premium: "Premium",
};