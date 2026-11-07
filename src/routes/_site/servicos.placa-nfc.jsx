import { createFileRoute, Link } from "@tanstack/react-router";
import { Nfc, ShieldCheck, Truck, Sparkles, ArrowRight } from "lucide-react";
import NfcShowcase from "@/components/home/NfcShowcase";
import HowItWorks from "@/components/home/HowItWorks";
import { whatsappLink } from "@/lib/site-content";

export const Route = createFileRoute("/_site/servicos/placa-nfc")({
  head: () => ({
    meta: [
      { title: "Placa NFC de Avaliação Google e Instagram — R$ 55,00" },
      {
        name: "description",
        content:
          "Placa NFC que leva o cliente direto à avaliação no Google e ao seu Instagram. Personalizada com a sua marca, a partir de R$ 55,00.",
      },
    ],
  }),
  component: PlacaNfcPage,
});

const BENEFICIOS = [
  { icon: Nfc, title: "Somente NFC", text: "Basta encostar o celular na placa: o link abre na hora." },
  { icon: Sparkles, title: "Personalizada", text: "Nome da empresa, logo e visual alinhados ao seu negócio." },
  { icon: ShieldCheck, title: "Testada antes da entrega", text: "Cada link é conferido antes do envio." },
  { icon: Truck, title: "Envio para todo o Brasil", text: "Produção acompanhada pelo status do pedido." },
];

function PlacaNfcPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="aurora absolute inset-0" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary/80">
              Serviço 03 · Placa NFC
            </p>
            <h1 className="mt-4 font-heading text-[2.1rem] font-extrabold leading-[1.08] text-white sm:text-[3rem]">
              Uma placa. Um toque.{" "}
              <span className="text-gradient-gold">Sua avaliação no Google.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/60">
              Placa física com chip NFC que abre o link de avaliação da sua empresa no
              Google e o seu perfil do Instagram. Cada placa tem um endereço exclusivo, com os
              links configurados e testados antes da entrega.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/loja"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-6 py-3.5 text-sm font-bold text-[#0a1128]"
              >
                Comprar a partir de R$ 55,00
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href={whatsappLink("Olá! Quero uma placa NFC personalizada.")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-white hover:border-primary/50"
              >
                Falar sobre personalização
              </a>
            </div>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFICIOS.map((b) => (
              <div key={b.title} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <b.icon className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold text-white">{b.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <NfcShowcase />
      <HowItWorks />

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
          <div className="flex items-start gap-3">
            <Nfc className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-heading text-sm font-bold text-white">
                Como funciona a tecnologia NFC
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
                O chip NFC da placa guarda o endereço exclusivo da sua empresa. Ao aproximar um
                celular compatível, o navegador abre esse endereço automaticamente — sem instalar
                aplicativo, sem QR Code e sem digitar nada.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                A placa não cria avaliações: ela apenas facilita o acesso aos canais oficiais da
                sua empresa, permitindo que o cliente avalie de forma espontânea e honesta.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}