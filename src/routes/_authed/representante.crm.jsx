import { createFileRoute } from "@tanstack/react-router";
import CrmLeads from "@/components/crm/CrmLeads";

export const Route = createFileRoute("/_authed/representante/crm")({
  head: () => ({ meta: [{ title: "CRM · Meus clientes — Representante" }] }),
  component: () => <CrmLeads base="/representante" />,
});
