import { Download, Loader2, Trash2, RotateCcw } from "lucide-react";
import { dataHora } from "@/lib/format";
import { formatarTamanho } from "@/components/admin/backup/AcoesBackup";

const STATUS = {
  concluido: { label: "Concluído", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  erro: { label: "Erro", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export default function TabelaBackups({ backups, onBaixar, onRestaurar, onExcluir, ocupado }) {
  if (!backups.length) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center text-[12.5px] text-white/45">
        Nenhum backup gerado ainda. Use "Gerar backup completo" para criar o primeiro.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="w-full min-w-[900px] text-left">
        <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wider text-white/40">
          <tr>
            <th className="px-3 py-2.5">Arquivo</th>
            <th className="px-3 py-2.5">Data e hora</th>
            <th className="px-3 py-2.5">Tamanho</th>
            <th className="px-3 py-2.5">Tipo</th>
            <th className="px-3 py-2.5">Responsável</th>
            <th className="px-3 py-2.5">Situação</th>
            <th className="px-3 py-2.5">Registros</th>
            <th className="px-3 py-2.5 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {backups.map((backup) => {
            const status = STATUS[backup.status] || STATUS.concluido;
            const ativo = ocupado === backup.id;
            return (
              <tr key={backup.id} className="text-[12px] hover:bg-white/[0.02]">
                <td className="max-w-[240px] px-3 py-2.5">
                  <p className="truncate font-mono text-[11px] text-white/75">{backup.nome}</p>
                  {backup.erro && <p className="truncate text-[10px] text-red-300/80">{backup.erro}</p>}
                  {backup.restaurado_em && (
                    <p className="text-[10px] text-white/30">Restaurado em {dataHora(backup.restaurado_em)}</p>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-white/45">{dataHora(backup.criado_em)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-white/60">{formatarTamanho(backup.tamanho)}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full border border-white/12 px-2 py-0.5 text-[10px] font-semibold text-white/60">
                    {backup.tipo === "seguranca" ? "Segurança" : backup.tipo === "enviado" ? "Enviado" : "Completo"}
                  </span>
                </td>
                <td className="max-w-[160px] truncate px-3 py-2.5 text-white/45">
                  {backup.responsavel_nome || backup.responsavel_email || "—"}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
                    {status.label}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-white/45">{backup.total_registros}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onBaixar(backup.id)}
                      disabled={!backup.tem_arquivo || ativo}
                      title="Baixar este backup"
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-[10.5px] font-bold text-primary disabled:opacity-40"
                    >
                      {ativo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      Baixar
                    </button>
                    <button
                      onClick={() => onRestaurar(backup)}
                      disabled={backup.status !== "concluido" || ativo}
                      title="Restaurar este backup"
                      className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-2 py-1 text-[10.5px] font-semibold text-white/55 disabled:opacity-40"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onExcluir(backup)}
                      title="Excluir backup"
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10.5px] font-bold text-red-300 disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}