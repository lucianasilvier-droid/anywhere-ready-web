import { createFileRoute } from "@tanstack/react-router";
import CrmLeadDetalhe from "@/components/crm/CrmLeadDetalhe";

export const Route = createFileRoute("/_authed/representante/lead/$leadId")({
  head: () => ({ meta: [{ title: "Cliente — Representante" }] }),
  component: RepresentanteLeadPage,
});

function RepresentanteLeadPage() {
  const { leadId } = Route.useParams();
  return <CrmLeadDetalhe leadId={leadId} base="/representante" />;
}
