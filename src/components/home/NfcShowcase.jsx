import { Link } from "@tanstack/react-router";
import { Eye, BadgeCheck, Star, TrendingUp, ArrowRight } from "lucide-react";
import { Image } from "@/components/ui/image";
import { NFC_BENEFITS, PLATE_IMAGE_URL, INSTAGRAM_PLATE_IMAGE_URL } from "@/lib/site-content";

const ICONS = { eye: Eye, check: BadgeCheck, star: Star, trend: TrendingUp };

export default function NfcShowcase() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] bg-[#050a15] py-16 sm:py-24">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(255,194,74,0.12),transparent_70%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="order-2 lg:order-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary/80">
              Placa NFC de avaliação
            </p>
            <h2 className="mt-3 font-heading text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Aproxime o celular.{" "}
              <span className="text-gradient-gold">A avaliação abre na hora.</span>
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/60">
              Uma placa bonita, personalizada com a sua marca, que facilita o acesso do cliente
              ao seu perfil no Google e ao seu Instagram. Sem aplicativo, sem digitação.
            </p>

            <ul className="mt-7 space-y-4">
              {NFC_BENEFITS.map((b) => {
                const Icon = ICONS[b.icon];
                return (
                  <li key={b.title} className="flex gap-3.5">
                    <span
                      className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full"
                      style={{ backgroundColor: `${b.color}22`, color: b.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white">
                        {b.title}
                      </p>
                      <p className="text-[13px] leading-relaxed text-white/50">{b.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/loja"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd97a] to-[#f0ac2b] px-6 py-3.5 text-sm font-bold text-[#0a1128] transition-transform hover:-translate-y-0.5"
              >
                Comprar por R$ 55,00
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="text-[12px] text-white/40">
                Personalização e configuração de links inclusas.
              </span>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
              <div className="absolute -inset-8 rounded-full bg-[radial-gradient(circle,rgba(66,133,244,0.22),transparent_65%)] blur-2xl" />
              {[
                {
                  src: PLATE_IMAGE_URL,
                  label: "Avaliação no Google",
                  alt: "Placa de avaliação Google em NFC personalizada",
                  tone: "text-[#4285F4]",
                },
                {
                  src: INSTAGRAM_PLATE_IMAGE_URL,
                  label: "Instagram",
                  alt: "Display de Instagram em acrílico neon com chip NFC",
                  tone: "text-[#e1306c]",
                },
              ].map((item) => (
                <div key={item.label} className="relative">
                  <div className="overflow-hidden rounded-[1.6rem] border border-white/12 bg-[#0b1220] shadow-[0_50px_90px_-40px_rgba(0,0,0,0.95)]">
                    <Image src={item.src} alt={item.alt} fittingType="fit" className="w-full" />
                  </div>
                  <p
                    className={`mt-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] ${item.tone}`}
                  >
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}