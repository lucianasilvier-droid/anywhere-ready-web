import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import {
  cancelarVenda,
  confirmarPagamentoCliente,
  criarSolicitacao,
  criarVenda,
  decidirSolicitacao,
  listar,
  novoCodigo,
  representanteDoUsuario,
  resumoRepresentante,
} from "@/lib/representantes.server";
import { TABELA_COMISSAO } from "@/lib/comissoes";

function requireAdmin(context) {
  if (context.user?.role !== "admin") {
    setResponseStatus(403);
    throw Object.assign(new Error("Apenas administradores podem executar esta ação."), { status: 403 });
  }
}

const repInput = z.object({
  id: z.string().optional(),
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  user_email: z.string().trim().email().max(160),
  telefone: z.string().trim().max(30).optional().default(""),
  status: z.enum(["ativo", "inativo", "bloqueado"]).optional().default("ativo"),
  comissao_perfil: z.number().min(0).max(10000).optional(),
  comissao_mensalidade: z.number().min(0).max(10000).optional(),
  comissao_placa: z.number().min(0).max(10000).optional(),
  limite_leads_dia: z.number().int().min(1).max(10000).optional().default(20),
  observacoes: z.string().trim().max(1000).optional().default(""),
  convidar: z.boolean().optional().default(false),
});

const vendaInput = z.object({
  representante_id: z.string().min(1),
  tipo: z.enum(["perfil_google", "mensalidade", "placa", "site", "mensalidade_site"]),
  site_id: z.string().trim().max(80).optional().default(""),
  cliente_nome: z.string().trim().min(2).max(140),
  cliente_email: z.string().trim().max(160).optional().default(""),
  competencia: z.string().trim().max(7).optional().default(""),
  quantidade: z.number().int().min(1).max(200).optional().default(1),
  valor_venda: z.number().min(0).max(1000000).optional().default(0),
  pedido_id: z.string().trim().max(80).optional().default(""),
  observacoes: z.string().trim().max(1000).optional().default(""),
  data_venda: z.string().trim().max(40).optional().default(""),
});

/* ------------------------------- Painel admin ------------------------------ */

export const adminRepresentantesFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;

    const [representantes, vendas, solicitacoes] = await Promise.all([
      listar(base44, "Representante", {}, 300),
      listar(base44, "VendaRepresentante", {}, 600),
      listar(base44, "SolicitacaoPagamento", {}, 300),
    ]);

    const soma = (lista) =>
      Math.round(lista.reduce((t, v) => t + (Number(v.comissao_valor) || 0), 0) * 100) / 100;

    const lista = representantes
      .map((rep) => {
        const minhas = vendas.filter((v) => v.representante_id === rep.id);
        const validas = minhas.filter((v) => v.status_comissao !== "cancelada");
        return {
          ...rep,
          comissao_mensalidade: TABELA_COMISSAO.mensalidade.comissao,
          metricas: {
            vendas: minhas.filter((v) => v.status !== "cancelada").length,
            valor_vendido:
              Math.round(
                minhas
                  .filter((v) => v.status !== "cancelada")
                  .reduce((t, v) => t + (Number(v.valor_venda) || 0), 0) * 100,
              ) / 100,
            comissao_total: soma(validas),
            comissao_disponivel: soma(validas.filter((v) => v.status_comissao === "disponivel")),
            comissao_solicitada: soma(validas.filter((v) => v.status_comissao === "solicitada")),
            comissao_paga: soma(validas.filter((v) => v.status_comissao === "paga")),
            comissao_aguardando: soma(validas.filter((v) => v.status_comissao === "aguardando_pagamento")),
          },
        };
      })
      .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")));

    const pendentes = solicitacoes.filter((s) => s.status === "pendente");

    return {
      representantes: lista,
      solicitacoes: solicitacoes.sort((a, b) =>
        String(b.solicitado_em || "").localeCompare(String(a.solicitado_em || "")),
      ),
      vendas: vendas
        .slice()
        .sort((a, b) => String(b.data_venda || "").localeCompare(String(a.data_venda || "")))
        .slice(0, 80),
      totais: {
        representantes: lista.length,
        ativos: lista.filter((r) => r.status === "ativo").length,
        vendas: vendas.filter((v) => v.status !== "cancelada").length,
        comissao_total: soma(vendas.filter((v) => v.status_comissao !== "cancelada")),
        comissao_disponivel: soma(vendas.filter((v) => v.status_comissao === "disponivel")),
        comissao_paga: soma(vendas.filter((v) => v.status_comissao === "paga")),
        solicitacoes_pendentes: pendentes.length,
        solicitacoes_valor: pendentes.reduce((t, s) => t + (Number(s.valor) || 0), 0),
      },
    };
  });

export const reenviarConviteRepresentanteFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const rep = await base44.entities.Representante.get(data.id).catch(() => null);
    if (!rep) {
      setResponseStatus(404);
      throw Object.assign(new Error("Representante não encontrado."), { status: 404 });
    }
    const email = String(rep.user_email || rep.email || "").trim().toLowerCase();
    if (!email) {
      setResponseStatus(422);
      throw Object.assign(new Error("Este representante não possui e-mail de acesso cadastrado."), { status: 422 });
    }
    const envio = await base44.users.inviteUser(email, "user");
    const delivered = envio?.delivered !== false;
    await base44.entities.AtividadeLog.create({
      acao: "Convite de acesso reenviado",
      entidade: "Representante",
      registro_id: rep.id,
      detalhe: email,
      autor_email: context.user.email,
    });
    return {
      ok: true,
      delivered,
      mensagem: delivered
        ? `Convite solicitado para ${email}.`
        : "O sistema não confirmou o envio do e-mail. Verifique o SMTP e tente novamente.",
    };
  });

export const salvarRepresentanteFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(repInput)
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const user_email = data.user_email.trim().toLowerCase();

    const duplicado = await listar(base44, "Representante", { user_email }, 2);
    const outro = duplicado.find((r) => r.id !== data.id);
    if (outro) {
      setResponseStatus(409);
      throw Object.assign(
        new Error(`O login ${user_email} já está vinculado ao representante ${outro.nome}.`),
        { status: 409 },
      );
    }

    const patch = {
      nome: data.nome.trim(),
      email: data.email.trim().toLowerCase(),
      user_email,
      telefone: data.telefone || "",
      status: data.status || "ativo",
      comissao_perfil: Number(data.comissao_perfil) || 100,
      comissao_mensalidade: TABELA_COMISSAO.mensalidade.comissao,
      comissao_placa: Number(data.comissao_placa) || 20,
      limite_leads_dia: Number(data.limite_leads_dia) || 20,
      observacoes: data.observacoes || "",
    };

    let rep;
    if (data.id) {
      rep = await base44.entities.Representante.update(data.id, patch);
    } else {
      rep = await base44.entities.Representante.create({
        ...patch,
        codigo: novoCodigo("REP-", 6),
        criado_por: context.user.email,
      });
    }

    let convite = null;
    if (data.convidar) {
      try {
        await base44.users.inviteUser(user_email, "user");
        convite = "Convite de acesso enviado por e-mail.";
      } catch (e) {
        convite = `Representante salvo, mas o convite não pôde ser enviado: ${e?.message || "erro no envio"}. Envie o convite pela página Equipe e acessos.`;
      }
    }

    await base44.entities.AtividadeLog.create({
      acao: data.id ? "Representante atualizado" : "Representante cadastrado",
      entidade: "Representante",
      registro_id: rep.id,
      detalhe: `${rep.nome} · ${user_email}`,
      autor_email: context.user.email,
    });

    return { ok: true, representante: rep, convite };
  });

export const statusRepresentanteFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string().min(1), status: z.enum(["ativo", "inativo", "bloqueado"]) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const rep = await base44.entities.Representante.update(data.id, { status: data.status });
    await base44.entities.AtividadeLog.create({
      acao: "Situação do representante alterada",
      entidade: "Representante",
      registro_id: data.id,
      detalhe: `${rep.nome} → ${data.status}`,
      autor_email: context.user.email,
    });
    return { ok: true };
  });

