import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { listar, novoCodigo, representanteDoUsuario } from "@/lib/representantes.server";
import {
  dadosDaPagina,
  erro,
  norm,
  perfilPublico,
  removerFoto,
  representantePorSlug,
  salvarFoto,
  slugDisponivel,
  slugify,
} from "@/lib/landing-representante.server";

function falhar(e) {
  if (e?.status) setResponseStatus(e.status);
  throw e;
}

function requireAdmin(context) {
  if (context.user?.role !== "admin") falhar(erro("Apenas administradores podem executar esta ação.", 403));
}

const SERVICOS = ["perfil_google", "gestao_perfil", "placa_nfc", "criacao_site", "nao_sei"];

/* ------------------------------ Página pública ----------------------------- */

export const paginaRepresentanteFn = createServerFn({ method: "POST" })
  .validator(z.object({ slug: z.string().trim().min(1).max(60) }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44().asServiceRole;
    const rep = await representantePorSlug(base44, data.slug);
    return rep ? { encontrado: true, perfil: perfilPublico(rep) } : { encontrado: false };
  });

export const contatoRepresentanteFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      slug: z.string().trim().min(1).max(60),
      nome: z.string().trim().min(2).max(120),
      empresa: z.string().trim().max(140).optional().default(""),
      email: z.string().trim().email().max(160),
      telefone: z.string().trim().min(8).max(30),
      cidade: z.string().trim().max(100).optional().default(""),
      servico: z.enum(SERVICOS).optional().default("nao_sei"),
      mensagem: z.string().trim().max(1200).optional().default(""),
      website: z.string().max(200).optional().default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    if (data.website) return { ok: true };
    const base44 = context.getBase44().asServiceRole;
    const rep = await representantePorSlug(base44, data.slug);
    if (!rep) falhar(erro("Este representante não está disponível no momento.", 404));
    const empresa = data.empresa || data.nome;
    const agora = new Date().toISOString();

    const lead = await base44.entities.Lead.create({
      empresa,
      cidade: data.cidade,
      telefone: data.telefone,
      email: data.email,
      contato_nome: data.nome,
      categoria: "Página do representante",
      origem: "representante",
      etapa: "novo_lead",
      servico_interesse: data.servico,
      representante_id: rep.id,
      representante_nome: rep.nome,
      representante_codigo: rep.codigo || "",
      responsavel: rep.nome,
      observacoes: `Contato pela página de ${rep.nome} · ${data.nome} · ${data.email}${data.mensagem ? `\n\nMensagem: ${data.mensagem}` : ""}`,
      consentimento: "autorizado",
      consent_autorizado_em: agora,
      consent_origem: "Formulário da página do representante (o visitante enviou os próprios dados solicitando contato)",
      ultimo_contato_em: agora,
    });

    await base44.entities.LeadInteraction.create({
      lead_id: lead.id,
      empresa,
      tipo: "sistema",
      mensagem: `Contato recebido pela página do representante ${rep.nome} (${rep.codigo || rep.id}) para o serviço: ${data.servico}.`,
      autor: data.nome,
    });

    return { ok: true };
  });

/* --------------------------- Recrutamento (inscrição) ----------------------- */

export const inscricaoRepresentanteFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      nome: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(160),
      telefone: z.string().trim().min(8).max(30),
      cidade: z.string().trim().min(2).max(100),
      experiencia: z.enum(["nenhuma", "vendas", "marketing", "autonomo"]).optional().default("nenhuma"),
      mensagem: z.string().trim().max(1200).optional().default(""),
      website: z.string().max(200).optional().default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    if (data.website) return { ok: true };
    const base44 = context.getBase44().asServiceRole;
    const email = norm(data.email);

    const jaRep = await listar(base44, "Representante", { user_email: email }, 1);
    if (jaRep[0]) {
      falhar(erro("Este e-mail já pertence a um representante. Entre pelo painel do representante.", 409));
    }
    const pendentes = await listar(base44, "CandidatoRepresentante", { email, status: "pendente" }, 1);
    if (pendentes[0]) return { ok: true, repetida: true };

    const candidato = await base44.entities.CandidatoRepresentante.create({
      nome: data.nome,
      email,
      telefone: data.telefone,
      cidade: data.cidade,
      experiencia: data.experiencia,
      mensagem: data.mensagem,
      status: "pendente",
    });

    await base44.entities.AtividadeLog.create({
      acao: "Nova inscrição de representante",
      entidade: "CandidatoRepresentante",
      registro_id: candidato.id,
      detalhe: `${data.nome} · ${email} · ${data.cidade}`,
      autor_email: email,
    });

    return { ok: true, repetida: false };
  });

