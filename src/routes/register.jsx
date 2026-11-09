import { createFileRoute, Navigate } from "@tanstack/react-router";

// Cadastro público desativado: esta aplicação tem um único administrador.
export const Route = createFileRoute("/register")({
  component: () => <Navigate to="/login" replace />,
});