import { createFileRoute } from "@tanstack/react-router";
import CrmFunil from "@/components/crm/CrmFunil";

export const Route = createFileRoute("/_authed/admin/funil")({
  head: () => ({ meta: [{ title: "Funil de vendas — Painel" }] }),
  component: () => <CrmFunil base="/admin" />,
});
