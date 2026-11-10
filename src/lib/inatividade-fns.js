// Controle de tempo dos clientes inativos — funções do servidor, só para administradores.
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { query } from "@/lib/db.server";
import {
  executarArquivamento,
  executarSeNecessario,
  listarArquivados,
  resumoInatividade,
  restaurarCliente,
  salvarPrazo,
} from "@/lib/inatividade-motor.server";
import { PRAZO_MAX_DIAS, PRAZO_MIN_DIAS } from "@/lib/inatividade";

function requireAdmin(context) {
  if (context.user?.role !== "admin") {
    setResponseStatus(403);
    throw Object.assign(new Error("Apenas administradores podem acessar o controle de clientes inativos."), { status: 403 });
  }
}

function falha(error) {
  if (error?.status) setResponseStatus(error.status);
  throw error;
}

/** Números do painel. Antes de contar, roda o arquivamento automático se já passou 1 hora da última execução. */
export const resumoInatividadeFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    requireAdmin(context);
    try {
      await executarSeNecessario(query).catch((e) => console.error("[inatividade] execução automática falhou", e));
      return await resumoInatividade(query);
    } catch (e) {
      falha(e);
    }
  });

export const salvarPrazoInatividadeFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ dias: z.number().int().min(PRAZO_MIN_DIAS).max(PRAZO_MAX_DIAS) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    try {
      const dias = await salvarPrazo(query, data.dias, context.user.email);
      return { ok: true, dias };
    } catch (e) {
      falha(e);
    }
  });

export const executarArquivamentoFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    requireAdmin(context);
    try {
      return await executarArquivamento(query, { origem: "manual", autorEmail: context.user.email });
    } catch (e) {
      falha(e);
    }
  });

export const listarArquivadosFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ busca: z.string().max(120).optional(), representanteId: z.string().max(64).optional() }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    try {
      return await listarArquivados(query, data);
    } catch (e) {
      falha(e);
    }
  });

export const restaurarClienteFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ leadId: z.string().min(1).max(64) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    try {
      return await restaurarCliente(query, { leadId: data.leadId, autorEmail: context.user.email });
    } catch (e) {
      falha(e);
    }
  });
