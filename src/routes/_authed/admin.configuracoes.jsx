import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Settings, Save, History, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEntityList } from "@/hooks/useEntityList";
import { dataHora } from "@/lib/format";
import { AlterarSenha } from "@/components/admin/AlterarSenha";

export const Route = createFileRoute("/_authed/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Painel" }] }),
  component: ConfiguracoesPage,
});

const CAMPOS = [
  { chave: "empresa_nome", label: "Nome da empresa", descricao: "Aparece no site e nos documentos" },
  { chave: "whatsapp", label: "WhatsApp comercial", descricao: "Formato 5511999999999" },
  { chave: "email_contato", label: "E-mail de contato", descricao: "Recebido pelas solicitações" },
  { chave: "instagram", label: "Instagram", descricao: "Link do perfil da empresa" },
  { chave: "cidade_atendimento", label: "Cidade / região de atendimento", descricao: "" },
  { chave: "horario_atendimento", label: "Horário de atendimento", descricao: "" },
];

function ConfiguracoesPage() {
  const { items, loading, reload } = useEntityList("Configuracao", {}, { limit: 100 });
  const { items: logs } = useEntityList("AtividadeLog", {}, { limit: 30 });
  const [valores, setValores] = useState({});
  const [salvando, setSalvando] = useState("");

  useEffect(() => {
    const mapa = {};
    items.forEach((i) => {
      mapa[i.chave] = i.valor || "";
    });
    setValores((v) => ({ ...mapa, ...v }));
  }, [items]);

  async function salvar(campo) {
    setSalvando(campo.chave);
    try {
      const existente = items.find((i) => i.chave === campo.chave);
      if (existente) {
        await base44.entities.Configuracao.update(existente.id, { valor: valores[campo.chave] || "" });
      } else {
        await base44.entities.Configuracao.create({
          chave: campo.chave,
          valor: valores[campo.chave] || "",
          descricao: campo.descricao,
        });
      }
      await base44.entities.AtividadeLog.create({
        acao: "Configuração atualizada",
        entidade: "Configuracao",
        detalhe: `${campo.chave} = ${valores[campo.chave] || "(vazio)"}`,
      });
      toast.success("Configuração salva.");
      await reload();
    } catch (e) {
      toast.error(e?.message || "Não foi possível salvar.");
    } finally {
      setSalvando("");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/80">Sistema</p>
        <h1 className="mt-1.5 font-heading text-2xl font-extrabold text-white">Configurações gerais</h1>
        <p className="mt-1 text-[13px] text-white/45">Informações institucionais e de atendimento usadas na plataforma.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
            <Settings className="h-4 w-4 text-primary" /> Dados da empresa
          </p>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
          ) : (
            <div className="mt-3 space-y-3">
              {CAMPOS.map((campo) => (
                <div key={campo.chave}>
                  <label className="text-[10.5px] font-semibold uppercase tracking-wider text-white/40">{campo.label}</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={valores[campo.chave] || ""}
                      onChange={(e) => setValores({ ...valores, [campo.chave]: e.target.value })}
                      placeholder={campo.descricao}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none"
                    />
                    <button
                      onClick={() => salvar(campo)}
                      disabled={salvando === campo.chave}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-3 text-[11.5px] font-semibold text-white/70 hover:border-primary/40 disabled:opacity-50"
                    >
                      {salvando === campo.chave ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Salvar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <AlterarSenha />

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-white/50">
              <History className="h-4 w-4 text-primary" /> Registro de atividades
            </p>
            <div className="mt-2 max-h-[280px] space-y-1.5 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-[12px] text-white/30">Nenhuma atividade registrada ainda.</p>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                    <p className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-white/75">
                      <span className="truncate">{l.acao}</span>
                      <span className="shrink-0 text-[10px] font-normal text-white/25">{dataHora(l.created_date)}</span>
                    </p>
                    {l.detalhe && <p className="truncate text-[10.5px] text-white/35">{l.detalhe}</p>}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-[11.5px] leading-relaxed text-emerald-200/85">
            <p className="flex items-center gap-1.5 font-semibold text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Segurança e LGPD
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>Clientes veem apenas os próprios dados, pedidos e serviços.</li>
              <li>Chaves de API ficam apenas no ambiente seguro do servidor.</li>
              <li>Pedidos de correção e exclusão de dados podem ser atendidos em Clientes.</li>
              <li>Envio de mensagens exige autorização registrada e revisão do operador.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}