import { createFileRoute } from "@tanstack/react-router";
import CrmLeads from "@/components/crm/CrmLeads";

export const Route = createFileRoute("/_authed/admin/leads")({
  head: () => ({ meta: [{ title: "CRM · Leads — Painel" }] }),
  component: () => <CrmLeads base="/admin" />,
});
