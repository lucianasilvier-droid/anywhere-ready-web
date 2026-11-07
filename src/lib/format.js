export function brl(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value) || 0,
  );
}

export function dataCurta(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function dataHora(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function diasAte(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - hoje) / 86400000);
}

export function iniciais(nome) {
  return String(nome || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export const STATUS_PAGAMENTO = {
  aguardando: { label: "Aguardando pagamento", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  pago: { label: "Pago", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  cancelado: { label: "Cancelado", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  reembolsado: { label: "Reembolsado", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
};

export const STATUS_PRODUCAO = {
  aguardando: { label: "Aguardando", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  em_producao: { label: "Em produção", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  pronto: { label: "Pronto", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  enviado: { label: "Enviado", cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  entregue: { label: "Entregue", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  cancelado: { label: "Cancelado", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export const STATUS_SERVICO = {
  solicitado: { label: "Solicitado", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  em_andamento: { label: "Em andamento", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  aguardando_cliente: { label: "Aguardando cliente", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  concluido: { label: "Concluído", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  cancelado: { label: "Cancelado", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export const STATUS_CONSENT = {
  nao_solicitado: { label: "Não solicitado", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  solicitado: { label: "Autorização solicitada", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  autorizado: { label: "Autorizado", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  recusado: { label: "Recusou contato", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  revogado: { label: "Autorização revogada", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};