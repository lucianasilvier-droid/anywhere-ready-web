import { createFileRoute } from "@tanstack/react-router";
import CrmLeadDetalhe from "@/components/crm/CrmLeadDetalhe";

export const Route = createFileRoute("/_authed/admin/lead/$leadId")({
  head: () => ({ meta: [{ title: "Lead — Painel" }] }),
  component: AdminLeadPage,
});

function AdminLeadPage() {
  const { leadId } = Route.useParams();
  return <CrmLeadDetalhe leadId={leadId} base="/admin" />;
}
