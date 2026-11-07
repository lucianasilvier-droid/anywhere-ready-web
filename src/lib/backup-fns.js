import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { assinarArquivo, criarBackup, excluirArquivo, restaurarBackup, VERSAO_BACKUP } from "@/lib/backup.server";

function requireAdmin(context) {
  if (context.user?.role !== "admin") {
    setResponseStatus(403);
    throw Object.assign(new Error("Apenas administradores podem acessar backups."), { status: 403 });
  }
}

export const backupsFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const pagina = await base44.entities.BackupSistema.list({ sort: "-created_date", limit: 100 });
    const backups = (Array.isArray(pagina) ? pagina : pagina?.items || []).map((b) => ({
      id: b.id,
      nome: b.nome,
      tipo: b.tipo,
      status: b.status,
      tamanho: Number(b.tamanho) || 0,
      criado_em: b.created_date,
      responsavel_email: b.responsavel_email || "",
      responsavel_nome: b.responsavel_nome || "",
      registros: b.registros || {},
      total_registros: Object.values(b.registros || {}).reduce((t, n) => t + (Number(n) || 0), 0),
      erro: b.erro || "",
      restaurado_em: b.restaurado_em || "",
      tem_arquivo: !!b.arquivo_uri,
    }));
    return { backups, versao: VERSAO_BACKUP };
  });

export const gerarBackupFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ tipo: z.enum(["completo", "seguranca"]).optional().default("completo") }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const resultado = await criarBackup(base44, { tipo: data.tipo, user: context.user });
    const url = await assinarArquivo(base44, resultado.backup.arquivo_uri, resultado.backup.nome);
    return {
      ok: true,
      id: resultado.backup.id,
      nome: resultado.backup.nome,
      tamanho: resultado.tamanho,
      arquivos: resultado.arquivos,
      url,
    };
  });

export const baixarBackupFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const backup = await base44.entities.BackupSistema.get(data.id).catch(() => null);
    if (!backup) {
      setResponseStatus(404);
      throw Object.assign(new Error("Backup não encontrado."), { status: 404 });
    }
    if (backup.status !== "concluido" || !backup.arquivo_uri) {
      setResponseStatus(400);
      throw Object.assign(new Error("Este backup não possui arquivo disponível para download."), {
        status: 400,
      });
    }
    const url = await assinarArquivo(base44, backup.arquivo_uri, backup.nome);
    await base44.entities.AtividadeLog.create({
      acao: "Download de backup",
      entidade: "BackupSistema",
      registro_id: backup.id,
      detalhe: backup.nome,
      autor_email: context.user.email,
    });
    return { ok: true, url, nome: backup.nome };
  });

export const excluirBackupFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    const backup = await base44.entities.BackupSistema.get(data.id).catch(() => null);
    if (!backup) {
      setResponseStatus(404);
      throw Object.assign(new Error("Backup não encontrado."), { status: 404 });
    }
    await excluirArquivo(backup.arquivo_uri).catch(() => {});
    await base44.entities.BackupSistema.delete(data.id);
    await base44.entities.AtividadeLog.create({
      acao: "Backup excluído",
      entidade: "BackupSistema",
      registro_id: data.id,
      detalhe: backup.nome,
      autor_email: context.user.email,
    });
    return { ok: true };
  });

export const restaurarBackupFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    requireAdmin(context);
    const base44 = context.getBase44().asServiceRole;
    return restaurarBackup(base44, { id: data.id, user: context.user });
  });