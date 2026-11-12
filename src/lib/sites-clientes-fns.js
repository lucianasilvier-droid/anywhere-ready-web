import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import {
  erro,
  promptParaClaudeGratuito,
  gerarConteudoSiteAutomatico,
  validarConteudoSite,
  sitePorLead,
  sitePublico,
  slugUnico,
} from "@/lib/sites-clientes.server";
import { criarVenda, listar } from "@/lib/representantes.server";
import { avaliarPrecoSite } from "@/lib/preco-site.server";
import { PRECO_SITE } from "@/lib/preco-site";

function falhar(e) {
  if (e?.status) setResponseStatus(e.status);
  throw e;
}

async function limiteSitesHoje(repId) {
  const mod = await import("@/lib/entities.server");
  return mod.limiteSitesHoje(repId);
}

function requireAdmin(context) {
  if (context.user?.role !== "admin") falhar(erro("Apenas administradores podem executar esta ação.", 403));
}

/**
 * Quem pode ver e criar o site de um lead: o administrador (qualquer lead) ou o
 * representante ativo dono do lead. Para o representante, o lead é lido com as regras
 * de acesso dele, então clientes de outros representantes não abrem.
 */
async function acessoAoSite(context, leadId) {
  if (context.user?.role === "admin") return { rep: null };
  const rep = await context.getBase44().representante();
  if (!rep) falhar(erro("Seu acesso ao CRM não está liberado. Fale com o administrador.", 403));
  const lead = await context.getBase44().entities.Lead.get(leadId).catch(() => null);
  if (!lead || lead.representante_id !== rep.id) falhar(erro("Cliente não encontrado no seu CRM.", 404));
  return { rep, lead };
}

/** O que o representante vê do site: sem preços, custos internos nem comissões. */
function siteParaRepresentante(site) {
  if (!site) return null;
  return {
    id: site.id,
    slug: site.slug,
    status: site.status,
    empresa: site.empresa,
    conteudo: { titulo: site.conteudo?.titulo || "", subtitulo: site.conteudo?.subtitulo || "" },
    gerado_em: site.gerado_em || site.created_date || "",
  };
}

/* ------------------------------- Painel (CRM) ------------------------------ */

export const siteDoLeadFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ leadId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const { rep } = await acessoAoSite(context, data.leadId);
    if (!rep) return { site: await sitePorLead(context.getBase44(), data.leadId) };
    const site = await sitePorLead(context.getBase44().asServiceRole, data.leadId);
    return { site: siteParaRepresentante(site), limite: await limiteSitesHoje(rep.id) };
  });

export const prepararSiteGratuitoFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({
    leadId: z.string().min(1),
    orientacoes: z.string().trim().max(600).optional().default(""),
  }))
  .handler(async ({ data, context }) => {
    const { rep, lead: leadDoRep } = await acessoAoSite(context, data.leadId);
    const base44 = rep ? context.getBase44().asServiceRole : context.getBase44();
    const lead = leadDoRep || await base44.entities.Lead.get(data.leadId);
    if (rep) {
      if (await sitePorLead(base44, lead.id)) throw erro("Este cliente já tem um site. Para ajustar, fale com o administrador.", 409);
      const limite = await limiteSitesHoje(rep.id);
      if (limite.restantes <= 0) throw erro(`Você já criou ${limite.limite} sites hoje. Amanhã poderá criar mais.`, 429);
    }
    return { prompt: promptParaClaudeGratuito(lead, data.orientacoes) };
  });

