import { NFC_STEPS } from "@/lib/site-content";
import { Smartphone, Settings, Sparkles, Star } from "lucide-react";

const ICONS = [Smartphone, Settings, Sparkles, Star];

export default function HowItWorks() {
  return (
    <section className="border-t border-white/[0.06] py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary/80">
            Como funciona
          </p>
          <h2 className="mt-3 font-heading text-3xl font-extrabold text-white sm:text-[2.4rem]">
            Simples assim
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            Da produção da placa à avaliação do cliente, sem burocracia para o seu negócio.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {NFC_STEPS.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <div
                key={step.title}
                className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="font-heading text-xs font-bold text-white/25">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-heading text-[15px] font-bold text-white">{step.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">{step.text}</p>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-[12px] leading-relaxed text-white/35">
          A placa apenas facilita o acesso aos canais oficiais da sua empresa. Nenhuma avaliação é
          criada automaticamente — o cliente avalia de forma espontânea e honesta.
        </p>
      </div>
    </section>
  );
}