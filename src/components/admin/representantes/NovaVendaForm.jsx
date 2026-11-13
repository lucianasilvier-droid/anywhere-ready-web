import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import Modal from "@/components/admin/Modal";
import AdminField from "@/components/admin/AdminField";
import { criarVendaFn } from "@/lib/representantes-fns";
import { brl } from "@/lib/format";
import { competenciaAtual } from "@/lib/representante-ui";
import { TABELA_COMISSAO } from "@/lib/comissoes";
import { PRECO_SITE } from "@/lib/preco-site";

export default function NovaVendaForm({ open, onOpenChange, representantes, representanteFixo, onSalvo }) {
  const criar = useServerFn(criarVendaFn);
  const [form, setForm] = useState({
    representante_id: representanteFixo?.id || "",
    tipo: "perfil_google",
    cliente_nome: "",
    cliente_email: "",
    competencia: competenciaAtual(),
    quantidade: 1,
    valor_venda: 55,
    observacoes: "",
  });
  const [enviando, setEnviando] = useState(false);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const rep = representantes.find((r) => r.id === form.representante_id);

  const comissaoPrevista =
    form.tipo === "placa"
      ? (Number(rep?.comissao_placa ?? 20)) * (Number(form.quantidade) || 1)
      : form.tipo === "mensalidade"
        ? TABELA_COMISSAO.mensalidade.comissao
        : form.tipo === "site"
          ? Math.round((Number(form.valor_venda) || 0) * TABELA_COMISSAO.site.percentual * 100) / 100
          : form.tipo === "mensalidade_site"
            ? TABELA_COMISSAO.mensalidade_site.comissao
            : Number(rep?.comissao_perfil ?? 100);
  const mensal = form.tipo === "mensalidade" || form.tipo === "mensalidade_site";

  async function submit(e) {
    e.preventDefault();
    if (!form.representante_id) return toast.error("Escolha o representante responsável.");
    if (form.cliente_nome.trim().length < 2) return toast.error("Informe o nome do cliente.");

    setEnviando(true);
    try {
      const resultado = await criar({
        data: {
          representante_id: form.representante_id,
          tipo: form.tipo,
          cliente_nome: form.cliente_nome,
          cliente_email: form.cliente_email,
          competencia: mensal ? form.competencia : "",
          quantidade: Number(form.quantidade) || 1,
          valor_venda: form.tipo === "placa" || form.tipo === "site" ? Number(form.valor_venda) || 0 : 0,
          observacoes: form.observacoes,
          data_venda: new Date().toISOString(),
        },
      });
      toast.success(
        resultado?.duplicada
          ? `Esta venda já estava registrada (${resultado.venda?.numero}). Nada foi duplicado.`
          : `Venda ${resultado?.venda?.numero || ""} registrada. Confirme o pagamento do cliente para liberar a comissão.`,
      );
      onOpenChange(false);
      await onSalvo?.();
    } catch (err) {
      toast.error(err?.message || "Não foi possível registrar a venda.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Registrar venda do representante" wide>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField
            label="Representante"
            value={form.representante_id}
            onChange={set("representante_id")}
            options={[
              { value: "", label: "Selecione" },
              ...representantes
                .filter((r) => r.status === "ativo")
                .map((r) => ({ value: r.id, label: `${r.nome}${r.codigo ? ` · ${r.codigo}` : ""}` })),
            ]}
          />
          <AdminField
            label="Serviço"
            value={form.tipo}
            onChange={(e) => {
              const tipo = e.target.value;
              setForm((f) => ({ ...f, tipo, valor_venda: tipo === "site" ? PRECO_SITE.base : tipo === "placa" ? 55 : f.valor_venda }));
            }}
            options={[
              { value: "perfil_google", label: "Criação de perfil no Google — R$ 150,00" },
              { value: "mensalidade", label: "Administração mensal do perfil — R$ 150,00 (R$ 50,00 de comissão)" },
              { value: "placa", label: "Placa NFC" },
              { value: "site", label: "Criação de site — 50% de comissão" },
              { value: "mensalidade_site", label: `Mensalidade do site — ${brl(TABELA_COMISSAO.mensalidade_site.valor)} (${brl(TABELA_COMISSAO.mensalidade_site.comissao)} de comissão)` },
            ]}
          />
          <AdminField label="Cliente" value={form.cliente_nome} onChange={set("cliente_nome")} placeholder="Nome do cliente" />
          <AdminField
            label="E-mail do cliente"
            type="email"
            value={form.cliente_email}
            onChange={set("cliente_email")}
            placeholder="cliente@empresa.com"
          />
          {form.tipo === "site" && (
            <AdminField
              label="Valor do site (R$)"
              type="number"
              step="0.01"
              value={form.valor_venda}
              onChange={set("valor_venda")}
              hint={`Entre ${brl(PRECO_SITE.minimo)} e ${brl(PRECO_SITE.maximo)}. Use o valor final do site.`}
            />
          )}
          {mensal && (
            <AdminField
              label="Competência"
              type="month"
              value={form.competencia}
              onChange={set("competencia")}
              hint="Cada mês gera apenas uma comissão — lançamentos repetidos são bloqueados."
            />
          )}
          {form.tipo === "placa" && (
            <>
              <AdminField
                label="Quantidade de placas"
                type="number"
                value={form.quantidade}
                onChange={set("quantidade")}
              />
              <AdminField
                label="Valor da venda (R$)"
                type="number"
                step="0.01"
                value={form.valor_venda}
                onChange={set("valor_venda")}
              />
            </>
          )}
        </div>

        <div className="rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-2.5 text-[11.5px] leading-relaxed text-white/70">
          Comissão calculada pelo sistema: <strong className="text-primary">{brl(comissaoPrevista)}</strong>{" "}
          para o representante. Na administração mensal do perfil, o cliente paga R$ 150,00: R$ 50,00
          são do representante e R$ 100,00 ficam com o sistema, que executa a administração e manutenção.
          O representante não precisa realizar o serviço técnico. A comissão é liberada após a confirmação do pagamento do cliente.
        </div>

        <AdminField label="Observações" textarea value={form.observacoes} onChange={set("observacoes")} />

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-white/12 px-3 py-2 text-[12px] font-semibold text-white/60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-[#0a1128] disabled:opacity-60"
          >
            {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Registrar venda
          </button>
        </div>
      </form>
    </Modal>
  );
}