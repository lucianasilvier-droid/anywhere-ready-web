import { describe, expect, it } from "vitest";
import {
  gerarConteudoSiteAutomatico,
  sitePublico,
  validarConteudoSite,
  whatsappDe,
} from "@/lib/sites-clientes.server";

describe("gerador de sites por segmento", () => {
  it("identifica bares e negócios de alimentação como restaurante", () => {
    for (const categoria of ["Bar", "Boteco", "Choperia", "Cervejaria", "Pizzaria", "Hamburgueria", "Cafeteria", "Padaria", "Rotisseria", "Cantina", "Bistrô", "Casa de sucos"]) {
      const conteudo = gerarConteudoSiteAutomatico({ empresa: "Comércio Local", categoria });
      expect(conteudo.tipo_negocio).toBe("restaurante");
    }
  });

  it("não inventa itens ou preços quando o CRM não tem cardápio", () => {
    const conteudo = gerarConteudoSiteAutomatico({ empresa: "Restaurante Exemplo", categoria: "Restaurante" });
    expect(conteudo.cardapio).toEqual([]);
  });

  it("preserva somente os dados reais de cardápio fornecidos pelo CRM", () => {
    const conteudo = gerarConteudoSiteAutomatico({
      empresa: "Restaurante Exemplo",
      categoria: "Restaurante",
      cardapio: [{ nome: "Prato informado", descricao: "Descrição informada", preco: "R$ 32,00" }],
    });
    expect(conteudo.cardapio).toEqual([
      { categoria: "", nome: "Prato informado", descricao: "Descrição informada", preco: "R$ 32,00", imagem_url: "" },
    ]);
  });

  it("não cria dados de WhatsApp a partir do telefone público", () => {
    expect(whatsappDe("")).toBe("");
    expect(sitePublico({
      empresa: "Empresa Exemplo",
      telefone: "(11) 3333-4444",
      whatsapp: "",
      conteudo: {},
    }).whatsapp).toBe("");
  });

  it("mantém a classificação do segmento e valida conteúdo sem criar cardápio", () => {
    const original = gerarConteudoSiteAutomatico({ empresa: "Bar Exemplo", categoria: "Bar" });
    const validado = validarConteudoSite(original);
    expect(validado.tipo_negocio).toBe("restaurante");
    expect(validado.cardapio).toEqual([]);
  });
});
