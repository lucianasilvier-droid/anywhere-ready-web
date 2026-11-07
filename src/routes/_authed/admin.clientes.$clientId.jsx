import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail, Phone, MapPin, ShoppingBag, Briefcase, CreditCard, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useEntityList } from "@/hooks/useEntityList";
import StatusPill from "@/components/admin/StatusPill";
import { brl, dataCurta, STATUS_PRODUCAO, STATUS_PAGAMENTO, STATUS_SERVICO } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/clientes/$clientId")({
  head: () => ({ meta: [{ title: "Cliente — Painel" }] }),
  component: ClienteDetalhePage,
});

function ClienteDetalhePage() {
  const { clientId } = Route.useParams();
  const [cliente, setCliente] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState(null);
  const { items: pedidos } = useEntityList("Pedido", { cliente_id: clientId }, { limit: 50 });
  const { items: servicos } = useEntityList("ServicoCliente", { cliente_id: clientId }, { limit: 50 });
  const { items: placas } = useEntityList(
    "PlacaNFC",
    { cliente_email: cliente?.email || "sem-email" },
    { limit: 50 },
  );

  useEffect(() => {
    base44.entities.Cliente.get(clientId)
      .then((c) => {
        setCliente(c);
        setForm(c);
      })
      .catch(() => toast.error("Cliente não encontrado."))
      .finally(() => setCarregando(false));
  }, [clientId]);

  async function salvar(e) {
    e.preventDefault();
    try {
      const dados = { ...form };
      delete dados.id;
      delete dados.created_date;
      delete dados.updated_date;
      delete dados.created_by_id;
      await base44.entities.Cliente.update(clientId, dados);
      setCliente({ ...cliente, ...dados });
      toast.success("Dados atualizados.");
    } catch (err) {
      toast.error(err?.message || "Não foi possível salvar.");
    }
  }

  if (carregando || !form) {
    return <div className="flex items-center gap-2 py-20 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando cliente...</div>;
  }

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <div className="space-y-5">
      <Link to="/admin/clientes" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/45 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Clientes
      </Link>

      <header>
        <h1 className="font-heading text-2xl font-extrabold text-white">{cliente.nome}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/45">
          {cliente.empresa && <span>{cliente.empresa}</span>}
          {cliente.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{cliente.email}</span>}
          {cliente.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{cliente.telefone}</span>}
          {cliente.cidade && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{cliente.cidade}{cliente.estado ? `/${cliente.estado}` : ""}</span>}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <form onSubmit={salvar} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <p className="text-[12px] font-bold uppercase tracking-wider text-white/50">Dados cadastrais</p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {[
              ["nome", "Nome"], ["empresa", "Empresa"], ["email", "E-mail"], ["user_email", "E-mail de login"],
              ["telefone", "Telefone"], ["whatsapp", "WhatsApp"], ["documento", "CPF/CNPJ"], ["cep", "CEP"],
              ["endereco", "Endereço"], ["cidade", "Cidade"], ["estado", "Estado"], ["instagram", "Instagram"],
            ].map(([campo, label]) => (
              <label key={campo} className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">{label}</span>
                <input
                  value={form[campo] || ""}
                  onChange={set(campo)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white focus:border-primary/40 focus:outline-none"
                />
              </label>
            ))}
          </div>
          <label className="mt-2.5 block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Observações</span>
            <textarea
              rows={3}
              value={form.observacoes || ""}
              onChange={set("observacoes")}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white focus:border-primary/40 focus:outline-none"
            />
          </label>
          <button type="submit" className="mt-3 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128]">
            Salvar alterações
          </button>
        </form>

        <div className="space-y-4">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
              <Briefcase className="h-4 w-4 text-primary" /> Serviços ({servicos.length})
            </p>
            <div className="mt-2 space-y-2">
              {servicos.length === 0 && <p className="text-[12px] text-white/30">Nenhum serviço contratado.</p>}
              {servicos.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2">
                  <div>
                    <p className="text-[12px] font-semibold text-white">{s.tipo === "gestao_perfil" ? "Gestão de perfil" : "Criação de perfil"}</p>
                    <p className="text-[10.5px] text-white/35">{s.plano || "sem plano"} · vence {dataCurta(s.vencimento)}</p>
                  </div>
                  <StatusPill map={STATUS_SERVICO} value={s.status} />
                </div>
              ))}
            </div>
            <Link to="/admin/servicos" className="mt-2 inline-block text-[11.5px] font-semibold text-primary">Gerenciar serviços →</Link>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
              <ShoppingBag className="h-4 w-4 text-primary" /> Pedidos ({pedidos.length})
            </p>
            <div className="mt-2 space-y-2">
              {pedidos.length === 0 && <p className="text-[12px] text-white/30">Nenhum pedido.</p>}
              {pedidos.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2">
                  <div>
                    <p className="text-[12px] font-semibold text-white">{p.numero}</p>
                    <p className="text-[10.5px] text-white/35">{brl(p.total)} · {dataCurta(p.created_date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusPill map={STATUS_PAGAMENTO} value={p.status_pagamento} />
                    <StatusPill map={STATUS_PRODUCAO} value={p.status_producao} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
              <CreditCard className="h-4 w-4 text-primary" /> Placas ({placas.length})
            </p>
            <div className="mt-2 space-y-1.5">
              {placas.length === 0 && <p className="text-[12px] text-white/30">Nenhuma placa.</p>}
              {placas.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                  <Link to="/admin/placas" className="font-mono text-[11px] text-primary hover:underline">{p.codigo}</Link>
                  <span className="text-white/35">{p.status?.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}