/* ------------------------- Painel do representante ------------------------- */

export const minhaPaginaFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const base44 = context.getBase44().asServiceRole;
    const rep = await representanteDoUsuario(base44, context.user);
    if (!rep) return { vinculado: false };
    const [leads, pedidos] = await Promise.all([
      listar(base44, "Lead", { representante_id: rep.id }, 100),
      listar(base44, "Pedido", { representante_id: rep.id }, 100),
    ]);
    return {
      vinculado: true,
      pagina: dadosDaPagina(rep),
      contatos: leads.map((l) => ({
        id: l.id,
        nome: l.contato_nome || "",
        empresa: l.empresa,
        telefone: l.telefone,
        cidade: l.cidade,
        servico: l.servico_interesse,
        etapa: l.etapa,
        criado_em: l.created_date,
      })),
      pedidos: pedidos.map((p) => ({
        id: p.id,
        numero: p.numero,
        cliente_nome: p.cliente_nome,
        total: p.total,
        status_pagamento: p.status_pagamento,
        criado_em: p.created_date,
      })),
    };
  });

export const salvarMinhaPaginaFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      pagina_slug: z.string().trim().min(3).max(40),
      pagina_titulo: z.string().trim().max(80).optional().default(""),
      pagina_bio: z.string().trim().max(1200).optional().default(""),
      pagina_cidade: z.string().trim().max(100).optional().default(""),
      pagina_instagram: z.string().trim().max(60).optional().default(""),
      pagina_whatsapp: z.string().trim().max(30).optional().default(""),
      pagina_ativa: z.boolean().optional().default(true),
      foto: z.string().max(2_100_000).optional(),
      remover_foto: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44().asServiceRole;
    const rep = await representanteDoUsuario(base44, context.user);
    if (!rep) falhar(erro("Sua conta não está vinculada a um representante comercial.", 403));
    if (rep.status === "bloqueado") falhar(erro("Conta bloqueada. Fale com o administrador.", 403));

    const whatsapp = data.pagina_whatsapp.replace(/\D/g, "");
    if (whatsapp && whatsapp.length < 10) falhar(erro("Informe o WhatsApp com DDD."));

    try {
      const patch = {
        pagina_slug: await slugDisponivel(base44, data.pagina_slug, rep.id),
        pagina_titulo: data.pagina_titulo,
        pagina_bio: data.pagina_bio,
        pagina_cidade: data.pagina_cidade,
        pagina_instagram: data.pagina_instagram.replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, ""),
        pagina_whatsapp: data.pagina_whatsapp,
        pagina_ativa: data.pagina_ativa,
      };
      if (data.foto) {
        patch.pagina_foto = await salvarFoto(rep.id, data.foto);
        await removerFoto(rep.pagina_foto);
      } else if (data.remover_foto) {
        patch.pagina_foto = "";
        await removerFoto(rep.pagina_foto);
      }
      const atualizado = await base44.entities.Representante.update(rep.id, patch);
      await base44.entities.AtividadeLog.create({
        acao: "Página do representante atualizada",
        entidade: "Representante",
        registro_id: rep.id,
        detalhe: `${rep.nome} · /r/${patch.pagina_slug}`,
        autor_email: norm(context.user.email),
      });
      return { ok: true, pagina: dadosDaPagina(atualizado) };
    } catch (e) {
      return falhar(e);
    }
  });

/* ------------------------------- Painel admin ------------------------------ */

export const adminCandidatosFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const [candidatos, representantes] = await Promise.all([
      listar(base44, "CandidatoRepresentante", {}, 300),
      listar(base44, "Representante", {}, 300),
    ]);
    const porId = new Map(representantes.map((rep) => [rep.id, rep]));
    return {
      candidatos: candidatos.map((candidato) => {
        const rep = candidato.representante_id ? porId.get(candidato.representante_id) : null;
        return {
          ...candidato,
          representante_slug: rep?.pagina_slug || rep?.codigo || "",
        };
      }),
    };
  });

