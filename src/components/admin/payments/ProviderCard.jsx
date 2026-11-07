import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  KeyRound,
  Loader2,
  Power,
  RefreshCw,
  Save,
  Webhook,
} from "lucide-react";

const ESTADOS = {
  conectado: { icon: CheckCircle2, cls: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300", label: "Conectado" },
  erro: { icon: AlertTriangle, cls: "border-red-500/30 bg-red-500/[0.08] text-red-300", label: "Erro" },
  aguardando_configuracao: { icon: Clock, cls: "border-amber-500/30 bg-amber-500/[0.08] text-amber-300", label: "Aguardando configuração" },
};

const ORIGEM = {
  painel: { texto: "salva no painel", cls: "text-emerald-300/80" },
  ambiente: { texto: "no ambiente seguro", cls: "text-sky-300/80" },
};

export default function ProviderCard({
  provider,
  onSalvar,
  onTestar,
  onToggle,
  salvando,
  testando,
  alternando,
}) {
  const [valores, setValores] = useState({});
  const [ambiente, setAmbiente] = useState(provider.ambiente || "producao");
  const estado = ESTADOS[provider.status] || ESTADOS.aguardando_configuracao;
  const Icone = estado.icon;
  const temNovos = Object.values(valores).some((v) => String(v || "").trim().length > 0);
  const temRemocao = Object.keys(valores).length > 0 && !temNovos;

  return (
    <section className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-sm font-bold text-white">{provider.nome}</p>
          <p className="mt-0.5 text-[11.5px] text-white/45">
            {provider.tipo === "mercadopago"
              ? "PIX e checkout oficial (cartão e outras modalidades)."
              : "Checkout Integrado oficial (PIX e cartão em até 12x)."}
          </p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${estado.cls}`}>
          <Icone className="h-3.5 w-3.5" />
          {estado.label}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
            provider.ativo
              ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300"
              : "border-white/15 bg-white/5 text-white/45"
          }`}
        >
          <Power className="h-3 w-3" /> {provider.ativo ? "Ativa" : "Desativada"}
        </span>
      </div>

      <p className="mt-2 min-h-[34px] text-[11.5px] leading-relaxed text-white/50">
        {provider.mensagem || "Cadastre as credenciais oficiais para habilitar esta integração."}
      </p>

      <div className="mt-2 space-y-2">
        {provider.campos.map((campo) => {
          const origem = ORIGEM[campo.origem];
          return (
            <div key={campo.campo}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-semibold text-white/55">
                  {campo.label}
                  {campo.obrigatorio ? " *" : ""}
                </span>
                <span className={`text-[9.5px] font-bold uppercase tracking-wider ${origem?.cls || "text-white/25"}`}>
                  {origem?.texto || "não informada"}
                </span>
              </div>
              {campo.preenchido && (
                <p className="mt-0.5 flex items-center justify-between gap-2 rounded-lg bg-black/30 px-2 py-1 font-mono text-[10.5px] text-white/45">
                  <span className="truncate">{campo.mascara}</span>
                  <button
                    type="button"
                    onClick={() => onSalvar({ [campo.campo]: "" })}
                    className="shrink-0 text-[9.5px] font-bold uppercase tracking-wider text-red-300/70 hover:text-red-300"
                  >
                    remover
                  </button>
                </p>
              )}
              <input
                type="password"
                autoComplete="off"
                value={valores[campo.campo] || ""}
                onChange={(e) => setValores((v) => ({ ...v, [campo.campo]: e.target.value }))}
                placeholder={campo.preenchido ? "Cole um novo valor para substituir" : "Cole o valor aqui"}
                className="mt-1 h-9 w-full rounded-lg border border-white/12 bg-black/40 px-2.5 font-mono text-[11.5px] text-white placeholder:text-white/25 focus:border-primary/50 focus:outline-none"
              />
            </div>
          );
        })}

        {provider.tipo === "mercadopago" && (
          <label className="block">
            <span className="text-[10.5px] font-semibold text-white/55">Ambiente</span>
            <select
              value={ambiente}
              onChange={(e) => setAmbiente(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-white/12 bg-[#0d1729] px-2.5 text-[11.5px] text-white focus:border-primary/50 focus:outline-none"
            >
              <option value="teste">Testes</option>
              <option value="producao">Produção</option>
            </select>
            <span className="mt-1 block text-[10px] leading-relaxed text-white/25">
              O ambiente real é definido pelas próprias credenciais: chaves de teste começam com
              TEST- e chaves de produção com APP_USR-.
            </span>
          </label>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          onSalvar(valores, ambiente);
          setValores({});
        }}
        disabled={salvando || (!temNovos && !temRemocao && ambiente === (provider.ambiente || "producao"))}
        className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11.5px] font-bold text-primary-foreground disabled:opacity-40"
      >
        {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {salvando ? "Salvando..." : "Salvar configuração"}
      </button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onTestar}
          disabled={testando}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-[11px] font-bold text-white/75 hover:border-primary/40 disabled:opacity-60"
        >
          {testando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Testar
        </button>
        <button
          type="button"
          onClick={() => onToggle(!provider.ativo)}
          disabled={alternando || (!provider.pronto && !provider.ativo)}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-[11px] font-bold text-white/75 hover:border-primary/40 disabled:opacity-40"
        >
          {alternando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
          {provider.ativo ? "Desativar" : "Ativar"}
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/25 p-2.5">
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
          <Webhook className="h-3 w-3" /> URL de notificação
        </p>
        <p className="mt-1 break-all font-mono text-[10px] leading-relaxed text-white/55">
          {provider.webhook_url}
        </p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(provider.webhook_url);
            toast.success("URL copiada.");
          }}
          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary/80 hover:text-primary"
        >
          <Copy className="h-3 w-3" /> Copiar URL
        </button>
        <p className="mt-1.5 text-[10px] leading-relaxed text-white/25">
          {provider.tipo === "mercadopago"
            ? "Cadastre esta URL em Webhooks no painel do Mercado Pago (tópico payment) e cole o Webhook Secret acima."
            : "A URL do webhook é enviada automaticamente na criação de cada link de checkout."}
        </p>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-white/25">
        {provider.ultimo_teste
          ? `Último teste: ${new Date(provider.ultimo_teste).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              dateStyle: "short",
              timeStyle: "short",
            })}`
          : "Nenhum teste executado ainda."}
      </p>
    </section>
  );
}