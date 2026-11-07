import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Loader2, QrCode } from "lucide-react";
import {
  paymentSettingsFn,
  paymentTransactionsFn,
  refundPaymentFn,
  savePaymentProviderFn,
  setActivePaymentMethodFn,
  testPaymentProviderFn,
  togglePaymentProviderFn,
} from "@/lib/payments-fns";
import MetodoAtivo from "@/components/admin/payments/MetodoAtivo";
import ProviderCard from "@/components/admin/payments/ProviderCard";
import Transacoes from "@/components/admin/payments/Transacoes";

export const Route = createFileRoute("/_authed/admin/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos — Painel" }] }),
  component: PagamentosPage,
});

function PagamentosPage() {
  const carregarConfig = useServerFn(paymentSettingsFn);
  const carregarHistorico = useServerFn(paymentTransactionsFn);
  const salvarProvider = useServerFn(savePaymentProviderFn);
  const testarProvider = useServerFn(testPaymentProviderFn);
  const alternarProvider = useServerFn(togglePaymentProviderFn);
  const salvarMetodo = useServerFn(setActivePaymentMethodFn);
  const reembolsar = useServerFn(refundPaymentFn);

  const [config, setConfig] = useState(null);
  const [historico, setHistorico] = useState({ pagamentos: [], notificacoes: [] });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState("");
  const [testando, setTestando] = useState("");
  const [alternando, setAlternando] = useState("");
  const [salvandoMetodo, setSalvandoMetodo] = useState(false);
  const [reembolsando, setReembolsando] = useState("");

  async function carregar() {
    try {
      const [c, h] = await Promise.all([carregarConfig(), carregarHistorico()]);
      setConfig(c);
      setHistorico(h || { pagamentos: [], notificacoes: [] });
    } catch (e) {
      toast.error(e?.message || "Não foi possível carregar as integrações de pagamento.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSalvar(tipo, valores, ambiente) {
    setSalvando(tipo);
    try {
      const r = await salvarProvider({ data: { tipo, valores: valores || {}, ambiente } });
      if (!r?.alterados) toast.info("Nenhuma alteração para salvar.");
      else toast.success("Configuração salva. Execute o teste de conexão.");
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível salvar a configuração.");
    } finally {
      setSalvando("");
    }
  }

  async function handleTestar(tipo) {
    setTestando(tipo);
    try {
      const r = await testarProvider({ data: { tipo } });
      toast[r?.status === "conectado" ? "success" : "error"](r?.mensagem || "Teste concluído.");
      await carregar();
    } catch (e) {
      toast.error(e?.message || "O teste de conexão falhou.");
    } finally {
      setTestando("");
    }
  }

  async function handleAlternar(tipo, ativo) {
    setAlternando(tipo);
    try {
      await alternarProvider({ data: { tipo, ativo } });
      toast.success(ativo ? "Integração ativada." : "Integração desativada.");
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível alterar a integração.");
    } finally {
      setAlternando("");
    }
  }

  async function handleMetodo(metodo) {
    setSalvandoMetodo(true);
    try {
      await salvarMetodo({ data: { metodo } });
      toast.success(
        metodo === "desativado" ? "Pagamento online desativado." : "Sistema de pagamento atualizado.",
      );
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível alterar o sistema de pagamento.");
    } finally {
      setSalvandoMetodo(false);
    }
  }

  async function handleReembolso(pagamento, acao) {
    setReembolsando(pagamento.codigo);
    try {
      const r = await reembolsar({ data: { codigo: pagamento.codigo, acao } });
      toast.success(
        r?.status === "reembolsado"
          ? "Reembolso concluído."
          : "Reembolso solicitado. Execute o estorno no provedor e conclua aqui.",
      );
      await carregar();
    } catch (e) {
      toast.error(e?.message || "Não foi possível registrar o reembolso.");
    } finally {
      setReembolsando("");
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando pagamentos...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Financeiro</p>
        <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">Pagamentos</h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-white/45">
          Cadastre as credenciais oficiais, escolha o sistema de pagamento usado no checkout e
          acompanhe cada transação. As credenciais ficam guardadas no servidor, aparecem mascaradas
          no painel e nunca são enviadas ao navegador.
        </p>
      </header>

      <MetodoAtivo
        metodos={config?.metodos || []}
        selecionado={config?.metodoSelecionado || ""}
        onSalvar={handleMetodo}
        salvando={salvandoMetodo}
      />

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/80">
          Integrações de pagamento
        </p>
        <div className="mt-2 grid gap-4 lg:grid-cols-2">
          {(config?.providers || []).map((provider) => (
            <ProviderCard
              key={provider.tipo}
              provider={provider}
              salvando={salvando === provider.tipo}
              testando={testando === provider.tipo}
              alternando={alternando === provider.tipo}
              onSalvar={(valores, ambiente) => handleSalvar(provider.tipo, valores, ambiente)}
              onTestar={() => handleTestar(provider.tipo)}
              onToggle={(ativo) => handleAlternar(provider.tipo, ativo)}
            />
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
          <QrCode className="h-4 w-4 text-primary" /> Sobre o PIX
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
          O PIX é processado por um provedor oficial: escolha <strong>PIX via Mercado Pago</strong>{" "}
          (QR Code e copia e cola gerados pela API do Mercado Pago) ou{" "}
          <strong>InfinitePay</strong> (checkout oficial com PIX e cartão). Não existe integração PIX
          direta sem provedor — por isso o PIX depende de uma destas contas configuradas.
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-300/80">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Nenhum pagamento é aprovado por comprovante, clique do cliente ou retorno do navegador: a
          confirmação sempre vem da consulta à API do provedor (webhook ou verificação direta).
        </p>
      </section>

      <Transacoes
        pagamentos={historico.pagamentos}
        notificacoes={historico.notificacoes}
        onReembolso={handleReembolso}
        reembolsando={reembolsando}
      />
    </div>
  );
}