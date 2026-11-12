import { createFileRoute } from "@tanstack/react-router";
import Hero from "@/components/home/Hero";
import ServicesGrid from "@/components/home/ServicesGrid";
import NfcShowcase from "@/components/home/NfcShowcase";
import HowItWorks from "@/components/home/HowItWorks";
import FinalCta from "@/components/home/FinalCta";

export const Route = createFileRoute("/_site/")({
  head: () => ({
    meta: [
      { title: "Google NFC Connect | Perfil da Empresa no Google, Placas NFC e Sites" },
      {
        name: "description",
        content:
          "Atraia mais oportunidades para sua empresa com Perfil da Empresa no Google, gestão de presença local, placas NFC para avaliações e sites profissionais. Conheça as soluções.",
      },
      { property: "og:title", content: "Google NFC Connect | Perfil no Google, Placas NFC e Sites" },
      {
        property: "og:description",
        content:
          "Soluções para empresas que querem fortalecer sua presença digital: Perfil da Empresa no Google, placas NFC e sites profissionais.",
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
