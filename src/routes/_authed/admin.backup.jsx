import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  backupsFn,
  baixarBackupFn,
  excluirBackupFn,
  gerarBackupFn,
  restaurarBackupFn,
} from "@/lib/backup-fns";
import AcoesBackup, { formatarTamanho } from "@/components/admin/backup/AcoesBackup";
import TabelaBackups from "@/components/admin/backup/TabelaBackups";
import Modal from "@/components/admin/Modal";

export const Route = createFileRoute("/_authed/admin/backup")({
  head: () => ({ meta: [{ title: "Backup e download do sistema — Painel" }] }),
  component: BackupPage,
});

function iniciarDownload(url, nome) {
  const link = document.createElement("a");
  link.href = url;
  link.download = nome || "backup.zip";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function BackupPage() {
  const listar = useServerFn(backupsFn);
  const gerar = useServerFn(gerarBackupFn);
  const baixar = useServerFn(baixarBackupFn);
  const excluir = useServerFn(excluirBackupFn);
  const restaurar = useServerFn(restaurarBackupFn);

  const [backups, setBackups] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ocupado, setOcupado] = useState("");
  const [excluindo, setExcluindo] = useState(null);
  const [restaurando, setRestaurando] = useState(null);
  const [restaurandoEm, setRestaurandoEm] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const dados = await listar();
      setBackups(dados.backups || []);
    } catch (e) {
      toast.error(e?.message || "Não foi possível carregar os backups.");
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleGerar({ baixarAgora = false } = {}) {
    baixarAgora ? setBaixando(true) : setGerando(true);
    try {
      const resultado = await gerar({ data: { tipo: "completo" } });
      toast.success(
        `Backup ${resultado.nome} gerado (${formatarTamanho(resultado.tamanho)}, ${resultado.arquivos} arquivos).`,
      );
      if (baixarAgora) iniciarDownload(resultado.url, resultado.nome);
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível gerar o backup.");
    } finally {
      setGerando(false);
      setBaixando(false);
    }
  }

  async function handleEnviar(arquivo) {
    setEnviando(true);
    try {
      const form = new FormData();
      form.append("arquivo", arquivo);
      const resposta = await fetch("/api/backups/upload", { method: "POST", body: form });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(json?.error || "Não foi possível enviar o ZIP.");
      const total = Object.values(json.registros || {}).reduce((t, n) => t + (Number(n) || 0), 0);
      toast.success(`ZIP validado: ${total} registro(s). Confirme a restauração para aplicar.`);
      await carregar();
      setRestaurando({ id: json.id, nome: json.nome });
    } catch (e) {
      toast.error(e?.message || "Não foi possível enviar o ZIP.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleBaixar(id) {
    setOcupado(id);
    try {
      const resultado = await baixar({ data: { id } });
      iniciarDownload(resultado.url, resultado.nome);
      toast.success("Download iniciado.");
    } catch (e) {
      toast.error(e?.message || "Não foi possível baixar o backup.");
    } finally {
      setOcupado("");
    }
  }

  async function handleExcluir() {
    if (!excluindo) return;
    setOcupado(excluindo.id);
    try {
      await excluir({ data: { id: excluindo.id } });
      toast.success("Backup excluído do histórico.");
      setExcluindo(null);
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível excluir o backup.");
    } finally {
      setOcupado("");
    }
  }

  async function handleRestaurar() {
    if (!restaurando) return;
    setRestaurandoEm(true);
    try {
      const resultado = await restaurar({ data: { id: restaurando.id } });
      toast.success(
        `Restauração concluída: ${resultado.total} registro(s). Backup de segurança: ${resultado.seguranca || "—"}.`,
      );
      setRestaurando(null);
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível restaurar o backup.");
    } finally {
      setRestaurandoEm(false);
    }
  }

  const ultimo = backups.find((b) => b.status === "concluido");

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Segurança</p>
        <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">
          Backup e download do sistema
        </h1>
      </header>

      <AcoesBackup
        onGerar={() => handleGerar()}
        onBaixar={() => handleGerar({ baixarAgora: true })}
        onRestaurar={() => ultimo && setRestaurando(ultimo)}
        onEnviar={handleEnviar}
        enviando={enviando}
        gerando={gerando}
        baixando={baixando}
        restaurado={restaurandoEm}
        temBackup={!!ultimo}
      />

      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-amber-200/85">
        <p className="flex items-center gap-1.5 font-semibold text-amber-200">
          <ShieldCheck className="h-3.5 w-3.5" /> Acesso restrito a administradores
        </p>
        <p className="mt-1">
          Os arquivos ficam em armazenamento privado e só são liberados por links temporários gerados
          neste painel. Nenhuma chave de API, senha ou token é incluída no ZIP.
        </p>
      </div>

      <section>
        <h2 className="mb-2 font-heading text-sm font-bold text-white">Histórico de backups</h2>
        {carregando ? (
          <div className="flex items-center gap-2 py-10 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando backups...
          </div>
        ) : (
          <TabelaBackups
            backups={backups}
            onBaixar={handleBaixar}
            onRestaurar={setRestaurando}
            onExcluir={setExcluindo}
            ocupado={ocupado}
          />
        )}
      </section>

      <Modal open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)} title="Excluir backup">
        <p className="text-[12.5px] leading-relaxed text-white/60">
          Confirme a exclusão de <strong className="text-white">{excluindo?.nome}</strong>. O registro
          sai do histórico e não poderá ser baixado novamente.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setExcluindo(null)}
            className="rounded-lg border border-white/12 px-3 py-2 text-[12px] font-semibold text-white/60"
          >
            Cancelar
          </button>
          <button
            onClick={handleExcluir}
            disabled={!!ocupado}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-60"
          >
            {!!ocupado && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Excluir backup
          </button>
        </div>
      </Modal>

      <Modal open={!!restaurando} onOpenChange={(o) => !o && setRestaurando(null)} title="Restaurar backup">
        <div className="space-y-3">
          <p className="text-[12.5px] leading-relaxed text-white/60">
            Será restaurado o backup{" "}
            <strong className="text-white">{restaurando?.nome}</strong>. Antes da restauração o sistema
            gera automaticamente um backup de segurança da versão atual.
          </p>
          <ul className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11.5px] text-white/50">
            <li>• A estrutura do backup é validada antes de qualquer escrita.</li>
            <li>• Os registros existentes são atualizados; os ausentes, recriados.</li>
            <li>• Contas de usuário não são recriadas por segurança.</li>
            <li>• A operação fica registrada no log administrativo.</li>
          </ul>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRestaurando(null)}
              className="rounded-lg border border-white/12 px-3 py-2 text-[12px] font-semibold text-white/60"
            >
              Cancelar
            </button>
            <button
              onClick={handleRestaurar}
              disabled={restaurandoEm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60"
            >
              {restaurandoEm && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirmar restauração
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}