export const gerarSiteFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      leadId: z.string().min(1),
      orientacoes: z.string().trim().max(600).optional().default(""),
      extras: z
        .object({
          logo: z.boolean().optional(),
          fotos: z.boolean().optional(),
          formulario: z.boolean().optional(),
          blog: z.boolean().optional(),
          pagina_extra: z.number().int().min(0).max(10).optional(),
        })
        .optional()
        .default({}),
    }),
  )
  .handler(async ({ data, context }) => {
    const { rep } = await acessoAoSite(context, data.leadId);
    // O representante cria pelo serviço (as regras de acesso dele não cobrem sites).
    const base44 = rep ? context.getBase44().asServiceRole : context.getBase44();
    try {
      const lead = await base44.entities.Lead.get(data.leadId);
      if (rep) {
        if (await sitePorLead(base44, lead.id)) {
          throw erro("Este cliente já tem um site. Para recriar ou ajustar, fale com o administrador.", 409);
        }
        const limite = await limiteSitesHoje(rep.id);
        if (limite.restantes <= 0) {
          throw erro(
            `Você já criou ${limite.limite} sites hoje, que é o limite diário. Amanhã você pode criar mais.`,
            429,
          );
        }
      }
      const conteudo = validarConteudoSite(gerarConteudoSiteAutomatico(lead, data.orientacoes));
      const preco = await avaliarPrecoSite(lead, conteudo, data.extras);
      const existente = await sitePorLead(base44, lead.id);
      const agora = new Date().toISOString();

      const dados = {
        lead_id: lead.id,
        empresa: lead.empresa,
        categoria: lead.categoria || "",
        endereco: lead.endereco || "",
        cidade: lead.cidade || "",
        bairro: lead.bairro || "",
        estado: lead.estado || "",
        place_id: lead.place_id || "",
        nota_google: lead.nota_google ?? null,
        total_avaliacoes: lead.total_avaliacoes ?? null,
        telefone: lead.telefone || "",
        whatsapp: existente?.whatsapp || lead.telefone || "",
        conteudo,
        orientacoes: data.orientacoes || "",
        modelo: "gerador-automatico-sem-api",
        gerado_em: agora,
        gerado_por: context.user?.email || "",
        valor_calculado: preco.valor_calculado,
        valor_sugerido: preco.valor_sugerido,
        // O administrador pode editar o valor final; regerar o site não o sobrescreve.
        valor_final: existente?.valor_final ?? preco.valor_sugerido,
        preco_detalhes: preco,
        // Representante do site: o que o admin escolheu, ou quem trouxe o lead.
        representante_id: existente?.representante_id ?? lead.representante_id ?? "",
        representante_nome: existente?.representante_nome ?? lead.representante_nome ?? "",
        comissao_representante: existente?.valor_final
          ? Math.round(existente.valor_final * PRECO_SITE.comissaoRepresentante * 100) / 100
          : preco.comissao_representante,
      };

      let site;
      if (existente) {
        site = await base44.entities.SiteCliente.update(existente.id, dados);
      } else {
        const slug = await slugUnico(base44, `${lead.empresa} ${lead.bairro || lead.cidade || ""}`.trim());
        site = await base44.entities.SiteCliente.create({
          ...dados,
          slug,
          status: "demonstracao",
          ...(rep
            ? {
                representante_id: rep.id,
                representante_nome: rep.nome || "",
                criado_por_representante_id: rep.id,
              }
            : {}),
        });
      }

      await base44.entities.Lead.update(lead.id, {
        site_demo_id: site.id,
        site_demo_slug: site.slug,
        site_demo_gerado_em: agora,
      });
      await base44.entities.LeadInteraction.create({
        lead_id: lead.id,
        empresa: lead.empresa,
        tipo: "ia",
        mensagem: existente
          ? "Site de demonstração atualizado pelo gerador automático sem API paga."
          : "Site de demonstração criado automaticamente a partir dos dados do CRM.",
        autor: "Gerador automático",
        detalhe: `Endereço: /site/${site.slug}${rep ? ` · criado pelo representante ${rep.nome || ""}` : ""}`,
      });

      if (rep) return { ok: true, site: siteParaRepresentante(site), limite: await limiteSitesHoje(rep.id) };
      return { ok: true, site };
    } catch (e) {
      falhar(e);
    }
  });

