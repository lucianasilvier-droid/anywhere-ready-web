import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { criarVenda } from "@/lib/representantes.server";
import { representantePorSlug } from "@/lib/landing-representante.server";

const PUBLIC_FIELDS = {
  codigo: 1,
  empresa: 1,
  nome_exibicao: 1,
  google_review_url: 1,
  instagram_url: 1,
  status: 1,
};

function makeCode(prefix, size = 8) {
  const raw = (globalThis.crypto?.randomUUID?.() || String(Math.random()))
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return `${prefix}${raw.slice(0, size)}`;
}

const serviceRequestSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  empresa: z.string().trim().max(140).optional().default(""),
  email: z.string().trim().email().max(160),
  telefone: z.string().trim().min(8).max(30),
  cidade: z.string().trim().max(100).optional().default(""),
  servico: z.enum(["perfil_google", "gestao_perfil", "placa_nfc", "criacao_site", "nao_sei"]),
  mensagem: z.string().trim().max(1200).optional().default(""),
});

/**
 * Formulário público das páginas de serviço. Cria o lead no CRM com o cliente
 * de serviço (o formulário pode ser enviado por visitantes anônimos).
 */
export const submitServiceRequest = createServerFn({ method: "POST" })
  .validator(serviceRequestSchema)
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44().asServiceRole;
    const empresa = data.empresa || data.nome;

    const lead = await base44.entities.Lead.create({
      empresa,
      cidade: data.cidade,
      telefone: data.telefone,
      categoria: "Solicitação pelo site",
      origem: "site",
      etapa: "novo_lead",
      servico_interesse: data.servico,
      observacoes: `Contato pelo site · ${data.nome} · ${data.email}${data.mensagem ? `\n\nMensagem: ${data.mensagem}` : ""}`,
      responsavel: "Site",
      consentimento: "autorizado",
      consent_autorizado_em: new Date().toISOString(),
      consent_origem: "Formulário do site (o visitante enviou os próprios dados solicitando contato)",
      ultimo_contato_em: new Date().toISOString(),
    });

    await base44.entities.LeadInteraction.create({
      lead_id: lead.id,
      empresa,
      tipo: "sistema",
      mensagem: `Solicitação recebida pelo site para o serviço: ${data.servico}.`,
      autor: data.nome,
    });

    return { ok: true, leadId: lead.id };
  });

const orderSchema = z.object({
  cliente: z.object({
    nome: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(160),
    telefone: z.string().trim().min(8).max(30),
  }),
  endereco: z.object({
    cep: z.string().trim().max(12).optional().default(""),
    endereco: z.string().trim().min(3).max(200),
    cidade: z.string().trim().min(2).max(100),
    estado: z.string().trim().min(2).max(40),
  }),
  itens: z
    .array(z.object({ produto_id: z.string().min(1), quantidade: z.number().int().min(1).max(50) }))
    .min(1)
    .max(20),
  personalizacao: z
    .object({
      empresa: z.string().trim().max(120).optional().default(""),
      nome_exibicao: z.string().trim().max(120).optional().default(""),
      google_link: z.string().trim().max(500).optional().default(""),
      instagram_link: z.string().trim().max(500).optional().default(""),
      observacoes: z.string().trim().max(1000).optional().default(""),
    })
    .optional(),
  observacoes: z.string().trim().max(1000).optional().default(""),
  // Endereço da página do representante que indicou a compra (link /r/...).
  representante_ref: z.string().trim().max(60).optional().default(""),
});

/**
 * Finaliza o pedido. Preços, frete e total são sempre recalculados no servidor
 * a partir dos produtos cadastrados — nunca aceitos do navegador.
 */