async function slugLivre(base44, nome) {
  const base = slugify(nome) || "representante";
  for (let i = 0; i < 20; i += 1) {
    const tentativa = i === 0 ? base : `${base}-${i + 1}`;
    const usados = await listar(base44, "Representante", { pagina_slug: tentativa }, 1);
    if (!usados.length) return tentativa;
  }
  return `${base}-${novoCodigo("", 4).toLowerCase()}`;
}

export const decidirCandidatoFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      id: z.string().min(1),
      acao: z.enum(["aprovar", "rejeitar"]),
      observacoes: z.string().trim().max(600).optional().default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const candidato = await base44.entities.CandidatoRepresentante.get(data.id).catch(() => null);
    if (!candidato) falhar(erro("Inscrição não encontrada.", 404));
    if (candidato.status !== "pendente") falhar(erro("Esta inscrição já foi analisada.", 409));
    const agora = new Date().toISOString();
    const admin = norm(context.user.email);

    if (data.acao === "rejeitar") {
      await base44.entities.CandidatoRepresentante.update(candidato.id, {
        status: "rejeitado",
        decidido_em: agora,
        decidido_por: admin,
        observacoes: data.observacoes,
      });
      return { ok: true };
    }

    const email = norm(candidato.email);
    const existente = await listar(base44, "Representante", { user_email: email }, 1);
    if (existente[0]) falhar(erro(`O login ${email} já está vinculado ao representante ${existente[0].nome}.`, 409));

    const rep = await base44.entities.Representante.create({
      nome: candidato.nome,
      email,
      user_email: email,
      telefone: candidato.telefone || "",
      status: "ativo",
      comissao_perfil: 100,
      comissao_mensalidade: 50,
      comissao_placa: 20,
      observacoes: data.observacoes || `Aprovado a partir da inscrição pelo site (${candidato.cidade || ""}).`,
      codigo: novoCodigo("REP-", 6),
      criado_por: admin,
      pagina_slug: await slugLivre(base44, candidato.nome),
      pagina_cidade: candidato.cidade || "",
      pagina_whatsapp: candidato.telefone || "",
      pagina_ativa: true,
    });

    await base44.entities.CandidatoRepresentante.update(candidato.id, {
      status: "aprovado",
      decidido_em: agora,
      decidido_por: admin,
      representante_id: rep.id,
      observacoes: data.observacoes,
    });

    await base44.entities.AtividadeLog.create({
      acao: "Inscrição de representante aprovada",
      entidade: "Representante",
      registro_id: rep.id,
      detalhe: `${rep.nome} · ${email}`,
      autor_email: admin,
    });

    let convite = "";
    try {
      const envio = await base44.users.inviteUser(email, "user");
      convite = envio?.delivered
        ? "Representante aprovado. O convite para criar a senha foi enviado por e-mail."
        : "Representante aprovado, mas o e-mail NÃO foi enviado: o SMTP da Vercel não está configurado. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM para que o convite chegue à caixa de entrada.";
    } catch (e) {
      console.error("[representantes] Falha ao enviar convite:", e);
      convite = `Representante aprovado, mas o convite NÃO foi enviado: ${e?.message || "falha no serviço de e-mail"}. Verifique a configuração SMTP da Vercel e reenvie o convite.`;
    }
    return { ok: true, representante: rep, convite };
  });

export const adminPaginaRepresentanteFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string().min(1), ativa: z.boolean() }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const rep = await base44.entities.Representante.get(data.id).catch(() => null);
    if (!rep) falhar(erro("Representante não encontrado.", 404));
    const patch = { pagina_ativa: data.ativa };
    if (!rep.pagina_slug) patch.pagina_slug = await slugLivre(base44, rep.nome);
    const atualizado = await base44.entities.Representante.update(rep.id, patch);
    await base44.entities.AtividadeLog.create({
      acao: data.ativa ? "Página do representante publicada" : "Página do representante suspensa",
      entidade: "Representante",
      registro_id: rep.id,
      detalhe: rep.nome,
      autor_email: norm(context.user.email),
    });
    return { ok: true, slug: atualizado.pagina_slug };
  });
