import { createFileRoute } from "@tanstack/react-router";
import CrmFunil from "@/components/crm/CrmFunil";

export const Route = createFileRoute("/_authed/representante/funil")({
  head: () => ({ meta: [{ title: "Funil de vendas — Representante" }] }),
  component: () => <CrmFunil base="/representante" />,
});
