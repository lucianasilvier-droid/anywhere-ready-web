import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  QrCode,
} from "lucide-react";
import { getPaymentFn } from "@/lib/payments-fns";
import { brl } from "@/lib/format";

const STATUS = {
  pendente: { label: "Aguardando pagamento", icon: Clock, cls: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  aprovado: { label: "Pagamento aprovado", icon: CheckCircle2, cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  recusado: { label: "Pagamento recusado", icon: AlertTriangle, cls: "border-red-500/30 bg-red-500/10 text-red-300" },
  expirado: { label: "Pagamento expirado", icon: Clock, cls: "border-white/20 bg-white/5 text-white/60" },
  cancelado: { label: "Pagamento cancelado", icon: AlertTriangle, cls: "border-white/20 bg-white/5 text-white/60" },
  reembolso_solicitado: { label: "Reembolso solicitado", icon: Clock, cls: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
  reembolsado: { label: "Reembolsado", icon: CheckCircle2, cls: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
};

function dataHoraBR(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function PaymentPanel({ codigo, inicial = null, onAtualizar }) {
  const consultar = useServerFn(getPaymentFn);
  const [pagamento, setPagamento] = useState(inicial);
  const [carregando, setCarregando] = useState(!inicial);
  const statusRef = useRef(inicial?.status || "pendente");

  useEffect(() => {
    let cancelado = false;

    async function buscar(verificar) {
      try {
        const resposta = await consultar({ data: { codigo, verificar } });
        if (cancelado || !resposta?.ok) return;
        statusRef.current = resposta.pagamento.status;
        setPagamento(resposta.pagamento);
        onAtualizar?.(resposta.pagamento);
      } catch {
        /* tentaremos novamente no próximo ciclo */
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    buscar(true);
    const timer = setInterval(() => {
      if (!cancelado && statusRef.current === "pendente") buscar(false);
    }, 6000);

    return () => {
      cancelado = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  if (carregando && !pagamento) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-10 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando pagamento...
      </div>
    );
  }

  if (!pagamento) {
    return (
      <p className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-6 text-sm text-white/55">
        Não encontramos este pagamento. Confira o link ou fale com a nossa equipe.
      </p>
    );
  }

  const estado = STATUS[pagamento.status] || STATUS.pendente;
  const Icone = estado.icon;
  const pendente = pagamento.status === "pendente";

  function copiar() {
    if (!pagamento.qr_code) return;
    navigator.clipboard?.writeText(pagamento.qr_code);
    toast.success("Código PIX copiado.");
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Pagamento</p>
          <p className="mt-1 font-heading text-lg font-extrabold text-white">
            Pedido {pagamento.pedido_numero || "—"}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold ${estado.cls}`}>
          <Icone className="h-3.5 w-3.5" />
          {estado.label}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-y border-white/[0.07] py-2.5 text-[13px]">
        <span className="text-white/50">Valor</span>
        <span className="font-heading text-base font-extrabold text-primary">{brl(pagamento.valor)}</span>
      </div>

      {pagamento.erro && (
        <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-200">
          {pagamento.erro}
        </p>
      )}

      {pendente && pagamento.qr_code && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
            <QrCode className="h-3.5 w-3.5 text-primary" /> Pague com PIX
          </p>
          {pagamento.qr_code_base64 && (
            <img
              src={`data:image/png;base64,${pagamento.qr_code_base64}`}
              alt="QR Code PIX do pedido"
              className="mx-auto mt-3 h-56 w-56 rounded-xl bg-white p-2"
            />
          )}
          <p className="mt-3 text-[11.5px] leading-relaxed text-white/45">
            Escaneie o QR Code no aplicativo do seu banco ou use o código copia e cola.
          </p>
          <div className="mt-2 rounded-xl border border-white/10 bg-black/40 p-2.5">
            <code className="block max-h-24 overflow-y-auto break-all font-mono text-[10.5px] leading-relaxed text-white/70">
              {pagamento.qr_code}
            </code>
          </div>
          <button
            type="button"
            onClick={copiar}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[12.5px] font-bold text-primary-foreground"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar código PIX
          </button>
          {pagamento.expira_em && (
            <p className="mt-2 text-center text-[11px] text-white/35">
              Este código expira em {dataHoraBR(pagamento.expira_em)}.
            </p>
          )}
        </div>
      )}

      {pendente && pagamento.checkout_url && (
        <a
          href={pagamento.checkout_url}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[12.5px] font-bold text-primary-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Abrir o checkout do provedor
        </a>
      )}

      {pendente && (
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/35">
          <Clock className="mt-0.5 h-3 w-3 shrink-0" />
          A confirmação é automática e vem do provedor de pagamento. Esta página se atualiza
          sozinha; nenhum pagamento é aprovado por comprovante enviado.
        </p>
      )}

      {pagamento.status === "aprovado" && (
        <p className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-3.5 py-2.5 text-[12px] leading-relaxed text-emerald-200">
          Pagamento confirmado pelo provedor. Sua produção foi liberada e você pode acompanhar o
          pedido na sua conta.
        </p>
      )}
    </div>
  );
}