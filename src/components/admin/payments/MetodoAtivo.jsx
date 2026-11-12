import { Check, Loader2, Power, ShieldAlert } from "lucide-react";

export default function MetodoAtivo({ metodos, selecionado, onSalvar, salvando }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/80">
            Sistema de pagamento ativo
          </p>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/45">
            O checkout da loja usa apenas a opção escolhida aqui. Uma integração sem credenciais
            válidas ou desativada não pode ser selecionada — nada é trocado automaticamente em
            caso de falha.
          </p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Power className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        {metodos.map((metodo) => {
          const ativo = selecionado === metodo.id;
          return (
            <button
              key={metodo.id}
              type="button"
              disabled={!metodo.habilitado || salvando}
              onClick={() => onSalvar(metodo.id)}
              className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                ativo
                  ? "border-primary/50 bg-primary/[0.08]"
                  : metodo.habilitado
                    ? "border-white/10 bg-black/25 hover:border-white/25"
                    : "border-white/[0.06] bg-black/20 opacity-55"
              } ${salvando ? "cursor-wait" : ""}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-heading text-[12.5px] font-bold text-white">{metodo.nome}</span>
                {ativo ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-primary-foreground">
                    <Check className="h-2.5 w-2.5" /> Ativo
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-white/45">
                {metodo.descricao}
              </span>
              <span
                className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${
                  metodo.habilitado
                    ? "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/[0.08] text-amber-300"
                }`}
              >
                {metodo.habilitado
                  ? "Operacional"
                  : metodo.configurado
                    ? "Integração desativada"
                    : "Falta configurar"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-black/25 px-3.5 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] text-white/45">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-300/80" />
          Pagamentos já iniciados continuam no provedor original e não são alterados.
        </p>
        <button
          type="button"
          onClick={() => onSalvar("desativado")}
          disabled={salvando || selecionado === "desativado"}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-bold text-white/65 hover:border-primary/40 disabled:opacity-40"
        >
          {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Desativar pagamento online
        </button>
      </div>
    </section>
  );
}