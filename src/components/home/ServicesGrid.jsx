import { Link } from "@tanstack/react-router";
import { Map, ShieldCheck, Nfc, Globe, ArrowUpRight } from "lucide-react";
import { SERVICES } from "@/lib/site-content";

const ICONS = { map: Map, shield: ShieldCheck, nfc: Nfc, globe: Globe };

export default function ServicesGrid() {
  return (
    <section id="servicos" className="relative border-t border-white/[0.06] py-16 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary/80">
              Nossos serviços
            </p>
            <h2 className="mt-3 font-heading text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Quatro soluções para o seu negócio ser{" "}
              <span className="text-gradient-gold">encontrado</span> e lembrado.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/55">
            Do primeiro cadastro no Google Maps à gestão mensal do perfil e à placa NFC no seu
            balcão, além do seu site com agendamento — tudo em um só lugar.
          </p>
        </div>

        <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => {
            const Icon = ICONS[s.icon];
            return (
              <Link
                key={s.slug}
                to={s.slug}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
              >
                <span
                  className="absolute right-5 top-4 font-heading text-5xl font-extrabold text-white/[0.045]"
                  aria-hidden
                >
                  {s.number}
                </span>
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{ backgroundColor: `${s.color}1f`, color: s.color }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-heading text-lg font-bold leading-snug text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/55">{s.short}</p>
                <ul className="mt-5 space-y-2 border-t border-white/[0.07] pt-4">
                  {s.features.map((f) => (
                    <li key={f} className="flex gap-2 text-[12.5px] leading-snug text-white/50">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-primary">
                  Ver detalhes
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}