export const atualizarSiteFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      id: z.string().min(1),
      status: z.enum(["demonstracao", "publicado", "desativado"]).optional(),
      whatsapp: z.string().trim().max(30).optional(),
      instagram: z.string().trim().max(80).optional(),
      horario: z.string().trim().max(200).optional(),
      slug: z.string().trim().max(60).optional(),
      valor_final: z.number().min(PRECO_SITE.minimo).max(PRECO_SITE.maximo).optional(),
      mensalidade_contratada: z.boolean().optional(),
      // Domínio próprio e hospedagem de cada site (custos repassados, fora da comissão).
      dominio: z.string().trim().max(120).optional(),
      dominio_valor_anual: z.number().min(0).max(10000).optional(),
      hospedagem_valor_mensal: z.number().min(0).max(5000).optional(),
      hospedagem_inclusa: z.boolean().optional(),
      representante_id: z.string().trim().max(80).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44();
    try {
      const { id, ...patch } = data;
      const atual = await base44.entities.SiteCliente.get(id);
      if (patch.slug !== undefined) {
        // Acentos e espaços são normalizados; se já estiver em uso, ganha um sufixo.
        patch.slug = await slugUnico(base44, patch.slug || atual.empresa, id);
        if (patch.slug === atual.slug) delete patch.slug;
      }
      if (patch.instagram !== undefined) patch.instagram = patch.instagram.replace(/^@/, "");
      if (patch.dominio !== undefined) {
        patch.dominio = patch.dominio.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
        if (patch.dominio && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(patch.dominio)) {
          falhar(erro("Domínio inválido. Use o formato empresa.com.br."));
        }
      }
      if (patch.representante_id !== undefined) {
        if (patch.representante_id) {
          const rep = await base44.entities.Representante.get(patch.representante_id).catch(() => null);
          if (!rep) falhar(erro("Representante não encontrado.", 404));
          patch.representante_nome = rep.nome;
        } else {
          patch.representante_nome = "";
        }
      }
      if (patch.valor_final !== undefined) {
        patch.comissao_representante = Math.round(patch.valor_final * PRECO_SITE.comissaoRepresentante * 100) / 100;
      }
      const site = await base44.entities.SiteCliente.update(id, patch);
      if (patch.slug && atual.lead_id) {
        await base44.entities.Lead.update(atual.lead_id, { site_demo_slug: site.slug }).catch(() => {});
      }
      return { ok: true, site };
    } catch (e) {
      falhar(e);
    }
  });

/** Lista curta de representantes ativos, para escolher o responsável pelo site. */
export const representantesParaSiteFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    requireAdmin(context);
    const reps = await listar(context.getBase44().asServiceRole, "Representante", { status: "ativo" }, 300);
    return { representantes: reps.map((r) => ({ id: r.id, nome: r.nome, codigo: r.codigo || "" })) };
  });

/**
 * Lança a venda do site (50% do valor final) ou a mensalidade de um mês (R$ 50) para o
 * representante do site. A comissão fica aguardando a confirmação do pagamento do cliente.
 */
export const registrarVendaSiteFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      id: z.string().min(1),
      tipo: z.enum(["site", "mensalidade_site"]),
      competencia: z.string().trim().max(7).optional().default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    try {
      const site = await base44.entities.SiteCliente.get(data.id).catch(() => null);
      if (!site) throw erro("Site não encontrado.", 404);
      if (!site.representante_id) throw erro("Escolha o representante deste site antes de lançar a venda.");
      if (data.tipo === "mensalidade_site" && !site.mensalidade_contratada) {
        throw erro("Marque que o cliente contratou a administração do site antes de lançar a mensalidade.");
      }
      const resultado = await criarVenda(
        base44,
        {
          representante_id: site.representante_id,
          tipo: data.tipo,
          site_id: site.id,
          cliente_nome: site.empresa,
          valor_venda: Number(site.valor_final ?? site.valor_sugerido) || 0,
          competencia: data.competencia,
          origem: "site_cliente",
          observacoes: data.tipo === "site" ? `Site /site/${site.slug}` : `Mensalidade do site /site/${site.slug}`,
          data_venda: new Date().toISOString(),
        },
        context.user.email,
      );
      if (data.tipo === "site" && !resultado.duplicada) {
        await base44.entities.SiteCliente.update(site.id, { venda_id: resultado.venda.id }).catch(() => {});
      }
      return resultado;
    } catch (e) {
      falhar(e);
    }
  });

/* ------------------------------ Página pública ----------------------------- */

export const sitePublicoFn = createServerFn({ method: "POST" })
  .validator(z.object({ slug: z.string().trim().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44().asServiceRole;
    const [site] = await listar(base44, "SiteCliente", { slug: data.slug.toLowerCase() }, 1);
    if (!site || site.status === "desativado") return { encontrado: false };
    return { encontrado: true, site: sitePublico(site) };
  });