export const excluirRepresentanteFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;

    const vendas = await listar(base44, "VendaRepresentante", { representante_id: data.id }, 1);
    const solicitacoes = await listar(base44, "SolicitacaoPagamento", { representante_id: data.id }, 1);
    if (vendas.length || solicitacoes.length) {
      setResponseStatus(409);
      throw Object.assign(
        new Error(
          "Este representante possui histórico de vendas ou pagamentos e não pode ser excluído. Use a opção Bloquear para impedir novos lançamentos preservando o histórico financeiro.",
        ),
        { status: 409 },
      );
    }

    const rep = await base44.entities.Representante.get(data.id).catch(() => null);
    await base44.entities.Representante.delete(data.id);
    await base44.entities.AtividadeLog.create({
      acao: "Representante excluído",
      entidade: "Representante",
      registro_id: data.id,
      detalhe: rep ? `${rep.nome} · ${rep.email}` : data.id,
      autor_email: context.user.email,
    });
    return { ok: true };
  });

export const representanteDetalheFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const rep = await base44.entities.Representante.get(data.id).catch(() => null);
    if (!rep) {
      setResponseStatus(404);
      throw Object.assign(new Error("Representante não encontrado."), { status: 404 });
    }
    const resumo = await resumoRepresentante(base44, rep);
    return { ...resumo, criado_em: rep.created_date };
  });

/* --------------------------------- Vendas --------------------------------- */

export const criarVendaFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(vendaInput)
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const resultado = await criarVenda(
      base44,
      { ...data, data_venda: data.data_venda || new Date().toISOString() },
      context.user.email,
    );
    return resultado;
  });

export const vendaAcaoFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      id: z.string().min(1),
      acao: z.enum(["confirmar_pagamento", "cancelar"]),
    }),
  )
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    if (data.acao === "confirmar_pagamento") {
      return confirmarPagamentoCliente(base44, data.id, context.user.email);
    }
    return cancelarVenda(base44, data.id, context.user.email);
  });

/* ------------------------------ Solicitações ------------------------------ */

export const decidirSolicitacaoFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      id: z.string().min(1),
      acao: z.enum(["aprovar", "rejeitar", "pagar"]),
      comprovante: z.string().trim().max(400).optional().default(""),
      observacoes: z.string().trim().max(600).optional().default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    return decidirSolicitacao(base44, data, context.user.email);
  });

/* --------------------------- Painel do representante ----------------------- */

export const meuPainelFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const base44 = context.getBase44().asServiceRole;
    const rep = await representanteDoUsuario(base44, context.user);
    if (!rep) return { vinculado: false };
    const [resumo, sites] = await Promise.all([
      resumoRepresentante(base44, rep),
      listar(base44, "SiteCliente", { representante_id: rep.id }, 200).catch(() => []),
    ]);
    // Só o que o representante precisa ver de cada site (sem dados internos de custo).
    const meusSites = sites.map((s) => {
      const valor = Number(s.valor_final ?? s.valor_sugerido) || 0;
      return {
        id: s.id,
        empresa: s.empresa,
        slug: s.slug,
        status: s.status,
        dominio: s.dominio || "",
        valor,
        comissao: Math.round(valor * TABELA_COMISSAO.site.percentual * 100) / 100,
        mensalidade_contratada: !!s.mensalidade_contratada,
        comissao_mensal: s.mensalidade_contratada ? TABELA_COMISSAO.mensalidade_site.comissao : 0,
        argumento_cliente: s.preco_detalhes?.argumento_cliente || "",
      };
    });
    return { vinculado: true, ...resumo, sites: meusSites };
  });

export const solicitarPagamentoFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const base44 = context.getBase44().asServiceRole;
    const rep = await representanteDoUsuario(base44, context.user);
    if (!rep) {
      setResponseStatus(403);
      throw Object.assign(new Error("Sua conta não está vinculada a um representante comercial."), {
        status: 403,
      });
    }
    return criarSolicitacao(base44, rep, context.user);
  });
/** Quantos clientes o representante ainda pode adicionar ao CRM hoje. */
export const meuLimiteCrmFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const rep = await context.getBase44().representante();
    if (!rep) return { liberado: false };
    const { limiteLeadsHoje } = await import("@/lib/entities.server");
    return { liberado: true, representante: { id: rep.id, nome: rep.nome }, ...(await limiteLeadsHoje(rep.id)) };
  });
