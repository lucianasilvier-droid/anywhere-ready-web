// Tabela de preços dos sites. TODOS os números abaixo são padrões iniciais: ajuste ao seu mercado.
export const PRECO_SITE = {
  base: 497, // site de 1 página: mapa do Google + agendamento por WhatsApp + SEO
  minimo: 397,
  maximo: 1997,
  ajusteIAMax: 0.2, // a IA só pode mexer em até ±20% do valor calculado
  comissaoRepresentante: 0.5, // 50% do valor do site
  extras: {
    logo: { titulo: "Criação de logotipo", valor: 150 },
    fotos: { titulo: "Tratamento de fotos / galeria", valor: 120 },
    pagina_extra: { titulo: "Página adicional", valor: 120 }, // vezes a quantidade
    formulario: { titulo: "Formulário de orçamento por e-mail", valor: 100 },
    blog: { titulo: "Blog / notícias", valor: 250 },
  },
  // Custos de terceiros: cobrados à parte e fora da comissão. São estimativas editáveis.
  dominioAnual: 40,
  hospedagemMensal: 29,
};

// Ramos em que o site costuma gerar mais retorno ao cliente.
const SEGMENTO_PREMIUM = /(saude|saúde|odont|dent|clinic|cl[ií]nica|advog|jur[ií]d|est[eé]tic|beleza|im[oó]ve|arquitet|engenh|contab|veterin)/i;

export function arredondar(valor) {
  return Math.round(valor / 10) * 10 - 3; // 497, 547, 1297…
}

export function limitar(valor, { minimo, maximo } = PRECO_SITE) {
  return Math.min(maximo, Math.max(minimo, valor));
}

/** Preço determinístico (sem IA): a mesma entrada sempre dá o mesmo valor. */
export function calcularPrecoBase(lead = {}, extras = {}) {
  const itens = [{ titulo: "Site de 1 página (mapa, WhatsApp, SEO)", valor: PRECO_SITE.base }];
  let valor = PRECO_SITE.base;

  for (const [chave, qtd] of Object.entries(extras)) {
    const ex = PRECO_SITE.extras[chave];
    const n = chave === "pagina_extra" ? Math.max(0, Math.min(10, Number(qtd) || 0)) : qtd ? 1 : 0;
    if (!ex || !n) continue;
    itens.push({ titulo: n > 1 ? `${ex.titulo} (x${n})` : ex.titulo, valor: ex.valor * n });
    valor += ex.valor * n;
  }

  let fator = 1;
  const motivos = [];
  if (SEGMENTO_PREMIUM.test(`${lead.categoria || ""} ${lead.empresa || ""}`)) {
    fator += 0.2;
    motivos.push("ramo de maior retorno (+20%)");
  }
  if ((lead.total_avaliacoes ?? 0) >= 100) {
    fator += 0.1;
    motivos.push("negócio consolidado, 100+ avaliações no Google (+10%)");
  }
  valor *= fator;

  return { itens, fator, motivos, valor_calculado: limitar(arredondar(valor)) };
}

/** Junta o cálculo com o ajuste da IA (já validado) e devolve tudo o que a tela precisa. */
export function fecharPreco(base, ajusteIA = 0) {
  const ajuste = Math.max(-PRECO_SITE.ajusteIAMax, Math.min(PRECO_SITE.ajusteIAMax, Number(ajusteIA) || 0));
  const valor_sugerido = limitar(arredondar(base.valor_calculado * (1 + ajuste)));
  return {
    ...base,
    ajuste_ia: ajuste,
    valor_sugerido,
    comissao_representante: Math.round(valor_sugerido * PRECO_SITE.comissaoRepresentante * 100) / 100,
    receita_empresa: Math.round(valor_sugerido * (1 - PRECO_SITE.comissaoRepresentante) * 100) / 100,
    custos_terceiros: { dominio_anual: PRECO_SITE.dominioAnual, hospedagem_mensal: PRECO_SITE.hospedagemMensal },
  };
}

// Administração mensal do site pela empresa (opcional, escolhida pelo cliente).
export const MENSALIDADE_SITE = {
  valor: 150, // cobrado do cliente por mês
  comissao_representante: 50, // do representante, a cada mensalidade PAGA
  empresa: 100, // fica com a empresa
};

/** Custos de domínio e hospedagem de um site (valores do próprio site ou os padrões da tabela). */
export function custosDoSite(site = {}) {
  const num = (v, padrao) => (v === undefined || v === null || v === "" ? padrao : Number(v) || 0);
  return {
    dominio: site.dominio || "",
    dominio_anual: num(site.dominio_valor_anual, PRECO_SITE.dominioAnual),
    hospedagem_mensal: num(site.hospedagem_valor_mensal, PRECO_SITE.hospedagemMensal),
    // true = a hospedagem está dentro da mensalidade de R$ 150 (sai da parte da empresa)
    hospedagem_inclusa: !!site.hospedagem_inclusa,
  };
}

/**
 * Quanto cada parte recebe: pagamento do site (uma vez) + mensalidade (todo mês, só se contratada).
 * Domínio e hospedagem nunca entram na comissão.
 */
export function resumoFinanceiro(valorSite, { mensalidade = false, custos = custosDoSite() } = {}) {
  const comissaoSite = Math.round(valorSite * PRECO_SITE.comissaoRepresentante * 100) / 100;
  const repassaHospedagem = !(mensalidade && custos.hospedagem_inclusa);
  return {
    site: { cliente_paga: valorSite, representante: comissaoSite, empresa: Math.round((valorSite - comissaoSite) * 100) / 100 },
    mensalidade: mensalidade
      ? {
          cliente_paga_por_mes: MENSALIDADE_SITE.valor,
          representante_por_mes: MENSALIDADE_SITE.comissao_representante,
          empresa_por_mes: MENSALIDADE_SITE.empresa,
          empresa_liquida_estimada: MENSALIDADE_SITE.empresa - (custos.hospedagem_inclusa ? custos.hospedagem_mensal : 0),
        }
      : null,
    custos: {
      ...custos,
      // o que o cliente paga à parte, além do site e da mensalidade
      cliente_paga_dominio_ano: custos.dominio_anual,
      cliente_paga_hospedagem_mes: repassaHospedagem ? custos.hospedagem_mensal : 0,
    },
  };
}
