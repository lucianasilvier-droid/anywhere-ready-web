import { Link } from "@tanstack/react-router";
import { ArrowRight, Star, MapPin, Nfc, CheckCircle2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import { SERVICE_IMAGE_URL, whatsappLink } from "@/lib/site-content";

const METRICS = [
  { icon: MapPin, label: "Mais visibilidade", value: "no Google Maps" },
  { icon: Star, label: "Avaliações facilitadas", value: "com NFC" },
  { icon: Nfc, label: "Tecnologia NFC", value: "rápida e segura" },
  { icon: CheckCircle2, label: "Atendimento", value: "do início ao fim" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="aurora absolute inset-0" />
      <div className="grid-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_55%_at_50%_0%,#000_20%,transparent_100%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:pb-24 lg:pt-20">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rise-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Google Maps · Gestão · Placas NFC
            </span>

            <h1 className="mt-6 font-heading text-[2.15rem] font-extrabold leading-[1.06] text-white sm:text-5xl lg:text-[3.65rem]">
              Coloque sua empresa no{" "}
              <span className="text-gradient-google">Google Maps</span> e seja{" "}
              <span className="text-gradient-gold">encontrado</span>.
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/65 sm:text-base">
              Criamos e administramos o Perfil da Empresa no Google e entregamos placas NFC que
              levam o seu cliente direto aos canais oficiais de avaliação e ao seu Instagram, com
              um simples toque no celular.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={whatsappLink("Olá! Quero colocar minha empresa no Google Maps.")}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-6 py-3.5 text-sm font-bold text-[#0a1128] shadow-[0_20px_45px_-18px_rgba(255,194,74,0.95)] transition-transform hover:-translate-y-0.5"
              >
                Falar no WhatsApp
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link
                to="/loja"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:border-primary/40 hover:bg-white/[0.06]"
              >
                Ver placas NFC · R$ 55,00
              </Link>
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {METRICS.map((m) => (
                <div key={m.label} className="glass-card rounded-xl px-3.5 py-3">
                  <m.icon className="h-4 w-4 text-primary" />
                  <dt className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                    {m.label}
                  </dt>
                  <dd className="text-[13px] font-semibold text-white">{m.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
            <div className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(66,133,244,0.25),transparent_70%)] blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.6rem] border border-white/12 bg-[#0b1428] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]">
              <Image
                src={SERVICE_IMAGE_URL}
                alt="Coloque sua empresa no Google Maps — mais visibilidade e mais clientes"
                fittingType="fit"
                className="w-full"
              />
            </div>
            <div className="float-slow absolute -bottom-6 -left-4 w-44 rounded-2xl border border-white/10 bg-[#0b1428]/95 p-3.5 shadow-2xl backdrop-blur sm:-left-8">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#4285F4]/15">
                  <Nfc className="h-3.5 w-3.5 text-[#4285F4]" />
                </span>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                  Placa NFC
                </p>
              </div>
              <p className="mt-2 text-[13px] font-semibold leading-snug text-white">
                Aproxime o celular e avalie
              </p>
              <div className="mt-2 flex items-center gap-0.5 text-[#FBBC05]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-3 w-3 fill-current" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
