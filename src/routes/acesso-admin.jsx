import { createFileRoute } from "@tanstack/react-router";
import { AdminAccessPage } from "@/components/auth/AdminAccessPage";

export const Route = createFileRoute("/acesso-admin")({ ssr: false, component: AdminAccessPage });
