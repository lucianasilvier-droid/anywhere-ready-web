import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import usePainelRepresentante from "@/hooks/usePainelRepresentante";
import SemVinculo, { PainelCarregando } from "@/components/representante/SemVinculo";
import TabelaVendas from "@/components/representante/TabelaVendas";
import { TIPO_INFO } from "@/lib/representante-ui";

export const Route = createFileRoute("/_authed/representante/vendas")({
  head: () => ({ meta: [{ title: "Histórico de vendas — Representante" }] }),
  component: VendasRepresentante,
});

function VendasRepresentante() {
  const { painel, carregando, erro } = usePainelRepresentante();
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");

  const filtradas = useMemo(() => {
    const lista = painel?.vendas || [];
    const termo = busca.trim().toLowerCase();
    return lista.filter((v) => {
      if (tipo !== "todos" && v.tipo !== tipo) return false;
      if (!termo) return true;
      return `${v.cliente_nome || ""} ${v.cliente_email || ""} ${v.numero || ""} ${v.competencia || ""}`
        .toLowerCase()
        .includes(termo);
    });
  }, [painel, busca, tipo]);

  if (carregando) return <PainelCarregando />;
  if (!painel?.vinculado) return <SemVinculo erro={erro} />;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-heading text-2xl font-extrabold text-white">Histórico de vendas</h1>
        <p className="mt-1 text-[13px] text-white/45">
          Todas as vendas registradas em seu nome, com a comissão e a situação de cada uma.
        </p>
      </header>

      <div className="grid gap-2.5 sm:grid-cols-[1.6fr_1fr]">
        <label className="relative block">
          <span className="sr-only">Buscar por cliente</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, número ou competência"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-[12.5px] text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none"
          />
        </label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#0d1729] px-3 py-2 text-[12.5px] text-white focus:border-primary/40 focus:outline-none"
        >
          <option value="todos">Todos os serviços</option>
          {Object.entries(TIPO_INFO).map(([chave, info]) => (
            <option key={chave} value={chave}>
              {info.label}
            </option>
          ))}
        </select>
      </div>

      <TabelaVendas vendas={filtradas} />
    </div>
  );
}