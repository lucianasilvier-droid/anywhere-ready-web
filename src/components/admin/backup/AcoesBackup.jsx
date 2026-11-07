import { Archive, Download, Loader2, Plus, Upload } from "lucide-react";

export function formatarTamanho(bytes) {
  const valor = Number(bytes) || 0;
  if (valor < 1024) return `${valor} B`;
  if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;
  return `${(valor / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AcoesBackup({ onGerar, onBaixar, onRestaurar, onEnviar, gerando, baixando, restaurado, enviando, temBackup }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/80">
        Backup e download do sistema
      </p>
      <h2 className="mt-1 font-heading text-lg font-extrabold text-white">
        Cópia completa do sistema e do banco de dados
      </h2>
      <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-white/45">
        O ZIP inclui o código do projeto (rotas, páginas, componentes, servidor e configurações), o
        dump de todas as entidades, as configurações em vigor, o robots.txt e o sitemap.xml. Chaves
        de API, senhas e tokens nunca entram no arquivo — apenas a lista do que precisa ser
        recadastrado.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={onGerar}
          disabled={gerando}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-[#0a1128] disabled:opacity-60"
        >
          {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Gerar backup completo
        </button>
        <button
          onClick={onBaixar}
          disabled={baixando || gerando}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-primary disabled:opacity-40"
        >
          {baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Baixar sistema em ZIP
        </button>
        <button
          onClick={onRestaurar}
          disabled={restaurado || !temBackup}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-white/60 disabled:opacity-40"
        >
          {restaurado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
          Restaurar backup
        </button>
        <label
          className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/12 px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-white/60 ${enviando ? "opacity-40" : ""}`}
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Enviar ZIP
          <input
            type="file"
            accept=".zip,application/zip"
            hidden
            disabled={enviando || gerando}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = "";
              if (arquivo) onEnviar?.(arquivo);
            }}
          />
        </label>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-white/30">
        "Baixar sistema em ZIP" gera um novo backup e inicia o download imediatamente. "Enviar ZIP" aceita um backup gerado por este sistema (até 5 MB) e abre a confirmação de restauração. A restauração
        recria os dados do backup escolhido e gera antes um backup de segurança automático.
      </p>
    </div>
  );
}