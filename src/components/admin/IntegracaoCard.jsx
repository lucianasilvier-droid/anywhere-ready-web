import { useState } from "react";
import { KeyRound, RefreshCw, CheckCircle2, AlertTriangle, Clock, Plug, Save, Loader2 } from "lucide-react";

const ESTADOS = {
  conectado: { icon: CheckCircle2, cls: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300", label: "Conectado" },
  erro: { icon: AlertTriangle, cls: "border-red-500/30 bg-red-500/[0.08] text-red-300", label: "Erro" },
  aguardando_configuracao: { icon: Clock, cls: "border-amber-500/30 bg-amber-500/[0.08] text-amber-300", label: "Aguardando configuração" },
  desativada: { icon: Clock, cls: "border-white/15 bg-white/5 text-white/50", label: "Desativada" },
};

const CAMPO_LABEL = {
  GOOGLE_MAPS_API_KEY: "Chave da API — Google Cloud (Places API)",
  GROQ_API_KEY: "Chave da API — Roq",
  ANTHROPIC_API_KEY: "Chave da API — Anthropic (Claude AI)",
  OPENAI_API_KEY: "Chave da API — OpenAI (ChatGPT)",
  WHATSAPP_ACCESS_TOKEN: "Access token (Meta for Developers)",
  WHATSAPP_PHONE_NUMBER_ID: "Phone number ID",
  WHATSAPP_VERIFY_TOKEN: "Verify token do webhook (você define)",
};

const ORIGEM_LABEL = {
  painel: { texto: "salva no painel", cls: "text-emerald-300/80" },
  ambiente: { texto: "no ambiente seguro", cls: "text-sky-300/80" },
};

export default function IntegracaoCard({ item, info, testando, salvando, onTestar, onSalvar }) {
  const [valores, setValores] = useState({});
  const estado = ESTADOS[item.status] || ESTADOS.aguardando_configuracao;
  const Icon = estado.icon;
  const preenchido = Object.keys(valores).length > 0;

  return (
    <section className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-sm font-bold text-white">{info.titulo}</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/45">{info.texto}</p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Plug className="h-4 w-4" />
        </span>
      </div>

      <div className={`mt-3 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${estado.cls}`}>
        <Icon className="h-3.5 w-3.5" />
        {estado.label}
      </div>

      <p className="mt-2 min-h-[48px] text-[11.5px] leading-relaxed text-white/50">{item.mensagem}</p>

      <div className="mt-1 rounded-xl border border-white/[0.07] bg-black/25 p-3">
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
          <KeyRound className="h-3 w-3" /> Chaves de API
        </p>

        <div className="mt-2 space-y-2">
          {item.campos.map((campo) => {
            const origem = ORIGEM_LABEL[item.origem?.[campo]];
            return (
              <div key={campo}>
                <span className="flex items-center justify-between gap-2 text-[10.5px] font-semibold text-white/55">
                  {CAMPO_LABEL[campo] || campo}
                  <span className="flex items-center gap-1.5">
                    <span className={`text-[9.5px] font-bold uppercase tracking-wider ${origem?.cls || "text-white/25"}`}>
                      {origem?.texto || "não informada"}
                    </span>
                    {item.origem?.[campo] === "painel" && (
                      <button
                        type="button"
                        onClick={() => onSalvar(item.tipo, { [campo]: "" })}
                        className="text-[9.5px] font-bold uppercase tracking-wider text-red-300/70 underline-offset-2 hover:text-red-300 hover:underline"
                      >
                        remover
                      </button>
                    )}
                  </span>
                </span>
                <input
                  type="password"
                  autoComplete="off"
                  value={valores[campo] || ""}
                  onChange={(e) => setValores((v) => ({ ...v, [campo]: e.target.value }))}
                  placeholder={item.origem?.[campo] ? "Cole uma nova chave para substituir" : "Cole a chave aqui"}
                  className="mt-1 h-9 w-full rounded-lg border border-white/12 bg-black/40 px-2.5 font-mono text-[11.5px] text-white placeholder:text-white/25 focus:border-primary/50 focus:outline-none"
                />
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            onSalvar(item.tipo, valores);
            setValores({});
          }}
          disabled={!preenchido || salvando}
          className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11.5px] font-bold text-primary-foreground hover:brightness-105 disabled:opacity-40"
        >
          {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {salvando ? "Salvando..." : "Salvar chaves"}
        </button>
        <p className="mt-1.5 text-[10px] leading-relaxed text-white/25">
          As chaves ficam guardadas no servidor e só administradores têm acesso. Deixe o campo vazio
          para manter a chave atual.
        </p>
      </div>

      <button
        onClick={() => onTestar(item.tipo)}
        disabled={testando}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-[11.5px] font-bold text-white/75 hover:border-primary/40 disabled:opacity-60"
      >
        {testando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Testar conexão
      </button>

      <details className="mt-2 text-[11px] text-white/40">
        <summary className="cursor-pointer font-semibold text-white/55">Onde encontrar a chave</summary>
        <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
          {info.passos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}