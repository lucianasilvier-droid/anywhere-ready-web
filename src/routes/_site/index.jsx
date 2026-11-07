import { createFileRoute } from "@tanstack/react-router";
import Hero from "@/components/home/Hero";
import ServicesGrid from "@/components/home/ServicesGrid";
import NfcShowcase from "@/components/home/NfcShowcase";
import HowItWorks from "@/components/home/HowItWorks";
import FinalCta from "@/components/home/FinalCta";

export const Route = createFileRoute("/_site/")({
  head: () => ({
    meta: [
      { title: "Google NFC Connect — Seja encontrado no Google e receba mais avaliações" },
      {
        name: "description",
        content:
          "Criação e gestão do Perfil da Empresa no Google Maps e placas NFC para avaliações. Atendimento em todo o Brasil.",
      },
      { property: "og:title", content: "Google NFC Connect — Seja encontrado no Google e receba mais avaliações" },
      {
        property: "og:description",
        content:
          "Criação e gestão do Perfil da Empresa no Google Maps e placas NFC para avaliações. Atendimento em todo o Brasil.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Hero />
      <ServicesGrid />
      <NfcShowcase />
      <HowItWorks />
      <FinalCta />
    </>
  );
}