import { PRECO_SITE, calcularPrecoBase, fecharPreco } from "@/lib/preco-site";

/** A avaliação usa a tabela local: não chama APIs nem gera custos externos. */
export async function avaliarPrecoSite(lead, conteudo, extras = {}) {
  const base = calcularPrecoBase(lead, extras);
  const avaliacao = {
    ajuste: 0,
    complexidade: "simples",
    justificativa: "Valor calculado pela tabela interna do sistema, sem consulta a serviços externos.",
    argumento_cliente: "O valor considera a estrutura, o conteúdo e os recursos incluídos na demonstração do site.",
    fonte: "tabela",
  };
  const preco = fecharPreco(base, avaliacao.ajuste);
  return { ...preco, ...avaliacao, avaliado_em: new Date().toISOString() };
}