export const createOrder = createServerFn({ method: "POST" })
  .validator(orderSchema)
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44().asServiceRole;

    const ids = [...new Set(data.itens.map((i) => i.produto_id))];
    const encontrados = await base44.entities.Produto.filter({ id: { $in: ids } });
    const produtos = Array.isArray(encontrados) ? encontrados : encontrados?.items || [];

    if (!produtos.length) {
      setResponseStatus(400);
      throw Object.assign(new Error("Nenhum produto válido encontrado no carrinho."), { status: 400 });
    }

    const itens = [];
    let subtotal = 0;
    let unidades = 0;

    for (const item of data.itens) {
      const produto = produtos.find((p) => p.id === item.produto_id);
      if (!produto || produto.ativo === false) {
        setResponseStatus(400);
        throw Object.assign(new Error("Um dos produtos do carrinho não está mais disponível. Atualize a loja e tente novamente."), { status: 400 });
      }
      const preco = Number(produto.preco);
      if (!Number.isFinite(preco) || preco <= 0) {
        setResponseStatus(400);
        throw Object.assign(new Error(`O produto "${produto.nome}" está sem preço válido cadastrado. Nenhum pedido foi criado. Entre em contato com a equipe para confirmar o valor.`), { status: 400 });
      }
      subtotal += preco * item.quantidade;
      unidades += item.quantidade;
      itens.push({
        produto_id: produto.id,
        nome: produto.nome,
        modelo: produto.modelo || "",
        quantidade: item.quantidade,
        preco,
      });
    }

    if (!itens.length) {
      setResponseStatus(400);
      throw Object.assign(new Error("Os produtos do carrinho não estão disponíveis."), { status: 400 });
    }

    const frete = subtotal >= 150 ? 0 : 19.9;
    const total = Math.round((subtotal + frete) * 100) / 100;
    const numero = makeCode("PED-", 6);
    const personalizacao = data.personalizacao || {};

    const pedido = await base44.entities.Pedido.create({
      numero,
      cliente_nome: data.cliente.nome,
      cliente_email: data.cliente.email,
      cliente_telefone: data.cliente.telefone,
      itens,
      subtotal,
      frete,
      total,
      status_pagamento: "aguardando",
      metodo_pagamento: "",
      status_producao: "aguardando",
      cep: data.endereco.cep,
      endereco: data.endereco.endereco,
      cidade: data.endereco.cidade,
      estado: data.endereco.estado,
      personalizacao,
      observacoes: data.observacoes,
    });

    const existentes = await base44.entities.Cliente.filter({ email: data.cliente.email });
    const lista = Array.isArray(existentes) ? existentes : existentes?.items || [];
    let cliente = lista[0];
    if (!cliente) {
      cliente = await base44.entities.Cliente.create({
        nome: data.cliente.nome,
        empresa: personalizacao.empresa || "",
        email: data.cliente.email,
        user_email: data.cliente.email,
        telefone: data.cliente.telefone,
        whatsapp: data.cliente.telefone,
        endereco: data.endereco.endereco,
        cidade: data.endereco.cidade,
        estado: data.endereco.estado,
        cep: data.endereco.cep,
        origem: "loja",
        status: "ativo",
      });
    }

    const placas = [];
    for (let i = 0; i < Math.min(unidades, 20); i += 1) {
      const placa = await base44.entities.PlacaNFC.create({
        codigo: makeCode("NFC", 8),
        pedido_id: pedido.id,
        pedido_numero: numero,
        cliente_nome: data.cliente.nome,
        cliente_email: data.cliente.email,
        empresa: personalizacao.empresa || data.cliente.nome,
        nome_exibicao: personalizacao.nome_exibicao || personalizacao.empresa || data.cliente.nome,
        google_review_url: personalizacao.google_link || "",
        instagram_url: personalizacao.instagram_link || "",
        status: "aguardando_configuracao",
        observacoes: personalizacao.observacoes || data.observacoes,
      });
      placas.push(placa.codigo);
    }

    const vinculo = { cliente_id: cliente.id };
    const rep = data.representante_ref
      ? await representantePorSlug(base44, data.representante_ref).catch(() => null)
      : null;
    if (rep) {
      vinculo.representante_id = rep.id;
      vinculo.representante_nome = rep.nome;
      vinculo.representante_codigo = rep.codigo || "";
      try {
        const { venda } = await criarVenda(
          base44,
          {
            representante_id: rep.id,
            tipo: "placa",
            cliente_nome: data.cliente.nome,
            cliente_email: data.cliente.email,
            quantidade: unidades,
            valor_venda: Math.round(subtotal * 100) / 100,
            pedido_id: pedido.id,
            origem: "pagina_representante",
            observacoes: `Pedido ${numero} feito pela loja a partir da página do representante.`,
            data_venda: new Date().toISOString(),
          },
          "loja",
        );
        vinculo.representante_venda_id = venda.id;
      } catch {
        // A venda pode ser lançada manualmente pelo admin; o pedido segue normalmente.
      }
    }
    await base44.entities.Pedido.update(pedido.id, vinculo);

    return { ok: true, numero, pedidoId: pedido.id, total, placas };
  });

/** Página pública da placa: devolve apenas os campos públicos pelo código exclusivo. */
export const getPlateByCode = createServerFn({ method: "POST" })
  .validator(z.object({ codigo: z.string().trim().min(4).max(40) }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44().asServiceRole;
    const page = await base44.entities.PlacaNFC.filter({ codigo: data.codigo }, { limit: 1 });
    const registros = Array.isArray(page) ? page : page?.items || [];
    const placa = registros[0];
    if (!placa) return { placa: null };
    return {
      placa: {
        codigo: placa.codigo,
        empresa: placa.empresa || "",
        nome_exibicao: placa.nome_exibicao || placa.empresa || "",
        google_review_url: placa.google_review_url || "",
        instagram_url: placa.instagram_url || "",
        status: placa.status || "",
      },
    };
  });