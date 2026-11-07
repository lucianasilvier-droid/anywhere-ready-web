import Anthropic from "@anthropic-ai/sdk";
import { MODELO_CLAUDE } from "@/lib/sites-clientes.server";
import { PRECO_SITE, calcularPrecoBase, fecharPreco } from "@/lib/preco-site";

const FERRAMENTA = {
  name: "avaliar_site",
  description: "Avalia o valor de mercado do site criado e justifica para o administrador.",
  input_schema: {
    type: "object",
    properties: {
      ajuste: {
        type: "number",
        description: `Ajuste sobre o valor calculado, de -${PRECO_SITE.ajusteIAMax} a ${PRECO_SITE.ajusteIAMax} (ex.: 0.1 = +10%).`,
      },
      complexidade: { type: "string", enum: ["simples", "media", "completa"] },
      justificativa: { type: "string", description: "2 a 3 frases para o administrador explicando o valor." },
      argumento_cliente: { type: "string", description: "1 frase que o representante pode usar para apresentar o preço ao dono da empresa." },
    },
    required: ["ajuste", "complexidade", "justificativa", "argumento_cliente"],
  },
};

/** Avalia o site e devolve o preço. Se a IA falhar, usa o valor calculado (nunca bloqueia a criação). */
export async function avaliarPrecoSite(lead, conteudo, extras = {}) {
  const base = calcularPrecoBase(lead, extras);
  let ia = { ajuste: 0, complexidade: "simples", justificativa: "", argumento_cliente: "", fonte: "tabela" };
  try {
    const r = await new Anthropic().messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 800,
      system: `Você avalia o valor de sites de pequenos negócios no Brasil para a Google NFC Connect.
Já existe um valor calculado por tabela; você só ajusta dentro do limite permitido, com base na qualidade e riqueza do conteúdo
e no potencial do negócio. Não invente dados do cliente. Responda SEMPRE chamando a ferramenta avaliar_site.`,
      tools: [FERRAMENTA],
      tool_choice: { type: "tool", name: "avaliar_site" },
      messages: [{
        role: "user",
        content: `Empresa: ${lead.empresa}\nRamo: ${lead.categoria || "n/i"}\nCidade: ${lead.cidade || "n/i"}\n` +
          `Nota Google: ${lead.nota_google ?? "s/d"} (${lead.total_avaliacoes ?? 0} avaliações)\n` +
          `Valor calculado: R$ ${base.valor_calculado}\nItens: ${base.itens.map((i) => `${i.titulo} R$${i.valor}`).join("; ")}\n` +
          `Serviços no site: ${(conteudo.servicos || []).length}, FAQ: ${(conteudo.perguntas || []).length}`,
      }],
    });
    const d = (r.content || []).find((c) => c.type === "tool_use")?.input;
    if (d && typeof d.ajuste === "number") {
      ia = {
        ajuste: d.ajuste,
        complexidade: ["simples", "media", "completa"].includes(d.complexidade) ? d.complexidade : "simples",
        justificativa: String(d.justificativa || "").slice(0, 600),
        argumento_cliente: String(d.argumento_cliente || "").slice(0, 300),
        fonte: "ia",
      };
    }
  } catch (e) {
    console.error("[preco-site] IA indisponível, usando a tabela", e);
  }
  const preco = fecharPreco(base, ia.ajuste);
  return { ...preco, ...ia, avaliado_em: new Date().toISOString() };
}
