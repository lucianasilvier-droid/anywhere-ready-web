import { MENSALIDADE_SITE, PRECO_SITE } from "@/lib/preco-site";

// Tabela de comissões dos representantes. Compartilhada entre o servidor (cálculo)
// e as páginas públicas (apresentação).
export const TABELA_COMISSAO = {
  perfil_google: { titulo: "Criação de perfil no Google", valor: 150, comissao: 100, empresa: 50 },
  mensalidade: { titulo: "Administração mensal do perfil", valor: 150, comissao: 50, empresa: 100 },
  placa: { titulo: "Placa NFC", valorUnidade: 55, comissaoUnidade: 20 },
  // Sites: o valor vem do preço do site (preco-site.js); o representante recebe 50%.
  site: { titulo: "Criação de site", percentual: PRECO_SITE.comissaoRepresentante },
  // Administração mensal do site: regra própria, separada da mensalidade do perfil Google.
  mensalidade_site: {
    titulo: "Administração mensal do site",
    valor: MENSALIDADE_SITE.valor,
    comissao: MENSALIDADE_SITE.comissao_representante,
    empresa: MENSALIDADE_SITE.empresa,
  },
};
