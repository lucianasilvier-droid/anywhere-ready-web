export const TIPO_INFO = {
  perfil_google: { label: "Perfil no Google", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  mensalidade: { label: "Mensalidade", cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  placa: { label: "Placa NFC", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  site: { label: "Site", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  mensalidade_site: { label: "Mensalidade do site", cls: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
};

export const STATUS_VENDA = {
  pendente: { label: "Pagamento pendente", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  confirmada: { label: "Pago pelo cliente", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  cancelada: { label: "Cancelada", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export const STATUS_COMISSAO = {
  aguardando_pagamento: { label: "Aguardando pagamento", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  disponivel: { label: "Disponível", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  solicitada: { label: "Em solicitação", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  paga: { label: "Paga", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  cancelada: { label: "Cancelada", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export const STATUS_SOLICITACAO = {
  pendente: { label: "Aguardando aprovação", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  aprovada: { label: "Aprovada", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  rejeitada: { label: "Rejeitada", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  paga: { label: "Paga", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
};

export const STATUS_REPRESENTANTE = {
  ativo: { label: "Ativo", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  inativo: { label: "Inativo", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  bloqueado: { label: "Bloqueado", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export function competenciaAtual() {
  return new Date().toISOString().slice(0, 7);
}